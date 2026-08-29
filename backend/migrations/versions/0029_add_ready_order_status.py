"""Add READY order status

Revision ID: 0029_add_ready_order_status
Revises: 0028_add_store_rules
Create Date: 2026-08-09 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0029_add_ready_order_status'
down_revision: str | None = '0028_add_store_rules'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


new_order_status = sa.Enum(
    'NEW',
    'ACCEPTED',
    'ASSIGNED',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    name='order_status',
    native_enum=False,
)
old_order_status = sa.Enum(
    'NEW',
    'ACCEPTED',
    'ASSIGNED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    name='order_status',
    native_enum=False,
)


def upgrade() -> None:
    op.alter_column('orders', 'status', type_=new_order_status, existing_type=sa.String(length=16))


def downgrade() -> None:
    op.execute("UPDATE orders SET status = 'ASSIGNED' WHERE status = 'READY'")
    op.alter_column('orders', 'status', type_=old_order_status, existing_type=sa.String(length=16))
