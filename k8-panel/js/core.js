// ============================================================
// K8 Panel · núcleo: utilidades, store, tema, router, UI base
// ============================================================
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
const pad = n => String(n).padStart(2, '0');
const DAY = 86400000;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const parseDay = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtInt = n => Number(n || 0).toLocaleString('es-CL');
const fmtMoney = n => n == null ? '—' : '$' + Math.round(n).toLocaleString('es-CL');
const fmtShort = n => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString('es-CL') + ' mil';
  return fmtMoney(n);
};
const fmtDate = s => { const d = typeof s === 'string' ? parseDay(s) : s; return d ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '—'; };
const fmtDateLong = s => { const d = typeof s === 'string' ? parseDay(s) : s; return d ? d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'; };
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / DAY);
const dueLabel = iso => {
  if (!iso) return { text: 'Sin fecha', late: false };
  const n = daysBetween(todayIso(), iso);
  if (n < 0) return { text: `Venció hace ${-n} d`, late: true };
  if (n === 0) return { text: 'Vence hoy', late: false, today: true };
  return { text: `Vence en ${n} d`, late: false };
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const PERSON_COLORS = ['#7C5CFF', '#E5677A', '#22A06B', '#F2A51A', '#3B6EF5', '#14A3B8', '#B91C1C', '#DB2777'];
// Color por persona: el definido en PEOPLE (data.js); si no existe, uno estable según el nombre.
const personColor = name => { const p = (typeof PEOPLE_ALL !== 'undefined' ? PEOPLE_ALL : (typeof PEOPLE !== 'undefined' ? PEOPLE : [])).find(x => x.name === name || x.id === name || x.short === name); if (p && p.color) return p.color; let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PERSON_COLORS[h % PERSON_COLORS.length]; };
const avatar = (name, cls = '') => `<span class="av ${cls}" style="--pc:${personColor(name)};background:var(--pc)" title="${esc(name)}">${initials(name)}</span>`;
// Los cuadros cuyo encabezado tiene color (cardHead con color) reciben ese color como variable para teñirse en modo oscuro.
const decorateCards = root => $$('.card-head[style*="--c"]', root).forEach(h => { const card = h.closest('.card'); if (card && !card.classList.contains('fill')) { card.style.setProperty('--c', h.style.getPropertyValue('--c')); card.classList.add('tinted'); } });
const avStack = names => `<span class="av-stack">${names.map(n => avatar(n)).join('')}</span>`;
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;

// ---------- Iconos (línea, 24px) ----------
const I = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  home: d => I('<path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>', d),
  spark: d => I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/>', d),
  tasks: d => I('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>', d),
  cal: d => I('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', d),
  chart: d => I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', d),
  mega: d => I('<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>', d),
  shirt: d => I('<path d="M8 4l4 2 4-2 5 3-2 4-2-1v11H7V10l-2 1-2-4z"/>', d),
  box: d => I('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', d),
  layers: d => I('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/>', d),
  doc: d => I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', d),
  folder: d => I('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', d),
  book: d => I('<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>', d),
  gantt: d => I('<path d="M4 6h9M8 12h10M6 18h7"/>', d),
  clock: d => I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', d),
  search: d => I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', d),
  sun: d => I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', d),
  moon: d => I('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', d),
  bell: d => I('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', d),
  plus: d => I('<path d="M12 5v14M5 12h14"/>', d),
  x: d => I('<path d="M6 6l12 12M18 6L6 18"/>', d),
  chevR: d => I('<path d="M9 6l6 6-6 6"/>', d),
  chevL: d => I('<path d="M15 6l-6 6 6 6"/>', d),
  chevD: d => I('<path d="M6 9l6 6 6-6"/>', d),
  arrow: d => I('<path d="M7 17L17 7M8 7h9v9"/>', d),
  pdf: d => I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 16h1.5a1.5 1.5 0 0 0 0-3H8v5M13 13v5h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2z"/>', d),
  download: d => I('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', d),
  upload: d => I('<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', d),
  mail: d => I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', d),
  check: d => I('<path d="M5 12l5 5L20 7"/>', d),
  alert: d => I('<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 18h.01"/>', d),
  users: d => I('<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 6 5"/>', d),
  target: d => I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', d),
  trend: d => I('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>', d),
  msg: d => I('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/>', d),
  eye: d => I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', d),
  pin: d => I('<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', d),
  edit: d => I('<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M12.5 7.5l4 4"/>', d),
  trash: d => I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', d),
  play: d => I('<path d="M7 5v14l11-7z"/>', d),
  pause: d => I('<path d="M8 5v14M16 5v14"/>', d),
  paper: d => I('<path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>', d),
  link: d => I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', d),
  grid: d => I('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>', d),
  flag: d => I('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', d),
  zap: d => I('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', d),
  money: d => I('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>', d),
  image: d => I('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>', d),
  menu: d => I('<path d="M4 7h16M4 12h16M4 17h16"/>', d),
  dots: d => I('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>', d),
  print: d => I('<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>', d),
  gear: d => I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', d),
  logout: d => I('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', d),
};

// Páginas registradas por módulo: PAGES[app] = route => ({ title, html, mount })
const PAGES = {};

// ---------- Store ----------
// Capa de datos. Hoy: localStorage. Para conectar a un servidor, reemplazar
// Store.read / Store.write por llamadas a la API y mantener la misma firma.
const Store = {
  prefix: 'k8panel:',
  read(key, fallback) {
    try { const v = localStorage.getItem(this.prefix + key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); } catch { /* sin storage */ }
  },
  /** Colección: lista de objetos con id. */
  list(key) { return this.read(key, []); },
  upsert(key, row) {
    const rows = this.list(key); const i = rows.findIndex(r => r.id === row.id);
    if (i >= 0) rows[i] = { ...rows[i], ...row }; else rows.push(row);
    this.write(key, rows); return row;
  },
  remove(key, id) { this.write(key, this.list(key).filter(r => r.id !== id)); },
};

// Marcadores de conexión pendiente (lo rellena el informático).
const CONN = {
  meta: false,      // Meta Ads API
  google: false,    // Google Ads API
  manager: false,   // Manager (stock / ventas reales)
  server: false,    // Base de datos compartida
};
const pendingChip = (txt = 'Pendiente de conexión') => `<span class="chip pending" title="Este dato se completará cuando se conecte la fuente">${txt}</span>`;
const pendingVal = (v, conn) => conn ? v : '<span class="faint">—</span>';

// ---------- Tema ----------
// Piel activa. 'noche' = siempre oscuro (css/skin-noche.css); '' = claro/oscuro con boton de tema como antes.
const SKIN = 'noche';
const Theme = {
  get() { if (SKIN === 'noche') return 'dark'; return localStorage.getItem('k8panel:theme') || 'auto'; },
  apply(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  },
  isDark() {
    const t = this.get();
    return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  },
  toggle() {
    const next = this.isDark() ? 'light' : 'dark';
    localStorage.setItem('k8panel:theme', next); this.apply(next); render();
  },
};
Theme.apply(Theme.get());

// ---------- Router ----------
// Rutas: #/app/seccion/sub   (ej. #/marketing/ventas/campanas)
const Router = {
  parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [app = 'inicio', sec = '', sub = '', ...rest] = h.split('/').map(decodeURIComponent);
    return { app, sec, sub, rest };
  },
  go(path) { location.hash = '#/' + path.replace(/^\/+/, ''); },
};
window.addEventListener('hashchange', () => render());

// ---------- UI base: modal, toast ----------
function openModal(html, { narrow = false, wide = false, onMount } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal ${narrow ? 'narrow' : ''} ${wide ? 'wide' : ''}">${html}</div></div>`;
  $('.overlay', root).onclick = e => { if (e.target.classList.contains('overlay')) closeModal(); };
  $$('[data-close]', root).forEach(b => b.onclick = closeModal);
  onMount && onMount($('.modal', root));
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function modalHtml(title, body, foot = '') {
  return `<div class="modal-head"><h2>${title}</h2><span class="spacer"></span><button class="icon-btn sm" data-close>${ICON.x()}</button></div>
  <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
}
function toast(msg, err = false) {
  const root = $('#toast-root'); const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : ''); el.textContent = msg; root.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function confirmBox(msg, onYes) {
  openModal(modalHtml('Confirmar', `<p>${msg}</p>`, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cf-yes">Sí, continuar</button>`), { narrow: true, onMount: m => { $('#cf-yes', m).onclick = () => { closeModal(); onYes(); }; } });
}
/** "Informe PDF": imprime solo la sección actual con los estilos de impresión. */
function printSection(title) {
  document.title = `K8 · ${title}`;
  window.print();
}

// ---------- Componentes de texto ----------
const kpi = (lbl, val, sub = '', extra = '') => `<div class="card kpi">${extra}<div class="lbl">${lbl}</div><div class="val num">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const cardHead = (icon, title, sub = '', go = '', color = '') => `<div class="card-head" ${color ? `style="--c:${color}"` : ''}><span class="ic">${icon}</span><div><h3>${title}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${go ? `<button class="icon-btn sm go" data-go="${go}" title="Abrir">${ICON.arrow(14)}</button>` : ''}</div>`;
const chip = (txt, color, cls = 'c') => `<span class="chip ${cls}" style="--c:${color}"><i></i>${txt}</span>`;
const bar = (p, color = '') => `<div class="bar" ${color ? `style="--c:${color}"` : ''}><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
const empty = (t, s = '') => `<div class="empty"><b>${t}</b>${s}</div>`;

// Gauge semicircular (0-100)
function gaugeSvg(p, color) {
  const ticks = 28; let out = '';
  for (let i = 0; i < ticks; i++) {
    const a = Math.PI - (i / (ticks - 1)) * Math.PI;
    const r1 = 58, r2 = 74, cx = 80, cy = 80;
    const x1 = cx + r1 * Math.cos(a), y1 = cy - r1 * Math.sin(a), x2 = cx + r2 * Math.cos(a), y2 = cy - r2 * Math.sin(a);
    const on = i / (ticks - 1) * 100 <= p;
    const col = on ? (i < ticks * .33 ? 'var(--danger)' : i < ticks * .66 ? 'var(--warn)' : (color || 'var(--ok)')) : 'var(--line)';
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `<div class="gauge"><svg viewBox="0 0 160 90" width="160" height="90">${out}</svg><div class="v num">${p}%</div></div>`;
}

// ---------- Archivos (PDF, imágenes) guardados en el navegador ----------
// IndexedDB aguanta archivos grandes (localStorage no). Cuando exista servidor de archivos,
// reemplazar put/get/del por subida y descarga HTTP manteniendo las mismas claves.
const FileStore = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      if (this.db) return res(this.db);
      const r = indexedDB.open('k8panel-files', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('files', mode); const req = fn(t.objectStore('files')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); }); },
  put(key, blob) { return this.tx('readwrite', s => s.put(blob, key)); },
  get(key) { return this.tx('readonly', s => s.get(key)); },
  del(key) { return this.tx('readwrite', s => s.delete(key)); },
};
async function previewFile(key, name = 'Archivo') {
  let blob = null; try { blob = await FileStore.get(key); } catch (e) { /* sin IndexedDB */ }
  if (!blob) return toast('El archivo no está guardado en este navegador', true);
  const url = URL.createObjectURL(blob);
  const isPdf = blob.type === 'application/pdf' || /\.pdf$/i.test(name);
  const isImg = blob.type.startsWith('image/');
  openModal(modalHtml(esc(name), isPdf ? `<iframe src="${url}#toolbar=1" style="width:100%;height:74vh;border:0;border-radius:12px;background:#525659"></iframe>`
    : isImg ? `<img src="${url}" alt="" style="max-width:100%;max-height:74vh;display:block;margin:0 auto;border-radius:12px">`
    : `<div class="empty"><b>Sin vista previa</b>Este tipo de archivo (${esc(blob.type || 'desconocido')}) no se puede mostrar aquí. Descárgalo para abrirlo.</div>`,
    `<a class="btn" href="${url}" download="${esc(name)}">${ICON.download(14)} Descargar</a><button class="btn primary" data-close>Cerrar</button>`), { wide: true });
}
async function downloadStoredFile(key, name = 'archivo') {
  let blob = null; try { blob = await FileStore.get(key); } catch (e) { /* sin IndexedDB */ }
  if (!blob) return toast('El archivo no está guardado en este navegador', true);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
