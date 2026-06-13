from uuid import UUID

from pydantic import Field, field_validator

from app.core.phone import normalize_person_name, normalize_phone_number
from app.schemas.base import AppBaseModel


class SendOTPRequest(AppBaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone_number: str = Field(min_length=6, max_length=30)

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_person_name(value)

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)


class VerifyOTPRequest(AppBaseModel):
    phone_number: str = Field(min_length=6, max_length=30)
    otp_code: str = Field(min_length=4, max_length=10)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    role: str | None = Field(default=None, pattern='^(CLIENT|DRIVER)$')

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_person_name(value)

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)

    @field_validator('otp_code')
    @classmethod
    def validate_otp_code(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.isdigit():
            raise ValueError('Invalid OTP')
        return normalized


class KioskLoginRequest(AppBaseModel):
    secret: str = Field(min_length=1)


class RefreshTokenRequest(AppBaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class OTPMessageResponse(AppBaseModel):
    message: str


class AccountDeletionResponse(AppBaseModel):
    message: str


class AuthUserResponse(AppBaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone_number: str
    role: str


class UpdateProfileRequest(AppBaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_person_name(value)


class TokenResponse(AppBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    user: AuthUserResponse
