from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import PUBLIC_MENU_CACHE_KEY, public_response_cache
from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.menu import MenuResponse
from app.services.menu_service import get_menu_tree

router = APIRouter(prefix='/menu', tags=['menu'])


@router.get('', response_model=MenuResponse)
async def get_menu(db: AsyncSession = Depends(get_db)) -> MenuResponse:
    cached = public_response_cache.get(PUBLIC_MENU_CACHE_KEY)
    if isinstance(cached, MenuResponse):
        return cached

    sections = await get_menu_tree(db)
    response = MenuResponse(sections=sections)
    public_response_cache.set(PUBLIC_MENU_CACHE_KEY, response, get_settings().public_cache_ttl_seconds)
    return response
