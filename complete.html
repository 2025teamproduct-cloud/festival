// /complete.js
// 紙吹雪：グミ・星・ぐるぐるキャンディ・トランプのマークが降ります。
// 金の鍵を押すと、もう一度まとめて舞います。

(function () {

    const layer = document.getElementById('confetti');

    if (!layer) {
        return;
    }

    /* 動きを減らす設定の人には紙吹雪を出さない（CSS側でも非表示） */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }


    /* ================= 設定 ================= */

    const COLORS = [
        '#d6304a',  // キャンディの赤
        '#f2a516',  // 金
        '#f7a8bd',  // アイシングのピンク
        '#4aa564',  // 緑
        '#3c7bff',  // 青
        '#d65ab8',  // 紫ピンク
        '#fff1b0'   // 淡い金
    ];

    /* 同じ形が偏らないよう、出現しやすさを重みで調整 */
    const SHAPES = [
        'gummy', 'gummy', 'gummy',
        'star', 'star',
        'swirl',
        'heart', 'diamond', 'club', 'spade'
    ];

    const isSmall = window.matchMedia('(max-width: 480px)').matches;

    /* 常に降り続ける数 */
    const BASE_COUNT = isSmall ? 26 : 46;

    /* 鍵を押したときのバースト数 */
    const BURST_COUNT = isSmall ? 24 : 40;


    /* ================= 部品 ================= */

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function createPiece(options) {

        const once = options && options.once;
        const delayMax = (options && options.delayMax) || 4;

        const el = document.createElement('span');
        const shape = pick(SHAPES);

        el.className = 'confetti ' + shape + (once ? ' once' : '');

        el.style.setProperty('--x', rand(0, 98).toFixed(1) + 'vw');
        el.style.setProperty('--size', rand(10, 19).toFixed(1) + 'px');
        el.style.setProperty('--color', pick(COLORS));
        el.style.setProperty('--dur', rand(5, 9).toFixed(2) + 's');
        el.style.setProperty('--delay', rand(0, delayMax).toFixed(2) + 's');
        el.style.setProperty('--sway', rand(12, 46).toFixed(0) + 'px');
        el.style.setProperty('--spin', (Math.random() < 0.5 ? -1 : 1) * rand(240, 720).toFixed(0) + 'deg');

        /* バーストは落ち終わったら消す */
        if (once) {
            el.addEventListener('animationend', function () {
                el.remove();
            }, { once: true });
        }

        layer.appendChild(el);
    }


    /* ================= 実行 ================= */

    for (let i = 0; i < BASE_COUNT; i++) {
        createPiece({ delayMax: 5 });
    }

    const keyButton = document.getElementById('keyButton');

    if (keyButton) {

        keyButton.addEventListener('click', function () {

            for (let i = 0; i < BURST_COUNT; i++) {
                createPiece({ once: true, delayMax: 0.9 });
            }
        });
    }

})();