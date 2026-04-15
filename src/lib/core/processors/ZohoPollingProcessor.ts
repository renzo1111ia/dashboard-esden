import { zohoClient } from "../../integrations/zoho";
import { getSupabaseServerClient } from "../../supabase/server";
import { orchestrator } from "../../core/orchestrator";
import { getOrchestratorConfigForTenant } from "../../actions/orchestrator-config";

/**
 * ZOHO POLLING PROCESSOR
 * Periodically checks Zoho CRM for new leads that match the criteria.
 * Replicates the "Busca leads Nuevos de meta" logic from n8n.
 */
export class ZohoPollingProcessor {
    async run() {
        console.log("[ZOHO_POLLER] Starting polling cycle...");
        const supabase = await getSupabaseServerClient();

        // 1. Get all active tenants with Zoho configuration
        // For now, we fetch all tenants and check their config
        const { data: tenants } = await supabase.from("tenants").select("*");
        if (!tenants) return;

        for (const tenant of tenants) {
            try {
                // Check if tenant has Zoho enabled in their config
                // In a real scenario, we'd filter this in the query
                const config = (tenant as any).config;
                if (!config?.zoho?.enabled) continue;

                console.log(`[ZOHO_POLLER] Polling for tenant: ${tenant.name} (${tenant.id})`);

                // 2. Search for "Nuevo" Meta leads without "VirginIA" tag
                // Criteria matching n8n logic
                const criteria = "(Lead_Status:equals:Nuevo) and (Lead_Source:equals:Meta) and (Tag:not_contains:VirginIA)";
                const externalLeads = await zohoClient.searchLeads(criteria);

                if (externalLeads.length === 0) {
                    console.log(`[ZOHO_POLLER] No new leads found for ${tenant.name}.`);
                    continue;
                }

                console.log(`[ZOHO_POLLER] Found ${externalLeads.length} new leads. Processing...`);

                // Load tenant orchestrator config
                const orchConfig = await getOrchestratorConfigForTenant(tenant.id);

                for (const extLead of externalLeads) {
                    try {
                        // 3. Upsert into our local "lead" table
                        const { data: lead, error: upsertError } = await supabase
                            .from("lead")
                            .upsert({
                                tenant_id: tenant.id,
                                id_lead_externo: extLead.id,
                                nombre: extLead.First_Name || "Lead",
                                apellido: extLead.Last_Name || "Zoho",
                                telefono: extLead.Phone || "",
                                email: extLead.Email || "",
                                pais: extLead.Country || "España",
                                origen: extLead.Lead_Source || "Zoho",
                                tipo_lead: "nuevo",
                                fecha_ingreso_crm: new Date().toISOString()
                            }, { onConflict: "tenant_id, id_lead_externo" })
                            .select()
                            .single();

                        if (upsertError || !lead) {
                            console.error(`[ZOHO_POLLER] Failed to upsert lead ${extLead.id}:`, upsertError);
                            continue;
                        }

                        // 4. Trigger the native Orchestrator
                        // This starts the sequence (Call, Update, Tag, etc)
                        await orchestrator.handleNewLead(lead.id, tenant.id);

                    } catch (innerErr) {
                        console.error(`[ZOHO_POLLER] Error processing lead ${extLead.id}:`, innerErr);
                    }
                }

            } catch (err) {
                console.error(`[ZOHO_POLLER] Error polling for tenant ${tenant.id}:`, err);
            }
        }
    }
}

export const zohoPollingProcessor = new ZohoPollingProcessor();
