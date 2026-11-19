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
    問題データ（すべて選択式）

    text:
        PC：左ページに表示される問題文
        スマホ：各ページの上半分に表示される問題文
        "\n" で改行できます。

    choices:
        選択肢の表示文字

    answer:
        正解の選択肢の番号（0始まり）
        例）choices の 1 番目が正解なら 0、3 番目なら 2
*/

const QUESTIONS = [

    /* ---------- 問題1：石の道 ---------- */
    {
        text:
            "出口を探していると地面にポツポツと霧に紛れて月明かりに照らされて光っている石ころを見つけた。" +
            "出口の手がかりだと考えたあやたは、石ころを辿ってみることにした。\n" +
            "石ころを辿って進むと道が別れて続いていた。分かれ道の間にひとつの看板が立てられていた。\n" +
            "そこに書かれていたのは…\n\n" +
            "【問題】\n" +
            "正しい道は一つだけ\n" +
            "隠されたヒントで正しい道を見つけろ。",

        choices: [
            "真っ暗だけど光っている石の道",
            "月明かりに照らされているが行き止まりの道",
            "月明かりに照らされてる石の道"
        ],

        answer: 2   // TODO: 正解の選択肢の番号（0, 1, 2）に変更してください
    },

    /* ---------- 問題2：パンくず ---------- */
    {
        text:
            "さらに霧の森を進むと今度はパンくずが道に撒かれている。" +
            "パンくずを追ってみると森の鳥たちに食べられてしまっている。" +
            "追い返すと、なにか書かれている跡が見つかった。\n\n" +
            "【問題】\n" +
            "パンくずが示す答えを導き出せ",

        // TODO: 実際の選択肢に変更してください
        choices: [
            "選択肢A",
            "選択肢B",
            "選択肢C",
            "選択肢D"
        ],

        answer: 0   // TODO: 正解の選択肢の番号に変更してください
    }

];


/* 全問正解したときに左ページへ表示する文言 */
const CLEAR_TEXT =
    "答えを導き出すと森の霧が晴れ、目の前にはお菓子の家が現れた。" +
    "家の前にいた魔女に話しかけると、家に招き入れられた。\n\n" +
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


const SESSION_KEY = 'festival-room1-progress-v3';

let savedSession = {};
try {
    savedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') || {};
} catch (e) {
    savedSession = {};
}

const savedSolved = Array.isArray(savedSession.solved)
    ? savedSession.solved.filter(index =>
        Number.isInteger(index) && index >= 0 && index < QUESTIONS.length
    )
    : [];

let solvedCount = 0;
const solved = new Set(savedSolved);

/* 各問題で選択中の選択肢番号（未選択は null） */
const selections = QUESTIONS.map((q, i) => {

    const saved = Array.isArray(savedSession.selections)
        ? savedSession.selections[i]
        : null;

    return (Number.isInteger(saved) && saved >= 0 && saved < q.choices.length)
        ? saved
        : null;
});

/* ゲーム開始済みか（表紙の二重タップ防止） */
let gameStarted = savedSession.started === true || solved.size > 0;

/* あらすじページを読み終えて問題へ進んだか */
let storyDone = savedSession.storyDone === true || solved.size > 0;

/* 初回ポップアップを確認済みか */
let hintSeen = savedSession.hintSeen === true || gameStarted;

function saveSession() {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            started: gameStarted,
            storyDone: storyDone,
            hintSeen: hintSeen,
            solved: Array.from(solved),
            selections: selections
        }));
    } catch (e) {
        /* 保存できなくても動作は続ける */
    }
}


/* =========================================================
   各ページの文章をセット

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
   選択肢の描画・操作
   ========================================================= */

function getRow(index) {
    return document.querySelector('.question[data-index="' + index + '"]');
}

function renderQuestion(index) {

    const row = getRow(index);

    if (!row) {
        return;
    }

    const q = QUESTIONS[index];
    const selected = selections[index];
    const isSolved = solved.has(index);
    const box = row.querySelector('.choices');

    box.innerHTML = '';

    q.choices.forEach((label, ci) => {

        const b = document.createElement('button');

        b.type = 'button';
        b.className = 'choice';
        b.textContent = label;
        b.disabled = isSolved;

        if (selected === ci) {
            b.classList.add('selected');
        }

        b.addEventListener('click', () => selectChoice(index, ci));

        box.appendChild(b);
    });

    const confirmBtn = row.querySelector('.confirm-btn');

    if (confirmBtn) {
        confirmBtn.disabled = isSolved || selected === null;
    }
}

function selectChoice(index, ci) {

    if (solved.has(index)) {
        return;
    }

    selections[index] = ci;

    const fb = getRow(index).querySelector('.feedback');
    fb.textContent = '';
    fb.className = 'feedback';

    renderQuestion(index);
    saveSession();
}

QUESTIONS.forEach((q, i) => renderQuestion(i));


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

        const row = getRow(index);

        if (!row) {
            return;
        }

        const fb = row.querySelector('.feedback');
        fb.textContent = '正解！';
        fb.className = 'feedback ok';

        row.classList.add('solved');
        renderQuestion(index);
        flipPage(PAGE_ORDER[index]);
    });
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

function checkAnswer(index, btn) {

    const row = btn.closest('.question');
    const feedback = row.querySelector('.feedback');
    const q = QUESTIONS[index];

    if (selections[index] === null) {
        return;
    }

    const ok = selections[index] === q.answer;


    /* ----- 正解 ----- */

    if (ok) {

        feedback.textContent = '正解！';
        feedback.className = 'feedback ok';

        row.classList.add('solved');

        if (!solved.has(index)) {

            solved.add(index);
            solvedCount++;

            renderQuestion(index);   // 選択肢をロック
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