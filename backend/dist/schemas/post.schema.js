"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostSchema = exports.updatePostSchema = void 0;
const zod_1 = require("zod");
exports.updatePostSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    }),
    body: zod_1.z.object({
        content: zod_1.z.string().optional(),
        scheduled_time: zod_1.z.string().datetime().optional(),
        media_urls: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['draft', 'scheduled', 'published', 'failed', 'needs_approval']).optional()
    })
});
exports.createPostSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1, "Content is required"),
        scheduled_time: zod_1.z.string().datetime().optional(),
        media_urls: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['draft', 'scheduled', 'published', 'failed', 'needs_approval', 'approved']).optional().default('draft'),
        trend_id: zod_1.z.string().optional()
    })
});
