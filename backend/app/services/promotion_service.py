from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.menu import Addon, Item, ItemType, Section, Size
from app.models.order import Order, OrderStatus
from app.models.promotion import LoyaltyRule, Promotion, PromotionTarget, PromotionType
from app.models.user import User
from app.schemas.promotion import (
    PromotionCreate,
    PromotionEvaluationEntry,
    PromotionEvaluationItem,
    PromotionEvaluationResponse,
    PromotionTargetCreate,
)
from app.services.promotion_rules_service import (
    eligible_for_first_time_offer,
    eligible_for_free_delivery,
    eligible_for_loyalty_offer,
)

MENU_MODEL_BY_TYPE = {
    'section': Section,
    'item': Item,
    'type': ItemType,
    'size': Size,
    'addon': Addon,
}

TARGET_GROUP_SCOPE = 'scope'
TARGET_GROUP_BUY = 'buy'
TARGET_GROUP_FREE = 'free'
FREE_DELIVERY_MODE_FREE = 'FREE_DELIVERY'
FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT'
FREE_DELIVERY_MODES = {FREE_DELIVERY_MODE_FREE, FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT}


def _promotion_query():
    return select(Promotion).options(
        selectinload(Promotion.targets),
        selectinload(Promotion.loyalty_rule),
    )


async def get_promotion_by_id(db: AsyncSession, promotion_id: UUID) -> Promotion | None:
    result = await db.execute(_promotion_query().where(Promotion.id == promotion_id))
    return result.scalar_one_or_none()


async def _load_target_lookup(
    db: AsyncSession,
    promotions: list[Promotion],
) -> dict[tuple[str, UUID], Section | Item | ItemType | Size | Addon]:
    entity_ids_by_type: dict[str, set[UUID]] = defaultdict(set)
    for promotion in promotions:
        for target in promotion.targets:
            entity_ids_by_type[target.entity_type].add(target.entity_id)

    lookup: dict[tuple[str, UUID], Section | Item | ItemType | Size | Addon] = {}
    for entity_type, entity_ids in entity_ids_by_type.items():
        model = MENU_MODEL_BY_TYPE.get(entity_type)
        if model is None or not entity_ids:
            continue
        result = await db.execute(select(model).where(model.id.in_(entity_ids)))
        for entity in result.scalars().all():
            lookup[(entity_type, entity.id)] = entity
    return lookup


def _targets_by_group(promotion: Promotion, target_group: str) -> list[PromotionTarget]:
    return [target for target in promotion.targets if getattr(target, 'target_group', TARGET_GROUP_SCOPE) == target_group]


def _effective_buy_targets(promotion: Promotion) -> list[PromotionTarget]:
    buy_targets = _targets_by_group(promotion, TARGET_GROUP_BUY)
    if buy_targets:
        return buy_targets
    if promotion.type == PromotionType.BUY_N_GET_M_FREE:
        return _targets_by_group(promotion, TARGET_GROUP_SCOPE)
    return []


def _effective_free_targets(promotion: Promotion) -> list[PromotionTarget]:
    free_targets = _targets_by_group(promotion, TARGET_GROUP_FREE)
    if free_targets:
        return free_targets
    if promotion.type == PromotionType.BUY_N_GET_M_FREE:
        return _targets_by_group(promotion, TARGET_GROUP_SCOPE)
    return []


def _serialize_targets(
    promotion: Promotion,
    targets: list[PromotionTarget],
    target_lookup: dict[tuple[str, UUID], object],
) -> list[dict]:
    return [
        {
            'id': target.id,
            'promotion_id': promotion.id,
            'target_group': getattr(target, 'target_group', TARGET_GROUP_SCOPE),
            'entity_type': target.entity_type,
            'entity_id': target.entity_id,
            'entity_name_en': getattr(target_lookup.get((target.entity_type, target.entity_id)), 'name_en', None),
            'entity_name_ar': getattr(target_lookup.get((target.entity_type, target.entity_id)), 'name_ar', None),
        }
        for target in targets
    ]


def _target_collection_summary(
    targets: list[PromotionTarget],
    target_lookup: dict[tuple[str, UUID], object],
    *,
    default_en: str,
    default_ar: str,
) -> tuple[str, str]:
    if not targets:
        return default_en, default_ar

    if len(targets) == 1:
        target = targets[0]
        entity = target_lookup.get((target.entity_type, target.entity_id))
        if entity is not None:
            return getattr(entity, 'name_en', default_en), getattr(entity, 'name_ar', default_ar)

    count = len(targets)
    return (f'{count} selected menu entries', f'{count} عناصر محددة من القائمة')


def _scope_summary(promotion: Promotion, target_lookup: dict[tuple[str, UUID], object]) -> tuple[str, str]:
    scope_targets = _targets_by_group(promotion, TARGET_GROUP_SCOPE)
    if promotion.type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return 'Applies to delivery orders', 'ينطبق على طلبات التوصيل'

    if promotion.type == PromotionType.BUY_N_GET_M_FREE:
        buy_summary_en, buy_summary_ar = _target_collection_summary(
            _effective_buy_targets(promotion),
            target_lookup,
            default_en='any menu item',
            default_ar='أي عنصر من القائمة',
        )
        free_summary_en, free_summary_ar = _target_collection_summary(
            _effective_free_targets(promotion),
            target_lookup,
            default_en='any menu item already in the cart',
            default_ar='أي عنصر موجود في السلة',
        )
        return (
            f'Buy from {buy_summary_en}; free item from {free_summary_en}',
            f'الشراء من {buy_summary_ar}؛ والهدية من {free_summary_ar}',
        )

    if promotion.type == PromotionType.FIRST_TIME_FREE_ITEM:
        free_item_summary_en, free_item_summary_ar = _target_collection_summary(
            scope_targets,
            target_lookup,
            default_en='any menu item',
            default_ar='أي عنصر من القائمة',
        )
        return (
            f'One free item from {free_item_summary_en}',
            f'عنصر مجاني واحد من {free_item_summary_ar}',
        )

    if not scope_targets:
        return 'Applies to the whole menu', 'ينطبق على كامل القائمة'

    if len(scope_targets) == 1:
        target = scope_targets[0]
        entity = target_lookup.get((target.entity_type, target.entity_id))
        if entity is not None:
            return (
                f'Applies to {getattr(entity, "name_en", target.entity_type)}',
                f'ينطبق على {getattr(entity, "name_ar", target.entity_type)}',
            )

    count = len(scope_targets)
    return (
        f'Applies to {count} selected menu entries',
        f'ينطبق على {count} عناصر محددة من القائمة',
    )


def _resolved_required_orders(promotion: Promotion) -> int | None:
    if promotion.type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return None
    if promotion.required_completed_orders is not None:
        return promotion.required_completed_orders
    if promotion.loyalty_rule is not None:
        return promotion.loyalty_rule.required_orders
    return None


def _resolved_free_delivery_mode(promotion: Promotion) -> str | None:
    if promotion.type != PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return None
    if promotion.free_delivery_mode:
        return promotion.free_delivery_mode
    if promotion.free_delivery_discount_percent is not None:
        return FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT
    return FREE_DELIVERY_MODE_FREE


def _resolved_free_delivery_discount_percent(promotion: Promotion) -> Decimal | None:
    if promotion.type != PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return None
    if _resolved_free_delivery_mode(promotion) != FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT:
        return None
    return promotion.free_delivery_discount_percent


def _eligibility_summary(promotion: Promotion) -> tuple[str, str]:
    if promotion.type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        threshold = promotion.value
        mode = _resolved_free_delivery_mode(promotion)
        if mode == FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT:
            discount_percent = _resolved_free_delivery_discount_percent(promotion)
            if discount_percent is not None:
                return (
                    f'Available for {discount_percent}% discount above {threshold}',
                    f'متاح بخصم {discount_percent}% فوق {threshold}',
                )
        return (
            f'Available for free delivery above {threshold}',
            f'متاح للتوصيل المجاني فوق {threshold}',
        )

    if promotion.type in {PromotionType.FIRST_TIME, PromotionType.FIRST_TIME_FREE_ITEM}:
        return (
            'Available only before the first completed order',
            'متاح فقط قبل أول طلب مكتمل',
        )

    required_orders = _resolved_required_orders(promotion)
    if required_orders is not None:
        return (
            f'Available after {required_orders} completed orders',
            f'متاح بعد {required_orders} طلبات مكتملة',
        )

    return (
        'Available to all users during the active window',
        'متاح لجميع المستخدمين خلال فترة التفعيل',
    )


def serialize_promotion(
    promotion: Promotion,
    target_lookup: dict[tuple[str, UUID], object],
) -> dict:
    scope_targets = _targets_by_group(promotion, TARGET_GROUP_SCOPE)
    buy_targets = _effective_buy_targets(promotion)
    free_targets = _effective_free_targets(promotion)
    scope_summary_en, scope_summary_ar = _scope_summary(promotion, target_lookup)
    eligibility_summary_en, eligibility_summary_ar = _eligibility_summary(promotion)
    return {
        'id': promotion.id,
        'title_en': promotion.title_en,
        'title_ar': promotion.title_ar,
        'type': promotion.type.value,
        'value': promotion.value,
        'starts_at': promotion.starts_at,
        'ends_at': promotion.ends_at,
        'is_active': promotion.is_active,
        'required_completed_orders': promotion.required_completed_orders,
        'buy_quantity': promotion.buy_quantity,
        'free_quantity': promotion.free_quantity,
        'free_delivery_mode': promotion.free_delivery_mode,
        'free_delivery_discount_percent': promotion.free_delivery_discount_percent,
        'loyalty_rule_id': promotion.loyalty_rule_id,
        'targets': _serialize_targets(promotion, scope_targets, target_lookup),
        'buy_targets': _serialize_targets(promotion, buy_targets, target_lookup),
        'free_targets': _serialize_targets(promotion, free_targets, target_lookup),
        'scope_summary_en': scope_summary_en,
        'scope_summary_ar': scope_summary_ar,
        'eligibility_summary_en': eligibility_summary_en,
        'eligibility_summary_ar': eligibility_summary_ar,
    }


async def get_active_promotions(db: AsyncSession) -> list[Promotion]:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        _promotion_query().where(
            Promotion.is_active.is_(True),
            Promotion.starts_at <= now,
            Promotion.ends_at >= now,
        )
    )
    return list(result.scalars().unique().all())


async def list_promotions(db: AsyncSession) -> list[Promotion]:
    result = await db.execute(_promotion_query().order_by(Promotion.starts_at.desc()))
    return list(result.scalars().unique().all())


async def list_loyalty_rules(db: AsyncSession) -> list[LoyaltyRule]:
    result = await db.execute(select(LoyaltyRule).order_by(LoyaltyRule.required_orders.asc()))
    return list(result.scalars().all())


def ensure_promotion_type(value: str):
    try:
        return PromotionType(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='Invalid promotion type') from exc


async def _ensure_loyalty_rule_valid(
    db: AsyncSession,
    loyalty_rule_id: UUID | None,
) -> UUID | None:
    if loyalty_rule_id is None:
        return None
    rule = await db.get(LoyaltyRule, loyalty_rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Loyalty rule not found')
    return rule.id


def _normalize_free_delivery_rule(
    promotion_type: PromotionType,
    free_delivery_mode: str | None,
    free_delivery_discount_percent: Decimal | None,
) -> tuple[str | None, Decimal | None]:
    if promotion_type != PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return None, None

    mode = free_delivery_mode
    if mode is None:
        mode = FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT if free_delivery_discount_percent is not None else FREE_DELIVERY_MODE_FREE

    if mode not in FREE_DELIVERY_MODES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='Invalid free delivery mode')

    if mode == FREE_DELIVERY_MODE_FREE:
        return mode, None

    if free_delivery_discount_percent is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='PERCENTAGE_DISCOUNT free delivery promotions require a discount percent',
        )
    if free_delivery_discount_percent <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='free_delivery_discount_percent must be greater than zero',
        )
    if free_delivery_discount_percent > Decimal('100.00'):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='free_delivery_discount_percent must be 100 or less',
        )
    return mode, free_delivery_discount_percent.quantize(Decimal('0.01'))


def _normalize_order_rule(
    promotion_type: PromotionType,
    required_completed_orders: int | None,
) -> int | None:
    if promotion_type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return None
    if promotion_type in {PromotionType.FIRST_TIME, PromotionType.FIRST_TIME_FREE_ITEM}:
        return None
    if required_completed_orders is None:
        return None
    if required_completed_orders < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='required_completed_orders must be 0 or greater')
    return required_completed_orders


def _is_free_delivery_offer(promotion: Promotion) -> bool:
    return promotion.type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT and _resolved_free_delivery_mode(promotion) == FREE_DELIVERY_MODE_FREE


def _normalize_buy_get_rule(
    promotion_type: PromotionType,
    buy_quantity: int | None,
    free_quantity: int | None,
) -> tuple[int | None, int | None]:
    if promotion_type != PromotionType.BUY_N_GET_M_FREE:
        return None, None
    if buy_quantity is None or free_quantity is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='BUY_N_GET_M_FREE promotions require buy_quantity and free_quantity',
        )
    if buy_quantity <= 0 or free_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='buy_quantity and free_quantity must both be greater than zero',
        )
    return buy_quantity, free_quantity


def _coerce_target_inputs(targets: list[PromotionTargetCreate | dict] | None, target_group: str) -> list[PromotionTargetCreate]:
    if not targets:
        return []

    normalized: list[PromotionTargetCreate] = []
    for target in targets:
        if isinstance(target, PromotionTargetCreate):
            normalized.append(
                PromotionTargetCreate(
                    target_group=target_group,
                    entity_type=target.entity_type,
                    entity_id=target.entity_id,
                )
            )
            continue
        normalized.append(
            PromotionTargetCreate(
                target_group=target_group,
                entity_type=str(target['entity_type']),
                entity_id=target['entity_id'],
            )
        )
    return normalized


async def _validate_targets(
    db: AsyncSession,
    targets: list[PromotionTargetCreate],
) -> list[PromotionTargetCreate]:
    normalized: list[PromotionTargetCreate] = []
    seen: set[tuple[str, str, UUID]] = set()
    for target in targets:
        key = (target.target_group, target.entity_type, target.entity_id)
        if key in seen:
            continue
        seen.add(key)
        model = MENU_MODEL_BY_TYPE.get(target.entity_type)
        if model is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='Invalid promotion target type')
        entity = await db.get(model, target.entity_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'{target.entity_type} target not found')
        normalized.append(target)
    return normalized


def _current_group_targets(promotion: Promotion, target_group: str) -> list[PromotionTargetCreate]:
    return [
        PromotionTargetCreate(
            target_group=target_group,
            entity_type=target.entity_type,
            entity_id=target.entity_id,
        )
        for target in _targets_by_group(promotion, target_group)
    ]


async def _normalize_target_groups(
    db: AsyncSession,
    promotion_type: PromotionType,
    scope_targets: list[PromotionTargetCreate | dict] | None,
    buy_targets: list[PromotionTargetCreate | dict] | None,
    free_targets: list[PromotionTargetCreate | dict] | None,
) -> dict[str, list[PromotionTargetCreate]]:
    normalized_scope = await _validate_targets(db, _coerce_target_inputs(scope_targets, TARGET_GROUP_SCOPE))
    normalized_buy = await _validate_targets(db, _coerce_target_inputs(buy_targets, TARGET_GROUP_BUY))
    normalized_free = await _validate_targets(db, _coerce_target_inputs(free_targets, TARGET_GROUP_FREE))

    if promotion_type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
        return {
            TARGET_GROUP_SCOPE: [],
            TARGET_GROUP_BUY: [],
            TARGET_GROUP_FREE: [],
        }

    if promotion_type != PromotionType.BUY_N_GET_M_FREE:
        return {
            TARGET_GROUP_SCOPE: normalized_scope,
            TARGET_GROUP_BUY: [],
            TARGET_GROUP_FREE: [],
        }

    if normalized_buy or normalized_free:
        return {
            TARGET_GROUP_SCOPE: [],
            TARGET_GROUP_BUY: normalized_buy,
            TARGET_GROUP_FREE: normalized_free,
        }

    return {
        TARGET_GROUP_SCOPE: normalized_scope,
        TARGET_GROUP_BUY: [],
        TARGET_GROUP_FREE: [],
    }


async def _replace_target_groups(
    db: AsyncSession,
    promotion: Promotion,
    grouped_targets: dict[str, list[PromotionTargetCreate]],
) -> None:
    await db.execute(delete(PromotionTarget).where(PromotionTarget.promotion_id == promotion.id))
    for target_group in (TARGET_GROUP_SCOPE, TARGET_GROUP_BUY, TARGET_GROUP_FREE):
        for target in grouped_targets.get(target_group, []):
            db.add(
                PromotionTarget(
                    promotion_id=promotion.id,
                    target_group=target_group,
                    entity_type=target.entity_type,
                    entity_id=target.entity_id,
                )
            )


def _normalize_value(promotion_type: PromotionType, value: Decimal) -> Decimal:
    if promotion_type in {PromotionType.BUY_N_GET_M_FREE, PromotionType.FIRST_TIME_FREE_ITEM}:
        return Decimal('0.00')
    if promotion_type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT and value <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='FREE_DELIVERY_ABOVE_AMOUNT promotions require a value greater than zero',
        )
    if value < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='value must be 0 or greater')
    return value


async def create_promotion_record(db: AsyncSession, payload: PromotionCreate) -> Promotion:
    promotion_type = ensure_promotion_type(payload.type)
    normalized_groups = await _normalize_target_groups(db, promotion_type, payload.targets, payload.buy_targets, payload.free_targets)
    loyalty_rule_id = await _ensure_loyalty_rule_valid(db, payload.loyalty_rule_id if promotion_type == PromotionType.LOYALTY else None)
    buy_quantity, free_quantity = _normalize_buy_get_rule(promotion_type, payload.buy_quantity, payload.free_quantity)
    free_delivery_mode, free_delivery_discount_percent = _normalize_free_delivery_rule(
        promotion_type,
        payload.free_delivery_mode,
        payload.free_delivery_discount_percent,
    )
    required_completed_orders = _normalize_order_rule(promotion_type, payload.required_completed_orders)
    promotion = Promotion(
        title_en=payload.title_en,
        title_ar=payload.title_ar,
        type=promotion_type,
        value=_normalize_value(promotion_type, payload.value),
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        is_active=payload.is_active,
        required_completed_orders=required_completed_orders,
        buy_quantity=buy_quantity,
        free_quantity=free_quantity,
        free_delivery_mode=free_delivery_mode,
        free_delivery_discount_percent=free_delivery_discount_percent,
        loyalty_rule_id=loyalty_rule_id,
    )
    db.add(promotion)
    await db.flush()
    await _replace_target_groups(db, promotion, normalized_groups)
    await db.commit()
    refreshed = await get_promotion_by_id(db, promotion.id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promotion not found')
    return refreshed


async def update_promotion_record(db: AsyncSession, promotion: Promotion, payload_values: dict) -> Promotion:
    next_type_raw = payload_values.get('type', promotion.type.value)
    next_type = next_type_raw if isinstance(next_type_raw, PromotionType) else ensure_promotion_type(str(next_type_raw))

    normalized_groups: dict[str, list[PromotionTargetCreate]] | None = None
    if next_type != promotion.type or any(key in payload_values for key in {'targets', 'buy_targets', 'free_targets'}):
        normalized_groups = await _normalize_target_groups(
            db,
            next_type,
            payload_values.get('targets', _current_group_targets(promotion, TARGET_GROUP_SCOPE)),
            payload_values.get('buy_targets', _current_group_targets(promotion, TARGET_GROUP_BUY)),
            payload_values.get('free_targets', _current_group_targets(promotion, TARGET_GROUP_FREE)),
        )

    next_required_orders = _normalize_order_rule(
        next_type,
        payload_values.get('required_completed_orders', promotion.required_completed_orders),
    )
    next_buy_quantity, next_free_quantity = _normalize_buy_get_rule(
        next_type,
        payload_values.get('buy_quantity', promotion.buy_quantity),
        payload_values.get('free_quantity', promotion.free_quantity),
    )
    next_free_delivery_mode, next_free_delivery_discount_percent = _normalize_free_delivery_rule(
        next_type,
        payload_values.get('free_delivery_mode', promotion.free_delivery_mode),
        payload_values.get('free_delivery_discount_percent', promotion.free_delivery_discount_percent),
    )
    next_loyalty_rule_id = await _ensure_loyalty_rule_valid(
        db,
        payload_values.get('loyalty_rule_id', promotion.loyalty_rule_id) if next_type == PromotionType.LOYALTY else None,
    )
    next_value = _normalize_value(next_type, payload_values.get('value', promotion.value))

    for field, value in payload_values.items():
        if field in {'targets', 'buy_targets', 'free_targets', 'required_completed_orders', 'buy_quantity', 'free_quantity', 'free_delivery_mode', 'free_delivery_discount_percent', 'loyalty_rule_id', 'value'}:
            continue
        if field == 'type' and value is not None:
            setattr(promotion, field, next_type)
            continue
        setattr(promotion, field, value)

    promotion.required_completed_orders = next_required_orders
    promotion.buy_quantity = next_buy_quantity
    promotion.free_quantity = next_free_quantity
    promotion.free_delivery_mode = next_free_delivery_mode
    promotion.free_delivery_discount_percent = next_free_delivery_discount_percent
    promotion.loyalty_rule_id = next_loyalty_rule_id
    promotion.value = next_value
    promotion.type = next_type

    if normalized_groups is not None:
        await _replace_target_groups(db, promotion, normalized_groups)

    await db.commit()
    refreshed = await get_promotion_by_id(db, promotion.id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promotion not found')
    return refreshed


async def toggle_promotion_record(db: AsyncSession, promotion: Promotion) -> Promotion:
    promotion.is_active = not promotion.is_active
    await db.commit()
    refreshed = await get_promotion_by_id(db, promotion.id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promotion not found')
    return refreshed


async def delete_promotion_record(db: AsyncSession, promotion: Promotion) -> None:
    await db.delete(promotion)
    await db.commit()


async def _completed_orders_count(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count(Order.id)).where(
            Order.user_id == user_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
        )
    )
    return int(result.scalar_one() or 0)


def _successful_order_timestamp():
    return func.coalesce(Order.completed_at, Order.created_at)


async def _completed_orders_count_since_last_loyalty_use(
    db: AsyncSession,
    user_id: UUID,
    promotion_id: UUID,
) -> int:
    successful_statuses = [OrderStatus.DELIVERED, OrderStatus.COMPLETED]
    last_use_result = await db.execute(
        select(func.max(_successful_order_timestamp())).where(
            Order.user_id == user_id,
            Order.applied_promotion_id == promotion_id,
            Order.discount_amount > 0,
            Order.status.in_(successful_statuses),
        )
    )
    last_use_at = last_use_result.scalar_one_or_none()

    query = select(func.count(Order.id)).where(
        Order.user_id == user_id,
        Order.status.in_(successful_statuses),
    )
    if last_use_at is not None:
        query = query.where(_successful_order_timestamp() > last_use_at)

    result = await db.execute(query)
    return int(result.scalar_one() or 0)


async def _first_time_order_count(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(select(func.count(Order.id)).where(Order.user_id == user_id))
    return int(result.scalar_one() or 0)


async def _load_sizes_for_evaluation(
    db: AsyncSession,
    size_ids: list[UUID],
) -> dict[UUID, Size]:
    result = await db.execute(
        select(Size)
        .where(Size.id.in_(size_ids))
        .options(
            selectinload(Size.item_type).selectinload(ItemType.item).selectinload(Item.section),
            selectinload(Size.addons),
        )
    )
    return {size.id: size for size in result.scalars().unique().all()}


def _reason_payload(reason_code: str) -> tuple[str, str]:
    reasons = {
        'INACTIVE': ('Offer is inactive', 'العرض غير نشط'),
        'OUTSIDE_WINDOW': ('Offer is outside its active window', 'العرض خارج فترة التفعيل'),
        'FIRST_TIME_ONLY': ('Only available before the first completed order', 'متاح فقط قبل أول طلب مكتمل'),
        'ORDER_COUNT_NOT_MET': ('User has not reached the required completed order count', 'المستخدم لم يصل بعد إلى عدد الطلبات المكتملة المطلوب'),
        'TARGET_MISMATCH': ('Cart does not include eligible menu items', 'السلة لا تحتوي على عناصر مؤهلة'),
        'BUY_GET_QUANTITY_NOT_MET': ('Cart does not include enough qualifying items for this buy-and-get offer', 'السلة لا تحتوي على عدد كاف من العناصر المؤهلة لهذا العرض'),
        'ORDER_AMOUNT_NOT_MET': ('Cart total has not reached the free delivery threshold', 'إجمالي السلة لم يصل إلى حد التوصيل المجاني'),
        'ORDER_TYPE_NOT_ELIGIBLE': ('Offer is only available for delivery orders', 'العرض متاح فقط لطلبات التوصيل'),
        'ELIGIBILITY_RULE_MISSING': ('Offer is missing its eligibility rule setup', 'العرض يفتقد إعداد شرط الأهلية'),
    }
    return reasons.get(reason_code, ('Offer is not eligible', 'العرض غير مؤهل'))


def _line_unit_price(size: Size, addon_ids: list[UUID]) -> Decimal:
    addon_total = sum((Decimal(addon.price) for addon in size.addons if addon.id in addon_ids), Decimal('0.00'))
    return Decimal(size.price) + addon_total


def _line_subtotal(size: Size, addon_ids: list[UUID], quantity: int) -> Decimal:
    return _line_unit_price(size, addon_ids) * quantity


def _matches_targets(size: Size, addon_ids: list[UUID], targets: list[PromotionTarget]) -> bool:
    line_keys = {
        ('section', size.item_type.item.section.id),
        ('item', size.item_type.item.id),
        ('type', size.item_type.id),
        ('size', size.id),
    }
    line_keys.update({('addon', addon_id) for addon_id in addon_ids})
    return any((target.entity_type, target.entity_id) in line_keys for target in targets)


def _matching_rows(
    line_rows: list[tuple[Size, list[UUID], int, Decimal]],
    targets: list[PromotionTarget],
) -> list[tuple[Size, list[UUID], int, Decimal]]:
    if not targets:
        return line_rows
    return [row for row in line_rows if _matches_targets(row[0], row[1], targets)]


def _rows_subtotal(rows: list[tuple[Size, list[UUID], int, Decimal]]) -> Decimal:
    return sum((subtotal for _size, _addon_ids, _quantity, subtotal in rows), Decimal('0.00'))


def _percentage_discount(percent: Decimal, subtotal: Decimal) -> Decimal:
    if percent <= 0 or subtotal <= 0:
        return Decimal('0.00')
    capped_percent = min(percent, Decimal('100.00'))
    return (subtotal * capped_percent / Decimal('100.00')).quantize(Decimal('0.01'))


def _row_unit_prices(rows: list[tuple[Size, list[UUID], int, Decimal]]) -> list[Decimal]:
    unit_prices: list[Decimal] = []
    for size, addon_ids, quantity, _subtotal in rows:
        unit_price = _line_unit_price(size, addon_ids)
        unit_prices.extend([unit_price] * quantity)
    return unit_prices


def _target_signature(targets: list[PromotionTarget]) -> set[tuple[str, UUID]]:
    return {(target.entity_type, target.entity_id) for target in targets}


def _buy_n_get_m_discount(
    buy_rows: list[tuple[Size, list[UUID], int, Decimal]],
    free_rows: list[tuple[Size, list[UUID], int, Decimal]],
    buy_targets: list[PromotionTarget],
    free_targets: list[PromotionTarget],
    buy_quantity: int,
    free_quantity: int,
) -> Decimal:
    same_pool = _target_signature(buy_targets) == _target_signature(free_targets)
    if same_pool:
        unit_prices = _row_unit_prices(buy_rows)
        bundle_size = buy_quantity + free_quantity
        free_units = (len(unit_prices) // bundle_size) * free_quantity
        if free_units <= 0:
            return Decimal('0.00')
        unit_prices.sort()
        return sum(unit_prices[:free_units], Decimal('0.00'))

    buy_units = sum(quantity for _size, _addon_ids, quantity, _subtotal in buy_rows)
    free_unit_prices = _row_unit_prices(free_rows)
    if buy_units < buy_quantity or len(free_unit_prices) < free_quantity:
        return Decimal('0.00')

    bundle_count = min(buy_units // buy_quantity, len(free_unit_prices) // free_quantity)
    if bundle_count <= 0:
        return Decimal('0.00')

    free_unit_prices.sort()
    free_units_to_discount = bundle_count * free_quantity
    return sum(free_unit_prices[:free_units_to_discount], Decimal('0.00'))


def _single_free_item_discount(rows: list[tuple[Size, list[UUID], int, Decimal]]) -> Decimal:
    unit_prices = _row_unit_prices(rows)
    if not unit_prices:
        return Decimal('0.00')
    return min(unit_prices).quantize(Decimal('0.01'))


async def evaluate_promotions_for_user(
    db: AsyncSession,
    user_id: UUID,
    items: list[PromotionEvaluationItem],
    order_type: str | None = None,
    sizes_by_id: dict[UUID, Size] | None = None,
) -> PromotionEvaluationResponse:
    promotions = await list_promotions(db)
    target_lookup = await _load_target_lookup(db, promotions)
    if sizes_by_id is None:
        sizes_by_id = await _load_sizes_for_evaluation(db, [item.size_id for item in items])
    missing_size_ids = [item.size_id for item in items if item.size_id not in sizes_by_id]
    if missing_size_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Size not found')

    completed_orders = await _completed_orders_count(db, user_id)
    now = datetime.now(timezone.utc)
    cart_total = Decimal('0.00')
    line_rows: list[tuple[Size, list[UUID], int, Decimal]] = []
    for item in items:
        size = sizes_by_id[item.size_id]
        available_addon_ids = {addon.id for addon in size.addons if addon.is_active}
        invalid_addons = [addon_id for addon_id in item.addon_ids if addon_id not in available_addon_ids]
        if invalid_addons:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Addon not available for selected size')
        subtotal = _line_subtotal(size, item.addon_ids, item.quantity)
        cart_total += subtotal
        line_rows.append((size, item.addon_ids, item.quantity, subtotal))

    eligible_entries: list[PromotionEvaluationEntry] = []
    ineligible_entries: list[PromotionEvaluationEntry] = []

    for promotion in promotions:
        reason_code: str | None = None
        if not promotion.is_active:
            reason_code = 'INACTIVE'
        elif promotion.starts_at > now or promotion.ends_at < now:
            reason_code = 'OUTSIDE_WINDOW'
        elif promotion.type in {PromotionType.FIRST_TIME, PromotionType.FIRST_TIME_FREE_ITEM} and not eligible_for_first_time_offer(completed_orders):
            reason_code = 'FIRST_TIME_ONLY'
        else:
            required_orders = _resolved_required_orders(promotion)
            if promotion.type == PromotionType.LOYALTY and required_orders is None:
                reason_code = 'ELIGIBILITY_RULE_MISSING'
            elif promotion.type == PromotionType.LOYALTY and required_orders is not None:
                completed_orders_since_use = await _completed_orders_count_since_last_loyalty_use(
                    db,
                    user_id,
                    promotion.id,
                )
                if not eligible_for_loyalty_offer(completed_orders_since_use, required_orders):
                    reason_code = 'ORDER_COUNT_NOT_MET'
            elif required_orders is not None and completed_orders < required_orders:
                reason_code = 'ORDER_COUNT_NOT_MET'

        if promotion.type == PromotionType.FREE_DELIVERY_ABOVE_AMOUNT:
            matched_subtotal = cart_total
            if reason_code is None and order_type == 'pickup':
                reason_code = 'ORDER_TYPE_NOT_ELIGIBLE'
            elif reason_code is None and not eligible_for_free_delivery(cart_total, Decimal(promotion.value)):
                reason_code = 'ORDER_AMOUNT_NOT_MET'
            if reason_code is None:
                mode = _resolved_free_delivery_mode(promotion)
                if mode == FREE_DELIVERY_MODE_PERCENTAGE_DISCOUNT:
                    discount_percent = _resolved_free_delivery_discount_percent(promotion)
                    if discount_percent is None:
                        reason_code = 'ELIGIBILITY_RULE_MISSING'
                        discount = Decimal('0.00')
                    else:
                        discount = min(_percentage_discount(discount_percent, cart_total), cart_total)
                else:
                    discount = Decimal('0.00')
            else:
                discount = Decimal('0.00')
        elif promotion.type == PromotionType.BUY_N_GET_M_FREE:
            buy_targets = _effective_buy_targets(promotion)
            free_targets = _effective_free_targets(promotion)
            buy_rows = _matching_rows(line_rows, buy_targets)
            free_rows = _matching_rows(line_rows, free_targets)
            matched_subtotal = max(_rows_subtotal(buy_rows), _rows_subtotal(free_rows), cart_total)

            if reason_code is None and buy_targets and _rows_subtotal(buy_rows) <= 0:
                reason_code = 'TARGET_MISMATCH'
            elif reason_code is None and free_targets and _rows_subtotal(free_rows) <= 0:
                reason_code = 'TARGET_MISMATCH'

            if reason_code is None:
                if promotion.buy_quantity is None or promotion.free_quantity is None:
                    reason_code = 'ELIGIBILITY_RULE_MISSING'
                    discount = Decimal('0.00')
                else:
                    discount = _buy_n_get_m_discount(
                        buy_rows,
                        free_rows,
                        buy_targets,
                        free_targets,
                        promotion.buy_quantity,
                        promotion.free_quantity,
                    )
                    if discount <= 0:
                        reason_code = 'BUY_GET_QUANTITY_NOT_MET'
            else:
                discount = Decimal('0.00')
        elif promotion.type == PromotionType.FIRST_TIME_FREE_ITEM:
            scope_targets = _targets_by_group(promotion, TARGET_GROUP_SCOPE)
            matching_rows = _matching_rows(line_rows, scope_targets)
            matched_subtotal = _rows_subtotal(matching_rows)
            if reason_code is None and matched_subtotal <= 0:
                reason_code = 'TARGET_MISMATCH'

            if reason_code is None:
                discount = _single_free_item_discount(matching_rows)
                if discount <= 0:
                    reason_code = 'TARGET_MISMATCH'
            else:
                discount = Decimal('0.00')
        else:
            scope_targets = _targets_by_group(promotion, TARGET_GROUP_SCOPE)
            matching_rows = _matching_rows(line_rows, scope_targets)
            matched_subtotal = _rows_subtotal(matching_rows)
            if reason_code is None and scope_targets and matched_subtotal <= 0:
                reason_code = 'TARGET_MISMATCH'

            if reason_code is None:
                discount_base = matched_subtotal if matched_subtotal > 0 else cart_total
                discount = min(_percentage_discount(Decimal(promotion.value), discount_base), discount_base)
            else:
                discount = Decimal('0.00')

        entry = PromotionEvaluationEntry(
            promotion=serialize_promotion(promotion, target_lookup),
            discount=discount,
            matched_subtotal=matched_subtotal if matched_subtotal > 0 else cart_total,
            reason_code=reason_code,
            reason_summary_en=_reason_payload(reason_code)[0] if reason_code else None,
            reason_summary_ar=_reason_payload(reason_code)[1] if reason_code else None,
        )
        if reason_code is None:
            eligible_entries.append(entry)
        else:
            ineligible_entries.append(entry)

    eligible_entries.sort(key=lambda entry: entry.discount, reverse=True)
    free_delivery_entry = next((entry for entry in eligible_entries if _is_free_delivery_offer(entry.promotion)), None)
    discount_entries = [entry for entry in eligible_entries if not _is_free_delivery_offer(entry.promotion)]
    applied = discount_entries[0] if discount_entries else free_delivery_entry
    return PromotionEvaluationResponse(
        applied_promotion=applied.promotion if applied else None,
        free_delivery_promotion=free_delivery_entry.promotion if free_delivery_entry else None,
        discount=applied.discount if applied else Decimal('0.00'),
        free_delivery=free_delivery_entry is not None,
        eligible_promotions=eligible_entries,
        ineligible_promotions=ineligible_entries,
    )
