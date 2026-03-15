from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin


class StoreSettings(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'store_settings'

    store_name: Mapped[str] = mapped_column(String(120), nullable=False, default='Take A Sip')
    store_latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    store_longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
