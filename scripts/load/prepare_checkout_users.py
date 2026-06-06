#!/usr/bin/env python3
"""Prepare authenticated client fixtures for the 150-user checkout load test."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_FIXTURE_PATH = Path('scripts/load/checkout-users.json')
DEFAULT_DELIVERY_LATITUDE = '32.551347'
DEFAULT_DELIVERY_LONGITUDE = '36.017005'


class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, body: str, headers: dict[str, str] | None = None) -> None:
        self.method = method
        self.path = path
        self.status = status
        self.body = body
        self.headers = headers or {}
        super().__init__(f'{method} {path} failed with HTTP {status}: {body[:500]}')


def env_required(name: str) -> str:
    value = os.environ.get(name, '').strip()
    if not value:
        raise SystemExit(f'{name} is required')
    return value


def env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, '').strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise SystemExit(f'{name} must be an integer') from exc
    if value <= 0:
        raise SystemExit(f'{name} must be greater than 0')
    return value


def env_float(name: str, default: float) -> float:
    raw = os.environ.get(name, '').strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise SystemExit(f'{name} must be a number') from exc


def fixture_path() -> Path:
    return Path(os.environ.get('LOAD_FIXTURE', str(DEFAULT_FIXTURE_PATH))).expanduser()


def request_json(
    base_url: str,
    method: str,
    path: str,
    *,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> Any:
    url = f'{base_url.rstrip("/")}{path}'
    body = None
    headers = {'Accept': 'application/json'}
    if payload is not None:
        body = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode('utf-8')
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode('utf-8', errors='replace')
        raise ApiError(method, path, exc.code, raw, dict(exc.headers)) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'{method} {url} failed: {exc.reason}') from exc


def retry_after_seconds(error: ApiError) -> float:
    header = error.headers.get('Retry-After') or error.headers.get('retry-after')
    if header:
        try:
            return max(float(header), 1.0)
        except ValueError:
            pass
    return 15.0


def request_with_429_retry(
    base_url: str,
    method: str,
    path: str,
    *,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 30.0,
    max_attempts: int = 8,
) -> Any:
    for attempt in range(1, max_attempts + 1):
        try:
            return request_json(base_url, method, path, token=token, payload=payload, timeout=timeout)
        except ApiError as exc:
            if exc.status != 429 or attempt == max_attempts:
                raise
            wait_seconds = retry_after_seconds(exc)
            print(f'Rate limited on {method} {path}; sleeping {wait_seconds:.1f}s before retry {attempt + 1}/{max_attempts}')
            time.sleep(wait_seconds)
    raise RuntimeError(f'{method} {path} exhausted retries')


def find_first_active_size(menu: dict[str, Any]) -> str:
    for section in menu.get('sections', []):
        if not section.get('is_active', True):
            continue
        for item in section.get('items', []):
            if not item.get('is_active', True):
                continue
            for item_type in item.get('item_types', []):
                if not item_type.get('is_active', True):
                    continue
                for size in item_type.get('sizes', []):
                    if not size.get('is_active', True):
                        continue
                    limit = size.get('order_limit')
                    if limit is not None and int(limit) < 1:
                        continue
                    return str(size['id'])
    raise SystemExit('No active orderable menu size found at /menu')


def generated_phone(prefix: str, index: int) -> str:
    return f'{prefix}{index:04d}'


def build_order_payload(
    *,
    run_id: str,
    user_index: int,
    phone_number: str,
    order_type: str,
    size_id: str,
    delivery_latitude: float,
    delivery_longitude: float,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'order_type': order_type,
        'notes': f'load-test:{run_id} vu:{user_index} phone:{phone_number}',
        'items': [
            {
                'size_id': size_id,
                'quantity': 1,
                'addon_ids': [],
            }
        ],
    }
    if order_type == 'delivery':
        payload.update(
            {
                'delivery_address_text': f'Load Test Address {run_id}-{user_index:04d}',
                'delivery_lat': delivery_latitude,
                'delivery_lng': delivery_longitude,
            }
        )
    return payload


def main() -> int:
    base_url = env_required('BASE_URL').rstrip('/')
    otp_code = env_required('OTP_TEST_CODE')
    phone_prefix = env_required('CLIENT_PHONE_PREFIX')
    run_id = env_required('RUN_ID')
    target_vus = env_int('TARGET_VUS', 150)
    order_type = os.environ.get('ORDER_TYPE', 'delivery').strip().lower() or 'delivery'
    if order_type not in {'pickup', 'delivery'}:
        raise SystemExit('ORDER_TYPE must be pickup or delivery')

    timeout = env_float('HTTP_TIMEOUT_SECONDS', 30.0)
    send_interval = env_float('OTP_SEND_INTERVAL_SECONDS', 12.5)
    delivery_latitude = env_float('DELIVERY_LATITUDE', float(DEFAULT_DELIVERY_LATITUDE))
    delivery_longitude = env_float('DELIVERY_LONGITUDE', float(DEFAULT_DELIVERY_LONGITUDE))
    out_path = fixture_path()

    print(f'Preparing {target_vus} checkout users against {base_url}')
    menu = request_json(base_url, 'GET', '/menu', timeout=timeout)
    size_id = find_first_active_size(menu)
    print(f'Using active size_id {size_id}')

    users: list[dict[str, Any]] = []
    for index in range(1, target_vus + 1):
        phone_number = generated_phone(phone_prefix, index)
        auth_payload = {
            'phone_number': phone_number,
            'first_name': 'Load',
            'last_name': f'Test {index:04d}',
        }
        request_with_429_retry(base_url, 'POST', '/auth/send-otp', payload=auth_payload, timeout=timeout)
        verify_payload = {
            **auth_payload,
            'otp_code': otp_code,
        }
        auth_response = request_with_429_retry(base_url, 'POST', '/auth/verify-otp', payload=verify_payload, timeout=timeout)
        token = auth_response['access_token']
        order_payload = build_order_payload(
            run_id=run_id,
            user_index=index,
            phone_number=phone_number,
            order_type=order_type,
            size_id=size_id,
            delivery_latitude=delivery_latitude,
            delivery_longitude=delivery_longitude,
        )
        users.append(
            {
                'phone_number': phone_number,
                'token': token,
                'order_payload': order_payload,
                'promotion_payload': {
                    'order_type': order_type,
                    'items': order_payload['items'],
                },
                'delivery_quote_payload': (
                    {
                        'delivery_lat': delivery_latitude,
                        'delivery_lng': delivery_longitude,
                    }
                    if order_type == 'delivery'
                    else None
                ),
            }
        )
        print(f'Prepared {index}/{target_vus}: {phone_number}')
        if index < target_vus and send_interval > 0:
            time.sleep(send_interval)

    if users and order_type == 'delivery':
        print('Validating delivery quote with the first prepared token')
        request_json(
            base_url,
            'POST',
            '/orders/delivery-quote',
            token=users[0]['token'],
            payload=users[0]['delivery_quote_payload'],
            timeout=timeout,
        )

    fixture = {
        'run_id': run_id,
        'base_url': base_url,
        'target_vus': target_vus,
        'order_type': order_type,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'users': users,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(fixture, indent=2), encoding='utf-8')
    print(f'Wrote fixture: {out_path}')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print('Interrupted', file=sys.stderr)
        raise SystemExit(130)
