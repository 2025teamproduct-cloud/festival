const verifyForm = document.getElementById('verifyForm');
const verifyNumber = document.getElementById('verifyNumber');
const verifyName = document.getElementById('verifyName');
const participantList = document.getElementById('participantList');
const verifiedReservation = document.getElementById('verifiedReservation');

const day1Button = document.getElementById('day1Button');
const day2Button = document.getElementById('day2Button');
const selectedDayLabel = document.getElementById('selectedDayLabel');

let reservations = [];


// ========================================
// 現在選択している日
// ========================================

let selectedDay = 'day1';


// ========================================
// 学園祭の日付
// ========================================

const FESTIVAL_DATES = {
    day1: '2026-11-21',
    day2: '2026-11-22',
};


// ========================================
// フィードバック
// ========================================

function showFeedback(element, message, isError = true) {
    element.textContent = message;
    element.className =
        `feedback ${isError ? 'error' : 'success'}`;
}


// ========================================
// 整理番号順
// ========================================

function sortReservations(first, second) {
    return first.number.localeCompare(
        second.number,
        undefined,
        { numeric: true }
    );
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
// その枠が現在時刻より前か確認
// ========================================

function isSlotPast(slotId) {
    const now = getJapanDateTime();

    const festivalDate =
        FESTIVAL_DATES[selectedDay];

    // 学園祭当日以外なら、未来/過去の日付なので
    // 時刻による除外は行わない
    if (now.date !== festivalDate) {
        return false;
    }

    const [hours, minutes] =
        slotId.split(':').map(Number);

    const slotMinutes =
        hours * 60 + minutes;

    return slotMinutes < now.minutes;
}


// ========================================
// 整理番号の選択肢を表示
// ========================================

function renderReservationOptions() {
    verifyNumber.replaceChildren();

    const placeholder =
        document.createElement('option');

    placeholder.value = '';
    placeholder.textContent =
        '整理番号を選択してください';

    placeholder.disabled = true;
    placeholder.selected = true;

    verifyNumber.appendChild(placeholder);

    reservations
        .sort(sortReservations)
        .forEach((reservation) => {

            const option =
                document.createElement('option');

            option.value = reservation.number;

            option.textContent =
                reservation.number;

            verifyNumber.appendChild(option);
        });

    verifyNumber.disabled =
        reservations.length === 0;
}


// ========================================
// 本人確認済み予約を表示
// ========================================

function renderVerifiedReservation(reservation) {
    verifiedReservation.replaceChildren();

    const heading =
        document.createElement('strong');

    heading.textContent =
        '本人確認済み';

    const names =
        document.createElement('p');

    names.textContent =
        `代表者：${reservation.name}　同行者：${reservation.partnerName}`;

    const day =
        document.createElement('p');

    day.textContent =
        `参加日：${reservation.day === 'day1'
            ? '1日目（11月21日）'
            : '2日目（11月22日）'}`;

    const slot =
        document.createElement('p');

    slot.textContent =
        `参加枠：${reservation.slotId}`;

    verifiedReservation.append(
        heading,
        names,
        day,
        slot
    );

    verifiedReservation.hidden = false;
}


// ========================================
// 参加者一覧を表示
// ========================================

function renderParticipants() {
    participantList.replaceChildren();

    if (!reservations.length) {
        participantList.textContent =
            '現在表示できる予約はありません。';

        return;
    }

    const reservationsBySlot =
        reservations.reduce((groups, reservation) => {

            const group =
                groups.get(reservation.slotId) || [];

            group.push(reservation);

            groups.set(
                reservation.slotId,
                group
            );

            return groups;

        }, new Map());


    [
        ...reservationsBySlot.entries()
    ]
        .sort(([first], [second]) =>
            first.localeCompare(second)
        )
        .forEach(([slotId, slotReservations]) => {

            // 念のためクライアント側でも過去枠を除外
            if (isSlotPast(slotId)) {
                return;
            }

            const group =
                document.createElement('section');

            group.className =
                'participant-group';


            const heading =
                document.createElement('h3');

            heading.textContent =
                slotId;


            const list =
                document.createElement('div');

            list.className =
                'participant-items';


            slotReservations
                .sort(sortReservations)
                .forEach((reservation) => {

                    const label =
                        document.createElement('label');

                    label.className =
                        'participant-item';


                    const checkbox =
                        document.createElement('input');

                    checkbox.type =
                        'checkbox';

                    checkbox.checked =
                        reservation.verified;

                    checkbox.dataset.number =
                        reservation.number;

                    checkbox.addEventListener(
                        'change',
                        () =>
                            updateVerification(
                                reservation,
                                checkbox
                            )
                    );


                    const names =
                        document.createElement('span');

                    names.textContent =
                        `${reservation.number}　${reservation.name} / ${reservation.partnerName}`;


                    label.append(
                        checkbox,
                        names
                    );

                    list.appendChild(label);
                });


            group.append(
                heading,
                list
            );

            participantList.appendChild(group);
        });
}


// ========================================
// 確認状態を変更
// ========================================

async function updateVerification(
    reservation,
    checkbox
) {
    checkbox.disabled = true;

    try {
        const response =
            await fetch('/api/reservations', {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    action: 'setVerified',
                    number: reservation.number,
                    verified: checkbox.checked,
                }),
            });

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        reservation.verified =
            data.verified;

    } catch (error) {

        checkbox.checked =
            reservation.verified;

        showFeedback(
            document.getElementById('verifyFeedback'),
            error.message ||
                '確認状態を保存できませんでした。',
            true
        );

    } finally {
        checkbox.disabled = false;
    }
}


// ========================================
// スタッフ用予約一覧を取得
// ========================================

async function loadReservations() {
    /*
     * selectedDayをAPIへ渡します。
     *
     * API側で、
     * ・選択された日のみ
     * ・現在時刻を過ぎていない枠のみ
     *
     * をFirestoreから取得します。
     */
    const response =
        await fetch(
            `/api/reservations?view=staff&day=${encodeURIComponent(selectedDay)}`
        );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(data.message);
    }

    reservations =
        data.reservations || [];

    renderReservationOptions();
    renderParticipants();
}


// ========================================
// 日付ボタンの見た目を更新
// ========================================

function updateDayButtons() {
    day1Button.classList.toggle(
        'active',
        selectedDay === 'day1'
    );

    day2Button.classList.toggle(
        'active',
        selectedDay === 'day2'
    );

    selectedDayLabel.textContent =
        selectedDay === 'day1'
            ? '1日目（11月21日）を表示中'
            : '2日目（11月22日）を表示中';
}


// ========================================
// 日付を切り替える
// ========================================

async function switchDay(day) {
    if (day !== 'day1' && day !== 'day2') {
        return;
    }

    selectedDay = day;

    updateDayButtons();

    reservations = [];

    renderReservationOptions();
    renderParticipants();

    try {
        await loadReservations();

    } catch (error) {

        renderReservationOptions();

        showFeedback(
            document.getElementById('verifyFeedback'),
            error.message ||
                '予約一覧を取得できませんでした。',
            true
        );
    }
}


// ========================================
// 日付ボタン
// ========================================

day1Button.addEventListener(
    'click',
    () => switchDay('day1')
);

day2Button.addEventListener(
    'click',
    () => switchDay('day2')
);


// ========================================
// 本人確認
// ========================================

verifyForm.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        const feedback =
            document.getElementById(
                'verifyFeedback'
            );

        const button =
            verifyForm.querySelector('button');

        button.disabled = true;

        showFeedback(
            feedback,
            '予約を照合しています…',
            false
        );

        try {
            const response =
                await fetch('/api/reservations', {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',
                    },

                    body: JSON.stringify({
                        action: 'verify',

                        number:
                            verifyNumber.value,

                        name:
                            verifyName.value,
                    }),
                });

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            const reservation =
                reservations.find(
                    (item) =>
                        item.number ===
                        data.reservation.number
                );

            if (reservation) {
                reservation.verified = true;
            }

            renderParticipants();

            renderVerifiedReservation(
                data.reservation
            );

            showFeedback(
                feedback,
                '本人確認できました。確認状態を保存しました。',
                false
            );

        } catch (error) {

            showFeedback(
                feedback,
                error.message ||
                    '予約の照合に失敗しました。',
                true
            );

        } finally {
            button.disabled = false;
        }
    }
);


// ========================================
// 初期表示
// ========================================

updateDayButtons();

loadReservations().catch((error) => {

    renderReservationOptions();

    showFeedback(
        document.getElementById(
            'verifyFeedback'
        ),
        error.message ||
            '予約一覧を取得できませんでした。',
        true
    );
});