/* ====================== ここから設定エリア ====================== */

// 制限時間（秒）。例: 15分 = 15*60
const TOTAL_TIME_SEC = 10 * 60;

// ヒントを出す「経過時間」（秒）。例: 4分, 6分
const HINT_TIMES = [4 * 60, 6 * 60];
const HINTS = [
    "ヒント1：問題文をもう一度よく読んでみましょう。会場のどこかに手がかりがあります。",
    "ヒント2：数字の問題は、規則性（増え方）に注目してみましょう。"
];

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

// 正解データ（配列内のどれかに一致すればOK。全角/半角・大文字小文字・空白は自動で吸収されます）
const QUESTIONS = [
    { answers: ["さ", "サ"] },
    { answers: ["15"] },
    { answers: ["らくさ"] }
];

/* ====================== 設定エリアここまで ====================== */

let elapsed = 0;
let solvedCount = 0;
let started = false;
let timerId = null;
const shownHints = new Set();
const solved = new Set();

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
    disp.textContent = format(remaining);
    disp.classList.toggle('warn', remaining <= 60 && remaining > 0);
    if (remaining <= 0) {
        disp.textContent = "TIME UP";
        disp.classList.add('warn');
    }

    // 画面を徐々に赤く
    const ratio = Math.min(elapsed / TOTAL_TIME_SEC, 1);
    document.getElementById('redOverlay').style.opacity = (ratio * 0.45).toFixed(2);

    // ヒント表示
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

function startGame() {
    if (started) return;
    started = true;
    document.getElementById('startOverlay').classList.add('hide');
    setTimeout(() => {
        document.getElementById('startOverlay').style.display = 'none';
    }, 450);
    if (timerId === null) {
        timerId = setInterval(tick, 1000);
    }
    tick();
}

const startButton = document.getElementById('startButton');
if (startButton) {
    startButton.addEventListener('click', startGame);
}

const disp = document.getElementById('timeDisplay');
if (disp) {
    disp.textContent = format(TOTAL_TIME_SEC);
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