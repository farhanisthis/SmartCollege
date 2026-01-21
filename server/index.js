import "dotenv/config";
import express from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { initializeWebSocket } from "./services/websocket";
const app = express();
// CORS middleware
// CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow ANY origin in development/testing to support LocalTunnel, IPs, etc.
    // echo back the origin to support credentials
    if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    else {
        // Mobile apps sometimes don't send Origin; allow * or specific defaults
        res.header("Access-Control-Allow-Origin", "*");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Bypass-Tunnel-Reminder");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res, path) => {
        // Set proper headers for file serving
        if (path.endsWith(".pdf")) {
            res.setHeader("Content-Type", "application/pdf");
        }
        else if (path.match(/\.(jpg|jpeg|png|gif)$/i)) {
            res.setHeader("Content-Type", "image/" + path.split(".").pop());
        }
        res.setHeader("Content-Disposition", "inline");
    },
}));
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }
            if (logLine.length > 80) {
                logLine = logLine.slice(0, 79) + "…";
            }
            log(logLine);
        }
    });
    next();
});
(async () => {
    const server = await registerRoutes(app);
    // Initialize WebSocket service
    const webSocketService = initializeWebSocket(server);
    log(`WebSocket service initialized with CORS origin: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        throw err;
    });
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 10000 for Render deployment.
    const port = parseInt(process.env.PORT || "10000", 10);
    const host = "0.0.0.0"; // Bind to all interfaces for Render deployment
    server.listen(port, host, () => {
        log(`serving on http://${host}:${port}`);
    });
})();
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
// touch
