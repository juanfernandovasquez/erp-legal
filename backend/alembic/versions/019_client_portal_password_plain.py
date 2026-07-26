"""add portal_password_plain to clients

Revision ID: 019_client_portal_password_plain
Revises: 018_client_portal_credentials
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa

revision = "019_client_portal_password_plain"
down_revision = "018_client_portal_credentials"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("portal_password_plain", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clients", "portal_password_plain")
