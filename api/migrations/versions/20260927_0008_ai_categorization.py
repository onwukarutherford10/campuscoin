"""Add correction memory, suggestion cache, and AI quota records."""

import sqlalchemy as sa
from alembic import op

from app.models.utc_datetime import UTCDateTime

revision = "20260927_0008"
down_revision = "20260926_0007"
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
        "category_corrections",
        *_base(),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("text_hash", sa.String(64), nullable=False),
        sa.Column(
            "category_id",
            sa.Uuid(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("accepted_count", sa.Integer(), nullable=False),
        sa.Column("corrected_count", sa.Integer(), nullable=False),
        sa.UniqueConstraint("owner_id", "transaction_type", "text_hash"),
    )
    op.create_index("ix_category_corrections_owner_id", "category_corrections", ["owner_id"])
    _table(
        "category_suggestion_cache",
        *_base(),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("text_hash", sa.String(64), nullable=False),
        sa.Column(
            "category_id",
            sa.Uuid(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("confidence", sa.String(12), nullable=False),
        sa.Column("rationale", sa.String(160), nullable=False),
        sa.UniqueConstraint("owner_id", "transaction_type", "text_hash"),
    )
    op.create_index(
        "ix_category_suggestion_cache_owner_id", "category_suggestion_cache", ["owner_id"]
    )
    _table(
        "ai_suggestion_usage",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "created_at",
            UTCDateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP(6)"),
        ),
        sa.Column("reserved_cost_usd", sa.Numeric(10, 6), nullable=False),
        sa.Column("input_tokens", sa.Integer()),
        sa.Column("output_tokens", sa.Integer()),
        sa.Column("outcome", sa.String(20), nullable=False),
    )
    op.create_index("ix_ai_suggestion_usage_owner_id", "ai_suggestion_usage", ["owner_id"])


def downgrade():
    for table in ("ai_suggestion_usage", "category_suggestion_cache", "category_corrections"):
        op.drop_table(table)
