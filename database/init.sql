-- Master initialization file for Legal ERP System
-- PostgreSQL 14+
-- This file orchestrates the creation of schema, RLS policies, and indexes

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EXECUTE SCHEMA CREATION (DO NOT MODIFY - auto-generated from schema.sql)
-- ============================================================================

\ir schema.sql

-- ============================================================================
-- EXECUTE RLS POLICIES (DO NOT MODIFY - auto-generated from rls_policies.sql)
-- ============================================================================

\ir rls_policies.sql

-- ============================================================================
-- EXECUTE INDEXES (DO NOT MODIFY - auto-generated from indexes.sql)
-- ============================================================================

\ir indexes.sql

-- ============================================================================
-- EXECUTE SEED DATA (DO NOT MODIFY - auto-generated from seeds.sql)
-- ============================================================================

\ir seeds.sql

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Verify all critical tables exist
DO $$
DECLARE
    expected_tables text[] := ARRAY[
        'law_firms', 'users', 'case_team', 'case_team_history', 'external_reviewers',
        'cases', 'case_hierarchy', 'case_clients',
        'documents', 'document_metadata',
        'case_events', 'case_updates',
        'tasks', 'case_hours', 'invoice_metrics', 'task_schedule',
        'process_types', 'case_alerts', 'legal_registries', 'external_credentials',
        'ia_analysis_results', 'ia_audit_log', 'ia_feedback', 'anonimizacion_rules',
        'audit_logs', 'clients'
    ];
    missing_tables text[];
BEGIN
    SELECT array_agg(t) INTO missing_tables
    FROM unnest(expected_tables) AS t
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t);

    IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing tables: %', missing_tables;
    ELSE
        RAISE NOTICE 'All 27 required tables created successfully!';
    END IF;
END $$;

-- Display schema info
RAISE NOTICE 'Legal ERP Database Initialization Complete!';
RAISE NOTICE 'Timestamp: %', NOW();
RAISE NOTICE 'PostgreSQL Version: %', version();
