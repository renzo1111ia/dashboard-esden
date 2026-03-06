"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { KpiConfig } from "@/types/tenant";

export interface KpiTotals {
    total_calls: number;
    contacted: number;
    contact_rate: number;
    total_leads: number;
    qualified_leads: number;

    // Sección 1
    leads_contactados?: number;
    llamadas_atendidas_camp?: number;
    fallidas?: number;
    leads_totales_alcanzados?: number;
    leads_ilocalizables?: number;
    lead_no_cualificado?: number;
    no_interesados?: number;
    leads_cualificados_camp?: number;
    total_agendas_camp?: number;

    // Sección WhatsApp
    efectivos_whatsapp?: number;
    whatsapp_ilocalizables?: number;
    leads_cualificados_wsp?: number;
    lead_no_cualificado_wsp?: number;
    no_interesados_wsp?: number;
    total_agendas_wsp?: number;

    // Sección General
    total_mins_mes?: string;
    total_llamados?: number;
    llamadas_atendidas_gen?: number;
    fallidas_gen?: number;
    leads_totales_alcanzados_gen?: number;
    leads_totales_ilocalizables?: number;
    ilocalizables_telefono?: number;
    ilocalizables_buzon?: number;
    no_cumplen_requisitos?: number;
    no_interesados_gen?: number;
    leads_cualificados_gen?: number;
    total_agendas_gen?: number;
    duracion_media?: string;
    total_minutos_gen?: string;
}

export interface ChartRow {
    label: string;
    value: number;
}

async function rpc<T>(fn: string, from: string, to: string): Promise<T | null> {
    try {
        const supabase = await getSupabaseServerClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc(fn, { p_from: from, p_to: to });

        if (error) {
            console.error(`RPC ERROR [${fn}]:`, error.message);
            return null;
        }

        return data as T;
    } catch (error) {
        console.error(`RPC EXCEPTION [${fn}]:`, error);
        return null;
    }
}

export async function getKpiTotals(from: string, to: string): Promise<KpiTotals> {
    const data = await rpc<KpiTotals>("get_kpi_totals", from, to);
    return data || {} as KpiTotals;
}

export async function getDynamicKpis(from: string, to: string, configs: KpiConfig[]): Promise<Record<string, number>> {
    if (!configs || configs.length === 0) return {};
    const supabase = await getSupabaseServerClient();
    const results: Record<string, number> = {};

    await Promise.all(configs.map(async (c) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc("get_dynamic_kpi_value", {
                p_from: from,
                p_to: to,
                p_calc_type: c.calcType,
                p_target_col: c.targetCol || "*",
                p_is_extra_target: !!c.isExtraTarget,
                p_cond_col: c.condCol || null,
                p_is_extra_cond: !!c.isExtraCond,
                p_cond_op: c.condOp || null,
                p_cond_val: c.condVal || null
            });
            results[c.id] = error ? 0 : Number(data);
        } catch {
            results[c.id] = 0;
        }
    }));

    return results;
}

export async function getMotivoAnulacion(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ motivo: string; cantidad: number }[]>("get_motivo_anulacion", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.motivo, value: r.cantidad }));
}

export async function getMejoresHoras(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ hora: string; cantidad: number }[]>("get_mejores_horas", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.hora, value: r.cantidad }));
}

export async function getMotivoNoContacto(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ motivo: string; cantidad: number }[]>("get_motivo_no_contacto", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.motivo, value: r.cantidad }));
}

export async function getTipologiaLlamadas(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ tipologia: string; cantidad: number }[]>("get_tipologia_llamadas", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.tipologia, value: r.cantidad }));
}

export async function getAgendadosVsNoAgendados(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ status: string; cantidad: number }[]>("get_agendados_vs_no_agendados", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.status, value: r.cantidad }));
}

export async function getOptInWhatsapp(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ optin: string; cantidad: number }[]>("get_opt_in_whatsapp", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.optin, value: r.cantidad }));
}

export async function getMasterInteres(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ interes: string; cantidad: number }[]>("get_master_interes", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.interes, value: r.cantidad }));
}

export async function getLeadsNoCualificados(from: string, to: string): Promise<ChartRow[]> {
    const rows = await rpc<{ motivo: string; cantidad: number }[]>("get_leads_no_cualificados", from, to);
    if (!rows) return [];
    return rows.map((r) => ({ label: r.motivo, value: r.cantidad }));
}

export async function getAreaHistorico(from: string, to: string): Promise<{ date: string; totales: number; facturados: number }[]> {
    const data = await rpc<{ date: string; totales: number; facturados: number }[]>("get_area_historico", from, to);
    return data || [];
}
