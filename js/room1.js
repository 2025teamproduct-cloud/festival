// /room1.js


/* =========================================================
   ここから設定エリア
   ========================================================= */

/*
    あらすじ（1ページ目）

    PC：左ページに表示される文章
    スマホ：1ページ目の上半分に表示される文章
*/
const STORY_TEXT =
    "森にとり残されたヘンゼルとグレーテルは、" +
    "甘い香りにさそわれて、お菓子の家にたどり着いた。" +
    "ところが、魔女の魔法で出口の扉が閉ざされてしまう。" +
    "なぞを解いて扉を開け、二人を助け出そう。";


/*
    問題文と正解データ

    text:
        PC：左ページに表示される問題文
        スマホ：各ページの上半分に表示される問題文

    answers:
        配列内のどれかに一致すればOK
        全角/半角・大文字小文字・空白は normalize() が吸収します。
*/

const QUESTIONS = [

    {
        text:
            "小石落ちてたってよ",

        answers: [
            "さ",
            "サ",
            "asd",
            "あｓｄ"
        ]
    },

    {
        text:
            "問題2：これは何",

        answers: [
            "15",
            "asd",
            "あｓｄ"
        ]
    }

];


/* 全問正解したときに左ページへ表示する文言 */
const CLEAR_TEXT =
    "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";


/* あらすじページの data-page 名（めくると問題1が見える） */
const STORY_PAGE = "story";


/*
    問題番号（0始まり）に正解したときにめくるページの data-page 名。
    めくると、下に重なっている次のページが見えます。
*/
const PAGE_ORDER = [
    "q1",
    "q2"
];


/* 正解してからページがめくれ始めるまでの時間 */
const FLIP_DELAY_MS = 500;

/* ページがめくれる演出の時間（room1.css の .flip-page transition と合わせる） */
const FLIP_DURATION_MS = 600;

/* 表紙を開くアニメーション時間（room1.css の coverOpen と合わせる） */
const COVER_OPEN_DURATION_MS = 1100;


/* =========================================================
   設定エリアここまで
   ========================================================= */


const SESSION_KEY = 'festival-room1-progress-v1';
const savedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') || {};
const savedSolved = Array.isArray(savedSession.solved)
    ? savedSession.solved.filter(index =>
        Number.isInteger(index) && index >= 0 && index < QUESTIONS.length
    )
    : [];
const savedInputs = Array.isArray(savedSession.inputs)
    ? savedSession.inputs
    : [];
let solvedCount = 0;

const solved = new Set(savedSolved);

/* ゲーム開始済みか（表紙の二重タップ防止） */
let gameStarted = savedSession.started === true || solved.size > 0;

/* あらすじページを読み終えて問題へ進んだか */
let storyDone = savedSession.storyDone === true || solved.size > 0;

/* 初回ポップアップを確認済みか */
let hintSeen = savedSession.hintSeen === true || gameStarted;

function saveSession() {
    const inputs = Array.from(
        document.querySelectorAll('.question[data-index]')
    )
        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
        .map(row => row.querySelector('input').value);

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        started: gameStarted,
        storyDone: storyDone,
        hintSeen: hintSeen,
        solved: Array.from(solved),
        inputs
    }));
}


/* =========================================================
   各ページの文章をセット（スマホ用）

   .page-qtext の data-qtext="0|1" に QUESTIONS[n].text を、
   data-story に STORY_TEXT を流し込みます。
   PCでは CSS で非表示なので、見た目には影響しません。
   ========================================================= */

function fillPageQuestions() {

    document
        .querySelectorAll('[data-qtext]')
        .forEach(el => {

            const q = QUESTIONS[Number(el.dataset.qtext)];

            if (q) {
                el.textContent = q.text;
            }
        });

    document
        .querySelectorAll('[data-story]')
        .forEach(el => {
            el.textContent = STORY_TEXT;
        });
}

fillPageQuestions();


/* =========================================================
   入力値の正規化
   ========================================================= */

function normalize(s) {

    return s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(
            /[Ａ-Ｚａ-ｚ０-９]/g,
            ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
        );
}


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


/* =========================================================
   左ページの文章を書き換える（PC用）
   ========================================================= */

function setLeftText(text) {

    const el = document.getElementById('leftQuestionText');

    if (el) {
        el.textContent = text;
    }
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

    /* PC用：左ページにあらすじをセット */
    setLeftText(STORY_TEXT);

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
   あらすじ → 問題へ進む
   ========================================================= */

function goToQuestions() {

    if (!gameStarted || storyDone) {
        return;
    }

    storyDone = true;

    const nextButton = document.getElementById('storyNextButton');

    if (nextButton) {
        nextButton.disabled = true;
    }

    saveSession();

    flipPage(STORY_PAGE);

    /* めくり終わってから左ページ（PC）を問題1に更新 */
    setTimeout(() => {
        setLeftText(QUESTIONS[0].text);
    }, FLIP_DURATION_MS);
}

const storyNextButton = document.getElementById('storyNextButton');

if (storyNextButton) {
    storyNextButton.addEventListener('click', goToQuestions);
}


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

    if (bookCover && !gameStarted) {
        bookCover.focus({ preventScroll: true });
    }
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
    savedInputs.forEach((value, index) => {
        const input = document.querySelector(
            '.question[data-index="' + index + '"] input'
        );

        if (input && typeof value === 'string') {
            input.value = value;
        }
    });

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
    solvedCount = solved.size;

    document.getElementById('progressText').textContent =
        '正解数: ' + solvedCount + ' / ' + QUESTIONS.length;

    if (storyDone) {

        flipPage(STORY_PAGE);

        if (storyNextButton) {
            storyNextButton.disabled = true;
        }

        setLeftText(
            solvedCount === QUESTIONS.length
                ? CLEAR_TEXT
                : QUESTIONS[solvedCount].text
        );

    } else {

        setLeftText(STORY_TEXT);
    }

    solved.forEach(index => {
        const row = document.querySelector(
            '.question[data-index="' + index + '"]'
        );

        if (!row) {
            return;
        }

        row.querySelector('input').disabled = true;
        row.querySelector('button').disabled = true;
        row.querySelector('.feedback').textContent = '正解！';
        row.querySelector('.feedback').className = 'feedback ok';
        row.classList.add('solved');
        flipPage(PAGE_ORDER[index]);
    });
}

document.querySelectorAll('.question[data-index] input').forEach(input => {
    input.addEventListener('input', saveSession);
});

restoreSession();
showHintIfFirstVisit();

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

function checkAnswer(index, btn) {

    const row = btn.closest('.question');
    const input = row.querySelector('input');
    const feedback = row.querySelector('.feedback');

    const val = normalize(input.value);

    const ok =
        QUESTIONS[index]
            .answers
            .some(a => normalize(a) === val);


    /* ----- 正解 ----- */

    if (ok) {

        feedback.textContent = '正解！';
        feedback.className = 'feedback ok';

        input.disabled = true;
        btn.disabled = true;

        row.classList.add('solved');

        if (!solved.has(index)) {

            solved.add(index);
            solvedCount++;

            saveSession();

            document.getElementById('progressText').textContent =
                '正解数: ' + solvedCount + ' / ' + QUESTIONS.length;

            /* 「正解！」を少し見せてからページをめくる */
            setTimeout(() => {

                flipPage(PAGE_ORDER[index]);

                /* めくり終わってから左ページ（PC）の文言を更新 */
                setTimeout(() => {

                    if (solvedCount === QUESTIONS.length) {

                        setLeftText(CLEAR_TEXT);

                        const clearBox =
                            document.getElementById('clearBox');

                        if (clearBox) {
                            clearBox.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                        }

                    } else {

                        setLeftText(QUESTIONS[index + 1].text);
                    }

                }, FLIP_DURATION_MS);

            }, FLIP_DELAY_MS);
        }
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