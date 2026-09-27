/* =========================================
   問題データ
========================================= */

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
            "問題2：3, 6, 9, 12, ?　次に来る数字は？",

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


/* =========================================
   クリア時の文章
========================================= */

const CLEAR_TEXT =
    "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";


/* =========================================
   ページ順
========================================= */

const PAGE_ORDER = [
    "q1",
    "q2",
    "q3"
];


/* =========================================
   アニメーション時間
========================================= */

const FLIP_DELAY_MS = 500;

const FLIP_DURATION_MS = 600;

const COVER_OPEN_DURATION_MS = 1100;


/* =========================================
   状態
========================================= */

let gameStarted = false;

let currentQuestion = 0;


/* =========================================
   入力文字を正規化
========================================= */

function normalize(value) {

    return value
        .trim()
        .toLowerCase();

}


/* =========================================
   左ページの問題文を変更
========================================= */

function setLeftText(text) {

    const questionText =
        document.getElementById("leftQuestionText");

    if (!questionText) {
        return;
    }

    questionText.textContent = text;
}


/* =========================================
   表紙を開いてゲーム開始
========================================= */

function startGame() {

    if (gameStarted) {
        return;
    }

    gameStarted = true;


    const bookFrame =
        document.getElementById("bookFrame");

    const cover =
        document.querySelector(".flip-page.cover");


    if (!bookFrame || !cover) {
        return;
    }


    /*
        ★重要

        先に本体を表示する。

        cover のアニメーションが終わるまで
        待ってはいけない。

        これによって、
        「表紙を開いている途中で
        本全体が一瞬消える」
        問題を防ぐ。
    */

    bookFrame.classList.remove("pre-start");

    bookFrame.classList.add("started");


    /*
        最初の問題をすぐ表示
    */

    currentQuestion = 0;

    setLeftText(
        QUESTIONS[currentQuestion].text
    );


    /*
        表紙を開く
    */

    cover.classList.add("cover-opening");


    /*
        表紙のアニメーション終了後、

        「本を非表示」にするのではなく、
        表紙だけを非表示にする。

        本体はそのまま表示し続ける。
    */

    setTimeout(() => {

        cover.style.visibility = "hidden";

    }, COVER_OPEN_DURATION_MS);

}


/* =========================================
   ページをめくる
========================================= */

function flipPage(pageElement, callback) {

    if (!pageElement) {

        if (callback) {
            callback();
        }

        return;
    }


    pageElement.classList.remove("flipping");


    /*
        ブラウザに再計算させてから
        アニメーションを開始する。
    */

    void pageElement.offsetWidth;


    pageElement.classList.add("flipping");


    setTimeout(() => {

        pageElement.style.visibility = "hidden";

        pageElement.classList.remove("flipping");


        if (callback) {
            callback();
        }

    }, FLIP_DURATION_MS);

}


/* =========================================
   問題を次へ
========================================= */

function nextQuestion() {

    currentQuestion++;


    /*
        全問終了
    */

    if (currentQuestion >= QUESTIONS.length) {

        setLeftText(CLEAR_TEXT);

        return;
    }


    /*
        次の問題を左ページに表示
    */

    setTimeout(() => {

        setLeftText(
            QUESTIONS[currentQuestion].text
        );

    }, FLIP_DELAY_MS);

}


/* =========================================
   回答処理
========================================= */

function checkAnswer() {

    if (!gameStarted) {
        return;
    }


    const input =
        document.querySelector(
            ".answer-area input:not([disabled])"
        );


    if (!input) {
        return;
    }


    const answer =
        normalize(input.value);


    if (!answer) {
        return;
    }


    const question =
        QUESTIONS[currentQuestion];


    if (!question) {
        return;
    }


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

        resultMessage.textContent =
            "正解！";

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
        問題ページをめくる
    */

    flipPage(
        currentPage,
        () => {

            nextQuestion();

        }
    );

}


/* =========================================
   Enterキーで回答
========================================= */

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


/* =========================================
   イベント設定
========================================= */

function setupEvents() {

    const startButton =
        document.getElementById("startButton");


    if (startButton) {

        startButton.addEventListener(
            "click",
            startGame
        );

    }


    /*
        回答ボタン

        現在のHTML構成に合わせて
        3つすべてにイベントを設定。
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


    setupEnterKey();

}


/* =========================================
   初期化
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupEvents();

    }
);