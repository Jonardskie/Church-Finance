(() => {
    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) return;

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const userRole = (sessionStorage.getItem("role") || "member").toLowerCase();
    const rawName = sessionStorage.getItem("name") || sessionStorage.getItem("username") || "Staff Member";
    const username = sessionStorage.getItem("username") || "admin";
    const userRoleDisplay = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    const userInitial = rawName.charAt(0).toUpperCase() || "U";

    // Role badge color helper
    let roleBadgeClass = "bg-slate-500/20 text-slate-300 border-slate-500/30";
    if (userRole === "admin") roleBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";
    else if (userRole === "pastor") roleBadgeClass = "bg-blue-500/20 text-blue-300 border-blue-500/30";
    else if (userRole === "treasurer") roleBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    else if (userRole === "secretary") roleBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";

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

    const svgIcons = {
        "index.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
        "members.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
        "collections.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h4.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20"/></svg>`,
        "funds.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        "expenses.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
        "reports.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
        "audit.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
        "settings.html": `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
    };

    const allNavigation = [
        ["index.html", "Dashboard", ["admin", "pastor", "treasurer", "secretary", "finance"]],
        ["members.html", "Members", ["admin", "pastor", "treasurer", "secretary", "finance"]],
        ["collections.html", "Collections", ["admin", "pastor", "treasurer", "secretary", "finance"]],
        ["funds.html", "Funds & Categories", ["admin", "treasurer", "finance"]],
        ["expenses.html", "Disbursements", ["admin", "pastor", "treasurer", "finance"]],
        ["reports.html", "Financial Reports", ["admin", "pastor", "treasurer", "finance"]],
        ["audit.html", "Audit Trail", ["admin", "pastor", "treasurer", "finance"]],
        ["settings.html", "System Settings", ["admin", "pastor", "treasurer", "secretary", "finance"]]
    ];

    const allowedNavigation = allNavigation.filter(([page, label, roles]) =>
        roles.includes(userRole)
    );

    const churchAcronym = sessionStorage.getItem("church_acronym") || "MAUI UMC";
    const churchName = sessionStorage.getItem("church_name") || "Maui United Methodist";

    // Modern Tailwind Sidebar Template
    sidebar.innerHTML = `
        <div class="flex flex-col flex-1 min-w-0">
            <!-- BRAND HEADER -->
            <div class="flex items-center justify-between pb-5 border-b border-white/10 mb-5">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center p-2 border border-white/15 shadow-inner flex-shrink-0">
                        <img src="/images/logo.png" alt="Logo" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='⛪'">
                    </div>
                    <div class="min-w-0">
                        <h2 id="sidebarChurchAcronym" class="text-sm font-bold text-white tracking-wide truncate">${churchAcronym}</h2>
                        <span class="text-[10px] text-amber-300 font-semibold tracking-wider uppercase block truncate">Financial System</span>
                    </div>
                </div>
                <button class="mobile-sidebar-close md:hidden text-slate-400 hover:text-white text-2xl leading-none" id="mobileSidebarClose" type="button" aria-label="Close navigation">&times;</button>
            </div>

            <!-- LOGGED-IN USER PROFILE CARD -->
            <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-5 shadow-inner relative overflow-hidden">
                <div class="absolute -top-8 -right-8 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none"></div>
                
                <div class="flex items-center gap-3 mb-2.5">
                    <div class="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm shadow flex-shrink-0">
                        <span>${userInitial}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-xs font-bold text-white truncate" title="${rawName}">${rawName}</h3>
                        <div class="text-[11px] text-slate-300 font-mono flex items-center gap-1 mt-0.5 truncate">
                            <span class="text-slate-400 text-[10px]">User:</span>
                            <span class="text-amber-200 font-medium truncate">${username}</span>
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span class="text-slate-400 font-medium">Access Role</span>
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold border ${roleBadgeClass}">
                        <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                        ${userRoleDisplay}
                    </span>
                </div>
            </div>

            <!-- NAVIGATION LINKS -->
            <nav class="space-y-1.5 flex-1" id="siteNavigation">
                ${allowedNavigation.map(([page, label]) => {
                    const isActive = page === currentPage;
                    const activeClass = isActive
                        ? "bg-white/15 text-white font-semibold shadow-sm border-l-4 border-amber-400 pl-3"
                        : "text-slate-300 hover:text-white hover:bg-white/10 font-medium pl-3.5";
                    const iconColor = isActive ? "text-amber-300" : "text-slate-400";
                    return `
                        <a href="${page}" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${activeClass}">
                            <span class="${iconColor} flex-shrink-0">${svgIcons[page] || "📄"}</span>
                            <span class="truncate">${label}</span>
                        </a>
                    `;
                }).join("")}

                <!-- MEMBER PORTAL PREVIEW LINK -->
                <a href="member_portal.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all mt-3">
                    <span class="text-emerald-400 flex-shrink-0">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </span>
                    <span class="truncate">Member Portal View</span>
                </a>
            </nav>
        </div>

        <!-- SIDEBAR FOOTER & LOGOUT -->
        <div class="pt-4 border-t border-white/10 space-y-2 mt-auto flex-shrink-0">
            <button id="sidebarLogout" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-500/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 transition-all shadow-sm active:scale-[0.98]">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span>Log Out</span>
            </button>
            <p id="sidebarChurchCopyright" class="text-[10px] text-slate-400 text-center font-normal">
                ${churchName} &copy; ${new Date().getFullYear()}
            </p>
        </div>
    `;

    // Fetch live church branding if not yet cached in session
    if (!sessionStorage.getItem("church_acronym")) {
        fetch("/api/settings/church")
            .then(res => res.json())
            .then(res => {
                if (res && res.success && res.data) {
                    sessionStorage.setItem("church_acronym", res.data.church_acronym || "CHURCH");
                    sessionStorage.setItem("church_name", res.data.church_name || "Church Finance");
                    const elAcr = document.getElementById("sidebarChurchAcronym");
                    if (elAcr && res.data.church_acronym) elAcr.textContent = res.data.church_acronym;
                    const elCpy = document.getElementById("sidebarChurchCopyright");
                    if (elCpy && res.data.church_name) elCpy.innerHTML = `${res.data.church_name} &copy; ${new Date().getFullYear()}`;
                }
            })
            .catch(() => {});
    }

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
                const currentChurch = sessionStorage.getItem("church_slug");
                sessionStorage.clear();
                // Clear all multi-tenant cached items from localStorage
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && (k.startsWith("cfmms:") || k.startsWith("church_"))) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                window.location.replace(currentChurch ? `login.html?church=${currentChurch}` : "login.html");
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

/* ============================================================
   CFMMS GLOBAL NOTIFICATION & TOAST MANAGER
   Available on all pages: showToast(msg, type, title, duration)
   Replaces clunky native alert() with sleek modern floating toasts
============================================================ */

(() => {
    function getOrCreateToastContainer() {
        let container = document.getElementById("cfmms-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "cfmms-toast-container";
            container.className = "fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0";
            document.body.appendChild(container);
        }
        return container;
    }

    const TOAST_ICONS = {
        success: `<svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`,
        error: `<svg class="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
        warning: `<svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
        info: `<svg class="w-5 h-5 text-sky-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    const TOAST_THEMES = {
        success: {
            bg: "bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10",
            iconBg: "bg-emerald-50 border border-emerald-200",
            bar: "bg-emerald-500",
            titleColor: "text-emerald-950",
            badge: "bg-emerald-100/80 text-emerald-800"
        },
        error: {
            bg: "bg-white/95 border-rose-200 text-slate-800 shadow-rose-500/10",
            iconBg: "bg-rose-50 border border-rose-200",
            bar: "bg-rose-500",
            titleColor: "text-rose-950",
            badge: "bg-rose-100/80 text-rose-800"
        },
        warning: {
            bg: "bg-white/95 border-amber-200 text-slate-800 shadow-amber-500/10",
            iconBg: "bg-amber-50 border border-amber-200",
            bar: "bg-amber-500",
            titleColor: "text-amber-950",
            badge: "bg-amber-100/80 text-amber-800"
        },
        info: {
            bg: "bg-white/95 border-sky-200 text-slate-800 shadow-sky-500/10",
            iconBg: "bg-sky-50 border border-sky-200",
            bar: "bg-sky-500",
            titleColor: "text-sky-950",
            badge: "bg-sky-100/80 text-sky-800"
        }
    };

    window.showToast = function(message, type = "info", title = null, duration = 4500) {
        if (!message) return;

        // Auto-detect type if not explicitly set
        const cleanMsg = String(message).trim();
        const lower = cleanMsg.toLowerCase();
        if (!type || type === "info") {
            if (/success|saved|updated|created|verified|deleted|reordered/i.test(lower)) type = "success";
            else if (/duplicate|already exists|warning|caution|⚠️/i.test(lower)) type = "warning";
            else if (/error|failed|invalid|restricted|denied|unauthorized|not found/i.test(lower)) type = "error";
            else type = "info";
        }

        const container = getOrCreateToastContainer();
        const theme = TOAST_THEMES[type] || TOAST_THEMES.info;
        const iconSvg = TOAST_ICONS[type] || TOAST_ICONS.info;

        const defaultTitles = {
            success: "Success",
            error: "Action Failed",
            warning: "Duplicate / Notice",
            info: "Notice"
        };
        const displayTitle = title || defaultTitles[type] || "Notice";

        const toast = document.createElement("div");
        toast.className = `cfmms-toast pointer-events-auto relative flex flex-col rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden ${theme.bg}`;

        const formattedMsg = cleanMsg.replace(/^⚠️\s*/, "").replace(/^✅\s*/, "").replace(/^❌\s*/, "");

        toast.innerHTML = `
            <div class="flex items-start gap-3.5 p-4">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${theme.iconBg}">
                    ${iconSvg}
                </div>
                <div class="flex-1 min-w-0 pr-2">
                    <div class="flex items-center gap-2 mb-0.5">
                        <h4 class="text-xs font-bold uppercase tracking-wider ${theme.titleColor}">${displayTitle}</h4>
                    </div>
                    <p class="text-xs text-slate-700 leading-relaxed font-medium break-words">${formattedMsg}</p>
                </div>
                <button type="button" class="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-lg transition-colors flex-shrink-0" aria-label="Close notification">&times;</button>
            </div>
            <div class="cfmms-toast-progress ${theme.bar}" style="transform: scaleX(1);"></div>
        `;

        const closeBtn = toast.querySelector("button");
        const progressBar = toast.querySelector(".cfmms-toast-progress");

        let startTime = Date.now();
        let remaining = duration;
        let timer = null;
        let isPaused = false;

        function dismiss() {
            if (timer) clearTimeout(timer);
            toast.classList.add("toast-hide");
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }

        closeBtn.addEventListener("click", dismiss);

        // Progress bar countdown
        progressBar.style.transition = `transform ${duration}ms linear`;
        requestAnimationFrame(() => {
            progressBar.style.transform = "scaleX(0)";
        });

        timer = setTimeout(dismiss, duration);

        toast.addEventListener("mouseenter", () => {
            isPaused = true;
            clearTimeout(timer);
            const elapsed = Date.now() - startTime;
            remaining = Math.max(500, remaining - elapsed);
            const currentScale = Math.max(0, (remaining / duration));
            progressBar.style.transition = "none";
            progressBar.style.transform = `scaleX(${currentScale})`;
        });

        toast.addEventListener("mouseleave", () => {
            if (!isPaused) return;
            isPaused = false;
            startTime = Date.now();
            progressBar.style.transition = `transform ${remaining}ms linear`;
            progressBar.style.transform = "scaleX(0)";
            timer = setTimeout(dismiss, remaining);
        });

        container.appendChild(toast);
    };

    // Polyfill native alert with modern toast
    window.alert = function(msg) {
        if (!msg) return;
        window.showToast(msg);
    };

    // Modern Confirm Dialog Modal
    window.showConfirmDialog = function({
        title = "Confirm Action",
        message = "Are you sure you want to proceed?",
        confirmText = "Confirm",
        cancelText = "Cancel",
        type = "danger"
    } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4";

            const btnColors = {
                danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
                primary: "bg-navy hover:bg-navy-dark text-white shadow-navy/20",
                success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
            };
            const confirmBtnClass = btnColors[type] || btnColors.primary;

            overlay.innerHTML = `
                <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-4 transform transition-all scale-100 my-auto" onclick="event.stopPropagation()">
                    <div class="flex items-start gap-4">
                        <div class="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-xl">
                            ${type === 'danger' ? '⚠️' : '❓'}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-base font-bold text-slate-900">${title}</h3>
                            <p class="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">${message}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-2">
                        <button type="button" id="confirmCancelBtn" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                            ${cancelText}
                        </button>
                        <button type="button" id="confirmOkBtn" class="px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-md ${confirmBtnClass}">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            function close(result) {
                overlay.classList.add("opacity-0");
                setTimeout(() => {
                    if (overlay.parentElement) overlay.remove();
                    resolve(result);
                }, 150);
            }

            overlay.querySelector("#confirmCancelBtn").onclick = () => close(false);
            overlay.querySelector("#confirmOkBtn").onclick = () => close(true);
            overlay.onclick = () => close(false);

            document.body.appendChild(overlay);
        });
    };
})();
