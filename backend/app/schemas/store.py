from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.base import AppBaseModel


class WorkingHoursDay(AppBaseModel):
    day_of_week: int = Field(ge=0, le=6)
    is_open: bool
    opens_at: str | None = Field(default=None, pattern=r'^([01]\d|2[0-3]):[0-5]\d$')
    closes_at: str | None = Field(default=None, pattern=r'^([01]\d|2[0-3]):[0-5]\d$')

    @model_validator(mode='after')
    def validate_times(self):
        if self.is_open:
            if not self.opens_at or not self.closes_at:
                raise ValueError('Open days require opening and closing times')
            if self.opens_at == self.closes_at:
                raise ValueError('Opening and closing times must be different')
        return self


class PublicStoreStatusRead(AppBaseModel):
    ordering_enabled: bool
    accepting_orders: bool = True
    unavailable_reason: str | None = None
    timezone: str = 'Asia/Amman'
    working_hours: list[WorkingHoursDay] | None = None
    current_open_at: datetime | None = None
    next_open_at: datetime | None = None
    next_status_change_at: datetime | None = None
    minimum_delivery_order_amount: Decimal = Decimal('0.00')
    minimum_pickup_order_amount: Decimal = Decimal('0.00')


class StoreStatusRead(AppBaseModel):
    ordering_enabled: bool
    accepting_orders: bool = True
    unavailable_reason: str | None = None
    timezone: str = 'Asia/Amman'
    working_hours: list[WorkingHoursDay] | None = None
    current_open_at: datetime | None = None
    next_open_at: datetime | None = None
    next_status_change_at: datetime | None = None
    minimum_delivery_order_amount: Decimal = Decimal('0.00')
    minimum_pickup_order_amount: Decimal = Decimal('0.00')
    updated_at: datetime | None = None
    updated_by_user_id: UUID | None = None


class StoreStatusUpdate(AppBaseModel):
    ordering_enabled: bool


class StoreSettingsUpdate(AppBaseModel):
    ordering_enabled: bool | None = None
    working_hours: list[WorkingHoursDay] | None = None
    minimum_delivery_order_amount: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    minimum_pickup_order_amount: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)

    @model_validator(mode='after')
    def validate_schedule(self):
        if self.working_hours is not None:
            days = [entry.day_of_week for entry in self.working_hours]
            if len(days) != 7 or set(days) != set(range(7)):
                raise ValueError('Working hours must contain each weekday exactly once')
        return self
