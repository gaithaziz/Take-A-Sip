from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.base import AppBaseModel


class AddonRead(AppBaseModel):
    id: UUID
    size_id: UUID
    name_en: str
    name_ar: str
    image_url: str | None = None
    price: Decimal
    sort_order: int = 0
    is_active: bool


class SizeRead(AppBaseModel):
    id: UUID
    type_id: UUID
    name_en: str
    name_ar: str
    image_url: str | None = None
    price: Decimal
    sort_order: int = 0
    is_active: bool
    addons: list[AddonRead] = Field(default_factory=list)


class ItemTypeRead(AppBaseModel):
    id: UUID
    item_id: UUID
    name_en: str
    name_ar: str
    image_url: str | None = None
    sort_order: int = 0
    is_active: bool
    sizes: list[SizeRead] = Field(default_factory=list)


class ItemRead(AppBaseModel):
    id: UUID
    section_id: UUID
    name_en: str
    name_ar: str
    image_url: str | None = None
    description_en: str | None
    description_ar: str | None
    sort_order: int = 0
    is_active: bool
    item_types: list[ItemTypeRead] = Field(default_factory=list)


class SectionRead(AppBaseModel):
    id: UUID
    name_en: str
    name_ar: str
    image_url: str | None = None
    is_active: bool
    sort_order: int
    items: list[ItemRead] = Field(default_factory=list)


class MenuResponse(AppBaseModel):
    sections: list[SectionRead]


class SectionCreate(AppBaseModel):
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str = Field(min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class ItemCreate(AppBaseModel):
    section_id: UUID
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str = Field(min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    description_en: str | None = None
    description_ar: str | None = None
    sort_order: int = 0


class ItemTypeCreate(AppBaseModel):
    item_id: UUID
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str = Field(min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class SizeCreate(AppBaseModel):
    type_id: UUID
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str = Field(min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal
    sort_order: int = 0


class AddonCreate(AppBaseModel):
    size_id: UUID
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str = Field(min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal
    sort_order: int = 0


class ToggleResponse(AppBaseModel):
    id: UUID
    is_active: bool


class ScheduleMenuRequest(AppBaseModel):
    entity_type: str = Field(pattern='^(section|item|type|size|addon)$')
    entity_id: UUID
    start_time: str = Field(description='HH:MM')
    end_time: str = Field(description='HH:MM')
    days_of_week: list[int] = Field(default_factory=list, description='0=Monday..6=Sunday')


class ScheduleMenuResponse(AppBaseModel):
    message: str
    schedule_id: UUID | None = None


class ScheduleRead(AppBaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    start_time: str
    end_time: str
    days_of_week: list[int]
    is_active: bool


class ScheduleListResponse(AppBaseModel):
    schedules: list[ScheduleRead]


class ScheduleUpdateRequest(AppBaseModel):
    start_time: str | None = Field(default=None, description='HH:MM')
    end_time: str | None = Field(default=None, description='HH:MM')
    days_of_week: list[int] | None = Field(default=None, description='0=Monday..6=Sunday')
    is_active: bool | None = None


class SectionUpdate(AppBaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=120)
    name_ar: str | None = Field(default=None, min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
    is_active: bool | None = None


class ItemUpdate(AppBaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=120)
    name_ar: str | None = Field(default=None, min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    description_en: str | None = None
    description_ar: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ItemTypeUpdate(AppBaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=120)
    name_ar: str | None = Field(default=None, min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
    is_active: bool | None = None


class SizeUpdate(AppBaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=120)
    name_ar: str | None = Field(default=None, min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class AddonUpdate(AppBaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=120)
    name_ar: str | None = Field(default=None, min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal | None = None
    sort_order: int | None = None
    is_active: bool | None = None
