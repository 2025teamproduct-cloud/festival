// /room1.js


/* =========================================================
   ここから設定エリア
   ========================================================= */

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
            "問題1：この会場の入口に置かれた看板に書かれた「合言葉」の最初の一文字は何でしょう？（ひらがなで回答）",

        answers: [
            "さ",
            "サ",
            "asd"
        ]
    },

    {
        text:
            "問題2：3, 6, 9, 12, ? 　次に来る数字は？",

        answers: [
            "15",
            "asd"
        ]
    },

    {
        text:
            "問題3：「さくら」を逆から読むと？",

        answers: [
            "らくさ",
            "asd"
        ]
    }

];


/* 全問正解したときに左ページへ表示する文言 */
const CLEAR_TEXT =
    "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";


/*
    問題番号（0始まり）に正解したときにめくるページの data-page 名。
    めくると、下に重なっている次のページが見えます。
*/
const PAGE_ORDER = [
    "q1",
    "q2",
    "q3"
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


let solvedCount = 0;

const solved = new Set();

/* ゲーム開始済みか（開始ボタンの二重クリック防止） */
let gameStarted = false;


/* =========================================================
   各ページの問題文をセット（スマホ用）

   .page-qtext の data-qtext="0|1|2" に
   QUESTIONS[n].text を流し込みます。
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
   左ページの問題文を書き換える（PC用）
   ========================================================= */

function setLeftText(text) {

    const el = document.getElementById('leftQuestionText');

    if (el) {
        el.textContent = text;
    }
}


/* =========================================================
   ゲーム開始
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

    /*
        本を即座に表示してから、その上で表紙をめくる。
        （表紙の終了を待って本を表示すると、一瞬消えて見えるため）
    */
    bookFrame.classList.remove('pre-start');
    bookFrame.classList.add('started');

    /* PC用：左ページに問題1をセット */
    setLeftText(QUESTIONS[0].text);

    /* 表紙を開く（回転のみ） */
    cover.classList.add('cover-opening');

    /* アニメーション終了後、表紙を視覚的に消す */
    setTimeout(() => {
        cover.style.visibility = 'hidden';
    }, COVER_OPEN_DURATION_MS);
}


/* =========================================================
   開始ボタン
   ========================================================= */

const startButton = document.getElementById('startButton');

if (startButton) {

    startButton.addEventListener(
        'click',
        startGame,
        { once: true }
    );
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