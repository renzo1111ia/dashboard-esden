import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { LeadWebhookSchema } from "@/lib/validations/lead";
import { orchestrator } from "@/lib/core/orchestrator";

/**
 * CRM WEBHOOK INGESTION ENDPOINT
 * Receives leads from CRMs and triggers the native Orchestrator.
 */

export async function POST(req: Request) {
    try {
        const tenantId = req.headers.get("x-tenant-id");

        if (!tenantId) {
            return NextResponse.json({ error: "Missing x-tenant-id header" }, { status: 400 });
        }

        const body = await req.json();
        const validatedData = LeadWebhookSchema.safeParse(body);

        if (!validatedData.success) {
            return NextResponse.json({ error: validatedData.error.format() }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();

        // 1. Upsert Lead (Unique by tenant + id_lead_externo)
        const { data: lead, error: leadError } = await (supabase
            .from("lead") as any)
            .upsert({
                ...validatedData.data,
                tenant_id: tenantId,
                fecha_actualizacion: new Date().toISOString()
            }, { onConflict: "tenant_id, id_lead_externo" })
            .select()
            .single();

        if (leadError || !lead) {
            console.error("[CRM WEBHOOK] Upsert error:", leadError);
            return NextResponse.json({ error: "Database error during lead ingestion" }, { status: 500 });
        }

        // 2. Trigger Orchestrator (In background)
        // In Next.js, we should use a proper background worker / queue for this 
        // For now, call it directly (should be handled by a queue in a real production environment)
        orchestrator.handleNewLead(lead.id, tenantId).catch(err => {
            console.error("[ORCHESTRATOR] Error processing background event:", err);
        });

        return NextResponse.json({ 
            success: true, 
            message: "Lead ingested and orchestration triggered",
            lead_id: lead.id 
        });

    } catch (e) {
        console.error("[CRM WEBHOOK] Internal error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
