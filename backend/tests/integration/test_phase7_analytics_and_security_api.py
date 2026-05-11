from decimal import Decimal
from uuid import uuid4

from app.core.security import create_access_token
from app.models.delivery import DeliveryDistanceBand
from app.models.menu import Item, ItemType, Section, Size
from app.models.order import OrderStatus
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole

NEAR_SHOP_LAT = 32.5589
NEAR_SHOP_LNG = 36.0265


async def _seed_order_context(db_session):
    admin = User(
        first_name='Maya',
        last_name='Admin',
        phone_number='+962790020001',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    client_one = User(
        first_name='Lina',
        last_name='Client',
        phone_number='+962790020002',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    client_two = User(
        first_name='Rana',
        last_name='Client',
        phone_number='+962790020003',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    driver = User(
        first_name='Omar',
        last_name='Driver',
        phone_number='+962790020004',
        role=UserRole.DRIVER,
        is_active=True,
        is_banned=False,
    )
    banned_client = User(
        first_name='Banned',
        last_name='User',
        phone_number='+962790020005',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=True,
    )
    section = Section(name_en='Coffee', name_ar='Coffee', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='Latte', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='Hot', is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='Large', price=Decimal('3.50'), is_active=True)
    settings = StoreSettings(
        store_name='Take A Sip',
        store_latitude=Decimal('32.5513470'),
        store_longitude=Decimal('36.0170050'),
    )
    band = DeliveryDistanceBand(
        min_distance_km=Decimal('0.000'),
        max_distance_km=Decimal('10.000'),
        fee_amount=Decimal('1.50'),
        is_active=True,
        sort_order=0,
    )
    db_session.add_all([admin, client_one, client_two, driver, banned_client, section, item, item_type, size, settings, band])
    await db_session.commit()
    return {
        'admin': admin,
        'client_one': client_one,
        'client_two': client_two,
        'driver': driver,
        'banned_client': banned_client,
        'size': size,
    }


def _auth_headers(user: User) -> dict[str, str]:
    return {'Authorization': f'Bearer {create_access_token(str(user.id), user.role.value)}'}


async def test_admin_dashboard_analytics_and_security_guards(client, db_session):
    seeded = await _seed_order_context(db_session)

    client_headers = _auth_headers(seeded['client_one'])
    admin_headers = _auth_headers(seeded['admin'])
    driver_headers = _auth_headers(seeded['driver'])

    create_order_response = await client.post(
        '/orders',
        headers=client_headers,
        json={
            'order_type': 'delivery',
            'delivery_address_text': 'Amman',
            'delivery_lat': NEAR_SHOP_LAT,
            'delivery_lng': NEAR_SHOP_LNG,
            'items': [{'size_id': str(seeded['size'].id), 'quantity': 1, 'addon_ids': []}],
        },
    )
    assert create_order_response.status_code == 201
    order_id = create_order_response.json()['id']

    accept_response = await client.post(f'/orders/{order_id}/accept', headers=admin_headers)
    assert accept_response.status_code == 200
    assign_response = await client.post(
        f'/orders/{order_id}/assign-driver',
        headers=admin_headers,
        json={'driver_user_id': str(seeded['driver'].id)},
    )
    assert assign_response.status_code == 200
    out_response = await client.post(
        f'/orders/{order_id}/status',
        headers=driver_headers,
        json={'status': 'OUT_FOR_DELIVERY'},
    )
    assert out_response.status_code == 200
    delivered_response = await client.post(
        f'/orders/{order_id}/status',
        headers=driver_headers,
        json={'status': OrderStatus.DELIVERED.value},
    )
    assert delivered_response.status_code == 200

    rating_response = await client.post(
        f'/orders/{order_id}/rating',
        headers=client_headers,
        json={'stars': 5, 'note': 'Excellent'},
    )
    assert rating_response.status_code == 201

    dashboard_response = await client.get('/admin/analytics/dashboard', headers=admin_headers)
    assert dashboard_response.status_code == 200
    body = dashboard_response.json()
    assert body['revenue']['today_revenue'] != '0.00'
    assert body['orders']['total_orders_today'] >= 1
    assert body['orders']['pickup_delivery_ratio'] == '0:1'
    assert body['ratings']['total_ratings'] == 1
    assert body['drivers']['deliveries_completed_today'] == 1
    assert body['drivers']['deliveries_per_driver'][0]['driver_id'] == str(seeded['driver'].id)

    forbidden_response = await client.get('/admin/analytics/dashboard', headers=client_headers)
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()['error'] == 'FORBIDDEN'


async def test_rating_and_banned_user_guards_and_validation_payload(client, db_session):
    seeded = await _seed_order_context(db_session)
    admin_headers = _auth_headers(seeded['admin'])
    client_one_headers = _auth_headers(seeded['client_one'])
    client_two_headers = _auth_headers(seeded['client_two'])
    banned_headers = _auth_headers(seeded['banned_client'])

    created = await client.post(
        '/orders',
        headers=client_one_headers,
        json={
            'order_type': 'pickup',
            'items': [{'size_id': str(seeded['size'].id), 'quantity': 1, 'addon_ids': []}],
        },
    )
    assert created.status_code == 201
    order_id = created.json()['id']

    await client.post(f'/orders/{order_id}/status', headers=admin_headers, json={'status': 'ACCEPTED'})
    rate_other_users_order = await client.post(
        f'/orders/{order_id}/rating',
        headers=client_two_headers,
        json={'stars': 3},
    )
    assert rate_other_users_order.status_code == 403
    assert rate_other_users_order.json()['error'] == 'FORBIDDEN'

    banned_order_attempt = await client.post(
        '/orders',
        headers=banned_headers,
        json={
            'order_type': 'pickup',
            'items': [{'size_id': str(seeded['size'].id), 'quantity': 1, 'addon_ids': []}],
        },
    )
    assert banned_order_attempt.status_code == 403
    assert banned_order_attempt.json()['detail'] == 'User is banned'

    validation_response = await client.post(
        '/orders',
        headers=client_one_headers,
        json={
            'order_type': 'pickup',
            'items': [{'size_id': str(uuid4()), 'quantity': 0, 'addon_ids': []}],
        },
    )
    assert validation_response.status_code == 422
    validation_body = validation_response.json()
    assert validation_body['error'] == 'VALIDATION_ERROR'
    assert isinstance(validation_body.get('details'), list)
