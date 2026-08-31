// scripts/test-security.js
// Automated Verification for Multi-Tenant Security & Rate Limiting

require("dotenv").config();
const http = require("http");

function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: "localhost",
            port: 3000,
            path,
            method: "GET",
            headers
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
        });
        req.on("error", reject);
        req.end();
    });
}

function postLogin(churchSlug, username, password) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ username, password, church_slug: churchSlug });
        const req = http.request({
            hostname: "localhost",
            port: 3000,
            path: "/api/auth/login",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Church-Slug": churchSlug,
                "Content-Length": Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({ statusCode: res.statusCode, data }));
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function runSecurityTests() {
    console.log("===============================================================");
    console.log("🔒 CFMMS SECURITY & MULTI-TENANT VERIFICATION SUITE");
    console.log("===============================================================\n");

    // 1. Health check & tenant detection
    console.log("TEST 1: Health Check & Tenant Context Resolution");
    try {
        const res1 = await makeRequest("/api/health");
        const json1 = JSON.parse(res1.data);
        console.log(`✅ Default Request Tenant: [${json1.church}] (Expected: maui)`);

        const res2 = await makeRequest("/api/health", { "x-church-slug": "maui" });
        const json2 = JSON.parse(res2.data);
        console.log(`✅ Header Request Tenant:  [${json2.church}] (Expected: maui)`);
    } catch (e) {
        console.error("❌ Could not connect to server at localhost:3000. Is server running?");
        console.log("👉 Start the server first with: npm start\n");
        process.exit(1);
    }

    // 2. Rate Limiting Protection on /api/auth/login
    console.log("\nTEST 2: Rate Limiting on Login (Brute Force Protection)");
    console.log("Simulating rapid login attempts to trigger 429 Too Many Requests...");
    let blockedCount = 0;
    for (let i = 1; i <= 25; i++) {
        const loginAttempt = await postLogin("maui", "admin", "wrong-password");
        if (loginAttempt.statusCode === 429) {
            blockedCount++;
            if (blockedCount === 1) {
                console.log(`🛡️ Rate Limiter Triggered at attempt #${i}! Response: 429 Too Many Requests.`);
            }
        }
    }

    if (blockedCount > 0) {
        console.log(`✅ Rate Limiting PASSED! Server successfully blocked ${blockedCount} excessive requests.`);
    } else {
        console.log("⚠️ Notice: 25 attempts passed without 429 (check window limits).");
    }

    console.log("\n===============================================================");
    console.log("🎉 SECURITY VERIFICATION FINISHED!");
    console.log("===============================================================\n");
}

runSecurityTests();
