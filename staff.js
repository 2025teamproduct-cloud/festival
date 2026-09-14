const verifyForm = document.getElementById('verifyForm');
const verifyNumber = document.getElementById('verifyNumber');
const verifyName = document.getElementById('verifyName');
const participantList = document.getElementById('participantList');
const verifiedReservation = document.getElementById('verifiedReservation');
let reservations = [];

function showFeedback(element, message, isError = true) {
    element.textContent = message;
    element.className = `feedback ${isError ? 'error' : 'success'}`;
}

function sortReservations(first, second) {
    return first.number.localeCompare(second.number, undefined, { numeric: true });
}

function renderReservationOptions() {
    verifyNumber.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '整理番号を選択してください';
    placeholder.disabled = true;
    placeholder.selected = true;
    verifyNumber.appendChild(placeholder);
    reservations.sort(sortReservations).forEach((reservation) => {
        const option = document.createElement('option');
        option.value = reservation.number;
        option.textContent = reservation.number;
        verifyNumber.appendChild(option);
    });
    verifyNumber.disabled = reservations.length === 0;
}

function renderVerifiedReservation(reservation) {
    verifiedReservation.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = '本人確認済み';
    const names = document.createElement('p');
    names.textContent = `代表者：${reservation.name}　同行者：${reservation.partnerName}`;
    const slot = document.createElement('p');
    slot.textContent = `参加枠：${reservation.slotId}`;
    verifiedReservation.append(heading, names, slot);
    verifiedReservation.hidden = false;
}

function renderParticipants() {
    participantList.replaceChildren();
    if (!reservations.length) {
        participantList.textContent = '予約はまだありません。';
        return;
    }
    const reservationsBySlot = reservations.reduce((groups, reservation) => {
        const group = groups.get(reservation.slotId) || [];
        group.push(reservation);
        groups.set(reservation.slotId, group);
        return groups;
    }, new Map());
    [...reservationsBySlot.entries()].sort(([first], [second]) => first.localeCompare(second)).forEach(([slotId, slotReservations]) => {
        const group = document.createElement('section');
        group.className = 'participant-group';
        const heading = document.createElement('h3');
        heading.textContent = slotId;
        const list = document.createElement('div');
        list.className = 'participant-items';
        slotReservations.sort(sortReservations).forEach((reservation) => {
            const label = document.createElement('label');
            label.className = 'participant-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = reservation.verified;
            checkbox.dataset.number = reservation.number;
            checkbox.addEventListener('change', () => updateVerification(reservation, checkbox));
            const names = document.createElement('span');
            names.textContent = `${reservation.number}　${reservation.name} / ${reservation.partnerName}`;
            label.append(checkbox, names);
            list.appendChild(label);
        });
        group.append(heading, list);
        participantList.appendChild(group);
    });
}

async function updateVerification(reservation, checkbox) {
    checkbox.disabled = true;
    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'setVerified', number: reservation.number, verified: checkbox.checked })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        reservation.verified = data.verified;
    } catch (error) {
        checkbox.checked = reservation.verified;
        showFeedback(document.getElementById('verifyFeedback'), error.message || '確認状態を保存できませんでした。', true);
    } finally {
        checkbox.disabled = false;
    }
}

async function loadReservations() {
    const response = await fetch('/api/reservations?view=staff');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    reservations = data.reservations || [];
    renderReservationOptions();
    renderParticipants();
}

verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('verifyFeedback');
    const button = verifyForm.querySelector('button');
    button.disabled = true;
    showFeedback(feedback, '予約を照合しています…', false);

    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify',
                number: verifyNumber.value,
                name: verifyName.value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        const reservation = reservations.find((item) => item.number === data.reservation.number);
        if (reservation) reservation.verified = true;
        renderParticipants();
        renderVerifiedReservation(data.reservation);
        showFeedback(feedback, '本人確認できました。確認状態を保存しました。', false);
    } catch (error) {
        showFeedback(feedback, error.message || '予約の照合に失敗しました。', true);
    } finally {
        button.disabled = false;
    }
});

loadReservations().catch((error) => {
    renderReservationOptions();
    showFeedback(document.getElementById('verifyFeedback'), error.message || '予約一覧を取得できませんでした。', true);
});