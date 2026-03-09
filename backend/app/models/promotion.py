import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin


class PromotionType(str, enum.Enum):
    FIRST_TIME = 'FIRST_TIME'
    LOYALTY = 'LOYALTY'
    TEMPORARY = 'TEMPORARY'


class Promotion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'promotions'

    title_en: Mapped[str] = mapped_column(String(200), nullable=False)
    title_ar: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[PromotionType] = mapped_column(
        Enum(PromotionType, name='promotion_type', native_enum=False), nullable=False
    )
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class LoyaltyRule(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'loyalty_rules'

    required_orders: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_type: Mapped[str] = mapped_column(String(100), nullable=False)
    reward_value: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
