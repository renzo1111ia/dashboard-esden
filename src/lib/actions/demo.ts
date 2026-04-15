"use server";

import { createClient } from "@supabase/supabase-js";
import { getAdminStatus } from "./auth";
import { revalidatePath } from "next/cache";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

export async function injectDemoData(tenantId: string) {
    console.log("[DEMO] Starting lab injection for tenant:", tenantId);
    
    // Check environment at runtime
    if (!url || !key) {
        console.error("[DEMO] Missing Supabase environment variables.");
        return { error: "Configuración de servidor incompleta (URL/KEY faltante)." };
    }

    try {
        const isAdmin = await getAdminStatus();
        if (!isAdmin) {
            return { error: "No tienes permisos para inyectar datos de prueba." };
        }

        if (!tenantId) {
            return { error: "El tenantId es obligatorio para inyectar datos." };
        }

        // Use a unique suffix for this run to avoid collisions
        const suffix = Math.random().toString(36).slice(2, 6);

        const campaignName = `Master Esden - Lab ${suffix}`;
        const { error: errCamp } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('campanas' as any)
            .insert({
                tenant_id: tenantId,
                nombre: campaignName,
                descripcion: "Campaña de prueba generada por el Laboratorio Demo.",
                estado: "ACTIVA",
                fecha_inicio: new Date().toISOString()
            });

        if (errCamp) {
            console.error("[DEMO] Campaign insert error:", errCamp);
            // Non-critical: continue with a fallback campaign name
        }

        // 2. Prepare coherent sample Leads
        const samples = [
            { nombre: 'Laura', apellido: 'Gómez', email: `laura.${suffix}@esden.edu.es`, phone: `+34600${Math.floor(Math.random()*900000+100000)}`, country: 'España', type: 'MARKETING' },
            { nombre: 'Carlos', apellido: 'Rodríguez', email: `c.${suffix}@demo.com`, phone: `+5255${Math.floor(Math.random()*90000000+10000000)}`, country: 'México', type: 'VENTAS' },
            { nombre: 'Elena', apellido: 'Martínez', email: `elena.${suffix}@esden.es`, phone: `+34611${Math.floor(Math.random()*900000+100000)}`, country: 'España', type: 'INFORMATICA' }
        ];

        const fakeLeads = samples.map((s, i) => ({
            tenant_id: tenantId,
            nombre: s.nombre,
            apellido: s.apellido,
            telefono: s.phone,
            email: s.email,
            pais: s.country,
            tipo_lead: s.type,
            origen: 'Laboratorio Demo',
            campana: campaignName,
            foto_url: `https://i.pravatar.cc/150?u=${s.nombre}${suffix}${i}`,
            is_ai_enabled: true
        }));

        // 3. Insert Leads (using simple insert to avoid unique index issues with upsert)
        console.log("[DEMO] Inserting leads...");
        const { data: leads, error: errLeads } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('lead' as any)
            .insert(fakeLeads)
            .select();

        if (errLeads) {
            console.error("[DEMO] Lead insert error:", errLeads.message);
            throw new Error(`Error en leads: ${errLeads.message}`);
        }
        if (!leads || leads.length === 0) throw new Error("No se crearon leads en la base de datos.");

        // 4. Populate sub-modules for each lead
        console.log("[DEMO] Populating sub-modules (calls, whatsapp, kval)...");
        
        for (const lead of leads) {
            // A. Simular Llamada (Minutos/Llamadas)
            const callId = `call_${suffix}_${Math.random().toString(36).slice(2, 6)}`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('llamadas' as any) as any).insert({
                tenant_id: tenantId,
                id_lead: lead.id,
                id_llamada_retell: callId,
                tipo_agente: 'IA Agent',
                nombre_agente: 'Esden Virtual Advisor',
                estado_llamada: 'completed',
                razon_termino: 'user_ended',
                fecha_inicio: new Date(Date.now() - 3600000 * 5).toISOString(),
                duracion_segundos: 120 + Math.floor(Math.random() * 300),
                transcripcion: `IA: Hola ${lead.nombre}, te llamo de Esden. ¿Cómo estás?\nUsuario: Hola, bien gracias. Me interesa el master.\nIA: Perfecto, el área de ${lead.tipo_lead} tiene mucha demanda...`,
                resumen: `El prospecto ${lead.nombre} muestra alto interés en el área de ${lead.tipo_lead}.`
            });

            // B. Simular Cualificación (Historial)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('lead_cualificacion' as any) as any).insert({
                tenant_id: tenantId,
                id_lead: lead.id,
                cualificacion: 'HOT',
                calificacion_score: 85 + Math.floor(Math.random() * 15),
                motivo_anulacion: null,
                anios_experiencia: 3 + Math.floor(Math.random() * 10),
                nivel_estudios: 'Grado Universitario'
            });

            // C. Simular WhatsApp (WhatsApp)
            const chatMessages = [
                {
                    tenant_id: tenantId,
                    lead_id: lead.id,
                    direction: 'INBOUND',
                    message_type: 'TEXT',
                    content: `Hola! Dejé mis datos por el Master de ${lead.tipo_lead}.`,
                    status: 'READ',
                    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                },
                {
                    tenant_id: tenantId,
                    lead_id: lead.id,
                    direction: 'OUTBOUND',
                    message_type: 'TEXT',
                    content: `¡Hola ${lead.nombre}! Recibimos tu interés. ¿Cuándo te vendría bien una breve llamada?`,
                    sent_by: '🤖 Agente IA',
                    status: 'SENT',
                    created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
                }
            ];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('chat_messages' as any) as any).insert(chatMessages);
        }

        // 5. Cleanup & Path Refreshing (Wrapped to avoid crashing the whole action)
        console.log("[DEMO] Injection finished successfully. Starting revalidation...");
        
        try {
            revalidatePath("/dashboard");
            revalidatePath("/dashboard/minutos");
            revalidatePath("/dashboard/whatsapp");
            revalidatePath("/dashboard/campanas");
            revalidatePath("/dashboard/historial");
        } catch (e) {
            console.warn("[DEMO] Revalidation warning:", e);
        }

        return { success: true, message: `Laboratorio completado (${suffix}). Se inyectaron ${leads.length} leads y su actividad.` };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[DEMO] Server Action Crash:", error);
        return { error: error.message || "Error inesperado al ejecutar el Laboratorio." };
    }
}
