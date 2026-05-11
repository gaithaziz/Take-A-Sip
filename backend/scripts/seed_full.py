import argparse
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, text

from app.core.database import SessionLocal
from app.models import Base
from app.models.delivery import DeliveryDistanceBand
from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size
from app.models.order import Order, OrderEvent, OrderItem, OrderItemAddon, OrderRating, OrderStatus, OrderType
from app.models.otp_challenge import OTPChallenge
from app.models.promotion import LoyaltyRule, Promotion, PromotionTarget, PromotionType
from app.models.store_settings import StoreSettings
from app.models.user import User, UserRole
from app.models.user_event import UserEvent
from app.models.user_push_token import UserPushToken


STORE_LATITUDE = Decimal('32.5513470')
STORE_LONGITUDE = Decimal('36.0170050')


@dataclass(frozen=True)
class SeedUser:
    key: str
    phone: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool = True
    is_banned: bool = False
    banned_reason: str | None = None


SEED_USERS = [
    SeedUser('admin', '0790000000', 'Admin', 'Owner', UserRole.ADMIN),
    SeedUser('frontdesk', '0790000001', 'Front', 'Desk', UserRole.FRONTDESK),
    SeedUser('driver_one', '0790000002', 'Dalia', 'Driver', UserRole.DRIVER),
    SeedUser('driver_two', '0790000003', 'Sami', 'Courier', UserRole.DRIVER, is_active=False),
    SeedUser('lina', '0790000101', 'Lina', 'Khaled', UserRole.CLIENT),
    SeedUser('omar', '0790000102', 'Omar', 'Sami', UserRole.CLIENT),
    SeedUser('noor', '0790000103', 'Noor', 'Ali', UserRole.CLIENT),
    SeedUser('hadi', '0790000104', 'Hadi', 'Nasser', UserRole.CLIENT),
    SeedUser('banned', '0790000105', 'Banned', 'User', UserRole.CLIENT, is_banned=True, banned_reason='Abusive behavior'),
]


def money(value: str) -> Decimal:
    return Decimal(value)


def hhmm(value: str):
    return datetime.strptime(value, '%H:%M').time()


async def wipe_database() -> None:
    table_names = ', '.join(f'"{table.name}"' for table in reversed(Base.metadata.sorted_tables))
    async with SessionLocal() as session:
        await session.execute(text(f'TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE'))
        await session.commit()


async def seed_users() -> dict[str, User]:
    async with SessionLocal() as session:
        now = datetime.now(timezone.utc)
        users: dict[str, User] = {}

        for entry in SEED_USERS:
            user = User(
                first_name=entry.first_name,
                last_name=entry.last_name,
                phone_number=entry.phone,
                role=entry.role,
                is_active=entry.is_active,
                is_banned=entry.is_banned,
                banned_at=now if entry.is_banned else None,
                banned_reason=entry.banned_reason,
            )
            session.add(user)
            users[entry.key] = user

        await session.flush()

        session.add_all(
            [
                UserEvent(user_id=users['admin'].id, event_type='user.seeded', actor_user_id=users['admin'].id),
                UserEvent(user_id=users['frontdesk'].id, event_type='staff.provisioned', actor_user_id=users['admin'].id),
                UserEvent(user_id=users['driver_one'].id, event_type='staff.provisioned', actor_user_id=users['admin'].id),
                UserEvent(
                    user_id=users['driver_two'].id,
                    event_type='staff.archived',
                    actor_user_id=users['admin'].id,
                    reason='Demo archived driver account',
                ),
                UserEvent(
                    user_id=users['banned'].id,
                    event_type='user.banned',
                    actor_user_id=users['admin'].id,
                    reason='Abusive behavior',
                ),
                UserPushToken(
                    user_id=users['lina'].id,
                    platform='ios',
                    push_provider='apns',
                    push_token='seed-ios-lina-token',
                    device_id='seed-ios-lina',
                    language='en',
                    is_active=True,
                ),
                UserPushToken(
                    user_id=users['driver_one'].id,
                    platform='android',
                    push_provider='fcm',
                    push_token='seed-android-driver-token',
                    device_id='seed-android-driver',
                    language='ar',
                    is_active=True,
                ),
                UserPushToken(
                    user_id=users['omar'].id,
                    platform='android',
                    push_provider='fcm',
                    push_token='seed-inactive-omar-token',
                    device_id='seed-android-omar',
                    language='ar',
                    is_active=False,
                ),
                OTPChallenge(
                    phone_number='0790000999',
                    code_hash='seeded-demo-code-hash-not-valid',
                    expires_at=now + timedelta(minutes=5),
                    resend_available_at=now + timedelta(seconds=45),
                    attempts_remaining=4,
                    locked_until=None,
                ),
            ]
        )

        await session.commit()
        return users


async def seed_store_and_delivery() -> list[DeliveryDistanceBand]:
    async with SessionLocal() as session:
        session.add(
            StoreSettings(
                store_name='Take A Sip Demo Store',
                store_latitude=STORE_LATITUDE,
                store_longitude=STORE_LONGITUDE,
            )
        )
        bands = [
            DeliveryDistanceBand(min_distance_km=money('0.000'), max_distance_km=money('3.000'), fee_amount=money('1.00'), sort_order=1, is_active=True),
            DeliveryDistanceBand(min_distance_km=money('3.001'), max_distance_km=money('7.500'), fee_amount=money('1.75'), sort_order=2, is_active=True),
            DeliveryDistanceBand(min_distance_km=money('7.501'), max_distance_km=money('15.000'), fee_amount=money('2.75'), sort_order=3, is_active=True),
            DeliveryDistanceBand(min_distance_km=money('15.001'), max_distance_km=money('30.000'), fee_amount=money('5.00'), sort_order=4, is_active=False),
        ]
        session.add_all(bands)
        await session.commit()
        return bands


async def seed_menu() -> dict[str, Section | Item | ItemType | Size | Addon]:
    async with SessionLocal() as session:
        categories = {
            'drinks': Section(name_en='Drinks', name_ar='مشروبات', image_url='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', sort_order=1, is_active=True),
            'snacks': Section(name_en='Snacks', name_ar='سناكات', image_url='https://images.unsplash.com/photo-1621939514649-280e2ee25f60', sort_order=2, is_active=True),
            'household': Section(name_en='Household', name_ar='منزليات', image_url='https://images.unsplash.com/photo-1584556812952-905ffd0c611a', sort_order=3, is_active=True),
            'desserts': Section(name_en='Desserts', name_ar='حلويات', image_url='https://images.unsplash.com/photo-1488477181946-6428a0291777', sort_order=4, is_active=True),
            'seasonal': Section(name_en='Seasonal', name_ar='موسمي', image_url=None, sort_order=5, is_active=False),
        }
        session.add_all(categories.values())
        await session.flush()

        items = {
            'latte': Item(section_id=categories['drinks'].id, name_en='Latte', name_ar='لاتيه', description_en='Espresso with steamed milk.', description_ar='اسبرسو مع حليب مبخر.', image_url='https://images.unsplash.com/photo-1572442388796-11668a67e53d', sort_order=1, is_active=True),
            'water': Item(section_id=categories['drinks'].id, name_en='Still Water', name_ar='مياه معدنية', description_en='Cold bottled water.', description_ar='مياه معدنية باردة.', image_url='https://images.unsplash.com/photo-1523362628745-0c100150b504', sort_order=2, is_active=True),
            'chips': Item(section_id=categories['snacks'].id, name_en='Spicy Lays Chips', name_ar='شيبس ليز حار', description_en='Spicy potato chips bag.', description_ar='كيس شيبس بطاطا حار.', image_url='https://images.unsplash.com/photo-1613919113640-25732ec5e61f', sort_order=1, is_active=True),
            'tissues': Item(section_id=categories['household'].id, name_en='Tissues Box', name_ar='علبة مناديل', description_en='Soft facial tissues box.', description_ar='علبة مناديل ناعمة.', image_url='https://images.unsplash.com/photo-1583947215259-38e31be8751f', sort_order=1, is_active=True),
            'brownie': Item(section_id=categories['desserts'].id, name_en='Chocolate Brownie', name_ar='براوني شوكولاتة', description_en='Warm brownie with chocolate chips.', description_ar='براوني دافئ مع رقائق الشوكولاتة.', image_url='https://images.unsplash.com/photo-1606313564200-e75d5e30476c', sort_order=1, is_active=True),
            'old_cookie': Item(section_id=categories['seasonal'].id, name_en='Ramadan Cookie Box', name_ar='علبة كعك رمضان', description_en='Inactive seasonal demo product.', description_ar='منتج موسمي تجريبي غير نشط.', image_url=None, sort_order=1, is_active=False),
        }
        session.add_all(items.values())
        await session.flush()

        options = {
            'latte_temp': ItemType(item_id=items['latte'].id, name_en='Temperature', name_ar='الحرارة', sort_order=1, is_active=True),
            'water_pack': ItemType(item_id=items['water'].id, name_en='Pack', name_ar='العبوة', sort_order=1, is_active=True),
            'chips_pack': ItemType(item_id=items['chips'].id, name_en='Pack', name_ar='العبوة', sort_order=1, is_active=True),
            'tissues_package': ItemType(item_id=items['tissues'].id, name_en='Package', name_ar='التغليف', sort_order=1, is_active=True),
            'brownie_serving': ItemType(item_id=items['brownie'].id, name_en='Serving', name_ar='التقديم', sort_order=1, is_active=True),
            'cookie_box': ItemType(item_id=items['old_cookie'].id, name_en='Box', name_ar='علبة', sort_order=1, is_active=False),
        }
        session.add_all(options.values())
        await session.flush()

        variants = {
            'latte_hot': Size(type_id=options['latte_temp'].id, name_en='Hot 12oz', name_ar='ساخن 12 أونصة', price=money('3.00'), order_limit=None, sort_order=1, is_active=True),
            'latte_iced': Size(type_id=options['latte_temp'].id, name_en='Iced 16oz', name_ar='بارد 16 أونصة', price=money('3.50'), order_limit=8, sort_order=2, is_active=True),
            'water_single': Size(type_id=options['water_pack'].id, name_en='Single bottle', name_ar='قارورة واحدة', price=money('0.50'), order_limit=24, sort_order=1, is_active=True),
            'chips_bag': Size(type_id=options['chips_pack'].id, name_en='45g bag', name_ar='كيس 45 غرام', price=money('0.75'), order_limit=20, sort_order=1, is_active=True),
            'chips_family': Size(type_id=options['chips_pack'].id, name_en='Family bag', name_ar='كيس عائلي', price=money('1.50'), order_limit=10, sort_order=2, is_active=True),
            'tissues_box': Size(type_id=options['tissues_package'].id, name_en='Single box', name_ar='علبة واحدة', price=money('1.25'), order_limit=12, sort_order=1, is_active=True),
            'brownie_single': Size(type_id=options['brownie_serving'].id, name_en='Single piece', name_ar='قطعة واحدة', price=money('2.20'), order_limit=None, sort_order=1, is_active=True),
            'brownie_box': Size(type_id=options['brownie_serving'].id, name_en='Box of 6', name_ar='علبة 6 قطع', price=money('11.00'), order_limit=5, sort_order=2, is_active=True),
            'cookie_box': Size(type_id=options['cookie_box'].id, name_en='Box of 12', name_ar='علبة 12 قطعة', price=money('8.00'), order_limit=3, sort_order=1, is_active=False),
        }
        session.add_all(variants.values())
        await session.flush()

        addons = {
            'extra_shot': Addon(size_id=variants['latte_hot'].id, name_en='Extra espresso shot', name_ar='شوت اسبرسو إضافي', price=money('0.60'), sort_order=1, is_active=True),
            'oat_milk': Addon(size_id=variants['latte_hot'].id, name_en='Oat milk', name_ar='حليب شوفان', price=money('0.50'), sort_order=2, is_active=True),
            'vanilla': Addon(size_id=variants['latte_iced'].id, name_en='Vanilla syrup', name_ar='شراب فانيلا', price=money('0.40'), sort_order=1, is_active=True),
            'gift_wrap': Addon(size_id=variants['tissues_box'].id, name_en='Gift wrap', name_ar='تغليف هدية', price=money('0.30'), sort_order=1, is_active=True),
            'ice_cream': Addon(size_id=variants['brownie_single'].id, name_en='Vanilla ice cream', name_ar='آيس كريم فانيلا', price=money('0.90'), sort_order=1, is_active=True),
            'inactive_sauce': Addon(size_id=variants['brownie_single'].id, name_en='Inactive sauce', name_ar='صلصة غير نشطة', price=money('0.25'), sort_order=2, is_active=False),
        }
        session.add_all(addons.values())
        await session.flush()

        schedules = [
            MenuSchedule(entity_type='section', entity_id=categories['snacks'].id, start_time=hhmm('09:00'), end_time=hhmm('23:00'), days_of_week=[0, 1, 2, 3, 4, 5, 6], is_active=True),
            MenuSchedule(entity_type='item', entity_id=items['brownie'].id, start_time=hhmm('12:00'), end_time=hhmm('22:00'), days_of_week=[0, 1, 2, 3, 4, 5, 6], is_active=True),
            MenuSchedule(entity_type='size', entity_id=variants['latte_iced'].id, start_time=hhmm('10:00'), end_time=hhmm('23:00'), days_of_week=[0, 1, 2, 3, 4, 5, 6], is_active=True),
            MenuSchedule(entity_type='addon', entity_id=addons['gift_wrap'].id, start_time=hhmm('08:00'), end_time=hhmm('20:00'), days_of_week=[0, 1, 2, 3, 4], is_active=False),
        ]
        session.add_all(schedules)

        await session.commit()
        return {**categories, **items, **options, **variants, **addons}


async def seed_promotions(menu: dict[str, Section | Item | ItemType | Size | Addon]) -> dict[str, Promotion]:
    async with SessionLocal() as session:
        now = datetime.now(timezone.utc)
        loyalty_rule = LoyaltyRule(required_orders=5, reward_type='DISCOUNT', reward_value='15% off next order', is_active=True)
        inactive_rule = LoyaltyRule(required_orders=10, reward_type='GIFT', reward_value='Free seasonal gift', is_active=False)
        session.add_all([loyalty_rule, inactive_rule])
        await session.flush()

        promotions = {
            'first_time': Promotion(title_en='First order 20% off', title_ar='خصم 20٪ على أول طلب', type=PromotionType.FIRST_TIME, value=money('20.00'), starts_at=now - timedelta(days=7), ends_at=now + timedelta(days=30), is_active=True),
            'snacks': Promotion(title_en='Snacks 10% off', title_ar='خصم 10٪ على السناكات', type=PromotionType.TEMPORARY, value=money('10.00'), starts_at=now - timedelta(days=2), ends_at=now + timedelta(days=14), is_active=True),
            'loyalty': Promotion(title_en='Loyal customer reward', title_ar='مكافأة العميل الدائم', type=PromotionType.LOYALTY, value=money('15.00'), starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=60), is_active=True, required_completed_orders=5, loyalty_rule_id=loyalty_rule.id),
            'buy_get': Promotion(title_en='Buy 2 drinks, get brownie free', title_ar='اشتر مشروبين واحصل على براوني مجاناً', type=PromotionType.BUY_N_GET_M_FREE, value=money('100.00'), starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=10), is_active=True, buy_quantity=2, free_quantity=1),
            'expired': Promotion(title_en='Expired demo promo', title_ar='عرض تجريبي منتهي', type=PromotionType.TEMPORARY, value=money('5.00'), starts_at=now - timedelta(days=30), ends_at=now - timedelta(days=1), is_active=False),
        }
        session.add_all(promotions.values())
        await session.flush()

        targets = [
            PromotionTarget(promotion_id=promotions['snacks'].id, target_group='scope', entity_type='section', entity_id=menu['snacks'].id),
            PromotionTarget(promotion_id=promotions['snacks'].id, target_group='scope', entity_type='size', entity_id=menu['chips_bag'].id),
            PromotionTarget(promotion_id=promotions['buy_get'].id, target_group='buy', entity_type='section', entity_id=menu['drinks'].id),
            PromotionTarget(promotion_id=promotions['buy_get'].id, target_group='free', entity_type='item', entity_id=menu['brownie'].id),
        ]
        session.add_all(targets)
        await session.commit()
        return promotions


def line_total(price: Decimal, quantity: int, addons: list[tuple[Addon, Decimal]]) -> Decimal:
    return (price + sum((addon_price for _, addon_price in addons), Decimal('0.00'))) * quantity


async def seed_orders(
    users: dict[str, User],
    menu: dict[str, Section | Item | ItemType | Size | Addon],
    promotions: dict[str, Promotion],
    bands: list[DeliveryDistanceBand],
) -> None:
    async with SessionLocal() as session:
        now = datetime.now(timezone.utc)
        order_specs = [
            {
                'number': 1001,
                'user': users['lina'],
                'status': OrderStatus.COMPLETED,
                'type': OrderType.PICKUP,
                'created_at': now - timedelta(days=8),
                'completed_at': now - timedelta(days=8, minutes=-18),
                'discount': money('0.70'),
                'promotion': promotions['first_time'],
                'lines': [('latte_hot', 'latte', 1, ['extra_shot']), ('brownie_single', 'brownie', 1, [])],
                'rating': (5, 'Loved the latte.'),
            },
            {
                'number': 1002,
                'user': users['omar'],
                'status': OrderStatus.ACCEPTED,
                'type': OrderType.DELIVERY,
                'address': 'Abdali Boulevard, Amman',
                'lat': money('31.9619000'),
                'lng': money('35.9101000'),
                'distance': money('1.250'),
                'delivery_fee': bands[0].fee_amount,
                'band': bands[0],
                'created_at': now - timedelta(hours=3),
                'discount': money('0.15'),
                'promotion': promotions['snacks'],
                'lines': [('chips_bag', 'chips', 3, [])],
                'assigned_driver': None,
            },
            {
                'number': 1003,
                'user': users['noor'],
                'status': OrderStatus.ASSIGNED,
                'type': OrderType.DELIVERY,
                'address': 'Sweifieh, Amman',
                'lat': money('31.9584000'),
                'lng': money('35.8606000'),
                'distance': money('5.400'),
                'delivery_fee': bands[1].fee_amount,
                'band': bands[1],
                'created_at': now - timedelta(hours=1, minutes=30),
                'assigned_at': now - timedelta(hours=1),
                'assigned_driver': users['driver_one'],
                'discount': money('0.00'),
                'promotion': None,
                'lines': [('tissues_box', 'tissues', 2, ['gift_wrap'])],
            },
            {
                'number': 1004,
                'user': users['hadi'],
                'status': OrderStatus.OUT_FOR_DELIVERY,
                'type': OrderType.DELIVERY,
                'address': 'Jabal Amman',
                'lat': money('31.9499000'),
                'lng': money('35.9275000'),
                'distance': money('2.200'),
                'delivery_fee': bands[0].fee_amount,
                'band': bands[0],
                'created_at': now - timedelta(minutes=50),
                'assigned_at': now - timedelta(minutes=35),
                'assigned_driver': users['driver_one'],
                'discount': money('0.00'),
                'promotion': None,
                'lines': [('water_single', 'water', 6, [])],
            },
            {
                'number': 1005,
                'user': users['lina'],
                'status': OrderStatus.DELIVERED,
                'type': OrderType.DELIVERY,
                'address': 'Dabouq, Amman',
                'lat': money('31.9990000'),
                'lng': money('35.8320000'),
                'distance': money('9.800'),
                'delivery_fee': bands[2].fee_amount,
                'band': bands[2],
                'created_at': now - timedelta(days=1, hours=1),
                'assigned_at': now - timedelta(days=1, minutes=45),
                'completed_at': now - timedelta(days=1, minutes=5),
                'assigned_driver': users['driver_one'],
                'discount': money('0.00'),
                'promotion': None,
                'lines': [('latte_iced', 'latte', 2, ['vanilla'])],
            },
            {
                'number': 1006,
                'user': users['omar'],
                'status': OrderStatus.CANCELLED,
                'type': OrderType.PICKUP,
                'created_at': now - timedelta(days=2),
                'discount': money('0.00'),
                'promotion': None,
                'lines': [('brownie_box', 'brownie', 1, [])],
            },
            {
                'number': 1007,
                'user': users['noor'],
                'status': OrderStatus.NEW,
                'type': OrderType.PICKUP,
                'created_at': now - timedelta(minutes=12),
                'discount': money('0.00'),
                'promotion': None,
                'lines': [('chips_family', 'chips', 1, [])],
            },
        ]

        for spec in order_specs:
            subtotal = Decimal('0.00')
            order = Order(
                order_number=spec['number'],
                user_id=spec['user'].id,
                status=spec['status'],
                order_type=spec['type'],
                delivery_address=spec.get('address'),
                delivery_latitude=spec.get('lat'),
                delivery_longitude=spec.get('lng'),
                delivery_distance_km=spec.get('distance'),
                delivery_fee=spec.get('delivery_fee'),
                delivery_distance_band_id=spec.get('band').id if spec.get('band') else None,
                discount_amount=spec['discount'],
                applied_promotion_id=spec['promotion'].id if spec.get('promotion') else None,
                applied_promotion_title_en=spec['promotion'].title_en if spec.get('promotion') else None,
                applied_promotion_title_ar=spec['promotion'].title_ar if spec.get('promotion') else None,
                assigned_driver_id=spec.get('assigned_driver').id if spec.get('assigned_driver') else None,
                assigned_at=spec.get('assigned_at'),
                completed_at=spec.get('completed_at'),
                created_at=spec['created_at'],
                notes='Seeded demo order',
            )
            session.add(order)
            await session.flush()

            for variant_key, product_key, quantity, addon_keys in spec['lines']:
                variant = menu[variant_key]
                product = menu[product_key]
                addons = [(menu[key], menu[key].price) for key in addon_keys]
                subtotal += line_total(variant.price, quantity, addons)
                order_item = OrderItem(
                    order_id=order.id,
                    item_id_snapshot=product.id,
                    size_id_snapshot=variant.id,
                    item_name_snapshot=product.name_en,
                    size_snapshot=variant.name_en,
                    price_snapshot=variant.price,
                    quantity=quantity,
                )
                session.add(order_item)
                await session.flush()
                for addon, addon_price in addons:
                    session.add(
                        OrderItemAddon(
                            order_item_id=order_item.id,
                            addon_id_snapshot=addon.id,
                            addon_name_snapshot=addon.name_en,
                            price_snapshot=addon_price,
                        )
                    )

            order.subtotal_amount = subtotal
            order.total_amount = subtotal - spec['discount'] + (spec.get('delivery_fee') or Decimal('0.00'))
            session.add(OrderEvent(order_id=order.id, event_type='order.created', actor_user_id=spec['user'].id, created_at=spec['created_at']))
            if spec.get('assigned_driver'):
                session.add(OrderEvent(order_id=order.id, event_type='order.assigned', actor_user_id=users['frontdesk'].id, metadata_json={'driver_id': str(spec['assigned_driver'].id)}, created_at=spec.get('assigned_at') or spec['created_at']))
            if spec['status'] in {OrderStatus.DELIVERED, OrderStatus.COMPLETED}:
                session.add(OrderEvent(order_id=order.id, event_type='order.completed', actor_user_id=spec['user'].id, created_at=spec.get('completed_at') or spec['created_at']))
            if spec['status'] == OrderStatus.CANCELLED:
                session.add(OrderEvent(order_id=order.id, event_type='order.cancelled', actor_user_id=users['frontdesk'].id, metadata_json={'reason': 'Customer changed mind'}, created_at=spec['created_at'] + timedelta(minutes=7)))
            if spec.get('rating'):
                stars, note = spec['rating']
                session.add(OrderRating(order_id=order.id, user_id=spec['user'].id, stars=stars, note=note))

        await session.commit()


async def assert_seed_counts() -> dict[str, int]:
    async with SessionLocal() as session:
        models = {
            'users': User,
            'categories': Section,
            'products': Item,
            'options': ItemType,
            'variants': Size,
            'addons': Addon,
            'schedules': MenuSchedule,
            'promotions': Promotion,
            'promotion_targets': PromotionTarget,
            'loyalty_rules': LoyaltyRule,
            'delivery_bands': DeliveryDistanceBand,
            'orders': Order,
            'order_events': OrderEvent,
            'ratings': OrderRating,
            'push_tokens': UserPushToken,
        }
        counts = {}
        for name, model in models.items():
            counts[name] = len((await session.execute(select(model))).scalars().all())
        return counts


async def run_seed(wipe: bool) -> None:
    if wipe:
        await wipe_database()
        print('Database tables wiped.')

    users = await seed_users()
    bands = await seed_store_and_delivery()
    menu = await seed_menu()
    promotions = await seed_promotions(menu)
    await seed_orders(users, menu, promotions, bands)
    counts = await assert_seed_counts()

    print('Full seed completed:')
    for key, value in counts.items():
        print(f'- {key}: {value}')
    print('Demo logins use OTP flow with these phone numbers:')
    print('- Admin: 0790000000')
    print('- Frontdesk: 0790000001')
    print('- Driver: 0790000002')
    print('- Client: 0790000101')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Wipe and seed complete demo data for Take A Sip.')
    parser.add_argument('--wipe', '--reset', action='store_true', help='Truncate all app tables before seeding.')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    asyncio.run(run_seed(wipe=args.wipe))
