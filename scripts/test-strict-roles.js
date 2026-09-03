const pool = require('../config/db');

async function testStrictRoles() {
    try {
        const usersRes = await pool.query("SELECT id, username, role, full_name, name FROM users");
        const membersRes = await pool.query("SELECT id, official_name, role FROM members");

        const map = new Map();

        usersRes.rows.forEach(u => {
            const name = (u.full_name || u.name || u.username || "").trim();
            if (name) map.set(name.toLowerCase(), { name, role: (u.role || 'Member').trim() });
        });

        membersRes.rows.forEach(m => {
            const name = (m.official_name || "").trim();
            if (name && !map.has(name.toLowerCase())) {
                map.set(name.toLowerCase(), { name, role: (m.role || 'Member').trim() });
            }
        });

        const allSignatories = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

        // 1. Counter: ONLY Secretary role
        const counters = allSignatories.filter(s => /secretary/i.test(s.role));

        // 2. Finance Secretary: ONLY Secretary role
        const secretaries = allSignatories.filter(s => /secretary/i.test(s.role));

        // 3. Treasurer / Admin: ONLY Treasurer or Admin role
        const treasurers = allSignatories.filter(s => /treasurer/i.test(s.role) || /admin/i.test(s.role));

        console.log("Strict Counter / Finance Secretary options:", secretaries);
        console.log("Strict Treasurer / Admin options:", treasurers);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

testStrictRoles();
