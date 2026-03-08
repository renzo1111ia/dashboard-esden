-- ============================================================
-- ESDEN Analytics Dashboard — RPC Functions (FILTERED)
-- ============================================================

-- ── 1. Helper to apply common filters ────────────────────────
-- This logic is repeated across all functions to support curso, pais, origen, campana.

-- ── 2. KPI Totals (Filtered) ────────────────────
CREATE OR REPLACE FUNCTION get_kpi_totals(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
  SELECT COUNT(*) INTO v_total FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');
  
  -- Atendidas
  SELECT COUNT(*) INTO v_contacted FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to 
    AND call_status IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN')
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');
  
  -- Fallidas
  SELECT COUNT(*) INTO v_failed FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to 
    AND call_status NOT IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN', 'VOICEMAIL', 'NO_CONTACT')
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Leads alcanzados
  SELECT COUNT(DISTINCT lead_id) INTO v_leads_alcanzados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('CONTACTED', 'TRANSFERRED_TO_HUMAN')
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Ilocalizables totales
  SELECT COUNT(*) INTO v_ilocalizables FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status IN ('NO_CONTACT', 'VOICEMAIL', 'INVALID_NUMBER')
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Teléfono erróneo
  SELECT COUNT(*) INTO v_tel_erroneo FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status = 'INVALID_NUMBER'
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Buzón de voz
  SELECT COUNT(*) INTO v_buzon FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND call_status = 'VOICEMAIL'
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- No cumplen requisitos
  SELECT COUNT(*) INTO v_no_requisitos FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND motivo_anulacion ILIKE '%requisito%'
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- No interesados
  SELECT COUNT(*) INTO v_no_interesados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND motivo_anulacion ILIKE '%interesa%'
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Leads cualificados
  SELECT COUNT(*) INTO v_qualified FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND is_qualified = TRUE
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Total agendas
  SELECT COUNT(*) INTO v_agendas FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND agendado_con_asesor IS NOT NULL AND agendado_con_asesor != 'NO'
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

  -- Minutos y duración media
  SELECT SUM(duration_seconds), AVG(duration_seconds) INTO v_total_seconds, v_avg_duration 
  FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%');

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

-- ── 3. Motivo Anulación (Filtered) ────────────────────────────
CREATE OR REPLACE FUNCTION get_leads_no_cualificados(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY motivo_anulacion
  ORDER BY cantidad DESC;
$$;

-- ── 4. Mejores Horas (Filtered) ──────────────────────────
CREATE OR REPLACE FUNCTION get_mejores_horas(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY hora
  ORDER BY hora ASC;
$$;

-- ── 5. Tipología de llamadas (Filtered) ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_tipologia_llamadas(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY tipologia_llamada
  ORDER BY cantidad DESC;
$$;

-- ── 6. Agendados vs No Agendados (Filtered) ──────────────────────────────
CREATE OR REPLACE FUNCTION get_agendados_vs_no_agendados(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY status;
$$;

-- ── 7. Motivo No Contacto (Filtered) ──────────────────────────
CREATE OR REPLACE FUNCTION get_motivo_no_contacto(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY motivo_no_contacto
  ORDER BY cantidad DESC;
$$;

-- ── 8. Area Historico (Filtered) ──────────────────
CREATE OR REPLACE FUNCTION get_area_historico(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY date_trunc('day', created_at), date
  ORDER BY date_trunc('day', created_at) ASC;
$$;

-- ── 9. Master de interés (Filtered) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_master_interes(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY master_interes
  ORDER BY cantidad DESC;
$$;

-- ── 10. Opt-in WhatsApp (Filtered) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION get_opt_in_whatsapp(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
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
    AND (p_curso IS NULL OR master_interes ILIKE '%' || p_curso || '%')
    AND (p_pais IS NULL OR extra_data ->> 'pais' ILIKE '%' || p_pais || '%')
    AND (p_origen IS NULL OR extra_data ->> 'origen' ILIKE '%' || p_origen || '%')
    AND (p_campana IS NULL OR extra_data ->> 'campana' ILIKE '%' || p_campana || '%')
  GROUP BY opt_in_whatsapp
  ORDER BY cantidad DESC;
$$;

-- ── 11. Dynamic KPI Value (Filtered) ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_dynamic_kpi_value(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_calc_type TEXT,
  p_target_col TEXT,
  p_is_extra_target BOOLEAN DEFAULT FALSE,
  p_cond_col TEXT DEFAULT NULL,
  p_is_extra_cond BOOLEAN DEFAULT FALSE,
  p_cond_op TEXT DEFAULT NULL,
  p_cond_val TEXT DEFAULT NULL,
  p_curso TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_campana TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_res NUMERIC;
  v_where TEXT;
BEGIN
  v_where := 'created_at BETWEEN ' || quote_literal(p_from) || ' AND ' || quote_literal(p_to);
  
  -- Add filters
  IF p_curso IS NOT NULL THEN
    v_where := v_where || ' AND master_interes ILIKE ' || quote_literal('%' || p_curso || '%');
  END IF;
  IF p_pais IS NOT NULL THEN
    v_where := v_where || ' AND extra_data ->> ''pais'' ILIKE ' || quote_literal('%' || p_pais || '%');
  END IF;
  IF p_origen IS NOT NULL THEN
    v_where := v_where || ' AND extra_data ->> ''origen'' ILIKE ' || quote_literal('%' || p_origen || '%');
  END IF;
  IF p_campana IS NOT NULL THEN
    v_where := v_where || ' AND extra_data ->> ''campana'' ILIKE ' || quote_literal('%' || p_campana || '%');
  END IF;

  -- Condition filter
  IF p_cond_col IS NOT NULL AND p_cond_op IS NOT NULL AND p_cond_val IS NOT NULL THEN
    IF p_is_extra_cond THEN
      v_where := v_where || ' AND (extra_data ->> ' || quote_literal(p_cond_col) || ') ' || p_cond_op || ' ' || quote_literal(p_cond_val);
    ELSE
      v_where := v_where || ' AND ' || quote_ident(p_cond_col) || ' ' || p_cond_op || ' ' || quote_literal(p_cond_val);
    END IF;
  END IF;

  IF p_calc_type = 'count' THEN
    v_sql := 'SELECT COUNT(*) FROM public.post_call_analisis WHERE ' || v_where;
  ELSIF p_calc_type = 'sum' THEN
    IF p_is_extra_target THEN
      v_sql := 'SELECT SUM((extra_data ->> ' || quote_literal(p_target_col) || ')::NUMERIC) FROM public.post_call_analisis WHERE ' || v_where;
    ELSE
      v_sql := 'SELECT SUM(' || quote_ident(p_target_col) || ') FROM public.post_call_analisis WHERE ' || v_where;
    END IF;
  ELSIF p_calc_type = 'avg' THEN
    IF p_is_extra_target THEN
      v_sql := 'SELECT AVG((extra_data ->> ' || quote_literal(p_target_col) || ')::NUMERIC) FROM public.post_call_analisis WHERE ' || v_where;
    ELSE
      v_sql := 'SELECT AVG(' || quote_ident(p_target_col) || ') FROM public.post_call_analisis WHERE ' || v_where;
    END IF;
  ELSE
    RETURN 0;
  END IF;

  EXECUTE v_sql INTO v_res;
  RETURN COALESCE(v_res, 0);
END;
$$;
