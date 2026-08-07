from datetime import datetime
from uuid import UUID

from app.schemas.base import AppBaseModel


class PublicStoreStatusRead(AppBaseModel):
    ordering_enabled: bool


class StoreStatusRead(AppBaseModel):
    ordering_enabled: bool
    updated_at: datetime | None = None
    updated_by_user_id: UUID | None = None


class StoreStatusUpdate(AppBaseModel):
    ordering_enabled: bool
