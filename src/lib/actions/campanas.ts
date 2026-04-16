"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Campana } from "@/types/database";

export async function createCampaign(data: Partial<Campana>) {
    try {
        const client = await getAdminSupabaseClient();
        const tenantId = await getActiveTenantId();
        
        if (!tenantId) return { success: false, error: "No hay un cliente activo seleccionado." };

        const campaignData = {
            tenant_id: tenantId,
            nombre: data.nombre,
            descripcion: data.descripcion,
            estado: data.estado || "ACTIVA",
            fecha_inicio: data.fecha_inicio || new Date().toISOString(),
            fecha_fin: data.fecha_fin,
            agente_texto_id: data.agente_texto_id,
            agente_llamada_id: data.agente_llamada_id,
        };

        const { data: newCampaign, error } = await (client
            .from("campanas" as any) as any)
            .insert(campaignData)
            .select()
            .single();

        if (error) {
            console.error("createCampaign ERROR:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/campanas");
        return { success: true, data: newCampaign };
    } catch (e: any) {
        console.error("createCampaign EXCEPTION:", e);
        return { success: false, error: e.message };
    }
}

export async function getCampaigns() {
    try {
        const supabase = await getAdminSupabaseClient();
        const tenantId = await getActiveTenantId();
        if (!tenantId) return [];

        const { data, error } = await (supabase
            .from("campanas" as any) as any)
            .select("*")
            .eq("tenant_id", tenantId)
            .order("fecha_creacion", { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    } catch (e) {
        console.error("getCampaigns ERROR:", e);
        return [];
    }
}
