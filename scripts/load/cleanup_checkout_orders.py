#!/usr/bin/env python3
"""Cancel NEW load-test orders created by the checkout load test."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, body: str) -> None:
        self.method = method
        self.path = path
        self.status = status
        self.body = body
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


def request_json(
    base_url: str,
    method: str,
    path: str,
    *,
    token: str,
    payload: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> Any:
    url = f'{base_url.rstrip("/")}{path}'
    body = None
    headers = {'Accept': 'application/json', 'Authorization': f'Bearer {token}'}
    if payload is not None:
        body = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode('utf-8')
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode('utf-8', errors='replace')
        raise ApiError(method, path, exc.code, raw) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'{method} {url} failed: {exc.reason}') from exc


def main() -> int:
    base_url = env_required('BASE_URL').rstrip('/')
    admin_token = env_required('ADMIN_TOKEN')
    run_id = env_required('RUN_ID')
    limit = min(env_int('CLEANUP_PAGE_LIMIT', 100), 100)
    max_pages = env_int('CLEANUP_MAX_PAGES', 20)
    timeout = float(os.environ.get('HTTP_TIMEOUT_SECONDS', '30') or '30')
    marker = f'load-test:{run_id}'

    matched = 0
    cancelled = 0
    skipped: list[dict[str, str]] = []

    for page in range(max_pages):
        offset = page * limit
        query = urllib.parse.urlencode({'limit': limit, 'offset': offset})
        response = request_json(base_url, 'GET', f'/orders/latest?{query}', token=admin_token, timeout=timeout)
        orders = response.get('orders', [])
        if not orders:
            break
        for order in orders:
            notes = str(order.get('notes') or '')
            if marker not in notes:
                continue
            matched += 1
            order_id = str(order['id'])
            status = str(order['status'])
            if status == 'NEW':
                request_json(
                    base_url,
                    'POST',
                    f'/orders/{order_id}/status',
                    token=admin_token,
                    payload={'status': 'CANCELLED'},
                    timeout=timeout,
                )
                cancelled += 1
                print(f'Cancelled load-test order {order_id}')
            else:
                skipped.append({'id': order_id, 'status': status})
        if len(orders) < limit:
            break

    summary = {
        'run_id': run_id,
        'matched': matched,
        'cancelled': cancelled,
        'skipped_non_new': skipped,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print('Interrupted', file=sys.stderr)
        raise SystemExit(130)
