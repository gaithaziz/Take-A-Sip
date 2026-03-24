from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class UserRead(AppBaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone_number: str
    role: str
    is_active: bool
    is_banned: bool
    banned_at: datetime | None
    banned_reason: str | None
    order_count: int = 0
    created_at: datetime


class UsersListResponse(AppBaseModel):
    users: list[UserRead]


class BanUserRequest(AppBaseModel):
    reason: str | None = Field(default=None, max_length=255)


class UserModerationResponse(AppBaseModel):
    id: UUID
    is_banned: bool
    banned_reason: str | None


class StaffLifecycleResponse(AppBaseModel):
    id: UUID
    role: str
    is_active: bool
    is_banned: bool


class ProvisionStaffRequest(AppBaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone_number: str = Field(min_length=6, max_length=30)
    role: str = Field(pattern='^(ADMIN|FRONTDESK|DRIVER)$')


class ProvisionStaffResponse(AppBaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone_number: str
    role: str
    created: bool
