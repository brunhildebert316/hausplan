// ====== Einstellungen ======
// Normalerweise wird alles automatisch erkannt (benutzername.github.io/repo-name).
// Nur falls es nicht klappt (z. B. eigene Domain), hier eintragen:
const CONFIG = { owner: '', repo: '', file: 'data.json' };
// ===========================

const owner = CONFIG.owner || location.hostname.split('.')[0];
const repo = CONFIG.repo || (location.pathname.split('/')[1] || location.hostname);
const API = `https://api.github.com/repos/${owner}/${repo}/contents/${CONFIG.file}`;
const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

let data = { meals: {}, news: [], rules: [], sections: [] };
let token = localStorage.getItem('hausToken') || '';
let admin = false;
let dirty = false;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);

const svg = p => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON_LOCK = svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>');
const ICON_UNLOCK = svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>');
const ICON_TRASH = svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>');

function toast(msg, ms = 2500) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), ms);
}

function setDirty(v) { dirty = v; $('saveBar').hidden = !(admin && v); }

// ---------- Laden ----------
async function load() {
  try {
    const headers = { Accept: 'application/vnd.github.raw+json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await fetch(API, { headers, cache: 'no-store' });
    if (!r.ok) throw new Error('api');
    data = await r.json();
  } catch {
    try {
      const r = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
      data = await r.json();
    } catch { toast('Daten konnten nicht geladen werden'); }
  }
  data.meals ||= {}; data.news ||= []; data.rules ||= []; data.sections ||= [];
}

// ---------- Speichern (schreibt data.json ins GitHub-Repo) ----------
function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s);
}

async function save() {
  const btn = $('saveBtn');
  btn.disabled = true; btn.textContent = 'Speichere …';
  try {
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    const cur = await fetch(API, { headers, cache: 'no-store' });
    if (!cur.ok) throw new Error('Datei nicht gefunden');
    const { sha } = await cur.json();
    const res = await fetch(API, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Update über die Webseite',
        content: toB64(JSON.stringify(data, null, 2)),
        sha
      })
    });
    if (!res.ok) throw new Error('Speichern fehlgeschlagen (' + res.status + ')');
    setDirty(false);
    toast('Gespeichert');
  } catch (e) {
    toast(e.message, 4000);
  } finally {
    btn.disabled = false; btn.textContent = 'Speichern';
  }
}

// ---------- Anmeldung ----------
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

// Entschlüsselt den GitHub-Token mit dem Passwort
async function unlock(password) {
  if (typeof LOCKED === 'undefined' || !LOCKED) throw new Error('not-setup');
  const { s, i, c } = JSON.parse(atob(LOCKED));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64d(s), iterations: 250000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(i) }, key, b64d(c));
  return new TextDecoder().decode(plain);
}

async function verifyToken(t) {
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }
    });
    if (!r.ok) return false;
    const j = await r.json();
    return !!(j.permissions && j.permissions.push);
  } catch { return false; }
}

function setAdmin(v) {
  admin = v;
  $('loginBtn').innerHTML = v ? ICON_UNLOCK : ICON_LOCK;
  $('loginBtn').setAttribute('aria-label', v ? 'Abmelden' : 'Anmelden');
  $('fabWrap').hidden = !v;
  if (!v) { $('fabMenu').hidden = true; $('fab').classList.remove('open'); }
  setDirty(false);
  render();
}

// ---------- Darstellung ----------
function rulesHTML() {
  if (!data.rules.length) return '';
  const items = data.rules.map((r, i) => admin
    ? `<li><input data-list="rules" data-i="${i}" data-f="text" value="${esc(r.text)}">
         <button class="del" data-del="rules" data-i="${i}" aria-label="Löschen">${ICON_TRASH}</button></li>`
    : `<li>${esc(r.text)}</li>`).join('');
  return `<section class="rules"><h2>Befehle</h2><div class="card"><ul>${items}</ul></div></section>`;
}

function newsHTML() {
  if (!data.news.length) return '';
  const items = data.news.map((n, i) => admin
    ? `<div class="card">
         <div class="card-head"><input data-list="news" data-i="${i}" data-f="title" value="${esc(n.title)}" placeholder="Titel">
         <button class="del" data-del="news" data-i="${i}" aria-label="Löschen">${ICON_TRASH}</button></div>
         <textarea data-list="news" data-i="${i}" data-f="text" placeholder="Text">${esc(n.text)}</textarea>
       </div>`
    : `<div class="card"><h3>${esc(n.title)}</h3><div class="date">${esc(n.date || '')}</div><p>${esc(n.text)}</p></div>`
  ).join('');
  return `<section><h2>Neuigkeiten</h2>${items}</section>`;
}

function mealsHTML() {
  const today = (new Date().getDay() + 6) % 7;
  const items = DAYS.map((d, i) => `
    <div class="meal${i === today ? ' today' : ''}">
      <span class="day">${d}</span>
      ${admin
        ? `<input data-list="meals" data-f="${d}" value="${esc(data.meals[d])}">`
        : `<span class="dish">${esc(data.meals[d]) || '–'}</span>`}
    </div>`).join('');
  return `<section><h2>Essensplan</h2><div class="meals">${items}</div></section>`;
}

function sectionsHTML() {
  return data.sections.map((s, i) => admin
    ? `<section><div class="card">
         <div class="card-head"><input data-list="sections" data-i="${i}" data-f="title" value="${esc(s.title)}" placeholder="Titel">
         <button class="del" data-del="sections" data-i="${i}" aria-label="Löschen">${ICON_TRASH}</button></div>
         <textarea data-list="sections" data-i="${i}" data-f="content" placeholder="Inhalt">${esc(s.content)}</textarea>
       </div></section>`
    : `<section><h2>${esc(s.title)}</h2><div class="card"><p>${esc(s.content)}</p></div></section>`
  ).join('');
}

function render() {
  $('app').innerHTML = rulesHTML() + newsHTML() + mealsHTML() + sectionsHTML();
}

// ---------- Events ----------
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset.list) return;
  const { list, i, f } = el.dataset;
  if (list === 'meals') data.meals[f] = el.value;
  else data[list][+i][f] = el.value;
  setDirty(true);
});

document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) {
    const kind = add.dataset.add;
    if (kind === 'plan') data.sections.push({ id: uid(), title: 'Neuer Plan', content: '' });
    if (kind === 'news') data.news.unshift({ id: uid(), title: 'Neuigkeit', text: '', date: new Date().toLocaleDateString('de-AT') });
    if (kind === 'rule') data.rules.push({ id: uid(), text: '' });
    $('fabMenu').hidden = true; $('fab').classList.remove('open');
    setDirty(true); render();
    const list = { plan: 'sections', news: 'news', rule: 'rules' }[kind];
    const inputs = document.querySelectorAll('#app input[data-list="' + list + '"]');
    const target = kind === 'news' ? inputs[0] : inputs[inputs.length - 1];
    if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.focus(); target.select(); }
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!confirm('Löschen?')) return;
    data[del.dataset.del].splice(+del.dataset.i, 1);
    setDirty(true); render();
  }
});

$('fab').addEventListener('click', () => {
  const open = $('fabMenu').hidden;
  $('fabMenu').hidden = !open;
  $('fab').classList.toggle('open', open);
});

$('saveBtn').addEventListener('click', save);

$('loginBtn').addEventListener('click', () => {
  if (admin) {
    if (dirty && !confirm('Ungespeicherte Änderungen gehen verloren. Abmelden?')) return;
    localStorage.removeItem('hausToken'); token = '';
    load().then(() => setAdmin(false));
  } else {
    $('tokenInput').value = '';
    $('loginDlg').showModal();
  }
});

// Klick neben das Fenster schließt es
$('loginDlg').addEventListener('click', e => { if (e.target === $('loginDlg')) $('loginDlg').close(); });

$('loginForm').addEventListener('submit', async e => {
  const pw = $('tokenInput').value;
  if (!pw) return;
  e.preventDefault();
  toast('Prüfe …');
  let t;
  try {
    t = await unlock(pw);
  } catch (err) {
    toast(err.message === 'not-setup' ? 'Noch nicht eingerichtet (setup.html)' : 'Falsches Passwort', 4000);
    return;
  }
  if (await verifyToken(t)) {
    token = t; localStorage.setItem('hausToken', t);
    $('loginDlg').close();
    await load();
    setAdmin(true);
    toast('Angemeldet');
  } else {
    toast('Zugang ungültig oder abgelaufen', 4000);
  }
});

window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

// ---------- Start ----------
(async function init() {
  await load();
  if (token && await verifyToken(token)) setAdmin(true);
  else { token = ''; localStorage.removeItem('hausToken'); setAdmin(false); }
})();
