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
        const { error: graphError } = await supabase
            .from("orchestration_graphs")
            .upsert({
                tenant_id: tenantId,
                workflow_id: workflowId,
                graph_data: graphData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'workflow_id' });

        if (graphError) throw graphError;

        // 2. Flatten the graph into execution rules
        const executionSteps = flattenGraph(graphData.nodes, graphData.edges);

        // 3. Clear existing rules for THIS workflow and insert new ones
        await supabase
            .from("orchestration_rules")
            .delete()
            .eq("workflow_id", workflowId);

        if (executionSteps.length > 0) {
            const { error: rulesError } = await supabase
                .from("orchestration_rules")
                .insert(executionSteps.map((step, index) => ({
                    tenant_id: tenantId,
                    workflow_id: workflowId,
                    step_name: step.label,
                    action_type: step.type,
                    sequence_order: index,
                    config: step.config,
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
 * HELPER: FLATTEN GRAPH (Unchanged - works on a per-graph basis)
 */
function flattenGraph(nodes: { id: string; type?: string; data?: Record<string, unknown> }[], edges: { source: string; target: string }[]) {
    const triggerNode = nodes.find(n => n.type === 'leadTrigger');
    if (!triggerNode) return [];

    const steps: { label: string; type: string; config: Record<string, unknown> }[] = [];
    let currentNode = triggerNode;

    while (true) {
        const edge = edges.find(e => e.source === currentNode.id);
        if (!edge) break;

        const nextNode = nodes.find(n => n.id === edge.target);
        if (!nextNode) break;

        if (['action', 'delay', 'api', 'subWorkflow', 'llm'].includes(nextNode.type || '')) {
            let actionType = nextNode.type?.toUpperCase() || 'UNKNOWN';
            if (nextNode.type === 'action') {
                actionType = (nextNode.data?.action as string)?.toUpperCase() || 'UNKNOWN';
            } else if (nextNode.type === 'delay') {
                actionType = 'WAIT';
            }

            steps.push({
                label: (nextNode.data?.label as string) || nextNode.type || 'Unnamed',
                type: actionType,
                config: (nextNode.data?.config as Record<string, unknown>) || {}
            });
        }

        currentNode = nextNode;
        if (steps.length > 50) break; 
    }

    return steps;
}
