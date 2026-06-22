function roleMiddleware(...allowedRoles) {
    return (req, res, next) => {
        // 1. Ensure user exists (must come from authMiddleware)
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: No user found" });
        }

        // 2. Ensure role exists (prevents undefined crash)
        if (!req.user.role) {
            return res.status(403).json({ message: "Forbidden: No role assigned" });
        }

        // 3. Normalize role comparison (fix case mismatch bugs)
        const userRole = req.user.role.toLowerCase();
        const rolesAllowed = allowedRoles.map(r => r.toLowerCase());

        // 4. Check permission
        if (!rolesAllowed.includes(userRole)) {
            return res.status(403).json({
                message: "Forbidden: You don't have permission"
            });
        }

        next();
    };
}

module.exports = roleMiddleware;