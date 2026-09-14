// ========================================
// 学園祭の日付・時間設定
// ========================================

const FESTIVAL_DATES = {
    // 2026年11月21日：1日目
    day1: '2026-11-21',

    // 2026年11月22日：2日目
    day2: '2026-11-22',
};

const DAY_SETTINGS = {
    day1: {
        label: '1日目（11月21日）',
        startTimeMinutes: 10 * 60,
        endTimeMinutes: 17 * 60,
    },

    day2: {
        label: '2日目（11月22日）',
        startTimeMinutes: 10 * 60,
        endTimeMinutes: 16 * 60,
    },
};

const SLOT_INTERVAL_MINUTES = 10;

// 1枠5組（10名）は変更しない
const capacity = 5;


// ========================================
// DOM
// ========================================

const festivalDay = document.getElementById('festivalDay');
const slotSelect = document.getElementById('slotId');
const reservationForm = document.getElementById('reservationForm');


// ========================================
// 選択された日の時間枠を作成
// ========================================

function createSlots(day) {
    const setting = DAY_SETTINGS[day];

    if (!setting) {
        return [];
    }

    return Array.from(
        {
            length:
                (setting.endTimeMinutes - setting.startTimeMinutes)
                / SLOT_INTERVAL_MINUTES
                + 1
        },
        (_, index) => {
            const totalMinutes =
                setting.startTimeMinutes
                + index * SLOT_INTERVAL_MINUTES;

            const hours = String(
                Math.floor(totalMinutes / 60)
            ).padStart(2, '0');

            const minutes = String(
                totalMinutes % 60
            ).padStart(2, '0');

            return {
                id: `${hours}:${minutes}`,
                minutes: totalMinutes,
                label: `${index + 1}回目　${hours}:${minutes}〜`,
            };
        }
    );
}


// ========================================
// フィードバック表示
// ========================================

function showFeedback(element, message, isError = true) {
    element.textContent = message;
    element.className = `feedback ${isError ? 'error' : 'success'}`;
}


// ========================================
// 現在時刻が対象日かどうかを確認
// ========================================

function getJapanDateTime() {
    const formatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(new Date());

    const result = {};

    parts.forEach((part) => {
        if (part.type !== 'literal') {
            result[part.type] = part.value;
        }
    });

    return {
        date: `${result.year}-${result.month}-${result.day}`,
        minutes:
            Number(result.hour) * 60
            + Number(result.minute),
    };
}


// ========================================
// 選択した日について、現在時刻より前の
// 枠を予約対象から除外
// ========================================

function isSlotPast(day, slotMinutes) {
    const now = getJapanDateTime();
    const festivalDate = FESTIVAL_DATES[day];

    // 学園祭当日ではない場合
    // （未来の日・過去の日）
    if (now.date !== festivalDate) {
        return false;
    }

    return slotMinutes < now.minutes;
}


// ========================================
// 枠を画面に表示
// ========================================

function renderSlots(counts = {}) {
    const day = festivalDay.value;
    const slots = createSlots(day);

    slotSelect.replaceChildren();
    slotSelect.disabled = false;

    let availableCount = 0;

    slots.forEach((slot) => {
        const count = counts[slot.id] || 0;

        const option = document.createElement('option');

        option.value = slot.id;

        option.textContent =
            `${slot.label}　残り${Math.max(0, capacity - count)}組`;

        // 当日になっていて、開始時刻を過ぎた枠は選択不可
        if (isSlotPast(day, slot.minutes)) {
            option.disabled = true;
            option.textContent =
                `${slot.label}　受付終了`;
        } else if (count >= capacity) {
            option.disabled = true;
            option.textContent =
                `${slot.label}　満席`;
        } else {
            availableCount += 1;
        }

        slotSelect.appendChild(option);
    });

    // 選択可能な枠がない場合
    if (availableCount === 0) {
        slotSelect.disabled = true;

        const now = getJapanDateTime();

        if (now.date === FESTIVAL_DATES[day]) {
            showFeedback(
                document.getElementById('formFeedback'),
                '現在、予約できる回がありません。',
                true
            );
        } else {
            showFeedback(
                document.getElementById('formFeedback'),
                '現在、すべての回が満席です。',
                true
            );
        }
    }
}


// ========================================
// Firestoreから選択日の空き状況を取得
// ========================================

async function loadSlots() {
    try {
        const day = festivalDay.value;

        const response = await fetch(
            `/api/reservations?day=${encodeURIComponent(day)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        renderSlots(data.counts || {});
    } catch (error) {
        renderSlots();

        showFeedback(
            document.getElementById('formFeedback'),
            error.message || '空き状況を取得できませんでした。',
            true
        );
    }
}


// ========================================
// 日付変更時
// ========================================

festivalDay.addEventListener('change', async () => {
    showFeedback(
        document.getElementById('formFeedback'),
        '',
        false
    );

    await loadSlots();
});


// ========================================
// 予約送信
// ========================================

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const feedback =
        document.getElementById('formFeedback');

    const button =
        reservationForm.querySelector('button');

    button.disabled = true;

    showFeedback(
        feedback,
        '予約を確認しています…',
        false
    );

    try {
        const selectedDay = festivalDay.value;
        const selectedSlot = slotSelect.value;

        const response = await fetch('/api/reservations', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                // 追加：参加日
                day: selectedDay,

                slotId: selectedSlot,

                name:
                    document.getElementById('name').value,

                partnerName:
                    document.getElementById('partnerName').value,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // 整理番号を表示
        document.getElementById(
            'reservationNumber'
        ).textContent = data.reservation.number;

        document.getElementById(
            'numberPanel'
        ).hidden = false;

        // フォームをリセット
        reservationForm.reset();

        // 予約成功メッセージ
        showFeedback(
            feedback,
            '予約が完了しました。整理番号を保存してください。',
            false
        );

        /*
         * 変更点：
         * 以前は予約成功後にloadSlots()を実行して
         * 全時間枠をFirestoreから再取得していました。
         *
         * 今回はFirestoreの読み取りを抑えるため、
         * 予約した枠だけ画面上の残り数を1減らします。
         *
         * 実際の定員判定はAPI側のTransactionが行うため、
         * 同時予約による定員超過も防止できます。
         */
        const selectedOption =
            [...slotSelect.options]
                .find((option) => option.value === selectedSlot);

        if (selectedOption) {
            const match =
                selectedOption.textContent.match(/残り(\d+)組/);

            if (match) {
                const remaining =
                    Math.max(0, Number(match[1]) - 1);

                selectedOption.textContent =
                    `${createSlots(selectedDay)
                        .find((slot) => slot.id === selectedSlot)
                        ?.label || selectedSlot}　残り${remaining}組`;

                if (remaining <= 0) {
                    selectedOption.disabled = true;
                }
            }
        }

        document.getElementById(
            'numberPanel'
        ).scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });

    } catch (error) {
        showFeedback(
            feedback,
            error.message || '予約に失敗しました。',
            true
        );

        /*
         * 予約失敗時だけ最新の空き状況を取得します。
         * 例えば同時に別の人が最後の1枠を取った場合などに、
         * 正しい状態へ戻すためです。
         */
        await loadSlots();

    } finally {
        button.disabled = false;
    }
});


// ========================================
// 初期表示
// ========================================

loadSlots();