//  /room2.js
/* ====================== ここから設定エリア ====================== */

// スタッフが伝える合言葉（複数OK。全角/半角・大文字小文字・空白は自動で吸収されます）
const PASSWORD_LIST = ["がくえんさい", "学園祭", "asd"];

// 正解データ
const QUESTIONS = [
    { text: "問題1：この部屋に置かれた箱の中には、いくつのボールが入っていた？", answers: ["3", "3個", "三つ", "みっつ", "asd"] },
    { text: "問題2：アルファベットで「C」の次の文字は？", answers: ["D", "asd"] },
    { text: "問題3：「文化祭」を英語に訳すと何でしょう？（カタカナでも可）", answers: ["フェスティバル", "school festival", "festival", "スクールフェスティバル", "asd"] }
];

const PAGE_ORDER = ['q1', 'q2', 'q3'];
const FLIP_DELAY_MS = 500;
const FLIP_DURATION_MS = 600;

/* ====================== 設定エリアここまで ====================== */

function normalize(s) {
    return s.trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

function checkPassword() {
    const input = document.getElementById('pwInput');
    const feedback = document.getElementById('pwFeedback');
    const val = normalize(input.value);
    const ok = PASSWORD_LIST.some(p => normalize(p) === val);
    if (ok) {
        document.getElementById('passwordOverlay').classList.add('hide');
        setTimeout(() => {
            document.getElementById('passwordOverlay').style.display = 'none';
        }, 650);
    } else {
        feedback.textContent = '合言葉が違います。スタッフに確認してください。';
    }
}
document.getElementById('pwInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
});

let solvedCount = 0;
const solved = new Set();

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

function startGame() {
    flipPage('cover');
    setLeftText(QUESTIONS[0].text);
}

const startButton = document.getElementById('startButton');
if (startButton) {
    startButton.addEventListener('click', startGame, { once: true });
}

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