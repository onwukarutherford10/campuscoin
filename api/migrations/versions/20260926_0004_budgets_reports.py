"""Add budgets, notifications, tip preferences, and stored exports."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import LONGBLOB

from app.models.utc_datetime import UTCDateTime

revision = "20260926_0004"
down_revision = "20260924_0003"
branch_labels = None
depends_on = None


def _table(name, *columns):
    op.create_table(
        name,
        *columns,
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


def _base():
    return [
        sa.Column("id", sa.Uuid(), primary_key=True),
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
    ]


def upgrade():
    _table(
        "budgets",
        *_base(),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "category_id",
            sa.Uuid(),
            sa.ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("near_limit_percent", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("owner_id", "category_id", "year", "month"),
    )
    op.create_index("ix_budgets_owner_id", "budgets", ["owner_id"])
    _table(
        "notifications",
        *_base(),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("key", sa.String(160), nullable=False, unique=True),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("message", sa.String(255), nullable=False),
        sa.Column("read_at", UTCDateTime()),
        sa.Column("dismissed_at", UTCDateTime()),
    )
    op.create_index("ix_notifications_owner_id", "notifications", ["owner_id"])
    _table(
        "tip_states",
        *_base(),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("tip_key", sa.String(160), nullable=False),
        sa.Column("pinned", sa.Boolean(), nullable=False),
        sa.Column("bookmarked", sa.Boolean(), nullable=False),
        sa.Column("dismissed", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("owner_id", "tip_key"),
    )
    op.create_index("ix_tip_states_owner_id", "tip_states", ["owner_id"])
    _table(
        "report_exports",
        *_base(),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), unique=True),
        sa.Column("format", sa.String(8), nullable=False),
        sa.Column("content", sa.LargeBinary().with_variant(LONGBLOB(), "mysql")),
    )
    op.create_index("ix_report_exports_owner_id", "report_exports", ["owner_id"])


def downgrade():
    for table in ("report_exports", "tip_states", "notifications", "budgets"):
        op.drop_table(table)
