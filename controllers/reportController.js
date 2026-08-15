const pool = require("../config/db");
const XLSX = require("xlsx");


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

function buildWhere(from, to, status) {

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


    return {
        where,
        values
    };
}


// ============================================================
// VALIDATE REQUEST
// ============================================================

function validateRequest(req, res) {

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


    return {
        from,
        to,
        status
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
            status
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status
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
            status
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status
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
            status
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status
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
            status
        } = filters;


        const {
            where,
            values
        } = buildWhere(
            from,
            to,
            status
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
        // CREATE WORKBOOK
        // ====================================================

        const workbook =
            XLSX.utils.book_new();


        // ====================================================
        // SUMMARY SHEET
        // ====================================================

        const summaryRows = [

            [
                "RECEIPT SUMMARY REPORT"
            ],

            [
                `Period: ${from} to ${to}`
            ],

            [
                `Status: ${status}`
            ],

            [],

            [
                "Item",
                "Members",
                "Counts",
                "Amount",
                "PS",
                "Apportionment"
            ],

            ...summaryResult.rows.map(
                row => [

                    row.item,

                    Number(
                        row.members
                    ),

                    Number(
                        row.counts
                    ),

                    Number(
                        row.amount
                    ),

                    Number(
                        row.ps
                    ),

                    Number(
                        row.apportionment
                    )

                ]
            )
        ];


        // ----------------------------------------------------
        // TOTALS
        // ----------------------------------------------------

        const summaryTotals =
            summaryResult.rows.reduce(
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


        summaryRows.push([

            "TOTAL",

            summaryTotals.members,

            summaryTotals.counts,

            summaryTotals.amount,

            summaryTotals.ps,

            summaryTotals.apportionment

        ]);


        const summarySheet =
            XLSX.utils.aoa_to_sheet(
                summaryRows
            );


        summarySheet["!cols"] = [

            { wch: 30 },

            { wch: 12 },

            { wch: 12 },

            { wch: 18 },

            { wch: 18 },

            { wch: 20 }

        ];


        XLSX.utils.book_append_sheet(
            workbook,
            summarySheet,
            "Summary"
        );


        // ====================================================
        // DETAIL SHEET
        // ====================================================

        const detailRows =
            detailResult.rows.map(
                row => ({

                    "Receipt #":
                        row["Receipt #"],

                    "Date":
                        row["Date"],

                    "Donor":
                        row["Donor"],

                    "Method":
                        row["Method"],

                    "Cheque/Ref #":
                        row["Cheque/Ref #"],

                    "Status":
                        row["Status"],

                    "Type":
                        row["Type"],

                    "Item":
                        row["Item"],

                    "Target":
                        row["Target"],

                    "Amount":
                        Number(
                            row["Amount"]
                        ),

                    "PS":
                        row["PS"] === null
                            ? ""
                            : Number(
                                row["PS"]
                            ),

                    "Apportionment":
                        row["Apportionment"] === null
                            ? ""
                            : Number(
                                row["Apportionment"]
                            )

                })
            );


        const detailSheet =
            XLSX.utils.json_to_sheet(
                detailRows
            );


        detailSheet["!cols"] = [

            { wch: 14 },

            { wch: 14 },

            { wch: 25 },

            { wch: 14 },

            { wch: 18 },

            { wch: 14 },

            { wch: 25 },

            { wch: 25 },

            { wch: 40 },

            { wch: 16 },

            { wch: 16 },

            { wch: 20 }

        ];


        XLSX.utils.book_append_sheet(
            workbook,
            detailSheet,
            "Receipt Detail"
        );


        // ====================================================
        // METHOD SHEET
        // ====================================================

        const methodRows =
            methodResult.rows.map(
                row => ({

                    Method:
                        row["Method"],

                    Counts:
                        Number(
                            row["Counts"]
                        ),

                    Amount:
                        Number(
                            row["Amount"]
                        )

                })
            );


        const methodSheet =
            XLSX.utils.json_to_sheet(
                methodRows
            );


        methodSheet["!cols"] = [

            { wch: 20 },

            { wch: 12 },

            { wch: 18 }

        ];


        XLSX.utils.book_append_sheet(
            workbook,
            methodSheet,
            "Methods"
        );


        // ====================================================
        // WRITE EXCEL
        // ====================================================

        const buffer =
            XLSX.write(
                workbook,
                {
                    type: "buffer",
                    bookType: "xlsx"
                }
            );


        const filename =
            `Collection_Report_${from}_to_${to}.xlsx`;


        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );


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