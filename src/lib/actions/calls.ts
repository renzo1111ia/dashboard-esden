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
 * Fetches call history joining llamadas + lead + lead_cualificacion + agendamientos.
 * Computes derived fields: tiempo_respuesta_minutos, fecha_primer_contacto.
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

        let query = supabase
            .from("llamadas")
            .select(`
                id,
                id_llamada_retell,
                tipo_agente,
                nombre_agente,
                estado_llamada,
                razon_termino,
                fecha_inicio,
                duracion_segundos,
                url_grabacion,
                transcripcion,
                resumen,
                lead (
                    id,
                    nombre,
                    apellido,
                    telefono,
                    email,
                    pais,
                    tipo_lead,
                    origen,
                    campana,
                    fecha_ingreso_crm
                ),
                lead_cualificacion (
                    cualificacion,
                    motivo_anulacion,
                    anios_experiencia,
                    nivel_estudios
                ),
                agendamientos:agendamientos (
                    fecha_agendada_cliente,
                    confirmado
                )
            `, { count: "exact" })
            .order("fecha_inicio", { ascending: false })
            .range(from, to);

        // ── Filters ──────────────────────────────────────────────────────────
        if (estadoLlamada && estadoLlamada !== "ALL") {
            query = query.eq("estado_llamada", estadoLlamada);
        }
        if (fromDate) query = query.gte("fecha_inicio", fromDate);
        if (toDate) query = query.lte("fecha_inicio", toDate);

        // Filters on the joined lead table
        if (pais) query = query.eq("lead.pais", pais);
        if (origen) query = query.eq("lead.origen", origen);
        if (campana) query = query.eq("lead.campana", campana);
        if (tipoLead) query = query.eq("lead.tipo_lead", tipoLead);
        if (cualificacion) query = query.eq("lead_cualificacion.cualificacion", cualificacion);

        // Search by phone or name
        if (search) {
            query = query.or(
                `lead.telefono.ilike.%${search}%,lead.nombre.ilike.%${search}%,lead.apellido.ilike.%${search}%`
            );
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("fetchCalls ERROR:", error.message);
            return emptyResult;
        }

        // ── Map to flat HistorialRow + compute derived fields ─────────────
        const rows: HistorialRow[] = (data ?? []).map((row: any) => {
            const lead = row.lead ?? {};
            const cual = Array.isArray(row.lead_cualificacion)
                ? row.lead_cualificacion[0]
                : row.lead_cualificacion ?? {};
            const agenda = Array.isArray(row.agendamientos)
                ? row.agendamientos[0]
                : row.agendamientos ?? {};

            // Tiempo de respuesta: diferencia en minutos entre fecha_ingreso_crm y fecha_inicio de primera llamada
            let tiempo_respuesta_minutos: number | null = null;
            if (lead.fecha_ingreso_crm && row.fecha_inicio) {
                const diff = new Date(row.fecha_inicio).getTime() - new Date(lead.fecha_ingreso_crm).getTime();
                tiempo_respuesta_minutos = Math.round(diff / 1000 / 60);
            }

            return {
                id: row.id,
                id_llamada_retell: row.id_llamada_retell,
                tipo_agente: row.tipo_agente,
                nombre_agente: row.nombre_agente,
                estado_llamada: row.estado_llamada,
                razon_termino: row.razon_termino,
                fecha_inicio: row.fecha_inicio,
                duracion_segundos: row.duracion_segundos,
                url_grabacion: row.url_grabacion,
                transcripcion: row.transcripcion,
                resumen: row.resumen,
                // Lead fields
                nombre: lead.nombre,
                apellido: lead.apellido,
                telefono: lead.telefono,
                email: lead.email,
                pais: lead.pais,
                tipo_lead: lead.tipo_lead,
                origen: lead.origen,
                campana: lead.campana,
                fecha_ingreso_crm: lead.fecha_ingreso_crm,
                // Cualificacion fields
                cualificacion: cual.cualificacion,
                motivo_anulacion: cual.motivo_anulacion,
                anios_experiencia: cual.anios_experiencia,
                nivel_estudios: cual.nivel_estudios,
                // Agendamiento fields
                fecha_agendada_cliente: agenda.fecha_agendada_cliente,
                confirmado: agenda.confirmado,
                // Computed
                tiempo_respuesta_minutos,
                fecha_primer_contacto: row.fecha_inicio, // se enriquece abajo si hay WhatsApp
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
 * Returns all calls for a given phone number via the joined lead table.
 */
export async function getCallsByPhone(phone: string): Promise<HistorialRow[]> {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase
            .from("llamadas")
            .select(`
                id,
                id_llamada_retell,
                estado_llamada,
                razon_termino,
                fecha_inicio,
                duracion_segundos,
                url_grabacion,
                transcripcion,
                resumen,
                lead!inner ( id, nombre, apellido, telefono, pais, origen, campana, fecha_ingreso_crm, tipo_lead ),
                lead_cualificacion ( cualificacion, motivo_anulacion ),
                agendamientos ( fecha_agendada_cliente, confirmado )
            `)
            .eq("lead.telefono", phone)
            .order("fecha_inicio", { ascending: false });

        if (error) throw new Error(error.message);

        return (data ?? []).map((row: any) => {
            const lead = row.lead ?? {};
            const cual = Array.isArray(row.lead_cualificacion) ? row.lead_cualificacion[0] : row.lead_cualificacion ?? {};
            const agenda = Array.isArray(row.agendamientos) ? row.agendamientos[0] : row.agendamientos ?? {};
            return {
                id: row.id, id_llamada_retell: row.id_llamada_retell,
                estado_llamada: row.estado_llamada, razon_termino: row.razon_termino,
                fecha_inicio: row.fecha_inicio, duracion_segundos: row.duracion_segundos,
                url_grabacion: row.url_grabacion, transcripcion: row.transcripcion, resumen: row.resumen,
                nombre: lead.nombre, apellido: lead.apellido, telefono: lead.telefono,
                pais: lead.pais, origen: lead.origen, campana: lead.campana,
                fecha_ingreso_crm: lead.fecha_ingreso_crm, tipo_lead: lead.tipo_lead,
                cualificacion: cual.cualificacion, motivo_anulacion: cual.motivo_anulacion,
                fecha_agendada_cliente: agenda.fecha_agendada_cliente, confirmado: agenda.confirmado,
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
