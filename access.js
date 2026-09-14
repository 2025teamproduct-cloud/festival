const ADMIN_PASSWORD = 'festival-admin-2026';
const ACCESS_KEY = 'festival-admin-access';

function hasAdminAccess() {
    return sessionStorage.getItem(ACCESS_KEY) === 'granted';
}

function requireAdminAccess(event) {
    event.preventDefault();
    if (hasAdminAccess()) {
        window.location.href = event.currentTarget.href;
        return;
    }

    const password = window.prompt('管理者パスワードを入力してください');
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(ACCESS_KEY, 'granted');
        window.location.href = event.currentTarget.href;
    } else if (password !== null) {
        window.alert('パスワードが違います。');
    }
}

document.querySelectorAll('[data-admin-link]').forEach((link) => {
    link.addEventListener('click', requireAdminAccess);
});

if (document.querySelector('[data-admin-page]') && !hasAdminAccess()) {
    const password = window.prompt('管理者パスワードを入力してください');
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(ACCESS_KEY, 'granted');
    } else {
        if (password !== null) {
            window.alert('パスワードが違います。');
        }
        document.body.innerHTML = '<main class="wrap"><section class="panel"><h1>アクセスできません</h1><p>管理者パスワードが必要です。</p></section></main>';
    }
}
