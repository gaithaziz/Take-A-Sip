from app.services.otp_service import otp_service


async def test_auth_send_and_verify_otp(client):
    otp_service.reset()
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
    assert data['user']['phone_number'] == phone
    assert data['user']['role'] == 'CLIENT'


async def test_auth_update_profile(client):
    otp_service.reset()
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
