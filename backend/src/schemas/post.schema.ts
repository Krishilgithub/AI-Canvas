import { z } from 'zod';

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    content: z.string().min(1).optional(),
    scheduled_time: z.string().datetime().optional()
  })
});

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
    scheduled_time: z.string().datetime().optional(),
    status: z.enum(['draft', 'scheduled', 'published', 'failed', 'needs_approval', 'approved']).optional().default('draft'),
    trend_id: z.string().optional()
  })
});
