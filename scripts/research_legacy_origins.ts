import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function research() {
    console.log("🔍 RESEARCHING LEGACY ORIGINS AND CAMPAIGNS...");

    const defaultTenantId = "00000000-0000-0000-0000-000000000000";

    // 1. Get unique Origins
    const { data: origins, error: errorOrigins } = await supabase
        .from("lead")
        .select("origen")
        .eq("tenant_id", defaultTenantId);

    if (errorOrigins) {
        console.error("Error fetching origins:", errorOrigins);
        return;
    }

    const uniqueOrigins = [...new Set(origins.map(o => o.origen))];
    console.log("\nFound Unique Origins in Legacy Data:");
    console.table(uniqueOrigins);

    // 2. Get unique Campaigns
    const { data: campaigns, error: errorCampaigns } = await supabase
        .from("lead")
        .select("campana")
        .eq("tenant_id", defaultTenantId);

    if (errorCampaigns) {
        console.error("Error fetching campaigns:", errorCampaigns);
        return;
    }

    const uniqueCampaigns = [...new Set(campaigns.map(c => c.campana))];
    console.log("\nFound Unique Campaigns in Legacy Data:");
    console.table(uniqueCampaigns);

    // 3. Get Current Tenants
    const { data: tenants, error: errorTenants } = await supabase
        .from("tenants")
        .select("id, name");

    if (errorTenants) {
        console.error("Error fetching tenants:", errorTenants);
        return;
    }

    console.log("\nAvailable Tenants (Targets):");
    console.table(tenants);
}

research();
