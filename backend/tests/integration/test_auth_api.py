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

    otp_code = otp_service._store[phone][0]  # test-only access
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
