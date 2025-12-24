
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkTables() {
  console.log('--- Checking Tables ---');
  
  const tables = ['automation_configs', 'detected_trends', 'generated_posts', 'automation_logs'];
  
  for (const table of tables) {
      console.log(`Checking ${table}...`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
          console.error(`❌ Error accessing ${table}:`, error.message);
          if (error.code === '42P01') {
              console.error(`   >>> FATAL: Table '${table}' DOES NOT EXIST in your Supabase database.`);
          }
      } else {
          console.log(`✅ ${table} exists and is accessible.`);
      }
  }
}

checkTables();
