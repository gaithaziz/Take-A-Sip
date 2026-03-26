"""Add target groups to promotion targets

Revision ID: 0013_promotion_target_groups
Revises: 0012_offer_rules
Create Date: 2026-03-24 00:15:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0013_promotion_target_groups'
down_revision: str | None = '0012_offer_rules'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'promotion_targets',
        sa.Column('target_group', sa.String(length=16), nullable=False, server_default='scope'),
    )
    op.drop_constraint('uq_promotion_target_entity', 'promotion_targets', type_='unique')
    op.create_unique_constraint(
        'uq_promotion_target_group_entity',
        'promotion_targets',
        ['promotion_id', 'target_group', 'entity_type', 'entity_id'],
    )
    op.alter_column('promotion_targets', 'target_group', server_default=None)


def downgrade() -> None:
    op.drop_constraint('uq_promotion_target_group_entity', 'promotion_targets', type_='unique')
    op.create_unique_constraint(
        'uq_promotion_target_entity',
        'promotion_targets',
        ['promotion_id', 'entity_type', 'entity_id'],
    )
    op.drop_column('promotion_targets', 'target_group')
