"use server";

import { getSupabaseServerClient, getActiveTenantId } from "@/lib/supabase/server";
import type { 
    HistorialRow, 
    IntentoLlamada, 
    LlamadaResumen, 
    LeadCualificacion, 
    Agendamiento, 
    ConversacionWhatsapp, 
    Notificacion,
    Lead
} from "@/types/database";

// ─── LOCAL TYPES FOR SUPABASE JOINS ──────────────────────────────────────────

interface JoinedLead extends Lead {
    last_program?: { programa: { nombre: string | null } }[];
    intentos?: { count: number }[];
    llamadas?: LlamadaResumen[];
    lead_cualificacion?: LeadCualificacion[];
    agendamientos?: Agendamiento[];
    conversaciones_whatsapp?: ConversacionWhatsapp[];
    notificaciones?: Notificacion[];
}

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
                *,
                last_program:lead_programas (
                    programa:programas ( nombre )
                ),
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
                ),
                intentos:intentos_llamadas ( id ),
                conversaciones_whatsapp (
                    opt_in_whatsapp,
                    estado,
                    fecha_ultimo_mensaje
                ),
                notificaciones (
                    tipo,
                    fecha_envio
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
        const rows: HistorialRow[] = ((data as unknown as JoinedLead[]) ?? []).map((lead) => {
            const sortedLlamadas = (lead.llamadas ?? []).sort((a, b) =>
                new Date(b.fecha_inicio || 0).getTime() - new Date(a.fecha_inicio || 0).getTime()
            );

            const latestCall = sortedLlamadas[0] || {};
            const firstCall = sortedLlamadas[sortedLlamadas.length - 1] || {};

            const latestCual = (lead.lead_cualificacion ?? []).sort((a, b) =>
                new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime()
            )[0] || ({} as LeadCualificacion);

            const latestAgenda = (lead.agendamientos ?? []).sort((a, b) =>
                new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime()
            )[0] || ({} as Agendamiento);

            const latestWA = (lead.conversaciones_whatsapp ?? []).sort((a, b) =>
                new Date(b.fecha_ultimo_mensaje || 0).getTime() - new Date(a.fecha_ultimo_mensaje || 0).getTime()
            )[0] || ({} as ConversacionWhatsapp);

            const latestNotif = (lead.notificaciones ?? []).sort((a, b) =>
                new Date(b.fecha_envio || 0).getTime() - new Date(a.fecha_envio || 0).getTime()
            )[0] || ({} as Notificacion);

            const programaNombre = lead.last_program?.[0]?.programa?.nombre || null;

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
                programa_nombre: programaNombre,
                intentos_count: (lead.intentos || []).length,
                whatsapp_status: latestWA.estado,
                opt_in_whatsapp: latestWA.opt_in_whatsapp,
                notificaciones_status: latestNotif.tipo,
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
                last_program:lead_programas (
                    programa:programas ( nombre )
                ),
                llamadas:llamadas (
                    id, estado_llamada, razon_termino, fecha_inicio, duracion_segundos, url_grabacion, resumen, tipo_agente
                ),
                lead_cualificacion (
                    cualificacion, motivo_anulacion, anios_experiencia, nivel_estudios, fecha_creacion
                ),
                agendamientos (
                    fecha_agendada_cliente, confirmado, fecha_creacion
                ),
                intentos:intentos_llamadas ( id ),
                conversaciones_whatsapp (
                    opt_in_whatsapp,
                    estado,
                    fecha_ultimo_mensaje
                ),
                notificaciones (
                    tipo,
                    fecha_envio
                )
            `)
            .eq("telefono", phone)
            .order("fecha_ingreso_crm", { ascending: false });

        if (error) throw new Error(error.message);

        return ((data as unknown as JoinedLead[]) ?? []).map((lead) => {
            const sortedLlamadas = (lead.llamadas ?? []).sort((a, b) =>
                new Date(b.fecha_inicio || 0).getTime() - new Date(a.fecha_inicio || 0).getTime()
            );
            const latestCall = sortedLlamadas[0] || {};
            const firstCall = sortedLlamadas[sortedLlamadas.length - 1] || {};

            const latestCual = (lead.lead_cualificacion ?? []).sort((a, b) =>
                new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime()
            )[0] || ({} as LeadCualificacion);

            const latestAgenda = (lead.agendamientos ?? []).sort((a, b) =>
                new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime()
            )[0] || ({} as Agendamiento);

            const latestWA = (lead.conversaciones_whatsapp ?? []).sort((a, b) =>
                new Date(b.fecha_ultimo_mensaje || 0).getTime() - new Date(a.fecha_ultimo_mensaje || 0).getTime()
            )[0] || ({} as ConversacionWhatsapp);

            const latestNotif = (lead.notificaciones ?? []).sort((a, b) =>
                new Date(b.fecha_envio || 0).getTime() - new Date(a.fecha_envio || 0).getTime()
            )[0] || ({} as Notificacion);

            const programaNombre = lead.last_program?.[0]?.programa?.nombre || null;

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
                programa_nombre: programaNombre,
                intentos_count: (lead.intentos || []).length,
                whatsapp_status: latestWA.estado,
                opt_in_whatsapp: latestWA.opt_in_whatsapp,
                notificaciones_status: latestNotif.tipo,
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
                lead:id_lead!inner ( id, nombre, apellido, telefono )
            `)
            .eq("lead.telefono", phone)
        if (error) {
            console.error("fetchIntentosByPhone ERROR:", error.message);
            return [];
        }
        const leads = (data ?? []) as IntentoLlamada[];
        return leads;
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
            .select(`*, lead:id_lead!inner ( id, nombre, apellido, telefono )`)
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

// ─── CREATE LEAD ─────────────────────────────────────────────────────────────


export async function createLead(data: Partial<HistorialRow> & { id_programa?: string }) {
    console.log("[ACTIONS] createLead started with data:", JSON.stringify(data));
    try {
        const client = await getSupabaseServerClient();
        const tenantId = await getActiveTenantId();
        
        if (!tenantId) {
            console.error("[ACTIONS] createLead FAILED: No active tenant ID found in cookies.");
            throw new Error("No hay un cliente seleccionado en el selector.");
        }

        console.log(`[ACTIONS] Scoping new lead to tenant: ${tenantId}`);

        // 1. Insert into lead table
        const leadData = {
            tenant_id: tenantId,
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono,
            email: data.email,
            pais: data.pais,
            tipo_lead: data.tipo_lead || "nuevo",
            origen: data.origen,
            campana: data.campana,
            fecha_ingreso_crm: new Date().toISOString(),
        };

        const { data: newLead, error: leadError } = await client
            .from("lead")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(leadData as any)
            .select()
            .single();

        if (leadError) {
            console.error("[ACTIONS] Supabase Insert ERROR:", leadError.message, leadError.details);
            throw new Error(leadError.message);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log("[ACTIONS] Lead created successfully with ID:", (newLead as any).id);

        // 2. If program is selected, associate it
        if (data.id_programa && newLead) {
            console.log(`[ACTIONS] Associating lead with program: ${data.id_programa}`);
            const { error: progError } = await client
                .from("lead_programas")
                .insert({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    id_lead: (newLead as any).id,
                    id_programa: data.id_programa
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any);
            
            if (progError) {
                console.warn("[ACTIONS] Error associating program, but lead was created:", progError.message);
            }
        }

        return { success: true, data: newLead as unknown as Lead };
    } catch (e) {
        console.error("[ACTIONS] createLead EXCEPTION:", e instanceof Error ? e.message : e);
        return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

// ─── GET PROGRAMS ─────────────────────────────────────────────────────────────

export async function getPrograms() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase
            .from("programas")
            .select("*")
            .order("nombre");

        if (error) throw new Error(error.message);
        return data || [];
    } catch (e) {
        console.error("getPrograms ERROR:", e);
        return [];
    }
}
