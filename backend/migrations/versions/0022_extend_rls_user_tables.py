"""Extend row level security to user tables

Revision ID: 0022_extend_rls_user_tables
Revises: 0021_free_delivery_modes
Create Date: 2026-05-13 00:00:00
"""

from collections.abc import Sequence

from alembic import op


revision: str = '0022_extend_rls_user_tables'
down_revision: str | None = '0021_free_delivery_modes'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


USER_TABLES = ('users', 'user_push_tokens', 'user_events')


def upgrade() -> None:
    for table_name in USER_TABLES:
        op.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY')

    op.execute(
        """
        CREATE POLICY users_select_policy ON users
        FOR SELECT
        USING (
            app.is_privileged()
            OR users.id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY users_insert_policy ON users
        FOR INSERT
        WITH CHECK (
            app.is_privileged()
            OR users.id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY users_update_policy ON users
        FOR UPDATE
        USING (
            app.is_privileged()
            OR users.id = app.current_user_id()
        )
        WITH CHECK (
            app.is_privileged()
            OR users.id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY users_delete_policy ON users
        FOR DELETE
        USING (
            app.is_privileged()
            OR users.id = app.current_user_id()
        )
        """
    )

    op.execute(
        """
        CREATE POLICY user_push_tokens_select_policy ON user_push_tokens
        FOR SELECT
        USING (
            app.is_privileged()
            OR user_push_tokens.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_push_tokens_insert_policy ON user_push_tokens
        FOR INSERT
        WITH CHECK (
            app.is_privileged()
            OR user_push_tokens.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_push_tokens_update_policy ON user_push_tokens
        FOR UPDATE
        USING (
            app.is_privileged()
            OR user_push_tokens.user_id = app.current_user_id()
        )
        WITH CHECK (
            app.is_privileged()
            OR user_push_tokens.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_push_tokens_delete_policy ON user_push_tokens
        FOR DELETE
        USING (
            app.is_privileged()
            OR user_push_tokens.user_id = app.current_user_id()
        )
        """
    )

    op.execute(
        """
        CREATE POLICY user_events_select_policy ON user_events
        FOR SELECT
        USING (
            app.is_privileged()
            OR user_events.user_id = app.current_user_id()
            OR user_events.actor_user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_events_insert_policy ON user_events
        FOR INSERT
        WITH CHECK (
            app.is_privileged()
            OR user_events.user_id = app.current_user_id()
            OR user_events.actor_user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_events_update_policy ON user_events
        FOR UPDATE
        USING (
            app.is_privileged()
        )
        WITH CHECK (
            app.is_privileged()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY user_events_delete_policy ON user_events
        FOR DELETE
        USING (
            app.is_privileged()
        )
        """
    )


def downgrade() -> None:
    for table_name in reversed(USER_TABLES):
        op.execute(f'DROP POLICY IF EXISTS {table_name}_delete_policy ON {table_name}')
        op.execute(f'DROP POLICY IF EXISTS {table_name}_update_policy ON {table_name}')
        op.execute(f'DROP POLICY IF EXISTS {table_name}_insert_policy ON {table_name}')
        op.execute(f'DROP POLICY IF EXISTS {table_name}_select_policy ON {table_name}')
        op.execute(f'ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY')
