"""Move billing_adjustments from process_id to case_id.

Revision ID: 007_billing_adjustments_case_level
Revises: 006_add_billing_adjustments
Create Date: 2026-06-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "007_billing_case"
down_revision = "006_add_billing_adjustments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop process_id FK and column (table has no production data)
    op.execute(
        "ALTER TABLE billing_adjustments DROP COLUMN IF EXISTS process_id"
    )
    # Add case_id column
    op.add_column(
        "billing_adjustments",
        sa.Column("case_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_billing_adjustments_case_id",
        "billing_adjustments",
        "cases",
        ["case_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # No existing rows, so safe to make NOT NULL immediately
    op.alter_column("billing_adjustments", "case_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint(
        "fk_billing_adjustments_case_id", "billing_adjustments", type_="foreignkey"
    )
    op.drop_column("billing_adjustments", "case_id")
    op.add_column(
        "billing_adjustments",
        sa.Column(
            "process_id",
            UUID(as_uuid=True),
            sa.ForeignKey("case_processes.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
