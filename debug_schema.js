
import { getSupabaseServerClient } from "./src/lib/supabase/server.js";

async function test() {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.from('conversaciones_whatsapp').select('*').limit(1);
    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Record:", JSON.stringify(data?.[0], null, 2));
    }
}
test();
