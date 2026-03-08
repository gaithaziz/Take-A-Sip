"""Add menu schedules

Revision ID: 0002_add_menu_schedules
Revises: 0001_initial_schema
Create Date: 2026-03-08 01:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0002_add_menu_schedules'
down_revision: str | None = '0001_initial_schema'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'menu_schedules',
        sa.Column('entity_type', sa.String(length=16), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('days_of_week', postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint("entity_type in ('section','item','type','size','addon')", name='ck_menu_schedules_entity_type'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_menu_schedules')),
    )
    op.create_index(op.f('ix_menu_schedules_entity_id'), 'menu_schedules', ['entity_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_menu_schedules_entity_id'), table_name='menu_schedules')
    op.drop_table('menu_schedules')
