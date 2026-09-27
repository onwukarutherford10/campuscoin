"""Persist notes for transactions and recurring rules."""

import sqlalchemy as sa
from alembic import op

revision = "20260926_0007"
down_revision = "20260926_0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("transactions", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("recurring_rules", sa.Column("notes", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("recurring_rules", "notes")
    op.drop_column("transactions", "notes")
