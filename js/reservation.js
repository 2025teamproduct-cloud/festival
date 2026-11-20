//  /reservation.js
// ========================================
// 学園祭の日付・時間設定
// ========================================

const FESTIVAL_DATES = {
    day1: '2026-11-21',
    day2: '2026-11-22',
};

const DAY_LABELS = {
    day1: '1日目（11月21日）',
    day2: '2日目（11月22日）',
};

// 両日とも 11:00〜16:00
const DAY_SETTINGS = {
    day1: {
        startTimeMinutes: 11 * 60,
        endTimeMinutes: 16 * 60,
    },

    day2: {
        startTimeMinutes: 11 * 60,
        endTimeMinutes: 16 * 60,
    },
};

const SLOT_INTERVAL_MINUTES = 30;

// 1枠の定員（人数）
const SLOT_CAPACITY = 20;

// 1回の予約の最大人数
const MAX_PARTY_SIZE = 4;


// ========================================
// DOM
// ========================================

const festivalDay = document.getElementById('festivalDay');
const partySizeSelect = document.getElementById('partySize');
const companionFields = document.getElementById('companionFields');
const availability = document.getElementById('availability');
const reservationForm = document.getElementById('reservationForm');
const formFeedback = document.getElementById('formFeedback');

// 現在表示している日の各枠の予約人数
let currentCounts = {};


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
// 日本時間を取得
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
// 開始時刻を過ぎた枠か
// ========================================

function isSlotPast(day, slotMinutes) {
    const now = getJapanDateTime();

    if (now.date !== FESTIVAL_DATES[day]) {
        return false;
    }

    return slotMinutes < now.minutes;
}


// ========================================
// 同行者の入力欄を人数に合わせて作成
// ========================================

function renderCompanionInputs() {
    // 入力済みの内容は可能な限り残す
    const previousValues =
        [...companionFields.querySelectorAll('input')]
            .map((input) => input.value);

    const partySize = Number(partySizeSelect.value);

    companionFields.replaceChildren();

    for (let index = 0; index < partySize - 1; index += 1) {
        const label = document.createElement('label');
        label.textContent = `同行者${index + 1}名`;

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 80;
        input.required = true;
        input.className = 'companion-input';
        input.value = previousValues[index] || '';

        label.appendChild(input);
        companionFields.appendChild(label);
    }

    companionFields.hidden = partySize <= 1;
}


// ========================================
// 空き状況を画面に表示
//
// 枠は自動で割り振られるため、
// 「いま入れる最大人数」だけを案内します。
// ========================================

function renderAvailability() {
    const day = festivalDay.value;

    const remainingList =
        createSlots(day)
            .filter((slot) => !isSlotPast(day, slot.minutes))
            .map((slot) =>
                SLOT_CAPACITY - (currentCounts[slot.id] || 0)
            );

    const maxRemaining =
        remainingList.length
            ? Math.max(0, ...remainingList)
            : 0;

    const totalRemaining =
        remainingList.reduce((sum, value) => sum + value, 0);

    const submitButton =
        reservationForm.querySelector('button[type="submit"]');

    // 入れない人数は選べないようにする
    [...partySizeSelect.options].forEach((option) => {
        option.disabled = Number(option.value) > maxRemaining;
    });

    // 現在の選択が選べなくなった場合、選べる最大人数に合わせる
    if (maxRemaining > 0 && Number(partySizeSelect.value) > maxRemaining) {
        partySizeSelect.value = String(Math.min(MAX_PARTY_SIZE, maxRemaining));
        renderCompanionInputs();
    }

    if (maxRemaining === 0) {
        submitButton.disabled = true;

        availability.textContent = '';

        const now = getJapanDateTime();

        showFeedback(
            formFeedback,
            now.date === FESTIVAL_DATES[day]
                ? '現在、予約できる回がありません。'
                : 'この日の予約は満員です。',
            true
        );
    } else {
        submitButton.disabled = false;

        availability.textContent =
            `残り ${totalRemaining} 名分（1組で最大 ${Math.min(MAX_PARTY_SIZE, maxRemaining)} 名まで予約できます）`;
    }
}


// ========================================
// 選択日の空き状況を取得
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

        currentCounts = data.counts || {};

        renderAvailability();
    } catch (error) {
        currentCounts = {};

        renderAvailability();

        showFeedback(
            formFeedback,
            error.message || '空き状況を取得できませんでした。',
            true
        );
    }
}


// ========================================
// 日付・人数変更時
// ========================================

festivalDay.addEventListener('change', async () => {
    showFeedback(formFeedback, '', false);

    await loadSlots();
});

partySizeSelect.addEventListener('change', renderCompanionInputs);


// ========================================
// 予約送信
// ========================================

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button =
        reservationForm.querySelector('button[type="submit"]');

    button.disabled = true;

    showFeedback(
        formFeedback,
        '予約を確認しています…',
        false
    );

    try {
        const selectedDay = festivalDay.value;
        const partySize = Number(partySizeSelect.value);
        const name = document.getElementById('name').value;

        const partnerNames =
            [...companionFields.querySelectorAll('input')]
                .map((input) => input.value);

        const response = await fetch('/api/reservations', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                day: selectedDay,
                partySize,
                name,
                partnerNames,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        const reservation = data.reservation;

        // 結果を表示
        document.getElementById('reservationNumber').textContent =
            reservation.number;

        document.getElementById('reservationDay').textContent =
            DAY_LABELS[reservation.day] || reservation.day;

        document.getElementById('reservationSlot').textContent =
            `${reservation.slotId}〜`;

        document.getElementById('reservationPartySize').textContent =
            `${reservation.partySize}名`;

        document.getElementById('reservationName').textContent =
            reservation.name;

        document.getElementById('reservationPartnerNames').textContent =
            reservation.partnerNames.length
                ? reservation.partnerNames.join('、')
                : 'なし';

        document.getElementById('numberPanel').hidden = false;

        // フォームをリセット（参加日は維持）
        reservationForm.reset();
        festivalDay.value = selectedDay;
        renderCompanionInputs();

        showFeedback(
            formFeedback,
            '予約が完了しました。整理番号を保存してください。',
            false
        );

        /*
         * Firestoreの読み取りを抑えるため、再取得はせず、
         * 割り振られた枠の人数だけ画面上で加算します。
         * 実際の定員判定はAPI側のTransactionが行います。
         */
        currentCounts[reservation.slotId] =
            (currentCounts[reservation.slotId] || 0)
            + reservation.partySize;

        renderAvailability();

        document.getElementById('numberPanel').scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });

    } catch (error) {
        showFeedback(
            formFeedback,
            error.message || '予約に失敗しました。',
            true
        );

        // 失敗時だけ最新の空き状況を取得し直す
        await loadSlots();

    } finally {
        // 満員の場合は renderAvailability 側で無効化される
        const maxed = availability.textContent === '';
        button.disabled = maxed;
    }
});


// ========================================
// 初期表示
// ========================================

renderCompanionInputs();
loadSlots();