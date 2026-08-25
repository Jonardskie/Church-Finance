const pool = require("../config/db");
const generateMemberId = require("../utils/memberIdGenerator");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");

// ==========================================
// HELPERS
// ==========================================

const cleanDate = (dateString) =>
    dateString && dateString.trim() !== "" ? dateString : null;

const cleanChoice = (val) =>
    val && val.trim() !== "" ? val : null;

const normalizeDateValue = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") {
        return null;
    }

    if (value instanceof Date && !isNaN(value)) {
        return value.toISOString().split("T")[0];
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const parsed = XLSX.SSF.parse_date_code(value);

        if (parsed) {
            const year = parsed.y || 1900;
            const month = (parsed.m || 0) + 1;
            const day = parsed.d || 1;
            const date = new Date(year, month - 1, day);

            if (!isNaN(date)) {
                return date.toISOString().split("T")[0];
            }
        }
    }

    const raw = String(value).trim();

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
        const [year, month, day] = raw.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date)) {
            return date.toISOString().split("T")[0];
        }
    }

    const match = raw.match(/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s+\d{1,2}:\d{2}(:\d{2})?)?$/);

    if (!match) {
        return null;
    }

    const parts = raw.replace(" ", " ").split(/[/-]/);
    let first = Number(parts[0]);
    let second = Number(parts[1]);
    let year = Number(parts[2]);

    if (year < 100) {
        year += 2000;
    }

    let day;
    let month;

    if (first > 12 && second <= 12) {
        day = first;
        month = second;
    } else if (second > 12 && first <= 12) {
        month = first;
        day = second;
    } else if (first <= 31 && second <= 12) {
        day = first;
        month = second;
    } else {
        month = first;
        day = second;
    }

    const date = new Date(year, month - 1, day);

    if (!isNaN(date.getTime()) &&
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day) {
        return date.toISOString().split("T")[0];
    }

    return null;
};


// ==========================================
// GET ALL MEMBERS
// ==========================================

exports.getMembers = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM members ORDER BY id DESC"
        );

        res.json(result.rows);

    } catch (err) {
        console.error("❌ GET MEMBERS ERROR:", err.message);

        res.status(500).json({
            error: err.message
        });
    }
};


// ==========================================
// GET ONE MEMBER
// ==========================================

exports.getMemberById = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM members WHERE id = $1",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error("❌ GET MEMBER ERROR:", err.message);

        res.status(500).json({
            error: err.message
        });
    }
};


// ==========================================
// CREATE MEMBER
// ==========================================

exports.createMember = async (req, res) => {

    const {
        member_id,
        official_name,
        phone,
        address,
        role,
        status,
        join_date,
        login_id,
        password,
        gender,
        name_1,
        gov_id,
        name_2,
        marital_status,
        dob,
        occupation,
        education,
        hobbies,
        tel_2,
        email,
        baptist_date
    } = req.body;

    try {

        const finalMemberId =
            member_id || await generateMemberId(pool);

        const finalLoginId =
            login_id || finalMemberId;


        const insertMemberQuery = `
            INSERT INTO members (
                member_id,
                official_name,
                phone,
                address,
                role,
                status,
                join_date,
                login_id,
                gender,
                name_1,
                gov_id,
                name_2,
                marital_status,
                dob,
                occupation,
                education,
                hobbies,
                tel_2,
                email,
                baptist_date
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
            )
            RETURNING id;
        `;


        const memberValues = [

            finalMemberId,

            official_name,

            phone,

            address,

            role || "member",

            status || "Active",

            cleanDate(join_date) ||
                new Date().toISOString().split("T")[0],

            finalLoginId,

            cleanChoice(gender),

            name_1,

            gov_id,

            name_2,

            cleanChoice(marital_status),

            cleanDate(dob),

            occupation,

            education,

            hobbies,

            tel_2,

            email,

            cleanDate(baptist_date)

        ];


        const result = await pool.query(
            insertMemberQuery,
            memberValues
        );


        // ==========================================
        // CREATE LOGIN ACCOUNT
        // ==========================================

        if (password && password.trim() !== "") {

            const hashedPassword =
                await bcrypt.hash(password, 10);


            await pool.query(
                `
                INSERT INTO users
                (username, password, role, name)
                VALUES ($1, $2, $3, $4)
                `,
                [
                    finalLoginId,
                    hashedPassword,
                    role || "member",
                    official_name
                ]
            );
        }


        res.json({
            message: "Member created successfully",
            id: result.rows[0].id,
            member_id: finalMemberId
        });


    } catch (err) {

        console.error(
            "❌ CREATE MEMBER ERROR:",
            err.message
        );

        res.status(500).json({
            error: err.message
        });
    }
};


// ==========================================
// UPDATE MEMBER
// ==========================================

exports.updateMember = async (req, res) => {

    const id = req.params.id;

    const {
        official_name,
        phone,
        address,
        role,
        status,
        join_date,
        login_id,
        password,
        gender,
        name_1,
        gov_id,
        name_2,
        marital_status,
        dob,
        occupation,
        education,
        hobbies,
        tel_2,
        email,
        baptist_date
    } = req.body;


    try {

        // ==========================================
        // NORMALIZE ROLE
        // ==========================================

        let formattedRole = role || "member";

        if (formattedRole.toLowerCase() === "admin") {
            formattedRole = "Admin";

        } else if (formattedRole.toLowerCase() === "pastor") {
            formattedRole = "Pastor";

        } else if (formattedRole.toLowerCase() === "secretary") {
            formattedRole = "Secretary";

        } else if (formattedRole.toLowerCase() === "treasurer") {
            formattedRole = "Treasurer";

        } else {
            formattedRole = "member";
        }


        // ==========================================
        // UPDATE MEMBER
        // ==========================================

        const updateQuery = `
            UPDATE members
            SET
                official_name = $1,
                phone = $2,
                address = $3,
                role = $4,
                status = $5,
                join_date = $6,
                login_id = $7,
                gender = $8,
                name_1 = $9,
                gov_id = $10,
                name_2 = $11,
                marital_status = $12,
                dob = $13,
                occupation = $14,
                education = $15,
                hobbies = $16,
                tel_2 = $17,
                email = $18,
                baptist_date = $19
            WHERE id = $20
        `;


        const values = [

            official_name,

            phone,

            address,

            formattedRole,

            status || "Active",

            cleanDate(join_date) ||
                new Date().toISOString().split("T")[0],

            login_id,

            cleanChoice(gender),

            name_1,

            gov_id,

            name_2,

            cleanChoice(marital_status),

            cleanDate(dob),

            occupation,

            education,

            hobbies,

            tel_2,

            email,

            cleanDate(baptist_date),

            id

        ];


        await pool.query(
            updateQuery,
            values
        );


        // ==========================================
        // UPDATE / CREATE LOGIN ACCOUNT
        // ==========================================

        if (password && password.trim() !== "") {

            const hashedPassword =
                await bcrypt.hash(password, 10);


            const userCheck = await pool.query(
                "SELECT * FROM users WHERE username = $1",
                [login_id]
            );


            if (userCheck.rows.length > 0) {

                await pool.query(
                    `
                    UPDATE users
                    SET
                        password = $1,
                        role = $2,
                        name = $3
                    WHERE username = $4
                    `,
                    [
                        hashedPassword,
                        formattedRole,
                        official_name,
                        login_id
                    ]
                );

            } else {

                await pool.query(
                    `
                    INSERT INTO users
                    (username, password, role, name)
                    VALUES ($1,$2,$3,$4)
                    `,
                    [
                        login_id,
                        hashedPassword,
                        formattedRole,
                        official_name
                    ]
                );
            }
        }


        res.json({
            message: "Updated successfully"
        });


    } catch (err) {

        console.error(
            "❌ UPDATE MEMBER ERROR:",
            err.message
        );

        res.status(500).json({
            error: err.message
        });
    }
};


// ==========================================
// DELETE ONE MEMBER
// ==========================================

exports.deleteMember = async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        // Get login ID first
        const member = await client.query(
            `
            SELECT login_id
            FROM members
            WHERE id = $1
            `,
            [req.params.id]
        );


        // Delete member
        await client.query(
            `
            DELETE FROM members
            WHERE id = $1
            `,
            [req.params.id]
        );


        // Delete associated user account
        if (
            member.rows.length > 0 &&
            member.rows[0].login_id
        ) {

            await client.query(
                `
                DELETE FROM users
                WHERE username = $1
                `,
                [member.rows[0].login_id]
            );
        }


        await client.query("COMMIT");


        res.json({
            message: "Deleted successfully"
        });


    } catch (err) {

        await client.query("ROLLBACK");

        console.error(
            "❌ DELETE MEMBER ERROR:",
            err.message
        );

        res.status(500).json({
            error: err.message
        });

    } finally {

        client.release();
    }
};


// ==========================================
// 🔥 BATCH DELETE MEMBERS
// ==========================================

exports.deleteMembersBatch = async (req, res) => {

    const { ids } = req.body;


    // ==========================================
    // VALIDATE IDS
    // ==========================================

    if (!Array.isArray(ids) || ids.length === 0) {

        return res.status(400).json({
            success: false,
            message: "No members selected."
        });
    }


    // Convert IDs to numbers
    const memberIds = ids
        .map(id => Number(id))
        .filter(id => Number.isInteger(id));


    if (memberIds.length === 0) {

        return res.status(400).json({
            success: false,
            message: "Invalid member IDs."
        });
    }


    const client = await pool.connect();


    try {

        await client.query("BEGIN");


        // ==========================================
        // GET LOGIN IDS
        // ==========================================

        const memberResult = await client.query(
            `
            SELECT login_id
            FROM members
            WHERE id = ANY($1::int[])
            `,
            [memberIds]
        );


        const loginIds = memberResult.rows
            .map(row => row.login_id)
            .filter(
                loginId =>
                    loginId !== null &&
                    loginId !== undefined &&
                    loginId !== ""
            );


        // ==========================================
        // DELETE MEMBERS
        // ==========================================

        const deleteResult = await client.query(
            `
            DELETE FROM members
            WHERE id = ANY($1::int[])
            `,
            [memberIds]
        );


        // ==========================================
        // DELETE ASSOCIATED USER ACCOUNTS
        // ==========================================

        if (loginIds.length > 0) {

            await client.query(
                `
                DELETE FROM users
                WHERE username = ANY($1::text[])
                `,
                [loginIds]
            );
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await client.query("COMMIT");


        res.json({

            success: true,

            message:
                `${deleteResult.rowCount} member(s) deleted successfully.`,

            deletedCount:
                deleteResult.rowCount

        });


    } catch (err) {

        await client.query("ROLLBACK");


        console.error(
            "❌ BATCH DELETE ERROR:",
            err
        );


        res.status(500).json({

            success: false,

            message: "Batch delete failed.",

            error: err.message

        });


    } finally {

        client.release();
    }
};


// ==========================================
// EXCEL IMPORT
// ==========================================

exports.importMembers = async (req, res) => {
    const uploadedFile =
        req.files &&
        (req.files.excelFile || req.files.file || req.files.membersFile);

    if (!uploadedFile) {
        return res.status(400).json({
            message: "No file uploaded."
        });
    }

    try {
        const workbook = XLSX.read(
            uploadedFile.data,
            {
                type: "buffer"
            }
        );

        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];

        if (!sheet) {
            return res.status(400).json({
                message: "No worksheet found in the uploaded Excel file."
            });
        }

        const normalizeHeader = (value) =>
            String(value || "")
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .trim();

        const getCellValue = (row, keys) => {
            const normalizedRow = {};

            Object.entries(row || {}).forEach(([key, value]) => {
                normalizedRow[normalizeHeader(key)] = value;
            });

            for (const key of keys) {
                const matchedValue = normalizedRow[normalizeHeader(key)];
                if (matchedValue !== undefined && matchedValue !== null && String(matchedValue).trim() !== "") {
                    return matchedValue;
                }
            }

            return null;
        };

        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
            return res.status(400).json({
                message: "The uploaded Excel file has no rows to import."
            });
        }

        let processedCount = 0;

        for (const row of rawRows) {
            const isCompletelyEmptyRow =
                Object.values(row || {}).every(
                    value => String(value ?? "").trim() === ""
                );

            if (isCompletelyEmptyRow) {
                continue;
            }

            const official_name =
                String(
                    getCellValue(row, ["full name", "official name", "member name", "name"]) ?? ""
                ).trim();

            const phone =
                String(
                    getCellValue(row, ["contact number", "phone", "mobile number", "tel", "telephone"]) ?? ""
                ).trim();

            const address =
                String(
                    getCellValue(row, ["address", "residential address"]) ?? ""
                ).trim();

            const role =
                String(getCellValue(row, ["role"]) ?? "").trim() || "member";

            const status =
                String(getCellValue(row, ["status"]) ?? "").trim() || "Active";

            const join_date =
                normalizeDateValue(
                    getCellValue(row, ["join date", "date joined", "joined date"]) ?? ""
                ) || new Date().toISOString().split("T")[0];

            const genderRaw =
                getCellValue(row, ["gender"]);

            const gender =
                typeof genderRaw === "string" &&
                ["male", "female"].includes(genderRaw.trim().toLowerCase())
                    ? genderRaw.trim().charAt(0).toUpperCase() + genderRaw.trim().slice(1).toLowerCase()
                    : null;

            const maritalStatusRaw =
                getCellValue(row, ["marital status"]);

            const marital_status =
                ["single", "married", "widowed"].includes(
                    String(maritalStatusRaw || "").trim().toLowerCase()
                )
                    ? String(maritalStatusRaw).trim()
                    : null;

            const member_id = await generateMemberId(pool);
            const defaultPassword = await bcrypt.hash("123456", 10);

            await pool.query(
                `
                INSERT INTO members (
                    member_id,
                    official_name,
                    phone,
                    address,
                    role,
                    status,
                    join_date,
                    login_id,
                    gender,
                    marital_status
                )
                VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10
                )
                `,
                [
                    member_id,
                    official_name,
                    phone,
                    address,
                    role,
                    status,
                    join_date,
                    member_id,
                    gender,
                    marital_status
                ]
            );

            await pool.query(
                `
                INSERT INTO users
                (username, password, role, name)
                VALUES ($1,$2,$3,$4)
                `,
                [
                    member_id,
                    defaultPassword,
                    role,
                    official_name
                ]
            );

            processedCount++;
        }

        if (processedCount === 0) {
            return res.status(400).json({
                message: "No valid member rows were found in the Excel file."
            });
        }

        res.json({
            message: `Imported ${processedCount} members successfully.`
        });

    } catch (err) {
        console.error("❌ IMPORT MEMBERS ERROR:", err.message);
        res.status(500).json({
            error: err.message
        });
    }
};