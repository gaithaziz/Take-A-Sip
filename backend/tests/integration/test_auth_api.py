from sqlalchemy import select

from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_push_token import UserPushToken
from app.models.user_refresh_token import UserRefreshToken
from app.services.otp_service import otp_service


async def test_auth_send_and_verify_otp(client):
    phone = '+962790000111'
    send_payload = {
        'first_name': 'Nora',
        'last_name': 'Ali',
        'phone_number': phone,
    }

    send_response = await client.post('/auth/send-otp', json=send_payload)
    assert send_response.status_code == 200

    otp_code = otp_service.peek_code_for_tests(phone)
    assert otp_code is not None
    verify_response = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': phone,
            'otp_code': otp_code,
            'first_name': 'Nora',
            'last_name': 'Ali',
        },
    )

    assert verify_response.status_code == 200
    data = verify_response.json()
    assert data['token_type'] == 'bearer'
    assert data['access_token']
    assert data['refresh_token']
    assert data['user']['phone_number'] == phone
    assert data['user']['role'] == 'CLIENT'


async def test_auth_refresh_rotates_refresh_token(client):
    phone = '+962790000114'
    await client.post('/auth/send-otp', json={'first_name': 'Sam', 'last_name': 'Nader', 'phone_number': phone})
    otp_code = otp_service.peek_code_for_tests(phone)
    verify_response = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': phone,
            'otp_code': otp_code,
            'first_name': 'Sam',
            'last_name': 'Nader',
        },
    )
    assert verify_response.status_code == 200
    first_refresh_token = verify_response.json()['refresh_token']

    refresh_response = await client.post('/auth/refresh', json={'refresh_token': first_refresh_token})

    assert refresh_response.status_code == 200
    refreshed = refresh_response.json()
    assert refreshed['access_token']
    assert refreshed['refresh_token']
    assert refreshed['refresh_token'] != first_refresh_token
    assert refreshed['user']['phone_number'] == phone

    reused_response = await client.post('/auth/refresh', json={'refresh_token': first_refresh_token})
    assert reused_response.status_code == 401


async def test_auth_update_profile(client):
    phone = '+962790000112'
    send_payload = {
        'first_name': 'Maya',
        'last_name': 'Omar',
        'phone_number': phone,
    }

    send_response = await client.post('/auth/send-otp', json=send_payload)
    assert send_response.status_code == 200

    otp_code = otp_service.peek_code_for_tests(phone)
    verify_response = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': phone,
            'otp_code': otp_code,
            'first_name': 'Maya',
            'last_name': 'Omar',
        },
    )
    assert verify_response.status_code == 200
    token = verify_response.json()['access_token']

    update_response = await client.patch(
        '/auth/me',
        json={'first_name': 'Mariam', 'last_name': 'Saleh'},
        headers={'Authorization': f'Bearer {token}'},
    )
    assert update_response.status_code == 200
    assert update_response.json()['first_name'] == 'Mariam'
    assert update_response.json()['last_name'] == 'Saleh'


async def test_auth_delete_account_anonymizes_and_allows_new_signup(client, db_session):
    phone = '+962790000113'

    send_response = await client.post(
        '/auth/send-otp',
        json={'first_name': 'Lina', 'last_name': 'Haddad', 'phone_number': phone},
    )
    assert send_response.status_code == 200

    otp_code = otp_service.peek_code_for_tests(phone)
    verify_response = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': phone,
            'otp_code': otp_code,
            'first_name': 'Lina',
            'last_name': 'Haddad',
        },
    )
    assert verify_response.status_code == 200
    token = verify_response.json()['access_token']
    user_id = verify_response.json()['user']['id']

    register_response = await client.post(
        '/notifications/push-token',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'push_token': 'delete-flow-token',
            'platform': 'android',
            'push_provider': 'fcm',
            'device_id': 'delete-flow-device',
            'language': 'en',
        },
    )
    assert register_response.status_code == 201

    delete_response = await client.delete(
        '/auth/me',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert delete_response.status_code == 200
    assert delete_response.json()['message'] == 'Account deleted successfully'

    deleted_user_result = await db_session.execute(select(User).where(User.id == user_id))
    deleted_user = deleted_user_result.scalar_one()
    assert deleted_user.first_name == 'Deleted'
    assert deleted_user.last_name == 'User'
    assert deleted_user.phone_number.startswith('deleted-')
    assert deleted_user.phone_number != phone
    assert deleted_user.is_active is False
    assert deleted_user.banned_reason == 'self_deleted'

    deleted_tokens_result = await db_session.execute(
        select(UserPushToken).where(UserPushToken.user_id == user_id)
    )
    assert deleted_tokens_result.scalars().all() == []
    deleted_refresh_tokens_result = await db_session.execute(
        select(UserRefreshToken).where(UserRefreshToken.user_id == user_id)
    )
    assert deleted_refresh_tokens_result.scalars().all() == []

    user_events_result = await db_session.execute(
        select(UserEvent).where(UserEvent.user_id == user_id).order_by(UserEvent.created_at.desc())
    )
    assert user_events_result.scalars().first().event_type == 'user.self_deleted'

    me_response = await client.get('/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert me_response.status_code == 403
    assert me_response.json()['detail'] == 'User inactive'

    resend_response = await client.post(
        '/auth/send-otp',
        json={'first_name': 'Lina', 'last_name': 'Haddad', 'phone_number': phone},
    )
    assert resend_response.status_code == 200

    replacement_code = otp_service.peek_code_for_tests(phone)
    recreate_response = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': phone,
            'otp_code': replacement_code,
            'first_name': 'Lina',
            'last_name': 'Haddad',
        },
    )
    assert recreate_response.status_code == 200
    recreated_user = recreate_response.json()['user']
    assert recreated_user['phone_number'] == phone
