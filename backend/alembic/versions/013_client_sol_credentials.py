"""Add usuario_sol and clave_sol to clients

Revision ID: 013_client_sol_credentials
Revises: 012_adjustment_fecha_aplicacion
Create Date: 2026-06-29
"""

from alembic import op
import sqlalchemy as sa

revision = "013_client_sol_credentials"
down_revision = "012_adjustment_fecha_aplicacion"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("clients", sa.Column("usuario_sol", sa.String(100), nullable=True))
    op.add_column("clients", sa.Column("clave_sol", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("clients", "clave_sol")
    op.drop_column("clients", "usuario_sol")
