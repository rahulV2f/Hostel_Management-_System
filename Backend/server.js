
/*
  Project: Hostel Management System
  File: backend/server.js
  Description: Main entry point for the Express API server
*/

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Database connection pool from db.js
const pool = require("./db");

// Route modules
const studentRoutes = require("./routes/students");
const roomRoutes = require("./routes/rooms");
const allocationRoutes = require("./routes/allocations");
const complaintRoutes = require("./routes/complaints");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================
// 1. MIDDLEWARE
// =====================================

// Allow requests from configured frontend origins.
const allowedOrigins = (
    process.env.FRONTEND_URL ||
    "http://127.0.0.1:5500,http://localhost:5500"
).split(",").map(origin => origin.trim());

app.use(cors({
    origin(origin, callback) {
        // Allow requests without an Origin header, such as local API tools.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
    }
}));

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "100kb" }));

// Parse URL-encoded form bodies.
app.use(express.urlencoded({
    extended: false,
    limit: "100kb"
}));

// =====================================
// 2. HOME ROUTE
// =====================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the Hostel Management System API",
        version: "1.0.0",
        endpoints: {
            health: "/api/health",
            students: "/api/students",
            rooms: "/api/rooms",
            allocations: "/api/allocations",
            complaints: "/api/complaints"
        }
    });
});

// =====================================
// 3. HEALTH CHECK
// =====================================

app.get("/api/health", async (req, res, next) => {
    try {
        // Verify that MySQL is reachable.
        const [rows] = await pool.query("SELECT 1 AS connected");

        res.status(200).json({
            success: true,
            server: "running",
            database: rows[0].connected === 1
                ? "connected"
                : "unknown",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

// =====================================
// 4. API ROUTES
// =====================================

// Student management
app.use("/api/students", studentRoutes);

// Room management
app.use("/api/rooms", roomRoutes);

// Room allocations
app.use("/api/allocations", allocationRoutes);

// Complaint management
app.use("/api/complaints", complaintRoutes);

// =====================================
// 5. INVALID ROUTE HANDLER
// =====================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// =====================================
// 6. GLOBAL ERROR HANDLER
// =====================================

app.use((error, req, res, next) => {
    console.error("API Error:", error.message);

    if (res.headersSent) {
        return next(error);
    }

    const statusCode = error.message === "Origin not allowed by CORS"
        ? 403
        : error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500
            ? "Internal server error"
            : error.message
    });
});

// =====================================
// 7. START SERVER
// =====================================

const server = app.listen(PORT, () => {
    console.log("---------------------------------------");
    console.log(" Hostel Management System API");
    console.log("---------------------------------------");
    console.log(` Server: http://localhost:${PORT}`);
    console.log(` Health: http://localhost:${PORT}/api/health`);
    console.log(" Status: Running");
    console.log("---------------------------------------");
});

// Gracefully close the server and database pool.
async function shutdown() {
    console.log("\nShutting down server...");

    server.close(async () => {
        try {
            await pool.end();
            console.log("Database connection pool closed.");
            process.exit(0);
        } catch (error) {
            console.error("Error closing database pool:", error.message);
            process.exit(1);
        }
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
