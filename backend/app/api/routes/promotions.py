from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.promotion import ActivePromotionsResponse, PromotionRead
from app.services.promotion_service import get_active_promotions

router = APIRouter(prefix='/promotions', tags=['promotions'])


@router.get('/active', response_model=ActivePromotionsResponse)
async def active_promotions(db: AsyncSession = Depends(get_db)) -> ActivePromotionsResponse:
    promotions = await get_active_promotions(db)
    return ActivePromotionsResponse(promotions=[PromotionRead.model_validate(p) for p in promotions])
