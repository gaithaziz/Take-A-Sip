import argparse
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, func, select

from app.core.database import SessionLocal
from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size
from app.models.order import Order, OrderEvent, OrderItem, OrderItemAddon, OrderStatus, OrderType
from app.models.promotion import LoyaltyRule, Promotion, PromotionType
from app.models.user import User, UserRole


@dataclass
class SeedUser:
    phone: str
    first_name: str
    last_name: str
    role: UserRole
    is_banned: bool = False
    banned_reason: str | None = None


SEED_USERS: list[SeedUser] = [
    SeedUser(phone='0790000000', first_name='Admin', last_name='Owner', role=UserRole.ADMIN),
    SeedUser(phone='0790000001', first_name='Front', last_name='Desk', role=UserRole.FRONTDESK),
    SeedUser(phone='0790000101', first_name='Lina', last_name='Khaled', role=UserRole.CLIENT),
    SeedUser(phone='0790000102', first_name='Omar', last_name='Sami', role=UserRole.CLIENT),
    SeedUser(phone='0790000103', first_name='Noor', last_name='Ali', role=UserRole.CLIENT),
    SeedUser(phone='0790000104', first_name='Hadi', last_name='Nasser', role=UserRole.CLIENT),
    SeedUser(
        phone='0790000105',
        first_name='Banned',
        last_name='User',
        role=UserRole.CLIENT,
        is_banned=True,
        banned_reason='Fraudulent activity',
    ),
]


async def reset_seeded_data() -> None:
    async with SessionLocal() as session:
        await session.execute(delete(OrderEvent))
        await session.execute(delete(OrderItemAddon))
        await session.execute(delete(OrderItem))
        await session.execute(delete(Order))
        await session.execute(delete(MenuSchedule))
        await session.execute(delete(Addon))
        await session.execute(delete(Size))
        await session.execute(delete(ItemType))
        await session.execute(delete(Item))
        await session.execute(delete(Section))
        await session.execute(delete(Promotion))
        await session.execute(delete(LoyaltyRule))

        phones = [entry.phone for entry in SEED_USERS]
        users = (await session.execute(select(User).where(User.phone_number.in_(phones)))).scalars().all()
        for user in users:
            await session.delete(user)
        await session.commit()


async def upsert_users() -> dict[str, User]:
    async with SessionLocal() as session:
        mapped: dict[str, User] = {}
        now = datetime.now(timezone.utc)

        for entry in SEED_USERS:
            result = await session.execute(select(User).where(User.phone_number == entry.phone))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    first_name=entry.first_name,
                    last_name=entry.last_name,
                    phone_number=entry.phone,
                    role=entry.role,
                    is_active=True,
                    is_banned=entry.is_banned,
                    banned_reason=entry.banned_reason,
                    banned_at=now if entry.is_banned else None,
                )
                session.add(user)
            else:
                user.first_name = entry.first_name
                user.last_name = entry.last_name
                user.role = entry.role
                user.is_active = True
                user.is_banned = entry.is_banned
                user.banned_reason = entry.banned_reason
                user.banned_at = now if entry.is_banned else None
            mapped[entry.phone] = user

        await session.commit()
        for user in mapped.values():
            await session.refresh(user)
        return mapped


async def seed_menu_promotions_and_loyalty() -> None:
    async with SessionLocal() as session:
        coffee = Section(
            name_en='Coffee',
            name_ar='قهوة',
            image_url='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
            sort_order=1,
            is_active=True,
        )
        breakfast = Section(
            name_en='Breakfast',
            name_ar='فطور',
            image_url='https://images.unsplash.com/photo-1494597564530-871f2b93ac55',
            sort_order=2,
            is_active=True,
        )
        desserts = Section(
            name_en='Desserts',
            name_ar='حلويات',
            image_url='https://images.unsplash.com/photo-1488477181946-6428a0291777',
            sort_order=3,
            is_active=True,
        )
        session.add_all([coffee, breakfast, desserts])
        await session.flush()

        latte = Item(
            section_id=coffee.id,
            name_en='Latte',
            name_ar='لاتيه',
            description_en='Espresso with steamed milk',
            description_ar='اسبرسو مع حليب مبخر',
            image_url='https://images.unsplash.com/photo-1572442388796-11668a67e53d',
            sort_order=1,
            is_active=True,
        )
        cappuccino = Item(
            section_id=coffee.id,
            name_en='Cappuccino',
            name_ar='كابتشينو',
            description_en='Rich foam and espresso',
            description_ar='اسبرسو مع رغوة كثيفة',
            image_url='https://images.unsplash.com/photo-1461023058943-07fcbe16d735',
            sort_order=2,
            is_active=True,
        )
        croissant = Item(
            section_id=breakfast.id,
            name_en='Butter Croissant',
            name_ar='كرواسون زبدة',
            description_en='Freshly baked croissant',
            description_ar='كرواسون طازج',
            image_url='https://images.unsplash.com/photo-1555507036-ab794f4ade6a',
            sort_order=1,
            is_active=True,
        )
        brownie = Item(
            section_id=desserts.id,
            name_en='Chocolate Brownie',
            name_ar='براوني شوكولاتة',
            description_en='Warm brownie with chocolate chips',
            description_ar='براوني دافئ مع رقائق الشوكولاتة',
            image_url='https://images.unsplash.com/photo-1606313564200-e75d5e30476c',
            sort_order=1,
            is_active=True,
        )
        session.add_all([latte, cappuccino, croissant, brownie])
        await session.flush()

        hot = ItemType(item_id=latte.id, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
        iced = ItemType(item_id=latte.id, name_en='Iced', name_ar='بارد', sort_order=2, is_active=True)
        cap_hot = ItemType(item_id=cappuccino.id, name_en='Hot', name_ar='ساخن', sort_order=1, is_active=True)
        cro_type = ItemType(item_id=croissant.id, name_en='Classic', name_ar='كلاسيك', sort_order=1, is_active=True)
        brownie_type = ItemType(item_id=brownie.id, name_en='Standard', name_ar='عادي', sort_order=1, is_active=True)
        session.add_all([hot, iced, cap_hot, cro_type, brownie_type])
        await session.flush()

        sizes = [
            Size(type_id=hot.id, name_en='Small', name_ar='صغير', price=Decimal('2.50'), sort_order=1, is_active=True),
            Size(type_id=hot.id, name_en='Medium', name_ar='وسط', price=Decimal('3.00'), sort_order=2, is_active=True),
            Size(type_id=hot.id, name_en='Large', name_ar='كبير', price=Decimal('3.50'), sort_order=3, is_active=True),
            Size(type_id=iced.id, name_en='Medium', name_ar='وسط', price=Decimal('3.25'), sort_order=1, is_active=True),
            Size(type_id=cap_hot.id, name_en='Medium', name_ar='وسط', price=Decimal('3.10'), sort_order=1, is_active=True),
            Size(type_id=cro_type.id, name_en='Single', name_ar='قطعة', price=Decimal('1.80'), sort_order=1, is_active=True),
            Size(type_id=brownie_type.id, name_en='Single', name_ar='قطعة', price=Decimal('2.20'), sort_order=1, is_active=True),
        ]
        session.add_all(sizes)
        await session.flush()

        size_by_key = {
            'latte_small': sizes[0],
            'latte_medium': sizes[1],
            'latte_large': sizes[2],
            'latte_iced_medium': sizes[3],
            'cap_medium': sizes[4],
            'croissant_single': sizes[5],
            'brownie_single': sizes[6],
        }

        addons = [
            Addon(
                size_id=size_by_key['latte_small'].id,
                name_en='Extra Shot',
                name_ar='شوت إضافي',
                price=Decimal('0.60'),
                sort_order=1,
                is_active=True,
            ),
            Addon(
                size_id=size_by_key['latte_small'].id,
                name_en='Vanilla Syrup',
                name_ar='شراب فانيلا',
                price=Decimal('0.40'),
                sort_order=2,
                is_active=True,
            ),
            Addon(
                size_id=size_by_key['cap_medium'].id,
                name_en='Oat Milk',
                name_ar='حليب شوفان',
                price=Decimal('0.50'),
                sort_order=1,
                is_active=True,
            ),
        ]
        session.add_all(addons)

        schedule_breakfast = MenuSchedule(
            entity_type='section',
            entity_id=breakfast.id,
            start_time=datetime.strptime('07:00', '%H:%M').time(),
            end_time=datetime.strptime('11:00', '%H:%M').time(),
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            is_active=True,
        )
        schedule_dessert = MenuSchedule(
            entity_type='section',
            entity_id=desserts.id,
            start_time=datetime.strptime('12:00', '%H:%M').time(),
            end_time=datetime.strptime('23:00', '%H:%M').time(),
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            is_active=True,
        )
        session.add_all([schedule_breakfast, schedule_dessert])

        now = datetime.now(timezone.utc)
        promotions = [
            Promotion(
                title_en='10% Off Iced Drinks',
                title_ar='خصم 10٪ على المشروبات الباردة',
                type=PromotionType.TEMPORARY,
                value=Decimal('10.00'),
                starts_at=now - timedelta(days=1),
                ends_at=now + timedelta(days=6),
                is_active=True,
            ),
            Promotion(
                title_en='First Order 20% Off',
                title_ar='خصم 20٪ على أول طلب',
                type=PromotionType.FIRST_TIME,
                value=Decimal('20.00'),
                starts_at=now - timedelta(days=15),
                ends_at=now + timedelta(days=45),
                is_active=True,
            ),
            Promotion(
                title_en='Weekend Dessert Deal',
                title_ar='عرض الحلويات في عطلة نهاية الأسبوع',
                type=PromotionType.TEMPORARY,
                value=Decimal('15.00'),
                starts_at=now - timedelta(days=2),
                ends_at=now + timedelta(days=12),
                is_active=False,
            ),
        ]
        session.add_all(promotions)

        rules = [
            LoyaltyRule(required_orders=5, reward_type='FREE_ITEM', reward_value='Free brownie', is_active=True),
            LoyaltyRule(required_orders=10, reward_type='DISCOUNT', reward_value='20% off next order', is_active=True),
        ]
        session.add_all(rules)

        await session.commit()


async def seed_orders(users: dict[str, User]) -> None:
    async with SessionLocal() as session:
        max_number = (await session.execute(select(func.max(Order.order_number)))).scalar_one_or_none() or 0
        counter = int(max_number)

        def next_number() -> int:
            nonlocal counter
            counter += 1
            return counter

        now = datetime.now(timezone.utc)
        addon_vanilla_price = Decimal('0.40')
        addon_shot_price = Decimal('0.60')

        order_specs = [
            {
                'user': users['0790000101'],
                'status': OrderStatus.COMPLETED,
                'type': OrderType.PICKUP,
                'created_at': now - timedelta(days=1, hours=2),
                'items': [
                    {
                        'name': 'Latte',
                        'size': 'Medium',
                        'price': Decimal('3.00'),
                        'qty': 1,
                        'addons': [('Vanilla Syrup', addon_vanilla_price)],
                    }
                ],
            },
            {
                'user': users['0790000102'],
                'status': OrderStatus.ACCEPTED,
                'type': OrderType.DELIVERY,
                'address': 'Abdali, Amman',
                'created_at': now - timedelta(hours=4),
                'items': [
                    {
                        'name': 'Cappuccino',
                        'size': 'Medium',
                        'price': Decimal('3.10'),
                        'qty': 2,
                        'addons': [('Extra Shot', addon_shot_price)],
                    }
                ],
            },
            {
                'user': users['0790000103'],
                'status': OrderStatus.NEW,
                'type': OrderType.PICKUP,
                'created_at': now - timedelta(minutes=45),
                'items': [
                    {
                        'name': 'Chocolate Brownie',
                        'size': 'Single',
                        'price': Decimal('2.20'),
                        'qty': 1,
                        'addons': [],
                    }
                ],
            },
            {
                'user': users['0790000104'],
                'status': OrderStatus.CANCELLED,
                'type': OrderType.DELIVERY,
                'address': 'Sweifieh, Amman',
                'created_at': now - timedelta(days=3, hours=1),
                'items': [
                    {
                        'name': 'Butter Croissant',
                        'size': 'Single',
                        'price': Decimal('1.80'),
                        'qty': 2,
                        'addons': [],
                    }
                ],
            },
        ]

        for spec in order_specs:
            order = Order(
                order_number=next_number(),
                user_id=spec['user'].id,
                status=spec['status'],
                order_type=spec['type'],
                delivery_address=spec.get('address'),
                notes='Seeded demo order',
                created_at=spec['created_at'],
            )
            session.add(order)
            await session.flush()

            for item_data in spec['items']:
                order_item = OrderItem(
                    order_id=order.id,
                    item_name_snapshot=item_data['name'],
                    size_snapshot=item_data['size'],
                    price_snapshot=item_data['price'],
                    quantity=item_data['qty'],
                )
                session.add(order_item)
                await session.flush()
                for addon_name, addon_price in item_data['addons']:
                    session.add(
                        OrderItemAddon(
                            order_item_id=order_item.id,
                            addon_name_snapshot=addon_name,
                            price_snapshot=addon_price,
                        )
                    )

            session.add(
                OrderEvent(
                    order_id=order.id,
                    event_type=f'ORDER_{spec["status"].value}',
                    created_at=spec['created_at'],
                )
            )

        await session.commit()


async def run_seed(reset: bool) -> None:
    if reset:
        await reset_seeded_data()
        print('Existing seedable data reset.')

    users = await upsert_users()
    await seed_menu_promotions_and_loyalty()
    await seed_orders(users)

    print('Full seed completed:')
    print('- Users (admin/frontdesk/clients) created or updated')
    print('- Menu hierarchy + schedules created')
    print('- Promotions + loyalty rules created')
    print('- Sample orders/events created')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Seed full demo data for Take A Sip.')
    parser.add_argument(
        '--reset',
        action='store_true',
        help='Delete seedable records first for deterministic reseeding.',
    )
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    asyncio.run(run_seed(reset=args.reset))
