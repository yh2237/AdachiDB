const refreshButton = document.getElementById('refresh-button');
const refreshStatus = document.getElementById('refresh-status');
const tweetEmbedShell = document.getElementById('tweet-embed-shell');
let activeSlot = document.getElementById('tweet-slot-a');
let stagingSlot = document.getElementById('tweet-slot-b');
let hasActiveTweet = false;
let statusClearTimer;

const WIDGET_LOAD_TIMEOUT_MS = 12000;

const waitForTwitterWidgets = () => {
    if (window.twttr?.widgets?.createTweet) {
        return Promise.resolve(window.twttr.widgets);
    }

    if (!document.getElementById('twitter-wjs')) {
        const script = document.createElement('script');
        script.id = 'twitter-wjs';
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.charset = 'utf-8';
        document.head.appendChild(script);
    }

    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const check = () => {
            if (window.twttr?.widgets?.createTweet) {
                resolve(window.twttr.widgets);
                return;
            }
            if (Date.now() - startedAt >= WIDGET_LOAD_TIMEOUT_MS) {
                reject(new Error('Xの埋め込み機能を読み込めませんでした！'));
                return;
            }
            window.setTimeout(check, 50);
        };

        check();
    });
};

const getTweetId = (url) => {
    const match = String(url ?? '').match(/\/status\/(\d+)/);
    return match?.[1] ?? null;
};

const renderTweetOffscreen = async (post) => {
    const tweetId = getTweetId(post?.url);
    if (!tweetId) {
        throw new Error('投稿URLからIDを取得できませんでした！');
    }

    const widgets = await waitForTwitterWidgets();
    stagingSlot.replaceChildren();

    const renderedTweet = await new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error('投稿の埋め込みがタイムアウトしました！'));
        }, WIDGET_LOAD_TIMEOUT_MS);

        Promise.resolve(
            widgets.createTweet(tweetId, stagingSlot, {
                align: 'center',
                conversation: 'none',
                dnt: true
            })
        ).then((result) => {
            window.clearTimeout(timeoutId);
            resolve(result);
        }).catch((error) => {
            window.clearTimeout(timeoutId);
            reject(error);
        });
    });

    if (!renderedTweet) {
        stagingSlot.replaceChildren();
        throw new Error('投稿を埋め込めませんでした！');
    }
};

const showStagedTweet = () => {
    const previousActiveSlot = activeSlot;

    previousActiveSlot.classList.remove('is-active');
    previousActiveSlot.classList.add('is-staging');
    previousActiveSlot.setAttribute('aria-hidden', 'true');

    stagingSlot.classList.remove('is-staging');
    stagingSlot.classList.add('is-active');
    stagingSlot.removeAttribute('aria-hidden');

    activeSlot = stagingSlot;
    stagingSlot = previousActiveSlot;
    hasActiveTweet = true;

    window.requestAnimationFrame(() => {
        stagingSlot.replaceChildren();
    });
};

const setLoadingState = (isLoading) => {
    refreshButton.disabled = isLoading;
    tweetEmbedShell.setAttribute('aria-busy', String(isLoading));

    if (isLoading) {
        window.clearTimeout(statusClearTimer);
        refreshStatus.classList.remove('error');
        refreshStatus.textContent = hasActiveTweet
            ? '次のツイートを読み込んでいます…'
            : 'ツイートを読み込んでいます…';
    }
};

const showStatus = (message, isError = false) => {
    window.clearTimeout(statusClearTimer);
    refreshStatus.textContent = message;
    refreshStatus.classList.toggle('error', isError);

    if (!isError) {
        statusClearTimer = window.setTimeout(() => {
            refreshStatus.textContent = '';
        }, 1500);
    }
};

const fetchRandomPostAndEmbed = async () => {
    setLoadingState(true);

    try {
        const apiResponse = await fetch('/api/posts/random', {
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        });
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            throw new Error(data.error || `APIエラー: ${apiResponse.status}`);
        }

        await renderTweetOffscreen(data);
        showStagedTweet();
        showStatus('新しいツイートを表示しました！');
    } catch (err) {
        console.error('投稿の取得または埋め込み中にエラーが発生しました！:', err);
        stagingSlot.replaceChildren();
        showStatus(`エラー: ${err.message}`, true);

        if (!hasActiveTweet) {
            activeSlot.innerHTML = '<p class="message error">投稿を表示できませんでした (´・ω・｀)</p>';
        }
    } finally {
        refreshButton.disabled = false;
        tweetEmbedShell.setAttribute('aria-busy', 'false');
    }
};

document.addEventListener('DOMContentLoaded', fetchRandomPostAndEmbed);
refreshButton.addEventListener('click', fetchRandomPostAndEmbed);
