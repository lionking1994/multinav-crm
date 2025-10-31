import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojwwlivcwnsbsqilyqrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qd3dsaXZjd25zYnNxaWx5cXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTQ5NzMsImV4cCI6MjA3NTYzMDk3M30.hz2qPKDwDiBq-MM6sJoeS-73NViRZY4DZJMgnXEvklE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('========================================');
  console.log('🔄 TESTING SUPABASE CONNECTION');
  console.log('========================================\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data: test, error: testError } = await supabase
      .from('clients')
      .select('count')
      .single();
    
    if (testError) {
      if (testError.message.includes('does not exist')) {
        console.log('   ✅ Connected to Supabase successfully!');
        console.log('   ❌ But tables are not created yet\n');
        console.log('⚠️  ACTION REQUIRED:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/ojwwlivcwnsbsqilyqrh/sql/new');
        console.log('   2. Copy contents of: supabase/schema.sql');
        console.log('   3. Paste and run in SQL Editor\n');
        return;
      } else {
        console.log('   ❌ Error:', testError.message);
        return;
      }
    }
    
    console.log('   ✅ Connected successfully!\n');
    
    // Test 2: Check tables
    console.log('2️⃣ Checking database tables:');
    const tables = [
      'clients',
      'health_activities', 
      'workforce',
      'program_resources',
      'gp_practices',
      'patient_experiences',
      'patient_messages'
    ];
    
    let allTablesExist = true;
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
        .single();
      
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ ${table} - NOT FOUND`);
        allTablesExist = false;
      } else {
        console.log(`   ✅ ${table} - EXISTS`);
      }
    }
    
    if (allTablesExist) {
      console.log('\n✅ ALL TABLES EXIST - Database is ready!');
      
      // Test 3: Check for data
      console.log('\n3️⃣ Checking for existing data:');
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (!clientsError) {
        console.log(`   📊 Clients in database: ${clients.length}`);
        if (clients.length === 0) {
          console.log('   ℹ️  No data yet - app will create mock data on first run');
        }
      }
    } else {
      console.log('\n❌ Some tables are missing!');
      console.log('Please run the schema.sql file in Supabase SQL Editor');
    }
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
  
  console.log('\n========================================');
}

testConnection();






