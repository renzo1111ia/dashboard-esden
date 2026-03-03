-- ============================================================
-- ESDEN Analytics Dashboard — REPAIR & SETUP SCRIPT
-- RUN THIS IF YOU HAVE "COLUMN DOES NOT EXIST" ERRORS
-- ============================================================

-- ── 1. Create or Update Table ────────
CREATE TABLE IF NOT EXISTS public.post_call_analisis (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Ensure all columns exist (Migration)
DO $$ 
BEGIN
  -- Add basic columns if they somehow don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='id') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='created_at') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  -- Add other columns one by one
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='lead_id') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN lead_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='phone_number') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN phone_number VARCHAR(30);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='call_status') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN call_status VARCHAR(80) NOT NULL DEFAULT 'UNKNOWN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='duration_seconds') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN duration_seconds INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='motivo_anulacion') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN motivo_anulacion VARCHAR(150);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='motivo_no_contacto') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN motivo_no_contacto VARCHAR(150);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='tipologia_llamada') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN tipologia_llamada VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='master_interes') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN master_interes VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='is_qualified') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN is_qualified BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='agendado_con_asesor') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN agendado_con_asesor VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='opt_in_whatsapp') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN opt_in_whatsapp VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_call_analisis' AND column_name='extra_data') THEN
    ALTER TABLE public.post_call_analisis ADD COLUMN extra_data JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ── 2. Create Indexes ────────
CREATE INDEX IF NOT EXISTS idx_pca_created_at ON public.post_call_analisis (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pca_call_status ON public.post_call_analisis (call_status);
CREATE INDEX IF NOT EXISTS idx_pca_is_qualified ON public.post_call_analisis (is_qualified);
CREATE INDEX IF NOT EXISTS idx_pca_extra_data_gin ON public.post_call_analisis USING GIN (extra_data);

-- ── 3. Security (RLS) ────────
ALTER TABLE public.post_call_analisis ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all during development' AND tablename = 'post_call_analisis') THEN
        CREATE POLICY "Allow all during development"
          ON public.post_call_analisis
          FOR ALL
          USING (true)
          WITH CHECK (true);
    END IF;
END $$;

-- ── 4. RPC Functions ────────

-- Dynamic field upsert
CREATE OR REPLACE FUNCTION upsert_extra_field(
  p_id    UUID,
  p_key   TEXT,
  p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.post_call_analisis
  SET extra_data = extra_data || jsonb_build_object(p_key, p_value)
  WHERE id = p_id;
END;
$$;

-- KPI Totals
CREATE OR REPLACE FUNCTION get_kpi_totals(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total              INTEGER;
  v_contacted          INTEGER;
  v_failed             INTEGER;
  v_leads_alcanzados   INTEGER;
  v_ilocalizables      INTEGER;
  v_tel_erroneo        INTEGER;
  v_buzon              INTEGER;
  v_no_requisitos      INTEGER;
  v_no_interesados     INTEGER;
  v_qualified          INTEGER;
  v_agendas            INTEGER;
  v_total_seconds      NUMERIC;
  v_avg_duration       NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.post_call_analisis WHERE created_at BETWEEN p_from AND p_to;
  
  SELECT COUNT(*) INTO v_contacted FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN');
  
  SELECT COUNT(*) INTO v_failed FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status NOT IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN', 'VOICEMAIL', 'NO_CONTACT');

  SELECT COUNT(DISTINCT lead_id) INTO v_leads_alcanzados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN');

  SELECT COUNT(*) INTO v_ilocalizables FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('NO_CONTACT', 'VOICEMAIL', 'INVALID_NUMBER');

  SELECT COUNT(*) INTO v_tel_erroneo FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status = 'INVALID_NUMBER';

  SELECT COUNT(*) INTO v_buzon FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status = 'VOICEMAIL';

  SELECT COUNT(*) INTO v_no_requisitos FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND motivo_anulacion ILIKE '%requisito%';

  SELECT COUNT(*) INTO v_no_interesados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND motivo_anulacion ILIKE '%interesa%';

  SELECT COUNT(*) INTO v_qualified FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND is_qualified = TRUE;

  SELECT COUNT(*) INTO v_agendas FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND agendado_con_asesor IS NOT NULL AND agendado_con_asesor != 'NO';

  SELECT SUM(duration_seconds), AVG(duration_seconds) INTO v_total_seconds, v_avg_duration 
  FROM public.post_call_analisis WHERE created_at BETWEEN p_from AND p_to;

  RETURN json_build_object(
    'total_llamados', v_total,
    'llamadas_atendidas_gen', v_contacted,
    'fallidas_gen', v_failed,
    'leads_totales_alcanzados_gen', v_leads_alcanzados,
    'leads_totales_ilocalizables', v_ilocalizables,
    'ilocalizables_telefono', v_tel_erroneo,
    'ilocalizables_buzon', v_buzon,
    'no_cumplen_requisitos', v_no_requisitos,
    'no_interesados_gen', v_no_interesados,
    'leads_cualificados_gen', v_qualified,
    'total_agendas_gen', v_agendas,
    'duracion_media', ROUND(COALESCE(v_avg_duration, 0) / 60, 2),
    'total_minutos_gen', ROUND(COALESCE(v_total_seconds, 0) / 60, 2)
  );
END;
$$;

-- Motivo Anulación
CREATE OR REPLACE FUNCTION get_leads_no_cualificados(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(motivo TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(motivo_anulacion, 'Sin motivo') AS motivo,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
    AND is_qualified = FALSE AND motivo_anulacion IS NOT NULL
  GROUP BY motivo_anulacion
  ORDER BY cantidad DESC;
$$;

-- Mejores Horas
CREATE OR REPLACE FUNCTION get_mejores_horas(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(hora TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    to_char(created_at, 'HH24:00') AS hora,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY hora
  ORDER BY hora ASC;
$$;

-- Tipología de llamadas
CREATE OR REPLACE FUNCTION get_tipologia_llamadas(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(tipologia TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(tipologia_llamada, 'Desconocido') AS tipologia,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY tipologia_llamada
  ORDER BY cantidad DESC;
$$;

-- Agendados vs No Agendados
CREATE OR REPLACE FUNCTION get_agendados_vs_no_agendados(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(status TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    CASE WHEN agendado_con_asesor IS NOT NULL AND agendado_con_asesor != 'NO' THEN 'Agendado' ELSE 'No Agendado' END AS status,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to AND is_qualified = TRUE
  GROUP BY status;
$$;

-- Motivo No Contacto
CREATE OR REPLACE FUNCTION get_motivo_no_contacto(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(motivo TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(motivo_no_contacto, 'Sin motivo') AS motivo,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
    AND call_status IN ('NO_CONTACT', 'VOICEMAIL', 'BUSY')
  GROUP BY motivo_no_contacto
  ORDER BY cantidad DESC;
$$;

-- Area Historico (Evolución de Minutos)
CREATE OR REPLACE FUNCTION get_area_historico(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(date TEXT, totales NUMERIC, facturados NUMERIC)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    to_char(created_at, 'Mon DD') AS date,
    ROUND(SUM(duration_seconds) / 60, 2) AS totales,
    ROUND(SUM(CASE WHEN duration_seconds > 0 THEN duration_seconds ELSE 0 END) / 60, 2) AS facturados
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY date_trunc('day', created_at), date
  ORDER BY date_trunc('day', created_at) ASC;
$$;

-- Master de interés
CREATE OR REPLACE FUNCTION get_master_interes(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(interes TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(master_interes, 'No determinado') AS interes,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY master_interes
  ORDER BY cantidad DESC;
$$;

-- Opt-in WhatsApp
CREATE OR REPLACE FUNCTION get_opt_in_whatsapp(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(optin TEXT, cantidad BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(opt_in_whatsapp, 'NO') AS optin,
    COUNT(*) AS cantidad
  FROM public.post_call_analisis
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY opt_in_whatsapp
  ORDER BY cantidad DESC;
$$;
