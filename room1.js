const QUESTIONS = [
    {
        text: "問題1：この会場の入口に置かれた看板に書かれた「合言葉」の最初の一文字は何でしょう？（ひらがなで回答）",
        answers: ["さ", "サ", "asd"]
    },
    {
        text: "問題2：3, 6, 9, 12, ?　次に来る数字は？",
        answers: ["15", "asd"]
    },
    {
        text: "問題3：「さくら」を逆から読むと？",
        answers: ["らくさ", "asd"]
    }
];

const CLEAR_TEXT =
    "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";

const PAGE_ORDER = ["q1", "q2", "q3"];

const FLIP_DELAY_MS = 500;
const FLIP_DURATION_MS = 600;

// 表紙が開き終わるまでの時間
const COVER_OPEN_DURATION_MS = 1100;

let gameStarted = false;
let currentQuestion = 0;


/* =========================
   共通処理
========================= */

function normalize(value) {
    return value.trim().toLowerCase();
}


function setLeftText(text) {
    const questionText = document.getElementById("leftQuestionText");

    if (!questionText) return;

    questionText.textContent = text;
}


/* =========================
   ゲーム開始
========================= */

function startGame() {
    if (gameStarted) return;

    gameStarted = true;

    const bookFrame = document.getElementById("bookFrame");
    const cover = document.querySelector(".flip-page.cover");

    if (!bookFrame || !cover) return;


    /*
     * ここで本体を表示する。
     *
     * ただし問題文はまだ表示しない。
     * 表紙が開き終わるまで空欄にしておく。
     */
    bookFrame.classList.remove("pre-start");
    bookFrame.classList.add("started");

    setLeftText("");


    /*
     * 表紙を開く。
     *
     * CSS側の .cover-opening に
     * 表紙を右ページ上で開くアニメーションを設定。
     */
    cover.classList.add("cover-opening");


    /*
     * 表紙のアニメーション終了後に
     * 初めて問題1を表示する。
     *
     * 重要：
     * 本全体を非表示にはしない。
     * 表紙だけを非表示にする。
     */
    setTimeout(() => {
        cover.style.visibility = "hidden";

        currentQuestion = 0;

        setLeftText(
            QUESTIONS[currentQuestion].text
        );
    }, COVER_OPEN_DURATION_MS);
}


/* =========================
   問題ページをめくる
========================= */

function flipPage(pageElement, callback) {
    if (!pageElement) {
        if (callback) callback();
        return;
    }


    /*
     * アニメーション状態を一度リセット。
     * 連続操作時にもCSSアニメーションを
     * 正しく再生できるようにする。
     */
    pageElement.classList.remove("flipped");

    void pageElement.offsetWidth;


    /*
     * CSS側のページめくりアニメーションを開始。
     */
    pageElement.classList.add("flipped");


    /*
     * ページめくり終了後の処理。
     */
    setTimeout(() => {
        pageElement.style.visibility = "hidden";

        if (callback) {
            callback();
        }
    }, FLIP_DURATION_MS);
}


/* =========================
   次の問題
========================= */

function nextQuestion() {
    currentQuestion++;


    /*
     * 全問終了
     */
    if (currentQuestion >= QUESTIONS.length) {
        setLeftText(CLEAR_TEXT);
        return;
    }


    /*
     * ページめくりが少し進んでから
     * 次の問題を表示する。
     */
    setTimeout(() => {
        setLeftText(
            QUESTIONS[currentQuestion].text
        );
    }, FLIP_DELAY_MS);
}


/* =========================
   回答チェック
========================= */

function checkAnswer() {
    if (!gameStarted) return;


    /*
     * 現在入力可能な回答欄を取得。
     */
    const input = document.querySelector(
        ".answer-area input:not([disabled])"
    );

    if (!input) return;


    const answer = normalize(input.value);

    if (!answer) return;


    const question = QUESTIONS[currentQuestion];

    if (!question) return;


    /*
     * 正解判定
     */
    const correct = question.answers.some(
        correctAnswer =>
            normalize(correctAnswer) === answer
    );


    const resultMessage =
        document.getElementById("resultMessage");


    /*
     * 不正解
     */
    if (!correct) {
        if (resultMessage) {
            resultMessage.textContent =
                "答えが違います。もう一度考えてみてください。";
        }

        input.value = "";

        return;
    }


    /*
     * 正解
     */
    if (resultMessage) {
        resultMessage.textContent = "正解!";
    }

    input.disabled = true;


    /*
     * 現在の問題ページを取得。
     *
     * q1 → q2 → q3
     */
    const currentPage = document.querySelector(
        `.content-page[data-page="q${currentQuestion + 1}"]`
    );


    /*
     * ページをめくり終わった後に
     * 次の問題を表示。
     */
    flipPage(currentPage, () => {
        nextQuestion();
    });
}


/* =========================
   Enterキー対応
========================= */

function setupEnterKey() {
    document.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;


        const activeElement =
            document.activeElement;


        /*
         * 回答欄にフォーカスしているときだけ
         * Enterで回答する。
         */
        if (
            activeElement &&
            activeElement.matches(
                ".answer-area input"
            )
        ) {
            checkAnswer();
        }
    });
}


/* =========================
   イベント設定
========================= */

function setupEvents() {

    /*
     * 開始ボタン
     */
    const startButton =
        document.getElementById("startButton");

    if (startButton) {
        startButton.addEventListener(
            "click",
            startGame
        );
    }


    /*
     * 回答ボタン
     */
    const answerButtons =
        document.querySelectorAll(
            ".answer-area button"
        );

    answerButtons.forEach(button => {
        button.addEventListener(
            "click",
            checkAnswer
        );
    });


    /*
     * Enterキー
     */
    setupEnterKey();
}


/* =========================
   初期化
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupEvents();
    }
);