"""Add error_logs table for backend error monitoring.

Revision ID: 007_add_error_logs
Revises: 006_add_billing_adjustments
Create Date: 2026-07-05

Changes:
- Creates error_logs table to store unhandled 500 errors
- Captures method, path, error type/message, traceback, user context
- Supports resolution tracking (is_resolved, resolved_by, resolved_at)
- Auto-cleanup of entries older than 30 days handled at query level
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "007_add_error_logs"
down_revision = "006_add_billing_adjustments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "error_logs",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        # Request context
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("status_code", sa.Integer, nullable=False, server_default="500"),
        # Error details
        sa.Column("error_type", sa.String(200), nullable=False),
        sa.Column("error_message", sa.Text, nullable=False),
        sa.Column("traceback", sa.Text, nullable=True),
        # Who triggered it
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column(
            "law_firm_id",
            UUID(as_uuid=True),
            sa.ForeignKey("law_firms.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("request_body", sa.Text, nullable=True),
        # Resolution
        sa.Column("is_resolved", sa.Boolean, nullable=False, server_default="FALSE"),
        sa.Column(
            "resolved_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_error_logs_created_at", "error_logs", ["created_at"])
    op.create_index("ix_error_logs_is_resolved", "error_logs", ["is_resolved"])
    op.create_index("ix_error_logs_law_firm_id", "error_logs", ["law_firm_id"])


def downgrade() -> None:
    op.drop_index("ix_error_logs_law_firm_id", table_name="error_logs")
    op.drop_index("ix_error_logs_is_resolved", table_name="error_logs")
    op.drop_index("ix_error_logs_created_at", table_name="error_logs")
    op.drop_table("error_logs")
