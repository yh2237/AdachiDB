export function initPostButton(buttonId, tweetText) {
    const button = document.getElementById(buttonId);

    if (!button) {
        console.error(`ボタン要素 (ID: ${buttonId}) が見つかりませんでした。`);
        return;
    }
    button.onclick = null;
    if (tweetText) {
        button.style.display = 'inline-block';
        button.onclick = () => {
            const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(tweetUrl, '_blank');
        };
    } else {
        button.style.display = 'none';
    }
}