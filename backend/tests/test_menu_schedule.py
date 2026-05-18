from datetime import datetime, time
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.models.menu import MenuSchedule
from app.services.menu_service import is_entity_available


def _schedule(days: list[int], start: time, end: time) -> MenuSchedule:
    return MenuSchedule(
        entity_type='item',
        entity_id=uuid4(),
        start_time=start,
        end_time=end,
        days_of_week=days,
        is_active=True,
    )


def test_entity_available_without_schedule() -> None:
    available = is_entity_available({}, 'item', uuid4(), datetime.now(ZoneInfo('Asia/Amman')))
    assert available is True


def test_entity_available_with_matching_schedule() -> None:
    entity_id = uuid4()
    now = datetime(2026, 3, 9, 9, 0, tzinfo=ZoneInfo('Asia/Amman'))  # Monday
    schedule = MenuSchedule(
        entity_type='item',
        entity_id=entity_id,
        start_time=time(7, 0),
        end_time=time(11, 0),
        days_of_week=[0],
        is_active=True,
    )
    index = {('item', entity_id): [schedule]}
    assert is_entity_available(index, 'item', entity_id, now) is True


def test_entity_unavailable_when_outside_schedule() -> None:
    entity_id = uuid4()
    now = datetime(2026, 3, 9, 12, 0, tzinfo=ZoneInfo('Asia/Amman'))
    schedule = MenuSchedule(
        entity_type='item',
        entity_id=entity_id,
        start_time=time(7, 0),
        end_time=time(11, 0),
        days_of_week=[0],
        is_active=True,
    )
    index = {('item', entity_id): [schedule]}
    assert is_entity_available(index, 'item', entity_id, now) is False


def test_entity_availability_converts_utc_to_store_timezone() -> None:
    entity_id = uuid4()
    now = datetime(2026, 3, 9, 6, 0, tzinfo=ZoneInfo('UTC'))  # 09:00 in Jordan
    schedule = MenuSchedule(
        entity_type='item',
        entity_id=entity_id,
        start_time=time(8, 0),
        end_time=time(10, 0),
        days_of_week=[0],
        is_active=True,
    )
    index = {('item', entity_id): [schedule]}
    assert is_entity_available(index, 'item', entity_id, now) is True


def test_overnight_schedule_uses_start_day_after_midnight() -> None:
    entity_id = uuid4()
    now = datetime(2026, 3, 10, 1, 0, tzinfo=ZoneInfo('Asia/Amman'))  # Tuesday
    schedule = MenuSchedule(
        entity_type='item',
        entity_id=entity_id,
        start_time=time(22, 0),
        end_time=time(2, 0),
        days_of_week=[0],
        is_active=True,
    )
    index = {('item', entity_id): [schedule]}
    assert is_entity_available(index, 'item', entity_id, now) is True
