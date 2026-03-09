from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

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


class PromotionsListResponse(AppBaseModel):
    promotions: list[PromotionRead]


class PromotionCreate(AppBaseModel):
    title_en: str = Field(min_length=1, max_length=200)
    title_ar: str = Field(min_length=1, max_length=200)
    type: str
    value: Decimal
    starts_at: datetime
    ends_at: datetime
    is_active: bool = True


class PromotionUpdate(AppBaseModel):
    title_en: str | None = Field(default=None, min_length=1, max_length=200)
    title_ar: str | None = Field(default=None, min_length=1, max_length=200)
    type: str | None = None
    value: Decimal | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None


class LoyaltyRuleRead(AppBaseModel):
    id: UUID
    required_orders: int
    reward_type: str
    reward_value: str
    is_active: bool


class LoyaltyRulesListResponse(AppBaseModel):
    rules: list[LoyaltyRuleRead]


class LoyaltyRuleCreate(AppBaseModel):
    required_orders: int = Field(ge=1)
    reward_type: str = Field(min_length=1, max_length=100)
    reward_value: str = Field(min_length=1, max_length=255)
    is_active: bool = True


class LoyaltyRuleUpdate(AppBaseModel):
    required_orders: int | None = Field(default=None, ge=1)
    reward_type: str | None = Field(default=None, min_length=1, max_length=100)
    reward_value: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None
