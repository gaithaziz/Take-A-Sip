"""Use a sequence for order number allocation

Revision ID: 0023_order_number_sequence
Revises: 0022_extend_rls_user_tables
Create Date: 2026-06-06 00:00:00
"""

from collections.abc import Sequence

from alembic import op


revision: str = '0023_order_number_sequence'
down_revision: str | None = '0022_extend_rls_user_tables'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE SEQUENCE IF NOT EXISTS order_number_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        OWNED BY orders.order_number
        """
    )
    op.execute(
        """
        DO $$
        DECLARE
            max_order_number integer;
        BEGIN
            SELECT COALESCE(MAX(order_number), 0)
            INTO max_order_number
            FROM orders;

            IF max_order_number > 0 THEN
                PERFORM setval('order_number_seq', max_order_number, true);
            ELSE
                PERFORM setval('order_number_seq', 1, false);
            END IF;
        END
        $$;
        """
    )
    op.execute("ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('order_number_seq')")


def downgrade() -> None:
    op.execute('ALTER TABLE orders ALTER COLUMN order_number DROP DEFAULT')
    op.execute('DROP SEQUENCE IF EXISTS order_number_seq')
