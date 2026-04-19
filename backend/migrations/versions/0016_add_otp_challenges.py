"""Add OTP challenges table

Revision ID: 0016_add_otp_challenges
Revises: 0015_add_push_token_language
Create Date: 2026-04-19 13:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0016_add_otp_challenges'
down_revision: str | None = '0015_add_push_token_language'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'otp_challenges',
        sa.Column('phone_number', sa.String(length=32), nullable=False),
        sa.Column('code_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resend_available_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts_remaining', sa.Integer(), nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('phone_number', name=op.f('pk_otp_challenges')),
    )


def downgrade() -> None:
    op.drop_table('otp_challenges')
