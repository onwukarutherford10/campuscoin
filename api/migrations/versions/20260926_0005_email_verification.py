"""Add verified-email state and short-lived email codes."""

import sqlalchemy as sa
from alembic import op

from app.models.utc_datetime import UTCDateTime

revision = "20260926_0005"
down_revision = "20260926_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verified_at", UTCDateTime(), nullable=True))
    # Existing accounts were created before verification was available.
    op.execute(sa.text("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP"))
    op.create_table(
        "email_verification_codes",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", UTCDateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("used_at", UTCDateTime()),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_email_verification_codes_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_verification_codes")),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index(
        op.f("ix_email_verification_codes_user_id"),
        "email_verification_codes",
        ["user_id"],
    )


def downgrade():
    op.drop_table("email_verification_codes")
    op.drop_column("users", "email_verified_at")
