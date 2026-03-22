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
const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const key = 'sb_secret_nywgob69hmUW6dgdkk0bNw_f49qhCSX';
console.log('Testing Key:', key);
console.log('URL:', url);
const supabase = (0, supabase_js_1.createClient)(url, key);
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabase.from('automation_configs').select('*').limit(1);
        if (error) {
            console.error('❌ Key Failed:', error.message);
        }
        else {
            console.log('✅ Key Worked! Data:', data);
        }
    });
}
test();
