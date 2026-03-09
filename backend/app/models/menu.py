from datetime import datetime, time
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class Section(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'sections'

    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    items = relationship('Item', back_populates='section', cascade='all, delete-orphan')


class Item(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'items'

    section_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('sections.id', ondelete='CASCADE'), nullable=False
    )
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    section = relationship('Section', back_populates='items')
    item_types = relationship('ItemType', back_populates='item', cascade='all, delete-orphan')


class ItemType(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'item_types'

    item_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('items.id', ondelete='CASCADE'), nullable=False
    )
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    item = relationship('Item', back_populates='item_types')
    sizes = relationship('Size', back_populates='item_type', cascade='all, delete-orphan')


class Size(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'sizes'

    type_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('item_types.id', ondelete='CASCADE'), nullable=False
    )
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    item_type = relationship('ItemType', back_populates='sizes')
    addons = relationship('Addon', back_populates='size', cascade='all, delete-orphan')


class Addon(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'addons'

    size_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('sizes.id', ondelete='CASCADE'), nullable=False
    )
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    size = relationship('Size', back_populates='addons')


class MenuSchedule(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'menu_schedules'

    entity_type: Mapped[str] = mapped_column(String(16), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time(), nullable=False)
    end_time: Mapped[time] = mapped_column(Time(), nullable=False)
    days_of_week: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
