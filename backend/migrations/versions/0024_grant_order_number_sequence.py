"""Grant app role access to order number sequence

Revision ID: 0024_grant_order_number_sequence
Revises: 0023_order_number_sequence
Create Date: 2026-06-06 00:00:00
"""

from collections.abc import Sequence

from alembic import op


revision: str = '0024_grant_order_number_sequence'
down_revision: str | None = '0023_order_number_sequence'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


APP_ROLE = 'take_a_sip_app'


def upgrade() -> None:
    op.execute(f'GRANT USAGE, SELECT ON SEQUENCE order_number_seq TO {APP_ROLE}')
    op.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {APP_ROLE}')


def downgrade() -> None:
    op.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM {APP_ROLE}')
    op.execute(f'REVOKE USAGE, SELECT ON SEQUENCE order_number_seq FROM {APP_ROLE}')
