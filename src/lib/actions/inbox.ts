"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveTenantConfig } from "./tenant";

export interface ChatMessage {
    id: string;
    tenant_id: string;
    lead_id: string;
    direction: "INBOUND" | "OUTBOUND";
    message_type: "TEXT" | "TEMPLATE" | "SYSTEM_LOG" | "IMAGE" | "DOCUMENT";
    content: string;
    sent_by: string | null;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
    created_at: string;
    metadata: Record<string, unknown>;
}

export interface InboxLead {
    id: string;
    nombre: string | null;
    apellido: string | null;
    telefono: string | null;
    email?: string | null;
    foto_url: string | null;
    is_ai_enabled: boolean;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
    // Fields for detailed view
    tipo_lead?: string | null;
    pais?: string | null;
    origen?: string | null;
    campana?: string | null;
    segmentacion?: 'PUESTO 1' | 'REVISADO' | 'CUALIFICADO' | 'SIN INTERÉS' | null;
    created_at?: string;
}

export async function updateLeadSegment(leadId: string, segment: InboxLead['segmentacion']): Promise<{ success: boolean; error?: string }> {
    const supabase = await getSupabaseServerClient();
    const { error } = await (supabase
        .from('lead')
        .update({ segmentacion: segment } as never) as any)
        .eq('id', leadId);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
}

/**
 * Gets the list of leads that have conversations, sorted by most recent message.
 */
export async function getInboxLeads(): Promise<{ success: boolean; data?: InboxLead[]; error?: string }> {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { success: false, error: "No tenant" };

    const supabase = await getSupabaseServerClient();
    
    // 1. Fetch distinct lead IDs that have messages
    const { data: recentMessages, error } = await supabase
        .from("chat_messages")
        .select(`
            lead_id,
            content,
            created_at
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    // 2. Group by lead_id to keep ONLY the most recent message
    const latestMsgByLead = new Map<string, { content: string; time: string }>();
    (recentMessages as any[] || []).forEach(m => {
        if (m.lead_id && !latestMsgByLead.has(m.lead_id)) {
            latestMsgByLead.set(m.lead_id, { content: m.content, time: m.created_at });
        }
    });

    const leadIds = Array.from(latestMsgByLead.keys());
    if (leadIds.length === 0) return { success: true, data: [] };

    // 3. Fetch full lead details for those IDs
    const { data: leads, error: leadError } = await supabase
        .from("lead")
        .select("*")
        .in("id", leadIds);

    if (leadError) return { success: false, error: leadError.message };

    // 4. Combine and Map
    const results: InboxLead[] = (leads as any[] || []).map(l => {
        const msg = latestMsgByLead.get(l.id);
        return {
            id: l.id,
            nombre: l.nombre,
            apellido: l.apellido,
            telefono: l.telefono,
            foto_url: l.foto_url || null,
            is_ai_enabled: l.is_ai_enabled ?? true,
            last_message: msg?.content || "",
            last_message_time: msg?.time || "",
            created_at: l.fecha_primer_contacto || l.created_at,
            tipo_lead: l.tipo_lead || 'SIN CALIFICAR',
            pais: l.pais || 'España',
            origen: l.origen || 'Web Simulator',
            campana: l.campana || 'General',
            unread_count: 0
        };
    });

    // Sort by message time descending
    results.sort((a, b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());

    return { success: true, data: results };
}

/**
 * Loads the full chat history for a specific lead.
 */
export async function getChatHistory(leadId: string): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { success: false, error: "No tenant" };

    const supabase = await getSupabaseServerClient();
    
    // Fetch Messages
    const { data: messages, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(100);

    if (msgError) return { success: false, error: msgError.message };

    // Fetch Calls to show in timeline
    const { data: calls } = await supabase
        .from("llamadas")
        .select("id, estado_llamada, fecha_inicio, duracion_segundos")
        .eq("id_lead", leadId)
        .order("fecha_inicio", { ascending: false });

    // Combine and sort
    const chronological: ChatMessage[] = (messages as ChatMessage[] || []).map(m => ({ ...m }));

    if (calls && (calls as any[]).length > 0) {
        (calls as any[]).forEach(call => {
            chronological.push({
                id: `call-${call.id}`,
                tenant_id: tenant.id,
                lead_id: leadId,
                direction: 'OUTBOUND',
                message_type: 'SYSTEM_LOG',
                content: `Llamada ${call.estado_llamada === 'completed' ? 'Realizada' : 'Intento'}: ${call.duracion_segundos ? Math.floor(call.duracion_segundos / 60) + 'm ' + (call.duracion_segundos % 60) + 's' : 'Sin respuesta'}`,
                sent_by: 'Voice AI Agent',
                status: 'READ',
                created_at: call.fecha_inicio,
                metadata: { call_id: call.id }
            });
        });
    }

    // Sort all by date
    chronological.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { success: true, data: chronological };
}

/**
 * Sends a manual text message or a predefined template to a lead.
 * In production this would also call `whatsappBridge.send...` to push to Meta.
 */
export async function sendManualMessage(
    leadId: string, 
    content: string, 
    type: "TEXT" | "TEMPLATE" = "TEXT"
): Promise<{ success: boolean; data?: ChatMessage; error?: string }> {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { success: false, error: "No tenant" };

    const supabase = await getSupabaseServerClient();

    // WARNING: In a real environment, you must call the WhatsApp Bridge HERE.
    // Example: await whatsappBridge.sendMessage(lead.telefono, content, config);
    // For the UI demonstration, we just persist it in the DB.

    const { data, error } = await supabase
        .from("chat_messages")
        .insert({
            tenant_id: tenant.id,
            lead_id: leadId,
            direction: "OUTBOUND",
            message_type: type,
            content: content,
            sent_by: "Asesor (Beatriz)", // Could be dynamic from auth session
            status: "SENT"
        } as never)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data: data as ChatMessage };
}

/**
 * Injects a mockup message (Use only for demonstration/development).
 */
export async function injectMockupMessage(
    leadId: string, 
    direction: "INBOUND"| "OUTBOUND", 
    content: string, 
    sentBy?: string,
    messageType: "TEXT" | "TEMPLATE" | "SYSTEM_LOG" = "TEXT"
) {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return;

    const supabase = await getSupabaseServerClient();
    await supabase.from("chat_messages").insert({
        tenant_id: tenant.id,
        lead_id: leadId,
        direction,
        message_type: messageType,
        content,
        sent_by: sentBy,
        status: "DELIVERED"
    } as never);
}

/**
 * Toggles the AI agent status for a specific lead.
 */
export async function toggleLeadAI(leadId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const supabase = await getSupabaseServerClient();
    const { error } = await (supabase
        .from("lead")
        .update({ is_ai_enabled: enabled } as never) as any)
        .eq("id", leadId);

    if (error) {
        if (error.message.includes('column')) {
            console.error("[INBOX] Cannot toggle AI: column 'is_ai_enabled' missing in DB.");
            return { success: false, error: "La base de datos aún no tiene habilitada la función de pausa. Por favor, ejecuta la migración SQL." };
        }
        return { success: false, error: error.message };
    }
    return { success: true };
}
