"""fix missing audit columns in notification_rules and email_logs

Revision ID: 010_fix_audit_cols
Revises: 009_notif_rules
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "010_fix_audit_cols"
down_revision = "009_notif_rules"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("notification_rules", "email_logs"):
        op.add_column(table, sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        op.add_column(table, sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(table, sa.Column("deleted_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))


def downgrade():
    for table in ("notification_rules", "email_logs"):
        for col in ("created_by", "updated_by", "deleted_at", "deleted_by"):
            op.drop_column(table, col)
