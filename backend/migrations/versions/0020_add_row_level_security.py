"""Add row level security for sensitive tables

Revision ID: 0020_add_row_level_security
Revises: 0019_promo_type_length
Create Date: 2026-05-12 00:00:00
"""

from collections.abc import Sequence

from alembic import op


revision: str = '0020_add_row_level_security'
down_revision: str | None = '0019_promo_type_length'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


APP_ROLE = 'take_a_sip_app'
POLICY_SCHEMA = 'app'
SENSITIVE_TABLES = (
    'orders',
    'order_items',
    'order_item_addons',
    'order_events',
    'order_ratings',
)


def upgrade() -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
                CREATE ROLE {APP_ROLE} NOLOGIN;
            END IF;
        END
        $$;
        """
    )
    op.execute(f'GRANT {APP_ROLE} TO CURRENT_USER')
    op.execute(f'GRANT USAGE ON SCHEMA public TO {APP_ROLE}')
    op.execute(f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}')
    op.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {APP_ROLE}')

    op.execute(f'CREATE SCHEMA IF NOT EXISTS {POLICY_SCHEMA}')
    op.execute(f'GRANT USAGE ON SCHEMA {POLICY_SCHEMA} TO {APP_ROLE}')
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION {POLICY_SCHEMA}.current_user_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $$
            SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
        $$;
        """
    )
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION {POLICY_SCHEMA}.current_user_role()
        RETURNS text
        LANGUAGE sql
        STABLE
        AS $$
            SELECT nullif(current_setting('app.current_user_role', true), '')
        $$;
        """
    )
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION {POLICY_SCHEMA}.is_privileged()
        RETURNS boolean
        LANGUAGE sql
        STABLE
        AS $$
            SELECT {POLICY_SCHEMA}.current_user_role() IN ('ADMIN', 'FRONTDESK')
        $$;
        """
    )
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION {POLICY_SCHEMA}.can_access_order(target_order_id uuid)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        AS $$
            SELECT
                {POLICY_SCHEMA}.is_privileged()
                OR EXISTS (
                    SELECT 1
                    FROM orders
                    WHERE orders.id = target_order_id
                      AND (
                        orders.user_id = {POLICY_SCHEMA}.current_user_id()
                        OR orders.assigned_driver_id = {POLICY_SCHEMA}.current_user_id()
                      )
                )
        $$;
        """
    )
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION {POLICY_SCHEMA}.can_access_order_item(target_order_item_id uuid)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        AS $$
            SELECT
                {POLICY_SCHEMA}.is_privileged()
                OR EXISTS (
                    SELECT 1
                    FROM order_items
                    JOIN orders ON orders.id = order_items.order_id
                    WHERE order_items.id = target_order_item_id
                      AND (
                        orders.user_id = {POLICY_SCHEMA}.current_user_id()
                        OR orders.assigned_driver_id = {POLICY_SCHEMA}.current_user_id()
                      )
                )
        $$;
        """
    )
    op.execute(f'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA {POLICY_SCHEMA} TO {APP_ROLE}')
    op.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA {POLICY_SCHEMA} GRANT EXECUTE ON FUNCTIONS TO {APP_ROLE}')

    for table_name in SENSITIVE_TABLES:
        op.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY')

    op.execute(
        """
        CREATE POLICY orders_select_policy ON orders
        FOR SELECT
        USING (
            app.is_privileged()
            OR orders.user_id = app.current_user_id()
            OR orders.assigned_driver_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY orders_insert_policy ON orders
        FOR INSERT
        WITH CHECK (
            app.is_privileged()
            OR orders.user_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY orders_update_policy ON orders
        FOR UPDATE
        USING (
            app.is_privileged()
            OR orders.user_id = app.current_user_id()
            OR orders.assigned_driver_id = app.current_user_id()
        )
        WITH CHECK (
            app.is_privileged()
            OR orders.user_id = app.current_user_id()
            OR orders.assigned_driver_id = app.current_user_id()
        )
        """
    )
    op.execute(
        """
        CREATE POLICY orders_delete_policy ON orders
        FOR DELETE
        USING (
            app.is_privileged()
        )
        """
    )

    for table_name in ('order_items', 'order_item_addons', 'order_events', 'order_ratings'):
        order_access_expr = (
            f'app.can_access_order({table_name}.order_id)'
            if table_name != 'order_item_addons'
            else 'app.can_access_order_item(order_item_addons.order_item_id)'
        )
        op.execute(
            f"""
            CREATE POLICY {table_name}_select_policy ON {table_name}
            FOR SELECT
            USING (
                {order_access_expr}
            )
            """
        )
        op.execute(
            f"""
            CREATE POLICY {table_name}_insert_policy ON {table_name}
            FOR INSERT
            WITH CHECK (
                {order_access_expr}
            )
            """
        )
        op.execute(
            f"""
            CREATE POLICY {table_name}_update_policy ON {table_name}
            FOR UPDATE
            USING (
                {order_access_expr}
            )
            WITH CHECK (
                {order_access_expr}
            )
            """
        )
        op.execute(
            f"""
            CREATE POLICY {table_name}_delete_policy ON {table_name}
            FOR DELETE
            USING (
                {order_access_expr}
            )
            """
        )


def downgrade() -> None:
    for table_name in reversed(SENSITIVE_TABLES):
        op.execute(f'DROP POLICY IF EXISTS {table_name}_delete_policy ON {table_name}')
        op.execute(f'DROP POLICY IF EXISTS {table_name}_update_policy ON {table_name}')
        op.execute(f'DROP POLICY IF EXISTS {table_name}_insert_policy ON {table_name}')
        op.execute(f'DROP POLICY IF EXISTS {table_name}_select_policy ON {table_name}')
        op.execute(f'ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY')

    op.execute('DROP FUNCTION IF EXISTS app.can_access_order_item(uuid)')
    op.execute('DROP FUNCTION IF EXISTS app.can_access_order(uuid)')
    op.execute('DROP FUNCTION IF EXISTS app.is_privileged()')
    op.execute('DROP FUNCTION IF EXISTS app.current_user_role()')
    op.execute('DROP FUNCTION IF EXISTS app.current_user_id()')
    op.execute('DROP SCHEMA IF EXISTS app')
    op.execute(f'REVOKE {APP_ROLE} FROM CURRENT_USER')
