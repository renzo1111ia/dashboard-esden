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
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

/**
 * Gets the list of leads that have conversations, sorted by most recent message.
 */
export async function getInboxLeads(): Promise<{ success: boolean; data?: InboxLead[]; error?: string }> {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { success: false, error: "No tenant" };

    const supabase = await getSupabaseServerClient();
    
    // In a real production scenario, you would use a SQL View or lateral join.
    // For now, we'll fetch distinct leads that have messages using a subquery/join approach.
    const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("content, created_at, lead_id, lead(id, nombre, apellido, telefono)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    // Group by lead to get the latest message
    const leadMap = new Map<string, InboxLead>();

    (messages as any[] || []).forEach(msg => {
        if (!msg.lead_id) return;
        if (!leadMap.has(msg.lead_id)) {
            const l = msg.lead;
            leadMap.set(msg.lead_id, {
                id: msg.lead_id,
                nombre: l?.nombre,
                apellido: l?.apellido,
                telefono: l?.telefono,
                last_message: msg.content,
                last_message_time: msg.created_at,
                unread_count: 0 // Mocked for now
            });
        }
    });

    const results = Array.from(leadMap.values());
    return { success: true, data: results };
}

/**
 * Loads the full chat history for a specific lead.
 */
export async function getChatHistory(leadId: string): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { success: false, error: "No tenant" };

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }) // Latest first for UI virtualization or CSS reverse
        .limit(100);

    if (error) return { success: false, error: error.message };

    // Reverse to chronological order for the chat UI
    const chronological = (data as ChatMessage[]).reverse();
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
