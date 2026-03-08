from decimal import Decimal

from app.core.security import create_access_token
from app.models.menu import Addon, Item, ItemType, Section, Size
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
    assert created['items'][0]['item_name_snapshot'] == 'Latte'

    history_response = await client.get(f'/orders/user/{user.id}', headers=headers)
    assert history_response.status_code == 200
    history_data = history_response.json()
    assert len(history_data['orders']) == 1
    assert history_data['orders'][0]['id'] == created['id']


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
    assert reordered['items'][0]['item_name_snapshot'] == original['items'][0]['item_name_snapshot']
    assert reordered['items'][0]['size_snapshot'] == original['items'][0]['size_snapshot']
    assert reordered['items'][0]['addons'][0]['addon_name_snapshot'] == original['items'][0]['addons'][0]['addon_name_snapshot']
