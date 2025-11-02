const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const limitInput = document.getElementById('limit-input');

const renderSearchResults = (results) => {
    searchResultsContainer.innerHTML = '';
    if (results.length > 0) {
        const table = document.createElement('table');
        table.classList.add('search-results-table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        results.forEach(post => {
            const row = document.createElement('tr');
            const textCell = document.createElement('td');
            const tweetLink = document.createElement('a');
            tweetLink.href = post.url;
            tweetLink.target = '_blank';
            tweetLink.rel = 'noopener noreferrer';
            tweetLink.textContent = post.text.replace(/<a.*?>/g, '').replace(/<\/a>/g, '');
            textCell.appendChild(tweetLink);
            row.appendChild(textCell);
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        searchResultsContainer.appendChild(table);
    } else {
        searchResultsContainer.innerHTML = '<p class="message">投稿が見つかりませんでした(´・ω・｀)</p>';
    }
};

const searchPosts = async (query) => {
    if (query.length === 0) {
        searchResultsContainer.innerHTML = '';
        return;
    }

    searchResultsContainer.innerHTML = '<p class="message">検索中...</p>';

    try {
        const limit = limitInput.value;
        const apiResponse = await fetch(`/api/posts/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            throw new Error(data.error || `APIエラー: ${apiResponse.status}`);
        }

        renderSearchResults(data);
    } catch (err) {
        console.error("検索中にエラーが発生しました:", err);
        searchResultsContainer.innerHTML = `<p class="message error">エラー: ${err.message}</p>`;
    }
};

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchPosts(e.target.value);
    }, 300);
});

limitInput.addEventListener('input', () => {
    searchPosts(searchInput.value);
});