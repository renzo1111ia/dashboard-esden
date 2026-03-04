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

-- ── 1b. Add column header to ALL records ────────
-- Creates a new key in extra_data for every row (empty string by default).
-- This is called when the user clicks "Agregar Cabezal" in the UI.
CREATE OR REPLACE FUNCTION add_column_header_to_all(
  p_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.post_call_analisis
  SET extra_data = extra_data || jsonb_build_object(p_key, '')
  WHERE (extra_data -> p_key) IS NULL;
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
  
  -- Atendidas: llamadas con Total Mins > 0.15
  SELECT COUNT(*) INTO v_contacted FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND NULLIF("Total Mins", '')::NUMERIC > 0.15;
  
  -- Fallidas: llamadas con Total Mins <= 0.15
  SELECT COUNT(*) INTO v_failed FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND (NULLIF("Total Mins", '')::NUMERIC <= 0.15 OR "Total Mins" IS NULL OR "Total Mins" = '');

  -- Leads alcanzados: leads únicos con Lead ID no vacío
  SELECT COUNT(DISTINCT lead_id) INTO v_leads_alcanzados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND lead_id IS NOT NULL AND lead_id != '';

  -- Ilocalizables totales: leads únicos donde Motivo = 'Ilocalizable'
  SELECT COUNT(DISTINCT lead_id) INTO v_ilocalizables FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND "Motivo" = 'Ilocalizable';

  -- Teléfono erróneo: End Reason en valores de número inválido
  SELECT COUNT(*) INTO v_tel_erroneo FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to 
    AND "End Reason" IN ('invalid_destination', 'unallocated_number', 'teléfono falso')
       OR ("End Reason" LIKE 'telephony_provider%' AND created_at BETWEEN p_from AND p_to);

  -- Buzón de voz: End Reason = voicemail_reached AND Motivo contiene 'Ilocalizable'
  SELECT COUNT(*) INTO v_buzon FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to 
    AND "End Reason" = 'voicemail_reached' 
    AND "Motivo" ILIKE '%Ilocalizable%';

  -- No cumplen requisitos: leads únicos donde Cualificacion = 'no cualificado'
  SELECT COUNT(DISTINCT lead_id) INTO v_no_requisitos FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND "Cualificacion" = 'no cualificado';

  -- No interesados: leads únicos con Motivo en lista o End Reason = invalid_destination
  SELECT COUNT(DISTINCT lead_id) INTO v_no_interesados FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND (
    "Motivo" IN (
      'Anulado sin fase',
      'No le interesa la titulación ofertada',
      'Solo quiere Oficial',
      'Contactado, no se vuelve a contactar',
      'Informado, no se vuelve a contactar',
      'Duplicado',
      'Interés próxima convocatoria',
      'No se ajustan las modalidades de pago',
      'La modalidad/ horario/ ubicación no le encaja',
      'No válido',
      'No ha pedido información',
      'Solo busca información',
      'No interesado por precio',
      'No interesado, no indica motivo',
      'Se matricula en la competencia'
    )
    OR "End Reason" = 'invalid_destination'
  );

  -- Leads cualificados: leads únicos donde Cualificacion = 'cualificado'
  SELECT COUNT(DISTINCT lead_id) INTO v_qualified FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND "Cualificacion" = 'cualificado';

  -- Total agendas: leads únicos donde Agendado = 'si'
  SELECT COUNT(DISTINCT lead_id) INTO v_agendas FROM public.post_call_analisis 
  WHERE created_at BETWEEN p_from AND p_to AND "Agendado" = 'si';

  -- Minutos y duración media — usando columna "Total Mins" (tipo text, valores en minutos)
  SELECT 
    SUM(NULLIF("Total Mins", '')::NUMERIC),
    AVG(NULLIF("Total Mins", '')::NUMERIC)
  INTO v_total_seconds, v_avg_duration 
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
    'duracion_media', ROUND(COALESCE(v_avg_duration, 0), 2),
    'total_minutos_gen', ROUND(COALESCE(v_total_seconds, 0), 2)
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
    ROUND(SUM(NULLIF("Total Mins", '')::NUMERIC), 2) AS totales,
    ROUND(SUM(CASE WHEN NULLIF("Total Mins", '')::NUMERIC > 0 THEN NULLIF("Total Mins", '')::NUMERIC ELSE 0 END), 2) AS facturados
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
