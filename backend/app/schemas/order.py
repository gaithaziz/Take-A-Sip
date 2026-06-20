from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class OrderAddonCreate(AppBaseModel):
    addon_id: UUID


class OrderItemCreate(AppBaseModel):
    size_id: UUID
    quantity: int = Field(ge=1)
    addon_ids: list[UUID] = Field(default_factory=list)


class OrderCreateRequest(AppBaseModel):
    order_type: str = Field(pattern='^(pickup|delivery)$')
    payment_method: str = Field(default='CASH', pattern='^(CASH|CARD)$')
    delivery_address: str | None = Field(default=None, max_length=255)
    delivery_address_text: str | None = Field(default=None, max_length=255)
    delivery_latitude: float | None = None
    delivery_longitude: float | None = None
    delivery_lat: float | None = None
    delivery_lng: float | None = None
    notes: str | None = None
    items: list[OrderItemCreate] = Field(min_length=1)


class DeliveryQuoteRequest(AppBaseModel):
    delivery_latitude: float | None = None
    delivery_longitude: float | None = None
    delivery_lat: float | None = None
    delivery_lng: float | None = None


class DeliveryQuoteResponse(AppBaseModel):
    delivery_distance_km: Decimal
    delivery_fee: Decimal
    delivery_distance_band_id: UUID


class AssignDriverRequest(AppBaseModel):
    driver_user_id: UUID


class UpdateOrderStatusRequest(AppBaseModel):
    status: str = Field(pattern='^(NEW|ACCEPTED|ASSIGNED|OUT_FOR_DELIVERY|DELIVERED|COMPLETED|CANCELLED)$')


class OrderItemAddonRead(AppBaseModel):
    id: UUID
    addon_id_snapshot: UUID | None = None
    addon_name_snapshot: str
    price_snapshot: Decimal


class OrderItemRead(AppBaseModel):
    id: UUID
    item_id_snapshot: UUID | None = None
    size_id_snapshot: UUID | None = None
    item_name_snapshot: str
    size_snapshot: str
    price_snapshot: Decimal
    quantity: int
    addons: list[OrderItemAddonRead] = Field(default_factory=list)


class OrderRatingRead(AppBaseModel):
    id: UUID
    order_id: UUID
    user_id: UUID
    stars: int
    note: str | None = None
    created_at: datetime


class OrderRead(AppBaseModel):
    id: UUID
    order_number: int
    user_id: UUID
    customer_name: str | None = None
    customer_phone: str | None = None
    delivery_address: str | None = None
    delivery_address_text: str | None = None
    delivery_latitude: Decimal | None = None
    delivery_longitude: Decimal | None = None
    delivery_distance_km: Decimal | None = None
    delivery_fee: Decimal | None = None
    delivery_distance_band_id: UUID | None = None
    subtotal_amount: Decimal | None = None
    discount_amount: Decimal | None = None
    total_amount: Decimal | None = None
    applied_promotion_id: UUID | None = None
    applied_promotion_title_en: str | None = None
    applied_promotion_title_ar: str | None = None
    assigned_driver_id: UUID | None = None
    assigned_driver_name: str | None = None
    assigned_driver_phone: str | None = None
    assigned_at: datetime | None = None
    completed_at: datetime | None = None
    google_maps_url: str | None = None
    status: str
    order_type: str
    payment_method: str
    created_at: datetime
    notes: str | None
    items: list[OrderItemRead] = Field(default_factory=list)
    rating: OrderRatingRead | None = None


class OrderListResponse(AppBaseModel):
    orders: list[OrderRead]


class AcceptOrderResponse(AppBaseModel):
    id: UUID
    status: str


class UpdateOrderStatusResponse(AppBaseModel):
    id: UUID
    status: str


class RevenueSummaryResponse(AppBaseModel):
    today_revenue: Decimal
    week_revenue: Decimal
    month_revenue: Decimal
    today_orders: int
    week_orders: int
    month_orders: int


class OrderAnalyticsResponse(AppBaseModel):
    total_orders_today: int
    pickup_orders_today: int
    delivery_orders_today: int
    pickup_delivery_ratio: str
    average_order_value: Decimal


class DriverDeliveryRead(AppBaseModel):
    driver_id: UUID
    driver_name: str
    deliveries_completed_today: int


class DriverAnalyticsResponse(AppBaseModel):
    deliveries_completed_today: int
    deliveries_per_driver: list[DriverDeliveryRead] = Field(default_factory=list)


class AdminDashboardAnalyticsResponse(AppBaseModel):
    revenue: RevenueSummaryResponse
    orders: OrderAnalyticsResponse
    ratings: 'AdminRatingSummaryResponse'
    drivers: DriverAnalyticsResponse


class SubmitOrderRatingRequest(AppBaseModel):
    stars: int = Field(ge=1, le=5)
    note: str | None = Field(default=None, max_length=500)


class AdminRatingRead(AppBaseModel):
    order_id: UUID
    stars: int
    note: str | None = None
    customer_name: str
    created_at: datetime


class AdminRatingsResponse(AppBaseModel):
    ratings: list[AdminRatingRead]


class AdminRatingSummaryResponse(AppBaseModel):
    average_rating: float
    total_ratings: int
    stars_breakdown: dict[str, int]
    avg_stars: float | None = None
    star_counts: dict[str, int] | None = None
