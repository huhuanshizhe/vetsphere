require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Has service key:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrdersTable() {
  try {
    // Test 1: Check if orders table exists
    console.log('\n=== Testing orders table ===');
    const { data, error } = await supabase.from('orders').select('id').limit(1);
    
    if (error) {
      console.error('❌ Error querying orders:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
    } else {
      console.log('✅ Orders table exists!');
      console.log('Data:', data);
    }
    
    // Test 2: Check table structure
    console.log('\n=== Checking table columns ===');
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' });
    
    if (colError) {
      console.log('Cannot get column info via RPC, trying alternative method...');
    } else {
      console.log('Columns:', columns);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testOrdersTable();
