from datetime import datetime, timezone
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import log_structured
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.schemas.auth import SendOTPRequest, TokenResponse, VerifyOTPRequest
from app.services.otp_service import otp_service
from app.services.sms_service import SMSProviderError, build_sms_provider

logger = logging.getLogger(__name__)


async def send_otp(payload: SendOTPRequest) -> str:
    code = otp_service.generate_and_store(payload.phone_number)
    sms_provider = build_sms_provider()
    try:
        await sms_provider.send_sms(
            payload.phone_number,
            f'Your verification code is {code}. It expires in 5 minutes.',
        )
    except SMSProviderError as exc:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_send_failed',
            {'phone_number_last4': payload.phone_number[-4:]},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='OTP delivery is temporarily unavailable',
        ) from exc
    log_structured(
        logger,
        logging.INFO,
        'auth.otp_sent',
        {'phone_number_last4': payload.phone_number[-4:]},
    )
    return code


async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession) -> TokenResponse:
    is_valid = otp_service.verify(payload.phone_number, payload.otp_code)
    if not is_valid:
        log_structured(
            logger,
            logging.WARNING,
            'auth.otp_verify_failed',
            {'phone_number_last4': payload.phone_number[-4:]},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid OTP')

    result = await db.execute(select(User).where(User.phone_number == payload.phone_number))
    user = result.scalar_one_or_none()
    requested_role = payload.role or UserRole.CLIENT.value

    if user is None:
        if not payload.first_name or not payload.last_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='first_name and last_name are required for signup',
            )
        if requested_role not in {UserRole.CLIENT.value, UserRole.DRIVER.value}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid role for signup')
        user = User(
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone_number=payload.phone_number,
            role=UserRole(requested_role),
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
    elif payload.role and user.role.value != payload.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Role mismatch for this account')

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    token = create_access_token(str(user.id), user.role.value)
    log_structured(
        logger,
        logging.INFO,
        'auth.login_success',
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
