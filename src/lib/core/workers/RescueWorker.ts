import { getSupabaseServerClient } from "@/lib/supabase/server";
import { whatsappBridge } from "@/lib/integrations/whatsapp";
import { GlobalLogger } from "./logger";
/**
 * DYNAMIC RESCUE WORKER v2.0
 * Resonates with each AI Agent's specific inactivity rules.
 */
export async function runRescueCheck() {
    const supabase = await getSupabaseServerClient();
    const now = new Date();
    
    // 1. Fetch leads that are: 
    // - Assigned to an AI text agent
    // - Not paused
    const { data: leads, error } = await (supabase
        .from("lead" as any) as any)
        .select("*, ai_agents!lead_active_agent_id_fkey(*)")
        .not("active_agent_id", "is", null)
        .eq("is_ai_paused", false);

    if (error || !leads) return;

    console.log(`[RESCUE v2.0] Checking ${leads.length} leads with active agents.`);

    for (const lead of leads) {
        try {
            const agent = lead.ai_agents;
            if (!agent) continue;

            // 2. Extract rules from agent's flow_config
            const rules = (agent.flow_config as any)?.inactivity_rules;
            if (!rules) continue;

            const timeoutMins = rules.timeout_minutes || 4;
            const maxRetries = rules.max_retries || 1;
            const action = rules.action || "agent_message";
            const mode = rules.mode || "fixed"; // 'fixed' | 'smart'
            
            // 3. Time check
            const lastTouch = new Date(lead.last_interaction_at || lead.fecha_actualizacion);
            const diffMins = (now.getTime() - lastTouch.getTime()) / (1000 * 60);

            if (diffMins < timeoutMins) continue;

            // 4. Frequency check
            const sentCount = lead.inactivity_sent_count || 0;
            if (sentCount >= maxRetries) continue;

            // 5. Fetch Tenant Credentials for WhatsApp
            const { data: tenant } = await supabase.from("tenants").select("config").eq("id", lead.tenant_id).single();
            const waConfig = (tenant as any)?.config?.whatsapp;

            if (!waConfig || !waConfig.accessToken) {
                await GlobalLogger.warn(lead.tenant_id, 'RESCUE', `Missing WhatsApp credentials for tenant`, { leadId: lead.id });
                continue;
            }

            console.log(`[RESCUE] Triggering rescue for Lead ${lead.id} (Attempt ${sentCount + 1}/${maxRetries})`);
            await GlobalLogger.info(lead.tenant_id, 'RESCUE', `Inactivity rescue triggered (Attempt ${sentCount + 1}/${maxRetries})`, { leadId: lead.id, agentId: agent.id });

            // 6. Execute Action
            if (action === "template") {
                await whatsappBridge.sendTemplateMessage(
                    lead.telefono,
                    rules.template_name || "rescue_v1",
                    "es",
                    [],
                    {
                        accessToken: waConfig.accessToken,
                        phoneNumberId: waConfig.phoneNumberId
                    }
                );
            } else {
                // AGENT MESSAGE
                let finalMessage = rules.agent_message || "Hola, ¿sigues ahí?";

                if (mode === "smart") {
                    // Logic to generate a nudge based on context
                    finalMessage = `🚀 [Smart Nudge] ${finalMessage}`;
                }

                await whatsappBridge.sendTextMessage(
                    lead.telefono,
                    finalMessage,
                    {
                        accessToken: waConfig.accessToken,
                        phoneNumberId: waConfig.phoneNumberId
                    }
                );
            }

            // 7. Update tracking
            await (supabase.from("lead" as any) as any)
                .update({ 
                    last_interaction_at: now.toISOString(),
                    inactivity_sent_count: sentCount + 1,
                    metadata: { 
                        ...(lead.metadata || {}), 
                        last_rescue_at: now.toISOString(),
                        last_rescue_agent: agent.id
                    }
                })
                .eq("id", lead.id);

        } catch (err: any) {
            await GlobalLogger.error(lead.tenant_id, 'RESCUE', `Failed to process rescue: ${err.message}`, { leadId: lead.id, error: err });
        }
    }
}
