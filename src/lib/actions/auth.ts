"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";

export async function loginAction(email: string, password: string) {
    const cookieStore = await cookies();

    const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error("LOGIN ERROR:", error.message);
        return { error: "Credenciales incorrectas. Verificá tu email y contraseña." };
    }

    const isAdmin = data.user?.user_metadata?.is_admin === true || data.user?.user_metadata?.is_admin === "true";
    return { success: true, isAdmin };
}

export async function logoutAction() {
    const cookieStore = await cookies();

    const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    cookieStore.set(name, value, { ...options, maxAge: 0 }); // forcefully expire
                });
            },
        },
    });

    await supabase.auth.signOut();

    // Clear our custom tenant logic cookies as well
    cookieStore.delete("esden-tenant-url");
    cookieStore.delete("esden-tenant-key");
    cookieStore.delete("esden-tenant-name");

    return { success: true };
}

export async function getAdminStatus(): Promise<boolean> {
    const cookieStore = await cookies();
    const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll() { },
        },
    });

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    const isAdm = user?.user_metadata?.is_admin === true ||
        user?.user_metadata?.is_admin === "true" ||
        user?.app_metadata?.is_admin === true ||
        user?.app_metadata?.is_admin === "true";
    return isAdm;
}
