"""Initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-03-08 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


user_role = sa.Enum('CLIENT', 'ADMIN', 'FRONTDESK', name='user_role', native_enum=False)
promotion_type = sa.Enum('FIRST_TIME', 'LOYALTY', 'TEMPORARY', name='promotion_type', native_enum=False)
order_status = sa.Enum('NEW', 'ACCEPTED', 'COMPLETED', 'CANCELLED', name='order_status', native_enum=False)
order_type = sa.Enum('pickup', 'delivery', name='order_type', native_enum=False)


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    promotion_type.create(bind, checkfirst=True)
    order_status.create(bind, checkfirst=True)
    order_type.create(bind, checkfirst=True)

    op.create_table(
        'loyalty_rules',
        sa.Column('required_orders', sa.Integer(), nullable=False),
        sa.Column('reward_type', sa.String(length=100), nullable=False),
        sa.Column('reward_value', sa.String(length=255), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_loyalty_rules')),
    )

    op.create_table(
        'promotions',
        sa.Column('title_en', sa.String(length=200), nullable=False),
        sa.Column('title_ar', sa.String(length=200), nullable=False),
        sa.Column('type', promotion_type, nullable=False),
        sa.Column('value', sa.Numeric(10, 2), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_promotions')),
    )

    op.create_table(
        'sections',
        sa.Column('name_en', sa.String(length=120), nullable=False),
        sa.Column('name_ar', sa.String(length=120), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sections')),
    )

    op.create_table(
        'users',
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('phone_number', sa.String(length=30), nullable=False),
        sa.Column('role', user_role, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_banned', sa.Boolean(), nullable=False),
        sa.Column('banned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('banned_reason', sa.String(length=255), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
        sa.UniqueConstraint('phone_number', name=op.f('uq_users_phone_number')),
    )
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=False)

    op.create_table(
        'items',
        sa.Column('section_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name_en', sa.String(length=120), nullable=False),
        sa.Column('name_ar', sa.String(length=120), nullable=False),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('description_ar', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['section_id'], ['sections.id'], name=op.f('fk_items_section_id_sections'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_items')),
    )

    op.create_table(
        'orders',
        sa.Column('order_number', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', order_status, nullable=False),
        sa.Column('order_type', order_type, nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_orders_user_id_users'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_orders')),
    )
    op.create_index(op.f('ix_orders_order_number'), 'orders', ['order_number'], unique=True)

    op.create_table(
        'user_events',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], name=op.f('fk_user_events_actor_user_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_events_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_events')),
    )

    op.create_table(
        'item_types',
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name_en', sa.String(length=120), nullable=False),
        sa.Column('name_ar', sa.String(length=120), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], name=op.f('fk_item_types_item_id_items'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_item_types')),
    )

    op.create_table(
        'order_events',
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], name=op.f('fk_order_events_order_id_orders'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_order_events')),
    )

    op.create_table(
        'order_items',
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_name_snapshot', sa.String(length=150), nullable=False),
        sa.Column('size_snapshot', sa.String(length=150), nullable=False),
        sa.Column('price_snapshot', sa.Numeric(10, 2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], name=op.f('fk_order_items_order_id_orders'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_order_items')),
    )

    op.create_table(
        'sizes',
        sa.Column('type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name_en', sa.String(length=120), nullable=False),
        sa.Column('name_ar', sa.String(length=120), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['type_id'], ['item_types.id'], name=op.f('fk_sizes_type_id_item_types'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sizes')),
    )

    op.create_table(
        'order_item_addons',
        sa.Column('order_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('addon_name_snapshot', sa.String(length=150), nullable=False),
        sa.Column('price_snapshot', sa.Numeric(10, 2), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], name=op.f('fk_order_item_addons_order_item_id_order_items'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_order_item_addons')),
    )

    op.create_table(
        'addons',
        sa.Column('size_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name_en', sa.String(length=120), nullable=False),
        sa.Column('name_ar', sa.String(length=120), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['size_id'], ['sizes.id'], name=op.f('fk_addons_size_id_sizes'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_addons')),
    )


def downgrade() -> None:
    op.drop_table('addons')
    op.drop_table('order_item_addons')
    op.drop_table('sizes')
    op.drop_table('order_items')
    op.drop_table('order_events')
    op.drop_table('item_types')
    op.drop_table('user_events')
    op.drop_index(op.f('ix_orders_order_number'), table_name='orders')
    op.drop_table('orders')
    op.drop_table('items')
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.drop_table('users')
    op.drop_table('sections')
    op.drop_table('promotions')
    op.drop_table('loyalty_rules')

    bind = op.get_bind()
    order_type.drop(bind, checkfirst=True)
    order_status.drop(bind, checkfirst=True)
    promotion_type.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
