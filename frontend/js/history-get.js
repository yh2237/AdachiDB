async function loadHistory() {
    try {
        const response = await fetch("/data/history.json");

        if (!response.ok) {
            throw new Error("HTTPエラー: " + response.status);
        }

        const json = await response.json();
        const ul = document.getElementById("list");

        ul.innerHTML = "";

        json.data.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            ul.appendChild(li);
        });

    } catch (error) {
        console.error("読み込み失敗:", error);
    }
}

loadHistory();