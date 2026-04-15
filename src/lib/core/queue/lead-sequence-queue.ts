import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

/**
 * LEAD SEQUENCE QUEUE (BullMQ + Upstash Redis)
 * 
 * Handles delayed execution of orchestration steps.
 * Uses ioredis directly (BullMQ's native client) with:
 *   - TLS support for Upstash (rediss://)
 *   - maxRetriesPerRequest: null (REQUIRED by BullMQ for blocking commands)
 */

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Build ioredis connection — supports local redis:// and Upstash rediss://
function createRedisConnection(): IORedis {
    const isTLS = REDIS_URL.startsWith("rediss://");
    
    try {
        const url = new URL(REDIS_URL);
        return new IORedis({
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password ? decodeURIComponent(url.password) : undefined,
            username: url.username ? decodeURIComponent(url.username) : undefined,
            // Required for BullMQ — allows blocking commands
            maxRetriesPerRequest: null,
            // TLS required for Upstash
            ...(isTLS && { tls: {} }),
            enableReadyCheck: false,
        });
    } catch {
        // Fallback to local Redis
        return new IORedis({
            host: "localhost",
            port: 6379,
            maxRetriesPerRequest: null,
        });
    }
}

export const connection = createRedisConnection();

// ─── Queue Definition ──────────────────────────────────────────────

export const LEAD_QUEUE_NAME = "lead_sequence_queue";

export interface LeadSequenceJob {
    leadId: string;
    tenantId: string;
    workflowId?: string;
    step?: number;       // Which step in the sequence to execute
    action: "call" | "whatsapp" | "ai_agent" | "zoho" | "ZOHO_POLLING" | "QUALIFY_ANALYSIS" | "WATCHDOG_SCAN"; 
    agentId?: string;   // Pre-selected agent
    template?: string;  // WhatsApp template
    abVariant?: "A" | "B";
    transcript?: string; // For analysis jobs
    callId?: string;     // For analysis jobs
}

/**
 * The BullMQ Queue instance.
 * Add jobs here with optional `delay` (ms) for deferred execution.
 */
let leadQueue: Queue<LeadSequenceJob> | null = null;

export function getLeadQueue(): Queue<LeadSequenceJob> {
    if (!leadQueue) {
        leadQueue = new Queue<LeadSequenceJob>(LEAD_QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
                removeOnComplete: { count: 1000 },
                removeOnFail: { count: 500 },
            },
        });
    }
    return leadQueue;
}

/**
 * Enqueues a lead sequence step with optional delay.
 * @param data - Job payload
 * @param delayMs - Milliseconds to wait before processing (0 = immediate)
 */
export async function enqueueLeadStep(
    data: LeadSequenceJob,
    delayMs = 0
): Promise<string> {
    const queue = getLeadQueue();
    const jobName = `lead:${data.leadId}:step:${data.step}`;
    
    const job = await queue.add(jobName, data, {
        delay: delayMs,
        jobId: jobName, // Idempotent — prevents double-queueing
    });

    console.log(`[QUEUE] Enqueued ${jobName} with delay ${Math.round(delayMs / 1000 / 60)}min`);
    return job.id || jobName;
}

/**
 * Special enqueuer for deep qualification analysis jobs.
 */
export async function enqueueQualificationAnalysis(data: {
    leadId: string;
    tenantId: string;
    transcript: string;
    callId: string;
}) {
    const queue = getLeadQueue();
    await queue.add(`qual:${data.leadId}:${data.callId}`, {
        ...data,
        action: "QUALIFY_ANALYSIS"
    });
}

/**
 * Special enqueuer for recurring watchdog scans.
 * (Should be called once at initialization)
 */
export async function setupWatchdogCron() {
    const queue = getLeadQueue();
    await queue.add("watchdog_scan", { 
        action: "WATCHDOG_SCAN", 
        leadId: "system", 
        tenantId: "system" 
    }, {
        repeat: { 
            pattern: "*/15 * * * *" // Every 15 minutes
        },
        jobId: "watchdog_cron"
    });
}

/**
 * Special enqueuer for recurring Zoho CRM polling.
 */
export async function setupZohoCron() {
    const queue = getLeadQueue();
    await queue.add("zoho_polling", { 
        action: "ZOHO_POLLING", 
        leadId: "system", 
        tenantId: "system" 
    }, {
        repeat: { 
            pattern: "*/10 * * * *" // Every 10 minutes (matching n8n)
        },
        jobId: "zoho_cron"
    });
}

/**
 * Creates the BullMQ Worker that processes lead sequence jobs.
 * This should be called once at server startup (in worker.ts or route.ts).
 */
export function createLeadWorker(
    processor: (job: Job<LeadSequenceJob>) => Promise<void>
): Worker<LeadSequenceJob> {
    const worker = new Worker<LeadSequenceJob>(
        LEAD_QUEUE_NAME,
        processor,
        {
            connection,
            concurrency: 5, // Process up to 5 leads simultaneously
        }
    );

    worker.on("completed", (job) => {
        console.log(`[WORKER] ✅ Job ${job.id} completed: ${job.data.leadId} step ${job.data.step}`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[WORKER] ❌ Job ${job?.id} failed:`, err.message);
    });

    return worker;
}
