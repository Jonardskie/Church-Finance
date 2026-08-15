// ============================================================
// CFMMS - COLLECTION REPORTS
// Dashboard/js/collection-reports.js
// ============================================================


// ============================================================
// AUTHENTICATION
// ============================================================

const token = sessionStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}


// ============================================================
// API HELPERS
// ============================================================

function apiHeaders() {
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}


// ============================================================
// MONEY
// ============================================================

function money(value) {

    const number = Number(value) || 0;

    return number.toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2
    });
}


// ============================================================
// NUMBER
// ============================================================

function number(value) {
    return Number(value) || 0;
}


// ============================================================
// DATE FORMAT
// ============================================================

function dateString(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// GET FILTER VALUES
// ============================================================

function getDates() {

    return {
        from: document.getElementById("fromDate")?.value || "",
        to: document.getElementById("toDate")?.value || "",
        status: document.getElementById("statusFilter")?.value || "all"
    };
}


// ============================================================
// DEFAULT DATE RANGE
// ============================================================

function setDefaultDates() {

    const now = new Date();

    const year = now.getFullYear();

    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");

    if (fromDate) {
        fromDate.value = `${year}-01-01`;
    }

    if (toDate) {

        // Local Philippine date instead of UTC date
        const localDate =
            new Date(
                now.getTime() -
                now.getTimezoneOffset() * 60000
            );

        toDate.value =
            localDate.toISOString().slice(0, 10);
    }
}


// ============================================================
// BUILD QUERY
// ============================================================

function buildQuery() {

    const {
        from,
        to,
        status
    } = getDates();

    return (
        `from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&status=${encodeURIComponent(status)}`
    );
}


// ============================================================
// VALIDATE FILTERS
// ============================================================

function validateDates() {

    const {
        from,
        to
    } = getDates();

    if (!from || !to) {

        alert(
            "Please select the report date range."
        );

        return false;
    }

    if (from > to) {

        alert(
            "The From date cannot be later than the To date."
        );

        return false;
    }

    return true;
}


// ============================================================
// GENERATE REPORT
// ============================================================

async function loadReports() {

    if (!validateDates()) {
        return;
    }

    const query = buildQuery();

    try {

        setReportLoading(true);

        const [
            summaryResponse,
            detailResponse,
            methodResponse
        ] = await Promise.all([

            fetch(
                `/api/reports/collections/summary?${query}`,
                {
                    method: "GET",
                    headers: apiHeaders()
                }
            ),

            fetch(
                `/api/reports/collections/detail?${query}`,
                {
                    method: "GET",
                    headers: apiHeaders()
                }
            ),

            fetch(
                `/api/reports/collections/methods?${query}`,
                {
                    method: "GET",
                    headers: apiHeaders()
                }
            )

        ]);


        // ----------------------------------------------------
        // CHECK AUTH
        // ----------------------------------------------------

        if (
            summaryResponse.status === 401 ||
            detailResponse.status === 401 ||
            methodResponse.status === 401
        ) {

            sessionStorage.removeItem("token");

            window.location.href =
                "login.html";

            return;
        }


        // ----------------------------------------------------
        // CHECK RESPONSES
        // ----------------------------------------------------

        if (!summaryResponse.ok) {

            const error =
                await readApiError(summaryResponse);

            throw new Error(
                error ||
                "Unable to load summary report."
            );
        }


        if (!detailResponse.ok) {

            const error =
                await readApiError(detailResponse);

            throw new Error(
                error ||
                "Unable to load detail report."
            );
        }


        if (!methodResponse.ok) {

            const error =
                await readApiError(methodResponse);

            throw new Error(
                error ||
                "Unable to load collection method report."
            );
        }


        // ----------------------------------------------------
        // PARSE DATA
        // ----------------------------------------------------

        const summary =
            await summaryResponse.json();

        const detail =
            await detailResponse.json();

        const methods =
            await methodResponse.json();


        console.log(
            "SUMMARY REPORT:",
            summary
        );

        console.log(
            "DETAIL REPORT:",
            detail
        );

        console.log(
            "METHOD REPORT:",
            methods
        );


        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        renderSummary(summary);

        renderDetail(detail);

        renderMethods(methods);


    } catch (error) {

        console.error(
            "COLLECTION REPORT ERROR:",
            error
        );

        alert(
            error.message ||
            "Failed to load collection reports."
        );

    } finally {

        setReportLoading(false);
    }
}


// ============================================================
// READ API ERROR
// ============================================================

async function readApiError(response) {

    try {

        const data =
            await response.json();

        return (
            data.error ||
            data.message ||
            ""
        );

    } catch {

        return "";
    }
}


// ============================================================
// LOADING STATE
// ============================================================

function setReportLoading(loading) {

    const buttons =
        document.querySelectorAll(
            ".toolbar button"
        );

    buttons.forEach(button => {

        if (
            button.classList.contains(
                "btn-print"
            )
        ) {
            return;
        }

        button.disabled = loading;

        if (loading) {

            if (
                button.classList.contains(
                    "btn-primary"
                )
            ) {
                button.textContent =
                    "Generating...";
            }

        } else {

            if (
                button.classList.contains(
                    "btn-primary"
                )
            ) {
                button.textContent =
                    "Generate Report";
            }
        }

    });
}


// ============================================================
// SUMMARY REPORT
// ============================================================

function renderSummary(report) {

    const body =
        document.getElementById(
            "summaryBody"
        );

    const footer =
        document.getElementById(
            "summaryFooter"
        );

    if (!body || !footer) {
        return;
    }

    body.innerHTML = "";

    footer.innerHTML = "";


    // --------------------------------------------------------
    // NORMALIZE RESPONSE
    // --------------------------------------------------------

    const rows =
        Array.isArray(report)
            ? report
            : Array.isArray(report?.rows)
                ? report.rows
                : [];


    const totals =
        report?.totals || calculateSummaryTotals(rows);


    // --------------------------------------------------------
    // EMPTY
    // --------------------------------------------------------

    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    No collections found
                    for the selected period.
                </td>
            </tr>
        `;

    } else {

        // ----------------------------------------------------
        // ROWS
        // ----------------------------------------------------

        rows.forEach(row => {

            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            row.item ||
                            row.collection_type ||
                            "—"
                        )}
                    </strong>
                </td>

                <td>
                    ${number(
                        row.members
                    ).toLocaleString()}
                </td>

                <td>
                    ${number(
                        row.counts ??
                        row.count ??
                        row.collection_count
                    ).toLocaleString()}
                </td>

                <td class="amount">
                    ${money(
                        row.amount
                    )}
                </td>

                <td class="amount">
                    ${
                        number(
                            row.ps ??
                            row.ps_amount
                        ) === 0
                            ? "—"
                            : money(
                                row.ps ??
                                row.ps_amount
                            )
                    }
                </td>

                <td class="amount">
                    ${
                        number(
                            row.apportionment ??
                            row.apportionment_amount
                        ) === 0
                            ? "—"
                            : money(
                                row.apportionment ??
                                row.apportionment_amount
                            )
                    }
                </td>

            `;

            body.appendChild(tr);

        });


        // ----------------------------------------------------
        // TOTAL
        // ----------------------------------------------------

        footer.innerHTML = `

            <tr>

                <td>
                    TOTAL
                </td>

                <td>
                    ${number(
                        totals.members
                    ).toLocaleString()}
                </td>

                <td>
                    ${number(
                        totals.counts ??
                        totals.count ??
                        totals.collection_count
                    ).toLocaleString()}
                </td>

                <td class="amount">
                    ${money(
                        totals.amount
                    )}
                </td>

                <td class="amount">
                    ${money(
                        totals.ps ??
                        totals.ps_amount
                    )}
                </td>

                <td class="amount">
                    ${money(
                        totals.apportionment ??
                        totals.apportionment_amount
                    )}
                </td>

            </tr>

        `;
    }


    // --------------------------------------------------------
    // DASHBOARD CARDS
    // --------------------------------------------------------

    document.getElementById(
        "totalMembers"
    ).textContent =
        number(
            totals.members
        ).toLocaleString();


    document.getElementById(
        "totalCounts"
    ).textContent =
        number(
            totals.counts ??
            totals.count ??
            totals.collection_count
        ).toLocaleString();


    document.getElementById(
        "totalAmount"
    ).textContent =
        money(
            totals.amount
        );


    document.getElementById(
        "totalPS"
    ).textContent =
        money(
            totals.ps ??
            totals.ps_amount
        );


    document.getElementById(
        "totalApportionment"
    ).textContent =
        money(
            totals.apportionment ??
            totals.apportionment_amount
        );
}


// ============================================================
// FALLBACK TOTAL CALCULATION
// ============================================================

function calculateSummaryTotals(rows) {

    const totals = {

        members: 0,

        counts: 0,

        amount: 0,

        ps: 0,

        apportionment: 0

    };


    rows.forEach(row => {

        totals.members +=
            number(row.members);

        totals.counts +=
            number(
                row.counts ??
                row.count ??
                row.collection_count
            );

        totals.amount +=
            number(row.amount);

        totals.ps +=
            number(
                row.ps ??
                row.ps_amount
            );

        totals.apportionment +=
            number(
                row.apportionment ??
                row.apportionment_amount
            );

    });


    return totals;
}


// ============================================================
// COLLECTION METHODS
// ============================================================

function renderMethods(report) {

    const body =
        document.getElementById(
            "methodBody"
        );

    if (!body) {
        return;
    }

    body.innerHTML = "";


    const rows =
        Array.isArray(report)
            ? report
            : Array.isArray(report?.rows)
                ? report.rows
                : [];


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="3"
                    class="empty"
                >
                    No collection methods found.
                </td>
            </tr>
        `;

        return;
    }


    rows.forEach(row => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                ${escapeHtml(
                    row.method ||
                    row.payment_method ||
                    "—"
                )}
            </td>

            <td>
                ${number(
                    row.counts ??
                    row.count ??
                    row.collection_count
                ).toLocaleString()}
            </td>

            <td class="amount">
                ${money(
                    row.amount
                )}
            </td>

        `;


        body.appendChild(tr);

    });
}


// ============================================================
// DETAIL REPORT
// ============================================================

function renderDetail(report) {

    const body =
        document.getElementById(
            "detailBody"
        );

    if (!body) {
        return;
    }

    body.innerHTML = "";


    const rows =
        Array.isArray(report)
            ? report
            : Array.isArray(report?.rows)
                ? report.rows
                : [];


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="12"
                    class="empty"
                >
                    No receipt records found.
                </td>
            </tr>
        `;

        return;
    }


    rows.forEach(row => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(
                        row.receipt_no ||
                        row.receipt_number ||
                        "—"
                    )}
                </strong>
            </td>

            <td>
                ${dateString(
                    row.date ||
                    row.collection_date
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.donor ||
                    row.member_name ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.method ||
                    row.payment_method ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.reference_no ||
                    row.reference_number ||
                    ""
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.status ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.type ||
                    row.collection_type ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.item ||
                    row.collection_item ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.target ||
                    "—"
                )}
            </td>

            <td class="amount">
                ${money(
                    row.amount
                )}
            </td>

            <td class="amount">
                ${
                    number(
                        row.ps_amount ??
                        row.ps
                    ) === 0
                        ? "—"
                        : money(
                            row.ps_amount ??
                            row.ps
                        )
                }
            </td>

            <td class="amount">
                ${
                    number(
                        row.apportionment_amount ??
                        row.apportionment
                    ) === 0
                        ? "—"
                        : money(
                            row.apportionment_amount ??
                            row.apportionment
                        )
                }
            </td>

        `;


        body.appendChild(tr);

    });
}


// ============================================================
// ACCOUNTING SETTINGS
// ============================================================

async function loadSettings() {

    const container =
        document.getElementById(
            "settingsGrid"
        );

    if (!container) {
        return;
    }


    try {

        container.innerHTML = `
            <div class="empty">
                Loading accounting settings...
            </div>
        `;


        const response =
            await fetch(
                "/api/collections/accounting/config",
                {
                    method: "GET",
                    headers: apiHeaders()
                }
            );


        if (response.status === 401) {

            sessionStorage.removeItem(
                "token"
            );

            window.location.href =
                "login.html";

            return;
        }


        if (!response.ok) {

            const error =
                await readApiError(response);

            throw new Error(
                error ||
                "Unable to load accounting settings."
            );
        }


        const rows =
            await response.json();


        renderSettings(
            Array.isArray(rows)
                ? rows
                : []
        );


    } catch (error) {

        console.error(
            "SETTINGS ERROR:",
            error
        );


        container.innerHTML = `
            <div class="empty">
                Unable to load accounting settings.
            </div>
        `;
    }
}


// ============================================================
// RENDER SETTINGS
// ============================================================

function renderSettings(rows) {

    const container =
        document.getElementById(
            "settingsGrid"
        );

    container.innerHTML = "";


    if (!rows.length) {

        container.innerHTML = `
            <div class="empty">
                No calculation configurations found.
            </div>
        `;

        return;
    }


    rows.forEach(row => {

        const div =
            document.createElement("div");

        div.className =
            "setting-row";


        div.innerHTML = `

            <div>

                <div class="setting-title">
                    ${escapeHtml(
                        row.collection_type_name ||
                        row.name ||
                        "Collection Type"
                    )}
                </div>

                <div class="small">
                    Configure rules for future collections
                </div>

            </div>


            <select
                class="ps-type"
                data-id="${row.id}"
            >

                <option
                    value="NONE"
                    ${
                        row.ps_type === "NONE"
                            ? "selected"
                            : ""
                    }
                >
                    PS: None
                </option>

                <option
                    value="PERCENTAGE"
                    ${
                        row.ps_type === "PERCENTAGE"
                            ? "selected"
                            : ""
                    }
                >
                    PS: Percentage
                </option>

                <option
                    value="FIXED"
                    ${
                        row.ps_type === "FIXED"
                            ? "selected"
                            : ""
                    }
                >
                    PS: Fixed
                </option>

            </select>


            <input
                type="number"
                step="0.01"
                min="0"
                class="ps-rate"
                data-id="${row.id}"
                value="${number(
                    row.ps_rate
                )}"
                placeholder="PS rate"
            >


            <select
                class="app-type"
                data-id="${row.id}"
            >

                <option
                    value="NONE"
                    ${
                        row.apportionment_type === "NONE"
                            ? "selected"
                            : ""
                    }
                >
                    Apportionment: None
                </option>

                <option
                    value="PERCENTAGE"
                    ${
                        row.apportionment_type === "PERCENTAGE"
                            ? "selected"
                            : ""
                    }
                >
                    Apportionment: Percentage
                </option>

                <option
                    value="FIXED"
                    ${
                        row.apportionment_type === "FIXED"
                            ? "selected"
                            : ""
                    }
                >
                    Apportionment: Fixed
                </option>

            </select>


            <input
                type="number"
                step="0.01"
                min="0"
                class="app-rate"
                data-id="${row.id}"
                value="${number(
                    row.apportionment_rate
                )}"
                placeholder="Rate"
            >


            <button
                type="button"
                class="btn-primary"
                onclick="saveSetting(${row.id})"
            >
                Save
            </button>

        `;


        container.appendChild(div);

    });
}


// ============================================================
// SAVE ACCOUNTING SETTING
// ============================================================

async function saveSetting(id) {

    try {

        const row =
            document
                .querySelector(
                    `.setting-row .ps-type[data-id="${id}"]`
                )
                ?.closest(
                    ".setting-row"
                );


        if (!row) {

            throw new Error(
                "Unable to locate calculation setting."
            );
        }


        const psType =
            row.querySelector(
                ".ps-type"
            ).value;


        const psRate =
            number(
                row.querySelector(
                    ".ps-rate"
                ).value
            );


        const appType =
            row.querySelector(
                ".app-type"
            ).value;


        const appRate =
            number(
                row.querySelector(
                    ".app-rate"
                ).value
            );


        // ----------------------------------------------------
        // Get existing configuration
        // ----------------------------------------------------

        const settingsResponse =
            await fetch(
                "/api/collections/accounting/config",
                {
                    method: "GET",
                    headers: apiHeaders()
                }
            );


        if (!settingsResponse.ok) {

            const error =
                await readApiError(
                    settingsResponse
                );

            throw new Error(
                error ||
                "Unable to read accounting settings."
            );
        }


        const settings =
            await settingsResponse.json();


        const existing =
            settings.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!existing) {

            throw new Error(
                "Calculation setting not found."
            );
        }


        // ----------------------------------------------------
        // Save
        // ----------------------------------------------------

        const response =
            await fetch(
                "/api/collections/accounting/config",
                {
                    method: "PUT",

                    headers:
                        apiHeaders(),

                    body:
                        JSON.stringify({

                            collection_type_id:
                                existing.collection_type_id,

                            collection_type_name:
                                existing.collection_type_name,

                            ps_type:
                                psType,

                            ps_rate:
                                psRate,

                            apportionment_type:
                                appType,

                            apportionment_rate:
                                appRate,

                            active:
                                true

                        })
                }
            );


        if (!response.ok) {

            const error =
                await readApiError(
                    response
                );

            throw new Error(
                error ||
                "Unable to save accounting setting."
            );
        }


        alert(
            "Accounting calculation saved successfully."
        );


        // ----------------------------------------------------
        // Refresh report because calculations may change
        // ----------------------------------------------------

        await loadReports();


    } catch (error) {

        console.error(
            "SAVE SETTING ERROR:",
            error
        );

        alert(
            error.message ||
            "Unable to save accounting setting."
        );
    }
}


// ============================================================
// EXCEL EXPORT
// ============================================================

async function exportExcel() {

    if (!validateDates()) {
        return;
    }


    const {
        from,
        to,
        status
    } = getDates();


    try {

        const query =
            buildQuery();


        const response =
            await fetch(
                `/api/reports/collections/excel?${query}`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (response.status === 401) {

            sessionStorage.removeItem(
                "token"
            );

            window.location.href =
                "login.html";

            return;
        }


        if (!response.ok) {

            const error =
                await readApiError(
                    response
                );

            throw new Error(
                error ||
                "Excel export failed."
            );
        }


        const blob =
            await response.blob();


        const url =
            window.URL.createObjectURL(
                blob
            );


        const a =
            document.createElement("a");


        a.href = url;


        a.download =
            `Collection_Report_${from}_to_${to}.xlsx`;


        document.body.appendChild(a);


        a.click();


        a.remove();


        window.URL.revokeObjectURL(url);


    } catch (error) {

        console.error(
            "EXCEL EXPORT ERROR:",
            error
        );


        alert(
            error.message ||
            "Excel export failed."
        );
    }
}


// ============================================================
// START PAGE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setDefaultDates();

        await loadReports();

        await loadSettings();

    }
);