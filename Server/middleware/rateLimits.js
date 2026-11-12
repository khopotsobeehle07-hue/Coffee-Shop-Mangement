const { rateLimit } = require("express-rate-limit");

function createRateLimiter({ limit, windowMs, message }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        handler(req, res) {
            res.status(429).json({ message });
        }
    });
}

const staffLoginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: "Too many sign-in attempts. Please try again later."
});

const orderCreationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: "Too many orders placed. Please try again later."
});

module.exports = {
    createRateLimiter,
    staffLoginLimiter,
    orderCreationLimiter
};
