// File: controllers/collectionTypeController.js
const pool = require("../config/db");

// GET ALL
exports.getTypes = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM collection_types ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE
exports.createType = async (req, res) => {
    const { name, description, status } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO collection_types (name, description, status) VALUES ($1, $2, $3) RETURNING *",
            [name, description, status]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE (EDIT)
exports.updateType = async (req, res) => {
    const { name, description, status } = req.body;
    try {
        await pool.query(
            "UPDATE collection_types SET name = $1, description = $2, status = $3 WHERE id = $4",
            [name, description, status, req.params.id]
        );
        res.json({ message: "Updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteType = async (req, res) => {
    try {
        await pool.query("DELETE FROM collection_types WHERE id = $1", [req.params.id]);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};