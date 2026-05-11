"""Add free delivery benefit modes

Revision ID: 0021_free_delivery_modes
Revises: 0020_add_row_level_security
Create Date: 2026-05-12 00:00:01
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0021_free_delivery_modes'
down_revision: str | None = '0020_add_row_level_security'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('promotions', sa.Column('free_delivery_mode', sa.String(length=32), nullable=True))
    op.add_column('promotions', sa.Column('free_delivery_discount_percent', sa.Numeric(5, 2), nullable=True))
    op.execute(
        """
        UPDATE promotions
        SET free_delivery_mode = 'FREE_DELIVERY'
        WHERE type = 'FREE_DELIVERY_ABOVE_AMOUNT' AND free_delivery_mode IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column('promotions', 'free_delivery_discount_percent')
    op.drop_column('promotions', 'free_delivery_mode')
