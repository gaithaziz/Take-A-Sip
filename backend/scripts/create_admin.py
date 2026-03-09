import argparse
import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User, UserRole


async def upsert_admin(phone_number: str, first_name: str, last_name: str) -> None:
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.phone_number == phone_number))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                role=UserRole.ADMIN,
                is_active=True,
                is_banned=False,
            )
            session.add(user)
            action = 'created'
        else:
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.role = UserRole.ADMIN
            user.is_active = True
            user.is_banned = False
            user.banned_reason = None
            user.banned_at = None
            action = 'updated'

        await session.commit()
        print(f'Admin user {action}: {user.phone_number}')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Create or promote a phone user to ADMIN role.')
    parser.add_argument('--phone', required=True, help='Phone number, example: 0790000000')
    parser.add_argument('--first-name', default='Admin', help='First name to set')
    parser.add_argument('--last-name', default='Owner', help='Last name to set')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    asyncio.run(upsert_admin(args.phone.strip(), args.first_name.strip(), args.last_name.strip()))
