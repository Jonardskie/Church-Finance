// File: controllers/collectionController.js
const pool = require("../Database/db");

// GET ALL COLLECTIONS
exports.getCollections = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM collections ORDER BY date DESC, id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW COLLECTION
exports.createCollection = async (req, res) => {
    const { date, member, type, fund, amount, status } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO collections (date, member_name, type, fund_category, amount, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [date, member, type, fund, amount, status]
        );
        res.json({ message: "Collection recorded", data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// VERIFY COLLECTION STATUS
exports.verifyCollection = async (req, res) => {
    try {
        await pool.query("UPDATE collections SET status = 'verified' WHERE id = $1", [req.params.id]);
        res.json({ message: "Collection verified successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE COLLECTION
exports.deleteCollection = async (req, res) => {
    try {
        await pool.query("DELETE FROM collections WHERE id = $1", [req.params.id]);
        res.json({ message: "Collection deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW COLLECTION
exports.createCollection = async (req, res) => {
    // These keys must match the property names in your frontend 'payload'
    const { date, member_id, member_name, type, fund, amount, status } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO collections (
                date, 
                collection_date, 
                member_id, 
                member_name, 
                type, 
                fund_category, 
                amount, 
                status
            ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [date, member_id, member_name, type, fund, amount, status]
        );
        res.json({ message: "Collection recorded", data: result.rows[0] });
    } catch (err) {
        console.error("❌ CREATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// GET COLLECTIONS BY MEMBER ID
exports.getCollectionsByMember = async (req, res) => {
    const member_id = req.params.member_id;
    try {
        // Querying using the exact column name 'member_id'
        const result = await pool.query(
            "SELECT * FROM collections WHERE member_id = $1 ORDER BY collection_date DESC", 
            [member_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("❌ CRASHED IN getCollectionsByMember:", err.message); 
        res.status(500).json({ error: err.message });
    }
};