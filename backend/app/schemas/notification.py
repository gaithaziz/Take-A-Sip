from datetime import datetime
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.base import AppBaseModel


class PushTokenRegisterRequest(AppBaseModel):
    push_token: str = Field(min_length=10, max_length=512)
    platform: str = Field(pattern='^(android|ios)$')
    push_provider: str = Field(pattern='^(fcm|apns)$')
    device_id: str = Field(min_length=3, max_length=255)
    language: str = Field(default='en', pattern='^(en|ar)$')

    @model_validator(mode='after')
    def validate_provider_for_platform(self):
        expected_provider = 'fcm' if self.platform == 'android' else 'apns'
        if self.push_provider != expected_provider:
            raise ValueError(f'push_provider must be {expected_provider} for {self.platform}')
        return self


class PushTokenDeactivateRequest(AppBaseModel):
    push_token: str = Field(min_length=10, max_length=512)


class PushTokenRead(AppBaseModel):
    id: UUID
    user_id: UUID
    platform: str
    push_provider: str
    push_token: str
    device_id: str
    language: str
    is_active: bool
    last_seen_at: datetime
    created_at: datetime


class PushTokenResponse(AppBaseModel):
    token: PushTokenRead
