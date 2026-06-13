"""Add billing_adjustments table.

Revision ID: 006_add_billing_adjustments
Revises: 005_fix_cascade_user_hours
Create Date: 2026-06-13

Changes:
- Creates billing_adjustments table with all BaseModel columns (id, timestamps,
  audit fields, soft-delete) plus process-specific billing adjustment fields:
  process_id, law_firm_id, nombre, descripcion, monto.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006_add_billing_adjustments"
down_revision = "005_fix_cascade_user_hours"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "billing_adjustments",
        # BaseModel: id
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        # TimestampMixin
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        # AuditMixin
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default=sa.text("FALSE")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "deleted_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # BillingAdjustment-specific columns
        sa.Column(
            "process_id",
            UUID(as_uuid=True),
            sa.ForeignKey("case_processes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "law_firm_id",
            UUID(as_uuid=True),
            sa.ForeignKey("law_firms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(100), nullable=True),
        sa.Column("descripcion", sa.Text, nullable=False),
        sa.Column("monto", sa.Numeric(12, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("billing_adjustments")
