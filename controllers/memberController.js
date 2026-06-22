const pool = require("../Database/db");
const generateMemberId = require("../utils/memberIdGenerator");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs"); // 🔥 Added bcrypt to secure the passwords

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

// CREATE WITH AUTO ID & USER LOGIN
exports.createMember = async (req, res) => {
    // 🔥 Now extracting member_id, login_id, and password from the frontend
    const { member_id, official_name, phone, address, role, status, join_date, login_id, password } = req.body;
    
    try {
        // Use the frontend-generated member_id if provided, otherwise generate a fallback
        const finalMemberId = member_id || await generateMemberId(pool); 
        const finalLoginId = login_id || finalMemberId;

        // 1. Insert into the MEMBERS table
        const insertMemberQuery = `
            INSERT INTO members (member_id, official_name, phone, address, role, status, join_date, login_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id;
        `;
        const memberValues = [finalMemberId, official_name, phone, address, role, status || "Active", join_date, finalLoginId];
        const result = await pool.query(insertMemberQuery, memberValues);

        // 2. Insert into the USERS table (So they can actually log in!)
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Note: We use finalLoginId as their 'username' in the users table
            await pool.query(
                "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
                [finalLoginId, hashedPassword, role || "member", official_name]
            );
        }

        res.json({
            message: "Member and Login created successfully",
            id: result.rows[0].id,
            member_id: finalMemberId
        });
    } catch (err) {
        console.error("❌ CREATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// UPDATE WITH SAFE DATES, ROLES, & OPTIONAL PASSWORD RESET
exports.updateMember = async (req, res) => {
    const id = req.params.id;
    const { official_name, phone, address, role, status, join_date, login_id, password } = req.body;
    
    try {
        let formattedRole = role || "member";
        if (formattedRole.toLowerCase() === "admin") formattedRole = "Admin";
        else if (formattedRole.toLowerCase() === "pastor") formattedRole = "Pastor";
        else if (formattedRole.toLowerCase() === "secretary") formattedRole = "Secretary";
        else if (formattedRole.toLowerCase() === "treasurer") formattedRole = "Treasurer";

        const validatedDate = (join_date && join_date.trim() !== "") ? join_date : new Date().toISOString().split('T')[0];

        // 1. Update the MEMBERS table
        const updateQuery = `
            UPDATE members 
            SET official_name = $1, phone = $2, address = $3, role = $4, status = $5, join_date = $6, login_id = $7 
            WHERE id = $8
        `;
        const values = [official_name, phone, address, formattedRole, status, validatedDate, login_id, id];
        await pool.query(updateQuery, values);

        // 2. Update the USERS table if they typed a NEW password
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            // Check if the user exists in the users table first
            const userCheck = await pool.query("SELECT * FROM users WHERE username = $1", [login_id]);
            
            if (userCheck.rows.length > 0) {
                // Update existing login
                await pool.query(
                    "UPDATE users SET password = $1, role = $2 WHERE username = $3",
                    [hashedPassword, formattedRole, login_id]
                );
            } else {
                // Create login if it was missing
                await pool.query(
                    "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
                    [login_id, hashedPassword, formattedRole, official_name]
                );
            }
        }

        res.json({ message: "Updated successfully" });
    } catch (err) {
        console.error("❌ UPDATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// DELETE (Will cascade or delete from members)
exports.deleteMember = async (req, res) => {
    try {
        // Fetch the login_id before we delete the member so we can delete their login too
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

            if (!official_name || !address) continue;
            
            const member_id = await generateMemberId(pool);
            const defaultPassword = await bcrypt.hash("123456", 10); // Default password for excel imports
            
            await pool.query(
                "INSERT INTO members (member_id, official_name, phone, address, role, status, join_date, login_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                [member_id, official_name, phone, address, role, status, join_date, member_id]
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