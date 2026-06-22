const db = require("../config/db");

exports.getAll = (cb) => {
    db.all("SELECT * FROM members ORDER BY id DESC", [], cb);
};

exports.create = (data, cb) => {
    db.run(
        `INSERT INTO members 
        (member_id, official_name, phone, address, role, status, join_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            data.member_id,
            data.official_name,
            data.phone,
            data.address,
            data.role,
            data.status,
            data.join_date
        ],
        cb
    );
};

exports.update = (id, data, cb) => {
    db.run(
        `UPDATE members SET
        official_name=?,
        phone=?,
        address=?,
        role=?,
        status=?
        WHERE id=?`,
        [
            data.official_name,
            data.phone,
            data.address,
            data.role,
            data.status,
            id
        ],
        cb
    );
};

exports.remove = (id, cb) => {
    db.run("DELETE FROM members WHERE id=?", [id], cb);
};