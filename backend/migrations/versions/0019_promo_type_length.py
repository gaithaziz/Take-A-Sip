"""Expand promotion type length for buy-get offers

Revision ID: 0019_promo_type_length
Revises: 0018_size_order_limit
Create Date: 2026-05-09 00:00:01
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0019_promo_type_length'
down_revision: str | None = '0018_size_order_limit'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column('promotions', 'type', type_=sa.String(length=32), existing_type=sa.String(length=10), nullable=False)


def downgrade() -> None:
    op.execute("UPDATE promotions SET type = 'TEMPORARY' WHERE type IN ('BUY_N_GET_M_FREE', 'FREE_DELIVERY_ABOVE_AMOUNT', 'FIRST_TIME_FREE_ITEM')")
    op.alter_column('promotions', 'type', type_=sa.String(length=10), existing_type=sa.String(length=32), nullable=False)
