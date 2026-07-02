"""Make client email nullable

Revision ID: 015_client_email_nullable
Revises: 014_client_alert_rules
Create Date: 2026-07-02
"""

from alembic import op
import sqlalchemy as sa


revision = "015_client_email_nullable"
down_revision = "014_client_alert_rules"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("clients", "email", existing_type=sa.String(255), nullable=True)


def downgrade():
    op.alter_column("clients", "email", existing_type=sa.String(255), nullable=False)
