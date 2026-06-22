async function generateMemberId(pool) {
    const currentYear = new Date().getFullYear();
    try {
        const selectResult = await pool.query(
            "SELECT counter FROM member_counters WHERE year = $1",
            [currentYear]
        );
        let nextCounter = 1;
        if (selectResult.rows.length > 0) {
            nextCounter = selectResult.rows[0].counter + 1;
            await pool.query("UPDATE member_counters SET counter = $1 WHERE year = $2", [nextCounter, currentYear]);
        } else {
            await pool.query("INSERT INTO member_counters (year, counter) VALUES ($1, $2)", [currentYear, nextCounter]);
        }
        const paddedCounter = String(nextCounter).padStart(4, "0");
        return `CFMMS-${currentYear}-${paddedCounter}`;
    } catch (err) {
        console.error("ID Generator Error:", err.message);
        throw err;
    }
}
module.exports = generateMemberId;