const KS = 'pos_sales_v1', KI = 'pos_items_v1', KC = 'pos_close_v1';
const $ = s => document.querySelector(s);
const yen = n => '¥' + Number(n).toLocaleString('ja-JP');
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + yen(Math.abs(n));
const cls = n => n > 0 ? 'pos' : n < 0 ? 'neg' : '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v } catch (e) { return d } };
const save = (k, v) => { try { localStorage.setItem(k, v) } catch (e) { toast('保存できませんでした') } };
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800) }

// ---- データ（すべてテキストで保持）----
let salesText = load(KS, '');
let closeText = load(KC, '');   // 日付\t開始金\t実際の現金
let itemsText = load(KI, 'コーヒー\t350\nカフェラテ\t420\n紅茶\t330\nサンドイッチ\t480\nケーキ\t450\nクッキー\t200');
const getItems = () => itemsText.split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return { n: p[0], p: +p[1] || 0 } });
const setItems = a => { itemsText = a.map(i => i.n + '\t' + i.p).join('\n'); save(KI, itemsText) };
const parseSales = () => salesText.split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return { d: p[0], t: p[1], id: p[2], n: p[3], p: +p[4], q: +p[5], s: +p[6] } }).filter(r => r.d && r.id && r.n && !isNaN(r.s));
const getClose = d => { const l = closeText.split('\n').find(x => x.split('\t')[0] === d); if (!l) return null; const p = l.split('\t'); return { f: p[1], a: p[2] } };
const setClose = (d, f, a) => { const ls = closeText.split('\n').filter(l => l && l.split('\t')[0] !== d); ls.push([d, f, a].join('\t')); closeText = ls.join('\n') + '\n'; save(KC, closeText) };

// ---- レジ ----
let cart = [], edit = false;
function renderTiles() {
    $('#tiles').innerHTML = getItems().map((it, i) => `<button class="tile" data-i="${i}"><b>${esc(it.n)}</b><span>${yen(it.p)}</span>${edit ? '<i class="x" data-del="' + i + '">×</i>' : ''}</button>`).join('') || '<span class="muted">商品がありません</span>';
}
$('#tiles').onclick = e => {
    const del = e.target.dataset.del;
    if (edit && del !== undefined) { const a = getItems(); a.splice(+del, 1); setItems(a); renderTiles(); return }
    const b = e.target.closest('.tile'); if (!b || edit) return;
    const it = getItems()[+b.dataset.i]; const f = cart.find(c => c.n === it.n && c.p === it.p);
    f ? f.q++ : cart.push({ n: it.n, p: it.p, q: 1 }); renderCart();
};
$('#editBtn').onclick = () => { edit = !edit; $('#editBtn').textContent = edit ? '完了' : '削除編集'; renderTiles() };
$('#addBtn').onclick = () => {
    const n = $('#newName').value.replace(/[\t\n]/g, ' ').trim(), p = Math.max(0, parseInt($('#newPrice').value) || 0);
    if (!n) return toast('商品名を入力してください');
    const a = getItems(); a.push({ n, p }); setItems(a); $('#newName').value = ''; $('#newPrice').value = ''; renderTiles();
};
const sum = () => cart.reduce((s, c) => s + c.p * c.q, 0);
function renderCart() {
    $('#cart').innerHTML = cart.map((c, i) => `<div class="row"><div>${esc(c.n)}<div class="muted">${yen(c.p)}</div></div><div class="qty"><button data-m="${i}">−</button><b>${c.q}</b><button data-p="${i}">＋</button></div><b>${yen(c.p * c.q)}</b></div>`).join('') || '<p class="muted">商品を選んでください</p>';
    $('#total').textContent = yen(sum()); updChange();
}
$('#cart').onclick = e => {
    const m = e.target.dataset.m, p = e.target.dataset.p;
    if (m !== undefined) { if (--cart[+m].q <= 0) cart.splice(+m, 1) } else if (p !== undefined) cart[+p].q++; else return;
    renderCart();
};
// お預り − 合計 の差額（おつり／不足）
function updChange() {
    const v = $('#paid').value, d = +v - sum(), el = $('#change');
    $('#changeLabel').textContent = v !== '' && d < 0 ? '不足' : 'おつり';
    el.textContent = v === '' ? '—' : yen(Math.abs(d));
    el.className = v === '' ? '' : (d < 0 ? 'neg' : 'pos');
}
$('#paid').oninput = updChange;
$('#clearBtn').onclick = () => { cart = []; $('#paid').value = ''; renderCart() };
$('#payBtn').onclick = () => {
    if (!cart.length) return toast('商品がありません');
    const pv = $('#paid').value; if (pv !== '' && +pv < sum()) return toast('お預りが不足しています');
    const n = new Date(), d = today(), t = pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds());
    const id = n.getTime().toString(36);
    const lines = cart.map(c => [d, t, id, c.n, c.p, c.q, c.p * c.q].join('\t')).join('\n');
    salesText += (salesText && !salesText.endsWith('\n') ? '\n' : '') + lines + '\n'; save(KS, salesText);
    const tot = sum(); cart = []; $('#paid').value = ''; renderCart(); toast('会計完了 ' + yen(tot));
};

// ---- 売上（日付別）----
let sd = today(), dayTotal = 0;
function renderSales() {
    const recs = parseSales(), dates = [...new Set(recs.map(r => r.d))].sort().reverse();
    $('#date').value = sd;
    $('#chips').innerHTML = dates.slice(0, 14).map(d => `<button class="chip ${d === sd ? 'on' : ''}" data-d="${d}">${d}</button>`).join('') || '<span class="muted">売上データなし</span>';
    const day = recs.filter(r => r.d === sd), rc = new Map();
    day.forEach(r => { if (!rc.has(r.id)) rc.set(r.id, { id: r.id, t: r.t, rows: [], s: 0 }); const o = rc.get(r.id); o.rows.push(r); o.s += r.s });
    const total = day.reduce((s, r) => s + r.s, 0), qty = day.reduce((s, r) => s + r.q, 0), cnt = rc.size;
    dayTotal = total;
    // 前回営業日との売上差額
    const prev = dates.find(d => d < sd);
    const pTotal = prev ? recs.filter(r => r.d === prev).reduce((s, r) => s + r.s, 0) : null;
    const dv = pTotal === null ? '<b>—</b><small>比較対象なし</small>' : `<b class="${cls(total - pTotal)}">${signed(total - pTotal)}</b><small>${prev} との差</small>`;
    $('#stats').innerHTML = `<div class="stat"><small>売上合計</small><b>${yen(total)}</b></div><div class="stat"><small>前回営業日比（差額）</small>${dv}</div><div class="stat"><small>会計数</small><b>${cnt}</b></div><div class="stat"><small>販売点数</small><b>${qty}</b></div><div class="stat"><small>客単価</small><b>${yen(cnt ? Math.round(total / cnt) : 0)}</b></div>`;
    const agg = {}; day.forEach(r => { const a = agg[r.n] || (agg[r.n] = { q: 0, s: 0 }); a.q += r.q; a.s += r.s });
    const ar = Object.entries(agg).sort((a, b) => b[1].s - a[1].s);
    $('#byItem').innerHTML = ar.length ? `<table><tr><th>商品</th><th>数量</th><th>金額</th></tr>${ar.map(([n, a]) => `<tr><td>${esc(n)}</td><td>${a.q}</td><td>${yen(a.s)}</td></tr>`).join('')}</table>` : '<p class="muted">この日の売上はありません</p>';
    $('#receipts').innerHTML = [...rc.values()].sort((a, b) => b.t.localeCompare(a.t)).map(o => `<div class="row"><div><b>${o.t}</b> <span class="muted">${o.rows.map(r => esc(r.n) + '×' + r.q).join('、')}</span></div><div style="white-space:nowrap"><b>${yen(o.s)}</b> <button class="sec dg" data-rm="${o.id}" style="padding:2px 8px">削除</button></div></div>`).join('') || '<p class="muted">—</p>';
    const c = getClose(sd); $('#cFloat').value = c ? c.f : ''; $('#cActual').value = c ? c.a : ''; updClose();
    $('#raw').value = salesText;
}
// レジ締め：実際の現金 − (開始金 + 売上合計)
function updClose() {
    const f = +$('#cFloat').value || 0, a = $('#cActual').value, theo = f + dayTotal, el = $('#cDiff');
    $('#cTheo').textContent = yen(theo);
    if (a === '') { el.textContent = '—'; el.className = ''; return }
    const d = +a - theo;
    el.textContent = signed(d) + (d > 0 ? '（過剰）' : d < 0 ? '（不足）' : '（一致）');
    el.className = cls(d);
}
$('#cFloat').oninput = $('#cActual').oninput = updClose;
$('#cSave').onclick = () => { setClose(sd, $('#cFloat').value, $('#cActual').value); toast(sd + ' の締めを保存しました') };
$('#date').onchange = e => { sd = e.target.value || today(); renderSales() };
$('#todayBtn').onclick = () => { sd = today(); renderSales() };
$('#chips').onclick = e => { if (e.target.dataset.d) { sd = e.target.dataset.d; renderSales() } };
$('#receipts').onclick = e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = '本当に削除'; setTimeout(() => { b.dataset.arm = ''; b.textContent = '削除' }, 2500); return }
    salesText = salesText.split('\n').filter(l => l && l.split('\t')[2] !== b.dataset.rm).join('\n') + '\n';
    save(KS, salesText); renderSales(); toast('削除しました');
};
$('#copyBtn').onclick = async () => {
    try { await navigator.clipboard.writeText($('#raw').value) } catch (e) { $('#raw').select(); document.execCommand('copy') }
    toast('コピーしました');
};
$('#saveBtn').onclick = () => {
    const ls = $('#raw').value.split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim());
    const bad = ls.findIndex(l => { const p = l.split('\t'); return p.length !== 7 || !/^\d{4}-\d{2}-\d{2}$/.test(p[0]) || p.slice(4).some(x => isNaN(+x) || x === '') });
    if (bad >= 0) return toast((bad + 1) + '行目の形式が正しくありません');
    salesText = ls.length ? ls.join('\n') + '\n' : ''; save(KS, salesText); renderSales(); toast('保存しました');
};

// ---- タブ ----
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
    $('#v-reg').hidden = b.dataset.tab !== 'reg'; $('#v-sales').hidden = b.dataset.tab !== 'sales';
    if (b.dataset.tab === 'sales') renderSales();
});
renderTiles(); renderCart();