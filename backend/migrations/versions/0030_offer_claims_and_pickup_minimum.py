"""Add durable first-offer claims and pickup minimum

Revision ID: 0030_offer_claims_pickup_min
Revises: 0029_add_ready_order_status
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = '0030_offer_claims_pickup_min'
down_revision: str | None = '0029_add_ready_order_status'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'first_time_offer_claims',
        sa.Column('phone_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('reason', sa.String(length=32), nullable=False),
        sa.Column('source_order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ['source_order_id'],
            ['orders.id'],
            name='fk_first_time_offer_claims_source_order_id_orders',
            ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('phone_fingerprint', name='pk_first_time_offer_claims'),
    )
    op.add_column(
        'store_settings',
        sa.Column('minimum_pickup_order_amount', sa.Numeric(10, 2), server_default='0.00', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('store_settings', 'minimum_pickup_order_amount')
    op.drop_table('first_time_offer_claims')
