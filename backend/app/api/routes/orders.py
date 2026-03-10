from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.order import AcceptOrderResponse, OrderCreateRequest, OrderListResponse, OrderRead
from app.services.order_service import (
    accept_order,
    create_order,
    get_order_by_id,
    get_user_orders,
    list_orders,
    reorder_order,
)
from app.websocket.manager import frontdesk_channel, manager, order_event_payload

router = APIRouter(prefix='/orders', tags=['orders'])


@router.post('', response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    payload: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only clients can create orders')

    order = await create_order(db, current_user, payload)
    await manager.broadcast(
        frontdesk_channel(),
        order_event_payload('order.created', order.id, order.order_number, order.status.value),
    )
    return OrderRead.model_validate(order)


@router.get('', response_model=OrderListResponse)
async def list_orders_endpoint(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role not in {UserRole.ADMIN, UserRole.FRONTDESK}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    orders = await list_orders(db, status_filter=status)
    return OrderListResponse(orders=[OrderRead.model_validate(order) for order in orders])


@router.get('/user/{user_id}', response_model=OrderListResponse)
async def get_user_orders_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role == UserRole.CLIENT and user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
    orders = await get_user_orders(db, user_id)
    return OrderListResponse(orders=[OrderRead.model_validate(order) for order in orders])


@router.get('/my-orders', response_model=OrderListResponse)
async def get_my_orders_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    orders = await get_user_orders(db, current_user.id)
    return OrderListResponse(orders=[OrderRead.model_validate(order) for order in orders])


@router.get('/{order_id}', response_model=OrderRead)
async def get_order_endpoint(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Order not found')

    if current_user.role == UserRole.CLIENT and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
    return OrderRead.model_validate(order)


@router.post('/{order_id}/accept', response_model=AcceptOrderResponse)
async def accept_order_endpoint(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AcceptOrderResponse:
    order = await accept_order(db, order_id, current_user)
    await manager.broadcast(
        frontdesk_channel(),
        order_event_payload('order.accepted', order.id, order.order_number, order.status.value),
    )
    return AcceptOrderResponse(id=order.id, status=order.status.value)


@router.post('/{order_id}/reorder', response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def reorder_order_endpoint(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only clients can reorder')

    order = await reorder_order(db, current_user, order_id)
    await manager.broadcast(
        frontdesk_channel(),
        order_event_payload('order.created', order.id, order.order_number, order.status.value),
    )
    return OrderRead.model_validate(order)
