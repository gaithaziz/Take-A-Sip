import enum
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class PromotionType(str, enum.Enum):
    BUY_N_GET_M_FREE = 'BUY_N_GET_M_FREE'
    FIRST_TIME = 'FIRST_TIME'
    FREE_DELIVERY_ABOVE_AMOUNT = 'FREE_DELIVERY_ABOVE_AMOUNT'
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
    required_completed_orders: Mapped[int | None] = mapped_column(Integer, nullable=True)
    buy_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    free_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    loyalty_rule_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey('loyalty_rules.id', ondelete='SET NULL'), nullable=True
    )

    loyalty_rule = relationship('LoyaltyRule', back_populates='promotions')
    targets = relationship('PromotionTarget', back_populates='promotion', cascade='all, delete-orphan')


class PromotionTarget(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'promotion_targets'
    __table_args__ = (
        UniqueConstraint('promotion_id', 'target_group', 'entity_type', 'entity_id', name='uq_promotion_target_group_entity'),
    )

    promotion_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey('promotions.id', ondelete='CASCADE'), nullable=False
    )
    target_group: Mapped[str] = mapped_column(String(16), nullable=False, default='scope')
    entity_type: Mapped[str] = mapped_column(String(16), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)

    promotion = relationship('Promotion', back_populates='targets')


class LoyaltyRule(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'loyalty_rules'

    required_orders: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_type: Mapped[str] = mapped_column(String(100), nullable=False)
    reward_value: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    promotions = relationship('Promotion', back_populates='loyalty_rule')
