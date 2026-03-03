import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

/**
 * Server-side Supabase client.
 * Dynamically uses tenant credentials from cookies if available.
 * Falls back to environment variables (central project).
 * Never throws — returns a placeholder client so SSR never crashes.
 */
export async function getSupabaseServerClient() {
    try {
        const cookieStore = await cookies();
        const tenantUrl = cookieStore.get("esden-tenant-url")?.value;
        const tenantKey = cookieStore.get("esden-tenant-key")?.value;

        const url = tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = tenantKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("SUPABASE SERVER CLIENT: Missing credentials — using placeholder.");
            return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
        }

        return createClient<Database>(url, key);
    } catch (error) {
        console.error("SUPABASE SERVER CLIENT EXCEPTION:", error);
        return createClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
    }
}
