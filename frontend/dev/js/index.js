import { initPostButton } from '/proxy/3000/dev/js/post-button.js';

const tweetEmbedContainer = document.querySelector('.tweet-embed-container');
const loadingMessage = document.getElementById('loading-message');
const refreshButton = document.getElementById('refresh-button');

const fetchRandomPostAndEmbed = async () => {
    loadingMessage.textContent = '読み込み中...';
    loadingMessage.style.display = 'block';
    loadingMessage.classList.remove('error');
    tweetEmbedContainer.innerHTML = '';
    initPostButton('post-button', '');

    try {
        const apiResponse = await fetch(`/proxy/3000/api/posts/random`);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            throw new Error(data.error || `APIエラー: ${apiResponse.status}`);
        }

        const post = data;

        if (post && post.embed) {
            tweetEmbedContainer.innerHTML = post.embed;
            const postText = `#ランダム足立語録\nhttps://adachi.2237yh.net\n\n${post.url}`;
            initPostButton('post-button', postText);

            if (window.twttr && window.twttr.widgets) {
                window.twttr.widgets.load(tweetEmbedContainer);
            } else {
                const script = document.createElement('script');
                script.src = 'https://platform.twitter.com/widgets.js';
                script.async = true;
                script.charset = 'utf-8';
                script.onload = () => {
                    if (window.twttr && window.twttr.widgets) {
                        window.twttr.widgets.load(tweetEmbedContainer);
                    }
                };
                document.body.appendChild(script);
            }
        } else {
            tweetEmbedContainer.innerHTML = '<p class="message">投稿が見つかりませんでした(´・ω・｀)</p>';
        }
    } catch (err) {
        console.error("投稿の取得または埋め込み中にエラーが発生しました:", err);
        loadingMessage.textContent = `エラー: ${err.message}`;
        loadingMessage.classList.add('error');
        tweetEmbedContainer.innerHTML = '';
    } finally {
        if (loadingMessage.classList.contains('error') || tweetEmbedContainer.innerHTML !== '') {
            loadingMessage.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', fetchRandomPostAndEmbed);
refreshButton.addEventListener('click', fetchRandomPostAndEmbed);