"""Make case_hours.user_id nullable with SET NULL on user delete.

Revision ID: 005_fix_cascade_user_hours
Revises: 004_simplify_users
Create Date: 2026-06-07

Changes:
- case_hours.user_id: NOT NULL → nullable, CASCADE → SET NULL
  Ensures that deleting a user (even a hard delete) never removes their
  historical hour records. The record survives with user_id = NULL.
"""

from alembic import op
import sqlalchemy as sa

revision = "005_fix_cascade_user_hours"
down_revision = "004_simplify_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old FK constraint
    op.drop_constraint("case_hours_user_id_fkey", "case_hours", type_="foreignkey")

    # Make the column nullable
    op.alter_column("case_hours", "user_id", nullable=True)

    # Re-add FK with SET NULL
    op.create_foreign_key(
        "case_hours_user_id_fkey",
        "case_hours", "users",
        ["user_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("case_hours_user_id_fkey", "case_hours", type_="foreignkey")
    op.alter_column("case_hours", "user_id", nullable=False)
    op.create_foreign_key(
        "case_hours_user_id_fkey",
        "case_hours", "users",
        ["user_id"], ["id"],
        ondelete="CASCADE",
    )
