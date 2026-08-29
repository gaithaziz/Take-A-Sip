from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FirstTimeOfferClaim(Base):
    __tablename__ = 'first_time_offer_claims'

    phone_fingerprint: Mapped[str] = mapped_column(String(64), primary_key=True)
    reason: Mapped[str] = mapped_column(String(32), nullable=False)
    source_order_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('orders.id', ondelete='SET NULL'), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
