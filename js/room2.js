//  /room2.js
/* ====================== ここから設定エリア ====================== */

// スタッフが伝える合言葉（複数OK。全角/半角・大文字小文字・空白は自動で吸収されます）
const PASSWORD_LIST = ["がくえんさい", "学園祭", "asd"];

// あらすじ（1ページ目）
// PC：左ページに表示 / スマホ：1ページ目の上半分に表示
const STORY_TEXT =
    "ヘンゼルとグレーテルの世界をぬけ出すと、" +
    "次に現れたのはアリスの世界だった。" +
    "時計を持った白うさぎが、どこかであわてている。" +
    "なぞを解いて、この不思議の国から出口を見つけよう。";

// 正解データ
const QUESTIONS = [
    { text: "問題1：これは何", answers: ["3", "3個", "三つ", "みっつ", "asd"] },
    { text: "問題2：これは何", answers: ["D", "asd"] }
];

// あらすじページの data-page 名（めくると問題1が見える）
const STORY_PAGE = 'story';

const PAGE_ORDER = ['q1', 'q2'];
const FLIP_DELAY_MS = 500;
const FLIP_DURATION_MS = 600;

// 表紙を開くアニメーション時間（room2-intro.css の coverOpenAlice と合わせる）
const COVER_OPEN_DURATION_MS = 1100;

/* ====================== 設定エリアここまで ====================== */

/*
    各ページの文章をセット（スマホ用）

    .page-qtext の data-qtext="0|1" に QUESTIONS[n].text を、
    data-story に STORY_TEXT を流し込みます。
    PCでは CSS で非表示なので、見た目には影響しません。
*/
function fillPageQuestions() {
    document.querySelectorAll('[data-qtext]').forEach(el => {
        const q = QUESTIONS[Number(el.dataset.qtext)];
        if (q) {
            el.textContent = q.text;
        }
    });

    document.querySelectorAll('[data-story]').forEach(el => {
        el.textContent = STORY_TEXT;
    });
}
fillPageQuestions();

const SESSION_KEY = 'festival-room2-progress-v1';
const savedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') || {};
const savedSolved = Array.isArray(savedSession.solved)
    ? savedSession.solved.filter(index =>
        Number.isInteger(index) && index >= 0 && index < QUESTIONS.length
    )
    : [];
const savedInputs = Array.isArray(savedSession.inputs)
    ? savedSession.inputs
    : [];
let roomUnlocked = savedSession.unlocked === true;
let solvedCount = 0;
const solved = new Set(savedSolved);
let isUnlocking = false;

// 表紙を開いて本を読み始めたか（二重タップ防止）
let gameStarted = savedSession.started === true || solved.size > 0;

// あらすじページを読み終えて問題へ進んだか
let storyDone = savedSession.storyDone === true || solved.size > 0;

function saveSession() {
    const inputs = Array.from(
        document.querySelectorAll('.question[data-index]')
    )
        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
        .map(row => row.querySelector('input').value);

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        unlocked: roomUnlocked,
        started: gameStarted,
        storyDone: storyDone,
        solved: Array.from(solved),
        inputs
    }));
}

function normalize(s) {
    return s.trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

function checkPassword() {
    if (roomUnlocked || isUnlocking) {
        return;
    }

    const input = document.getElementById('pwInput');
    const feedback = document.getElementById('pwFeedback');
    const val = normalize(input.value);
    const ok = PASSWORD_LIST.some(p => normalize(p) === val);
    if (ok) {
        isUnlocking = true;
        roomUnlocked = true;
        saveSession();
        const overlay = document.getElementById('passwordOverlay');
        const lockCard = overlay.querySelector('.lock-card');
        const icon = lockCard.querySelector('.icon');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        icon.textContent = '🔓';
        lockCard.classList.add('unlocked');
        input.disabled = true;
        overlay.querySelector('button').disabled = true;
        feedback.textContent = '鍵が開きました！';

        setTimeout(() => {
            overlay.classList.add('hide');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, reduceMotion ? 0 : 600);
        }, reduceMotion ? 0 : 650);
    } else {
        feedback.textContent = '合言葉が違います。スタッフに確認してください。';
    }
}
document.getElementById('pwInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
});

function flipPage(pageName) {
    const page = document.querySelector('.flip-page[data-page="' + pageName + '"]');
    if (page) {
        page.classList.add('flipped');
    }
}

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
    // 合言葉で鍵を開けるまでは開かない
    if (!roomUnlocked || gameStarted) {
        return;
    }

    gameStarted = true;

    const bookFrame = document.getElementById('bookFrame');
    const cover = document.querySelector('.flip-page.cover');

    if (!bookFrame || !cover) {
        return;
    }

    // 本を即座に表示してから、その上で表紙をめくる
    bookFrame.classList.remove('pre-start');
    bookFrame.classList.add('started');

    // PC用：左ページにあらすじをセット
    setLeftText(STORY_TEXT);

    saveSession();

    // 表紙を開く（回転のみ）
    cover.classList.add('cover-opening');

    // アニメーション終了後、表紙を視覚的に消す
    setTimeout(() => {
        cover.style.visibility = 'hidden';
    }, COVER_OPEN_DURATION_MS);
}

const bookCover = document.getElementById('bookCover');

if (bookCover) {
    bookCover.addEventListener('click', startGame);

    // キーボード操作（Enter / Space）でも開けるようにする
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

const storyNextButton = document.getElementById('storyNextButton');

function goToQuestions() {
    if (!gameStarted || storyDone) {
        return;
    }

    storyDone = true;

    if (storyNextButton) {
        storyNextButton.disabled = true;
    }

    saveSession();

    flipPage(STORY_PAGE);

    // めくり終わってから左ページ（PC）を問題1に更新
    setTimeout(() => {
        setLeftText(QUESTIONS[0].text);
    }, FLIP_DURATION_MS);
}

if (storyNextButton) {
    storyNextButton.addEventListener('click', goToQuestions);
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

    if (roomUnlocked) {
        document.getElementById('passwordOverlay').style.display = 'none';
    }

    solvedCount = solved.size;
    document.getElementById('progressText').textContent =
        '正解数: ' + solvedCount + ' / ' + QUESTIONS.length;

    if (roomUnlocked && gameStarted) {
        const bookFrame = document.getElementById('bookFrame');
        const cover = document.querySelector('.flip-page.cover');

        if (bookFrame) {
            bookFrame.classList.remove('pre-start');
            bookFrame.classList.add('started');
        }

        if (cover) {
            cover.style.visibility = 'hidden';
        }

        if (storyDone) {
            flipPage(STORY_PAGE);

            if (storyNextButton) {
                storyNextButton.disabled = true;
            }

            setLeftText(
                solvedCount === QUESTIONS.length
                    ? '🎉 全問正解！ おめでとうございます！最後のページへ進みましょう。'
                    : QUESTIONS[solvedCount].text
            );
        } else {
            setLeftText(STORY_TEXT);
        }
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

function checkAnswer(index, btn) {
    const row = btn.closest('.question');
    const input = row.querySelector('input');
    const feedback = row.querySelector('.feedback');
    const val = normalize(input.value);
    const ok = QUESTIONS[index].answers.some(a => normalize(a) === val);

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
            document.getElementById('progressText').textContent = '正解数: ' + solvedCount + ' / ' + QUESTIONS.length;

            setTimeout(() => {
                flipPage(PAGE_ORDER[index]);
                setTimeout(() => {
                    if (solvedCount === QUESTIONS.length) {
                        setLeftText('🎉 全問正解！ おめでとうございます！最後のページへ進みましょう。');
                        document.getElementById('clearBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        setLeftText(QUESTIONS[index + 1].text);
                    }
                }, FLIP_DURATION_MS);
            }, FLIP_DELAY_MS);
        }
    } else {
        feedback.textContent = '不正解…もう一度考えてみよう';
        feedback.className = 'feedback ng';
        row.classList.remove('shake');
        void row.offsetWidth;
        row.classList.add('shake');
    }
}