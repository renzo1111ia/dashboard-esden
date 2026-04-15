import { getSupabaseServerClient } from "./src/lib/supabase/server.js";

async function checkTable() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase.from('voice_agents').select('id').limit(1);
        if (error) {
            console.error("TABLE_CHECK_ERROR:", error.message);
        } else {
            console.log("TABLE_CHECK_SUCCESS");
        }
    } catch (e) {
        console.error("EXECUTION_ERROR:", e.message);
    }
}

checkTable();
