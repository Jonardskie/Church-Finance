const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    let token = null;

    if (header && header.startsWith("Bearer ")) {
        token = header.split(" ")[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token"
        });

    }
}

module.exports = authMiddleware;