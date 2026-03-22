import { io, Socket } from 'socket.io-client';
import { createClient } from './supabase/client';

export class SocketClient {
  private socket: Socket | null = null;
  private static instance: SocketClient;

  private constructor() {}

  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  async connect() {
    if (this.socket?.connected) return;
    
    // Disable Socket on Vercel
    if (process.env.NEXT_PUBLIC_VERCEL === "1") {
        console.warn('⚡ Socket.IO is disabled on Vercel deployment');
        return;
    }

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) return;

    // Connect to Backend URL
    const isProd = process.env.NODE_ENV === "production";
    const URL = isProd ? "https://ai-canvass.vercel.app" : (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1/automation', '') || 'http://localhost:4000');
    
    this.socket = io(URL, {
        auth: {
            token: session.access_token
        },
        transports: ['websocket'], // Force WebSocket to avoid XHR polling issues
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
        console.log('⚡ Connected to WebSocket');
    });

    this.socket.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err.message, err);
    });
  }

  disconnect() {
      if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
      }
  }

  // --- Methods ---
  
  joinPost(postId: string) {
      this.socket?.emit('join_post', postId);
  }

  leavePost(postId: string) {
      this.socket?.emit('leave_post', postId);
  }

  startTyping(postId: string) {
      this.socket?.emit('typing_start', { postId });
  }

  stopTyping(postId: string) {
      this.socket?.emit('typing_end', { postId });
  }

  onTyping(callback: (user: { userId: string, email: string }) => void) {
      this.socket?.on('user_typing', callback);
  }

  offTyping(callback: (user: { userId: string, email: string }) => void) {
      this.socket?.off('user_typing', callback);
  }

  onStopTyping(callback: (user: { userId: string }) => void) {
      this.socket?.on('user_stopped_typing', callback);
  }
}

export const socketClient = SocketClient.getInstance();
