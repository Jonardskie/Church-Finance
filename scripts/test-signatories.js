const pool = require('../config/db');

async function testSignatories() {
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

        const secretaryOfficers = allSignatories.filter(s => /secretary/i.test(s.role) || /admin/i.test(s.role) || /pastor/i.test(s.role));
        const secretaryOthers = allSignatories.filter(s => !(/secretary/i.test(s.role) || /admin/i.test(s.role) || /pastor/i.test(s.role)));
        const secretaries = [...secretaryOfficers, ...secretaryOthers];

        const treasurerOfficers = allSignatories.filter(s => /treasurer/i.test(s.role) || /admin/i.test(s.role));
        const treasurerOthers = allSignatories.filter(s => !(/treasurer/i.test(s.role) || /admin/i.test(s.role)));
        const treasurers = [...treasurerOfficers, ...treasurerOthers];

        console.log("TOTAL SIGNATORIES:", allSignatories.length);
        console.log("SECRETARIES LIST SIZE (OFFICERS FIRST + ALL MEMBERS):", secretaries.length);
        console.log("TOP 5 SECRETARIES:", secretaries.slice(0, 5));
        console.log("TREASURERS LIST SIZE (OFFICERS FIRST + ALL MEMBERS):", treasurers.length);
        console.log("TOP 5 TREASURERS:", treasurers.slice(0, 5));

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

testSignatories();
