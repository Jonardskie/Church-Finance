async function loadMembers() {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");

    try {
        const res = await fetch("/api/members", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!res.ok) throw new Error("Unauthorized");

        const members = await res.json();
        return members;

    } catch (err) {
        console.error(err);
        return [];
    }
}