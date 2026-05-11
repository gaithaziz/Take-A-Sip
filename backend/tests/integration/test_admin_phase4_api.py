from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.security import create_access_token
from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size
from app.models.order import Order, OrderItem, OrderItemAddon, OrderStatus, OrderType
from app.models.promotion import LoyaltyRule, Promotion, PromotionTarget, PromotionType
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


async def test_admin_can_create_targeted_loyalty_promotion_with_summaries(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001222',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('4.50'), sort_order=1, is_active=True)
    rule = LoyaltyRule(required_orders=5, reward_type='DISCOUNT', reward_value='Free drink', is_active=True)
    db_session.add_all([admin, section, item, item_type, size, rule])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    create_promotion = await client.post(
        '/admin/promotions',
        headers=headers,
        json={
            'title_en': 'Latte Loyalty',
            'title_ar': 'ولاء اللاتيه',
            'type': 'LOYALTY',
            'value': '2.00',
            'starts_at': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            'ends_at': (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            'is_active': True,
            'loyalty_rule_id': str(rule.id),
            'targets': [
                {'entity_type': 'item', 'entity_id': str(item.id)},
                {'entity_type': 'size', 'entity_id': str(size.id)},
            ],
        },
    )
    assert create_promotion.status_code == 200
    created = create_promotion.json()
    assert created['loyalty_rule_id'] == str(rule.id)
    assert len(created['targets']) == 2
    assert created['scope_summary_en'] == 'Applies to 2 selected menu entries'
    assert created['eligibility_summary_en'] == 'Available after 5 completed orders'

    list_promotions = await client.get('/admin/promotions', headers=headers)
    assert list_promotions.status_code == 200
    promotions = list_promotions.json()['promotions']
    saved = next(row for row in promotions if row['id'] == created['id'])
    assert {target['entity_type'] for target in saved['targets']} == {'item', 'size'}
    assert saved['targets'][0]['entity_name_en'] in {'Latte', 'Large'}


async def test_client_promotion_evaluation_applies_best_targeted_offer(client, db_session):
    client_user = User(
        first_name='Lina',
        last_name='Client',
        phone_number='+962790001223',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('4.00'), sort_order=1, is_active=True)
    addon = Addon(size=size, name_en='Shot', name_ar='شوت', price=Decimal('1.00'), sort_order=1, is_active=True)
    loyalty_rule = LoyaltyRule(required_orders=5, reward_type='DISCOUNT', reward_value='Reward', is_active=True)
    loyalty_promotion = Promotion(
        title_en='Latte Loyalty',
        title_ar='ولاء اللاتيه',
        type=PromotionType.LOYALTY,
        value=Decimal('60.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        loyalty_rule=loyalty_rule,
    )
    db_session.add_all([client_user, section, item, item_type, size, addon, loyalty_rule, loyalty_promotion])

    first_time_promotion = Promotion(
        title_en='New User Deal',
        title_ar='عرض المستخدم الجديد',
        type=PromotionType.FIRST_TIME,
        value=Decimal('5.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
    )
    mismatch_promotion = Promotion(
        title_en='Tea Special',
        title_ar='عرض الشاي',
        type=PromotionType.TEMPORARY,
        value=Decimal('6.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
    )
    db_session.add_all([first_time_promotion, mismatch_promotion])
    await db_session.flush()
    mismatch_target = PromotionTarget(promotion_id=mismatch_promotion.id, entity_type='section', entity_id=section.id)
    db_session.add_all(
        [
            PromotionTarget(promotion_id=loyalty_promotion.id, entity_type='item', entity_id=item.id),
            mismatch_target,
        ]
    )

    for order_number in range(1, 6):
        db_session.add(
            Order(
                order_number=order_number,
                user_id=client_user.id,
                status=OrderStatus.COMPLETED,
                order_type=OrderType.PICKUP,
                notes=None,
                delivery_address=None,
            )
        )

    await db_session.commit()

    other_section = Section(name_en='Tea', name_ar='شاي', sort_order=2, is_active=True)
    db_session.add(other_section)
    await db_session.flush()
    mismatch_target.entity_id = other_section.id
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(client_user.id), client_user.role.value)}"}

    evaluate = await client.post(
        '/promotions/evaluate',
        headers=headers,
        json={
            'items': [
                {
                    'size_id': str(size.id),
                    'quantity': 1,
                    'addon_ids': [str(addon.id)],
                }
            ]
        },
    )
    assert evaluate.status_code == 200
    payload = evaluate.json()
    assert payload['applied_promotion']['id'] == str(loyalty_promotion.id)
    assert payload['discount'] == '3.00'
    assert payload['applied_promotion']['scope_summary_en'] == 'Applies to Latte'

    ineligible = {entry['promotion']['id']: entry for entry in payload['ineligible_promotions']}
    assert ineligible[str(first_time_promotion.id)]['reason_code'] == 'FIRST_TIME_ONLY'
    assert ineligible[str(mismatch_promotion.id)]['reason_code'] == 'TARGET_MISMATCH'


async def test_client_buy_get_offer_uses_qualifying_quantity(client, db_session):
    client_user = User(
        first_name='Maya',
        last_name='Client',
        phone_number='+962790001224',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='Coffee', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='Latte', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='Hot', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='Large', price=Decimal('4.00'), sort_order=1, is_active=True)
    buy_get_promotion = Promotion(
        title_en='Buy 2 Get 1',
        title_ar='Buy 2 Get 1',
        type=PromotionType.BUY_N_GET_M_FREE,
        value=Decimal('0.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        buy_quantity=2,
        free_quantity=1,
    )
    db_session.add_all([client_user, section, item, item_type, size, buy_get_promotion])
    await db_session.flush()
    db_session.add(PromotionTarget(promotion_id=buy_get_promotion.id, entity_type='item', entity_id=item.id))
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(client_user.id), client_user.role.value)}"}

    evaluate = await client.post(
        '/promotions/evaluate',
        headers=headers,
        json={'items': [{'size_id': str(size.id), 'quantity': 3, 'addon_ids': []}]},
    )
    assert evaluate.status_code == 200
    payload = evaluate.json()
    assert payload['applied_promotion']['id'] == str(buy_get_promotion.id)
    assert payload['discount'] == '4.00'


async def test_client_free_delivery_offer_does_not_require_completed_orders(client, db_session):
    client_user = User(
        first_name='Nora',
        last_name='Client',
        phone_number='+962790001225',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('10.00'), sort_order=1, is_active=True)
    free_delivery_promotion = Promotion(
        title_en='Free delivery',
        title_ar='توصيل مجاني',
        type=PromotionType.FREE_DELIVERY_ABOVE_AMOUNT,
        value=Decimal('15.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        free_delivery_mode='FREE_DELIVERY',
        required_completed_orders=5,
    )
    db_session.add_all([client_user, section, item, item_type, size, free_delivery_promotion])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(client_user.id), client_user.role.value)}"}

    evaluate = await client.post(
        '/promotions/evaluate',
        headers=headers,
        json={'items': [{'size_id': str(size.id), 'quantity': 2, 'addon_ids': []}]},
    )
    assert evaluate.status_code == 200
    payload = evaluate.json()
    assert payload['free_delivery'] is True
    assert payload['free_delivery_promotion']['id'] == str(free_delivery_promotion.id)
    assert payload['discount'] == '0.00'


async def test_client_percentage_discount_free_delivery_offer_applies_discount(client, db_session):
    client_user = User(
        first_name='Omar',
        last_name='Client',
        phone_number='+962790001226',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('10.00'), sort_order=1, is_active=True)
    percentage_promotion = Promotion(
        title_en='20% over 20',
        title_ar='20% فوق 20',
        type=PromotionType.FREE_DELIVERY_ABOVE_AMOUNT,
        value=Decimal('20.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        free_delivery_mode='PERCENTAGE_DISCOUNT',
        free_delivery_discount_percent=Decimal('20.00'),
    )
    db_session.add_all([client_user, section, item, item_type, size, percentage_promotion])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(client_user.id), client_user.role.value)}"}

    evaluate = await client.post(
        '/promotions/evaluate',
        headers=headers,
        json={'items': [{'size_id': str(size.id), 'quantity': 3, 'addon_ids': []}]},
    )
    assert evaluate.status_code == 200
    payload = evaluate.json()
    assert payload['free_delivery'] is False
    assert payload['applied_promotion']['id'] == str(percentage_promotion.id)
    assert payload['discount'] == '6.00'


async def test_admin_can_create_buy_x_get_y_promotion(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001225',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    latte = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    muffin = Item(section=section, name_en='Muffin', name_ar='مافن', sort_order=2, is_active=True)
    latte_type = ItemType(item=latte, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    muffin_type = ItemType(item=muffin, name_en='Fresh', name_ar='طازج', sort_order=1, is_active=True)
    latte_size = Size(item_type=latte_type, name_en='Large', name_ar='كبير', price=Decimal('4.00'), sort_order=1, is_active=True)
    muffin_size = Size(item_type=muffin_type, name_en='One size', name_ar='حجم واحد', price=Decimal('2.50'), sort_order=1, is_active=True)
    db_session.add_all([admin, section, latte, muffin, latte_type, muffin_type, latte_size, muffin_size])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}
    response = await client.post(
        '/admin/promotions',
        headers=headers,
        json={
            'title_en': 'Latte plus muffin',
            'title_ar': 'لاتيه مع مافن',
            'type': 'BUY_N_GET_M_FREE',
            'value': '0.00',
            'starts_at': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            'ends_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            'is_active': True,
            'buy_quantity': 2,
            'free_quantity': 1,
            'buy_targets': [{'entity_type': 'item', 'entity_id': str(latte.id)}],
            'free_targets': [{'entity_type': 'item', 'entity_id': str(muffin.id)}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['targets'] == []
    assert payload['buy_targets'][0]['entity_id'] == str(latte.id)
    assert payload['buy_targets'][0]['target_group'] == 'buy'
    assert payload['free_targets'][0]['entity_id'] == str(muffin.id)
    assert payload['free_targets'][0]['target_group'] == 'free'
    assert payload['scope_summary_en'] == 'Buy from Latte; free item from Muffin'


async def test_client_buy_get_offer_can_use_different_buy_and_free_targets(client, db_session):
    client_user = User(
        first_name='Noor',
        last_name='Client',
        phone_number='+962790001226',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    latte = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    muffin = Item(section=section, name_en='Muffin', name_ar='مافن', sort_order=2, is_active=True)
    latte_type = ItemType(item=latte, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    muffin_type = ItemType(item=muffin, name_en='Fresh', name_ar='طازج', sort_order=1, is_active=True)
    latte_size = Size(item_type=latte_type, name_en='Large', name_ar='كبير', price=Decimal('4.00'), sort_order=1, is_active=True)
    muffin_size = Size(item_type=muffin_type, name_en='One size', name_ar='حجم واحد', price=Decimal('2.50'), sort_order=1, is_active=True)
    promo = Promotion(
        title_en='Buy latte get muffin',
        title_ar='اشتر لاتيه وخذ مافن',
        type=PromotionType.BUY_N_GET_M_FREE,
        value=Decimal('0.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        buy_quantity=2,
        free_quantity=1,
    )
    db_session.add_all([client_user, section, latte, muffin, latte_type, muffin_type, latte_size, muffin_size, promo])
    await db_session.flush()
    db_session.add_all(
        [
            PromotionTarget(promotion_id=promo.id, target_group='buy', entity_type='item', entity_id=latte.id),
            PromotionTarget(promotion_id=promo.id, target_group='free', entity_type='item', entity_id=muffin.id),
        ]
    )
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(client_user.id), client_user.role.value)}"}
    response = await client.post(
        '/promotions/evaluate',
        headers=headers,
        json={
            'items': [
                {'size_id': str(latte_size.id), 'quantity': 2, 'addon_ids': []},
                {'size_id': str(muffin_size.id), 'quantity': 1, 'addon_ids': []},
            ]
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['applied_promotion']['id'] == str(promo.id)
    assert payload['discount'] == '2.50'

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


async def test_admin_can_provision_staff_accounts(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001111',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    db_session.add(admin)
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    create_response = await client.post(
        '/admin/users/provision-staff',
        headers=headers,
        json={
            'first_name': 'Driver',
            'last_name': 'One',
            'phone_number': '+962790001112',
            'role': 'DRIVER',
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created['created'] is True
    assert created['role'] == 'DRIVER'

    update_response = await client.post(
        '/admin/users/provision-staff',
        headers=headers,
        json={
            'first_name': 'Desk',
            'last_name': 'Agent',
            'phone_number': '+962790001112',
            'role': 'FRONTDESK',
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated['created'] is False
    assert updated['role'] == 'FRONTDESK'


async def test_admin_can_archive_unarchive_and_delete_staff(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001113',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    driver = User(
        first_name='Driver',
        last_name='Two',
        phone_number='+962790001114',
        role=UserRole.DRIVER,
        is_active=True,
        is_banned=False,
    )
    db_session.add_all([admin, driver])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    archive_response = await client.post(f'/admin/users/{driver.id}/archive-staff', headers=headers)
    assert archive_response.status_code == 200
    assert archive_response.json()['is_active'] is False

    unarchive_response = await client.post(f'/admin/users/{driver.id}/unarchive-staff', headers=headers)
    assert unarchive_response.status_code == 200
    assert unarchive_response.json()['is_active'] is True

    delete_while_active = await client.delete(f'/admin/users/{driver.id}/staff', headers=headers)
    assert delete_while_active.status_code == 422

    rearchive_response = await client.post(f'/admin/users/{driver.id}/archive-staff', headers=headers)
    assert rearchive_response.status_code == 200
    assert rearchive_response.json()['is_active'] is False

    delete_response = await client.delete(f'/admin/users/{driver.id}/staff', headers=headers)
    assert delete_response.status_code == 204

    users_response = await client.get('/admin/users?role=DRIVER', headers=headers)
    assert users_response.status_code == 200
    assert all(row['id'] != str(driver.id) for row in users_response.json()['users'])


async def test_admin_can_move_menu_entities_to_new_parents(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001120',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section_one = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    section_two = Section(name_en='Tea', name_ar='شاي', sort_order=2, is_active=True)
    item_one = Item(section=section_one, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_two = Item(section=section_two, name_en='Matcha', name_ar='ماتشا', sort_order=1, is_active=True)
    type_one = ItemType(item=item_one, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    type_two = ItemType(item=item_two, name_en='Iced', name_ar='بارد', sort_order=1, is_active=True)
    size_one = Size(item_type=type_one, name_en='Large', name_ar='كبير', price=Decimal('3.50'), sort_order=1, is_active=True)
    size_two = Size(item_type=type_two, name_en='Medium', name_ar='وسط', price=Decimal('4.00'), sort_order=1, is_active=True)
    addon = Addon(size=size_one, name_en='Shot', name_ar='شوت', price=Decimal('1.00'), sort_order=1, is_active=True)
    db_session.add_all([admin, section_one, section_two, item_one, item_two, type_one, type_two, size_one, size_two, addon])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    move_item = await client.patch(
        f'/admin/menu/item/{item_one.id}',
        headers=headers,
        json={'section_id': str(section_two.id), 'sort_order': 3},
    )
    assert move_item.status_code == 200
    assert move_item.json()['section_id'] == str(section_two.id)
    assert move_item.json()['sort_order'] == 3

    move_type = await client.patch(
        f'/admin/menu/type/{type_one.id}',
        headers=headers,
        json={'item_id': str(item_two.id)},
    )
    assert move_type.status_code == 200
    assert move_type.json()['item_id'] == str(item_two.id)

    move_size = await client.patch(
        f'/admin/menu/size/{size_one.id}',
        headers=headers,
        json={'type_id': str(type_two.id)},
    )
    assert move_size.status_code == 200
    assert move_size.json()['type_id'] == str(type_two.id)

    move_addon = await client.patch(
        f'/admin/menu/addon/{addon.id}',
        headers=headers,
        json={'size_id': str(size_two.id), 'sort_order': 4},
    )
    assert move_addon.status_code == 200
    assert move_addon.json()['size_id'] == str(size_two.id)
    assert move_addon.json()['sort_order'] == 4


async def test_admin_menu_move_rejects_missing_parent(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001121',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    db_session.add_all([admin, section, item])
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    response = await client.patch(
        f'/admin/menu/item/{item.id}',
        headers=headers,
        json={'section_id': '00000000-0000-0000-0000-000000000099'},
    )
    assert response.status_code == 404
    assert response.json()['detail'] == 'Section not found'


async def test_admin_can_delete_leaf_and_subtree_menu_entities_with_schedule_cleanup(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001122',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('3.50'), sort_order=1, is_active=True)
    addon_one = Addon(size=size, name_en='Shot', name_ar='شوت', price=Decimal('1.00'), sort_order=1, is_active=True)
    addon_two = Addon(size=size, name_en='Syrup', name_ar='سيرب', price=Decimal('0.50'), sort_order=2, is_active=True)
    db_session.add_all([admin, section, item, item_type, size, addon_one, addon_two])
    await db_session.flush()
    db_session.add_all(
        [
            MenuSchedule(entity_type='size', entity_id=size.id, start_time=datetime.now(timezone.utc).time(), end_time=datetime.now(timezone.utc).time(), days_of_week=[0], is_active=True),
            MenuSchedule(entity_type='addon', entity_id=addon_one.id, start_time=datetime.now(timezone.utc).time(), end_time=datetime.now(timezone.utc).time(), days_of_week=[0], is_active=True),
            MenuSchedule(entity_type='section', entity_id=section.id, start_time=datetime.now(timezone.utc).time(), end_time=datetime.now(timezone.utc).time(), days_of_week=[0], is_active=True),
        ]
    )
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}

    delete_addon = await client.delete(f'/admin/menu/addon/{addon_two.id}', headers=headers)
    assert delete_addon.status_code == 200
    assert delete_addon.json()['kind'] == 'addon'
    assert delete_addon.json()['deleted_counts'] == {
        'sections': 0,
        'items': 0,
        'types': 0,
        'sizes': 0,
        'addons': 1,
        'schedules': 0,
    }

    delete_size = await client.delete(f'/admin/menu/size/{size.id}', headers=headers)
    assert delete_size.status_code == 200
    assert delete_size.json()['kind'] == 'size'
    assert delete_size.json()['deleted_counts'] == {
        'sections': 0,
        'items': 0,
        'types': 0,
        'sizes': 1,
        'addons': 1,
        'schedules': 2,
    }

    delete_section = await client.delete(f'/admin/menu/section/{section.id}', headers=headers)
    assert delete_section.status_code == 200
    assert delete_section.json()['kind'] == 'section'
    assert delete_section.json()['deleted_counts'] == {
        'sections': 1,
        'items': 1,
        'types': 1,
        'sizes': 0,
        'addons': 0,
        'schedules': 1,
    }


async def test_admin_menu_delete_preserves_historical_order_snapshots(client, db_session):
    admin = User(
        first_name='Admin',
        last_name='Owner',
        phone_number='+962790001123',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    client_user = User(
        first_name='Lina',
        last_name='Client',
        phone_number='+962790001124',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', sort_order=1, is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
    size = Size(item_type=item_type, name_en='Large', name_ar='كبير', price=Decimal('3.50'), sort_order=1, is_active=True)
    addon = Addon(size=size, name_en='Shot', name_ar='شوت', price=Decimal('1.00'), sort_order=1, is_active=True)
    db_session.add_all([admin, client_user, section, item, item_type, size, addon])
    await db_session.flush()

    order = Order(
        order_number=1001,
        user_id=client_user.id,
        status=OrderStatus.COMPLETED,
        order_type=OrderType.PICKUP,
        notes=None,
        delivery_address=None,
    )
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(
        order_id=order.id,
        item_id_snapshot=item.id,
        size_id_snapshot=size.id,
        item_name_snapshot=item.name_en,
        size_snapshot=size.name_en,
        price_snapshot=Decimal('3.50'),
        quantity=1,
    )
    db_session.add(order_item)
    await db_session.flush()
    db_session.add(
        OrderItemAddon(
            order_item_id=order_item.id,
            addon_id_snapshot=addon.id,
            addon_name_snapshot=addon.name_en,
            price_snapshot=Decimal('1.00'),
        )
    )
    await db_session.commit()

    headers = {'Authorization': f"Bearer {create_access_token(str(admin.id), admin.role.value)}"}
    delete_response = await client.delete(f'/admin/menu/section/{section.id}', headers=headers)
    assert delete_response.status_code == 200

    orders_response = await client.get(f'/orders/user/{client_user.id}', headers=headers)
    assert orders_response.status_code == 200
    orders = orders_response.json()['orders']
    assert len(orders) == 1
    assert orders[0]['items'][0]['item_name_snapshot'] == 'Latte'
    assert orders[0]['items'][0]['size_snapshot'] == 'Large'
    assert orders[0]['items'][0]['item_id_snapshot'] is None
    assert orders[0]['items'][0]['size_id_snapshot'] is None
    assert orders[0]['items'][0]['addons'][0]['addon_name_snapshot'] == 'Shot'
    assert orders[0]['items'][0]['addons'][0]['addon_id_snapshot'] is None
