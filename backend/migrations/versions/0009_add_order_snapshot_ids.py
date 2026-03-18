"""Add order snapshot ID fields for resilient reorder

Revision ID: 0009_add_order_snapshot_ids
Revises: 0008_phase7_operational_indexes
Create Date: 2026-03-18 04:40:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0009_add_order_snapshot_ids'
down_revision: str | None = '0008_phase7_operational_indexes'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('order_items', sa.Column('item_id_snapshot', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('order_items', sa.Column('size_id_snapshot', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('order_item_addons', sa.Column('addon_id_snapshot', postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key(
        'fk_order_items_item_id_snapshot_items',
        'order_items',
        'items',
        ['item_id_snapshot'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_order_items_size_id_snapshot_sizes',
        'order_items',
        'sizes',
        ['size_id_snapshot'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_order_item_addons_addon_id_snapshot_addons',
        'order_item_addons',
        'addons',
        ['addon_id_snapshot'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_order_item_addons_addon_id_snapshot_addons', 'order_item_addons', type_='foreignkey')
    op.drop_constraint('fk_order_items_size_id_snapshot_sizes', 'order_items', type_='foreignkey')
    op.drop_constraint('fk_order_items_item_id_snapshot_items', 'order_items', type_='foreignkey')

    op.drop_column('order_item_addons', 'addon_id_snapshot')
    op.drop_column('order_items', 'size_id_snapshot')
    op.drop_column('order_items', 'item_id_snapshot')
