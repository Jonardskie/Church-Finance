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

let currentDetailData = null;
let currentSummaryData = null;


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
        status: document.getElementById("statusFilter")?.value || "all",
        memberId: document.getElementById("memberFilter")?.value || "all"
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
        status,
        memberId
    } = getDates();

    return (
        `from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&status=${encodeURIComponent(status)}` +
        `&memberId=${encodeURIComponent(memberId)}`
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

        // Cache globally for exporting tools
        currentSummaryData = summary;
        currentDetailData = detail;


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

        await loadTallyReportSection();


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


    // Group records by Collection Type
    const grouped = {};
    rows.forEach(row => {
        const typeKey = (row.type || row.collection_type || row.item || "UNSPECIFIED").trim().toUpperCase();
        if (!grouped[typeKey]) {
            grouped[typeKey] = [];
        }
        grouped[typeKey].push(row);
    });

    let grandAmount = 0;
    let grandPS = 0;
    let grandApp = 0;

    Object.keys(grouped).sort().forEach(typeKey => {
        const groupRows = grouped[typeKey];
        const groupAmount = groupRows.reduce((sum, r) => sum + number(r.amount), 0);
        const groupPS = groupRows.reduce((sum, r) => sum + number(r.ps_amount ?? r.ps), 0);
        const groupApp = groupRows.reduce((sum, r) => sum + number(r.apportionment_amount ?? r.apportionment), 0);

        grandAmount += groupAmount;
        grandPS += groupPS;
        grandApp += groupApp;

        // Category Header Row
        const groupHeader = document.createElement("tr");
        groupHeader.className = "bg-slate-100/90 border-t-2 border-slate-300 font-semibold";
        groupHeader.innerHTML = `
            <td colspan="9" class="py-2.5 px-4">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-navy inline-block"></span>
                    <span class="text-navy font-bold tracking-wide text-xs">COLLECTION TYPE: ${escapeHtml(typeKey)}</span>
                    <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/90 text-slate-700 font-medium">${groupRows.length} ${groupRows.length === 1 ? 'record' : 'records'}</span>
                </div>
            </td>
            <td class="amount text-navy font-bold py-2.5 px-4">${money(groupAmount)}</td>
            <td class="amount text-slate-600 font-semibold py-2.5 px-4">${groupPS === 0 ? '—' : money(groupPS)}</td>
            <td class="amount text-slate-600 font-semibold py-2.5 px-4">${groupApp === 0 ? '—' : money(groupApp)}</td>
        `;
        body.appendChild(groupHeader);

        // Individual Transaction Rows
        groupRows.forEach(row => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 transition-colors";
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
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${String(row.status).toLowerCase() === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                        ${escapeHtml(row.status || "—")}
                    </span>
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
                <td class="amount font-medium">
                    ${money(
                        row.amount
                    )}
                </td>
                <td class="amount text-slate-500">
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
                <td class="amount text-slate-500">
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

        // Category Subtotal Row
        const subtotalRow = document.createElement("tr");
        subtotalRow.className = "bg-slate-50 font-semibold text-slate-700 border-b border-slate-200";
        subtotalRow.innerHTML = `
            <td colspan="9" class="text-right py-2 px-4 text-xs text-slate-500 uppercase tracking-wider">Subtotal (${escapeHtml(typeKey)}):</td>
            <td class="amount font-bold text-slate-800 py-2 px-4">${money(groupAmount)}</td>
            <td class="amount font-semibold text-slate-600 py-2 px-4">${groupPS === 0 ? '—' : money(groupPS)}</td>
            <td class="amount font-semibold text-slate-600 py-2 px-4">${groupApp === 0 ? '—' : money(groupApp)}</td>
        `;
        body.appendChild(subtotalRow);
    });

    // Grand Total Row
    const grandRow = document.createElement("tr");
    grandRow.className = "bg-blue-50/90 font-bold text-navy border-t-2 border-navy border-b-2";
    grandRow.innerHTML = `
        <td colspan="9" class="text-right py-3 px-4 uppercase tracking-wider font-bold">Grand Total All Receipts:</td>
        <td class="amount text-emerald-700 font-bold py-3 px-4">${money(grandAmount)}</td>
        <td class="amount text-navy font-bold py-3 px-4">${grandPS === 0 ? '—' : money(grandPS)}</td>
        <td class="amount text-purple-700 font-bold py-3 px-4">${grandApp === 0 ? '—' : money(grandApp)}</td>
    `;
    body.appendChild(grandRow);
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
// LOAD MEMBERS FOR FILTER
// ============================================================

async function loadMembersFilter() {
    const memberSelect = document.getElementById("memberFilter");
    if (!memberSelect) return;

    try {
        const response = await fetch("/api/members", {
            method: "GET",
            headers: apiHeaders()
        });

        if (response.status === 401) {
            sessionStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        if (response.ok) {
            const members = await response.json();
            
            // Clear existing options except "All Members"
            memberSelect.innerHTML = '<option value="all">All Members</option>';
            
            // Sort members alphabetically by official_name
            members.sort((a, b) => (a.official_name || "").localeCompare(b.official_name || ""));
            
            members.forEach(member => {
                const opt = document.createElement("option");
                opt.value = member.member_id;
                opt.textContent = `${member.official_name} (${member.member_id})`;
                memberSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to load members for filter dropdown:", err);
    }
}


// ============================================================
// PPTX EXPORT
// ============================================================

async function exportPPTX() {
    if (!currentDetailData || !currentSummaryData) {
        alert("Please generate the report first before exporting.");
        return;
    }

    // 1. Initialize Presentation
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.title = "MUMC Financial Report";
    pptx.layout = "LAYOUT_16x9"; // Widescreen format

    // Define colors
    const navyPrimary = "1B365D";
    const navyDark = "0F2038";
    const textWhite = "FFFFFF";
    const goldColor = "EAAA00";
    const textMuted = "666666";

    // ========================================================
    // FIRST PAGE (TITLE SLIDE)
    // ========================================================
    const titleSlide = pptx.addSlide();
    
    // Solid background color
    titleSlide.background = { color: navyPrimary };

    // Add Church Title (Positioned on the top of the slide)
    titleSlide.addText("MAUI UNITED METHODIST CHURCH", {
        x: 0.8, y: 0.8, w: 11.7, h: 0.6,
        fontSize: 28, bold: true, color: goldColor,
        fontFace: "Arial"
    });

    // Add Main Heading
    titleSlide.addText("Financial & Collections Report", {
        x: 0.8, y: 1.5, w: 11.7, h: 1.2,
        fontSize: 44, bold: true, color: textWhite,
        fontFace: "Arial"
    });

    // Date Range Subtitle
    const { from, to } = getDates();
    titleSlide.addText(`Period: ${dateString(from)} to ${dateString(to)}`, {
        x: 0.8, y: 2.9, w: 11.7, h: 0.6,
        fontSize: 16, color: "A4BCD4",
        fontFace: "Arial"
    });

    // Decorative shape (gold banner line placed below the period text)
    titleSlide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 3.6, w: 12.3, h: 0.08, fill: { color: goldColor }
    });

    // Footer note
    titleSlide.addText("Maui UMC Finance Committee • Confidential", {
        x: 0.8, y: 6.2, w: 11.7, h: 0.4,
        fontSize: 12, italic: true, color: "888888",
        fontFace: "Arial"
    });

    // ========================================================
    // NEXT PAGES: ONE SLIDE PER COLLECTION TYPE
    // ========================================================
    const detailRows = Array.isArray(currentDetailData)
        ? currentDetailData
        : Array.isArray(currentDetailData?.rows)
            ? currentDetailData.rows
            : [];

    const summaryRows = Array.isArray(currentSummaryData)
        ? currentSummaryData
        : Array.isArray(currentSummaryData?.rows)
            ? currentSummaryData.rows
            : [];

    if (summaryRows.length === 0) {
        alert("No collection types to export.");
        return;
    }

    // Loop through each collection type that has contributions
    summaryRows.forEach(summaryItem => {
        const itemTypeName = summaryItem.item || summaryItem.collection_type || "UNSPECIFIED";
        const itemTotalAmount = Number(summaryItem.amount) || 0;

        if (itemTotalAmount <= 0) return; // Skip items with no amount

        // Filter detail records matching this collection type
        const matches = detailRows.filter(row => {
            const rowType = row.type || row.item || "UNSPECIFIED";
            return rowType.trim().toLowerCase() === itemTypeName.trim().toLowerCase();
        });

        // Paged slide generation to fit table cleanly inside slide limits without overlapping
        const rowsPerSlide = 10;
        const totalSlides = Math.ceil(matches.length / rowsPerSlide) || 1;

        for (let i = 0; i < totalSlides; i++) {
            const start = i * rowsPerSlide;
            const end = start + rowsPerSlide;
            const pageRows = matches.slice(start, end);

            // Add a slide for this page segment
            const slide = pptx.addSlide();

            // Slide header (navy top banner)
            slide.addShape(pptx.ShapeType.rect, {
                x: 0.0, y: 0.0, w: 13.3, h: 1.2, fill: { color: navyDark }
            });

            // Collection Type Name (appends page info if paginated)
            let pageTitle = itemTypeName.toUpperCase();
            if (totalSlides > 1) {
                pageTitle += ` (${i + 1}/${totalSlides})`;
            }

            slide.addText(pageTitle, {
                x: 0.5, y: 0.3, w: 5.0, h: 0.6,
                fontSize: 20, bold: true, color: textWhite,
                fontFace: "Arial", valign: "middle"
            });

            // Total Amount value (positioned close to the collection type name on the left)
            slide.addText(`Total: ${money(itemTotalAmount)}`, {
                x: 5.7, y: 0.3, w: 5.0, h: 0.6,
                fontSize: 20, bold: true, color: goldColor,
                align: "left", fontFace: "Arial", valign: "middle"
            });

            // Subtitle line / divider
            slide.addShape(pptx.ShapeType.rect, {
                x: 0.5, y: 1.4, w: 12.3, h: 0.02, fill: { color: "CCCCCC" }
            });

            // Table headers and data rows for breakdown (Only Member and Amount to fit cleanly)
            const tableBody = [
                [
                    { text: "Member", options: { fill: navyPrimary, color: textWhite, bold: true, fontSize: 11, fontFace: "Arial" } },
                    { text: "Amount", options: { fill: navyPrimary, color: textWhite, bold: true, fontSize: 11, align: "right", fontFace: "Arial" } }
                ]
            ];

            // Fill page rows
            pageRows.forEach(row => {
                tableBody.push([
                    { text: String(row.donor || row.member_name || "ANONYMOUS"), options: { fontSize: 11, bold: true, fontFace: "Arial" } },
                    { text: money(row.amount), options: { fontSize: 11, bold: true, align: "right", fontFace: "Arial" } }
                ]);
            });

            if (tableBody.length === 1) {
                // No details found
                slide.addText("No donor breakdown records found for this collection type.", {
                    x: 0.5, y: 2.0, w: 12.3, h: 1.0,
                    fontSize: 14, italic: true, color: textMuted,
                    fontFace: "Arial"
                });
            } else {
                // Add breakdown table matching headers alignment exactly
                slide.addTable(tableBody, {
                    x: 0.5,
                    y: 1.8,
                    colW: [4.5, 2.0],
                    border: { pt: 0.5, color: "E2E8F0" },
                    rowH: 0.35,
                    valign: "middle"
                });
            }
        }
    });

    // Save presentation
    pptx.writeFile({ fileName: `MUMC_Financial_Report_${from}_to_${to}.pptx` });
}

// ============================================================
// SUNDAY CASH COUNT & TALLY SECTION RENDERING
// ============================================================

async function loadTallyReportSection() {
    const { from, to } = getDates();
    if (!from || !to) return;

    try {
        const res = await fetch(`/api/collections/cash-tally/summary?startDate=${from}&endDate=${to}`, {
            headers: apiHeaders()
        });
        const json = await res.json();
        if (json.success && json.savedTally) {
            const t = json.savedTally;
            const b1000 = Number(t.bills_1000) || 0;
            const b500  = Number(t.bills_500) || 0;
            const b200  = Number(t.bills_200) || 0;
            const b100  = Number(t.bills_100) || 0;
            const b50   = Number(t.bills_50) || 0;
            const b20   = Number(t.bills_20) || 0;
            const c20   = Number(t.coins_20) || 0;
            const c10   = Number(t.coins_10) || 0;
            const c5    = Number(t.coins_5) || 0;
            const c1    = Number(t.coins_1) || 0;
            const cLoose = Number(t.coins_loose) || 0;
            const checks = Number(t.checks_total) || 0;
            const online = Number(t.online_total) || 0;

            const totalPhys = Number(t.total_physical_cash) || 0;
            const totalLedger = Number(t.total_ledger_amount) || 0;
            const variance = Number(t.variance_amount) || 0;

            const tbody = document.getElementById("tallyReportBody");
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td>₱1,000 Bill</td><td class="text-center font-mono">${b1000}</td><td class="text-right font-mono">${money(b1000*1000)}</td></tr>
                    <tr><td>₱500 Bill</td><td class="text-center font-mono">${b500}</td><td class="text-right font-mono">${money(b500*500)}</td></tr>
                    <tr><td>₱200 Bill</td><td class="text-center font-mono">${b200}</td><td class="text-right font-mono">${money(b200*200)}</td></tr>
                    <tr><td>₱100 Bill</td><td class="text-center font-mono">${b100}</td><td class="text-right font-mono">${money(b100*100)}</td></tr>
                    <tr><td>₱50 Bill</td><td class="text-center font-mono">${b50}</td><td class="text-right font-mono">${money(b50*50)}</td></tr>
                    <tr><td>₱20 Note</td><td class="text-center font-mono">${b20}</td><td class="text-right font-mono">${money(b20*20)}</td></tr>
                    <tr><td>₱20 Coin</td><td class="text-center font-mono">${c20}</td><td class="text-right font-mono">${money(c20*20)}</td></tr>
                    <tr><td>₱10 Coin</td><td class="text-center font-mono">${c10}</td><td class="text-right font-mono">${money(c10*10)}</td></tr>
                    <tr><td>₱5 Coin</td><td class="text-center font-mono">${c5}</td><td class="text-right font-mono">${money(c5*5)}</td></tr>
                    <tr><td>₱1 Coin</td><td class="text-center font-mono">${c1}</td><td class="text-right font-mono">${money(c1*1)}</td></tr>
                    <tr><td>Loose Coins</td><td class="text-center font-mono">—</td><td class="text-right font-mono">${money(cLoose)}</td></tr>
                    <tr><td>Checks Total</td><td class="text-center font-mono">—</td><td class="text-right font-mono">${money(checks)}</td></tr>
                    <tr><td>GCash / Online</td><td class="text-center font-mono">—</td><td class="text-right font-mono">${money(online)}</td></tr>
                    <tr class="font-bold bg-slate-100/80 text-navy"><td>TOTAL PHYSICAL CASH</td><td class="text-center font-mono">—</td><td class="text-right font-mono">${money(totalPhys)}</td></tr>
                `;
            }

            document.getElementById("tallyReportPhysical").innerText = money(totalPhys);
            document.getElementById("tallyReportLedger").innerText = money(totalLedger);
            const varEl = document.getElementById("tallyReportVariance");
            varEl.innerText = `${variance >= 0 ? '+' : ''}${money(variance)}`;

            const badge = document.getElementById("tallyBadgeStatus");
            if (Math.abs(variance) < 0.01) {
                badge.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
                badge.innerText = "✓ TALLY PERFECT MATCH";
                varEl.className = "font-black font-mono text-sm text-emerald-700";
            } else {
                badge.className = "px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse";
                badge.innerText = `⚠️ DISCREPANCY (${variance > 0 ? 'OVERAGE' : 'SHORTAGE'})`;
                varEl.className = "font-black font-mono text-sm text-red-600";
            }

            const noteBox = document.getElementById("tallyReportNoteBox");
            if (t.variance_note) {
                noteBox.classList.remove("hidden");
                document.getElementById("tallyReportNoteText").innerText = t.variance_note;
            } else {
                noteBox.classList.add("hidden");
            }

            document.getElementById("sigReportCounter").innerText = t.counter_name || "_________________";
            document.getElementById("sigReportSecretary").innerText = t.secretary_name || "_________________";
            document.getElementById("sigReportTreasurer").innerText = t.treasurer_name || "_________________";

        } else {
            const tbody = document.getElementById("tallyReportBody");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-slate-400 italic">No Sunday Cash Count saved for date range ${from} to ${to}.</td></tr>`;
            }
            const badge = document.getElementById("tallyBadgeStatus");
            if (badge) {
                badge.className = "px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200";
                badge.innerText = "No Saved Tally Record";
            }
            document.getElementById("tallyReportPhysical").innerText = money(0);
            document.getElementById("tallyReportLedger").innerText = money(json.totalLedgerAmount || 0);
            document.getElementById("tallyReportVariance").innerText = money(0);
            document.getElementById("sigReportCounter").innerText = "_________________";
            document.getElementById("sigReportSecretary").innerText = "_________________";
            document.getElementById("sigReportTreasurer").innerText = "_________________";
        }
    } catch (e) {
        console.error("Load tally report section error:", e);
    }
}


// ============================================================
// START PAGE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setDefaultDates();

        await loadMembersFilter();

        await loadReports();

        await loadSettings();

    }
);