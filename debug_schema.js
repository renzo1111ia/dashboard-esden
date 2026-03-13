
import { getSupabaseServerClient } from "./src/lib/supabase/server.js";

async function test() {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.from('post_call_analisis').select('*').limit(1);
    console.log(JSON.stringify(data?.[0], null, 2));
}
test();
