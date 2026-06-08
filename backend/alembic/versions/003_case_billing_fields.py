"""Add billing fields to cases.

Revision ID: 003_case_billing_fields
Revises: 002_process_billing_fields
Create Date: 2026-06-06

Adds tipo_facturacion, moneda_facturacion, precio_facturacion to cases table.
"""

from alembic import op
import sqlalchemy as sa

revision = "003_case_billing_fields"
down_revision = "002_process_billing_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("tipo_facturacion", sa.String(20), nullable=True))
    op.add_column("cases", sa.Column("moneda_facturacion", sa.String(3), nullable=True, server_default="PEN"))
    op.add_column("cases", sa.Column("precio_facturacion", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "precio_facturacion")
    op.drop_column("cases", "moneda_facturacion")
    op.drop_column("cases", "tipo_facturacion")
