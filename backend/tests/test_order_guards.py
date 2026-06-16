from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.models.order import Order, OrderStatus, OrderType
from app.models.user import User, UserRole
from app.schemas.order import OrderCreateRequest
from app.services.order_service import _ensure_order_limits, _next_order_number, attach_driver_order_customers, create_order


@pytest.mark.asyncio
async def test_create_order_rejects_banned_user() -> None:
    user = SimpleNamespace(id='u1', role=UserRole.CLIENT, is_banned=True)
    payload = OrderCreateRequest(order_type='pickup', items=[{'size_id': '00000000-0000-0000-0000-000000000001', 'quantity': 1, 'addon_ids': []}])

    with pytest.raises(HTTPException) as exc:
        await create_order(db=None, user=user, payload=payload)  # type: ignore[arg-type]

    assert exc.value.status_code == 403
    assert exc.value.detail == 'User is banned'


@pytest.mark.asyncio
async def test_create_order_rejects_delivery_without_address() -> None:
    user = SimpleNamespace(id='u1', role=UserRole.CLIENT, is_banned=False)
    payload = OrderCreateRequest(
        order_type='delivery',
        delivery_address=None,
        items=[{'size_id': '00000000-0000-0000-0000-000000000001', 'quantity': 1, 'addon_ids': []}],
    )

    with pytest.raises(HTTPException) as exc:
        await create_order(db=None, user=user, payload=payload)  # type: ignore[arg-type]

    assert exc.value.status_code == 400
    assert exc.value.detail == 'delivery_address is required for delivery orders'


def test_order_limit_counts_all_lines_for_same_size() -> None:
    size_id = UUID('00000000-0000-0000-0000-000000000001')
    payload = OrderCreateRequest(
        order_type='pickup',
        items=[
            {'size_id': size_id, 'quantity': 1, 'addon_ids': []},
            {'size_id': size_id, 'quantity': 2, 'addon_ids': []},
        ],
    )
    sizes_by_id = {size_id: SimpleNamespace(order_limit=2)}

    with pytest.raises(HTTPException) as exc:
        _ensure_order_limits(payload, sizes_by_id)  # type: ignore[arg-type]

    assert exc.value.status_code == 400
    assert exc.value.detail == 'Order quantity exceeds product limit'


@pytest.mark.asyncio
async def test_next_order_number_uses_sequence() -> None:
    class Result:
        def scalar_one(self) -> int:
            return 42

    class Session:
        def __init__(self) -> None:
            self.statements: list[str] = []

        async def execute(self, statement):  # type: ignore[no-untyped-def]
            self.statements.append(str(statement))
            return Result()

    session = Session()

    assert await _next_order_number(session) == 42  # type: ignore[arg-type]
    assert session.statements == ["SELECT nextval('order_number_seq')"]


@pytest.mark.asyncio
async def test_attach_driver_order_customers_loads_assigned_customer_and_restores_driver_context() -> None:
    driver_id = UUID('00000000-0000-0000-0000-000000000111')
    customer_id = UUID('00000000-0000-0000-0000-000000000222')
    customer = User(
        id=customer_id,
        first_name='Lina',
        last_name='Client',
        phone_number='+962790000222',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    order = Order(
        id=UUID('00000000-0000-0000-0000-000000000333'),
        order_number=42,
        user_id=customer_id,
        assigned_driver_id=driver_id,
        status=OrderStatus.ASSIGNED,
        order_type=OrderType.DELIVERY,
    )

    class Result:
        def scalars(self):
            return self

        def all(self):
            return [customer]

    class Session:
        def __init__(self) -> None:
            self.calls = []

        async def execute(self, statement, params=None):  # type: ignore[no-untyped-def]
            self.calls.append((str(statement), params))
            return Result()

    session = Session()

    await attach_driver_order_customers(session, [order], driver_id)  # type: ignore[arg-type]

    assert order.customer_name == 'Lina Client'
    assert order.customer_phone == '+962790000222'
    assert session.calls[0][1]['user_role'] == UserRole.ADMIN.value
    assert session.calls[-1][1]['user_role'] == UserRole.DRIVER.value
