import { getSupabaseServerClient, getAdminSupabaseClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "./feature-flags";
import { buildComplianceDecision } from "./compliance";
import { whatsappBridge, WhatsAppConfig } from "../integrations/whatsapp";
import { retellBridge, RetellConfig } from "../integrations/retell";
import { getAgentVariants } from "../actions/agents";
import { getOrchestratorConfigForTenant, TenantOrchestratorConfig, OrchestratorSequenceStep } from "../actions/orchestrator-config";
import { enqueueLeadStep, LeadSequenceJob } from "./queue/lead-sequence-queue";
import { logOrchestrationStep } from "./scheduler";
import { Lead, PlannedAction, AIAgentVariant, Programa, LeadPrograma } from "@/types/database";

/**
 * ORCHESTRATOR CORE v3.0
 * Enterprise-grade lead sequencer with:
 * - Timezone Compliance Guard
 * - BullMQ delayed execution
 * - A/B multi-agent testing with full logging
 * - Round Robin scheduling
 */
export class Orchestrator {
    private static instance: Orchestrator;

    public static getInstance(): Orchestrator {
        if (!Orchestrator.instance) {
            Orchestrator.instance = new Orchestrator();
        }
        return Orchestrator.instance;
    }

    // ─── MAIN ENTRY POINTS ─────────────────────────────────────────

    /**
     * Entry point for a new Lead.
     * Reads tenant config sequentially and applies compliance check first.
     */
    public async handleNewLead(leadId: string, tenantId: string) {
        const isNativeEnabled = await isFeatureEnabled(tenantId, "native_orchestrator");
        if (!isNativeEnabled) return;

        const supabase = await getSupabaseServerClient();
        const { data: lead, error } = await supabase
            .from("lead").select("*").eq("id", leadId).single();
        if (error || !lead) return;

        // Load tenant's orchestrator config
        const config = await getOrchestratorConfigForTenant(tenantId);
        const sequence = config.sequence;

        if (!sequence || sequence.length === 0) {
            console.warn(`[ORCHESTRATOR] No sequence configured for tenant ${tenantId}`);
            return;
        }

        // Execute first step (subsequent steps will be queued by BullMQ)
        await this.executeSequenceStep(lead as Lead, tenantId, sequence, 0, config);
    }

    /**
     * Executes a specific step from a sequence.
     * Called directly (step 1) or by BullMQ Worker (deferred steps).
     */
    public async executeSequenceStep(
        lead: Lead,
        tenantId: string,
        sequence: OrchestratorSequenceStep[],
        stepIndex: number,
        config: TenantOrchestratorConfig
    ) {
        if (stepIndex >= sequence.length) {
            console.log(`[ORCHESTRATOR] Sequence complete for lead ${lead.id}`);
            return;
        }

        const step = sequence[stepIndex];
        console.log(`[ORCHESTRATOR] Lead ${lead.id} → Step ${step.step}: ${step.action}`);

        // ── COMPLIANCE GUARD ──────────────────────────────────────
        const decision = buildComplianceDecision(
            lead.telefono,
            lead.pais,
            config.timezone_rules
        );

        if (!decision.canExecuteNow && step.action !== "wait") {
            console.log(`[ORCHESTRATOR] ${decision.reason}`);
            // Queue for next window
            await this.queueStep(lead, tenantId, step, stepIndex, config, decision.delayMs);

            await logOrchestrationStep({
                tenantId,
                leadId: lead.id,
                step: step.step,
                actionType: step.action.toUpperCase(),
                result: "QUEUED",
                metadata: { scheduledFor: decision.scheduledFor?.toISOString(), reason: decision.reason }
            });
            return;
        }

        // ── EXECUTE STEP ──────────────────────────────────────────
        try {
            switch (step.action) {
                case "call":
                    await this.executeCallStep(lead, tenantId, step, config);
                    break;
                case "whatsapp":
                    await this.executeWhatsAppStep(lead, tenantId, step);
                    break;
                case "ai_agent":
                    await this.executeAIAgentStep(lead, tenantId, step, config);
                    break;
                case "wait":
                    console.log(`[ORCHESTRATOR] Wait step, delay already applied.`);
                    break;
            }

            // ── QUEUE NEXT STEP ───────────────────────────────────
            const nextIndex = stepIndex + 1;
            if (nextIndex < sequence.length) {
                const nextStep = sequence[nextIndex];
                const delayMs = nextStep.delay_hours * 60 * 60 * 1000;
                await this.queueStep(lead, tenantId, nextStep, nextIndex, config, delayMs);
            }

        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[ORCHESTRATOR] Step error:`, errMsg);
            await logOrchestrationStep({
                tenantId, leadId: lead.id, step: step.step,
                actionType: step.action.toUpperCase(), result: "FAILED", errorMessage: errMsg
            });
        }
    }

    /**
     * Legacy workflow-based execution (for backwards compatibility with Constructor builder).
     */
    public async executeWorkflow(workflowId: string, lead: Lead, tenantId: string, context: Record<string, unknown>) {
        const supabase = await getSupabaseServerClient();
        const { data: rules } = await supabase
            .from("orchestration_rules").select("*")
            .eq("workflow_id", workflowId).eq("is_active", true)
            .order("sequence_order", { ascending: true });

        if (!rules || rules.length === 0) return;
        await this.executeRule(rules[0] as any, lead, tenantId, context);
    }

    // ─── STEP EXECUTORS ───────────────────────────────────────────

    private async executeCallStep(
        lead: Lead, tenantId: string,
        step: OrchestratorSequenceStep,
        config: TenantOrchestratorConfig
    ) {
        const retellConfig = config.retell;
        const fromNumber = retellConfig?.from_number;
        const apiKey = retellConfig?.api_key;

        // A/B Agent Selection
        const { agentId, variant } = this.selectAgent(step.agents || [], config.ab_testing);

        if (!apiKey || !agentId || !fromNumber) {
            console.error(`[ORCHESTRATOR] Retell config missing for tenant ${tenantId}`);
            return;
        }

        // Construct dynamic variables to send to Retell LLM context
        const courseContext = await this.getCourseContext(lead.id, tenantId);
        
        const dynamicVariables: Record<string, string> = {
            lead_name: lead.nombre || "Cliente",
            lead_phone: lead.telefono || "",
            company_name: config.company_name || "Esden",
            ...courseContext
        };

        await retellBridge.createCall(
            lead.telefono || "",
            agentId,
            fromNumber,
            { lead_id: lead.id, tenant_id: tenantId },
            dynamicVariables,
            { apiKey }
        );

        await logOrchestrationStep({
            tenantId, leadId: lead.id, step: step.step,
            actionType: "CALL", agentUsed: agentId,
            abVariant: variant, result: "SUCCESS"
        });
    }

    private async executeWhatsAppStep(lead: Lead, tenantId: string, step: OrchestratorSequenceStep) {
        const supabase = await getSupabaseServerClient();
        const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
        if (!tenant) return;

        const conf = (tenant as any).config;
        const waConfig: WhatsAppConfig = {
            accessToken: conf?.whatsapp?.accessToken,
            phoneNumberId: conf?.whatsapp?.phoneNumberId
        };
        if (!waConfig.accessToken || !waConfig.phoneNumberId) return;

        const template = step.template || "";
        await whatsappBridge.sendTemplateMessage(lead.telefono || "", template, "es", [], waConfig);

        await logOrchestrationStep({
            tenantId, leadId: lead.id, step: step.step,
            actionType: "WHATSAPP", result: "SUCCESS",
            metadata: { template }
        });
    }

    private async executeAIAgentStep(
        lead: Lead, tenantId: string,
        step: OrchestratorSequenceStep,
        config: TenantOrchestratorConfig
    ) {
        const agentIds = step.agents || [];
        const { agentId, variant } = this.selectAgent(agentIds, config.ab_testing);
        
        if (!agentId) {
            console.warn(`[ORCHESTRATOR] AI Agent step has no agents configured`);
            return;
        }

        // Fetch variants
        const { data: variants } = await getAgentVariants(agentId);
        if (!variants || variants.length === 0) return;

        const promptVariantData = variants[0] as AIAgentVariant;
        console.log(`[ORCHESTRATOR] AI Agent ${agentId} variant ${variant}: ${promptVariantData.version_label}`);

        // Fetch course context for AI Agent
        const courseContext = await this.getCourseContext(lead.id, tenantId);

        // Stub LLM execution with injected context
        const analysis = `Contexto del Curso: ${courseContext.course_info}. Requisitos: ${courseContext.qualification_rules}. Interés del Lead: Alta.`;

        await logOrchestrationStep({
            tenantId, leadId: lead.id, step: step.step,
            actionType: "AI_AGENT", agentUsed: agentId,
            abVariant: variant, result: "SUCCESS",
            metadata: { analysis, promptVersion: promptVariantData.version_label }
        });
    }

    /**
     * Helper to fetch course-specific information and qualification rules.
     * Maps to course_info and qualification_rules variables in the prompt.
     */
    private async getCourseContext(leadId: string, tenantId: string): Promise<Record<string, string>> {
        const supabase = await getSupabaseServerClient();
        
        // 1. Get the programs this lead is interested in
        const { data: leadPrograms } = await supabase
            .from("lead_programas")
            .select("id_programa")
            .eq("id_lead", leadId)
            .returns<LeadPrograma[]>();

        if (!leadPrograms || leadPrograms.length === 0) {
            return {
                course_info: "No hay información de curso específica disponible.",
                qualification_rules: "Criterios generales de cualificación."
            };
        }

        // 2. Get details for the first/primary program
        const { data: program } = await supabase
            .from("programas")
            .select("*")
            .eq("id", leadPrograms[0].id_programa)
            .single();

        if (!program) {
            return {
                course_info: "Programa no encontrado.",
                qualification_rules: ""
            };
        }

        const p = program as Programa;
        const details = [
            p.presentacion && `Presentación: ${p.presentacion}`,
            p.objetivos && `Objetivos: ${p.objetivos}`,
            p.precio && `Precio: ${p.precio}`,
            p.becas_financiacion && `Becas: ${p.becas_financiacion}`,
            p.metodologia && `Metodología: ${p.metodologia}`,
            p.beneficios && `Beneficios: ${p.beneficios}`,
            p.practicas && `Prácticas: ${p.practicas}`,
            p.fechas_inicio && `Fechas de inicio: ${p.fechas_inicio}`,
        ].filter(Boolean).join("\n");

        return {
            course_name: p.nombre,
            course_info: details || "Sin detalles específicos.",
            qualification_rules: p.requisitos_cualificacion || "Cualificación estándar basada en interés y disponibilidad."
        };
    }

    // ─── A/B AGENT SELECTOR ────────────────────────────────────────

    /**
     * Selects an agent from an array based on A/B split configuration.
     * Returns the selected agent ID and which variant was chosen.
     */
    private selectAgent(
        agents: string[],
        abConfig: TenantOrchestratorConfig["ab_testing"]
    ): { agentId: string | null; variant: "A" | "B" | undefined } {
        if (!agents || agents.length === 0) return { agentId: null, variant: undefined };
        if (agents.length === 1) return { agentId: agents[0], variant: "A" };

        if (abConfig.enabled && agents.length >= 2) {
            const roll = Math.random();
            const isVariantA = roll <= abConfig.split;
            return {
                agentId: isVariantA ? agents[0] : agents[1],
                variant: isVariantA ? "A" : "B",
            };
        }

        return { agentId: agents[0], variant: "A" };
    }

    // ─── QUEUE HELPERS ────────────────────────────────────────────

    private async queueStep(
        lead: Lead,
        tenantId: string,
        step: OrchestratorSequenceStep,
        stepIndex: number,
        config: TenantOrchestratorConfig,
        delayMs: number
    ) {
        const job: LeadSequenceJob = {
            leadId: lead.id,
            tenantId,
            workflowId: "sequence",
            step: stepIndex,
            action: step.action,
            template: step.template,
        };

        await enqueueLeadStep(job, delayMs);
        console.log(`[ORCHESTRATOR] Queued step ${step.step} for lead ${lead.id} in ${Math.round(delayMs / 1000 / 60)}min`);
    }

    // ─── LEGACY SUPPORT (Constructor Builder) ─────────────────────

    private async executeRule(rule: any, lead: Lead, tenantId: string, context: Record<string, unknown>) {
        const { action_type, config: conf, workflow_id } = rule;

        const supabase = await getSupabaseServerClient();
        const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
        const tenantConf = (tenant as any)?.config;

        switch (action_type) {
            case "CALL": {
                const retellConfig: RetellConfig = { apiKey: tenantConf?.retell?.apiKey };
                await retellBridge.createCall(
                    lead.telefono || "", 
                    conf?.agentId, 
                    tenantConf?.retell?.fromNumber,
                    { lead_id: lead.id }, 
                    {}, // empty dynamic variables for legacy
                    retellConfig
                );
                break;
            }
            case "WHATSAPP": {
                const waConfig: WhatsAppConfig = {
                    accessToken: tenantConf?.whatsapp?.accessToken,
                    phoneNumberId: tenantConf?.whatsapp?.phoneNumberId
                };
                await whatsappBridge.sendTemplateMessage(lead.telefono || "", conf?.templateId || "", "es", [], waConfig);
                break;
            }
            case "AI_AGENT": {
                const { data: variants } = await getAgentVariants(conf?.agentId);
                if (variants && variants.length > 0) {
                    const v = variants[0] as AIAgentVariant;
                    console.log(`[ORCHESTRATOR] AI Agent ${conf?.agentId}: ${v.version_label}`);
                }
                break;
            }
            default:
                console.warn(`[ORCHESTRATOR] Unknown rule action: ${action_type}`);
        }

        // Continue chain
        const { data: nextRule } = await supabase
            .from("orchestration_rules").select("*")
            .eq("workflow_id", workflow_id).eq("is_active", true)
            .eq("sequence_order", (rule.sequence_order || 1) + 1).single();

        if (nextRule) await this.executeRule(nextRule, lead, tenantId, context);
    }

    // Kept for backward compat with sweep API
    public async executePlannedAction(action: PlannedAction) {
        const lead = (action as any).lead as Lead;
        if (!lead) return;

        const config = await getOrchestratorConfigForTenant(action.tenant_id);
        const step: OrchestratorSequenceStep = {
            step: 1,
            action: action.action_type.toLowerCase() as any,
            agents: [(action.config as any)?.agentId].filter(Boolean),
            template: (action.config as any)?.templateId,
            delay_hours: 0,
        };

        await this.executeSequenceStep(lead, action.tenant_id, [step], 0, config);
    }
}

export const orchestrator = Orchestrator.getInstance();
