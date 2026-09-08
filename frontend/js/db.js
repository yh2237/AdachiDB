document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#db-table tbody');
    const refreshBtn = document.getElementById('refresh-btn');
    const limitInput = document.getElementById('limit-input');

    async function fetchData() {
        try {
            const rawLimit = parseInt(limitInput.value, 10) || 200;
            const limit = Math.min(Math.max(rawLimit, 1), 1000);
            const response = await fetch(`/api/posts/all?limit=${limit}`);
            const data = await response.json();

            tableBody.replaceChildren();
            const fragment = document.createDocumentFragment();

            data.forEach(post => {
                const row = document.createElement('tr');
                const idCell = document.createElement('td');
                idCell.textContent = post.id;
                const urlCell = document.createElement('td');
                const urlLink = document.createElement('a');
                urlLink.href = post.url;
                urlLink.target = '_blank';
                urlLink.textContent = post.url;
                urlCell.appendChild(urlLink);
                const embedCell = document.createElement('td');
                embedCell.textContent = post.embed ? 'Yes' : 'No';
                const textCell = document.createElement('td');
                const pre = document.createElement('pre');
                pre.textContent = post.text || '';
                textCell.appendChild(pre);
                const statusCell = document.createElement('td');
                statusCell.textContent = post.status;
                const dateCell = document.createElement('td');
                dateCell.textContent = post.createdAt || '';
                row.append(idCell, urlCell, embedCell, textCell, statusCell, dateCell);
                fragment.appendChild(row);
            });
            tableBody.appendChild(fragment);
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.replaceChildren();
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.textContent = 'Error loading data.';
            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    }

    refreshBtn.addEventListener('click', fetchData);

    fetchData();
});
