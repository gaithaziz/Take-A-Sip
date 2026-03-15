"""Add Phase 7 operational indexes

Revision ID: 0008_phase7_operational_indexes
Revises: 0007_add_order_ratings
Create Date: 2026-03-15 05:10:00
"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0008_phase7_operational_indexes'
down_revision: str | None = '0007_add_order_ratings'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_index('ix_orders_created_at', 'orders', ['created_at'], unique=False)
    op.create_index('ix_orders_order_type_created_at', 'orders', ['order_type', 'created_at'], unique=False)
    op.create_index(
        'ix_orders_status_order_type_created_at',
        'orders',
        ['status', 'order_type', 'created_at'],
        unique=False,
    )
    op.create_index(
        'ix_orders_completed_at_assigned_driver',
        'orders',
        ['completed_at', 'assigned_driver_id'],
        unique=False,
    )
    op.create_index('ix_order_events_event_type_created_at', 'order_events', ['event_type', 'created_at'], unique=False)
    op.create_index('ix_order_ratings_created_at', 'order_ratings', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_order_ratings_created_at', table_name='order_ratings')
    op.drop_index('ix_order_events_event_type_created_at', table_name='order_events')
    op.drop_index('ix_orders_completed_at_assigned_driver', table_name='orders')
    op.drop_index('ix_orders_status_order_type_created_at', table_name='orders')
    op.drop_index('ix_orders_order_type_created_at', table_name='orders')
    op.drop_index('ix_orders_created_at', table_name='orders')
