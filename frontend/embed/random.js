(function () {
    fetch("https://adachi.2237yh.net/api/posts/random")
        .then(res => res.json())
        .then(data => {
            const target = document.getElementById("AdachiDB-random");
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
})();
