"use server";

import { createClient } from "@supabase/supabase-js";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_SERVICE_ROLE_KEY } from "@/lib/auth-config";
import { Database, AIAgent, AIAgentVariant } from "@/types/database";
import { cookies } from "next/headers";

/**
 * Gets a Supabase client with tenant context from cookies.
 */
async function getTenantClient() {
    const cookieStore = await cookies();
    const url = cookieStore.get("esden-tenant-url")?.value || AUTH_SUPABASE_URL!;
    const key = cookieStore.get("esden-tenant-key")?.value || AUTH_SUPABASE_SERVICE_ROLE_KEY!;
    return createClient<Database>(url, key);
}

/**
 * Fetches all AI Agents for the active tenant.
 */
export async function getAIAgents() {
    const supabase = await getTenantClient();
    const { data, error } = await (supabase
        .from("ai_agents" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgent[] };
}

/**
 * Fetches all variants for a specific agent.
 */
export async function getAgentVariants(agentId: string) {
    const supabase = await getTenantClient();
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
 */
export async function saveAIAgent(agent: Partial<AIAgent>) {
    const supabase = await getTenantClient();
    const { data, error } = await (supabase
        .from("ai_agents" as any) as any)
        .upsert(agent as any) // Supabase UPSERT type helper can be picky
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgent };
}

/**
 * Saves a prompt variant.
 */
export async function saveAgentVariant(variant: Partial<AIAgentVariant>) {
    const supabase = await getTenantClient();
    const { data, error } = await (supabase
        .from("ai_agent_variants" as any) as any)
        .upsert(variant as any)
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AIAgentVariant };
}
