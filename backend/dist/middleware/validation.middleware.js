"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_CHAR_LIMITS = exports.approvePostSchema = exports.saveConfigSchema = exports.createDraftSchema = exports.scanSchema = exports.validate = void 0;
exports.validateBody = validateBody;
exports.validateContentLength = validateContentLength;
const zod_1 = require("zod");
const zod_2 = require("zod");
// ─── Legacy validate (for backward compat with existing routes) ───────────────
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({ body: req.body, query: req.query, params: req.params });
        next();
    }
    catch (error) {
        if (error instanceof zod_2.ZodError) {
            console.error("[Validation Error]", JSON.stringify(error.errors, null, 2));
            return res.status(400).json({
                error: "Validation Error",
                details: error.errors.map((err) => ({ field: err.path.join("."), message: err.message })),
            });
        }
        next(error);
    }
};
exports.validate = validate;
// ─── Validation middleware factory (validates req.body only) ──────────────────
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: "Validation failed",
                details: result.error.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
            return;
        }
        req.body = result.data; // Replace with sanitized/coerced data
        next();
    };
}
// ─── Schemas ──────────────────────────────────────────────────────────────────
exports.scanSchema = zod_1.z.object({
    platform: zod_1.z.enum(["linkedin", "twitter", "reddit", "instagram", "youtube"]).optional(),
});
exports.createDraftSchema = zod_1.z.object({
    trend_id: zod_1.z.string().uuid("trend_id must be a valid UUID").optional(),
    platform: zod_1.z.enum(["linkedin", "twitter", "reddit", "instagram", "youtube"]).optional(),
    content: zod_1.z.string().max(5000, "Content cannot exceed 5000 characters").optional(),
    topic: zod_1.z
        .string()
        .min(3, "Topic must be at least 3 characters")
        .max(200, "Topic cannot exceed 200 characters")
        // Prompt injection guard
        .refine((v) => !/(ignore previous|system prompt|you are now|act as|jailbreak|disregard)/i.test(v), "Invalid topic content detected")
        .optional(),
});
exports.saveConfigSchema = zod_1.z.object({
    platform: zod_1.z.enum(["linkedin", "twitter", "reddit", "instagram", "youtube"]).optional(),
    niches: zod_1.z.array(zod_1.z.string().max(100)).max(10).optional(),
    keywords: zod_1.z.array(zod_1.z.string().max(100)).max(20).optional(),
    tone_profile: zod_1.z.string().max(500).optional(),
    schedule_cron: zod_1.z.string().max(100).optional(),
    preferred_time: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, "preferred_time must be in HH:MM format")
        .optional(),
    timezone: zod_1.z.string().max(100).optional(),
    frequency: zod_1.z.enum(["daily", "alternate_days", "weekly", "manual"]).optional(),
    auto_post_enabled: zod_1.z.boolean().optional(),
    require_approval: zod_1.z.boolean().optional(),
    smart_scheduling: zod_1.z.boolean().optional(),
});
exports.approvePostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Content cannot be empty").max(40000, "Content too long").optional(),
    scheduled_time: zod_1.z.string().datetime({ offset: true }).optional(),
});
// ─── Platform character limit validator ───────────────────────────────────────
exports.PLATFORM_CHAR_LIMITS = {
    twitter: 280,
    x: 280,
    linkedin: 3000,
    reddit: 40000,
    instagram: 2200,
    youtube: 5000,
};
function validateContentLength(content, platform) {
    var _a;
    const limit = (_a = exports.PLATFORM_CHAR_LIMITS[platform.toLowerCase()]) !== null && _a !== void 0 ? _a : null;
    const charCount = content.length;
    const overBy = limit ? Math.max(0, charCount - limit) : 0;
    return { valid: limit === null || charCount <= limit, charCount, limit, overBy };
}
