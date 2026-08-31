// middleWare/tenantMiddleware.js
// Resolves the requesting church and binds the request to their dedicated connection pool

const jwt = require("jsonwebtoken");
const { getTenant, tenantStorage } = require("../config/tenantManager");

async function tenantMiddleware(req, res, next) {
    try {
        let slug = null;

        // 1. Check Authorization JWT Token payload FIRST (if user is authenticated)
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                if (token) {
                    const decoded = jwt.decode(token);
                    if (decoded && decoded.church_slug) {
                        slug = decoded.church_slug;
                    }
                }
            } catch (jwtErr) {
                // Ignore decode error here
            }
        }

        // 2. Check Custom Request Header (X-Church-Slug)
        if (!slug && req.headers["x-church-slug"]) {
            slug = req.headers["x-church-slug"];
        }

        // 3. Check Query Parameter (?church=grace or ?church_slug=grace)
        if (!slug && (req.query.church || req.query.church_slug)) {
            slug = req.query.church || req.query.church_slug;
        }

        // 4. Check Request Body (e.g. { church_slug: 'grace' } during login)
        if (!slug && req.body && req.body.church_slug) {
            slug = req.body.church_slug;
        }

        // 5. Check Subdomain (only for custom domains, ignore vercel.app / onrender.com / localhost)
        if (!slug) {
            const host = req.headers.host || "";
            const hostWithoutPort = host.split(":")[0];
            const isPlatformDomain = hostWithoutPort.endsWith(".vercel.app") ||
                                     hostWithoutPort.endsWith(".now.sh") ||
                                     hostWithoutPort.endsWith(".onrender.com") ||
                                     hostWithoutPort.endsWith(".railway.app") ||
                                     hostWithoutPort.endsWith(".pages.dev") ||
                                     hostWithoutPort === "localhost";

            if (!isPlatformDomain) {
                const parts = hostWithoutPort.split(".");
                if (parts.length > 2 && !/^\d+$/.test(parts[0]) && !["www", "app", "api"].includes(parts[0])) {
                    slug = parts[0];
                }
            }
        }

        // 6. Default Fallback
        if (!slug) {
            slug = "maui";
        }

        let cleanSlug = String(slug).trim().toLowerCase();
        if (cleanSlug === "maui-church-finance" || cleanSlug === "maui-church") {
            cleanSlug = "maui";
        }

        // Retrieve tenant pool
        const tenant = await getTenant(cleanSlug);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: `Church organization '${cleanSlug}' not found in master registry.`
            });
        }

        if (tenant.isSuspended) {
            return res.status(403).json({
                success: false,
                error: `The subscription for '${tenant.name}' is currently suspended. Please contact support.`
            });
        }

        // Attach tenant metadata to request object
        req.churchSlug = cleanSlug;
        req.churchName = tenant.name;

        // Run next() inside AsyncLocalStorage context with this church's dedicated pool
        tenantStorage.run({ tenantSlug: cleanSlug, pool: tenant.pool }, () => {
            next();
        });

    } catch (err) {
        console.error("TENANT MIDDLEWARE ERROR:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to resolve church tenant context."
        });
    }
}

module.exports = tenantMiddleware;
