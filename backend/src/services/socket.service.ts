import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabase } from '../db';

export class SocketService {
  private io: SocketIOServer | null = null;
  private users = new Map<string, string>(); // socketId -> userId

  init(httpServer: HttpServer, allowedOrigins: string | string[]) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    console.log(`🔌 Socket.IO Initialized (CORS: *)`);

    this.io.use(async (socket, next) => {
        console.log(`🔌 New connection attempt: ${socket.id}`);
        // Auth Middleware
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
            console.error(`❌ Connection ${socket.id} rejected: No token`);
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            console.log(`🔌 Verifying token for ${socket.id}...`);
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (error || !user) {
                console.error(`❌ Connection ${socket.id} rejected: Invalid token`, error?.message);
                return next(new Error('Authentication error: Invalid token'));
            }
            
            // Attach user to socket
            (socket as any).user = user;
            console.log(`✅ Connection ${socket.id} authenticated as ${user.email}`);
            next();
        } catch (e: any) {
            console.error(`❌ Connection ${socket.id} error:`, e.message);
            next(new Error('Authentication error: Internal failed'));
        }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
      const user = (socket as any).user;
      console.log(`👤 User connected: ${user.id} (${socket.id})`);
      this.users.set(socket.id, user.id);

      // Join Workspace / Team Room (General broadcast)
      socket.join(`user:${user.id}`); 
      // If we had team ID in user metadata, we would join `team:${teamId}`

      // 1. Post Collaboration Rooms
      socket.on('join_post', (postId: string) => {
          socket.join(`post:${postId}`);
          // Notify others in room
          socket.to(`post:${postId}`).emit('user_joined_post', { 
              userId: user.id, 
              email: user.email 
          });
          console.log(`User ${user.email} joined post room ${postId}`);
      });

      socket.on('leave_post', (postId: string) => {
          socket.leave(`post:${postId}`);
          socket.to(`post:${postId}`).emit('user_left_post', { userId: user.id });
      });

      // 2. Typing Indicators
      socket.on('typing_start', (data: { postId: string }) => {
          socket.to(`post:${data.postId}`).emit('user_typing', { userId: user.id, email: user.email });
      });

      socket.on('typing_end', (data: { postId: string }) => {
          socket.to(`post:${data.postId}`).emit('user_stopped_typing', { userId: user.id });
      });

      // 3. Live Updates (Mock OT)
      socket.on('update_content', (data: { postId: string, content: string }) => {
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

  public pushNotification(userId: string, notification: any) {
    // Broadcast directly to the user's private channel
    if (this.io) {
      this.io.to(`user:${userId}`).emit("new_notification", notification);
    }
  }
}

export const socketService = new SocketService();
