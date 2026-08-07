from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.store import PublicStoreStatusRead
from app.services.store_service import get_store_settings

router = APIRouter(prefix='/store', tags=['store'])


@router.get('/status', response_model=PublicStoreStatusRead)
async def get_store_status(db: AsyncSession = Depends(get_db)) -> PublicStoreStatusRead:
    settings_row = await get_store_settings(db)
    if settings_row is None:
        return PublicStoreStatusRead(ordering_enabled=True)
    return PublicStoreStatusRead(ordering_enabled=settings_row.ordering_enabled)
