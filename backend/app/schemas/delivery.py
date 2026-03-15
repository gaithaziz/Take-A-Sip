from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class DeliveryDistanceBandCreate(AppBaseModel):
    min_distance_km: Decimal = Field(ge=0)
    max_distance_km: Decimal = Field(gt=0)
    fee_amount: Decimal = Field(ge=0)
    is_active: bool = True
    sort_order: int = 0


class DeliveryDistanceBandUpdate(AppBaseModel):
    min_distance_km: Decimal | None = Field(default=None, ge=0)
    max_distance_km: Decimal | None = Field(default=None, gt=0)
    fee_amount: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None
    sort_order: int | None = None


class DeliveryDistanceBandRead(AppBaseModel):
    id: UUID
    min_distance_km: Decimal
    max_distance_km: Decimal
    fee_amount: Decimal
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class DeliveryDistanceBandListResponse(AppBaseModel):
    bands: list[DeliveryDistanceBandRead]
