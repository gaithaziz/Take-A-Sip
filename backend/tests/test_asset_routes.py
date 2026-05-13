import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.routes import assets


class FakeStorageService:
    async def get_object(self, key: str):
        if key == 'menu/test.png':
            return b'image-bytes', 'image/png'
        raise FileNotFoundError(key)


@pytest.mark.asyncio
async def test_asset_route_serves_storage_object(monkeypatch):
    monkeypatch.setattr(assets, 'get_storage_service', lambda: FakeStorageService())

    app = FastAPI()
    app.include_router(assets.router)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://testserver') as client:
        response = await client.get('/assets/menu/test.png')

    assert response.status_code == 200
    assert response.content == b'image-bytes'
    assert response.headers['content-type'] == 'image/png'
    assert response.headers['cache-control'] == 'public, max-age=31536000, immutable'


@pytest.mark.asyncio
async def test_asset_route_rejects_traversal(monkeypatch):
    monkeypatch.setattr(assets, 'get_storage_service', lambda: FakeStorageService())

    app = FastAPI()
    app.include_router(assets.router)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://testserver') as client:
        response = await client.get('/assets/menu/%2E%2E/secret.txt')

    assert response.status_code == 404
