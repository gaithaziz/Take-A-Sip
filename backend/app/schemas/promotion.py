from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class PromotionTargetRead(AppBaseModel):
    id: UUID
    promotion_id: UUID
    entity_type: str
    entity_id: UUID
    entity_name_en: str | None = None
    entity_name_ar: str | None = None


class PromotionTargetCreate(AppBaseModel):
    entity_type: str = Field(pattern='^(section|item|type|size|addon)$')
    entity_id: UUID


class PromotionRead(AppBaseModel):
    id: UUID
    title_en: str
    title_ar: str
    type: str
    value: Decimal
    starts_at: datetime
    ends_at: datetime
    is_active: bool
    required_completed_orders: int | None = None
    buy_quantity: int | None = None
    free_quantity: int | None = None
    loyalty_rule_id: UUID | None = None
    targets: list[PromotionTargetRead] = Field(default_factory=list)
    scope_summary_en: str
    scope_summary_ar: str
    eligibility_summary_en: str
    eligibility_summary_ar: str


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
    required_completed_orders: int | None = Field(default=None, ge=0)
    buy_quantity: int | None = Field(default=None, ge=1)
    free_quantity: int | None = Field(default=None, ge=1)
    loyalty_rule_id: UUID | None = None
    targets: list[PromotionTargetCreate] = Field(default_factory=list)


class PromotionUpdate(AppBaseModel):
    title_en: str | None = Field(default=None, min_length=1, max_length=200)
    title_ar: str | None = Field(default=None, min_length=1, max_length=200)
    type: str | None = None
    value: Decimal | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None
    required_completed_orders: int | None = Field(default=None, ge=0)
    buy_quantity: int | None = Field(default=None, ge=1)
    free_quantity: int | None = Field(default=None, ge=1)
    loyalty_rule_id: UUID | None = None
    targets: list[PromotionTargetCreate] | None = None


class PromotionEvaluationItem(AppBaseModel):
    size_id: UUID
    quantity: int = Field(ge=1)
    addon_ids: list[UUID] = Field(default_factory=list)


class PromotionEvaluationRequest(AppBaseModel):
    items: list[PromotionEvaluationItem] = Field(min_length=1)


class PromotionEvaluationEntry(AppBaseModel):
    promotion: PromotionRead
    discount: Decimal
    matched_subtotal: Decimal
    reason_code: str | None = None
    reason_summary_en: str | None = None
    reason_summary_ar: str | None = None


class PromotionEvaluationResponse(AppBaseModel):
    applied_promotion: PromotionRead | None = None
    discount: Decimal
    eligible_promotions: list[PromotionEvaluationEntry] = Field(default_factory=list)
    ineligible_promotions: list[PromotionEvaluationEntry] = Field(default_factory=list)


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
