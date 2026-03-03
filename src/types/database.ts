/**
 * TypeScript types mirroring the Supabase `post_call_analisis` table.
 * Keep in sync with supabase/schema.sql
 */

export type CallStatus =
    | "CONTACTED"
    | "NO_CONTACT"
    | "VOICEMAIL"
    | "TRANSFERRED_TO_HUMAN"
    | "ANNULLED"
    | "LATENCY_DROP"
    | "USER_INTERRUPTED"
    | "BUSY"
    | "INVALID_NUMBER";

export type YesNoPending = "SI" | "NO" | "PENDIENTE";

/** Schema of the extra_data JSONB dynamic motor column */
export type ExtraData = Record<string, string | number | boolean | null>;

export interface PostCallAnalisis {
    id: string;
    created_at: string;
    lead_id: string | null;
    phone_number: string | null;
    call_status: CallStatus;
    duration_seconds: number | null;
    motivo_anulacion: string | null;
    motivo_no_contacto: string | null;
    tipologia_llamada: string | null;
    master_interes: string | null;
    is_qualified: boolean;
    agendado_con_asesor: string | null;
    opt_in_whatsapp: YesNoPending | null;
    /** DYNAMIC MOTOR — do not alter column type */
    extra_data: ExtraData;
}

export type PostCallAnalisisInsert = Omit<PostCallAnalisis, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
};

/**
 * TypeScript type mirroring the Supabase `reintentos` table.
 */
export interface Reintento {
    id: string;
    /** Fecha y hora (timestamp de la interacción) */
    fecha_y_hora?: string | null;
    created_at?: string | null;
    /** Modificado */
    updated_at?: string | null;
    lead_id?: string | null;
    /** Reintento de llamada */
    reintento_de_llamada?: string | null;
    /** Reintento de WhatsApp */
    reintento_de_whatsapp?: string | null;
    /** Nombre del lead */
    nombre_del_lead?: string | null;
    /** Apellido del lead */
    apellido_del_lead?: string | null;
    /** País del Lead */
    pais_del_lead?: string | null;
    /** Teléfono */
    telefono?: string | null;
    phone_number?: string | null;
    /** Numero formato erroneo */
    numero_formato_erroneo?: string | null;
    /** Razón de desconexion */
    razon_de_desconexion?: string | null;
    /** Recording */
    recording?: string | null;
    /** Master de interés */
    master_de_interes?: string | null;
    /** Estado del lead */
    estado_del_lead?: string | null;
    /** Motivo de estado de lead */
    motivo_de_estado_de_lead?: string | null;
    /** Agendado */
    agendado?: string | null;
    /** Estado de reintento */
    estado_de_reintento?: string | null;
    /** Número de intento */
    numero_de_intento?: number | null;
    /** Número de intento whatsApp */
    numero_de_intento_whatsapp?: number | null;
    /** Llamada de asesor */
    llamada_de_asesor?: string | null;
    /** Origen */
    origen?: string | null;
    /** Call ID */
    call_id?: string | null;
    /** Duración llamada */
    duracion_llamada?: number | null;
    /** Opt in Whatsapp */
    opt_in_whatsapp?: string | null;
    /** Confirmación cita enviada */
    confirmacion_cita_enviada?: string | null;
    /** Recordatorio 24hs */
    recordatorio_24hs?: string | null;
    /** Recordatorio 1 h */
    recordatorio_1_h?: string | null;
    /** Aviso Whatsapp de intento llamada */
    aviso_whatsapp_de_intento_llamada?: string | null;
    /** Tiene Seguimiento AgenteIA? */
    tiene_seguimiento_agente_ia?: string | null;
    /** Post WhatsApp análisis realizado */
    post_whatsapp_analisis_realizado?: string | null;
    /** Campaña */
    campana?: string | null;
    /** Tipo Lead */
    tipo_lead?: string | null;
    /** Momento de primera llamada */
    momento_de_primera_llamada?: string | null;
    /** Ultimo envio WhatsApp */
    ultimo_envio_whatsapp?: string | null;
    /** Conversartion ID chatwoot */
    conversartion_id_chatwoot?: string | null;
}

/** Supabase database shape (for createClient generic) */
export type Database = {
    public: {
        Tables: {
            post_call_analisis: {
                Row: PostCallAnalisis;
                Insert: PostCallAnalisisInsert;
                Update: Partial<PostCallAnalisisInsert>;
            };
        };
    };
};
