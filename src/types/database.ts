/**
 * TypeScript types mirroring the new normalized Supabase schema.
 * Matches the SQL schema: lead, llamadas, intentos_llamadas,
 * conversaciones_whatsapp, agendamientos, lead_cualificacion,
 * programas, lead_programas, notificaciones
 */

// ─── LEAD ────────────────────────────────────────────────────────────────────

export interface Lead {
    id: string;
    id_lead_externo?: string | null;
    nombre?: string | null;
    apellido?: string | null;
    telefono?: string | null;
    email?: string | null;
    pais?: string | null;
    /**
     * Tipo de lead: campo libre (string), no enum cerrado.
     * Valores actuales: "nuevo", "ilocalizable", "localizable".
     * Pueden añadirse nuevos tipos según el tipo de campaña sin cambiar código.
     */
    tipo_lead?: string | null;
    origen?: string | null;
    campana?: string | null;
    fecha_ingreso_crm?: string | null;
    fecha_creacion?: string | null;
    fecha_actualizacion?: string | null;
}

// ─── LLAMADA (resumen de una llamada individual) ──────────────────────────────

export interface Llamada {
    id: string;
    id_lead: string;
    id_llamada_retell?: string | null;
    tipo_agente?: string | null;
    nombre_agente?: string | null;
    estado_llamada?: string | null;
    razon_termino?: string | null;
    fecha_inicio?: string | null;
    duracion_segundos?: number | null;
    url_grabacion?: string | null;
    transcripcion?: string | null;
    resumen?: string | null;
    fecha_creacion?: string | null;
    // Joined from `lead`
    lead?: Lead;
}

export type LlamadaConLead = Llamada & { lead: Lead };

/**
 * Resumen de una llamada individual dentro del timeline de un lead.
 * Se usa en HistorialRow.llamadas[].
 */
export interface LlamadaResumen {
    id: string;
    estado_llamada?: string | null;
    razon_termino?: string | null;
    fecha_inicio?: string | null;
    duracion_segundos?: number | null;
    url_grabacion?: string | null;
    resumen?: string | null;
    tipo_agente?: string | null;
    numero_intento?: number | null;   // si existe en intentos_llamadas
}

// ─── INTENTOS LLAMADAS ────────────────────────────────────────────────────────

export interface IntentoLlamada {
    id: string;
    id_lead: string;
    id_llamada?: string | null;
    tipo_intento?: string | null;   // "LLAMADA" | "WHATSAPP"
    numero_intento?: number | null;
    fecha_reintento?: string | null;
    estado?: string | null;
    fecha_ejecucion?: string | null;
    fecha_creacion?: string | null;
    // Joined
    lead?: Lead;
    llamada?: Llamada;
}

// ─── CONVERSACIONES WHATSAPP ──────────────────────────────────────────────────

export interface ConversacionWhatsapp {
    id: string;
    id_lead: string;
    id_conversacion_chatwoot?: string | null;
    opt_in_whatsapp?: boolean | null;
    estado?: string | null;
    fecha_ultimo_mensaje?: string | null;
    fecha_creacion?: string | null;
    // Joined
    lead?: Lead;
}

// ─── AGENDAMIENTOS ────────────────────────────────────────────────────────────

export interface Agendamiento {
    id: string;
    id_lead: string;
    fecha_agendada_cliente?: string | null;
    fecha_agendada_lead?: string | null;
    confirmado?: boolean;
    fecha_creacion?: string | null;
    // Joined
    lead?: Lead;
}

// ─── LEAD CUALIFICACION ───────────────────────────────────────────────────────

export interface LeadCualificacion {
    id: string;
    id_lead: string;
    id_llamada?: string | null;
    motivo_anulacion?: string | null;
    cualificacion?: string | null;
    anios_experiencia?: number | null;
    nivel_estudios?: string | null;
    fecha_creacion?: string | null;
    // Joined
    lead?: Lead;
    llamada?: Llamada;
}

// ─── PROGRAMAS ────────────────────────────────────────────────────────────────

export interface Programa {
    id: string;
    nombre: string;
    id_producto?: string | null;
    fecha_creacion?: string | null;
}

export interface LeadPrograma {
    id: string;
    id_lead: string;
    id_programa: string;
    fecha_creacion?: string | null;
    // Joined
    lead?: Lead;
    programa?: Programa;
}

// ─── NOTIFICACIONES ───────────────────────────────────────────────────────────

export interface Notificacion {
    id: string;
    id_lead: string;
    tipo: string;
    fecha_envio?: string | null;
    metadatos?: Record<string, unknown> | null;
    fecha_creacion?: string | null;
    // Joined
    lead?: Lead;
}

// ─── COMBINED / VIEW TYPES ────────────────────────────────────────────────────

/**
 * Una fila del Historial = UN LEAD con toda su actividad consolidada.
 *
 * DESIGN DECISION: La entidad central es el LEAD, no la llamada.
 * Un lead puede tener N reintentos (llamadas). En `llamadas` se incluye
 * el historial completo ordenado por fecha. La columna principal muestra
 * la última llamada relevante, pero el detalle expande todo el historial.
 *
 * tipo_lead es string libre (no enum) para soportar nuevos tipos de campaña
 * sin cambios de código.
 */
export interface HistorialRow {
    // ── Identidad del lead ──
    id: string;             // lead.id (clave única, sin duplicados)
    nombre?: string | null;
    apellido?: string | null;
    telefono?: string | null;
    email?: string | null;
    pais?: string | null;
    tipo_lead?: string | null;  // string libre: "nuevo", "ilocalizable", "localizable", ...
    origen?: string | null;
    campana?: string | null;
    fecha_ingreso_crm?: string | null;

    // ── Resumen de la ÚLTIMA llamada (o la más relevante) ──
    estado_llamada?: string | null;
    razon_termino?: string | null;
    fecha_inicio?: string | null;       // fecha de la última llamada
    duracion_segundos?: number | null;
    url_grabacion?: string | null;
    resumen?: string | null;
    tipo_agente?: string | null;

    // ── Cualificación (la más reciente) ──
    cualificacion?: string | null;
    motivo_anulacion?: string | null;
    anios_experiencia?: number | null;
    nivel_estudios?: string | null;

    // ── Agendamiento confirmado (el más próximo) ──
    fecha_agendada_cliente?: string | null;
    confirmado?: boolean | null;

    // ── Related Module Data (New) ──
    programa_nombre?: string | null;
    intentos_count: number;
    whatsapp_status?: string | null;
    opt_in_whatsapp?: boolean | null;
    notificaciones_status?: string | null;

    // ── Computed ──
    tiempo_respuesta_minutos?: number | null;  // primera llamada - fecha_ingreso_crm
    fecha_primer_contacto?: string | null;     // MIN(llamada, whatsapp)

    // ── Historial completo de llamadas/reintentos de este lead ──
    llamadas: LlamadaResumen[];        // todas las llamadas, orden desc
    total_llamadas: number;            // = llamadas.length

    // ── Dynamic / Extra Fields ──
    [key: string]: any; 
}

/** Supabase database shape (for createClient generic) */
export type Database = {
    public: {
        Tables: {
            lead: { Row: Lead; Insert: Omit<Lead, "id" | "fecha_creacion" | "fecha_actualizacion">; Update: Partial<Lead>; };
            llamadas: { Row: Llamada; Insert: Omit<Llamada, "id" | "fecha_creacion">; Update: Partial<Llamada>; };
            intentos_llamadas: { Row: IntentoLlamada; Insert: Omit<IntentoLlamada, "id" | "fecha_creacion">; Update: Partial<IntentoLlamada>; };
            conversaciones_whatsapp: { Row: ConversacionWhatsapp; Insert: Omit<ConversacionWhatsapp, "id" | "fecha_creacion">; Update: Partial<ConversacionWhatsapp>; };
            agendamientos: { Row: Agendamiento; Insert: Omit<Agendamiento, "id" | "fecha_creacion">; Update: Partial<Agendamiento>; };
            lead_cualificacion: { Row: LeadCualificacion; Insert: Omit<LeadCualificacion, "id" | "fecha_creacion">; Update: Partial<LeadCualificacion>; };
            programas: { Row: Programa; Insert: Omit<Programa, "id" | "fecha_creacion">; Update: Partial<Programa>; };
            lead_programas: { Row: LeadPrograma; Insert: Omit<LeadPrograma, "id" | "fecha_creacion">; Update: Partial<LeadPrograma>; };
            notificaciones: { Row: Notificacion; Insert: Omit<Notificacion, "id" | "fecha_creacion">; Update: Partial<Notificacion>; };
        };
    };
};
