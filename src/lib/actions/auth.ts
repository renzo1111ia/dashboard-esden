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
