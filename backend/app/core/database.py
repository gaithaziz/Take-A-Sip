from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

engine_kwargs = {
    'echo': settings.sql_echo,
    'pool_pre_ping': True,
}

if settings.database_use_null_pool:
    engine_kwargs['poolclass'] = NullPool
else:
    engine_kwargs['pool_size'] = settings.database_pool_size
    engine_kwargs['max_overflow'] = settings.database_max_overflow
    engine_kwargs['pool_timeout'] = settings.database_pool_timeout_seconds
    engine_kwargs['pool_recycle'] = settings.database_pool_recycle_seconds

engine = create_async_engine(settings.database_url, **engine_kwargs)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
