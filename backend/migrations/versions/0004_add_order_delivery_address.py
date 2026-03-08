"""Add delivery_address to orders

Revision ID: 0004_add_order_delivery_address
Revises: 0003_add_menu_image_urls
Create Date: 2026-03-09 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_add_order_delivery_address'
down_revision: str | None = '0003_add_menu_image_urls'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('delivery_address', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'delivery_address')
