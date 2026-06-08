"""Simplify users table: remove job_title, department, last_login, is_active.

Revision ID: 004_simplify_users
Revises: 003_case_billing_fields
Create Date: 2026-06-07

Changes:
- Remove job_title column
- Remove department column
- Remove last_login column
- Remove is_active column (all users are considered active; access is controlled by is_deleted)
"""

from alembic import op
import sqlalchemy as sa

revision = "004_simplify_users"
down_revision = "003_case_billing_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "job_title")
    op.drop_column("users", "department")
    op.drop_column("users", "last_login")
    op.drop_column("users", "is_active")


def downgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("last_login", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("department", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("job_title", sa.String(100), nullable=True))
