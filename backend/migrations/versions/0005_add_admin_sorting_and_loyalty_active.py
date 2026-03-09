"""Add sort_order to menu entities and is_active to loyalty rules

Revision ID: 0005_admin_sort_loyalty_active
Revises: 0004_add_order_delivery_address
Create Date: 2026-03-09 02:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_admin_sort_loyalty_active'
down_revision: str | None = '0004_add_order_delivery_address'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('items', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('item_types', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('sizes', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('addons', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('loyalty_rules', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))

    op.alter_column('items', 'sort_order', server_default=None)
    op.alter_column('item_types', 'sort_order', server_default=None)
    op.alter_column('sizes', 'sort_order', server_default=None)
    op.alter_column('addons', 'sort_order', server_default=None)
    op.alter_column('loyalty_rules', 'is_active', server_default=None)


def downgrade() -> None:
    op.drop_column('loyalty_rules', 'is_active')
    op.drop_column('addons', 'sort_order')
    op.drop_column('sizes', 'sort_order')
    op.drop_column('item_types', 'sort_order')
    op.drop_column('items', 'sort_order')
