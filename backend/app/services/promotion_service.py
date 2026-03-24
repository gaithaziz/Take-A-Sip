from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.menu import Addon, Item, ItemType, Section, Size
from app.models.order import Order, OrderStatus
from app.models.promotion import LoyaltyRule, Promotion, PromotionTarget, PromotionType
from app.models.user import User
from app.schemas.promotion import PromotionCreate, PromotionEvaluationEntry, PromotionEvaluationItem, PromotionEvaluationResponse, PromotionTargetCreate
from app.services.promotion_rules_service import eligible_for_first_time_offer

MENU_MODEL_BY_TYPE = {
    'section': Section,
    'item': Item,
    'type': ItemType,
    'size': Size,
    'addon': Addon,
}


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


def _scope_summary(promotion: Promotion, target_lookup: dict[tuple[str, UUID], object]) -> tuple[str, str]:
    if not promotion.targets:
        return 'Applies to the whole menu', 'ينطبق على كامل القائمة'

    if len(promotion.targets) == 1:
        target = promotion.targets[0]
        entity = target_lookup.get((target.entity_type, target.entity_id))
        if entity is not None:
            return (
                f'Applies to {getattr(entity, "name_en", target.entity_type)}',
                f'ينطبق على {getattr(entity, "name_ar", target.entity_type)}',
            )

    count = len(promotion.targets)
    return (
        f'Applies to {count} selected menu entries',
        f'ينطبق على {count} عناصر محددة من القائمة',
    )


def _resolved_required_orders(promotion: Promotion) -> int | None:
    if promotion.required_completed_orders is not None:
        return promotion.required_completed_orders
    if promotion.loyalty_rule is not None:
        return promotion.loyalty_rule.required_orders
    return None


def _eligibility_summary(promotion: Promotion) -> tuple[str, str]:
    if promotion.type == PromotionType.FIRST_TIME:
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
        'loyalty_rule_id': promotion.loyalty_rule_id,
        'targets': [
            {
                'id': target.id,
                'promotion_id': promotion.id,
                'entity_type': target.entity_type,
                'entity_id': target.entity_id,
                'entity_name_en': getattr(target_lookup.get((target.entity_type, target.entity_id)), 'name_en', None),
                'entity_name_ar': getattr(target_lookup.get((target.entity_type, target.entity_id)), 'name_ar', None),
            }
            for target in promotion.targets
        ],
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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Invalid promotion type') from exc


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


def _normalize_order_rule(
    promotion_type: PromotionType,
    required_completed_orders: int | None,
) -> int | None:
    if promotion_type == PromotionType.FIRST_TIME:
        return None
    if required_completed_orders is None:
        return None
    if required_completed_orders < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='required_completed_orders must be 0 or greater')
    return required_completed_orders


def _normalize_buy_get_rule(
    promotion_type: PromotionType,
    buy_quantity: int | None,
    free_quantity: int | None,
) -> tuple[int | None, int | None]:
    if promotion_type != PromotionType.BUY_N_GET_M_FREE:
        return None, None
    if buy_quantity is None or free_quantity is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='BUY_N_GET_M_FREE promotions require buy_quantity and free_quantity',
        )
    if buy_quantity <= 0 or free_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='buy_quantity and free_quantity must both be greater than zero',
        )
    return buy_quantity, free_quantity


async def _validate_targets(
    db: AsyncSession,
    targets: list[PromotionTargetCreate],
) -> list[PromotionTargetCreate]:
    normalized: list[PromotionTargetCreate] = []
    seen: set[tuple[str, UUID]] = set()
    for target in targets:
        key = (target.entity_type, target.entity_id)
        if key in seen:
            continue
        seen.add(key)
        model = MENU_MODEL_BY_TYPE.get(target.entity_type)
        if model is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Invalid promotion target type')
        entity = await db.get(model, target.entity_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'{target.entity_type} target not found')
        normalized.append(target)
    return normalized


async def _replace_targets(db: AsyncSession, promotion: Promotion, targets: list[PromotionTargetCreate]) -> None:
    promotion.targets.clear()
    await db.flush()
    for target in targets:
        promotion.targets.append(
            PromotionTarget(
                entity_type=target.entity_type,
                entity_id=target.entity_id,
            )
        )


def _normalize_value(promotion_type: PromotionType, value: Decimal) -> Decimal:
    if promotion_type == PromotionType.BUY_N_GET_M_FREE:
        return Decimal('0.00')
    if value < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='value must be 0 or greater')
    return value


async def create_promotion_record(db: AsyncSession, payload: PromotionCreate) -> Promotion:
    promotion_type = ensure_promotion_type(payload.type)
    normalized_targets = await _validate_targets(db, payload.targets)
    loyalty_rule_id = await _ensure_loyalty_rule_valid(db, payload.loyalty_rule_id if promotion_type == PromotionType.LOYALTY else None)
    buy_quantity, free_quantity = _normalize_buy_get_rule(promotion_type, payload.buy_quantity, payload.free_quantity)
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
        loyalty_rule_id=loyalty_rule_id,
    )
    db.add(promotion)
    await db.flush()
    await _replace_targets(db, promotion, normalized_targets)
    await db.commit()
    refreshed = await get_promotion_by_id(db, promotion.id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promotion not found')
    return refreshed


async def update_promotion_record(db: AsyncSession, promotion: Promotion, payload_values: dict) -> Promotion:
    next_type_raw = payload_values.get('type', promotion.type.value)
    next_type = next_type_raw if isinstance(next_type_raw, PromotionType) else ensure_promotion_type(str(next_type_raw))

    normalized_targets: list[PromotionTargetCreate] | None = None
    if 'targets' in payload_values and payload_values['targets'] is not None:
        normalized_targets = await _validate_targets(db, payload_values['targets'])

    next_required_orders = _normalize_order_rule(
        next_type,
        payload_values.get('required_completed_orders', promotion.required_completed_orders),
    )
    next_buy_quantity, next_free_quantity = _normalize_buy_get_rule(
        next_type,
        payload_values.get('buy_quantity', promotion.buy_quantity),
        payload_values.get('free_quantity', promotion.free_quantity),
    )
    next_loyalty_rule_id = await _ensure_loyalty_rule_valid(
        db,
        payload_values.get('loyalty_rule_id', promotion.loyalty_rule_id) if next_type == PromotionType.LOYALTY else None,
    )
    next_value = _normalize_value(next_type, payload_values.get('value', promotion.value))

    for field, value in payload_values.items():
        if field in {'targets', 'required_completed_orders', 'buy_quantity', 'free_quantity', 'loyalty_rule_id', 'value'}:
            continue
        if field == 'type' and value is not None:
            setattr(promotion, field, next_type)
            continue
        setattr(promotion, field, value)

    promotion.required_completed_orders = next_required_orders
    promotion.buy_quantity = next_buy_quantity
    promotion.free_quantity = next_free_quantity
    promotion.loyalty_rule_id = next_loyalty_rule_id
    promotion.value = next_value
    promotion.type = next_type

    if normalized_targets is not None:
        await _replace_targets(db, promotion, normalized_targets)

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


async def _completed_orders_count(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count(Order.id)).where(Order.user_id == user_id, Order.status == OrderStatus.COMPLETED)
    )
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


def _buy_n_get_m_discount(
    matching_rows: list[tuple[Size, list[UUID], int, Decimal]],
    buy_quantity: int,
    free_quantity: int,
) -> Decimal:
    unit_prices: list[Decimal] = []
    for size, addon_ids, quantity, _subtotal in matching_rows:
        unit_price = _line_unit_price(size, addon_ids)
        unit_prices.extend([unit_price] * quantity)

    bundle_size = buy_quantity + free_quantity
    free_units = (len(unit_prices) // bundle_size) * free_quantity
    if free_units <= 0:
        return Decimal('0.00')

    unit_prices.sort()
    return sum(unit_prices[:free_units], Decimal('0.00'))


async def evaluate_promotions_for_user(
    db: AsyncSession,
    user: User,
    items: list[PromotionEvaluationItem],
) -> PromotionEvaluationResponse:
    promotions = await list_promotions(db)
    target_lookup = await _load_target_lookup(db, promotions)
    sizes_by_id = await _load_sizes_for_evaluation(db, [item.size_id for item in items])
    missing_size_ids = [item.size_id for item in items if item.size_id not in sizes_by_id]
    if missing_size_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Size not found')

    completed_orders = await _completed_orders_count(db, user.id)
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
        elif promotion.type == PromotionType.FIRST_TIME and not eligible_for_first_time_offer(completed_orders):
            reason_code = 'FIRST_TIME_ONLY'
        else:
            required_orders = _resolved_required_orders(promotion)
            if promotion.type == PromotionType.LOYALTY and required_orders is None:
                reason_code = 'ELIGIBILITY_RULE_MISSING'
            elif required_orders is not None and completed_orders < required_orders:
                reason_code = 'ORDER_COUNT_NOT_MET'

        matching_rows = (
            line_rows
            if not promotion.targets
            else [row for row in line_rows if _matches_targets(row[0], row[1], promotion.targets)]
        )
        matched_subtotal = sum((subtotal for _size, _addon_ids, _quantity, subtotal in matching_rows), Decimal('0.00'))
        if reason_code is None and promotion.targets and matched_subtotal <= 0:
            reason_code = 'TARGET_MISMATCH'

        if reason_code is None and promotion.type == PromotionType.BUY_N_GET_M_FREE:
            if promotion.buy_quantity is None or promotion.free_quantity is None:
                reason_code = 'ELIGIBILITY_RULE_MISSING'
                discount = Decimal('0.00')
            else:
                discount = _buy_n_get_m_discount(matching_rows, promotion.buy_quantity, promotion.free_quantity)
                if discount <= 0:
                    reason_code = 'BUY_GET_QUANTITY_NOT_MET'
        elif reason_code is None:
            discount = min(Decimal(promotion.value), matched_subtotal if matched_subtotal > 0 else cart_total)
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
    applied = eligible_entries[0] if eligible_entries else None
    return PromotionEvaluationResponse(
        applied_promotion=applied.promotion if applied else None,
        discount=applied.discount if applied else Decimal('0.00'),
        eligible_promotions=eligible_entries,
        ineligible_promotions=ineligible_entries,
    )
