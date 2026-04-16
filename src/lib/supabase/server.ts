import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

/**
 * Returns the currently active tenant_id from the cookie.
 * This is set when the admin selects a client from the TenantSelector.
 * Used by analytics functions to scope all queries to the active tenant.
 */
export async function getActiveTenantId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get("esden-tenant-id")?.value || null;
}

/**
 * V2 Server-side Supabase client.
 * ALWAYS connects to the single central Supabase project.
 * Tenant data isolation is achieved by passing tenant_id explicitly in queries,
 * NOT by switching DB connections.
 * Uses SERVICE_ROLE_KEY to bypass session, then applies tenant_id filter in queries.
 */
export async function getSupabaseServerClient() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // Prioritize SERVICE_ROLE_KEY for server-side management to bypass RLS issues in actions
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("SUPABASE SERVER CLIENT ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Using placeholder.");
            return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
        }

        return createClient<Database>(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    } catch (error) {
        console.error("SUPABASE SERVER CLIENT CRITICAL EXCEPTION:", error);
        return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
    }
}

/**
 * Admin Supabase client.
 * ALWAYS targets the primary project (environment variables).
 * Uses SERVICE_ROLE_KEY to bypass RLS for orchestration management.
 */
export async function getAdminSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        const missing = !url ? "NEXT_PUBLIC_SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY";
        console.error(`ADMIN SUPABASE CLIENT ERROR: Missing ${missing} environment variable.`);
        return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
    }

    return createClient<Database>(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
