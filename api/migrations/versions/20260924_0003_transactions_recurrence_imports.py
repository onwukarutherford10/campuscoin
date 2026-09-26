"""Add transactions, recurrence, CSV imports, and job ownership."""

import sqlalchemy as sa
from alembic import op

from app.models.utc_datetime import UTCDateTime


def create_table(name, *columns):
    op.create_table(
        name,
        *columns,
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


revision = "20260924_0003"
down_revision = "20260924_0002"
branch_labels = None
depends_on = None


def _timestamps():
    return [
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
    ]


def upgrade():
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.add_column(sa.Column("owner_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            "fk_jobs_owner_id_users", "users", ["owner_id"], ["id"], ondelete="CASCADE"
        )
        batch_op.create_index("ix_jobs_owner_id", ["owner_id"])

    create_table(
        "recurring_rules",
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("merchant", sa.String(160)),
        sa.Column("frequency", sa.String(20), nullable=False),
        sa.Column("interval", sa.Integer(), nullable=False),
        sa.Column("next_due_at", UTCDateTime(), nullable=False),
        sa.Column("ends_at", UTCDateTime()),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name=op.f("fk_recurring_rules_category_id_categories"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_recurring_rules_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_recurring_rules")),
    )
    op.create_index(op.f("ix_recurring_rules_owner_id"), "recurring_rules", ["owner_id"])
    op.create_index(op.f("ix_recurring_rules_next_due_at"), "recurring_rules", ["next_due_at"])

    create_table(
        "transactions",
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("merchant", sa.String(160)),
        sa.Column("occurred_at", UTCDateTime(), nullable=False),
        sa.Column("deleted_at", UTCDateTime()),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("import_fingerprint", sa.String(64)),
        sa.Column("recurring_rule_id", sa.Uuid()),
        sa.Column("scheduled_for", UTCDateTime()),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name=op.f("fk_transactions_category_id_categories"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_transactions_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recurring_rule_id"],
            ["recurring_rules.id"],
            name=op.f("fk_transactions_recurring_rule_id_recurring_rules"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transactions")),
        sa.UniqueConstraint(
            "recurring_rule_id",
            "scheduled_for",
            name="uq_transaction_recurring_scheduled",
        ),
    )
    for column in (
        "owner_id",
        "category_id",
        "deleted_at",
        "import_fingerprint",
        "recurring_rule_id",
    ):
        op.create_index(op.f(f"ix_transactions_{column}"), "transactions", [column])
    op.create_index("ix_transactions_owner_occurred", "transactions", ["owner_id", "occurred_at"])

    create_table(
        "transaction_revisions",
        sa.Column("transaction_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            UTCDateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP(6)"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            name=op.f("fk_transaction_revisions_actor_id_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["transactions.id"],
            name=op.f("fk_transaction_revisions_transaction_id_transactions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transaction_revisions")),
        sa.UniqueConstraint(
            "transaction_id", "revision_number", name="uq_transaction_revision_number"
        ),
    )
    op.create_index(
        op.f("ix_transaction_revisions_transaction_id"),
        "transaction_revisions",
        ["transaction_id"],
    )

    create_table(
        "transaction_activities",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("transaction_id", sa.Uuid(), nullable=False),
        sa.Column("last_viewed_at", UTCDateTime()),
        sa.Column("last_edited_at", UTCDateTime()),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["transactions.id"],
            name=op.f("fk_transaction_activities_transaction_id_transactions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_transaction_activities_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transaction_activities")),
        sa.UniqueConstraint("user_id", "transaction_id", name="uq_transaction_activity_user_tx"),
    )
    op.create_index(
        op.f("ix_transaction_activities_transaction_id"),
        "transaction_activities",
        ["transaction_id"],
    )
    op.create_index(
        op.f("ix_transaction_activities_user_id"), "transaction_activities", ["user_id"]
    )

    create_table(
        "csv_imports",
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mapping", sa.JSON(), nullable=False),
        sa.Column("rows", sa.JSON(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("valid_count", sa.Integer(), nullable=False),
        sa.Column("duplicate_count", sa.Integer(), nullable=False),
        sa.Column("error_count", sa.Integer(), nullable=False),
        sa.Column("error_csv", sa.Text()),
        sa.Column("expires_at", UTCDateTime(), nullable=False),
        sa.Column("confirmed_at", UTCDateTime()),
        sa.Column("imported_count", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Uuid()),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["job_id"], ["jobs.id"], name=op.f("fk_csv_imports_job_id_jobs"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_csv_imports_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_csv_imports")),
    )
    op.create_index(op.f("ix_csv_imports_owner_id"), "csv_imports", ["owner_id"])


def downgrade():
    op.drop_table("csv_imports")
    op.drop_table("transaction_activities")
    op.drop_table("transaction_revisions")
    op.drop_table("transactions")
    op.drop_table("recurring_rules")
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.drop_constraint("fk_jobs_owner_id_users", type_="foreignkey")
        batch_op.drop_index("ix_jobs_owner_id")
        batch_op.drop_column("owner_id")
