import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const publishSchema = z.object({
    tenantId: z.string().uuid(),
    workflowId: z.string().uuid(),
    graphData: z.object({
        nodes: z.array(z.unknown()),
        edges: z.array(z.unknown()),
        viewport: z.unknown().optional()
    })
});

/**
 * API: PUBLISH ORCHESTRATION SEQUENCE (v2.0 - Workflow Aware)
 * Saves the visual graph and flattens it for the execution engine within a specific workflow.
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tenantId, workflowId, graphData } = publishSchema.parse(body);

        const supabase = await getAdminSupabaseClient();

        // 1. Save the visual graph state for this specific workflow
        const { error: graphError } = await (supabase
            .from("orchestration_graphs" as any) as any)
            .upsert({
                tenant_id: tenantId,
                workflow_id: workflowId,
                graph_data: graphData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'workflow_id' });

        if (graphError) throw graphError;

        // 2. Flatten the graph into execution rules
        const executionSteps = flattenGraph(graphData.nodes as any, graphData.edges as any);

        // 3. Clear existing rules for THIS workflow and insert new ones
        await supabase
            .from("orchestration_rules")
            .delete()
            .eq("workflow_id", workflowId);

        if (executionSteps.length > 0) {
        const { data: rules, error: rulesError } = await (supabase
                .from("orchestration_rules" as any) as any)
                .insert(executionSteps.map((step, index) => ({
                    tenant_id: tenantId,
                    workflow_id: workflowId,
                    step_name: step.label,
                    action_type: step.type,
                    sequence_order: step.sequence_order || index,
                    config: step.config,
                    trigger_node_id: step.triggerNodeId,
                    is_active: true
                })));
            
            if (rulesError) throw rulesError;
        }

        return NextResponse.json({ success: true, stepsCount: executionSteps.length });

    } catch (error: unknown) {
        const err = error as { message: string; stack?: string };
        console.error("CRITICAL PUBLISH API ERROR:", err.message, err.stack);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * HELPER: FLATTEN GRAPH (v3.0 - Multi-Trigger aware)
 */
function flattenGraph(nodes: { id: string; type?: string; data?: Record<string, unknown> }[], edges: { source: string; target: string }[]) {
    const triggerNodes = nodes.filter(n => ['leadTrigger', 'webhookTrigger'].includes(n.type || ''));
    if (triggerNodes.length === 0) return [];

    const allSteps: { label: string; type: string; config: Record<string, unknown>; triggerNodeId: string; sequence_order: number }[] = [];

    triggerNodes.forEach(trigger => {
        let currentNode = trigger;
        let order = 0;
        
        // Track visited nodes per trigger path to avoid infinite loops
        const visited = new Set<string>();
        visited.add(trigger.id);

        while (true) {
            const edge = edges.find(e => e.source === currentNode.id);
            if (!edge) break;

            const nextNode = nodes.find(n => n.id === edge.target);
            if (!nextNode || visited.has(nextNode.id)) break;
            
            visited.add(nextNode.id);

            if (['action', 'delay', 'api', 'subWorkflow', 'llm', 'webhook'].includes(nextNode.type || '')) {
                let actionType = nextNode.type?.toUpperCase() || 'UNKNOWN';
                if (nextNode.type === 'action') {
                    actionType = (nextNode.data?.action as string)?.toUpperCase() || 'UNKNOWN';
                } else if (nextNode.type === 'delay') {
                    actionType = 'WAIT';
                }

                allSteps.push({
                    label: (nextNode.data?.label as string) || nextNode.type || 'Unnamed',
                    type: actionType,
                    config: (nextNode.data?.config as Record<string, unknown>) || {},
                    triggerNodeId: trigger.id,
                    sequence_order: order++
                });
            }

            currentNode = nextNode;
            if (order > 50) break; 
        }
    });

    return allSteps;
}
