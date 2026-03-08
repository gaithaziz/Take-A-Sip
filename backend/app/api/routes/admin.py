from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.menu import Addon, Item, ItemType, Section, Size
from app.models.user import User, UserRole
from app.schemas.menu import (
    AddonCreate,
    AddonRead,
    ItemCreate,
    ItemRead,
    ItemTypeCreate,
    ItemTypeRead,
    ScheduleMenuRequest,
    ScheduleMenuResponse,
    SectionCreate,
    SectionRead,
    SizeCreate,
    SizeRead,
    ToggleResponse,
)
from app.schemas.user import BanUserRequest, UserModerationResponse, UserRead, UsersListResponse
from app.services.menu_service import create_menu_schedule
from app.services.user_service import ban_user, list_users, unban_user

router = APIRouter(prefix='/admin', tags=['admin'])


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
    return SectionRead.model_validate(section)


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
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return ItemRead.model_validate(item)


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
    )
    db.add(item_type)
    await db.commit()
    await db.refresh(item_type)
    return ItemTypeRead.model_validate(item_type)


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
    )
    db.add(size)
    await db.commit()
    await db.refresh(size)
    return SizeRead.model_validate(size)


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
    )
    db.add(addon)
    await db.commit()
    await db.refresh(addon)
    return AddonRead.model_validate(addon)


@router.patch('/menu/{entity_id}/toggle', response_model=ToggleResponse)
async def toggle_entity(
    entity_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ToggleResponse:
    models = [Section, Item, ItemType, Size, Addon]
    entity = None
    for model in models:
        entity = await db.get(model, entity_id)
        if entity is not None:
            break
    if entity is None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Entity not found')
    entity.is_active = not entity.is_active
    await db.commit()
    await db.refresh(entity)
    return ToggleResponse(id=entity.id, is_active=entity.is_active)


@router.post('/menu/schedule', response_model=ScheduleMenuResponse)
async def schedule_menu(
    payload: ScheduleMenuRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> ScheduleMenuResponse:
    from datetime import datetime

    from fastapi import HTTPException, status

    if any(day < 0 or day > 6 for day in payload.days_of_week):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='days_of_week must be 0..6')

    try:
        start_time = datetime.strptime(payload.start_time, '%H:%M').time()
        end_time = datetime.strptime(payload.end_time, '%H:%M').time()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='start_time and end_time must be HH:MM',
        ) from exc

    schedule = await create_menu_schedule(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        start_time=start_time,
        end_time=end_time,
        days_of_week=payload.days_of_week,
    )
    return ScheduleMenuResponse(message='Schedule created', schedule_id=schedule.id)


@router.get('/users', response_model=UsersListResponse)
async def list_users_endpoint(
    search: str | None = Query(default=None),
    banned: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> UsersListResponse:
    users = await list_users(db, search=search, banned=banned)
    return UsersListResponse(users=[UserRead.model_validate(user) for user in users])


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
