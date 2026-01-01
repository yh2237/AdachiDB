const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const limitInput = document.getElementById('limit-input');
const fromInput = document.getElementById('from-input');
const toInput = document.getElementById('to-input');

const renderSearchResults = (results) => {
    searchResultsContainer.innerHTML = '';

    if (results.length === 0) {
        searchResultsContainer.innerHTML =
            '<p class="message">投稿が見つかりませんでした(´・ω・｀)</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('search-results-table');

    const colgroup = document.createElement('colgroup');

    const colDate = document.createElement('col');
    colDate.style.width = '20%';

    const colText = document.createElement('col');

    colgroup.appendChild(colDate);
    colgroup.appendChild(colText);
    table.appendChild(colgroup);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const dateTh = document.createElement('th');
    dateTh.textContent = '日付';
    dateTh.classList.add('post-date');

    const textTh = document.createElement('th');
    textTh.textContent = '投稿';

    headerRow.appendChild(dateTh);
    headerRow.appendChild(textTh);
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');

    results.forEach(post => {
        const row = document.createElement('tr');


        const dateCell = document.createElement('td');
        dateCell.classList.add('post-date');
        dateCell.textContent = post.createdAt
            ? post.createdAt.replace('T', ' ').slice(0, 16)
            : '';

        const textCell = document.createElement('td');
        const tweetLink = document.createElement('a');
        tweetLink.href = post.url;
        tweetLink.target = '_blank';
        tweetLink.rel = 'noopener noreferrer';
        tweetLink.textContent = post.text
            .replace(/<a.*?>/g, '')
            .replace(/<\/a>/g, '');

        textCell.appendChild(tweetLink);

        row.appendChild(dateCell);
        row.appendChild(textCell);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    searchResultsContainer.appendChild(table);
};



const searchPosts = async (query) => {
    if (query.length === 0) {
        searchResultsContainer.innerHTML = '';
        return;
    }

    searchResultsContainer.innerHTML = '<p class="message">検索中...</p>';

    try {
        const limit = limitInput.value;
        const from = fromInput.value;
        const to = toInput.value;

        const params = new URLSearchParams({
            q: query,
            limit
        });

        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const apiResponse = await fetch(`/proxy/3000/api/posts/search?${params.toString()}`);
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

fromInput?.addEventListener('change', () => {
    searchPosts(searchInput.value);
});

toInput?.addEventListener('change', () => {
    searchPosts(searchInput.value);
});