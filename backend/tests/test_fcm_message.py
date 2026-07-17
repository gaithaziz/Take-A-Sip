from uuid import uuid4

import pytest

from app.models.user_push_token import UserPushToken
from app.services import notification_service


async def _async_value(value):
    return value


@pytest.mark.asyncio
async def test_frontdesk_fcm_message_is_high_priority(monkeypatch):
    token = UserPushToken(
        id=uuid4(),
        user_id=uuid4(),
        platform='android',
        push_provider='fcm',
        push_token='frontdesk-token',
        device_id='frontdesk-device',
        language='en',
        is_active=True,
    )
    captured = {}

    class Response:
        status_code = 200
        text = ''

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, _url, *, headers, json):
            captured['headers'] = headers
            captured['json'] = json
            return Response()

    monkeypatch.setattr(notification_service, '_load_fcm_service_account', lambda: {'project_id': 'test'})
    monkeypatch.setattr(notification_service, '_create_google_access_token', lambda: _async_value('access-token'))
    monkeypatch.setattr(notification_service.httpx, 'AsyncClient', lambda **_kwargs: Client())

    await notification_service._send_via_fcm(
        token,
        {
            'type': 'frontdesk_new_order',
            'order_id': str(uuid4()),
            'role_target': 'FRONTDESK',
            'screen': 'FrontdeskOrders',
            'title': 'New order',
            'body': 'Order received',
        },
    )

    android = captured['json']['message']['android']
    assert android['priority'] == 'HIGH'
    assert android['ttl'] == '300s'
    assert android['notification']['channel_id'] == 'frontdesk_orders'
