"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostsSchema = exports.getConfigSchema = exports.triggerPostSchema = exports.createDraftSchema = exports.scanTrendsSchema = exports.saveConfigSchema = void 0;
const zod_1 = require("zod");
exports.saveConfigSchema = zod_1.z.object({
    body: zod_1.z.object({
        // user_id might be inferred from auth token, but if sent in body, we validate it
        user_id: zod_1.z.string().uuid().optional(),
        niches: zod_1.z.array(zod_1.z.string()).min(1, "At least one niche is required"),
        keywords: zod_1.z.array(zod_1.z.string()).optional(),
        tone_profile: zod_1.z
            .object({
            professionalism: zod_1.z.number().min(0).max(100).optional(),
            voice: zod_1.z.string().optional(),
        })
            .optional(),
        schedule_cron: zod_1.z.string().optional(),
        require_approval: zod_1.z.boolean().optional(),
        smart_scheduling: zod_1.z.boolean().optional(),
        auto_retweet: zod_1.z.boolean().optional(),
        platform: zod_1.z.string().optional(),
    }),
});
exports.scanTrendsSchema = zod_1.z.object({
    body: zod_1.z.object({
        user_id: zod_1.z.string().uuid().optional(), // Optional because we'll prefer auth token
    }),
});
exports.createDraftSchema = zod_1.z.object({
    body: zod_1.z.object({
        user_id: zod_1.z.string().uuid().optional(),
        content: zod_1.z.string().optional(),
        trend_id: zod_1.z.string().min(1, "Trend ID is required"),
    }),
});
exports.triggerPostSchema = zod_1.z.object({
    body: zod_1.z.object({
        post_id: zod_1.z.string().uuid("Post ID must be a valid UUID"),
        user_id: zod_1.z.string().uuid().optional(),
    }),
});
exports.getConfigSchema = zod_1.z.object({
    query: zod_1.z.object({
        user_id: zod_1.z.string().uuid().optional(),
    }),
});
exports.getPostsSchema = zod_1.z.object({
    query: zod_1.z.object({
        user_id: zod_1.z.string().uuid().optional(),
        status: zod_1.z
            .enum([
            "draft",
            "scheduled",
            "published",
            "failed",
            "needs_approval",
            "approved",
        ])
            .optional(),
        page: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
    }),
});
