"""add notification_rules table

Revision ID: 009_notif_rules
Revises: 008_email_logs
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "009_notif_rules"
down_revision = "008_email_logs"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notification_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("law_firm_id", UUID(as_uuid=True), sa.ForeignKey("law_firms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("days_before", sa.Integer, nullable=False),
        sa.Column("notify_assignee", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("notify_supervisors", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_notification_rules_case_id", "notification_rules", ["case_id"])
    op.create_index("ix_notification_rules_law_firm_id", "notification_rules", ["law_firm_id"])


def downgrade():
    op.drop_table("notification_rules")
