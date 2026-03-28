import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import automationRoutes from "./routes/automation.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import analyticsRoutes from "./routes/analytics.routes";
import postRoutes from "./routes/post.routes";
import paymentRoutes from "./routes/payment.routes";
import keysRoutes from "./routes/keys.routes";
import notificationRoutes from "./routes/notification.routes";
import accountsRoutes from "./routes/accounts.routes";
import insightsRoutes from "./routes/insights.routes";
import mediaRoutes from "./routes/media.routes";
import commentsRoutes from "./routes/comments.routes";
import { errorHandler } from "./middleware/error.middleware";
import { schedulerService } from "./services/scheduler.service";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { generalLimiter, aiLimiter, authLimiter } from "./middleware/rate-limit.middleware";

// Load env vars
dotenv.config();


import http from "http";
import { socketService } from "./services/socket.service";

// ... imports remain the same

// Start Scheduler only if not on Vercel
if (process.env.VERCEL !== "1") {
  schedulerService.start();
}

const app = express();
app.set("trust proxy", 1); // Trust first proxy (e.g., Vercel) for rate limiting
const server = http.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// FIX: Removed Vercel production CORS wildcard bypass (`if VERCEL===1 return true`).
// Now uses an explicit allowlist in ALL environments.
const allowedOrigins = [
  FRONTEND_URL,
  "https://ai-canvass.vercel.app",
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_FRONTEND_URL,
].filter(Boolean) as string[];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // FIX: No more wildcard for Vercel previews — explicit list only
      return callback(new Error(`Origin "${origin}" is not allowed by CORS policy`), false);
    },
    credentials: true,
  }),
);
app.use(helmet());
// FIX: Use 'combined' (Apache format, no body logging) in production; 'dev' only locally
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  express.json({
    verify: (req: express.Request & { rawBody?: Buffer }, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// FIX: Apply rate limiting — BEFORE routes so all traffic is limited
app.use("/api/v1", generalLimiter);
app.use("/api/v1/auth", authLimiter);

// Initialize Socket.IO only if not on Vercel
if (process.env.VERCEL !== "1") {
  socketService.init(server, FRONTEND_URL);
}

// Routes
app.use("/api/v1/automation", automationRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/keys", keysRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/accounts", accountsRoutes);
app.use("/api/v1/insights", insightsRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/comments", commentsRoutes);

// FIX: Apply AI rate limiter specifically to expensive Gemini endpoints
app.use("/api/v1/automation/scan", aiLimiter);
app.use("/api/v1/automation/create-draft", aiLimiter);
app.use("/api/v1/insights/autopsy", aiLimiter);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

// Start Server (Listen on HTTP Server, not just Express App)
if (process.env.VERCEL !== "1") {
  server.listen(PORT, () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Export the express app for Vercel Serverless Functions
export default app;
