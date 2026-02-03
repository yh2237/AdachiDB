const responses = [
  { id: 'response1', file: '/data/response1.json' },
  { id: 'response2', file: '/data/response2.json' },
  { id: 'response3', file: '/data/response3.json' },
  { id: 'response4', file: '/data/response4.json' },
];

responses.forEach(({ id, file }) => {
  const element = document.getElementById(id);
  if (!element) return;

  fetch(file)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((text) => {
      element.textContent = text;
    })
    .catch((err) => {
      element.textContent = `読み込み失敗: ${err.message}`;
    });
});
