"""Add authentication, profiles, categories, rate limits, and audit logs."""

import sqlalchemy as sa
from alembic import op

revision = "20260924_0002"
down_revision = "20260924_0001"
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]


def upgrade():
    op.create_table(
        "users",
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("academic_year", sa.String(40)),
        sa.Column("allowance_baseline", sa.Numeric(14, 2), nullable=False),
        sa.Column("savings_goal", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("ai_consent", sa.Boolean(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "rate_limit_records",
        sa.Column("subject_key", sa.String(320), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rate_limit_records")),
    )
    op.create_index(
        "ix_rate_limit_key_action_window",
        "rate_limit_records",
        ["subject_key", "action", "window_started_at"],
    )

    op.create_table(
        "auth_sessions",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("user_agent", sa.String(255)),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_user_revoked", "auth_sessions", ["user_id", "revoked_at"])

    op.create_table(
        "password_reset_tokens",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_password_reset_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_password_reset_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_password_reset_tokens_token_hash")),
    )
    op.create_index(op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"])

    op.create_table(
        "categories",
        sa.Column("owner_id", sa.Uuid()),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("category_type", sa.String(20), nullable=False),
        sa.Column("color", sa.String(7)),
        sa.Column("icon", sa.String(50)),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "category_type IN ('income', 'expense')", name=op.f("ck_categories_valid_category_type")
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_categories_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
        sa.UniqueConstraint(
            "owner_id", "name", "category_type", name="uq_category_owner_name_type"
        ),
    )
    op.create_index(op.f("ix_categories_owner_id"), "categories", ["owner_id"])

    op.create_table(
        "audit_logs",
        sa.Column("actor_id", sa.Uuid()),
        sa.Column("target_user_id", sa.Uuid()),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_actor_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["target_user_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_target_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"])
    op.create_index(op.f("ix_audit_logs_actor_id"), "audit_logs", ["actor_id"])
    op.create_index(op.f("ix_audit_logs_target_user_id"), "audit_logs", ["target_user_id"])


def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("categories")
    op.drop_table("password_reset_tokens")
    op.drop_table("auth_sessions")
    op.drop_table("rate_limit_records")
    op.drop_table("users")
