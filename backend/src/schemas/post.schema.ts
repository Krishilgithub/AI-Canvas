import { z } from 'zod';

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    content: z.string().optional(),
    scheduled_time: z.string().datetime().optional(),
    media_urls: z.array(z.string()).optional(),
    platform: z.string().optional(),
    status: z.enum(['draft', 'scheduled', 'published', 'failed', 'needs_approval']).optional()
  })
});

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
    scheduled_time: z.string().datetime().optional(),
    media_urls: z.array(z.string()).optional(),
    status: z.enum(['draft', 'scheduled', 'published', 'failed', 'needs_approval', 'approved']).optional().default('draft'),
    platform: z.string().optional(),
    trend_id: z.string().optional()
  })
});
