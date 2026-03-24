"""Add promotion targets and loyalty rule link

Revision ID: 0011_promo_targets
Revises: 0010_add_delivered_order_status
Create Date: 2026-03-24 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0011_promo_targets'
down_revision: str | None = '0010_add_delivered_order_status'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'promotions',
        sa.Column('loyalty_rule_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f('fk_promotions_loyalty_rule_id_loyalty_rules'),
        'promotions',
        'loyalty_rules',
        ['loyalty_rule_id'],
        ['id'],
        ondelete='SET NULL',
    )

    op.create_table(
        'promotion_targets',
        sa.Column('promotion_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('entity_type', sa.String(length=16), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['promotion_id'],
            ['promotions.id'],
            name=op.f('fk_promotion_targets_promotion_id_promotions'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_promotion_targets')),
        sa.UniqueConstraint('promotion_id', 'entity_type', 'entity_id', name='uq_promotion_target_entity'),
    )
    op.create_index(op.f('ix_promotion_targets_entity_id'), 'promotion_targets', ['entity_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_promotion_targets_entity_id'), table_name='promotion_targets')
    op.drop_table('promotion_targets')
    op.drop_constraint(op.f('fk_promotions_loyalty_rule_id_loyalty_rules'), 'promotions', type_='foreignkey')
    op.drop_column('promotions', 'loyalty_rule_id')
