/**
 * STANDALONE BULLMQ WORKER
 * Run with: node worker.js
 * This process stays alive and picks up queued lead sequence jobs from Redis.
 */

// Use ESM-compatible imports at the top level
import { createLeadWorker } from "./src/lib/core/queue/lead-sequence-queue.js";
import { orchestrator } from "./src/lib/core/orchestrator.js";
import { getSupabaseServerClient } from "./src/lib/supabase/server.js";

console.log("[WORKER] 🚀 ESDEN Lead Sequence Worker starting...");
console.log(`[WORKER] Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`);

const worker = createLeadWorker(async (job) => {
    const { leadId, tenantId, workflowId, step, action } = job.data;
    
    console.log(`[WORKER] Processing job ${job.id}: Lead ${leadId} step ${step} (${action})`);

    // Fetch the lead from the database
    const supabase = await getSupabaseServerClient();
    const { data: lead, error } = await supabase
        .from("lead")
        .select("*")
        .eq("id", leadId)
        .single();

    if (error || !lead) {
        throw new Error(`Lead ${leadId} not found: ${error?.message}`);
    }

    // Load tenant config
    const { getOrchestratorConfigForTenant } = await import("./src/lib/actions/orchestrator-config.js");
    const config = await getOrchestratorConfigForTenant(tenantId);
    const sequence = config.sequence;

    // Execute the specific step
    await orchestrator.executeSequenceStep(lead as any, tenantId, sequence, step, config);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("[WORKER] SIGTERM received. Closing gracefully...");
    await worker.close();
    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("[WORKER] SIGINT received. Closing gracefully...");
    await worker.close();
    process.exit(0);
});
