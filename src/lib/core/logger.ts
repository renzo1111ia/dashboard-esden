import { getAdminSupabaseClient } from "@/lib/supabase/server";

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type LogSource = 'ORCHESTRATOR' | 'API' | 'RESCUE' | 'WHATSAPP' | 'SYSTEM';

export class GlobalLogger {
    /**
     * Persists a log entry to the database and outputs to console.
     */
    static async log(
        tenantId: string,
        level: LogLevel,
        source: LogSource,
        message: string,
        metadata: Record<string, any> = {},
        errorCode?: string
    ) {
        try {
            const supabase = await getAdminSupabaseClient();
            
            // Console output with color-like prefixes
            const prefix = `[${level}] [${source}]`;
            if (level === 'ERROR') console.error(prefix, message, metadata);
            else if (level === 'WARN') console.warn(prefix, message, metadata);
            else console.log(prefix, message, metadata);

            // Persist to DB
            const { error } = await (supabase.from("system_logs" as any) as any).insert({
                tenant_id: tenantId,
                level,
                source,
                message,
                metadata,
                error_code: errorCode
            });

            if (error) {
                console.error("[LOGGER FATAL] Failed to persist log to DB:", error.message);
            }
        } catch (e) {
            console.error("[LOGGER FATAL] Critical failure in logging system:", e);
        }
    }

    static async info(tenantId: string, source: LogSource, message: string, metadata?: Record<string, any>) {
        return this.log(tenantId, 'INFO', source, message, metadata);
    }

    static async warn(tenantId: string, source: LogSource, message: string, metadata?: Record<string, any>) {
        return this.log(tenantId, 'WARN', source, message, metadata);
    }

    static async error(tenantId: string, source: LogSource, message: string, metadata?: Record<string, any>, errorCode?: string) {
        return this.log(tenantId, 'ERROR', source, message, metadata, errorCode);
    }
}
