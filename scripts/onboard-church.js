// scripts/onboard-church.js
// Automated Church Database Onboarding CLI Tool

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

// Parse CLI Arguments: e.g. node scripts/onboard-church.js --name="Grace Bible Church" --prefix="GBC"
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith("--")) {
            const [key, val] = arg.slice(2).split("=");
            args[key] = val || true;
        }
    });
    return args;
}

const args = parseArgs();

const config = {
    databaseUrl: args.databaseUrl || args.db || process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL,
    churchName: args.name || "New Church Fellowship",
    churchAcronym: args.acronym || "CHURCH",
    slug: (args.slug || (args.acronym ? args.acronym.toLowerCase().replace(/[^a-z0-9_-]/g, "") : "church")).toLowerCase(),
    memberPrefix: (args.prefix || "MEM").toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
    currencySymbol: args.currency || "₱",
    adminUsername: args.adminUser || "admin",
    adminPassword: args.adminPassword || "ChangeMe123!",
    adminEmail: args.adminEmail || "admin@church.org",
    adminFullName: args.adminName || "System Administrator",
    address: args.address || "",
    phone: args.phone || ""
};

// Standard Default Collection Categories
const DEFAULT_COLLECTION_TYPES = [
    { name: "TITHES", ps_type: "percentage", ps_rate: 10.0, app_type: "percentage", app_rate: 10.0 },
    { name: "PLEDGES", ps_type: "percentage", ps_rate: 10.0, app_type: "percentage", app_rate: 10.0 },
    { name: "SUNDAY SCHOOL OFFERING", ps_type: "none", ps_rate: 0, app_type: "percentage", app_rate: 10.0 },
    { name: "BUILDING FUND OFFERING", ps_type: "none", ps_rate: 0, app_type: "percentage", app_rate: 10.0 },
    { name: "BUILDING FUND WITH PS", ps_type: "percentage", ps_rate: 10.0, app_type: "percentage", app_rate: 10.0 },
    { name: "THANKSGIVING OFFERING", ps_type: "percentage", ps_rate: 10.0, app_type: "percentage", app_rate: 10.0 },
    { name: "DIVINE SERVICE OFFERING", ps_type: "none", ps_rate: 0, app_type: "percentage", app_rate: 10.0 },
    { name: "DIVINE SERVICE WITH PS", ps_type: "percentage", ps_rate: 10.0, app_type: "percentage", app_rate: 10.0 },
    { name: "LORD'S ACRE", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "HARVEST FESTIVAL OFFERING", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "MEMORIAL OFFERING", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "MORNING WATCH OFFERING", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "FAMILY WEEK OFFERING", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "CHRISTMAS PROG. SERVICE", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "GOOD FRIDAY OFFERING", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "YOUTH SUNDAY OFFERING", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "CASH DONATION", ps_type: "percentage", ps_rate: 10.0, app_type: "percentage", app_rate: 10.0 },
    { name: "IN-KIND DONATION", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "REGISTRATION", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 },
    { name: "MISCELLANEOUS INCOME", ps_type: "none", ps_rate: 0, app_type: "none", app_rate: 0 }
];

async function onboardChurch() {
    console.log("===============================================================");
    console.log("⛪ CHURCH FINANCIAL MANAGEMENT SYSTEM — DATABASE ONBOARDING");
    console.log("===============================================================");
    console.log(`Church Name:       ${config.churchName}`);
    console.log(`Acronym:           ${config.churchAcronym}`);
    console.log(`Member Prefix:     ${config.memberPrefix}`);
    console.log(`Currency:          ${config.currencySymbol}`);
    console.log(`Admin Username:    ${config.adminUsername}`);
    console.log("===============================================================\n");

    if (!config.databaseUrl) {
        console.error("❌ ERROR: Missing database connection string.");
        console.error("Please supply --databaseUrl=\"postgres://...\" or set DATABASE_URL in your environment.\n");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. Connect and verify
        console.log("📡 Step 1/5: Connecting to target database...");
        const connTest = await pool.query("SELECT current_database(), current_user, version()");
        console.log(`✅ Connected to DB [${connTest.rows[0].current_database}] as user [${connTest.rows[0].current_user}]\n`);

        // 2. Run schema.sql blueprint
        console.log("🏗️  Step 2/5: Applying Master Blueprint (schema.sql)...");
        const schemaPath = path.resolve(__dirname, "../schema.sql");
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        await pool.query(schemaSql);
        console.log("✅ All 9 tables and performance indexes created successfully.\n");

        // 3. Configure Church Settings
        console.log("🏷️  Step 3/5: Saving Church Organization Profile...");
        await pool.query(
            `INSERT INTO church_settings (id, church_name, church_acronym, member_id_prefix, currency_symbol, email, address, contact_number, updated_at)
             VALUES (1, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE
             SET church_name = EXCLUDED.church_name,
                 church_acronym = EXCLUDED.church_acronym,
                 member_id_prefix = EXCLUDED.member_id_prefix,
                 currency_symbol = EXCLUDED.currency_symbol,
                 email = EXCLUDED.email,
                 address = EXCLUDED.address,
                 contact_number = EXCLUDED.contact_number,
                 updated_at = CURRENT_TIMESTAMP`,
            [
                config.churchName,
                config.churchAcronym,
                config.memberPrefix,
                config.currencySymbol,
                config.adminEmail,
                config.address,
                config.phone
            ]
        );
        console.log(`✅ Organization profile configured: Prefix="${config.memberPrefix}" (e.g. ${config.memberPrefix}-${new Date().getFullYear()}-0001)\n`);

        // 4. Seed Standard Collection Types & Calculations
        console.log("📊 Step 4/5: Seeding default collection types & calculation formulas...");
        for (const item of DEFAULT_COLLECTION_TYPES) {
            const existingType = await pool.query(
                "SELECT id FROM collection_types WHERE UPPER(TRIM(name)) = UPPER(TRIM($1)) LIMIT 1",
                [item.name]
            );

            let typeId;
            if (existingType.rows.length > 0) {
                typeId = existingType.rows[0].id;
                await pool.query(
                    `UPDATE collection_types 
                     SET ps_calculation_type = $1, ps_rate = $2, apportionment_calculation_type = $3, apportionment_rate = $4
                     WHERE id = $5`,
                    [item.ps_type, item.ps_rate, item.app_type, item.app_rate, typeId]
                );
            } else {
                const ins = await pool.query(
                    `INSERT INTO collection_types (name, status, ps_calculation_type, ps_rate, apportionment_calculation_type, apportionment_rate)
                     VALUES ($1, 'Active', $2, $3, $4, $5) RETURNING id`,
                    [item.name, item.ps_type, item.ps_rate, item.app_type, item.app_rate]
                );
                typeId = ins.rows[0].id;
            }

            const psEnum = item.ps_type === "percentage" ? "PERCENTAGE" : "NONE";
            const appEnum = item.app_type === "percentage" ? "PERCENTAGE" : "NONE";

            const existingCalc = await pool.query(
                "SELECT id FROM collection_calculations WHERE collection_type_id = $1 LIMIT 1",
                [typeId]
            );

            if (existingCalc.rows.length > 0) {
                await pool.query(
                    `UPDATE collection_calculations
                     SET collection_type_name = $1, ps_type = $2, ps_rate = $3, apportionment_type = $4, apportionment_rate = $5, active = true, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $6`,
                    [item.name, psEnum, item.ps_rate, appEnum, item.app_rate, existingCalc.rows[0].id]
                );
            } else {
                await pool.query(
                    `INSERT INTO collection_calculations (collection_type_id, collection_type_name, ps_type, ps_rate, apportionment_type, apportionment_rate, active)
                     VALUES ($1, $2, $3, $4, $5, $6, true)`,
                    [typeId, item.name, psEnum, item.ps_rate, appEnum, item.app_rate]
                );
            }
        }
        console.log(`✅ Seeded ${DEFAULT_COLLECTION_TYPES.length} standard collection categories & accounting rules.\n`);

        // 5. Create Initial Super-Admin Account
        console.log("👤 Step 5/5: Provisioning initial Super-Admin account...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(config.adminPassword, salt);

        await pool.query(
            `INSERT INTO users (username, password, role, full_name, name, status, created_at)
             VALUES ($1, $2, 'Admin', $3, $3, 'Active', CURRENT_TIMESTAMP)
             ON CONFLICT (username) DO UPDATE
             SET password = EXCLUDED.password,
                 role = 'Admin',
                 status = 'Active'`,
            [config.adminUsername, hashedPassword, config.adminFullName]
        );

        // Record initialization in audit trail
        await pool.query(
            `INSERT INTO audit_logs (user_name, action_type, table_name, details, created_at)
             VALUES ($1, 'SYSTEM_INIT', 'church_settings', $2, CURRENT_TIMESTAMP)`,
            [
                config.adminUsername,
                `System database onboarded for ${config.churchName} (${config.churchAcronym}). Member prefix set to ${config.memberPrefix}.`
            ]
        );
        console.log(`✅ Super-Admin user [${config.adminUsername}] created.\n`);

        // 6. Register in Master Directory (tenants table)
        console.log("🗂️  Step 6/6: Registering in Master Tenants Directory...");
        const { registerTenant } = require("../config/tenantManager");
        await registerTenant({
            slug: config.slug,
            name: config.churchName,
            databaseUrl: config.databaseUrl,
            status: "active",
            plan: args.plan || "pro"
        });
        console.log(`✅ Church registered in Master Directory with slug: '${config.slug}'.\n`);

        // Summary
        console.log("===============================================================");
        console.log("🎉 ONBOARDING COMPLETED SUCCESSFULLY!");
        console.log("===============================================================");
        console.log(`Church:            ${config.churchName}`);
        console.log(`Portal Slug:       ${config.slug}`);
        console.log(`Portal Acronym:    ${config.churchAcronym}`);
        console.log(`Member ID Format:  ${config.memberPrefix}-${new Date().getFullYear()}-XXXX`);
        console.log(`Login Username:    ${config.adminUsername}`);
        console.log(`Temporary Password:${config.adminPassword}`);
        console.log("===============================================================");
        console.log("⚠️  Reminder: Instruct the pastor/admin to change their password upon first login.\n");

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error("\n❌ ONBOARDING FAILED:", err.message);
        console.error(err.stack);
        await pool.end();
        process.exit(1);
    }
}

onboardChurch();
