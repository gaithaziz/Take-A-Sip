"""Add push token language

Revision ID: 0015_add_push_token_language
Revises: 0014_add_user_push_tokens
Create Date: 2026-03-27 13:15:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0015_add_push_token_language'
down_revision: str | None = '0014_add_user_push_tokens'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'user_push_tokens',
        sa.Column('language', sa.String(length=8), nullable=False, server_default='en'),
    )
    op.alter_column('user_push_tokens', 'language', server_default=None)


def downgrade() -> None:
    op.drop_column('user_push_tokens', 'language')
