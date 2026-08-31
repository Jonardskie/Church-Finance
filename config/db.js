// config/db.js
// Dynamic Multi-Tenant Database Proxy
// Routes all query calls to the active church's connection pool via AsyncLocalStorage

require("dotenv").config();
const { masterPool, tenantStorage } = require("./tenantManager");

// Test Master Database connection on startup
masterPool.connect()
    .then((client) => {
        client.release();
        console.log("✅ Connected to Neon PostgreSQL (Master / Default Database)");
    })
    .catch((err) => {
        console.warn("⚠️ Database connection warning:", err.message);
    });

/**
 * Returns the active tenant pool if inside a tenant request context,
 * otherwise falls back to the default master pool.
 */
function getActivePool() {
    const store = tenantStorage.getStore();
    return store?.pool || masterPool;
}

// Proxy wrapper around masterPool so any property access or method call
// (like pool.query, pool.connect, pool.totalCount, etc.) dynamically dispatches
// to the requesting church's dedicated connection pool.
const poolProxy = new Proxy(masterPool, {
    get(target, prop, receiver) {
        const active = getActivePool();
        const value = Reflect.get(active, prop, active);
        if (typeof value === "function") {
            return value.bind(active);
        }
        return value;
    }
});

module.exports = poolProxy;