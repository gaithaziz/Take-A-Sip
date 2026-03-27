from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampCreatedMixin, UUIDPrimaryKeyMixin


class UserPushToken(UUIDPrimaryKeyMixin, TimestampCreatedMixin, Base):
    __tablename__ = 'user_push_tokens'

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(16), nullable=False)
    push_provider: Mapped[str] = mapped_column(String(16), nullable=False)
    push_token: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    device_id: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(8), nullable=False, default='en')
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=func.now(),
    )

    user = relationship('User', back_populates='push_tokens')
