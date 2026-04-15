import { getSupabaseServerClient } from "../../supabase/server";
import { orchestrator } from "../../core/orchestrator";
import { getOrchestratorConfigForTenant } from "../../actions/orchestrator-config";
import { CRMFactory } from "../../integrations/crm/factory";

/**
 * CRM POLLING PROCESSOR
 * Periodically checks the configured CRM for new leads.
 */
export class CRMPollingProcessor {
    async run() {
        console.log("[CRM_POLLER] Starting polling cycle...");
        const supabase = await getSupabaseServerClient();

        // 1. Get all active tenants
        const { data: tenants } = await supabase.from("tenants").select("*");
        if (!tenants) return;

        for (const tenant of tenants) {
            try {
                const config = (tenant as any).config;
                if (!config?.crm?.enabled) continue;

                const provider = CRMFactory.getProvider(tenant.id, config);
                console.log(`[CRM_POLLER] Polling ${config.crm.provider} for tenant: ${tenant.name}`);

                // 2. Search for new leads
                // Default Zoho criteria for now (can be made configurable in tenant settings)
                const criteria = config.crm.search_criteria || "(Lead_Status:equals:Nuevo) and (Lead_Source:equals:Meta) and (Tag:not_contains:VirginIA)";
                const externalLeads = await provider.searchLeads(criteria);

                if (externalLeads.length === 0) {
                    continue;
                }

                console.log(`[CRM_POLLER] Found ${externalLeads.length} leads for ${tenant.name}`);

                for (const crmLead of externalLeads) {
                    try {
                        const { fields } = crmLead;

                        // 3. Upsert into local DB using generic fields from the provider
                        const { data: lead, error: upsertError } = await supabase
                            .from("lead")
                            .upsert({
                                tenant_id: tenant.id,
                                id_lead_externo: crmLead.id,
                                nombre: fields.nombre || "Lead",
                                apellido: fields.apellido || "",
                                telefono: fields.telefono || "",
                                email: fields.email || "",
                                pais: fields.pais || "España",
                                origen: fields.source || "CRM",
                                tipo_lead: "nuevo",
                                fecha_ingreso_crm: new Date().toISOString()
                            }, { onConflict: "tenant_id, id_lead_externo" })
                            .select()
                            .single();

                        if (upsertError || !lead) {
                            console.error(`[CRM_POLLER] Upsert error:`, upsertError);
                            continue;
                        }

                        // 4. Trigger Orchestrator
                        await orchestrator.handleNewLead(lead.id, tenant.id);

                    } catch (innerErr) {
                        console.error(`[CRM_POLLER] Lead error ${crmLead.id}:`, innerErr);
                    }
                }

            } catch (err) {
                console.error(`[CRM_POLLER] Tenant error ${tenant.id}:`, err);
            }
        }
    }
}

export const crmPollingProcessor = new CRMPollingProcessor();
