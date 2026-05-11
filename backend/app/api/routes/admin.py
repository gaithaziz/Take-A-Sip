from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import require_roles
from app.schemas.delivery import (
    DeliveryDistanceBandCreate,
    DeliveryDistanceBandListResponse,
    DeliveryDistanceBandRead,
    DeliveryDistanceBandUpdate,
)
from app.models.menu import Addon, Item, ItemType, Section, Size
from app.models.promotion import LoyaltyRule, Promotion
from app.models.user import User, UserRole
from app.schemas.menu import (
    AddonCreate,
    AddonRead,
    AddonUpdate,
    ItemCreate,
    ItemRead,
    ItemTypeCreate,
    ItemTypeRead,
    ItemTypeUpdate,
    ItemUpdate,
    MenuResponse,
    MenuDeleteResponse,
    ScheduleListResponse,
    ScheduleMenuRequest,
    ScheduleMenuResponse,
    ScheduleRead,
    ScheduleUpdateRequest,
    SectionCreate,
    SectionRead,
    SectionUpdate,
    SizeCreate,
    SizeRead,
    SizeUpdate,
    ToggleResponse,
)
from app.schemas.order import (
    AdminDashboardAnalyticsResponse,
    AdminRatingSummaryResponse,
    AdminRatingsResponse,
    RevenueSummaryResponse,
)
from app.schemas.promotion import (
    LoyaltyRuleCreate,
    LoyaltyRuleRead,
    LoyaltyRulesListResponse,
    LoyaltyRuleUpdate,
    PromotionCreate,
    PromotionRead,
    PromotionsListResponse,
    PromotionUpdate,
)
from app.schemas.user import (
    BanUserRequest,
    ProvisionStaffRequest,
    ProvisionStaffResponse,
    StaffLifecycleResponse,
    UserModerationResponse,
    UserRead,
    UsersListResponse,
)
from app.services.menu_service import (
    create_menu_schedule,
    delete_menu_entity,
    delete_menu_schedule,
    get_admin_menu_tree,
    list_menu_schedules,
    update_menu_schedule,
)
from app.services.delivery_service import (
    create_distance_band,
    delete_distance_band,
    list_distance_bands,
    update_distance_band,
)
from app.services.storage import get_storage_service
from app.services.promotion_service import (
    _load_target_lookup,
    create_promotion_record,
    ensure_promotion_type,
    get_promotion_by_id,
    list_loyalty_rules,
    list_promotions,
    serialize_promotion,
    toggle_promotion_record,
    update_promotion_record,
)
from app.services.order_service import (
    get_admin_dashboard_analytics,
    get_admin_rating_summary,
    get_revenue_summary,
    list_admin_ratings,
)
from app.services.notification_service import emit_post_commit_promotion_created_notification
from app.services.user_service import (
    archive_staff_user,
    ban_user,
    delete_staff_user,
    list_drivers,
    list_users,
    provision_staff_user,
    unarchive_staff_user,
    unban_user,
)

router = APIRouter(prefix='/admin', tags=['admin'])


def _section_to_read(section: Section) -> SectionRead:
    return SectionRead(
        id=section.id,
        name_en=section.name_en,
        name_ar=section.name_ar,
        image_url=section.image_url,
        is_active=section.is_active,
        sort_order=section.sort_order,
        items=[],
    )


def _item_to_read(item: Item) -> ItemRead:
    return ItemRead(
        id=item.id,
        section_id=item.section_id,
        name_en=item.name_en,
        name_ar=item.name_ar,
        image_url=item.image_url,
        description_en=item.description_en,
        description_ar=item.description_ar,
        sort_order=item.sort_order,
        is_active=item.is_active,
        item_types=[],
    )


def _type_to_read(item_type: ItemType) -> ItemTypeRead:
    return ItemTypeRead(
        id=item_type.id,
        item_id=item_type.item_id,
        name_en=item_type.name_en,
        name_ar=item_type.name_ar,
        image_url=item_type.image_url,
        sort_order=item_type.sort_order,
        is_active=item_type.is_active,
        sizes=[],
    )


def _size_to_read(size: Size) -> SizeRead:
    return SizeRead(
        id=size.id,
        type_id=size.type_id,
        name_en=size.name_en,
        name_ar=size.name_ar,
        image_url=size.image_url,
        price=size.price,
        order_limit=size.order_limit,
        sort_order=size.sort_order,
        is_active=size.is_active,
        addons=[],
    )


def _addon_to_read(addon: Addon) -> AddonRead:
    return AddonRead(
        id=addon.id,
        size_id=addon.size_id,
        name_en=addon.name_en,
        name_ar=addon.name_ar,
        image_url=addon.image_url,
        price=addon.price,
        sort_order=addon.sort_order,
        is_active=addon.is_active,
    )


def _parse_hhmm(raw_value: str, field_name: str):
    try:
        return datetime.strptime(raw_value, '%H:%M').time()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f'{field_name} must be HH:MM',
        ) from exc


def _ensure_days(days_of_week: list[int]) -> None:
    if any(day < 0 or day > 6 for day in days_of_week):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='days_of_week must be 0..6')


def _menu_models():
    return {
        'section': Section,
        'item': Item,
        'type': ItemType,
        'size': Size,
        'addon': Addon,
    }


async def _ensure_menu_parent_exists(db: AsyncSession, model, entity_id: UUID, detail: str) -> None:
    parent = await db.get(model, entity_id)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


@router.post('/uploads/image')
async def upload_menu_image(
    request: Request,
    file: UploadFile = File(...),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict[str, str]:
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail='Only image files are allowed')

    settings = get_settings()
    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f'Image must be <= {settings.max_upload_size_mb}MB',
        )

    storage_service = get_storage_service()
    stored_object = await storage_service.store_menu_image(
        content=content,
        filename=file.filename,
        content_type=file.content_type,
        request_base_url=str(request.base_url).rstrip('/'),
    )
    return {'url': stored_object.url}


@router.get('/menu/tree', response_model=MenuResponse)
async def get_admin_menu_tree_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuResponse:
    sections = await get_admin_menu_tree(db)
    return MenuResponse(sections=sections)


@router.post('/menu/section', response_model=SectionRead)
async def create_section(
    payload: SectionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> SectionRead:
    section = Section(
        name_en=payload.name_en,
        name_ar=payload.name_ar,
        image_url=payload.image_url,
        sort_order=payload.sort_order,
    )
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return _section_to_read(section)


@router.patch('/menu/section/{section_id}', response_model=SectionRead)
async def update_section(
    section_id: UUID,
    payload: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> SectionRead:
    section = await db.get(Section, section_id)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Section not found')
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    await db.commit()
    await db.refresh(section)
    return _section_to_read(section)


@router.post('/menu/item', response_model=ItemRead)
async def create_item(
    payload: ItemCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ItemRead:
    item = Item(
        section_id=payload.section_id,
        name_en=payload.name_en,
        name_ar=payload.name_ar,
        image_url=payload.image_url,
        description_en=payload.description_en,
        description_ar=payload.description_ar,
        sort_order=payload.sort_order,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _item_to_read(item)


@router.patch('/menu/item/{item_id}', response_model=ItemRead)
async def update_item(
    item_id: UUID,
    payload: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ItemRead:
    item = await db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Item not found')
    values = payload.model_dump(exclude_unset=True)
    if 'section_id' in values:
        await _ensure_menu_parent_exists(db, Section, values['section_id'], 'Section not found')
    for field, value in values.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return _item_to_read(item)


@router.post('/menu/type', response_model=ItemTypeRead)
async def create_type(
    payload: ItemTypeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ItemTypeRead:
    item_type = ItemType(
        item_id=payload.item_id,
        name_en=payload.name_en,
        name_ar=payload.name_ar,
        image_url=payload.image_url,
        sort_order=payload.sort_order,
    )
    db.add(item_type)
    await db.commit()
    await db.refresh(item_type)
    return _type_to_read(item_type)


@router.patch('/menu/type/{type_id}', response_model=ItemTypeRead)
async def update_type(
    type_id: UUID,
    payload: ItemTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ItemTypeRead:
    item_type = await db.get(ItemType, type_id)
    if item_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Type not found')
    values = payload.model_dump(exclude_unset=True)
    if 'item_id' in values:
        await _ensure_menu_parent_exists(db, Item, values['item_id'], 'Item not found')
    for field, value in values.items():
        setattr(item_type, field, value)
    await db.commit()
    await db.refresh(item_type)
    return _type_to_read(item_type)


@router.post('/menu/size', response_model=SizeRead)
async def create_size(
    payload: SizeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> SizeRead:
    size = Size(
        type_id=payload.type_id,
        name_en=payload.name_en,
        name_ar=payload.name_ar,
        image_url=payload.image_url,
        price=payload.price,
        order_limit=payload.order_limit,
        sort_order=payload.sort_order,
    )
    db.add(size)
    await db.commit()
    await db.refresh(size)
    return _size_to_read(size)


@router.patch('/menu/size/{size_id}', response_model=SizeRead)
async def update_size(
    size_id: UUID,
    payload: SizeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> SizeRead:
    size_entity = await db.get(Size, size_id)
    if size_entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Size not found')
    values = payload.model_dump(exclude_unset=True)
    if 'type_id' in values:
        await _ensure_menu_parent_exists(db, ItemType, values['type_id'], 'Type not found')
    for field, value in values.items():
        setattr(size_entity, field, value)
    await db.commit()
    await db.refresh(size_entity)
    return _size_to_read(size_entity)


@router.post('/menu/addon', response_model=AddonRead)
async def create_addon(
    payload: AddonCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AddonRead:
    addon = Addon(
        size_id=payload.size_id,
        name_en=payload.name_en,
        name_ar=payload.name_ar,
        image_url=payload.image_url,
        price=payload.price,
        sort_order=payload.sort_order,
    )
    db.add(addon)
    await db.commit()
    await db.refresh(addon)
    return _addon_to_read(addon)


@router.patch('/menu/addon/{addon_id}', response_model=AddonRead)
async def update_addon(
    addon_id: UUID,
    payload: AddonUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AddonRead:
    addon = await db.get(Addon, addon_id)
    if addon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Add-on not found')
    values = payload.model_dump(exclude_unset=True)
    if 'size_id' in values:
        await _ensure_menu_parent_exists(db, Size, values['size_id'], 'Size not found')
    for field, value in values.items():
        setattr(addon, field, value)
    await db.commit()
    await db.refresh(addon)
    return _addon_to_read(addon)


@router.delete('/menu/section/{section_id}', response_model=MenuDeleteResponse)
async def delete_section(
    section_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuDeleteResponse:
    counts = await delete_menu_entity(db, 'section', section_id)
    return MenuDeleteResponse(id=section_id, kind='section', deleted_counts=counts)


@router.delete('/menu/item/{item_id}', response_model=MenuDeleteResponse)
async def delete_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuDeleteResponse:
    counts = await delete_menu_entity(db, 'item', item_id)
    return MenuDeleteResponse(id=item_id, kind='item', deleted_counts=counts)


@router.delete('/menu/type/{type_id}', response_model=MenuDeleteResponse)
async def delete_type(
    type_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuDeleteResponse:
    counts = await delete_menu_entity(db, 'type', type_id)
    return MenuDeleteResponse(id=type_id, kind='type', deleted_counts=counts)


@router.delete('/menu/size/{size_id}', response_model=MenuDeleteResponse)
async def delete_size(
    size_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuDeleteResponse:
    counts = await delete_menu_entity(db, 'size', size_id)
    return MenuDeleteResponse(id=size_id, kind='size', deleted_counts=counts)


@router.delete('/menu/addon/{addon_id}', response_model=MenuDeleteResponse)
async def delete_addon(
    addon_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuDeleteResponse:
    counts = await delete_menu_entity(db, 'addon', addon_id)
    return MenuDeleteResponse(id=addon_id, kind='addon', deleted_counts=counts)


@router.patch('/menu/{entity_id}/toggle', response_model=ToggleResponse)
async def toggle_entity(
    entity_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ToggleResponse:
    entity = None
    for model in _menu_models().values():
        entity = await db.get(model, entity_id)
        if entity is not None:
            break
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Entity not found')
    entity.is_active = not entity.is_active
    await db.commit()
    await db.refresh(entity)
    return ToggleResponse(id=entity.id, is_active=entity.is_active)


@router.post('/menu/schedule', response_model=ScheduleMenuResponse)
async def schedule_menu(
    payload: ScheduleMenuRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ScheduleMenuResponse:
    _ensure_days(payload.days_of_week)
    start_time = _parse_hhmm(payload.start_time, 'start_time')
    end_time = _parse_hhmm(payload.end_time, 'end_time')

    schedule = await create_menu_schedule(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        start_time=start_time,
        end_time=end_time,
        days_of_week=payload.days_of_week,
    )
    return ScheduleMenuResponse(message='Schedule created', schedule_id=schedule.id)


@router.get('/menu/schedule', response_model=ScheduleListResponse)
async def list_menu_schedule(
    entity_type: str | None = Query(default=None, pattern='^(section|item|type|size|addon)$'),
    entity_id: UUID | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ScheduleListResponse:
    schedules = await list_menu_schedules(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        is_active=is_active,
    )
    return ScheduleListResponse(
        schedules=[
            ScheduleRead(
                id=schedule.id,
                entity_type=schedule.entity_type,
                entity_id=schedule.entity_id,
                start_time=schedule.start_time.strftime('%H:%M'),
                end_time=schedule.end_time.strftime('%H:%M'),
                days_of_week=schedule.days_of_week,
                is_active=schedule.is_active,
            )
            for schedule in schedules
        ]
    )


@router.patch('/menu/schedule/{schedule_id}', response_model=ScheduleRead)
async def patch_menu_schedule(
    schedule_id: UUID,
    payload: ScheduleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ScheduleRead:
    values = payload.model_dump(exclude_unset=True)
    if 'days_of_week' in values:
        _ensure_days(values['days_of_week'])
    updated = await update_menu_schedule(
        db=db,
        schedule_id=schedule_id,
        start_time=_parse_hhmm(values['start_time'], 'start_time') if 'start_time' in values else None,
        end_time=_parse_hhmm(values['end_time'], 'end_time') if 'end_time' in values else None,
        days_of_week=values.get('days_of_week'),
        is_active=values.get('is_active'),
    )
    return ScheduleRead(
        id=updated.id,
        entity_type=updated.entity_type,
        entity_id=updated.entity_id,
        start_time=updated.start_time.strftime('%H:%M'),
        end_time=updated.end_time.strftime('%H:%M'),
        days_of_week=updated.days_of_week,
        is_active=updated.is_active,
    )


@router.delete('/menu/schedule/{schedule_id}', status_code=status.HTTP_204_NO_CONTENT)
async def remove_menu_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    await delete_menu_schedule(db, schedule_id)


@router.get('/promotions', response_model=PromotionsListResponse)
async def list_promotions_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> PromotionsListResponse:
    promotions = await list_promotions(db)
    target_lookup = await _load_target_lookup(db, promotions)
    return PromotionsListResponse(promotions=[PromotionRead.model_validate(serialize_promotion(p, target_lookup)) for p in promotions])


@router.post('/promotions', response_model=PromotionRead)
async def create_promotion(
    payload: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> PromotionRead:
    ensure_promotion_type(payload.type)
    promotion = await create_promotion_record(db, payload)
    await emit_post_commit_promotion_created_notification(db, promotion)
    target_lookup = await _load_target_lookup(db, [promotion])
    return PromotionRead.model_validate(serialize_promotion(promotion, target_lookup))


@router.patch('/promotions/{promotion_id}', response_model=PromotionRead)
async def update_promotion(
    promotion_id: UUID,
    payload: PromotionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> PromotionRead:
    promotion = await get_promotion_by_id(db, promotion_id)
    if promotion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promotion not found')
    values = payload.model_dump(exclude_unset=True)
    if 'type' in values and values['type'] is not None:
        ensure_promotion_type(values['type'])
    promotion = await update_promotion_record(db, promotion, values)
    target_lookup = await _load_target_lookup(db, [promotion])
    return PromotionRead.model_validate(serialize_promotion(promotion, target_lookup))


@router.patch('/promotions/{promotion_id}/toggle', response_model=PromotionRead)
async def toggle_promotion(
    promotion_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> PromotionRead:
    promotion = await get_promotion_by_id(db, promotion_id)
    if promotion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promotion not found')
    promotion = await toggle_promotion_record(db, promotion)
    target_lookup = await _load_target_lookup(db, [promotion])
    return PromotionRead.model_validate(serialize_promotion(promotion, target_lookup))


@router.get('/loyalty-rules', response_model=LoyaltyRulesListResponse)
async def list_loyalty_rules_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> LoyaltyRulesListResponse:
    rules = await list_loyalty_rules(db)
    return LoyaltyRulesListResponse(rules=[LoyaltyRuleRead.model_validate(rule) for rule in rules])


@router.post('/loyalty-rules', response_model=LoyaltyRuleRead)
async def create_loyalty_rule(
    payload: LoyaltyRuleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> LoyaltyRuleRead:
    rule = LoyaltyRule(
        required_orders=payload.required_orders,
        reward_type=payload.reward_type,
        reward_value=payload.reward_value,
        is_active=payload.is_active,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return LoyaltyRuleRead.model_validate(rule)


@router.patch('/loyalty-rules/{rule_id}', response_model=LoyaltyRuleRead)
async def update_loyalty_rule(
    rule_id: UUID,
    payload: LoyaltyRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> LoyaltyRuleRead:
    rule = await db.get(LoyaltyRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Loyalty rule not found')
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return LoyaltyRuleRead.model_validate(rule)


@router.patch('/loyalty-rules/{rule_id}/toggle', response_model=LoyaltyRuleRead)
async def toggle_loyalty_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> LoyaltyRuleRead:
    rule = await db.get(LoyaltyRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Loyalty rule not found')
    rule.is_active = not rule.is_active
    await db.commit()
    await db.refresh(rule)
    return LoyaltyRuleRead.model_validate(rule)


@router.get('/users', response_model=UsersListResponse)
async def list_users_endpoint(
    search: str | None = Query(default=None),
    banned: bool | None = Query(default=None),
    role: str | None = Query(default=None, pattern='^(CLIENT|ADMIN|FRONTDESK|DRIVER)$'),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> UsersListResponse:
    users_with_counts = await list_users(db, search=search, banned=banned, role=role)
    return UsersListResponse(
        users=[
            UserRead(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                phone_number=user.phone_number,
                role=user.role.value,
                is_active=user.is_active,
                is_banned=user.is_banned,
                banned_at=user.banned_at,
                banned_reason=user.banned_reason,
                order_count=order_count,
                created_at=user.created_at,
            )
            for user, order_count in users_with_counts
        ]
    )


@router.get('/drivers', response_model=UsersListResponse)
async def list_drivers_endpoint(
    search: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.FRONTDESK)),
) -> UsersListResponse:
    drivers = await list_drivers(db=db, search=search, is_active=is_active, include_banned=True)
    return UsersListResponse(
        users=[
            UserRead(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                phone_number=user.phone_number,
                role=user.role.value,
                is_active=user.is_active,
                is_banned=user.is_banned,
                banned_at=user.banned_at,
                banned_reason=user.banned_reason,
                order_count=0,
                created_at=user.created_at,
            )
            for user in drivers
        ]
    )


@router.get('/drivers/available', response_model=UsersListResponse)
async def list_available_drivers_endpoint(
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.FRONTDESK)),
) -> UsersListResponse:
    drivers = await list_drivers(db=db, search=search, is_active=True, include_banned=False)
    return UsersListResponse(
        users=[
            UserRead(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                phone_number=user.phone_number,
                role=user.role.value,
                is_active=user.is_active,
                is_banned=user.is_banned,
                banned_at=user.banned_at,
                banned_reason=user.banned_reason,
                order_count=0,
                created_at=user.created_at,
            )
            for user in drivers
        ]
    )


@router.get('/delivery/distance-bands', response_model=DeliveryDistanceBandListResponse)
async def list_delivery_distance_bands_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> DeliveryDistanceBandListResponse:
    bands = await list_distance_bands(db)
    return DeliveryDistanceBandListResponse(bands=[DeliveryDistanceBandRead.model_validate(b) for b in bands])


@router.post('/delivery/distance-bands', response_model=DeliveryDistanceBandRead)
async def create_delivery_distance_band_endpoint(
    payload: DeliveryDistanceBandCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> DeliveryDistanceBandRead:
    band = await create_distance_band(
        db=db,
        min_distance_km=payload.min_distance_km,
        max_distance_km=payload.max_distance_km,
        fee_amount=payload.fee_amount,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    return DeliveryDistanceBandRead.model_validate(band)


@router.patch('/delivery/distance-bands/{band_id}', response_model=DeliveryDistanceBandRead)
async def update_delivery_distance_band_endpoint(
    band_id: UUID,
    payload: DeliveryDistanceBandUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> DeliveryDistanceBandRead:
    band = await update_distance_band(db, band_id, payload.model_dump(exclude_unset=True))
    return DeliveryDistanceBandRead.model_validate(band)


@router.delete('/delivery/distance-bands/{band_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_delivery_distance_band_endpoint(
    band_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    await delete_distance_band(db, band_id)


@router.post('/users/{user_id}/ban', response_model=UserModerationResponse)
async def ban_user_endpoint(
    user_id: UUID,
    payload: BanUserRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserModerationResponse:
    user = await ban_user(db, user_id, actor.id, payload.reason)
    return UserModerationResponse(id=user.id, is_banned=user.is_banned, banned_reason=user.banned_reason)


@router.post('/users/{user_id}/unban', response_model=UserModerationResponse)
async def unban_user_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserModerationResponse:
    user = await unban_user(db, user_id, actor.id)
    return UserModerationResponse(id=user.id, is_banned=user.is_banned, banned_reason=user.banned_reason)


@router.post('/users/provision-staff', response_model=ProvisionStaffResponse)
async def provision_staff_endpoint(
    payload: ProvisionStaffRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
) -> ProvisionStaffResponse:
    user, created = await provision_staff_user(
        db,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone_number=payload.phone_number,
        role=payload.role,
        actor_user_id=actor.id,
    )
    return ProvisionStaffResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        phone_number=user.phone_number,
        role=user.role.value,
        created=created,
    )


@router.post('/users/{user_id}/archive-staff', response_model=StaffLifecycleResponse)
async def archive_staff_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
) -> StaffLifecycleResponse:
    user = await archive_staff_user(db, user_id, actor.id)
    return StaffLifecycleResponse(
        id=user.id,
        role=user.role.value,
        is_active=user.is_active,
        is_banned=user.is_banned,
    )


@router.post('/users/{user_id}/unarchive-staff', response_model=StaffLifecycleResponse)
async def unarchive_staff_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
) -> StaffLifecycleResponse:
    user = await unarchive_staff_user(db, user_id, actor.id)
    return StaffLifecycleResponse(
        id=user.id,
        role=user.role.value,
        is_active=user.is_active,
        is_banned=user.is_banned,
    )


@router.delete('/users/{user_id}/staff', status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    await delete_staff_user(db, user_id, actor.id)


@router.get('/analytics/revenue-summary', response_model=RevenueSummaryResponse)
async def revenue_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> RevenueSummaryResponse:
    summary = await get_revenue_summary(db)
    return RevenueSummaryResponse(**summary)


@router.get('/analytics/dashboard', response_model=AdminDashboardAnalyticsResponse)
async def dashboard_analytics_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminDashboardAnalyticsResponse:
    analytics = await get_admin_dashboard_analytics(db)
    return AdminDashboardAnalyticsResponse(**analytics)


@router.get('/ratings', response_model=AdminRatingsResponse)
async def list_ratings_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminRatingsResponse:
    ratings = await list_admin_ratings(db=db, limit=limit, offset=offset)
    return AdminRatingsResponse(ratings=ratings)


@router.get('/ratings/reviews', response_model=AdminRatingsResponse)
async def list_rating_reviews_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminRatingsResponse:
    ratings = await list_admin_ratings(db=db, limit=limit, offset=offset)
    return AdminRatingsResponse(ratings=ratings)


@router.get('/ratings/summary', response_model=AdminRatingSummaryResponse)
async def ratings_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminRatingSummaryResponse:
    summary = await get_admin_rating_summary(db)
    return AdminRatingSummaryResponse(**summary)
