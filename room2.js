/* ====================== ここから設定エリア ====================== */

// スタッフが伝える合言葉（複数OK。全角/半角・大文字小文字・空白は自動で吸収されます）
const PASSWORD_LIST = ["がくえんさい", "学園祭"];

// 正解データ
const QUESTIONS = [
    { answers: ["3", "3個", "三つ", "みっつ"] },
    { answers: ["D"] },
    { answers: ["フェスティバル", "school festival", "festival", "スクールフェスティバル"] }
];

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
        }
        if (solvedCount === QUESTIONS.length) {
            document.getElementById('clearBox').style.display = 'block';
            document.getElementById('clearBox').scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        feedback.textContent = '不正解…もう一度考えてみよう';
        feedback.className = 'feedback ng';
        row.classList.remove('shake');
        void row.offsetWidth;
        row.classList.add('shake');
    }
}