"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/db");
function testConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Testing Supabase Connection...');
        console.log('URL:', process.env.SUPABASE_URL);
        try {
            // Try to select from a table we expect
            const { data, error } = yield db_1.supabase.from('automation_configs').select('count', { count: 'exact', head: true });
            if (error) {
                console.error('❌ Connection/Select Failed:', error.message);
            }
            else {
                console.log('✅ Connection Successful! Validated table read access.');
                // Try Insert
                console.log('Testing Write Access...');
                const { error: insertError } = yield db_1.supabase.from('automation_configs').upsert({
                    user_id: 'test-user-debug',
                    platform: 'debug',
                    is_active: false
                });
                if (insertError) {
                    console.error('❌ Write Failed:', insertError.message);
                    console.log('⚠️  Likely Cause: Row Level Security (RLS) is on, and you are using the ANON KEY.');
                    console.log('👉 Solution: You must use the SERVICE_ROLE_KEY in backend/.env for server-side operations.');
                }
                else {
                    console.log('✅ Write Successful! Backend has admin rights.');
                }
            }
        }
        catch (err) {
            console.error('❌ Unexpected Error:', err.message);
        }
    });
}
testConnection();
