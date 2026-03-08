from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.order import OrderCreateRequest
from app.services.order_service import create_order


@pytest.mark.asyncio
async def test_create_order_rejects_banned_user() -> None:
    user = SimpleNamespace(id='u1', role=UserRole.CLIENT, is_banned=True)
    payload = OrderCreateRequest(order_type='pickup', items=[{'size_id': '00000000-0000-0000-0000-000000000001', 'quantity': 1, 'addon_ids': []}])

    with pytest.raises(HTTPException) as exc:
        await create_order(db=None, user=user, payload=payload)  # type: ignore[arg-type]

    assert exc.value.status_code == 403
    assert exc.value.detail == 'User is banned'
