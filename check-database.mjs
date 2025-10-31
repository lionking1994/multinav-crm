import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

console.log('========================================');
console.log('🔍 DATABASE CONFIGURATION CHECK');
console.log('========================================\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl !== '' && supabaseKey !== '') {
  console.log('📡 DATABASE MODE: SUPABASE (Cloud)');
  console.log('✅ Using Supabase cloud database\n');
  console.log('Details:');
  console.log(`  URL: ${supabaseUrl}`);
  console.log(`  Key: ${supabaseKey.substring(0, 20)}...`);
  console.log('\nFeatures:');
  console.log('  • Data persists across sessions');
  console.log('  • Multiple users can access');
  console.log('  • Real-time sync possible');
  console.log('  • Accessible from anywhere');
} else {
  console.log('💾 DATABASE MODE: LOCAL (Mock Data)');
  console.log('⚠️  Using local in-memory mock data\n');
  console.log('Details:');
  console.log('  No Supabase credentials found');
  console.log('\nLimitations:');
  console.log('  • Data lost on page refresh');
  console.log('  • Single user only');
  console.log('  • No persistence');
  console.log('  • Testing/demo only');
}

console.log('\n========================================');
console.log('To switch modes, edit .env.local file');
console.log('========================================');






