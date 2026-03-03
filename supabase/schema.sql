-- ============================================================
-- ESDEN ANALYTICS DASHBOARD
-- Schema: post_call_analisis
-- Version: 1.0.0
-- ============================================================

-- Enable UUID extension (already active in Supabase, safe to run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: post_call_analisis
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_call_analisis (

  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  lead_id               VARCHAR(100),
  phone_number          VARCHAR(30),

  call_status           VARCHAR(80)   NOT NULL,
  duration_seconds      INTEGER,

  motivo_anulacion      VARCHAR(150),
  motivo_no_contacto    VARCHAR(150),

  tipologia_llamada     VARCHAR(100),
  master_interes        VARCHAR(100),
  is_qualified          BOOLEAN       NOT NULL DEFAULT FALSE,

  agendado_con_asesor   VARCHAR(20),
  opt_in_whatsapp       VARCHAR(20),

  -- ⚡ DYNAMIC MOTOR — NEVER alter this column structure
  extra_data            JSONB         NOT NULL DEFAULT '{}'::jsonb

);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pca_created_at
  ON public.post_call_analisis (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pca_call_status
  ON public.post_call_analisis (call_status);

CREATE INDEX IF NOT EXISTS idx_pca_lead_id
  ON public.post_call_analisis (lead_id);

CREATE INDEX IF NOT EXISTS idx_pca_is_qualified
  ON public.post_call_analisis (is_qualified);

CREATE INDEX IF NOT EXISTS idx_pca_created_at_status
  ON public.post_call_analisis (created_at DESC, call_status);

CREATE INDEX IF NOT EXISTS idx_pca_extra_data_gin
  ON public.post_call_analisis USING GIN (extra_data);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.post_call_analisis ENABLE ROW LEVEL SECURITY;

-- DEV POLICY — Replace with tenant-scoped policies in Phase 2
CREATE POLICY "Allow all during development"
  ON public.post_call_analisis
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE  public.post_call_analisis IS
  'Post-call analysis records from AI voice agent operations.';

COMMENT ON COLUMN public.post_call_analisis.extra_data IS
  'DYNAMIC MOTOR — user-defined field keys stored as JSONB. Do NOT alter column type or name.';
