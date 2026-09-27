// /room1.js

/* =========================================================
   設定エリア
   ========================================================= */

// 問題文と正解データ
//
// text:
//   左ページに表示される問題文
//
// answers:
//   配列内のどれかに一致すればOK
//   全角/半角・大文字小文字・空白は自動で吸収されます

const QUESTIONS = [
    {
        text: "問題1：この会場の入口に置かれた看板に書かれた「合言葉」の最初の一文字は何でしょう？（ひらがなで回答）",
        answers: ["さ", "サ", "asd"]
    },

    {
        text: "問題2：3, 6, 9, 12, ? 　次に来る数字は？",
        answers: ["15", "asd"]
    },

    {
        text: "問題3：「さくら」を逆から読むと？",
        answers: ["らくさ", "asd"]
    }
];


// 全問正解したときに左ページへ表示する文言
const CLEAR_TEXT =
    "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";


// 問題番号(0始まり)に正解したときにめくる「今のページ」のdata-page名
//
// そのページがめくれると、下に重なっている
// 次のページ（次の問題 or クリア画面）が見えます。

const PAGE_ORDER = [
    "q1",
    "q2",
    "q3"
];


// 正解してからページがめくれ始めるまで
const FLIP_DELAY_MS = 500;


// ページがめくれる演出そのものの所要時間
//
// room1.css の .flip-page の transition 0.6s と合わせています。

const FLIP_DURATION_MS = 600;


// =========================================================
// 今回追加した「開始時の表紙」の設定
// =========================================================

// 表紙が
//
// 小さい表紙
// ↓
// 右ページサイズ
// ↓
// 左へ開く
//
// までにかかる時間

const COVER_OPEN_DURATION_MS = 1100;


/* =========================================================
   設定エリアここまで
   ========================================================= */


let solvedCount = 0;

const solved = new Set();


// ゲーム開始済みかどうか
let gameStarted = false;


/* =========================================================
   入力値の正規化
   ========================================================= */

function normalize(s) {

    return s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(
            /[Ａ-Ｚａ-ｚ０-９]/g,
            ch =>
                String.fromCharCode(
                    ch.charCodeAt(0) - 0xFEE0
                )
        );
}


/* =========================================================
   ページをめくる
   ========================================================= */

function flipPage(pageName) {

    const page =
        document.querySelector(
            '.flip-page[data-page="' +
            pageName +
            '"]'
        );

    if (page) {

        page.classList.add("flipped");
    }
}


/* =========================================================
   左ページの問題文を書き換える
   ========================================================= */

function setLeftText(text) {

    const el =
        document.getElementById(
            "leftQuestionText"
        );

    if (el) {

        el.textContent = text;
    }
}


/* =========================================================
   ゲーム開始
   ========================================================= */

function startGame() {

    // 二重クリック防止
    if (gameStarted) {
        return;
    }

    gameStarted = true;


    const bookFrame =
        document.getElementById(
            "bookFrame"
        );

    const cover =
        document.querySelector(
            '.flip-page.cover'
        );


    if (!bookFrame || !cover) {
        return;
    }


    /*
        ここではまだ

        ・左ページ
        ・右ページ
        ・問題文

        を表示しない。

        表紙だけを開く。
    */

    cover.classList.add(
        "cover-opening"
    );


    /*
        表紙のアニメーションが完全に終了した後に
        初期状態の本部分を表示する。

        これが今回の重要な部分。
    */

    setTimeout(() => {

        /*
            pre-start を外すことで、

            visibility:hidden
            ↓
            visibility:visible

            となり、初めて本部分が表示される。
        */

        bookFrame.classList.remove(
            "pre-start"
        );


        /*
            表紙は開き終わっているので
            以降は表示対象から外す。
        */

        cover.style.visibility =
            "hidden";


        /*
            本が開いた後に初めて
            問題1を表示する。
        */

        setLeftText(
            QUESTIONS[0].text
        );

    }, COVER_OPEN_DURATION_MS);
}


/* =========================================================
   開始ボタン
   ========================================================= */

const startButton =
    document.getElementById(
        "startButton"
    );


if (startButton) {

    startButton.addEventListener(
        "click",
        startGame,
        {
            once: true
        }
    );
}


/* =========================================================
   解答チェック
   ========================================================= */

function checkAnswer(index, btn) {

    const row =
        btn.closest(".question");

    const input =
        row.querySelector("input");

    const feedback =
        row.querySelector(
            ".feedback"
        );


    const val =
        normalize(input.value);


    const ok =
        QUESTIONS[index]
            .answers
            .some(
                a =>
                    normalize(a) === val
            );


    /* -----------------------------------------------------
       正解
       ----------------------------------------------------- */

    if (ok) {

        feedback.textContent =
            "正解！";

        feedback.className =
            "feedback ok";


        input.disabled = true;

        btn.disabled = true;

        row.classList.add(
            "solved"
        );


        /*
            同じ問題を二重に正解扱いしない
        */

        if (!solved.has(index)) {

            solved.add(index);

            solvedCount++;


            document.getElementById(
                "progressText"
            ).textContent =
                "正解数: " +
                solvedCount +
                " / " +
                QUESTIONS.length;


            /*
                少し「正解！」を見せてから
                ページをめくる。
            */

            setTimeout(() => {

                flipPage(
                    PAGE_ORDER[index]
                );


                /*
                    ページが完全に
                    めくれ終わってから
                    左ページを変更する。
                */

                setTimeout(() => {

                    /*
                        全問正解
                    */

                    if (
                        solvedCount ===
                        QUESTIONS.length
                    ) {

                        setLeftText(
                            CLEAR_TEXT
                        );


                        const clearBox =
                            document.getElementById(
                                "clearBox"
                            );


                        if (clearBox) {

                            clearBox.scrollIntoView({
                                behavior: "smooth",
                                block: "center"
                            });
                        }

                    }

                    /*
                        次の問題
                    */

                    else {

                        setLeftText(
                            QUESTIONS[
                                index + 1
                            ].text
                        );
                    }

                }, FLIP_DURATION_MS);

            }, FLIP_DELAY_MS);
        }
    }


    /* -----------------------------------------------------
       不正解
       ----------------------------------------------------- */

    else {

        feedback.textContent =
            "不正解…もう一度考えてみよう";

        feedback.className =
            "feedback ng";


        row.classList.remove(
            "shake"
        );


        // アニメーションを再実行するための処理
        void row.offsetWidth;


        row.classList.add(
            "shake"
        );
    }
}