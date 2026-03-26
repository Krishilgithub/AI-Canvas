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
exports.requireAuth = void 0;
const db_1 = require("../db");
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Malformed authorization header' });
        }
        const { data: { user }, error } = yield db_1.supabase.auth.getUser(token);
        if (error || !user) {
            console.error('[Auth] Token validation failed:', error === null || error === void 0 ? void 0 : error.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        // Attach typed user to request
        req.user = user;
        next();
    }
    catch (error) {
        console.error('[Auth] Middleware exception:', error);
        res.status(500).json({ error: 'Internal server authentication error' });
    }
});
exports.requireAuth = requireAuth;
