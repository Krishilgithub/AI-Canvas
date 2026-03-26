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
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../db");
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!user_id)
            return res.status(401).json({ error: "Unauthorized" });
        const { data, error } = yield db_1.supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(50);
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getNotifications = getNotifications;
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!user_id)
            return res.status(401).json({ error: "Unauthorized" });
        const { error } = yield db_1.supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", user_id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.markAsRead = markAsRead;
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!user_id)
            return res.status(401).json({ error: "Unauthorized" });
        const { error } = yield db_1.supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user_id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.markAllAsRead = markAllAsRead;
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!user_id)
            return res.status(401).json({ error: "Unauthorized" });
        const { error } = yield db_1.supabase
            .from("notifications")
            .delete()
            .eq("id", id)
            .eq("user_id", user_id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteNotification = deleteNotification;
