from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.schemas.auth import SendOTPRequest, TokenResponse, VerifyOTPRequest
from app.services.otp_service import otp_service
from app.services.sms_service import SMSProviderError, build_sms_provider


async def send_otp(payload: SendOTPRequest) -> str:
    code = otp_service.generate_and_store(payload.phone_number)
    sms_provider = build_sms_provider()
    try:
        await sms_provider.send_sms(
            payload.phone_number,
            f'Your verification code is {code}. It expires in 5 minutes.',
        )
    except SMSProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='OTP delivery is temporarily unavailable',
        ) from exc
    return code


async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession) -> TokenResponse:
    is_valid = otp_service.verify(payload.phone_number, payload.otp_code)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid OTP')

    result = await db.execute(select(User).where(User.phone_number == payload.phone_number))
    user = result.scalar_one_or_none()

    if user is None:
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

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    token = create_access_token(str(user.id), user.role.value)
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
