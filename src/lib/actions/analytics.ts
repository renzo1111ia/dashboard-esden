"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerClient, getActiveTenantId } from "@/lib/supabase/server";
import { KpiConfig, ChartConfig } from "@/types/tenant";

// â”€â”€â”€ SHARED TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ KPI INTERFACES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface KpiGenerales {
    total_llamadas: number;
    total_segundos: number;
    total_leads: number;
    total_leads_alcanzados: number;
    total_contactados: number;
    total_no_contacto: number;
    tasa_contacto: number;
    tasa_agendamiento: number;
    tasa_conversion: number;
    tasa_ilocalizables: number;
    total_minutos: number;
    duracion_media_segundos: number;
    total_agendados: number;
    tiempo_respuesta_promedio_minutos: number | null;
    total_cualificados: number;
    total_no_cualificados: number;
    por_estado_llamada: ChartRow[];
    por_razon_termino: ChartRow[];
    por_origen: ChartRow[];
    por_tipo_lead: ChartRow[];
    por_cualificacion: ChartRow[];
    por_motivo_anulacion: ChartRow[];
    agendados_por_fecha: ChartRow[];
    primer_contacto_por_fecha: ChartRow[];
    minutos_ahorrados: number;
    horas_ahorradas: number;
    tiempo_ahorrado_formateado: string;
}

export interface KpiMinutos {
    total_minutos: number;
    total_segundos: number;
    total_llamadas: number;
    minutos_por_dia: ChartRow[];
    duracion_media_segundos: number;
    total_contactadas: number;
    tasa_agendamiento: number;
    tasa_conversion: number;
    minutos_por_campana: ChartRow[];
    minutos_por_estado: ChartRow[];
    distribucion_duracion: ChartRow[];
}

export interface KpiWhatsapp {
    total_conversaciones: number;
    total_leads_unicos: number;
    total_agendados: number;
    total_cualificados: number;
    tasa_agendamiento: number;
    tasa_conversion: number;
    tasa_ilocalizables: number;
    por_estado_conversacion: ChartRow[];
    por_tipo_lead: ChartRow[];
    por_origen: ChartRow[];
    conversaciones_por_dia: ChartRow[];
}

export interface CampanaRow {
    nombre: string;
    total_leads: number;
    contactados: number;
    no_contacto: number;
    tasa_contacto: number;
    cualificados: number;
    no_cualificados: number;
    agendados: number;
    total_llamadas: number;
    total_minutos: number;
    total_segundos: number;
    duracion_media_seg: number;
}

export interface KpiCampanas {
    campanas: CampanaRow[];
    leads_por_campana: ChartRow[];
    total_leads: number;
    total_llamadas: number;
    total_contactados: number;
    total_agendados: number;
    total_cualificados: number;
    total_minutos: number;
    total_segundos: number;
    leads_por_dia: ChartRow[];
    contactados_por_campana: ChartRow[];
    cualif_por_campana: ChartRow[];
    agendados_por_campana: ChartRow[];
    minutos_por_campana: ChartRow[];
    total_leads_alcanzados: number;
}

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function groupBy(rows: Record<string, any>[], key: string): ChartRow[] {
    const map: Record<string, number> = {};
    for (const row of rows) {
        const val = row[key] ?? "Sin dato";
        map[val] = (map[val] || 0) + 1;
    }
    return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
}

function applyLeadFilters(query: any, filters: AnalyticsFilters, prefix?: string) {
    const p = prefix ? `${prefix}.` : "";
    if (filters.pais) query = query.eq(`${p}pais`, filters.pais);
    if (filters.origen) query = query.eq(`${p}origen`, filters.origen);
    if (filters.campana) query = query.eq(`${p}campana`, filters.campana);
    if (filters.tipoLead) query = query.eq(`${p}tipo_lead`, filters.tipoLead);
    return query;
}

// â”€â”€â”€ ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getKpiGenerales(from: string, to: string, filters: AnalyticsFilters = {}): Promise<KpiGenerales> {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    const empty: KpiGenerales = {
        total_llamadas: 0, total_segundos: 0, total_leads: 0, total_leads_alcanzados: 0, total_contactados: 0,
        total_no_contacto: 0, tasa_contacto: 0, total_minutos: 0, tasa_agendamiento: 0,
        tasa_conversion: 0, tasa_ilocalizables: 0, duracion_media_segundos: 0, total_agendados: 0,
        tiempo_respuesta_promedio_minutos: null, total_cualificados: 0, total_no_cualificados: 0,
        por_estado_llamada: [], por_razon_termino: [], por_origen: [], por_tipo_lead: [],
        por_cualificacion: [], por_motivo_anulacion: [], agendados_por_fecha: [],
        primer_contacto_por_fecha: [], minutos_ahorrados: 0, horas_ahorradas: 0,
        tiempo_ahorrado_formateado: "0h 0m"
    };

    if (!tenantId) return empty;

    try {
        const [lRes, llRes, cRes, aRes, wRes] = await Promise.all([
            applyLeadFilters((supabase.from("lead" as any) as any).select("id, pais, origen, campana, tipo_lead, fecha_ingreso_crm").eq("tenant_id", tenantId).gte("fecha_ingreso_crm", from).lte("fecha_ingreso_crm", to), filters),
            applyLeadFilters((supabase.from("llamadas" as any) as any).select(`id, estado_llamada, razon_termino, fecha_inicio, duracion_segundos, lead:id_lead!inner(id, pais, origen, campana, tipo_lead)`).eq("tenant_id", tenantId).gte("fecha_inicio", from).lte("fecha_inicio", to), filters),
            applyLeadFilters((supabase.from("lead_cualificacion" as any) as any).select(`cualificacion, motivo_anulacion, lead:id_lead!inner(id, pais, origen, campana, tipo_lead)`).eq("tenant_id", tenantId).gte("fecha_creacion", from).lte("fecha_creacion", to), filters),
            applyLeadFilters((supabase.from("agendamientos" as any) as any).select(`id, fecha_agendada_cliente, confirmado, lead:id_lead!inner(id, pais, origen, campana, tipo_lead)`).eq("tenant_id", tenantId).eq("confirmado", true).gte("fecha_creacion", from).lte("fecha_creacion", to), filters),
            applyLeadFilters((supabase.from("conversaciones_whatsapp" as any) as any).select(`id_lead, opt_in_whatsapp, lead:id_lead!inner(id, pais, origen, campana, tipo_lead)`).eq("tenant_id", tenantId).gte("fecha_creacion", from).lte("fecha_creacion", to), filters),
        ]);

        const leadsData = (lRes.data || []) as any[];
        const llamadasData = (llRes.data || []) as any[];
        const cualData = (cRes.data || []) as any[];
        const agendaData = (aRes.data || []) as any[];
        const wpData = (wRes.data || []) as any[];

        const contactados = llamadasData.filter(l => l.estado_llamada === "CONTACTED");
        const totalSecs = llamadasData.reduce((s, l) => s + (l.duracion_segundos || 0), 0);
        const reachedSet = new Set([...llamadasData.map(l => l.lead?.id), ...wpData.map(w => w.id_lead)].filter(Boolean));

        const total_cualificados = cualData.filter(c => c.cualificacion && c.cualificacion !== "NO").length;
        const total_leads = leadsData.length;

        const allReasons: any[] = [];
        cualData.forEach(c => { if (c.motivo_anulacion) allReasons.push({ m: c.motivo_anulacion }); });
        llamadasData.forEach(l => { if (l.estado_llamada !== "CONTACTED" && l.razon_termino) allReasons.push({ m: l.razon_termino }); });

        const agendaMap: Record<string, number> = {};
        agendaData.forEach(a => { if (a.fecha_agendada_cliente) { const d = a.fecha_agendada_cliente.slice(0,10); agendaMap[d] = (agendaMap[d] || 0) + 1; } });

        return {
            ...empty,
            total_llamadas: llamadasData.length,
            total_leads,
            total_leads_alcanzados: reachedSet.size,
            total_contactados: contactados.length,
            total_no_contacto: llamadasData.length - contactados.length,
            total_minutos: Math.round(totalSecs / 60),
            total_segundos: totalSecs,
            duracion_media_segundos: llamadasData.length ? Math.round(totalSecs / llamadasData.length) : 0,
            tasa_contacto: llamadasData.length ? Math.round((contactados.length / llamadasData.length) * 100) : 0,
            total_agendados: agendaData.length,
            total_cualificados,
            total_no_cualificados: cualData.length - total_cualificados,
            tasa_agendamiento: total_leads ? Math.round((agendaData.length / total_leads) * 100) : 0,
            tasa_conversion: total_leads ? Math.round((total_cualificados / total_leads) * 100) : 0,
            tasa_ilocalizables: total_leads ? Math.round((leadsData.filter(l => l.tipo_lead === "ilocalizable").length / total_leads) * 100) : 0,
            por_estado_llamada: groupBy(llamadasData, "estado_llamada"),
            por_razon_termino: groupBy(llamadasData, "razon_termino"),
            por_origen: groupBy(leadsData, "origen"),
            por_tipo_lead: groupBy(leadsData, "tipo_lead"),
            por_cualificacion: groupBy(cualData, "cualificacion"),
            por_motivo_anulacion: groupBy(allReasons, "m"),
            agendados_por_fecha: Object.entries(agendaMap).map(([label, value]) => ({ label, value })).sort((a,b) => a.label.localeCompare(b.label)),
            minutos_ahorrados: (llamadasData.length + wpData.length) * 3,
            horas_ahorradas: Math.round(((llamadasData.length + wpData.length) * 3 / 60) * 10) / 10,
            tiempo_ahorrado_formateado: `${Math.floor((llamadasData.length + wpData.length) * 3 / 60)}h ${((llamadasData.length + wpData.length) * 3) % 60}m`
        };
    } catch { return empty; }
}


export async function getKpiMinutos(from: string, to: string, filters: AnalyticsFilters = {}): Promise<KpiMinutos> {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    const empty: KpiMinutos = { total_minutos: 0, total_segundos: 0, total_llamadas: 0, minutos_por_dia: [], duracion_media_segundos: 0, total_contactadas: 0, tasa_agendamiento: 0, tasa_conversion: 0, minutos_por_campana: [], minutos_por_estado: [], distribucion_duracion: [] };
    if (!tenantId) return empty;
    try {
        const q = applyLeadFilters((supabase.from("llamadas" as any) as any).select(`id, estado_llamada, duracion_segundos, fecha_inicio, lead:id_lead!inner(id, pais, origen, campana)`).eq("tenant_id", tenantId), filters).gte("fecha_inicio", from).lte("fecha_inicio", to);
        const { data } = await q;
        const rows = (data || []) as any[];
        if (!rows.length) return empty;
        const totalSecs = rows.reduce((s, l) => s + (l.duracion_segundos || 0), 0);
        const byDay: Record<string, number> = {};
        rows.forEach(l => { if (l.fecha_inicio) { const d = l.fecha_inicio.slice(0,10); byDay[d] = (byDay[d] || 0) + (l.duracion_segundos || 0); } });
        return {
            ...empty,
            total_minutos: Math.round(totalSecs / 60),
            total_segundos: totalSecs,
            total_llamadas: rows.length,
            total_contactadas: rows.filter(r => r.estado_llamada === "CONTACTED").length,
            duracion_media_segundos: Math.round(totalSecs / rows.length),
            minutos_por_dia: Object.entries(byDay).map(([label, value]) => ({ label, value })).sort((a,b) => a.label.localeCompare(b.label))
        };
    } catch { return empty; }
}

export async function getKpiWhatsapp(from: string, to: string, filters: AnalyticsFilters = {}): Promise<KpiWhatsapp> {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    const empty: KpiWhatsapp = { total_conversaciones: 0, total_leads_unicos: 0, total_agendados: 0, total_cualificados: 0, tasa_agendamiento: 0, tasa_conversion: 0, tasa_ilocalizables: 0, por_estado_conversacion: [], por_tipo_lead: [], por_origen: [], conversaciones_por_dia: [] };
    if (!tenantId) return empty;
    try {
        const q = applyLeadFilters((supabase.from("conversaciones_whatsapp" as any) as any).select(`id, id_lead, opt_in_whatsapp, lead:id_lead!inner(id, pais, origen, campana)`).eq("tenant_id", tenantId), filters).gte("fecha_creacion", from).lte("fecha_creacion", to);
        const { data } = await q;
        const rows = (data || []) as any[];
        if (!rows.length) return empty;
        const leads = new Set(rows.map(r => r.id_lead));
        return { ...empty, total_conversaciones: rows.length, total_leads_unicos: leads.size };
    } catch { return empty; }
}

export async function getKpiCampanas(from: string, to: string, filters: AnalyticsFilters = {}): Promise<KpiCampanas> {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    if (!tenantId) return { campanas: [], leads_por_campana: [], contactados_por_campana: [], cualif_por_campana: [], agendados_por_campana: [], minutos_por_campana: [], total_leads: 0, total_llamadas: 0, total_contactados: 0, total_agendados: 0, total_cualificados: 0, total_minutos: 0, total_segundos: 0, total_leads_alcanzados: 0, leads_por_dia: [] };
    try {
        const [lRes, llRes, aRes, qRes, wRes] = await Promise.all([
            applyLeadFilters((supabase.from("lead" as any) as any).select("id, campana").eq("tenant_id", tenantId).gte("fecha_ingreso_crm", from).lte("fecha_ingreso_crm", to), filters),
            applyLeadFilters((supabase.from("llamadas" as any) as any).select(`id, estado_llamada, duracion_segundos, id_lead, lead:id_lead!inner(campana)`).eq("tenant_id", tenantId).gte("fecha_inicio", from).lte("fecha_inicio", to), filters),
            applyLeadFilters((supabase.from("agendamientos" as any) as any).select(`id, lead:id_lead!inner(campana)`).eq("tenant_id", tenantId).eq("confirmado", true).gte("fecha_creacion", from).lte("fecha_creacion", to), filters),
            applyLeadFilters((supabase.from("lead_cualificacion" as any) as any).select(`id, cualificacion, lead:id_lead!inner(campana)`).eq("tenant_id", tenantId).gte("fecha_creacion", from).lte("fecha_creacion", to), filters),
            applyLeadFilters((supabase.from("conversaciones_whatsapp" as any) as any).select(`id_lead, lead:id_lead!inner(campana)`).eq("tenant_id", tenantId).gte("fecha_creacion", from).lte("fecha_creacion", to), filters),
        ]);
        const campMap: Record<string, any> = {};
        const getC = (n: string) => campMap[n] || (campMap[n] = { 
            nombre: n, 
            total_leads: 0, 
            contactados: 0, 
            no_contacto: 0, 
            tasa_contacto: 0, 
            cualificados: 0, 
            no_cualificados: 0, 
            agendados: 0, 
            total_llamadas: 0, 
            total_minutos: 0, 
            total_segundos: 0,
            duracion_media_seg: 0 
        });
        (lRes.data || []).forEach((l: any) => getC(l.campana || "Sin campaÃ±a").total_leads++);
        (llRes.data || []).forEach((l: any) => {
            const c = getC((l.lead as any).campana || "Sin campaÃ±a");
            c.total_llamadas++;
            c.total_segundos += (l.duracion_segundos || 0);
            c.total_minutos = Math.round(c.total_segundos / 60);
            if (l.estado_llamada === "CONTACTED") c.contactados++; else c.no_contacto++;
        });
        (aRes.data || []).forEach((a: any) => getC((a.lead as any).campana || "Sin campaÃ±a").agendados++);
        (qRes.data || []).forEach((q: any) => {
            const c = getC((q.lead as any).campana || "Sin campaÃ±a");
            if (q.cualificacion && q.cualificacion !== "NO") c.cualificados++; else c.no_cualificados++;
        });

        const reachedSet = new Set([
            ...(llRes.data || []).map((l: any) => l.id_lead),
            ...(wRes.data || []).map((w: any) => w.id_lead)
        ].filter(Boolean));

        const campanas = Object.values(campMap).map((c: any) => ({
            ...c,
            tasa_contacto: c.total_llamadas ? Math.round((c.contactados / c.total_llamadas) * 100) : 0,
            duracion_media_seg: c.total_llamadas ? Math.round(c.total_segundos / c.total_llamadas) : 0
        })).sort((a: any, b: any) => b.total_leads - a.total_leads);
        return { 
            campanas, leads_por_campana: campanas.map((c: any) => ({ label: c.nombre, value: c.total_leads })),
            contactados_por_campana: campanas.map((c: any) => ({ label: c.nombre, value: c.contactados })),
            cualif_por_campana: campanas.map((c: any) => ({ label: c.nombre, value: c.cualificados })),
            agendados_por_campana: campanas.map((c: any) => ({ label: c.nombre, value: c.agendados })),
            minutos_por_campana: campanas.map((c: any) => ({ label: c.nombre, value: c.total_segundos })),
            total_leads: campanas.reduce((s, c) => s + c.total_leads, 0),
            total_llamadas: campanas.reduce((s, c) => s + c.total_llamadas, 0),
            total_contactados: campanas.reduce((s, c) => s + c.contactados, 0),
            total_agendados: campanas.reduce((s, c) => s + c.agendados, 0),
            total_cualificados: campanas.reduce((s, c) => s + c.cualificados, 0),
            total_minutos: campanas.reduce((s, c) => s + c.total_minutos, 0),
            total_segundos: campanas.reduce((s, c) => s + c.total_segundos, 0),
            total_leads_alcanzados: reachedSet.size,
            leads_por_dia: []
        };
    } catch { return { campanas: [], leads_por_campana: [], contactados_por_campana: [], cualif_por_campana: [], agendados_por_campana: [], minutos_por_campana: [], total_leads: 0, total_llamadas: 0, total_contactados: 0, total_agendados: 0, total_cualificados: 0, total_minutos: 0, total_segundos: 0, total_leads_alcanzados: 0, leads_por_dia: [] }; }
}

export async function getUniqueCampaigns(): Promise<string[]> {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    if (!tenantId) return [];
    try {
        const { data } = await (supabase.from("lead" as any) as any).select("campana").eq("tenant_id", tenantId).not("campana", "is", null).not("campana", "eq", "");
        return Array.from(new Set((data || []).map((d: any) => d.campana))).sort() as string[];
    } catch { return []; }
}

export async function getHeatmapData(
    from: string, 
    to: string, 
    filters: AnalyticsFilters, 
    targetTable: string = "lead", 
    targetCol: string = "fecha_ingreso_crm"
) {
    const supabase = await getSupabaseServerClient();
    try {
        let q: any;
        if (targetTable === 'lead') {
            q = (supabase.from('lead' as any) as any).select(targetCol);
            q = applyLeadFilters(q, filters);
        } else {
            // Join with lead for non-lead tables to ensure tenant context / RLS
            q = (supabase.from(targetTable as any) as any).select(`${targetCol}, lead:id_lead!inner(id, pais, origen, campana, tipo_lead)`);
            q = applyLeadFilters(q, filters, 'lead');
        }

        if (from) q = q.gte(targetCol, from);
        if (to) q = q.lte(targetCol, to);
        
        const { data, error } = await q;
        if (error) {
            console.error(`[getHeatmapData] Error for ${targetTable}.${targetCol}:`, error.message);
            return [];
        }

        const grid: Record<string, number> = {};
        for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) grid[`${d}-${h}`] = 0;
        
        const rows = (data || []) as any[];
        rows.forEach(row => {
            const date = new Date(row[targetCol]);
            if (!isNaN(date.getTime())) {
                grid[`${date.getDay()}-${date.getHours()}`]++;
            }
        });
        
        return Object.entries(grid).map(([key, value]) => {
            const [d, h] = key.split("-").map(Number);
            return { day: d, hour: h, value };
        });
    } catch (err) { 
        console.error(`[getHeatmapData] Exception:`, err);
        return []; 
    }
}

async function getGenericPartData(supabase: any, part: any, from: string, to: string, filters: AnalyticsFilters, isGrouped: boolean = false) {
    const [table, col] = part.targetCol.split('.');

    // Correct time/date column per table
    const TIME_COL_MAP: Record<string, string> = {
        lead: 'fecha_ingreso_crm',
        llamadas: 'fecha_inicio',
        agendamientos: 'fecha_agendada_cliente',
        lead_cualificacion: 'fecha_creacion',
        intentos_llamadas: 'fecha_reintento',
        conversaciones_whatsapp: 'fecha_creacion',
    };
    const timeCol = TIME_COL_MAP[table] || 'fecha_creacion';

    let q: any;
    if (table === 'lead') {
        q = (supabase.from('lead' as any) as any).select(isGrouped ? `${timeCol}, ${col}` : col, { count: 'exact' });
        q = applyLeadFilters(q, filters);
    } else {
        // All non-lead tables have id_lead as the FK to lead
        q = (supabase
            .from(table as any) as any)
            .select(
                isGrouped
                    ? `${timeCol}, ${col}, lead_ref:id_lead!inner(id, campana, origen, pais, tipo_lead)`
                    : `${col}, lead_ref:id_lead!inner(id, campana, origen, pais, tipo_lead)`,
                { count: 'exact' }
            );
        q = applyLeadFilters(q, filters, 'lead_ref');
    }

    if (from) q = q.gte(timeCol, from);
    if (to) q = q.lte(timeCol, to);

    if (part.condCol && part.condVal) {
        let cc = part.condCol;
        // Lead-side columns need prefixing when querying a related table
        const LEAD_COLS = ['pais', 'origen', 'campana', 'tipo_lead', 'nombre', 'apellido', 'email'];
        if (table !== 'lead' && LEAD_COLS.includes(cc)) cc = `lead_ref.${cc}`;

        if (part.condOp === 'ILIKE') q = q.ilike(cc, `%${part.condVal}%`);
        else if (part.condOp === '>') q = q.gt(cc, part.condVal);
        else if (part.condOp === '<') q = q.lt(cc, part.condVal);
        else if (part.condOp === '!=') q = q.neq(cc, part.condVal);
        else q = q.eq(cc, part.condVal);
    }

    const { data, count, error } = await q;
    if (error) return isGrouped ? {} : 0;
    if (isGrouped) {
        const grouped: Record<string, number> = {};
        (data || []).forEach((r: any) => {
            const date = new Date(r[timeCol]);
            if (isNaN(date.getTime())) return;
            const day = date.toISOString().split('T')[0];
            const val = part.calcType === 'sum' ? (Number(r[col]) || 0) : (part.calcType === 'avg' ? (Number(r[col]) || 0) : 1);
            grouped[day] = (grouped[day] || 0) + val;
        });
        return grouped;
    }
    if (part.calcType === 'count') return count || 0;
    const rows = (data || []) as any[];
    if (part.calcType === 'sum') return rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
    if (part.calcType === 'avg') return rows.length ? rows.reduce((s, r) => s + (Number(r[col]) || 0), 0) / rows.length : 0;
    return 0;
}

export async function getSingleDynamicKpi(kpi: KpiConfig, from: string, to: string, filters: AnalyticsFilters) {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    if (!tenantId) return 0;
    try {
        let num: number;
        if (kpi.isAdvanced && kpi.parts) {
            const partKeys = Object.keys(kpi.parts);
            const results = await Promise.all(partKeys.map(k => getGenericPartData(supabase, kpi.parts![k], from, to, filters)));
            const values: any = {};
            partKeys.forEach((k, i) => values[k] = results[i]);
            try {
                const fn = new Function(...partKeys, `return ${kpi.formula}`);
                num = fn(...partKeys.map(k => values[k]));
            } catch { num = 0; }
        } else {
            num = await getGenericPartData(supabase, { targetCol: kpi.targetCol || "lead.id", calcType: kpi.calcType || "count", condCol: kpi.condCol, condOp: kpi.condOp, condVal: kpi.condVal }, from, to, filters);
            if (kpi.isPercentage) {
                const den = await getGenericPartData(supabase, { targetCol: kpi.denomTargetCol || "lead.id", calcType: kpi.denomCalcType || "count", condCol: kpi.denomCondCol, condOp: kpi.denomCondOp, condVal: kpi.denomCondVal }, from, to, filters);
                num = den ? (num / den) * 100 : 0;
            }
        }
        return num;
    } catch { return 0; }
}

export async function getDynamicKpis(from: string, to: string, kpis: KpiConfig[], filters: AnalyticsFilters) {
    const results = await Promise.all(kpis.map(k => getSingleDynamicKpi(k, from, to, filters)));
    const map: Record<string, number> = {};
    kpis.forEach((k, i) => map[k.id] = results[i]);
    return map;
}

export async function getDynamicCharts(from: string, to: string, charts: ChartConfig[], filters: AnalyticsFilters) {
    const supabase = await getSupabaseServerClient();
    const results = await Promise.all(charts.map(async (c) => {
        try {
            if (c.type === 'heatmap') {
                const [t, col] = c.dataKey?.split('.') || ["lead", "fecha_ingreso_crm"];
                return { id: c.id, data: await getHeatmapData(from, to, filters, t, col) };
            }
            const parts: Record<string, any> = c.isAdvanced ? (c.parts || {}) : { a: { targetCol: c.dataKey || "lead.id", calcType: "count" } };
            const partKeys = Object.keys(parts);
            const partData = await Promise.all(partKeys.map(k => getGenericPartData(supabase, parts[k], from, to, filters, true)));
            const allDates = new Set<string>();
            partData.forEach(d => Object.keys(d).forEach(k => allDates.add(k)));
            const sortedDates = Array.from(allDates).sort();
            const finalData = sortedDates.map(date => {
                const values: any = {};
                partKeys.forEach((k, idx) => values[k] = (partData[idx] as any)[date] || 0);
                
                let result = 0;
                if (c.isAdvanced && c.formula) {
                    try {
                        const fn = new Function(...partKeys, `return ${c.formula}`);
                        result = fn(...partKeys.map(k => values[k]));
                    } catch { result = 0; }
                } else result = values['a'] || 0;
                
                return { label: date, value: result };
            });
            return { id: c.id, data: finalData };
        } catch { return { id: c.id, data: [] }; }
    }));
    return results.reduce((acc, curr) => { acc[curr.id] = curr.data; return acc; }, {} as Record<string, any>);
}

// ─── DYNAMIC CHART SERIES ─────────────────────────────────────────────────────
// Fetches grouped/aggregated data from any table using xKey (label axis).
// Uses inner join with lead table to ensure tenant isolation (RLS).
// Supports "Hub-and-Spoke" model where 'lead' is the central hub for all tables.

export async function getDynamicChartSeries(
    charts: ChartConfig[],
    from: string,
    to: string,
    filters: AnalyticsFilters = {}
): Promise<Record<string, any[]>> {
    const supabase = await getSupabaseServerClient();
    const tenantId = await getActiveTenantId();
    if (!tenantId) return {};

    const dynamicCharts = charts.filter(c => !c.isAdvanced && c.xKey);

    const TIME_COL_MAP: Record<string, string> = {
        lead: 'fecha_ingreso_crm',
        llamadas: 'fecha_inicio',
        agendamientos: 'fecha_agendada_cliente',
        lead_cualificacion: 'fecha_creacion',
        intentos_llamadas: 'fecha_reintento',
        conversaciones_whatsapp: 'fecha_creacion',
    };

    const results = await Promise.allSettled(dynamicCharts.map(async c => {
        try {
            const [xTable, xCol] = (c.xKey || '').split('.');
            if (!xTable || !xCol) return { id: c.id, data: [] as ChartRow[] };

            if (c.type === 'heatmap') {
                const data = await getHeatmapData(from, to, filters, xTable, xCol);
                console.log(`[getDynamicChartSeries] Success for Heatmap "${c.title}": ${data.length} data points.`);
                return { id: c.id, data };
            }

            const [yTable, yCol] = (c.yKey || '').split('.');
            
            // Base Table: Primary table for the query. 
            // If yKey points to a fact table (calls, agendamientos), use that as base.
            const baseTable = (yTable && yTable !== 'lead') ? yTable : xTable;
            
            const isDateCol = xCol.includes('fecha');
            const timeCol = TIME_COL_MAP[baseTable] || 'fecha_creacion';
            const calcType = c.calcType || 'count';
            
            // We use Y column if provided and it belongs to baseTable or lead
            const useYCol = !!(yCol && (yTable === baseTable || yTable === 'lead') && calcType !== 'count');

            // Build select columns
            let selectCols: string;
            if (baseTable === 'lead') {
                // Base is lead: easy access to all lead columns
                const cols = new Set([xCol]);
                if (useYCol && yTable === 'lead') cols.add(yCol);
                selectCols = Array.from(cols).join(', ');
            } else {
                // Base is fact table (calls, etc.): Always join with lead hub
                const baseCols = new Set<string>();
                if (xTable === baseTable) baseCols.add(xCol);
                if (useYCol && yTable === baseTable) baseCols.add(yCol);
                
                const leadCols = new Set<string>(['id', 'pais', 'origen', 'campana', 'tipo_lead']);
                if (xTable === 'lead') leadCols.add(xCol);
                if (useYCol && yTable === 'lead') leadCols.add(yCol);

                selectCols = [
                    ...Array.from(baseCols),
                    `lead:id_lead!inner(${Array.from(leadCols).join(', ')})`
                ].join(', ');
            }

            let q = (supabase.from(baseTable as any) as any).select(selectCols);

            // Apply lead-level/tenant filters
            if (baseTable === 'lead') {
                q = applyLeadFilters(q, filters);
            } else {
                q = applyLeadFilters(q, filters, 'lead');
            }

            // Apply date filter on baseTable's primary time column
            q = q.gte(timeCol, from).lte(timeCol, to);
            
            // Order by date if X axis is a date in the base table
            if (isDateCol && xTable === baseTable) {
                q = q.order(xCol);
            } else {
                q = q.order(timeCol);
            }

            // Apply user's custom conditional filter
            if (c.condCol && c.condVal) {
                let cc = c.condCol;
                if (baseTable !== 'lead' && ['pais', 'origen', 'campana', 'tipo_lead'].includes(cc)) {
                    cc = `lead.${cc}`;
                }
                
                if (c.condOp === 'ILIKE') q = q.ilike(cc, `%${c.condVal}%`);
                else if (c.condOp === '>') q = q.gt(cc, c.condVal);
                else if (c.condOp === '<') q = q.lt(cc, c.condVal);
                else if (c.condOp === '!=') q = q.neq(cc, c.condVal);
                else q = q.eq(cc, c.condVal);
            }

            const { data, error } = await q;
            if (error) {
                console.error(`[getDynamicChartSeries] Error for "${c.title}" (${c.xKey}):`, error.message);
                return { id: c.id, data: [] };
            }

            const rows = (data || []) as Record<string, any>[];
            const map: Record<string, { sum: number; count: number }> = {};
            
            for (const row of rows) {
                // Extract label (X key) - supports base table or joined lead table
                let labelVal: any;
                if (xTable === baseTable) {
                    labelVal = row[xCol];
                } else if (xTable === 'lead') {
                    labelVal = row.lead?.[xCol];
                }

                const key = String(labelVal ?? 'Sin dato');
                if (!map[key]) map[key] = { sum: 0, count: 0 };
                map[key].count++;

                // Extract metric (Y key) - supports base table or joined lead table
                if (useYCol) {
                    let val: any;
                    if (yTable === baseTable) {
                        val = row[yCol];
                    } else if (yTable === 'lead') {
                        val = row.lead?.[yCol];
                    }
                    if (val != null) map[key].sum += Number(val) || 0;
                }
            }

            const getValue = (agg: { sum: number; count: number }) =>
                calcType === 'sum' ? agg.sum
                    : calcType === 'avg' ? (agg.count ? agg.sum / agg.count : 0)
                    : agg.count;

            let series: any[];
            if (!isDateCol) {
                series = Object.entries(map)
                    .map(([label, agg]) => ({ label, value: getValue(agg) }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 20);
            } else {
                series = Object.entries(map)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([label, agg]) => ({ label, value: getValue(agg) }));
            }

            if (series.length > 0) {
                console.log(`[getDynamicChartSeries] Success for "${c.title}": ${rows.length} rows, base=${baseTable}, x=${xTable}.${xCol}`);
            }

            return { id: c.id, data: series };

        } catch (err) {
            console.error(`[getDynamicChartSeries] Exception for "${c.title}":`, err);
            return { id: c.id, data: [] };
        }
    }));

    const out: Record<string, any[]> = {};
    for (const r of results) {
        if (r.status === 'fulfilled') out[r.value.id] = r.value.data;
    }
    return out;
}
