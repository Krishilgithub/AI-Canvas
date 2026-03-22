"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const automation_routes_1 = __importDefault(require("./routes/automation.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const scheduler_service_1 = require("./services/scheduler.service");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
// Load env vars
dotenv_1.default.config();
// Start Scheduler
scheduler_service_1.schedulerService.start();
const http_1 = __importDefault(require("http"));
const socket_service_1 = require("./services/socket.service");
// ... imports remain the same
// Start Scheduler
scheduler_service_1.schedulerService.start();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
// Middleware
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    },
}));
// Initialize Socket.IO
socket_service_1.socketService.init(server, FRONTEND_URL);
// Routes
app.use("/api/v1/automation", automation_routes_1.default);
app.use("/api/v1/user", user_routes_1.default);
app.use("/api/v1/analytics", analytics_routes_1.default);
app.use("/api/v1/posts", post_routes_1.default);
app.use("/api/v1/payment", payment_routes_1.default);
app.use("/api/v1/auth", auth_routes_1.default);
// Swagger Documentation
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Global Error Handler
app.use(error_middleware_1.errorHandler);
// Start Server (Listen on HTTP Server, not just Express App)
server.listen(PORT, () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
});
