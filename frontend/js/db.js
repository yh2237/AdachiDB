document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#db-table tbody');
    const refreshBtn = document.getElementById('refresh-btn');
    const limitInput = document.getElementById('limit-input');

    async function fetchData() {
        try {
            const limit = limitInput.value || 200;
            const response = await fetch(`/api/posts/all?limit=${limit}`);
            const data = await response.json();

            tableBody.innerHTML = '';

            data.forEach(post => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${post.id}</td>
                    <td><a href="${post.url}" target="_blank">${post.url}</a></td>
                    <td>${post.embed ? 'Yes' : 'No'}</td>
                    <td><pre>${post.text || ''}</pre></td>
                    <td>${post.status}</td>
                    <tbd>${post.createdAt || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = '<tr><td colspan="5">Error loading data.</td></tr>';
        }
    }

    refreshBtn.addEventListener('click', fetchData);

    fetchData();
});
