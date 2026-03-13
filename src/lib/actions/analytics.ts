"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { KpiConfig } from "@/types/tenant";

// ─── SHARED TYPES ──────────────────────────────────────────────────────────────

export interface ChartRow {
    label: string;
    value: number;
}

export interface AnalyticsFilters {
    pais?: string;
    origen?: string;
    campana?: string;
    tipoLead?: string;
    cualificacion?: string;
}

// ─── KPI GENERALES (nuevo schema) ────────────────────────────────────────────
/**
 * KPIs principales del dashboard general.
 * Todos mapeados al nuevo schema normalizado.
 */
export interface KpiGenerales {
    // ── Conteos base ──
    total_llamadas: number;
    total_leads: number;
    total_contactados: number;          // estado_llamada = "CONTACTED"
    total_no_contacto: number;          // estado_llamada = "NO_CONTACT" | "VOICEMAIL"
    tasa_contacto: number;              // porcentaje

    // ── Tiempo / Duración ─────────────────────────────────────── predeterminado
    total_minutos: number;              // SUM(duracion_segundos) / 60
    duracion_media_segundos: number;    // AVG(duracion_segundos)

    // ── Agendamientos ──────────────────────────────────────────── predeterminado
    total_agendados: number;            // COUNT agendamientos confirmados

    // ── Tiempo de respuesta ──────────────────────────────────────
    tiempo_respuesta_promedio_minutos: number | null;  // AVG(fecha_inicio - fecha_ingreso_crm)

    // ── Cualificación ─────────────────────────────────────────── predeterminado
    total_cualificados: number;
    total_no_cualificados: number;

    // ── Para gráficos ──────────────────────────────────────────── predeterminado
    por_estado_llamada: ChartRow[];
    por_razon_termino: ChartRow[];
    por_origen: ChartRow[];
    por_tipo_lead: ChartRow[];          // ilocalizable / nuevo / localizable
    por_cualificacion: ChartRow[];
    por_motivo_anulacion: ChartRow[];  // predeterminado
    agendados_por_fecha: ChartRow[];   // para ver por fechas la cantidad de agendadas (predeterminado)
    primer_contacto_por_fecha: ChartRow[]; // fecha de creacion del primer contacto
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function groupBy(rows: any[], key: string): ChartRow[] {
    const map: Record<string, number> = {};
    for (const row of rows) {
        const val = row[key] ?? "Sin dato";
        map[val] = (map[val] || 0) + 1;
    }
    return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
}

function applyLeadFilters(query: any, filters: AnalyticsFilters) {
    if (filters.pais) query = query.eq("lead.pais", filters.pais);
    if (filters.origen) query = query.eq("lead.origen", filters.origen);
    if (filters.campana) query = query.eq("lead.campana", filters.campana);
    if (filters.tipoLead) query = query.eq("lead.tipo_lead", filters.tipoLead);
    return query;
}

// ─── MAIN KPI FUNCTION ────────────────────────────────────────────────────────

/**
 * Fetches all general KPIs for the dashboard.
 * Uses direct queries against the new normalized schema (no RPCs needed).
 * This means it works out-of-the-box for any client Supabase DB with this schema.
 *
 * KPIs mapped:
 * 1.  fecha_ingreso                → lead.fecha_ingreso_crm (filter axis)
 * 2.  origen                       → lead.origen (por_origen chart)
 * 3.  duracion_ai                  → llamadas.duracion_segundos AVG (predeterminado)
 * 4.  razon_termino                → llamadas.razon_termino (por_razon_termino chart) predeterminado
 * 5.  estado_llamada               → llamadas.estado_llamada (por_estado_llamada chart)
 * 6.  total_mins                   → SUM(duracion_segundos)/60 (predeterminado)
 * 7.  fecha_con_asesor             → agendamientos.fecha_agendada_cliente by date (predeterminado)
 * 8.  motivo_anulacion             → lead_cualificacion.motivo_anulacion (predeterminado)
 * 9.  cualificacion                → lead_cualificacion.cualificacion (por_cualificacion chart)
 * 10. tipo_lead                    → lead.tipo_lead (ilocalizable/nuevo/localizable)
 * 11. tiempo_respuesta             → AVG(llamadas.fecha_inicio - lead.fecha_ingreso_crm)
 * 12. fecha_primer_contacto        → MIN(llamadas.fecha_inicio, conversaciones_whatsapp.fecha_creacion)
 */
export async function getKpiGenerales(
    from: string,
    to: string,
    filters: AnalyticsFilters = {}
): Promise<KpiGenerales> {
    const supabase = await getSupabaseServerClient();

    const empty: KpiGenerales = {
        total_llamadas: 0, total_leads: 0, total_contactados: 0,
        total_no_contacto: 0, tasa_contacto: 0, total_minutos: 0,
        duracion_media_segundos: 0, total_agendados: 0,
        tiempo_respuesta_promedio_minutos: null, total_cualificados: 0,
        total_no_cualificados: 0, por_estado_llamada: [], por_razon_termino: [],
        por_origen: [], por_tipo_lead: [], por_cualificacion: [],
        por_motivo_anulacion: [], agendados_por_fecha: [], primer_contacto_por_fecha: []
    };

    try {
        // ── 1. Llamadas base (con lead JOIN) ─────────────────────────────────
        let llamadasQuery = supabase
            .from("llamadas")
            .select(`
                id,
                estado_llamada,
                razon_termino,
                fecha_inicio,
                duracion_segundos,
                lead!inner ( id, nombre, pais, origen, campana, tipo_lead, fecha_ingreso_crm )
            `)
            .gte("fecha_inicio", from)
            .lte("fecha_inicio", to);

        llamadasQuery = applyLeadFilters(llamadasQuery, filters);
        const { data: llamadas, error: errLlamadas } = await llamadasQuery;

        if (errLlamadas) {
            console.error("getKpiGenerales [llamadas] ERROR:", errLlamadas.message);
            return empty;
        }

        const llamadasData = llamadas ?? [];

        // ── 2. Cualificación ─────────────────────────────────────────────────
        let cualQuery = supabase
            .from("lead_cualificacion")
            .select(`
                cualificacion,
                motivo_anulacion,
                lead!inner ( id, pais, origen, campana, tipo_lead )
            `)
            .gte("fecha_creacion", from)
            .lte("fecha_creacion", to);

        cualQuery = applyLeadFilters(cualQuery, filters);
        const { data: cualificaciones } = await cualQuery;
        const cualesData = cualificaciones ?? [];

        // ── 3. Agendamientos ─────────────────────────────────────────────────
        let agendaQuery = supabase
            .from("agendamientos")
            .select(`
                fecha_agendada_cliente,
                confirmado,
                lead!inner ( id, pais, origen, campana, tipo_lead )
            `)
            .eq("confirmado", true)
            .gte("fecha_creacion", from)
            .lte("fecha_creacion", to);

        agendaQuery = applyLeadFilters(agendaQuery, filters);
        const { data: agendamientos } = await agendaQuery;
        const agendaData = agendamientos ?? [];

        // ── 4. Primer contacto (llamadas + whatsapp) ─────────────────────────
        let wpQuery = supabase
            .from("conversaciones_whatsapp")
            .select(`
                id_lead,
                fecha_creacion,
                lead!inner ( id, pais, origen, campana, tipo_lead )
            `)
            .gte("fecha_creacion", from)
            .lte("fecha_creacion", to);

        wpQuery = applyLeadFilters(wpQuery, filters);
        const { data: wpData } = await wpQuery;

        // ── 5. Leads únicos en el rango ──────────────────────────────────────
        let leadsQuery = supabase
            .from("lead")
            .select("id, pais, origen, campana, tipo_lead, fecha_ingreso_crm")
            .gte("fecha_ingreso_crm", from)
            .lte("fecha_ingreso_crm", to);

        if (filters.pais) leadsQuery = leadsQuery.eq("pais", filters.pais);
        if (filters.origen) leadsQuery = leadsQuery.eq("origen", filters.origen);
        if (filters.campana) leadsQuery = leadsQuery.eq("campana", filters.campana);
        if (filters.tipoLead) leadsQuery = leadsQuery.eq("tipo_lead", filters.tipoLead);
        const { data: leads } = await leadsQuery;
        const leadsData = leads ?? [];

        // ── Compute numeric KPIs ─────────────────────────────────────────────

        const total_llamadas = llamadasData.length;
        const total_leads = leadsData.length;

        const contactados = llamadasData.filter(l => l.estado_llamada === "CONTACTED");
        const noContacto = llamadasData.filter(l =>
            l.estado_llamada === "NO_CONTACT" || l.estado_llamada === "VOICEMAIL"
        );

        const totalSecs = llamadasData.reduce((sum, l) => sum + (l.duracion_segundos ?? 0), 0);
        const total_minutos = Math.round(totalSecs / 60);
        const duracion_media_segundos = total_llamadas > 0 ? Math.round(totalSecs / total_llamadas) : 0;
        const tasa_contacto = total_llamadas > 0
            ? Math.round((contactados.length / total_llamadas) * 100)
            : 0;

        // Tiempo de respuesta promedio
        const tiempos = llamadasData
            .filter((l: any) => l.lead?.fecha_ingreso_crm && l.fecha_inicio)
            .map((l: any) => {
                const diff = new Date(l.fecha_inicio).getTime() - new Date(l.lead.fecha_ingreso_crm).getTime();
                return diff / 1000 / 60; // en minutos
            });
        const tiempo_respuesta_promedio_minutos =
            tiempos.length > 0
                ? Math.round(tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length)
                : null;

        const total_cualificados = cualesData.filter(c => c.cualificacion && c.cualificacion !== "NO").length;
        const total_no_cualificados = cualesData.filter(c => !c.cualificacion || c.cualificacion === "NO").length;

        // ── Compute chart data ───────────────────────────────────────────────

        const por_estado_llamada = groupBy(llamadasData, "estado_llamada");
        const por_razon_termino = groupBy(llamadasData, "razon_termino");
        const por_origen = groupBy(llamadasData.map((l: any) => l.lead), "origen");
        const por_tipo_lead = groupBy(llamadasData.map((l: any) => l.lead), "tipo_lead");
        const por_cualificacion = groupBy(cualesData, "cualificacion");
        const por_motivo_anulacion = groupBy(
            cualesData.filter((c: any) => !!c.motivo_anulacion),
            "motivo_anulacion"
        );

        // Agendados por fecha (groupBy day)
        const agendadosFechaMap: Record<string, number> = {};
        for (const a of agendaData) {
            if (!a.fecha_agendada_cliente) continue;
            const day = a.fecha_agendada_cliente.slice(0, 10);
            agendadosFechaMap[day] = (agendadosFechaMap[day] || 0) + 1;
        }
        const agendados_por_fecha: ChartRow[] = Object.entries(agendadosFechaMap)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label));

        // Primer contacto por fecha (combina llamadas + whatsapp, toma el mínimo por lead)
        const firstContactMap: Record<string, string> = {};
        for (const l of llamadasData) {
            const leadId = (l.lead as any)?.id;
            if (!leadId || !l.fecha_inicio) continue;
            if (!firstContactMap[leadId] || l.fecha_inicio < firstContactMap[leadId]) {
                firstContactMap[leadId] = l.fecha_inicio;
            }
        }
        for (const w of (wpData ?? [])) {
            const leadId = (w as any).id_lead;
            if (!leadId || !w.fecha_creacion) continue;
            if (!firstContactMap[leadId] || w.fecha_creacion < firstContactMap[leadId]) {
                firstContactMap[leadId] = w.fecha_creacion;
            }
        }
        const primerContactoFechaMap: Record<string, number> = {};
        for (const date of Object.values(firstContactMap)) {
            const day = (date as string).slice(0, 10);
            primerContactoFechaMap[day] = (primerContactoFechaMap[day] || 0) + 1;
        }
        const primer_contacto_por_fecha: ChartRow[] = Object.entries(primerContactoFechaMap)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return {
            total_llamadas,
            total_leads,
            total_contactados: contactados.length,
            total_no_contacto: noContacto.length,
            tasa_contacto,
            total_minutos,
            duracion_media_segundos,
            total_agendados: agendaData.length,
            tiempo_respuesta_promedio_minutos,
            total_cualificados,
            total_no_cualificados,
            por_estado_llamada,
            por_razon_termino,
            por_origen,
            por_tipo_lead,
            por_cualificacion,
            por_motivo_anulacion,
            agendados_por_fecha,
            primer_contacto_por_fecha,
        };
    } catch (e) {
        console.error("getKpiGenerales EXCEPTION:", e);
        return empty;
    }
}

// ─── DYNAMIC KPIs (configurables por cliente) ─────────────────────────────────

/**
 * Evaluates dynamic per-client KPI configs against the new schema.
 * Supported tables: llamadas, lead, lead_cualificacion, agendamientos, intentos_llamadas
 */
export async function getDynamicKpis(
    from: string,
    to: string,
    configs: KpiConfig[],
    filters: AnalyticsFilters = {}
): Promise<Record<string, number>> {
    if (!configs || configs.length === 0) return {};
    const supabase = await getSupabaseServerClient();
    const results: Record<string, number> = {};

    await Promise.all(configs.map(async (c) => {
        try {
            // Determine the base table from the targetCol prefix or a config field
            // Convention: targetCol can be "llamadas.duracion_segundos", "lead.tipo_lead", etc.
            // Or use staticKey for pre-computed values from getKpiGenerales
            if (!c.targetCol) { results[c.id] = 0; return; }

            const [tableName, colName] = c.targetCol.includes(".")
                ? c.targetCol.split(".")
                : ["llamadas", c.targetCol];

            let query = supabase
                .from(tableName)
                .select(colName, { count: "exact" })
                .gte("fecha_creacion", from)
                .lte("fecha_creacion", to);

            // Apply condition if specified
            if (c.condCol && c.condOp && c.condVal) {
                if (c.condOp === "eq") query = query.eq(c.condCol, c.condVal);
                if (c.condOp === "neq") query = query.neq(c.condCol, c.condVal);
                if (c.condOp === "ilike") query = query.ilike(c.condCol, `%${c.condVal}%`);
            }

            const { data, error, count } = await query;

            if (error) { results[c.id] = 0; return; }

            if (c.calcType === "COUNT") {
                results[c.id] = count ?? 0;
            } else if (c.calcType === "SUM" && data) {
                results[c.id] = (data as any[]).reduce((sum, row) => sum + (Number(row[colName]) || 0), 0);
            } else if (c.calcType === "AVG" && data && data.length > 0) {
                const sum = (data as any[]).reduce((s, row) => s + (Number(row[colName]) || 0), 0);
                results[c.id] = Math.round(sum / data.length);
            } else {
                results[c.id] = count ?? 0;
            }
        } catch {
            results[c.id] = 0;
        }
    }));

    return results;
}

// ─── CHART HELPERS (re-exported from KpiGenerales for direct chart use) ───────

export async function getPorEstadoLlamada(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.por_estado_llamada;
}

export async function getPorRazonTermino(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.por_razon_termino;
}

export async function getAgendadosPorFecha(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.agendados_por_fecha;
}

export async function getPorMotivAnulacion(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.por_motivo_anulacion;
}

export async function getPorTipoLead(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.por_tipo_lead;
}

export async function getPorOrigen(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.por_origen;
}

export async function getPrimerContactoPorFecha(from: string, to: string, filters: AnalyticsFilters = {}): Promise<ChartRow[]> {
    const kpis = await getKpiGenerales(from, to, filters);
    return kpis.primer_contacto_por_fecha;
}
