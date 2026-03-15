import argparse
import asyncio
import json
from typing import Any

import httpx

from scripts.create_admin import upsert_admin


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Phase 7 end-to-end smoke test for staff provisioning and guards.')
    parser.add_argument('--base-url', default='http://localhost:8000', help='Backend base URL')
    parser.add_argument('--admin-phone', default='+962790099991', help='Admin phone for bootstrap/login')
    return parser.parse_args()


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


async def _post_json(
    client: httpx.AsyncClient, url: str, payload: dict[str, Any], token: str | None = None
) -> tuple[int, dict[str, Any]]:
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    response = await client.post(url, json=payload, headers=headers)
    body = response.json() if response.content else {}
    return response.status_code, body


async def _get_json(client: httpx.AsyncClient, url: str, token: str | None = None) -> tuple[int, dict[str, Any]]:
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    response = await client.get(url, headers=headers)
    body = response.json() if response.content else {}
    return response.status_code, body


async def run_smoke(base_url: str, admin_phone: str) -> dict[str, Any]:
    await upsert_admin(admin_phone, 'Phase7', 'Admin')
    async with httpx.AsyncClient(base_url=base_url, timeout=20.0) as client:
        # Admin login
        code_status, _ = await _post_json(
            client,
            '/auth/send-otp',
            {'first_name': 'Phase7', 'last_name': 'Admin', 'phone_number': admin_phone},
        )
        _assert(code_status == 200, 'Failed to send OTP for admin')
        verify_status, verify_body = await _post_json(
            client,
            '/auth/verify-otp',
            {'phone_number': admin_phone, 'otp_code': '123456'},
        )
        _assert(verify_status == 200, 'Failed to verify admin OTP login')
        admin_token = verify_body['access_token']

        # Admin provisions driver account
        driver_phone = '+962790099992'
        provision_status, provision_body = await _post_json(
            client,
            '/admin/users/provision-staff',
            {
                'first_name': 'Ops',
                'last_name': 'Driver',
                'phone_number': driver_phone,
                'role': 'DRIVER',
            },
            token=admin_token,
        )
        _assert(provision_status == 200, 'Failed to provision driver account')
        _assert(provision_body['role'] == 'DRIVER', 'Provisioned role mismatch')

        # Driver logs in using OTP and accesses a driver-only endpoint
        send_driver_status, _ = await _post_json(
            client,
            '/auth/send-otp',
            {'first_name': 'Ops', 'last_name': 'Driver', 'phone_number': driver_phone},
        )
        _assert(send_driver_status == 200, 'Failed to send OTP for driver')
        driver_verify_status, driver_verify_body = await _post_json(
            client,
            '/auth/verify-otp',
            {'phone_number': driver_phone, 'otp_code': '123456', 'role': 'DRIVER'},
        )
        _assert(driver_verify_status == 200, 'Failed driver OTP login')
        driver_token = driver_verify_body['access_token']
        driver_orders_status, _ = await _get_json(client, '/driver/orders/latest', token=driver_token)
        _assert(driver_orders_status == 200, 'Driver endpoint check failed')

        # Admin analytics endpoint available for admin and blocked for driver
        analytics_status, analytics_body = await _get_json(client, '/admin/analytics/dashboard', token=admin_token)
        _assert(analytics_status == 200, 'Admin analytics endpoint failed')
        _assert('revenue' in analytics_body and 'orders' in analytics_body, 'Analytics payload is incomplete')

        driver_analytics_status, driver_analytics_body = await _get_json(
            client, '/admin/analytics/dashboard', token=driver_token
        )
        _assert(driver_analytics_status == 403, 'Admin analytics must be forbidden for driver')

        return {
            'admin_phone': admin_phone,
            'driver_phone': driver_phone,
            'provisioned_driver_id': provision_body['id'],
            'analytics_forbidden_error': driver_analytics_body.get('error'),
            'status': 'ok',
        }


async def main() -> None:
    args = parse_args()
    result = await run_smoke(args.base_url, args.admin_phone)
    print(json.dumps(result, ensure_ascii=True))


if __name__ == '__main__':
    asyncio.run(main())
