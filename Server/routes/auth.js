
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logServerError = require("../utils/logServerError");
const { staffLoginLimiter } = require("../middleware/rateLimits");

const router = express.Router();

router.post("/login", staffLoginLimiter, async (req, res) => {
    try {
        const body = req.body;
        const username = typeof body?.username === "string"
            ? body.username.trim()
            : "";
        const password = typeof body?.password === "string"
            ? body.password
            : "";

        if (!username || !password || username.length > 128 ||
            password.length > 256) {
            return res.status(400).json({
                message: "Enter a valid username and password."
            });
        }

        const expectedUsername = process.env.STAFF_USERNAME;
        const passwordHash = process.env.STAFF_PASSWORD_HASH;
        const jwtSecret = process.env.JWT_SECRET;

        if (!expectedUsername || !passwordHash || !jwtSecret) {
            return res.status(500).json({
                message: "Staff authentication is not configured."
            });
        }

        if (username !== expectedUsername) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const token = jwt.sign(
            {
                sub: username,
                role: "staff"
            },
            jwtSecret,
            {
                expiresIn: "2h"
            }
        );

        res.json({
            message: "Staff login successful.",
            token,
            expiresIn: "2h"
        });
    } catch (error) {
        logServerError("Staff login", error);
        res.status(500).json({
            message: "Unable to log in."
        });
    }
});

module.exports = router;
