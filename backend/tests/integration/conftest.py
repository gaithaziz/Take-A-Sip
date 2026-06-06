import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.cache import public_response_cache
from app.core.config import get_settings
from app.core.database import get_db
from app.main import create_app
from app.models import Base


@pytest_asyncio.fixture
async def db_engine():
    test_database_url = os.getenv('TEST_DATABASE_URL')
    if not test_database_url:
        pytest.skip('TEST_DATABASE_URL is not set; skipping integration tests')

    public_response_cache.clear()
    engine = create_async_engine(test_database_url, future=True, poolclass=NullPool)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                """
                CREATE SEQUENCE IF NOT EXISTS order_number_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                OWNED BY orders.order_number
                """
            )
        )
        await conn.execute(text("ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('order_number_seq')"))
        await conn.execute(text("SELECT setval('order_number_seq', 1, false)"))
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'take_a_sip_app') THEN
                        GRANT USAGE ON SCHEMA public TO take_a_sip_app;
                        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO take_a_sip_app;
                        GRANT USAGE, SELECT ON SEQUENCE order_number_seq TO take_a_sip_app;
                    END IF;
                END
                $$;
                """
            )
        )

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    public_response_cache.clear()


@pytest_asyncio.fixture
async def db_session_factory(db_engine):
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def app_with_test_db(db_session_factory):
    get_settings().rate_limit_enabled = False
    app = create_app()

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with db_session_factory() as session:
            try:
                yield session
            finally:
                await session.execute(text('RESET ROLE'))
                for setting_name in ('app.current_user_id', 'app.current_user_role'):
                    await session.execute(
                        text("select set_config(:setting_name, '', false)"),
                        {'setting_name': setting_name},
                    )

    app.dependency_overrides[get_db] = _override_get_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(app_with_test_db):
    transport = ASGITransport(app=app_with_test_db)
    async with AsyncClient(transport=transport, base_url='http://testserver') as c:
        yield c


@pytest_asyncio.fixture
async def db_session(db_session_factory):
    async with db_session_factory() as session:
        yield session
