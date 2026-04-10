"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * V2 Multi-Tenant Architecture: Single central Supabase instance.
 * All tenants share the same database. Row Level Security (RLS) enforces data isolation
 * using the tenant_id JWT claim passed through the session.
 *
 * This client always connects to the central Supabase project.
 * Tenant isolation is handled server-side via RLS — NOT via separate DB credentials.
 */
export function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error("SUPABASE CLIENT ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.");
        // Return a placeholder during SSR/initial boot to avoid crashing
        return createClient<Database>("https://placeholder.supabase.co", "placeholder");
    }

    return createClient<Database>(url, key);
}
