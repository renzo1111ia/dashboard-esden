"use server";

import { createClient } from "@supabase/supabase-js";
import { getAdminStatus } from "./auth";
import { revalidatePath } from "next/cache";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

export async function injectDemoData(tenantId: string) {
    console.log("[DEMO] Starting lab injection for tenant:", tenantId);
    
    try {
        const isAdmin = await getAdminStatus();
        if (!isAdmin) {
            return { error: "No tienes permisos para inyectar datos de prueba." };
        }

        if (!tenantId) {
            return { error: "El tenantId es obligatorio para inyectar datos." };
        }

        // 1. Create a Demo Campaign
        const campaignName = "Master Esden - Captación Lab 2026";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: errCamp } = await supabase
            .from('campanas' as any)
            .upsert({
                tenant_id: tenantId,
                nombre: campaignName,
                descripcion: "Campaña de prueba generada por el Laboratorio Demo.",
                estado: "ACTIVA",
                fecha_inicio: new Date().toISOString()
            }, { onConflict: 'tenant_id,nombre' });

        if (errCamp) console.error("[DEMO] Campaign upsert error:", errCamp);

        // 2. Prepare coherent sample Leads
        const samples = [
            { nombre: 'Laura', apellido: 'Gómez', email: 'laura.g@esden.edu.es', phone: '+34600111222', country: 'España', type: 'MARKETING' },
            { nombre: 'Carlos', apellido: 'Rodríguez', email: 'c.rodriguez@demo.com', phone: '+525512345678', country: 'México', type: 'VENTAS' },
            { nombre: 'Elena', apellido: 'Martínez', email: 'elena.mtz@gmail.com', phone: '+34611222333', country: 'España', type: 'INFORMATICA' },
            { nombre: 'Andrés', apellido: 'Pérez', email: 'andres.p@outlook.com', phone: '+573104567890', country: 'Colombia', type: 'MARKETING' },
            { nombre: 'Sofía', apellido: 'López', email: 'sofia.lopez@demo.es', phone: '+34622333444', country: 'España', type: 'VENTAS' }
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
            foto_url: `https://i.pravatar.cc/150?u=${s.nombre}${i}`,
            is_ai_enabled: true
        }));

        // 3. Insert Leads
        console.log("[DEMO] Inserting leads...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: leads, error: errLeads } = await supabase
            .from('lead' as any)
            .upsert(fakeLeads, { onConflict: 'tenant_id,telefono' })
            .select();

        if (errLeads) throw new Error(`Error en leads: ${errLeads.message}`);
        if (!leads) throw new Error("No se crearon leads.");

        // 4. Populate sub-modules for each lead
        console.log("[DEMO] Populating sub-modules (calls, whatsapp, kval)...");
        
        for (const lead of leads) {
            // A. Simular Llamada (Minutos/Llamadas)
            const callId = `call_${Math.random().toString(36).slice(2, 9)}`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await supabase.from('llamadas' as any).insert({
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
            await supabase.from('lead_cualificacion' as any).insert({
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
            await supabase.from('chat_messages').insert(chatMessages);
        }

        // 5. Cleanup & Path Refreshing
        console.log("[DEMO] Injection finished successfully.");
        
        try {
            revalidatePath("/dashboard");
            revalidatePath("/dashboard/minutos");
            revalidatePath("/dashboard/whatsapp");
            revalidatePath("/dashboard/campanas");
            revalidatePath("/dashboard/historial");
            revalidatePath("/dashboard/onboarding");
        } catch (e) {
            console.warn("[DEMO] Revalidation warning (expected in some dev envs):", e);
        }

        return { success: true, message: "Laboratorio completado. Dashboard sincronizado con 5 nuevos leads omnicanal." };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[DEMO] Critical Error:", error);
        return { error: error.message || "Error inesperado en el Laboratorio." };
    }
}
