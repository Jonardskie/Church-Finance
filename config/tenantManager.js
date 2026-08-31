// config/tenantManager.js
// Multi-Tenant Pool Manager & AsyncLocalStorage Context Provider

require("dotenv").config();
const pg = require("pg");
const { Pool } = pg;
const { AsyncLocalStorage } = require("async_hooks");

// Ensure PostgreSQL DATE columns (OID 1082) are returned as raw 'YYYY-MM-DD' strings
// to avoid local timezone offset shifting dates across UTC/GMT+8 boundaries.
pg.types.setTypeParser(1082, (val) => val);

// Asynchronous Request Context Tracker
const tenantStorage = new AsyncLocalStorage();

// Master Database Pool (Control Plane)
const masterPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
});

masterPool.on("error", (err) => {
    console.warn("⚠️ Master DB Pool error:", err.code || err.message);
});

// In-Memory Connection Pool Cache (slug -> pg.Pool)
const tenantPools = new Map();
const tenantMeta = new Map();

// Pre-register default tenant using the master pool
tenantPools.set("default", masterPool);
tenantPools.set("maui", masterPool);
tenantMeta.set("default", { slug: "default", name: "Default Church", status: "active" });
tenantMeta.set("maui", { slug: "maui", name: "Maui United Methodist Church", status: "active" });

/**
 * Retrieve tenant pool and metadata by slug
 */
async function getTenant(slug) {
    if (!slug) return getTenant("default");
    const cleanSlug = slug.trim().toLowerCase();

    // 1. Check in-memory pool cache
    if (tenantPools.has(cleanSlug)) {
        const meta = tenantMeta.get(cleanSlug) || { slug: cleanSlug, name: cleanSlug, status: "active" };
        if (meta.status === "suspended") {
            return { ...meta, isSuspended: true };
        }
        return {
            ...meta,
            pool: tenantPools.get(cleanSlug)
        };
    }

    // 2. Query Master Directory
    try {
        const result = await masterPool.query(
            "SELECT * FROM tenants WHERE LOWER(slug) = LOWER($1) LIMIT 1",
            [cleanSlug]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const tenant = result.rows[0];
        tenantMeta.set(cleanSlug, tenant);

        if (tenant.status === "suspended") {
            return { ...tenant, isSuspended: true };
        }

        // 3. Create dedicated connection pool for this tenant
        const newPool = new Pool({
            connectionString: tenant.database_url,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            ssl: { rejectUnauthorized: false }
        });

        newPool.on("error", (err) => {
            console.warn(`⚠️ Tenant [${cleanSlug}] DB Pool error:`, err.code || err.message);
        });

        tenantPools.set(cleanSlug, newPool);

        return {
            ...tenant,
            pool: newPool
        };

    } catch (err) {
        console.error(`❌ Error fetching tenant [${cleanSlug}]:`, err.message);
        return null;
    }
}

/**
 * Register or update a tenant in Master Directory
 */
async function registerTenant({ slug, name, databaseUrl, status = "active", plan = "pro" }) {
    const cleanSlug = slug.trim().toLowerCase();

    const res = await masterPool.query(
        `INSERT INTO tenants (slug, name, database_url, status, plan, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             database_url = EXCLUDED.database_url,
             status = EXCLUDED.status,
             plan = EXCLUDED.plan
         RETURNING *`,
        [cleanSlug, name, databaseUrl, status, plan]
    );

    const saved = res.rows[0];
    tenantMeta.set(cleanSlug, saved);

    // If pool already existed, close it so new URL is used
    if (tenantPools.has(cleanSlug) && cleanSlug !== "default" && cleanSlug !== "maui") {
        try {
            await tenantPools.get(cleanSlug).end();
        } catch (e) {}
        tenantPools.delete(cleanSlug);
    }

    return saved;
}

/**
 * Clear cached tenant pool and metadata (e.g. on status update or suspension)
 */
function clearTenantCache(slug) {
    if (!slug) {
        tenantPools.clear();
        tenantMeta.clear();
        tenantPools.set("default", masterPool);
        tenantPools.set("maui", masterPool);
    } else {
        const cleanSlug = slug.trim().toLowerCase();
        if (cleanSlug !== "default" && cleanSlug !== "maui") {
            if (tenantPools.has(cleanSlug)) {
                try { tenantPools.get(cleanSlug).end(); } catch (e) {}
                tenantPools.delete(cleanSlug);
            }
        }
        tenantMeta.delete(cleanSlug);
    }
}

module.exports = {
    tenantStorage,
    masterPool,
    getTenant,
    registerTenant,
    clearTenantCache
};
