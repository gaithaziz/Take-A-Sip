"""Add image_url to menu hierarchy tables

Revision ID: 0003_add_menu_image_urls
Revises: 0002_add_menu_schedules
Create Date: 2026-03-08 02:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_add_menu_image_urls'
down_revision: str | None = '0002_add_menu_schedules'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('sections', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('items', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('item_types', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('sizes', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('addons', sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('addons', 'image_url')
    op.drop_column('sizes', 'image_url')
    op.drop_column('item_types', 'image_url')
    op.drop_column('items', 'image_url')
    op.drop_column('sections', 'image_url')
