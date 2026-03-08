from collections.abc import Iterable
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.menu import Item, ItemType, Section, Size
from app.models.order import Order, OrderEvent, OrderItem, OrderItemAddon, OrderStatus, OrderType
from app.models.user import User, UserRole
from app.schemas.order import OrderCreateRequest
from app.services.menu_service import get_schedules_index, is_entity_available


def _normalize_order_type(value: str) -> OrderType:
    if value == 'pickup':
        return OrderType.PICKUP
    if value == 'delivery':
        return OrderType.DELIVERY
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid order_type')


async def _next_order_number(db: AsyncSession) -> int:
    result = await db.execute(select(func.coalesce(func.max(Order.order_number), 0) + 1))
    return int(result.scalar_one())


async def _load_sizes(db: AsyncSession, size_ids: Iterable[UUID]) -> dict[UUID, Size]:
    result = await db.execute(
        select(Size)
        .where(Size.id.in_(list(size_ids)))
        .options(
            selectinload(Size.item_type)
            .selectinload(ItemType.item)
            .selectinload(Item.section),
            selectinload(Size.addons),
        )
    )
    sizes = list(result.scalars().unique().all())
    return {size.id: size for size in sizes}


async def create_order(db: AsyncSession, user: User, payload: OrderCreateRequest) -> Order:
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')

    size_ids = [line.size_id for line in payload.items]
    sizes_by_id = await _load_sizes(db, size_ids)
    now = datetime.now(timezone.utc)
    schedules_index = await get_schedules_index(db)

    missing_size_ids = [sid for sid in size_ids if sid not in sizes_by_id]
    if missing_size_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Size not found')

    order = Order(
        order_number=await _next_order_number(db),
        user_id=user.id,
        status=OrderStatus.NEW,
        order_type=_normalize_order_type(payload.order_type),
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    for line in payload.items:
        size = sizes_by_id[line.size_id]
        item_type = size.item_type
        item = item_type.item

        if not (
            size.is_active
            and item_type.is_active
            and item.is_active
            and item.section.is_active
            and is_entity_available(schedules_index, 'section', item.section.id, now)
            and is_entity_available(schedules_index, 'item', item.id, now)
            and is_entity_available(schedules_index, 'type', item_type.id, now)
            and is_entity_available(schedules_index, 'size', size.id, now)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='One of the menu elements is inactive',
            )

        order_item = OrderItem(
            order_id=order.id,
            item_name_snapshot=item.name_en,
            size_snapshot=size.name_en,
            price_snapshot=Decimal(size.price),
            quantity=line.quantity,
        )
        db.add(order_item)
        await db.flush()

        available_addons = {addon.id: addon for addon in size.addons if addon.is_active}
        for addon_id in line.addon_ids:
            addon = available_addons.get(addon_id)
            if addon is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Addon not available for selected size',
                )
            if not is_entity_available(schedules_index, 'addon', addon.id, now):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Addon not available for selected size',
                )
            db.add(
                OrderItemAddon(
                    order_item_id=order_item.id,
                    addon_name_snapshot=addon.name_en,
                    price_snapshot=Decimal(addon.price),
                )
            )

    db.add(OrderEvent(order_id=order.id, event_type='order.created'))
    await db.commit()

    result = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items).selectinload(OrderItem.addons))
    )
    return result.scalar_one()


async def reorder_order(db: AsyncSession, user: User, source_order_id: UUID) -> Order:
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')

    source_order = await get_order_by_id(db, source_order_id)
    if not source_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Order not found')

    if source_order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

    order = Order(
        order_number=await _next_order_number(db),
        user_id=user.id,
        status=OrderStatus.NEW,
        order_type=source_order.order_type,
        notes=source_order.notes,
    )
    db.add(order)
    await db.flush()

    for source_item in source_order.items:
        order_item = OrderItem(
            order_id=order.id,
            item_name_snapshot=source_item.item_name_snapshot,
            size_snapshot=source_item.size_snapshot,
            price_snapshot=Decimal(source_item.price_snapshot),
            quantity=source_item.quantity,
        )
        db.add(order_item)
        await db.flush()

        for source_addon in source_item.addons:
            db.add(
                OrderItemAddon(
                    order_item_id=order_item.id,
                    addon_name_snapshot=source_addon.addon_name_snapshot,
                    price_snapshot=Decimal(source_addon.price_snapshot),
                )
            )

    db.add(OrderEvent(order_id=order.id, event_type='order.created'))
    db.add(OrderEvent(order_id=order.id, event_type='order.reordered'))
    await db.commit()

    result = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items).selectinload(OrderItem.addons))
    )
    return result.scalar_one()


async def get_order_by_id(db: AsyncSession, order_id: UUID) -> Order | None:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items).selectinload(OrderItem.addons))
    )
    return result.scalar_one_or_none()


async def get_user_orders(db: AsyncSession, user_id: UUID) -> list[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .options(selectinload(Order.items).selectinload(OrderItem.addons))
    )
    return list(result.scalars().unique().all())


async def list_orders(db: AsyncSession, status_filter: str | None = None) -> list[Order]:
    query: Select[tuple[Order]] = (
        select(Order)
        .order_by(Order.created_at.desc())
        .options(selectinload(Order.items).selectinload(OrderItem.addons))
    )
    if status_filter:
        try:
            query = query.where(Order.status == OrderStatus(status_filter))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid status') from exc

    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def accept_order(db: AsyncSession, order_id: UUID, actor: User) -> Order:
    if actor.role not in {UserRole.ADMIN, UserRole.FRONTDESK}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Order not found')

    order.status = OrderStatus.ACCEPTED
    db.add(OrderEvent(order_id=order.id, event_type='order.accepted'))
    await db.commit()
    await db.refresh(order)
    return order
