from datetime import datetime, timezone
import logging

from fastapi import HTTPException, status
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import log_structured
from app.core.phone import mask_phone_number
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.user_event import UserEvent
from app.models.user_push_token import UserPushToken
from app.schemas.auth import (
    AccountDeletionResponse,
    AuthUserResponse,
    KioskLoginRequest,
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


async def _activate_auth_rls_context(db: AsyncSession) -> None:
    await db.execute(
        text(
            "select set_config('app.current_user_id', :user_id, true), set_config('app.current_user_role', :user_role, true)"
        ),
        {'user_id': AUTH_RLS_USER_ID, 'user_role': UserRole.ADMIN.value},
    )


async def send_otp(payload: SendOTPRequest, db: AsyncSession) -> str:
    _ensure_secure_otp_configuration()
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

    return _build_token_response(user, event='auth.login_success')


def _build_token_response(user: User, *, event: str) -> TokenResponse:
    token = create_access_token(str(user.id), user.role.value)
    log_structured(
        logger,
        logging.INFO,
        event,
        {'user_id': str(user.id), 'role': user.role.value},
    )
    return TokenResponse(
        access_token=token,
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

    return _build_token_response(user, event='auth.kiosk_login_success')


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
