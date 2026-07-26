"""Add portal credentials to clients table.

Revision ID: 018_client_portal_credentials
Revises: 017_add_error_logs
Create Date: 2026-07-26

Changes:
- Adds portal_password_hash to clients (hashed password for portal login with RUC)
- Adds portal_access_enabled to clients (admin controls whether client can access portal)
"""

from alembic import op
import sqlalchemy as sa

revision = "018_client_portal_credentials"
down_revision = "017_add_error_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("portal_password_hash", sa.String(255), nullable=True),
    )
    op.add_column(
        "clients",
        sa.Column(
            "portal_access_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("clients", "portal_access_enabled")
    op.drop_column("clients", "portal_password_hash")
