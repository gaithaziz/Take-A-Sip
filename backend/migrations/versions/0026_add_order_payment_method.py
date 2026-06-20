"""Add order payment method

Revision ID: 0026_add_order_payment_method
Revises: 0025_add_user_refresh_tokens
Create Date: 2026-06-20 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0026_add_order_payment_method'
down_revision: str | None = '0025_add_user_refresh_tokens'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column('payment_method', sa.String(length=16), server_default='CASH', nullable=False),
    )
    op.create_check_constraint(
        'ck_orders_payment_method',
        'orders',
        "payment_method IN ('CASH', 'CARD')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_orders_payment_method', 'orders', type_='check')
    op.drop_column('orders', 'payment_method')
