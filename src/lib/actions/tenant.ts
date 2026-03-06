"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";
import { Tenant } from "@/types/tenant";

export async function setTenantCookies(url: string, key: string, name: string = "") {
    const cookieStore = await cookies();

    if (url && key) {
        cookieStore.set("esden-tenant-url", url, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        cookieStore.set("esden-tenant-key", key, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        cookieStore.set("esden-tenant-name", name, { path: "/", maxAge: 30 * 24 * 60 * 60 });
    } else {
        cookieStore.delete("esden-tenant-url");
        cookieStore.delete("esden-tenant-key");
        cookieStore.delete("esden-tenant-name");
    }
}

async function getAdminSupabase() {
    const cookieStore = await cookies();
    return createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    cookieStore.set(name, value, options);
                });
            },
        },
    });
}

export async function getTenants() {
    const supabase = await getAdminSupabase();
    const { data, error } = await supabase.from("tenants").select("*").order("name");
    if (error) {
        console.error("GET TENANTS ERROR:", error.message);
        return [];
    }
    return data;
}

export async function getActiveTenantConfig(): Promise<Tenant | null> {
    const cookieStore = await cookies();
    const url = cookieStore.get("esden-tenant-url")?.value;
    if (!url) return null;

    const supabase = await getAdminSupabase();
    // Using supabase_url to find the tenant might work assuming they are unique
    const { data, error } = await supabase.from("tenants").select("*").eq("supabase_url", url).single();
    if (error || !data) return null;
    return data as Tenant;
}

export async function createTenant(tenant: Partial<Tenant>) {
    const supabase = await getAdminSupabase();
    const { data, error } = await supabase.from("tenants").insert(tenant).select().single();
    if (error) {
        console.error("CREATE TENANT ERROR:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export async function updateTenant(id: string, updates: Partial<Tenant>) {
    const supabase = await getAdminSupabase();
    const { data, error } = await supabase.from("tenants").update(updates).eq("id", id).select().single();
    if (error) {
        console.error("UPDATE TENANT ERROR:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export async function deleteTenant(id: string) {
    const supabase = await getAdminSupabase();
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) {
        console.error("DELETE TENANT ERROR:", error.message);
        throw new Error(error.message);
    }
    return true;
}
