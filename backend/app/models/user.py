import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampCreatedMixin, UUIDPrimaryKeyMixin


class UserRole(str, enum.Enum):
    CLIENT = 'CLIENT'
    ADMIN = 'ADMIN'
    FRONTDESK = 'FRONTDESK'
    DRIVER = 'DRIVER'


class User(UUIDPrimaryKeyMixin, TimestampCreatedMixin, Base):
    __tablename__ = 'users'

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name='user_role', native_enum=False), nullable=False, default=UserRole.CLIENT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    banned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    banned_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    orders = relationship('Order', back_populates='user', foreign_keys='Order.user_id')
    order_ratings = relationship('OrderRating', back_populates='user', foreign_keys='OrderRating.user_id')
    push_tokens = relationship('UserPushToken', back_populates='user', cascade='all, delete-orphan')
    refresh_tokens = relationship('UserRefreshToken', back_populates='user', cascade='all, delete-orphan')
