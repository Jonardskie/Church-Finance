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