(() => {
    const textTypes = new Set(["text", "search", "email", "tel", "url"]);
    const defaultMaxLengths = {
        text: 150,
        search: 100,
        email: 254,
        tel: 20,
        url: 2048,
        password: 128,
        textarea: 2000
    };

    const fieldRules = {
        officialName: { maxLength: 150, pattern: /^[\p{L} .'-]+$/u, message: "Use letters, spaces, hyphens, apostrophes, or periods only." },
        name1: { maxLength: 150, pattern: /^[\p{L} .'-]+$/u, message: "Use letters, spaces, hyphens, apostrophes, or periods only." },
        name2: { maxLength: 150, pattern: /^[\p{L} .'-]+$/u, message: "Use letters, spaces, hyphens, apostrophes, or periods only." },
        email: { maxLength: 254, type: "email" },
        userEmail: { maxLength: 254, type: "email" },
        tel1: { maxLength: 20, pattern: /^(09\d{9}|\+639\d{9})$/, message: "Use 09XXXXXXXXX or +639XXXXXXXXX." },
        tel2: { maxLength: 20, pattern: /^(09\d{9}|\+639\d{9})$/, message: "Use 09XXXXXXXXX or +639XXXXXXXXX." },
        loginId: { maxLength: 50, pattern: /^[A-Za-z0-9._-]+$/, message: "Use letters, numbers, periods, underscores, or hyphens only." },
        password: { maxLength: 128, minLength: 8, message: "Password must be 8 to 128 characters." },
        address: { maxLength: 300, pattern: /^[\p{L}\p{N} ,.#\/-]+$/u, message: "Use letters, numbers, commas, periods, hyphens, #, or slashes only." },
        typeName: { maxLength: 100 },
        description: { maxLength: 250 },
        expFund: { maxLength: 100 },
        expPayee: { maxLength: 150 },
        expReference: { maxLength: 50, pattern: /^[A-Za-z0-9\/-]+$/, message: "Use letters, numbers, hyphens, or slashes only." },
        expReceiptUrl: { maxLength: 2048, type: "url" },
        expDescription: { maxLength: 250 },
        expNotes: { maxLength: 2000 },
        searchInput: { maxLength: 100 },
        searchExpense: { maxLength: 100 },
        searchAudit: { maxLength: 100 },
        searchBox: { maxLength: 100 },
        memberSearchBox: { maxLength: 100 },
        collectionDate: { maxDate: "today" },
        expDate: { maxDate: "today" },
        dob: { maxDate: "today" },
        baptistDate: { maxDate: "today" },
        joinChurchDate: { maxDate: "today" }
    };

    const getRule = input => fieldRules[input.id] || {};

    const configureLengthLimit = input => {
        if (input.disabled) return;

        const rule = getRule(input);
        if (!input.hasAttribute("maxlength")) {
            const maxLength = rule.maxLength || defaultMaxLengths[input.type || input.tagName.toLowerCase()];
            if (maxLength) input.maxLength = maxLength;
        }
        if (rule.type) input.type = rule.type;
        if (rule.minLength) input.minLength = rule.minLength;
        if (rule.pattern && !input.hasAttribute("pattern")) input.pattern = rule.pattern.source;
    };

    const normalizeInput = input => {
        if (!textTypes.has(input.type) || input.disabled) return;
        input.value = input.value.trim();
    };

    const validateForm = form => {
        const inputs = Array.from(form.querySelectorAll("input, select, textarea"));

        inputs.forEach(input => {
            normalizeInput(input);
            input.setCustomValidity("");

            const rule = getRule(input);
            if (input.value && rule.pattern && !rule.pattern.test(input.value)) {
                input.setCustomValidity(rule.message);
            }
            if (input.value && rule.minLength && input.value.length < rule.minLength) {
                input.setCustomValidity(rule.message);
            }
            if (input.value && rule.maxDate === "today" && input.value > new Date().toISOString().slice(0, 10)) {
                input.setCustomValidity("This date cannot be in the future.");
            }

            if (input.required && !String(input.value || "").trim()) {
                input.setCustomValidity("Please complete this field.");
            }
        });

        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }

        return true;
    };

    document.querySelectorAll("input, textarea").forEach(configureLengthLimit);

    document.querySelectorAll("form").forEach(form => {
        form.addEventListener("submit", event => {
            if (!validateForm(form)) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);

        form.querySelectorAll("input, textarea").forEach(input => {
            input.addEventListener("input", () => {
                if (input.validationMessage) {
                    input.setCustomValidity("");
                }
            });
        });
    });
})();
