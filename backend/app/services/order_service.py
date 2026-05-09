import math
import logging
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import Numeric, Select, and_, case, cast, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.logging import log_structured
from app.models.delivery import DeliveryDistanceBand
from app.models.menu import Item, ItemType, Size
from app.models.order import Order, OrderEvent, OrderItem, OrderItemAddon, OrderRating, OrderStatus, OrderType
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole
from app.schemas.order import AssignDriverRequest, OrderCreateRequest
from app.schemas.promotion import PromotionEvaluationItem
from app.services.menu_service import get_schedules_index, is_entity_available
from app.services.notification_service import emit_post_commit_order_notifications
from app.services.promotion_service import evaluate_promotions_for_user

logger = logging.getLogger(__name__)


def _normalize_order_type(value: str) -> OrderType:
    if value == 'pickup':
        return OrderType.PICKUP
    if value == 'delivery':
        return OrderType.DELIVERY
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid order_type')


def _quantize(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def _build_google_maps_url(order: Order) -> str | None:
    if order.order_type != OrderType.DELIVERY:
        return None
    if order.delivery_latitude is not None and order.delivery_longitude is not None:
        return f'https://www.google.com/maps/dir/?api=1&destination={order.delivery_latitude},{order.delivery_longitude}'
    if order.delivery_address:
        return f'https://www.google.com/maps/search/?api=1&query={order.delivery_address}'
    return None


def order_to_read_dict(order: Order) -> dict:
    payload = {
        'id': order.id,
        'order_number': order.order_number,
        'user_id': order.user_id,
        'customer_name': order.customer_name,
        'customer_phone': order.customer_phone,
        'delivery_address': order.delivery_address,
        'delivery_address_text': order.delivery_address,
        'delivery_latitude': order.delivery_latitude,
        'delivery_longitude': order.delivery_longitude,
        'delivery_distance_km': order.delivery_distance_km,
        'delivery_fee': order.delivery_fee,
        'delivery_distance_band_id': order.delivery_distance_band_id,
        'subtotal_amount': order.subtotal_amount,
        'discount_amount': order.discount_amount,
        'total_amount': order.total_amount,
        'applied_promotion_id': order.applied_promotion_id,
        'applied_promotion_title_en': order.applied_promotion_title_en,
        'applied_promotion_title_ar': order.applied_promotion_title_ar,
        'assigned_driver_id': order.assigned_driver_id,
        'assigned_driver_name': (
            f'{order.assigned_driver.first_name} {order.assigned_driver.last_name}'.strip()
            if order.assigned_driver
            else None
        ),
        'assigned_driver_phone': order.assigned_driver.phone_number if order.assigned_driver else None,
        'assigned_at': order.assigned_at,
        'completed_at': order.completed_at,
        'google_maps_url': _build_google_maps_url(order),
        'status': order.status.value,
        'order_type': order.order_type.value,
        'created_at': order.created_at,
        'notes': order.notes,
        'items': order.items,
        'rating': order.rating,
    }
    return payload


def _extract_delivery_fields(payload: OrderCreateRequest) -> tuple[str | None, float | None, float | None]:
    address = (payload.delivery_address_text or payload.delivery_address or '').strip() or None
    lat = payload.delivery_latitude if payload.delivery_latitude is not None else payload.delivery_lat
    lng = payload.delivery_longitude if payload.delivery_longitude is not None else payload.delivery_lng
    return address, lat, lng


def _validate_delivery_coordinates(lat: float | None, lng: float | None) -> tuple[float, float]:
    if lat is None or lng is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='delivery_lat and delivery_lng are required for delivery orders',
        )
    if lat < -90 or lat > 90 or lng < -180 or lng > 180:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid delivery coordinates')
    return lat, lng


def _validate_delivery_fields(order_type: OrderType, payload: OrderCreateRequest) -> tuple[str | None, float | None, float | None]:
    address, lat, lng = _extract_delivery_fields(payload)
    if order_type == OrderType.DELIVERY:
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='delivery_address is required for delivery orders',
            )
        _validate_delivery_coordinates(lat, lng)
    return address, lat, lng


async def get_delivery_quote(db: AsyncSession, customer_lat: float | None, customer_lng: float | None) -> dict:
    lat, lng = _validate_delivery_coordinates(customer_lat, customer_lng)
    distance_km, delivery_fee, band_id = await _resolve_delivery_pricing(db, lat, lng)
    return {
        'delivery_distance_km': distance_km,
        'delivery_fee': delivery_fee,
        'delivery_distance_band_id': band_id,
    }


async def _lock_user_for_order_creation(db: AsyncSession, user_id: UUID) -> None:
    await db.execute(select(User.id).where(User.id == user_id).with_for_update())


_ACTIVE_CUSTOMER_ORDER_STATUSES = {
    OrderStatus.NEW,
    OrderStatus.ACCEPTED,
    OrderStatus.ASSIGNED,
    OrderStatus.OUT_FOR_DELIVERY,
}


async def _ensure_no_active_customer_order(db: AsyncSession, user_id: UUID) -> None:
    result = await db.execute(
        select(Order.id)
        .where(
            Order.user_id == user_id,
            Order.status.in_(_ACTIVE_CUSTOMER_ORDER_STATUSES),
        )
        .limit(1)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='You already have an order in progress',
        )


def _line_snapshot_total(size: Size, addon_ids: list[UUID], quantity: int) -> Decimal:
    addon_total = sum((Decimal(addon.price) for addon in size.addons if addon.id in addon_ids), Decimal('0.00'))
    return (Decimal(size.price) + addon_total) * quantity


def _calculate_order_subtotal(payload: OrderCreateRequest, sizes_by_id: dict[UUID, Size]) -> Decimal:
    subtotal = Decimal('0.00')
    for line in payload.items:
        subtotal += _line_snapshot_total(sizes_by_id[line.size_id], line.addon_ids, line.quantity)
    return _quantize(subtotal, '0.01')


def _ensure_order_limits(payload: OrderCreateRequest, sizes_by_id: dict[UUID, Size]) -> None:
    quantities_by_size: dict[UUID, int] = {}
    for line in payload.items:
        quantities_by_size[line.size_id] = quantities_by_size.get(line.size_id, 0) + line.quantity

    for size_id, quantity in quantities_by_size.items():
        order_limit = sizes_by_id[size_id].order_limit
        if order_limit is not None and quantity > order_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Order quantity exceeds product limit',
            )


async def _next_order_number(db: AsyncSession) -> int:
    # Serialize order-number allocation to avoid race collisions under concurrent creates.
    await db.execute(text('SELECT pg_advisory_xact_lock(91234567)'))
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


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> Decimal:
    radius_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _quantize(Decimal(radius_km * c), '0.001')


async def _get_store_coordinates(db: AsyncSession) -> tuple[float, float]:
    settings_row = await db.execute(select(StoreSettings).order_by(StoreSettings.updated_at.desc()).limit(1))
    store = settings_row.scalar_one_or_none()
    if store is not None:
        return float(store.store_latitude), float(store.store_longitude)

    settings = get_settings()
    lat = getattr(settings, 'store_latitude', None)
    lng = getattr(settings, 'store_longitude', None)
    if lat is None or lng is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Delivery is temporarily unavailable: store location is not configured',
        )
    return float(lat), float(lng)


def _band_matches(distance_km: Decimal, band: DeliveryDistanceBand) -> bool:
    return band.min_distance_km <= distance_km and distance_km <= band.max_distance_km


async def _resolve_delivery_pricing(
    db: AsyncSession, customer_lat: float, customer_lng: float
) -> tuple[Decimal, Decimal, UUID]:
    store_lat, store_lng = await _get_store_coordinates(db)
    distance_km = _haversine_km(store_lat, store_lng, customer_lat, customer_lng)

    bands_result = await db.execute(
        select(DeliveryDistanceBand)
        .where(DeliveryDistanceBand.is_active.is_(True))
        .order_by(DeliveryDistanceBand.sort_order.asc(), DeliveryDistanceBand.min_distance_km.asc())
    )
    bands = list(bands_result.scalars().all())
    matched = next((band for band in bands if _band_matches(distance_km, band)), None)
    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No active delivery distance band covers destination distance',
        )
    return distance_km, Decimal(matched.fee_amount), matched.id


async def _log_event(
    db: AsyncSession,
    order_id: UUID,
    event_type: str,
    actor_user_id: UUID | None,
    metadata: dict | None = None,
) -> None:
    db.add(
        OrderEvent(
            order_id=order_id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            metadata_json=metadata,
        )
    )


def _is_order_number_unique_violation(exc: IntegrityError) -> bool:
    payload = str(getattr(exc, 'orig', exc)).lower()
    return 'order_number' in payload and 'unique' in payload


async def create_order(db: AsyncSession, user: User, payload: OrderCreateRequest) -> Order:
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    user_id = user.id
    actor_user_id = str(user_id)

    order_type = _normalize_order_type(payload.order_type)
    delivery_address, delivery_lat, delivery_lng = _validate_delivery_fields(order_type, payload)

    size_ids = [line.size_id for line in payload.items]

    max_retries = 3
    order: Order | None = None
    for attempt in range(max_retries):
        try:
            now = datetime.now(timezone.utc)
            schedules_index = await get_schedules_index(db)
            sizes_by_id = await _load_sizes(db, size_ids)
            missing_size_ids = [sid for sid in size_ids if sid not in sizes_by_id]
            if missing_size_ids:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Size not found')
            _ensure_order_limits(payload, sizes_by_id)

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

            delivery_distance_km = None
            delivery_fee = None
            delivery_distance_band_id = None
            if order_type == OrderType.DELIVERY and delivery_lat is not None and delivery_lng is not None:
                delivery_distance_km, delivery_fee, delivery_distance_band_id = await _resolve_delivery_pricing(
                    db, delivery_lat, delivery_lng
                )

            await _lock_user_for_order_creation(db, user_id)
            await _ensure_no_active_customer_order(db, user_id)
            promotion_evaluation = await evaluate_promotions_for_user(
                db,
                user,
                [
                    PromotionEvaluationItem(
                        size_id=line.size_id,
                        quantity=line.quantity,
                        addon_ids=line.addon_ids,
                    )
                    for line in payload.items
                ],
            )
            subtotal_amount = _calculate_order_subtotal(payload, sizes_by_id)
            discount_amount = _quantize(
                min(subtotal_amount, max(Decimal('0.00'), Decimal(promotion_evaluation.discount))),
                '0.01',
            )
            payable_items_total = max(Decimal('0.00'), subtotal_amount - discount_amount)
            charged_delivery_fee = (
                Decimal('0.00')
                if order_type == OrderType.DELIVERY and promotion_evaluation.free_delivery
                else (Decimal(delivery_fee) if delivery_fee is not None else Decimal('0.00'))
            )
            total_amount = _quantize(payable_items_total + charged_delivery_fee, '0.01')
            delivery_fee = _quantize(charged_delivery_fee, '0.01') if delivery_fee is not None else None
            applied_promotion = (
                promotion_evaluation.applied_promotion
                if discount_amount > 0
                else promotion_evaluation.free_delivery_promotion
            )

            order = Order(
                order_number=await _next_order_number(db),
                user_id=user_id,
                status=OrderStatus.NEW,
                order_type=order_type,
                delivery_address=delivery_address,
                delivery_latitude=Decimal(str(delivery_lat)) if delivery_lat is not None else None,
                delivery_longitude=Decimal(str(delivery_lng)) if delivery_lng is not None else None,
                delivery_distance_km=delivery_distance_km,
                delivery_fee=delivery_fee,
                delivery_distance_band_id=delivery_distance_band_id,
                subtotal_amount=subtotal_amount,
                discount_amount=discount_amount,
                total_amount=total_amount,
                applied_promotion_id=applied_promotion.id if applied_promotion else None,
                applied_promotion_title_en=applied_promotion.title_en if applied_promotion else None,
                applied_promotion_title_ar=applied_promotion.title_ar if applied_promotion else None,
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
                    item_id_snapshot=item.id,
                    size_id_snapshot=size.id,
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
                            addon_id_snapshot=addon.id,
                            addon_name_snapshot=addon.name_en,
                            price_snapshot=Decimal(addon.price),
                        )
                    )

            await _log_event(db, order.id, 'order.created', user_id)
            await db.commit()
            break
        except IntegrityError as exc:
            await db.rollback()
            if _is_order_number_unique_violation(exc) and attempt < (max_retries - 1):
                log_structured(
                    logger,
                    logging.WARNING,
                    'order.number_conflict_retry',
                    {'attempt': attempt + 1, 'actor_user_id': actor_user_id},
                )
                continue
            raise

    if order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to create order')

    log_structured(
        logger,
        logging.INFO,
        'order.created',
        {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'order_type': order.order_type.value,
            'status': order.status.value,
            'actor_user_id': str(user.id),
        },
    )
    created_order = await get_order_by_id_or_404(db, order.id)
    await emit_post_commit_order_notifications(db, event='order.created', order=created_order)
    return created_order


async def reorder_order(db: AsyncSession, user: User, source_order_id: UUID) -> Order:
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')

    await _lock_user_for_order_creation(db, user.id)
    await _ensure_no_active_customer_order(db, user.id)

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
        delivery_address=source_order.delivery_address,
        delivery_latitude=source_order.delivery_latitude,
        delivery_longitude=source_order.delivery_longitude,
        delivery_distance_km=source_order.delivery_distance_km,
        delivery_fee=source_order.delivery_fee,
        delivery_distance_band_id=source_order.delivery_distance_band_id,
        notes=source_order.notes,
    )
    db.add(order)
    await db.flush()

    for source_item in source_order.items:
        order_item = OrderItem(
            order_id=order.id,
            item_id_snapshot=source_item.item_id_snapshot,
            size_id_snapshot=source_item.size_id_snapshot,
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
                    addon_id_snapshot=source_addon.addon_id_snapshot,
                    addon_name_snapshot=source_addon.addon_name_snapshot,
                    price_snapshot=Decimal(source_addon.price_snapshot),
                )
            )

    await _log_event(db, order.id, 'order.created', user.id)
    await _log_event(db, order.id, 'order.reordered', user.id)
    await db.commit()
    return await get_order_by_id_or_404(db, order.id)


def _order_base_query() -> Select[tuple[Order]]:
    return select(Order).options(
        selectinload(Order.user),
        selectinload(Order.assigned_driver),
        selectinload(Order.items).selectinload(OrderItem.addons),
        selectinload(Order.rating),
    )


def _order_totals_subquery():
    addon_totals = (
        select(
            OrderItemAddon.order_item_id.label('order_item_id'),
            func.coalesce(func.sum(cast(OrderItemAddon.price_snapshot, Numeric(12, 2))), 0).label('addon_total'),
        )
        .group_by(OrderItemAddon.order_item_id)
        .subquery()
    )
    item_totals = (
        select(
            OrderItem.order_id.label('order_id'),
            (
                (
                    cast(OrderItem.price_snapshot, Numeric(12, 2))
                    + func.coalesce(cast(addon_totals.c.addon_total, Numeric(12, 2)), 0)
                )
                * OrderItem.quantity
            ).label('line_total'),
        )
        .select_from(OrderItem)
        .outerjoin(addon_totals, addon_totals.c.order_item_id == OrderItem.id)
        .subquery()
    )
    return (
        select(
            item_totals.c.order_id.label('order_id'),
            func.coalesce(func.sum(cast(item_totals.c.line_total, Numeric(12, 2))), 0).label('items_total'),
        )
        .group_by(item_totals.c.order_id)
        .subquery()
    )


async def get_order_by_id(db: AsyncSession, order_id: UUID) -> Order | None:
    result = await db.execute(_order_base_query().where(Order.id == order_id))
    return result.scalar_one_or_none()


async def get_order_by_id_or_404(db: AsyncSession, order_id: UUID) -> Order:
    order = await get_order_by_id(db, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Order not found')
    return order


async def get_user_orders(db: AsyncSession, user_id: UUID) -> list[Order]:
    result = await db.execute(
        _order_base_query().where(Order.user_id == user_id).order_by(Order.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def list_orders(
    db: AsyncSession,
    status_filter: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
    order_type: str | None = None,
) -> list[Order]:
    query: Select[tuple[Order]] = _order_base_query().order_by(Order.created_at.desc())
    if status_filter:
        try:
            query = query.where(Order.status == OrderStatus(status_filter))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid status') from exc
    if order_type:
        try:
            query = query.where(Order.order_type == OrderType(order_type))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid order_type') from exc
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def accept_order(db: AsyncSession, order_id: UUID, actor: User) -> Order:
    if actor.role not in {UserRole.ADMIN, UserRole.FRONTDESK}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

    order = await get_order_by_id_or_404(db, order_id)
    if order.status != OrderStatus.NEW:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Order cannot be accepted in current status')

    order.status = OrderStatus.ACCEPTED
    await _log_event(db, order.id, 'order.accepted', actor.id)
    await db.commit()
    log_structured(
        logger,
        logging.INFO,
        'order.accepted',
        {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'status': order.status.value,
            'actor_user_id': str(actor.id),
            'actor_role': actor.role.value,
        },
    )
    refreshed_order = await get_order_by_id_or_404(db, order.id)
    await emit_post_commit_order_notifications(db, event='order.accepted', order=refreshed_order)
    return refreshed_order


async def assign_driver(
    db: AsyncSession, order_id: UUID, payload: AssignDriverRequest, actor: User
) -> Order:
    if actor.role not in {UserRole.ADMIN, UserRole.FRONTDESK}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

    order = await get_order_by_id_or_404(db, order_id)
    if order.order_type != OrderType.DELIVERY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only delivery orders can be assigned')
    if order.status not in {OrderStatus.ACCEPTED, OrderStatus.ASSIGNED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Order is not assignable in current status')

    driver_result = await db.execute(select(User).where(User.id == payload.driver_user_id))
    driver = driver_result.scalar_one_or_none()
    if driver is None or driver.role != UserRole.DRIVER or not driver.is_active or driver.is_banned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid driver_user_id')

    order.assigned_driver_id = driver.id
    order.assigned_at = datetime.now(timezone.utc)
    order.status = OrderStatus.ASSIGNED
    await _log_event(
        db,
        order.id,
        'order.driver_assigned',
        actor.id,
        metadata={'driver_user_id': str(driver.id)},
    )
    await db.commit()
    log_structured(
        logger,
        logging.INFO,
        'order.driver_assigned',
        {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'status': order.status.value,
            'actor_user_id': str(actor.id),
            'actor_role': actor.role.value,
            'driver_user_id': str(driver.id),
        },
    )
    refreshed_order = await get_order_by_id_or_404(db, order.id)
    # Ensure assignment responses can immediately display driver name/phone even if relationship
    # loader strategy does not populate in the same transaction on some backends.
    refreshed_order.assigned_driver = driver
    await emit_post_commit_order_notifications(db, event='order.driver_assigned', order=refreshed_order)
    return refreshed_order


_SUCCESSFUL_FINAL_STATUSES = {OrderStatus.DELIVERED, OrderStatus.COMPLETED}

_ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.NEW: {OrderStatus.ACCEPTED, OrderStatus.CANCELLED},
    OrderStatus.ACCEPTED: {OrderStatus.ASSIGNED, OrderStatus.COMPLETED, OrderStatus.CANCELLED},
    OrderStatus.ASSIGNED: {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED, OrderStatus.CANCELLED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
}


def _role_can_set_status(role: UserRole, target: OrderStatus) -> bool:
    if role == UserRole.CLIENT:
        return target == OrderStatus.CANCELLED
    if role in {UserRole.ADMIN, UserRole.FRONTDESK}:
        return target in {
            OrderStatus.NEW,
            OrderStatus.ACCEPTED,
            OrderStatus.ASSIGNED,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.COMPLETED,
        }
    if role == UserRole.DRIVER:
        return target in {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED}
    return False


def _is_order_rating_eligible(order: Order) -> bool:
    if order.status == OrderStatus.CANCELLED:
        return False
    if order.order_type == OrderType.DELIVERY:
        return order.status in _SUCCESSFUL_FINAL_STATUSES
    return order.status in {OrderStatus.ACCEPTED, OrderStatus.COMPLETED}


async def update_order_status(db: AsyncSession, order_id: UUID, target_status: str, actor: User) -> Order:
    try:
        next_status = OrderStatus(target_status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid status') from exc

    order = await get_order_by_id_or_404(db, order_id)
    if not _role_can_set_status(actor.role, next_status):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

    if actor.role == UserRole.CLIENT:
        if order.user_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
        if next_status != OrderStatus.CANCELLED or order.status != OrderStatus.NEW:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Order cannot be cancelled in current status')

    if actor.role == UserRole.DRIVER:
        if order.assigned_driver_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Driver can only manage assigned orders')
        if order.order_type != OrderType.DELIVERY:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only delivery orders can be handled by driver')
    if order.order_type == OrderType.DELIVERY and next_status == OrderStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Delivery orders finish at DELIVERED')

    allowed_next = _ALLOWED_TRANSITIONS.get(order.status, set())
    if next_status not in allowed_next:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid status transition')

    previous_status = order.status
    order.status = next_status
    if next_status == OrderStatus.COMPLETED or (
        order.order_type == OrderType.DELIVERY and next_status == OrderStatus.DELIVERED
    ):
        order.completed_at = datetime.now(timezone.utc)
    await _log_event(db, order.id, 'order.status_changed', actor.id, metadata={'status': next_status.value})
    await db.commit()
    log_structured(
        logger,
        logging.INFO,
        'order.status_changed',
        {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'from_status': previous_status.value,
            'to_status': next_status.value,
            'actor_user_id': str(actor.id),
            'actor_role': actor.role.value,
        },
    )
    if order.order_type == OrderType.DELIVERY and next_status in _SUCCESSFUL_FINAL_STATUSES:
        log_structured(
            logger,
            logging.INFO,
            'order.delivery_completed',
            {
                'order_id': str(order.id),
                'order_number': order.order_number,
                'actor_user_id': str(actor.id),
                'actor_role': actor.role.value,
            },
        )
    refreshed_order = await get_order_by_id_or_404(db, order.id)
    await emit_post_commit_order_notifications(db, event='order.status_changed', order=refreshed_order)
    return refreshed_order


async def list_driver_assigned_orders(
    db: AsyncSession, driver_id: UUID, status_filter: str | None = None, limit: int = 20, offset: int = 0
) -> list[Order]:
    query = _order_base_query().where(Order.assigned_driver_id == driver_id).order_by(Order.created_at.desc())
    if status_filter:
        try:
            query = query.where(Order.status == OrderStatus(status_filter))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid status') from exc
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def list_driver_latest_orders(db: AsyncSession, driver_id: UUID, limit: int = 20, offset: int = 0) -> list[Order]:
    result = await db.execute(
        _order_base_query()
        .where(
            Order.assigned_driver_id == driver_id,
            Order.order_type == OrderType.DELIVERY,
            Order.status.in_(
                [
                    OrderStatus.ASSIGNED,
                    OrderStatus.OUT_FOR_DELIVERY,
                    OrderStatus.DELIVERED,
                    OrderStatus.COMPLETED,
                    OrderStatus.CANCELLED,
                ]
            ),
        )
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().unique().all())


async def get_revenue_summary(db: AsyncSession) -> dict[str, Decimal | int]:
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) - timedelta(days=29)
    week_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) - timedelta(days=6)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    order_totals = _order_totals_subquery()
    scoped_orders = (
        select(
            Order.id.label('order_id'),
            Order.created_at.label('created_at'),
            (
                func.coalesce(
                    cast(Order.total_amount, Numeric(12, 2)),
                    func.coalesce(cast(order_totals.c.items_total, Numeric(12, 2)), 0)
                    + func.coalesce(cast(Order.delivery_fee, Numeric(12, 2)), 0),
                )
            ).label('order_total'),
        )
        .outerjoin(order_totals, order_totals.c.order_id == Order.id)
        .where(
            Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            Order.created_at >= month_start,
        )
        .subquery()
    )

    revenue_result = await db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (scoped_orders.c.created_at >= today_start, cast(scoped_orders.c.order_total, Numeric(12, 2))),
                        else_=0,
                    )
                ),
                0,
            ).label('today_revenue'),
            func.coalesce(
                func.sum(
                    case(
                        (scoped_orders.c.created_at >= week_start, cast(scoped_orders.c.order_total, Numeric(12, 2))),
                        else_=0,
                    )
                ),
                0,
            ).label('week_revenue'),
            func.coalesce(func.sum(cast(scoped_orders.c.order_total, Numeric(12, 2))), 0).label('month_revenue'),
            func.coalesce(
                func.sum(case((scoped_orders.c.created_at >= today_start, 1), else_=0)),
                0,
            ).label('today_orders'),
            func.coalesce(
                func.sum(case((scoped_orders.c.created_at >= week_start, 1), else_=0)),
                0,
            ).label('week_orders'),
            func.count(scoped_orders.c.order_id).label('month_orders'),
        )
    )
    row = revenue_result.one()

    return {
        'today_revenue': Decimal(str(row.today_revenue or 0)).quantize(Decimal('0.01')),
        'week_revenue': Decimal(str(row.week_revenue or 0)).quantize(Decimal('0.01')),
        'month_revenue': Decimal(str(row.month_revenue or 0)).quantize(Decimal('0.01')),
        'today_orders': int(row.today_orders or 0),
        'week_orders': int(row.week_orders or 0),
        'month_orders': int(row.month_orders or 0),
    }


async def get_order_analytics(db: AsyncSession) -> dict:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    last_30_days_start = today_start - timedelta(days=29)
    order_totals = _order_totals_subquery()

    avg_query = await db.execute(
        select(
            func.coalesce(
                func.avg(
                    func.coalesce(
                        cast(Order.total_amount, Numeric(12, 2)),
                        func.coalesce(cast(order_totals.c.items_total, Numeric(12, 2)), 0)
                        + func.coalesce(cast(Order.delivery_fee, Numeric(12, 2)), 0),
                    )
                ),
                0,
            ).label('average_order_value')
        )
        .outerjoin(order_totals, order_totals.c.order_id == Order.id)
        .where(
            Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            Order.created_at >= last_30_days_start,
        )
    )
    average_order_value = Decimal(str(avg_query.scalar_one() or 0)).quantize(Decimal('0.01'))

    today_counts = await db.execute(
        select(
            func.count(Order.id).label('total_orders_today'),
            func.sum(case((Order.order_type == OrderType.PICKUP, 1), else_=0)).label('pickup_orders_today'),
            func.sum(case((Order.order_type == OrderType.DELIVERY, 1), else_=0)).label('delivery_orders_today'),
        ).where(Order.created_at >= today_start)
    )
    row = today_counts.one()
    pickup = int(row.pickup_orders_today or 0)
    delivery = int(row.delivery_orders_today or 0)

    return {
        'total_orders_today': int(row.total_orders_today or 0),
        'pickup_orders_today': pickup,
        'delivery_orders_today': delivery,
        'pickup_delivery_ratio': f'{pickup}:{delivery}' if (pickup + delivery) > 0 else '0:0',
        'average_order_value': average_order_value,
    }


async def get_driver_analytics(db: AsyncSession) -> dict:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    per_driver_result = await db.execute(
        select(
            User.id.label('driver_id'),
            User.first_name.label('first_name'),
            User.last_name.label('last_name'),
            func.count(Order.id).label('deliveries_completed_today'),
        )
        .join(Order, Order.assigned_driver_id == User.id)
        .where(
            User.role == UserRole.DRIVER,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            Order.completed_at.is_not(None),
            Order.completed_at >= today_start,
        )
        .group_by(User.id, User.first_name, User.last_name)
        .order_by(func.count(Order.id).desc(), User.first_name.asc())
    )
    rows = per_driver_result.all()
    deliveries_per_driver = [
        {
            'driver_id': row.driver_id,
            'driver_name': f'{row.first_name} {row.last_name}'.strip(),
            'deliveries_completed_today': int(row.deliveries_completed_today or 0),
        }
        for row in rows
    ]
    return {
        'deliveries_completed_today': sum(item['deliveries_completed_today'] for item in deliveries_per_driver),
        'deliveries_per_driver': deliveries_per_driver,
    }


async def get_admin_dashboard_analytics(db: AsyncSession) -> dict:
    revenue = await get_revenue_summary(db)
    orders = await get_order_analytics(db)
    ratings = await get_admin_rating_summary(db)
    drivers = await get_driver_analytics(db)
    return {
        'revenue': revenue,
        'orders': orders,
        'ratings': {
            'average_rating': ratings['average_rating'],
            'total_ratings': ratings['total_ratings'],
            'stars_breakdown': ratings['stars_breakdown'],
        },
        'drivers': drivers,
    }


def enforce_order_access(order: Order, current_user: User) -> None:
    if current_user.role == UserRole.CLIENT and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
    if current_user.role == UserRole.DRIVER and order.assigned_driver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')


async def list_latest_orders(
    db: AsyncSession,
    current_user: User,
    limit: int = 20,
    offset: int = 0,
    statuses: list[str] | None = None,
    order_type: str | None = None,
) -> list[Order]:
    query = _order_base_query().order_by(Order.created_at.desc())

    if current_user.role in {UserRole.ADMIN, UserRole.FRONTDESK}:
        pass
    elif current_user.role == UserRole.CLIENT:
        query = query.where(Order.user_id == current_user.id)
    elif current_user.role == UserRole.DRIVER:
        query = query.where(Order.assigned_driver_id == current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

    if statuses:
        status_values: list[OrderStatus] = []
        for status_value in statuses:
            try:
                status_values.append(OrderStatus(status_value))
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid status') from exc
        query = query.where(Order.status.in_(status_values))

    if order_type:
        try:
            query = query.where(Order.order_type == OrderType(order_type))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid order_type') from exc

    result = await db.execute(query.offset(offset).limit(limit))
    return list(result.scalars().unique().all())


async def create_order_rating(
    db: AsyncSession,
    order_id: UUID,
    stars: int,
    note: str | None,
    actor: User,
) -> OrderRating:
    order = await get_order_by_id_or_404(db, order_id)

    if order.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
    if not _is_order_rating_eligible(order):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Order is not ready for rating')
    if order.rating is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Order already rated')

    normalized_note = note.strip() if note else None
    rating = OrderRating(
        order_id=order.id,
        user_id=actor.id,
        stars=stars,
        note=normalized_note or None,
    )
    db.add(rating)
    await _log_event(
        db,
        order.id,
        'order.rated',
        actor.id,
        metadata={'stars': stars},
    )
    await db.commit()
    await db.refresh(rating)
    log_structured(
        logger,
        logging.INFO,
        'order.rating_submitted',
        {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'actor_user_id': str(actor.id),
            'stars': stars,
        },
    )
    return rating


async def list_admin_ratings(db: AsyncSession, limit: int = 20, offset: int = 0) -> list[dict]:
    result = await db.execute(
        select(OrderRating, User)
        .join(Order, Order.id == OrderRating.order_id)
        .join(User, User.id == Order.user_id)
        .order_by(OrderRating.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            'order_id': rating.order_id,
            'stars': rating.stars,
            'note': rating.note,
            'customer_name': f'{user.first_name} {user.last_name}'.strip(),
            'created_at': rating.created_at,
        }
        for rating, user in rows
    ]


async def get_admin_rating_summary(db: AsyncSession) -> dict:
    summary_result = await db.execute(
        select(
            func.coalesce(func.avg(OrderRating.stars), 0).label('average_rating'),
            func.count(OrderRating.id).label('total_ratings'),
        )
    )
    summary_row = summary_result.one()

    breakdown_result = await db.execute(
        select(OrderRating.stars, func.count(OrderRating.id)).group_by(OrderRating.stars)
    )
    stars_breakdown = {str(stars): 0 for stars in range(1, 6)}
    for stars, count in breakdown_result.all():
        stars_breakdown[str(stars)] = int(count)

    average_raw = summary_row.average_rating
    average_rating = float(average_raw) if average_raw is not None else 0.0
    return {
        'average_rating': average_rating,
        'total_ratings': int(summary_row.total_ratings or 0),
        'stars_breakdown': stars_breakdown,
        'avg_stars': average_rating,
        'star_counts': stars_breakdown,
    }
