// /room1.js


/* =========================================================
   ここから設定エリア
   ========================================================= */

/*
    ページ一覧（表紙のあと、上から順にめくっていく）

    ・choices が無いページ ＝ 導入ページ（「次へ」ボタンでめくる）
    ・choices があるページ ＝ 問題ページ（選択肢を選んで「確認」→ 正解でめくる）

    id      : index.html の data-page / data-text / data-q と一致させる
    text    : PC は左ページ、スマホはページ上半分に表示。"\n" で改行できる
    choices : 選択肢の表示文字
    answer  : 正解の選択肢の番号（0始まり。1つ目が正解なら 0）

    ※ ページを増やすときは、この配列と index.html の両方に足してください。
*/
const PAGES = [

    /* ---------- 1ページ目：あらすじ ---------- */
    {
        id: "story",
        text:
            "ある学校の文化祭で出し物を楽しんでいると、\n"+
            "あなたは、古びた1冊の本を手にする。\n\n" +
            "お題は\n" +
            "「お菓子の森と不思議な国からの脱出」\n\n" +
            "好奇心にかられ表紙を開いた瞬間、視界が強い\n"+
            "光に包まれ、本の中に吸い込まれてしまった。\n" +
            "目を開けると『ヘンゼルとグレーテル』の世界を彷彿とさせる、濃い霧が覆う森の中にいた。"
    },

    /* ---------- 2ページ目：石ころ・看板 ---------- */
    {
        id: "n1",
        text:
            "出口を探していると、地面にポツポツと霧に\n"+
            "紛れて月明かりに照らされて光っている石ころを見つけた。" +
            "出口の手がかりだと考えたあなたは\n"+
            "石ころを辿ってみることにした。\n\n" +
            "石ころを辿って進むと枝分かれした道が\n"+
            "行く先を阻む。" +
            "分かれ道の間にひとつの看板が\n"+
            "立てられている。\n\n" +
            "そこに書かれていたのは…"
    },

    /* ---------- 3ページ目：Q1 ---------- */
    {
        id: "q1",
        text:
            "【Q1】\n" +
            "　隠されたヒントで正しい道を見つけろ。",

        choices: [
            "クローバーの道",
            "お花の道",
            "月の道",
            "切り株の道"
        ],

        answer: 0   // クローバーの道
    },

    /* ---------- 4ページ目：パンくず ---------- */
    {
        id: "n2",
        text:
            "さらに霧の森を進むと、今度はパンくずが道に\n"+
            "撒かれている。" +
            "パンくずを追ってみると、\n"+
            "森の鳥たちに食べられてしまっていた。\n\n" +
            "鳥たちを追い返すと、なにか書かれている跡を\n"+
            "道に見つけた。どういう意味なんだろうか。"
    },

    /* ---------- 5ページ目：Q2 ---------- */
    {
        id: "q2",
        text:
            "【Q2】\n" +
            " パンくずが示す答えを導き出せ。",

        // TODO: 仮の選択肢です。実際の選択肢に変更してください（正解は「お菓子の家」）
        choices: [
            "魔女の小屋",
            "森の出口",
            "お菓子の家",
            "パン屋さん"
        ],

        answer: 2   // お菓子の家
    },

    /* ---------- 6ページ目：お菓子の家 ---------- */
    {
        id: "n3",
        text:
            "答えを導き出すと、森の霧が晴れ、目の前に突然\n"+
            "大きなお菓子の家が現れた。\n\n" +
            "家の前にいた魔女に話しかけると、その家の中に\n"+
            "招き入れられた。"
    },

    /* ---------- 6ページ目（続き）：アリスの世界 ---------- */
    {
        id: "n4",
        text:
            "お菓子の扉を開けた瞬間、空間が歪む。\n" +
            "そこはお菓子の部屋ではなく、トランプの兵士が隊列を組む『不思議の国のアリス』世界。\n"+
            "そのクロッケー大会の真っ最中だった…。\n\n" +
            "フラミンゴをマレットに、ハリネズミをボールとしている奇妙な試合。\n" +
            "ハートの女王があなたを見つけ、声を上げた。"
    }

];


/* 最後のページをめくったあと（クリアページ）に左ページへ表示する文言 */
const CLEAR_TEXT =
    "🎉 全問正解！\n\n" +
    "スタッフにこの画面を見せて、次の部屋へ進んでください。";


/* 正解してからページがめくれ始めるまでの時間 */
const FLIP_DELAY_MS = 500;

/* ページがめくれる演出の時間（room1.css の .flip-page transition と合わせる） */
const FLIP_DURATION_MS = 600;

/* 表紙を開くアニメーション時間（room1.css の coverOpen と合わせる） */
const COVER_OPEN_DURATION_MS = 1100;


/* =========================================================
   設定エリアここまで
   ========================================================= */


const SESSION_KEY = 'festival-room1-progress-v4';

function isQuestion(page) {
    return Array.isArray(page.choices);
}

const QUESTION_PAGES = PAGES.filter(isQuestion);

let savedSession = {};
try {
    savedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') || {};
} catch (e) {
    savedSession = {};
}

/* 今表示しているページの番号（PAGES の添字。全部めくり終えたら PAGES.length） */
let pageIndex =
    Number.isInteger(savedSession.pageIndex) &&
    savedSession.pageIndex >= 0 &&
    savedSession.pageIndex <= PAGES.length
        ? savedSession.pageIndex
        : 0;

/* 各問題で選択中の選択肢番号（id → 番号）。未選択は無し */
const selections = {};

QUESTION_PAGES.forEach(q => {

    const saved = savedSession.selections
        ? savedSession.selections[q.id]
        : null;

    if (Number.isInteger(saved) && saved >= 0 && saved < q.choices.length) {
        selections[q.id] = saved;
    }
});

/* ゲーム開始済みか（表紙の二重タップ防止） */
let gameStarted = savedSession.started === true || pageIndex > 0;

/* 初回ポップアップを確認済みか */
let hintSeen = savedSession.hintSeen === true || gameStarted;

function saveSession() {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            started: gameStarted,
            hintSeen: hintSeen,
            pageIndex: pageIndex,
            selections: selections
        }));
    } catch (e) {
        /* 保存できなくても動作は続ける */
    }
}


/* =========================================================
   ヘルパー
   ========================================================= */

function pageNumber(id) {
    return PAGES.findIndex(p => p.id === id);
}

/* 問題を解き終えたか（そのページを過ぎていれば正解済み） */
function isSolved(id) {
    return pageIndex > pageNumber(id);
}

function solvedCount() {
    return QUESTION_PAGES.filter(q => isSolved(q.id)).length;
}

function updateProgress() {

    document.getElementById('progressText').textContent =
        '正解数: ' + solvedCount() + ' / ' + QUESTION_PAGES.length;
}

function getRow(id) {
    return document.querySelector('.question[data-q="' + id + '"]');
}


/* =========================================================
   各ページの文章をセット
   data-text="ページid" の要素に、PAGES の text を流し込む
   （PCでは .page-qtext は CSS で非表示）
   ========================================================= */

document.querySelectorAll('[data-text]').forEach(el => {

    const page = PAGES[pageNumber(el.dataset.text)];

    if (page) {
        el.textContent = page.text;
    }
});


/* =========================================================
   左ページ（PC用）
   ========================================================= */

function setLeftText(text) {

    const el = document.getElementById('leftQuestionText');

    if (el) {
        el.textContent = text;
    }
}

/* 今のページに合わせて左ページの文章を更新 */
function updateLeftText() {

    setLeftText(
        pageIndex < PAGES.length
            ? PAGES[pageIndex].text
            : CLEAR_TEXT
    );
}


/* =========================================================
   選択肢の描画・操作
   ========================================================= */

function renderQuestion(id) {

    const row = getRow(id);

    if (!row) {
        return;
    }

    const q = PAGES[pageNumber(id)];
    const selected = selections[id];
    const solved = isSolved(id);
    const box = row.querySelector('.choices');

    box.innerHTML = '';

    q.choices.forEach((label, ci) => {

        const b = document.createElement('button');

        b.type = 'button';
        b.className = 'choice';
        b.textContent = label;
        b.disabled = solved;

        if (selected === ci) {
            b.classList.add('selected');
        }

        b.addEventListener('click', () => selectChoice(id, ci));

        box.appendChild(b);
    });

    const confirmBtn = row.querySelector('.confirm-btn');

    if (confirmBtn) {
        confirmBtn.disabled = solved || selected === undefined;
    }
}

function selectChoice(id, ci) {

    if (isSolved(id)) {
        return;
    }

    selections[id] = ci;

    const fb = getRow(id).querySelector('.feedback');
    fb.textContent = '';
    fb.className = 'feedback';

    renderQuestion(id);
    saveSession();
}

QUESTION_PAGES.forEach(q => {

    renderQuestion(q.id);

    const row = getRow(q.id);
    const confirmBtn = row && row.querySelector('.confirm-btn');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => checkAnswer(q.id, confirmBtn));
    }
});


/* =========================================================
   ページをめくる
   ========================================================= */

function flipPage(pageName) {

    const page =
        document.querySelector(
            '.flip-page[data-page="' + pageName + '"]'
        );

    if (page) {
        page.classList.add('flipped');
    }
}

/*
    今のページを1枚めくる。
    状態（pageIndex）はすぐ進め、見た目は delay ミリ秒後にめくる。
*/
function advancePage(delay) {

    if (pageIndex >= PAGES.length) {
        return;
    }

    const id = PAGES[pageIndex].id;

    pageIndex++;
    saveSession();
    updateProgress();

    setTimeout(() => {

        flipPage(id);

        /* めくり終わってから左ページ（PC）を更新 */
        setTimeout(updateLeftText, FLIP_DURATION_MS);

    }, delay);
}


/* =========================================================
   ゲーム開始（表紙をタップ）
   ========================================================= */

function startGame() {

    if (gameStarted) {
        return;
    }

    gameStarted = true;
    hintSeen = true;

    const bookFrame = document.getElementById('bookFrame');
    const cover = document.querySelector('.flip-page.cover');

    if (!bookFrame || !cover) {
        return;
    }

    /*
        本を即座に表示してから、その上で表紙をめくる。
        （表紙の終了を待って本を表示すると、一瞬消えて見えるため）
    */
    bookFrame.classList.remove('pre-start');
    bookFrame.classList.add('started');

    /* PC用：左ページに1ページ目をセット */
    updateLeftText();

    saveSession();

    /* 表紙を開く（回転のみ） */
    cover.classList.add('cover-opening');

    /* アニメーション終了後、表紙を視覚的に消す */
    setTimeout(() => {
        cover.style.visibility = 'hidden';
    }, COVER_OPEN_DURATION_MS);
}


/* =========================================================
   表紙（本）のタップ
   ========================================================= */

const bookCover = document.getElementById('bookCover');

if (bookCover) {

    bookCover.addEventListener(
        'click',
        startGame,
        { once: true }
    );

    /* キーボード操作（Enter / Space）でも開けるようにする */
    bookCover.addEventListener('keydown', event => {

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            startGame();
        }
    });
}


/* =========================================================
   導入ページの「次へ」ボタン
   ========================================================= */

document.querySelectorAll('.next-btn').forEach(button => {

    button.addEventListener('click', () => {

        const pageEl = button.closest('.flip-page');
        const id = pageEl ? pageEl.dataset.page : '';

        /* 今表示中のページのボタンだけ有効（連打対策） */
        if (!gameStarted || !PAGES[pageIndex] || PAGES[pageIndex].id !== id) {
            return;
        }

        button.disabled = true;
        advancePage(0);
    });
});


/* =========================================================
   初回アクセス時のポップアップ

   QRコードから最初に開いたとき（表紙を開く前）だけ表示する。
   閉じたあと・ゲーム開始後・再読み込み時は表示しない。
   ========================================================= */

const hintPopup = document.getElementById('hintPopup');

function closeHint() {

    if (!hintPopup || hintPopup.hidden) {
        return;
    }

    hintPopup.hidden = true;
    hintSeen = true;
    saveSession();
}

function showHintIfFirstVisit() {

    if (!hintPopup || hintSeen || gameStarted) {
        return;
    }

    hintPopup.hidden = false;

    const closeButton = document.getElementById('hintClose');

    if (closeButton) {
        closeButton.focus({ preventScroll: true });
    }
}

if (hintPopup) {

    const closeButton = document.getElementById('hintClose');

    if (closeButton) {
        closeButton.addEventListener('click', closeHint);
    }

    /* 背景（ポップアップの外側）をタップしても閉じる */
    hintPopup.addEventListener('click', event => {
        if (event.target === hintPopup) {
            closeHint();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeHint();
        }
    });
}


/* =========================================================
   セッション復元
   ========================================================= */

function restoreSession() {

    updateProgress();

    if (!gameStarted) {
        return;
    }

    const bookFrame = document.getElementById('bookFrame');
    const cover = document.querySelector('.flip-page.cover');

    if (!bookFrame || !cover) {
        return;
    }

    bookFrame.classList.remove('pre-start');
    bookFrame.classList.add('started');
    cover.style.visibility = 'hidden';

    /* めくり済みのページを戻す */
    PAGES.forEach((page, i) => {

        if (i >= pageIndex) {
            return;
        }

        flipPage(page.id);

        if (isQuestion(page)) {

            const fb = getRow(page.id).querySelector('.feedback');
            fb.textContent = '正解！';
            fb.className = 'feedback ok';

            getRow(page.id).classList.add('solved');
            renderQuestion(page.id);

        } else {

            const btn = document.querySelector(
                '.flip-page[data-page="' + page.id + '"] .next-btn'
            );

            if (btn) {
                btn.disabled = true;
            }
        }
    });

    updateLeftText();
}

restoreSession();
showHintIfFirstVisit();


/* =========================================================
   次の部屋へ
   ========================================================= */

const nextRoomLink = document.querySelector('#clearBox a.nextlink');
let isLeavingRoom = false;

if (nextRoomLink) {
    nextRoomLink.addEventListener('click', event => {
        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        event.preventDefault();

        if (isLeavingRoom) {
            return;
        }

        isLeavingRoom = true;
        document.querySelector('.wrap').classList.add('leaving-room');
        window.setTimeout(() => {
            window.location.href = nextRoomLink.href;
        }, 320);
    });
}


/* =========================================================
   解答チェック
   ========================================================= */

function checkAnswer(id, btn) {

    const row = btn.closest('.question');
    const feedback = row.querySelector('.feedback');
    const q = PAGES[pageNumber(id)];

    /* いま表示中の問題以外、未選択、正解済みは何もしない */
    if (
        !PAGES[pageIndex] ||
        PAGES[pageIndex].id !== id ||
        selections[id] === undefined
    ) {
        return;
    }

    /* ----- 正解 ----- */

    if (selections[id] === q.answer) {

        feedback.textContent = '正解！';
        feedback.className = 'feedback ok';
        row.classList.add('solved');

        /* 状態を進めてから選択肢をロック（isSolved が true になる） */
        advancePage(FLIP_DELAY_MS);
        renderQuestion(id);
    }


    /* ----- 不正解 ----- */

    else {

        feedback.textContent = '不正解…もう一度考えてみよう';
        feedback.className = 'feedback ng';

        row.classList.remove('shake');
        void row.offsetWidth;
        row.classList.add('shake');
    }
}