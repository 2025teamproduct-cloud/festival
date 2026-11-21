// js/register-cloud.js
(() => {
  'use strict';

  const store = document.body.dataset.store;
  if (store !== 'asumin' && store !== 'yuna' && store !== 'runamaru') {
    throw new Error('店舗を特定できません。');
  }

  async function request(method, body) {
    const url = `/api/register?store=${encodeURIComponent(store)}`;
    const response = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify({ ...body, store }) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Firestoreとの通信に失敗しました。');
    }
    return data;
  }

  window.registerCloud = {
    store,
    load: () => request('GET'),
    write: (action, data = {}) => request('POST', { action, ...data }),
  };
})();
