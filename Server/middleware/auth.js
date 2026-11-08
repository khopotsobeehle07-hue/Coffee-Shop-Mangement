
const jwt = require("jsonwebtoken");

function staffAuth(req, res, next) {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Staff authentication required."
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: "Authentication is not configured."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "staff") {
            return res.status(403).json({
                message: "Staff access only."
            });
        }

        req.staff = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired staff session."
        });
    }
}

module.exports = staffAuth;
