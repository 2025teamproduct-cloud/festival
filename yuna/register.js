/* かんたんレジ - localStorage 版
   保存先: この端末・このブラウザ（同一オリジン）の localStorage
   ※ iPhoneでは「ホーム画面に追加」して使うと自動削除(ITP)の対象外になります */
(() => {
  'use strict';

  /* ---------- 保存層 ---------- */
  const KEY = {
    products: 'kr.products.v1',
    receipts: 'kr.receipts.v1',
    closing: 'kr.closing.v1',
    cart: 'kr.cart.v1'
  };
  const mem = {}; // localStorage が使えないときの退避（リロードで消える）

  function load(key, fallback) {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : fallback;
    } catch (e) {
      return key in mem ? mem[key] : fallback;
    }
  }
  function save(key, val) {
    mem[key] = val;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      toast('⚠ 保存できません（プライベートモード/容量不足の可能性）');
    }
  }

  // 消されにくくするようブラウザに要求（許可はブラウザ次第）
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) { /* 無視 */ }

  /* ---------- 状態 ---------- */
  let products = load(KEY.products, []);   // [{id,name,price}]
  let receipts = load(KEY.receipts, []);   // [{id,date,time,items:[{name,price,qty}]}]
  let closing = load(KEY.closing, {});     // {'YYYY-MM-DD':{float,actual}}
  let cart = load(KEY.cart, []);           // [{id,name,price,qty}]
  let editMode = false;
  let selDate = '';

  /* ---------- ユーティリティ ---------- */
  const $ = id => document.getElementById(id);
  const p2 = n => String(n).padStart(2, '0');
  const dstr = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const tstr = d => p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
  const yen = n => (n < 0 ? '-¥' : '¥') + Math.abs(n).toLocaleString('ja-JP');
  const num = v => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const clean = s => String(s).replace(/[\t\r\n]+/g, ' ').trim();

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'class') el.className = props[k];
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), props[k]);
        else el.setAttribute(k, props[k]);
      }
    }
    kids.flat().forEach(c => {
      if (c == null) return;
      el.append(c.nodeType ? c : document.createTextNode(c));
    });
    return el;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
  }

  const cartTotal = () => cart.reduce((s, c) => s + c.price * c.qty, 0);
  const receiptTotal = r => r.items.reduce((s, i) => s + i.price * i.qty, 0);

  /* ---------- タブ ---------- */
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
      const reg = b.dataset.tab === 'reg';
      $('v-reg').hidden = !reg;
      $('v-sales').hidden = reg;
      if (!reg) renderSales();
    });
  });

  /* ---------- 商品 ---------- */
  function renderTiles() {
    const box = $('tiles');
    box.classList.toggle('editing', editMode);
    $('addBox').hidden = !editMode && products.length > 0;
    $('editBtn').textContent = editMode ? '完了' : '削除編集';
    box.replaceChildren();
    if (!products.length) {
      box.append(h('p', { class: 'muted' }, '商品がありません。下のフォームから登録してください。'));
      return;
    }
    products.forEach(p => {
      box.append(h('button', {
        class: 'tile', type: 'button',
        onclick: () => {
          if (editMode) {
            if (confirm('「' + p.name + '」を商品一覧から削除しますか？\n（過去の売上は残ります）')) {
              products = products.filter(x => x.id !== p.id);
              save(KEY.products, products);
              renderTiles();
            }
          } else {
            addToCart(p);
          }
        }
      }, editMode ? h('span', { class: 'x' }, '×') : null,
        h('b', null, p.name),
        h('span', null, yen(p.price))));
    });
  }

  $('editBtn').addEventListener('click', () => { editMode = !editMode; renderTiles(); });

  $('addBtn').addEventListener('click', () => {
    const name = clean($('newName').value);
    const price = $('newPrice').value;
    if (!name) return toast('商品名を入力してください');
    if (price === '' || num(price) < 0) return toast('価格を入力してください');
    products.push({ id: uid(), name, price: num(price) });
    save(KEY.products, products);
    $('newName').value = '';
    $('newPrice').value = '';
    renderTiles();
    toast('登録しました');
  });

  /* ---------- カート ---------- */
  function addToCart(p) {
    const ex = cart.find(c => c.id === p.id);
    if (ex) ex.qty++;
    else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    save(KEY.cart, cart);
    renderCart();
  }

  function renderCart() {
    const box = $('cart');
    box.replaceChildren();
    if (!cart.length) box.append(h('p', { class: 'muted' }, '商品をタップして追加'));
    cart.forEach(c => {
      const chg = d => () => {
        c.qty += d;
        if (c.qty <= 0) cart = cart.filter(x => x !== c);
        save(KEY.cart, cart);
        renderCart();
      };
      box.append(h('div', { class: 'row' },
        h('span', { class: 'nm' }, c.name),
        h('span', { class: 'qty' },
          h('button', { class: 'sec', type: 'button', 'aria-label': '減らす', onclick: chg(-1) }, '−'),
          h('b', null, String(c.qty)),
          h('button', { class: 'sec', type: 'button', 'aria-label': '増やす', onclick: chg(1) }, '＋')),
        h('span', { class: 'sub' }, yen(c.price * c.qty))));
    });
    $('total').textContent = yen(cartTotal());
    renderChange();
  }

  function renderChange() {
    const paid = $('paid').value;
    const total = cartTotal();
    if (paid === '') {
      $('changeLabel').textContent = 'おつり';
      $('change').textContent = '—';
      return;
    }
    const d = num(paid) - total;
    $('changeLabel').textContent = d >= 0 ? 'おつり' : '不足';
    $('change').textContent = yen(Math.abs(d));
  }
  $('paid').addEventListener('input', renderChange);

  $('clearBtn').addEventListener('click', () => {
    if (cart.length && !confirm('カートを空にしますか？')) return;
    cart = [];
    save(KEY.cart, cart);
    $('paid').value = '';
    renderCart();
  });

  $('payBtn').addEventListener('click', () => {
    if (!cart.length) return toast('商品が選ばれていません');
    const total = cartTotal();
    const paid = $('paid').value;
    if (paid !== '' && num(paid) < total) return toast('お預りが不足しています');
    const now = new Date();
    receipts.push({
      id: uid(),
      date: dstr(now),
      time: tstr(now),
      items: cart.map(c => ({ name: c.name, price: c.price, qty: c.qty }))
    });
    save(KEY.receipts, receipts);
    const change = paid === '' ? null : num(paid) - total;
    cart = [];
    save(KEY.cart, cart);
    $('paid').value = '';
    renderCart();
    toast(change === null ? '会計しました ' + yen(total) : '会計しました　おつり ' + yen(change));
  });

  /* ---------- 売上 ---------- */
  const dayReceipts = () => receipts.filter(r => r.date === selDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  function renderSales() {
    if (!selDate) selDate = dstr(new Date());
    $('date').value = selDate;

    // 日付チップ（売上のある日）
    const dates = [...new Set(receipts.map(r => r.date))].sort().reverse().slice(0, 14);
    const chips = $('chips');
    chips.replaceChildren();
    dates.forEach(d => {
      const sum = receipts.filter(r => r.date === d).reduce((s, r) => s + receiptTotal(r), 0);
      chips.append(h('button', {
        class: 'chip' + (d === selDate ? ' on' : ''), type: 'button',
        onclick: () => { selDate = d; renderSales(); }
      }, d.slice(5).replace('-', '/') + ' ' + yen(sum)));
    });

    const list = dayReceipts();
    const total = list.reduce((s, r) => s + receiptTotal(r), 0);
    const count = list.reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty, 0), 0);

    // 統計
    const stat = (label, val) => h('div', { class: 'stat' }, h('small', null, label), h('b', null, val));
    $('stats').replaceChildren(
      stat('売上合計', yen(total)),
      stat('会計数', list.length + '件'),
      stat('販売点数', count + '点'),
      stat('客単価', list.length ? yen(Math.round(total / list.length)) : '—')
    );

    // レジ締め
    const cl = closing[selDate] || {};
    $('cFloat').value = cl.float ?? '';
    $('cActual').value = cl.actual ?? '';
    renderClosing();

    // 商品別
    const agg = {};
    list.forEach(r => r.items.forEach(i => {
      const k = i.name + '\t' + i.price;
      agg[k] = agg[k] || { name: i.name, price: i.price, qty: 0 };
      agg[k].qty += i.qty;
    }));
    const rows = Object.values(agg).sort((a, b) => b.price * b.qty - a.price * a.qty);
    $('byItem').replaceChildren(rows.length
      ? h('table', null,
        h('thead', null, h('tr', null, ...['商品', '単価', '数量', '小計'].map(t => h('th', null, t)))),
        h('tbody', null, rows.map(r => h('tr', null,
          h('td', null, r.name), h('td', { class: 'r' }, yen(r.price)),
          h('td', { class: 'r' }, String(r.qty)), h('td', { class: 'r' }, yen(r.price * r.qty))))))
      : h('p', { class: 'muted' }, 'この日の売上はありません'));

    // 会計一覧
    const rc = $('receipts');
    rc.replaceChildren();
    if (!list.length) rc.append(h('p', { class: 'muted' }, 'この日の会計はありません'));
    list.slice().reverse().forEach(r => {
      rc.append(h('div', { class: 'row' },
        h('div', null,
          h('b', null, r.time.slice(0, 5) + '　' + yen(receiptTotal(r))),
          h('div', { class: 'muted' }, r.items.map(i => i.name + '×' + i.qty).join('、'))),
        h('button', {
          class: 'sec dg', type: 'button',
          onclick: () => {
            if (confirm(r.time.slice(0, 5) + ' の会計（' + yen(receiptTotal(r)) + '）を削除しますか？')) {
              receipts = receipts.filter(x => x.id !== r.id);
              save(KEY.receipts, receipts);
              renderSales();
            }
          }
        }, '削除')));
    });

    $('raw').value = buildRaw();
  }

  function renderClosing() {
    const total = dayReceipts().reduce((s, r) => s + receiptTotal(r), 0);
    const theo = num($('cFloat').value) + total;
    $('cTheo').textContent = yen(theo);
    const actual = $('cActual').value;
    const d = $('cDiff');
    d.classList.remove('pos', 'neg');
    if (actual === '') { d.textContent = '—'; return; }
    const diff = num(actual) - theo;
    d.textContent = (diff > 0 ? '+' : '') + yen(diff);
    if (diff > 0) d.classList.add('pos');
    if (diff < 0) d.classList.add('neg');
  }
  $('cFloat').addEventListener('input', renderClosing);
  $('cActual').addEventListener('input', renderClosing);

  $('cSave').addEventListener('click', () => {
    closing[selDate] = { float: $('cFloat').value, actual: $('cActual').value };
    save(KEY.closing, closing);
    toast('締めを保存しました。下のテキストもバックアップ推奨です');
  });

  $('date').addEventListener('change', e => { if (e.target.value) { selDate = e.target.value; renderSales(); } });
  $('todayBtn').addEventListener('click', () => { selDate = dstr(new Date()); renderSales(); });

  /* ---------- 保存テキスト（バックアップ/復元） ---------- */
  function buildRaw() {
    const lines = [];
    receipts.slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .forEach(r => r.items.forEach(i =>
        lines.push([r.date, r.time, r.id, i.name, i.price, i.qty, i.price * i.qty].join('\t'))));
    return lines.join('\n');
  }

  function parseRaw(text) {
    const map = new Map();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    for (let n = 0; n < lines.length; n++) {
      const c = lines[n].split('\t');
      if (c.length < 6 || !/^\d{4}-\d{2}-\d{2}$/.test(c[0]) || isNaN(+c[4]) || isNaN(+c[5])) {
        throw new Error((n + 1) + '行目の形式が正しくありません');
      }
      const id = c[2];
      if (!map.has(id)) map.set(id, { id, date: c[0], time: c[1], items: [] });
      map.get(id).items.push({ name: c[3], price: +c[4], qty: +c[5] });
    }
    return [...map.values()];
  }

  $('copyBtn').addEventListener('click', async () => {
    const t = $('raw').value;
    try {
      await navigator.clipboard.writeText(t);
      toast('コピーしました');
    } catch (e) {
      $('raw').select();
      document.execCommand && document.execCommand('copy');
      toast('コピーしました');
    }
  });

  $('saveBtn').addEventListener('click', () => {
    let parsed;
    try {
      parsed = parseRaw($('raw').value);
    } catch (e) {
      return toast(e.message);
    }
    if (!confirm('全期間の売上を、このテキストの内容（' + parsed.length + '件の会計）で置き換えます。よろしいですか？')) return;
    receipts = parsed;
    save(KEY.receipts, receipts);
    renderSales();
    toast('保存しました');
  });

  /* ---------- 全データ削除 ---------- */
  $('wipeBtn').addEventListener('click', () => {
    if (!confirm('保存されている全データ（商品・売上・レジ締め）を完全に削除します。\n元に戻せません。\n\n事前に「保存テキスト」をコピーして控えましたか？\n続行しますか？')) return;
    const v = prompt('本当に削除する場合は学籍番号を入力してください');
    if (v === null || v.normalize('NFKC').trim().toLowerCase() !== '2502CO0011') return toast('キャンセルしました');
    // このアプリのキー(kr.*)だけを消す。同じオリジンの他のデータには触れない
    Object.values(KEY).forEach(k => {
      delete mem[k];
      try { localStorage.removeItem(k); } catch (e) { /* 無視 */ }
    });
    products = [];
    receipts = [];
    closing = {};
    cart = [];
    editMode = false;
    $('paid').value = '';
    renderTiles();
    renderCart();
    renderSales();
    toast('全データを削除しました');
  });

  /* ---------- 起動 ---------- */
  selDate = dstr(new Date());
  renderTiles();
  renderCart();
})();