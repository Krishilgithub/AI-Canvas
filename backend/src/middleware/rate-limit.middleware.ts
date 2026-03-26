import rateLimit from "express-rate-limit";

/**
 * General API rate limiter — applied to all /api/v1 routes.
 * Protects against brute-force and general abuse.
 * 200 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    message: "You have exceeded the request limit. Please try again in 15 minutes.",
    retryAfter: "15 minutes",
  },
});

/**
 * AI generation rate limiter — applied to scan and create-draft endpoints.
 * These call Gemini API and cost money — limit aggressively.
 * 10 requests per 15 minutes per IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "AI rate limit exceeded",
    message: "You are scanning trends too frequently. Please wait 15 minutes before scanning again.",
    retryAfter: "15 minutes",
  },
});

/**
 * Auth rate limiter — login / signup brute-force protection.
 * 10 requests per minute per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Auth rate limit exceeded",
    message: "Too many authentication attempts. Please wait 1 minute.",
    retryAfter: "1 minute",
  },
});
