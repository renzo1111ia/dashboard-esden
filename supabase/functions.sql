-- ============================================================
-- ESDEN Analytics Dashboard — RPC Functions (FINAL)
-- Paste this in the Supabase SQL Editor of your DATA project.
-- ============================================================

-- ── 1. Dynamic field upsert ────────
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

-- ── 2. KPI Totals (Extended for Dashboard) ────────────────────
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
  -- Total llamados
  SELECT COUNT(*) INTO v_total FROM public.post_call_analisis WHERE created_at BETWEEN p_from AND p_to;
  
  -- Atendidas
  SELECT COUNT(*) INTO v_contacted FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN');
  
  -- Fallidas (BUSY, INVALID_NUMBER, LATENCY_DROP, etc)
  SELECT COUNT(*) INTO v_failed FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status NOT IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN', 'VOICEMAIL', 'NO_CONTACT');

  -- Leads alcanzados (distinct lead_id contacted)
  SELECT COUNT(DISTINCT lead_id) INTO v_leads_alcanzados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN');

  -- Ilocalizables totales
  SELECT COUNT(*) INTO v_ilocalizables FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('NO_CONTACT', 'VOICEMAIL', 'INVALID_NUMBER');

  -- Teléfono erróneo
  SELECT COUNT(*) INTO v_tel_erroneo FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status = 'INVALID_NUMBER';

  -- Buzón de voz
  SELECT COUNT(*) INTO v_buzon FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status = 'VOICEMAIL';

  -- No cumplen requisitos (basado en is_qualified = false y motivo_anulacion)
  SELECT COUNT(*) INTO v_no_requisitos FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND motivo_anulacion ILIKE '%requisito%';

  -- No interesados
  SELECT COUNT(*) INTO v_no_interesados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND motivo_anulacion ILIKE '%interesa%';

  -- Leads cualificados
  SELECT COUNT(*) INTO v_qualified FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND is_qualified = TRUE;

  -- Total agendas
  SELECT COUNT(*) INTO v_agendas FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND agendado_con_asesor IS NOT NULL AND agendado_con_asesor != 'NO';

  -- Minutos y duración media
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

-- ── 3. Motivo Anulación ────────────────────────────
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

-- ── 4. Mejores Horas ──────────────────────────
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

-- ── 5. Tipología de llamadas ──────────────────────────────────
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

-- ── 6. Agendados vs No Agendados ──────────────────────────────
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

-- ── 7. Motivo No Contacto ──────────────────────────
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

-- ── 8. Area Historico (Evolución de Minutos) ──────────────────
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

-- ── 9. Master de interés ──────────────────────────────────────
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

-- ── 10. Opt-in WhatsApp ───────────────────────────────────────
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
