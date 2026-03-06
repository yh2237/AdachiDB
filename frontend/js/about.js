async function loadDbStats() {
    const el = document.getElementById('db-stats');
    try {
        const [countRes, dateRes] = await Promise.all([
            fetch('/api/posts/count'),
            fetch('/api/posts/date-range'),
        ]);
        if (!countRes.ok) throw new Error(`HTTP ${countRes.status}`);
        if (!dateRes.ok) throw new Error(`HTTP ${dateRes.status}`);

        const { count } = await countRes.json();
        const { oldest, newest } = await dateRes.json();

        const fmt = (str) => {
            if (!str) return '不明';
            const d = new Date(str.replace(' ', 'T'));
            return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        };

        el.textContent = `${fmt(oldest)}から${fmt(newest)}までの${count.toLocaleString()}件のツイートが保存されています。`;
    } catch (err) {
        console.error(err);
        el.textContent = 'ツイート数の取得に失敗しました。';
    }
}

loadDbStats();
