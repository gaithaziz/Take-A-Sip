from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.order import OrderCreateRequest
from app.services.order_service import _ensure_order_limits, create_order


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
