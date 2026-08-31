async function generateMemberId(pool) {
    const currentYear = new Date().getFullYear();

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS member_counters (
                year INTEGER PRIMARY KEY,
                counter INTEGER NOT NULL DEFAULT 0
            )
        `);

        const selectResult = await pool.query(
            "SELECT counter FROM member_counters WHERE year = $1",
            [currentYear]
        );

        let nextCounter = 1;

        if (selectResult.rows.length > 0) {
            nextCounter = Number(selectResult.rows[0].counter) + 1;
            await pool.query(
                "UPDATE member_counters SET counter = $1 WHERE year = $2",
                [nextCounter, currentYear]
            );
        } else {
            await pool.query(
                "INSERT INTO member_counters (year, counter) VALUES ($1, $2)",
                [currentYear, nextCounter]
            );
        }

        let prefix = "MUMC";
        try {
            const prefixRes = await pool.query(
                "SELECT member_id_prefix FROM church_settings WHERE id = 1 LIMIT 1"
            );
            if (prefixRes.rows.length > 0 && prefixRes.rows[0].member_id_prefix) {
                prefix = prefixRes.rows[0].member_id_prefix.trim().toUpperCase();
            }
        } catch (prefixErr) {
            // Fallback to default
        }

        const paddedCounter = String(nextCounter).padStart(4, "0");
        return `${prefix}-${currentYear}-${paddedCounter}`;

    } catch (err) {
        console.error("ID Generator Error:", err.message);
        throw err;
    }
}

module.exports = generateMemberId;