from collections import defaultdict
from datetime import datetime, time, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size


def _is_time_in_window(start, end, current) -> bool:
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


def _is_schedule_active(schedule: MenuSchedule, now: datetime) -> bool:
    day = now.weekday()
    if schedule.days_of_week and day not in schedule.days_of_week:
        return False
    return _is_time_in_window(schedule.start_time, schedule.end_time, now.time())


def _entity_available(
    schedules_by_entity: dict[tuple[str, UUID], list[MenuSchedule]],
    entity_type: str,
    entity_id: UUID,
    now: datetime,
) -> bool:
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
    current = now or datetime.now(timezone.utc)
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
