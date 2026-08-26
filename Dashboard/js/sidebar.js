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
            display: block;
            padding: 10px;
            border-radius: 6px;
            color: #a4bcd4;
            text-decoration: none;
            transition: background .2s ease, color .2s ease;
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
        @media (max-width: 768px) {
            .sidebar {
                flex-basis: 100%;
                min-height: auto;
                padding: 16px;
            }
            .sidebar-toggle { display: block; }
            .sidebar-menu { display: none; }
            .sidebar-menu.is-open { display: block; }
            .container { display: block; }
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

    const toggle = sidebar.querySelector(".sidebar-toggle");
    const menu = sidebar.querySelector(".sidebar-menu");

    toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

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
            document.body.classList.add("page-exit");

            window.setTimeout(() => {
                window.location.href = target;
            }, 160);
        });
    });
})();
