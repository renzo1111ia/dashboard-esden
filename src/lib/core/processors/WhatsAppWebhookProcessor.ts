import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { whatsappBridge } from "../integrations/whatsapp";

/**
 * WHATSAPP WEBHOOK PROCESSOR
 * Handles the logic of identifying leads, logging messages, and triggering AI responses.
 */

export async function processIncomingWhatsApp(fromNumber: string, message: any, wabaId: string) {
    console.log(`[WHATSAPP PROCESSOR] Processing message from ${fromNumber} (WABA ID: ${wabaId})`);

    try {
        const supabase = getAdminSupabase();

        // 1. Identify Tenant by WABA ID (phone_number_id)
        // We search in the JSONB config of the tenants table
        const { data: tenants, error: tenantError } = await supabase
            .from("tenants")
            .select("id")
            .filter("config->whatsapp->>phoneNumberId", "eq", wabaId);

        if (tenantError || !tenants || tenants.length === 0) {
            console.warn(`[WHATSAPP PROCESSOR] No tenant found for phone_number_id: ${wabaId}`);
            return;
        }

        const tenantId = tenants[0].id;

        // 2. Normalize Phone Number (remove + or prefix if necessary)
        // Meta sends standard E.164, we search in the `lead` table
        let searchPhone = fromNumber;
        if (searchPhone.startsWith("+")) searchPhone = searchPhone.slice(1);

        // 3. Find or Create Lead
        let { data: lead, error: leadError } = await supabase
            .from("lead")
            .select("*")
            .eq("tenant_id", tenantId)
            .ilike("telefono", `%${searchPhone}%`)
            .single();

        if (leadError || !lead) {
            console.log(`[WHATSAPP PROCESSOR] Lead not found for ${fromNumber}. Creating anonymous lead.`);
            const { data: newLead, error: createError } = await (supabase
                .from("lead" as any) as any)
                .insert({
                    tenant_id: tenantId,
                    telefono: fromNumber,
                    nombre: "Prospecto",
                    apellido: "WhatsApp",
                    origen: "WHATSAPP_INBOUND",
                    is_ai_enabled: true
                })
                .select()
                .single();
            
            if (createError) throw createError;
            lead = newLead as any;
        }

        // 4. Extract content (Text or Media)
        let content = "";
        if (message.type === "text") {
            content = message.text?.body || "";
        } else if (message.type === "button") {
            content = message.button?.text || "";
        } else if (message.type === "interactive") {
            content = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "Interacción Botón";
        } else {
            content = `[Mensaje tipo: ${message.type}]`;
        }

        // 1. Get Lead & Tenant Context
        const { data: leadData } = await (supabase.from("lead" as any) as any).select("*").eq("id", lead!.id).single();
        if (!leadData) return;

        // 2. Get Course Info (Programas)
        // We look for the programs linked to this lead
        const { data: leadPrograms } = await (supabase.from("lead_programas" as any) as any).select("id_programa").eq("id_lead", lead!.id);

        // 5. Log Message in `chat_messages`
        const { error: logError } = await supabase
            .from("chat_messages")
            .insert({
                tenant_id: tenantId,
                lead_id: lead!.id,
                direction: "INBOUND",
                message_type: "TEXT",
                content: content,
                status: "RECEIVED",
                metadata: { meta_id: message.id, raw: message, programs: leadPrograms }
            });

        if (logError) console.error("[WHATSAPP PROCESSOR] Failed to log message:", logError);

        // 6. Trigger AI Response if AI is enabled for this lead
        if (lead!.is_ai_enabled) {
            const { generateAIWhatsAppResponse } = await import("./WhatsAppAIProcessor");
            await generateAIWhatsAppResponse(tenantId, lead!.id, content);
        }

    } catch (err: any) {
        console.error("[WHATSAPP PROCESSOR] Error:", err.message);
    }
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient<Database>(url, key);
}
