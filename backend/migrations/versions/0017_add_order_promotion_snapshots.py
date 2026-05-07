"""Add order promotion and total snapshots

Revision ID: 0017_add_order_promotion_snapshots
Revises: 0016_add_otp_challenges
Create Date: 2026-05-07 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '0017_add_order_promotion_snapshots'
down_revision: str | None = '0016_add_otp_challenges'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('subtotal_amount', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('discount_amount', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('total_amount', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('applied_promotion_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('orders', sa.Column('applied_promotion_title_en', sa.String(length=200), nullable=True))
    op.add_column('orders', sa.Column('applied_promotion_title_ar', sa.String(length=200), nullable=True))
    op.create_foreign_key(
        op.f('fk_orders_applied_promotion_id_promotions'),
        'orders',
        'promotions',
        ['applied_promotion_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(op.f('fk_orders_applied_promotion_id_promotions'), 'orders', type_='foreignkey')
    op.drop_column('orders', 'applied_promotion_title_ar')
    op.drop_column('orders', 'applied_promotion_title_en')
    op.drop_column('orders', 'applied_promotion_id')
    op.drop_column('orders', 'total_amount')
    op.drop_column('orders', 'discount_amount')
    op.drop_column('orders', 'subtotal_amount')
