from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.security import create_access_token
from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size
from app.models.order import Order, OrderStatus, OrderType
from app.models.promotion import LoyaltyRule, Promotion, PromotionType
from app.models.user import User, UserRole


async def test_admin_menu_edit_and_schedule_management(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001001',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('3.50'), sort_order=1, is_active=True)
    addon = Addon(size=size, name_en='Shot', name_ar='شوت', price=Decimal('1.00'), sort_order=1, is_active=True)
    db_session.add_all([admin, section, item, item_type, size, addon])
    await db_session.commit()

    token = create_access_token(str(admin.id), admin.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    patch_item = await client.patch(
        f'/admin/menu/item/{item.id}',
        headers=headers,
        json={'name_en': 'Cortado', 'sort_order': 2},
    )
    assert patch_item.status_code == 200
    assert patch_item.json()['name_en'] == 'Cortado'
    assert patch_item.json()['sort_order'] == 2

    create_schedule = await client.post(
        '/admin/menu/schedule',
        headers=headers,
        json={
            'entity_type': 'item',
            'entity_id': str(item.id),
            'start_time': '07:00',
            'end_time': '11:00',
            'days_of_week': [0, 1, 2],
        },
    )
    assert create_schedule.status_code == 200
    schedule_id = create_schedule.json()['schedule_id']

    list_schedule = await client.get('/admin/menu/schedule', headers=headers)
    assert list_schedule.status_code == 200
    assert len(list_schedule.json()['schedules']) == 1

    update_schedule = await client.patch(
        f'/admin/menu/schedule/{schedule_id}',
        headers=headers,
        json={'is_active': False, 'end_time': '12:00'},
    )
    assert update_schedule.status_code == 200
    assert update_schedule.json()['is_active'] is False
    assert update_schedule.json()['end_time'] == '12:00'

    delete_schedule = await client.delete(f'/admin/menu/schedule/{schedule_id}', headers=headers)
    assert delete_schedule.status_code == 204


async def test_admin_promotions_and_loyalty_crud(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001002',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    promotion = Promotion(
        title_en='Morning Deal',
        title_ar='عرض الصباح',
        type=PromotionType.TEMPORARY,
        value=Decimal('2.50'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
    )
    rule = LoyaltyRule(required_orders=5, reward_type='FREE_ITEM', reward_value='Dessert', is_active=True)
    db_session.add_all([admin, promotion, rule])
    await db_session.commit()

    token = create_access_token(str(admin.id), admin.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    list_promotions = await client.get('/admin/promotions', headers=headers)
    assert list_promotions.status_code == 200
    assert len(list_promotions.json()['promotions']) == 1

    create_promotion = await client.post(
        '/admin/promotions',
        headers=headers,
        json={
            'title_en': 'Weekend',
            'title_ar': 'نهاية الأسبوع',
            'type': 'FIRST_TIME',
            'value': '3.00',
            'starts_at': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            'ends_at': (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            'is_active': True,
        },
    )
    assert create_promotion.status_code == 200
    promotion_id = create_promotion.json()['id']

    toggle_promotion = await client.patch(f'/admin/promotions/{promotion_id}/toggle', headers=headers)
    assert toggle_promotion.status_code == 200
    assert toggle_promotion.json()['is_active'] is False

    list_rules = await client.get('/admin/loyalty-rules', headers=headers)
    assert list_rules.status_code == 200
    assert len(list_rules.json()['rules']) == 1

    update_rule = await client.patch(
        f"/admin/loyalty-rules/{rule.id}",
        headers=headers,
        json={'required_orders': 7, 'is_active': False},
    )
    assert update_rule.status_code == 200
    assert update_rule.json()['required_orders'] == 7
    assert update_rule.json()['is_active'] is False


async def test_admin_users_list_includes_order_count(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001003',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    customer = User(
        first_name='Lina',
        last_name='Client',
        phone_number='+962790001004',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    db_session.add_all([admin, customer])
    await db_session.commit()

    order = Order(
        order_number=1,
        user_id=customer.id,
        status=OrderStatus.NEW,
        order_type=OrderType.PICKUP,
        notes=None,
        delivery_address=None,
    )
    db_session.add(order)
    await db_session.commit()

    token = create_access_token(str(admin.id), admin.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    users_response = await client.get('/admin/users', headers=headers)
    assert users_response.status_code == 200
    users = users_response.json()['users']
    lina_row = next(row for row in users if row['id'] == str(customer.id))
    assert lina_row['order_count'] == 1
