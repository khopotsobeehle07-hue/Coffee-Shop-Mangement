
const express = require("express");
const cors = require("cors");
if (require.main === module) {
    require("dotenv").config();
}

const database = require("./Config/database");
const logServerError = require("./utils/logServerError");

const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");

const app = express();

const localDevelopmentOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
];
function getAllowedOrigins({
    nodeEnv = process.env.NODE_ENV,
    corsOrigins = process.env.CORS_ORIGINS || ""
} = {}) {
    const configuredOrigins = corsOrigins
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);

    return new Set([
        ...configuredOrigins,
        ...(nodeEnv === "production" ? [] : localDevelopmentOrigins)
    ]);
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
    origin(origin, callback) {
        callback(null, !origin || allowedOrigins.has(origin));
    },
    optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.send("Coffee Shop Management API is running!");
});

app.get("/api/health", async (req, res) => {
    try {
        await database.ping();
        res.status(200).json({
            status: "success",
            message: "Backend and database are healthy",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logServerError("Health check", error);
        res.status(503).json({
            status: "error",
            message: "Backend database is unavailable",
            timestamp: new Date().toISOString()
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    logServerError("Request handling", error);
    const status = Number.isInteger(error.status) &&
        error.status >= 400 && error.status < 500
        ? error.status
        : 500;
    const message = status === 400 || status === 413
        ? "The request body is invalid or too large."
        : "An unexpected server error occurred.";

    res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await database.connectDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        logServerError("Server startup", error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    startServer,
    getAllowedOrigins
};
