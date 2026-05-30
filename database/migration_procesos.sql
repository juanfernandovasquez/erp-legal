-- ============================================================
-- Migración: Tabla case_processes + process_id en tasks
-- Ejecutar en: docker exec -it erp-legal-postgres psql -U postgres -d erp_legal
-- ============================================================

-- 1. Crear tabla de procesos del caso
CREATE TABLE IF NOT EXISTS case_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  law_firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  orden INT NOT NULL DEFAULT 1,
  fecha_inicio TIMESTAMP WITH TIME ZONE,
  fecha_fin TIMESTAMP WITH TIME ZONE,
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id)
);

-- 2. Agregar process_id a tasks (nullable: tareas existentes sin proceso siguen funcionando)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES case_processes(id) ON DELETE RESTRICT;

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_case_processes_case_id     ON case_processes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_processes_law_firm_id ON case_processes(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_case_processes_estado      ON case_processes(estado);
CREATE INDEX IF NOT EXISTS idx_tasks_process_id           ON tasks(process_id);

SELECT 'Migración completada correctamente' AS resultado;
