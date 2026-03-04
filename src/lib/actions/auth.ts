"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function loginAction(email: string, password: string) {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return { error: "Configuración del servidor incompleta. Contactá al administrador." };
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { error: "Credenciales incorrectas o error de conexión." };
    }

    return { success: true };
}
