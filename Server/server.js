
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const database = require("./Config/database");

const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
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
        console.error("Health check failed:", error.message);
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

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await database.connectDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();
