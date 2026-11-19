//  /room2.js

// ハリネズミは5匹から4匹を選ぶ形にしています。 会場の設定に青色のハリネズミもいるため、
// 青は選ばない選択肢（ひっかけ）として入れました。4匹だけを並べたい場合は、choices か
// ら青を消して、answer を [0, 1, 2, 3] にしてください（緑が3番目になります）。

/* ====================== ここから設定エリア ====================== */

/*
    ページ一覧（表紙のあと、上から順にめくっていく）

    ・choices が無いページ ＝ 導入ページ（「次へ」ボタンでめくる）
    ・choices があるページ ＝ 問題ページ（選択肢を選んで「確認」→ 正解でめくる）

    id      : room2.html の data-page / data-text / data-q と一致させる
    text    : PC は左ページ、スマホはページ上半分に表示。"\n" で改行できる
    choices : 選択肢の表示文字
    answer  : 正解
              ・数字         … 1つ選ぶ問題。正解の選択肢の番号（0始まり）
              ・数字の配列   … 順番に選ぶ問題。正解の順に並べた選択肢の番号（0始まり）
*/
const PAGES = [

    /* ---------- 7ページ目：Q3 ハリネズミ（順番選択） ---------- */
    {
        id: "q3",
        text:
            "【Q3】\n" +
            "女王様が好きな順番を、会場をよく観察し、正しい順番を導き出せ！\n\n" +
            "ゴールさせる順に、4匹を選んでください。",

        choices: [
            "🦔 紫色のハリネズミ",   // 0
            "🦔 桃色のハリネズミ",   // 1
            "🦔 黄色のハリネズミ",   // 2
            "🦔 緑色のハリネズミ",   // 3
        ],

        /* 桃 → 黄 → 紫 → 緑 */
        answer: [1, 2, 0, 3]
    },

    /* ---------- 8ページ目：タルト事件 ---------- */
    {
        id: "n5",
        text:
            "ゴールした時、トランプ兵が慌てて会場に駆け込んできて、" +
            "「女王様のタルトが何者かに盗まれました！」と大声で叫んだ。\n\n" +
            "それを聞いた女王様は顔を真っ赤にして怒り、あなたに言った。\n\n" +
            "「私のタルトを盗んだ犯人だな！ 即刻、首をはねておしまい！」\n\n" +
            "あなたは犯人にされてしまった。"
    },

    /* ---------- 9ページ目：Q4 真犯人 ---------- */
    {
        id: "q4",
        text:
            "【Q4】\n" +
            "無実を証明するため、嘘と真実が入り交じった証言を元に、真犯人を見つけ出せ！",

        // TODO: 仮の選択肢です。実際の選択肢に変更してください（正解は「トランプ兵♠2」）
        choices: [
            "トランプ兵♥2",
            "トランプ兵♠2",
            "トランプ兵♦2",
            "トランプ兵♣2"
        ],

        answer: 1   // トランプ兵♠2
    },

    /* ---------- 10ページ目：おまじない ---------- */
    {
        id: "n6",
        text:
            "真犯人が見つかった。ハートの女王様は、タルトを盗んだ犯人の首をはねてしまった。\n\n" +
            "真犯人が見つかってご満悦な女王様は、あなたに言った。\n\n" +
            "「お前、出口を探しているんだってね。アタシが帰り方を教えてやろう。」\n\n" +
            "犯人を見つけ出してくれたお礼として、元の世界に戻れるおまじないを教えてくれた。\n\n" +
            "「あなたたちはただのトランプで本の1部だ！」"
    }

];


/* 最後のページ（11ページ目）が見えたときに、PCの左ページへ表示する文言 */
const CLEAR_TEXT =
    "このおまじないを唱えて、元の世界に帰ろう。\n\n" +
    "「あなたたちはただのトランプで本の1部だ！」";


// 正解してからページがめくれ始めるまでの時間
const FLIP_DELAY_MS = 500;

// ページがめくれる演出の時間（room2.css の .flip-page transition と合わせる）
const FLIP_DURATION_MS = 600;

// 表紙を開くアニメーション時間（room2-intro.css の coverOpenAlice と合わせる）
const COVER_OPEN_DURATION_MS = 1100;

/* ====================== 設定エリアここまで ====================== */


const SESSION_KEY = 'festival-room2-progress-v2';

function isQuestion(page) {
    return Array.isArray(page.choices);
}

const QUESTION_PAGES = PAGES.filter(isQuestion);

/* 順番選択の問題か（answer が配列） */
function isOrder(q) {
    return Array.isArray(q.answer);
}

/* 確認ボタンが押せるようになるために必要な選択数 */
function needCount(q) {
    return isOrder(q) ? q.answer.length : 1;
}

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

/* 各問題で選択中の選択肢番号（id → 選んだ順の配列） */
const selections = {};

QUESTION_PAGES.forEach(q => {

    const saved = savedSession.selections
        ? savedSession.selections[q.id]
        : null;

    selections[q.id] = Array.isArray(saved)
        ? saved.filter(n => Number.isInteger(n) && n >= 0 && n < q.choices.length)
        : [];
});

/* 表紙を開いて本を読み始めたか（二重タップ防止） */
let gameStarted = savedSession.started === true || pageIndex > 0;

function saveSession() {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            started: gameStarted,
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
    const sel = selections[id];
    const solved = isSolved(id);
    const box = row.querySelector('.choices');

    box.innerHTML = '';

    q.choices.forEach((label, ci) => {

        const b = document.createElement('button');
        const pos = sel.indexOf(ci);

        b.type = 'button';
        b.className = 'choice';
        b.disabled = solved;

        if (pos >= 0) {
            b.classList.add('selected');
        }

        /* 順番選択：押した順の番号を表示 */
        if (isOrder(q)) {
            const badge = document.createElement('span');
            badge.className = 'choice-order';
            badge.textContent = pos >= 0 ? String(pos + 1) : '';
            b.appendChild(badge);
        }

        const t = document.createElement('span');
        t.textContent = label;
        b.appendChild(t);

        b.addEventListener('click', () => selectChoice(id, ci));

        box.appendChild(b);
    });

    const confirmBtn = row.querySelector('.confirm-btn');

    if (confirmBtn) {
        confirmBtn.disabled = solved || sel.length !== needCount(q);
    }

    const resetBtn = row.querySelector('.reset-btn');

    if (resetBtn) {
        resetBtn.disabled = solved || sel.length === 0;
    }
}

function clearFeedback(id) {

    const fb = getRow(id).querySelector('.feedback');

    fb.textContent = '';
    fb.className = 'feedback';
}

function selectChoice(id, ci) {

    if (isSolved(id)) {
        return;
    }

    const q = PAGES[pageNumber(id)];
    const sel = selections[id];

    if (isOrder(q)) {

        const pos = sel.indexOf(ci);

        if (pos >= 0) {
            sel.splice(pos, 1);              // 選び直し（番号は自動で詰める）
        } else if (sel.length < needCount(q)) {
            sel.push(ci);
        }

    } else {
        selections[id] = [ci];
    }

    clearFeedback(id);
    renderQuestion(id);
    saveSession();
}

function resetSelection(id) {

    if (isSolved(id)) {
        return;
    }

    selections[id] = [];

    clearFeedback(id);
    renderQuestion(id);
    saveSession();
}

QUESTION_PAGES.forEach(q => {

    renderQuestion(q.id);

    const row = getRow(q.id);
    const confirmBtn = row && row.querySelector('.confirm-btn');
    const resetBtn = row && row.querySelector('.reset-btn');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => checkAnswer(q.id, confirmBtn));
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetSelection(q.id));
    }
});


/* =========================================================
   ページをめくる
   ========================================================= */

function flipPage(pageName) {

    const page = document.querySelector('.flip-page[data-page="' + pageName + '"]');

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

    const bookFrame = document.getElementById('bookFrame');
    const cover = document.querySelector('.flip-page.cover');

    if (!bookFrame || !cover) {
        return;
    }

    /* 本を即座に表示してから、その上で表紙をめくる */
    bookFrame.classList.remove('pre-start');
    bookFrame.classList.add('started');

    /* PC用：左ページに最初のページをセット */
    updateLeftText();

    saveSession();

    /* 表紙を開く（回転のみ） */
    cover.classList.add('cover-opening');

    /* アニメーション終了後、表紙を視覚的に消す */
    setTimeout(() => {
        cover.style.visibility = 'hidden';
    }, COVER_OPEN_DURATION_MS);
}

const bookCover = document.getElementById('bookCover');

if (bookCover) {

    bookCover.addEventListener('click', startGame);

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
   セッション復元
   ========================================================= */

function restoreSession() {

    updateProgress();

    if (!gameStarted) {
        return;
    }

    const bookFrame = document.getElementById('bookFrame');
    const cover = document.querySelector('.flip-page.cover');

    if (bookFrame) {
        bookFrame.classList.remove('pre-start');
        bookFrame.classList.add('started');
    }

    if (cover) {
        cover.style.visibility = 'hidden';
    }

    /* めくり済みのページを戻す */
    PAGES.forEach((page, i) => {

        if (i >= pageIndex) {
            return;
        }

        flipPage(page.id);

        if (isQuestion(page)) {

            const row = getRow(page.id);
            const fb = row.querySelector('.feedback');

            fb.textContent = '正解！';
            fb.className = 'feedback ok';
            row.classList.add('solved');
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


/* =========================================================
   解答チェック
   ========================================================= */

function checkAnswer(id, btn) {

    const row = btn.closest('.question');
    const feedback = row.querySelector('.feedback');
    const q = PAGES[pageNumber(id)];
    const sel = selections[id];

    /* いま表示中の問題以外、選択数が足りない場合は何もしない */
    if (
        !PAGES[pageIndex] ||
        PAGES[pageIndex].id !== id ||
        sel.length !== needCount(q)
    ) {
        return;
    }

    const ok = isOrder(q)
        ? q.answer.every((a, i) => sel[i] === a)
        : sel[0] === q.answer;


    /* ----- 正解 ----- */

    if (ok) {

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