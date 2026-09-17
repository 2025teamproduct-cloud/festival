//  /complete.js
const colors = ['#ff6f3c', '#ffb703', '#3c7bff', '#2e9e4f', '#ff3c8e'];
for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (3 + Math.random() * 3) + 's';
    c.style.animationDelay = (Math.random() * 3) + 's';
    document.body.appendChild(c);
}