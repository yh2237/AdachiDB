const tweetsContainer = document.getElementById('tweets-container');
const refreshButton = document.getElementById('refresh-button');

const fetchRandomPosts = async () => {
    tweetsContainer.innerHTML = '<p class="message">読み込み中...</p>';

    try {
        const apiResponse = await fetch(`/proxy/3000/api/posts/random10`);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            throw new Error(data.error || `APIエラー: ${apiResponse.status}`);
        }

        if (data && data.length > 0) {
            tweetsContainer.innerHTML = '';
            data.forEach(post => {
                const postDiv = document.createElement('div');
                postDiv.className = 'tweet-item';
                if (post && post.embed) {
                    postDiv.innerHTML = post.embed;
                } else {
                    postDiv.innerHTML = `<p class="message error">oEmbed取得失敗<br><a href="${post.url}" target="_blank">${post.url}</a></p>`;
                }
                tweetsContainer.appendChild(postDiv);
            });

            if (window.twttr && window.twttr.widgets) {
                window.twttr.widgets.load(tweetsContainer);
            } else {
                const script = document.createElement('script');
                script.src = 'https://platform.twitter.com/widgets.js';
                script.async = true;
                script.charset = 'utf-8';
                script.onload = () => {
                    if (window.twttr && window.twttr.widgets) {
                        window.twttr.widgets.load(tweetsContainer);
                    }
                };
                document.body.appendChild(script);
            }

        } else {
            tweetsContainer.innerHTML = '<p class="message">投稿が見つかりませんでした(´・ω・｀)</p>';
        }
    } catch (err) {
        console.error("投稿の取得または埋め込み中にエラーが発生しました:", err);
        tweetsContainer.innerHTML = `<p class="message error">エラー: ${err.message}</p>`;
    }
};

document.addEventListener('DOMContentLoaded', fetchRandomPosts);
refreshButton.addEventListener('click', fetchRandomPosts);