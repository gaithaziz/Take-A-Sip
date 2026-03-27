from decimal import Decimal

from sqlalchemy import select

from app.core.security import create_access_token
from app.models.delivery import DeliveryDistanceBand
from app.models.menu import Item, ItemType, Section, Size
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole
from app.models.user_push_token import UserPushToken
from app.services import notification_service


def _auth_headers(user: User) -> dict[str, str]:
    return {'Authorization': f'Bearer {create_access_token(str(user.id), user.role.value)}'}


async def test_push_token_registration_deactivation_and_reassignment(client, db_session):
    client_user = User(
        first_name='Rama',
        last_name='Client',
        phone_number='+962790001111',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    other_user = User(
        first_name='Dana',
        last_name='Admin',
        phone_number='+962790001112',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    db_session.add_all([client_user, other_user])
    await db_session.commit()

    register_response = await client.post(
        '/notifications/push-token',
        headers=_auth_headers(client_user),
        json={
            'push_token': 'android-token-1',
            'platform': 'android',
            'push_provider': 'fcm',
            'device_id': 'device-a',
            'language': 'ar',
        },
    )
    assert register_response.status_code == 201
    assert register_response.json()['token']['user_id'] == str(client_user.id)
    assert register_response.json()['token']['language'] == 'ar'

    update_response = await client.post(
        '/notifications/push-token',
        headers=_auth_headers(client_user),
        json={
            'push_token': 'android-token-1',
            'platform': 'android',
            'push_provider': 'fcm',
            'device_id': 'device-a-updated',
            'language': 'en',
        },
    )
    assert update_response.status_code == 201
    assert update_response.json()['token']['device_id'] == 'device-a-updated'
    assert update_response.json()['token']['language'] == 'en'

    reassign_response = await client.post(
        '/notifications/push-token',
        headers=_auth_headers(other_user),
        json={
            'push_token': 'android-token-1',
            'platform': 'android',
            'push_provider': 'fcm',
            'device_id': 'device-b',
            'language': 'ar',
        },
    )
    assert reassign_response.status_code == 201
    assert reassign_response.json()['token']['user_id'] == str(other_user.id)

    deactivate_response = await client.request(
        'DELETE',
        '/notifications/push-token',
        headers=_auth_headers(other_user),
        json={'push_token': 'android-token-1'},
    )
    assert deactivate_response.status_code == 200
    assert deactivate_response.json()['token']['is_active'] is False


async def test_order_notifications_fire_and_invalid_tokens_are_deactivated(client, db_session, monkeypatch):
    admin = User(
        first_name='Alaa',
        last_name='Admin',
        phone_number='+962790001121',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    driver = User(
        first_name='Samer',
        last_name='Driver',
        phone_number='+962790001122',
        role=UserRole.DRIVER,
        is_active=True,
        is_banned=False,
    )
    customer = User(
        first_name='Mona',
        last_name='Client',
        phone_number='+962790001123',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='Coffee', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='Latte', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='Hot', is_active=True)
    size = Size(item_type=item_type, name_en='Regular', name_ar='Regular', price=Decimal('3.50'), is_active=True)
    store_settings = StoreSettings(
        store_name='Take A Sip',
        store_latitude=Decimal('31.9539000'),
        store_longitude=Decimal('35.9106000'),
    )
    invalid_token = UserPushToken(
        user_id=customer.id,
        platform='android',
        push_provider='fcm',
        push_token='client-token-invalid',
        device_id='client-device-2',
        language='ar',
        is_active=True,
    )

    db_session.add_all(
        [
            admin,
            driver,
            customer,
            section,
            item,
            item_type,
            size,
            store_settings,
            DeliveryDistanceBand(
                min_distance_km=Decimal('0.000'),
                max_distance_km=Decimal('10.000'),
                fee_amount=Decimal('1.50'),
                is_active=True,
                sort_order=0,
            ),
            UserPushToken(
                user_id=admin.id,
                platform='android',
                push_provider='fcm',
                push_token='admin-token',
                device_id='admin-device',
                language='en',
                is_active=True,
            ),
            UserPushToken(
                user_id=driver.id,
                platform='android',
                push_provider='fcm',
                push_token='driver-token',
                device_id='driver-device',
                language='en',
                is_active=True,
            ),
            UserPushToken(
                user_id=customer.id,
                platform='android',
                push_provider='fcm',
                push_token='client-token',
                device_id='client-device',
                language='ar',
                is_active=True,
            ),
            invalid_token,
        ]
    )
    await db_session.commit()

    monkeypatch.setattr(notification_service.settings, 'push_enabled', True)
    deliveries: list[tuple[str, str]] = []

    async def fake_sender(token, payload):
        deliveries.append((token.push_token, payload['type']))
        return notification_service.NotificationSendAttempt(
            push_token_id=token.id,
            push_token=token.push_token,
            success=token.push_token != 'client-token-invalid',
            deactivate=token.push_token == 'client-token-invalid',
            provider=token.push_provider,
            error_code='invalid_token' if token.push_token == 'client-token-invalid' else None,
        )

    notification_service.set_notification_sender_override(fake_sender)
    try:
        create_response = await client.post(
            '/orders',
            headers=_auth_headers(customer),
            json={
                'order_type': 'delivery',
                'delivery_address': 'Amman',
                'delivery_lat': 31.9639,
                'delivery_lng': 35.9206,
                'items': [{'size_id': str(size.id), 'quantity': 1, 'addon_ids': []}],
            },
        )
        assert create_response.status_code == 201
        order_id = create_response.json()['id']

        await client.post(f'/orders/{order_id}/accept', headers=_auth_headers(admin))
        await client.post(
            f'/orders/{order_id}/assign-driver',
            headers=_auth_headers(admin),
            json={'driver_user_id': str(driver.id)},
        )
        await client.post(
            f'/orders/{order_id}/status',
            headers=_auth_headers(driver),
            json={'status': 'OUT_FOR_DELIVERY'},
        )
        await client.post(
            f'/orders/{order_id}/status',
            headers=_auth_headers(driver),
            json={'status': 'DELIVERED'},
        )
    finally:
        notification_service.set_notification_sender_override(None)
        monkeypatch.setattr(notification_service.settings, 'push_enabled', False)

    assert ('admin-token', 'admin_new_order') in deliveries
    assert ('admin-token', 'admin_driver_assignment_needed') in deliveries
    assert ('client-token', 'client_order_accepted') in deliveries
    assert ('client-token-invalid', 'client_order_accepted') in deliveries
    assert ('driver-token', 'driver_order_assigned') in deliveries
    assert ('client-token', 'client_driver_assigned') in deliveries
    assert ('client-token', 'client_out_for_delivery') in deliveries
    assert ('client-token', 'client_order_delivered') in deliveries

    await db_session.refresh(invalid_token)
    invalid_token_result = await db_session.execute(
        select(UserPushToken).where(UserPushToken.push_token == 'client-token-invalid')
    )
    assert invalid_token_result.scalar_one().is_active is False


async def test_pickup_completed_sends_completion_notification(client, db_session, monkeypatch):
    admin = User(
        first_name='Nader',
        last_name='Admin',
        phone_number='+962790001131',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    customer = User(
        first_name='Lama',
        last_name='Client',
        phone_number='+962790001132',
        role=UserRole.CLIENT,
        is_active=True,
        is_banned=False,
    )
    section = Section(name_en='Coffee', name_ar='Coffee', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='Latte', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='Hot', is_active=True)
    size = Size(item_type=item_type, name_en='Regular', name_ar='Regular', price=Decimal('3.50'), is_active=True)

    db_session.add_all(
        [
            admin,
            customer,
            section,
            item,
            item_type,
            size,
            UserPushToken(
                user_id=customer.id,
                platform='android',
                push_provider='fcm',
                push_token='pickup-client-token',
                device_id='pickup-client-device',
                language='ar',
                is_active=True,
            ),
        ]
    )
    await db_session.commit()

    monkeypatch.setattr(notification_service.settings, 'push_enabled', True)
    deliveries: list[tuple[str, str]] = []

    async def fake_sender(token, payload):
        deliveries.append((token.push_token, payload['type']))
        return notification_service.NotificationSendAttempt(
            push_token_id=token.id,
            push_token=token.push_token,
            success=True,
            provider=token.push_provider,
        )

    notification_service.set_notification_sender_override(fake_sender)
    try:
        create_response = await client.post(
            '/orders',
            headers=_auth_headers(customer),
            json={'order_type': 'pickup', 'items': [{'size_id': str(size.id), 'quantity': 1, 'addon_ids': []}]},
        )
        order_id = create_response.json()['id']
        await client.post(f'/orders/{order_id}/accept', headers=_auth_headers(admin))
        await client.post(
            f'/orders/{order_id}/status',
            headers=_auth_headers(admin),
            json={'status': 'COMPLETED'},
        )
    finally:
        notification_service.set_notification_sender_override(None)
        monkeypatch.setattr(notification_service.settings, 'push_enabled', False)

    assert ('pickup-client-token', 'client_order_completed') in deliveries
