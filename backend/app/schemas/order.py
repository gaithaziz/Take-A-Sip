from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class OrderAddonCreate(AppBaseModel):
    addon_id: UUID


class OrderItemCreate(AppBaseModel):
    size_id: UUID
    quantity: int = Field(ge=1)
    addon_ids: list[UUID] = Field(default_factory=list)


class OrderCreateRequest(AppBaseModel):
    order_type: str = Field(pattern='^(pickup|delivery)$')
    notes: str | None = None
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemAddonRead(AppBaseModel):
    id: UUID
    addon_name_snapshot: str
    price_snapshot: Decimal


class OrderItemRead(AppBaseModel):
    id: UUID
    item_name_snapshot: str
    size_snapshot: str
    price_snapshot: Decimal
    quantity: int
    addons: list[OrderItemAddonRead] = Field(default_factory=list)


class OrderRead(AppBaseModel):
    id: UUID
    order_number: int
    user_id: UUID
    status: str
    order_type: str
    created_at: datetime
    notes: str | None
    items: list[OrderItemRead] = Field(default_factory=list)


class OrderListResponse(AppBaseModel):
    orders: list[OrderRead]


class AcceptOrderResponse(AppBaseModel):
    id: UUID
    status: str
