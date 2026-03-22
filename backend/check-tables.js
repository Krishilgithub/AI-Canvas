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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(url, key);
function checkTables() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('--- Checking Tables ---');
        const tables = ['automation_configs', 'detected_trends', 'generated_posts', 'automation_logs'];
        for (const table of tables) {
            console.log(`Checking ${table}...`);
            const { data, error } = yield supabase.from(table).select('*').limit(1);
            if (error) {
                console.error(`❌ Error accessing ${table}:`, error.message);
                if (error.code === '42P01') {
                    console.error(`   >>> FATAL: Table '${table}' DOES NOT EXIST in your Supabase database.`);
                }
            }
            else {
                console.log(`✅ ${table} exists and is accessible.`);
            }
        }
    });
}
checkTables();
