"""Add email verification and password reset token fields to users

Revision ID: 016_user_email_verification_tokens
Revises: 015_client_email_nullable
Create Date: 2026-07-04
"""

from alembic import op
import sqlalchemy as sa

revision = "016_email_verify_tokens"
down_revision = "015_client_email_nullable"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verification_token", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("email_verification_expires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("password_reset_token", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_users_email_verification_token", "users", ["email_verification_token"])
    op.create_index("ix_users_password_reset_token", "users", ["password_reset_token"])

    # Mark all existing users as verified so they are not locked out
    op.execute("UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE")


def downgrade():
    op.drop_index("ix_users_password_reset_token", table_name="users")
    op.drop_index("ix_users_email_verification_token", table_name="users")
    op.drop_column("users", "password_reset_expires")
    op.drop_column("users", "password_reset_token")
    op.drop_column("users", "email_verification_expires")
    op.drop_column("users", "email_verification_token")
