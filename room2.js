/* ====================== ここから設定エリア ====================== */

const TOTAL_TIME_SEC = 10 * 60;
const HINT_TIMES = [4 * 60, 7 * 60];
const HINTS = [
    "ヒント1：問題文の言葉の意味をよく見て、どこに手がかりがあるかを考えてみましょう。",
    "ヒント2：答えは、ひとつの単語や文字で表せる可能性があります。"
];

// スタッフが伝える合言葉（複数OK。全角/半角・大文字小文字・空白は自動で吸収されます）
const PASSWORD_LIST = ["がくえんさい", "学園祭"];

// 正解データ
const QUESTIONS = [
    { answers: ["3", "3個", "三つ", "みっつ"] },
    { answers: ["D"] },
    { answers: ["フェスティバル", "school festival", "festival", "スクールフェスティバル"] }
];

/* ====================== 設定エリアここまで ====================== */

let elapsed = 0;
let started = false;
let timerId = null;
const shownHints = new Set();

function showHintOnQuestion(card, index, message) {
    const existing = card.querySelector('.hint-inline');
    if (existing) {
        existing.innerHTML = '<b>ヒント' + (index + 1) + '</b><br>' + message;
        return;
    }

    const hint = document.createElement('div');
    hint.className = 'hint-inline';
    hint.innerHTML = '<b>ヒント' + (index + 1) + '</b><br>' + message;
    const feedback = card.querySelector('.feedback');
    if (feedback) {
        feedback.insertAdjacentElement('afterend', hint);
    }
}

function normalize(s) {
    return s.trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

function format(sec) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function tick() {
    if (!started) return;

    const remaining = TOTAL_TIME_SEC - elapsed;
    const disp = document.getElementById('timeDisplay');
    if (!disp) return;

    disp.textContent = format(remaining);
    disp.classList.toggle('warn', remaining <= 60 && remaining > 0);
    if (remaining <= 0) {
        disp.textContent = 'TIME UP';
        disp.classList.add('warn');
    }

    HINT_TIMES.forEach((t, i) => {
        if (elapsed >= t && !shownHints.has(i)) {
            shownHints.add(i);
            document.querySelectorAll('.question').forEach((card) => {
                showHintOnQuestion(card, i, HINTS[i]);
            });
        }
    });

    elapsed++;
}

function startTimer() {
    if (started) return;
    started = true;
    const disp = document.getElementById('timeDisplay');
    if (disp) {
        disp.textContent = format(TOTAL_TIME_SEC);
    }
    if (timerId === null) {
        timerId = setInterval(tick, 1000);
    }
    tick();
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
            startTimer();
        }, 650);
    } else {
        feedback.textContent = '合言葉が違います。スタッフに確認してください。';
    }
}
document.getElementById('pwInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
});

const disp = document.getElementById('timeDisplay');
if (disp) {
    disp.textContent = format(TOTAL_TIME_SEC);
}

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