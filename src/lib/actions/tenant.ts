"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, AUTH_SUPABASE_SERVICE_ROLE_KEY } from "@/lib/auth-config";
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
    if (!AUTH_SUPABASE_URL || !AUTH_SUPABASE_ANON_KEY) {
        throw new Error("Configuración de administración (AUTH) incompleta. Verifique las variables de entorno.");
    }
    const cookieStore = await cookies();
    return createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    cookieStore.set(name, value, options);
                });
            },
        },
    });
}

/**
 * Client using SERVICE ROLE KEY to perform administrative tasks
 */
async function getServiceSupabase() {
    // 1. Intentamos leer de las variables de entorno (Lo ideal)
    let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || AUTH_SUPABASE_URL;

    // 2. Si no existe (problema de Hetzner/Dokploy), usamos la llave directa como respaldo
    if (!serviceKey) {
        serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzI0OTEyMjksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.5VpQVwUhqDkHgplZiPE4iGjduuB2NfGNq-5vsASGAbI";
    }

    if (!url || !serviceKey) {
        throw new Error("Error crítico: No se pudo determinar la URL o la Llave Maestra de Supabase.");
    }

    const cookieStore = await cookies();
    return createServerClient(url, serviceKey, {
        cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll() { },
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

export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
    const supabase = await getAdminSupabase();
    const { data, error } = await supabase.from("tenants").select("*").eq("auth_user_id", userId).single();
    if (error || !data) return null;
    return data as Tenant;
}

export async function createTenant(tenant: Partial<Tenant> & { password?: string }) {
    try {
        const supabase = await getAdminSupabase();
        const serviceSupabase = await getServiceSupabase();

        let authUserId: string | undefined;

        // 1. If email and password provided, create user in Auth
        if (tenant.client_email && tenant.password) {
            const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
                email: tenant.client_email,
                password: tenant.password,
                email_confirm: true,
                user_metadata: { is_admin: false, tenant_name: tenant.name }
            });

            if (authError) {
                console.error("AUTH USER CREATION ERROR:", authError.message);
                return { error: `Error en Auth: ${authError.message}` };
            }
            authUserId = authData.user?.id;
        }

        // 2. Insert into tenants table
        const { password, ...tenantData } = tenant;
        const { data, error } = await supabase
            .from("tenants")
            .insert({
                ...tenantData,
                auth_user_id: authUserId
            })
            .select()
            .single();

        if (error) {
            console.error("CREATE TENANT ERROR:", error.message);
            return { error: `Error en Base de Datos: ${error.message}` };
        }
        return { success: true, data };
    } catch (e: any) {
        console.error("UNEXPECTED CREATE TENANT ERROR:", e);
        return { error: `Error inesperado: ${e.message || "Error desconocido"}` };
    }
}

export async function updateTenant(id: string, updates: Partial<Tenant> & { password?: string }) {
    try {
        const supabase = await getAdminSupabase();
        const serviceSupabase = await getServiceSupabase();

        // 1. If password is provided AND auth_user_id exists, update it
        if (updates.password && updates.auth_user_id) {
            const { error: authError } = await serviceSupabase.auth.admin.updateUserById(
                updates.auth_user_id,
                { password: updates.password }
            );
            if (authError) {
                console.error("AUTH PASSWORD UPDATE ERROR:", authError.message);
                return { error: `Error actualizando contraseña: ${authError.message}` };
            }
        }

        // 2. Update record
        const { password, ...cleanUpdates } = updates;
        const { data, error } = await supabase.from("tenants").update(cleanUpdates).eq("id", id).select().single();
        if (error) {
            console.error("UPDATE TENANT ERROR:", error.message);
            return { error: `Error en Base de Datos: ${error.message}` };
        }
        return { success: true, data };
    } catch (e: any) {
        console.error("UNEXPECTED UPDATE TENANT ERROR:", e);
        return { error: `Error inesperado: ${e.message || "Error desconocido"}` };
    }
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
