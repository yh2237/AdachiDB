fetch("/data/response1.json")
    .then((res) => res.text())
    .then((text) => {
        document.getElementById("response1").textContent = text;
    })
    .catch((err) => {
        document.getElementById("response1").textContent = "読み込み失敗: " + err;
    });

fetch("/data/response2.json")
    .then((res) => res.text())
    .then((text) => {
        document.getElementById("response2").textContent = text;
    })
    .catch((err) => {
        document.getElementById("response2").textContent = "読み込み失敗: " + err;
    });
fetch("/data/response3.json")
    .then((res) => res.text())
    .then((text) => {
        document.getElementById("response3").textContent = text;
    })
    .catch((err) => {
        document.getElementById("response3").textContent = "読み込み失敗: " + err;
    });
fetch("/data/response4.json")
    .then((res) => res.text())
    .then((text) => {
        document.getElementById("response4").textContent = text;
    })
    .catch((err) => {
        document.getElementById("response4").textContent = "読み込み失敗: " + err;
    });
