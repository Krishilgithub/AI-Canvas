
import { supabase } from './src/db';

async function testConnection() {
  console.log('Testing Supabase Connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  
  try {
    // Try to select from a table we expect
    const { data, error } = await supabase.from('automation_configs').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection/Select Failed:', error.message);
    } else {
      console.log('✅ Connection Successful! Validated table read access.');
      
      // Try Insert
      console.log('Testing Write Access...');
      const { error: insertError } = await supabase.from('automation_configs').upsert({
         user_id: 'test-user-debug',
         platform: 'debug',
         is_active: false
      });
      
      if (insertError) {
          console.error('❌ Write Failed:', insertError.message);
          console.log('⚠️  Likely Cause: Row Level Security (RLS) is on, and you are using the ANON KEY.');
          console.log('👉 Solution: You must use the SERVICE_ROLE_KEY in backend/.env for server-side operations.');
      } else {
          console.log('✅ Write Successful! Backend has admin rights.');
      }
    }

  } catch (err: any) {
    console.error('❌ Unexpected Error:', err.message);
  }
}

testConnection();
