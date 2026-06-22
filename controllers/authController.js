const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

exports.login = async (req, res) => {
    try {
        console.log("==========================================");
        console.log("🔥 INCOMING LOGIN REQUEST ATTEMPT:");
        console.log("Raw Body payload data:", req.body);

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing username or password fields"
            });
        }

        // Clean SQL statement mapping arrays correctly using standard parameters ($1)
        const result = await pool.query(
            "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
            [username.trim()]
        );

        console.log(`Database rows returned matching username: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.warn(`❌ Login Failed: Username '${username}' not found.`);
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const user = result.rows[0];

        // Verify password hash comparison matches safely
        const valid = await bcrypt.compare(password, user.password);
        console.log("Is password verification valid?:", valid);

        if (!valid) {
            console.warn(`❌ Login Failed: Incorrect password for user: ${username}`);
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Make sure the token payload includes the exact role string format
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role || "member"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        console.log("🚀 JWT SESSION TOKEN CREATED SUCCESSFULY");

        return res.json({
            success: true,
            token,
            role: user.role || "member",
            username: user.username
        });

    } catch (err) {
        console.error("❌ CRITICAL AUTH WORKFLOW CRASH ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Server internal error",
            error: err.message
        });
    }
};