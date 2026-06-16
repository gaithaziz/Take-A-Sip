from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets

from fastapi import HTTPException, status
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import log_structured
from app.core.phone import mask_phone_number, normalize_phone_number
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.user_event import UserEvent
from app.models.user_push_token import UserPushToken
from app.models.user_refresh_token import UserRefreshToken
from app.schemas.auth import (
    AccountDeletionResponse,
    AuthUserResponse,
    KioskLoginRequest,
    RefreshTokenRequest,
    SendOTPRequest,
    TokenResponse,
    UpdateProfileRequest,
    VerifyOTPRequest,
)
from app.services.otp_service import OTPRateLimitError, OTPVerifyResult, otp_service
from app.services.sms_service import SMSProviderError, build_sms_provider

logger = logging.getLogger(__name__)
settings = get_settings()
AUTH_RLS_USER_ID = '00000000-0000-0000-0000-000000000000'
OTP_BYPASS_ALLOWED_ROLES = {UserRole.CLIENT, UserRole.DRIVER}


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


async def _create_refresh_token(db: AsyncSession, user: User) -> tuple[str, UserRefreshToken]:
    raw_token = secrets.token_urlsafe(48)
    token = UserRefreshToken(
        user_id=user.id,
        token_hash=_hash_refresh_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(token)
    await db.flush()
    return raw_token, token


def _ensure_secure_otp_configuration() -> None:
    environment = settings.environment.strip().lower()
    provider = settings.otp_provider.strip().lower()
    if environment in {'production', 'prod'} and (provider == 'mock' or bool(settings.otp_test_code.strip())):
        log_structured(
            logger,
            logging.ERROR,
            'auth.otp_provider_misconfigured',
            {'environment': environment, 'provider': provider},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='OTP service is misconfigured',
        )


def _get_otp_bypass_role(phone_number: str, otp_code: str | None = None) -> UserRole | None:
    if not settings.otp_bypass_enabled:
        return None
    bypass_code = settings.otp_bypass_code.strip()
    if otp_code is not None and (not bypass_code or otp_code.strip() != bypass_code):
        return None

    normalized_phone = normalize_phone_number(phone_number)
    role_value = settings.otp_bypass_accounts.get(normalized_phone)
    if role_value is None:
        return None

    try:
        role = UserRole(role_value)
    except ValueError:
        log_structured(
            logger,
            logging.ERROR,
            'auth.otp_bypass_invalid_role',
            {'phone_number': mask_phone_number(normalized_phone), 'role': role_value},
        )
        return None

    if role not in OTP_BYPASS_ALLOWED_ROLES:
        log_structured(
            logger,
            logging.ERROR,
            'auth.otp_bypass_forbidden_role',
            {'phone_number': mask_phone_number(normalized_phone), 'role': role.value},
        )
        return None
    return role


async def _activate_auth_rls_context(db: AsyncSession) -> None:
    await db.execute(
        text(
            "select set_config('app.current_user_id', :user_id, true), set_config('app.current_user_role', :user_role, true)"
        ),
        {'user_id': AUTH_RLS_USER_ID, 'user_role': UserRole.ADMIN.value},
    )


async def send_otp(payload: SendOTPRequest, db: AsyncSession) -> str:
    _ensure_secure_otp_configuration()
    bypass_role = _get_otp_bypass_role(payload.phone_number)
    if bypass_role is not None:
        log_structured(
            logger,
            logging.INFO,
            'auth.otp_bypass_send_skipped',
            {'phone_number': mask_phone_number(payload.phone_number), 'role': bypass_role.value},
        )
        return settings.otp_bypass_code

    try:
        sms_provider = build_sms_provider()
    except SMSProviderError as exc:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_provider_unavailable',
            {'phone_number': mask_phone_number(payload.phone_number)},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='OTP delivery is temporarily unavailable',
        ) from exc
    try:
        code = await otp_service.generate_and_store(db, payload.phone_number)
    except OTPRateLimitError as exc:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_send_rate_limited',
            {'phone_number': mask_phone_number(payload.phone_number), 'retry_after_seconds': exc.retry_after_seconds},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f'Please wait {exc.retry_after_seconds} seconds before requesting another OTP',
        ) from exc

    try:
        await sms_provider.send_sms(
            payload.phone_number,
            f'Your verification code is {code}. It expires in {settings.otp_ttl_minutes} minutes.',
        )
    except SMSProviderError as exc:
        await otp_service.clear_challenge(db, payload.phone_number)
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_send_failed',
            {'phone_number': mask_phone_number(payload.phone_number)},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='OTP delivery is temporarily unavailable',
        ) from exc
    log_structured(
        logger,
        logging.INFO,
        'auth.otp_sent',
        {'phone_number': mask_phone_number(payload.phone_number)},
    )
    return code


async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession) -> TokenResponse:
    _ensure_secure_otp_configuration()
    bypass_role = _get_otp_bypass_role(payload.phone_number, payload.otp_code)
    if bypass_role is not None:
        return await _verify_otp_bypass(payload, db, bypass_role)

    verify_result = await otp_service.verify(db, payload.phone_number, payload.otp_code)
    if verify_result in {OTPVerifyResult.NOT_FOUND, OTPVerifyResult.EXPIRED}:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_verify_missing_or_expired',
            {'phone_number': mask_phone_number(payload.phone_number)},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='OTP expired or not found. Please request a new code.',
        )
    if verify_result == OTPVerifyResult.LOCKED:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_verify_locked',
            {'phone_number': mask_phone_number(payload.phone_number)},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail='Too many invalid OTP attempts. Please request a new code later.',
        )
    if verify_result != OTPVerifyResult.SUCCESS:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_verify_failed',
            {'phone_number': mask_phone_number(payload.phone_number)},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid OTP')

    await _activate_auth_rls_context(db)
    result = await db.execute(select(User).where(User.phone_number == payload.phone_number))
    user = result.scalar_one_or_none()

    if user is None:
        if payload.role and payload.role != UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Only client self-signup is allowed',
            )
        if not payload.first_name or not payload.last_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='first_name and last_name are required for signup',
            )
        user = User(
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone_number=payload.phone_number,
            role=UserRole.CLIENT,
            is_active=True,
            is_banned=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        log_structured(
            logger,
            logging.INFO,
            'auth.user_created',
            {'user_id': str(user.id), 'role': user.role.value},
        )

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    return await _build_token_response(user, db, event='auth.login_success')


async def _verify_otp_bypass(payload: VerifyOTPRequest, db: AsyncSession, role: UserRole) -> TokenResponse:
    await _activate_auth_rls_context(db)
    result = await db.execute(select(User).where(User.phone_number == payload.phone_number))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            first_name=payload.first_name or ('Test' if role == UserRole.CLIENT else 'Test'),
            last_name=payload.last_name or ('Customer' if role == UserRole.CLIENT else 'Driver'),
            phone_number=payload.phone_number,
            role=role,
            is_active=True,
            is_banned=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        log_structured(
            logger,
            logging.INFO,
            'auth.otp_bypass_user_created',
            {'user_id': str(user.id), 'role': user.role.value},
        )
    elif user.role != role:
        log_structured(
            logger,
            logging.ERROR,
            'auth.otp_bypass_role_mismatch',
            {'user_id': str(user.id), 'configured_role': role.value, 'actual_role': user.role.value},
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bypass account role mismatch')

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    log_structured(
        logger,
        logging.INFO,
        'auth.otp_bypass_login_success',
        {'user_id': str(user.id), 'role': user.role.value},
    )
    return await _build_token_response(user, db, event='auth.login_success')


async def _build_token_response(user: User, db: AsyncSession, *, event: str) -> TokenResponse:
    token = create_access_token(str(user.id), user.role.value)
    refresh_token, _ = await _create_refresh_token(db, user)
    await db.commit()
    log_structured(
        logger,
        logging.INFO,
        event,
        {'user_id': str(user.id), 'role': user.role.value},
    )
    return TokenResponse(
        access_token=token,
        refresh_token=refresh_token,
        user={
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'role': user.role.value,
        },
    )


async def refresh_session(payload: RefreshTokenRequest, db: AsyncSession) -> TokenResponse:
    await _activate_auth_rls_context(db)
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserRefreshToken).where(UserRefreshToken.token_hash == _hash_refresh_token(payload.refresh_token))
    )
    stored_token = result.scalar_one_or_none()
    if stored_token is None or stored_token.revoked_at is not None or stored_token.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid refresh token')

    user = await db.get(User, stored_token.user_id)
    if user is None:
        stored_token.revoked_at = now
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    stored_token.revoked_at = now
    stored_token.last_used_at = now
    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token, replacement = await _create_refresh_token(db, user)
    stored_token.replaced_by_token_id = replacement.id
    await db.commit()

    log_structured(
        logger,
        logging.INFO,
        'auth.refresh_success',
        {'user_id': str(user.id), 'role': user.role.value},
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'role': user.role.value,
        },
    )


async def kiosk_login(payload: KioskLoginRequest, db: AsyncSession) -> TokenResponse:
    settings = get_settings()
    secret = (settings.kiosk_login_secret or '').strip()
    kiosk_phone_number = (settings.kiosk_frontdesk_phone_number or '').strip()

    if not secret or not kiosk_phone_number:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Kiosk login is not configured',
        )
    if payload.secret != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Invalid kiosk secret')

    await db.execute(text("select set_config('app.current_user_role', 'ADMIN', true)"))
    await db.execute(text("select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000000', true)"))
    result = await db.execute(select(User).where(User.phone_number == kiosk_phone_number))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Kiosk user not found')
    if user.role not in {UserRole.FRONTDESK, UserRole.ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Kiosk user is not allowed')
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    return await _build_token_response(user, db, event='auth.kiosk_login_success')


async def update_profile(current_user: User, payload: UpdateProfileRequest, db: AsyncSession) -> AuthUserResponse:
    current_user.first_name = payload.first_name
    current_user.last_name = payload.last_name
    await db.commit()
    await db.refresh(current_user)

    return AuthUserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone_number=current_user.phone_number,
        role=current_user.role.value,
    )


def _deleted_phone_number(user_id: str) -> str:
    suffix = user_id.replace('-', '')[-12:]
    return f'deleted-{suffix}'


async def delete_account(current_user: User, db: AsyncSession) -> AccountDeletionResponse:
    now = datetime.now(timezone.utc)
    original_role = current_user.role.value

    await db.execute(delete(UserPushToken).where(UserPushToken.user_id == current_user.id))
    await db.execute(delete(UserRefreshToken).where(UserRefreshToken.user_id == current_user.id))
    current_user.first_name = 'Deleted'
    current_user.last_name = 'User'
    current_user.phone_number = _deleted_phone_number(str(current_user.id))
    current_user.is_active = False
    current_user.is_banned = False
    current_user.banned_at = now
    current_user.banned_reason = 'self_deleted'
    db.add(
        UserEvent(
            user_id=current_user.id,
            event_type='user.self_deleted',
            actor_user_id=current_user.id,
            reason=f'role:{original_role}',
        )
    )
    await db.commit()

    return AccountDeletionResponse(message='Account deleted successfully')
