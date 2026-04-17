"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";
import { AIAgent, AIAgentVariant } from "@/types/database";

/**
 * Fetches all AI Agents for the active tenant.
 */
export async function getAIAgents() {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await getActiveTenantId();
    
    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    const { data, error } = await (supabase
        .from("ai_agents" as any) as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgent[] };
}

/**
 * Fetches all variants for a specific agent.
 * Note: Variants are linked via agent_id; RLS should handle tenant isolation.
 */
export async function getAgentVariants(agentId: string) {
    const supabase = await getAdminSupabaseClient();
    const { data, error } = await (supabase
        .from("ai_agent_variants" as any) as any)
        .select("*")
        .eq("agent_id", agentId)
        .order("version_label", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgentVariant[] };
}

/**
 * Saves a new or existing agent.
 * Ensures the mandatory tenant_id is injected for proper data isolation.
 */
export async function saveAIAgent(agent: Partial<AIAgent>) {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await getActiveTenantId();

    if (!tenantId) return { success: false, error: "No hay una sesión de cliente activa." };

    const agentData = {
        ...agent,
        tenant_id: tenantId
    };

    const { data, error } = await (supabase
        .from("ai_agents" as any) as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(agentData as any)
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgent };
}

/**
 * Saves a prompt variant.
 */
export async function saveAgentVariant(variant: Partial<AIAgentVariant>) {
    const supabase = await getAdminSupabaseClient();
    const { data, error } = await (supabase
        .from("ai_agent_variants" as any) as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(variant as any, { 
            onConflict: 'agent_id,is_variant_b',
            ignoreDuplicates: false 
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgentVariant };
}
