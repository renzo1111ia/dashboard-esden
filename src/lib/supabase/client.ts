"use client";

import { createClient } from "@supabase/supabase-js";
import { useTenantStore } from "@/store/tenant";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client dynamically using the tenant's credentials.
 * Falls back to the default app credentials if no tenant is configured.
 *
 * MULTI-TENANT CORE: This is how each client queries their own Supabase project.
 */
export function getSupabaseClient() {
    try {
        const { supabaseUrl, supabaseAnonKey } = useTenantStore.getState();

        const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("SUPABASE CLIENT ERROR: Missing credentials.");
            // During SSR or initial boot without config, return a placeholder
            // to avoid throwing and causing a 500 error.
            return createClient<Database>("https://placeholder.supabase.co", "placeholder");
        }

        return createClient<Database>(url, key);
    } catch (error) {
        console.error("CLIENT INSTANTIATION ERROR:", error);
        // Fallback to avoid crashing the whole app
        return createClient<Database>("https://placeholder.supabase.co", "placeholder");
    }
}
