import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

/**
 * Returns the currently active tenant_id from the cookie.
 */
export async function getActiveTenantId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get("esden-tenant-id")?.value || null;
}

/**
 * V2 Server-side Supabase client with Diagnostic Logs.
 */
export async function getSupabaseServerClient() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        const key = serviceKey || anonKey;

        // DIAGNOSTIC LOG (Masked for safety)
        if (process.env.NODE_ENV === 'production') {
            console.log(`[ENV_DIAGNOSTIC] URL: ${url ? 'OK (starts with ' + url.substring(0, 10) + ')' : 'MISSING'}`);
            console.log(`[ENV_DIAGNOSTIC] ServiceKey: ${serviceKey ? 'PRESENT (starts with ' + serviceKey.substring(0, 8) + ')' : 'MISSING'}`);
            console.log(`[ENV_DIAGNOSTIC] AnonKey: ${anonKey ? 'PRESENT (starts with ' + anonKey.substring(0, 8) + ')' : 'MISSING'}`);
        }

        if (!url || !key) {
            console.error("SUPABASE CLIENT ERROR: Missing credentials.");
            return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
        }

        return createClient<Database>(url, key, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
    } catch (error) {
        console.error("SUPABASE CRITICAL EXCEPTION:", error);
        return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
    }
}

/**
 * Admin Supabase client with explicit logging.
 */
export async function getAdminSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error(`[ADMIN_CLIENT] ERROR: Missing URL or ServiceKey in environment.`);
        return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
    }

    return createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}
