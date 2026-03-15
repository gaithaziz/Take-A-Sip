"""Phase 5 delivery expansion

Revision ID: 0006_phase5_delivery_expansion
Revises: 0005_admin_sort_loyalty_active
Create Date: 2026-03-15 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0006_phase5_delivery_expansion'
down_revision: str | None = '0005_admin_sort_loyalty_active'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


new_user_role = sa.Enum('CLIENT', 'ADMIN', 'FRONTDESK', 'DRIVER', name='user_role', native_enum=False)
new_order_status = sa.Enum(
    'NEW',
    'ACCEPTED',
    'ASSIGNED',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
    name='order_status',
    native_enum=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    new_user_role.create(bind, checkfirst=True)
    new_order_status.create(bind, checkfirst=True)

    op.alter_column('users', 'role', type_=new_user_role, existing_type=sa.String(length=9))
    op.alter_column('orders', 'status', type_=new_order_status, existing_type=sa.String(length=9))

    op.create_table(
        'store_settings',
        sa.Column('store_name', sa.String(length=120), nullable=False),
        sa.Column('store_latitude', sa.Numeric(10, 7), nullable=False),
        sa.Column('store_longitude', sa.Numeric(10, 7), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_store_settings')),
    )

    op.create_table(
        'delivery_distance_bands',
        sa.Column('min_distance_km', sa.Numeric(10, 3), nullable=False),
        sa.Column('max_distance_km', sa.Numeric(10, 3), nullable=False),
        sa.Column('fee_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint('min_distance_km >= 0', name='ck_delivery_distance_bands_min_non_negative'),
        sa.CheckConstraint(
            'max_distance_km > min_distance_km',
            name='ck_delivery_distance_bands_max_gt_min',
        ),
        sa.CheckConstraint('fee_amount >= 0', name='ck_delivery_distance_bands_fee_non_negative'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_delivery_distance_bands')),
    )
    op.create_index(
        op.f('ix_delivery_distance_bands_is_active'),
        'delivery_distance_bands',
        ['is_active', 'sort_order'],
        unique=False,
    )

    op.add_column('orders', sa.Column('delivery_latitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('orders', sa.Column('delivery_longitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('orders', sa.Column('delivery_distance_km', sa.Numeric(10, 3), nullable=True))
    op.add_column('orders', sa.Column('delivery_fee', sa.Numeric(10, 2), nullable=True))
    op.add_column(
        'orders',
        sa.Column('delivery_distance_band_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column('orders', sa.Column('assigned_driver_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('orders', sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key(
        op.f('fk_orders_delivery_distance_band_id_delivery_distance_bands'),
        'orders',
        'delivery_distance_bands',
        ['delivery_distance_band_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        op.f('fk_orders_assigned_driver_id_users'),
        'orders',
        'users',
        ['assigned_driver_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        op.f('ix_orders_user_id'),
        'orders',
        ['user_id', 'created_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_orders_status_created'),
        'orders',
        ['status', 'created_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_orders_assigned_driver_status_created'),
        'orders',
        ['assigned_driver_id', 'status', 'created_at'],
        unique=False,
    )

    op.add_column('order_events', sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('order_events', sa.Column('metadata_json', sa.JSON(), nullable=True))
    op.create_foreign_key(
        op.f('fk_order_events_actor_user_id_users'),
        'order_events',
        'users',
        ['actor_user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(op.f('fk_order_events_actor_user_id_users'), 'order_events', type_='foreignkey')
    op.drop_column('order_events', 'metadata_json')
    op.drop_column('order_events', 'actor_user_id')

    op.drop_index(op.f('ix_orders_assigned_driver_status_created'), table_name='orders')
    op.drop_index(op.f('ix_orders_status_created'), table_name='orders')
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_constraint(op.f('fk_orders_assigned_driver_id_users'), 'orders', type_='foreignkey')
    op.drop_constraint(op.f('fk_orders_delivery_distance_band_id_delivery_distance_bands'), 'orders', type_='foreignkey')
    op.drop_column('orders', 'completed_at')
    op.drop_column('orders', 'assigned_at')
    op.drop_column('orders', 'assigned_driver_id')
    op.drop_column('orders', 'delivery_distance_band_id')
    op.drop_column('orders', 'delivery_fee')
    op.drop_column('orders', 'delivery_distance_km')
    op.drop_column('orders', 'delivery_longitude')
    op.drop_column('orders', 'delivery_latitude')

    op.drop_index(op.f('ix_delivery_distance_bands_is_active'), table_name='delivery_distance_bands')
    op.drop_table('delivery_distance_bands')
    op.drop_table('store_settings')
