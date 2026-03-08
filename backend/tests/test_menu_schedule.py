from datetime import datetime, time, timezone
from uuid import uuid4

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
    available = is_entity_available({}, 'item', uuid4(), datetime.now(timezone.utc))
    assert available is True


def test_entity_available_with_matching_schedule() -> None:
    entity_id = uuid4()
    now = datetime(2026, 3, 9, 9, 0, tzinfo=timezone.utc)  # Monday
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
    now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
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
