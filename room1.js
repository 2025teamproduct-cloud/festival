//  /room1.js
/* ====================== ここから設定エリア ====================== */

// 問題文と正解データ
// text: 左ページに表示される問題文
// answers: 配列内のどれかに一致すればOK（全角/半角・大文字小文字・空白は自動で吸収されます）
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
const CLEAR_TEXT = "🎉 全問正解！ スタッフにこの画面を見せて、次の部屋へ進んでください。";

// 問題番号(0始まり)に正解したときにめくる「今のページ」のdata-page名。
// そのページがめくれると、下に重なっている次のページ（次の問題 or クリア画面）が見えます。
// 問題を増減する場合は、index.html側のページ枚数とあわせてここも編集してください。
const PAGE_ORDER = ['q1', 'q2', 'q3'];

// 正解してからページがめくれ始めるまでの間（ms）。「正解！」を一瞬見せてからめくる。
const FLIP_DELAY_MS = 500;

/* ====================== 設定エリアここまで ====================== */

let solvedCount = 0;
const solved = new Set();

function normalize(s) {
    return s.trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

// data-page属性で指定した1枚のページだけをめくる
function flipPage(pageName) {
    const page = document.querySelector('.flip-page[data-page="' + pageName + '"]');
    if (page) {
        page.classList.add('flipped');
    }
}

// 左ページの問題文を書き換える
function setLeftText(text) {
    const el = document.getElementById('leftQuestionText');
    if (el) {
        el.textContent = text;
    }
}

function startGame() {
    // 表紙をめくって問題1の解答ページを見せる
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

            // 少し「正解！」を見せてから、そのページをめくって次を見せる
            setTimeout(() => {
                flipPage(PAGE_ORDER[index]);

                if (solvedCount === QUESTIONS.length) {
                    setLeftText(CLEAR_TEXT);
                    setTimeout(() => {
                        document.getElementById('clearBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 650);
                } else {
                    setLeftText(QUESTIONS[index + 1].text);
                }
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