"""Add optional size order limit

Revision ID: 0018_size_order_limit
Revises: 0017_order_promo_snapshots
Create Date: 2026-05-09 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0018_size_order_limit'
down_revision: str | None = '0017_order_promo_snapshots'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('sizes', sa.Column('order_limit', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('sizes', 'order_limit')
