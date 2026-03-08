from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.schemas.base import AppBaseModel


class PromotionRead(AppBaseModel):
    id: UUID
    title_en: str
    title_ar: str
    type: str
    value: Decimal
    starts_at: datetime
    ends_at: datetime
    is_active: bool


class ActivePromotionsResponse(AppBaseModel):
    promotions: list[PromotionRead]
