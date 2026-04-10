import Redis from "ioredis";

/**
 * SWEEP QUEUE SERVICE
 * Handles delayed leads and batch processing.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export class SweepQueue {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null,
        });
    }

    /**
     * Enqueues a lead for a specific action at a specific time.
     * Uses a Redis Sorted Set (ZSET) where score = timestamp.
     */
    public async enqueue(
        leadId: string,
        tenantId: string,
        actionType: "CALL" | "WHATSAPP",
        scheduledAt: Date
    ) {
        const payload = JSON.stringify({ leadId, tenantId, actionType });
        const score = scheduledAt.getTime();

        await this.redis.zadd("sweep_queue:pending", score, payload);
        console.log(`[SWEEP QUEUE] Lead ${leadId} queued for ${actionType} at ${scheduledAt.toISOString()}`);
    }

    /**
     * "Sweeps" the queue for actions that are ready to be executed.
     */
    public async sweep() {
        const now = Date.now();
        
        // Get all items with score <= now
        const items = await this.redis.zrangebyscore("sweep_queue:pending", "-inf", now);

        if (items.length === 0) return;

        console.log(`[SWEEP QUEUE] Found ${items.length} ready actions. Processing...`);

        for (const item of items) {
            try {
                const { leadId, tenantId, actionType } = JSON.parse(item);
                
                // Trigger Orchestrator (logic to be implemented in a worker or interval)
                // orchestrator.handleDelayedAction(leadId, tenantId, actionType);
                
                // Remove from queue after processing
                await this.redis.zrem("sweep_queue:pending", item);
            } catch (err) {
                console.error("[SWEEP QUEUE] Error processing item:", err);
            }
        }
    }
}

export const sweepQueue = new SweepQueue();
