const verifyForm = document.getElementById('verifyForm');

function showFeedback(element, message, isError = true) {
    element.textContent = message;
    element.className = `feedback ${isError ? 'error' : 'success'}`;
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
                number: document.getElementById('verifyNumber').value,
                name: document.getElementById('verifyName').value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        showFeedback(feedback, `本人確認できました。参加枠：${data.reservation.slotId}`, false);
    } catch (error) {
        showFeedback(feedback, error.message || '予約の照合に失敗しました。', true);
    } finally {
        button.disabled = false;
    }
});