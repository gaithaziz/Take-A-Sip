from __future__ import annotations

import time
from dataclasses import dataclass
from hashlib import sha256
from threading import Lock
from typing import Any

from fastapi import Request
from starlette.responses import JSONResponse

from app.core.config import Settings


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    limit: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, tuple[int, float]] = {}
        self._lock = Lock()

    def check(self, key: str, rule: RateLimitRule, now: float | None = None) -> tuple[bool, int, int]:
        current_time = time.monotonic() if now is None else now
        bucket_key = f'{rule.name}:{key}'

        with self._lock:
            count, reset_at = self._hits.get(bucket_key, (0, current_time + rule.window_seconds))
            if current_time >= reset_at:
                count = 0
                reset_at = current_time + rule.window_seconds

            count += 1
            self._hits[bucket_key] = (count, reset_at)

            allowed = count <= rule.limit
            remaining = max(rule.limit - count, 0)
            retry_after = max(int(reset_at - current_time), 1)
            self._prune(current_time)
            return allowed, remaining, retry_after

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()

    def _prune(self, current_time: float) -> None:
        if len(self._hits) < 10_000:
            return
        expired = [key for key, (_, reset_at) in self._hits.items() if current_time >= reset_at]
        for key in expired:
            self._hits.pop(key, None)


rate_limiter = InMemoryRateLimiter()


def _client_key(request: Request) -> str:
    auth_header = request.headers.get('authorization', '').strip()
    if auth_header:
        return f'token:{sha256(auth_header.encode("utf-8")).hexdigest()[:24]}'

    forwarded_for = request.headers.get('x-forwarded-for', '').split(',')[0].strip()
    if forwarded_for:
        return f'ip:{forwarded_for}'

    client_host = request.client.host if request.client else 'unknown'
    return f'ip:{client_host}'


def _select_rule(request: Request, settings: Settings) -> RateLimitRule | None:
    path = request.url.path.rstrip('/') or '/'
    method = request.method.upper()
    if method == 'OPTIONS' or path in {'/health', '/ready', '/metrics'}:
        return None

    if method == 'POST' and path == '/auth/send-otp':
        return RateLimitRule('auth_send_otp', settings.rate_limit_send_otp_per_minute, 60)
    if method == 'POST' and path == '/auth/verify-otp':
        return RateLimitRule('auth_verify_otp', settings.rate_limit_verify_otp_per_minute, 60)
    if method == 'POST' and (path == '/orders' or path.endswith('/reorder')):
        return RateLimitRule('order_create', settings.rate_limit_order_create_per_minute, 60)
    if method == 'POST' and path == '/admin/uploads/image':
        return RateLimitRule('upload_image', settings.rate_limit_upload_per_minute, 60)
    if path.startswith('/admin') and method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
        return RateLimitRule('admin_mutation', settings.rate_limit_admin_mutation_per_minute, 60)
    return RateLimitRule('global', settings.rate_limit_global_per_minute, 60)


async def enforce_rate_limit(request: Request, settings: Settings) -> JSONResponse | None:
    if not settings.rate_limit_enabled:
        return None

    rule = _select_rule(request, settings)
    if rule is None or rule.limit <= 0:
        return None

    allowed, remaining, retry_after = rate_limiter.check(_client_key(request), rule)
    request.state.rate_limit_rule = rule.name
    request.state.rate_limit_remaining = remaining

    if allowed:
        return None

    return JSONResponse(
        status_code=429,
        content={
            'detail': {
                'code': 'rate_limited',
                'message': 'Too many requests. Please retry later.',
                'retry_after_seconds': retry_after,
            }
        },
        headers={
            'Retry-After': str(retry_after),
            'X-RateLimit-Limit': str(rule.limit),
            'X-RateLimit-Remaining': '0',
        },
    )


def rate_limit_headers(request: Request) -> dict[str, str]:
    rule_name: Any = getattr(request.state, 'rate_limit_rule', None)
    remaining: Any = getattr(request.state, 'rate_limit_remaining', None)
    if rule_name is None or remaining is None:
        return {}
    return {
        'X-RateLimit-Policy': str(rule_name),
        'X-RateLimit-Remaining': str(remaining),
    }
