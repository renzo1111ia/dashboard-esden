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
