from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampCreatedMixin


class OTPChallenge(TimestampCreatedMixin, Base):
    __tablename__ = 'otp_challenges'

    phone_number: Mapped[str] = mapped_column(String(length=32), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(length=64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resend_available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
