import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_SERVICE_ROLE_KEY } from "@/lib/auth-config";
import { Orchestrator } from "@/lib/core/orchestrator";
import { Database } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * ORCHESTRATION SWEEP
 * This endpoint should be called by a CRON job every 1-5 minutes.
 * It executes actions that are due in the planned_actions table.
 */
export async function GET() {
    const supabase = createClient<Database>(AUTH_SUPABASE_URL!, AUTH_SUPABASE_SERVICE_ROLE_KEY!);
    const orchestrator = new Orchestrator();

    try {
        console.log("[SWEEP] Starting orchestration sweep...");

        // 1. Get pending actions that are due
        const now = new Date().toISOString();
        const { data: actions, error: fetchError } = await supabase
            .from("planned_actions")
            .select("*, lead(*), workflows(*)")
            .eq("status", "PENDING")
            .lte("scheduled_for", now)
            .limit(50);

        if (fetchError) throw fetchError;
        if (!actions || actions.length === 0) {
            return NextResponse.json({ success: true, processed: 0, message: "No actions due." });
        }

        console.log(`[SWEEP] Found ${actions.length} actions to process.`);
        const results = [];

        for (const action of actions) {
            try {
                console.log(`[SWEEP] Processing action ${action.id} (${action.action_type}) for lead ${action.lead_id}`);
                
                // 2. Execute the action
                // Note: In a more advanced version, we would pass saved context
                await orchestrator.executePlannedAction(action);

                // 3. Mark as executed
                await supabase
                    .from("planned_actions")
                    .update({ status: "EXECUTED", updated_at: new Date().toISOString() })
                    .eq("id", action.id);
                
                results.push({ id: action.id, status: "SUCCESS" });
            } catch (err: any) {
                console.error(`[SWEEP] Failed to process action ${action.id}:`, err.message);
                
                // 4. Mark as failed
                await supabase
                    .from("planned_actions")
                    .update({ 
                        status: "FAILED", 
                        error_message: err.message,
                        updated_at: new Date().toISOString() 
                    })
                    .eq("id", action.id);

                results.push({ id: action.id, status: "FAILED", error: err.message });
            }
        }

        return NextResponse.json({ 
            success: true, 
            processed: actions.length, 
            results 
        });

    } catch (error: any) {
        console.error("[SWEEP] Critical error during sweep:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
