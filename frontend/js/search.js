const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const searchSummary = document.getElementById('search-summary');
const limitInput = document.getElementById('limit-input');
const fromInput = document.getElementById('from-input');
const toInput = document.getElementById('to-input');

const renderSearchResults = (results) => {
    searchResultsContainer.replaceChildren();

    if (results.length === 0) {
        searchSummary.textContent = '投稿が見つかりませんでした (´・ω・｀)';
        return;
    }

    searchSummary.textContent = `${results.length} 件の投稿が見つかりました`;

    const fragment = document.createDocumentFragment();
    results.forEach(post => {
        const dateStr = post.createdAt
            ? post.createdAt.replace('T', ' ').slice(0, 16)
            : '';

        const item = document.createElement('div');
        item.className = 'search-result-item';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'search-result-date';
        dateSpan.textContent = dateStr;

        const link = document.createElement('a');
        link.href = post.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'search-result-link';
        link.textContent = (post.text ?? '').replace(/<[^>]*>/g, '');

        item.appendChild(dateSpan);
        item.appendChild(link);
        fragment.appendChild(item);
    });
    searchResultsContainer.appendChild(fragment);
};

const searchPosts = async (query) => {
    if (query.length === 0) {
        searchResultsContainer.replaceChildren();
        searchSummary.textContent = '';
        return;
    }

    searchSummary.textContent = '';
    searchResultsContainer.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'message';
    loading.textContent = '検索中...';
    searchResultsContainer.appendChild(loading);

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
        searchResultsContainer.replaceChildren();
        const errMsg = document.createElement('p');
        errMsg.className = 'message error';
        errMsg.textContent = `エラー: ${err.message}`;
        searchResultsContainer.appendChild(errMsg);
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
