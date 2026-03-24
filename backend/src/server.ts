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
import { errorHandler } from "./middleware/error.middleware";
import { schedulerService } from "./services/scheduler.service";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

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
const server = http.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Allow both localhost and the live Vercel domain explicitly to prevent CORS blocking from misconfigured envs
const allowedOrigins = [FRONTEND_URL, "https://ai-canvass.vercel.app", "http://localhost:3000"];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        // As a fallback for vercel deployment branches, just allow it if we are on vercel
        if (process.env.VERCEL === "1") return callback(null, true);
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));
app.use(
  express.json({
    verify: (req: express.Request & { rawBody?: Buffer }, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

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
