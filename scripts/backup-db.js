const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function createBackup() {
    console.log("=== STARTING CHURCH FINANCE FULL DATABASE BACKUP ===");
    try {
        // Ensure backups folder exists
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Get all user tables in current database schema
        const tablesRes = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        const tableNames = tablesRes.rows.map(r => r.table_name);
        console.log(`Found ${tableNames.length} database tables:`, tableNames.join(', '));

        const backupData = {
            timestamp: new Date().toISOString(),
            church: "Maui United Methodist Church",
            tables: {}
        };

        for (const tableName of tableNames) {
            const rowRes = await pool.query(`SELECT * FROM "${tableName}"`);
            backupData.tables[tableName] = rowRes.rows;
            console.log(`  - Table '${tableName}': ${rowRes.rows.length} row(s) backed up.`);
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `church_finance_backup_${dateStr}.json`;
        const filePath = path.join(backupDir, fileName);
        const latestPath = path.join(backupDir, 'latest_backup.json');

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
        fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2));

        console.log("\n=======================================================");
        console.log(`✅ FULL DATABASE BACKUP CREATED SUCCESSFULLY!`);
        console.log(`📁 Backup File Saved To: ${filePath}`);
        console.log(`📁 Latest Backup Alias:  ${latestPath}`);
        console.log("=======================================================\n");

        process.exit(0);
    } catch (err) {
        console.error("❌ Backup failed:", err);
        process.exit(1);
    }
}

createBackup();
