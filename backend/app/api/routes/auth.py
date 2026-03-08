from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import OTPMessageResponse, SendOTPRequest, TokenResponse, VerifyOTPRequest
from app.services.auth_service import send_otp, verify_otp

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/send-otp', response_model=OTPMessageResponse)
async def send_otp_endpoint(payload: SendOTPRequest) -> OTPMessageResponse:
    await send_otp(payload)
    return OTPMessageResponse(message='OTP sent successfully')


@router.post('/verify-otp', response_model=TokenResponse)
async def verify_otp_endpoint(
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await verify_otp(payload, db)
