(function () {
    const target = document.getElementById("AdachiDB-random");
    const button = document.getElementById("AdachiDB-button");

    const style = document.createElement("style");
    style.textContent = `
    #AdachiDB-random {
      margin-bottom: 10px;
      text-align: center;
    }
    #AdachiDB-button {
      padding: 6px 12px;
      font-size: 14px;
      border-radius: 6px;
      border: 1px solid #ccc;
      background: #f5f5f5;
      cursor: pointer;
      transition: 0.2s;
    }
    #AdachiDB-refresh:hover {
      background: #e9e9e9;
    }
  `;
    document.head.appendChild(style);

    function loadTweet() {
        fetch("https://adachi.2237yh.net/api/posts/random")
            .then(res => res.json())
            .then(data => {
                if (!target) return;
                target.innerHTML = data.embed;

                const scripts = target.querySelectorAll("script");
                scripts.forEach(oldScript => {
                    const newScript = document.createElement("script");
                    if (oldScript.src) {
                        newScript.src = oldScript.src;
                    } else {
                        newScript.textContent = oldScript.textContent;
                    }
                    newScript.async = true;
                    document.body.appendChild(newScript);
                });
            })
            .catch(err => console.error("Widget Error:", err));
    }

    loadTweet();

    button.addEventListener("click", () => {
        target.innerHTML = "読み込み中...";
        loadTweet();
    });
})();