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
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("SUPABASE SERVER CLIENT: Missing env vars — using placeholder.");
            return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
        }

        return createClient<Database>(url, key);
    } catch (error) {
        console.error("SUPABASE SERVER CLIENT EXCEPTION:", error);
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
        console.error("ADMIN SUPABASE CLIENT: Missing environment variables — check .env");
        return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
    }

    return createClient<Database>(url, key);
}
