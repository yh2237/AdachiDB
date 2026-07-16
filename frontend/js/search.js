const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const searchSummary = document.getElementById('search-summary');
const limitInput = document.getElementById('limit-input');
const fromInput = document.getElementById('from-input');
const toInput = document.getElementById('to-input');

const renderSearchResults = (results) => {
    searchResultsContainer.innerHTML = '';

    if (results.length === 0) {
        searchSummary.textContent = '投稿が見つかりませんでした (´・ω・｀)';
        return;
    }

    searchSummary.textContent = `${results.length} 件の投稿が見つかりました`;

    results.forEach(post => {
        const dateStr = post.createdAt
            ? post.createdAt.replace('T', ' ').slice(0, 16)
            : '';

        const item = document.createElement('div');
        item.className = 'search-result-item';

        const textContent = (post.text ?? '')
            .replace(/<a.*?>/g, '')
            .replace(/<\/a>/g, '');

        item.innerHTML = `
            <span class="search-result-date">${dateStr}</span>
            <a href="${post.url}" target="_blank" rel="noopener noreferrer" class="search-result-link">${textContent}</a>
        `;

        searchResultsContainer.appendChild(item);
    });
};

const searchPosts = async (query) => {
    if (query.length === 0) {
        searchResultsContainer.innerHTML = '';
        searchSummary.textContent = '';
        return;
    }

    searchSummary.textContent = '';
    searchResultsContainer.innerHTML = '<p class="message">検索中...</p>';

    try {
        const limit = limitInput.value;
        const from = fromInput.value;
        const to = toInput.value;

        const params = new URLSearchParams({ q: query, limit });

        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const apiResponse = await fetch(`/api/posts/search?${params.toString()}`);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            throw new Error(data.error || `APIエラー: ${apiResponse.status}`);
        }

        renderSearchResults(data);
    } catch (err) {
        console.error('検索中にエラーが発生しました:', err);
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
    if (searchInput.value) searchPosts(searchInput.value);
});

fromInput.addEventListener('change', () => {
    if (searchInput.value) searchPosts(searchInput.value);
});

toInput.addEventListener('change', () => {
    if (searchInput.value) searchPosts(searchInput.value);
});
