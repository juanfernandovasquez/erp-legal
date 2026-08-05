"""021_migrate_sol_credentials

Migra los campos usuario_sol / clave_sol de la tabla clients
al nuevo sistema client_credentials con titulo='SUNAT SOL'.

Revision ID: 021_migrate_sol_credentials
Revises: 020_client_credentials
Create Date: 2026-08-04

"""
from alembic import op

revision = '021_migrate_sol_credentials'
down_revision = '020_client_credentials'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO client_credentials (id, client_id, law_firm_id, titulo, usuario, clave, is_deleted, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            id,
            law_firm_id,
            'SUNAT SOL',
            usuario_sol,
            clave_sol,
            false,
            now(),
            now()
        FROM clients
        WHERE (usuario_sol IS NOT NULL OR clave_sol IS NOT NULL)
          AND is_deleted = false
          AND id NOT IN (
              SELECT client_id FROM client_credentials
              WHERE titulo = 'SUNAT SOL' AND is_deleted = false
          )
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM client_credentials
        WHERE titulo = 'SUNAT SOL'
    """)
