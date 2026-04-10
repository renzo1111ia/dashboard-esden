"use server";

import { getActiveTenantConfig } from "./tenant";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { whatsappBridge, WhatsAppConfig } from "../integrations/whatsapp";
import { orchestrator } from "@/lib/core/orchestrator";

/**
 * Fetches WhatsApp templates for the currently active tenant
 */
export async function getWhatsAppTemplates() {
    try {
        const tenant = await getActiveTenantConfig();
        if (!tenant) throw new Error("No active tenant selected.");

        const config = tenant.config as any;
        const waConfig: WhatsAppConfig = {
            accessToken: config?.whatsapp?.accessToken,
            phoneNumberId: config?.whatsapp?.phoneNumberId,
            wabaId: config?.whatsapp?.wabaId
        };

        if (!waConfig.accessToken || !waConfig.wabaId) {
            return { error: "Configuración de WhatsApp incompleta (Access Token o WABA ID faltante)." };
        }

        const templates = await whatsappBridge.getAvailableTemplates(waConfig);
        return { success: true, data: templates };
    } catch (error: any) {
        console.error("[ACTIONS] Error fetching WhatsApp templates:", error.message);
        return { error: error.message };
    }
}

/**
 * Returns recent leads for the active tenant (for the playground)
 */
export async function getRecentLeads(limit = 20) {
    try {
        const supabase = await getSupabaseServerClient();
        const tenant = await getActiveTenantConfig();
        if (!tenant) return { error: "No active tenant" };

        const { data, error } = await (supabase
            .from("lead" as any) as any)
            .select("id, nombre, apellido, telefono, origen, fecha_creacion")
            .eq("tenant_id", tenant.id)
            .order("fecha_creacion", { ascending: false })
            .limit(limit);

        if (error) return { error: error.message };
        return { success: true, data };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Returns all workflows for the active tenant
 */
export async function getTenantWorkflows() {
    try {
        const supabase = await getSupabaseServerClient();
        const tenant = await getActiveTenantConfig();
        if (!tenant) return { error: "No active tenant" };

        const { data, error } = await (supabase
            .from("workflows" as any) as any)
            .select("id, name, is_primary, is_active")
            .eq("tenant_id", tenant.id)
            .order("created_at", { ascending: false });

        if (error) return { error: error.message };
        return { success: true, data };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Gets the rules for a workflow (to preview the steps)
 */
export async function getWorkflowRules(workflowId: string) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await (supabase
            .from("orchestration_rules" as any) as any)
            .select("*")
            .eq("workflow_id", workflowId)
            .eq("is_active", true)
            .order("sequence_order", { ascending: true });

        if (error) return { error: error.message };
        return { success: true, data };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Triggers the orchestrator for a specific lead + workflow
 */
export async function triggerOrchestratorForLead(leadId: string, workflowId: string) {
    try {
        const supabase = await getSupabaseServerClient();
        const tenant = await getActiveTenantConfig();
        if (!tenant) return { error: "No active tenant" };

        // Fetch lead
        const { data: lead, error: leadError } = await (supabase
            .from("lead" as any) as any)
            .select("*")
            .eq("id", leadId)
            .single();

        if (leadError || !lead) return { error: "Lead no encontrado: " + leadError?.message };

        const logs: string[] = [];
        const originalLog = console.log;

        // Capture logs
        console.log = (...args) => {
            const line = args.map(String).join(" ");
            if (line.includes("[ORCHESTRATOR]")) logs.push(line);
            originalLog(...args);
        };

        await orchestrator.executeWorkflow(workflowId, lead as any, tenant.id, {});

        console.log = originalLog;

        return { success: true, logs, leadId, workflowId };
    } catch (e: any) {
        return { error: e.message };
    }
}
