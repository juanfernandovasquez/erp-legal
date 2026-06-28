"""add email_logs table

Revision ID: 008_email_logs
Revises: 007_billing_case
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "008_email_logs"
down_revision = "007_billing_case"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("law_firm_id", UUID(as_uuid=True), sa.ForeignKey("law_firms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("to_email", sa.String(255), nullable=False),
        sa.Column("to_name", sa.String(255), nullable=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("success", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("sent_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_email_logs_law_firm_id", "email_logs", ["law_firm_id"])
    op.create_index("ix_email_logs_sent_at", "email_logs", ["sent_at"])


def downgrade():
    op.drop_table("email_logs")
