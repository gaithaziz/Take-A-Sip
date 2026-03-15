from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class SendOTPRequest(AppBaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone_number: str = Field(min_length=6, max_length=30)


class VerifyOTPRequest(AppBaseModel):
    phone_number: str = Field(min_length=6, max_length=30)
    otp_code: str = Field(min_length=4, max_length=10)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    role: str | None = Field(default=None, pattern='^(CLIENT|DRIVER)$')


class OTPMessageResponse(AppBaseModel):
    message: str


class AuthUserResponse(AppBaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone_number: str
    role: str


class TokenResponse(AppBaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: AuthUserResponse
