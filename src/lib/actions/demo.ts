"use server";

import { getAdminStatus } from "./auth";

export async function injectDemoData(tenantId: string) {
    console.log("[DEMO] Inicia inyección encapsulada para:", tenantId);
    
    try {
        const { createClient } = await import("@supabase/supabase-js");
        // Init internally to avoid import-time crashes
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://interno-supabase-a201be-46-62-193-169.traefik.me";
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SERVICE_ROLE_KEY || 
                    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzI0OTEyMjksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.5VpQVwUhqDkHgplZiPE4iGjduuB2NfGNq-5vsASGAbI";
        
        const internalSupabase = createClient(url, key);

        let isAdmin = false;
        try {
            isAdmin = await getAdminStatus();
        } catch (e) {
            console.error("[DEMO] Auth check failed:", e);
            return { error: "Error de sesión al verificar permisos." };
        }

        if (!isAdmin) return { error: "No tienes permisos de administrador." };
        if (!tenantId) return { error: "ID de cliente no especificado." };

        const suffix = Math.random().toString(36).slice(2, 6);
        const campaignName = `Lab Demo ${suffix}`;

        // Phase 1: Campaign
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await internalSupabase.from('campanas' as any).insert({
            tenant_id: tenantId, nombre: campaignName, descripcion: "Prueba automática", estado: "ACTIVA"
        });

        // Phase 2: Lead
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: lead, error: lError } = await internalSupabase.from('lead' as any).insert({
            tenant_id: tenantId,
            nombre: "Prospecto",
            apellido: "Laboratorio",
            telefono: `+346${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `demo.${suffix}@lab.com`,
            campana: campaignName
        }).select().single();

        if (lError || !lead) throw new Error(`Fallo al crear lead: ${lError?.message || "Sin respuesta"}`);

        // Phase 3: Secondary activity (Non-blocking)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await internalSupabase.from('llamadas' as any).insert({
                tenant_id: tenantId, id_lead: lead.id, estado_llamada: 'completed',
                fecha_inicio: new Date().toISOString(), duracion_segundos: 60,
                transcripcion: "Prueba de laboratorio.", resumen: "Interés detectado."
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await internalSupabase.from('chat_messages' as any).insert({
                tenant_id: tenantId, lead_id: lead.id, direction: 'OUTBOUND',
                message_type: 'TEXT', content: "¡Bienvenido al Lab de Esden!", status: 'SENT'
            });
        } catch (e) {
            console.warn("[DEMO] Secondary activity failed:", e);
        }

        // Revalidation is often the cause of SSR render errors if target pages have bugs
        // revalidatePath("/dashboard");

        return { 
            success: true, 
            message: `¡Inyección Exitosa! Lead ${lead.id.slice(0,8)} creado. Refresca la página manualmente para ver los datos.` 
        };

    } catch (err: any) {
        console.error("[DEMO] Critical Crash:", err);
        return { error: `Error interno: ${err.message || "Desconocido"}` };
    }
}
