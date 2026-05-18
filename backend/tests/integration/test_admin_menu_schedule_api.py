from app.core.security import create_access_token
from app.models.menu import Item, ItemType, Section, Size
from app.models.user import User, UserRole
from app.services.menu_service import current_store_datetime


async def test_admin_schedule_can_hide_menu_entities(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790000333',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Breakfast', name_ar='????', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Croissant', name_ar='???????', is_active=True)
    item_type = ItemType(item=item, name_en='Regular', name_ar='????', is_active=True)
    size = Size(item_type=item_type, name_en='One Size', name_ar='??? ????', price=1.50, is_active=True)

    db_session.add_all([admin, section, item, item_type, size])
    await db_session.commit()

    token = create_access_token(str(admin.id), admin.role.value)
    headers = {'Authorization': f'Bearer {token}'}

    today = current_store_datetime().weekday()
    blocked_day = (today + 1) % 7

    primed_menu_response = await client.get('/menu')
    assert primed_menu_response.status_code == 200
    assert len(primed_menu_response.json()['sections']) == 1

    schedule_response = await client.post(
        '/admin/menu/schedule',
        headers=headers,
        json={
            'entity_type': 'section',
            'entity_id': str(section.id),
            'start_time': '07:00',
            'end_time': '11:00',
            'days_of_week': [blocked_day],
        },
    )
    assert schedule_response.status_code == 200

    menu_response = await client.get('/menu')
    assert menu_response.status_code == 200
    menu_data = menu_response.json()
    assert menu_data['sections'] == []
