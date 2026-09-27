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

const COVER_OPEN_DURATION_MS = 1100;

let gameStarted = false;
let currentQuestion = 0;


/* =========================
   共通
========================= */

function normalize(value) {
    return value.trim().toLowerCase();
}


function setLeftText(text) {
    const questionText =
        document.getElementById("leftQuestionText");

    if (!questionText) return;

    questionText.textContent = text;
}


/* =========================
   ゲーム開始
========================= */

function startGame() {

    if (gameStarted) return;

    gameStarted = true;

    const bookFrame =
        document.getElementById("bookFrame");

    const cover =
        document.querySelector(".flip-page.cover");

    if (!bookFrame || !cover) return;


    /*
        開始した瞬間に本体を表示。

        ただし問題文はまだ表示しない。
    */
    bookFrame.classList.remove("pre-start");
    bookFrame.classList.add("started");

    setLeftText("");


    /*
        表紙を開く。
    */
    cover.classList.add("cover-opening");


    /*
        表紙が完全に開き終わってから
        問題1を表示する。
    */
    setTimeout(() => {

        /*
            本体ではなく表紙だけを隠す。
        */
        cover.style.visibility = "hidden";


        currentQuestion = 0;

        setLeftText(
            QUESTIONS[currentQuestion].text
        );

    }, COVER_OPEN_DURATION_MS);
}


/* =========================
   ページめくり
========================= */

function flipPage(pageElement, callback) {

    if (!pageElement) {

        if (callback) {
            callback();
        }

        return;
    }


    pageElement.classList.remove("flipped");

    void pageElement.offsetWidth;

    pageElement.classList.add("flipped");


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
        全問正解
    */
    if (currentQuestion >= QUESTIONS.length) {

        setLeftText(CLEAR_TEXT);

        return;
    }


    /*
        ページめくり後に次の問題を表示。
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


    const input = document.querySelector(
        ".answer-area input:not([disabled])"
    );

    if (!input) return;


    const answer = normalize(input.value);

    if (!answer) return;


    const question =
        QUESTIONS[currentQuestion];

    if (!question) return;


    const correct =
        question.answers.some(
            correctAnswer =>
                normalize(correctAnswer) === answer
        );


    const resultMessage =
        document.getElementById("resultMessage");


    /*
        不正解
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
        正解
    */
    if (resultMessage) {
        resultMessage.textContent = "正解!";
    }


    input.disabled = true;


    /*
        現在の問題ページ
    */
    const currentPage =
        document.querySelector(
            `.content-page[data-page="q${currentQuestion + 1}"]`
        );


    /*
        ページをめくってから次の問題へ。
    */
    flipPage(currentPage, () => {
        nextQuestion();
    });
}


/* =========================
   Enterキー
========================= */

function setupEnterKey() {

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }


            const activeElement =
                document.activeElement;


            if (
                activeElement &&
                activeElement.matches(
                    ".answer-area input"
                )
            ) {

                checkAnswer();
            }
        }
    );
}


/* =========================
   イベント設定
========================= */

function setupEvents() {

    const startButton =
        document.getElementById("startButton");


    if (startButton) {

        startButton.addEventListener(
            "click",
            startGame
        );
    }


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