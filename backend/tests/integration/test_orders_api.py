from decimal import Decimal

from app.models.delivery import DeliveryDistanceBand
from app.core.security import create_access_token
from app.models.menu import Addon, Item, ItemType, Section, Size
from app.models.order import OrderStatus
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole


async def test_create_order_and_fetch_history(client, db_session):
    user = User(
        first_name='Sara',
        last_name='Client',
        phone_number='+962790000222',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )

    section = Section(name_en='Coffee', name_ar='????', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='?????', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='????', is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='????', price=Decimal('3.50'), is_active=True)
    addon = Addon(size=size, name_en='Extra Shot', name_ar='?????? ???', price=Decimal('1.00'), is_active=True)

    db_session.add_all([user, section, item, item_type, size, addon])
    await db_session.commit()

    token = create_access_token(str(user.id), user.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    create_response = await client.post(
        '/orders',
        headers=headers,
        json={
            'order_type': 'pickup',
            'notes': 'No sugar',
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 2,
                    'addon_ids': [str(addon.id)],
                }
            ],
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created['status'] == 'NEW'
    assert created['items'][0]['item_id_snapshot'] == str(item.id)
    assert created['items'][0]['size_id_snapshot'] == str(size.id)
    assert created['items'][0]['item_name_snapshot'] == 'Latte'
    assert created['items'][0]['addons'][0]['addon_id_snapshot'] == str(addon.id)
    assert created['customer_name'] == 'Sara Client'
    assert created['customer_phone'] == '+962790000222'

    history_response = await client.get(f'/orders/user/{user.id}', headers=headers)
    assert history_response.status_code == 200
    history_data = history_response.json()
    assert len(history_data['orders']) == 1
    assert history_data['orders'][0]['id'] == created['id']
    assert history_data['orders'][0]['customer_name'] == 'Sara Client'


async def test_reorder_creates_new_order_from_snapshots(client, db_session):
    user = User(
        first_name='Noor',
        last_name='Client',
        phone_number='+962790000333',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )

    section = Section(name_en='Coffee', name_ar='????', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='?????', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='????', is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='????', price=Decimal('3.50'), is_active=True)
    addon = Addon(size=size, name_en='Extra Shot', name_ar='?????? ???', price=Decimal('1.00'), is_active=True)

    db_session.add_all([user, section, item, item_type, size, addon])
    await db_session.commit()

    token = create_access_token(str(user.id), user.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    create_response = await client.post(
        '/orders',
        headers=headers,
        json={
            'order_type': 'pickup',
            'notes': 'Original order',
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [str(addon.id)],
                }
            ],
        },
    )
    assert create_response.status_code == 201
    original = create_response.json()

    reorder_response = await client.post(f"/orders/{original['id']}/reorder", headers=headers)
    assert reorder_response.status_code == 201
    reordered = reorder_response.json()

    assert reordered['id'] != original['id']
    assert reordered['status'] == 'NEW'
    assert reordered['items'][0]['item_id_snapshot'] == original['items'][0]['item_id_snapshot']
    assert reordered['items'][0]['size_id_snapshot'] == original['items'][0]['size_id_snapshot']
    assert reordered['items'][0]['item_name_snapshot'] == original['items'][0]['item_name_snapshot']
    assert reordered['items'][0]['size_snapshot'] == original['items'][0]['size_snapshot']
    assert reordered['items'][0]['addons'][0]['addon_id_snapshot'] == original['items'][0]['addons'][0]['addon_id_snapshot']
    assert reordered['items'][0]['addons'][0]['addon_name_snapshot'] == original['items'][0]['addons'][0]['addon_name_snapshot']


async def test_create_delivery_order_requires_delivery_address(client, db_session):
    user = User(
        first_name='Rana',
        last_name='Client',
        phone_number='+962790000444',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )

    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('3.50'), is_active=True)

    store_settings = StoreSettings(
        store_name='Take A Sip',
        store_latitude=Decimal('31.9539000'),
        store_longitude=Decimal('35.9106000'),
    )
    distance_band = DeliveryDistanceBand(
        min_distance_km=Decimal('0.000'),
        max_distance_km=Decimal('10.000'),
        fee_amount=Decimal('1.50'),
        is_active=True,
        sort_order=0,
    )

    db_session.add_all([user, section, item, item_type, size, store_settings, distance_band])
    await db_session.commit()

    token = create_access_token(str(user.id), user.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    missing_address_response = await client.post(
        '/orders',
        headers=headers,
        json={
            'order_type': 'delivery',
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert missing_address_response.status_code == 400
    assert missing_address_response.json()['detail'] == 'delivery_address is required for delivery orders'

    with_address_response = await client.post(
        '/orders',
        headers=headers,
        json={
            'order_type': 'delivery',
            'delivery_address': 'Amman - 7th Circle',
            'delivery_lat': 31.9639,
            'delivery_lng': 35.9206,
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert with_address_response.status_code == 201
    body = with_address_response.json()
    assert body['order_type'] == 'delivery'
    assert body['delivery_address'] == 'Amman - 7th Circle'


async def test_client_can_rate_accepted_pickup_order_once(client, db_session):
    user = User(
        first_name='Huda',
        last_name='Client',
        phone_number='+962790000555',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )

    section = Section(name_en='Coffee', name_ar='????', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='?????', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='????', is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='????', price=Decimal('3.50'), is_active=True)

    db_session.add_all([user, section, item, item_type, size])
    await db_session.commit()

    token = create_access_token(str(user.id), user.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    create_response = await client.post(
        '/orders',
        headers=headers,
        json={
            'order_type': 'pickup',
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()

    set_status_response = await client.post(
        f"/orders/{created['id']}/status",
        headers=headers,
        json={'status': 'COMPLETED'},
    )
    assert set_status_response.status_code == 403

    admin = User(
        first_name='Omar',
        last_name='Admin',
        phone_number='+962790000556',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    admin_accept_response = await client.post(
        f"/orders/{created['id']}/status",
        headers=admin_headers,
        json={'status': 'ACCEPTED'},
    )
    assert admin_accept_response.status_code == 200

    rating_response = await client.post(
        f"/orders/{created['id']}/rating",
        headers=headers,
        json={'stars': 5, 'note': 'Great service'},
    )
    assert rating_response.status_code == 201
    rating_data = rating_response.json()
    assert rating_data['stars'] == 5
    assert rating_data['note'] == 'Great service'
    assert rating_data['order_id'] == created['id']
    assert rating_data['user_id'] == str(user.id)

    duplicate_response = await client.post(
        f"/orders/{created['id']}/rating",
        headers=headers,
        json={'stars': 4},
    )
    assert duplicate_response.status_code == 409

    new_order_response = await client.post(
        '/orders',
        headers=headers,
        json={
            'order_type': 'pickup',
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert new_order_response.status_code == 201
    unrated_new_order_id = new_order_response.json()['id']
    early_rating_response = await client.post(
        f"/orders/{unrated_new_order_id}/rating",
        headers=headers,
        json={'stars': 3},
    )
    assert early_rating_response.status_code == 400


async def test_admin_ratings_summary_and_reviews(client, db_session):
    admin = User(
        first_name='Lina',
        last_name='Admin',
        phone_number='+962790000557',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    user = User(
        first_name='Maya',
        last_name='Client',
        phone_number='+962790000558',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='????', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='?????', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='????', is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='????', price=Decimal('3.50'), is_active=True)

    db_session.add_all([admin, user, section, item, item_type, size])
    await db_session.commit()

    user_headers = {'Authorization': f"Bearer {create_access_token(str(user.id), user.role.value)}"}
    admin_headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    create_response = await client.post(
        '/orders',
        headers=user_headers,
        json={
            'order_type': 'pickup',
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [],
                }
            ],
        },
    )
    assert create_response.status_code == 201
    order_id = create_response.json()['id']

    accept_response = await client.post(
        f'/orders/{order_id}/status',
        headers=admin_headers,
        json={'status': 'ACCEPTED'},
    )
    assert accept_response.status_code == 200

    complete_response = await client.post(
        f'/orders/{order_id}/status',
        headers=admin_headers,
        json={'status': OrderStatus.COMPLETED.value},
    )
    assert complete_response.status_code == 200

    submit_rating_response = await client.post(
        f'/orders/{order_id}/rating',
        headers=user_headers,
        json={'stars': 4, 'note': 'Nice coffee'},
    )
    assert submit_rating_response.status_code == 201

    summary_response = await client.get('/admin/ratings/summary', headers=admin_headers)
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary['total_ratings'] == 1
    assert summary['average_rating'] == 4.0
    assert summary['stars_breakdown']['4'] == 1

    reviews_response = await client.get('/admin/ratings', headers=admin_headers)
    assert reviews_response.status_code == 200
    reviews = reviews_response.json()['ratings']
    assert len(reviews) == 1
    assert reviews[0]['order_id'] == order_id
    assert reviews[0]['stars'] == 4
    assert reviews[0]['note'] == 'Nice coffee'
    assert reviews[0]['customer_name'] == 'Maya Client'
