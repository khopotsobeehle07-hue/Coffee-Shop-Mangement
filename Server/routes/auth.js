
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
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
        res.status(500).json({
            message: "Unable to log in.",
            error: error.message
        });
    }
});

module.exports = router;
