const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function restoreBackup() {
    const targetFile = process.argv[2] || path.join(__dirname, '../backups/latest_backup.json');
    console.log("=== STARTING CHURCH FINANCE DATABASE RESTORE ===");
    console.log(`Using backup file: ${targetFile}`);

    if (!fs.existsSync(targetFile)) {
        console.error(`❌ Backup file not found: ${targetFile}`);
        process.exit(1);
    }

    try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        const backupData = JSON.parse(raw);

        if (!backupData.tables || typeof backupData.tables !== 'object') {
            throw new Error("Invalid backup format: 'tables' object missing.");
        }

        console.log(`Backup Timestamp: ${backupData.timestamp || 'Unknown'}`);
        const tableNames = Object.keys(backupData.tables);
        console.log(`Tables to restore (${tableNames.length}):`, tableNames.join(', '));

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const tableName of tableNames) {
                const rows = backupData.tables[tableName];
                if (!Array.isArray(rows)) continue;

                // Clear table before inserting restored rows
                await client.query(`DELETE FROM "${tableName}"`);

                if (rows.length > 0) {
                    const columns = Object.keys(rows[0]);
                    const colNames = columns.map(c => `"${c}"`).join(', ');

                    for (const row of rows) {
                        const values = columns.map(c => row[c]);
                        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
                        await client.query(
                            `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`,
                            values
                        );
                    }
                }
                console.log(`  - Restored ${rows.length} row(s) to table '${tableName}'.`);
            }

            await client.query('COMMIT');
            console.log("\n=======================================================");
            console.log(`✅ DATABASE RESTORED SUCCESSFULLY FROM BACKUP!`);
            console.log("=======================================================\n");
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Restore failed:", err);
        process.exit(1);
    }
}

restoreBackup();
