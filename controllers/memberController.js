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
        middle_name,
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
            finalMemberId;

        // Auto-construct official_name if not directly provided
        const finalOfficialName = official_name || [name_1, middle_name, name_2].filter(Boolean).join(" ");

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
                middle_name,
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
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
            )
            RETURNING id;
        `;


        const memberValues = [

            finalMemberId,

            finalOfficialName,

            phone,

            address,

            role || "member",

            status || "Active",

            cleanDate(join_date) ||
                new Date().toISOString().split("T")[0],

            finalLoginId,

            cleanChoice(gender),

            name_1,

            middle_name || null,

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
        // CREATE / SYNC LOGIN ACCOUNT
        // ==========================================

        const plainPassword = (password && password.trim() !== "") ? password.trim() : "password123";
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const assignedRole = (role && role.trim() !== "") ? role.trim() : "Member";

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
            [finalLoginId]
        );

        if (existingUser.rows.length > 0) {
            await pool.query(
                `
                UPDATE users
                SET role = $1, name = $2
                WHERE LOWER(username) = LOWER($3)
                `,
                [assignedRole, finalOfficialName, finalLoginId]
            );
        } else {
            await pool.query(
                `
                INSERT INTO users (username, password, role, name)
                VALUES ($1, $2, $3, $4)
                `,
                [finalLoginId, hashedPassword, assignedRole, finalOfficialName]
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
        middle_name,
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

        const existingMemberResult = await pool.query(
            "SELECT member_id, login_id FROM members WHERE id = $1",
            [id]
        );

        if (existingMemberResult.rows.length === 0) {
            return res.status(404).json({
                error: "Member not found."
            });
        }

        const existingMember = existingMemberResult.rows[0];
        const memberLoginId = existingMember.member_id;

        // Auto-construct official_name if not explicitly set
        const finalOfficialName = official_name || [name_1, middle_name, name_2].filter(Boolean).join(" ");

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
                middle_name = $10,
                gov_id = $11,
                name_2 = $12,
                marital_status = $13,
                dob = $14,
                occupation = $15,
                education = $16,
                hobbies = $17,
                tel_2 = $18,
                email = $19,
                baptist_date = $20
            WHERE id = $21
        `;


        const values = [

            finalOfficialName,

            phone,

            address,

            formattedRole,

            status || "Active",

            cleanDate(join_date) ||
                new Date().toISOString().split("T")[0],

            memberLoginId,

            cleanChoice(gender),

            name_1,

            middle_name || null,

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
        // ALWAYS SYNC USER LOGIN ACCOUNT & ROLE
        // ==========================================

        const userCheck = await pool.query(
            "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
            [memberLoginId]
        );

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);

            if (userCheck.rows.length > 0) {
                await pool.query(
                    `
                    UPDATE users
                    SET password = $1, role = $2, name = $3
                    WHERE LOWER(username) = LOWER($4)
                    `,
                    [hashedPassword, formattedRole, finalOfficialName, memberLoginId]
                );
            } else {
                await pool.query(
                    `
                    INSERT INTO users (username, password, role, name)
                    VALUES ($1, $2, $3, $4)
                    `,
                    [memberLoginId, hashedPassword, formattedRole, finalOfficialName]
                );
            }
        } else {
            // Password omitted: Always update role & official name in users table
            if (userCheck.rows.length > 0) {
                await pool.query(
                    `
                    UPDATE users
                    SET role = $1, name = $2
                    WHERE LOWER(username) = LOWER($3)
                    `,
                    [formattedRole, finalOfficialName, memberLoginId]
                );
            } else {
                // If user login account doesn't exist yet, create with default password
                const defaultPasswordHash = await bcrypt.hash("password123", 10);
                await pool.query(
                    `
                    INSERT INTO users (username, password, role, name)
                    VALUES ($1, $2, $3, $4)
                    `,
                    [memberLoginId, defaultPasswordHash, formattedRole, finalOfficialName]
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
// ==========================================
// DELETE ONE MEMBER
// ==========================================

exports.deleteMember = async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        // Get login ID / member ID first
        const member = await client.query(
            `
            SELECT login_id, member_id
            FROM members
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (member.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Member not found"
            });
        }

        const loginId = member.rows[0].login_id || member.rows[0].member_id;


        // Delete member
        await client.query(
            `
            DELETE FROM members
            WHERE id = $1
            `,
            [req.params.id]
        );


        // Delete associated user account
        if (loginId) {
            await client.query(
                `
                DELETE FROM users
                WHERE LOWER(username) = LOWER($1)
                `,
                [loginId]
            );
        }


        await client.query("COMMIT");


        res.json({
            message: "Member deleted successfully."
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
        // GET LOGIN IDS & MEMBER IDS
        // ==========================================

        const memberResult = await client.query(
            `
            SELECT login_id, member_id
            FROM members
            WHERE id = ANY($1::int[])
            `,
            [memberIds]
        );


        const loginIds = memberResult.rows
            .map(row => row.login_id || row.member_id)
            .filter(Boolean);


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
                WHERE LOWER(username) = ANY(SELECT LOWER(unnest($1::text[])))
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

            const name_1 =
                String(getCellValue(row, ["first name", "given name", "name 1", "firstname", "first_name"]) ?? "").trim();

            const middle_name =
                String(getCellValue(row, ["middle name", "middle initial", "m.i.", "m i", "middlename", "mid name", "middle_name"]) ?? "").trim();

            const name_2 =
                String(getCellValue(row, ["last name", "surname", "family name", "name 2", "lastname", "last_name"]) ?? "").trim();

            let official_name =
                String(
                    getCellValue(row, ["official name", "official_name", "full name", "member name", "name"]) ?? ""
                ).trim();

            if (!official_name && (name_1 || name_2)) {
                official_name = [name_1, middle_name, name_2].filter(Boolean).join(" ");
            }

            const phone =
                String(
                    getCellValue(row, ["phone", "contact number", "mobile number", "tel", "telephone", "tel 1", "tel1"]) ?? ""
                ).trim();

            const address =
                String(
                    getCellValue(row, ["address", "residential address"]) ?? ""
                ).trim();

            const role =
                String(getCellValue(row, ["role", "role setting"]) ?? "").trim() || "member";

            const status =
                String(getCellValue(row, ["status", "membership status"]) ?? "").trim() || "Active";

            const join_date =
                normalizeDateValue(
                    getCellValue(row, ["join date", "join_date", "date joined", "joined date"]) ?? ""
                ) || new Date().toISOString().split("T")[0];

            const genderRaw =
                getCellValue(row, ["gender", "sex"]);

            const gender =
                typeof genderRaw === "string" &&
                ["male", "female"].includes(genderRaw.trim().toLowerCase())
                    ? genderRaw.trim().charAt(0).toUpperCase() + genderRaw.trim().slice(1).toLowerCase()
                    : null;

            const gov_id =
                String(getCellValue(row, ["gov id", "gov_id", "government id", "id number", "passport", "license"]) ?? "").trim();

            const maritalStatusRaw =
                getCellValue(row, ["marital status", "marital_status", "civil status"]);

            const marital_status =
                ["single", "married", "widowed"].includes(
                    String(maritalStatusRaw || "").trim().toLowerCase()
                )
                    ? String(maritalStatusRaw).trim().charAt(0).toUpperCase() + String(maritalStatusRaw).trim().slice(1).toLowerCase()
                    : null;

            const dob =
                normalizeDateValue(
                    getCellValue(row, ["dob", "date of birth", "birthdate", "birthday", "birth date"]) ?? ""
                );

            const occupation =
                String(getCellValue(row, ["occupation", "job", "profession", "work"]) ?? "").trim();

            const education =
                String(getCellValue(row, ["education", "educational attainment", "attainment"]) ?? "").trim();

            const hobbies =
                String(getCellValue(row, ["hobbies", "hobby", "interests"]) ?? "").trim();

            const tel_2 =
                String(getCellValue(row, ["tel 2", "tel_2", "secondary phone", "telephone 2", "emergency contact", "other phone"]) ?? "").trim();

            const email =
                String(getCellValue(row, ["email", "email address", "e-mail"]) ?? "").trim();

            const baptist_date =
                normalizeDateValue(
                    getCellValue(row, ["baptist date", "baptist_date", "baptism date", "date baptized", "baptized date"]) ?? ""
                );

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
                    name_1,
                    middle_name,
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
                    $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
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
                    name_1 || null,
                    middle_name || null,
                    gov_id || null,
                    name_2 || null,
                    marital_status,
                    dob,
                    occupation || null,
                    education || null,
                    hobbies || null,
                    tel_2 || null,
                    email || null,
                    baptist_date
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