"""Add administrator-managed announcements and tip templates."""

import sqlalchemy as sa
from alembic import op

from app.models.utc_datetime import UTCDateTime

revision = "20260927_0010"
down_revision = "20260927_0009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "system_content",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            UTCDateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP(6)"),
        ),
        sa.Column(
            "updated_at",
            UTCDateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP(6)"),
        ),
        sa.CheckConstraint(
            "kind IN ('announcement', 'tip_template')", name="valid_system_content_kind"
        ),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_system_content_kind", "system_content", ["kind"])


def downgrade():
    op.drop_table("system_content")
