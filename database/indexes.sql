-- Strategic Indexes for Performance
-- PostgreSQL 14+

-- ============================================================================
-- DOMAIN 1: USER MANAGEMENT INDEXES
-- ============================================================================

CREATE INDEX idx_users_law_firm_id ON users(law_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_users_email ON users(email) WHERE is_deleted = false;
CREATE INDEX idx_users_created_at ON users(created_at) WHERE is_deleted = false;

CREATE INDEX idx_case_teams_case_id ON case_teams(case_id) WHERE is_deleted = false;
CREATE INDEX idx_case_teams_user_id ON case_teams(user_id) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_case_teams_unique_active ON case_teams(case_id, user_id) WHERE is_deleted = false;

CREATE INDEX idx_case_team_history_case_id ON case_team_history(case_id);
CREATE INDEX idx_case_team_history_user_id ON case_team_history(user_id);

CREATE INDEX idx_external_reviewers_user_id ON external_reviewers(user_id) WHERE is_deleted = false;
CREATE INDEX idx_external_reviewers_case_id ON external_reviewers(case_id) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 2: CASES INDEXES
-- ============================================================================

CREATE INDEX idx_cases_law_firm_id ON cases(law_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_cases_parent_case_id ON cases(parent_case_id) WHERE is_deleted = false;
CREATE INDEX idx_cases_status ON cases(status) WHERE is_deleted = false;
CREATE INDEX idx_cases_priority ON cases(priority) WHERE is_deleted = false;
CREATE INDEX idx_cases_opened_date ON cases(opened_date) WHERE is_deleted = false;
CREATE INDEX idx_cases_due_date ON cases(due_date) WHERE is_deleted = false;

CREATE INDEX idx_case_hierarchy_parent_id ON case_hierarchy(parent_case_id);
CREATE INDEX idx_case_hierarchy_child_id ON case_hierarchy(child_case_id);

CREATE INDEX idx_case_clients_case_id ON case_clients(case_id) WHERE is_deleted = false;
CREATE INDEX idx_case_clients_client_id ON case_clients(client_id) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_case_clients_unique ON case_clients(case_id, client_id) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 3: DOCUMENTS INDEXES
-- ============================================================================

CREATE INDEX idx_documents_case_id ON documents(case_id) WHERE is_deleted = false;
CREATE INDEX idx_documents_document_type ON documents(document_type) WHERE is_deleted = false;
CREATE INDEX idx_documents_is_confidential ON documents(is_confidential) WHERE is_deleted = false;
CREATE INDEX idx_documents_created_at ON documents(created_at) WHERE is_deleted = false;

CREATE INDEX idx_document_metadata_document_id ON document_metadata(document_id) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 4: TIMELINE INDEXES
-- ============================================================================

CREATE INDEX idx_case_events_case_id ON case_events(case_id) WHERE is_deleted = false;
CREATE INDEX idx_case_events_event_type ON case_events(event_type) WHERE is_deleted = false;
CREATE INDEX idx_case_events_event_date ON case_events(event_date) WHERE is_deleted = false;
CREATE INDEX idx_case_events_created_by ON case_events(created_by) WHERE is_deleted = false;

CREATE INDEX idx_case_updates_case_id ON case_updates(case_id) WHERE is_deleted = false;
CREATE INDEX idx_case_updates_created_by ON case_updates(created_by) WHERE is_deleted = false;
CREATE INDEX idx_case_updates_update_type ON case_updates(update_type) WHERE is_deleted = false;
CREATE INDEX idx_case_updates_is_client_visible ON case_updates(is_client_visible) WHERE is_deleted = false;
CREATE INDEX idx_case_updates_created_at ON case_updates(created_at) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 5: TASKS & HOURS INDEXES
-- ============================================================================

CREATE INDEX idx_tasks_case_id ON tasks(case_id) WHERE is_deleted = false;
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id) WHERE is_deleted = false;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE is_deleted = false;
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE is_deleted = false;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE is_deleted = false;

CREATE INDEX idx_case_hours_case_id ON case_hours(case_id) WHERE is_deleted = false;
CREATE INDEX idx_case_hours_user_id ON case_hours(user_id) WHERE is_deleted = false;
CREATE INDEX idx_case_hours_work_date ON case_hours(work_date) WHERE is_deleted = false;
CREATE INDEX idx_case_hours_is_billable ON case_hours(is_billable) WHERE is_deleted = false;
CREATE INDEX idx_case_hours_approved_by ON case_hours(approved_by) WHERE approved_by IS NOT NULL AND is_deleted = false;

CREATE INDEX idx_invoice_metrics_case_id ON invoice_metrics(case_id) WHERE is_deleted = false;

CREATE INDEX idx_task_schedules_law_firm_id ON task_schedules(law_firm_id) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 6: PROCESSES & ALERTS INDEXES
-- ============================================================================

CREATE INDEX idx_process_types_law_firm_id ON process_types(law_firm_id) WHERE is_deleted = false;

CREATE INDEX idx_case_alerts_case_id ON case_alerts(case_id) WHERE is_deleted = false;
CREATE INDEX idx_case_alerts_alert_type ON case_alerts(alert_type) WHERE is_deleted = false;
CREATE INDEX idx_case_alerts_alert_date ON case_alerts(alert_date) WHERE is_deleted = false;
CREATE INDEX idx_case_alerts_due_date ON case_alerts(due_date) WHERE is_deleted = false;
CREATE INDEX idx_case_alerts_is_resolved ON case_alerts(is_resolved) WHERE is_deleted = false;

CREATE INDEX idx_legal_registries_law_firm_id ON legal_registries(law_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_legal_registries_case_id ON legal_registries(case_id) WHERE is_deleted = false;
CREATE INDEX idx_legal_registries_registry_type ON legal_registries(registry_type) WHERE is_deleted = false;
CREATE INDEX idx_legal_registries_status ON legal_registries(status) WHERE is_deleted = false;

CREATE INDEX idx_external_credentials_law_firm_id ON external_credentials(law_firm_id) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 7: IA & ANALYSIS INDEXES
-- ============================================================================

CREATE INDEX idx_ia_analysis_results_case_id ON ia_analysis_results(case_id) WHERE is_deleted = false;
CREATE INDEX idx_ia_analysis_results_tipo ON ia_analysis_results(tipo_analisis);
CREATE INDEX idx_ia_analysis_results_estado ON ia_analysis_results(estado);

CREATE INDEX idx_ia_audit_logs_case_id ON ia_audit_logs(case_id);
CREATE INDEX idx_ia_audit_logs_analysis_id ON ia_audit_logs(analysis_id);
CREATE INDEX idx_ia_audit_logs_timestamp ON ia_audit_logs(timestamp);

CREATE INDEX idx_ia_feedback_analysis_id ON ia_feedback(analysis_id) WHERE is_deleted = false;
CREATE INDEX idx_ia_feedback_user_id ON ia_feedback(user_id) WHERE is_deleted = false;

CREATE INDEX idx_anonimizacion_rules_law_firm_id ON anonimizacion_rules(law_firm_id) WHERE is_deleted = false;

-- ============================================================================
-- DOMAIN 8: AUDIT & SECURITY INDEXES
-- ============================================================================

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_law_firm_id ON audit_logs(law_firm_id);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

CREATE INDEX idx_clients_law_firm_id ON clients(law_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_clients_email ON clients(email) WHERE is_deleted = false;
CREATE INDEX idx_clients_client_type ON clients(client_type) WHERE is_deleted = false;
CREATE INDEX idx_clients_is_active ON clients(is_active) WHERE is_deleted = false;

-- ============================================================================
-- LAW FIRMS INDEXES
-- ============================================================================

CREATE INDEX idx_law_firms_subscription_plan ON law_firms(subscription_plan) WHERE is_deleted = false;
CREATE INDEX idx_law_firms_is_active ON law_firms(is_active) WHERE is_deleted = false;

-- ============================================================================
-- COMPOSITE INDEXES (for common query patterns)
-- ============================================================================

-- Case lookups by firm and status
CREATE INDEX idx_cases_firm_status ON cases(law_firm_id, status) WHERE is_deleted = false;

-- Case hours by user and period
CREATE INDEX idx_case_hours_user_period ON case_hours(user_id, work_date) WHERE is_deleted = false AND is_billable = true;

-- ============================================================================
-- FULL TEXT SEARCH INDEXES (for Phase 2 enhancement)
-- ============================================================================

CREATE INDEX idx_documents_ft ON documents USING GIN(to_tsvector('spanish', file_name || ' ' || COALESCE(description, ''))) WHERE is_deleted = false;

CREATE INDEX idx_case_updates_ft ON case_updates USING GIN(to_tsvector('spanish', content)) WHERE is_deleted = false;

CREATE INDEX idx_cases_ft ON cases USING GIN(to_tsvector('spanish', title || ' ' || COALESCE(description, ''))) WHERE is_deleted = false;
