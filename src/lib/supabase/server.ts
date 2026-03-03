import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client.
 * Dynamically uses tenant credentials from cookies if available.
 * Falls back to environment variables (central project).
 */
export async function getSupabaseServerClient() {
    try {
        const cookieStore = await cookies();
        const tenantUrl = cookieStore.get("esden-tenant-url")?.value;
        const tenantKey = cookieStore.get("esden-tenant-key")?.value;

        const url = tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = tenantKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("SUPABASE SERVER CLIENT ERROR: Missing credentials.");
            // Return a dummy client or handle appropriately to avoid crashing
            // Note: This might still cause errors in downstream actions, but
            // prevents the whole app from returning a 500 on boot.
            return createClient<Database>("https://placeholder.supabase.co", "placeholder");
        }

        return createClient<Database>(url, key);
    } catch (error) {
        console.error("SERVER CLIENT INSTANTIATION ERROR:", error);
        throw error;
    }
}
