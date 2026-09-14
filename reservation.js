const slots = [
    { id: '10:00', label: '第1回　10:00〜' },
    { id: '11:00', label: '第2回　11:00〜' },
    { id: '13:00', label: '第3回　13:00〜' },
    { id: '14:00', label: '第4回　14:00〜' },
    { id: '15:00', label: '第5回　15:00〜' }
];
const capacity = 5;
const slotSelect = document.getElementById('slotId');
const reservationForm = document.getElementById('reservationForm');
const verifyForm = document.getElementById('verifyForm');

function showFeedback(element, message, isError = true) {
    element.textContent = message;
    element.className = `feedback ${isError ? 'error' : 'success'}`;
}

function renderSlots(counts = {}) {
    slotSelect.replaceChildren();
    slots.forEach((slot) => {
        const count = counts[slot.id] || 0;
        const option = document.createElement('option');
        option.value = slot.id;
        option.textContent = `${slot.label}　残り${Math.max(0, capacity - count)}組`;
        option.disabled = count >= capacity;
        slotSelect.appendChild(option);
    });
    if (![...slotSelect.options].some((option) => !option.disabled)) {
        slotSelect.disabled = true;
        showFeedback(document.getElementById('formFeedback'), '現在、すべての回が満席です。', true);
    }
}

async function loadSlots() {
    try {
        const response = await fetch('/api/reservations');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        renderSlots(data.counts);
    } catch (error) {
        renderSlots();
        showFeedback(document.getElementById('formFeedback'), error.message || '空き状況を取得できませんでした。', true);
    }
}

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('formFeedback');
    const button = reservationForm.querySelector('button');
    button.disabled = true;
    showFeedback(feedback, '予約を確認しています…', false);

    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slotId: slotSelect.value,
                name: document.getElementById('name').value,
                partnerName: document.getElementById('partnerName').value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        document.getElementById('reservationNumber').textContent = data.reservation.number;
        document.getElementById('numberPanel').hidden = false;
        reservationForm.reset();
        showFeedback(feedback, '予約が完了しました。整理番号を保存してください。', false);
        await loadSlots();
        document.getElementById('numberPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
        showFeedback(feedback, error.message || '予約に失敗しました。', true);
        await loadSlots();
    } finally {
        button.disabled = false;
    }
});

verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('verifyFeedback');
    const button = verifyForm.querySelector('button');
    button.disabled = true;
    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify',
                number: document.getElementById('verifyNumber').value,
                name: document.getElementById('verifyName').value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        showFeedback(feedback, `本人確認できました。参加枠：${data.reservation.slotId}`, false);
    } catch (error) {
        showFeedback(feedback, error.message || '本人確認に失敗しました。', true);
    } finally {
        button.disabled = false;
    }
});

loadSlots();
