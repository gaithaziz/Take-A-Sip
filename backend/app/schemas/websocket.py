from uuid import UUID

from app.schemas.base import AppBaseModel


class OrderEventMessage(AppBaseModel):
    event: str
    order_id: UUID
    order_number: int
    status: str
