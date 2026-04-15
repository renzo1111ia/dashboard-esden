"use server";

import { createClient } from "@supabase/supabase-js";
import { getAdminStatus } from "./auth";
import { revalidatePath } from "next/cache";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

export async function injectDemoData(tenantId: string) {
    const isAdmin = await getAdminStatus();
    if (!isAdmin) {
        return { error: "No tienes permisos para inyectar datos de prueba." };
    }

    if (!tenantId) {
        return { error: "El tenantId es obligatorio para inyectar datos." };
    }

    try {
        // 3. Inyectar 12 Leads para llenar el dashboard
        const firstNames = ['Laura', 'Carlos', 'Elena', 'Andrés', 'Sofía', 'Ricardo', 'Marta', 'Javier', 'Lucía', 'Diego', 'Paula', 'Manuel'];
        const lastNames = ['Gómez', 'Rodríguez', 'Martínez', 'Pérez', 'López', 'Sánchez', 'Díaz', 'Torres', 'Ruiz', 'Vázquez', 'Castro', 'Navarro'];
        const phonePrefixes = ['+34600', '+5255', '+34600', '+5731', '+549', '+34611', '+34622', '+5199', '+34633', '+569', '+34644', '+5841'];
        const countries = ['España', 'México', 'España', 'Colombia', 'Argentina', 'España', 'España', 'Perú', 'España', 'Chile', 'España', 'Venezuela'];
        const types = ['MARKETING', 'VENTAS', 'INFORMATICA', 'MARKETING', 'VENTAS', 'MARKETING', 'VENTAS', 'MARKETING', 'MARKETING', 'VENTAS', 'INFORMATICA', 'VENTAS'];

        const fakeLeads = firstNames.map((name, i) => ({
            nombre: name,
            apellido: lastNames[i],
            telefono: phonePrefixes[i] + Math.floor(Math.random() * 900000 + 100000),
            email: `${name.toLowerCase()}.${lastNames[i].toLowerCase()}.demo@ejemplo.com`,
            pais: countries[i],
            tipo_lead: types[i],
            tenant_id: tenantId,
            origen: 'Web Simulator',
            campana: 'Campaña Captación Automática (Demo)',
            foto_url: `https://i.pravatar.cc/150?u=${name}${i}`,
            is_ai_enabled: true
        }));

        // Resilient insertion: check if columns exist by trying a subset if it fails
        let { data: leads, error: errLeads } = await supabase.from('lead').insert(fakeLeads).select();

        if (errLeads && errLeads.message.includes('column')) {
            console.warn("[DEMO] New columns not detected in DB, re-attempting with base columns...");
            const baseLeads = fakeLeads.map(({ foto_url, is_ai_enabled, ...rest }: any) => rest);
            const retry = await supabase.from('lead').insert(baseLeads).select();
            leads = retry.data;
            errLeads = retry.error;
        }

        if (errLeads) throw new Error(`Error creando leads: ${errLeads.message}`);
        if (!leads) throw new Error("No se crearon leads");

        // 4. Trigger Orchestrator and Chat History for each lead
        const { orchestrator } = await import("../core/orchestrator");
        
        for (const lead of leads || []) {
            // A. Trigger Orchestrator (Live Sequence)
            orchestrator.handleNewLead(lead.id, tenantId).catch(err => {
                console.error(`[SIMULATOR] Failed to trigger orchestrator for lead ${lead.id}:`, err);
            });

            // B. Inject Chat Mockup Conversation
            const chatMessages = [
                {
                    tenant_id: tenantId,
                    lead_id: lead.id,
                    direction: 'INBOUND',
                    message_type: 'TEXT',
                    content: `Hola, soy ${lead.nombre}, me gustaría recibir información sobre el Master de Esden.`,
                    sent_by: null,
                    status: 'READ',
                    created_at: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
                },
                {
                    tenant_id: tenantId,
                    lead_id: lead.id,
                    direction: 'OUTBOUND',
                    message_type: 'TEXT',
                    content: `¡Hola ${lead.nombre}! Un gusto saludarte. Tenemos varias opciones. ¿Te interesa el área de ${lead.tipo_lead}?`,
                    sent_by: '🤖 Agente IA',
                    status: 'READ',
                    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString() // 1.5 hours ago
                },
                {
                    tenant_id: tenantId,
                    lead_id: lead.id,
                    direction: 'INBOUND',
                    message_type: 'TEXT',
                    content: `Sí, exactamente esa.`,
                    sent_by: null,
                    status: 'READ',
                    created_at: new Date(Date.now() - 3600000 * 1).toISOString() // 1 hour ago
                }
            ];

            await supabase.from('chat_messages').insert(chatMessages);
        }

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/clients");
        revalidatePath("/dashboard/orchestrator");
        revalidatePath("/dashboard/inbox");
        revalidatePath("/dashboard/whatsapp");
        revalidatePath("/dashboard/calls");

        return { success: true, message: "Simulación iniciada. Verás a los leads aparecer y procesarse en el dashboard." };

    } catch (error) {
        return { error: error instanceof Error ? error.message : "Error desconocido inyectando datos." };
    }
}
