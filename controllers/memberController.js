const pool = require("../config/db");
const generateMemberId = require("../utils/memberIdGenerator");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");

// 🔥 Helpers to prevent database crashes on empty text boxes or dropdowns
const cleanDate = (dateString) => (dateString && dateString.trim() !== "") ? dateString : null;
const cleanChoice = (val) => (val && val.trim() !== "") ? val : null;

// GET ALL
exports.getMembers = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM members ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ONE
exports.getMemberById = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM members WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE WITH AUTO ID & ALL NEW FIELDS
exports.createMember = async (req, res) => {
    const { 
        member_id, official_name, phone, address, role, status, join_date, login_id, password,
        gender, name_1, gov_id, name_2, marital_status, dob, occupation, education, hobbies, tel_2, email, baptist_date 
    } = req.body;
    
    try {
        const finalMemberId = member_id || await generateMemberId(pool); 
        const finalLoginId = login_id || finalMemberId;

        const insertMemberQuery = `
            INSERT INTO members (
                member_id, official_name, phone, address, role, status, join_date, login_id,
                gender, name_1, gov_id, name_2, marital_status, dob, occupation, education, hobbies, tel_2, email, baptist_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id;
        `;
        
        // Notice we are wrapping gender and marital_status in cleanChoice()
        const memberValues = [
            finalMemberId, official_name, phone, address, role, status || "Active", 
            cleanDate(join_date) || new Date().toISOString().split('T')[0], finalLoginId,
            cleanChoice(gender), name_1, gov_id, name_2, cleanChoice(marital_status), cleanDate(dob), occupation, education, hobbies, tel_2, email, cleanDate(baptist_date)
        ];
        
        const result = await pool.query(insertMemberQuery, memberValues);

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
                [finalLoginId, hashedPassword, role || "member", official_name]
            );
        }

        res.json({ message: "Member created successfully", id: result.rows[0].id, member_id: finalMemberId });
    } catch (err) {
        console.error("❌ CREATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// UPDATE WITH ALL NEW FIELDS
exports.updateMember = async (req, res) => {
    const id = req.params.id;
    const { 
        official_name, phone, address, role, status, join_date, login_id, password,
        gender, name_1, gov_id, name_2, marital_status, dob, occupation, education, hobbies, tel_2, email, baptist_date 
    } = req.body;
    
    try {
        let formattedRole = role || "member";
        if (formattedRole.toLowerCase() === "admin") formattedRole = "Admin";
        else if (formattedRole.toLowerCase() === "pastor") formattedRole = "Pastor";
        else if (formattedRole.toLowerCase() === "secretary") formattedRole = "Secretary";
        else if (formattedRole.toLowerCase() === "treasurer") formattedRole = "Treasurer";

        const updateQuery = `
            UPDATE members 
            SET official_name = $1, phone = $2, address = $3, role = $4, status = $5, join_date = $6, login_id = $7,
                gender = $8, name_1 = $9, gov_id = $10, name_2 = $11, marital_status = $12, dob = $13, 
                occupation = $14, education = $15, hobbies = $16, tel_2 = $17, email = $18, baptist_date = $19
            WHERE id = $20
        `;
        
        const values = [
            official_name, phone, address, formattedRole, status, cleanDate(join_date) || new Date().toISOString().split('T')[0], login_id,
            cleanChoice(gender), name_1, gov_id, name_2, cleanChoice(marital_status), cleanDate(dob), occupation, education, hobbies, tel_2, email, cleanDate(baptist_date),
            id
        ];
        
        await pool.query(updateQuery, values);

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            const userCheck = await pool.query("SELECT * FROM users WHERE username = $1", [login_id]);
            if (userCheck.rows.length > 0) {
                await pool.query("UPDATE users SET password = $1, role = $2 WHERE username = $3", [hashedPassword, formattedRole, login_id]);
            } else {
                await pool.query("INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)", [login_id, hashedPassword, formattedRole, official_name]);
            }
        }

        res.json({ message: "Updated successfully" });
    } catch (err) {
        console.error("❌ UPDATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteMember = async (req, res) => {
    try {
        const member = await pool.query("SELECT login_id FROM members WHERE id = $1", [req.params.id]);
        await pool.query("DELETE FROM members WHERE id = $1", [req.params.id]);
        
        if (member.rows.length > 0 && member.rows[0].login_id) {
            await pool.query("DELETE FROM users WHERE username = $1", [member.rows[0].login_id]);
        }
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// EXCEL IMPORT
exports.importMembers = async (req, res) => {
    if (!req.files || !req.files.excelFile) return res.status(400).json({ message: "No file uploaded." });
    const file = req.files.excelFile;
    try {
        const workbook = XLSX.read(file.data, { type: "buffer" });
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let processedCount = 0;
        
        for (const row of sheetData) {
            const official_name = row["Full Name"] || row["Official Name"];
            const phone = row["Contact Number"] || row["Phone"];
            const address = row["Address"];
            const role = row["Role"] || "member";
            const status = row["Status"] || "Active";
            const join_date = row["Join Date"] || new Date().toISOString().split('T')[0];
            
            const gender = row["Gender"] === "Male" || row["Gender"] === "Female" ? row["Gender"] : null;
            const marital_status = ["Single", "Married", "Widowed"].includes(row["Marital Status"]) ? row["Marital Status"] : null;

            if (!official_name || !address) continue;
            
            const member_id = await generateMemberId(pool);
            const defaultPassword = await bcrypt.hash("123456", 10); 
            
            await pool.query(
                `INSERT INTO members (
                    member_id, official_name, phone, address, role, status, join_date, login_id, gender, marital_status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [member_id, official_name, phone, address, role, status, join_date, member_id, gender, marital_status]
            );
            
            await pool.query(
                "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
                [member_id, defaultPassword, role, official_name]
            );
            
            processedCount++;
        }
        res.json({ message: `Imported ${processedCount} members successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};