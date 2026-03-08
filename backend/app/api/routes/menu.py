from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.menu import MenuResponse
from app.services.menu_service import get_menu_tree

router = APIRouter(prefix='/menu', tags=['menu'])


@router.get('', response_model=MenuResponse)
async def get_menu(db: AsyncSession = Depends(get_db)) -> MenuResponse:
    sections = await get_menu_tree(db)
    return MenuResponse(sections=sections)
