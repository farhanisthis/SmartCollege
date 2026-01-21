import { Server as SocketIOServer } from "socket.io";
export class WebSocketService {
    io;
    constructor(httpServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || "http://localhost:5173",
                credentials: true,
            },
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.io.on("connection", (socket) => {
            console.log(`[WebSocket] Client connected: ${socket.id}`);
            // Handle client joining specific rooms (e.g., by category)
            socket.on("join-category", (category) => {
                socket.join(`category:${category}`);
                console.log(`[WebSocket] Client ${socket.id} joined category: ${category}`);
            });
            socket.on("leave-category", (category) => {
                socket.leave(`category:${category}`);
                console.log(`[WebSocket] Client ${socket.id} left category: ${category}`);
            });
            // Handle authentication
            socket.on("authenticate", (userId) => {
                socket.data.userId = userId;
                socket.join(`user:${userId}`);
                console.log(`[WebSocket] Client ${socket.id} authenticated as user: ${userId}`);
            });
            socket.on("disconnect", () => {
                console.log(`[WebSocket] Client disconnected: ${socket.id}`);
            });
        });
    }
    // Broadcast new update to all connected clients
    broadcastNewUpdate(update) {
        console.log(`[WebSocket] Broadcasting new update: ${update.id} - ${update.title}`);
        // Broadcast to all clients
        this.io.emit("update:new", update);
        // Broadcast to specific category room
        this.io.to(`category:${update.category}`).emit("update:new", update);
        this.io.to("category:all").emit("update:new", update);
    }
    // Broadcast update changes
    broadcastUpdateChange(update, action) {
        console.log(`[WebSocket] Broadcasting update ${action}: ${update.id} - ${update.title}`);
        // Broadcast to all clients
        this.io.emit(`update:${action}`, update);
        // Broadcast to specific category room
        this.io.to(`category:${update.category}`).emit(`update:${action}`, update);
        this.io.to("category:all").emit(`update:${action}`, update);
    }
    // Send notification to specific user
    sendNotificationToUser(userId, notification) {
        console.log(`[WebSocket] Sending notification to user: ${userId}`);
        this.io.to(`user:${userId}`).emit("notification", notification);
    }
    // Get connected clients count
    getConnectedClientsCount() {
        return this.io.sockets.sockets.size;
    }
    // Get Socket.IO instance for custom usage
    getIO() {
        return this.io;
    }
}
// Export a singleton instance
let webSocketService = null;
export function initializeWebSocket(httpServer) {
    if (!webSocketService) {
        webSocketService = new WebSocketService(httpServer);
    }
    return webSocketService;
}
export function getWebSocketService() {
    if (!webSocketService) {
        throw new Error("WebSocket service not initialized. Call initializeWebSocket first.");
    }
    return webSocketService;
}
