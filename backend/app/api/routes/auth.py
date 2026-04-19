from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AccountDeletionResponse,
    AuthUserResponse,
    OTPMessageResponse,
    SendOTPRequest,
    TokenResponse,
    UpdateProfileRequest,
    VerifyOTPRequest,
)
from app.services.auth_service import delete_account, send_otp, update_profile, verify_otp

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/send-otp', response_model=OTPMessageResponse)
async def send_otp_endpoint(
    payload: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPMessageResponse:
    await send_otp(payload, db)
    return OTPMessageResponse(message='OTP sent successfully')


@router.post('/verify-otp', response_model=TokenResponse)
async def verify_otp_endpoint(
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await verify_otp(payload, db)


@router.get('/me', response_model=AuthUserResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> AuthUserResponse:
    return AuthUserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone_number=current_user.phone_number,
        role=current_user.role.value,
    )


@router.patch('/me', response_model=AuthUserResponse)
async def update_profile_endpoint(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthUserResponse:
    return await update_profile(current_user, payload, db)


@router.delete('/me', response_model=AccountDeletionResponse)
async def delete_account_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountDeletionResponse:
    return await delete_account(current_user, db)
