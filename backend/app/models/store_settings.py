from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin


class StoreSettings(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'store_settings'

    store_name: Mapped[str] = mapped_column(String(120), nullable=False, default='Take A Sip')
    store_latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    store_longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    ordering_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default='true')
    ordering_updated_by_user_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
