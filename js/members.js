async function loadMembers() {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch("http://localhost:3000/api/members", {
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