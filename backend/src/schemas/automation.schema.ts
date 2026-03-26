import { z } from "zod";

export const saveConfigSchema = z.object({
  body: z.object({
    // user_id might be inferred from auth token, but if sent in body, we validate it
    user_id: z.string().uuid().optional(),
    niches: z.array(z.string()).min(1, "At least one niche is required"),
    keywords: z.array(z.string()).optional(),
    tone_profile: z.string().optional(),
    schedule_cron: z.string().optional(),
    require_approval: z.boolean().optional(),
    smart_scheduling: z.boolean().optional(),
    auto_retweet: z.boolean().optional(),
    platform: z.string().optional(),
    preferred_time: z.string().optional(),
    timezone: z.string().optional(),
    frequency: z.enum(['daily', 'alternate_days', 'weekly']).optional(),
    auto_post_enabled: z.boolean().optional(),
  }),
});

export const scanTrendsSchema = z.object({
  body: z.object({
    user_id: z.string().uuid().optional(), // Optional because we'll prefer auth token
  }),
});

export const createDraftSchema = z.object({
  body: z.object({
    user_id: z.string().uuid().optional(),
    content: z.string().optional(),
    trend_id: z.string().min(1, "Trend ID is required"),
  }),
});

export const triggerPostSchema = z.object({
  body: z.object({
    post_id: z.string().uuid("Post ID must be a valid UUID"),
    user_id: z.string().uuid().optional(),
  }),
});

export const getConfigSchema = z.object({
  query: z.object({
    user_id: z.string().uuid().optional(),
  }),
});

export const getPostsSchema = z.object({
  query: z.object({
    user_id: z.string().uuid().optional(),
    status: z.string().optional(),
    platform: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
