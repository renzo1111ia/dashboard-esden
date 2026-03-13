"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { HistorialRow, IntentoLlamada } from "@/types/database";

// ─── FETCH PARAMS ─────────────────────────────────────────────────────────────

export interface FetchCallsParams {
    page: number;
    pageSize: number;
    search?: string;
    estadoLlamada?: string;
    fromDate?: string;
    toDate?: string;
    pais?: string;
    origen?: string;
    campana?: string;
    tipoLead?: string;
    cualificacion?: string;
}

export interface FetchCallsResult {
    data: HistorialRow[];
    count: number;
    totalPages: number;
}

// ─── FETCH CALLS (HISTORIAL) ──────────────────────────────────────────────────

/**
 * Fetches leads with their activity consolidated.
 * One Lead = One Row. No duplicates even if there are retries.
 */
export async function fetchCalls({
    page = 1,
    pageSize = 50,
    search,
    estadoLlamada,
    fromDate,
    toDate,
    pais,
    origen,
    campana,
    tipoLead,
    cualificacion,
}: FetchCallsParams): Promise<FetchCallsResult> {
    const emptyResult: FetchCallsResult = { data: [], count: 0, totalPages: 0 };

    try {
        const supabase = await getSupabaseServerClient();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Query LEAD as the main entry point to ensure no duplicates.
        let query = supabase
            .from("lead")
            .select(`
                id,
                nombre,
                apellido,
                telefono,
                email,
                pais,
                tipo_lead,
                origen,
                campana,
                fecha_ingreso_crm,
                llamadas:llamadas (
                    id,
                    estado_llamada,
                    razon_termino,
                    fecha_inicio,
                    duracion_segundos,
                    url_grabacion,
                    resumen,
                    tipo_agente
                ),
                lead_cualificacion (
                    cualificacion,
                    motivo_anulacion,
                    anios_experiencia,
                    nivel_estudios,
                    fecha_creacion
                ),
                agendamientos (
                    fecha_agendada_cliente,
                    confirmado,
                    fecha_creacion
                )
            `, { count: "exact" })
            .order("fecha_ingreso_crm", { ascending: false })
            .range(from, to);

        // ── Lead Filters ─────────────────────────────────────────────────────
        if (pais) query = query.eq("pais", pais);
        if (origen) query = query.eq("origen", origen);
        if (campana) query = query.eq("campana", campana);
        if (tipoLead) query = query.eq("tipo_lead", tipoLead);

        // ── Filters on nested tables ─────────────────────────────────────────
        if (estadoLlamada && estadoLlamada !== "ALL") {
            query = query.filter("llamadas.estado_llamada", "eq", estadoLlamada);
        }
        if (fromDate) {
            query = query.filter("llamadas.fecha_inicio", "gte", fromDate);
        }
        if (toDate) {
            query = query.filter("llamadas.fecha_inicio", "lte", toDate);
        }
        if (cualificacion) {
            query = query.filter("lead_cualificacion.cualificacion", "eq", cualificacion);
        }

        // Search by phone or name
        if (search) {
            query = query.or(
                `telefono.ilike.%${search}%,nombre.ilike.%${search}%,apellido.ilike.%${search}%`
            );
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("fetchCalls ERROR:", error.message);
            return emptyResult;
        }

        // ── Map results to lead-centric HistorialRow ──────────────────────────
        const rows: HistorialRow[] = (data ?? []).map((lead: any) => {
            const sortedLlamadas = (lead.llamadas ?? []).sort((a: any, b: any) =>
                new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
            );

            const latestCall = sortedLlamadas[0] || {};
            const firstCall = sortedLlamadas[sortedLlamadas.length - 1] || {};

            const latestCual = (lead.lead_cualificacion ?? []).sort((a: any, b: any) =>
                new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
            )[0] || {};

            const latestAgenda = (lead.agendamientos ?? []).sort((a: any, b: any) =>
                new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
            )[0] || {};

            let tiempo_respuesta_minutos: number | null = null;
            if (lead.fecha_ingreso_crm && firstCall.fecha_inicio) {
                const diff = new Date(firstCall.fecha_inicio).getTime() - new Date(lead.fecha_ingreso_crm).getTime();
                tiempo_respuesta_minutos = Math.round(diff / 1000 / 60);
            }

            return {
                id: lead.id,
                nombre: lead.nombre,
                apellido: lead.apellido,
                telefono: lead.telefono,
                email: lead.email,
                pais: lead.pais,
                tipo_lead: lead.tipo_lead,
                origen: lead.origen,
                campana: lead.campana,
                fecha_ingreso_crm: lead.fecha_ingreso_crm,
                estado_llamada: latestCall.estado_llamada,
                razon_termino: latestCall.razon_termino,
                fecha_inicio: latestCall.fecha_inicio,
                duracion_segundos: latestCall.duracion_segundos,
                url_grabacion: latestCall.url_grabacion,
                resumen: latestCall.resumen,
                tipo_agente: latestCall.tipo_agente,
                cualificacion: latestCual.cualificacion,
                motivo_anulacion: latestCual.motivo_anulacion,
                anios_experiencia: latestCual.anios_experiencia,
                nivel_estudios: latestCual.nivel_estudios,
                fecha_agendada_cliente: latestAgenda.fecha_agendada_cliente,
                confirmado: latestAgenda.confirmado,
                tiempo_respuesta_minutos,
                fecha_primer_contacto: firstCall.fecha_inicio,
                llamadas: sortedLlamadas,
                total_llamadas: sortedLlamadas.length,
            };
        });

        return {
            data: rows,
            count: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / pageSize),
        };
    } catch (e) {
        console.error("fetchCalls EXCEPTION:", e);
        return emptyResult;
    }
}

// ─── GET CALLS BY PHONE ───────────────────────────────────────────────────────

/**
 * Returns leads associated with a phone number, including their full call timeline.
 */
export async function getCallsByPhone(phone: string): Promise<HistorialRow[]> {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase
            .from("lead")
            .select(`
                id, nombre, apellido, telefono, email, pais, tipo_lead, origen, campana, fecha_ingreso_crm,
                llamadas:llamadas (
                    id, estado_llamada, razon_termino, fecha_inicio, duracion_segundos, url_grabacion, resumen, tipo_agente
                ),
                lead_cualificacion (
                    cualificacion, motivo_anulacion, anios_experiencia, nivel_estudios, fecha_creacion
                ),
                agendamientos (
                    fecha_agendada_cliente, confirmado, fecha_creacion
                )
            `)
            .eq("telefono", phone)
            .order("fecha_ingreso_crm", { ascending: false });

        if (error) throw new Error(error.message);

        return (data ?? []).map((lead: any) => {
            const sortedLlamadas = (lead.llamadas ?? []).sort((a: any, b: any) =>
                new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
            );
            const latestCall = sortedLlamadas[0] || {};
            const firstCall = sortedLlamadas[sortedLlamadas.length - 1] || {};

            const latestCual = (lead.lead_cualificacion ?? []).sort((a: any, b: any) =>
                new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
            )[0] || {};

            const latestAgenda = (lead.agendamientos ?? []).sort((a: any, b: any) =>
                new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
            )[0] || {};

            return {
                id: lead.id,
                nombre: lead.nombre,
                apellido: lead.apellido,
                telefono: lead.telefono,
                email: lead.email,
                pais: lead.pais,
                tipo_lead: lead.tipo_lead,
                origen: lead.origen,
                campana: lead.campana,
                fecha_ingreso_crm: lead.fecha_ingreso_crm,
                estado_llamada: latestCall.estado_llamada,
                razon_termino: latestCall.razon_termino,
                fecha_inicio: latestCall.fecha_inicio,
                duracion_segundos: latestCall.duracion_segundos,
                url_grabacion: latestCall.url_grabacion,
                resumen: latestCall.resumen,
                tipo_agente: latestCall.tipo_agente,
                cualificacion: latestCual.cualificacion,
                motivo_anulacion: latestCual.motivo_anulacion,
                anios_experiencia: latestCual.anios_experiencia,
                nivel_estudios: latestCual.nivel_estudios,
                fecha_agendada_cliente: latestAgenda.fecha_agendada_cliente,
                confirmado: latestAgenda.confirmado,
                tiempo_respuesta_minutos: null,
                fecha_primer_contacto: firstCall.fecha_inicio,
                llamadas: sortedLlamadas,
                total_llamadas: sortedLlamadas.length,
            };
        });
    } catch (e) {
        console.error("getCallsByPhone ERROR:", e);
        return [];
    }
}

// ─── FETCH INTENTOS BY PHONE ──────────────────────────────────────────────────

/**
 * Returns call/whatsapp attempt history for a given phone number.
 */
export async function fetchIntentosByPhone(phone: string): Promise<IntentoLlamada[]> {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase
            .from("intentos_llamadas")
            .select(`
                *,
                lead!inner ( id, nombre, apellido, telefono )
            `)
            .eq("lead.telefono", phone)
            .order("fecha_creacion", { ascending: false });

        if (error) {
            console.error("fetchIntentosByPhone ERROR:", error.message);
            return [];
        }
        return (data ?? []) as IntentoLlamada[];
    } catch (e) {
        console.error("fetchIntentosByPhone EXCEPTION:", e);
        return [];
    }
}

// ─── FETCH CONVERSACIONES WHATSAPP BY PHONE ───────────────────────────────────

export async function fetchWhatsappByPhone(phone: string) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase
            .from("conversaciones_whatsapp")
            .select(`*, lead!inner ( id, nombre, apellido, telefono )`)
            .eq("lead.telefono", phone)
            .order("fecha_creacion", { ascending: false });

        if (error) {
            console.error("fetchWhatsappByPhone ERROR:", error.message);
            return [];
        }
        return data ?? [];
    } catch (e) {
        console.error("fetchWhatsappByPhone EXCEPTION:", e);
        return [];
    }
}
