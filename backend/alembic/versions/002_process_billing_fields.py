"""Add billing fields to case_processes.

Revision ID: 002_process_billing_fields
Revises: 001_normalize_case_statuses
Create Date: 2026-06-06

Adds tipo_tarifa, tarifa, moneda to case_processes table.
"""

from alembic import op
import sqlalchemy as sa

revision = "002_process_billing_fields"
down_revision = "001_normalize_case_statuses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("case_processes", sa.Column("tipo_tarifa", sa.String(20), nullable=True))
    op.add_column("case_processes", sa.Column("tarifa", sa.Numeric(12, 2), nullable=True))
    op.add_column("case_processes", sa.Column("moneda", sa.String(3), nullable=True, server_default="PEN"))


def downgrade() -> None:
    op.drop_column("case_processes", "moneda")
    op.drop_column("case_processes", "tarifa")
    op.drop_column("case_processes", "tipo_tarifa")
