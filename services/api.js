const API_URL = "http://localhost:3000/api";

export async function getMembers() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/members`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error("Failed");

    return res.json();
}