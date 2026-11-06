
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDatabase } = require("./Config/database");

const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Coffee Shop Management API is running");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "Backend is healthy",
        timestamp: new Date()
    });
});

app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);

const PORT = process.env.PORT || 5000;

connectDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`API running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error("Database connection failed:", error);
        process.exit(1);
    });
