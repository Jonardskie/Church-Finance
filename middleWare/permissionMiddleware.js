const permissionController = require("../controllers/permissionController");

function permissionMiddleware(moduleName, actionName) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: No user found" });
        }

        const userRole = (req.user.role || "").toLowerCase();

        // Admin always has master access
        if (userRole === "admin") {
            return next();
        }

        try {
            const map = await permissionController.getPermissionsMap();
            const rolePerms = map[userRole];

            if (rolePerms && rolePerms[moduleName] && rolePerms[moduleName][actionName] === true) {
                return next();
            }

            return res.status(403).json({
                error: `Access Denied: Role '${req.user.role}' does not have permission to ${actionName} in ${moduleName}.`
            });
        } catch (err) {
            console.error("Permission Middleware Error:", err);
            return res.status(500).json({ error: "Permission evaluation error" });
        }
    };
}

module.exports = permissionMiddleware;
