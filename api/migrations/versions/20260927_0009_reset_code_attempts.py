"""Track attempts against password reset one-time codes."""

import sqlalchemy as sa
from alembic import op

revision = "20260927_0009"
down_revision = "20260927_0008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "password_reset_tokens",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade():
    op.drop_column("password_reset_tokens", "attempts")
