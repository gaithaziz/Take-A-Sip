"""Add user refresh tokens

Revision ID: 0025_add_user_refresh_tokens
Revises: 0024_grant_order_number_sequence
Create Date: 2026-06-13 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = '0025_add_user_refresh_tokens'
down_revision: str | None = '0024_grant_order_number_sequence'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'user_refresh_tokens',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('replaced_by_token_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['replaced_by_token_id'], ['user_refresh_tokens.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index(op.f('ix_user_refresh_tokens_expires_at'), 'user_refresh_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_user_refresh_tokens_revoked_at'), 'user_refresh_tokens', ['revoked_at'], unique=False)
    op.create_index(op.f('ix_user_refresh_tokens_token_hash'), 'user_refresh_tokens', ['token_hash'], unique=False)
    op.create_index(op.f('ix_user_refresh_tokens_user_id'), 'user_refresh_tokens', ['user_id'], unique=False)

    op.execute('ALTER TABLE user_refresh_tokens ENABLE ROW LEVEL SECURITY')
    op.execute(
        """
        CREATE POLICY user_refresh_tokens_select_policy ON user_refresh_tokens
        FOR SELECT
        USING (
            app.is_privileged()
            OR user_refresh_tokens.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_refresh_tokens_insert_policy ON user_refresh_tokens
        FOR INSERT
        WITH CHECK (
            app.is_privileged()
            OR user_refresh_tokens.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_refresh_tokens_update_policy ON user_refresh_tokens
        FOR UPDATE
        USING (
            app.is_privileged()
            OR user_refresh_tokens.user_id = app.current_user_id()
        )
        WITH CHECK (
            app.is_privileged()
            OR user_refresh_tokens.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_refresh_tokens_delete_policy ON user_refresh_tokens
        FOR DELETE
        USING (
            app.is_privileged()
            OR user_refresh_tokens.user_id = app.current_user_id()
        )
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS user_refresh_tokens_delete_policy ON user_refresh_tokens')
    op.execute('DROP POLICY IF EXISTS user_refresh_tokens_update_policy ON user_refresh_tokens')
    op.execute('DROP POLICY IF EXISTS user_refresh_tokens_insert_policy ON user_refresh_tokens')
    op.execute('DROP POLICY IF EXISTS user_refresh_tokens_select_policy ON user_refresh_tokens')
    op.drop_index(op.f('ix_user_refresh_tokens_user_id'), table_name='user_refresh_tokens')
    op.drop_index(op.f('ix_user_refresh_tokens_token_hash'), table_name='user_refresh_tokens')
    op.drop_index(op.f('ix_user_refresh_tokens_revoked_at'), table_name='user_refresh_tokens')
    op.drop_index(op.f('ix_user_refresh_tokens_expires_at'), table_name='user_refresh_tokens')
    op.drop_table('user_refresh_tokens')
