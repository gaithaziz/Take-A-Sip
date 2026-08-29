from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.user import UserRole
from app.schemas.store import StoreSettingsUpdate, WorkingHoursDay
from app.schemas.order import OrderCreateRequest
from app.services.order_service import _calculate_order_subtotal, enforce_order_access
from app.services.store_service import ensure_delivery_minimum, evaluate_working_hours, store_status_payload


TZ = ZoneInfo('Asia/Amman')


def schedule(**overrides: dict) -> list[dict]:
    days = [
        {'day_of_week': day, 'is_open': False, 'opens_at': None, 'closes_at': None}
        for day in range(7)
    ]
    for day, values in overrides.items():
        days[int(day)] = {'day_of_week': int(day), **values}
    return days


def test_normal_hours_and_next_closing_boundary() -> None:
    hours = schedule(**{'0': {'is_open': True, 'opens_at': '09:00', 'closes_at': '17:00'}})

    is_open, current_open, next_open, next_change = evaluate_working_hours(
        hours, now=datetime(2026, 8, 3, 10, 0, tzinfo=TZ)
    )

    assert is_open is True
    assert current_open == datetime(2026, 8, 3, 9, 0, tzinfo=TZ)
    assert next_open is None
    assert next_change == datetime(2026, 8, 3, 17, 0, tzinfo=TZ)


def test_closed_day_finds_next_opening_across_week_rollover() -> None:
    hours = schedule(**{'0': {'is_open': True, 'opens_at': '08:30', 'closes_at': '16:00'}})

    is_open, current_open, next_open, next_change = evaluate_working_hours(
        hours, now=datetime(2026, 8, 9, 12, 0, tzinfo=TZ)
    )

    expected = datetime(2026, 8, 10, 8, 30, tzinfo=TZ)
    assert is_open is False
    assert current_open is None
    assert next_open == expected
    assert next_change == expected


def test_overnight_hours_include_the_following_day() -> None:
    hours = schedule(**{'0': {'is_open': True, 'opens_at': '22:00', 'closes_at': '02:00'}})

    is_open, current_open, next_open, next_change = evaluate_working_hours(
        hours, now=datetime(2026, 8, 4, 1, 0, tzinfo=TZ)
    )

    assert is_open is True
    assert current_open == datetime(2026, 8, 3, 22, 0, tzinfo=TZ)
    assert next_open is None
    assert next_change == datetime(2026, 8, 4, 2, 0, tzinfo=TZ)


def test_manual_pause_takes_precedence_over_working_hours() -> None:
    settings = SimpleNamespace(
        ordering_enabled=False,
        working_hours=None,
        minimum_delivery_order_amount=Decimal('4.00'),
        updated_at=None,
        ordering_updated_by_user_id=None,
    )

    payload = store_status_payload(settings)

    assert payload['accepting_orders'] is False
    assert payload['unavailable_reason'] == 'MANUAL_PAUSE'


def test_order_minimum_allows_equality_and_uses_separate_pickup_value() -> None:
    settings = SimpleNamespace(
        minimum_delivery_order_amount=Decimal('5.00'),
        minimum_pickup_order_amount=Decimal('2.00'),
    )

    ensure_delivery_minimum(settings, order_type='delivery', subtotal=Decimal('5.00'))
    ensure_delivery_minimum(settings, order_type='pickup', subtotal=Decimal('2.00'))

    with pytest.raises(HTTPException) as exc:
        ensure_delivery_minimum(settings, order_type='delivery', subtotal=Decimal('4.99'))
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        ensure_delivery_minimum(settings, order_type='pickup', subtotal=Decimal('1.99'))
    assert exc.value.status_code == 409
    assert exc.value.detail == 'Pickup order subtotal is below the minimum'


def test_addons_count_toward_authoritative_minimum_subtotal() -> None:
    size_id = uuid4()
    addon_id = uuid4()
    size = SimpleNamespace(
        price=Decimal('3.00'),
        addons=[SimpleNamespace(id=addon_id, price=Decimal('2.00'))],
    )
    payload = OrderCreateRequest(
        order_type='pickup',
        items=[{'size_id': size_id, 'quantity': 2, 'addon_ids': [addon_id]}],
    )

    assert _calculate_order_subtotal(payload, {size_id: size}) == Decimal('10.00')


def test_store_settings_require_complete_schedule_and_distinct_times() -> None:
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(working_hours=[WorkingHoursDay(day_of_week=0, is_open=False)])

    with pytest.raises(ValidationError):
        WorkingHoursDay(day_of_week=0, is_open=True, opens_at='09:00', closes_at='09:00')


def test_only_assigned_driver_can_access_an_order() -> None:
    assigned_driver_id = uuid4()
    order = SimpleNamespace(user_id=uuid4(), assigned_driver_id=assigned_driver_id)
    assigned_driver = SimpleNamespace(id=assigned_driver_id, role=UserRole.DRIVER)
    other_driver = SimpleNamespace(id=uuid4(), role=UserRole.DRIVER)

    enforce_order_access(order, assigned_driver)
    with pytest.raises(HTTPException) as exc:
        enforce_order_access(order, other_driver)
    assert exc.value.status_code == 403
