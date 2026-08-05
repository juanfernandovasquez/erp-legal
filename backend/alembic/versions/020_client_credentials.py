"""020_client_credentials

Revision ID: 020
Revises: 019
Create Date: 2026-08-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'client_credentials',
        sa.Column('id', UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('client_id', UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('law_firm_id', UUID(as_uuid=True), sa.ForeignKey('law_firms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('titulo', sa.String(100), nullable=False),
        sa.Column('usuario', sa.String(255), nullable=True),
        sa.Column('clave', sa.String(255), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', UUID(as_uuid=True), nullable=True),
        sa.Column('updated_by', UUID(as_uuid=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_client_credentials_client_id', 'client_credentials', ['client_id'])
    op.create_index('ix_client_credentials_law_firm_id', 'client_credentials', ['law_firm_id'])


def downgrade() -> None:
    op.drop_index('ix_client_credentials_law_firm_id', 'client_credentials')
    op.drop_index('ix_client_credentials_client_id', 'client_credentials')
    op.drop_table('client_credentials')
