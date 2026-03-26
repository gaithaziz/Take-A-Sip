from decimal import Decimal

from app.core.security import create_access_token
from app.models.delivery import DeliveryDistanceBand
from app.models.menu import Item, ItemType, Section, Size
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole


async def _seed_delivery_context(db_session):
    client_user = User(
        first_name='Lina',
        last_name='Client',
        phone_number='+962790010001',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    frontdesk_user = User(
        first_name='Fadi',
        last_name='Desk',
        phone_number='+962790010002',
        role=UserRole.FRONTDESK,
        is_active=True,
        is_banned=False,
    )
    driver_user = User(
        first_name='Omar',
        last_name='Driver',
        phone_number='+962790010003',
        role=UserRole.DRIVER,
        is_active=True,
        is_banned=False,
    )
    admin_user = User(
        first_name='Maha',
        last_name='Admin',
        phone_number='+962790010004',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Americano', name_ar='أمريكانو', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', is_active=True)
    size = Size(item_type=item_type, name_en='Medium', name_ar='متوسط', price=Decimal('2.50'), is_active=True)
    settings = StoreSettings(
        store_name='Take A Sip',
        store_latitude=Decimal('31.9539000'),
        store_longitude=Decimal('35.9106000'),
    )
    band = DeliveryDistanceBand(
        min_distance_km=Decimal('0.000'),
        max_distance_km=Decimal('5.000'),
        fee_amount=Decimal('1.75'),
        is_active=True,
        sort_order=0,
    )
    db_session.add_all([client_user, frontdesk_user, driver_user, admin_user, section, item, item_type, size, settings, band])
    await db_session.commit()
    return {
        'client': client_user,
        'frontdesk': frontdesk_user,
        'driver': driver_user,
        'admin': admin_user,
        'size': size,
        'band': band,
    }


async def test_delivery_order_full_lifecycle(client, db_session):
    seeded = await _seed_delivery_context(db_session)

    client_headers = {'Authorization': f"Bearer {create_access_token(str(seeded['client'].id), UserRole.CLIENT.value)}"}
    frontdesk_headers = {
        'Authorization': f"Bearer {create_access_token(str(seeded['frontdesk'].id), UserRole.FRONTDESK.value)}"
    }
    driver_headers = {'Authorization': f"Bearer {create_access_token(str(seeded['driver'].id), UserRole.DRIVER.value)}"}

    create_response = await client.post(
        '/orders',
        headers=client_headers,
        json={
            'order_type': 'delivery',
            'delivery_address_text': 'Amman - 7th Circle',
            'delivery_lat': 31.9639,
            'delivery_lng': 35.9206,
            'items': [
                {
                    'size_id': str(seeded['size'].id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created['status'] == 'NEW'
    assert created['delivery_fee'] == '1.75'
    assert created['delivery_distance_band_id'] == str(seeded['band'].id)

    order_id = created['id']

    accept_response = await client.post(f'/orders/{order_id}/accept', headers=frontdesk_headers)
    assert accept_response.status_code == 200
    assert accept_response.json()['status'] == 'ACCEPTED'

    assign_response = await client.post(
        f'/orders/{order_id}/assign-driver',
        headers=frontdesk_headers,
        json={'driver_user_id': str(seeded['driver'].id)},
    )
    assert assign_response.status_code == 200
    assigned = assign_response.json()
    assert assigned['status'] == 'ASSIGNED'
    assert assigned['assigned_driver_id'] == str(seeded['driver'].id)
    assert assigned['assigned_driver_name'] == 'Omar Driver'

    driver_assigned_response = await client.get('/driver/orders/assigned', headers=driver_headers)
    assert driver_assigned_response.status_code == 200
    assert any(order['id'] == order_id for order in driver_assigned_response.json()['orders'])

    out_response = await client.post(
        f'/orders/{order_id}/status',
        headers=driver_headers,
        json={'status': 'OUT_FOR_DELIVERY'},
    )
    assert out_response.status_code == 200
    assert out_response.json()['status'] == 'OUT_FOR_DELIVERY'

    delivered_response = await client.post(
        f'/orders/{order_id}/status',
        headers=driver_headers,
        json={'status': 'DELIVERED'},
    )
    assert delivered_response.status_code == 200
    assert delivered_response.json()['status'] == 'DELIVERED'

    complete_response = await client.post(
        f'/orders/{order_id}/status',
        headers=frontdesk_headers,
        json={'status': 'COMPLETED'},
    )
    assert complete_response.status_code == 400


async def test_delivery_order_rejected_when_no_distance_band_match(client, db_session):
    seeded = await _seed_delivery_context(db_session)
    seeded['band'].is_active = False
    db_session.add(seeded['band'])
    await db_session.commit()

    client_headers = {'Authorization': f"Bearer {create_access_token(str(seeded['client'].id), UserRole.CLIENT.value)}"}
    response = await client.post(
        '/orders',
        headers=client_headers,
        json={
            'order_type': 'delivery',
            'delivery_address_text': 'Far location',
            'delivery_lat': 31.9639,
            'delivery_lng': 35.9206,
            'items': [
                {
                    'size_id': str(seeded['size'].id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()['detail'] == 'No active delivery distance band covers destination distance'


async def test_delivery_quote_returns_distance_and_fee(client, db_session):
    seeded = await _seed_delivery_context(db_session)
    client_headers = {'Authorization': f"Bearer {create_access_token(str(seeded['client'].id), UserRole.CLIENT.value)}"}

    response = await client.post(
        '/orders/delivery-quote',
        headers=client_headers,
        json={
            'delivery_lat': 31.9639,
            'delivery_lng': 35.9206,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['delivery_fee'] == '1.75'
    assert payload['delivery_distance_band_id'] == str(seeded['band'].id)
    assert Decimal(payload['delivery_distance_km']) > 0
