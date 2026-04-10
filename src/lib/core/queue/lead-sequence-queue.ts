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
    workflowId: string;
    step: number;       // Which step in the sequence to execute
    action: string;     // "call" | "whatsapp" | "ai_agent"
    agentId?: string;   // Pre-selected agent (after A/B decision)
    template?: string;  // WhatsApp template
    abVariant?: "A" | "B";
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
