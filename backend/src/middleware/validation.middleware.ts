import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

// ─── Legacy validate (for backward compat with existing routes) ───────────────
export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Validation Error",
        details: error.errors.map((err) => ({ field: err.path.join("."), message: err.message })),
      });
    }
    next(error);
  }
};

// ─── Validation middleware factory (validates req.body only) ──────────────────
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

export const scanSchema = z.object({
  platform: z.enum(["linkedin", "twitter", "reddit", "instagram", "youtube"]).optional(),
});

export const createDraftSchema = z.object({
  trend_id: z.string().uuid("trend_id must be a valid UUID").optional(),
  platform: z.enum(["linkedin", "twitter", "reddit", "instagram", "youtube"]).optional(),
  content: z.string().max(5000, "Content cannot exceed 5000 characters").optional(),
  topic: z
    .string()
    .min(3, "Topic must be at least 3 characters")
    .max(200, "Topic cannot exceed 200 characters")
    // Prompt injection guard
    .refine(
      (v) => !/(ignore previous|system prompt|you are now|act as|jailbreak|disregard)/i.test(v),
      "Invalid topic content detected"
    )
    .optional(),
});

export const saveConfigSchema = z.object({
  platform: z.enum(["linkedin", "twitter", "reddit", "instagram", "youtube"]).optional(),
  niches: z.array(z.string().max(100)).max(10).optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
  tone_profile: z.string().max(500).optional(),
  schedule_cron: z.string().max(100).optional(),
  preferred_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "preferred_time must be in HH:MM format")
    .optional(),
  timezone: z.string().max(100).optional(),
  frequency: z.enum(["daily", "alternate_days", "weekly", "manual"]).optional(),
  auto_post_enabled: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  smart_scheduling: z.boolean().optional(),
});

export const approvePostSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(40000, "Content too long").optional(),
  scheduled_time: z.string().datetime({ offset: true }).optional(),
});

// ─── Platform character limit validator ───────────────────────────────────────
export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter:   280,
  x:         280,
  linkedin:  3000,
  reddit:    40000,
  instagram: 2200,
  youtube:   5000,
};

export function validateContentLength(content: string, platform: string): {
  valid: boolean;
  charCount: number;
  limit: number | null;
  overBy: number;
} {
  const limit = PLATFORM_CHAR_LIMITS[platform.toLowerCase()] ?? null;
  const charCount = content.length;
  const overBy = limit ? Math.max(0, charCount - limit) : 0;
  return { valid: limit === null || charCount <= limit, charCount, limit, overBy };
}
