-- Seed Data for Legal ERP System
-- Sample data for development and testing

-- ============================================================================
-- CLEAR EXISTING DATA (for idempotency)
-- ============================================================================

-- Temporarily disable RLS for seeding
ALTER TABLE law_firms DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_hours DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Sample Law Firm
INSERT INTO law_firms (
    id, name, slug, email, phone, city, street_address, country,
    registration_number, is_active, max_users, max_cases, subscription_plan
) VALUES (
    '11111111-1111-1111-1111-111111111111'::UUID,
    'López & Asociados Abogados',
    'lopez-asociados-abogados',
    'contacto@lopezabogados.pe',
    '511-2255555',
    'Lima',
    'Av. Paseo de la República 3500, San Isidro, Lima',
    'PER',
    '20123456789',
    true,
    20,
    50,
    'profesional'
) ON CONFLICT DO NOTHING;

-- Sample Users
-- Admin
INSERT INTO users (
    id, law_firm_id, first_name, last_name, email, password_hash, role,
    phone
) VALUES (
    '22222222-2222-2222-2222-222222222222'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Jorge',
    'López',
    'jorge.lopez@lopezabogados.pe',
    '$2b$10$/Wu5JPwsp73MkfcyfPlKXuW0TbBGCjj5SlLHy3XWrwcNcIX./xCOS',
    'admin_firma',
    '511-987654321'
) ON CONFLICT DO NOTHING;

-- Senior Lawyer
INSERT INTO users (
    id, law_firm_id, first_name, last_name, email, password_hash, role,
    phone
) VALUES (
    '33333333-3333-3333-3333-333333333333'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'María',
    'Rodríguez',
    'maria.rodriguez@lopezabogados.pe',
    '$2b$10$/Wu5JPwsp73MkfcyfPlKXuW0TbBGCjj5SlLHy3XWrwcNcIX./xCOS',
    'abogado_senior',
    '511-987654322'
) ON CONFLICT DO NOTHING;

-- Junior Lawyer
INSERT INTO users (
    id, law_firm_id, first_name, last_name, email, password_hash, role,
    phone
) VALUES (
    '44444444-4444-4444-4444-444444444444'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Carlos',
    'Mendoza',
    'carlos.mendoza@lopezabogados.pe',
    '$2b$10$/Wu5JPwsp73MkfcyfPlKXuW0TbBGCjj5SlLHy3XWrwcNcIX./xCOS',
    'abogado_junior',
    '511-987654323'
) ON CONFLICT DO NOTHING;

-- Sample Clients
INSERT INTO clients (
    id, law_firm_id, name, client_type,
    email, phone, organization_name, registration_number
) VALUES (
    '55555555-5555-5555-5555-555555555555'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'ACME Corporation SAC',
    'business',
    'legal@acmecorp.pe',
    '511-2255556',
    'ACME Corporation SAC',
    '20123456789'
) ON CONFLICT DO NOTHING;

INSERT INTO clients (
    id, law_firm_id, name, client_type,
    email, phone
) VALUES (
    '66666666-6666-6666-6666-666666666666'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Juan Pérez García',
    'individual',
    'juan.perez@email.com',
    '511-987654330'
) ON CONFLICT DO NOTHING;

-- Sample Cases (parent case)
INSERT INTO cases (
    id, law_firm_id, case_number, title, description,
    case_type, status, priority,
    opened_date, due_date, budget_amount
) VALUES (
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'LYA-2024-0001',
    'Demanda de Incumplimiento de Contrato - ACME vs MegaCorp',
    'Demanda por incumplimiento de contrato de suministro de servicios de consultoría',
    'civil',
    'open',
    'high',
    '2024-01-15'::TIMESTAMP,
    '2024-12-31'::TIMESTAMP,
    150000.00
) ON CONFLICT DO NOTHING;

-- Sample Case 2 (sub-case of the parent)
INSERT INTO cases (
    id, law_firm_id, parent_case_id, case_number, title, description,
    case_type, status, priority,
    opened_date, due_date, budget_amount
) VALUES (
    '88888888-8888-8888-8888-888888888888'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    'LYA-2024-0001-AP',
    'Apelación - Demanda de Incumplimiento de Contrato',
    'Apelación de la sentencia en primera instancia',
    'civil',
    'in_progress',
    'high',
    '2024-06-15'::TIMESTAMP,
    '2025-06-30'::TIMESTAMP,
    150000.00
) ON CONFLICT DO NOTHING;

-- Link case hierarchy
INSERT INTO case_hierarchy (
    id, parent_case_id, child_case_id, orden
) VALUES (
    '99999999-9999-9999-9999-999999999999'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '88888888-8888-8888-8888-888888888888'::UUID,
    1
) ON CONFLICT DO NOTHING;

-- Link clients to case
INSERT INTO case_clients (
    id, case_id, client_id, law_firm_id, role
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '55555555-5555-5555-5555-555555555555'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'principal'
) ON CONFLICT DO NOTHING;

-- Sample Case Team membership
INSERT INTO case_teams (
    id, case_id, user_id, law_firm_id, role, is_lead
) VALUES (
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '33333333-3333-3333-3333-333333333333'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'lead_attorney',
    true
) ON CONFLICT DO NOTHING;

-- Sample Case Event
INSERT INTO case_events (
    id, case_id, law_firm_id, event_type, title, description,
    event_date, created_by
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'filing',
    'Demanda presentada ante la corte',
    'La demanda fue presentada exitosamente ante el juzgado civil competente',
    '2024-01-15 10:30:00'::TIMESTAMP,
    '22222222-2222-2222-2222-222222222222'::UUID
) ON CONFLICT DO NOTHING;

-- Sample Case Update
INSERT INTO case_updates (
    id, case_id, law_firm_id, title, content, update_type, is_internal, is_client_visible, created_by
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Respuesta de la contraparte recibida',
    'Se ha recibido respuesta de la contraparte. Se analizarán los argumentos presentados.',
    'progress_update',
    true,
    false,
    '33333333-3333-3333-3333-333333333333'::UUID
) ON CONFLICT DO NOTHING;

-- Sample Task
INSERT INTO tasks (
    id, case_id, law_firm_id, title, description, assignee_id,
    due_date, status, priority
) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Revisar presentación de la contraparte',
    'Realizar análisis detallado de la contestación y argumentos legales',
    '33333333-3333-3333-3333-333333333333'::UUID,
    '2024-02-15'::TIMESTAMP,
    'todo',
    'high'
) ON CONFLICT DO NOTHING;

-- Sample Case Hours (time tracking)
INSERT INTO case_hours (
    id, case_id, law_firm_id, user_id, work_date, hours,
    description, is_billable, hourly_rate, total_amount
) VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    '33333333-3333-3333-3333-333333333333'::UUID,
    '2024-01-20'::TIMESTAMP,
    4.5,
    'Redacción de escritos de demanda',
    true,
    150.00,
    675.00
) ON CONFLICT DO NOTHING;

INSERT INTO case_hours (
    id, case_id, law_firm_id, user_id, work_date, hours,
    description, is_billable, hourly_rate, total_amount
) VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    '44444444-4444-4444-4444-444444444444'::UUID,
    '2024-01-21'::TIMESTAMP,
    3.0,
    'Investigación de jurisprudencia relevante',
    true,
    100.00,
    300.00
) ON CONFLICT DO NOTHING;

-- Sample Alert
INSERT INTO case_alerts (
    id, case_id, law_firm_id, alert_type, severity, title, message,
    alert_date, due_date, created_by
) VALUES (
    '10101010-1010-1010-1010-101010101010'::UUID,
    '77777777-7777-7777-7777-777777777777'::UUID,
    '11111111-1111-1111-1111-111111111111'::UUID,
    'deadline_approaching',
    'warning',
    'Plazo para interponer apelación',
    'Vence el plazo de 10 días para interponer apelación de la sentencia',
    '2024-03-01 09:00:00'::TIMESTAMP,
    '2024-03-11 23:59:59'::TIMESTAMP,
    '22222222-2222-2222-2222-222222222222'::UUID
) ON CONFLICT DO NOTHING;

-- Re-enable RLS
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_hours ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    law_firm_count INT;
    user_count INT;
    case_count INT;
BEGIN
    SELECT COUNT(*) INTO law_firm_count FROM law_firms WHERE is_deleted = false;
    SELECT COUNT(*) INTO user_count FROM users WHERE is_deleted = false;
    SELECT COUNT(*) INTO case_count FROM cases WHERE is_deleted = false;

    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE 'Law firms: %', law_firm_count;
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Cases: %', case_count;
END $$;
