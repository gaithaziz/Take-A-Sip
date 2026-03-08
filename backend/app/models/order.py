import enum
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampCreatedMixin, UUIDPrimaryKeyMixin


class OrderStatus(str, enum.Enum):
    NEW = 'NEW'
    ACCEPTED = 'ACCEPTED'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'


class OrderType(str, enum.Enum):
    PICKUP = 'pickup'
    DELIVERY = 'delivery'


class Order(UUIDPrimaryKeyMixin, TimestampCreatedMixin, Base):
    __tablename__ = 'orders'

    order_number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name='order_status', native_enum=False), nullable=False, default=OrderStatus.NEW
    )
    order_type: Mapped[OrderType] = mapped_column(
        Enum(OrderType, name='order_type', native_enum=False), nullable=False
    )
    delivery_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship('User', back_populates='orders')
    items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')
    events = relationship('OrderEvent', back_populates='order', cascade='all, delete-orphan')

    @property
    def customer_name(self) -> str | None:
        if not self.user:
            return None
        return f'{self.user.first_name} {self.user.last_name}'.strip()

    @property
    def customer_phone(self) -> str | None:
        if not self.user:
            return None
        return self.user.phone_number


class OrderItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'order_items'

    order_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False
    )
    item_name_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    size_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    price_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    order = relationship('Order', back_populates='items')
    addons = relationship('OrderItemAddon', back_populates='order_item', cascade='all, delete-orphan')


class OrderItemAddon(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'order_item_addons'

    order_item_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('order_items.id', ondelete='CASCADE'), nullable=False
    )
    addon_name_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    price_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order_item = relationship('OrderItem', back_populates='addons')


class OrderEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = 'order_events'

    order_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    order = relationship('Order', back_populates='events')
