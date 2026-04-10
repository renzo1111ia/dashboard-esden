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
        // 1. Inyectar un Programa Fake
        const { data: program, error: errProgram } = await supabase.from('programas').insert({
            tenant_id: tenantId,
            nombre: 'Programa Master Marketing Digital (Demo)',
        }).select().single();

        if (errProgram) throw new Error("Error creando programa: " + errProgram.message);

        // 2. Inyectar un Workflow Fake
        const { data: workflow, error: errWf } = await supabase.from('workflows').insert({
            tenant_id: tenantId,
            name: 'Campaña Captación Automática (Demo)',
            description: 'Secuencia generada por el Simulador',
            status: 'active'
        }).select().single();

        if (errWf) throw new Error("Error creando workflow: " + errWf.message);

        // 3. Inyectar 5 Leads
        const fakeLeads = [
            { nombre: 'Laura', apellido: 'Gómez', telefono: '+34600111222', email: 'laura.demo@ejemplo.com', pais: 'España', tipo_lead: 'MARKETING' },
            { nombre: 'Carlos', apellido: 'Rodríguez', telefono: '+525551234567', email: 'carlos.demo@ejemplo.com', pais: 'México', tipo_lead: 'VENTAS' },
            { nombre: 'Elena', apellido: 'Martínez', telefono: '+34600333444', email: 'elena.demo@ejemplo.com', pais: 'España', tipo_lead: 'INFORMATICA' },
            { nombre: 'Andrés', apellido: 'Pérez', telefono: '+573109876543', email: 'andres.demo@ejemplo.com', pais: 'Colombia', tipo_lead: 'MARKETING' },
            { nombre: 'Sofía', apellido: 'López', telefono: '+5491122334455', email: 'sofia.demo@ejemplo.com', pais: 'Argentina', tipo_lead: 'VENTAS' }
        ].map(l => ({
            ...l,
            tenant_id: tenantId,
            origen: 'Web Simulator',
            campana: 'Campaña Captación Automática (Demo)'
        }));

        const { data: leads, error: errLeads } = await supabase.from('lead').insert(fakeLeads).select();
        if (errLeads) throw new Error("Error creando leads: " + errLeads.message);

        // 4. Inyectar llamadas a algunos leads
        const leadLaura = leads.find(l => l.nombre === 'Laura');
        const leadCarlos = leads.find(l => l.nombre === 'Carlos');
        
        if (leadLaura) {
            await supabase.from('llamadas').insert({
                tenant_id: tenantId,
                id_lead: leadLaura.id,
                tipo_agente: 'IA',
                estado_llamada: 'completed',
                razon_termino: 'user_hungup',
                duracion_segundos: 145,
                transcripcion: 'Agent: Hola Laura. Laura: Sí, me interesa el Master. Agent: Genial, te enviaré un WhatsApp con el temario. Laura: Perfecto, gracias.',
                resumen: 'Lead muy interesado en el programa. Pide temario por WhatsApp.',
            });
            await supabase.from('lead_cualificacion').insert({
                tenant_id: tenantId,
                id_lead: leadLaura.id,
                cualificacion: 'Positivo',
                nivel_estudios: 'Grado Universitario'
            });
            // Mensajes Chat
            await supabase.from('chat_messages').insert([
                {
                    tenant_id: tenantId,
                    contact_id: leadLaura.id,
                    type: 'whatsapp',
                    direction: 'outbound',
                    content: '🤖 ¡Hola Laura! Soy tu asistente. Como acordamos en la llamada, aquí tienes el temario del Master.',
                    status: 'delivered'
                },
                {
                    tenant_id: tenantId,
                    contact_id: leadLaura.id,
                    type: 'whatsapp',
                    direction: 'inbound',
                    content: 'Muchas gracias, lo voy a revisar hoy mismo.',
                    status: 'read'
                }
            ]);
        }

        if (leadCarlos) {
            await supabase.from('llamadas').insert({
                tenant_id: tenantId,
                id_lead: leadCarlos.id,
                tipo_agente: 'IA',
                estado_llamada: 'voicemail',
                razon_termino: 'voicemail_reached',
                duracion_segundos: 20,
                transcripcion: 'Grabadora: El número paraguayo que usted ha marcado, no se encuentra disponible. Por favor deje un mensaje...',
                resumen: 'Llamada cayó en buzón de voz.',
            });
        }

        revalidatePath("/dashboard/clients");
        revalidatePath("/dashboard/orchestrator");
        revalidatePath("/dashboard/inbox");

        return { success: true, message: "Datos simulados inyectados con éxito." };

    } catch (error: any) {
        return { error: error.message || "Error desconocido inyectando datos." };
    }
}
