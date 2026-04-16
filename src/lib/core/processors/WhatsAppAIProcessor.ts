import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { whatsappBridge } from "../../integrations/whatsapp";
import OpenAI from "openai";

/**
 * WHATSAPP AI PROCESSOR (CEREBRO)
 * Generates context-aware responses using OpenAI and tenant-specific configurations.
 */

export async function generateAIWhatsAppResponse(tenantId: string, leadId: string, incomingMessage: string) {
    console.log(`[AI PROCESSOR] Generating response for lead ${leadId} (tenant: ${tenantId})`);

    try {
        const supabase = getAdminSupabase();

        // 1. Get Lead & Tenant Context
        const { data: lead } = await supabase.from("lead").select("*").eq("id", leadId).single();
        if (!lead) return;

        // 2. Get Course Info (Programas)
        // We look for the programs linked to this lead
        const { data: leadPrograms } = await supabase.from("lead_programas").select("id_programa").eq("id_lead", leadId);
        let courseContext = "";
        
        if (leadPrograms && leadPrograms.length > 0) {
            const { data: program } = await supabase.from("programas").select("*").eq("id", leadPrograms[0].id_programa).single();
            if (program) {
                courseContext = `
INFORMACIÓN DEL CURSO:
- Nombre: ${program.nombre}
- Presentación: ${program.presentacion}
- Objetivos: ${program.objetivos}
- Precio: ${program.precio}
- Metodología: ${program.metodologia}
- Fechas inicio: ${program.fechas_inicio}
- Requisitos: ${program.requisitos_cualificacion}
`;
            }
        }

        // 3. Get Conversation History
        const { data: history } = await supabase
            .from("chat_messages")
            .select("direction, content")
            .eq("lead_id", leadId)
            .order("created_at", { ascending: false })
            .limit(10);
        
        const conversationHistory = history?.reverse().map(m => 
            `${m.direction === "INBOUND" ? "Usuario" : "Asistente"}: ${m.content}`
        ).join("\n") || "";

        // 4. Get AI Agent & Variant (API Key + Prompt)
        // We look for an active agent for this tenant
        const { data: variants } = await supabase
            .from("ai_agent_variants")
            .select("*, ai_agents!inner(tenant_id)")
            .eq("ai_agents.tenant_id", tenantId)
            .eq("is_active", true)
            .limit(1);

        if (!variants || variants.length === 0) {
            console.warn(`[AI PROCESSOR] No active AI agent found for tenant ${tenantId}`);
            return;
        }

        const activeVariant = variants[0];
        const apiKey = activeVariant.api_key;
        if (!apiKey) {
            console.error(`[AI PROCESSOR] API Key missing in agent variant for tenant ${tenantId}`);
            return;
        }

        // 5. Initialize OpenAI with Tenant Key
        const openai = new OpenAI({ apiKey });

        // 6. Build Prompt
        const systemPrompt = `
${activeVariant.prompt_text}

CONTEXTO DEL LEAD:
- Nombre: ${lead.nombre} ${lead.apellido || ""}
- Email: ${lead.email || "No proveído"}
- País: ${lead.pais || "No proveído"}
${courseContext}

HISTORIAL DE CONVERSACIÓN RECIENTE:
${conversationHistory}
`;

        // 7. Call LLM
        const completion = await openai.chat.completions.create({
            model: activeVariant.model_name || "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: incomingMessage }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const aiResponse = completion.choices[0]?.message?.content || "";

        if (aiResponse) {
            // 8. Send via WhatsApp
            const { data: tenant } = await supabase.from("tenants").select("config").eq("id", tenantId).single();
            const waConfig = (tenant?.config as any)?.whatsapp;

            if (waConfig?.accessToken && waConfig?.phoneNumberId) {
                await whatsappBridge.sendTextMessage(lead.telefono!, aiResponse, {
                    accessToken: waConfig.accessToken,
                    phoneNumberId: waConfig.phoneNumberId
                });

                // 9. Log Outbound Message
                await supabase.from("chat_messages").insert({
                    tenant_id: tenantId,
                    lead_id: leadId,
                    direction: "OUTBOUND",
                    message_type: "TEXT",
                    content: aiResponse,
                    sent_by: "AI_AGENT",
                    status: "SENT",
                    metadata: { 
                        model: activeVariant.model_name,
                        variant_id: activeVariant.id,
                        token_usage: completion.usage
                    }
                });
            } else {
                console.error(`[AI PROCESSOR] WhatsApp credentials missing for tenant ${tenantId} during response`);
            }
        }

    } catch (err: any) {
        console.error("[AI PROCESSOR] Error generating response:", err.message);
    }
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient<Database>(url, key);
}
