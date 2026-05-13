import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.rate_limit import InMemoryRateLimiter, RateLimitRule, enforce_rate_limit, rate_limiter


def test_in_memory_rate_limiter_blocks_after_limit_and_resets():
    limiter = InMemoryRateLimiter()
    rule = RateLimitRule('unit', limit=2, window_seconds=60)

    assert limiter.check('client-a', rule, now=100.0) == (True, 1, 60)
    assert limiter.check('client-a', rule, now=101.0) == (True, 0, 59)
    allowed, remaining, retry_after = limiter.check('client-a', rule, now=102.0)
    assert allowed is False
    assert remaining == 0
    assert retry_after == 58
    assert limiter.check('client-a', rule, now=161.0) == (True, 1, 60)


@pytest.mark.asyncio
async def test_rate_limit_middleware_response_is_consistent():
    app = FastAPI()
    settings = Settings(rate_limit_send_otp_per_minute=1)

    @app.middleware('http')
    async def limiter_middleware(request, call_next):
        response = await enforce_rate_limit(request, settings)
        if response is not None:
            return response
        return await call_next(request)

    @app.post('/auth/send-otp')
    async def send_otp():
        return {'ok': True}

    rate_limiter.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://testserver') as client:
        first = await client.post('/auth/send-otp')
        second = await client.post('/auth/send-otp')

    assert first.status_code == 200
    assert second.status_code == 429
    body = second.json()
    assert body['detail']['code'] == 'rate_limited'
    assert body['detail']['retry_after_seconds'] >= 1
    assert 'Retry-After' in second.headers
