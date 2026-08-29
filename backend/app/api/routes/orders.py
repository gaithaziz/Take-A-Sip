from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.order import (
    AcceptOrderResponse,
    AssignDriverRequest,
    DeliveryQuoteRequest,
    DeliveryQuoteResponse,
    OrderRatingRead,
    OrderCreateRequest,
    OrderListResponse,
    OrderRead,
    SubmitOrderRatingRequest,
    UpdateOrderStatusRequest,
    UpdateOrderStatusResponse,
)
from app.services.order_service import (
    accept_order,
    attach_driver_order_customers,
    assign_driver,
    create_order,
    enforce_order_access,
    get_delivery_quote,
    get_order_by_id,
    get_user_orders,
    list_driver_assigned_orders,
    list_driver_latest_orders,
    list_latest_orders,
    list_orders,
    order_to_read_dict,
    reorder_order,
    create_order_rating,
    update_order_status,
)
from app.websocket.manager import frontdesk_channel, manager, order_event_payload

router = APIRouter(prefix='/orders', tags=['orders'])
driver_router = APIRouter(prefix='/driver', tags=['driver'])


READY_STATUS_CAPABILITY = 'ready-status'


def _supports_ready_status(capabilities: str | None) -> bool:
    return READY_STATUS_CAPABILITY in {
        capability.strip().lower() for capability in (capabilities or '').split(',') if capability.strip()
    }


def _serialize_order(
    order,
    *,
    expose_ready_status: bool = True,
    prefer_arabic_names: bool = False,
) -> OrderRead:
    payload = order_to_read_dict(order)
    status_value = payload.get('status')
    if not expose_ready_status and getattr(status_value, 'value', status_value) == 'READY':
        payload = {**payload, 'status': 'ASSIGNED'}
    serialized = OrderRead.model_validate(payload)
    if not prefer_arabic_names:
        return serialized

    localized_items = []
    for item in serialized.items:
        localized_addons = [
            addon.model_copy(
                update={
                    'addon_name_snapshot': addon.addon_name_ar_snapshot or addon.addon_name_snapshot,
                }
            )
            for addon in item.addons
        ]
        localized_items.append(
            item.model_copy(
                update={
                    'item_name_snapshot': item.item_name_ar_snapshot or item.item_name_snapshot,
                    'item_type_name_snapshot': (
                        item.item_type_name_ar_snapshot or item.item_type_name_snapshot
                    ),
                    'size_snapshot': item.size_name_ar_snapshot or item.size_snapshot,
                    'addons': localized_addons,
                }
            )
        )
    return serialized.model_copy(update={'items': localized_items})


def _serialize_orders(
    orders,
    *,
    expose_ready_status: bool = True,
    prefer_arabic_names: bool = False,
) -> OrderListResponse:
    return OrderListResponse(
        orders=[
            _serialize_order(
                order,
                expose_ready_status=expose_ready_status,
                prefer_arabic_names=prefer_arabic_names,
            )
            for order in orders
        ]
    )


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
    return OrderRead.model_validate(order_to_read_dict(order))


@router.post('/delivery-quote', response_model=DeliveryQuoteResponse)
async def delivery_quote_endpoint(
    payload: DeliveryQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeliveryQuoteResponse:
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only clients can request delivery quote')

    lat = payload.delivery_latitude if payload.delivery_latitude is not None else payload.delivery_lat
    lng = payload.delivery_longitude if payload.delivery_longitude is not None else payload.delivery_lng
    quote = await get_delivery_quote(db, lat, lng)
    return DeliveryQuoteResponse.model_validate(quote)


@router.get('', response_model=OrderListResponse)
async def list_orders_endpoint(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role not in {UserRole.ADMIN, UserRole.FRONTDESK}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    orders = await list_orders(db, status_filter=status)
    return _serialize_orders(orders, prefer_arabic_names=current_user.role == UserRole.FRONTDESK)


@router.get('/latest', response_model=OrderListResponse)
async def list_latest_orders_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: list[str] | None = Query(default=None, alias='status'),
    order_type: str | None = Query(default=None, pattern='^(pickup|delivery)$'),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role not in {UserRole.ADMIN, UserRole.FRONTDESK}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    orders = await list_latest_orders(
        db=db,
        current_user=current_user,
        limit=limit,
        offset=offset,
        statuses=status_filter,
        order_type=order_type,
        search=search,
    )
    return _serialize_orders(orders, prefer_arabic_names=current_user.role == UserRole.FRONTDESK)


@router.get('/my-latest', response_model=OrderListResponse)
async def list_my_latest_orders_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    orders = await list_latest_orders(db=db, current_user=current_user, limit=limit, offset=offset)
    return _serialize_orders(orders, prefer_arabic_names=current_user.role == UserRole.FRONTDESK)


@router.get('/user/{user_id}', response_model=OrderListResponse)
async def get_user_orders_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role == UserRole.CLIENT and user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
    orders = await get_user_orders(db, user_id)
    return _serialize_orders(orders, prefer_arabic_names=current_user.role == UserRole.FRONTDESK)


@router.get('/my-orders', response_model=OrderListResponse)
async def get_my_orders_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    orders = await get_user_orders(db, current_user.id)
    return _serialize_orders(orders)


@router.get('/{order_id}', response_model=OrderRead)
async def get_order_endpoint(
    order_id: UUID,
    x_app_capabilities: str | None = Header(default=None, alias='X-App-Capabilities'),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Order not found')
    enforce_order_access(order, current_user)
    if current_user.role == UserRole.DRIVER:
        await attach_driver_order_customers(db, [order], current_user.id)
    return _serialize_order(
        order,
        expose_ready_status=current_user.role != UserRole.DRIVER or _supports_ready_status(x_app_capabilities),
        prefer_arabic_names=current_user.role == UserRole.FRONTDESK,
    )


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


@router.post('/{order_id}/assign-driver', response_model=OrderRead)
async def assign_driver_endpoint(
    order_id: UUID,
    payload: AssignDriverRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    order = await assign_driver(db, order_id, payload, current_user)
    await manager.broadcast(
        frontdesk_channel(),
        order_event_payload('order.assigned', order.id, order.order_number, order.status.value),
    )
    return _serialize_order(order, prefer_arabic_names=current_user.role == UserRole.FRONTDESK)


@router.post('/{order_id}/status', response_model=UpdateOrderStatusResponse)
async def update_order_status_endpoint(
    order_id: UUID,
    payload: UpdateOrderStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UpdateOrderStatusResponse:
    order = await update_order_status(db, order_id, payload.status, current_user)
    await manager.broadcast(
        frontdesk_channel(),
        order_event_payload('order.status_changed', order.id, order.order_number, order.status.value),
    )
    return UpdateOrderStatusResponse(id=order.id, status=order.status.value)


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
    return OrderRead.model_validate(order_to_read_dict(order))


@router.post('/{order_id}/rating', response_model=OrderRatingRead, status_code=status.HTTP_201_CREATED)
async def submit_order_rating_endpoint(
    order_id: UUID,
    payload: SubmitOrderRatingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRatingRead:
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only clients can submit ratings')

    rating = await create_order_rating(
        db=db,
        order_id=order_id,
        stars=payload.stars,
        note=payload.note,
        actor=current_user,
    )
    return OrderRatingRead.model_validate(rating)


@driver_router.get('/orders/assigned', response_model=OrderListResponse)
async def driver_assigned_orders_endpoint(
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    x_app_capabilities: str | None = Header(default=None, alias='X-App-Capabilities'),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    orders = await list_driver_assigned_orders(
        db=db, driver_id=current_user.id, status_filter=status, limit=limit, offset=offset
    )
    await attach_driver_order_customers(db, orders, current_user.id)
    return _serialize_orders(orders, expose_ready_status=_supports_ready_status(x_app_capabilities))


@driver_router.get('/orders/latest', response_model=OrderListResponse)
async def driver_latest_orders_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    x_app_capabilities: str | None = Header(default=None, alias='X-App-Capabilities'),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListResponse:
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    orders = await list_driver_latest_orders(db=db, driver_id=current_user.id, limit=limit, offset=offset)
    await attach_driver_order_customers(db, orders, current_user.id)
    return _serialize_orders(orders, expose_ready_status=_supports_ready_status(x_app_capabilities))
