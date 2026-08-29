"""Add store rules and bilingual order snapshots

Revision ID: 0028_add_store_rules
Revises: 0027_add_ordering_availability
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '0028_add_store_rules'
down_revision: str | None = '0027_add_ordering_availability'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('store_settings', sa.Column('working_hours', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column(
        'store_settings',
        sa.Column('minimum_delivery_order_amount', sa.Numeric(10, 2), server_default='0.00', nullable=False),
    )
    op.add_column('order_items', sa.Column('item_name_ar_snapshot', sa.String(150), nullable=True))
    op.add_column('order_items', sa.Column('item_type_id_snapshot', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_order_items_item_type_id_snapshot_item_types',
        'order_items',
        'item_types',
        ['item_type_id_snapshot'],
        ['id'],
        ondelete='SET NULL',
    )
    op.add_column('order_items', sa.Column('item_type_name_snapshot', sa.String(150), nullable=True))
    op.add_column('order_items', sa.Column('item_type_name_ar_snapshot', sa.String(150), nullable=True))
    op.add_column('order_items', sa.Column('size_name_ar_snapshot', sa.String(150), nullable=True))
    op.add_column('order_item_addons', sa.Column('addon_name_ar_snapshot', sa.String(150), nullable=True))

    op.execute(
        """
        UPDATE order_items oi
        SET item_name_ar_snapshot = i.name_ar,
            item_type_id_snapshot = t.id,
            item_type_name_snapshot = t.name_en,
            item_type_name_ar_snapshot = t.name_ar,
            size_name_ar_snapshot = s.name_ar
        FROM sizes s
        JOIN item_types t ON t.id = s.type_id
        JOIN items i ON i.id = t.item_id
        WHERE oi.size_id_snapshot = s.id
        """
    )
    op.execute(
        """
        UPDATE order_item_addons oia
        SET addon_name_ar_snapshot = a.name_ar
        FROM addons a
        WHERE oia.addon_id_snapshot = a.id
        """
    )


def downgrade() -> None:
    op.drop_column('order_item_addons', 'addon_name_ar_snapshot')
    op.drop_column('order_items', 'size_name_ar_snapshot')
    op.drop_column('order_items', 'item_type_name_ar_snapshot')
    op.drop_column('order_items', 'item_type_name_snapshot')
    op.drop_constraint('fk_order_items_item_type_id_snapshot_item_types', 'order_items', type_='foreignkey')
    op.drop_column('order_items', 'item_type_id_snapshot')
    op.drop_column('order_items', 'item_name_ar_snapshot')
    op.drop_column('store_settings', 'minimum_delivery_order_amount')
    op.drop_column('store_settings', 'working_hours')
