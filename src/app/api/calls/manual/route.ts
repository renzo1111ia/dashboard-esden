import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { retellBridge, RetellConfig } from "@/lib/integrations/retell";
import { z } from "zod";

const callSchema = z.object({
    phoneNumber: z.string().min(8),
    agentId: z.string().optional(),
    tenantId: z.string().uuid()
});

/**
 * API: MANUAL CALL TRIGGER
 * Initiates an outbound Retell AI call.
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phoneNumber, agentId, tenantId } = callSchema.parse(body);

        const supabase = await getSupabaseServerClient();

        // 1. Fetch Tenant Config (API Keys)
        const { data: tenant, error: tenantError } = await (supabase
            .from("tenants") as any)
            .select("*")
            .eq("id", tenantId)
            .single();

        if (tenantError || !tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        const config = tenant.config as any;
        const retellConfig: RetellConfig = { apiKey: config?.retell?.apiKey };
        const targetAgentId = agentId || config?.retell?.qualifyAgentId;
        const fromNumber = config?.retell?.fromNumber;

        if (!retellConfig.apiKey || !targetAgentId || !fromNumber) {
            return NextResponse.json({ error: "Retell configuration incomplete for this tenant" }, { status: 400 });
        }

        // 2. Trigger Call via Bridge
        const callData = await retellBridge.createCall(
            phoneNumber,
            targetAgentId,
            fromNumber,
            { source: "manual_dialer", tenant_id: tenantId },
            {}, // No dynamic variables for manual call
            retellConfig
        );

        // 3. Log attempt (Optional but recommended)
        // await supabase.from('intentos_llamadas').insert({...});

        return NextResponse.json({ success: true, callId: callData.call_id });

    } catch (error: any) {
        console.error("[API_MANUAL_CALL] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
