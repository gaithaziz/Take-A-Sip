"""Add store ordering availability

Revision ID: 0027_add_ordering_availability
Revises: 0026_add_order_payment_method
Create Date: 2026-08-07 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = '0027_add_ordering_availability'
down_revision: str | None = '0026_add_order_payment_method'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'store_settings',
        sa.Column('ordering_enabled', sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        'store_settings',
        sa.Column('ordering_updated_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f('fk_store_settings_ordering_updated_by_user_id_users'),
        'store_settings',
        'users',
        ['ordering_updated_by_user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f('fk_store_settings_ordering_updated_by_user_id_users'),
        'store_settings',
        type_='foreignkey',
    )
    op.drop_column('store_settings', 'ordering_updated_by_user_id')
    op.drop_column('store_settings', 'ordering_enabled')
