from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.store import PublicStoreStatusRead
from app.services.store_service import get_store_settings, store_status_payload

router = APIRouter(prefix='/store', tags=['store'])


@router.get('/status', response_model=PublicStoreStatusRead)
async def get_store_status(db: AsyncSession = Depends(get_db)) -> PublicStoreStatusRead:
    settings_row = await get_store_settings(db)
    return PublicStoreStatusRead.model_validate(store_status_payload(settings_row))
