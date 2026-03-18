"""Add DELIVERED order status

Revision ID: 0010_add_delivered_order_status
Revises: 0009_add_order_snapshot_ids
Create Date: 2026-03-18 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0010_add_delivered_order_status'
down_revision: str | None = '0009_add_order_snapshot_ids'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


new_order_status = sa.Enum(
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
old_order_status = sa.Enum(
    'NEW',
    'ACCEPTED',
    'ASSIGNED',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
    name='order_status',
    native_enum=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    new_order_status.create(bind, checkfirst=True)
    op.alter_column('orders', 'status', type_=new_order_status, existing_type=sa.String(length=16))


def downgrade() -> None:
    op.execute("UPDATE orders SET status = 'COMPLETED' WHERE status = 'DELIVERED'")
    bind = op.get_bind()
    old_order_status.create(bind, checkfirst=True)
    op.alter_column('orders', 'status', type_=old_order_status, existing_type=sa.String(length=16))
