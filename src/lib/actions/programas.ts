"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Programa } from "@/types/database";

export async function getPrograms() {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await getActiveTenantId();
    if (!tenantId) return [];

    const { data, error } = await (supabase
        .from("programas" as any) as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nombre", { ascending: true });

    if (error) throw error;
    return data as Programa[];
}

export async function updateProgram(id: string, updates: Partial<Programa>) {
    const supabase = await getAdminSupabaseClient();
    const { data, error } = await (supabase
        .from("programas" as any) as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    revalidatePath("/dashboard/programas");
    return data as Programa;
}

export async function createProgram(program: Omit<Programa, "id" | "fecha_creacion">) {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await getActiveTenantId();
    if (!tenantId) throw new Error("No hay un cliente seleccionado.");

    const { data, error } = await (supabase
        .from("programas" as any) as any)
        .insert({ ...program, tenant_id: tenantId })
        .select()
        .single();

    if (error) throw error;
    revalidatePath("/dashboard/programas");
    return data as Programa;
}
