"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const db_1 = require("../db");
class SocketService {
    constructor() {
        this.io = null;
        this.users = new Map(); // socketId -> userId
    }
    init(httpServer, allowedOrigins) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        console.log(`🔌 Socket.IO Initialized (CORS: *)`);
        this.io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(`🔌 New connection attempt: ${socket.id}`);
            // Auth Middleware
            const token = socket.handshake.auth.token || ((_a = socket.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            if (!token) {
                console.error(`❌ Connection ${socket.id} rejected: No token`);
                return next(new Error('Authentication error: No token provided'));
            }
            try {
                console.log(`🔌 Verifying token for ${socket.id}...`);
                const { data: { user }, error } = yield db_1.supabase.auth.getUser(token);
                if (error || !user) {
                    console.error(`❌ Connection ${socket.id} rejected: Invalid token`, error === null || error === void 0 ? void 0 : error.message);
                    return next(new Error('Authentication error: Invalid token'));
                }
                // Attach user to socket
                socket.user = user;
                console.log(`✅ Connection ${socket.id} authenticated as ${user.email}`);
                next();
            }
            catch (e) {
                console.error(`❌ Connection ${socket.id} error:`, e.message);
                next(new Error('Authentication error: Internal failed'));
            }
        }));
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const user = socket.user;
        console.log(`👤 User connected: ${user.id} (${socket.id})`);
        this.users.set(socket.id, user.id);
        // Join Workspace / Team Room (General broadcast)
        socket.join(`user:${user.id}`);
        // If we had team ID in user metadata, we would join `team:${teamId}`
        // 1. Post Collaboration Rooms
        socket.on('join_post', (postId) => {
            socket.join(`post:${postId}`);
            // Notify others in room
            socket.to(`post:${postId}`).emit('user_joined_post', {
                userId: user.id,
                email: user.email
            });
            console.log(`User ${user.email} joined post room ${postId}`);
        });
        socket.on('leave_post', (postId) => {
            socket.leave(`post:${postId}`);
            socket.to(`post:${postId}`).emit('user_left_post', { userId: user.id });
        });
        // 2. Typing Indicators
        socket.on('typing_start', (data) => {
            socket.to(`post:${data.postId}`).emit('user_typing', { userId: user.id, email: user.email });
        });
        socket.on('typing_end', (data) => {
            socket.to(`post:${data.postId}`).emit('user_stopped_typing', { userId: user.id });
        });
        // 3. Live Updates (Mock OT)
        socket.on('update_content', (data) => {
            // Broadcast to everyone else in room
            socket.to(`post:${data.postId}`).emit('content_updated', {
                postId: data.postId,
                content: data.content,
                userId: user.id
            });
        });
        socket.on('disconnect', () => {
            this.users.delete(socket.id);
            console.log(`User disconnected: ${user.id}`);
        });
    }
    pushNotification(userId, notification) {
        // Broadcast directly to the user's private channel
        if (this.io) {
            this.io.to(`user:${userId}`).emit("new_notification", notification);
        }
    }
}
exports.SocketService = SocketService;
exports.socketService = new SocketService();
