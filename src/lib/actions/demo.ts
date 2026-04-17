"use server";

import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { getAdminStatus } from "./auth";

// v1.3 - Centralized Client Fix
export async function runLaboratoryInjection(tenantId: string) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[DEMO] [${timestamp}] Invocando laboratorio para:`, tenantId);
    
    try {
        const internalSupabase = await getAdminSupabaseClient();

        let isAdmin = false;
        try {
            isAdmin = await getAdminStatus();
        } catch (error) {
            console.error("[DEMO] Auth check failed:", error);
            return { error: "Error de sesión al verificar permisos." };
        }

        if (!isAdmin) return { error: "No tienes permisos de administrador." };
        if (!tenantId) return { error: "ID de cliente no especificado." };

        const suffix = Math.random().toString(36).slice(2, 6);
        const campaignName = `Lab Demo ${suffix}`;

        // Phase 1: Campaign
        console.log("[DEMO] Paso 1: Creando campaña...");
        const { error: errCamp } = await internalSupabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('campanas' as any)
            .insert({
                tenant_id: tenantId,
                nombre: campaignName,
                descripcion: "Prueba automática del Laboratorio",
                estado: "ACTIVA"
            });

        if (errCamp) {
            console.error("[DEMO] Error campana:", errCamp);
            // No bloqueamos el proceso, pero lo logueamos
        }

        // Phase 2: Lead
        console.log("[DEMO] Paso 2: Creando lead...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: lead, error: lError } = await internalSupabase.from('lead' as any).insert({
            tenant_id: tenantId,
            nombre: "Prospecto",
            apellido: "Laboratorio",
            telefono: `+346${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `demo.${suffix}@lab.com`,
            campana: campaignName, // Nombre de la campaña
            pais: "España",
            tipo_lead: "NUEVO",
            origen: "LAB DEMO",
            is_ai_enabled: true
        }).select().single();

        if (lError) {
            console.error("[DEMO] Error DB al crear Lead:", lError);
            return { error: `Fallo al crear lead: ${lError.message} (${lError.code})` };
        }
        if (!lead) return { error: "La base de datos no devolvió el lead creado." };

        // Phase 3: Secondary activity (Non-blocking)
        console.log("[DEMO] Paso 3: Creando actividad secundaria para lead:", lead.id);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (internalSupabase.from('llamadas' as any) as any).insert({
                tenant_id: tenantId,
                id_lead: lead.id,
                estado_llamada: 'completed',
                fecha_inicio: new Date().toISOString(),
                duracion_segundos: 60,
                transcripcion: "Llamada de prueba del laboratorio.",
                resumen: "Interés detectado en el sistema."
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (internalSupabase.from('chat_messages' as any) as any).insert({
                tenant_id: tenantId,
                lead_id: lead.id,
                direction: 'OUTBOUND',
                message_type: 'TEXT',
                content: "¡Bienvenido al Lab de Esden! Este es un mensaje de prueba.",
                status: 'SENT'
            });
        } catch (error) {
            console.warn("[DEMO] Secondary activity failed:", error);
        }

        return { 
            success: true, 
            message: `¡Inyección Exitosa! Se ha creado el lead con ID ${lead.id.slice(0,8)}. Revisa el dashboard para ver los resultados.` 
        };

    } catch (err: unknown) {
        const error = err as Error;
        console.error("[DEMO] Critical Crash:", error);
        return { error: `Error interno de ejecución: ${error.message || "Desconocido"}` };
    }
}

export async function clearDemoData(tenantId: string) {
    console.log(`[DEMO] 🧹 Limpiando datos demo para: ${tenantId}`);

    try {
        const internalSupabase = await getAdminSupabaseClient();

        let isAdmin = false;
        try {
            isAdmin = await getAdminStatus();
        } catch {
            return { error: "Error de sesión." };
        }

        if (!isAdmin) return { error: "No tienes permisos de administrador." };
        if (!tenantId) return { error: "ID de cliente no especificado." };

        // 1. Borrar Leads con origen 'LAB DEMO'
        const { error: errLeads } = await (internalSupabase
            .from('lead' as any) as any)
            .delete()
            .eq('tenant_id', tenantId)
            .eq('origen', 'LAB DEMO');

        if (errLeads) {
            console.error("[DEMO] Error al borrar leads:", errLeads);
            return { error: `Error borrando leads: ${errLeads.message}` };
        }

        // 2. Borrar Campañas con nombre que empiece por 'Lab Demo'
        const { error: errCamp } = await (internalSupabase
            .from('campanas' as any) as any)
            .delete()
            .eq('tenant_id', tenantId)
            .like('nombre', 'Lab Demo%');

        if (errCamp) {
            console.error("[DEMO] Error al borrar campañas:", errCamp);
            return { error: `Error borrando campañas: ${errCamp.message}` };
        }

        return { 
            success: true, 
            message: "Datos de demostración eliminados correctamente. El sistema está limpio." 
        };

    } catch (err: unknown) {
        const error = err as Error;
        console.error("[DEMO] Clear Data Crash:", error);
        return { error: `Error interno: ${error.message}` };
    }
}
