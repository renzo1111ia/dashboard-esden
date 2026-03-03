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
    const { supabaseUrl, supabaseAnonKey } = useTenantStore.getState();

    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!url || !key) {
        throw new Error(
            "Supabase credentials are missing. Configure them in the tenant settings."
        );
    }

    return createClient<Database>(url, key);
}
