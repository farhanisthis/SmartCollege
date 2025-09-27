import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import type { UpdateWithAuthor } from "@shared/schema";

export class WebSocketService {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // Handle client joining specific rooms (e.g., by category)
      socket.on("join-category", (category: string) => {
        socket.join(`category:${category}`);
        console.log(
          `[WebSocket] Client ${socket.id} joined category: ${category}`
        );
      });

      socket.on("leave-category", (category: string) => {
        socket.leave(`category:${category}`);
        console.log(
          `[WebSocket] Client ${socket.id} left category: ${category}`
        );
      });

      // Handle authentication
      socket.on("authenticate", (userId: string) => {
        socket.data.userId = userId;
        socket.join(`user:${userId}`);
        console.log(
          `[WebSocket] Client ${socket.id} authenticated as user: ${userId}`
        );
      });

      socket.on("disconnect", () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  // Broadcast new update to all connected clients
  public broadcastNewUpdate(update: UpdateWithAuthor) {
    console.log(
      `[WebSocket] Broadcasting new update: ${update.id} - ${update.title}`
    );

    // Broadcast to all clients
    this.io.emit("update:new", update);

    // Broadcast to specific category room
    this.io.to(`category:${update.category}`).emit("update:new", update);
    this.io.to("category:all").emit("update:new", update);
  }

  // Broadcast update changes
  public broadcastUpdateChange(
    update: UpdateWithAuthor,
    action: "updated" | "deleted"
  ) {
    console.log(
      `[WebSocket] Broadcasting update ${action}: ${update.id} - ${update.title}`
    );

    // Broadcast to all clients
    this.io.emit(`update:${action}`, update);

    // Broadcast to specific category room
    this.io.to(`category:${update.category}`).emit(`update:${action}`, update);
    this.io.to("category:all").emit(`update:${action}`, update);
  }

  // Send notification to specific user
  public sendNotificationToUser(userId: string, notification: any) {
    console.log(`[WebSocket] Sending notification to user: ${userId}`);
    this.io.to(`user:${userId}`).emit("notification", notification);
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Get Socket.IO instance for custom usage
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Export a singleton instance
let webSocketService: WebSocketService | null = null;

export function initializeWebSocket(httpServer: HTTPServer): WebSocketService {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer);
  }
  return webSocketService;
}

export function getWebSocketService(): WebSocketService {
  if (!webSocketService) {
    throw new Error(
      "WebSocket service not initialized. Call initializeWebSocket first."
    );
  }
  return webSocketService;
}
