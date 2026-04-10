/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { VoiceAgent, VoiceAgentVariant } from "@/types/database";

const supabase = getSupabaseClient();

/**
 * Los agentes de voz tienen su aislamiento garantizado por el tenant_id.
 * Este módulo gestiona CRUD de agentes y sus variantes A/B.
 */

export async function getVoiceAgents() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        const { data, error } = await supabase
            .from('voice_agents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data as VoiceAgent[] };
    } catch (error: any) {
        console.error("Error getVoiceAgents:", error);
        return { success: false, error: error.message };
    }
}

export async function getVoiceAgentVariants(agentId: string) {
    try {
        const { data, error } = await supabase
            .from('voice_agent_variants')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as VoiceAgentVariant[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveVoiceAgent(agent: Partial<VoiceAgent>) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        // Obtenemos el tenant activo del usuario para inyectarlo
        const { data: userData } = await supabase
            .from('tenants')
            .select('id')
            .eq('id', user.id) // En este esquema user.id suele ser el tenant_id admin
            .single();

        const tenantId = userData?.id || user.id;

        if (agent.id) {
            const { data, error } = await supabase
                .from('voice_agents')
                .update({ ...agent, updated_at: new Date().toISOString() })
                .eq('id', agent.id)
                .select()
                .single();
            if (error) throw error;
            return { success: true, data: data as VoiceAgent };
        } else {
            const { data, error } = await supabase
                .from('voice_agents')
                .insert([{ ...agent, tenant_id: tenantId }])
                .select()
                .single();
            if (error) throw error;
            
            // Crear variantes iniciales por defecto A y B
            await supabase.from('voice_agent_variants').insert([
                { agent_id: data.id, is_variant_b: false, version_label: 'v1.0', prompt_text: 'Instrucciones iniciales...', weight: 0.5 },
                { agent_id: data.id, is_variant_b: true, version_label: 'v1.0', prompt_text: 'Instrucciones iniciales...', weight: 0.5 }
            ]);

            return { success: true, data: data as VoiceAgent };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveVoiceVariant(variant: Partial<VoiceAgentVariant>) {
    try {
        if (variant.id) {
            const { error } = await supabase
                .from('voice_agent_variants')
                .update({ ...variant, updated_at: new Date().toISOString() })
                .eq('id', variant.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('voice_agent_variants')
                .insert([variant]);
            if (error) throw error;
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
