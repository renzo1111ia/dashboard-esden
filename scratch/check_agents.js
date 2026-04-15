import { getSupabaseServerClient } from "../src/lib/supabase/server.js";

async function checkAgents() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase.from('voice_agents').select('name, provider_agent_id');
        if (error) {
            console.error("QUERY_ERROR:", error.message);
        } else {
            console.log("AGENTS_IN_DB:", data.length);
            data.forEach(a => console.log(` - ${a.name} (${a.provider_agent_id})`));
        }
    } catch (e) {
        console.error("EXECUTION_ERROR:", e.message);
    }
}

checkAgents();
