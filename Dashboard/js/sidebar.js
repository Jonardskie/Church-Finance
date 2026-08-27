(() => {
    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) return;

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const userRole = (sessionStorage.getItem("role") || "member").toLowerCase();

    // Role-based page permission mapping
    const pagePermissions = {
        "index.html": ["admin", "pastor", "treasurer", "secretary", "finance"],
        "members.html": ["admin", "pastor", "treasurer", "secretary", "finance"],
        "collections.html": ["admin", "pastor", "treasurer", "secretary", "finance"],
        "funds.html": ["admin", "treasurer", "finance"],
        "expenses.html": ["admin", "pastor", "treasurer", "finance"],
        "reports.html": ["admin", "pastor", "treasurer", "finance"],
        "audit.html": ["admin", "pastor", "treasurer", "finance"],
        "settings.html": ["admin", "pastor", "treasurer", "secretary", "finance"]
    };

    // Client-side Page Guard
    if (pagePermissions[currentPage] && !pagePermissions[currentPage].includes(userRole)) {
        if (userRole === "member") {
            window.location.replace("member_portal.html");
            return;
        } else {
            alert("Access Restricted: You do not have authorization to view this section.");
            window.location.replace("index.html");
            return;
        }
    }

    const allNavigation = [
        ["index.html", "Dashboard", "📊", ["admin", "pastor", "treasurer", "secretary", "finance"]],
        ["members.html", "Members", "👥", ["admin", "pastor", "treasurer", "secretary", "finance"]],
        ["collections.html", "Collections", "📥", ["admin", "pastor", "treasurer", "secretary", "finance"]],
        ["funds.html", "Funds", "💰", ["admin", "treasurer", "finance"]],
        ["expenses.html", "Expenses", "📤", ["admin", "pastor", "treasurer", "finance"]],
        ["reports.html", "Reports", "📈", ["admin", "pastor", "treasurer", "finance"]],
        ["audit.html", "Audit Trail", "🛡️", ["admin", "pastor", "treasurer", "finance"]],
        ["settings.html", "Settings", "⚙️", ["admin", "pastor", "treasurer", "secretary", "finance"]]
    ];

    const allowedNavigation = allNavigation.filter(([page, label, icon, roles]) =>
        roles.includes(userRole)
    );

    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <div class="brand-header-info">
                <div class="brand-title-wrap">
                    <span style="font-size: 1.25rem;">⛪</span>
                    <h2>MAUI UMC</h2>
                </div>
                <p class="brand-subtitle">Church Financial System</p>
            </div>
            <button class="mobile-sidebar-close" id="mobileSidebarClose" type="button" aria-label="Close navigation">✕</button>
        </div>
        <ul class="sidebar-menu" id="siteNavigation">
            ${allowedNavigation.map(([page, label, icon]) => `
                <li class="${page === currentPage ? "active" : ""}">
                    <a href="${page}">
                        <span class="nav-icon" style="font-size:1.05rem; display:inline-flex; align-items:center; justify-content:center; width:22px;">${icon}</span>
                        <span class="nav-label">${label}</span>
                    </a>
                </li>
            `).join("")}
            <li class="sidebar-logout">
                <a href="#" id="sidebarLogout">
                    <span class="nav-icon" style="font-size:1.05rem; display:inline-flex; align-items:center; justify-content:center; width:22px;">🚪</span>
                    <span class="nav-label">Logout</span>
                </a>
            </li>
        </ul>
    `;

    // Ensure only a single mobile trigger and overlay exist
    let mobileTrigger = document.querySelector(".mobile-sidebar-trigger");
    if (!mobileTrigger) {
        mobileTrigger = document.createElement("button");
        mobileTrigger.className = "mobile-sidebar-trigger";
        mobileTrigger.type = "button";
        mobileTrigger.innerHTML = `<span>☰</span> <span>Menu</span>`;
        mobileTrigger.setAttribute("aria-expanded", "false");
        mobileTrigger.setAttribute("aria-controls", "siteNavigation");
        document.body.appendChild(mobileTrigger);
    }

    let mobileOverlay = document.querySelector(".mobile-sidebar-overlay");
    if (!mobileOverlay) {
        mobileOverlay = document.createElement("div");
        mobileOverlay.className = "mobile-sidebar-overlay";
        mobileOverlay.hidden = true;
        document.body.appendChild(mobileOverlay);
    }

    const closeMobileSidebar = () => {
        sidebar.classList.remove("mobile-open");
        mobileOverlay.hidden = true;
        mobileTrigger.setAttribute("aria-expanded", "false");
        document.body.classList.remove("modal-open");
    };

    const openMobileSidebar = () => {
        sidebar.classList.add("mobile-open");
        mobileOverlay.hidden = false;
        mobileTrigger.setAttribute("aria-expanded", "true");
        document.body.classList.add("modal-open");
    };

    mobileTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        sidebar.classList.contains("mobile-open")
            ? closeMobileSidebar()
            : openMobileSidebar();
    });

    mobileOverlay.addEventListener("click", closeMobileSidebar);

    const closeBtn = sidebar.querySelector("#mobileSidebarClose");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeMobileSidebar);
    }

    // Modal scroll locking helper
    const updateModalScrollLock = () => {
        const modalIsOpen = Array.from(document.querySelectorAll(".modal"))
            .some(modal => {
                const styles = window.getComputedStyle(modal);
                return styles.display !== "none" && styles.visibility !== "hidden";
            });

        if (!sidebar.classList.contains("mobile-open")) {
            document.body.classList.toggle("modal-open", modalIsOpen);
        }
    };

    const modalObserver = new MutationObserver(updateModalScrollLock);
    modalObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "style"],
        subtree: true
    });

    // Handle logout safely
    const logoutBtn = sidebar.querySelector("#sidebarLogout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", event => {
            event.preventDefault();
            if (typeof handleLogout === "function") {
                handleLogout(event);
                return;
            }
            if (confirm("Are you sure you want to log out of CFMMS?")) {
                sessionStorage.clear();
                localStorage.removeItem("cfmms:dashboard:summary");
                window.location.replace("login.html");
            }
        });
    }

    // Smooth page transitions on internal nav
    sidebar.querySelectorAll("a[href]").forEach(link => {
        link.addEventListener("click", event => {
            const target = link.getAttribute("href");

            if (
                event.defaultPrevented ||
                !target ||
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
            }, 80);
        });
    });
})();
