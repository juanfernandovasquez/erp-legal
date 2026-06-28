"""add task_id and source to case_alerts

Revision ID: 011_alert_task_link
Revises: 010_fix_audit_cols
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "011_alert_task_link"
down_revision = "010_fix_audit_cols"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "case_alerts",
        sa.Column("source", sa.String(10), nullable=False, server_default="manual"),
    )
    op.add_column(
        "case_alerts",
        sa.Column(
            "task_id",
            UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("case_alerts", "task_id")
    op.drop_column("case_alerts", "source")
