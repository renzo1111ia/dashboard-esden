
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function debug() {
    console.log('--- DB COLUMN DEBUG V2 ---');
    const { data, error } = await supabase
        .from('lead')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns in live record:', Object.keys(data[0]));
        console.log('Segmentacion value:', data[0].segmentacion);
    } else {
        console.log('No data found in lead table, trying to describe via RPC...');
        // Try to insert a dummy and rollback? No, just check if we can select the column explicitly
        const { error: colError } = await supabase.from('lead').select('segmentacion').limit(1);
        if (colError) {
             console.error('Column segmentacion IS NOT VISIBLE:', colError.message);
        } else {
             console.log('Column segmentacion IS VISIBLE to this query.');
        }
    }
}

debug();
