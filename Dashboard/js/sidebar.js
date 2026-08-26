(() => {
    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) return;

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const navigation = [
        ["index.html", "Dashboard"],
        ["members.html", "Members"],
        ["collections.html", "Collections"],
        ["funds.html", "Funds"],
        ["expenses.html", "Expenses"],
        ["vouchers.html", "Vouchers"],
        ["reports.html", "Reports"],
        ["audit.html", "Audit Trail"],
        ["users.html", "Users"],
        ["settings.html", "Settings"]
    ];

    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <h2>MAUI UMC</h2>
        </div>
        <button class="sidebar-toggle" type="button" aria-expanded="false" aria-controls="siteNavigation">
            Menu
        </button>
        <ul class="sidebar-menu" id="siteNavigation">
            ${navigation.map(([page, label]) => `
                <li class="${page === currentPage ? "active" : ""}">
                    <a href="${page}">${label}</a>
                </li>
            `).join("")}
            <li class="sidebar-logout">
                <a href="#" id="sidebarLogout">Logout</a>
            </li>
        </ul>
    `;

    const mobileTrigger = document.createElement("button");
    mobileTrigger.className = "mobile-sidebar-trigger";
    mobileTrigger.type = "button";
    mobileTrigger.textContent = "Menu";
    mobileTrigger.setAttribute("aria-expanded", "false");
    mobileTrigger.setAttribute("aria-controls", "siteNavigation");

    const mobileOverlay = document.createElement("div");
    mobileOverlay.className = "mobile-sidebar-overlay";
    mobileOverlay.hidden = true;
    document.body.append(mobileTrigger, mobileOverlay);

    const style = document.createElement("style");
    style.textContent = `
        .sidebar {
            position: relative;
            flex: 0 0 260px;
            min-height: 100vh;
            padding: 30px 20px;
        }
        .sidebar-brand h2 { margin-bottom: 30px; }
        .sidebar-toggle {
            display: none;
            width: 100%;
            margin-bottom: 12px;
            padding: 10px 12px;
            border: 1px solid rgba(255, 255, 255, .25);
            border-radius: 6px;
            background: transparent;
            color: white;
            cursor: pointer;
            font: inherit;
            text-align: left;
        }
        .sidebar-menu { list-style: none; padding: 0; margin: 0; }
        .sidebar-menu li { margin-bottom: 8px; }
        .sidebar-menu a {
            transition: transform 0.1s ease, background-color 0.2s ease, color 0.1s ease;
        }

        .sidebar-menu a:hover {
            background-color: #1e293b;
            color: #ffffff;
            transform: translateX(6px); /* Nudges the link 6 pixels to the right */
        }
        .sidebar-menu a:hover,
        .sidebar-menu .active a {
            background: rgba(255, 255, 255, .1);
            color: white;
        }
        .sidebar-logout { margin-top: 20px; }
        .sidebar-logout a {
            background: rgba(179, 32, 52, .15);
            border: 1px solid rgba(179, 32, 52, .3);
            color: #ffe0e0;
        }
        .action-btn,
        .btn-edit,
        .btn-delete,
        .btn-dark,
        .btn-print {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 7px 12px;
            background: white;
            color: #1b365d;
            cursor: pointer;
            font: inherit;
            font-size: .8rem;
            font-weight: 600;
        }
        .action-btn:hover,
        .btn-edit:hover,
        .btn-delete:hover,
        .btn-dark:hover,
        .btn-print:hover {
            background: #f1f5f9;
            opacity: 1;
        }
        .modal {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh;
            overflow-y: auto;
            padding: 80px;
            box-sizing: border-box;
            align-items: flex-start !important;
        }
        .modal-content {
            max-height: calc(90dvh - 40px);
            overflow-y: auto;
            margin: 0 auto;
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                bottom: 0;
                z-index: 2000;
                width: min(280px, 86vw);
                flex-basis: 100%;
                min-height: 100dvh;
                height: 100dvh;
                padding: 16px;
                overflow-y: auto;
                transform: translateX(-105%);
                transition: transform .18s ease-out;
            }
            .sidebar.mobile-open {
                transform: translateX(0);
            }
            .sidebar-toggle { display: block; }
            .sidebar-menu { display: block; }
            .container { display: block; }
            .content {
                width: 100%;
                max-width: 100%;
                min-width: 0;
                padding: 16px !important;
                overflow-x: hidden;
            }
            .topbar,
            .page-header {
                display: flex !important;
                flex-direction: column;
                align-items: stretch !important;
                gap: 12px;
                margin-bottom: 20px;
            }
            .topbar h1,
            .page-header h1 {
                font-size: 1.45rem;
            }
            .topbar button,
            .page-header button,
            .page-header .btn,
            .toolbar button {
                width: 100%;
            }
            .cards,
            .summary-grid,
            .dashboard-grid,
            .filter-grid,
            .form-grid {
                display: grid !important;
                grid-template-columns: 1fr !important;
                gap: 14px;
            }
            .card,
            .summary-card,
            .table-container,
            .table-section-container,
            .filter-card {
                width: 100%;
                min-width: 0;
            }
            .table-container,
            .table-section-container {
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch;
            }
            table {
                min-width: 640px;
            }
            .modal {
                padding: 12px !important;
            }
            .modal-content {
                width: 100% !important;
                max-width: 100% !important;
                max-height: calc(100dvh - 24px) !important;
                padding: 16px !important;
            }
            .modal-footer,
            .actions,
            .action-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .modal-footer button,
            .actions button,
            .action-buttons button {
                flex: 1 1 auto;
                min-height: 40px;
            }
        }
    `;
    document.head.appendChild(style);

    const sanitizeButton = button => {
        if (button.dataset.textOnlyButton === "true") return;

        const cleanedText = button.textContent
            .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, "")
            .replace(/\s+/g, " ")
            .trim();

        button.textContent = cleanedText ||
            button.getAttribute("aria-label") ||
            button.getAttribute("title") ||
            "Close";
        button.dataset.textOnlyButton = "true";
    };

    document.querySelectorAll("button").forEach(sanitizeButton);

    const buttonObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                if (node.matches("button")) sanitizeButton(node);
                node.querySelectorAll("button").forEach(sanitizeButton);
            });
        });
    });

    buttonObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    const updateModalScrollLock = () => {
        const modalIsOpen = Array.from(document.querySelectorAll(".modal"))
            .some(modal => {
                const styles = window.getComputedStyle(modal);
                return styles.display !== "none" && styles.visibility !== "hidden";
            });

        document.body.classList.toggle("modal-open", modalIsOpen);
    };

    const modalObserver = new MutationObserver(updateModalScrollLock);
    modalObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "style"],
        subtree: true
    });
    updateModalScrollLock();

    const toggle = sidebar.querySelector(".sidebar-toggle");
    const menu = sidebar.querySelector(".sidebar-menu");

    const closeMobileSidebar = () => {
        sidebar.classList.remove("mobile-open");
        mobileOverlay.hidden = true;
        mobileTrigger.setAttribute("aria-expanded", "false");
    };

    const openMobileSidebar = () => {
        sidebar.classList.add("mobile-open");
        mobileOverlay.hidden = false;
        mobileTrigger.setAttribute("aria-expanded", "true");
    };

    toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    mobileTrigger.addEventListener("click", () => {
        sidebar.classList.contains("mobile-open")
            ? closeMobileSidebar()
            : openMobileSidebar();
    });

    mobileOverlay.addEventListener("click", closeMobileSidebar);

    sidebar.querySelector("#sidebarLogout").addEventListener("click", event => {
        event.preventDefault();
        if (typeof handleLogout === "function") {
            handleLogout(event);
            return;
        }
        sessionStorage.clear();
        window.location.replace("login.html");
    });

    sidebar.querySelectorAll("a[href]").forEach(link => {
        link.addEventListener("click", event => {
            const target = link.getAttribute("href");

            if (
                event.defaultPrevented ||
                target === "#" ||
                link.id === "sidebarLogout" ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            event.preventDefault();
            closeMobileSidebar();
            document.body.classList.add("page-exit");

            window.setTimeout(() => {
                window.location.href = target;
            }, 100);
        });
    });
})();
