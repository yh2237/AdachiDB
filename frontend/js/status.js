async function loadRandomCount() {
    const el = document.getElementById("random-count");
    el.textContent = "";

    try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const item = data.find(obj => obj.endpoint === "/api/posts/random");

        el.textContent = item ? item.count : "対象データなし";
    } catch (err) {
        console.error(err);
        el.textContent = "取得失敗";
    }
}

loadRandomCount();

document.getElementById("refresh-button").addEventListener("click", loadRandomCount);