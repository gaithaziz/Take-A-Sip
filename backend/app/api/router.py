from fastapi import APIRouter

from app.api.routes import admin, auth, menu, orders, promotions, websocket

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(menu.router)
api_router.include_router(orders.router)
api_router.include_router(orders.driver_router)
api_router.include_router(promotions.router)
api_router.include_router(admin.router)
api_router.include_router(websocket.router)
