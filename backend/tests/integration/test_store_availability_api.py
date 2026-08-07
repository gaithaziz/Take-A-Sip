from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.core.security import create_access_token
from app.models.menu import Item, ItemType, MenuSchedule, Section, Size
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole
from app.services.menu_service import current_store_datetime


def _headers(user: User) -> dict[str, str]:
    return {'Authorization': f'Bearer {create_access_token(str(user.id), user.role.value)}'}


async def _seed_menu_and_users(db_session):
    admin = User(
        first_name='Admin', last_name='Owner', phone_number='+962790009001', role=UserRole.ADMIN,
        is_active=True, is_banned=False,
    )
    customer = User(
        first_name='Test', last_name='Customer', phone_number='+962790009002', role=UserRole.CLIENT,
        is_active=True, is_banned=False,
    )
    section_a = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    section_b = Section(name_en='Dessert', name_ar='حلويات', sort_order=2, is_active=True)
    item = Item(section=section_a, name_en='Latte', name_ar='لاتيه', is_active=True)
    item_type = ItemType(item=item, name_en='Regular', name_ar='عادي', is_active=True)
    size = Size(item_type=item_type, name_en='One size', name_ar='حجم واحد', price=Decimal('3.00'), is_active=True)
    settings = StoreSettings(
        store_name='Take A Sip',
        store_latitude=Decimal('32.5513470'),
        store_longitude=Decimal('36.0170050'),
    )
    db_session.add_all([admin, customer, section_a, section_b, item, item_type, size, settings])
    await db_session.commit()
    return admin, customer, section_a, section_b, item, size


async def test_admin_can_pause_ordering_while_menu_stays_visible(client, db_session):
    admin, customer, section_a, _, _, size = await _seed_menu_and_users(db_session)

    response = await client.patch(
        '/admin/store/status', headers=_headers(admin), json={'ordering_enabled': False},
    )
    assert response.status_code == 200
    assert response.json()['ordering_enabled'] is False

    status_response = await client.get('/store/status')
    assert status_response.status_code == 200
    assert status_response.json()['ordering_enabled'] is False

    menu_response = await client.get('/menu')
    assert menu_response.status_code == 200
    assert [entry['id'] for entry in menu_response.json()['sections']] == [str(section_a.id)]

    order_response = await client.post(
        '/orders',
        headers=_headers(customer),
        json={'order_type': 'pickup', 'items': [{'size_id': str(size.id), 'quantity': 1, 'addon_ids': []}]},
    )
    assert order_response.status_code == 409
    assert order_response.json()['detail'] == 'Ordering is currently unavailable'


async def test_bulk_availability_is_atomic_and_idempotent(client, db_session):
    admin, _, section_a, _, item, _ = await _seed_menu_and_users(db_session)
    payload = {
        'entities': [
            {'entity_type': 'section', 'entity_id': str(section_a.id)},
            {'entity_type': 'item', 'entity_id': str(item.id)},
        ],
        'is_active': False,
    }

    response = await client.patch('/admin/menu/bulk-availability', headers=_headers(admin), json=payload)
    assert response.status_code == 200
    assert len(response.json()['updated']) == 2
    await db_session.refresh(section_a)
    await db_session.refresh(item)
    assert section_a.is_active is False
    assert item.is_active is False

    repeat_response = await client.patch('/admin/menu/bulk-availability', headers=_headers(admin), json=payload)
    assert repeat_response.status_code == 200
    assert all(entry['is_active'] is False for entry in repeat_response.json()['updated'])

    invalid_response = await client.patch(
        '/admin/menu/bulk-availability',
        headers=_headers(admin),
        json={
            'entities': [
                {'entity_type': 'section', 'entity_id': str(section_a.id)},
                {'entity_type': 'item', 'entity_id': str(uuid4())},
            ],
            'is_active': True,
        },
    )
    assert invalid_response.status_code == 404
    await db_session.refresh(section_a)
    assert section_a.is_active is False


async def test_bulk_section_schedule_creates_all_or_none(client, db_session):
    admin, _, section_a, section_b, _, _ = await _seed_menu_and_users(db_session)
    payload = {
        'entity_type': 'section',
        'entity_ids': [str(section_a.id), str(section_b.id)],
        'start_time': '07:00',
        'end_time': '11:00',
        'days_of_week': [0, 1, 2, 3, 4, 5, 6],
    }

    response = await client.post('/admin/menu/schedule/bulk', headers=_headers(admin), json=payload)
    assert response.status_code == 200
    assert len(response.json()['schedule_ids']) == 2
    schedules = list((await db_session.execute(select(MenuSchedule))).scalars().all())
    assert {schedule.entity_id for schedule in schedules} == {section_a.id, section_b.id}

    invalid_response = await client.post(
        '/admin/menu/schedule/bulk',
        headers=_headers(admin),
        json={**payload, 'entity_ids': [str(section_a.id), str(uuid4())]},
    )
    assert invalid_response.status_code == 404
    schedules_after = list((await db_session.execute(select(MenuSchedule))).scalars().all())
    assert len(schedules_after) == 2


async def test_whole_menu_schedule_applies_to_categories_added_later(client, db_session):
    admin, _, _, _, _, _ = await _seed_menu_and_users(db_session)
    blocked_day = (current_store_datetime().weekday() + 1) % 7

    response = await client.post(
        '/admin/menu/schedule',
        headers=_headers(admin),
        json={
            'entity_type': 'menu',
            'entity_id': str(uuid4()),
            'start_time': '07:00',
            'end_time': '11:00',
            'days_of_week': [blocked_day],
        },
    )
    assert response.status_code == 200

    future_section = Section(name_en='Future category', name_ar='تصنيف جديد', sort_order=99, is_active=True)
    db_session.add(future_section)
    await db_session.commit()

    menu_response = await client.get('/menu')
    assert menu_response.status_code == 200
    assert menu_response.json()['sections'] == []

    schedules = list((await db_session.execute(select(MenuSchedule))).scalars().all())
    assert schedules[0].entity_type == 'menu'
    assert str(schedules[0].entity_id) == '00000000-0000-0000-0000-000000000000'
