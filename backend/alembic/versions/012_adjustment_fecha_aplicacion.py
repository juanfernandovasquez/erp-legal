"""add fecha_aplicacion to billing_adjustments

Revision ID: 012_adjustment_fecha_aplicacion
Revises: 011_alert_task_link
Create Date: 2026-06-29
"""

from alembic import op
import sqlalchemy as sa

revision = "012_adjustment_fecha_aplicacion"
down_revision = "011_alert_task_link"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "billing_adjustments",
        sa.Column("fecha_aplicacion", sa.Date(), nullable=True),
    )


def downgrade():
    op.drop_column("billing_adjustments", "fecha_aplicacion")
