// /room1.js


/* =========================================================
   ここから設定エリア
   ========================================================= */


/*
    問題文と正解データ

    text:
        左ページに表示される問題文

    answers:
        配列内のどれかに一致すればOK

        全角/半角・大文字小文字・空白は
        normalize() によって自動的に吸収されます。
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


/*
    全問正解したときに
    左ページへ表示する文言
*/

const CLEAR_TEXT =
    "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";


/*
    問題番号（0始まり）に正解したときに
    めくる「今のページ」のdata-page名。

    そのページがめくれると、
    下に重なっている次のページが見えます。
*/

const PAGE_ORDER = [
    "q1",
    "q2",
    "q3"
];


/*
    正解してからページが
    めくれ始めるまでの時間。

    「正解！」を一瞬見せてからめくります。
*/

const FLIP_DELAY_MS = 500;


/*
    ページがめくれる演出そのものの時間。

    room1.css の

        .flip-page {
            transition: transform 0.6s ...
        }

    と合わせています。
*/

const FLIP_DURATION_MS = 600;


/*
    表紙を開くアニメーション時間。

    room1.css の coverOpen の
    1.1s と合わせています。

    重要：
    この時間が経過するまで
    本を表示するのを待つことはしません。

    本は開始ボタンを押した瞬間に表示します。
*/

const COVER_OPEN_DURATION_MS = 1100;


/* =========================================================
   設定エリアここまで
   ========================================================= */


let solvedCount = 0;


const solved = new Set();


/*
    ゲームが開始されたかどうか。

    開始ボタンの二重クリック防止にも使用します。
*/

let gameStarted = false;


/* =========================================================
   入力値の正規化
   ========================================================= */

function normalize(s) {

    return s
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            ''
        )
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

/*
    data-page属性で指定した
    1枚のページだけをめくります。
*/

function flipPage(pageName) {

    const page =
        document.querySelector(
            '.flip-page[data-page="' +
            pageName +
            '"]'
        );


    if (page) {

        page.classList.add(
            'flipped'
        );
    }
}


/* =========================================================
   左ページの問題文を書き換える
   ========================================================= */

function setLeftText(text) {

    const el =
        document.getElementById(
            'leftQuestionText'
        );


    if (el) {

        el.textContent =
            text;
    }
}


/* =========================================================
   ゲーム開始
   ========================================================= */

function startGame() {

    /*
        二重クリック防止
    */

    if (gameStarted) {

        return;
    }


    gameStarted = true;


    const bookFrame =
        document.getElementById(
            'bookFrame'
        );


    const cover =
        document.querySelector(
            '.flip-page.cover'
        );


    /*
        必要な要素がなければ終了
    */

    if (!bookFrame || !cover) {

        return;
    }


    /*
        =====================================================
        今回の重要な修正
        =====================================================

        以前の処理では、

            表紙を開く
                ↓
            1.1秒待つ
                ↓
            本を表示する

        という順番でした。

        これだと表紙のアニメーション終了時に
        本の表示状態が変化するため、

            「一瞬本が消える」

        という現象が発生する可能性があります。


        今回は、

            開始ボタンを押す
                ↓
            本を即座に表示
                ↓
            問題1をセット
                ↓
            表紙をその上でめくる

        という順番にします。
    */


    /*
        =====================================================
        本を即座に表示
        =====================================================

        ここで pre-start を外します。

        ただし cover は z-index:20 なので、
        ユーザーには表紙が上に存在している状態で見えます。

        つまり、

            本が表示される
                ↓
            表紙が上にある

        ので、画面上では自然に
        「表紙を開いている」ように見えます。
    */

    bookFrame.classList.remove(
        'pre-start'
    );


    /*
        本そのものを表示するための
        startedクラスを即座に追加します。

        CSSではtransitionを使っていないので、
        フェードや遅延は発生しません。
    */

    bookFrame.classList.add(
        'started'
    );


    /*
        =====================================================
        問題1をセット
        =====================================================

        表紙がまだ上にあるため、
        この時点ではユーザーには見えません。

        表紙がめくれた後には、
        すでに問題1がセットされています。
    */

    setLeftText(
        QUESTIONS[0].text
    );


    /*
        =====================================================
        表紙を開く
        =====================================================

        ここではサイズ変更を行いません。

        CSSの coverOpen は
        rotateY() だけを変化させます。
    */

    cover.classList.add(
        'cover-opening'
    );


    /*
        =====================================================
        表紙アニメーション終了後
        =====================================================

        ここでは本の表示状態を
        一切変更しません。

        すでに本は表示されているので、
        最後に visibility を切り替える処理などを
        行わないことが重要です。
    */

    setTimeout(() => {

        /*
            表紙を視覚的に完全に消します。

            本体側には何も変更を加えません。
        */

        cover.style.visibility =
            'hidden';

    }, COVER_OPEN_DURATION_MS);
}


/* =========================================================
   開始ボタン
   ========================================================= */

const startButton =
    document.getElementById(
        'startButton'
    );


if (startButton) {

    startButton.addEventListener(
        'click',
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

    /*
        ボタンが入っている問題ブロック
    */

    const row =
        btn.closest(
            '.question'
        );


    const input =
        row.querySelector(
            'input'
        );


    const feedback =
        row.querySelector(
            '.feedback'
        );


    /*
        入力値を正規化
    */

    const val =
        normalize(
            input.value
        );


    /*
        正解判定
    */

    const ok =
        QUESTIONS[index]
            .answers
            .some(
                a =>
                    normalize(a) === val
            );


    /* =====================================================
       正解
       ===================================================== */

    if (ok) {

        feedback.textContent =
            '正解！';


        feedback.className =
            'feedback ok';


        /*
            同じ問題を
            再度入力できないようにする
        */

        input.disabled =
            true;


        btn.disabled =
            true;


        row.classList.add(
            'solved'
        );


        /*
            同じ問題を二重に
            正解扱いしない
        */

        if (!solved.has(index)) {

            solved.add(index);


            solvedCount++;


            /*
                正解数を更新
            */

            document.getElementById(
                'progressText'
            ).textContent =
                '正解数: ' +
                solvedCount +
                ' / ' +
                QUESTIONS.length;


            /*
                「正解！」を少し見せてから
                ページをめくる
            */

            setTimeout(() => {

                flipPage(
                    PAGE_ORDER[index]
                );


                /*
                    ページが完全に
                    めくれ終わってから
                    左ページの問題文を変更
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
                                'clearBox'
                            );


                        if (clearBox) {

                            clearBox.scrollIntoView({
                                behavior:
                                    'smooth',

                                block:
                                    'center'
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


    /* =====================================================
       不正解
       ===================================================== */

    else {

        feedback.textContent =
            '不正解…もう一度考えてみよう';


        feedback.className =
            'feedback ng';


        /*
            前回のshakeクラスを削除
        */

        row.classList.remove(
            'shake'
        );


        /*
            アニメーションを
            再実行できるようにする
        */

        void row.offsetWidth;


        row.classList.add(
            'shake'
        );
    }
}