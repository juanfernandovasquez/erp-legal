-- Legal ERP System - Complete Schema
-- PostgreSQL 14+
-- English column names matching Python SQLAlchemy models

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DOMAIN 1: LAW FIRM & USER MANAGEMENT
-- ============================================================================

CREATE TABLE law_firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'PER',
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) NOT NULL DEFAULT '#000000',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_users INT NOT NULL DEFAULT 10,
    max_cases INT NOT NULL DEFAULT 100,
    max_storage_gb INT NOT NULL DEFAULT 100,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'standard',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID NOT NULL REFERENCES law_firms(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    google_email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'abogado_junior',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    bio TEXT,
    last_password_change TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 2: PROCESS TYPES (referenced by cases)
-- ============================================================================

CREATE TABLE process_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    jurisdiction VARCHAR(255),
    court_level VARCHAR(100),
    average_duration_days INT,
    standard_document_requirements TEXT,
    typical_steps TEXT,
    estimated_cost NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_standard BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 3: CLIENTS
-- ============================================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NOT NULL DEFAULT 'individual',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    organization_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    industry VARCHAR(100),
    website VARCHAR(255),
    notes TEXT,
    tags JSON,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_preferred BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 4: CASES & STRUCTURE
-- ============================================================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    parent_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    case_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    case_type VARCHAR(50) NOT NULL DEFAULT 'other',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    opened_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    closed_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    court_name VARCHAR(255),
    court_location VARCHAR(255),
    judge_name VARCHAR(255),
    plaintiff VARCHAR(255),
    defendant VARCHAR(255),
    opponent_representation TEXT,
    budget_amount NUMERIC(12,2),
    budget_currency VARCHAR(3) DEFAULT 'PEN',
    spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    estimated_completion_date TIMESTAMP WITH TIME ZONE,
    external_case_id VARCHAR(255),
    process_type_id UUID REFERENCES process_types(id) ON DELETE SET NULL,
    tipo_facturacion VARCHAR(20),
    moneda_facturacion VARCHAR(3) DEFAULT 'PEN',
    precio_facturacion NUMERIC(12,2),
    tags JSON,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    UNIQUE(law_firm_id, case_number)
);

CREATE TABLE case_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    orden INTEGER NOT NULL DEFAULT 1,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    tipo_tarifa VARCHAR(20),
    tarifa NUMERIC(12,2),
    moneda VARCHAR(3) DEFAULT 'PEN'
);

CREATE TABLE case_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_case_id UUID NOT NULL REFERENCES cases(id),
    child_case_id UUID NOT NULL UNIQUE REFERENCES cases(id),
    orden INT DEFAULT 0
);

CREATE TABLE case_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL DEFAULT 'principal',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    UNIQUE(case_id, client_id)
);

-- ============================================================================
-- DOMAIN 5: CASE TEAMS
-- ============================================================================

CREATE TABLE case_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL DEFAULT 'member',
    is_lead BOOLEAN NOT NULL DEFAULT false,
    assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    UNIQUE(case_id, user_id)
);

CREATE TABLE case_team_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_role VARCHAR(100),
    new_role VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE external_reviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    external_name VARCHAR(255) NOT NULL DEFAULT '',
    external_email VARCHAR(255) NOT NULL DEFAULT '',
    external_organization VARCHAR(255),
    can_view_documents BOOLEAN NOT NULL DEFAULT true,
    can_comment BOOLEAN NOT NULL DEFAULT true,
    can_download BOOLEAN NOT NULL DEFAULT false,
    assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    access_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 6: DOCUMENTS
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL DEFAULT 'other',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL DEFAULT '',
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    s3_bucket VARCHAR(255) NOT NULL DEFAULT '',
    s3_key VARCHAR(500) NOT NULL DEFAULT '',
    s3_version_id VARCHAR(255),
    created_by_document UUID REFERENCES users(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_latest_version BOOLEAN NOT NULL DEFAULT true,
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    encryption_key_id VARCHAR(255),
    uploaded_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_date TIMESTAMP WITH TIME ZONE,
    filed_date TIMESTAMP WITH TIME ZONE,
    tags JSON,
    custom_metadata JSON,
    has_ocr BOOLEAN NOT NULL DEFAULT false,
    ocr_text TEXT,
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    confidence NUMERIC(5,4),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 7: TIMELINE & TRACKING
-- ============================================================================

CREATE TABLE case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    event_end_date TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    is_reminder_set BOOLEAN NOT NULL DEFAULT false,
    reminder_days_before INTEGER,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE case_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    update_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
    is_internal BOOLEAN NOT NULL DEFAULT true,
    is_client_visible BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 8: TASKS & HOURS
-- ============================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    estimated_hours NUMERIC(8,2),
    actual_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
    hourly_rate NUMERIC(8,2),
    is_billable BOOLEAN NOT NULL DEFAULT true,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    tags JSON,
    notes TEXT,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE task_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    recurrence_pattern VARCHAR(50) NOT NULL,
    recurrence_rule TEXT,
    next_occurrence TIMESTAMP WITH TIME ZONE,
    last_occurrence TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE case_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    hours NUMERIC(8,2) NOT NULL,
    description TEXT,
    work_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    invoice_id VARCHAR(100),
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE invoice_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    total_billable_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_billed_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    outstanding_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_invoice_date TIMESTAMP WITH TIME ZONE,
    next_invoice_date TIMESTAMP WITH TIME ZONE,
    invoice_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 9: ALERTS & REGISTRIES
-- ============================================================================

CREATE TABLE case_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    alert_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    alert_metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE legal_registries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    registry_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    submission_date TIMESTAMP WITH TIME ZONE,
    approval_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    reference_number VARCHAR(100),
    external_url VARCHAR(500),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    tags JSON,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 10: AUDIT & SECURITY
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSON,
    new_values JSON,
    http_method VARCHAR(10),
    endpoint VARCHAR(500),
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    status_code INT,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE external_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID NOT NULL REFERENCES law_firms(id),
    plataforma VARCHAR(100) NOT NULL,
    username_encrypted BYTEA NOT NULL,
    password_encrypted BYTEA NOT NULL,
    url_acceso VARCHAR(500),
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    responsable_id UUID NOT NULL REFERENCES users(id),
    ultima_rotacion TIMESTAMP,
    proxima_rotacion DATE,
    notas TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ============================================================================
-- DOMAIN 11: IA & ANALYSIS (Phase 2 - Structure only)
-- ============================================================================

CREATE TABLE ia_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id),
    tipo_analisis VARCHAR(100),
    modelo_usado VARCHAR(50),
    prompt_version VARCHAR(20),
    resultado JSONB,
    resultado_anonimizado JSONB,
    confianza_score DECIMAL(5,2),
    claims_validados INT DEFAULT 0,
    claims_no_validados INT DEFAULT 0,
    alucinaciones_detectadas INT DEFAULT 0,
    bias_flags JSONB,
    tokens_input INT,
    tokens_output INT,
    costo_estimado DECIMAL(8,4),
    latencia_ms INT,
    estado VARCHAR(50) DEFAULT 'procesando',
    validado_por UUID REFERENCES users(id),
    fecha_validacion TIMESTAMP,
    notas_validacion TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE ia_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id),
    analysis_id UUID REFERENCES ia_analysis_results(id),
    modelo VARCHAR(50),
    accion VARCHAR(100),
    datos_enviados_hash VARCHAR(64),
    tokens_consumidos INT,
    costo DECIMAL(8,4),
    latencia_ms INT,
    exitoso BOOLEAN DEFAULT true,
    error_detalle TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ia_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES ia_analysis_results(id),
    user_id UUID NOT NULL REFERENCES users(id),
    validacion VARCHAR(50) NOT NULL,
    comentarios TEXT,
    elementos_corregidos JSONB,
    fecha_validacion TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE TABLE anonimizacion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES law_firms(id),
    patron TEXT NOT NULL,
    tipo_dato VARCHAR(100) NOT NULL,
    reemplazo VARCHAR(100) NOT NULL,
    es_automatico BOOLEAN DEFAULT true,
    aprobado_por UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);
