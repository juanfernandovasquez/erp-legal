-- Row Level Security Policies for Multi-Tenancy
-- PostgreSQL 14+
-- Ensures each law_firm only sees their own data

-- ============================================================================
-- PREREQUISITES
-- ============================================================================

-- Enable extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set up the RLS context variable
SET app.current_law_firm_id = '';

-- ============================================================================
-- ENABLE RLS ON TENANT-AWARE TABLES
-- ============================================================================

-- Domain 1: User Management
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_team_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reviewers ENABLE ROW LEVEL SECURITY;

-- Domain 2: Cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_clients ENABLE ROW LEVEL SECURITY;

-- Domain 3: Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;

-- Domain 4: Timeline
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

-- Domain 5: Tasks & Hours
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_schedules ENABLE ROW LEVEL SECURITY;

-- Domain 6: Processes & Alerts
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_registries ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_credentials ENABLE ROW LEVEL SECURITY;

-- Domain 7: IA & Analysis
ALTER TABLE ia_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonimizacion_rules ENABLE ROW LEVEL SECURITY;

-- Domain 8: Audit & Clients
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LAW_FIRMS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS law_firms_tenant_isolation ON law_firms;
CREATE POLICY law_firms_tenant_isolation ON law_firms
    USING (id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- USERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- CASE_TEAM RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_team_access_via_case ON case_teams;
CREATE POLICY case_team_access_via_case ON case_teams
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- CASE_TEAM_HISTORY RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_team_history_access_via_case ON case_team_history;
CREATE POLICY case_team_history_access_via_case ON case_team_history
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- EXTERNAL_REVIEWERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS external_reviewers_access_via_case ON external_reviewers;
CREATE POLICY external_reviewers_access_via_case ON external_reviewers
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- CASES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS cases_tenant_isolation ON cases;
CREATE POLICY cases_tenant_isolation ON cases
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- CASE_HIERARCHY RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_hierarchy_access_via_parent ON case_hierarchy;
CREATE POLICY case_hierarchy_access_via_parent ON case_hierarchy
    USING (parent_case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (parent_case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- CASE_CLIENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_clients_access_via_case ON case_clients;
CREATE POLICY case_clients_access_via_case ON case_clients
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- DOCUMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS documents_access_via_case ON documents;
CREATE POLICY documents_access_via_case ON documents
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- DOCUMENT_METADATA RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS document_metadata_access_via_document ON document_metadata;
CREATE POLICY document_metadata_access_via_document ON document_metadata
    USING (document_id IN (
        SELECT id FROM documents
        WHERE case_id IN (
            SELECT id FROM cases
            WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
        )
    ))
    WITH CHECK (document_id IN (
        SELECT id FROM documents
        WHERE case_id IN (
            SELECT id FROM cases
            WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
        )
    ));

-- ============================================================================
-- CASE_EVENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_events_access_via_case ON case_events;
CREATE POLICY case_events_access_via_case ON case_events
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- CASE_UPDATES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_updates_access_via_case ON case_updates;
CREATE POLICY case_updates_access_via_case ON case_updates
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- TASKS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS tasks_access_via_case ON tasks;
CREATE POLICY tasks_access_via_case ON tasks
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- CASE_HOURS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_hours_access_via_case ON case_hours;
CREATE POLICY case_hours_access_via_case ON case_hours
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- INVOICE_METRICS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS invoice_metrics_access_via_case ON invoice_metrics;
CREATE POLICY invoice_metrics_access_via_case ON invoice_metrics
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- TASK_SCHEDULE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS task_schedule_tenant_isolation ON task_schedules;
CREATE POLICY task_schedule_tenant_isolation ON task_schedules
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- PROCESS_TYPES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS process_types_tenant_isolation ON process_types;
CREATE POLICY process_types_tenant_isolation ON process_types
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- CASE_ALERTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS case_alerts_access_via_case ON case_alerts;
CREATE POLICY case_alerts_access_via_case ON case_alerts
    USING (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- LEGAL_REGISTRIES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS legal_registries_tenant_isolation ON legal_registries;
CREATE POLICY legal_registries_tenant_isolation ON legal_registries
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- EXTERNAL_CREDENTIALS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS external_credentials_tenant_isolation ON external_credentials;
CREATE POLICY external_credentials_tenant_isolation ON external_credentials
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- IA_ANALYSIS_RESULTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS ia_analysis_results_access_via_case ON ia_analysis_results;
CREATE POLICY ia_analysis_results_access_via_case ON ia_analysis_results
    USING (case_id IS NULL OR case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ))
    WITH CHECK (case_id IS NULL OR case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- IA_AUDIT_LOGS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS ia_audit_logs_access_via_case ON ia_audit_logs;
CREATE POLICY ia_audit_logs_access_via_case ON ia_audit_logs
    USING (case_id IS NULL OR case_id IN (
        SELECT id FROM cases
        WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
    ));

-- ============================================================================
-- IA_FEEDBACK RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS ia_feedback_access_via_analysis ON ia_feedback;
CREATE POLICY ia_feedback_access_via_analysis ON ia_feedback
    USING (analysis_id IN (
        SELECT id FROM ia_analysis_results
        WHERE case_id IN (
            SELECT id FROM cases
            WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
        ) OR case_id IS NULL
    ))
    WITH CHECK (analysis_id IN (
        SELECT id FROM ia_analysis_results
        WHERE case_id IN (
            SELECT id FROM cases
            WHERE law_firm_id = current_setting('app.current_law_firm_id')::UUID
        ) OR case_id IS NULL
    ));

-- ============================================================================
-- ANONIMIZACION_RULES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS anonimizacion_rules_tenant_isolation ON anonimizacion_rules;
CREATE POLICY anonimizacion_rules_tenant_isolation ON anonimizacion_rules
    USING (law_firm_id IS NULL OR law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id IS NULL OR law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- AUDIT_LOGS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);

-- ============================================================================
-- CLIENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
CREATE POLICY clients_tenant_isolation ON clients
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);
