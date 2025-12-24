import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import automationRoutes from './routes/automation.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';
import { schedulerService } from './services/scheduler.service';

// Load env vars
dotenv.config();

// Start Scheduler
schedulerService.start();

import http from 'http';
import { socketService } from './services/socket.service';

// ... imports remain the same

// Start Scheduler
schedulerService.start();

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Initialize Socket.IO
socketService.init(server, FRONTEND_URL);

// Routes
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

// Start Server (Listen on HTTP Server, not just Express App)
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
