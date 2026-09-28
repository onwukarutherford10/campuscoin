"""Add Cloudinary avatar metadata to users."""

import sqlalchemy as sa
from alembic import op

revision = "20260928_0011"
down_revision = "20260927_0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("avatar_public_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "avatar_public_id")
