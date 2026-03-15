"""Add order ratings table

Revision ID: 0007_add_order_ratings
Revises: 0006_phase5_delivery_expansion
Create Date: 2026-03-15 03:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0007_add_order_ratings'
down_revision: str | None = '0006_phase5_delivery_expansion'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'order_ratings',
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stars', sa.Integer(), nullable=False),
        sa.Column('note', sa.String(length=500), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('stars >= 1 AND stars <= 5', name='ck_order_ratings_stars_range'),
        sa.ForeignKeyConstraint(
            ['order_id'],
            ['orders.id'],
            name=op.f('fk_order_ratings_order_id_orders'),
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name=op.f('fk_order_ratings_user_id_users'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_order_ratings')),
        sa.UniqueConstraint('order_id', name=op.f('uq_order_ratings_order_id')),
    )
    op.create_index(op.f('ix_order_ratings_user_created'), 'order_ratings', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_order_ratings_stars'), 'order_ratings', ['stars'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_order_ratings_stars'), table_name='order_ratings')
    op.drop_index(op.f('ix_order_ratings_user_created'), table_name='order_ratings')
    op.drop_table('order_ratings')
