"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveTenantConfig } from "./tenant";

// ─── Types ────────────────────────────────────────────────────────

export interface OrchestratorSequenceStep {
    step: number;
    action: "call" | "whatsapp" | "ai_agent" | "wait";
    agents?: string[];       // Array de agent IDs para A/B
    template?: string;       // WhatsApp template name
    delay_hours: number;     // Horas de espera antes de este paso
}

export interface OrchestratorTimezoneRules {
    start: string;              // "09:00"
    end: string;                // "20:00"
    working_days: number[];     // [1,2,3,4,5] = Lun-Vie
    phone_prefix_map: Record<string, string>; // "+34" → "Europe/Madrid"
}

export interface OrchestratorABConfig {
    enabled: boolean;
    split: number; // 0.0 – 1.0, default 0.5
}

export interface OrchestratorRetellConfig {
    api_key: string;
    from_number: string;
}

export interface TenantOrchestratorConfig {
    timezone_rules: OrchestratorTimezoneRules;
    sequence: OrchestratorSequenceStep[];
    ab_testing: OrchestratorABConfig;
    retell: OrchestratorRetellConfig;
}

const DEFAULT_CONFIG: TenantOrchestratorConfig = {
    timezone_rules: {
        start: "09:00",
        end: "20:00",
        working_days: [1, 2, 3, 4, 5],
        phone_prefix_map: {
            "+34": "Europe/Madrid",
            "+56": "America/Santiago",
            "+52": "America/Mexico_City",
            "+57": "America/Bogota",
            "+51": "America/Lima",
            "+54": "America/Argentina/Buenos_Aires",
            "+598": "America/Montevideo",
        }
    },
    sequence: [
        { step: 1, action: "call",      agents: [], delay_hours: 0 },
        { step: 2, action: "whatsapp",  template: "", delay_hours: 0 },
        { step: 3, action: "call",      agents: [], delay_hours: 27 },
    ],
    ab_testing: {
        enabled: false,
        split: 0.5,
    },
    retell: {
        api_key: "",
        from_number: ""
    }
};

// ─── Server Actions ───────────────────────────────────────────────

/**
 * Fetches the orchestrator config for the active tenant.
 * Returns a default config if none is set.
 */
export async function getOrchestratorConfig(): Promise<{ success: boolean; data?: TenantOrchestratorConfig; error?: string }> {
    try {
        const tenant = await getActiveTenantConfig();
        if (!tenant) return { success: false, error: "No active tenant" };

        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase
            .from("tenant_orchestrator_config")
            .select("config")
            .eq("tenant_id", tenant.id)
            .single();

        if (error || !data) {
            // No config yet — return defaults (not an error)
            return { success: true, data: DEFAULT_CONFIG };
        }

        // Merge with defaults for any missing keys
        const merged = deepMerge(DEFAULT_CONFIG, data.config as any);
        return { success: true, data: merged };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return { success: false, error: msg };
    }
}

/**
 * Saves the orchestrator config for the active tenant (upsert).
 */
export async function saveOrchestratorConfig(config: TenantOrchestratorConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const tenant = await getActiveTenantConfig();
        if (!tenant) return { success: false, error: "No active tenant" };

        const supabase = await getSupabaseServerClient();
        const { error } = await supabase
            .from("tenant_orchestrator_config")
            .upsert({ tenant_id: tenant.id, config } as never, { onConflict: "tenant_id" });

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return { success: false, error: msg };
    }
}

/**
 * Fetches the raw config for a given tenantId (for server-side use in orchestrator).
 * Does NOT require cookies — accepts tenantId directly.
 */
export async function getOrchestratorConfigForTenant(tenantId: string): Promise<TenantOrchestratorConfig> {
    try {
        const supabase = await getSupabaseServerClient();
        const { data } = await supabase
            .from("tenant_orchestrator_config")
            .select("config")
            .eq("tenant_id", tenantId)
            .single();

        if (!data) return DEFAULT_CONFIG;
        return deepMerge(DEFAULT_CONFIG, data.config as any);
    } catch {
        return DEFAULT_CONFIG;
    }
}

// ─── Utility ──────────────────────────────────────────────────────

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
    const result = { ...base };
    for (const key in override) {
        const val = override[key];
        if (val && typeof val === "object" && !Array.isArray(val)) {
            result[key] = deepMerge(base[key] as Record<string, any>, val as Record<string, any>) as T[typeof key];
        } else if (val !== undefined) {
            result[key] = val as T[typeof key];
        }
    }
    return result;
}
