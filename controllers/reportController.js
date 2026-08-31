const pool = require("../config/db");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");


// ============================================================
// HELPERS
// ============================================================

function getDateRange(req) {

    const today = new Date();

    const defaultFrom =
        `${today.getFullYear()}-01-01`;

    // Use local date instead of UTC date
    const localToday =
        new Date(
            today.getTime() -
            today.getTimezoneOffset() * 60000
        );

    const defaultTo =
        localToday.toISOString().slice(0, 10);

    return {
        from: req.query.from || defaultFrom,
        to: req.query.to || defaultTo
    };
}


// ============================================================
// VALIDATE DATE
// ============================================================

function isValidDate(value) {

    if (!value) {
        return false;
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}


// ============================================================
// BUILD WHERE
// ============================================================

function buildWhere(from, to, status, memberId) {

    const values = [
        from,
        to
    ];

    let where = `
        COALESCE(
            c.collection_date,
            c.date
        )::date
        BETWEEN $1::date AND $2::date
    `;


    if (
        status &&
        status !== "all"
    ) {

        values.push(status);

        where += `
            AND LOWER(
                COALESCE(
                    c.status,
                    'pending'
                )
            ) = LOWER(
                $${values.length}
            )
        `;
    }

    if (
        memberId &&
        memberId !== "all"
    ) {

        values.push(memberId);

        where += `
            AND c.member_id = $${values.length}
        `;
    }


    return {
        where,
        values
    };
}


// ============================================================
// VALIDATE REQUEST
// ============================================================

function validateRequest(req, res) {

    console.log("🔍 [validateRequest] req.query:", req.query);

    const { from, to } =
        getDateRange(req);


    if (
        !isValidDate(from) ||
        !isValidDate(to)
    ) {

        res.status(400).json({
            error:
                "Invalid report date range."
        });

        return null;
    }


    if (from > to) {

        res.status(400).json({
            error:
                "The From date cannot be later than the To date."
        });

        return null;
    }


    const status =
        req.query.status || "all";

    const memberId =
        req.query.memberId || "all";


    return {
        from,
        to,
        status,
        memberId
    };
}


// ============================================================
// COLLECTION SUMMARY
// ============================================================

exports.collectionSummary = async (req, res) => {

    try {

        const filters =
            validateRequest(
                req,
                res
            );

        if (!filters) {
            return;
        }


        const {
            from,
            to,
            status,
            memberId
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status,
            memberId
        );


        const result =
            await pool.query(
                `
                SELECT

                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    ) AS item,


                    COUNT(
                        DISTINCT NULLIF(
                            c.member_id::text,
                            ''
                        )
                    ) AS members,


                    COUNT(*) AS counts,


                    COALESCE(
                        SUM(
                            COALESCE(
                                c.amount,
                                0
                            )
                        ),
                        0
                    ) AS amount,


                    COALESCE(
                        SUM(
                            CASE
                                WHEN
                                    COALESCE(
                                        c.ps_type,
                                        'NONE'
                                    ) <> 'NONE'
                                THEN
                                    COALESCE(
                                        c.ps_amount,
                                        0
                                    )
                                ELSE
                                    0
                            END
                        ),
                        0
                    ) AS ps,


                    COALESCE(
                        SUM(
                            CASE
                                WHEN
                                    COALESCE(
                                        c.apportionment_type,
                                        'NONE'
                                    ) <> 'NONE'
                                THEN
                                    COALESCE(
                                        c.apportionment_amount,
                                        0
                                    )
                                ELSE
                                    0
                            END
                        ),
                        0
                    ) AS apportionment


                FROM collections c


                WHERE ${where}


                GROUP BY
                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    )


                ORDER BY
                    item ASC
                `,
                values
            );


        const totals =
            result.rows.reduce(
                (acc, row) => {

                    acc.members +=
                        Number(
                            row.members
                        ) || 0;

                    acc.counts +=
                        Number(
                            row.counts
                        ) || 0;

                    acc.amount +=
                        Number(
                            row.amount
                        ) || 0;

                    acc.ps +=
                        Number(
                            row.ps
                        ) || 0;

                    acc.apportionment +=
                        Number(
                            row.apportionment
                        ) || 0;

                    return acc;

                },
                {
                    members: 0,
                    counts: 0,
                    amount: 0,
                    ps: 0,
                    apportionment: 0
                }
            );


        res.json({

            success: true,

            from,

            to,

            status,

            rows:
                result.rows,

            totals

        });


    } catch (err) {

        console.error(
            "COLLECTION SUMMARY ERROR:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Unable to generate collection summary."

        });
    }
};


// ============================================================
// COLLECTION DETAIL
// ============================================================

exports.collectionDetail = async (req, res) => {

    try {

        const filters =
            validateRequest(
                req,
                res
            );

        if (!filters) {
            return;
        }


        const {
            from,
            to,
            status,
            memberId
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status,
            memberId
        );


        const result =
            await pool.query(
                `
                SELECT

                    c.id,


                    c.receipt_no,


                    COALESCE(
                        c.collection_date,
                        c.date
                    )::date AS date,


                    COALESCE(
                        NULLIF(
                            TRIM(
                                c.member_name
                            ),
                            ''
                        ),
                        'ANONYMOUS'
                    ) AS donor,


                    COALESCE(
                        UPPER(
                            NULLIF(
                                TRIM(
                                    c.payment_method
                                ),
                                ''
                            )
                        ),
                        'CASH'
                    ) AS method,


                    COALESCE(
                        c.reference_no,
                        ''
                    ) AS reference_no,


                    INITCAP(
                        COALESCE(
                            c.status,
                            'pending'
                        )
                    ) AS status,


                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    ) AS type,


                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    ) AS item,


                    COALESCE(
                        NULLIF(
                            TRIM(c.target),
                            ''
                        ),
                        NULLIF(
                            TRIM(c.fund_category),
                            ''
                        ),
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        '—'
                    ) AS target,


                    COALESCE(
                        c.amount,
                        0
                    ) AS amount,


                    COALESCE(
                        c.ps_type,
                        'NONE'
                    ) AS ps_type,


                    COALESCE(
                        c.ps_rate,
                        0
                    ) AS ps_rate,


                    CASE
                        WHEN
                            COALESCE(
                                c.ps_type,
                                'NONE'
                            ) = 'NONE'
                        THEN 0
                        ELSE
                            COALESCE(
                                c.ps_amount,
                                0
                            )
                    END AS ps_amount,


                    COALESCE(
                        c.apportionment_type,
                        'NONE'
                    ) AS apportionment_type,


                    COALESCE(
                        c.apportionment_rate,
                        0
                    ) AS apportionment_rate,


                    CASE
                        WHEN
                            COALESCE(
                                c.apportionment_type,
                                'NONE'
                            ) = 'NONE'
                        THEN 0
                        ELSE
                            COALESCE(
                                c.apportionment_amount,
                                0
                            )
                    END AS apportionment_amount


                FROM collections c


                WHERE ${where}


                ORDER BY

                    COALESCE(
                        c.collection_date,
                        c.date
                    ) DESC,

                    c.id DESC
                `,
                values
            );


        res.json({

            success: true,

            from,

            to,

            status,

            rows:
                result.rows

        });


    } catch (err) {

        console.error(
            "COLLECTION DETAIL ERROR:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Unable to generate collection detail."

        });
    }
};


// ============================================================
// COLLECTION METHOD SUMMARY
// ============================================================

exports.collectionMethodSummary = async (
    req,
    res
) => {

    try {

        const filters =
            validateRequest(
                req,
                res
            );

        if (!filters) {
            return;
        }


        const {
            from,
            to,
            status,
            memberId
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status,
            memberId
        );


        const result =
            await pool.query(
                `
                SELECT

                    COALESCE(
                        UPPER(
                            NULLIF(
                                TRIM(
                                    c.payment_method
                                ),
                                ''
                            )
                        ),
                        'CASH'
                    ) AS method,


                    COUNT(*) AS counts,


                    COALESCE(
                        SUM(
                            COALESCE(
                                c.amount,
                                0
                            )
                        ),
                        0
                    ) AS amount


                FROM collections c


                WHERE ${where}


                GROUP BY

                    COALESCE(
                        UPPER(
                            NULLIF(
                                TRIM(
                                    c.payment_method
                                ),
                                ''
                            )
                        ),
                        'CASH'
                    )


                ORDER BY
                    amount DESC
                `,
                values
            );


        res.json({

            success: true,

            from,

            to,

            status,

            rows:
                result.rows

        });


    } catch (err) {

        console.error(
            "METHOD SUMMARY ERROR:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Unable to generate collection method summary."

        });
    }
};


// ============================================================
// EXCEL EXPORT
// ============================================================

exports.exportExcel = async (
    req,
    res
) => {

    try {

        const filters =
            validateRequest(
                req,
                res
            );

        if (!filters) {
            return;
        }


        const {
            from,
            to,
            status,
            memberId
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status,
            memberId
        );


        // ====================================================
        // SUMMARY
        // ====================================================

        const summaryResult =
            await pool.query(
                `
                SELECT

                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    ) AS item,


                    COUNT(
                        DISTINCT NULLIF(
                            c.member_id::text,
                            ''
                        )
                    ) AS members,


                    COUNT(*) AS counts,


                    COALESCE(
                        SUM(
                            COALESCE(
                                c.amount,
                                0
                            )
                        ),
                        0
                    ) AS amount,


                    COALESCE(
                        SUM(
                            CASE
                                WHEN
                                    COALESCE(
                                        c.ps_type,
                                        'NONE'
                                    ) <> 'NONE'
                                THEN
                                    COALESCE(
                                        c.ps_amount,
                                        0
                                    )
                                ELSE
                                    0
                            END
                        ),
                        0
                    ) AS ps,


                    COALESCE(
                        SUM(
                            CASE
                                WHEN
                                    COALESCE(
                                        c.apportionment_type,
                                        'NONE'
                                    ) <> 'NONE'
                                THEN
                                    COALESCE(
                                        c.apportionment_amount,
                                        0
                                    )
                                ELSE
                                    0
                            END
                        ),
                        0
                    ) AS apportionment


                FROM collections c


                WHERE ${where}


                GROUP BY

                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    )


                ORDER BY
                    item ASC
                `,
                values
            );


        // ====================================================
        // DETAIL
        // ====================================================

        const detailResult =
            await pool.query(
                `
                SELECT

                    c.receipt_no AS "Receipt #",


                    COALESCE(
                        c.collection_date,
                        c.date
                    )::date AS "Date",


                    COALESCE(
                        NULLIF(
                            TRIM(
                                c.member_name
                            ),
                            ''
                        ),
                        'ANONYMOUS'
                    ) AS "Donor",


                    COALESCE(
                        UPPER(
                            NULLIF(
                                TRIM(
                                    c.payment_method
                                ),
                                ''
                            )
                        ),
                        'CASH'
                    ) AS "Method",


                    COALESCE(
                        c.reference_no,
                        ''
                    ) AS "Cheque/Ref #",


                    INITCAP(
                        COALESCE(
                            c.status,
                            'pending'
                        )
                    ) AS "Status",


                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    ) AS "Type",


                    COALESCE(
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        'UNSPECIFIED'
                    ) AS "Item",


                    COALESCE(
                        NULLIF(
                            TRIM(c.target),
                            ''
                        ),
                        NULLIF(
                            TRIM(c.fund_category),
                            ''
                        ),
                        NULLIF(
                            TRIM(c.type),
                            ''
                        ),
                        '—'
                    ) AS "Target",


                    COALESCE(
                        c.amount,
                        0
                    ) AS "Amount",


                    CASE

                        WHEN
                            COALESCE(
                                c.ps_type,
                                'NONE'
                            ) = 'NONE'

                        THEN NULL

                        ELSE
                            COALESCE(
                                c.ps_amount,
                                0
                            )

                    END AS "PS",


                    CASE

                        WHEN
                            COALESCE(
                                c.apportionment_type,
                                'NONE'
                            ) = 'NONE'

                        THEN NULL

                        ELSE
                            COALESCE(
                                c.apportionment_amount,
                                0
                            )

                    END AS "Apportionment"


                FROM collections c


                WHERE ${where}


                ORDER BY

                    COALESCE(
                        c.collection_date,
                        c.date
                    ) DESC,

                    c.id DESC
                `,
                values
            );


        // ====================================================
        // METHOD SUMMARY
        // ====================================================

        const methodResult =
            await pool.query(
                `
                SELECT

                    COALESCE(
                        UPPER(
                            NULLIF(
                                TRIM(
                                    c.payment_method
                                ),
                                ''
                            )
                        ),
                        'CASH'
                    ) AS "Method",


                    COUNT(*) AS "Counts",


                    COALESCE(
                        SUM(
                            COALESCE(
                                c.amount,
                                0
                            )
                        ),
                        0
                    ) AS "Amount"


                FROM collections c


                WHERE ${where}


                GROUP BY

                    COALESCE(
                        UPPER(
                            NULLIF(
                                TRIM(
                                    c.payment_method
                                ),
                                ''
                            )
                        ),
                        'CASH'
                    )


                ORDER BY
                    "Amount" DESC
                `,
                values
            );


        // ====================================================
        // CREATE WORKBOOK & COMMON METADATA VIA EXCELJS
        // ====================================================

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Maui United Methodist Church CFMMS";
        workbook.created = new Date();

        // Common Styles & Theme (Deep Royal Navy / Slate Theme)
        const borderThin = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };

        const borderDoubleBottom = {
            top: { style: "thin", color: { argb: "FF1E3A8A" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "double", color: { argb: "FF1E3A8A" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };

        const headerFill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1E3A8A" } // Deep Royal Blue
        };

        const headerFont = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FFFFFFFF" }
        };

        const zebraFill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" }
        };

        const generatedDate = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        const statusLabel =
            status === "all" ? "ALL (Verified & Pending)" : status.toUpperCase();


        // ====================================================
        // 1. SUMMARY SHEET
        // ====================================================

        const wsSummary = workbook.addWorksheet("Receipts Summary", {
            pageSetup: {
                orientation: "portrait",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                paperSize: 9, // A4
                margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
                printTitlesRow: "6:6"
            }
        });

        // Header Title Block
        wsSummary.mergeCells("A1:G1");
        wsSummary.getCell("A1").value = "MAUI UNITED METHODIST CHURCH";
        wsSummary.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF1E3A8A" } };
        wsSummary.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
        wsSummary.getRow(1).height = 26;

        wsSummary.mergeCells("A2:G2");
        wsSummary.getCell("A2").value = "OFFICIAL FINANCIAL RECEIPTS & COLLECTIONS SUMMARY REPORT";
        wsSummary.getCell("A2").font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF334155" } };
        wsSummary.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
        wsSummary.getRow(2).height = 20;

        wsSummary.mergeCells("A3:G3");
        wsSummary.getCell("A3").value = "Church Financial Management & Monitoring System (CFMMS)";
        wsSummary.getCell("A3").font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF64748B" } };
        wsSummary.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };
        wsSummary.getRow(3).height = 16;

        wsSummary.mergeCells("A4:G4");
        wsSummary.getCell("A4").value = `Report Period: ${from} to ${to}   |   Status: ${statusLabel}   |   Generated Date: ${generatedDate}`;
        wsSummary.getCell("A4").font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
        wsSummary.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        wsSummary.getCell("A4").alignment = { vertical: "middle", horizontal: "center" };
        wsSummary.getCell("A4").border = borderThin;
        wsSummary.getRow(4).height = 20;

        wsSummary.getRow(5).height = 10;

        // Table Header
        const sumHeaders = [
            "Fund Category / Item",
            "Givers Count",
            "Transactions",
            "Gross Amount (₱)",
            "Personal Savings (₱)",
            "Apportionment (₱)",
            "Net Church Retained (₱)"
        ];
        const hRow = wsSummary.getRow(6);
        hRow.values = sumHeaders;
        hRow.height = 26;
        hRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = borderThin;
        });

        // Summary Data Rows
        let currRow = 7;
        summaryResult.rows.forEach((row, idx) => {
            const r = wsSummary.getRow(currRow);
            const amt = Number(row.amount) || 0;
            const ps = Number(row.ps) || 0;
            const app = Number(row.apportionment) || 0;
            const net = amt - (ps + app);

            r.values = [
                row.item,
                Number(row.members) || 0,
                Number(row.counts) || 0,
                amt,
                ps,
                app,
                net
            ];
            r.height = 20;

            r.eachCell((cell, colNum) => {
                cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF1E293B" } };
                cell.border = borderThin;
                if (idx % 2 === 1) cell.fill = zebraFill;

                if (colNum === 1) {
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                } else if (colNum === 2 || colNum === 3) {
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                    cell.numFmt = "#,##0";
                } else {
                    cell.alignment = { vertical: "middle", horizontal: "right" };
                    cell.numFmt = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
                }
            });
            currRow++;
        });

        // Summary Totals
        const totalGross = summaryResult.rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
        const totalPS = summaryResult.rows.reduce((acc, r) => acc + (Number(r.ps) || 0), 0);
        const totalApp = summaryResult.rows.reduce((acc, r) => acc + (Number(r.apportionment) || 0), 0);
        const totalNet = totalGross - (totalPS + totalApp);
        const totalGivers = summaryResult.rows.reduce((acc, r) => acc + (Number(r.members) || 0), 0);
        const totalTxns = summaryResult.rows.reduce((acc, r) => acc + (Number(r.counts) || 0), 0);

        const totalRow = wsSummary.getRow(currRow);
        totalRow.values = ["TOTAL ALL FUNDS", totalGivers, totalTxns, totalGross, totalPS, totalApp, totalNet];
        totalRow.height = 24;
        totalRow.eachCell((cell, colNum) => {
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
            cell.border = borderDoubleBottom;
            if (colNum === 1) {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            } else if (colNum === 2 || colNum === 3) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.numFmt = "#,##0";
            } else {
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
            }
        });

        // Executive Financial Highlights Block
        currRow += 2;
        wsSummary.mergeCells(`A${currRow}:D${currRow}`);
        wsSummary.getCell(`A${currRow}`).value = "EXECUTIVE FINANCIAL HIGHLIGHTS";
        wsSummary.getCell(`A${currRow}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        wsSummary.getCell(`A${currRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
        wsSummary.getCell(`A${currRow}`).alignment = { vertical: "middle", horizontal: "center" };
        wsSummary.getRow(currRow).height = 22;

        const kpis = [
            ["Total Gross Collections Received:", totalGross],
            ["Total Personal Savings Allocated:", totalPS],
            ["Total Apportionments Allocated:", totalApp],
            ["Net Church Operating Balance:", totalNet]
        ];

        kpis.forEach(([label, val]) => {
            currRow++;
            wsSummary.mergeCells(`A${currRow}:C${currRow}`);
            wsSummary.getCell(`A${currRow}`).value = label;
            wsSummary.getCell(`A${currRow}`).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF475569" } };
            wsSummary.getCell(`A${currRow}`).border = borderThin;
            wsSummary.getCell(`A${currRow}`).alignment = { vertical: "middle" };

            wsSummary.getCell(`D${currRow}`).value = val;
            wsSummary.getCell(`D${currRow}`).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
            wsSummary.getCell(`D${currRow}`).alignment = { vertical: "middle", horizontal: "right" };
            wsSummary.getCell(`D${currRow}`).numFmt = '"₱"#,##0.00';
            wsSummary.getCell(`D${currRow}`).border = borderThin;
            wsSummary.getCell(`D${currRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            wsSummary.getRow(currRow).height = 20;
        });

        // Signatures
        currRow += 3;
        wsSummary.getCell(`B${currRow}`).value = "Prepared & Certified by:";
        wsSummary.getCell(`B${currRow}`).font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF64748B" } };
        wsSummary.getCell(`F${currRow}`).value = "Approved & Verified by:";
        wsSummary.getCell(`F${currRow}`).font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF64748B" } };

        currRow += 2;
        wsSummary.getCell(`B${currRow}`).value = "____________________________________";
        wsSummary.getCell(`F${currRow}`).value = "____________________________________";

        currRow += 1;
        wsSummary.getCell(`B${currRow}`).value = "CHURCH TREASURER";
        wsSummary.getCell(`B${currRow}`).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } };
        wsSummary.getCell(`F${currRow}`).value = "HEAD PASTOR / AUDITOR";
        wsSummary.getCell(`F${currRow}`).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } };

        wsSummary.columns = [
            { width: 25 },
            { width: 13 },
            { width: 13 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 20 }
        ];


        // ====================================================
        // 2. DETAIL SHEET
        // ====================================================

        const wsDetail = workbook.addWorksheet("Itemized Detail Audit", {
            pageSetup: {
                orientation: "portrait",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                paperSize: 9,
                margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
                printTitlesRow: "6:6"
            }
        });

        wsDetail.mergeCells("A1:H1");
        wsDetail.getCell("A1").value = "MAUI UNITED METHODIST CHURCH";
        wsDetail.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF1E3A8A" } };
        wsDetail.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
        wsDetail.getRow(1).height = 26;

        wsDetail.mergeCells("A2:H2");
        wsDetail.getCell("A2").value = "ITEMIZED RECEIPTS & CONTRIBUTIONS AUDIT LEDGER";
        wsDetail.getCell("A2").font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF334155" } };
        wsDetail.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
        wsDetail.getRow(2).height = 20;

        wsDetail.mergeCells("A3:H3");
        wsDetail.getCell("A3").value = "Church Financial Management & Monitoring System (CFMMS)";
        wsDetail.getCell("A3").font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF64748B" } };
        wsDetail.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };
        wsDetail.getRow(3).height = 16;

        wsDetail.mergeCells("A4:H4");
        wsDetail.getCell("A4").value = `Report Period: ${from} to ${to}   |   Status: ${statusLabel}   |   Total Records: ${detailResult.rows.length}   |   Generated Date: ${generatedDate}`;
        wsDetail.getCell("A4").font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
        wsDetail.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        wsDetail.getCell("A4").alignment = { vertical: "middle", horizontal: "center" };
        wsDetail.getCell("A4").border = borderThin;
        wsDetail.getRow(4).height = 20;

        wsDetail.getRow(5).height = 10;

        const detailHeaders = [
            "Receipt #",
            "Date",
            "Donor / Contributor",
            "Fund Category",
            "Payment Method",
            "Gross Amount (₱)",
            "Personal Savings (₱)",
            "Apportionment (₱)"
        ];
        const dHRow = wsDetail.getRow(6);
        dHRow.values = detailHeaders;
        dHRow.height = 28;
        dHRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = { name: "Calibri", size: 11.5, bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = borderThin;
        });

        let dCurrRow = 7;
        detailResult.rows.forEach((row, idx) => {
            const r = wsDetail.getRow(dCurrRow);
            const rawDate = row["Date"];
            const dDate = rawDate ? (rawDate instanceof Date ? rawDate.toISOString().split("T")[0] : String(rawDate).split("T")[0]) : "—";
            const amt = Number(row["Amount"]) || 0;
            const ps = row["PS"] === null ? 0 : Number(row["PS"]);
            const app = row["Apportionment"] === null ? 0 : Number(row["Apportionment"]);
            const methodDisplay = row["Cheque/Ref #"] ? `${row["Method"]} (${row["Cheque/Ref #"]})` : row["Method"] || "CASH";

            r.values = [
                row["Receipt #"] || "—",
                dDate,
                row["Donor"] || "ANONYMOUS",
                row["Type"] || "General Fund",
                methodDisplay,
                amt,
                ps,
                app
            ];
            r.height = 23;

            r.eachCell((cell, colNum) => {
                cell.font = { name: "Calibri", size: 11, color: { argb: "FF1E293B" } };
                cell.border = borderThin;
                if (idx % 2 === 1) cell.fill = zebraFill;

                if (colNum === 1 || colNum === 2 || colNum === 5) {
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                } else if (colNum === 6 || colNum === 7 || colNum === 8) {
                    cell.alignment = { vertical: "middle", horizontal: "right" };
                    cell.numFmt = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
                } else {
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                }
            });
            dCurrRow++;
        });

        const totalDetailAmount = detailResult.rows.reduce((acc, r) => acc + (Number(r["Amount"]) || 0), 0);
        const totalDetailPS = detailResult.rows.reduce((acc, r) => acc + (Number(r["PS"]) || 0), 0);
        const totalDetailApp = detailResult.rows.reduce((acc, r) => acc + (Number(r["Apportionment"]) || 0), 0);

        const dTotalRow = wsDetail.getRow(dCurrRow);
        dTotalRow.values = ["TOTAL ITEMIZED RECEIPTS", "", "", "", "", totalDetailAmount, totalDetailPS, totalDetailApp];
        dTotalRow.height = 25;
        dTotalRow.eachCell((cell, colNum) => {
            cell.font = { name: "Calibri", size: 11.5, bold: true, color: { argb: "FF1E3A8A" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
            cell.border = borderDoubleBottom;
            if (colNum === 6 || colNum === 7 || colNum === 8) {
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
            } else {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            }
        });

        wsDetail.columns = [
            { width: 15 },
            { width: 13 },
            { width: 26 },
            { width: 20 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 18 }
        ];


        // ====================================================
        // 3. METHOD SHEET
        // ====================================================

        const wsMethod = workbook.addWorksheet("Payment Methods", {
            pageSetup: {
                orientation: "portrait",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                paperSize: 9,
                margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
                printTitlesRow: "6:6"
            }
        });

        wsMethod.mergeCells("A1:D1");
        wsMethod.getCell("A1").value = "MAUI UNITED METHODIST CHURCH";
        wsMethod.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF1E3A8A" } };
        wsMethod.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
        wsMethod.getRow(1).height = 26;

        wsMethod.mergeCells("A2:D2");
        wsMethod.getCell("A2").value = "PAYMENT METHOD & COLLECTION CHANNEL DISTRIBUTION";
        wsMethod.getCell("A2").font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF334155" } };
        wsMethod.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
        wsMethod.getRow(2).height = 20;

        wsMethod.mergeCells("A3:D3");
        wsMethod.getCell("A3").value = "Church Financial Management & Monitoring System (CFMMS)";
        wsMethod.getCell("A3").font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF64748B" } };
        wsMethod.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };
        wsMethod.getRow(3).height = 16;

        wsMethod.mergeCells("A4:D4");
        wsMethod.getCell("A4").value = `Report Period: ${from} to ${to}   |   Status: ${statusLabel}   |   Generated Date: ${generatedDate}`;
        wsMethod.getCell("A4").font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
        wsMethod.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        wsMethod.getCell("A4").alignment = { vertical: "middle", horizontal: "center" };
        wsMethod.getCell("A4").border = borderThin;
        wsMethod.getRow(4).height = 20;

        wsMethod.getRow(5).height = 10;

        const methodHeaders = [
            "Payment Method / Channel",
            "Transaction Count",
            "Total Collected (₱)",
            "Percentage Share (%)"
        ];
        const mHRow = wsMethod.getRow(6);
        mHRow.values = methodHeaders;
        mHRow.height = 26;
        mHRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = borderThin;
        });

        const totalMethodAmount = methodResult.rows.reduce((acc, r) => acc + (Number(r["Amount"]) || 0), 0);
        const totalMethodCounts = methodResult.rows.reduce((acc, r) => acc + (Number(r["Counts"]) || 0), 0);

        let mCurrRow = 7;
        methodResult.rows.forEach((row, idx) => {
            const r = wsMethod.getRow(mCurrRow);
            const amt = Number(row["Amount"]) || 0;
            const share = totalMethodAmount > 0 ? amt / totalMethodAmount : 0;

            r.values = [
                row["Method"] || "CASH",
                Number(row["Counts"]) || 0,
                amt,
                share
            ];
            r.height = 20;

            r.eachCell((cell, colNum) => {
                cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF1E293B" } };
                cell.border = borderThin;
                if (idx % 2 === 1) cell.fill = zebraFill;

                if (colNum === 1) {
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                } else if (colNum === 2) {
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                    cell.numFmt = "#,##0";
                } else if (colNum === 3) {
                    cell.alignment = { vertical: "middle", horizontal: "right" };
                    cell.numFmt = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
                } else {
                    cell.alignment = { vertical: "middle", horizontal: "right" };
                    cell.numFmt = "0.00%";
                }
            });
            mCurrRow++;
        });

        const mTotalRow = wsMethod.getRow(mCurrRow);
        mTotalRow.values = ["TOTAL ALL CHANNELS", totalMethodCounts, totalMethodAmount, 1];
        mTotalRow.height = 24;
        mTotalRow.eachCell((cell, colNum) => {
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
            cell.border = borderDoubleBottom;
            if (colNum === 1) {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            } else if (colNum === 2) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.numFmt = "#,##0";
            } else if (colNum === 3) {
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
            } else {
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = "0.00%";
            }
        });

        wsMethod.columns = [
            { width: 30 },
            { width: 20 },
            { width: 24 },
            { width: 22 }
        ];


        // ====================================================
        // SEND WORKBOOK BUFFER
        // ====================================================

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `Collection_Report_${from}_to_${to}.xlsx`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.send(buffer);


    } catch (err) {

        console.error(
            "EXCEL EXPORT ERROR:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Unable to export collection report."

        });
    }
};


// ============================================================
// DASHBOARD SUMMARY METRICS & ANALYTICS
// ============================================================

exports.getDashboardSummary = async (req, res) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        // 1. Membership Statistics
        const memberStatsPromise = pool.query(`
            SELECT 
                COUNT(*)::int AS total_members,
                COUNT(*) FILTER (WHERE LOWER(status) = 'active')::int AS active_members,
                COUNT(*) FILTER (WHERE LOWER(status) = 'inactive')::int AS inactive_members,
                COUNT(*) FILTER (WHERE LOWER(gender) = 'male')::int AS male_members,
                COUNT(*) FILTER (WHERE LOWER(gender) = 'female')::int AS female_members
            FROM members;
        `);

        // 2. Collections Overview (Monthly & All-time & Allocations)
        const collectionStatsPromise = pool.query(`
            SELECT 
                COALESCE(SUM(amount) FILTER (WHERE LOWER(COALESCE(status, 'verified')) = 'verified'), 0)::numeric AS total_collections_all_time,
                COALESCE(SUM(amount) FILTER (
                    WHERE LOWER(COALESCE(status, 'verified')) = 'verified'
                      AND EXTRACT(YEAR FROM COALESCE(collection_date, date)) = $1 
                      AND EXTRACT(MONTH FROM COALESCE(collection_date, date)) = $2
                ), 0)::numeric AS total_collections_this_month,
                COALESCE(SUM(ps_amount) FILTER (WHERE LOWER(COALESCE(status, 'verified')) = 'verified'), 0)::numeric AS total_ps_all_time,
                COALESCE(SUM(ps_amount) FILTER (
                    WHERE LOWER(COALESCE(status, 'verified')) = 'verified'
                      AND EXTRACT(YEAR FROM COALESCE(collection_date, date)) = $1 
                      AND EXTRACT(MONTH FROM COALESCE(collection_date, date)) = $2
                ), 0)::numeric AS total_ps_this_month,
                COALESCE(SUM(apportionment_amount) FILTER (WHERE LOWER(COALESCE(status, 'verified')) = 'verified'), 0)::numeric AS total_apportionment_all_time,
                COALESCE(SUM(apportionment_amount) FILTER (
                    WHERE LOWER(COALESCE(status, 'verified')) = 'verified'
                      AND EXTRACT(YEAR FROM COALESCE(collection_date, date)) = $1 
                      AND EXTRACT(MONTH FROM COALESCE(collection_date, date)) = $2
                ), 0)::numeric AS total_apportionment_this_month,
                COUNT(DISTINCT member_name) FILTER (
                    WHERE LOWER(COALESCE(status, 'verified')) = 'verified'
                      AND EXTRACT(YEAR FROM COALESCE(collection_date, date)) = $1 
                      AND EXTRACT(MONTH FROM COALESCE(collection_date, date)) = $2
                )::int AS active_givers_this_month,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'verified')) = 'pending')::int AS pending_collections_count
            FROM collections;
        `, [currentYear, currentMonth]);

        // 3. Expenses Overview (Monthly & All-time)
        const expenseStatsPromise = pool.query(`
            SELECT 
                COALESCE(SUM(amount) FILTER (WHERE LOWER(status) != 'voided'), 0)::numeric AS total_expenses_all_time,
                COALESCE(SUM(amount) FILTER (
                    WHERE LOWER(status) != 'voided'
                      AND EXTRACT(YEAR FROM date) = $1 
                      AND EXTRACT(MONTH FROM date) = $2
                ), 0)::numeric AS total_expenses_this_month,
                COUNT(*) FILTER (
                    WHERE LOWER(status) != 'voided'
                      AND EXTRACT(YEAR FROM date) = $1 
                      AND EXTRACT(MONTH FROM date) = $2
                )::int AS expense_count_this_month,
                COUNT(*) FILTER (WHERE LOWER(status) = 'pending')::int AS pending_expenses_count
            FROM expenses;
        `, [currentYear, currentMonth]);

        // 4. Monthly Inflow vs Outflow Cashflow (Last 6 Months)
        const monthlyTrendPromise = pool.query(`
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
                    DATE_TRUNC('month', CURRENT_DATE),
                    INTERVAL '1 month'
                )::date AS month_start
            ),
            monthly_col AS (
                SELECT 
                    DATE_TRUNC('month', COALESCE(collection_date, date))::date AS m_date,
                    SUM(amount) AS col_amount
                FROM collections
                WHERE LOWER(COALESCE(status, 'verified')) = 'verified' 
                  AND COALESCE(collection_date, date) >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY 1
            ),
            monthly_exp AS (
                SELECT 
                    DATE_TRUNC('month', date)::date AS m_date,
                    SUM(amount) AS exp_amount
                FROM expenses
                WHERE LOWER(status) != 'voided' AND date >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY 1
            )
            SELECT 
                TO_CHAR(m.month_start, 'Mon YYYY') AS month_label,
                TO_CHAR(m.month_start, 'YYYY-MM') AS month_key,
                COALESCE(c.col_amount, 0)::numeric AS collections,
                COALESCE(e.exp_amount, 0)::numeric AS expenses,
                (COALESCE(c.col_amount, 0) - COALESCE(e.exp_amount, 0))::numeric AS net_cashflow
            FROM months m
            LEFT JOIN monthly_col c ON c.m_date = m.month_start
            LEFT JOIN monthly_exp e ON e.m_date = m.month_start
            ORDER BY m.month_start ASC;
        `);

        // 5. Fund Categories Breakdown
        const categoryBreakdownPromise = pool.query(`
            SELECT 
                COALESCE(NULLIF(TRIM(c.fund_category), ''), NULLIF(TRIM(c.type), ''), ct.name, 'General Fund') AS category_name,
                COUNT(*)::int AS transaction_count,
                SUM(c.amount)::numeric AS total_amount
            FROM collections c
            LEFT JOIN collection_types ct ON c.collection_type_id = ct.id
            WHERE LOWER(COALESCE(c.status, 'verified')) = 'verified'
            GROUP BY 1
            ORDER BY total_amount DESC
            LIMIT 6;
        `);

        // 6. Payment Methods Distribution
        const paymentMethodsPromise = pool.query(`
            SELECT 
                UPPER(COALESCE(NULLIF(TRIM(payment_method), ''), 'CASH')) AS method_name,
                COUNT(*)::int AS transaction_count,
                SUM(amount)::numeric AS total_amount
            FROM collections
            WHERE LOWER(COALESCE(status, 'verified')) = 'verified'
            GROUP BY 1
            ORDER BY total_amount DESC;
        `);

        // 7. Recent Transactions (Latest 5 Collections & Latest 5 Expenses)
        const recentCollectionsPromise = pool.query(`
            SELECT 
                id,
                receipt_no,
                COALESCE(collection_date, date) AS date,
                COALESCE(member_name, 'Anonymous') AS giver_name,
                COALESCE(NULLIF(TRIM(fund_category), ''), type, 'General Fund') AS category,
                COALESCE(payment_method, 'CASH') AS method,
                amount::numeric,
                COALESCE(status, 'Verified') AS status
            FROM collections
            ORDER BY COALESCE(collection_date, date) DESC, id DESC
            LIMIT 5;
        `);

        const recentExpensesPromise = pool.query(`
            SELECT 
                expense_id,
                voucher_number,
                date,
                COALESCE(payee, 'General Payee') AS payee,
                COALESCE(category, 'Operational') AS category,
                COALESCE(payment_method, 'Cash') AS method,
                amount::numeric,
                COALESCE(status, 'Approved') AS status,
                description
            FROM expenses
            ORDER BY date DESC, expense_id DESC
            LIMIT 5;
        `);

        // 8. Recent Members (Latest 5 Added)
        const recentMembersPromise = pool.query(`
            SELECT 
                id,
                member_id,
                official_name,
                phone,
                role,
                status,
                join_date
            FROM members
            ORDER BY id DESC
            LIMIT 5;
        `);

        // 9. Recent Audit Logs (Latest 5 Events)
        const recentAuditPromise = pool.query(`
            SELECT 
                id,
                user_name,
                action_type,
                table_name,
                details,
                created_at
            FROM audit_logs
            ORDER BY created_at DESC, id DESC
            LIMIT 5;
        `);

        const [
            memberStatsRes,
            collectionStatsRes,
            expenseStatsRes,
            monthlyTrendRes,
            categoryBreakdownRes,
            paymentMethodsRes,
            recentCollectionsRes,
            recentExpensesRes,
            recentMembersRes,
            recentAuditRes
        ] = await Promise.all([
            memberStatsPromise,
            collectionStatsPromise,
            expenseStatsPromise,
            monthlyTrendPromise,
            categoryBreakdownPromise,
            paymentMethodsPromise,
            recentCollectionsPromise,
            recentExpensesPromise,
            recentMembersPromise,
            recentAuditPromise
        ]);

        const mStats = memberStatsRes.rows[0] || {};
        const cStats = collectionStatsRes.rows[0] || {};
        const eStats = expenseStatsRes.rows[0] || {};

        const totalCollectionsAllTime = Number(cStats.total_collections_all_time) || 0;
        const totalCollectionsThisMonth = Number(cStats.total_collections_this_month) || 0;
        const totalExpensesAllTime = Number(eStats.total_expenses_all_time) || 0;
        const totalExpensesThisMonth = Number(eStats.total_expenses_this_month) || 0;
        const netCashflowAllTime = totalCollectionsAllTime - totalExpensesAllTime;
        const netCashflowThisMonth = totalCollectionsThisMonth - totalExpensesThisMonth;

        const totalMembers = Number(mStats.total_members) || 0;
        const activeMembers = Number(mStats.active_members) || 0;
        const activePercentage = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            overview: {
                totalMembers,
                activeMembers,
                inactiveMembers: Number(mStats.inactive_members) || 0,
                activePercentage,
                maleMembers: Number(mStats.male_members) || 0,
                femaleMembers: Number(mStats.female_members) || 0,

                totalCollectionsThisMonth,
                totalCollectionsAllTime,
                activeGiversThisMonth: Number(cStats.active_givers_this_month) || 0,
                pendingCollectionsCount: Number(cStats.pending_collections_count) || 0,

                totalExpensesThisMonth,
                totalExpensesAllTime,
                expenseCountThisMonth: Number(eStats.expense_count_this_month) || 0,
                pendingExpensesCount: Number(eStats.pending_expenses_count) || 0,

                netCashflowThisMonth,
                netCashflowAllTime,

                totalPersonalSavingsThisMonth: Number(cStats.total_ps_this_month) || 0,
                totalPersonalSavingsAllTime: Number(cStats.total_ps_all_time) || 0,
                totalApportionmentThisMonth: Number(cStats.total_apportionment_this_month) || 0,
                totalApportionmentAllTime: Number(cStats.total_apportionment_all_time) || 0
            },
            charts: {
                monthlyTrend: monthlyTrendRes.rows,
                categoryBreakdown: categoryBreakdownRes.rows,
                paymentMethods: paymentMethodsRes.rows,
                demographics: {
                    active: activeMembers,
                    inactive: Number(mStats.inactive_members) || 0,
                    male: Number(mStats.male_members) || 0,
                    female: Number(mStats.female_members) || 0
                }
            },
            recentFeeds: {
                collections: recentCollectionsRes.rows,
                expenses: recentExpensesRes.rows,
                members: recentMembersRes.rows,
                auditLogs: recentAuditRes.rows
            }
        });

    } catch (err) {
        console.error("DASHBOARD SUMMARY ERROR:", err);
        res.status(500).json({
            success: false,
            error: err.message || "Failed to load dashboard summary metrics."
        });
    }
};