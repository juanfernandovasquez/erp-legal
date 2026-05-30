"""Normalize case statuses to activo / inactivo.

Revision ID: 001_normalize_case_statuses
Revises:
Create Date: 2026-05-24

Maps legacy multi-value statuses down to two canonical values:
  activo    – case is open and being worked on
  inactivo  – case is closed / archived
"""

from alembic import op
import sqlalchemy as sa

revision = "001_normalize_case_statuses"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Map any "open" legacy status → activo
    op.execute(
        sa.text("""
            UPDATE cases
            SET status = 'activo'
            WHERE status IN ('en_progreso', 'pendiente', 'en_pausa', 'active', 'open')
        """)
    )
    # Map any "closed" legacy status → inactivo
    op.execute(
        sa.text("""
            UPDATE cases
            SET status = 'inactivo'
            WHERE status IN ('cerrado', 'archivado', 'closed', 'archived')
        """)
    )


def downgrade() -> None:
    # No safe rollback — can't know original values.
    # If needed, restore from backup.
    pass
