"""Add user push tokens

Revision ID: 0014_add_user_push_tokens
Revises: 0013_promotion_target_groups
Create Date: 2026-03-27 12:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0014_add_user_push_tokens'
down_revision: str | None = '0013_promotion_target_groups'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'user_push_tokens',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('platform', sa.String(length=16), nullable=False),
        sa.Column('push_provider', sa.String(length=16), nullable=False),
        sa.Column('push_token', sa.String(length=512), nullable=False),
        sa.Column('device_id', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_push_tokens_user_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_push_tokens')),
        sa.UniqueConstraint('push_token', name=op.f('uq_user_push_tokens_push_token')),
    )
    op.create_index(op.f('ix_user_push_tokens_user_id'), 'user_push_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_push_tokens_is_active'), 'user_push_tokens', ['is_active'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_push_tokens_is_active'), table_name='user_push_tokens')
    op.drop_index(op.f('ix_user_push_tokens_user_id'), table_name='user_push_tokens')
    op.drop_table('user_push_tokens')
