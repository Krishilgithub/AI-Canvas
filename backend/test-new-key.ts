
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const key = 'sb_secret_nywgob69hmUW6dgdkk0bNw_f49qhCSX';

console.log('Testing Key:', key);
console.log('URL:', url);

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('automation_configs').select('*').limit(1);
  if (error) {
    console.error('❌ Key Failed:', error.message);
  } else {
    console.log('✅ Key Worked! Data:', data);
  }
}

test();
