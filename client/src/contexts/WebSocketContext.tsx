import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import io, { type Socket } from "socket.io-client";
import type { UpdateWithAuthor } from "@shared/schema";

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinCategory: (category: string) => void;
  leaveCategory: (category: string) => void;
  onNewUpdate: (callback: (update: UpdateWithAuthor) => void) => () => void;
  onUpdateDeleted: (callback: (update: UpdateWithAuthor) => void) => () => void;
  onUpdateUpdated: (callback: (update: UpdateWithAuthor) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(
      import.meta.env.VITE_API_URL || "http://localhost:10000",
      {
        withCredentials: true,
        transports: ["websocket", "polling"], // Fallback to polling if websocket fails
      }
    );

    setSocket(newSocket);

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("[WebSocket] Connected to server:", newSocket.id);
      setConnected(true);
    });

    newSocket.on("disconnect", (reason: any) => {
      console.log("[WebSocket] Disconnected from server:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (error: any) => {
      console.error("[WebSocket] Connection error:", error);
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log("[WebSocket] Cleaning up connection");
      newSocket.close();
    };
  }, []);

  const joinCategory = (category: string) => {
    if (socket?.connected) {
      console.log(`[WebSocket] Joining category: ${category}`);
      socket.emit("join-category", category);
    }
  };

  const leaveCategory = (category: string) => {
    if (socket?.connected) {
      console.log(`[WebSocket] Leaving category: ${category}`);
      socket.emit("leave-category", category);
    }
  };

  const onNewUpdate = (callback: (update: UpdateWithAuthor) => void) => {
    if (!socket) return () => {};

    const handler = (update: UpdateWithAuthor) => {
      console.log("[WebSocket] New update received:", update.title);
      callback(update);
    };

    socket.on("update:new", handler);

    return () => {
      socket.off("update:new", handler);
    };
  };

  const onUpdateDeleted = (callback: (update: UpdateWithAuthor) => void) => {
    if (!socket) return () => {};

    const handler = (update: UpdateWithAuthor) => {
      console.log("[WebSocket] Update deleted:", update.title);
      callback(update);
    };

    socket.on("update:deleted", handler);

    return () => {
      socket.off("update:deleted", handler);
    };
  };

  const onUpdateUpdated = (callback: (update: UpdateWithAuthor) => void) => {
    if (!socket) return () => {};

    const handler = (update: UpdateWithAuthor) => {
      console.log("[WebSocket] Update updated:", update.title);
      callback(update);
    };

    socket.on("update:updated", handler);

    return () => {
      socket.off("update:updated", handler);
    };
  };

  const value: WebSocketContextType = {
    socket,
    connected,
    joinCategory,
    leaveCategory,
    onNewUpdate,
    onUpdateDeleted,
    onUpdateUpdated,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

// Custom hook for real-time updates with automatic cleanup
export function useRealTimeUpdates(
  onNewUpdate?: (update: UpdateWithAuthor) => void,
  onUpdateDeleted?: (update: UpdateWithAuthor) => void,
  onUpdateUpdated?: (update: UpdateWithAuthor) => void
) {
  const {
    onNewUpdate: onNew,
    onUpdateDeleted: onDeleted,
    onUpdateUpdated: onUpdated,
  } = useWebSocket();

  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    if (onNewUpdate) {
      cleanupFunctions.push(onNew(onNewUpdate));
    }

    if (onUpdateDeleted) {
      cleanupFunctions.push(onDeleted(onUpdateDeleted));
    }

    if (onUpdateUpdated) {
      cleanupFunctions.push(onUpdated(onUpdateUpdated));
    }

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [
    onNewUpdate,
    onUpdateDeleted,
    onUpdateUpdated,
    onNew,
    onDeleted,
    onUpdated,
  ]);
}
