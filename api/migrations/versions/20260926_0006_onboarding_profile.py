"""Persist onboarding completion and category preferences."""

import sqlalchemy as sa
from alembic import op

from app.models.utc_datetime import UTCDateTime

revision = "20260926_0006"
down_revision = "20260926_0005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("onboarding_completed_at", UTCDateTime(), nullable=True))
    op.create_table(
        "onboarding_category_preferences",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            UTCDateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP(6)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            UTCDateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP(6)"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "kind IN ('income_source', 'spending_area')",
            name=op.f("ck_onboarding_category_preferences_valid_onboarding_preference_kind"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name=op.f("fk_onboarding_category_preferences_category_id_categories"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_onboarding_category_preferences_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_onboarding_category_preferences")),
        sa.UniqueConstraint(
            "user_id", "category_id", "kind", name="uq_onboarding_user_category_kind"
        ),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index(
        op.f("ix_onboarding_category_preferences_user_id"),
        "onboarding_category_preferences",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_onboarding_category_preferences_category_id"),
        "onboarding_category_preferences",
        ["category_id"],
    )


def downgrade():
    op.drop_table("onboarding_category_preferences")
    op.drop_column("users", "onboarding_completed_at")
