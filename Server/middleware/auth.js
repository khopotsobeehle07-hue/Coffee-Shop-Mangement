
require("dotenv").config();

function staffAuth(req, res, next) {
    const apiKey = req.headers["x-staff-key"];

    if (!process.env.STAFF_API_KEY ||
        apiKey !== process.env.STAFF_API_KEY) {
        return res.status(401).json({
            message: "Staff authentication required"
        });
    }

    next();
}

module.exports = staffAuth;
