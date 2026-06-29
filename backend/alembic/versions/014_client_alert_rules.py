"""Add client_alert_rules table

Revision ID: 014_client_alert_rules
Revises: 013_client_sol_credentials
Create Date: 2026-06-29
"""

import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "014_client_alert_rules"
down_revision = "013_client_sol_credentials"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "client_alert_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column("law_firm_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("law_firms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("fecha", sa.Date, nullable=False),
        sa.Column("es_anual", sa.Boolean, server_default="false", nullable=False),
        sa.Column("dias_anticipacion", sa.Integer, server_default="1", nullable=False),
        sa.Column("destinatarios", postgresql.JSON, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true", nullable=False),
        sa.Column("is_deleted", sa.Boolean, server_default="false", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # AuditMixin FK cols (nullable)
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_client_alert_rules_client_id", "client_alert_rules", ["client_id"])
    op.create_index("ix_client_alert_rules_law_firm_id", "client_alert_rules", ["law_firm_id"])


def downgrade():
    op.drop_index("ix_client_alert_rules_law_firm_id", "client_alert_rules")
    op.drop_index("ix_client_alert_rules_client_id", "client_alert_rules")
    op.drop_table("client_alert_rules")
