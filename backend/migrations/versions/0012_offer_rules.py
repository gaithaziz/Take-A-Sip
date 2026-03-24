"""Add order eligibility and buy-get fields to promotions

Revision ID: 0012_offer_rules
Revises: 0011_promo_targets
Create Date: 2026-03-24 00:00:01
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0012_offer_rules'
down_revision: str | None = '0011_promo_targets'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('promotions', sa.Column('required_completed_orders', sa.Integer(), nullable=True))
    op.add_column('promotions', sa.Column('buy_quantity', sa.Integer(), nullable=True))
    op.add_column('promotions', sa.Column('free_quantity', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('promotions', 'free_quantity')
    op.drop_column('promotions', 'buy_quantity')
    op.drop_column('promotions', 'required_completed_orders')
