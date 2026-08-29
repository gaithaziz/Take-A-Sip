from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select

from app.core.phone import phone_identity_fingerprint
from app.models.first_time_offer_claim import FirstTimeOfferClaim
from app.models.menu import Item, ItemType, Section, Size
from app.models.order import Order, OrderStatus, OrderType
from app.models.promotion import Promotion, PromotionType
from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_push_token import UserPushToken
from app.models.user_refresh_token import UserRefreshToken
from app.services.otp_service import otp_service
from app.services.offer_identity_service import claim_first_time_identity


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


async def test_deleted_customer_cannot_reclaim_first_offer_with_equivalent_phone_format(client, db_session):
    international_phone = '+962791234567'
    local_phone = '0791234567'

    await client.post(
        '/auth/send-otp',
        json={'first_name': 'Repeat', 'last_name': 'Customer', 'phone_number': international_phone},
    )
    first_code = otp_service.peek_code_for_tests(international_phone)
    first_login = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': international_phone,
            'otp_code': first_code,
            'first_name': 'Repeat',
            'last_name': 'Customer',
        },
    )
    assert first_login.status_code == 200
    first_user_id = UUID(first_login.json()['user']['id'])
    first_token = first_login.json()['access_token']

    db_session.add(
        Order(
            order_number=8801,
            user_id=first_user_id,
            status=OrderStatus.COMPLETED,
            order_type=OrderType.PICKUP,
            completed_at=datetime.now(timezone.utc),
        )
    )
    await db_session.commit()

    deleted = await client.delete('/auth/me', headers={'Authorization': f'Bearer {first_token}'})
    assert deleted.status_code == 200
    claim = await db_session.get(FirstTimeOfferClaim, phone_identity_fingerprint(international_phone))
    assert claim is not None
    assert claim.reason == 'account_deletion'

    await client.post(
        '/auth/send-otp',
        json={'first_name': 'Repeat', 'last_name': 'Customer', 'phone_number': local_phone},
    )
    replacement_code = otp_service.peek_code_for_tests(local_phone)
    replacement_login = await client.post(
        '/auth/verify-otp',
        json={
            'phone_number': local_phone,
            'otp_code': replacement_code,
            'first_name': 'Repeat',
            'last_name': 'Customer',
        },
    )
    assert replacement_login.status_code == 200

    section = Section(name_en='Coffee', name_ar='قهوة', sort_order=1, is_active=True)
    item = Item(section=section, name_en='Latte', name_ar='لاتيه', is_active=True)
    item_type = ItemType(item=item, name_en='Hot', name_ar='ساخن', is_active=True)
    size = Size(item_type=item_type, name_en='Regular', name_ar='عادي', price=Decimal('3.00'), is_active=True)
    promotion = Promotion(
        title_en='Welcome',
        title_ar='ترحيب',
        type=PromotionType.FIRST_TIME,
        value=Decimal('20.00'),
        starts_at=datetime.now(timezone.utc) - timedelta(hours=1),
        ends_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=True,
    )
    db_session.add_all([section, item, item_type, size, promotion])
    await db_session.commit()

    evaluation = await client.post(
        '/promotions/evaluate',
        headers={'Authorization': f"Bearer {replacement_login.json()['access_token']}"},
        json={'items': [{'size_id': str(size.id), 'quantity': 1, 'addon_ids': []}]},
    )
    assert evaluation.status_code == 200
    assert evaluation.json()['applied_promotion'] is None
    assert evaluation.json()['ineligible_promotions'][0]['reason_code'] == 'FIRST_TIME_ONLY'


async def test_equivalent_phone_formats_cannot_create_two_first_offer_claims(db_session):
    first_claim = await claim_first_time_identity(
        db_session,
        '+962791112222',
        reason='welcome_offer',
    )
    duplicate_claim = await claim_first_time_identity(
        db_session,
        '0791112222',
        reason='welcome_offer',
    )

    assert first_claim is not None
    assert duplicate_claim is None
