from collections import defaultdict
from datetime import datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size
from app.schemas.menu import MenuDeleteCounts

DEFAULT_STORE_TIMEZONE = 'Asia/Amman'
WHOLE_MENU_SCHEDULE_ENTITY_ID = UUID(int=0)


def get_store_timezone() -> ZoneInfo:
    timezone_name = (get_settings().store_timezone or DEFAULT_STORE_TIMEZONE).strip() or DEFAULT_STORE_TIMEZONE
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_STORE_TIMEZONE)


def current_store_datetime() -> datetime:
    return datetime.now(get_store_timezone())


def _to_store_datetime(value: datetime) -> datetime:
    store_timezone = get_store_timezone()
    if value.tzinfo is None:
        return value.replace(tzinfo=store_timezone)
    return value.astimezone(store_timezone)


def _is_time_in_window(start, end, current) -> bool:
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


def _is_schedule_active(schedule: MenuSchedule, now: datetime) -> bool:
    store_now = _to_store_datetime(now)
    day = store_now.weekday()
    current_time = store_now.time()
    schedule_day = day

    if schedule.start_time > schedule.end_time:
        if current_time <= schedule.end_time:
            schedule_day = (day - 1) % 7
        elif current_time < schedule.start_time:
            return False

    if schedule.days_of_week and schedule_day not in schedule.days_of_week:
        return False
    return _is_time_in_window(schedule.start_time, schedule.end_time, current_time)


def _entity_available(
    schedules_by_entity: dict[tuple[str, UUID], list[MenuSchedule]],
    entity_type: str,
    entity_id: UUID,
    now: datetime,
) -> bool:
    if entity_type != 'menu':
        whole_menu_schedules = schedules_by_entity.get(('menu', WHOLE_MENU_SCHEDULE_ENTITY_ID), [])
        if whole_menu_schedules and not any(_is_schedule_active(schedule, now) for schedule in whole_menu_schedules):
            return False
    schedules = schedules_by_entity.get((entity_type, entity_id), [])
    if not schedules:
        return True
    return any(_is_schedule_active(schedule, now) for schedule in schedules)


def is_entity_available(
    schedules_by_entity: dict[tuple[str, UUID], list[MenuSchedule]],
    entity_type: str,
    entity_id: UUID,
    now: datetime,
) -> bool:
    return _entity_available(schedules_by_entity, entity_type, entity_id, now)


async def get_schedules_index(db: AsyncSession) -> dict[tuple[str, UUID], list[MenuSchedule]]:
    result = await db.execute(select(MenuSchedule).where(MenuSchedule.is_active.is_(True)))
    rows = list(result.scalars().all())
    index: dict[tuple[str, UUID], list[MenuSchedule]] = defaultdict(list)
    for row in rows:
        index[(row.entity_type, row.entity_id)].append(row)
    return index


async def get_menu_tree(db: AsyncSession, now: datetime | None = None) -> list[Section]:
    current = now or current_store_datetime()
    schedules_index = await get_schedules_index(db)

    result = await db.execute(
        select(Section)
        .where(Section.is_active.is_(True))
        .order_by(Section.sort_order, Section.name_en)
        .options(
            selectinload(Section.items)
            .selectinload(Item.item_types)
            .selectinload(ItemType.sizes)
            .selectinload(Size.addons)
        )
    )
    sections = list(result.scalars().unique().all())

    filtered_sections: list[Section] = []
    for section in sections:
        if not _entity_available(schedules_index, 'section', section.id, current):
            continue

        section.items = sorted(
            section.items,
            key=lambda item: (item.sort_order, item.name_en),
        )
        section.items = [
            item
            for item in section.items
            if item.is_active and _entity_available(schedules_index, 'item', item.id, current)
        ]

        for item in section.items:
            item.item_types = sorted(
                item.item_types,
                key=lambda item_type: (item_type.sort_order, item_type.name_en),
            )
            item.item_types = [
                t
                for t in item.item_types
                if t.is_active and _entity_available(schedules_index, 'type', t.id, current)
            ]
            for item_type in item.item_types:
                item_type.sizes = sorted(
                    item_type.sizes,
                    key=lambda size: (size.sort_order, size.name_en),
                )
                item_type.sizes = [
                    s
                    for s in item_type.sizes
                    if s.is_active and _entity_available(schedules_index, 'size', s.id, current)
                ]
                for size in item_type.sizes:
                    size.addons = sorted(
                        size.addons,
                        key=lambda addon: (addon.sort_order, addon.name_en),
                    )
                    size.addons = [
                        addon
                        for addon in size.addons
                        if addon.is_active
                        and _entity_available(schedules_index, 'addon', addon.id, current)
                    ]

            item.item_types = [item_type for item_type in item.item_types if item_type.sizes]

        section.items = [item for item in section.items if item.item_types]

        if section.items:
            filtered_sections.append(section)

    return filtered_sections


async def get_admin_menu_tree(db: AsyncSession) -> list[Section]:
    result = await db.execute(
        select(Section)
        .order_by(Section.sort_order, Section.name_en)
        .options(
            selectinload(Section.items)
            .selectinload(Item.item_types)
            .selectinload(ItemType.sizes)
            .selectinload(Size.addons)
        )
    )
    sections = list(result.scalars().unique().all())

    for section in sections:
        section.items = sorted(section.items, key=lambda item: (item.sort_order, item.name_en))
        for item in section.items:
            item.item_types = sorted(item.item_types, key=lambda item_type: (item_type.sort_order, item_type.name_en))
            for item_type in item.item_types:
                item_type.sizes = sorted(item_type.sizes, key=lambda size: (size.sort_order, size.name_en))
                for size in item_type.sizes:
                    size.addons = sorted(size.addons, key=lambda addon: (addon.sort_order, addon.name_en))

    return sections


async def set_menu_entities_active(
    db: AsyncSession,
    entities: list[tuple[str, UUID]],
    *,
    is_active: bool,
) -> list[Section | Item | ItemType | Size | Addon]:
    model_map = {
        'section': Section,
        'item': Item,
        'type': ItemType,
        'size': Size,
        'addon': Addon,
    }
    unique_entities = list(dict.fromkeys(entities))
    resolved: dict[tuple[str, UUID], Section | Item | ItemType | Size | Addon] = {}

    for entity_type, model in model_map.items():
        entity_ids = [entity_id for kind, entity_id in unique_entities if kind == entity_type]
        if not entity_ids:
            continue
        result = await db.execute(select(model).where(model.id.in_(entity_ids)))
        for entity in result.scalars().all():
            resolved[(entity_type, entity.id)] = entity

    missing = [entry for entry in unique_entities if entry not in resolved]
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='One or more menu entities were not found')

    updated = [resolved[entry] for entry in unique_entities]
    for entity in updated:
        entity.is_active = is_active
    await db.commit()
    return updated


async def create_menu_schedule(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    start_time: time,
    end_time: time,
    days_of_week: list[int],
) -> MenuSchedule:
    model_map = {
        'section': Section,
        'item': Item,
        'type': ItemType,
        'size': Size,
        'addon': Addon,
    }
    if entity_type == 'menu':
        entity_id = WHOLE_MENU_SCHEDULE_ENTITY_ID
        entity = True
    else:
        model = model_map[entity_type]
        entity = await db.get(model, entity_id)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Entity not found')

    schedule = MenuSchedule(
        entity_type=entity_type,
        entity_id=entity_id,
        start_time=start_time,
        end_time=end_time,
        days_of_week=days_of_week,
        is_active=True,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def create_menu_schedules(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_ids: list[UUID],
    start_time: time,
    end_time: time,
    days_of_week: list[int],
) -> list[MenuSchedule]:
    if entity_type != 'section':
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Invalid bulk schedule target')

    unique_ids = list(dict.fromkeys(entity_ids))
    result = await db.execute(select(Section.id).where(Section.id.in_(unique_ids)))
    found_ids = set(result.scalars().all())
    if len(found_ids) != len(unique_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='One or more menu entities were not found')

    schedules = [
        MenuSchedule(
            entity_type=entity_type,
            entity_id=entity_id,
            start_time=start_time,
            end_time=end_time,
            days_of_week=days_of_week,
            is_active=True,
        )
        for entity_id in unique_ids
    ]
    db.add_all(schedules)
    await db.commit()
    for schedule in schedules:
        await db.refresh(schedule)
    return schedules


async def list_menu_schedules(
    db: AsyncSession,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    is_active: bool | None = None,
) -> list[MenuSchedule]:
    query = select(MenuSchedule)
    if entity_type is not None:
        query = query.where(MenuSchedule.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(MenuSchedule.entity_id == entity_id)
    if is_active is not None:
        query = query.where(MenuSchedule.is_active.is_(is_active))
    query = query.order_by(MenuSchedule.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_menu_schedule(
    db: AsyncSession,
    schedule_id: UUID,
    *,
    start_time: time | None = None,
    end_time: time | None = None,
    days_of_week: list[int] | None = None,
    is_active: bool | None = None,
) -> MenuSchedule:
    schedule = await db.get(MenuSchedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Schedule not found')

    if start_time is not None:
        schedule.start_time = start_time
    if end_time is not None:
        schedule.end_time = end_time
    if days_of_week is not None:
        schedule.days_of_week = days_of_week
    if is_active is not None:
        schedule.is_active = is_active

    await db.commit()
    await db.refresh(schedule)
    return schedule


async def delete_menu_schedule(db: AsyncSession, schedule_id: UUID) -> None:
    schedule = await db.get(MenuSchedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Schedule not found')
    await db.delete(schedule)
    await db.commit()


def _section_tree_options():
    return (
        selectinload(Section.items)
        .selectinload(Item.item_types)
        .selectinload(ItemType.sizes)
        .selectinload(Size.addons)
    )


def _item_tree_options():
    return (
        selectinload(Item.item_types)
        .selectinload(ItemType.sizes)
        .selectinload(Size.addons)
    )


def _type_tree_options():
    return selectinload(ItemType.sizes).selectinload(Size.addons)


def _size_tree_options():
    return selectinload(Size.addons)


async def _load_entity_tree(db: AsyncSession, kind: str, entity_id: UUID):
    if kind == 'section':
        result = await db.execute(select(Section).where(Section.id == entity_id).options(_section_tree_options()))
        return result.scalar_one_or_none()
    if kind == 'item':
        result = await db.execute(select(Item).where(Item.id == entity_id).options(_item_tree_options()))
        return result.scalar_one_or_none()
    if kind == 'type':
        result = await db.execute(select(ItemType).where(ItemType.id == entity_id).options(_type_tree_options()))
        return result.scalar_one_or_none()
    if kind == 'size':
        result = await db.execute(select(Size).where(Size.id == entity_id).options(_size_tree_options()))
        return result.scalar_one_or_none()
    if kind == 'addon':
        return await db.get(Addon, entity_id)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported menu entity type')


def _collect_delete_targets(kind: str, entity) -> tuple[MenuDeleteCounts, dict[str, set[UUID]]]:
    counts = MenuDeleteCounts()
    ids: dict[str, set[UUID]] = {
        'section': set(),
        'item': set(),
        'type': set(),
        'size': set(),
        'addon': set(),
    }

    if kind == 'section':
        ids['section'].add(entity.id)
        counts.sections = 1
        for item in entity.items:
            ids['item'].add(item.id)
            counts.items += 1
            for item_type in item.item_types:
                ids['type'].add(item_type.id)
                counts.types += 1
                for size in item_type.sizes:
                    ids['size'].add(size.id)
                    counts.sizes += 1
                    for addon in size.addons:
                        ids['addon'].add(addon.id)
                        counts.addons += 1
        return counts, ids

    if kind == 'item':
        ids['item'].add(entity.id)
        counts.items = 1
        for item_type in entity.item_types:
            ids['type'].add(item_type.id)
            counts.types += 1
            for size in item_type.sizes:
                ids['size'].add(size.id)
                counts.sizes += 1
                for addon in size.addons:
                    ids['addon'].add(addon.id)
                    counts.addons += 1
        return counts, ids

    if kind == 'type':
        ids['type'].add(entity.id)
        counts.types = 1
        for size in entity.sizes:
            ids['size'].add(size.id)
            counts.sizes += 1
            for addon in size.addons:
                ids['addon'].add(addon.id)
                counts.addons += 1
        return counts, ids

    if kind == 'size':
        ids['size'].add(entity.id)
        counts.sizes = 1
        for addon in entity.addons:
            ids['addon'].add(addon.id)
            counts.addons += 1
        return counts, ids

    ids['addon'].add(entity.id)
    counts.addons = 1
    return counts, ids


async def delete_menu_entity(db: AsyncSession, kind: str, entity_id: UUID) -> MenuDeleteCounts:
    entity = await _load_entity_tree(db, kind, entity_id)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Entity not found')

    counts, entity_ids = _collect_delete_targets(kind, entity)
    schedule_filters = [
        (MenuSchedule.entity_type == entity_kind) & MenuSchedule.entity_id.in_(list(ids))
        for entity_kind, ids in entity_ids.items()
        if ids
    ]
    schedules: list[MenuSchedule] = []
    if schedule_filters:
        result = await db.execute(select(MenuSchedule).where(or_(*schedule_filters)))
        schedules = list(result.scalars().all())

    counts.schedules = len(schedules)
    for schedule in schedules:
        await db.delete(schedule)

    await db.delete(entity)
    await db.commit()
    return counts
