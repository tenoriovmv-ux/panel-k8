/* K8 Chile · Módulo de Reposiciones y Estados */
(() => {
'use strict';

// ============================================================
// Constantes
// ============================================================
const CFG = window.K8_CONFIG || {};
const PEOPLE = CFG.responsables || ['Vicente Tenorio', 'Tiare Sánchez', 'Baoxin Gong', 'Francisca Tolosa'];
const SAMPLE_DAYS = CFG.sampleDays || 10;
const DAY = 86400000;
const DAY_W = 28;
const LINES = ['Workwear', 'Clinic', 'Corporate', 'Outdoor', 'Global'];
const ROUNDS = ['Muestra 1', 'Muestra 2', 'Muestra 3', 'Muestra Final'];
const ORDER_STATUS = ['Enviado a gerencia', 'Aprobado', 'En producción', 'Recibido'];
// Versión del formato de datos guardados. 2 = se agregó la etapa Venta (6) y
// Reposición pasó a 7 y Descontinuado a 8. Ver migrate().
const SCHEMA = 2;
const SAMPLES_STAGE = 2, PRODUCTION = 3, ARRIVAL = 4, SALE = 6, DISC = 8;
const LAST_ACTIVE_STAGE = SALE; // en Venta el avance ya es 100 %

const STAGES = [
  { n: 0, name: 'Idea / Cotización',  short: 'Idea',        c: '#94A3B8' },
  { n: 1, name: 'Documentos',         short: 'Documentos',  c: '#4F7CFF' },
  { n: 2, name: 'Muestras',           short: 'Muestras',    c: '#9B6BFF' },
  { n: 3, name: 'Producción',         short: 'Producción',  c: '#FF8A3D' },
  { n: 4, name: 'Llegada',            short: 'Llegada',     c: '#22B8CF' },
  { n: 5, name: 'Control de calidad', short: 'Calidad',     c: '#F5B83D' },
  { n: 6, name: 'Venta',              short: 'Venta',       c: '#EC6FB0' },
  { n: 7, name: 'Reposición',         short: 'Reposición',  c: '#34C27A' },
  { n: 8, name: 'Descontinuado',      short: 'Descontinuado', c: '#6B7280' },
];

// Valores iniciales de la configuración (se editan en el botón Configuración).
const DEFAULT_STAGE_RESP = {
  0: ['Tiare Sánchez'], 1: ['Tiare Sánchez'], 2: ['Tiare Sánchez'],
  3: ['Baoxin Gong'], 4: ['Baoxin Gong'], 5: ['Tiare Sánchez'],
  6: ['Francisca Tolosa'], 7: ['Vicente Tenorio', 'Francisca Tolosa', 'Baoxin Gong'], 8: [],
};
const DEFAULT_LEAD = { pedido: 180, reposicion: 90 }; // días estimados desde el envío hasta la llegada
const PERSON_COLORS = ['#3B6EF5', '#E5677A', '#24A866', '#F29D12', '#8B5CF6', '#14A3B8'];

const ICON = {
  gantt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h9M8 12h10M6 18h7"/></svg>',
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  doc: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
  search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  eye: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  ban: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
  flask: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/></svg>',
  logout: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  gear: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  flag: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  box: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  bulb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>',
  analysis: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
};

// ============================================================
// Utilidades
// ============================================================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, '0');
const nowIso = () => new Date().toISOString();
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const stage = n => STAGES[n] || STAGES[0];
const fmtInt = n => Number(n || 0).toLocaleString('es-CL');

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
// 'YYYY-MM-DD' se interpreta como fecha local (no UTC) para no correr un día.
function parseDay(s) {
  if (!s) return null;
  if (s instanceof Date) return startOfDay(s);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const m2 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (m2) return new Date(+m2[3], +m2[2] - 1, +m2[1]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
const isoDay = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const fmtDay = d => { const x = parseDay(d); return x ? `${pad(x.getDate())}-${pad(x.getMonth() + 1)}-${x.getFullYear()}` : '—'; };
const fmtShort = d => { const x = parseDay(d); return x ? `${pad(x.getDate())}-${pad(x.getMonth() + 1)}` : '—'; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function personColor(name) {
  const i = PEOPLE.indexOf(name);
  if (i >= 0) return PERSON_COLORS[i % PERSON_COLORS.length];
  let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PERSON_COLORS[h % PERSON_COLORS.length];
}
function avatar(name, cls = '') {
  if (!name) return `<span class="av ${cls} empty">?</span>`;
  return `<span class="av ${cls}" style="background:${personColor(name)}" title="${esc(name)}">${esc(initials(name))}</span>`;
}
function peopleOptions(selected, emptyLabel = 'Sin asignar') {
  const list = PEOPLE.includes(selected) || !selected ? PEOPLE : [...PEOPLE, selected];
  return `<option value="">${esc(emptyLabel)}</option>` +
    list.map(p => `<option value="${esc(p)}"${p === selected ? ' selected' : ''}>${esc(p)}</option>`).join('');
}
function stageOptions(selected) {
  return STAGES.map(s => `<option value="${s.n}"${s.n === selected ? ' selected' : ''}>${s.n} · ${esc(s.name)}</option>`).join('');
}
function pillStyle(n) { const s = stage(n); return `background-color:${hexA(s.c, .16)};color:${shade(s.c)}`; }
function shade(hex) {
  // Versión más oscura del color de la etapa para texto legible sobre su tinte.
  // En modo oscuro (Panel K8) se aclara en vez de oscurecer, para que se lea sobre fondo negro.
  const n = parseInt(hex.slice(1), 16);
  const dark = document.body.classList.contains('dark');
  const f = dark ? v => Math.round(v + (255 - v) * .45) : v => Math.round(v * .62);
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

// Campos de fecha/mes: Chrome y Brave disparan "change" con cada dígito en cuanto la fecha
// es válida (al escribir el año, "0002" ya cuenta). Si guardamos y redibujamos ahí, el
// usuario pierde el campo. Por eso: al escribir con el teclado se guarda al salir del campo
// o con Enter; al elegir en el calendario (sin teclear) se guarda de inmediato.
function onDateCommit(inp, fn) {
  let last = inp.value, typing = false;
  const valid = () => !inp.value || +(inp.value.slice(0, 4)) >= 1990;
  const commit = () => {
    typing = false;
    if (inp.value === last) return;
    if (!valid()) { toast('Revisa el año de la fecha', true); inp.value = last; return; }
    last = inp.value;
    fn();
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); return; }
    if (e.key !== 'Tab') typing = true;
  });
  inp.addEventListener('change', () => { if (!typing) commit(); });
  // Se espera un instante para saber a qué campo pasó el usuario (Tab / clic) y devolverle el foco.
  inp.addEventListener('blur', () => setTimeout(commit, 0));
}

// Redibuja sin perder el campo donde el usuario está escribiendo.
function renderKeepFocus() {
  const a = document.activeElement;
  let sel = null;
  if (a && a.dataset) {
    if (a.dataset.cyc) sel = `[data-cyc="${a.dataset.cyc}"][data-f="${a.dataset.f}"]`;
    else if (a.dataset.evIdx != null) sel = `[data-ev-idx="${a.dataset.evIdx}"]`;
    else if (a.id) sel = '#' + a.id;
  }
  const dScroll = $('.d-body') ? $('.d-body').scrollTop : null;
  render();
  if (dScroll != null && $('.d-body')) $('.d-body').scrollTop = dScroll;
  const n = sel && $(sel);
  if (n) n.focus();
}

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), err ? 6000 : 3200);
}
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

// (23-11-2026) Modo lector del Panel K8: se puede mirar todo, pero no se guarda ningún cambio ni se suben archivos.
// Llega como ?lector=1 desde el panel (o se lee el rol guardado si se abre la app sola).
const LECTOR = (() => { try { return new URLSearchParams(location.search).get('lector') === '1' || localStorage.getItem('k8panel:rol') === 'lector'; } catch { return false; } })();
let BOOTED = false, lectAviso = 0;
const lectorAvisa = (m = 'Modo lector: puedes mirar todo, pero no hacer cambios') => { const n = Date.now(); if (n - lectAviso > 2500) { lectAviso = n; toast(m, true); } };
if (LECTOR) {
  document.documentElement.classList.add('lector');
  const clk = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () { if (this.type === 'file') return lectorAvisa('Modo lector: no se pueden subir archivos'); return clk.call(this); };
  document.addEventListener('drop', e => { e.preventDefault(); e.stopImmediatePropagation(); lectorAvisa('Modo lector: no se pueden subir archivos'); }, true);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('input[type=file], a[href^="mailto:"]')) { e.preventDefault(); lectorAvisa(); } }, true);
}

// ============================================================
// Almacenamiento: nube (Supabase) o local (navegador)
// ============================================================
const TABLES = ['products', 'events', 'samples', 'orders', 'files', 'settings', 'sales', 'projects', 'research', 'rproducts', 'rcards', 'salesreports'];

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('k8-reposiciones', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('files', mode);
    const req = fn(tx.objectStore('files'));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = () => rej(tx.error);
  });
}

const LocalStore = {
  mode: 'local',
  async init() { return true; },
  async all(t) { return lsGet('k8r_' + t, []); },
  async putMany(t, rows) {
    if (LECTOR) return;   // modo lector: nunca se escribe
    const a = lsGet('k8r_' + t, []);
    for (const row of rows) {
      const i = a.findIndex(r => r.id === row.id);
      if (i >= 0) a[i] = row; else a.push(row);
    }
    lsSet('k8r_' + t, a);
  },
  async del(t, id) { if (LECTOR) return; lsSet('k8r_' + t, lsGet('k8r_' + t, []).filter(r => r.id !== id)); },
  async putFile(path, blob) { if (LECTOR) return; await idbDo('readwrite', s => s.put(blob, path)); },
  async getFile(path) { return idbDo('readonly', s => s.get(path)); },
  async delFile(path) { await idbDo('readwrite', s => s.delete(path)); },
};

const CloudStore = {
  mode: 'cloud',
  sb: null,
  async init() {
    this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    const { data } = await this.sb.auth.getSession();
    return !!data.session;
  },
  async all(t) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from(t).select('*').range(from, from + 999);
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) return out;
    }
  },
  async putMany(t, rows) {
    if (!rows.length) return;
    const { error } = await this.sb.from(t).upsert(rows);
    if (error) throw error;
  },
  async del(t, id) {
    const { error } = await this.sb.from(t).delete().eq('id', id);
    if (error) throw error;
  },
  async putFile(path, blob) {
    const { error } = await this.sb.storage.from(CFG.bucket || 'k8-archivos')
      .upload(path, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
    if (error) throw error;
  },
  async getFile(path) {
    const { data, error } = await this.sb.storage.from(CFG.bucket || 'k8-archivos').download(path);
    if (error) throw error;
    return data;
  },
  async delFile(path) { await this.sb.storage.from(CFG.bucket || 'k8-archivos').remove([path]); },
};

const useCloud = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
const Store = useCloud ? CloudStore : LocalStore;

// ============================================================
// Estado
// ============================================================
const S = { products: [], events: [], samples: [], orders: [], files: [], settings: [], sales: [], projects: [], research: [], rproducts: [], rcards: [], salesreports: [] };
const UI = {
  tab: lsGet('k8r_ui_tab', 'gantt'),
  q: '',
  line: 'Todas',
  stage: '',
  person: '',
  collapsed: lsGet('k8r_ui_collapsed', {}),
  drawer: null,
  scrolledToToday: false,
  zoom: lsGet('k8r_ui_zoom', 'semana'),      // escala del Gantt: dia | semana | mes
  gFrom: lsGet('k8r_ui_gfrom', ''),          // filtro de meses del Gantt ('YYYY-MM')
  gTo: lsGet('k8r_ui_gto', ''),
  oMonth: '', oKind: '', oQ: '',             // filtros de Pedidos y reposiciones
  aFrom: '', aTo: '',                        // periodo del Análisis
  aProduct: '',                              // producto del gráfico de proyección
  projOpen: lsGet('k8r_ui_projopen', {}),       // tarjetas de proyecto abiertas
  rq: '', rTag: '', rClient: '',                // filtros de Investigación
};
const me = () => lsGet('k8r_me', PEOPLE[0]);

async function loadAll() {
  const res = await Promise.all(TABLES.map(t => Store.all(t)));
  TABLES.forEach((t, i) => { S[t] = res[i] || []; });
}

async function save(t, rows) {
  if (LECTOR && BOOTED) { lectorAvisa(); return; }
  rows = Array.isArray(rows) ? rows : [rows];
  for (const row of rows) {
    const i = S[t].findIndex(r => r.id === row.id);
    if (i >= 0) S[t][i] = row; else S[t].push(row);
  }
  if (LECTOR) return;   // al arrancar como lector, los arreglos automáticos quedan solo en memoria
  try { await Store.putMany(t, rows); }
  catch (e) { console.error(e); toast('No se pudo guardar en la nube: ' + (e.message || e), true); }
}
async function remove(t, id) {
  if (LECTOR) { lectorAvisa(); return; }
  S[t] = S[t].filter(r => r.id !== id);
  try { await Store.del(t, id); }
  catch (e) { console.error(e); toast('No se pudo eliminar: ' + (e.message || e), true); }
}

// ---------- Configuración compartida (tabla settings: { id, value }) ----------
const getSetting = (id, def) => { const r = S.settings.find(x => x.id === id); return r ? r.value : def; };
const setSetting = (id, value) => save('settings', { id, value });
// Responsables de cada etapa: los mismos para todos los productos; puede haber varios.
function stageResp(n) {
  const m = getSetting('stage_resp', DEFAULT_STAGE_RESP);
  const v = m[n] ?? DEFAULT_STAGE_RESP[n] ?? [];
  return Array.isArray(v) ? v : (v ? [v] : []);
}
const leadDays = kind => ({ ...DEFAULT_LEAD, ...getSetting('lead_times', {}) })[kind === 'pedido' ? 'pedido' : 'reposicion'];
function avatarStack(names, cls = 'sm') {
  if (!names.length) return avatar('', cls);
  return `<span class="avatars">${names.map(n => avatar(n, cls)).join('')}</span>`;
}

// Convierte datos guardados con el formato anterior sin perder nada. Antes de
// cambiar algo deja una copia completa (en modo local, en este navegador).
// Restaurar un respaldo descargado con "Descargar respaldo": reemplaza todos los datos (no los Excel adjuntos).
function restoreBackup() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (e) { return toast('El archivo no es un respaldo válido', true); }
    applyBackup(data);
  };
  inp.click();
}
async function applyBackup(data, silent = false) {
  if (LECTOR) { lectorAvisa(); return; }   // el lector no restaura respaldos
  {
    const d = data && data.data ? data.data : data;
    if (!d || !Array.isArray(d.products)) return toast('El archivo no es un respaldo de Reposiciones y estados', true);
    const when = data.at ? new Date(data.at).toLocaleString('es-CL') : 'fecha desconocida';
    if (!silent && !confirm(`Restaurar el respaldo del ${when}: ${d.products.length} productos, ${(d.orders || []).length} envíos, ${(d.samples || []).length} muestras.

Reemplaza TODOS los datos actuales de este navegador. ¿Continuar?`)) return;
    try {
      for (const t of TABLES) {
        const rows = Array.isArray(d[t]) ? d[t] : [];
        if (Store.mode === 'local') lsSet('k8r_' + t, rows);
        else { for (const r of S[t]) await Store.del(t, r.id); if (rows.length) await Store.putMany(t, rows); }
      }
      toast('Respaldo restaurado'); setTimeout(() => location.reload(), 600);
    } catch (e) { console.error(e); toast('No se pudo restaurar: ' + (e.message || e), true); }
  }
}

async function migrate() {
  // Cobertura del sugerido: de 120 días (valor anterior) a 3 meses. Solo una vez, por si después se cambia a mano.
  if (!getSetting('cover_3m', false)) {
    if (getSetting('cover_days', DEFAULT_COVER) === 120) await setSetting('cover_days', DEFAULT_COVER);
    await setSetting('cover_3m', true);
  }
  const hasData = S.products.length > 0;
  const from = getSetting('schema', hasData ? 1 : SCHEMA);
  if (from >= SCHEMA) { if (!hasData) await setSetting('schema', SCHEMA); return; }
  const snapshot = JSON.stringify({ from, at: nowIso(), data: S });
  if (Store.mode === 'local') lsSet('k8r_backup_schema' + from, JSON.parse(snapshot));
  else downloadText(`k8-respaldo-antes-de-actualizar-${isoDay(new Date())}.json`, snapshot);
  if (from < 2) {
    // Se insertó Venta como etapa 6: Reposición 6 → 7 y Descontinuado 7 → 8.
    const up = n => (n >= 6 ? n + 1 : n);
    for (const p of S.products) {
      p.stage = up(p.stage);
      const r = p.responsables || {};
      p.responsables = Object.fromEntries(Object.entries(r).map(([k, v]) => [String(up(+k)), v]));
    }
    for (const e of S.events) e.stage = up(e.stage);
    await save('products', S.products);
    await save('events', S.events);
  }
  await setSetting('schema', SCHEMA);
  toast('Programa actualizado: tus datos se conservaron y se agregó la etapa Venta');
}

function downloadText(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- Consultas ----------
const productById = id => S.products.find(p => p.id === id);
const eventsOf = p => S.events.filter(e => e.product_id === p.id).sort((a, b) => a.at.localeCompare(b.at));
const samplesOf = p => S.samples.filter(s => s.product_id === p.id).sort((a, b) => a.started_at.localeCompare(b.started_at));
const activeSample = p => S.samples.find(s => s.product_id === p.id && s.status === 'en_curso');
// (23-11, Vicente) Al rechazar, la ronda siguiente queda «en espera» (se está fabricando): sin contador hasta que llegue.
const waitingSample = p => S.samples.find(s => s.product_id === p.id && s.status === 'esperando');
const orderSort = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || '');
const ordersOf = p => S.orders.filter(o => (o.product_ids || []).includes(p.id)).sort(orderSort);
const fileById = id => S.files.find(f => f.id === id);
// Fechas de llegada (en el envío y en la ficha del producto):
//   eta      → llegada aproximada a Chile (primera estimación)
//   eta_chi  → llegada a bodega según el documento CHI (más precisa; manda sobre eta)
//   llegada real a bodega → arrived_at en el envío / etapa Llegada en el producto
const bestEta = o => (o && (o.eta_chi || o.eta)) || null;
// Envío del producto que todavía no llega (el más reciente).
const openOrderOf = p => ordersOf(p).filter(o => !o.arrived_at).pop() || null;
// Próxima llegada: la del envío que aún no llega; si no hay, la de la ficha.
function productEta(p) {
  const open = ordersOf(p).filter(o => !o.arrived_at && bestEta(o)).pop();
  if (open) return { date: bestEta(open), chi: !!open.eta_chi, order: open };
  const d = bestEta(p);
  return d && p.stage < ARRIVAL ? { date: d, chi: !!p.eta_chi, order: null } : null; // en Llegada o después ya llegó
}
const alertDays = () => getSetting('alert_days', 15);
// Aviso de llegada: 'late' si la fecha ya pasó, 'soon' si llega dentro de los días de aviso.
function arrivalAlert(p) {
  const e = productEta(p);
  if (!e) return null;
  const dd = daysBetween(new Date(), parseDay(e.date));
  if (dd < 0) return { ...e, dd, level: 'late' };
  if (dd <= alertDays()) return { ...e, dd, level: 'soon' };
  return null;
}
const stageStart = (p, n) => { const e = eventsOf(p).filter(x => x.stage === n).pop(); return e ? e.at : null; };

// Tipo de un envío: el primero de un producto es "Pedido" y los siguientes "Reposición N".
// Si el envío tiene o.kind ('pedido' | 'repo') puesto a mano, manda ese valor
// (por ejemplo, cuando el primer Excel registrado ya era una reposición).
// p.repo_base = reposiciones hechas antes de registrarlas en el programa: la numeración sigue desde ahí.
const repoCount = p => (p.repo_base || 0) + orderKinds(p).filter(k => k.kind === 'repo').length;
// Automático: el primer envío es "Pedido", salvo que el producto ya estuviera en sala a esa
// fecha o ya tenga reposiciones anotadas; en ese caso todo envío es una reposición.
// "Ya llegó alguna vez": Llegada, Control de calidad, Venta o Reposición.
const arrivedStage = n => n >= ARRIVAL && n <= 7;
// ¿El producto ya tuvo su primer pedido antes de este envío? Entonces el envío es una reposición,
// aunque hoy el producto esté de nuevo en Producción (fabricando la reposición).
const alreadySelling = (prod, dateIso) => {
  if (prod.repo_base || prod.had_first_order) return true;
  const when = parseDay(dateIso) || new Date();
  const evs = eventsOf(prod);
  if (!evs.length) return arrivedStage(prod.stage);
  // Ya había llegado en o antes de la fecha del envío.
  if (evs.some(e => arrivedStage(e.stage) && startOfDay(e.at) <= when)) return true;
  // Envío anterior a todo el historial: se mira cómo estaba el producto al cargarlo
  // (por ejemplo, venía del mix como "Reposición").
  return when < startOfDay(evs[0].at) && arrivedStage(evs[0].stage);
};
function orderKinds(prod) {
  let repoN = prod.repo_base || 0;
  return ordersOf(prod).map((x, i) => {
    const kind = x.kind || (i === 0 && !alreadySelling(prod, x.date) ? 'pedido' : 'repo');
    if (kind === 'repo') repoN++;
    return { o: x, kind, text: kind === 'repo' ? 'Reposición ' + repoN : 'Pedido' };
  });
}
function orderLabel(o, p) {
  const pid = p ? p.id : (o.product_ids || [])[0];
  const prod = productById(pid);
  if (!prod) return o.kind === 'repo' ? { text: 'Reposición', kind: 'repo' } : { text: 'Pedido', kind: 'pedido' };
  const r = orderKinds(prod).find(x => x.o.id === o.id);
  return r ? { text: r.text, kind: r.kind } : { text: 'Pedido', kind: 'pedido' };
}
function nextOrderLabel(productIds, forced) {
  const prods = productIds.map(productById).filter(Boolean);
  if (!prods.length) return null;
  const ks = orderKinds(prods[0]);
  const kind = forced || (ks.length === 0 && !alreadySelling(prods[0]) ? 'pedido' : 'repo');
  if (kind === 'pedido') return { text: ks.length ? 'Pedido' : 'Pedido (primer pedido)', kind };
  return { text: 'Reposición ' + (repoCount(prods[0]) + 1), kind };
}
// Reposición en curso: la última reposición del producto que todavía no llega.
function openRepo(p) {
  const r = orderKinds(p).filter(x => x.kind === 'repo' && !x.o.arrived_at).pop();
  return r ? { order: r.o, text: r.text } : null;
}
// Fecha de entrada a la sala de venta: la primera vez que el producto pasó a Venta.
// Inicio de la producción actual: lo más antiguo entre la fecha en que pasó a Producción y la
// fecha del pedido/reposición que aún no llega (la fábrica produce desde que se hizo el pedido).
const productionSince = p => {
  if (p.stage !== PRODUCTION) return null;
  const ev = eventsOf(p).filter(e => e.stage === PRODUCTION).pop();
  const open = openOrderOf(p);
  const cand = [ev && ev.at, open && open.date && parseDay(open.date).toISOString()].filter(Boolean).sort();
  return cand[0] || null;
};
const weeksSince = d => Math.max(1, Math.floor(daysBetween(d, new Date()) / 7) + 1);
// Toma la más antigua entre la etapa Venta del historial y la fecha "En sala" de los envíos.
const saleSince = p => {
  const e = eventsOf(p).find(x => x.stage === SALE);
  const cand = [e && e.at, ...ordersOf(p).map(o => o.sale_at && parseDay(o.sale_at).toISOString())].filter(Boolean).sort();
  return cand[0] || null;
};

function sampleTime(s) {
  const ms = new Date(s.due_at) - Date.now();
  const total = new Date(s.due_at) - new Date(s.started_at);
  const elapsed = Math.min(1, Math.max(0, 1 - ms / total));
  let cls = '';
  if (ms <= 0) cls = 'late';
  else if (ms <= 3 * DAY) cls = 'warn';
  const abs = Math.abs(ms);
  const d = Math.floor(abs / DAY), h = Math.floor((abs % DAY) / 3600000);
  const txt = ms <= 0 ? `Vencida hace ${d ? d + 'd ' : ''}${h}h` : `${d}d ${h}h`;
  return { ms, cls, txt, d, h, elapsed };
}
function sampleTag(s) {
  const m = { aprobada: ['ok', 'Aprobada'], rechazada: ['bad', 'Rechazada'], cancelada: ['', 'Cancelada'], esperando: ['', 'En espera'] }[s.status] || ['', s.status];
  return `<span class="tag ${m[0]}">${m[1]}</span>`;
}
function timerChip(s) {
  const t = sampleTime(s);
  return `<span class="timer ${t.cls}" data-timer="${esc(s.id)}" title="${esc(s.round)} · vence ${fmtDay(s.due_at)}">${ICON.clock.replace(/16/g, '11')} ${esc(t.txt)}</span>`;
}

// ============================================================
// Acciones
// ============================================================
// `at`: fecha del cambio; por defecto ahora (se guarda sola al cambiar de etapa).
async function setStage(p, n, note = '', at = nowIso()) {
  // Muestras no es una etapa aparte: es una ronda con reloj dentro de Producción. Elegir «Muestras» deja (o pone)
  // el producto en Producción sin reiniciar sus días y abre la ronda (Muestra 1, 2, 3 o Final según corresponda).
  if (n === SAMPLES_STAGE) {
    if (p.stage !== PRODUCTION) await setStage(p, PRODUCTION, note || 'Inicio de muestras', at);
    if (!activeSample(p) && !waitingSample(p)) { const r = await startRound(p); toast(`${p.name}: ${r.round} abierta (${SAMPLE_DAYS} días) · sigue en Producción`); }
    render(); return;
  }
  if (p.stage === n) return;
  // Si sale de Muestras con una ronda abierta, se cierra: avanzar = aprobada; retroceder o descontinuar = cancelada.
  const open = activeSample(p);
  if (open && n !== 2) {
    open.status = n > 2 && n !== DISC ? 'aprobada' : 'cancelada';
    open.closed_at = nowIso();
    open.note = 'Cerrada al pasar a ' + stage(n).name;
    await save('samples', open);
  }
  const wt = waitingSample(p);
  if (wt && n !== 2) { wt.status = 'cancelada'; wt.closed_at = nowIso(); wt.note = 'Cancelada al pasar a ' + stage(n).name; await save('samples', wt); }
  // Muestras es solo un aviso dentro de Producción: al aprobar y pasar a Producción, los días siguen contando
  // desde que empezaron las muestras (el evento de Producción toma la fecha de inicio de Muestras).
  if (p.stage === SAMPLES_STAGE && n === PRODUCTION) {
    const start = eventsOf(p).filter(e => e.stage === SAMPLES_STAGE).pop();
    if (start) { at = start.at; note = note || 'Producción cuenta desde el inicio de muestras'; }
  }
  p.stage = n;
  p.updated_at = nowIso();
  await save('products', p);
  await save('events', { id: uid(), product_id: p.id, stage: n, at, by: me(), note });
  if (n === 2 && !activeSample(p) && !waitingSample(p)) await startRound(p);
  toast(`${p.name} → ${stage(n).name}`);
  render();
}

async function startRound(p, round) {
  const done = samplesOf(p);
  if (!round) round = ROUNDS[Math.min(done.length, ROUNDS.length - 1)];
  const start = new Date();
  const s = {
    id: uid(), product_id: p.id, round,
    started_at: start.toISOString(),
    due_at: new Date(start.getTime() + SAMPLE_DAYS * DAY).toISOString(),
    status: 'en_curso',
    responsable: (done.length && done[done.length - 1].responsable) || stageResp(SAMPLES_STAGE)[0] || '',
    note: '', closed_at: null,
  };
  await save('samples', s);
  return s;
}

// Ronda en espera: se guarda sin reloj (started_at/due_at = hoy solo para no dejar fechas vacías); parte al marcar que llegó.
async function waitRound(p, round, prev) {
  const now = nowIso();
  const s = { id: uid(), product_id: p.id, round, started_at: now, due_at: now, status: 'esperando', responsable: (prev && prev.responsable) || stageResp(SAMPLES_STAGE)[0] || '', note: '', closed_at: null };
  await save('samples', s); return s;
}
// Llegó la muestra que se estaba fabricando: recién ahí parten los días para aprobarla o rechazarla
async function arriveSample(s) {
  const start = new Date();
  s.status = 'en_curso'; s.started_at = start.toISOString(); s.due_at = new Date(start.getTime() + SAMPLE_DAYS * DAY).toISOString();
  await save('samples', s);
  const p = productById(s.product_id);
  toast(`${p ? p.name + ': ' : ''}${s.round} recibida → ${SAMPLE_DAYS} días para aprobarla o rechazarla`);
  render();
}

// Rechazar una muestra exige un comentario (qué falló); queda guardado en la muestra y se ve en los historiales.
function rejectWithComment(s) {
  const p = productById(s.product_id);
  openModal(`<div class="m-head"><h3>Rechazar ${esc(s.round)}</h3><span class="sub">${esc(p ? p.name : '')}</span></div>
    <div class="m-body"><label class="field"><span>Comentario del rechazo <b style="color:var(--danger)">*</b></span><textarea class="input" id="rej-note" rows="4" placeholder="Qué hay que corregir: talla, tela, color, costura, etiqueta…"></textarea></label>
      <div class="sub" style="color:var(--muted);font-size:12px;margin-top:6px">La siguiente ronda queda <b>en espera</b> (sin contador) hasta que llegue la nueva muestra. Este comentario queda adjunto a la prenda.</div></div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="rej-ok" style="background:var(--danger);border-color:var(--danger)">Rechazar</button></div>`, {
    narrow: true,
    onMount: w => {
      const ta = $('#rej-note', w); ta.focus();
      $('#rej-ok', w).onclick = async () => {
        const txt = ta.value.trim(); if (!txt) { ta.focus(); ta.style.borderColor = 'var(--danger)'; return toast('Escribe el motivo del rechazo', true); }
        s.note = txt; closeModal(); await closeRound(s, false);
      };
    },
  });
}

async function closeRound(s, approved) {
  const p = productById(s.product_id);
  s.status = approved ? 'aprobada' : 'rechazada';
  s.closed_at = nowIso();
  await save('samples', s);
  const isFinal = s.round === 'Muestra Final';
  if (approved && isFinal) {
    toast(`${p.name}: Muestra Final aprobada`);
    if (p.stage === 2) { await setStage(p, 3, 'Muestra Final aprobada'); return; }
    toast(`${p.name}: muestras terminadas · sigue en Producción`);
  } else if (approved) {
    await startRound(p, 'Muestra Final');
    toast(`${s.round} aprobada → se abrió la Muestra Final (${SAMPLE_DAYS} días)`);
  } else {
    const next = isFinal ? 'Muestra Final' : ROUNDS[ROUNDS.indexOf(s.round) + 1];
    await waitRound(p, next, s);
    toast(`${s.round} rechazada → ${next} queda en espera hasta que llegue (sin contador)`);
  }
  render();
}

async function downloadFile(fileId) {
  const f = fileById(fileId);
  if (!f) return toast('Este envío no tiene archivo adjunto', true);
  try {
    const blob = await Store.getFile(f.path);
    if (!blob) throw new Error('archivo no encontrado');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { toast('No se pudo descargar: ' + (e.message || e), true); }
}

async function storeBackup(file, kind) {
  const id = uid();
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${kind}/${isoDay(new Date())}_${id.slice(0, 8)}_${safe}`;
  const blob = file instanceof Blob ? file : new Blob([file]);
  await Store.putFile(path, blob);
  const row = { id, kind, name: file.name, path, size: file.size || 0, uploaded_at: nowIso(), uploaded_by: me() };
  await save('files', row);
  return row;
}

// ============================================================
// Lectura de Excel
// ============================================================
function readWorkbook(buf) { return XLSX.read(buf, { type: 'array', cellDates: true }); }
const sheetRows = ws => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

function excelSerialToDate(n) {
  const d = new Date(Math.round((n - 25569) * DAY));
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function cellToDate(v) {
  if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === 'number' && v > 30000 && v < 80000) return excelSerialToDate(v);
  if (typeof v === 'string') return parseDay(v.trim());
  return null;
}

function isMixWorkbook(wb) {
  return wb.SheetNames.some(n => {
    const rows = sheetRows(wb.Sheets[n]).slice(0, 5);
    return rows.some(r => r.some(c => norm(c) === 'CODIGO') && r.some(c => norm(c) === 'ETAPA'));
  });
}

// La etapa del Excel del mix viene como "6 · Reposición". Se busca por nombre,
// porque la numeración del Excel puede no coincidir con la del programa.
function mixStage(raw, num) {
  const txt = norm(String(raw ?? '').replace(/^\s*\d+\s*[·.\-]?\s*/, ''));
  const byName = STAGES.find(s => norm(s.name) === txt || norm(s.short) === txt || (txt && norm(s.name).startsWith(txt)));
  if (byName) return byName.n;
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(DISC, num));
}

// Excel "Mix de productos K8": una hoja por línea, filas con PRODUCTO / CÓDIGO / ETAPA…
function parseMix(wb) {
  const out = [];
  for (const name of wb.SheetNames) {
    const rows = sheetRows(wb.Sheets[name]);
    const hi = rows.findIndex(r => r.some(c => norm(c) === 'CODIGO') && r.some(c => norm(c) === 'PRODUCTO'));
    if (hi < 0) continue;
    const H = rows[hi].map(norm);
    const col = k => H.findIndex(h => h.startsWith(k));
    const c = {
      name: col('PRODUCTO'), code: col('CODIGO'), type: col('TIPO'), colors: col('COLORES'),
      stage: col('ETAPA'), eta: col('LLEGADA'), comp: col('COMPOSICION'), sizes: col('TALLAS'),
    };
    for (const r of rows.slice(hi + 1)) {
      const nm = String(r[c.name] ?? '').trim(), code = String(r[c.code] ?? '').trim();
      if (!nm || !code) continue;
      const st = parseInt(String(r[c.stage] ?? ''), 10);
      const eta = c.eta >= 0 ? cellToDate(r[c.eta]) : null;
      out.push({
        name: nm, code, line: name,
        garment: c.type >= 0 ? String(r[c.type] ?? '').trim() : '',
        colors: c.colors >= 0 ? String(r[c.colors] ?? '').trim() : '',
        stage: mixStage(r[c.stage], st),
        eta: eta ? isoDay(eta) : null,
        composition: c.comp >= 0 ? String(r[c.comp] ?? '').trim() : '',
        sizes: c.sizes >= 0 ? String(r[c.sizes] ?? '').trim() : '',
      });
    }
  }
  return out;
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', 'XXXXL', '4XL', 'UNICO', 'UNICA', 'U'];
function isSize(tok) { const t = norm(tok); return SIZE_ORDER.includes(t) || /^\d{2}$/.test(t) || /^[A-Z]{1,4}-[A-Z]{1,4}$/.test(t); }
function titleCase(s) { return s.toLowerCase().replace(/(^|\s|\/)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()); }

// Excel "Solicitud" que se envía a gerencia: PRODUCTO + fecha, tabla CANTIDAD / DESCRIPCIÓN / OBSERVACIÓN.
function parseReposicion(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = sheetRows(ws);
  let title = '', date = null, docTitle = '', area = '', requestedBy = '', authorizedBy = '';
  let qCol = -1, dCol = -1, oCol = -1, k8Col = -1, headerRow = -1;
  const partners = []; // otras empresas que comparten el pedido (columna con su nombre)
  const nextVal = (r, from) => { for (let j = from + 1; j < r.length; j++) if (String(r[j]).trim() !== '') return [r[j], j]; return ['', -1]; };

  rows.forEach((r, i) => {
    r.forEach((v, j) => {
      const n = norm(v);
      if (n === 'PRODUCTO' && !title) {
        const [t, tj] = nextVal(r, j);
        title = String(t).trim();
        if (tj >= 0) { const [d] = nextVal(r, tj); date = cellToDate(d); }
      }
      if (n.startsWith('SOLICITUD') && !docTitle) docTitle = String(v).trim();
      if (n.startsWith('AREA') && !area) area = String(v).trim();
      if (n === 'SOLICITADO POR') requestedBy = String(nextVal(r, j)[0]).trim();
      if (n === 'AUTORIZADO POR') authorizedBy = String(nextVal(r, j)[0]).trim();
      if (n === 'CANTIDAD' && headerRow < 0) { headerRow = i; qCol = j; }
    });
  });
  if (headerRow >= 0) {
    rows[headerRow].forEach((v, j) => {
      const n = norm(v);
      if (n.startsWith('DESCRIPCION')) dCol = j;
      if (n.startsWith('OBSERVACION')) oCol = j;
      if (n === 'K8' || n === 'K8 CHILE') k8Col = j;
    });
    // Pedido compartido: columnas con nombre (CARLOS…) además de la de K8. CANTIDAD es el total de todos.
    if (k8Col >= 0) rows[headerRow].forEach((v, j) => {
      const n = norm(v);
      if (j === qCol || j === dCol || j === oCol || j === k8Col || !n) return;
      partners.push({ col: j, name: titleCase(String(v).trim()), lines: [] });
    });
  }
  const lines = [];
  let totalAll = 0;
  const num = v => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
  if (headerRow >= 0 && dCol >= 0) {
    const tNorm = norm(title);
    for (const r of rows.slice(headerRow + 1)) {
      const desc = String(r[dCol] ?? '').trim();
      const nd = norm(desc);
      if (nd.startsWith('TOTAL') || nd.startsWith('SOLICITADO') || nd.startsWith('AUTORIZADO')) break;
      const all = num(r[qCol]);
      if (!desc || !(all > 0)) continue;
      let rest = nd.startsWith(tNorm) && tNorm ? nd.slice(tNorm.length).trim() : nd;
      const toks = rest.split(' ');
      let size = '';
      if (toks.length && isSize(toks[toks.length - 1])) size = toks.pop();
      const color = titleCase(toks.join(' ')) || 'Único';
      totalAll += all;
      // En un pedido compartido, a K8 le corresponde solo su columna.
      const qty = k8Col >= 0 ? num(r[k8Col]) : all;
      for (const pt of partners) { const q = num(r[pt.col]); if (q > 0) pt.lines.push({ color, size: size || 'Única', qty: q }); }
      if (qty > 0) lines.push({ qty, desc, color, size: size || 'Única', obs: oCol >= 0 ? String(r[oCol] ?? '').trim() : '' });
    }
  }
  const total = lines.reduce((a, l) => a + l.qty, 0);
  const shared = partners.map(pt => ({ name: pt.name, total: pt.lines.reduce((a, l) => a + l.qty, 0), lines: pt.lines })).filter(pt => pt.total > 0);
  return { title, date: date ? isoDay(date) : isoDay(new Date()), docTitle, area, requestedBy, authorizedBy, lines, total, shared, total_all: shared.length ? totalAll : total };
}

function sortSizes(list) {
  return list.sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(norm(a)), ib = SIZE_ORDER.indexOf(norm(b));
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) return a - b;
    return ia >= 0 ? -1 : ib >= 0 ? 1 : 0;
  });
}

// Tabla color × talla para "leer" el Excel de un vistazo.
function matrixHtml(lines) {
  if (!lines || !lines.length) return '<div class="sub">Sin detalle de cantidades.</div>';
  const colors = [...new Set(lines.map(l => l.color))];
  const sizes = sortSizes([...new Set(lines.map(l => l.size))]);
  const q = (c, s) => lines.filter(l => l.color === c && l.size === s).reduce((a, l) => a + l.qty, 0);
  const max = Math.max(...lines.map(l => l.qty));
  const tot = lines.reduce((a, l) => a + l.qty, 0);
  let h = '<table class="tbl matrix"><thead><tr><th>Color</th>' + sizes.map(s => `<th>${esc(s)}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
  for (const c of colors) {
    const rowTot = sizes.reduce((a, s) => a + q(c, s), 0);
    h += `<tr><td><b>${esc(c)}</b></td>` + sizes.map(s => {
      const v = q(c, s);
      return `<td>${v ? `<div class="cell-tint" style="background:${hexA('#3B6EF5', .06 + .22 * v / max)}">${fmtInt(v)}</div>` : '<span style="color:var(--faint)">—</span>'}</td>`;
    }).join('') + `<td><b>${fmtInt(rowTot)}</b></td></tr>`;
  }
  h += '<tr class="tot"><td>Total</td>' + sizes.map(s => `<td>${fmtInt(colors.reduce((a, c) => a + q(c, s), 0))}</td>`).join('') + `<td>${fmtInt(tot)}</td></tr>`;
  return h + '</tbody></table>';
}

// Sugiere los productos del mix que corresponden al título del Excel de gerencia.
const SYN = { HOMBRE: 'MEN', HOMBRES: 'MEN', MUJER: 'WOMEN', MUJERES: 'WOMEN', PANTALON: 'BOTTOM', POLERA: 'TOP', CAMISA: 'TOP' };
const STOP = new Set(['CONJUNTO', 'CLINICO', 'CLINICA', 'DE', 'LA', 'EL', 'Y', 'ROPA', 'SET']);
const toks = s => norm(s).split(/[^A-Z0-9]+/).filter(Boolean).map(t => SYN[t] || t);
function suggestProducts(title) {
  const t = toks(title).filter(x => !STOP.has(x));
  if (!t.length) return [];
  const isSet = /CONJUNTO|SET/.test(norm(title));
  return S.products.map(p => {
    const pt = new Set([...toks(p.name), ...toks(p.code)]);
    let hit = t.filter(x => pt.has(x)).length;
    let score = hit / t.length;
    if (isSet && !(pt.has('TOP') || pt.has('BOTTOM'))) score *= .5;
    if (norm(p.name) === norm(title)) score = 2;
    return { p, score };
  }).filter(x => x.score >= .5).sort((a, b) => b.score - a.score).slice(0, 8);
}

// ============================================================
// Subida de archivos
// ============================================================
async function handleFile(file, presetProductId) {
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) return toast('Sube un archivo Excel (.xlsx)', true);
  let wb;
  try { wb = readWorkbook(await file.arrayBuffer()); }
  catch (e) { return toast('No se pudo leer el Excel: ' + (e.message || e), true); }
  if (isMixWorkbook(wb)) return openMixImport(parseMix(wb), file);
  if (isSalesWorkbook(wb)) { const rep = parseSalesReport(wb); if (!rep.rows.length) return toast('No encontré códigos en el informe de ventas', true); return openSalesImport(rep, file); }
  const rep = parseReposicion(wb);
  if (!rep.lines.length) return toast('No encontré la tabla CANTIDAD / DESCRIPCIÓN en este Excel', true);
  openOrderForm(rep, file, presetProductId);
}

function pickFile(presetProductId) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.xlsx,.xlsm,.xls';
  inp.onchange = () => inp.files[0] && handleFile(inp.files[0], presetProductId);
  inp.click();
}

// ============================================================
// Modales
// ============================================================
function openModal(html, { narrow = false, onMount } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-wrap"><div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const wrap = root.firstElementChild;
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) closeModal(); });
  $$('[data-close]', wrap).forEach(b => b.onclick = closeModal);
  onMount && onMount(wrap);
}
function closeModal() { $('#modal-root').innerHTML = ''; }

function openUploadModal(presetProductId) {
  const p = presetProductId && productById(presetProductId);
  openModal(`
    <div class="m-head"><h2>Subir Excel</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="drop" id="drop">
        <div class="empty" style="margin:0 auto"><div class="ic">${ICON.upload}</div></div>
        <p><b>Arrastra el Excel aquí</b> o haz clic para elegirlo</p>
        <div class="sub">Excel de pedido / reposición enviado a gerencia${p ? ` para <b>${esc(p.name)}</b>` : ''}, o el Excel del <b>Mix de productos K8</b> para actualizar etapas.</div>
      </div>
    </div>`, {
    narrow: true,
    onMount: w => {
      const d = $('#drop', w);
      d.onclick = () => { closeModal(); pickFile(presetProductId); };
      d.ondragover = e => { e.preventDefault(); d.classList.add('over'); };
      d.ondragleave = () => d.classList.remove('over');
      d.ondrop = e => { e.preventDefault(); const f = e.dataTransfer.files[0]; closeModal(); f && handleFile(f, presetProductId); };
    },
  });
}

// ---------- Editor de cantidades color × talla ----------
// Todo es editable: cantidades, nombre de colores y tallas; se pueden agregar o quitar filas y columnas.
function mountMatrixEditor(el, lines, title, onTotal) {
  const colors = [...new Set((lines || []).map(l => l.color))];
  const sizes = sortSizes([...new Set((lines || []).map(l => l.size))]);
  const grid = colors.map(c => sizes.map(s => (lines || []).filter(l => l.color === c && l.size === s).reduce((a, l) => a + l.qty, 0)));
  const obs = {};
  for (const l of lines || []) if (l.obs) obs[l.color + '|' + l.size] = l.obs;
  if (!colors.length) { colors.push('Único'); sizes.push('Única'); grid.push([0]); }

  const total = () => grid.reduce((a, r) => a + r.reduce((b, v) => b + (v || 0), 0), 0);
  const refreshTotals = () => {
    grid.forEach((r, ci) => { const c = $(`[data-rt="${ci}"]`, el); if (c) c.textContent = fmtInt(r.reduce((a, v) => a + (v || 0), 0)); });
    sizes.forEach((s, si) => { const c = $(`[data-ct="${si}"]`, el); if (c) c.textContent = fmtInt(grid.reduce((a, r) => a + (r[si] || 0), 0)); });
    const t = $('[data-tt]', el); if (t) t.textContent = fmtInt(total());
    onTotal && onTotal(total());
  };
  const draw = () => {
    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl matrix"><thead><tr><th>Color</th>
      ${sizes.map((s, si) => `<th><input class="mx-in hd" data-size-i="${si}" value="${esc(s)}" title="Nombre de la talla"><button class="icon-btn" style="width:22px;height:22px;margin:2px auto 0" data-del-size="${si}" title="Quitar talla">${ICON.x.replace(/16/g, '12')}</button></th>`).join('')}
      <th>Total</th><th></th></tr></thead><tbody>
      ${colors.map((c, ci) => `<tr><td><input class="mx-in lbl" data-color-i="${ci}" value="${esc(c)}" title="Nombre del color"></td>
        ${sizes.map((s, si) => `<td><input class="mx-in" type="number" min="0" step="1" data-ci="${ci}" data-si="${si}" value="${grid[ci][si] || ''}" placeholder="0"></td>`).join('')}
        <td><b data-rt="${ci}"></b></td><td><button class="icon-btn" data-del-color="${ci}" title="Quitar color">${ICON.trash}</button></td></tr>`).join('')}
      <tr class="tot"><td>Total</td>${sizes.map((s, si) => `<td data-ct="${si}"></td>`).join('')}<td data-tt></td><td></td></tr>
      </tbody></table></div>
      <div class="mx-add"><button class="btn sm" data-add-color>+ Color</button><button class="btn sm" data-add-size>+ Talla</button></div>`;
    refreshTotals();
    $$('[data-ci]', el).forEach(inp => inp.oninput = () => { grid[+inp.dataset.ci][+inp.dataset.si] = Math.max(0, parseInt(inp.value, 10) || 0); refreshTotals(); });
    $$('[data-color-i]', el).forEach(inp => inp.onchange = () => { colors[+inp.dataset.colorI] = inp.value.trim() || 'Sin color'; });
    $$('[data-size-i]', el).forEach(inp => inp.onchange = () => { sizes[+inp.dataset.sizeI] = inp.value.trim() || 'Única'; });
    $$('[data-del-color]', el).forEach(b => b.onclick = () => { const i = +b.dataset.delColor; colors.splice(i, 1); grid.splice(i, 1); draw(); });
    $$('[data-del-size]', el).forEach(b => b.onclick = () => { const i = +b.dataset.delSize; sizes.splice(i, 1); grid.forEach(r => r.splice(i, 1)); draw(); });
    $('[data-add-color]', el).onclick = () => { colors.push('Nuevo color'); grid.push(sizes.map(() => 0)); draw(); $(`[data-color-i="${colors.length - 1}"]`, el).select(); };
    $('[data-add-size]', el).onclick = () => { sizes.push('Nueva'); grid.forEach(r => r.push(0)); draw(); $(`[data-size-i="${sizes.length - 1}"]`, el).select(); };
  };
  draw();
  return {
    total,
    lines: () => {
      const out = [];
      colors.forEach((c, ci) => sizes.forEach((s, si) => {
        const qty = grid[ci][si] || 0;
        if (qty > 0) out.push({ qty, desc: `${title || ''} ${c} ${s}`.trim(), color: c, size: s, obs: obs[c + '|' + s] || '' });
      }));
      return out;
    },
  };
}

// ---------- Selector de productos del mix ----------
function mountProductPicker(w, selected, sug, onChange) {
  const sugIds = new Set(sug.map(x => x.p.id));
  const listEl = $('[data-pick-list]', w), qEl = $('[data-pick-q]', w);
  const draw = (q = '') => {
    const nq = norm(q);
    const base = [...S.products.filter(p => selected.has(p.id) && !sugIds.has(p.id)), ...sug.map(x => x.p), ...S.products.filter(p => !sugIds.has(p.id) && !selected.has(p.id))];
    listEl.innerHTML = base.filter(p => !nq || norm(p.name + ' ' + p.code + ' ' + p.line).includes(nq)).map(p => `
      <label><input type="checkbox" value="${esc(p.id)}"${selected.has(p.id) ? ' checked' : ''}>
        <span class="dot" style="background:${stage(p.stage).c}"></span>
        <span>${esc(p.name)} <span class="sub" style="color:var(--faint)">· ${esc(p.line)}</span></span>
        ${sugIds.has(p.id) ? '<span class="sug">Sugerido</span>' : ''}</label>`).join('') || '<div class="list-item sub" style="padding:10px">Sin resultados</div>';
  };
  listEl.addEventListener('change', e => {
    if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
    onChange && onChange();
  });
  qEl.oninput = e => draw(e.target.value);
  draw();
}

// Llegada estimada propuesta: fecha del envío + días configurados para pedido o reposición.
function proposedEta(dateIso, kind) {
  const d = parseDay(dateIso) || new Date();
  return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + leadDays(kind)));
}

// Datos de llegada en los productos: la llegada estimada del envío abierto más reciente
// se copia a los productos que aún no llegan, para verla en el Gantt y en la ficha.
async function syncProductEta(o) {
  if (!o.eta && !o.eta_chi) return;
  const prods = (o.product_ids || []).map(productById).filter(p => p && p.stage <= ARRIVAL && !o.arrived_at);
  for (const p of prods) { p.eta = o.eta || p.eta || null; p.eta_chi = o.eta_chi || null; p.updated_at = nowIso(); }
  if (prods.length) await save('products', prods);
}

// Al registrar la llegada real, ofrece pasar los productos a la etapa Llegada con esa fecha.
async function offerArrival(o) {
  const prods = (o.product_ids || []).map(productById).filter(p => p && p.stage < ARRIVAL);
  if (!o.arrived_at || !prods.length) return;
  if (!confirm(`Llegada registrada el ${fmtDay(o.arrived_at)}.\n¿Pasar ${prods.map(p => p.name).join(', ')} a la etapa Llegada con esa fecha?`)) return;
  const at = parseDay(o.arrived_at); at.setHours(9);
  for (const p of prods) await setStage(p, ARRIVAL, 'Llegada del ' + orderLabel(o, p).text.toLowerCase(), at.toISOString());
}

function orderFieldsHtml(o, isNew) {
  return `
    <div class="field"><label>Tipo</label>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="select" id="f-kind" style="width:190px">
          <option value=""${!o.kind ? ' selected' : ''}>Automático</option>
          <option value="pedido"${o.kind === 'pedido' ? ' selected' : ''}>Pedido</option>
          <option value="repo"${o.kind === 'repo' ? ' selected' : ''}>Reposición</option>
        </select>
        <div id="kind"></div>
      </div></div>
    <div class="field"><label>Producto / título del documento</label><input class="input" id="f-title" value="${esc(o.title || '')}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Fecha del correo</label><input class="input" type="date" id="f-date" value="${esc(o.date || '')}"></div>
      <div class="field"><label>Estado</label><select class="select" id="f-status">${ORDER_STATUS.map(s => `<option${s === o.status ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
    </div>
    <div class="arr-steps">
      <div class="field"><label>1 · Llegada aproximada</label><input class="input" type="date" id="f-eta" value="${esc(o.eta || '')}" title="Estimación inicial (la que entrega Baoxin)"></div>
      <div class="field"><label>2 · Llegada a bodega (CHI)</label><input class="input" type="date" id="f-chi" value="${esc(o.eta_chi || '')}" title="Fecha que indica el documento CHI"></div>
      <div class="field"><label>3 · Llegada real a bodega</label><input class="input" type="date" id="f-arr" value="${esc(o.arrived_at || '')}"></div>
    </div>
    <div class="sub" id="eta-hint" style="color:var(--muted);font-size:11.5px;margin:-6px 0 12px"></div>
    <div class="field"><label>Productos del mix a los que corresponde</label>
      <div class="search" style="width:100%;margin-bottom:6px">${ICON.search}<input data-pick-q placeholder="Buscar producto…"></div>
      <div class="prod-pick" data-pick-list></div></div>
    <div class="field"><label>Enviado por</label><select class="select" id="f-by">${peopleOptions(o.sent_by || '', '—')}</select></div>
    ${isNew ? `<div class="field"><label>Cambiar etapa de los productos a</label><select class="select" id="f-stage"><option value="">No cambiar</option>${stageOptions(-1)}</select></div>` : ''}
    <div class="field"><label>Nota</label><textarea class="input" id="f-note" placeholder="Ej: enviado por correo a gerencia comercial">${esc(o.note || '')}</textarea></div>`;
}

// Lee el formulario y actualiza el envío `o`. Devuelve false si falta algo.
// Pedido compartido: guarda lo de las otras empresas (Carlos…) y el total del pedido completo.
// Lo de K8 queda en lines/total, que es lo que cuenta para stock y sugerido.
function setShared(o, shared) {
  const sh = (shared || []).filter(s => s.total > 0);
  o.shared = sh.length ? sh : null;
  o.total_all = sh.length ? (o.total || 0) + sh.reduce((a, s) => a + s.total, 0) : null;
}
const sharedTxt = o => (o.shared || []).map(s => `${esc(s.name)} ${fmtInt(s.total)}`).join(" · ");

function readOrderFields(w, o, ids, mx) {
  if (!ids.length) { toast('Elige al menos un producto', true); return false; }
  const lines = mx.lines();
  if (!lines.length) { toast('El envío no tiene cantidades', true); return false; }
  Object.assign(o, {
    title: $('#f-title', w).value.trim(),
    date: $('#f-date', w).value || isoDay(new Date()),
    status: $('#f-status', w).value,
    eta: $('#f-eta', w).value || null,
    eta_chi: $('#f-chi', w).value || null,
    arrived_at: $('#f-arr', w).value || null,
    kind: $('#f-kind', w).value || null,
    product_ids: ids,
    sent_by: $('#f-by', w).value,
    note: $('#f-note', w).value.trim(),
    lines,
    total: lines.reduce((a, l) => a + l.qty, 0),
  });
  return true;
}

function bindOrderKind(w, o, selected) {
  const upd = () => {
    const forced = $('#f-kind', w).value || null;
    const saved = o.id && S.orders.some(x => x.id === o.id);
    let k;
    if (saved) {
      // Vista previa con el tipo elegido, sin guardar todavía.
      const prev = o.kind; o.kind = forced;
      k = orderLabel(o, productById([...selected][0]));
      o.kind = prev;
    } else k = nextOrderLabel([...selected], forced);
    $('#kind', w).innerHTML = k ? `<span class="tag ${k.kind}">${esc(k.text)}</span>` : '<span class="sub" style="color:var(--faint)">Elige al menos un producto</span>';
    const kind = k && k.kind === 'pedido' ? 'pedido' : 'reposicion';
    const date = $('#f-date', w).value;
    const arr = $('#f-arr', w).value, chi = $('#f-chi', w).value;
    $('#eta-hint', w).innerHTML = `Aproximada sugerida: <b>${fmtDay(proposedEta(date, kind))}</b> (${leadDays(kind)} días para ${kind === 'pedido' ? 'un primer pedido' : 'una reposición'}).`
      + (chi && $('#f-eta', w).value && !arr ? ` CHI vs aproximada: <b>${daysBetween(parseDay($('#f-eta', w).value), parseDay(chi))} días</b>.` : '')
      + (arr && date ? ` Demora real: <b>${daysBetween(parseDay(date), parseDay(arr))} días</b>.` : '');
    return kind;
  };
  return upd;
}

function openOrderForm(rep, file, presetProductId) {
  const sug = suggestProducts(rep.title);
  const selected = new Set(presetProductId ? [presetProductId] : sug.filter(x => x.score >= .99).map(x => x.p.id));
  const draft = { title: rep.title, date: rep.date, status: ORDER_STATUS[0], sent_by: me(), note: '', eta: '', arrived_at: '' };

  openModal(`
    <div class="m-head"><h2>Registrar envío a gerencia</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body"><div class="m-cols">
      <div>
        ${S.orders.length ? `<div class="callout" id="up-mode" style="margin-bottom:10px;display:block">
          <b>¿Qué es este Excel?</b>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
            <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="radio" name="up-mode" value="new" checked> <span><b>Envío nuevo</b> · se registra como Pedido o Reposición N</span></label>
            <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="radio" name="up-mode" value="replace"> <span><b>Reemplazo</b> · corrige las cantidades de un envío ya registrado (mismo pedido, Excel corregido)</span></label>
            <select class="select" id="up-order" style="display:none;width:100%;margin-top:4px">${[...S.orders].sort((a, b) => orderSort(b, a)).map(o => { const ps = (o.product_ids || []).map(pid => (productById(pid) || {}).name).filter(Boolean).join(', '); const sel = [...selected].some(pid => (o.product_ids || []).includes(pid)); return `<option value="${esc(o.id)}" ${sel ? 'data-match="1"' : ''}>${esc(orderLabel(o).text)} · ${fmtDay(o.date)} · ${fmtInt(o.total)} u.${ps ? ' · ' + esc(ps) : ''}</option>`; }).join('')}</select>
          </div></div>` : ''}
        <div class="doc-head">
          <div class="doc-ic">${ICON.doc}</div>
          <div style="min-width:0"><b>${esc(rep.title || 'Sin título')}</b>
            <div class="sub" style="color:var(--muted);font-size:12px">${esc(file.name)} · ${esc(rep.docTitle || 'Solicitud')}${rep.area ? ' · ' + esc(rep.area) : ''}</div></div>
          <div class="spacer"></div>
          <div style="text-align:right"><div style="font-size:20px;font-weight:600" id="mx-total">${fmtInt(rep.total)}</div><div class="sub" style="font-size:11px;color:var(--muted)">unidades</div></div>
        </div>
        ${rep.shared && rep.shared.length ? `<div class="callout" style="margin-bottom:10px">${ICON.info}<div><b>Pedido compartido.</b> El Excel trae ${fmtInt(rep.total_all)} u. en total: <b>K8 ${fmtInt(rep.total)}</b> · ${sharedTxt(rep)}. Se registra solo lo de K8 (es lo que cuenta para stock y sugerido); lo de ${rep.shared.map(s => esc(s.name)).join(' y ')} queda anotado aparte.</div></div>` : ''}
        <div class="sub" style="color:var(--muted);font-size:12px;margin-bottom:8px">Revisa las cantidades leídas del Excel; puedes corregir cualquier celda antes de guardar.</div>
        <div id="mx"></div>
      </div>
      <div>${orderFieldsHtml(draft, true)}</div>
    </div></div>
    <div class="m-foot"><span class="sub" style="color:var(--muted);margin-right:auto">El Excel queda guardado como respaldo.</span>
      <button class="btn" data-close>Cancelar</button><button class="btn primary" id="f-save">${ICON.upload} Registrar envío</button></div>`, {
    onMount: w => {
      const mx = mountMatrixEditor($('#mx', w), rep.lines, rep.title, t => { $('#mx-total', w).textContent = fmtInt(t); });
      const upd = bindOrderKind(w, draft, selected);
      // La llegada estimada se propone sola mientras el usuario no la cambie.
      let etaTouched = false;
      const proposeEta = () => { const kind = upd(); if (!etaTouched) $('#f-eta', w).value = proposedEta($('#f-date', w).value, kind); };
      $('#f-eta', w).oninput = () => { etaTouched = true; };
      $('#f-date', w).onchange = proposeEta;
      $('#f-kind', w).onchange = proposeEta;
      $('#f-chi', w).onchange = upd; $('#f-arr', w).onchange = upd;
      mountProductPicker(w, selected, sug, proposeEta);
      proposeEta();
      // Envío nuevo o reemplazo de uno existente (mismo pedido, cantidades corregidas).
      let upMode = 'new';
      const upSel = $('#up-order', w);
      $$('input[name="up-mode"]', w).forEach(r => r.onchange = () => {
        upMode = r.value; const rep_ = upMode === 'replace';
        if (upSel) { upSel.style.display = rep_ ? '' : 'none'; const m = upSel.querySelector('[data-match]'); if (rep_ && m) upSel.value = m.value; }
        $('#f-save', w).innerHTML = rep_ ? `${ICON.upload} Continuar con el reemplazo` : `${ICON.upload} Registrar envío`;
        $('.m-cols > div:last-child', w).style.opacity = rep_ ? '.45' : '';
      });
      $('#f-save', w).onclick = async () => {
        if (upMode === 'replace') {
          const oid = upSel && upSel.value; if (!oid) return toast('Elige el envío que vas a reemplazar', true);
          closeModal(); openOrderDetail(oid, file); return;
        }
        const order = { id: uid(), doc_title: rep.docTitle, created_at: nowIso() };
        if (!readOrderFields(w, order, [...selected], mx)) return;
        setShared(order, rep.shared);
        const btn = $('#f-save', w); btn.disabled = true; btn.textContent = 'Guardando…';
        try {
          const f = await storeBackup(file, 'reposicion');
          order.file_id = f.id;
          await save('orders', order);
          const st = $('#f-stage', w).value;
          if (st !== '') for (const id of order.product_ids) { const p = productById(id); if (p) await setStage(p, +st, 'Envío a gerencia ' + fmtDay(order.date)); }
          await syncProductEta(order);
          await offerArrival(order);
          closeModal();
          toast(`${orderLabel(order).text} registrado · ${fmtInt(order.total)} unidades`);
          render();
        } catch (e) {
          console.error(e); btn.disabled = false; btn.textContent = 'Registrar envío';
          toast('Error al guardar: ' + (e.message || e), true);
        }
      };
    },
  });
}

function openOrderDetail(id, replaceFile) {
  // replaceFile: Excel ya elegido desde «Subir Excel» para reemplazar las cantidades de este envío.
  const o = S.orders.find(x => x.id === id);
  if (!o) return;
  const lab = orderLabel(o);
  const f = fileById(o.file_id);
  const selected = new Set(o.product_ids || []);
  const before = { arrived_at: o.arrived_at };
  openModal(`
    <div class="m-head"><span class="tag ${lab.kind}">${esc(lab.text)}</span><h2>${esc(o.title || 'Envío')}</h2><div class="spacer"></div>
      <div style="text-align:right;margin-right:8px"><div style="font-size:18px;font-weight:600" id="mx-total">${fmtInt(o.total)}</div><div class="sub" style="font-size:11px;color:var(--muted)">unidades</div></div>
      <button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body"><div class="m-cols">
      <div>
        <div class="sub" style="color:var(--muted);font-size:12px;margin-bottom:8px">Todo se puede editar. Cambia una cantidad, el nombre de un color o una talla, o agrega filas.</div>
        <div id="mx"></div>
        <div class="kv" style="margin-top:16px">
          <div class="k">Documento</div><div>${esc(o.doc_title || '—')}</div>
          <div class="k">Archivo</div><div id="o-file">${f ? esc(f.name) : '—'}</div>
          <div class="k">Registrado</div><div>${fmtDay(o.created_at)}</div>
          ${o.shared ? `<div class="k">Compartido</div><div>Pedido completo ${fmtInt(o.total_all)} u.: <b>K8 ${fmtInt(o.total)}</b> · ${sharedTxt(o)}. Solo lo de K8 cuenta para stock y sugerido.
            ${o.shared.map(s => `<details style="margin-top:6px"><summary class="sub" style="cursor:pointer">Ver lo de ${esc(s.name)} por color y talla</summary><div style="margin-top:6px">${matrixHtml(s.lines)}</div></details>`).join('')}</div>` : ''}
          ${(o.file_history || []).length ? `<div class="k">Versiones anteriores</div><div>${o.file_history.map(h => { const hf = fileById(h.file_id); return hf ? `<div style="display:flex;gap:6px;align-items:center"><button class="icon-btn" style="width:24px;height:24px" data-dl="${esc(hf.id)}" title="Descargar">${ICON.download}</button><span class="sub" style="font-size:12px">${esc(hf.name)} · ${fmtInt(h.total)} u. · reemplazado ${fmtDay(h.replaced_at)}</span></div>` : ''; }).join('')}</div>` : ''}
        </div>
        ${o.shared_review ? `<div class="callout warn" id="o-review" style="margin-top:12px">${ICON.info}<div style="flex:1">El Excel de este envío es un <b>pedido compartido</b> (trae una columna K8 y otra de otra empresa), pero las cantidades se editaron a mano, así que no las cambié. Si quieres, usa solo lo de K8 del Excel.</div><button class="btn sm" id="o-use-k8">Usar solo K8</button></div>` : ''}
        <div class="callout" id="o-replaced" style="margin-top:12px;display:none"></div>
      </div>
      <div>${orderFieldsHtml(o, false)}</div>
    </div></div>
    <div class="m-foot">
      <button class="btn danger" id="o-del" style="margin-right:auto">${ICON.trash} Eliminar</button>
      ${f ? `<button class="btn" id="o-dl">${ICON.download} Descargar Excel</button>` : ''}
      <button class="btn" id="o-replace" title="Leer de nuevo las cantidades desde un Excel corregido">${ICON.upload} ${f ? 'Reemplazar Excel' : 'Cargar Excel'}</button>
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" id="o-save">Guardar cambios</button></div>`, {
    onMount: w => {
      let mx = mountMatrixEditor($('#mx', w), o.lines, o.title, t => { $('#mx-total', w).textContent = fmtInt(t); });
      let newFile = null; // Excel de reemplazo pendiente de guardar
      let newShared = o.shared || null; // reparto con otras empresas (del Excel)

      // Reemplazar Excel: lee el archivo corregido y reemplaza las cantidades (se guardan con "Guardar cambios").
      $('#o-replace', w).onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.xlsx,.xlsm,.xls';
        inp.onchange = () => inp.files[0] && applyReplace(inp.files[0]);
        inp.click();
      };
      const applyReplace = async (file) => {
        {
          if (!file) return;
          let rep;
          try {
            const wb = readWorkbook(await file.arrayBuffer());
            if (isMixWorkbook(wb)) return toast('Ese es el Excel del mix, no el de un pedido', true);
            rep = parseReposicion(wb);
          } catch (e) { return toast('No se pudo leer el Excel: ' + (e.message || e), true); }
          if (!rep.lines.length) return toast('No encontré la tabla CANTIDAD / DESCRIPCIÓN en este Excel', true);
          const oldTotal = mx.total();
          mx = mountMatrixEditor($('#mx', w), rep.lines, rep.title || o.title, t => { $('#mx-total', w).textContent = fmtInt(t); });
          $('#mx-total', w).textContent = fmtInt(rep.total);
          newFile = file;
          newShared = rep.shared;
          if (rep.title) $('#f-title', w).value = rep.title;
          if (rep.date && rep.date !== $('#f-date', w).value && confirm(`El Excel nuevo tiene fecha ${fmtDay(rep.date)} (el envío dice ${fmtDay($('#f-date', w).value)}).\n¿Usar la fecha del Excel nuevo?`)) {
            $('#f-date', w).value = rep.date; upd();
          }
          const diff = rep.total - oldTotal;
          const box = $('#o-replaced', w);
          box.style.display = '';
          box.innerHTML = `${ICON.info}<div><b>${esc(file.name)}</b> leído: ${fmtInt(oldTotal)} → <b>${fmtInt(rep.total)}</b> unidades (${diff >= 0 ? '+' : ''}${fmtInt(diff)}). Revisa la tabla y aprieta <b>Guardar cambios</b>. El Excel anterior queda guardado como versión anterior.</div>`;
          $('#o-file', w).innerHTML = `${esc(file.name)} <span class="tag blue" style="height:18px;font-size:10.5px">nuevo, sin guardar</span>`;
        }
      };
      if (replaceFile) setTimeout(() => applyReplace(replaceFile), 0);
      const useK8 = $('#o-use-k8', w);
      if (useK8) useK8.onclick = async () => {
        try {
          const rep = parseReposicion(readWorkbook(await (await Store.getFile(f.path)).arrayBuffer()));
          mx = mountMatrixEditor($('#mx', w), rep.lines, o.title, t => { $('#mx-total', w).textContent = fmtInt(t); });
          $('#mx-total', w).textContent = fmtInt(rep.total);
          newShared = rep.shared;
          $('#o-review', w).innerHTML = `${ICON.info}<div>Cargado lo de K8 del Excel: <b>${fmtInt(rep.total)}</b> u. (${sharedTxt(rep)} aparte). Aprieta <b>Guardar cambios</b>.</div>`;
        } catch (e) { toast('No se pudo leer el Excel: ' + (e.message || e), true); }
      };
      const upd = bindOrderKind(w, o, selected);
      $('#f-date', w).onchange = upd;
      $('#f-kind', w).onchange = upd;
      $('#f-chi', w).onchange = upd; $('#f-arr', w).onchange = upd; $('#f-eta', w).onchange = upd;
      mountProductPicker(w, selected, [], upd);
      upd();
      $('#o-dl', w) && ($('#o-dl', w).onclick = () => downloadFile(o.file_id));
      $$('[data-dl]', w).forEach(b => b.onclick = e => { e.stopPropagation(); downloadFile(b.dataset.dl); });
      $('#o-save', w).onclick = async () => {
        const draft = { ...o };
        if (!readOrderFields(w, draft, [...selected], mx)) return;
        setShared(draft, newShared);
        if (newShared !== (o.shared || null)) draft.shared_review = null;
        if (newFile) {
          // Guarda el Excel nuevo como respaldo y deja el anterior en el historial del envío.
          try {
            const nf = await storeBackup(newFile, 'reposicion');
            if (o.file_id) draft.file_history = [...(o.file_history || []), { file_id: o.file_id, total: o.total, replaced_at: nowIso() }];
            draft.file_id = nf.id;
          } catch (e) { return toast('No se pudo guardar el Excel: ' + (e.message || e), true); }
        }
        Object.assign(o, draft);
        await save('orders', o);
        await syncProductEta(o);
        if (o.arrived_at && o.arrived_at !== before.arrived_at) await offerArrival(o);
        closeModal(); toast('Envío actualizado'); render();
      };
      $('#o-del', w).onclick = async () => {
        if (!confirm('¿Eliminar este envío y sus Excel de respaldo?')) return;
        for (const fid of [o.file_id, ...(o.file_history || []).map(h => h.file_id)]) {
          const ff = fileById(fid);
          if (ff) { try { await Store.delFile(ff.path); } catch { /* el registro se borra igual */ } await remove('files', ff.id); }
        }
        await remove('orders', o.id); closeModal(); toast('Envío eliminado'); render();
      };
    },
  });
}

function openMixImport(items, file) {
  const byCode = new Map(S.products.map(p => [p.code, p]));
  const nuevos = items.filter(i => !byCode.has(i.code));
  const cambios = items.filter(i => byCode.has(i.code) && byCode.get(i.code).stage !== i.stage);
  openModal(`
    <div class="m-head"><h2>Importar Mix de productos</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="kpis" style="margin-top:0">
        <div class="kpi"><div class="l">Productos en el Excel</div><div class="v">${items.length}</div></div>
        <div class="kpi"><div class="l">Nuevos</div><div class="v">${nuevos.length}</div></div>
        <div class="kpi"><div class="l">Cambian de etapa</div><div class="v">${cambios.length}</div></div>
      </div>
      ${cambios.length ? `<table class="tbl"><thead><tr><th>Producto</th><th>Etapa actual</th><th>Etapa en el Excel</th></tr></thead><tbody>${cambios.map(i => {
        const p = byCode.get(i.code);
        return `<tr><td>${esc(i.name)}</td><td><span class="tag" style="${pillStyle(p.stage)}">${esc(stage(p.stage).name)}</span></td><td><span class="tag" style="${pillStyle(i.stage)}">${esc(stage(i.stage).name)}</span></td></tr>`;
      }).join('')}</tbody></table>` : ''}
      <div class="callout" style="margin-top:12px">${ICON.info}<div>Se actualizan nombre, colores, tallas, composición y llegada estimada. Los responsables, muestras y reposiciones que ya registraste se mantienen.</div></div>
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="mx-go">Importar</button></div>`, {
    narrow: !cambios.length,
    onMount: w => {
      $('#mx-go', w).onclick = async () => {
        const btn = $('#mx-go', w); btn.disabled = true; btn.textContent = 'Importando…';
        try {
          try { await storeBackup(file, 'mix'); } catch (e) { console.warn('respaldo mix', e); }
          const prods = [], evs = [];
          for (const i of items) {
            const old = byCode.get(i.code);
            if (old) {
              const changed = old.stage !== i.stage;
              Object.assign(old, { name: i.name, line: i.line, garment: i.garment, colors: i.colors, composition: i.composition, sizes: i.sizes, eta: i.eta || old.eta, stage: i.stage, updated_at: nowIso() });
              prods.push(old);
              if (changed) evs.push({ id: uid(), product_id: old.id, stage: i.stage, at: nowIso(), by: me(), note: 'Importado desde ' + file.name });
            } else {
              const p = { id: uid(), ...i, responsables: {}, created_at: nowIso(), updated_at: nowIso() };
              prods.push(p);
              evs.push({ id: uid(), product_id: p.id, stage: i.stage, at: nowIso(), by: me(), note: 'Importado desde ' + file.name });
            }
          }
          await save('products', prods);
          await save('events', evs);
          for (const p of prods) if (p.stage === 2 && !activeSample(p) && !waitingSample(p)) await startRound(p);
          closeModal();
          toast(`Mix importado: ${nuevos.length} nuevos, ${cambios.length} con cambio de etapa`);
          render();
        } catch (e) { console.error(e); btn.disabled = false; btn.textContent = 'Importar'; toast('Error al importar: ' + (e.message || e), true); }
      };
    },
  });
}

function openConfig() {
  const lead = { ...DEFAULT_LEAD, ...getSetting('lead_times', {}) };
  openModal(`
    <div class="m-head"><h2>Configuración</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <h4 class="cfg-h">Responsables por etapa</h4>
      <div class="sub" style="color:var(--muted);margin-bottom:10px">Valen para todos los productos. Puedes marcar varias personas en una etapa.</div>
      <table class="tbl cfg-resp"><tbody>${STAGES.filter(s => s.n !== DISC).map(s => {
        const r = stageResp(s.n);
        return `<tr><td style="white-space:nowrap"><span class="dot" style="background:${s.c};display:inline-block;margin-right:8px"></span><b>${s.n} · ${esc(s.name)}</b></td>
          <td><div class="chips">${PEOPLE.map(pp => `<label class="chip pick ${r.includes(pp) ? 'on' : ''}"><input type="checkbox" data-cfg-stage="${s.n}" value="${esc(pp)}"${r.includes(pp) ? ' checked' : ''}>${avatar(pp, 'sm')} ${esc(pp)}</label>`).join('')}</div></td></tr>`;
      }).join('')}</tbody></table>

      <h4 class="cfg-h" style="margin-top:22px">Tiempos de llegada estimados</h4>
      <div class="sub" style="color:var(--muted);margin-bottom:10px">Días desde que se envía el correo a gerencia hasta que el producto llega. Se usan para proponer la llegada estimada de cada envío (después la puedes cambiar con la fecha que entregue Baoxin). Cuando haya llegadas reales registradas, la pestaña Análisis muestra el promedio real.</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div class="field"><label>Primer pedido (días)</label><input class="input" type="number" min="1" id="cfg-ped" value="${lead.pedido}" style="width:150px"></div>
        <div class="field"><label>Reposición (días)</label><input class="input" type="number" min="1" id="cfg-rep" value="${lead.reposicion}" style="width:150px"></div>
        <div class="field"><label>Avisar llegada con (días)</label><input class="input" type="number" min="1" id="cfg-alert" value="${alertDays()}" style="width:150px"></div>
      </div>

      <h4 class="cfg-h" style="margin-top:10px">Sugerido de reposición</h4>
      <div class="sub" style="color:var(--muted);margin-bottom:10px">Cuántos días de venta debe cubrir cada reposición, además de los días que demora en llegar.</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div class="field"><label>Cobertura (días de venta)</label><input class="input" type="number" min="1" id="cfg-cover" value="${coverDays()}" style="width:150px"></div>
        <div class="field"><label>Mínimo de fábrica por pedido (u)</label><input class="input" type="number" min="0" step="50" id="cfg-min" value="${getSetting('min_qty', DEFAULT_MIN_QTY)}" style="width:150px"></div>
        <div class="field"><label>Mínimo por talla (u)</label><input class="input" type="number" min="0" step="10" id="cfg-min-size" value="${sizeMinQty()}" style="width:150px"></div>
      </div>
      <div class="sub" style="color:var(--faint);font-size:11.5px;margin-top:-4px">Si un producto tiene otro mínimo, se cambia en su ficha.</div>

      <h4 class="cfg-h" style="margin-top:10px">Respaldo</h4>
      <div class="sub" style="color:var(--muted);margin-bottom:10px">Descarga una copia de todos los datos (productos, etapas, muestras, envíos y configuración). Los Excel adjuntos siguen guardados en el programa.</div>
      <button class="btn" id="cfg-export">${ICON.download} Descargar respaldo</button>
      <button class="btn" id="cfg-restore">${ICON.upload} Restaurar respaldo</button>
      <button class="btn" id="cfg-md">${ICON.doc} Descargar resumen (.md)</button>
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="cfg-save">Guardar</button></div>`, {
    onMount: w => {
      $$('[data-cfg-stage]', w).forEach(cb => cb.onchange = () => cb.closest('.chip').classList.toggle('on', cb.checked));
      $('#cfg-md', w).onclick = downloadSummaryMd;
      $('#cfg-restore', w).onclick = restoreBackup;
      $('#cfg-export', w).onclick = () => downloadText(`k8-reposiciones-respaldo-${isoDay(new Date())}.json`, JSON.stringify({ schema: SCHEMA, at: nowIso(), data: S }, null, 1));
      $('#cfg-save', w).onclick = async () => {
        const m = {};
        for (const s of STAGES) m[s.n] = $$(`[data-cfg-stage="${s.n}"]`, w).filter(c => c.checked).map(c => c.value);
        const ped = Math.max(1, parseInt($('#cfg-ped', w).value, 10) || DEFAULT_LEAD.pedido);
        const rep = Math.max(1, parseInt($('#cfg-rep', w).value, 10) || DEFAULT_LEAD.reposicion);
        await setSetting('stage_resp', m);
        await setSetting('lead_times', { pedido: ped, reposicion: rep });
        await setSetting('alert_days', Math.max(1, parseInt($('#cfg-alert', w).value, 10) || 15));
        await setSetting('cover_days', Math.max(1, parseInt($('#cfg-cover', w).value, 10) || DEFAULT_COVER));
        await setSetting('min_qty', Math.max(0, parseInt($('#cfg-min', w).value, 10) || 0));
        await setSetting('min_size_qty', Math.max(0, parseInt($('#cfg-min-size', w).value, 10) || 0));
        closeModal(); toast('Configuración guardada'); render();
      };
    },
  });
}

// ============================================================
// Menú contextual (clic derecho en una fila o barra)
// ============================================================
function openCtx(p, x, y) {
  const root = $('#ctx-root');
  const s = activeSample(p);
  root.innerHTML = `<div class="ctx" role="menu">
    <div class="ctx-label">Cambiar etapa</div>
    <div class="ctx-dots">${STAGES.map(st => `<button data-stage="${st.n}" class="${st.n === p.stage ? 'cur' : ''}" style="background:${st.c};color:${st.c}" title="${st.n} · ${esc(st.name)}"></button>`).join('')}</div>
    <div class="ctx-sep"></div>
    <button class="ctx-item" data-act="detail">${ICON.eye} Ver detalle</button>
    <button class="ctx-item" data-act="upload">${ICON.upload} Subir pedido / reposición</button>
    ${p.stage === 2 && !s ? `<button class="ctx-item" data-act="sample">${ICON.flask} Iniciar muestra</button>` : ''}
    <button class="ctx-item" data-act="copy">${ICON.copy} Copiar código</button>
    <div class="ctx-sep"></div>
    <button class="ctx-item danger" data-act="disc">${ICON.ban} Descontinuar</button>
  </div>`;
  const m = root.firstElementChild;
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  m.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    closeCtx();
    if (b.dataset.stage) return confirmStageChange(p, +b.dataset.stage) && setStage(p, +b.dataset.stage);
    const a = b.dataset.act;
    if (a === 'detail') openDrawer(p.id);
    if (a === 'upload') openUploadModal(p.id);
    if (a === 'sample') { await startRound(p); render(); }
    if (a === 'copy') { try { await navigator.clipboard.writeText(p.code); toast('Código copiado'); } catch { toast(p.code); } }
    if (a === 'disc' && confirm(`¿Marcar "${p.name}" como Descontinuado?`)) setStage(p, DISC);
  };
}
function closeCtx() { $('#ctx-root').innerHTML = ''; }

// ============================================================
// Render principal
// ============================================================
function filtered() {
  const q = norm(UI.q);
  return S.products.filter(p =>
    (UI.line === 'Todas' || p.line === UI.line) &&
    (UI.stage === '' || p.stage === +UI.stage) &&
    (!UI.person || stageResp(p.stage).includes(UI.person)) &&
    (!q || norm(`${p.name} ${p.code} ${p.colors}`).includes(q)));
}
const lineOrder = l => { const i = LINES.indexOf(l); return i < 0 ? 99 : i; };

function render() {
  const active = S.samples.filter(s => s.status === 'en_curso');
  const urgent = active.filter(s => sampleTime(s).ms <= 3 * DAY).length;
  const lines = [...new Set(S.products.map(p => p.line))].sort((a, b) => lineOrder(a) - lineOrder(b) || a.localeCompare(b));
  const tabs = [
    ['gantt', ICON.gantt, 'Gantt', ''],
    ['muestras', ICON.clock, 'Muestras', active.length ? `<span class="count ${urgent ? 'alert' : ''}">${active.length}</span>` : ''],
    ['reposiciones', ICON.doc, 'Pedidos y Reposiciones', S.orders.length ? `<span class="count">${S.orders.length}</span>` : ''],
    ['analisis', ICON.analysis, 'Análisis', ''],
    ['resumen', ICON.chart, 'Resumen', ''],
    ['importaciones', ICON.box, 'Importaciones clientes', S.projects.filter(x => x.stage < 6).length ? `<span class="count">${S.projects.filter(x => x.stage < 6).length}</span>` : ''],
    ['investigacion', ICON.bulb, 'Investigación', S.research.length ? `<span class="count">${S.research.length}</span>` : ''],
  ];
  const gScroll = $('.gantt') ? { l: $('.gantt').scrollLeft, t: $('.gantt').scrollTop } : null;

  $('#app').innerHTML = `
  <div class="shell"><div class="module">
    <div class="topbar">
      <div class="crumbs"><span class="logo">K8</span><span>K8 Chile</span><span class="sep">/</span><b>Reposiciones y estados</b></div>
      <div class="spacer"></div>
      <span class="sync ${Store.mode}" title="${Store.mode === 'cloud' ? 'Datos compartidos en Supabase' : 'Sin nube configurada: los datos quedan solo en este navegador. Completa config.js para compartirlos.'}"><i></i>${Store.mode === 'cloud' ? 'Nube conectada' : 'Modo local'}</span>
      <div class="avatars">${PEOPLE.map(p => avatar(p)).join('')}</div>
      <label class="me-select">Yo: <select class="select" id="me" style="height:30px">${peopleOptions(me(), '—')}</select></label>
      <button class="btn" data-open-config>${ICON.gear} Configuración</button>
      <button class="btn primary" id="btn-upload">${ICON.upload} Subir Excel</button>
      ${Store.mode === 'cloud' ? `<button class="icon-btn" id="btn-logout" title="Cerrar sesión">${ICON.logout}</button>` : ''}
    </div>
    <div class="tabs">${tabs.map(([k, ic, l, c]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-tab="${k}">${ic} ${l} ${c}</button>`).join('')}</div>
    ${salesAlertHtml()}
    ${UI.tab === 'gantt' ? `<div class="toolbar">
      <div class="search">${ICON.search}<input id="q" placeholder="Buscar producto, código o color" value="${esc(UI.q)}"></div>
      <div class="chips">${['Todas', ...lines].map(l => `<button class="chip ${UI.line === l ? 'on' : ''}" data-line="${esc(l)}">${esc(l)}</button>`).join('')}</div>
      <div class="spacer"></div>
      <div class="seg-ctl" title="Escala del Gantt">${[['dia', 'Días'], ['semana', 'Semanas'], ['mes', 'Meses']].map(([k, l]) => `<button data-zoom="${k}" class="${UI.zoom === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="month-range">Desde <input type="month" id="g-from" value="${esc(UI.gFrom)}"> hasta <input type="month" id="g-to" value="${esc(UI.gTo)}">${UI.gFrom || UI.gTo ? `<button class="btn ghost sm" id="g-clear">Limpiar</button>` : ''}</span>
      <select class="select" id="f-stage"><option value="">Todas las etapas</option>${stageOptions(UI.stage === '' ? -1 : +UI.stage)}</select>
      <select class="select" id="f-person">${peopleOptions(UI.person, 'Todos los responsables')}</select>
    </div>` : ''}
    <div class="view" id="view"></div>
  </div></div>`;

  const view = $('#view');
  if (!S.products.length) view.innerHTML = emptyState();
  else if (UI.tab === 'gantt') view.innerHTML = ganttHtml();
  else if (UI.tab === 'muestras') view.innerHTML = `<div class="scroll-pad">${samplesHtml()}</div>`;
  else if (UI.tab === 'reposiciones') view.innerHTML = `<div class="scroll-pad">${ordersHtml()}</div>`;
  else if (UI.tab === 'analisis') view.innerHTML = `<div class="scroll-pad">${analysisHtml()}</div>`;
  else if (UI.tab === 'importaciones') view.innerHTML = `<div class="scroll-pad">${projectsHtml()}</div>`;
  else if (UI.tab === 'investigacion') view.innerHTML = `<div class="scroll-pad">${researchHtml()}</div>`;
  else view.innerHTML = `<div class="scroll-pad">${summaryHtml()}</div>`;

  bindMain();
  const g = $('.gantt');
  if (g) {
    if (gScroll && UI.scrolledToToday) { g.scrollLeft = gScroll.l; g.scrollTop = gScroll.t; }
    else { const t = $('.ticks .today'); if (t) g.scrollLeft = Math.max(0, t.offsetLeft - (UI.zoom === 'dia' ? 260 : 420)); UI.scrolledToToday = true; }
  }
  renderDrawer();
}

function emptyState() {
  return `<div class="empty"><div class="ic">${ICON.upload}</div>
    <h2>Carga el Mix de productos</h2>
    <p>Sube el Excel <b>K8_MIX</b> para cargar todos los productos con su etapa. Después podrás registrar cada pedido y reposición subiendo el Excel que envías a gerencia.</p>
    <button class="btn primary" id="btn-upload-empty">${ICON.upload} Subir Excel del mix</button></div>`;
}

// ---------- Gantt ----------
// Escalas: por día (28 px/día), por semana (S1–S5 de cada mes) o por mes.
const ZOOM_PX = { dia: 28, semana: 7, mes: 2.2 };
const monthStart = ym => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ''); return m ? new Date(+m[1], +m[2] - 1, 1) : null; };
const monthEnd = ym => { const d = monthStart(ym); return d ? new Date(d.getFullYear(), d.getMonth() + 1, 0) : null; };
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function ganttHtml() {
  const list = filtered();
  const today = startOfDay(new Date());
  const zoom = ZOOM_PX[UI.zoom] ? UI.zoom : 'semana';
  const U = ZOOM_PX[zoom];

  // Rango: desde el primer movimiento hasta la última fecha conocida (o lo que diga el filtro de meses).
  let min = today.getTime() - 21 * DAY, max = today.getTime() + 45 * DAY;
  for (const e of S.events) min = Math.min(min, startOfDay(e.at).getTime());
  for (const o of S.orders) { const d = parseDay(o.date); if (d) min = Math.min(min, d.getTime()); }
  for (const s of S.samples) if (s.status === 'en_curso') max = Math.max(max, startOfDay(s.due_at).getTime() + 7 * DAY);
  for (const p of list) { const e = productEta(p); const d = e && parseDay(e.date); if (d && d > today) max = Math.max(max, d.getTime() + 10 * DAY); }
  let start = startOfDay(min - 3 * DAY), end = startOfDay(max);
  if (zoom !== 'dia') { start = new Date(start.getFullYear(), start.getMonth(), 1); end = new Date(end.getFullYear(), end.getMonth() + 1, 0); }
  if (UI.gFrom && monthStart(UI.gFrom)) start = monthStart(UI.gFrom);
  if (UI.gTo && monthEnd(UI.gTo)) end = monthEnd(UI.gTo);
  if (end < start) end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const nDays = Math.round((end - start) / DAY) + 1;
  const width = Math.ceil(nDays * U);
  const x = d => Math.round((startOfDay(d) - start) / DAY) * U;
  const xNow = d => (new Date(d) - start) / DAY * U;
  const clampSeg = (l, r) => [Math.max(0, l), Math.min(width, r)];

  // Cabecera y líneas verticales según la escala.
  let top = '', ticks = '', grid = '';
  const dayAt = i => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  if (zoom === 'dia') {
    for (let i = 0; i < nDays; i++) {
      const d = dayAt(i);
      if (i === 0 || d.getDate() === 1) { top += `<span style="left:${i * U}px">${d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>`; if (i) grid += `<i class="vl m" style="left:${i * U}px"></i>`; }
      const isT = d.getTime() === today.getTime();
      const wk = d.getDay() === 0 || d.getDay() === 6;
      ticks += `<span class="${isT ? 'today' : ''} ${wk ? 'wk' : ''}" style="left:${i * U}px;width:${U}px">${isT ? `<b>${d.getDate()}</b>` : d.getDate()}</span>`;
    }
  } else {
    for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const l = x(m < start ? start : m);
      const curMonth = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
      if (zoom === 'semana') {
        top += `<span style="left:${l}px">${MONTHS_SHORT[m.getMonth()]} ${m.getFullYear()}</span>`;
        // Semanas del mes: días 1–7, 8–14, 15–21, 22–28 y 29 al fin de mes.
        for (let k = 0; k < 5; k++) {
          const a = new Date(m.getFullYear(), m.getMonth(), 1 + k * 7);
          if (a > mEnd) break;
          const b = k === 4 ? mEnd : new Date(m.getFullYear(), m.getMonth(), 7 + k * 7);
          if (b < start || a > end) continue;
          const isT = today >= a && today <= b;
          const wl = x(a < start ? start : a), wr = x(b > end ? end : b) + U;
          ticks += `<span class="${isT ? 'today' : ''}" style="left:${wl}px;width:${wr - wl}px" title="Semana ${k + 1} · ${fmtShort(a)} al ${fmtShort(b)}">${isT ? `<b>S${k + 1}</b>` : 'S' + (k + 1)}</span>`;
          grid += `<i class="vl ${k === 0 ? 'm' : ''}" style="left:${wl}px"></i>`;
        }
      } else {
        if (m.getMonth() === 0 || m.getTime() === new Date(start.getFullYear(), start.getMonth(), 1).getTime()) top += `<span style="left:${l}px">${m.getFullYear()}</span>`;
        const r = x(mEnd > end ? end : mEnd) + U;
        ticks += `<span class="${curMonth ? 'today' : ''}" style="left:${l}px;width:${r - l}px">${curMonth ? `<b>${MONTHS_SHORT[m.getMonth()]}</b>` : MONTHS_SHORT[m.getMonth()]}</span>`;
        grid += `<i class="vl ${m.getMonth() === 0 ? 'm' : ''}" style="left:${l}px"></i>`;
      }
    }
  }
  const todayX = x(today) + U / 2;
  const showToday = today >= start && today <= end;

  const groups = {};
  for (const p of list) (groups[p.line] = groups[p.line] || []).push(p);
  const order = Object.keys(groups).sort((a, b) => lineOrder(a) - lineOrder(b) || a.localeCompare(b));

  let rows = '';
  for (const line of order) {
    const rank = p => (p.stage === DISC ? -1 : p.stage); // descontinuados al final
    const ps = groups[line].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
    const closed = !!UI.collapsed[line];
    const counts = STAGES.map(s => ps.filter(p => p.stage === s.n).length);
    rows += `<div class="g-row g-group ${closed ? 'closed' : ''}" data-group="${esc(line)}">
      <div class="g-left">${ICON.chev}<span>${esc(line)}</span><span class="n">${ps.length}</span>
        <span class="mini-stack" title="${STAGES.map((s, i) => counts[i] ? `${s.name}: ${counts[i]}` : '').filter(Boolean).join(' · ')}">${STAGES.map((s, i) => counts[i] ? `<i style="width:${counts[i] / ps.length * 100}%;background:${s.c}"></i>` : '').join('')}</span></div>
      <div class="g-right" style="width:${width}px"></div></div>`;
    if (closed) continue;

    for (const p of ps) {
      const st = stage(p.stage);
      const resps = stageResp(p.stage);
      const resp = resps[0] || '';
      const sa = activeSample(p);
      const pct = p.stage === DISC ? 0 : Math.round(Math.min(p.stage, LAST_ACTIVE_STAGE) / LAST_ACTIVE_STAGE * 100);
      let evs = eventsOf(p);
      if (!evs.length) evs = [{ stage: p.stage, at: p.created_at || nowIso() }];
      // Producto en Venta: solo se dibuja la Venta, desde su entrada a sala hasta hoy.
      const onSale = p.stage === SALE && saleSince(p);
      if (onSale) evs = [{ stage: SALE, at: saleSince(p), by: '' }];
      // Producto en Producción: la barra naranja parte en la fecha del pedido en curso.
      const prodStart = productionSince(p);
      if (prodStart) evs = [...evs.filter(e => e.at < prodStart && e.stage !== PRODUCTION), { stage: PRODUCTION, at: prodStart, by: '' }];

      // Una sola barra continua: cada etapa ocupa desde su fecha de inicio hasta el
      // cambio siguiente (o hasta hoy, si es la actual) y toma el color de su etapa.
      const segs = [];
      evs.forEach((e, i) => {
        const last = i === evs.length - 1;
        const endD = last ? new Date(today.getTime() + DAY) : startOfDay(evs[i + 1].at);
        const [l, r] = clampSeg(x(e.at), x(endD));
        if (r <= l) return; // fuera del rango, o cambio de etapa el mismo día
        segs.push({ e, l, r, last, days: Math.max(1, daysBetween(e.at, endD)), endD });
      });
      let bars = '';
      segs.forEach((g, i) => {
        const s2 = stage(g.e.stage);
        const w = g.r - g.l;
        const cls = (i === 0 ? ' first' : '') + (i === segs.length - 1 ? ' last' : '') + (g.last ? ' current' : '');
        const label = w > 120 ? `${s2.name} · ${g.days} d` : w > 70 ? s2.short : w > 40 ? `${g.days} d` : '';
        bars += `<div class="bar seg${cls}" data-bar="${esc(p.id)}" style="left:${g.l}px;width:${w}px;background:${s2.c}" title="${esc(s2.name)} · ${fmtDay(g.e.at)} → ${g.last ? 'hoy' : fmtDay(g.endD)} · ${g.days} día${g.days > 1 ? 's' : ''}${g.e.by ? ' · ' + esc(g.e.by) : ''}">
          <span>${esc(label)}</span>${g.last && resp && w > 150 ? `<span style="margin-left:auto">${avatarStack(resps)}</span>` : ''}</div>`;
      });
      if (sa) {
        const t = sampleTime(sa);
        const [l, r] = clampSeg(Math.max(x(today) + U, xNow(sa.started_at)), xNow(sa.due_at));
        if (r > l) bars += `<div class="bar ghost ${t.cls}" data-bar="${esc(p.id)}" style="left:${l + 1}px;width:${r - l - 2}px" title="${esc(sa.round)} vence ${fmtDay(sa.due_at)}"><span>${r - l > 90 ? `${esc(sa.round)} · vence ${fmtShort(sa.due_at)}` : ''}</span></div>`;
      }
      // Llegada: franja punteada desde hoy hasta la fecha (CHI si existe, si no la aproximada) y una bandera.
      const eta = productEta(p);
      if (eta) {
        const d = parseDay(eta.date);
        const late = d < today;
        if (!sa && !late && p.stage >= PRODUCTION && p.stage < ARRIVAL) {
          const [l, r] = clampSeg(x(today) + U, x(d));
          if (r > l + 4) bars += `<div class="bar ghost eta-ghost" data-bar="${esc(p.id)}" style="left:${l + 1}px;width:${r - l - 2}px" title="Llegada ${eta.chi ? 'según CHI' : 'aproximada'} ${fmtDay(eta.date)}"><span>${r - l > 140 ? `Faltan ${daysBetween(today, d)} días` : ''}</span></div>`;
        }
        if ((p.stage < ARRIVAL || eta.order) && x(d) >= 0 && x(d) <= width) bars += `<div class="mk eta ${late ? 'late' : ''}" data-bar="${esc(p.id)}" style="left:${x(d) + 2}px" title="${late ? 'Atrasado · ' : ''}Llegada ${eta.chi ? 'a bodega según CHI' : 'aproximada'} ${fmtDay(eta.date)}${eta.order ? ' · ' + esc(orderLabel(eta.order, p).text) : ''}">${ICON.flag} ${fmtShort(eta.date)}${eta.chi ? ' CHI' : ''}</div>`;
      }
      // Proceso de cada reposición: franja verde fina bajo la barra, desde el correo hasta la llegada.
      for (const k of orderKinds(p)) {
        if (k.kind !== 'repo') continue;
        const o = k.o, open = !o.arrived_at;
        const be = bestEta(o);
        const endD = o.arrived_at ? parseDay(o.arrived_at) : (be && parseDay(be) > today ? parseDay(be) : new Date(today.getTime() + DAY));
        const [l, r] = clampSeg(x(o.date) + U / 2, Math.max(x(endD), x(o.date) + U));
        if (r > l) bars += `<div class="repo-line ${open ? 'open' : ''}" style="left:${l}px;width:${r - l}px" title="${esc(k.text)} · enviada ${fmtDay(o.date)} · ${o.arrived_at ? 'llegó ' + fmtDay(o.arrived_at) : be ? 'llega ' + fmtDay(be) : 'sin fecha de llegada'}"></div>`;
      }
      for (const o of ordersOf(p)) {
        const lab = orderLabel(o, p);
        const ox = x(o.date) + U / 2;
        if (ox >= 0 && ox <= width) bars += `<div class="mk ${lab.kind}" data-order="${esc(o.id)}" style="left:${ox}px" title="${esc(lab.text)} · ${fmtDay(o.date)} · ${fmtInt(o.total)} u."></div>`;
      }

      const daysIn = daysBetween(evs[evs.length - 1].at, today);
      const repo = openRepo(p);
      const sale = saleSince(p);
      const sub = prodStart
        ? `en producción desde ${fmtShort(prodStart)} · ${weeksSince(prodStart)} sem`
        : sale && p.stage !== DISC && (p.stage >= SALE || alreadySelling(p))
        ? `en sala desde ${fmtShort(sale)} · ${daysBetween(sale, today) + 1} d`
        : `día ${daysIn + 1} en etapa`;
      // Contador de reposiciones al lado de la etapa: "Repo N" (verde lleno si la última aún no llega).
      // Se muestra siempre en Venta / Reposición (aunque sea 0) y en cualquier etapa si ya hay reposiciones.
      const repos = orderKinds(p).filter(k => k.kind === 'repo');
      const lastRepo = repos[repos.length - 1];
      const nRepo = repoCount(p);
      const showRepo = nRepo > 0 || p.had_first_order || (p.stage >= ARRIVAL && p.stage !== DISC);
      const repoChip = showRepo ? `<span class="repo-count ${repo ? 'open' : ''} ${nRepo ? '' : 'zero'}" data-repo-count="${esc(p.id)}" title="${nRepo} ${nRepo === 1 ? 'reposición' : 'reposiciones'}${lastRepo ? ` · última enviada ${fmtDay(lastRepo.o.date)}` : ''}${repo ? ` · en curso${bestEta(repo.order) ? ', llega ' + fmtDay(bestEta(repo.order)) : ''}` : ''} · clic para cambiar el número">${repo ? '↻ ' : ''}Repo ${nRepo}</span>` : '';
      const al = arrivalAlert(p);
      const alertChip = al ? `<span class="alert-chip ${al.level}" title="${al.level === 'late' ? 'Atrasado: la llegada era el' : 'Llega pronto:'} ${fmtDay(al.date)}${al.chi ? ' (CHI)' : ''}">${ICON.flag} ${al.level === 'late' ? `${-al.dd} d tarde` : al.dd === 0 ? 'hoy' : `${al.dd} d`}</span>` : '';
      rows += `<div class="g-row ${UI.drawer === p.id ? 'sel' : ''}" data-id="${esc(p.id)}">
        <div class="g-left">
          <div class="p-name" data-open="${esc(p.id)}"><span class="dot" style="background:${st.c}"></span>
            <div class="txt"><span class="nm">${esc(p.name)}</span><span class="cd">${esc(p.code)} · ${sub}</span></div>
            ${sa ? timerChip(sa) : ''}${alertChip}</div>
          <div class="c-stage"><select class="pill-select" data-stage-of="${esc(p.id)}" style="${pillStyle(p.stage)}" title="Etapa">${STAGES.map(s => `<option value="${s.n}"${s.n === p.stage ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>${onSale ? `<span class="stage-date" title="En sala desde ${fmtDay(saleSince(p))}">${fmtShort(saleSince(p))}</span>` : prodStart ? `<span class="stage-date prod" title="En producción desde ${fmtDay(prodStart)} · ${weeksSince(prodStart)} semanas">${weeksSince(prodStart)} sem</span>` : ''}${repoChip}</div>
          <div class="c-resp"><button class="resp-cell" data-open-config title="Responsables de ${esc(st.name)} (se editan en Configuración)">${avatarStack(resps)}<span>${resps.length ? esc(resps.length === 1 ? resps[0] : resps.map(r => r.split(' ')[0]).join(', ')) : 'Sin asignar'}</span></button></div>
          <div class="c-prog"><div class="progress"><div class="track"><i style="width:${pct}%;background:${st.c}"></i></div><span>${pct}%</span></div></div>
        </div>
        <div class="g-right ${zoom === 'dia' ? 'grid' : ''}" style="width:${width}px;--day-w:${U}px">${zoom === 'dia' ? '' : grid}${showToday ? `<div class="today-line" style="left:${todayX}px"></div>` : ''}${bars}</div>
      </div>`;
    }
  }
  if (!list.length) rows = `<div class="empty"><p>No hay productos con estos filtros.</p></div>`;

  // Aviso de próximas llegadas y atrasos (productos visibles con los filtros actuales).
  const alerts = list.map(p => ({ p, a: arrivalAlert(p) })).filter(x => x.a).sort((a, b) => a.a.dd - b.a.dd);
  const late = alerts.filter(x => x.a.level === 'late'), soon = alerts.filter(x => x.a.level === 'soon');
  const alertBar = alerts.length ? `<div class="alert-bar ${late.length ? 'late' : ''}">${ICON.flag}
    ${late.length ? `<span><b>${late.length} atrasado${late.length > 1 ? 's' : ''}:</b> ${late.slice(0, 4).map(x => `<a data-open="${esc(x.p.id)}">${esc(x.p.name)}</a>`).join(', ')}${late.length > 4 ? '…' : ''}</span>` : ''}
    ${soon.length ? `<span><b>Llegan en los próximos ${alertDays()} días:</b> ${soon.slice(0, 4).map(x => `<a data-open="${esc(x.p.id)}">${esc(x.p.name)}</a> (${x.a.dd === 0 ? 'hoy' : x.a.dd + ' d'})`).join(', ')}${soon.length > 4 ? '…' : ''}</span>` : ''}
  </div>` : '';

  const floorFix = S.products.filter(inFloorButOther);
  const fixBar = floorFix.length ? `<div class="alert-bar fix">${ICON.info}<span><b>${floorFix.length} producto${floorFix.length > 1 ? 's' : ''} ya en sala</b> aparece${floorFix.length > 1 ? 'n' : ''} en otra etapa (${floorFix.slice(0, 3).map(p => esc(p.name)).join(', ')}${floorFix.length > 3 ? '…' : ''}).</span><button class="btn sm" id="floor-fix">Pasar a Venta</button></div>` : '';

  return `${fixBar}${alertBar}<div class="gantt">
    <div class="g-row g-head">
      <div class="g-left"><div>Producto</div><div>Etapa</div><div class="c-resp">Responsable</div><div class="c-prog">Avance</div></div>
      <div class="g-right" style="width:${width}px"><div class="months">${top}</div><div class="ticks">${ticks}</div></div>
    </div>${rows}</div>`;
}

// ---------- Muestras ----------
function samplesHtml() {
  const active = S.samples.filter(s => s.status === 'en_curso').sort((a, b) => a.due_at.localeCompare(b.due_at));
  const espera = S.samples.filter(s => s.status === 'esperando' && productById(s.product_id));
  const closed = S.samples.filter(s => s.status !== 'en_curso' && s.status !== 'esperando').sort((a, b) => (b.closed_at || '').localeCompare(a.closed_at || ''));
  const waiting = S.products.filter(p => p.stage === 2 && !activeSample(p) && !waitingSample(p));
  const card = s => {
    const p = productById(s.product_id); if (!p) return '';
    const t = sampleTime(s);
    const all = samplesOf(p);
    return `<div class="sample-card ${t.cls}">
      <div class="top"><div style="flex:1;min-width:0"><div class="t" data-open="${esc(p.id)}">${esc(p.name)}</div><div class="meta">${esc(p.line)} · ${esc(s.round)} · inició ${fmtDay(s.started_at)}</div></div>${timerChip(s)}</div>
      <div class="rounds" title="Rondas de muestra">${ROUNDS.map(r => {
        const x = all.filter(a => a.round === r).pop();
        return `<i class="${!x ? '' : x.status === 'aprobada' ? 'done-ok' : x.status === 'rechazada' ? 'done-bad' : 'cur'}" title="${r}${x ? ' · ' + x.status.replace('_', ' ') : ''}"></i>`;
      }).join('')}</div>
      <div style="display:flex;align-items:flex-end;gap:10px"><div class="clock" data-clock="${esc(s.id)}">${t.ms > 0 ? `${t.d}<small> días </small>${t.h}<small> h</small>` : `<span style="color:var(--danger)">Vencida</span>`}</div>
        <div class="spacer"></div><small class="meta">vence ${fmtDay(s.due_at)}</small></div>
      <div class="ttrack"><i style="width:${t.elapsed * 100}%"></i></div>
      ${(() => { const prev = all.filter(a => a.status === 'rechazada' && a.note).pop(); return prev ? `<div class="sub" style="font-size:12px;color:var(--danger);background:rgba(229,72,77,.08);border-radius:8px;padding:6px 8px"><b>Rechazo de ${esc(prev.round)}:</b> ${esc(prev.note)}</div>` : ''; })()}
      <div class="person-select" style="border:1px solid var(--line-soft);border-radius:8px;padding:4px 8px">${avatar(s.responsable, 'sm')}<select data-sample-resp="${esc(s.id)}">${peopleOptions(s.responsable)}</select></div>
      <div class="row-actions"><button class="btn sm" data-sample-ok="${esc(s.id)}" style="color:var(--ok)">✓ Aprobar</button><button class="btn sm" data-sample-bad="${esc(s.id)}" style="color:var(--danger)">✕ Rechazar</button></div>
    </div>`;
  };
  const cardEspera = s => {
    const p = productById(s.product_id); const all = samplesOf(p);
    const prev = all.filter(a => a.status === 'rechazada').pop();
    return `<div class="sample-card espera">
      <div class="top"><div style="flex:1;min-width:0"><div class="t" data-open="${esc(p.id)}">${esc(p.name)}</div><div class="meta">${esc(p.line)} · sigue en Producción</div></div><span class="tag espera-tag">Pendiente</span></div>
      <div class="rounds" title="Rondas de muestra">${ROUNDS.map(r => { const x = all.filter(a => a.round === r).pop(); return `<i class="${!x ? '' : x.status === 'aprobada' ? 'done-ok' : x.status === 'rechazada' ? 'done-bad' : x.status === 'esperando' ? 'wait' : 'cur'}" title="${r}${x ? ' · ' + (x.status === 'esperando' ? 'en espera' : x.status.replace('_', ' ')) : ''}"></i>`; }).join('')}</div>
      <div class="espera-txt"><b>Esperando ${esc(s.round)}</b><span>Se está fabricando · sin contador hasta que llegue</span></div>
      ${prev && prev.note ? `<div class="sub" style="font-size:12px;color:var(--danger);background:rgba(229,72,77,.08);border-radius:8px;padding:6px 8px"><b>Rechazo de ${esc(prev.round)} (${fmtDay(prev.closed_at)}):</b> ${esc(prev.note)}</div>` : ''}
      <div class="row-actions"><button class="btn sm primary" data-sample-arrive="${esc(s.id)}">${ICON.flask} Llegó la ${esc(s.round)} · iniciar ${SAMPLE_DAYS} días</button></div>
    </div>`;
  };
  return `
    <div class="callout" style="margin:8px 0 14px">${ICON.clock}<div>Cada ronda (Muestra 1, 2, 3 y Final) tiene <b>${SAMPLE_DAYS} días corridos</b> para aprobarse o rechazarse. Al <b>rechazar</b>, la siguiente ronda queda <b>pendiente</b> (sin contador) mientras se fabrica; cuando llegue, toca «Llegó la muestra» y parten los ${SAMPLE_DAYS} días. Aprobar abre la Muestra Final, y aprobar la Final ofrece pasar a Producción.</div></div>
    ${espera.length ? `<h3 style="margin:4px 0 10px">Pendientes · esperando que llegue la nueva muestra <span class="sub">(${espera.length} prenda${espera.length === 1 ? '' : 's'})</span></h3><div class="samples-grid" style="margin-bottom:16px">${espera.map(cardEspera).join('')}</div>` : ''}
    ${waiting.length ? `<div class="card" style="margin-bottom:14px"><h3>En etapa Muestras sin ronda activa <span class="sub">${waiting.length}</span></h3>${waiting.map(p => `<div class="list-item"><span class="dot" style="background:${stage(2).c}"></span><div class="grow"><b>${esc(p.name)}</b> <span class="sub">· ${esc(p.line)}</span></div><button class="btn sm" data-start-sample="${esc(p.id)}">${ICON.flask} Iniciar muestra</button></div>`).join('')}</div>` : ''}
    ${active.length ? `<div class="samples-grid">${active.map(card).join('')}</div>` : `<div class="empty"><div class="ic">${ICON.flask}</div><h2>No hay muestras en curso</h2><p>Cuando un producto pasa a la etapa <b>Muestras</b> se abre la Muestra 1 automáticamente con su reloj de ${SAMPLE_DAYS} días.</p></div>`}
    ${closed.length ? `<div class="card"><h3>Historial de muestras</h3><table class="tbl"><thead><tr><th>Producto</th><th>Ronda</th><th>Inicio</th><th>Cierre</th><th>Días</th><th>Responsable</th><th>Resultado</th><th>Comentario</th></tr></thead><tbody>${closed.map(s => {
      const p = productById(s.product_id);
      return `<tr><td>${esc(p ? p.name : '—')}</td><td>${esc(s.round)}</td><td>${fmtDay(s.started_at)}</td><td>${fmtDay(s.closed_at)}</td><td class="num">${daysBetween(s.started_at, s.closed_at)}</td><td>${esc(s.responsable || '—')}</td><td>${sampleTag(s)}</td><td class="sub" style="max-width:320px;white-space:normal">${esc(s.note || '')}</td></tr>`;
    }).join('')}</tbody></table></div>` : ''}`;
}

// ---------- Pedidos y reposiciones ----------
const monthKey = d => { const x = parseDay(d); return x ? `${x.getFullYear()}-${pad(x.getMonth() + 1)}` : ''; };
const monthLabel = ym => { const d = monthStart(ym); return d ? `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : ym; };
// Meses consecutivos entre dos claves 'YYYY-MM' (ambas incluidas).
function monthRange(a, b) {
  const out = [];
  for (let d = monthStart(a); d && d <= monthStart(b); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(monthKey(d));
  return out;
}

// Gráfico de barras por mes (SVG). items: [{ key, label, value, value2? }]; value2 se apila (reposiciones).
function monthBarsSvg(items, { selected = '', clickable = false, unit = 'u.', legend } = {}) {
  if (!items.length) return '<div class="sub" style="color:var(--faint)">Sin datos en el periodo.</div>';
  const W = Math.max(320, items.length * 56), H = 190, padB = 28, padT = 18;
  const max = Math.max(1, ...items.map(i => (i.value || 0) + (i.value2 || 0)));
  const bw = Math.min(34, (W / items.length) * .6);
  const y = v => H - padB - (v / max) * (H - padB - padT);
  let g = '';
  items.forEach((it, i) => {
    const cx = (i + .5) * (W / items.length);
    const v1 = it.value || 0, v2 = it.value2 || 0, tot = v1 + v2;
    const sel = selected && selected === it.key;
    const dim = selected && !sel ? ' opacity=".35"' : '';
    g += `<g${clickable ? ` class="mb" data-month="${esc(it.key)}"` : ''}${dim}>
      <title>${esc(it.label)}: ${fmtInt(tot)} ${unit}${v2 ? ` (pedidos ${fmtInt(v1)} · reposiciones ${fmtInt(v2)})` : ''}</title>
      <rect x="${cx - W / items.length / 2}" y="0" width="${W / items.length}" height="${H}" fill="transparent"/>
      ${v1 ? `<rect x="${cx - bw / 2}" y="${y(v1)}" width="${bw}" height="${H - padB - y(v1)}" rx="4" fill="${legend ? '#111827' : '#3B6EF5'}"/>` : ''}
      ${v2 ? `<rect x="${cx - bw / 2}" y="${y(tot)}" width="${bw}" height="${y(v1) - y(tot)}" rx="4" fill="#34C27A"/>` : ''}
      ${tot ? `<text x="${cx}" y="${y(tot) - 5}" text-anchor="middle" class="mb-v">${fmtInt(tot)}</text>` : ''}
      <text x="${cx}" y="${H - 9}" text-anchor="middle" class="mb-l${sel ? ' sel' : ''}">${esc(it.label)}</text></g>`;
  });
  return `<div style="overflow-x:auto"><svg class="mbars" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Unidades por mes">
    <line x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}" stroke="var(--line)"/>${g}</svg></div>
    ${legend ? `<div class="legend"><span><i style="background:#111827"></i>Pedidos</span><span><i style="background:#34C27A"></i>Reposiciones</span></div>` : ''}`;
}

// Unidades pedidas por mes, separando primer pedido y reposiciones.
function ordersByMonth(orders, from, to) {
  const keys = orders.map(o => monthKey(o.date)).filter(Boolean).sort();
  if (!keys.length && !(from && to)) return [];
  const a = from || keys[0], b = to || keys[keys.length - 1] || a;
  return monthRange(a, b).map(k => {
    const os = orders.filter(o => monthKey(o.date) === k);
    const ped = os.filter(o => orderLabel(o).kind === 'pedido').reduce((s, o) => s + o.total, 0);
    const rep = os.filter(o => orderLabel(o).kind === 'repo').reduce((s, o) => s + o.total, 0);
    return { key: k, label: monthLabel(k), value: ped, value2: rep, count: os.length };
  });
}

function ordersHtml() {
  const all = [...S.orders].sort((a, b) => orderSort(b, a));
  if (!all.length) return `<div class="empty"><div class="ic">${ICON.doc}</div><h2>Aún no hay envíos registrados</h2>
    <p>Sube el Excel que envías a gerencia. El primero de cada producto queda como <b>Pedido</b> y los siguientes como <b>Reposición 1, 2, 3…</b></p>
    <button class="btn primary" data-upload-any>${ICON.upload} Subir Excel</button></div>`;
  const nq = norm(UI.oQ);
  const os = all.filter(o =>
    (!UI.oMonth || monthKey(o.date) === UI.oMonth) &&
    (!UI.oKind || orderLabel(o).kind === UI.oKind) &&
    (!nq || norm(`${o.title} ${(o.product_ids || []).map(id => (productById(id) || {}).name).join(' ')}`).includes(nq)));
  const months = [...new Set(all.map(o => monthKey(o.date)).filter(Boolean))].sort().reverse();
  const units = os.reduce((a, o) => a + o.total, 0);
  const chartOrders = all.filter(o => (!UI.oKind || orderLabel(o).kind === UI.oKind));
  return `
  <div class="toolbar" style="padding:8px 0 4px">
    <div class="search">${ICON.search}<input id="o-q" placeholder="Buscar producto o documento" value="${esc(UI.oQ)}"></div>
    <select class="select" id="o-month"><option value="">Todos los meses</option>${months.map(m => `<option value="${m}"${m === UI.oMonth ? ' selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}</select>
    <select class="select" id="o-kind"><option value="">Pedidos y Reposiciones</option><option value="pedido"${UI.oKind === 'pedido' ? ' selected' : ''}>Solo pedidos</option><option value="repo"${UI.oKind === 'repo' ? ' selected' : ''}>Solo reposiciones</option></select>
    <div class="spacer"></div>
    <span class="tag blue" style="height:28px;font-size:12.5px">${os.length} envío${os.length === 1 ? '' : 's'} · ${fmtInt(units)} unidades${UI.oMonth ? ' en ' + esc(monthLabel(UI.oMonth)) : ''}</span>
  </div>
  <div class="card" style="margin:8px 0 14px"><h3>Unidades pedidas por mes <span class="sub">clic en un mes para filtrar</span></h3>
    ${monthBarsSvg(ordersByMonth(chartOrders), { selected: UI.oMonth, clickable: true, legend: !UI.oKind })}</div>
  ${os.length ? '' : '<div class="empty"><p>No hay envíos con estos filtros.</p></div>'}
  <table class="tbl" style="margin-top:8px;${os.length ? '' : 'display:none'}"><thead><tr><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Productos</th><th class="num">Unidades</th><th>Colores</th><th>Estado</th><th>Llegada</th><th>Enviado por</th><th></th></tr></thead><tbody>
    ${os.map(o => {
      const lab = orderLabel(o);
      const prods = (o.product_ids || []).map(productById).filter(Boolean);
      const byColor = {};
      for (const l of o.lines || []) byColor[l.color] = (byColor[l.color] || 0) + l.qty;
      return `<tr class="click" data-order-row="${esc(o.id)}">
        <td style="white-space:nowrap"><b>${fmtDay(o.date)}</b></td>
        <td><span class="tag ${lab.kind}">${esc(lab.text)}</span></td>
        <td>${esc(o.title || '—')}</td>
        <td>${prods.map(p => `<div style="display:flex;gap:6px;align-items:center;white-space:nowrap"><span class="dot" style="background:${stage(p.stage).c}"></span>${esc(p.name)}</div>`).join('')}</td>
        <td class="num"><b>${fmtInt(o.total)}</b>${o.shared ? `<div class="sub" style="font-size:10.5px;color:var(--faint);white-space:nowrap" title="Pedido compartido: ${fmtInt(o.total_all)} u. en total">de ${fmtInt(o.total_all)} · ${sharedTxt(o)}</div>` : ''}</td>
        <td>${Object.entries(byColor).map(([c, n]) => `<span class="tag" style="margin:1px">${esc(c)} · ${fmtInt(n)}</span>`).join('')}</td>
        <td><span class="tag blue">${esc(o.status || '—')}</span></td>
        <td style="white-space:nowrap">${o.arrived_at ? `<span class="tag ok">Llegó ${fmtDay(o.arrived_at)}</span><div class="sub" style="font-size:11px;color:var(--faint)">${daysBetween(parseDay(o.date), parseDay(o.arrived_at))} días</div>` : o.eta ? `${fmtDay(o.eta)}<div class="sub" style="font-size:11px;color:var(--faint)">estimada</div>` : '—'}</td>
        <td><div style="display:flex;gap:6px;align-items:center">${avatar(o.sent_by, 'sm')}${esc(o.sent_by || '—')}</div></td>
        <td>${o.file_id ? `<button class="icon-btn" data-dl="${esc(o.file_id)}" title="Descargar Excel">${ICON.download}</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

// ---------- Resumen ----------
function summaryHtml() {
  const P = S.products;
  const active = S.samples.filter(s => s.status === 'en_curso');
  const late = active.filter(s => sampleTime(s).ms <= 0);
  const soon = active.filter(s => sampleTime(s).ms > 0 && sampleTime(s).ms <= 3 * DAY);
  const now = new Date();
  const monthOrders = S.orders.filter(o => { const d = parseDay(o.date); return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const units = S.orders.reduce((a, o) => a + (o.total || 0), 0);
  const max = Math.max(1, ...STAGES.map(s => P.filter(p => p.stage === s.n).length));
  const lines = [...new Set(P.map(p => p.line))].sort((a, b) => lineOrder(a) - lineOrder(b));
  const unassigned = STAGES.filter(s => s.n !== DISC && !stageResp(s.n).length).length;

  return `
  <div class="kpis">
    <div class="kpi"><div class="l">Productos</div><div class="v">${P.length}</div><div class="s">${lines.length} líneas</div></div>
    <div class="kpi"><div class="l">Muestras en curso</div><div class="v">${active.length}</div><div class="s">${soon.length} vencen en ≤ 3 días</div></div>
    <div class="kpi ${late.length ? 'alert' : ''}"><div class="l">Muestras vencidas</div><div class="v">${late.length}</div><div class="s">sin aprobar ni rechazar</div></div>
    <div class="kpi"><div class="l">Envíos este mes</div><div class="v">${monthOrders.length}</div><div class="s">${fmtInt(monthOrders.reduce((a, o) => a + o.total, 0))} unidades</div></div>
    <div class="kpi"><div class="l">Unidades solicitadas</div><div class="v">${fmtInt(units)}</div><div class="s">${S.orders.length} pedidos y reposiciones</div></div>
    <div class="kpi"><div class="l">Etapas sin responsable</div><div class="v">${unassigned}</div><div class="s">se asignan en Configuración</div></div>
  </div>
  <div class="cards">
    <div class="card"><h3>Productos por etapa</h3>
      ${STAGES.map(s => { const n = P.filter(p => p.stage === s.n).length; return `<div class="hbar"><div class="lab"><span class="dot" style="background:${s.c}"></span>${s.n} · ${esc(s.name)}</div><div class="tr"><i style="width:${n / max * 100}%;background:${s.c}"></i></div><div class="n">${n}</div></div>`; }).join('')}
    </div>
    <div class="card"><h3>Etapas por línea</h3>
      <table class="tbl matrix"><thead><tr><th>Línea</th>${STAGES.map(s => `<th title="${esc(s.name)}"><span class="dot" style="background:${s.c};display:inline-block"></span></th>`).join('')}<th>Total</th></tr></thead><tbody>
      ${lines.map(l => { const ps = P.filter(p => p.line === l); return `<tr><td><b>${esc(l)}</b></td>${STAGES.map(s => { const n = ps.filter(p => p.stage === s.n).length; return `<td>${n ? `<div class="cell-tint" style="background:${hexA(s.c, .18)};color:${shade(s.c)}">${n}</div>` : '<span style="color:var(--faint)">·</span>'}</td>`; }).join('')}<td><b>${ps.length}</b></td></tr>`; }).join('')}
      </tbody></table>
      <div class="sub" style="margin-top:8px;font-size:11px;color:var(--faint)">${STAGES.map(s => `${s.n} ${s.short}`).join(' · ')}</div>
    </div>
    <div class="card"><h3>Muestras más urgentes</h3>
      ${active.length ? [...active].sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 6).map(s => { const p = productById(s.product_id); return p ? `<div class="list-item click" data-open="${esc(p.id)}"><div class="grow"><b>${esc(p.name)}</b><div class="sub">${esc(s.round)} · ${esc(s.responsable || 'sin responsable')}</div></div>${timerChip(s)}</div>` : ''; }).join('') : '<div class="sub" style="color:var(--faint)">No hay muestras en curso.</div>'}
    </div>
    <div class="card" style="grid-column:1 / -1"><h3>Qué pedir <span class="sub">sugerido por producto · clic para ver color y talla</span>
      <button class="btn sm" data-sug-xlsx style="margin-left:auto">${ICON.download} Descargar Excel</button></h3>
      ${sugSummaryHtml(8)}
    </div>
    <div class="card"><h3>Últimos envíos a gerencia</h3>
      ${S.orders.length ? [...S.orders].sort((a, b) => orderSort(b, a)).slice(0, 6).map(o => { const lab = orderLabel(o); return `<div class="list-item click" data-order-row="${esc(o.id)}"><span class="tag ${lab.kind}">${esc(lab.text)}</span><div class="grow"><b>${esc(o.title)}</b><div class="sub">${fmtDay(o.date)} · ${esc(o.status || '')}</div></div><b>${fmtInt(o.total)}</b></div>`; }).join('') : '<div class="sub" style="color:var(--faint)">Aún no hay envíos.</div>'}
    </div>
  </div>`;
}

// ============================================================
// Informe de ventas (Excel de Manager): ventas y stock reales por código (producto + color + talla).
// Cada informe se guarda con su fecha; con dos o más se calcula el ritmo reciente.
// ============================================================
function isSalesWorkbook(wb) {
  return wb.SheetNames.some(n => {
    const rows = sheetRows(wb.Sheets[n]).slice(0, 3);
    return rows.some(r => r.some(c => norm(c) === 'CODIGO') && r.some(c => norm(c).startsWith('UNIDADES VENDIDAS')) && r.some(c => norm(c).startsWith('STOCK TOTAL')));
  });
}

const SR_GENERIC = new Set(['CHALECO', 'BUZO', 'GEOLOGO', 'PANTALON', 'POLERA', 'POLERON', 'PARKA', 'CHAQUETA', 'K8', 'K18', '360', 'PILOT']);
function parseSalesReport(wb) {
  // Período: "Período: 01-01-2026 al 18-10-2026" en la hoja de resumen.
  let start = null, end = null;
  for (const n of wb.SheetNames) for (const r of sheetRows(wb.Sheets[n]).slice(0, 6)) for (const c of r) {
    const m = /(\d{1,2}-\d{1,2}-\d{4})\s+al\s+(\d{1,2}-\d{1,2}-\d{4})/.exec(String(c));
    if (m && !end) { start = isoDay(parseDay(m[1])); end = isoDay(parseDay(m[2])); }
  }
  const rows = [];
  for (const n of wb.SheetNames) {
    const all = sheetRows(wb.Sheets[n]);
    const hi = all.findIndex(r => r.some(c => norm(c) === 'CODIGO') && r.some(c => norm(c).startsWith('UNIDADES VENDIDAS')));
    if (hi < 0) continue;
    const H = all[hi].map(norm);
    const col = k => H.findIndex(h => h.startsWith(k));
    const c = {
      code: col('CODIGO'), desc: col('DESCRIPCION'), c1: col('CLASE 1'), c2: col('CLASE 2'), units: col('UNIDADES VENDIDAS'),
      net: col('VENTA NETA'), docs: col('N° DOC') >= 0 ? col('N° DOC') : col('N DOC'), clients: col('N° CLIENTES') >= 0 ? col('N° CLIENTES') : col('N CLIENTES'),
      first: col('PRIMERA VENTA'), last: col('ULTIMA VENTA'), stock: col('STOCK TOTAL'), price: col('PRECIO'), abc: col('CLASIFICACION'), obs: col('OBSERVACION'),
    };
    for (const r of all.slice(hi + 1)) {
      const code = String(r[c.code] ?? '').trim();
      if (!code || norm(code) === 'TOTAL') continue;
      const desc = String(r[c.desc] ?? '').trim();
      const family = String(r[c.c2] ?? '').trim() || String(r[c.c1] ?? '').trim() || desc;
      const sizeM = /\(([^)]+)\)\s*$/.exec(desc);
      const size = sizeM ? sizeM[1].trim() : 'Única';
      // Color: la descripción sin la talla, sin las palabras de la familia ni las genéricas.
      const famT = new Set(norm(family).split(/\s+/));
      const colorWords = norm(desc.replace(/\([^)]*\)\s*$/, '')).split(/\s+/).filter(w => w && !famT.has(w) && !SR_GENERIC.has(w));
      const color = titleCase(colorWords.join(' ').replace(/\s*\/\s*/g, ' / ')) || 'Único';
      const num = i => (i >= 0 ? Number(r[i]) || 0 : 0);
      const dt = i => { const d = i >= 0 ? cellToDate(r[i]) : null; return d ? isoDay(d) : null; };
      rows.push({
        code, desc, family, color, size, colorKey: code.split('.').slice(0, 3).join('.'),
        units: num(c.units), net: num(c.net), docs: num(c.docs), clients: num(c.clients),
        first: dt(c.first), last: dt(c.last), stock: num(c.stock), price: num(c.price),
        abc: c.abc >= 0 ? String(r[c.abc] ?? '').trim() : '', obs: c.obs >= 0 ? String(r[c.obs] ?? '').trim() : '',
      });
    }
  }
  if (!end) end = rows.map(r => r.last).filter(Boolean).sort().pop() || isoDay(new Date());
  return { start, date: end, rows };
}

const MIN_RATE_DAYS = 90;
const salesMap = () => ({ ...PBI_MAP, ...getSetting('sales_map', {}) });
// (23-11) Informe AUTOMÁTICO desde el Power BI: toma el último Excel de Manager subido como base (familias, colores, tallas
// y STOCK real a su fecha) y le suma las ventas diarias del Power BI (../k8-panel/data/pbi-ventas-sku.json, se actualiza
// solo). Stock de hoy = stock del Excel − lo vendido después (no hubo recepciones registradas). Validado: al 18-10 las
// unidades del Power BI son idénticas al Excel código por código. No se guarda: se rearma cada vez que se abre la app.
let PBI_REP = null, PBI_MAP = {};   // PBI_MAP: familias nuevas del Power BI asignadas solas a su producto (no se guarda)
async function cargarVentasPbi() {
  try {
    const r = await fetch('../k8-panel/data/pbi-ventas-sku.json?x=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const D = await r.json(); const base = [...S.salesreports].sort((a, b) => a.date.localeCompare(b.date)).pop();
    if (!base || !D || !D.hasta || D.hasta <= base.date) { PBI_REP = null; return; }
    const pref = c => String(c).split('.').slice(0, 2).join('.');
    const bmap = {}; for (const x of base.rows) bmap[x.code] = x;
    const fams = {}; for (const x of base.rows) fams[pref(x.code)] = fams[pref(x.code)] || x;   // familia de cada prefijo (WOR.100 → GEOPLUS K8)
    const start = base.start || D.desde, acc = {};
    for (const [cod, f, doc, rut, q, v, docs] of D.filas) {
      if (!fams[pref(cod)] || f < start || f > D.hasta) continue;
      const a = acc[cod] || (acc[cod] = { u: 0, uBase: 0, uDesp: 0, net: 0, docs: 0, ruts: new Set(), first: null, last: null });
      a.u += q; a.net += v; a.docs += docs; if (f <= base.date) a.uBase += q; else a.uDesp += q;
      if (q > 0) { if (rut) a.ruts.add(rut); if (!a.first || f < a.first) a.first = f; if (!a.last || f > a.last) a.last = f; }
    }
    // Productos que NO venían en el Excel pero tienen mercadería recibida registrada y ventas en el Power BI
    // (p. ej. Pantalón Treklite, Treklite Reflect, Buzo Reflect Lite): stock = recibido por talla y color − vendido desde que llegó.
    const N = s => norm(String(s || '').replace(/[°º]/g, ''));
    const asign = getSetting('sales_map', {}) || {}; const ya = new Set(Object.values(asign));
    const cand = S.products.filter(p => !ya.has(p.id)).map(p => ({ p, ws: N(p.name).split(/\s+/).filter(Boolean), rec: S.orders.filter(o => o.status === 'Recibido' && (o.product_ids || []).includes(p.id) && Array.isArray(o.lines)) })).filter(x => x.rec.length);
    const extra = {};   // prefijo de código → { p, fam, rec }
    for (const cod of Object.keys(D.desc || {})) {
      const k = pref(cod); if (fams[k] || extra[k] === null) continue;
      const d = N(D.desc[cod]).replace(/\(.*$/, ''); let best = null;
      for (const x of cand) if (x.ws.every(w => d.split(/\s+/).includes(w)) && (!best || x.ws.length > best.ws.length)) best = x;
      if (best && (!extra[k] || extra[k].p === best.p)) extra[k] = { p: best.p, fam: N(best.p.name), rec: best.rec };
    }
    PBI_MAP = {}; for (const e of Object.values(extra)) PBI_MAP[e.fam] = e.p.id;
    for (const [cod, f, doc, rut, q, v, docs] of D.filas) {
      const e = extra[pref(cod)]; if (!e || f < start || f > D.hasta) continue;
      const a = acc[cod] || (acc[cod] = { u: 0, uBase: 0, uDesp: 0, net: 0, docs: 0, ruts: new Set(), first: null, last: null, uRec: 0 });
      a.u += q; a.net += v; a.docs += docs; const desde = e.rec.map(o => o.date).sort()[0]; if (f >= desde) a.uRec = (a.uRec || 0) + q;
      if (q > 0) { if (rut) a.ruts.add(rut); if (!a.first || f < a.first) a.first = f; if (!a.last || f > a.last) a.last = f; }
    }
    const codes = new Set([...Object.keys(bmap), ...Object.keys(acc)]); const rows = []; const difs = [];
    for (const code of codes) {
      const b = bmap[code], a = acc[code] || { u: 0, uBase: 0, uDesp: 0, net: 0, docs: 0, ruts: new Set(), first: null, last: null };
      const e = !b && extra[pref(code)];
      const fam = b || fams[pref(code)] || (e ? { family: e.fam } : null); if (!fam) continue;
      const desc = b ? b.desc : (D.desc && D.desc[code]) || code;
      const sizeM = /\(([^)]+)\)\s*$/.exec(desc);
      if (e) {   // stock = lo recibido de esa talla y color − lo vendido desde que llegó
        const talla = sizeM ? N(sizeM[1]) : ''; const d = N(desc);
        const rec = e.rec.reduce((s, o) => s + o.lines.filter(l => N(l.size) === talla && (!l.color || d.includes(N(l.color)))).reduce((t, l) => t + (Number(l.qty) || 0), 0), 0);
        const stk = Math.round((rec - (a.uRec || 0)) * 100) / 100;
        rows.push({ code, desc, family: e.fam, color: titleCase(N(desc).replace(/\(.*$/, '').split(/\s+/).filter(w => !e.fam.split(/\s+/).includes(w) && !SR_GENERIC.has(w)).join(' ')) || 'Único', size: sizeM ? sizeM[1].trim() : 'Única', colorKey: code.split('.').slice(0, 3).join('.'),
          units: Math.round(a.u * 100) / 100, net: a.net, docs: a.docs, clients: a.ruts.size, first: a.first, last: a.last, stock: stk, price: a.u ? Math.round(a.net / a.u) : 0, abc: '',
          obs: !rec ? 'Sin recepción registrada para esta talla/color' : stk < 0 ? 'Stock estimado negativo: revisar en Manager' : `Stock estimado: recibido ${fmtInt(rec)} − vendido desde que llegó` });
        continue;
      }
      if (b && Math.abs(a.uBase - b.units) > 0.5) difs.push(code);
      rows.push({
        code, desc, family: fam.family, color: b ? b.color : titleCase(norm(desc.replace(/\([^)]*\)\s*$/, '')).split(/\s+/).filter(w => !new Set(norm(fam.family).split(/\s+/)).has(w) && !SR_GENERIC.has(w)).join(' ')) || 'Único',
        size: b ? b.size : (sizeM ? sizeM[1].trim() : 'Única'), colorKey: code.split('.').slice(0, 3).join('.'),
        units: Math.round(a.u * 100) / 100, net: a.net, docs: a.docs, clients: a.ruts.size, first: a.first || (b && b.first), last: a.last || (b && b.last),
        stock: b ? Math.round((b.stock - a.uDesp) * 100) / 100 : 0, price: (b && b.price) || (a.u ? Math.round(a.net / a.u) : 0),
        abc: '', obs: b ? (b.stock - a.uDesp < 0 ? 'Stock estimado negativo: revisar en Manager' : (b.obs || '')) : 'Código nuevo: sin stock en el último Excel',
      });
    }
    // Clasificación ABC con las ventas al día: A = 80 % de las unidades, B = siguiente 15 %, C = el resto
    const tot = rows.reduce((s, r) => s + Math.max(0, r.units), 0); let cum = 0;
    for (const r of [...rows].sort((x, y) => y.units - x.units)) { cum += Math.max(0, r.units); r.abc = r.units <= 0 ? 'C - Sin venta' : cum <= tot * 0.8 ? 'A - Mayor venta' : cum <= tot * 0.95 ? 'B - Venta media' : 'C - Menor venta'; }
    PBI_REP = { id: 'pbi-auto', auto: true, date: D.hasta, start, base: base.date, cargado: D.cargado, difs, rows, created_at: D.cargado };
  } catch (e) { console.warn('Ventas Power BI:', e); PBI_REP = null; }
}
const reportsSorted = () => [...S.salesreports, ...(PBI_REP ? [PBI_REP] : [])].sort((a, b) => a.date.localeCompare(b.date));
const latestReport = () => reportsSorted().pop() || null;

// Ventas reales de un producto del mix según los informes (familias asignadas a ese producto).
function salesFromReport(p) {
  const map = salesMap();
  const fams = Object.keys(map).filter(f => map[f] === p.id);
  if (!fams.length) return null;
  const reps = reportsSorted().filter(r => r.rows.some(x => fams.includes(x.family)));
  if (!reps.length) return null;
  const rep = reps[reps.length - 1];
  const rows = rep.rows.filter(x => fams.includes(x.family));
  const units = rows.reduce((a, x) => a + x.units, 0);
  const stock = rows.reduce((a, x) => a + Math.max(0, x.stock), 0);
  const net = rows.reduce((a, x) => a + x.net, 0);
  const first = rows.map(x => x.first).filter(Boolean).sort()[0] || rep.start;
  // El ritmo se mide sobre al menos 90 días (o desde la entrada a sala, si fue antes), para que
  // unas pocas compras grandes de lanzamiento no se proyecten como venta de todo el año.
  const since = [first, saleSince(p) && isoDay(saleSince(p))].filter(Boolean).sort()[0];
  const days = since ? Math.max(MIN_RATE_DAYS, daysBetween(parseDay(since), parseDay(rep.date)) + 1) : null;
  const overall = days ? units / days : null;
  // Ritmo reciente: diferencia con el informe anterior del mismo año.
  let recent = null, prevRep = null;
  for (const r of reps.slice(0, -1).reverse()) {
    if ((r.start || '').slice(0, 4) !== (rep.start || '').slice(0, 4)) continue;
    const u = r.rows.filter(x => fams.includes(x.family)).reduce((a, x) => a + x.units, 0);
    const d = daysBetween(parseDay(r.date), parseDay(rep.date));
    if (d > 0 && units >= u) { recent = (units - u) / d; prevRep = { ...r, units: u }; }
    break;
  }
  // Puntos para el gráfico: vendido acumulado en cada informe.
  const points = reps.map(r => ({ date: r.date, units: r.rows.filter(x => fams.includes(x.family)).reduce((a, x) => a + x.units, 0) }));
  return { rep, rows, units, stock, net, first, days, overall, recent, prevRep, points, fams };
}

// Ventana para asignar las familias del informe a productos del mix (se recuerda).
// mapOnly: solo cambiar la asignación de familias del último informe (sin volver a subirlo).
function openSalesImport(rep, file, mapOnly = false) {
  const map = { ...salesMap() };
  const fams = [...new Set(rep.rows.map(r => r.family))];
  const match = buildMatcher(S.products.map(p => ({ key: p.id, name: p.name, code: '', kind: 'mix' })));
  for (const f of fams) if (!(f in map)) {
    const sample = rep.rows.find(r => r.family === f);
    const m = match(f.replace(/\bK\d+\b/g, '')) || match(sample ? sample.desc : '');
    map[f] = m ? m.key : '';
  }
  const famStats = f => { const rs = rep.rows.filter(r => r.family === f); return { n: rs.length, units: rs.reduce((a, r) => a + r.units, 0), stock: rs.reduce((a, r) => a + Math.max(0, r.stock), 0) }; };
  const opts = sel => `<option value="">— No asignar —</option>` + [...S.products].sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.name)} · ${esc(p.line)}</option>`).join('');
  const units = rep.rows.reduce((a, r) => a + r.units, 0);
  openModal(`
    <div class="m-head"><h2>Informe de ventas al ${fmtDay(rep.date)}</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="kpis" style="margin-top:0">
        <div class="kpi"><div class="l">Códigos</div><div class="v">${rep.rows.length}</div><div class="s">${fams.length} familias</div></div>
        <div class="kpi"><div class="l">Unidades vendidas</div><div class="v">${fmtInt(units)}</div><div class="s">${rep.start ? `${fmtDay(rep.start)} → ${fmtDay(rep.date)}` : ''}</div></div>
        <div class="kpi"><div class="l">Stock total</div><div class="v">${fmtInt(rep.rows.reduce((a, r) => a + Math.max(0, r.stock), 0))}</div><div class="s">todas las bodegas</div></div>
      </div>
      <div class="sub" style="color:var(--muted);margin-bottom:8px">¿A qué producto del mix corresponde cada familia del informe? El programa propone una; revísala. Queda guardado para los próximos informes.</div>
      <table class="tbl"><thead><tr><th>Familia en el informe</th><th class="num">Códigos</th><th class="num">Vendidas</th><th class="num">Stock</th><th>Producto del mix</th></tr></thead><tbody>
        ${fams.map(f => { const st = famStats(f); return `<tr><td><b>${esc(f)}</b></td><td class="num">${st.n}</td><td class="num">${fmtInt(st.units)}</td><td class="num">${fmtInt(st.stock)}</td>
          <td><select class="select" data-sm-fam="${esc(f)}" style="width:100%">${opts(map[f])}</select></td></tr>`; }).join('')}
      </tbody></table>
      ${!mapOnly && S.salesreports.some(r => r.date === rep.date) ? `<div class="callout warn" style="margin-top:10px">${ICON.info}<div>Ya hay un informe con fecha ${fmtDay(rep.date)}: se reemplazará por este.</div></div>` : ''}
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="sm-go">${mapOnly ? 'Guardar asignación' : 'Guardar informe'}</button></div>`, {
    onMount: w => {
      $('#sm-go', w).onclick = async () => {
        $$('[data-sm-fam]', w).forEach(s => { map[s.dataset.smFam] = s.value; });
        if (mapOnly) { await setSetting('sales_map', map); closeModal(); toast('Familias asignadas'); return render(); }
        const btn = $('#sm-go', w); btn.disabled = true; btn.textContent = 'Guardando…';
        try {
          const old = S.salesreports.find(r => r.date === rep.date);
          let file_id = null;
          try { file_id = (await storeBackup(file, 'ventas')).id; } catch (e) { console.warn('respaldo ventas', e); }
          if (old) { await deleteOrderFiles({ file_id: old.file_id }); await remove('salesreports', old.id); }
          await save('salesreports', { id: uid(), date: rep.date, start: rep.start, file_id, rows: rep.rows, created_at: nowIso() });
          await cargarVentasPbi();   // el Excel nuevo pasa a ser la base del informe automático
          await setSetting('sales_map', map);
          closeModal();
          toast(`Informe de ventas al ${fmtDay(rep.date)} guardado`);
          UI.tab = 'analisis'; lsSet('k8r_ui_tab', 'analisis');
          render();
        } catch (e) { btn.disabled = false; btn.textContent = 'Guardar informe'; toast('Error: ' + (e.message || e), true); }
      };
    },
  });
}

// Explicación del sugerido: base, crecimiento según la venta y si el tope lo recortó.
function capExplainHtml(pr) {
  const c = pr.capInfo;
  if (!c || !c.base) return '';
  const pct = Math.round(c.sellThrough * 100);
  return `<div class="callout ${c.capped ? '' : 'ok'}" style="margin:0 0 12px">${ICON.info}<div>
    <b>Cómo se calcula el sugerido:</b> parte de ${c.baseKind === 'pedido' ? `tu pedido más grande (<b>${fmtInt(c.base)}</b> u.)` : `lo que tenías disponible (<b>${fmtInt(c.base)}</b> u. vendidas + stock)`}
    y crece según la venta: se ha vendido el <b>${pct}%</b> de lo que había${c.trend > 1 ? ` y se está vendiendo ${Math.round((c.trend - 1) * 100)}% más rápido que antes` : ''}
    → hasta <b>×${c.growth.toFixed(2).replace('.', ',')}</b> = <b>${fmtInt(c.cap)}</b> u.
    ${c.capped ? `El cálculo por ritmo daba ${fmtInt(c.uncapped)} u.; se limitó a ${fmtInt(c.cap)} porque las ventas aún son de pocas semanas o pocos clientes. Si la venta sigue creciendo, el tope sube solo con cada informe.` : `El cálculo por ritmo (${fmtInt(c.uncapped)} u.) está dentro de ese margen.`}
  </div></div>`;
}

// Detalle de ventas de un producto: cada color × talla con vendidas, stock, cobertura y sugerido.
function openSalesDetail(pid) {
  const p = productById(pid); if (!p) return;
  const sr = salesFromReport(p); if (!sr) return;
  const pr = projection(p);
  const rate = pr && pr.rate ? pr.rate : sr.overall;
  const colors = [...new Set(sr.rows.map(r => r.color))];
  const sizes = sortSizes([...new Set(sr.rows.map(r => r.size))]);
  const cell = (c, s) => sr.rows.find(r => r.color === c && r.size === s);
  const topSize = c => { const rs = sr.rows.filter(r => r.color === c && r.units > 0).sort((a, b) => b.units - a.units); return rs[0] && rs[0].size; };
  const skuSug = pr && pr.skuSug ? pr.skuSug : {};
  const covCls = d => (d == null ? '' : d < 30 ? 'cov-bad' : d < 90 ? 'cov-warn' : 'cov-ok');
  const dead = sr.rows.filter(r => r.units === 0 && r.stock > 0);
  openModal(`
    <div class="m-head"><div><div class="sub" style="font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--muted)">VENTAS ${sr.rep.start ? fmtDay(sr.rep.start) + ' → ' : 'AL '}${fmtDay(sr.rep.date)}</div><h2>${esc(p.name)}</h2></div><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="kpis" style="margin-top:0">
        <div class="kpi"><div class="l">Vendidas</div><div class="v">${fmtInt(sr.units)}</div><div class="s">$ ${fmtInt(Math.round(sr.net))} neto</div></div>
        <div class="kpi"><div class="l">Ritmo</div><div class="v">${rate ? fmtInt(perMonth(rate)) : '—'}<small style="font-size:14px;color:var(--muted)"> u/mes</small></div><div class="s">${sr.recent != null ? 'entre los dos últimos informes' : `desde la primera venta (${fmtDay(sr.first)})`}</div></div>
        <div class="kpi"><div class="l">Stock real</div><div class="v">${fmtInt(sr.stock)}</div><div class="s">${rate ? `alcanza ~${Math.round(sr.stock / rate)} días` : ''}</div></div>
        <div class="kpi"><div class="l">Sugerido</div><div class="v">${pr && pr.suggested != null ? fmtInt(pr.suggested) : '—'}</div><div class="s">${pr && pr.reorderBy ? `pedir antes del ${fmtDay(pr.reorderBy)}` : ''}</div></div>
      </div>
      ${sugBlockHtml(p, pr)}
      ${pr && pr.capInfo ? capExplainHtml(pr) : ''}
      <h3 style="margin:14px 0 8px">Ventas y stock por color y talla</h3>
      <div style="overflow-x:auto"><table class="tbl matrix sales-mx"><thead><tr><th>Color</th>${sizes.map(s => `<th>${esc(s)}</th>`).join('')}<th>Total</th></tr></thead><tbody>
        ${colors.map(c => {
          const rs = sr.rows.filter(r => r.color === c);
          const tot = rs.reduce((a, r) => a + r.units, 0), st = rs.reduce((a, r) => a + Math.max(0, r.stock), 0);
          return `<tr><td><b>${esc(c)}</b><div class="sub" style="font-size:10.5px;color:var(--faint)">más vendida: ${esc(topSize(c) || '—')}</div></td>
            ${sizes.map(s => { const r = cell(c, s); if (!r) return '<td><span style="color:var(--faint)">—</span></td>';
              const skuRate = sr.days ? r.units / sr.days : 0;
              const cov = skuRate > 0 ? Math.round(Math.max(0, r.stock) / skuRate) : null;
              const sug = skuSug[r.code] || 0;
              return `<td title="${esc(r.code)} · ${esc(r.abc)}${r.obs ? ' · ' + esc(r.obs) : ''}"><div class="smx ${r.size === topSize(c) ? 'top' : ''}">
                <div class="smx-u">${fmtInt(r.units)}</div><div class="smx-s">stock ${fmtInt(r.stock)}</div>
                <div class="smx-c ${covCls(cov)}">${cov == null ? (r.stock > 0 ? 'sin venta' : '—') : cov + ' d'}</div>
                ${sug ? `<div class="smx-g">+${fmtInt(sug)}</div>` : ''}</div></td>`; }).join('')}
            <td><b>${fmtInt(tot)}</b><div class="sub" style="font-size:10.5px;color:var(--faint)">stock ${fmtInt(st)}</div></td></tr>`;
        }).join('')}
      </tbody></table></div>
      <div class="legend"><span>Arriba: vendidas · stock · <b>días que alcanza</b></span><span><i style="background:#E5484D"></i>&lt; 30 d</span><span><i style="background:#F29D12"></i>&lt; 90 d</span><span><i style="background:#24A866"></i>90 d o más</span><span><b style="color:#3B6EF5">+N</b> sugerido a pedir</span></div>
      ${dead.length ? `<div class="callout warn" style="margin-top:12px">${ICON.info}<div><b>Inmovilizado:</b> ${dead.map(r => `${esc(r.color)} ${esc(r.size)} (${fmtInt(r.stock)} u.)`).join(' · ')}. Tienen stock y no se han vendido en el período.</div></div>` : ''}
    </div>
    <div class="m-foot"><button class="btn primary" data-close>Listo</button></div>`, {});
}

// ---------- Ventas y proyección ----------
// Ventas registradas: cada registro es "al día X se llevan vendidas N unidades desde
// que el producto entró a sala" (acumulado). Más adelante se llenará desde el informe de ventas.
const salesOf = p => S.sales.filter(s => s.product_id === p.id).sort((a, b) => a.date.localeCompare(b.date));
const DEFAULT_COVER = 90; // el sugerido cubre 3 meses de venta desde que llega
const coverDays = () => getSetting('cover_days', DEFAULT_COVER);

// Demora de una reposición (pedido → llegada real a bodega), aprendida de los datos:
// 1) promedio de las reposiciones de este producto que ya llegaron;
// 2) si no tiene, promedio de todas las reposiciones que ya llegaron;
// 3) si aún no hay ninguna, los días de Configuración.
function productLead(p) {
  const lt = o => daysBetween(parseDay(o.date), parseDay(o.arrived_at));
  const own = orderKinds(p).filter(k => k.kind === 'repo' && k.o.arrived_at && k.o.date).map(k => lt(k.o)).filter(d => d > 0);
  if (own.length) return { days: Math.round(own.reduce((a, b) => a + b, 0) / own.length), src: 'product', n: own.length };
  const all = S.products.flatMap(q => orderKinds(q).filter(k => k.kind === 'repo' && k.o.arrived_at && k.o.date).map(k => k.o));
  const uniq = [...new Map(all.map(o => [o.id, o])).values()].map(lt).filter(d => d > 0);
  if (uniq.length) return { days: Math.round(uniq.reduce((a, b) => a + b, 0) / uniq.length), src: 'all', n: uniq.length };
  return { days: leadDays('reposicion'), src: 'config', n: 0 };
}
const leadSrcTxt = li => li.src === 'product' ? `promedio real de ${li.n} ${li.n > 1 ? 'reposiciones' : 'reposición'} de este producto`
  : li.src === 'all' ? `promedio real de ${li.n} ${li.n > 1 ? 'reposiciones' : 'reposición'} de todos los productos`
  : 'valor de Configuración (aún no hay reposiciones con llegada real)';

// Proyección de venta y sugerido de reposición para un producto.
function projection(p) {
  // Si hay informe de ventas (Excel de Manager) para este producto, manda sobre las ventas anotadas a mano.
  const sr = salesFromReport(p);
  const sales = sr ? sr.points : salesOf(p);
  if (!sales.length) return null;
  const today = startOfDay(new Date());
  const sale = saleSince(p) || (sr && sr.first ? parseDay(sr.first) : null);
  const last = sales[sales.length - 1];
  const prev = sales.length > 1 ? sales[sales.length - 2] : (sale ? { date: isoDay(sale), units: 0 } : null);
  const lastD = parseDay(last.date);
  // Ritmo reciente (entre los dos últimos registros) y ritmo total desde la entrada a sala.
  const span = prev ? daysBetween(parseDay(prev.date), lastD) : 0;
  let recent = span > 0 ? (last.units - prev.units) / span : null;
  const totalSpan = sale ? daysBetween(sale, lastD) : 0;
  let overall = totalSpan > 0 ? last.units / totalSpan : null;
  if (sr) { recent = sr.recent; overall = sr.overall; }
  const rate = recent ?? overall;
  // Unidades recibidas: envíos que ya llegaron (el primer pedido se da por recibido si ya está en sala).
  const ks = orderKinds(p);
  const arrived = ks.filter(k => k.o.arrived_at || (k.kind === 'pedido' && sale));
  // + unidades que ya estaban en sala antes de registrar envíos en el programa.
  let received = arrived.reduce((a, k) => a + (k.o.total || 0), 0) + (p.initial_units || 0);
  const incomingOrders = ks.filter(k => !arrived.includes(k)).map(k => k.o);
  const incoming = incomingOrders.reduce((a, o) => a + (o.total || 0), 0);
  // Con informe de ventas el stock es el real de las bodegas (lo recibido = vendido + stock).
  const stockAtLast = sr ? sr.stock : received - last.units;
  if (sr) received = sr.units + sr.stock;
  const out = { sales, last, prev, sale, rate, recent, overall, received, incoming, incomingOrders, stockAtLast, arrived: sr ? [] : arrived.map(k => k.o), sr };
  if (!rate || rate <= 0) return out;
  const leadInfo = productLead(p);
  const lead = leadInfo.days;
  // Simulación de stock: baja al ritmo de venta y sube cuando llega cada envío en camino
  // (en su fecha CHI o aproximada; si no tiene, se asume hoy + demora de reposición).
  const arrivalsAhead = incomingOrders.map(o => ({ d: parseDay(bestEta(o)) || new Date(today.getTime() + lead * DAY), q: o.total || 0 }))
    .map(a => ({ ...a, d: a.d < lastD ? lastD : a.d })).sort((a, b) => a.d - b.d);
  const stockAt = when => {
    let t = lastD, s = stockAtLast;
    for (const a of arrivalsAhead) { if (a.d > when) break; s = Math.max(0, s - rate * (a.d - t) / DAY) + a.q; t = a.d; }
    return Math.max(0, s - rate * (when - t) / DAY);
  };
  // Primer quiebre de stock (si se acaba antes de que llegue lo que viene) y fecha final en que se agota.
  let t = lastD, s = Math.max(0, stockAtLast), gap = null;
  for (const a of arrivalsAhead) {
    const out0 = new Date(t.getTime() + s / rate * DAY);
    if (out0 < a.d && !gap) gap = { from: out0, to: a.d };
    s = Math.max(0, s - rate * (a.d - t) / DAY) + a.q; t = a.d;
  }
  const sellout = new Date(t.getTime() + s / rate * DAY);
  const stockNow = stockAt(today);
  const reorderBy = new Date(sellout.getTime() - lead * DAY);
  // Lo que se pida hoy llega en `lead` días: debe cubrir `coverDays` de venta desde ese momento.
  const stockAtNewArrival = stockAt(new Date(today.getTime() + lead * DAY));
  const need = rate * coverDays();
  let suggested = Math.max(0, Math.ceil((need - stockAtNewArrival) / 10) * 10);
  // Con informe de ventas, el sugerido se calcula por color y talla: lo que vende cada código
  // durante la espera + la cobertura, menos su stock y su parte de lo que viene en camino.
  let skuSug = null, skuSplit = null, skuInc = null, incList = [];
  if (sr && sr.days) {
    skuSug = {}; skuSplit = [];
    const trend = sr.overall ? rate / sr.overall : 1; // si se está vendiendo más rápido, sube parejo
    // Lo que viene en camino (y lo que llegó después del informe) cruzado por color y talla.
    incList = ks.map(k => k.o).filter(o => !arrived.some(k => k.o === o) || (o.arrived_at && o.arrived_at > sr.rep.date));
    const incEv = incomingBySku(sr, incList, lastD, today, lead);
    skuInc = {};
    for (const [code, evs] of Object.entries(incEv)) skuInc[code] = evs.reduce((a, e) => a + e.q, 0);
    // Día (desde el informe) en que llegaría lo que se pida hoy.
    const H = daysBetween(lastD, today) + lead;
    let tot = 0;
    for (const r of sr.rows) {
      const rr = (r.units / sr.days) * trend;
      if (rr <= 0) continue;
      // Stock de este código cuando llegue lo que se pida hoy: baja con la venta y sube con cada
      // envío en camino; si se agota antes, queda en 0 (lo que no se alcanzó a vender no se recupera).
      let s = Math.max(0, r.stock), t = 0, late = 0;
      for (const e of (incEv[r.code] || []).sort((a, b) => a.d - b.d)) {
        if (e.d > H) { late += e.q; continue; }
        s = Math.max(0, s - rr * (e.d - t)) + e.q; t = e.d;
      }
      s = Math.max(0, s - rr * (H - t));
      // Se pide solo lo que falta para cubrir la cobertura: lo que no viene en camino.
      const q = Math.max(0, Math.ceil((rr * coverDays() - s - late) / 5) * 5);
      if (q) { skuSug[r.code] = q; skuSplit.push({ code: r.code, color: r.color, size: r.size, qty: q }); tot += q; }
    }
    suggested = tot;
  }
  // Tope: cerca del pedido más grande registrado, y crece según cómo se vende.
  //   base        = pedido/reposición más grande del producto (si no hay, lo que había: vendido + stock)
  //   × (1 + sell-through)   → si se vendió casi todo lo que había, puede doblarse
  //   × tendencia (1 a 1,5)  → si entre informes se está vendiendo más rápido, sube un poco más
  // Máximo 3 veces la base.
  const biggest = Math.max(0, ...ks.map(k => k.o.total || 0));
  const capBase = biggest || received;
  const sold = last.units;
  const sellThrough = received > 0 ? Math.min(1, sold / received) : 0;
  const trendF = recent != null && overall ? Math.min(1.5, Math.max(1, recent / overall)) : 1;
  const growth = Math.min(3, (1 + sellThrough) * trendF);
  const cap = capBase ? Math.ceil(capBase * growth / 10) * 10 : null;
  const uncapped = suggested;
  const capped = cap != null && suggested > cap;
  if (capped) suggested = cap;
  // Mínimo de fábrica: si hay que pedir, no se puede pedir menos que el mínimo.
  const minQ = minQtyOf(p);
  const calc = suggested;
  const raised = suggested > 0 && suggested < minQ;
  if (raised) suggested = minQ;
  // Números cerrados: el total y cada color y talla van de 50 en 50.
  if (suggested > 0) suggested = Math.ceil(suggested / QTY_STEP) * QTY_STEP;
  const sizeMin = sizeMinQty();
  const beforeSize = suggested;
  if (skuSplit) {
    // El total final (con tope o mínimo) se reparte en la misma proporción por color y talla,
    // y cada talla que se pide lleva al menos el mínimo por talla.
    skuSplit = applySizeMin(fitSplit(skuSplit, suggested), sizeMin);
    suggested = skuSplit.reduce((a, l) => a + l.qty, 0);
    skuSug = {};
    for (const l of skuSplit) skuSug[l.code] = l.qty;
  }
  const capInfo = { base: capBase, baseKind: biggest ? 'pedido' : 'disponible', sellThrough, trend: trendF, growth, cap, capped, uncapped };
  const minInfo = { min: minQ, raised, calc, sizeMin, sizeRaised: false };
  const daysToReorder = daysBetween(today, reorderBy);
  const level = daysToReorder <= 0 ? 'now' : gap && gap.from > today ? 'gap' : daysToReorder <= 30 ? 'soon' : 'ok';
  // Reparto por color y talla según el último envío del producto (hasta tener ventas por color/talla).
  const ref = [...ks].reverse().find(k => (k.o.lines || []).length);
  let split = skuSplit || [];
  if (!skuSplit && ref && suggested) {
    split = applySizeMin(fitSplit(ref.o.lines.filter(l => l.qty > 0).map(l => ({ color: l.color, size: l.size, qty: l.qty })), suggested), sizeMin);
    suggested = split.reduce((a, l) => a + l.qty, 0);
  }
  minInfo.sizeRaised = suggested > beforeSize;
  return { ...out, stockNow, sellout, reorderBy, lead, need, suggested, daysToReorder, level, split, ref: skuSplit ? null : ref && ref.o, gap, stockAtNewArrival, stockAt, arrivalsAhead, leadInfo, skuSug, skuInc, incList, capInfo, minInfo };
}

// Mínimo de fábrica por pedido: el del producto o, si no tiene, el de Configuración.
const DEFAULT_MIN_QTY = 1500;
const minQtyOf = p => { const v = parseInt(p && p.min_qty, 10); return v > 0 ? v : getSetting('min_qty', DEFAULT_MIN_QTY); };

// Mínimo por talla: cada color y talla que se pide lleva al menos esta cantidad.
const DEFAULT_SIZE_MIN = 100;
const QTY_STEP = 50; // cantidades en números cerrados (300, 350…)
const sizeMinQty = () => getSetting('min_size_qty', DEFAULT_SIZE_MIN);

// Sube a `min` cada color y talla que quedó bajo el mínimo y descuenta lo agregado de las tallas
// más grandes, para mantener el total. Si no alcanza (muchas tallas chicas), el total sube.
function applySizeMin(lines, min) {
  if (!min || !lines.length) return lines.filter(l => l.qty > 0);
  const out = lines.map(l => ({ ...l, qty: Math.max(l.qty, min) }));
  let extra = out.reduce((a, l) => a + l.qty, 0) - lines.reduce((a, l) => a + l.qty, 0);
  while (extra > 0) {
    const big = out.filter(l => l.qty > min);
    if (!big.length) break;
    const room = big.reduce((a, l) => a + l.qty - min, 0);
    const take = Math.min(extra, room);
    let taken = 0;
    for (const l of big) { const t = Math.min(l.qty - min, Math.floor(take * (l.qty - min) / room / QTY_STEP) * QTY_STEP); l.qty -= t; taken += t; }
    if (!taken) { const l = big.sort((a, b) => b.qty - a.qty)[0]; taken = Math.min(extra, l.qty - min); l.qty -= taken; }
    extra -= taken;
  }
  return out;
}

// Reparte `target` unidades en la misma proporción que `lines`, en múltiplos de 5 y sumando exacto.
// Envíos en camino repartidos por código del informe (color + talla), con el día de llegada contado
// desde la fecha del informe. Los colores del Excel de gerencia y los del informe se escriben distinto,
// así que se comparan por palabras; si una línea no calza, se reparte según lo que vende cada código.
const colorWords = s => new Set(norm(s).split(/[^A-Z0-9]+/).filter(w => w.length > 1 && !['Y', 'CON', 'DE', 'COLOR'].includes(w)));
const sizeKey = s => norm(s).replace(/[^A-Z0-9]/g, '');
function incomingBySku(sr, orders, lastD, today, lead) {
  const out = {};
  const colors = [...new Set(sr.rows.map(r => r.color))];
  const bestColor = c => {
    const w = colorWords(c); let best = null, score = 0;
    for (const rc of colors) {
      const rw = colorWords(rc); const hit = [...w].filter(x => rw.has(x)).length;
      const sc = hit / Math.max(w.size, rw.size, 1);
      if (sc > score) { score = sc; best = rc; }
    }
    return best;
  };
  const add = (rows, q, d) => {
    const wsum = rows.reduce((a, r) => a + r.units, 0);
    for (const r of rows) {
      const part = wsum ? q * r.units / wsum : q / rows.length;
      if (part > 0) (out[r.code] = out[r.code] || []).push({ d, q: part });
    }
  };
  for (const o of orders) {
    const eta = parseDay(o.arrived_at) || parseDay(bestEta(o)) || new Date(today.getTime() + lead * DAY);
    const d = Math.max(0, daysBetween(lastD, eta));
    const lines = (o.lines || []).filter(l => l.qty > 0);
    if (!lines.length) { if (o.total) add(sr.rows, o.total, d); continue; }
    for (const l of lines) {
      const c = bestColor(l.color || '');
      const byColor = c ? sr.rows.filter(r => r.color === c) : [];
      const exact = byColor.filter(r => sizeKey(r.size) === sizeKey(l.size));
      const bySize = sr.rows.filter(r => sizeKey(r.size) === sizeKey(l.size));
      add(exact.length ? exact : byColor.length ? byColor : bySize.length ? bySize : sr.rows, l.qty, d);
    }
  }
  return out;
}

// Tabla del sugerido con informe de ventas: en cada color y talla, lo que se sugiere pedir y lo que ya viene.
function sugIncMatrixHtml(pr) {
  const inc = pr.skuInc || {}, sug = pr.skuSug || {};
  const rows = pr.sr.rows.filter(r => sug[r.code] || inc[r.code] >= 1);
  if (!rows.length) return '';
  const colors = [...new Set(rows.map(r => r.color))];
  const sizes = sortSizes([...new Set(rows.map(r => r.size))]);
  const cell = (c, s) => rows.filter(r => r.color === c && r.size === s);
  const sum = (rs, m) => rs.reduce((a, r) => a + (m[r.code] || 0), 0);
  const max = Math.max(1, ...rows.map(r => sug[r.code] || 0));
  const td = (g, v) => `<div class="sgc">${g ? `<div class="cell-tint" style="background:${hexA('#3B6EF5', .06 + .22 * g / max)}"><b>${fmtInt(g)}</b></div>` : '<span style="color:var(--faint)">—</span>'}${v >= 1 ? `<div class="sgv">viene ${fmtInt(Math.round(v))}</div>` : ''}</div>`;
  let h = '<table class="tbl matrix"><thead><tr><th>Color</th>' + sizes.map(s => `<th>${esc(s)}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
  for (const c of colors) {
    const rc = rows.filter(r => r.color === c);
    h += `<tr><td><b>${esc(c)}</b></td>` + sizes.map(s => { const rs = cell(c, s); return `<td>${rs.length ? td(sum(rs, sug), sum(rs, inc)) : '<span style="color:var(--faint)">·</span>'}</td>`; }).join('') + `<td>${td(sum(rc, sug), sum(rc, inc))}</td></tr>`;
  }
  h += '<tr class="tot"><td>Total</td>' + sizes.map(s => { const rs = rows.filter(r => r.size === s); return `<td>${td(sum(rs, sug), sum(rs, inc))}</td>`; }).join('') + `<td>${td(sum(rows, sug), sum(rows, inc))}</td></tr>`;
  return h + '</tbody></table>';
}

function fitSplit(lines, target) {
  const tot = lines.reduce((a, l) => a + l.qty, 0);
  if (!tot || !target) return [];
  const step = target % QTY_STEP === 0 ? QTY_STEP : 1;
  const raw = lines.map(l => { const x = l.qty * target / tot / step; return { ...l, x, qty: Math.floor(x) * step }; });
  let left = target - raw.reduce((a, l) => a + l.qty, 0);
  for (const l of [...raw].sort((a, b) => (b.x % 1) - (a.x % 1))) { if (left < step) break; l.qty += step; left -= step; }
  // Las tallas que quedan en 0 por el redondeo se mantienen: el mínimo por talla las sube.
  return raw.map(({ x, ...l }) => l);
}

// Bloque del sugerido: total del producto, cuándo pedir, mínimo de fábrica y tabla color × talla.
function sugBlockHtml(p, pr) {
  if (!pr || !pr.rate || pr.suggested == null) return '';
  const mi = pr.minInfo || { min: minQtyOf(p) };
  // Envíos en camino (o que llegaron después del informe de ventas) que ya se descontaron del sugerido.
  const incs = (pr.incList && pr.incList.length ? pr.incList : pr.incomingOrders || []).filter(o => o.total);
  const incTxt = incs.length ? `Ya ${incs.length > 1 ? 'vienen' : 'viene'} en camino ${incs.map(o => `<b>${fmtInt(o.total)} u</b> (${esc(orderLabel(o, p).text.toLowerCase())} del ${fmtDay(o.date)}${o.arrived_at ? `, llegó el ${fmtDay(o.arrived_at)}` : bestEta(o) ? `, llega ~${fmtDay(bestEta(o))}` : ''})`).join(', ')}. ` : '';
  const withInc = pr.sr && pr.skuInc && Object.keys(pr.skuInc).length;
  if (!pr.suggested) return `<div class="callout ok" style="margin:0 0 12px">${ICON.info}<div><b>No hace falta pedir todavía.</b> ${incTxt}Con el stock${incs.length ? ' y lo que viene en camino' : ''} alcanza hasta el <b>${fmtDay(pr.sellout)}</b>; revisar antes del ${fmtDay(pr.reorderBy)}. Mínimo de fábrica: ${fmtInt(mi.min)} u.</div></div>${withInc ? `<div class="sub" style="color:var(--muted);font-size:12px;margin:0 0 6px">Lo que viene por color y talla:</div>${sugIncMatrixHtml(pr)}` : ''}`;
  // Cada color y talla se pide para cubrir la cobertura desde que llega; el mínimo de fábrica lo alarga y el tope lo acorta.
  const cov = coverDays();
  const days = mi.raised || mi.sizeRaised ? `más de ${cov}` : pr.capInfo && pr.capInfo.capped ? `menos de ${cov}` : `${cov}`;
  return `<div class="sug-block">
    <div class="sug-head">
      <div><div class="l">Sugerido a pedir · ${esc(p.name)}</div><div class="v">${fmtInt(pr.suggested)} <small>u</small></div></div>
      <div class="sug-meta">
        <div><span>Pedir antes del</span><b class="${pr.daysToReorder <= 0 ? 'bad' : ''}">${pr.daysToReorder <= 0 ? 'Ya' : fmtDay(pr.reorderBy)}</b></div>
        <div><span>Cubre desde que llega</span><b>${days} días</b></div>
        ${incs.length ? `<div><span>Ya en camino</span><b>${fmtInt(incs.reduce((a, o) => a + o.total, 0))} u</b></div>` : ''}
        <div><span>Mínimo de fábrica</span><b>${fmtInt(mi.min)} u</b></div>
      </div>
    </div>
    <div class="sub" style="color:var(--muted);font-size:12px;margin:-4px 0 10px">${incTxt ? `${incTxt}El sugerido es solo lo que falta además de eso: tallas que no vienen o que se venden más de lo que llega. ` : ''}${mi.raised ? `Por ritmo de venta bastaban ${fmtInt(mi.calc)} u.; se subió al mínimo de fábrica y se repartió en la misma proporción por color y talla. ` : ''}Cada talla lleva al menos ${fmtInt(mi.sizeMin || 0)} u.${mi.sizeRaised ? ' Por ese mínimo el total subió.' : ''}</div>
    ${withInc ? sugIncMatrixHtml(pr) : pr.split.length ? matrixHtml(pr.split) : '<div class="sub" style="color:var(--faint)">Sin reparto por color y talla: falta el informe de ventas o un envío con detalle.</div>'}
  </div>`;
}

// Excel con el sugerido de todos los productos (una fila por color y talla), para enviar a gerencia.
function downloadSugXlsx() {
  const rows = [];
  for (const p of S.products) {
    const pr = projection(p);
    if (!pr || !pr.suggested) continue;
    const lines = pr.split.length ? pr.split : [{ color: '', size: '', qty: pr.suggested }];
    for (const l of lines) rows.push({ Producto: p.name, Código: p.code || '', Línea: p.line || '', Color: l.color, Talla: l.size, 'Sugerido a pedir': l.qty, 'Ya viene en camino': pr.skuInc && l.code ? Math.round(pr.skuInc[l.code] || 0) : '', 'Pedir antes del': fmtDay(pr.reorderBy) });
  }
  if (!rows.length) return toast('No hay productos con sugerido de compra', true);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sugerido');
  XLSX.writeFile(wb, `Sugerido_compra_${isoDay(new Date())}.xlsx`);
}

// Resumen de lo que hay que pedir: un producto por fila; clic abre el detalle por color y talla.
function sugSummaryHtml(limit) {
  const list = S.products.map(p => ({ p, pr: projection(p) })).filter(x => x.pr && x.pr.suggested > 0)
    .sort((a, b) => a.pr.reorderBy - b.pr.reorderBy);
  if (!list.length) return '<div class="sub" style="color:var(--faint)">Ningún producto necesita reposición por ahora.</div>';
  const show = limit ? list.slice(0, limit) : list;
  const topOf = (pr, k) => { const by = {}; pr.split.forEach(l => { by[l[k]] = (by[l[k]] || 0) + l.qty; }); return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n, q]) => `${esc(n)} ${fmtInt(q)}`).join(' · '); };
  return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Sugerido</th><th>Más unidades en color</th><th>Más unidades en talla</th><th>Pedir antes del</th></tr></thead><tbody>
    ${show.map(({ p, pr }) => `<tr class="click" data-sug-open="${esc(p.id)}"><td><b>${esc(p.name)}</b>${pr.minInfo && pr.minInfo.raised ? '<div class="sub" style="font-size:10.5px;color:var(--faint)">subido al mínimo de fábrica</div>' : ''}</td>
      <td class="num"><b>${fmtInt(pr.suggested)}</b></td>
      <td style="font-size:12.5px">${pr.split.length ? topOf(pr, 'color') : '—'}</td>
      <td style="font-size:12.5px">${pr.split.length ? topOf(pr, 'size') : '—'}</td>
      <td style="white-space:nowrap"><span class="tag ${LEVEL_TXT[pr.level][0]}">${pr.daysToReorder <= 0 ? 'Pedir ya' : fmtDay(pr.reorderBy)}</span></td></tr>`).join('')}
  </tbody></table></div>${limit && list.length > limit ? `<div class="sub" style="color:var(--faint);margin-top:6px">y ${list.length - limit} más en Análisis.</div>` : ''}
  <div class="sub" style="color:var(--faint);font-size:11.5px;margin-top:6px">Total a pedir: <b>${fmtInt(list.reduce((a, x) => a + x.pr.suggested, 0))} u</b> en ${list.length} producto${list.length > 1 ? 's' : ''}. Clic en un producto para ver cada color y talla.</div>`;
}

// Detalle del sugerido de un producto: con informe de ventas abre el detalle completo; si no, solo el sugerido.
function openSugDetail(pid) {
  const p = productById(pid); if (!p) return;
  if (salesFromReport(p)) return openSalesDetail(pid);
  const pr = projection(p);
  openModal(`
    <div class="m-head"><h2>${esc(p.name)}</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">${sugBlockHtml(p, pr) || '<div class="sub">Aún no hay ventas para calcular el sugerido.</div>'}${pr && pr.capInfo ? capExplainHtml(pr) : ''}</div>
    <div class="m-foot"><button class="btn primary" data-close>Listo</button></div>`, {});
}
const LEVEL_TXT = { now: ['bad', 'Pedir ya'], gap: ['warn', 'Quiebre de stock'], soon: ['warn', 'Pedir pronto'], ok: ['ok', 'Con stock'] };
const perMonth = r => Math.round(r * 30);

// Gráfico de proyección: unidades recibidas (escalones), vendidas (real y proyectada) y fechas clave.
function projectionSvg(p, pr) {
  const W = 760, H = 260, L = 48, R = 16, T = 16, B = 34;
  const today = startOfDay(new Date());
  const t0 = startOfDay(pr.sale || parseDay(pr.sales[0].date));
  let t1 = new Date(Math.max(today.getTime() + 30 * DAY, pr.sellout ? pr.sellout.getTime() + 20 * DAY : 0, parseDay(pr.last.date).getTime() + 30 * DAY));
  for (const o of pr.incomingOrders) { const d = parseDay(bestEta(o)); if (d) t1 = new Date(Math.max(t1, d.getTime() + 15 * DAY)); }
  const supply = pr.received + pr.incoming;
  const yMax = Math.max(10, supply, pr.last.units) * 1.1;
  const X = d => L + (startOfDay(d) - t0) / (t1 - t0) * (W - L - R);
  const Y = v => H - B - v / yMax * (H - T - B);
  // Recibido acumulado (escalones) + lo que viene en camino (punteado).
  const arrivals = pr.sr ? [{ d: t0, q: pr.received }] // con informe: lo recibido = vendido + stock real
    : pr.arrived.map(o => ({ d: o.arrived_at ? parseDay(o.arrived_at) : t0, q: o.total })).sort((a, b) => a.d - b.d);
  if (p.initial_units && !pr.sr) arrivals.unshift({ d: t0, q: p.initial_units });
  let acc = 0, recv = `M ${X(t0)} ${Y(0)}`;
  for (const a of arrivals) { recv += ` L ${X(a.d < t0 ? t0 : a.d)} ${Y(acc)}`; acc += a.q; recv += ` L ${X(a.d < t0 ? t0 : a.d)} ${Y(acc)}`; }
  recv += ` L ${X(t1)} ${Y(acc)}`;
  let inc = '';
  for (const o of pr.incomingOrders) {
    const d = parseDay(bestEta(o)) || new Date(today.getTime() + pr.lead * DAY);
    inc += `<path d="M ${X(d)} ${Y(acc)} L ${X(d)} ${Y(acc + o.total)} L ${X(t1)} ${Y(acc + o.total)}" class="pj-inc"/>`;
    acc += o.total;
  }
  // Vendido real y proyectado.
  const pts = [{ d: t0, u: 0 }, ...pr.sales.map(s => ({ d: parseDay(s.date), u: s.units }))];
  const sold = pts.map((q, i) => `${i ? 'L' : 'M'} ${X(q.d)} ${Y(q.u)}`).join(' ');
  // Vendido proyectado = vendido + (stock inicial + lo que llega) − stock restante: se aplana cuando no hay stock.
  let proj = '';
  if (pr.rate && pr.stockAt) {
    const lastD = parseDay(pr.last.date);
    const base = pr.last.units + pr.stockAtLast;
    let dpath = `M ${X(lastD)} ${Y(pr.last.units)}`;
    for (let d = new Date(lastD.getTime() + 2 * DAY); d <= t1; d = new Date(d.getTime() + 2 * DAY)) {
      const came = pr.arrivalsAhead.filter(a => a.d <= d).reduce((s, a) => s + a.q, 0);
      dpath += ` L ${X(d)} ${Y(base + came - pr.stockAt(d))}`;
    }
    proj = `<path d="${dpath}" class="pj-proj"/>`;
  }
  const vline = (d, cls, label) => d && d >= t0 && d <= t1 ? `<line x1="${X(d)}" x2="${X(d)}" y1="${T}" y2="${H - B}" class="${cls}"/><text x="${X(d) + 4}" y="${T + 10}" class="pj-t ${cls}">${label}</text>` : '';
  // Ejes: 4 marcas de unidades y meses.
  let axis = '';
  for (let i = 0; i <= 4; i++) { const v = yMax / 1.1 * i / 4; axis += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="pj-grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="pj-a">${fmtInt(Math.round(v))}</text>`; }
  for (let m = new Date(t0.getFullYear(), t0.getMonth() + 1, 1); m <= t1; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) axis += `<text x="${X(m)}" y="${H - 12}" text-anchor="middle" class="pj-a">${MONTHS_SHORT[m.getMonth()]}</text>`;
  return `<svg class="pj" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Proyección de venta de ${esc(p.name)}">
    ${axis}
    <path d="${recv}" class="pj-recv"/>${inc}
    <path d="${sold}" class="pj-sold"/>${proj}
    ${pts.slice(1).map(q => `<circle cx="${X(q.d)}" cy="${Y(q.u)}" r="3.5" class="pj-dot"><title>${fmtDay(q.d)}: ${fmtInt(q.u)} vendidas</title></circle>`).join('')}
    ${pr.gap ? `<rect x="${X(pr.gap.from)}" y="${T}" width="${Math.max(2, X(pr.gap.to) - X(pr.gap.from))}" height="${H - T - B}" class="pj-gap"><title>Sin stock: ${fmtDay(pr.gap.from)} → ${fmtDay(pr.gap.to)}</title></rect>` : ''}
    ${vline(today, 'pj-today', 'Hoy')}
    ${vline(pr.reorderBy, 'pj-reorder', 'Pedir antes')}
    ${vline(pr.sellout, 'pj-sellout', 'Se agota')}
  </svg>
  <div class="legend"><span><i style="background:#3B6EF5"></i>Recibido</span><span><i style="background:#93B4FB"></i>En camino</span><span><i style="background:#EC6FB0"></i>Vendido</span><span><i style="background:#F5A3CB"></i>Proyección</span></div>`;
}

function salesSectionHtml(p) {
  const sales = salesOf(p);
  const pr = projection(p);
  return `
    <div class="kv" style="margin-bottom:10px"><div class="k">Unidades recibidas antes</div><div style="display:flex;gap:8px;align-items:center"><input type="number" min="0" class="input" style="height:30px;width:110px" id="s-init" value="${esc(p.initial_units || '')}" placeholder="0"><span class="sub" style="color:var(--faint);font-size:11px">si el primer pedido no está registrado como envío</span></div></div>
    <div class="sales-add">
      <input type="date" class="input" id="s-date" value="${esc(isoDay(new Date()))}" max="${esc(isoDay(new Date()))}">
      <input type="number" class="input" id="s-units" min="0" step="1" placeholder="Vendidas a la fecha">
      <button class="btn sm primary" id="s-add">Agregar</button>
    </div>
    <div class="sub" style="color:var(--faint);font-size:11.5px;margin:4px 0 8px">Total acumulado vendido desde que entró a sala${saleSince(p) ? ` (${fmtDay(saleSince(p))})` : ' — pon la fecha "En sala de venta" en Fechas clave'}.</div>
    ${sales.length ? `<table class="tbl"><tbody>${[...sales].reverse().map(s => `<tr><td>${fmtDay(s.date)}</td><td class="num"><b>${fmtInt(s.units)}</b> vendidas</td><td style="width:30px"><button class="icon-btn" data-del-sale="${esc(s.id)}" title="Borrar registro">${ICON.trash}</button></td></tr>`).join('')}</tbody></table>` : ''}
    ${pr && pr.rate ? `<div class="pj-sum">
      <div><span>Ritmo</span><b>${fmtInt(perMonth(pr.rate))}</b> u/mes</div>
      <div><span>Stock estimado</span><b>${fmtInt(Math.round(pr.stockNow))}</b> u</div>
      <div><span>Se agota</span><b>${fmtDay(pr.sellout)}</b></div>
      <div><span>Pedir antes de</span><b class="${pr.level === 'now' ? 'bad' : ''}">${fmtDay(pr.reorderBy)}</b></div>
      <div><span>Sugerido</span><b>${fmtInt(pr.suggested)}</b> u</div>
    </div>
    <div style="margin-top:10px">${sugBlockHtml(p, pr)}</div>
    <a href="#" class="sub" data-go-analysis="${esc(p.id)}" style="font-size:12px">Ver gráfico en Análisis →</a>` : sales.length ? '<div class="sub" style="color:var(--muted);font-size:12px">Con un registro más (o la fecha de entrada a sala) se calcula el ritmo de venta.</div>' : ''}`;
}

function bindSales(d, p) {
  const add = $('#s-add', d);
  if (add) add.onclick = async () => {
    const date = $('#s-date', d).value, units = parseInt($('#s-units', d).value, 10);
    if (!date || isNaN(units) || units < 0) return toast('Pon la fecha y las unidades vendidas', true);
    const prev = salesOf(p).filter(s => s.date < date).pop();
    if (prev && units < prev.units && !confirm(`Es menos que lo registrado el ${fmtDay(prev.date)} (${fmtInt(prev.units)}). Recuerda que es el total acumulado. ¿Guardar igual?`)) return;
    const same = salesOf(p).find(s => s.date === date);
    await save('sales', { id: same ? same.id : uid(), product_id: p.id, date, units, note: '', created_at: nowIso(), by: me() });
    toast(`Ventas al ${fmtDay(date)}: ${fmtInt(units)}`);
    render();
  };
  const ini = $('#s-init', d);
  if (ini) ini.onchange = async () => { p.initial_units = Math.max(0, parseInt(ini.value, 10) || 0) || null; p.updated_at = nowIso(); await save('products', p); toast('Unidades recibidas actualizadas'); render(); };
  $$('[data-del-sale]', d).forEach(b => b.onclick = async () => { if (confirm('¿Borrar este registro de ventas?')) { await remove('sales', b.dataset.delSale); render(); } });
  $$('[data-go-analysis]', d).forEach(a => a.onclick = e => { e.preventDefault(); UI.aProduct = a.dataset.goAnalysis; UI.tab = 'analisis'; lsSet('k8r_ui_tab', 'analisis'); UI.drawer = null; render(); });
}

// ---------- Gráficos del Análisis (SVG, sin librerías) ----------
const CH = { pedido: '#111827', repo: '#34C27A', transit: '#FF8A3D', floor: '#F5B83D', early: '#24A866', late: '#E5484D', rate: '#EC6FB0' };
const trunc = (s, n = 26) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// Barras horizontales apiladas. rows: [{ label, sub?, segs: [{ v, color, title }], marks?: [{ v, title }], note? }]
function hbarsSvg(rows, { unit = 'd', max } = {}) {
  if (!rows.length) return '<div class="sub" style="color:var(--faint)">Aún no hay datos suficientes.</div>';
  const W = 720, L = 190, R = 70, rowH = 26, T = 8, H = T + rows.length * rowH + 22;
  const mx = max || Math.max(1, ...rows.map(r => r.segs.reduce((a, s) => a + Math.max(0, s.v), 0)), ...rows.flatMap(r => (r.marks || []).map(m => m.v)));
  const X = v => L + v / mx * (W - L - R);
  let g = '';
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    let acc = 0;
    g += `<text x="${L - 8}" y="${y + 15}" text-anchor="end" class="hb-l"><title>${esc(r.label)}</title>${esc(trunc(r.label))}</text>`;
    for (const s of r.segs) {
      if (s.v <= 0) continue;
      g += `<rect x="${X(acc)}" y="${y + 5}" width="${Math.max(1.5, X(acc + s.v) - X(acc))}" height="${rowH - 10}" rx="3" fill="${s.color}"><title>${esc(s.title || '')}</title></rect>`;
      acc += s.v;
    }
    for (const m of r.marks || []) g += `<line x1="${X(m.v)}" x2="${X(m.v)}" y1="${y + 2}" y2="${y + rowH - 2}" class="hb-mk"><title>${esc(m.title || '')}</title></line>`;
    g += `<text x="${X(acc) + 6}" y="${y + 15}" class="hb-v">${esc(r.note ?? `${fmtInt(Math.round(acc))} ${unit}`)}</text>`;
  });
  // Eje con 4 marcas.
  let ax = '';
  for (let k = 0; k <= 4; k++) { const v = mx * k / 4; ax += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - 20}" class="hb-grid"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle" class="hb-a">${fmtInt(Math.round(v))}</text>`; }
  return `<svg class="hb" viewBox="0 0 ${W} ${H}" width="100%" role="img">${ax}${g}</svg>`;
}

// Dos barras por fila para comparar (ej. primer pedido vs reposición). rows: [{ label, a, b }]
function pairBarsSvg(rows, { aColor, bColor, aName, bName, unit = 'd' }) {
  if (!rows.length) return '<div class="sub" style="color:var(--faint)">Aún no hay datos suficientes.</div>';
  const W = 720, L = 190, R = 70, rowH = 34, T = 8, H = T + rows.length * rowH + 22;
  const mx = Math.max(1, ...rows.flatMap(r => [r.a || 0, r.b || 0]));
  const X = v => L + v / mx * (W - L - R);
  let g = '';
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    g += `<text x="${L - 8}" y="${y + 19}" text-anchor="end" class="hb-l"><title>${esc(r.label)}</title>${esc(trunc(r.label))}</text>`;
    [[r.a, aColor, aName, 4], [r.b, bColor, bName, 17]].forEach(([v, c, n, dy]) => {
      if (v == null) { g += `<text x="${L + 4}" y="${y + dy + 9}" class="hb-a">${esc(n)}: sin dato</text>`; return; }
      g += `<rect x="${L}" y="${y + dy}" width="${Math.max(1.5, X(v) - L)}" height="11" rx="3" fill="${c}"><title>${esc(n)}: ${v} ${unit}</title></rect><text x="${X(v) + 6}" y="${y + dy + 9.5}" class="hb-v">${v} ${unit}</text>`;
    });
  });
  let ax = '';
  for (let k = 0; k <= 4; k++) { const v = mx * k / 4; ax += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - 20}" class="hb-grid"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle" class="hb-a">${fmtInt(Math.round(v))}</text>`; }
  return `<svg class="hb" viewBox="0 0 ${W} ${H}" width="100%" role="img">${ax}${g}</svg>
    <div class="legend"><span><i style="background:${aColor}"></i>${esc(aName)}</span><span><i style="background:${bColor}"></i>${esc(bName)}</span></div>`;
}

// Barras a ambos lados de cero (días antes / después). rows: [{ label, v, title }]
function divergingSvg(rows) {
  if (!rows.length) return '<div class="sub" style="color:var(--faint)">Aún no hay envíos con fecha CHI y llegada real.</div>';
  const W = 720, L = 190, R = 40, rowH = 24, T = 8, H = T + rows.length * rowH + 22;
  const mx = Math.max(5, ...rows.map(r => Math.abs(r.v)));
  const mid = L + (W - L - R) / 2;
  const X = v => mid + v / mx * ((W - L - R) / 2);
  let g = `<line x1="${mid}" x2="${mid}" y1="${T}" y2="${H - 20}" stroke="var(--line)"/>`;
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    const c = r.v > 0 ? CH.late : CH.early;
    g += `<text x="${L - 8}" y="${y + 15}" text-anchor="end" class="hb-l"><title>${esc(r.label)}</title>${esc(trunc(r.label))}</text>
      <rect x="${Math.min(mid, X(r.v))}" y="${y + 5}" width="${Math.max(1.5, Math.abs(X(r.v) - mid))}" height="${rowH - 10}" rx="3" fill="${c}"><title>${esc(r.title || '')}</title></rect>
      <text x="${r.v >= 0 ? X(r.v) + 5 : X(r.v) - 5}" y="${y + 15}" text-anchor="${r.v >= 0 ? 'start' : 'end'}" class="hb-v">${r.v > 0 ? '+' : ''}${r.v} d</text>`;
  });
  g += `<text x="${L + 4}" y="${H - 6}" class="hb-a">← llegó antes</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="hb-a">llegó después →</text>`;
  return `<svg class="hb" viewBox="0 0 ${W} ${H}" width="100%" role="img">${g}</svg>`;
}

// ---------- Tiempos del ciclo ----------
function cycleAnalysisHtml() {
  const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const inPeriod = o => (!UI.aFrom || monthKey(o.date) >= UI.aFrom) && (!UI.aTo || monthKey(o.date) <= UI.aTo);
  // Un ciclo por (producto, envío). Un envío de varios productos cuenta para cada uno.
  const cycles = S.products.flatMap(p => orderKinds(p).filter(k => inPeriod(k.o)).map(k => ({ p, k, o: k.o })));
  const d = (a, b) => (a && b ? daysBetween(parseDay(a), parseDay(b)) : null);
  const uniqBy = arr => [...new Map(arr.map(c => [c.o.id, c])).values()];
  const leadPed = uniqBy(cycles.filter(c => c.k.kind === 'pedido' && c.o.arrived_at)).map(c => d(c.o.date, c.o.arrived_at)).filter(v => v > 0);
  const leadRep = uniqBy(cycles.filter(c => c.k.kind === 'repo' && c.o.arrived_at)).map(c => d(c.o.date, c.o.arrived_at)).filter(v => v > 0);
  const chiDiff = uniqBy(cycles.filter(c => c.o.eta_chi && c.o.arrived_at)).map(c => d(c.o.eta_chi, c.o.arrived_at));
  const toFloor = uniqBy(cycles.filter(c => c.o.arrived_at && c.o.sale_at)).map(c => d(c.o.arrived_at, c.o.sale_at)).filter(v => v >= 0);
  const kpi = (label, v, s, cls = '') => `<div class="kpi ${cls}"><div class="l">${label}</div><div class="v">${v != null ? v : '—'}${v != null ? '<small style="font-size:14px;color:var(--muted)"> días</small>' : ''}</div><div class="s">${s}</div></div>`;
  const chiAvg = avg(chiDiff);

  // 1) Primer pedido vs reposición por producto.
  const pairRows = S.products.map(p => {
    const ks = orderKinds(p).filter(k => k.o.arrived_at && inPeriod(k.o));
    const a = avg(ks.filter(k => k.kind === 'pedido').map(k => d(k.o.date, k.o.arrived_at)).filter(v => v > 0));
    const b = avg(ks.filter(k => k.kind === 'repo').map(k => d(k.o.date, k.o.arrived_at)).filter(v => v > 0));
    return a == null && b == null ? null : { label: p.name, a, b };
  }).filter(Boolean).sort((x, y) => (y.a ?? y.b) - (x.a ?? x.b)).slice(0, 15);

  // 2) Fases de cada ciclo: pedido → bodega (con marca CHI) y bodega → sala.
  const phaseRows = cycles.filter(c => c.o.arrived_at).sort((a, b) => (b.o.date || '').localeCompare(a.o.date || '')).slice(0, 14).map(c => {
    const t1 = d(c.o.date, c.o.arrived_at), t2 = d(c.o.arrived_at, c.o.sale_at);
    const chi = d(c.o.date, c.o.eta_chi);
    return {
      label: `${c.p.name} · ${c.k.text.replace('Reposición', 'Repo')}`,
      segs: [
        { v: Math.max(0, t1), color: c.k.kind === 'pedido' ? CH.pedido : CH.transit, title: `Pedido ${fmtDay(c.o.date)} → bodega ${fmtDay(c.o.arrived_at)}: ${t1} días` },
        ...(t2 != null && t2 >= 0 ? [{ v: t2, color: CH.floor, title: `Bodega → sala ${fmtDay(c.o.sale_at)}: ${t2} días` }] : []),
      ],
      marks: chi != null && chi > 0 ? [{ v: chi, title: `Fecha CHI: ${fmtDay(c.o.eta_chi)} (día ${chi})` }] : [],
      note: `${t1 + (t2 > 0 ? t2 : 0)} d`,
    };
  });

  // 3) Llegada real vs CHI.
  const chiRows = uniqBy(cycles.filter(c => c.o.eta_chi && c.o.arrived_at)).sort((a, b) => (b.o.arrived_at).localeCompare(a.o.arrived_at)).slice(0, 14)
    .map(c => ({ label: `${c.p.name} · ${c.k.text.replace('Reposición', 'Repo')}`, v: d(c.o.eta_chi, c.o.arrived_at), title: `CHI ${fmtDay(c.o.eta_chi)} · llegó ${fmtDay(c.o.arrived_at)}` }));

  return `
  <h2 class="an-h">Tiempos del ciclo</h2>
  <div class="kpis">
    ${kpi('Primer pedido → bodega', avg(leadPed), leadPed.length ? `promedio real de ${leadPed.length} pedido${leadPed.length > 1 ? 's' : ''} · estimado ${leadDays('pedido')} d` : `sin llegadas aún · estimado ${leadDays('pedido')} d`)}
    ${kpi('Reposición → bodega', avg(leadRep), leadRep.length ? `promedio real de ${leadRep.length} ${leadRep.length > 1 ? 'reposiciones' : 'reposición'} · estimado ${leadDays('reposicion')} d` : `sin llegadas aún · estimado ${leadDays('reposicion')} d`)}
    ${kpi('Bodega → sala', avg(toFloor), toFloor.length ? `promedio de ${toFloor.length} llegada${toFloor.length > 1 ? 's' : ''} (incluye control de calidad)` : 'pon la fecha "En sala" de cada envío')}
    <div class="kpi ${chiAvg > 3 ? 'alert' : ''}"><div class="l">Llegada real vs CHI</div><div class="v">${chiAvg != null ? (chiAvg > 0 ? '+' : '') + chiAvg : '—'}${chiAvg != null ? '<small style="font-size:14px;color:var(--muted)"> días</small>' : ''}</div><div class="s">${chiDiff.length ? `${chiDiff.filter(v => v > 0).length} de ${chiDiff.length} llegaron después del CHI` : 'sin envíos con CHI y llegada real'}</div></div>
  </div>
  <div class="cards an-cards">
    <div class="card"><h3>Primer pedido vs reposición <span class="sub">días desde el pedido hasta la bodega, por producto</span></h3>
      ${pairBarsSvg(pairRows, { aColor: CH.pedido, bColor: CH.repo, aName: 'Primer pedido', bName: 'Reposición (promedio)' })}</div>
    <div class="card"><h3>Duración de cada ciclo <span class="sub">últimos envíos que llegaron</span></h3>
      ${hbarsSvg(phaseRows)}
      <div class="legend"><span><i style="background:${CH.pedido}"></i>Pedido inicial → bodega</span><span><i style="background:${CH.transit}"></i>Reposición → bodega</span><span><i style="background:${CH.floor}"></i>Bodega → sala</span><span><i style="background:none;border-left:2px solid #111827;border-radius:0;width:2px"></i>Fecha CHI</span></div></div>
    <div class="card"><h3>Cumplimiento del CHI <span class="sub">días entre la fecha CHI y la llegada real</span></h3>
      ${divergingSvg(chiRows)}</div>
    ${salesRateCardHtml()}
  </div>`;
}

// 4) Ritmo de venta y cobertura de stock por producto.
function salesRateCardHtml() {
  const rows = S.products.map(p => ({ p, pr: projection(p) })).filter(x => x.pr && x.pr.rate)
    .sort((a, b) => b.pr.rate - a.pr.rate).slice(0, 15);
  const today = startOfDay(new Date());
  const hb = hbarsSvg(rows.map(({ p, pr }) => {
    const cover = Math.max(0, Math.round(pr.stockNow / pr.rate));
    const c = pr.level === 'now' ? CH.late : pr.level === 'gap' || pr.level === 'soon' ? '#F29D12' : CH.rate;
    return { label: p.name, segs: [{ v: perMonth(pr.rate), color: c, title: `${fmtInt(perMonth(pr.rate))} u/mes · stock ~${fmtInt(Math.round(pr.stockNow))} u` }], note: `${fmtInt(perMonth(pr.rate))} u/mes · ${cover} d de stock` };
  }), { unit: 'u/mes' });
  return `<div class="card"><h3>Ritmo de venta y cobertura <span class="sub">unidades por mes · días que alcanza el stock hoy</span></h3>
    ${rows.length ? hb : '<div class="sub" style="color:var(--faint)">Registra ventas en los productos en sala para ver su ritmo.</div>'}
    ${rows.length ? `<div class="legend"><span><i style="background:${CH.rate}"></i>Con stock</span><span><i style="background:#F29D12"></i>Pedir pronto / quiebre</span><span><i style="background:${CH.late}"></i>Pedir ya</span></div>` : ''}</div>`;
}

// ---------- Análisis: informe de ventas ----------
// Barra roja arriba (en todas las pestañas): lo que está mal en venta y el inmovilizado.
//   Pedir ya        → ya pasó la fecha para pedir y se va a quedar sin stock
//   Quiebre         → el stock se acaba antes de que llegue lo que viene en camino
//   Venta muy lenta → con el ritmo actual, el stock dura más de un año
//   Inmovilizado    → códigos con stock y sin ninguna venta en el informe
const SLOW_DAYS = 365;
function salesAlertHtml() {
  const prs = S.products.filter(p => p.stage !== DISC).map(p => ({ p, pr: projection(p) })).filter(x => x.pr && x.pr.rate);
  const now = prs.filter(x => x.pr.level === 'now');
  const gap = prs.filter(x => x.pr.level === 'gap');
  const slow = prs.filter(x => x.pr.stockNow / x.pr.rate > SLOW_DAYS);
  const rep = latestReport();
  const dead = rep ? rep.rows.filter(r => r.units === 0 && r.stock > 0) : [];
  if (!now.length && !gap.length && !slow.length && !dead.length) return '';
  if (lsGet('k8r_alert_hidden', '') === isoDay(new Date())) return '';
  const link = x => `<a data-sug-open="${esc(x.p.id)}">${esc(x.p.name)}</a>`;
  const list = (xs, extra) => xs.slice(0, 4).map(x => link(x) + (extra ? ` (${extra(x)})` : '')).join(', ') + (xs.length > 4 ? ` y ${xs.length - 4} más` : '');
  const deadU = dead.reduce((a, r) => a + r.stock, 0);
  const deadV = dead.reduce((a, r) => a + r.stock * (r.price || 0), 0);
  return `<div class="alert-bar bad">${ICON.info}<button class="icon-btn alert-close" data-alert-close title="Ocultar aviso por hoy">${ICON.x}</button>
    ${now.length ? `<span><b>Pedir ya:</b> ${list(now, x => `${fmtInt(x.pr.suggested)} u`)}</span>` : ''}
    ${gap.length ? `<span><b>Quiebre de stock:</b> ${list(gap, x => `sin stock desde el ${fmtShort(isoDay(x.pr.gap.from))}`)}</span>` : ''}
    ${slow.length ? `<span><b>Venta muy lenta:</b> ${list(slow, x => { const m = Math.round(x.pr.stockNow / x.pr.rate / 30); return `stock para ${m < 24 ? `${m} meses` : `${Math.round(m / 12)} años`}`; })}</span>` : ''}
    ${dead.length ? `<span><b>Inmovilizado:</b> <a data-go-dead>${dead.length} código${dead.length > 1 ? 's' : ''} sin venta · ${fmtInt(deadU)} u${deadV ? ` · $ ${fmtInt(Math.round(deadV))}` : ''}</a></span>` : ''}
  </div>`;
}

// (23-11, Vicente) Al tocar «Inmovilizado»: resumen de qué códigos tienen stock y no se vendieron en el período, por producto
function openDeadModal() {
  const rep = latestReport(); if (!rep) return;
  const dead = rep.rows.filter(r => r.units === 0 && r.stock > 0);
  if (!dead.length) return toast('No hay códigos inmovilizados en este período');
  const map = salesMap(); const nombre = fam => { const p = map[fam] && productById(map[fam]); return p ? p.name : titleCase(norm(fam)); };
  const val = r => r.stock * (r.price || 0);
  const grupos = {}; for (const r of dead) (grupos[r.family] || (grupos[r.family] = [])).push(r);
  const orden = Object.entries(grupos).sort((a, b) => b[1].reduce((s, r) => s + val(r), 0) - a[1].reduce((s, r) => s + val(r), 0));
  const totU = dead.reduce((s, r) => s + r.stock, 0), totV = dead.reduce((s, r) => s + val(r), 0);
  const ultima = r => r.last ? `última venta ${fmtDay(r.last)}` : 'sin ventas desde el ' + fmtDay(rep.start);
  openModal(`<div class="m-head"><h3>Inmovilizado</h3><span class="sub">${fmtDay(rep.start)} → ${fmtDay(rep.date)} · códigos con stock y sin ninguna venta en el período</span></div>
    <div class="m-body">
      <div class="kpis" style="margin-bottom:14px">
        <div class="kpi"><div class="l">Códigos</div><div class="v">${dead.length}</div><div class="s">en ${orden.length} producto${orden.length > 1 ? 's' : ''}</div></div>
        <div class="kpi"><div class="l">Unidades paradas</div><div class="v">${fmtInt(totU)}</div><div class="s">en stock</div></div>
        <div class="kpi alert"><div class="l">Valor a precio lista</div><div class="v" style="font-size:22px">$ ${fmtInt(Math.round(totV))}</div><div class="s">sin IVA</div></div>
      </div>
      ${orden.map(([fam, rs]) => `<div class="card" style="margin-bottom:10px"><h3 style="display:flex;gap:8px;align-items:baseline">${esc(nombre(fam))} <span class="sub">${rs.length} código${rs.length > 1 ? 's' : ''} · ${fmtInt(rs.reduce((s, r) => s + r.stock, 0))} u · $ ${fmtInt(Math.round(rs.reduce((s, r) => s + val(r), 0)))}</span></h3>
        <table class="tbl"><thead><tr><th>Código</th><th>Color</th><th>Talla</th><th class="num">Stock</th><th class="num">Precio</th><th class="num">Valor</th><th>Observación</th></tr></thead><tbody>
        ${[...rs].sort((a, b) => val(b) - val(a)).map(r => `<tr><td style="white-space:nowrap">${esc(r.code)}</td><td>${esc(r.color)}</td><td>${esc(r.size)}</td><td class="num"><b>${fmtInt(r.stock)}</b></td><td class="num">$ ${fmtInt(r.price || 0)}</td><td class="num">$ ${fmtInt(Math.round(val(r)))}</td><td class="sub" style="white-space:normal;max-width:240px">${esc(r.obs || ultima(r))}</td></tr>`).join('')}
        </tbody></table></div>`).join('')}
      <div class="sub" style="color:var(--muted);font-size:12px">Idea: estos códigos son candidatos a promoción, liquidación o a no reponer. ${rep.auto ? 'Stock estimado con las ventas del Power BI.' : ''}</div>
    </div>
    <div class="m-foot"><button class="btn primary" data-close>Cerrar</button></div>`);
}

function salesReportHtml() {
  const rep = latestReport();
  if (!rep) return `<div class="card" style="margin:8px 0 16px"><h3>Ventas reales</h3>
    <div class="sub" style="color:var(--muted)">Sube el Excel de ventas (el de Manager, con código, unidades vendidas y stock). Con él, el ritmo, el stock y el sugerido por color y talla salen de las ventas reales en vez de las anotadas a mano.</div></div>`;
  const map = salesMap();
  const fams = [...new Set(rep.rows.map(r => r.family))];
  const unassigned = fams.filter(f => !map[f]);
  const rows = S.products.map(p => ({ p, sr: salesFromReport(p) })).filter(x => x.sr && x.sr.rep.id === rep.id)
    .map(x => ({ ...x, pr: projection(x.p) })).sort((a, b) => b.sr.net - a.sr.net);
  const units = rep.rows.reduce((a, r) => a + r.units, 0);
  const net = rep.rows.reduce((a, r) => a + r.net, 0);
  const stock = rep.rows.reduce((a, r) => a + Math.max(0, r.stock), 0);
  const dead = rep.rows.filter(r => r.units === 0 && r.stock > 0);
  const topSize = rs => { const by = {}; rs.forEach(r => { by[r.size] = (by[r.size] || 0) + r.units; }); const t = Object.entries(by).sort((a, b) => b[1] - a[1])[0]; return t && t[1] ? t[0] : '—'; };
  const topColor = rs => { const by = {}; rs.forEach(r => { by[r.color] = (by[r.color] || 0) + r.units; }); const t = Object.entries(by).sort((a, b) => b[1] - a[1])[0]; return t && t[1] ? t[0] : '—'; };
  const abcCount = l => rep.rows.filter(r => norm(r.abc).startsWith(l)).length;
  return `
  <h2 class="an-h">Ventas reales <span class="sub" style="font-weight:500;color:var(--faint);font-size:12px">${rep.auto ? `${fmtDay(rep.start)} → ${fmtDay(rep.date)} · <b style="color:var(--ok)">automático desde Power BI</b> · stock = Excel del ${fmtDay(rep.base)} − lo vendido después` : `informe ${rep.start ? `${fmtDay(rep.start)} → ` : 'al '}${fmtDay(rep.date)} · ${S.salesreports.length} informe${S.salesreports.length > 1 ? 's' : ''} guardado${S.salesreports.length > 1 ? 's' : ''}`}</span>
    <button class="btn sm" id="sales-map" style="margin-left:8px">Asignar familias</button></h2>
  ${unassigned.length ? `<div class="callout warn" style="margin-bottom:10px">${ICON.info}<div>${unassigned.length} familia${unassigned.length > 1 ? 's' : ''} sin producto asignado: ${unassigned.slice(0, 6).map(esc).join(', ')}${unassigned.length > 6 ? '…' : ''}. No entran al análisis hasta asignarlas.</div></div>` : ''}
  <div class="kpis">
    <div class="kpi"><div class="l">Unidades vendidas</div><div class="v">${fmtInt(units)}</div><div class="s">${rep.rows.length} códigos</div></div>
    <div class="kpi"><div class="l">Venta neta</div><div class="v" style="font-size:22px">$ ${fmtInt(Math.round(net))}</div><div class="s">sin IVA</div></div>
    <div class="kpi"><div class="l">Stock total</div><div class="v">${fmtInt(stock)}</div><div class="s">A ${abcCount('A')} · B ${abcCount('B')} · C ${abcCount('C')} códigos</div></div>
    <div class="kpi click ${dead.length ? 'alert' : ''}" data-dead-open title="Ver cuáles son" style="cursor:pointer"><div class="l">Inmovilizado <span style="float:right;opacity:.6">ver ›</span></div><div class="v">${dead.length}</div><div class="s">${fmtInt(dead.reduce((a, r) => a + r.stock, 0))} u. con stock y sin venta</div></div>
  </div>
  <div class="card" style="margin-bottom:16px"><h3>Por producto <span class="sub">clic para ver cada color y talla</span></h3>
    ${rows.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Vendidas</th><th class="num">Venta neta</th><th class="num">Ritmo</th><th class="num">Stock</th><th class="num">Alcanza</th><th>Más vendido</th><th>Pedir antes de</th><th class="num">Sugerido</th><th>Estado</th></tr></thead><tbody>
      ${rows.map(({ p, sr, pr }) => {
        const rate = pr && pr.rate ? pr.rate : sr.overall;
        const cover = rate ? Math.round(sr.stock / rate) : null;
        return `<tr class="click" data-sales-detail="${esc(p.id)}"><td><b>${esc(p.name)}</b><div class="sub" style="font-size:11px;color:var(--faint)">${esc(sr.fams.join(', '))}${sr.recent != null && sr.overall && sr.recent > sr.overall * 1.1 ? ' · ▲ vendiendo más rápido' : sr.recent != null && sr.overall && sr.recent < sr.overall * .9 ? ' · ▼ vendiendo más lento' : ''}</div></td>
          <td class="num">${fmtInt(sr.units)}</td><td class="num">$ ${fmtInt(Math.round(sr.net))}</td><td class="num">${rate ? fmtInt(perMonth(rate)) + ' u/mes' : '—'}</td>
          <td class="num">${fmtInt(sr.stock)}</td><td class="num">${cover != null ? `<span class="${cover < 30 ? 'cov-bad' : cover < 90 ? 'cov-warn' : 'cov-ok'}">${cover} d</span>` : '—'}</td>
          <td style="white-space:nowrap">${esc(topColor(sr.rows))} · <b>${esc(topSize(sr.rows))}</b></td>
          <td style="white-space:nowrap">${pr && pr.reorderBy ? fmtDay(pr.reorderBy) : '—'}</td>
          <td class="num"><b>${pr && pr.suggested != null ? fmtInt(pr.suggested) : '—'}</b>${pr && pr.capInfo && pr.capInfo.capped ? `<div class="sub" style="font-size:10.5px;color:var(--faint)" title="Sin tope: ${fmtInt(pr.capInfo.uncapped)}">con tope ×${pr.capInfo.growth.toFixed(1).replace('.', ',')}</div>` : ''}</td>
          <td>${pr && pr.level ? `<span class="tag ${LEVEL_TXT[pr.level][0]}">${LEVEL_TXT[pr.level][1]}</span>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="sub" style="color:var(--faint)">Asigna las familias del informe a productos del mix para verlos aquí.</div>'}
  </div>
  ${dead.length ? `<div class="card" id="dead-card" style="margin-bottom:16px"><h3>Inmovilizado <span class="sub">con stock y sin venta en el período</span></h3>
    <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Código</th><th>Descripción</th><th class="num">Stock</th><th class="num">Precio lista</th><th class="num">Valor a precio lista</th></tr></thead><tbody>
    ${[...dead].sort((a, b) => b.stock * b.price - a.stock * a.price).slice(0, 15).map(r => `<tr><td style="white-space:nowrap">${esc(r.code)}</td><td>${esc(r.desc)}</td><td class="num">${fmtInt(r.stock)}</td><td class="num">$ ${fmtInt(r.price)}</td><td class="num">$ ${fmtInt(r.stock * r.price)}</td></tr>`).join('')}
    </tbody></table></div>${dead.length > 15 ? `<div class="sub" style="color:var(--faint);margin-top:6px">y ${dead.length - 15} más.</div>` : ''}</div>` : ''}`;
}

// ---------- Análisis ----------
function analysisHtml() {
  const today = startOfDay(new Date());
  const withPr = S.products.map(p => ({ p, pr: projection(p) })).filter(x => x.pr && x.pr.rate);
  withPr.sort((a, b) => a.pr.reorderBy - b.pr.reorderBy);
  const sel = productById(UI.aProduct) && projection(productById(UI.aProduct)) ? productById(UI.aProduct) : (withPr[0] && withPr[0].p);
  const selPr = sel && projection(sel);
  const allMonths = S.orders.map(o => monthKey(o.date)).filter(Boolean).sort();
  const periodOrders = S.orders.filter(o => (!UI.aFrom || monthKey(o.date) >= UI.aFrom) && (!UI.aTo || monthKey(o.date) <= UI.aTo));
  return `
  <div class="toolbar" style="padding:8px 0 4px">
    <span class="month-range">Periodo: desde <input type="month" id="a-from" value="${esc(UI.aFrom)}"> hasta <input type="month" id="a-to" value="${esc(UI.aTo)}">${UI.aFrom || UI.aTo ? '<button class="btn ghost sm" id="a-clear">Todo</button>' : ''}</span>
    <div class="spacer"></div>
    <span class="tag blue" style="height:28px;font-size:12.5px">${periodOrders.length} envíos · ${fmtInt(periodOrders.reduce((a, o) => a + o.total, 0))} unidades en el periodo</span>
    <button class="btn primary" id="sales-up">${ICON.upload} Subir informe de ventas</button>
  </div>

  ${salesReportHtml()}

  <div class="card" style="margin:8px 0 16px"><h3>Qué pedir <span class="sub">sugerido por producto, color y talla · mínimo de fábrica ${fmtInt(getSetting('min_qty', DEFAULT_MIN_QTY))} u por pedido y ${fmtInt(sizeMinQty())} u por talla</span>
    <button class="btn sm" data-sug-xlsx style="margin-left:auto">${ICON.download} Descargar Excel</button></h3>
    ${sugSummaryHtml()}</div>

  <div class="card" style="margin:8px 0 16px"><h3>Sugerido de reposición <span class="sub">según ventas registradas · cobertura ${coverDays()} d · la demora se aprende de las llegadas reales de cada producto</span></h3>
    ${withPr.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Vendidas</th><th class="num">Ritmo</th><th class="num">Stock est.</th><th>Se agota</th><th class="num">Demora repo</th><th>Pedir antes de</th><th class="num">Sugerido</th><th>Estado</th></tr></thead><tbody>
      ${withPr.map(({ p, pr }) => `<tr class="click" data-pj="${esc(p.id)}"${sel && sel.id === p.id ? ' style="background:#F5F8FF"' : ''}><td><b>${esc(p.name)}</b><div class="sub" style="font-size:11px;color:var(--faint)">${pr.recent != null && pr.overall != null && pr.recent > pr.overall * 1.1 ? '▲ se está vendiendo más rápido' : pr.recent != null && pr.overall != null && pr.recent < pr.overall * .9 ? '▼ se está vendiendo más lento' : esc(p.line)}</div></td>
        <td class="num">${fmtInt(pr.last.units)}</td><td class="num">${fmtInt(perMonth(pr.rate))} u/mes</td><td class="num">${fmtInt(Math.round(pr.stockNow))}</td>
        <td style="white-space:nowrap">${fmtDay(pr.sellout)}</td>
        <td class="num" title="${esc(leadSrcTxt(pr.leadInfo))}">${pr.lead} d<div class="sub" style="font-size:10.5px;color:var(--faint)">${pr.leadInfo.src === 'product' ? 'real' : pr.leadInfo.src === 'all' ? 'prom. general' : 'estimada'}</div></td>
        <td style="white-space:nowrap"><b>${fmtDay(pr.reorderBy)}</b><div class="sub" style="font-size:11px;color:var(--faint)">${pr.daysToReorder <= 0 ? `hace ${-pr.daysToReorder} d` : `en ${pr.daysToReorder} d`}</div></td>
        <td class="num"><b>${fmtInt(pr.suggested)}</b></td><td><span class="tag ${LEVEL_TXT[pr.level][0]}">${LEVEL_TXT[pr.level][1]}</span></td></tr>`).join('')}
    </tbody></table></div>` : `<div class="sub" style="color:var(--muted)">Para calcular el sugerido, abre un producto en venta y registra en <b>Ventas registradas</b> cuántas unidades se llevan vendidas a una fecha (por ejemplo: al 15-10 se vendieron 1.000). Con la fecha de entrada a sala y las unidades recibidas, el programa calcula el ritmo, cuándo se agota y cuánto pedir. Cuando tengas el informe de ventas, esto se llenará solo.</div>`}
  </div>

  ${sel && selPr && selPr.rate ? `<div class="card" style="margin-bottom:16px"><h3>Proyección · ${esc(sel.name)} <span class="sub">clic en otro producto de la tabla para verlo</span></h3>
    <div class="pj-wrap">
      <div>${projectionSvg(sel, selPr)}</div>
      <div class="pj-side">
        <div class="pj-sum col">
          <div><span>Recibidas</span><b>${fmtInt(selPr.received)}</b> u</div>
          <div><span>En camino</span><b>${fmtInt(selPr.incoming)}</b> u</div>
          <div><span>Vendidas al ${fmtShort(selPr.last.date)}</span><b>${fmtInt(selPr.last.units)}</b> u</div>
          <div><span>Ritmo reciente</span><b>${selPr.recent != null ? fmtInt(perMonth(selPr.recent)) : '—'}</b> u/mes</div>
          <div><span>Ritmo desde sala</span><b>${selPr.overall != null ? fmtInt(perMonth(selPr.overall)) : '—'}</b> u/mes</div>
        </div>
        <div class="callout ${selPr.level === 'now' ? 'warn' : ''}" style="margin-top:10px">${ICON.info}<div>
          ${selPr.level === 'now' ? '<b>Hay que pedir ya.</b> ' : ''}${selPr.gap ? `<b>Ojo:</b> el stock actual se acaba el <b>${fmtDay(selPr.gap.from)}</b> y lo que viene en camino llega el ${fmtDay(selPr.gap.to)} (${daysBetween(selPr.gap.from, selPr.gap.to)} días sin stock). ` : ''}
          ${selPr.incoming ? `Contando las ${fmtInt(selPr.incoming)} u en camino, al ritmo actual` : 'Al ritmo actual'} se agota el <b>${fmtDay(selPr.sellout)}</b>. Una reposición de este producto demora ~${selPr.lead} días (${leadSrcTxt(selPr.leadInfo)}), así que conviene enviar el próximo pedido antes del <b>${fmtDay(selPr.reorderBy)}</b>.
          Sugerido: <b>${fmtInt(selPr.suggested)} u</b>${selPr.capInfo && selPr.capInfo.capped ? ' (con tope según la venta, ver abajo)' : `, para que al llegar alcancen ${coverDays()} días de venta`}${selPr.stockAtNewArrival > 0 ? ` (a esa fecha quedarían ~${fmtInt(Math.round(selPr.stockAtNewArrival))} u)` : ''}.</div></div>
        ${capExplainHtml(selPr)}
      </div>
    </div>
    <div style="margin-top:14px">${sugBlockHtml(sel, selPr)}</div>
    ${selPr.split.length ? `<div class="sub" style="color:var(--faint);font-size:11.5px;margin-top:-6px">${selPr.sr
      ? `Reparto según lo que vende cada color y talla y su stock real (informe al ${fmtDay(selPr.sr.rep.date)}) · <a href="#" data-sales-detail="${esc(sel.id)}">ver ventas por color y talla</a>`
      : `Reparto en la proporción del ${esc(orderLabel(selPr.ref, sel).text.toLowerCase())} del ${fmtDay(selPr.ref.date)}; se ajustará con el informe de ventas`}</div>` : ''}
  </div>` : ''}

  <div class="card" style="margin-bottom:16px"><h3>Unidades pedidas por mes</h3>
    ${monthBarsSvg(ordersByMonth(periodOrders, UI.aFrom || allMonths[0], UI.aTo || allMonths[allMonths.length - 1]), { legend: true })}</div>

  ${cycleAnalysisHtml()}

  <h2 class="an-h">Llegadas y ritmo de reposición</h2>
  ${arrivalsAnalysisHtml()}`;
}

// ---------- Análisis: tiempos de llegada y ritmo de reposición ----------
function arrivalsAnalysisHtml() {
  const today = startOfDay(new Date());
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;

  const inProd = S.products.filter(p => p.stage === PRODUCTION);
  const noEta = inProd.filter(p => !productEta(p));
  const upcoming = S.products.map(p => ({ p, e: productEta(p) })).filter(x => x.e && x.p.stage !== DISC)
    .sort((a, b) => a.e.date.localeCompare(b.e.date));

  // Por producto: envíos, unidades, días entre envíos, demora real y desde cuándo está en venta.
  const rows = S.products.map(p => {
    const os = ordersOf(p);
    const sale = saleSince(p);
    if (!os.length && !sale) return null;
    const repos = orderKinds(p).filter(k => k.kind === 'repo').map(k => k.o);
    const gaps = repos.slice(1).map((o, i) => daysBetween(parseDay(repos[i].date), parseDay(o.date)));
    const lead = os.filter(o => o.arrived_at).map(o => daysBetween(parseDay(o.date), parseDay(o.arrived_at)));
    const units = os.reduce((a, o) => a + o.total, 0);
    // Días desde que entró a sala hasta el correo de la primera reposición posterior.
    const firstRepo = sale ? repos.find(o => parseDay(o.date) >= startOfDay(sale)) : null;
    const saleToRepo = firstRepo ? daysBetween(sale, parseDay(firstRepo.date)) : null;
    return { p, os, repos, gaps, lead, units, eta: productEta(p), sale, saleToRepo, open: openRepo(p) };
  }).filter(Boolean).sort((a, b) => (b.sale ? 1 : 0) - (a.sale ? 1 : 0) || b.units - a.units);
  const saleToRepoAvg = avg(rows.filter(r => r.saleToRepo != null).map(r => r.saleToRepo));
  const repoGapAvg = avg(rows.flatMap(r => r.gaps));

  return `
  <div class="kpis">
    <div class="kpi"><div class="l">En producción</div><div class="v">${inProd.length}</div><div class="s">${noEta.length} sin fecha de llegada</div></div>
    <div class="kpi ${upcoming.some(x => parseDay(x.e.date) < today) ? 'alert' : ''}"><div class="l">Llegadas atrasadas</div><div class="v">${upcoming.filter(x => parseDay(x.e.date) < today).length}</div><div class="s">fecha estimada ya pasó</div></div>
  </div>
  <div class="cards">
    <div class="card"><h3>Próximas llegadas <span class="sub">${upcoming.length}</span></h3>
      ${upcoming.length ? `<table class="tbl"><thead><tr><th>Producto</th><th>Etapa</th><th>Llega</th><th class="num">Faltan</th></tr></thead><tbody>${upcoming.map(({ p, e }) => {
        const dd = daysBetween(today, parseDay(e.date));
        return `<tr class="click" data-open="${esc(p.id)}"><td><b>${esc(p.name)}</b><div class="sub" style="color:var(--faint);font-size:11px">${e.order ? esc(orderLabel(e.order, p).text) + ' del ' + fmtDay(e.order.date) : 'fecha de la ficha'}</div></td>
          <td><span class="tag" style="${pillStyle(p.stage)}">${esc(stage(p.stage).short)}</span></td><td style="white-space:nowrap">${fmtDay(e.date)}</td>
          <td class="num">${dd < 0 ? `<span class="tag bad">${-dd} d atraso</span>` : `<b>${dd}</b> d`}</td></tr>`;
      }).join('')}</tbody></table>` : '<div class="sub" style="color:var(--faint)">Aún no hay fechas de llegada. Ponlas en cada envío o en la ficha del producto.</div>'}
    </div>
    <div class="card"><h3>En producción sin fecha de llegada <span class="sub">${noEta.length}</span></h3>
      <div class="sub" style="color:var(--muted);margin:-6px 0 8px;font-size:12px">Pedir a ${esc(stageResp(PRODUCTION).join(', ') || 'producción')} la fecha aproximada.</div>
      ${noEta.length ? noEta.map(p => `<div class="list-item click" data-open="${esc(p.id)}"><span class="dot" style="background:${stage(PRODUCTION).c}"></span><div class="grow"><b>${esc(p.name)}</b><div class="sub">${esc(p.line)} · en producción desde ${fmtDay(stageStart(p, PRODUCTION))}</div></div></div>`).join('') : '<div class="sub" style="color:var(--faint)">Todos tienen fecha.</div>'}
    </div>
  </div>
  <div class="kpis" style="margin-top:16px">
    <div class="kpi"><div class="l">De sala a 1ª reposición</div><div class="v">${saleToRepoAvg != null ? saleToRepoAvg : '—'}${saleToRepoAvg != null ? '<small style="font-size:14px;color:var(--muted)"> días</small>' : ''}</div><div class="s">promedio desde la entrada a sala hasta el correo</div></div>
    <div class="kpi"><div class="l">Entre reposiciones</div><div class="v">${repoGapAvg != null ? repoGapAvg : '—'}${repoGapAvg != null ? '<small style="font-size:14px;color:var(--muted)"> días</small>' : ''}</div><div class="s">promedio entre un correo de reposición y el siguiente</div></div>
    <div class="kpi"><div class="l">En venta con reposición en curso</div><div class="v">${S.products.filter(p => p.stage >= SALE && p.stage !== DISC && openRepo(p)).length}</div><div class="s">↻ en el Gantt</div></div>
  </div>
  <div class="card"><h3>Ritmo de reposición por producto</h3>
    ${rows.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Producto</th><th>En sala desde</th><th class="num">Días en sala</th><th class="num">Sala → 1ª repo</th><th class="num">Reposiciones</th><th class="num">Días entre repos</th><th class="num">Unidades pedidas</th><th class="num">Demora llegada</th><th>Reposición en curso</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="click" data-open="${esc(r.p.id)}"><td><span class="dot" style="background:${stage(r.p.stage).c};display:inline-block;margin-right:6px"></span><b>${esc(r.p.name)}</b></td>
        <td style="white-space:nowrap">${r.sale ? fmtDay(r.sale) : '<span style="color:var(--faint)">—</span>'}</td>
        <td class="num">${r.sale ? daysBetween(r.sale, today) + 1 : '—'}</td>
        <td class="num">${r.saleToRepo != null ? `${r.saleToRepo} d` : '—'}</td>
        <td class="num">${repoCount(r.p)}</td>
        <td class="num">${r.gaps.length ? `${avg(r.gaps)} d` : '—'}</td>
        <td class="num">${fmtInt(r.units)}</td>
        <td class="num">${r.lead.length ? `${avg(r.lead)} d` : '—'}</td>
        <td style="white-space:nowrap">${r.open ? `<span class="repo-chip">↻ ${esc(r.open.text)}</span> <span class="sub" style="font-size:11px;color:var(--faint)">${r.open.order.eta ? 'llega ' + fmtDay(r.open.order.eta) : 'sin fecha'}</span>` : '—'}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="sub" style="color:var(--faint)">Pon la fecha "En sala de venta desde" en la ficha de cada producto y registra sus reposiciones para ver aquí cada cuánto se repone.</div>'}
  </div>
  <div class="card" style="margin-top:16px"><h3>Ventas y sugerido de compra <span class="tag">Próximamente</span></h3>
    <div class="sub" style="color:var(--muted)">Cuando definamos el formato del informe de ventas, aquí se calculará cuánto se vende entre una reposición y otra, la velocidad de venta por color y talla, y un sugerido de cuándo pedir, cuánto y en qué colores y tallas, usando la demora de llegada de arriba.</div>
  </div>`;
}

// Número total de reposiciones: las subidas al programa se cuentan solas; se guarda solo la diferencia.
async function editRepoCount(p) {
  const registered = orderKinds(p).filter(k => k.kind === 'repo').length;
  const ans = prompt(`¿Cuántas reposiciones lleva "${p.name}" en total?${registered ? `\n(${registered} ya están subidas en Pedidos y Reposiciones)` : ''}`, String(repoCount(p)));
  if (ans === null) return;
  const n = parseInt(ans, 10);
  if (isNaN(n) || n < 0) return toast('Escribe un número', true);
  if (n < registered) return toast(`No puede ser menos que las ${registered} subidas`, true);
  p.repo_base = n - registered || null;
  p.updated_at = nowIso();
  await save('products', p);
  toast(`${p.name}: Repo ${n}`);
  render();
}

// ---------- Fechas clave del producto ----------
// Fecha de una etapa = la primera vez que el producto entró a ella.
const firstStageDate = (p, n) => { const e = eventsOf(p).find(x => x.stage === n); return e ? e.at : null; };

// ---------- Ciclos del producto: pedido inicial y reposiciones ----------
// Cada fila es un envío (con o sin Excel) con sus fechas: pedido, llegada aproximada,
// llegada a bodega según CHI, llegada real a bodega y entrada a sala. Todo editable.
const CYCLE_FIELDS = [
  ['date', 'Pedido', 'Fecha del correo / pedido'],
  ['eta_chi', 'CHI', 'Llegada a bodega según CHI'],
  ['arrived_at', 'Bodega', 'Llegada real a bodega'],
  ['sale_at', 'En sala', 'Entrada a la sala de venta'],
];

function cyclesHtml(p) {
  const ks = orderKinds(p);
  const al = arrivalAlert(p);
  const hasPedido = ks.some(k => k.kind === 'pedido');
  const tip = (k) => {
    const o = k.o, bits = [];
    if (o.date && o.arrived_at) bits.push(`demoró ${daysBetween(parseDay(o.date), parseDay(o.arrived_at))} d en llegar`);
    if (o.eta_chi && o.arrived_at) { const d = daysBetween(parseDay(o.eta_chi), parseDay(o.arrived_at)); bits.push(`${d >= 0 ? '+' : ''}${d} d vs CHI`); }
    if (o.arrived_at && o.sale_at) bits.push(`${daysBetween(parseDay(o.arrived_at), parseDay(o.sale_at))} d de bodega a sala`);
    return bits.join(' · ');
  };
  return `
    ${al ? `<div class="callout ${al.level === 'late' ? 'warn' : ''}" style="margin-bottom:10px">${ICON.flag}<div>${al.level === 'late' ? `La llegada ${al.chi ? 'según CHI' : 'aproximada'} era el <b>${fmtDay(al.date)}</b> (hace ${-al.dd} días). Pon la llegada real o actualiza la fecha.` : `Llega pronto: <b>${fmtDay(al.date)}</b>, en ${al.dd} día${al.dd === 1 ? '' : 's'}${al.chi ? ' (según CHI)' : ''}.`}</div></div>` : ''}
    ${ks.length ? `<div class="cyc-wrap"><table class="cyc"><thead><tr><th></th>${CYCLE_FIELDS.map(f => `<th title="${f[2]}">${f[1]}</th>`).join('')}<th title="Unidades pedidas">Unid.</th><th></th></tr></thead><tbody>
      ${ks.map(k => {
        const o = k.o, t = tip(k);
        return `<tr>
          <td><select class="kind-sel ${k.kind}" data-cyc-kind="${esc(o.id)}" title="Tipo de envío · ${esc(o.title || '')}">
            <option value="pedido"${k.kind === 'pedido' ? ' selected' : ''}>Pedido</option>
            <option value="repo"${k.kind === 'repo' ? ' selected' : ''}>${k.kind === 'repo' ? esc(k.text.replace('Reposición', 'Repo')) : 'Repo'}</option>
          </select></td>
          ${CYCLE_FIELDS.map(([f, , title]) => `<td><input type="date" class="cyc-in" data-cyc="${esc(o.id)}" data-f="${f}" value="${esc(o[f] || '')}" title="${title}"></td>`).join('')}
          <td><input type="number" min="0" class="cyc-in num" data-cyc="${esc(o.id)}" data-f="total" value="${o.total || ''}" placeholder="—" title="Unidades pedidas"${(o.lines || []).length ? ' readonly' : ''}></td>
          <td class="cyc-act">${o.file_id ? `<button class="icon-btn" data-dl="${esc(o.file_id)}" title="Descargar Excel">${ICON.download}</button>` : ''}<button class="icon-btn" data-order-row="${esc(o.id)}" title="Abrir detalle">${ICON.eye}</button><button class="icon-btn del" data-cyc-del="${esc(o.id)}" title="Borrar esta fila">${ICON.trash}</button></td>
        </tr>${t ? `<tr class="cyc-note"><td></td><td colspan="6">${esc(t)}</td></tr>` : ''}`;
      }).join('')}
    </tbody></table></div>` : `<div class="sub" style="color:var(--faint)">Sin pedido ni reposiciones registradas.</div>`}
    <div class="cyc-add">
      ${!hasPedido ? `<button class="btn sm" data-add-cycle="pedido">+ Pedido inicial</button>` : ''}
      <button class="btn sm" data-add-cycle="repo">+ Reposición sin Excel</button>
      <span class="sub" style="color:var(--faint);font-size:11px">para anotar fechas de pedidos hechos antes del programa</span>
    </div>
    <label class="check-row"><input type="checkbox" data-first-order${alreadySelling(p) ? ' checked' : ''}${(alreadySelling(p) && !p.had_first_order && !p.repo_base) ? ' disabled' : ''}>
      <span>El primer pedido se hizo antes del programa <span class="sub">(lo que se suba cuenta como reposición)</span>${alreadySelling(p) && !p.had_first_order && !p.repo_base ? '<span class="sub"> · ya llegó antes, se marca solo</span>' : ''}</span></label>
    <div class="kv" style="margin-top:6px"><div class="k">Reposiciones hechas</div><div style="display:flex;align-items:center;gap:8px"><b>${repoCount(p)}</b><button class="btn sm" data-repo-count="${esc(p.id)}">Cambiar</button><span class="sub" style="color:var(--faint);font-size:11px">${p.repo_base ? `${p.repo_base} anotada${p.repo_base > 1 ? 's' : ''} a mano` : ''}</span></div></div>
    ${p.stage === PRODUCTION && !productEta(p) ? '<div class="sub" style="color:#B26B00;font-size:11.5px;margin-top:6px">En producción sin fecha de llegada: pídela a ' + esc(stageResp(PRODUCTION).join(', ') || 'producción') + '.</div>' : ''}`;
}

function bindCycles(d, p) {
  $$('[data-cyc]', d).forEach(inp => {
    const h = () => saveCycleField(p, inp);
    if (inp.type === 'date') onDateCommit(inp, h); else inp.onchange = h;
  });
  async function saveCycleField(p, inp) {
    const o = S.orders.find(x => x.id === inp.dataset.cyc);
    if (!o) return;
    const f = inp.dataset.f;
    const before = o[f];
    if (f === 'total') o.total = Math.max(0, parseInt(inp.value, 10) || 0);
    else {
      if (f === 'date' && !inp.value) { inp.value = o.date; return toast('El pedido necesita fecha', true); }
      o[f] = inp.value || null;
    }
    await save('orders', o);
    if (f === 'eta' || f === 'eta_chi') await syncProductEta(o);
    const isLast = openOrderOf(p) === o || ordersOf(p).slice(-1)[0] === o;
    // En el envío más reciente, llegar a bodega o entrar a sala puede mover la etapa.
    if (isLast && f === 'arrived_at' && o.arrived_at && !before) await offerArrival(o);
    if (isLast && f === 'sale_at' && o.sale_at && p.stage < SALE && confirm(`¿Pasar "${p.name}" a la etapa Venta desde el ${fmtDay(o.sale_at)}?`)) {
      const at = parseDay(o.sale_at); at.setHours(9);
      await setStage(p, SALE, 'Entrada a sala', at.toISOString());
    }
    toast(f === 'total' ? 'Unidades guardadas' : 'Fecha guardada');
    renderKeepFocus();
  }
  // Tipo de cada fila: Pedido o Reposición (queda fijo, ya no automático).
  $$('[data-cyc-kind]', d).forEach(sel => sel.onchange = async () => {
    const o = S.orders.find(x => x.id === sel.dataset.cycKind);
    if (!o) return;
    o.kind = sel.value;
    await save('orders', o);
    toast(sel.value === 'pedido' ? 'Marcado como Pedido' : 'Marcado como Reposición');
    render();
  });
  // Borrar una fila. Si el envío es de varios productos, solo se quita de este.
  $$('[data-cyc-del]', d).forEach(b => b.onclick = async e => {
    e.stopPropagation();
    const o = S.orders.find(x => x.id === b.dataset.cycDel);
    if (!o) return;
    const label = orderLabel(o, p).text;
    const others = (o.product_ids || []).filter(id => id !== p.id);
    const f = fileById(o.file_id);
    if (others.length) {
      if (!confirm(`"${label}" del ${fmtDay(o.date)} también es de ${others.map(id => (productById(id) || {}).name).filter(Boolean).join(', ')}.\n¿Quitarlo solo de "${p.name}"?`)) return;
      o.product_ids = others;
      await save('orders', o);
    } else {
      const empty = !o.total && !o.eta_chi && !o.arrived_at && !o.sale_at && !f;
      if (!empty && !confirm(`¿Borrar "${label}" del ${fmtDay(o.date)}${o.total ? ` (${fmtInt(o.total)} u.)` : ''}${f ? ' y su Excel de respaldo' : ''}?\nNo se puede deshacer.`)) return;
      await deleteOrderFiles(o);
      await remove('orders', o.id);
    }
    toast(`${label} borrado`);
    render();
  });
  $$('[data-add-cycle]', d).forEach(b => b.onclick = async () => {
    const kind = b.dataset.addCycle;
    const first = ordersOf(p)[0];
    // El pedido inicial se fecha antes del primer envío registrado para que quede primero.
    const date = kind === 'pedido' && first ? isoDay(new Date(parseDay(first.date).getTime() - DAY)) : isoDay(new Date());
    const o = {
      id: uid(), date, title: p.name, doc_title: 'Registro manual', product_ids: [p.id],
      total: 0, lines: [], status: kind === 'pedido' ? 'Recibido' : 'Enviado a gerencia',
      sent_by: me(), note: 'Agregado a mano', file_id: null, created_at: nowIso(), kind,
    };
    await save('orders', o);
    toast(kind === 'pedido' ? 'Pedido inicial agregado: pon sus fechas' : 'Reposición agregada: pon sus fechas');
    render();
  });
  const fo = $('[data-first-order]', d);
  if (fo) fo.onchange = async () => { p.had_first_order = fo.checked || null; p.updated_at = nowIso(); await save('products', p); toast(fo.checked ? 'Los próximos envíos de este producto cuentan como reposición' : 'El primer envío vuelve a contar como Pedido'); render(); };
  $$('[data-repo-count]', d).forEach(b => b.onclick = e => { e.stopPropagation(); editRepoCount(p); });
}

// ---------- Productos ya en sala que aparecen en otra etapa ----------
// Si el producto ya entró a sala, su etapa principal es Venta: las reposiciones se siguen con
// el contador "Repo" y la tabla de pedido y reposiciones, no cambiando la etapa del producto.
const POST_SALE_NOISE = [PRODUCTION, ARRIVAL, 5, 7];
const inFloorButOther = p => !!saleSince(p) && POST_SALE_NOISE.includes(p.stage);

// Deja el producto en Venta desde su fecha de entrada a sala. Con `clean`, quita del historial
// las etapas (producción, llegada, calidad, reposición) anotadas después de esa fecha.
async function moveToSale(p, clean) {
  const since = saleSince(p);
  let ev = eventsOf(p).find(e => e.stage === SALE);
  if (!ev) {
    ev = { id: uid(), product_id: p.id, stage: SALE, at: since, by: me(), note: 'Entrada a sala' };
    await save('events', ev);
  }
  if (clean) {
    const extra = eventsOf(p).filter(e => e.id !== ev.id && e.at > ev.at && POST_SALE_NOISE.includes(e.stage));
    for (const e of extra) await remove('events', e.id);
  }
  const last = eventsOf(p).pop();
  if (!last || last.stage !== SALE) await save('events', { id: uid(), product_id: p.id, stage: SALE, at: nowIso(), by: me(), note: 'Ya está en sala' });
  p.stage = SALE; p.updated_at = nowIso();
  await save('products', p);
}

function openFloorFix(onlyId) {
  const list = S.products.filter(p => inFloorButOther(p) && (!onlyId || p.id === onlyId));
  if (!list.length) return toast('No hay productos en sala con otra etapa');
  openModal(`
    <div class="m-head"><h2>Pasar a Venta los productos que ya están en sala</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="sub" style="color:var(--muted);margin-bottom:10px">Estos productos tienen fecha de entrada a sala, pero su etapa dice otra cosa. Sus reposiciones no se pierden: se siguen viendo con <b>↻ Repo</b> y la franja verde del Gantt.</div>
      <div class="prod-pick" style="max-height:340px">${list.map(p => `<label><input type="checkbox" value="${esc(p.id)}" checked><span class="dot" style="background:${stage(p.stage).c}"></span><span>${esc(p.name)} <span class="sub" style="color:var(--faint)">· ${esc(p.line)}</span></span>
        <span style="margin-left:auto;display:flex;gap:6px;align-items:center"><span class="tag" style="${pillStyle(p.stage)}">${esc(stage(p.stage).name)}</span>→<span class="tag" style="${pillStyle(SALE)}">Venta</span><span class="sub" style="color:var(--faint);font-size:11px">en sala desde ${fmtShort(saleSince(p))}</span></span></label>`).join('')}</div>
      <label class="check-row"><input type="checkbox" id="ff-clean" checked><span>Quitar del historial las etapas anotadas después de entrar a sala <span class="sub">(recomendado: la barra queda en Venta de corrido)</span></span></label>
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ff-go">Pasar a Venta</button></div>`, {
    onMount: w => {
      $('#ff-go', w).onclick = async () => {
        const ids = $$('.prod-pick input:checked', w).map(i => i.value);
        if (!ids.length) return toast('Marca al menos un producto', true);
        const clean = $('#ff-clean', w).checked;
        for (const id of ids) await moveToSale(productById(id), clean);
        closeModal();
        toast(`${ids.length} producto${ids.length > 1 ? 's' : ''} en Venta`);
        render();
      };
    },
  });
}

// Antes de sacar de Venta un producto que ya está en sala, se pregunta.
function confirmStageChange(p, n) {
  if (n === DISC) return confirm(`¿Marcar "${p.name}" como Descontinuado?`);
  if (saleSince(p) && p.stage === SALE && POST_SALE_NOISE.includes(n)) {
    return confirm(`"${p.name}" ya está en sala desde el ${fmtDay(saleSince(p))}.\n\nSi lo que viene es una reposición, conviene dejarlo en Venta: la reposición se sigue con el contador Repo y la tabla de pedido y reposiciones.\n\n¿Cambiarlo igual a ${stage(n).name}?`);
  }
  return true;
}

// Borra el Excel actual de un envío y sus versiones anteriores.
async function deleteOrderFiles(o) {
  for (const fid of [o.file_id, ...(o.file_history || []).map(h => h.file_id)]) {
    const ff = fileById(fid);
    if (ff) { try { await Store.delFile(ff.path); } catch { /* el registro se borra igual */ } await remove('files', ff.id); }
  }
}

// ---------- Eliminar un producto ----------
// Borra el producto y todo su seguimiento. Los envíos compartidos con otros productos
// (por ejemplo, un conjunto top + bottom) se conservan para los demás.
async function deleteProduct(p) {
  const evs = S.events.filter(e => e.product_id === p.id);
  const smp = S.samples.filter(s => s.product_id === p.id);
  const sls = S.sales.filter(s => s.product_id === p.id);
  const ords = S.orders.filter(o => (o.product_ids || []).includes(p.id));
  const own = ords.filter(o => o.product_ids.length === 1);
  const shared = ords.filter(o => o.product_ids.length > 1);
  const msg = `¿Eliminar "${p.name}"?\n\nSe borrará:\n· ${evs.length} movimiento${evs.length === 1 ? '' : 's'} del historial\n· ${own.length} pedido/reposición${own.length === 1 ? '' : 'es'} (con su Excel)\n· ${sls.length} registro${sls.length === 1 ? '' : 's'} de ventas\n· ${smp.length} muestra${smp.length === 1 ? '' : 's'}${shared.length ? `\n\n${shared.length} envío${shared.length === 1 ? '' : 's'} compartido${shared.length === 1 ? '' : 's'} con otros productos se conserva${shared.length === 1 ? '' : 'n'} para ellos.` : ''}\n\nEsto no se puede deshacer. Si quieres una copia antes, usa Configuración → Descargar respaldo.`;
  if (!confirm(msg)) return false;
  for (const e of evs) await remove('events', e.id);
  for (const s of smp) await remove('samples', s.id);
  for (const s of sls) await remove('sales', s.id);
  for (const o of own) {
    await deleteOrderFiles(o);
    await remove('orders', o.id);
  }
  for (const o of shared) { o.product_ids = o.product_ids.filter(id => id !== p.id); await save('orders', o); }
  await remove('products', p.id);
  return true;
}

// ---------- Historial de etapas: quitar etapas y mantenerlo coherente ----------
// La etapa actual del producto es siempre la última del historial.
async function syncStageToHistory(p) {
  const last = eventsOf(p).pop();
  if (last && last.stage !== p.stage) {
    const open = activeSample(p);
    if (open && last.stage !== SAMPLES_STAGE) { open.status = 'cancelada'; open.closed_at = nowIso(); await save('samples', open); }
    p.stage = last.stage; p.updated_at = nowIso();
    await save('products', p);
  }
}

async function removeStageEvent(p, ev) {
  await remove('events', ev.id);
  await syncStageToHistory(p);
}

// Etapas anotadas después de la etapa actual (quedaron "cruzadas" al cambiar fechas).
function stagesAfterCurrent(p) {
  const all = eventsOf(p);
  const cur = all.filter(e => e.stage === p.stage).pop();
  return cur ? all.filter(e => e.at > cur.at && e.stage !== p.stage) : [];
}

// ---------- Intercambiar datos entre dos productos ----------
// Para corregir cuando el seguimiento se anotó en el producto equivocado: se pasa todo
// (etapa, historial, fechas, envíos, muestras, ventas) de uno al otro. Nombre y ficha no se mueven.
const SWAP_FIELDS = ['stage', 'eta', 'eta_chi', 'initial_units', 'repo_base', 'had_first_order', 'responsables'];

async function swapProducts(a, b) {
  for (const f of SWAP_FIELDS) { const t = a[f]; a[f] = b[f] ?? null; b[f] = t ?? null; }
  a.updated_at = b.updated_at = nowIso();
  const flip = id => (id === a.id ? b.id : id === b.id ? a.id : id);
  const evs = S.events.filter(e => e.product_id === a.id || e.product_id === b.id);
  evs.forEach(e => { e.product_id = flip(e.product_id); });
  const smp = S.samples.filter(s => s.product_id === a.id || s.product_id === b.id);
  smp.forEach(s => { s.product_id = flip(s.product_id); });
  const sls = S.sales.filter(s => s.product_id === a.id || s.product_id === b.id);
  sls.forEach(s => { s.product_id = flip(s.product_id); });
  const ords = S.orders.filter(o => (o.product_ids || []).some(id => id === a.id || id === b.id));
  ords.forEach(o => { o.product_ids = [...new Set(o.product_ids.map(flip))]; });
  await save('products', [a, b]);
  await save('events', evs);
  await save('samples', smp);
  await save('sales', sls);
  await save('orders', ords);
}

function openSwap(a) {
  const summary = p => {
    const ks = orderKinds(p);
    return `<span class="tag" style="${pillStyle(p.stage)}">${esc(stage(p.stage).name)}</span>
      <span class="sub" style="color:var(--muted);font-size:12px">${ks.length} envío${ks.length === 1 ? '' : 's'}${repoCount(p) ? ` · Repo ${repoCount(p)}` : ''}${salesOf(p).length ? ` · ${salesOf(p).length} registro${salesOf(p).length === 1 ? '' : 's'} de venta` : ''}${saleSince(p) ? ` · en sala desde ${fmtShort(saleSince(p))}` : ''}</span>`;
  };
  let pick = null;
  const listHtml = q => {
    const nq = norm(q);
    // Primero los parecidos (comparten alguna palabra del nombre).
    const words = toks(a.name).filter(w => w.length > 3);
    const score = p => words.filter(w => toks(p.name).includes(w)).length;
    return S.products.filter(p => p.id !== a.id && (!nq || norm(p.name + ' ' + p.code).includes(nq)))
      .sort((x, y) => score(y) - score(x) || x.name.localeCompare(y.name)).slice(0, 40)
      .map(p => `<label><input type="radio" name="swap" value="${esc(p.id)}"${pick === p.id ? ' checked' : ''}><span class="dot" style="background:${stage(p.stage).c}"></span><span>${esc(p.name)} <span class="sub" style="color:var(--faint)">· ${esc(p.line)}</span></span><span style="margin-left:auto">${summary(p)}</span></label>`).join('');
  };
  openModal(`
    <div class="m-head"><h2>Intercambiar datos</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="callout" style="margin-bottom:12px">${ICON.info}<div>Se intercambian <b>etapa, historial, fechas de llegada, pedidos y reposiciones, muestras y ventas registradas</b>. El nombre, código, colores, tallas y composición de cada producto quedan donde están.</div></div>
      <div class="doc-head"><div style="min-width:0"><b>${esc(a.name)}</b><div style="margin-top:4px">${summary(a)}</div></div></div>
      <div class="field"><label>Intercambiar con</label>
        <div class="search" style="width:100%;margin-bottom:6px">${ICON.search}<input id="sw-q" placeholder="Buscar producto…"></div>
        <div class="prod-pick" id="sw-list">${listHtml('')}</div></div>
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="sw-go" disabled>⇄ Intercambiar</button></div>`, {
    narrow: false,
    onMount: w => {
      const go = $('#sw-go', w);
      $('#sw-list', w).addEventListener('change', e => { pick = e.target.value; go.disabled = !pick; });
      $('#sw-q', w).oninput = e => { $('#sw-list', w).innerHTML = listHtml(e.target.value); };
      go.onclick = async () => {
        const b = productById(pick);
        if (!b || !confirm(`¿Intercambiar todos los datos de seguimiento entre\n"${a.name}" y "${b.name}"?`)) return;
        await swapProducts(a, b);
        closeModal();
        toast(`Datos intercambiados: ${a.name} ⇄ ${b.name}`);
        render();
      };
    },
  });
}

// ============================================================
// Importaciones clientes: proyectos aparte de los productos del mix
// (ej. chalecos con logo y diseño de un cliente). Todo en una sola pantalla.
// ============================================================
const PSTAGES = [
  { n: 0, name: 'Cotización', c: '#94A3B8' },
  { n: 1, name: 'Diseño / Documentos', c: '#4F7CFF' },
  { n: 2, name: 'Muestras', c: '#9B6BFF' },
  { n: 3, name: 'Producción', c: '#FF8A3D' },
  { n: 4, name: 'Llegada', c: '#22B8CF' },
  { n: 5, name: 'Control de calidad', c: '#F5B83D' },
  { n: 6, name: 'Entregado', c: '#34C27A' },
  { n: 7, name: 'Cancelado', c: '#6B7280' },
];
const pstage = n => PSTAGES[n] || PSTAGES[0];
const pPill = n => { const s = pstage(n); return `background-color:${hexA(s.c, .16)};color:${shade(s.c)}`; };
// Campos de fecha del proyecto (mismo orden que el ciclo de un pedido).
const PFIELDS = [
  ['idea_date', 'Idea', 'Fecha en que nació la idea / primer contacto con el cliente'],
  ['contract_date', 'Contrato', 'Fecha de firma del contrato con el cliente'],
  ['order_date', 'Pedido', 'Fecha del pedido al proveedor'],
  ['eta_chi', 'CHI', 'Llegada a bodega según CHI'],
  ['arrived_at', 'Bodega', 'Llegada real a bodega'],
  ['delivered_at', 'Entrega', 'Entrega al cliente'],
];
const projById = id => S.projects.find(x => x.id === id);
// Productos de un proyecto (un cliente puede importar varios). Los proyectos creados antes
// tenían un solo producto guardado en los campos del proyecto: se pasan a la lista.
function projItems(pr) {
  if (!Array.isArray(pr.items)) {
    pr.items = [{ id: uid(), name: pr.name || 'Producto', code: pr.code || '', units: pr.units || 0, lines: pr.lines || [], file_id: pr.file_id || null, file_history: pr.file_history || [] }];
    pr.lines = []; pr.file_id = null; pr.file_history = [];
  }
  return pr.items;
}
// Documentos del proyecto (contratos, anexos, cotizaciones…). Antes había un solo contrato
// en contract_file_id: se pasa a la lista como "Contrato".
const DOC_TYPES = ['Contrato', 'Anexo', 'Cotización', 'Factura', 'Ficha técnica', 'Otro'];
function projDocs(pr) {
  if (!Array.isArray(pr.docs)) {
    pr.docs = pr.contract_file_id
      ? [{ id: uid(), file_id: pr.contract_file_id, type: 'Contrato', item_id: null, history: pr.contract_history || [], added_at: nowIso() }]
      : [];
    pr.contract_file_id = null; pr.contract_history = [];
  }
  return pr.docs;
}
const projUnits = pr => projItems(pr).reduce((a, it) => a + (it.units || 0), 0);
const projTitle = pr => projItems(pr).map(i => i.name).filter(Boolean).join(' · ') || 'Sin productos';
const newProjItem = (name = '', code = '') => ({ id: uid(), name, code, units: 0, lines: [], file_id: null, file_history: [] });
// Etapa y fechas de un producto: si no tiene propias, sigue las del proyecto.
const itemStage = (pr, it) => (it.stage == null ? pr.stage : it.stage);
const itemDate = (pr, it, k) => it[k] || pr[k] || null;
const itemOwnDates = it => !!it.own_dates || PFIELDS.some(([k]) => it[k]);
const itemDiffers = (pr, it) => it.stage != null || itemOwnDates(it);
// Etapa propia de un producto. '' = volver a seguir al proyecto.
function setItemStage(pr, it, v) {
  if (v === '' || +v === pr.stage && it.stage == null) { it.stage = null; it.events = []; return; }
  const n = +v;
  // Todo empieza igual: hasta hoy el producto tuvo las etapas del proyecto; desde hoy, la suya.
  // Si el cambio fue otro día, la fecha se corrige en su historial.
  if (it.stage == null) it.events = [...(pr.events || [])];
  it.stage = n;
  it.events = [...(it.events || []), { stage: n, at: nowIso() }];
}
// Inicio del proyecto: la fecha de Idea si existe; si no, la primera etapa anotada.
// Historial de etapas editable: cada etapa con su fecha de inicio y una × para quitarla.
// key: "p:<proyecto>" o "i:<proyecto>|<producto>". data-hidx = posición original en la lista.
function histEditHtml(events, key) {
  const list = (events || []).map((e, i) => ({ e, i })).sort((a, b) => a.e.at.localeCompare(b.e.at));
  return `<div class="hist-ed">${list.map(({ e, i }) => `<span class="hist-chip" style="${pPill(e.stage)}" title="Inicio de ${esc(pstage(e.stage).name)}">
    ${esc(pstage(e.stage).name)} <input type="date" id="h-${esc(key.replace(/[^\w-]/g, '_'))}-${i}" data-hist="${esc(key)}" data-hidx="${i}" value="${esc(isoDay(e.at))}" max="${esc(isoDay(new Date()))}">
    ${list.length > 1 ? `<button data-hist-del="${esc(key)}" data-hidx="${i}" title="Quitar esta etapa">×</button>` : ''}</span>`).join('')}
    <span class="hist-add" title="Agregar una etapa con su fecha de inicio">
      <select data-hist-add-stage="${esc(key)}">${PSTAGES.map(s => `<option value="${s.n}">${esc(s.name)}</option>`).join('')}</select>
      <input type="date" data-hist-add-date="${esc(key)}" max="${esc(isoDay(new Date()))}">
      <button class="btn sm" data-hist-add="${esc(key)}">+ Etapa</button></span></div>`;
}
const projStartAt = pr => [...(pr.events || []).map(e => e.at), pr.idea_date && parseDay(pr.idea_date).toISOString()].filter(Boolean).sort()[0] || pr.created_at || nowIso();
const projSample = pr => (pr.samples || []).find(s => s.status === 'en_curso');

// Al guardar se recalculan el nombre (lista de productos) y las unidades totales del proyecto.
async function saveProject(pr) {
  pr.units = projUnits(pr);
  pr.name = projTitle(pr);
  pr.updated_at = nowIso();
  await save('projects', pr);
}

async function projSetStage(pr, n, at = nowIso()) {
  if (pr.stage === n) return;
  const open = projSample(pr);
  if (open && n !== 2) { open.status = n > 2 && n !== 7 ? 'aprobada' : 'cancelada'; open.closed_at = nowIso(); }
  pr.stage = n;
  pr.events = [...(pr.events || []), { stage: n, at }];
  // Los productos con etapa propia que quedan en la misma etapa del proyecto vuelven a seguirlo.
  for (const it of projItems(pr)) if (it.stage === n) { it.stage = null; it.events = []; }
  if (n === 2 && !projSample(pr)) projNewRound(pr);
  await saveProject(pr);
  toast(`${pr.name} → ${pstage(n).name}`);
  render();
}
function projNewRound(pr, round) {
  const done = pr.samples || [];
  round = round || ROUNDS[Math.min(done.length, ROUNDS.length - 1)];
  const start = new Date();
  pr.samples = [...done, { id: uid(), round, started_at: start.toISOString(), due_at: new Date(start.getTime() + SAMPLE_DAYS * DAY).toISOString(), status: 'en_curso', closed_at: null }];
}
async function projCloseRound(pr, approved) {
  const s = projSample(pr);
  if (!s) return;
  s.status = approved ? 'aprobada' : 'rechazada';
  s.closed_at = nowIso();
  const isFinal = s.round === 'Muestra Final';
  if (approved && isFinal) {
    await saveProject(pr);
    if (confirm(`Muestra Final aprobada.\n¿Pasar "${pr.name}" a Producción?`)) return projSetStage(pr, 3);
    return render();
  }
  projNewRound(pr, approved ? 'Muestra Final' : (isFinal ? 'Muestra Final' : ROUNDS[ROUNDS.indexOf(s.round) + 1]));
  await saveProject(pr);
  toast(`${s.round} ${approved ? 'aprobada' : 'rechazada'} → se abrió ${projSample(pr).round}`);
  render();
}

// Gantt pequeño: una fila por proyecto, por semanas.
function projGanttHtml(list) {
  if (!list.length) return '';
  const today = startOfDay(new Date());
  const U = 7;
  let min = today.getTime() - 30 * DAY, max = today.getTime() + 60 * DAY;
  for (const pr of list) {
    for (const e of pr.events || []) min = Math.min(min, startOfDay(e.at).getTime());
    for (const src of [pr, ...projItems(pr)]) {
      for (const e of src === pr ? [] : (src.events || [])) min = Math.min(min, startOfDay(e.at).getTime());
      for (const f of ['idea_date', 'contract_date', 'order_date', 'eta_chi', 'arrived_at', 'delivered_at']) { const d = parseDay(src[f]); if (d) { min = Math.min(min, d.getTime()); max = Math.max(max, d.getTime() + 14 * DAY); } }
    }
  }
  const start = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
  const end = new Date(new Date(max).getFullYear(), new Date(max).getMonth() + 1, 0);
  const x = d => Math.round((startOfDay(d) - start) / DAY) * U;
  const width = x(end) + U;
  let head = '', grid = '';
  for (let m = new Date(start); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    head += `<span style="left:${x(m)}px">${MONTHS_SHORT[m.getMonth()]} ${String(m.getFullYear()).slice(2)}</span>`;
    grid += `<i class="vl m" style="left:${x(m)}px"></i>`;
    for (const k of [8, 15, 22]) grid += `<i class="vl" style="left:${x(new Date(m.getFullYear(), m.getMonth(), k))}px"></i>`;
  }
  // Barras de una fila: etapas (la producción parte en la fecha del pedido), muestra en curso,
  // bandera de llegada CHI y rombos de pedido y contrato.
  const rowBars = (events, d, sample) => {
    let evs = [...(events || [])].sort((a, b) => a.at.localeCompare(b.at));
    // Todo parte en la fecha de Idea: la primera etapa se alarga hacia atrás hasta ese día.
    const ia = d.idea_date && parseDay(d.idea_date).toISOString();
    if (ia && evs.length && ia < evs[0].at) evs[0] = { ...evs[0], at: ia };
    const od = d.order_date && parseDay(d.order_date).toISOString();
    // Solo si la línea está hoy en Producción y no tiene etapas anteriores anotadas
    // (si el historial ya dice desde cuándo fue cotización, manda el historial).
    const onlyProd = evs.length && evs.every(e => e.stage === 3);
    if (od && onlyProd && od < evs[0].at) evs = [{ ...evs[0], at: od }];
    // Dos etapas seguidas iguales se dibujan como una sola.
    evs = evs.filter((e, i) => i === 0 || e.stage !== evs[i - 1].stage);
    let bars = '';
    evs.forEach((e, i) => {
      const last = i === evs.length - 1;
      const endD = last ? new Date(today.getTime() + DAY) : startOfDay(evs[i + 1].at);
      const l = x(e.at), r = x(endD);
      if (r <= l) return;
      const st = pstage(e.stage);
      bars += `<div class="pbar" style="left:${l}px;width:${r - l}px;background:${st.c}" title="${esc(st.name)} · ${fmtDay(e.at)} → ${last ? 'hoy' : fmtDay(endD)}">${r - l > 70 ? esc(st.name) : ''}</div>`;
    });
    if (sample) { const l = x(today) + U, r = x(sample.due_at); if (r > l) bars += `<div class="pbar ghost" style="left:${l}px;width:${r - l}px" title="${esc(sample.round)} vence ${fmtDay(sample.due_at)}"></div>`; }
    const eta = !d.arrived_at && d.eta_chi;
    if (eta) bars += `<div class="mk eta ${parseDay(eta) < today ? 'late' : ''}" style="left:${x(eta) + 2}px;top:7px" title="Llegada según CHI ${fmtDay(eta)}">${ICON.flag} ${fmtShort(eta)}</div>`;
    if (d.order_date) bars += `<div class="mk pedido" style="left:${x(d.order_date)}px;top:11px" title="Pedido ${fmtDay(d.order_date)}"></div>`;
    if (d.contract_date) bars += `<div class="mk contrato" style="left:${x(d.contract_date)}px;top:11px" title="Contrato ${fmtDay(d.contract_date)}"></div>`;
    return bars;
  };
  const lane = (bars) => `<div class="pg-r" style="width:${width}px">${grid}<div class="today-line" style="left:${x(today) + U / 2}px"></div>${bars}</div>`;
  const rows = list.map(pr => {
    const pevs = (pr.events || []).length ? pr.events : [{ stage: pr.stage, at: pr.created_at || nowIso() }];
    const items = projItems(pr);
    const split = items.some(i => itemDiffers(pr, i));
    const label = `<div class="pg-l" data-proj-jump="${esc(pr.id)}"><span class="dot" style="background:${pstage(pr.stage).c}"></span><span class="nm">${esc(pr.client || 'Sin cliente')}</span><span class="cl" title="${esc(projTitle(pr))}">${items.length} prod. · ${esc(projTitle(pr))}</span></div>`;
    // Todos juntos: una sola línea. Si algún producto va distinto, el proyecto es solo el título
    // y cada producto tiene su propia línea (sin repetir la barra del proyecto arriba).
    let html = split
      ? `<div class="pg-row pg-title">${label}${lane('')}</div>`
      : `<div class="pg-row">${label}${lane(rowBars(pevs, pr, projSample(pr)))}</div>`;
    for (const it of split ? items : []) {
      const evs = it.stage != null && (it.events || []).length ? it.events : pevs;
      const d = Object.fromEntries(PFIELDS.map(([k]) => [k, itemDate(pr, it, k)]));
      html += `<div class="pg-row sub"><div class="pg-l" data-proj-jump="${esc(pr.id)}"><span class="dot" style="background:${pstage(itemStage(pr, it)).c}"></span><span class="cl" style="color:var(--text)" title="${esc(it.name)}">${esc(it.name || 'Producto')}</span><span class="cl">${esc(pstage(itemStage(pr, it)).name)}</span></div>${lane(rowBars(evs, d, null))}</div>`;
    }
    return html;
  }).join('');
  return `<div class="pg"><div class="pg-row pg-head"><div class="pg-l">Proyecto <span class="sub" style="margin-left:auto;font-size:10.5px;color:var(--faint)">◆ contrato · ◆ pedido · ⚑ CHI</span></div><div class="pg-r" style="width:${width}px"><div class="months">${head}</div></div></div>${rows}</div>`;
}

function projCardHtml(pr) {
  const open = UI.projOpen[pr.id] !== false; // abiertas por defecto
  const s = projSample(pr);
  const id = pr.id;
  const items = projItems(pr);
  const lead = pr.order_date && pr.arrived_at ? daysBetween(parseDay(pr.order_date), parseDay(pr.arrived_at)) : null;
  const chiDiff = pr.eta_chi && pr.arrived_at ? daysBetween(parseDay(pr.eta_chi), parseDay(pr.arrived_at)) : null;
  const eta = !pr.arrived_at && pr.eta_chi ? daysBetween(new Date(), parseDay(pr.eta_chi)) : null;
  const units = projUnits(pr);
  const iid = it => `${esc(id)}|${esc(it.id)}`;
  return `<div class="pcard" id="proj-${esc(id)}">
    <div class="pc-head" data-proj-toggle="${esc(id)}">
      <span class="chev-wrap ${open ? '' : 'closed'}">${ICON.chev}</span>
      <div style="min-width:0;flex:1"><div class="pc-name">${esc(pr.client || 'Sin cliente')}</div>
        <div class="pc-sub">${items.length} producto${items.length === 1 ? '' : 's'}: ${esc(projTitle(pr))}${units ? ` · ${fmtInt(units)} u.` : ''}</div>
        ${items.some(it => it.stage != null) ? `<div class="pc-mixed">${items.map(it => `<span class="tag" style="${pPill(itemStage(pr, it))}" title="${esc(it.name)}">${esc(trunc(it.name || 'Producto', 18))}: ${esc(pstage(itemStage(pr, it)).name)}</span>`).join('')}</div>` : ''}</div>
      ${s ? timerChip(s) : ''}
      ${eta != null ? `<span class="alert-chip ${eta < 0 ? 'late' : ''}">${ICON.flag} ${eta < 0 ? `${-eta} d tarde` : `llega en ${eta} d`}</span>` : ''}
      <select class="pill-select" data-proj-stage="${esc(id)}" style="${pPill(pr.stage)}" onclick="event.stopPropagation()">${PSTAGES.map(x => `<option value="${x.n}"${x.n === pr.stage ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
    </div>
    ${open ? `<div class="pc-body">
      <h5 class="pc-label">Productos</h5>
      <table class="pi-tbl"><thead><tr><th>Producto</th><th>Código</th><th class="num">Unidades</th><th>Etapa</th><th>Excel del pedido</th><th></th></tr></thead><tbody>
        ${items.map(it => {
          const f = fileById(it.file_id);
          const ist = itemStage(pr, it);
          const own = it.stage != null;
          const showDates = itemOwnDates(it);
          const stageCell = `<td><div class="pi-stage"><select class="pill-select ${own ? '' : 'inherit'}" data-istage="${iid(it)}" style="${pPill(ist)}" title="${own ? 'Etapa propia de este producto' : 'Sigue la etapa del proyecto'}">
              <option value=""${own ? '' : ' selected'}>${own ? 'Igual al proyecto' : esc(pstage(pr.stage).name)}</option>
              ${PSTAGES.map(x => `<option value="${x.n}"${own && x.n === it.stage ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
            </select><button class="icon-btn ${showDates ? 'on' : ''}" data-idates="${iid(it)}" title="${showDates ? 'Ocultar fechas propias' : 'Fechas propias de este producto'}">📅</button></div></td>`;
          const datesRow = showDates || own ? `<tr class="pi-dates"><td colspan="6">
              ${own ? `<div class="pi-hist"><span class="sub">Etapas de ${esc(it.name || 'este producto')}:</span>${histEditHtml(it.events, `i:${id}|${it.id}`)}</div>` : ''}
              ${showDates ? `<div class="pi-dgrid">${PFIELDS.map(([k, l, t]) => `<div class="field"><label title="${t}">${l}</label>
              <input type="date" class="input" id="pj-${esc(id)}-it-${esc(it.id)}-${k}" data-idate="${iid(it)}" data-f="${k}" value="${esc(it[k] || '')}">
              <span class="pi-inh">${!it[k] && pr[k] ? `proyecto: ${fmtShort(pr[k])}` : ''}</span></div>`).join('')}
              <button class="btn sm ghost" data-idates-off="${iid(it)}" title="Quitar las fechas propias y volver a las del proyecto">Usar fechas del proyecto</button></div>` : ''}</td></tr>` : '';
          return `<tr>
            <td><input class="input" id="pj-${esc(id)}-it-${esc(it.id)}-name" data-pitem="${iid(it)}" data-ifield="name" value="${esc(it.name)}" placeholder="Nombre del producto"></td>
            <td><input class="input" id="pj-${esc(id)}-it-${esc(it.id)}-code" data-pitem="${iid(it)}" data-ifield="code" value="${esc(it.code || '')}" placeholder="Código"></td>
            <td class="num"><input class="input num" type="number" min="0" id="pj-${esc(id)}-it-${esc(it.id)}-units" data-pitem="${iid(it)}" data-ifield="units" value="${it.units || ''}" placeholder="0"${(it.lines || []).length ? ' readonly title="Sale del Excel"' : ''}></td>
            ${stageCell}
            <td><div class="pi-xl">${f ? `<button class="icon-btn" data-dl="${esc(f.id)}" title="Descargar ${esc(f.name)}">${ICON.download}</button><span class="sub" title="${esc(f.name)}">${esc(trunc(f.name, 22))}${(it.file_history || []).length ? ` · ${it.file_history.length} ant.` : ''}</span>` : ''}
              <button class="btn sm" data-pitem-excel="${iid(it)}">${ICON.upload} ${f ? 'Reemplazar' : 'Subir Excel'}</button></div></td>
            <td><button class="icon-btn del" data-pitem-del="${iid(it)}" title="Quitar este producto">${ICON.trash}</button></td>
          </tr>${datesRow}`;
        }).join('')}
        <tr class="pi-tot"><td><button class="btn sm" data-pitem-add="${esc(id)}">+ Agregar producto</button></td><td style="text-align:right;color:var(--muted)">Total</td><td class="num"><b>${fmtInt(units)}</b></td><td></td><td></td><td></td></tr>
      </tbody></table>

      <div class="field" style="margin:12px 0 8px"><label>Cliente</label><input class="input" id="pj-${esc(id)}-client" data-proj="${esc(id)}" data-pfield="client" value="${esc(pr.client || '')}" placeholder="Nombre del cliente"></div>

      <div class="pc-dates">${PFIELDS.map(([k, l, t]) => `<div class="field"><label title="${t}">${l}</label><input type="date" class="input" id="pj-${esc(id)}-${k}" data-proj="${esc(id)}" data-pdate="${k}" value="${esc(pr[k] || '')}"></div>`).join('')}</div>
      <div class="pc-notes-line">${[
        pr.idea_date && pr.contract_date ? `idea → contrato: <b>${daysBetween(parseDay(pr.idea_date), parseDay(pr.contract_date))} d</b>` : '',
        pr.contract_date && pr.order_date ? `contrato → pedido: <b>${daysBetween(parseDay(pr.contract_date), parseDay(pr.order_date))} d</b>` : '',
        lead != null ? `pedido → bodega: <b>${lead} d</b>` : '',
        chiDiff != null ? `${chiDiff > 0 ? '+' : ''}${chiDiff} d vs CHI` : '',
        pr.arrived_at && pr.delivered_at ? `bodega → cliente: <b>${daysBetween(parseDay(pr.arrived_at), parseDay(pr.delivered_at))} d</b>` : '',
        (pr.contract_date || pr.order_date) && pr.delivered_at ? `total ${pr.contract_date ? 'desde contrato' : 'desde pedido'}: <b>${daysBetween(parseDay(pr.contract_date || pr.order_date), parseDay(pr.delivered_at))} d</b>` : '',
      ].filter(Boolean).join(' · ')}</div>

      <div class="pc-cols">
        <div class="pc-box"><h4>Muestras</h4>
          ${s ? (() => { const t = sampleTime(s); return `<div class="sample-card ${t.cls}" style="padding:10px">
              <div class="top"><div style="flex:1"><b>${esc(s.round)}</b><div class="meta">inició ${fmtDay(s.started_at)} · vence ${fmtDay(s.due_at)}</div></div>${timerChip(s)}</div>
              <div class="ttrack"><i style="width:${t.elapsed * 100}%"></i></div>
              <div class="row-actions"><button class="btn sm" data-proj-ok="${esc(id)}" style="color:var(--ok)">✓ Aprobar</button><button class="btn sm" data-proj-bad="${esc(id)}" style="color:var(--danger)">✕ Rechazar</button></div></div>`; })()
            : `<div class="sub" style="color:var(--faint);font-size:12px">${pr.stage === 2 ? '' : 'Al pasar a Muestras se abre la Muestra 1 con su reloj de ' + SAMPLE_DAYS + ' días.'}</div>${pr.stage === 2 ? `<button class="btn sm" data-proj-round="${esc(id)}">${ICON.flask} Iniciar muestra</button>` : ''}`}
          ${(pr.samples || []).filter(x => x.status !== 'en_curso').map(x => `<div class="list-item" style="padding:5px 0"><div class="grow"><b style="font-size:12px">${esc(x.round)}</b> <span class="sub">${fmtShort(x.started_at)} → ${fmtShort(x.closed_at)}</span></div>${sampleTag(x)}</div>`).join('')}
        </div>
        <div class="pc-box"><h4>Documentos y pedido <button class="btn sm" data-doc-add="${esc(id)}" style="margin-left:auto">${ICON.doc} + Agregar documentos</button></h4>
          ${(() => {
            const docs = projDocs(pr);
            if (!docs.length) return `<div class="contract-line">${ICON.doc}<span class="sub" style="color:var(--faint)">Sin documentos. Agrega contratos, anexos, cotizaciones… (PDF, Word, Excel o imagen).</span></div>`;
            return `<div class="doc-list">${docs.map(dc => {
              const df = fileById(dc.file_id);
              const key = `${esc(id)}|${esc(dc.id)}`;
              return `<div class="doc-row">
                <span class="doc-ic-sm">${ICON.doc}</span>
                <div class="doc-main"><div class="doc-name" title="${esc(df ? df.name : '')}">${esc(df ? df.name : 'Archivo no encontrado')}</div>
                  <div class="doc-meta">${df ? `subido ${fmtDay(df.uploaded_at)}` : ''}${(dc.history || []).length ? ` · ${dc.history.length} versión${dc.history.length > 1 ? 'es' : ''} anterior${dc.history.length > 1 ? 'es' : ''}` : ''}</div></div>
                <select class="select doc-sel" data-doc-type="${key}" title="Tipo de documento">${DOC_TYPES.map(t => `<option${t === dc.type ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
                <select class="select doc-sel" data-doc-item="${key}" title="¿A qué corresponde?"><option value="">Todo el proyecto</option>${items.map(it => `<option value="${esc(it.id)}"${it.id === dc.item_id ? ' selected' : ''}>${esc(trunc(it.name || 'Producto', 22))}</option>`).join('')}</select>
                ${df ? `<button class="icon-btn" data-dl="${esc(df.id)}" title="Descargar">${ICON.download}</button>` : ''}
                <button class="icon-btn" data-doc-replace="${key}" title="Reemplazar por una versión nueva">${ICON.upload}</button>
                <button class="icon-btn del" data-doc-del="${key}" title="Quitar documento">${ICON.trash}</button>
              </div>`;
            }).join('')}</div>`;
          })()}
          ${items.some(it => (it.lines || []).length)
            ? items.filter(it => (it.lines || []).length).map(it => `<div class="pi-mx"><b>${esc(it.name || 'Producto')}</b>${it.code ? ` <span class="sub" style="color:var(--faint)">· ${esc(it.code)}</span>` : ''}${matrixHtml(it.lines)}</div>`).join('')
            : '<div class="sub" style="color:var(--faint);font-size:12px">Sube el Excel de cada producto (en la tabla de arriba) para ver las cantidades por color y talla.</div>'}
        </div>
      </div>

      <div class="field" style="margin-top:12px"><label>Notas (logo, diseño, condiciones del cliente)</label><textarea class="input" id="pj-${esc(id)}-notes" data-proj="${esc(id)}" data-pfield="notes">${esc(pr.notes || '')}</textarea></div>
      <div class="pc-foot">
        <div class="pc-hist"><span class="sub" style="color:var(--muted);font-size:11px;margin-right:4px">Etapas del proyecto:</span>${histEditHtml(pr.events, 'p:' + id)}</div>
        <button class="btn sm danger" data-proj-del="${esc(id)}">${ICON.trash} Eliminar proyecto</button>
      </div>
    </div>` : ''}
  </div>`;
}

function projectsHtml() {
  const list = [...S.projects].sort((a, b) => (a.stage >= 6) - (b.stage >= 6) || (b.updated_at || '').localeCompare(a.updated_at || ''));
  const active = list.filter(p => p.stage < 6);
  const units = active.reduce((a, p) => a + projUnits(p), 0);
  const prods = active.reduce((a, p) => a + projItems(p).length, 0);
  const sampling = list.filter(projSample).length;
  const soon = active.filter(p => !p.arrived_at && p.eta_chi && daysBetween(new Date(), parseDay(p.eta_chi)) <= alertDays()).length;
  return `
  <div class="toolbar" style="padding:8px 0 4px">
    <div class="sub" style="color:var(--muted)">Importaciones para clientes (con su logo y diseño), aparte de los productos del mix. Un proyecto = un cliente con uno o varios productos.</div>
    <div class="spacer"></div>
    <button class="btn primary" id="proj-new">+ Nuevo proyecto</button>
  </div>
  ${list.length ? `
  <div class="kpis">
    <div class="kpi"><div class="l">Proyectos activos</div><div class="v">${active.length}</div><div class="s">${prods} producto${prods === 1 ? '' : 's'} · ${list.length - active.length} entregados o cancelados</div></div>
    <div class="kpi"><div class="l">Unidades en curso</div><div class="v">${fmtInt(units)}</div><div class="s">de proyectos activos</div></div>
    <div class="kpi"><div class="l">Muestras en curso</div><div class="v">${sampling}</div><div class="s">${SAMPLE_DAYS} días por ronda</div></div>
    <div class="kpi ${soon ? 'alert' : ''}"><div class="l">Llegan pronto o atrasados</div><div class="v">${soon}</div><div class="s">según fecha CHI</div></div>
  </div>
  <div class="card" style="margin-bottom:14px"><h3>Carta Gantt de proyectos <span class="sub">por semanas</span></h3>${projGanttHtml(list)}</div>
  ${list.map(projCardHtml).join('')}` : `<div class="empty"><div class="ic">${ICON.box}</div><h2>Sin proyectos de importación</h2><p>Crea un proyecto por cada cliente: sus productos (cada uno con su Excel), contrato, muestras y fechas de llegada, todo en esta pantalla.</p></div>`}`;
}

function openNewProject() {
  const rowHtml = () => `<div class="np-row"><input class="input" data-np-name placeholder="Producto (ej: Chaleco GeoLite con logo)"><input class="input" data-np-code placeholder="Código"><button class="icon-btn" data-np-del title="Quitar">${ICON.x}</button></div>`;
  openModal(`
    <div class="m-head"><h2>Nuevo proyecto de importación</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="field"><label>Productos</label>
        <div id="np-rows">${rowHtml()}</div>
        <button class="btn sm" id="np-add" style="margin-top:6px;align-self:flex-start">+ Agregar producto</button></div>
      <div class="field"><label>Cliente</label><input class="input" id="np-client" placeholder="Ej: Minera X"></div>
      <div class="field"><label>Etapa</label><select class="select" id="np-stage">${PSTAGES.slice(0, 7).map(s => `<option value="${s.n}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Notas (logo, diseño)</label><textarea class="input" id="np-notes"></textarea></div>
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="np-go">Crear proyecto</button></div>`, {
    narrow: true,
    onMount: w => {
      const rows = $('#np-rows', w);
      const bindDel = () => $$('[data-np-del]', rows).forEach(b => b.onclick = () => { if ($$('.np-row', rows).length > 1) b.closest('.np-row').remove(); });
      bindDel();
      $('#np-add', w).onclick = () => { rows.insertAdjacentHTML('beforeend', rowHtml()); bindDel(); $$('[data-np-name]', rows).pop().focus(); };
      $('[data-np-name]', w).focus();
      $('#np-go', w).onclick = async () => {
        const items = $$('.np-row', rows).map(r => newProjItem($('[data-np-name]', r).value.trim(), $('[data-np-code]', r).value.trim())).filter(it => it.name);
        if (!items.length) return toast('Agrega al menos un producto', true);
        const stageN = +$('#np-stage', w).value;
        const pr = {
          id: uid(), name: '', client: $('#np-client', w).value.trim(), code: '',
          notes: $('#np-notes', w).value.trim(), stage: stageN, events: [{ stage: stageN, at: nowIso() }],
          idea_date: null, contract_date: null, order_date: null, eta_chi: null, arrived_at: null, delivered_at: null,
          units: 0, lines: [], file_id: null, file_history: [], items,
          contract_file_id: null, contract_history: [], samples: [], created_at: nowIso(), updated_at: nowIso(),
        };
        if (stageN === 2) projNewRound(pr);
        await saveProject(pr);
        closeModal(); toast(`Proyecto creado con ${items.length} producto${items.length > 1 ? 's' : ''}`); render();
      };
    },
  });
}

// Excel del pedido de un producto del proyecto: mismo formato que la solicitud a gerencia.
function projLoadExcel(pr, it) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsx,.xlsm,.xls';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    let rep;
    try { rep = parseReposicion(readWorkbook(await file.arrayBuffer())); }
    catch (e) { return toast('No se pudo leer el Excel: ' + (e.message || e), true); }
    if (!rep.lines.length) return toast('No encontré la tabla CANTIDAD / DESCRIPCIÓN en este Excel', true);
    const old = it.units || 0;
    if (it.lines && it.lines.length && !confirm(`Reemplazar el pedido de "${it.name}": ${fmtInt(old)} → ${fmtInt(rep.total)} unidades (${rep.total - old >= 0 ? '+' : ''}${fmtInt(rep.total - old)}).\nEl Excel anterior queda como versión anterior. ¿Continuar?`)) return;
    try {
      const nf = await storeBackup(file, 'proyecto');
      if (it.file_id) it.file_history = [...(it.file_history || []), { file_id: it.file_id, total: old, replaced_at: nowIso() }];
      it.file_id = nf.id;
    } catch (e) { return toast('No se pudo guardar el Excel: ' + (e.message || e), true); }
    it.lines = rep.lines;
    it.units = rep.total;
    if (!it.name && rep.title) it.name = titleCase(rep.title);
    if (!pr.order_date) pr.order_date = rep.date;
    await saveProject(pr);
    toast(`${it.name || 'Producto'}: ${fmtInt(rep.total)} unidades`);
    render();
  };
  inp.click();
}

// Documentos del proyecto: se pueden elegir varios archivos de una vez.
function pickFiles(accept, multiple, cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
  inp.onchange = () => inp.files.length && cb([...inp.files]);
  inp.click();
}
const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

function projAddDocs(pr) {
  pickFiles(DOC_ACCEPT, true, async files => {
    const docs = projDocs(pr);
    try {
      for (const file of files) {
        const nf = await storeBackup(file, 'documento');
        // Tipo según el nombre del archivo; si no se reconoce: "Contrato" si aún no hay uno, si no "Otro".
        // Se cambia después en la lista.
        const n = file.name;
        const guess = /anexo/i.test(n) ? 'Anexo' : /cotiz/i.test(n) ? 'Cotización' : /factur/i.test(n) ? 'Factura'
          : /ficha/i.test(n) ? 'Ficha técnica' : /contrat/i.test(n) ? 'Contrato' : null;
        const type = guess || (docs.some(d => d.type === 'Contrato') ? 'Otro' : 'Contrato');
        docs.push({ id: uid(), file_id: nf.id, type, item_id: null, history: [], added_at: nowIso() });
      }
    } catch (e) { toast('No se pudo guardar: ' + (e.message || e), true); }
    await saveProject(pr);
    toast(`${files.length} documento${files.length > 1 ? 's' : ''} agregado${files.length > 1 ? 's' : ''}`);
    render();
  });
}

function projReplaceDoc(pr, dc) {
  pickFiles(DOC_ACCEPT, false, async ([file]) => {
    if (!confirm(`¿Reemplazar por "${file.name}"?\nLa versión anterior queda guardada.`)) return;
    try {
      const nf = await storeBackup(file, 'documento');
      if (dc.file_id) dc.history = [...(dc.history || []), { file_id: dc.file_id, replaced_at: nowIso() }];
      dc.file_id = nf.id;
    } catch (e) { return toast('No se pudo guardar: ' + (e.message || e), true); }
    await saveProject(pr);
    toast('Documento reemplazado');
    render();
  });
}
function bindProjects(app) {
  const nb = $('#proj-new', app); if (nb) nb.onclick = openNewProject;
  $$('[data-proj-toggle]', app).forEach(h => h.onclick = e => {
    if (e.target.closest('select,button,.timer')) return;
    const id = h.dataset.projToggle;
    UI.projOpen[id] = UI.projOpen[id] === false; // alterna (abierta por defecto)
    lsSet('k8r_ui_projopen', UI.projOpen);
    render();
  });
  $$('[data-proj-jump]', app).forEach(el => el.onclick = () => {
    const id = el.dataset.projJump;
    if (UI.projOpen[id] === false) { UI.projOpen[id] = true; lsSet('k8r_ui_projopen', UI.projOpen); render(); }
    const c = $('#proj-' + CSS.escape(id)); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $$('[data-proj-stage]', app).forEach(sel => sel.onchange = () => {
    const pr = projById(sel.dataset.projStage), n = +sel.value;
    if (n === 7 && !confirm(`¿Marcar "${pr.name}" como Cancelado?`)) { sel.value = pr.stage; return; }
    projSetStage(pr, n);
  });
  $$('[data-pfield]', app).forEach(inp => inp.onchange = async () => {
    const pr = projById(inp.dataset.proj), k = inp.dataset.pfield;
    if (k === 'name' && !inp.value.trim()) { inp.value = pr.name; return toast('El proyecto necesita nombre', true); }
    pr[k] = k === 'units' ? Math.max(0, parseInt(inp.value, 10) || 0) : inp.value.trim();
    await saveProject(pr);
    toast('Proyecto actualizado');
    renderKeepFocus();
  });
  $$('[data-pdate]', app).forEach(inp => {
    if (!inp.dataset.proj) return; // solo fechas de proyectos
    onDateCommit(inp, async () => {
      const pr = projById(inp.dataset.proj), k = inp.dataset.pdate;
      pr[k] = inp.value || null;
      // La fecha de Idea es el inicio del proyecto: la primera etapa parte ese día.
      if (k === 'idea_date' && pr.idea_date) {
        const ia = parseDay(pr.idea_date); ia.setHours(9);
        const first = [...(pr.events || [])].sort((a, b) => a.at.localeCompare(b.at))[0];
        if (first && ia.toISOString() < first.at) first.at = ia.toISOString();
      }
      // Llegar a bodega o entregar al cliente puede mover la etapa.
      if (k === 'arrived_at' && pr.arrived_at && pr.stage < 4 && confirm(`¿Pasar "${pr.name}" a Llegada desde el ${fmtDay(pr.arrived_at)}?`)) {
        const at = parseDay(pr.arrived_at); at.setHours(9);
        pr.stage = 4; pr.events = [...(pr.events || []), { stage: 4, at: at.toISOString() }];
      }
      if (k === 'delivered_at' && pr.delivered_at && pr.stage < 6 && confirm(`¿Marcar "${pr.name}" como Entregado el ${fmtDay(pr.delivered_at)}?`)) {
        const at = parseDay(pr.delivered_at); at.setHours(9);
        pr.stage = 6; pr.events = [...(pr.events || []), { stage: 6, at: at.toISOString() }];
      }
      if (k === 'order_date' && pr.order_date && pr.stage < 3 && confirm(`¿Pasar "${pr.name}" a Producción desde el ${fmtDay(pr.order_date)}?`)) {
        const at = parseDay(pr.order_date); at.setHours(9);
        const sm = projSample(pr); if (sm) { sm.status = 'aprobada'; sm.closed_at = nowIso(); }
        pr.stage = 3; pr.events = [...(pr.events || []), { stage: 3, at: at.toISOString() }];
      }
      await saveProject(pr);
      toast('Fecha guardada');
      renderKeepFocus();
    });
  });
  $$('[data-proj-ok]', app).forEach(b => b.onclick = () => projCloseRound(projById(b.dataset.projOk), true));
  $$('[data-proj-bad]', app).forEach(b => b.onclick = () => { const pr = projById(b.dataset.projBad); if (confirm(`¿Rechazar ${projSample(pr).round}?`)) projCloseRound(pr, false); });
  $$('[data-proj-round]', app).forEach(b => b.onclick = async () => { const pr = projById(b.dataset.projRound); projNewRound(pr); await saveProject(pr); render(); });
  // Productos del proyecto: "proyecto|producto" en los data-*.
  const pit = v => { const [pid, iid] = v.split('|'); const pr = projById(pid); return [pr, pr && projItems(pr).find(i => i.id === iid)]; };
  $$('[data-pitem]', app).forEach(inp => inp.onchange = async () => {
    const [pr, it] = pit(inp.dataset.pitem); if (!it) return;
    const k = inp.dataset.ifield;
    it[k] = k === 'units' ? Math.max(0, parseInt(inp.value, 10) || 0) : inp.value.trim();
    await saveProject(pr);
    toast('Producto actualizado');
    renderKeepFocus();
  });
  // Etapa propia por producto.
  $$('[data-istage]', app).forEach(sel => sel.onchange = async () => {
    const [pr, it] = pit(sel.dataset.istage); if (!it) return;
    setItemStage(pr, it, sel.value);
    await saveProject(pr);
    toast(it.stage == null ? `${it.name || 'Producto'} sigue la etapa del proyecto` : `${it.name || 'Producto'} → ${pstage(it.stage).name}`);
    render();
  });
  // Historial editable de etapas (proyecto o producto con etapa propia).
  const histTarget = key => {
    if (key.startsWith('p:')) { const pr = projById(key.slice(2)); return pr && { pr, owner: pr }; }
    const [pr, it] = pit(key.slice(2)); return it && { pr, owner: it };
  };
  // La etapa actual es la última del historial.
  const syncHistStage = (pr, owner) => {
    const last = [...owner.events].sort((a, b) => a.at.localeCompare(b.at)).pop();
    if (!last) return;
    if (owner === pr) pr.stage = last.stage;
    else owner.stage = last.stage;
  };
  $$('[data-hist]', app).forEach(inp => onDateCommit(inp, async () => {
    const t = histTarget(inp.dataset.hist); if (!t) return;
    const ev = t.owner.events[+inp.dataset.hidx]; if (!ev) return;
    const day = parseDay(inp.value);
    if (!day) { inp.value = isoDay(ev.at); return toast('Para quitar una etapa usa la ×', true); }
    if (day > startOfDay(new Date())) { inp.value = isoDay(ev.at); return toast('No puede ser una fecha futura', true); }
    day.setHours(9);
    // Se mantiene el orden: las etapas que iban antes y quedarían después se adelantan a esa fecha.
    const before = [...t.owner.events].sort((a, b) => a.at.localeCompare(b.at));
    const pos = before.indexOf(ev);
    const iso = day.toISOString();
    for (const e of before.slice(0, pos)) if (e.at > iso) e.at = iso;
    ev.at = iso;
    syncHistStage(t.pr, t.owner);
    await saveProject(t.pr);
    toast(`${pstage(ev.stage).name}: desde ${fmtDay(ev.at)}`);
    renderKeepFocus();
  }));
  // Agregar una etapa con fecha (por ejemplo, Cotización desde el 17-02 antes de Producción).
  $$('[data-hist-add]', app).forEach(b => b.onclick = async () => {
    const key = b.dataset.histAdd;
    const t = histTarget(key); if (!t) return;
    const sel = $(`[data-hist-add-stage="${CSS.escape(key)}"]`, app), dIn = $(`[data-hist-add-date="${CSS.escape(key)}"]`, app);
    const day = parseDay(dIn.value);
    if (!day) return toast('Elige la fecha de inicio de esa etapa', true);
    if (day > startOfDay(new Date())) return toast('No puede ser una fecha futura', true);
    day.setHours(9);
    const n = +sel.value;
    t.owner.events = [...(t.owner.events || []), { stage: n, at: day.toISOString() }];
    syncHistStage(t.pr, t.owner);
    await saveProject(t.pr);
    toast(`${pstage(n).name} desde ${fmtDay(day)} agregada`);
    render();
  });
  $$('[data-hist-del]', app).forEach(b => b.onclick = async () => {
    const t = histTarget(b.dataset.histDel); if (!t) return;
    const i = +b.dataset.hidx, ev = t.owner.events[i];
    if (!ev || !confirm(`¿Quitar ${pstage(ev.stage).name} (${fmtDay(ev.at)}) del historial?`)) return;
    t.owner.events = t.owner.events.filter((_, k) => k !== i);
    syncHistStage(t.pr, t.owner);
    await saveProject(t.pr);
    toast(`${pstage(ev.stage).name} quitada`);
    render();
  });
  // Fechas propias por producto: se muestran solo si se activan.
  $$('[data-idates]', app).forEach(b => b.onclick = async () => {
    const [pr, it] = pit(b.dataset.idates); if (!it) return;
    if (itemOwnDates(it) && PFIELDS.some(([k]) => it[k])) return toast('Este producto tiene fechas propias. Usa "Usar fechas del proyecto" para quitarlas.');
    it.own_dates = !it.own_dates;
    await saveProject(pr);
    render();
  });
  $$('[data-idates-off]', app).forEach(b => b.onclick = async () => {
    const [pr, it] = pit(b.dataset.idatesOff); if (!it) return;
    if (PFIELDS.some(([k]) => it[k]) && !confirm(`¿Quitar las fechas propias de "${it.name || 'Producto'}" y usar las del proyecto?`)) return;
    for (const [k] of PFIELDS) it[k] = null;
    it.own_dates = false;
    await saveProject(pr);
    render();
  });
  $$('[data-idate]', app).forEach(inp => onDateCommit(inp, async () => {
    const [pr, it] = pit(inp.dataset.idate); if (!it) return;
    it[inp.dataset.f] = inp.value || null;
    it.own_dates = true;
    await saveProject(pr);
    toast(`${it.name || 'Producto'}: fecha guardada`);
    renderKeepFocus();
  }));
  $$('[data-pitem-excel]', app).forEach(b => b.onclick = () => { const [pr, it] = pit(b.dataset.pitemExcel); if (it) projLoadExcel(pr, it); });
  $$('[data-pitem-add]', app).forEach(b => b.onclick = async () => {
    const pr = projById(b.dataset.pitemAdd);
    const it = newProjItem();
    projItems(pr).push(it);
    await saveProject(pr);
    render();
    const n = $(`#pj-${CSS.escape(pr.id)}-it-${CSS.escape(it.id)}-name`); if (n) n.focus();
  });
  $$('[data-pitem-del]', app).forEach(b => b.onclick = async () => {
    const [pr, it] = pit(b.dataset.pitemDel); if (!it) return;
    const items = projItems(pr);
    if (items.length === 1) return toast('El proyecto necesita al menos un producto', true);
    const hasData = it.file_id || it.units;
    if (hasData && !confirm(`¿Quitar "${it.name || 'Producto'}" del proyecto${it.file_id ? ' y borrar su Excel' : ''}?`)) return;
    await deleteOrderFiles(it);
    pr.items = items.filter(x => x.id !== it.id);
    await saveProject(pr);
    toast('Producto quitado'); render();
  });
  // Documentos: "proyecto|documento" en los data-*.
  const pdoc = v => { const [pid, did] = v.split('|'); const pr = projById(pid); return [pr, pr && projDocs(pr).find(d => d.id === did)]; };
  $$('[data-doc-add]', app).forEach(b => b.onclick = () => projAddDocs(projById(b.dataset.docAdd)));
  $$('[data-doc-replace]', app).forEach(b => b.onclick = () => { const [pr, dc] = pdoc(b.dataset.docReplace); if (dc) projReplaceDoc(pr, dc); });
  $$('[data-doc-type]', app).forEach(s => s.onchange = async () => { const [pr, dc] = pdoc(s.dataset.docType); if (!dc) return; dc.type = s.value; await saveProject(pr); toast('Tipo actualizado'); });
  $$('[data-doc-item]', app).forEach(s => s.onchange = async () => { const [pr, dc] = pdoc(s.dataset.docItem); if (!dc) return; dc.item_id = s.value || null; await saveProject(pr); toast(s.value ? 'Asignado al producto' : 'Asignado a todo el proyecto'); });
  $$('[data-doc-del]', app).forEach(b => b.onclick = async () => {
    const [pr, dc] = pdoc(b.dataset.docDel); if (!dc) return;
    const f = fileById(dc.file_id);
    if (!confirm(`¿Quitar "${f ? f.name : 'documento'}"${(dc.history || []).length ? ' y sus versiones anteriores' : ''}?\nNo se puede deshacer.`)) return;
    await deleteOrderFiles({ file_id: dc.file_id, file_history: dc.history });
    pr.docs = projDocs(pr).filter(d => d.id !== dc.id);
    await saveProject(pr);
    toast('Documento quitado'); render();
  });
  $$('[data-proj-del]', app).forEach(b => b.onclick = async () => {
    const pr = projById(b.dataset.projDel);
    if (!confirm(`¿Eliminar el proyecto de ${pr.client || 'este cliente'} (${projItems(pr).length} producto${projItems(pr).length === 1 ? '' : 's'}) con sus muestras, Excel y contrato?\nNo se puede deshacer.`)) return;
    await deleteOrderFiles(pr);
    for (const it of projItems(pr)) await deleteOrderFiles(it);
    await deleteOrderFiles({ file_id: pr.contract_file_id, file_history: pr.contract_history });
    for (const dc of projDocs(pr)) await deleteOrderFiles({ file_id: dc.file_id, file_history: dc.history });
    await remove('projects', pr.id);
    toast('Proyecto eliminado'); render();
  });
}

// ============================================================
// Investigación: qué dicen los clientes de cada producto.
// Se suben Word de reuniones o notas rápidas; el programa reconoce los productos que se
// mencionan y arma un cuadro por producto con sus comentarios (sin IA, todo local).
// ============================================================
// Claves de producto: m:<producto del mix> · c:<proyecto>|<producto de cliente> · n:<producto nuevo> · gen (sin producto)
function researchCatalog() {
  const out = [];
  for (const p of S.products) out.push({ key: 'm:' + p.id, name: p.name, code: p.code, kind: 'mix', band: `MIX · ${(p.line || '').toUpperCase()}`, color: '#3B6EF5' });
  for (const pr of S.projects) for (const it of projItems(pr)) if (it.name) out.push({ key: `c:${pr.id}|${it.id}`, name: it.name, code: it.code, kind: 'cliente', band: `CLIENTE · ${(pr.client || '').toUpperCase()}`, color: '#14A3B8' });
  for (const r of S.rproducts) out.push({ key: 'n:' + r.id, name: r.name, code: '', kind: 'nuevo', band: 'PRODUCTO NUEVO', color: '#8B5CF6', notes: r.notes });
  return out;
}
const GEN = { key: 'gen', name: 'Sin producto identificado', kind: 'gen', band: 'GENERAL', color: '#94A3B8' };

// Reconoce el producto mencionado en una frase. Exige dos palabras del nombre, o una que
// solo aparezca en ese producto (ej. "GeoLite"), o el código.
const R_STOP = new Set(['DE', 'LA', 'EL', 'LOS', 'LAS', 'CON', 'Y', 'PARA', 'DEL', 'AL', '360', 'EN', 'UN', 'UNA']);
const R_GARMENT = new Set(['BUZO', 'BUZOS', 'CHALECO', 'CHALECOS', 'PANTALON', 'POLERA', 'POLERON', 'PARKA', 'CHAQUETA', 'CAMISA', 'BLUSA', 'CALCETIN', 'CALCETINES', 'GORRO', 'POLAR', 'CORTAVIENTO', 'OVEROL', 'DELANTAL', 'TOP', 'BOTTOM', 'HOMBRE', 'MUJER', 'WOMEN', 'PILOT', 'ESSENTIAL', 'LITE', 'TECH']);
const rToks = s => norm(s).split(/[^A-Z0-9]+/).filter(t => t.length >= 2 && !R_STOP.has(t));
function buildMatcher(cat) {
  const freq = {};
  const entries = cat.map(c => {
    const t = [...new Set(rToks(c.name))].filter(x => x.length >= 3);
    t.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
    // Solo cuentan como código los que parecen código (con números o puntos), no palabras como "parka".
    const code = norm(c.code || '');
    return { c, t, code: code.length >= 4 && /[0-9.\-_]/.test(code) ? code : '' };
  });
  return text => {
    const n = norm(text), st = new Set(rToks(text));
    let best = null;
    for (const e of entries) {
      if (e.code && n.includes(e.code)) return e.c;
      const hit = e.t.filter(x => st.has(x));
      if (!hit.length) continue;
      const distinct = hit.some(x => freq[x] === 1);
      // Una sola palabra basta si es característica (ej. "GeoLite", "Treklite") y no un tipo de prenda.
      const strong = hit.some(x => x.length >= 5 && !R_GARMENT.has(x) && freq[x] <= 3);
      if (hit.length < 2 && !distinct && !strong) continue;
      // Gana el nombre completo; después, el que tiene más palabras en común y menos sobrantes.
      const full = hit.length === e.t.length ? 50 : 0;
      const score = full + hit.length * 10 + (distinct ? 5 : 0) - (e.t.length - hit.length) + (e.c.kind === 'mix' ? 0.5 : 0);
      if (!best || score > best.score) best = { c: e.c, score };
    }
    return best ? best.c : null;
  };
}

// Etiquetas de cada comentario según sus palabras.
const R_TAGS = [
  ['Precio alto', '#E5484D', /(PRECIO|VALOR|COSTO)\b.{0,25}\b(ALT[OA]|CAR[OA]|ELEVAD|EXCESIV)|\bCAR[OA]S?\b|COSTOS[OA]/],
  ['Precio bajo', '#24A866', /(PRECIO|VALOR|COSTO)\b.{0,25}\b(BAJ[OA]|BARAT|ECONOMIC|CONVENIENTE)|\bBARAT[OA]S?\b|BUEN (PRECIO|VALOR)/],
  ['Le gusta', '#24A866', /\b(GUSTA|GUSTO|GUSTAN|ENCANTA|ENCANTO)\b|EXCELENTE|MUY BUEN|BUENA CALIDAD|COMOD[OA]|BONIT[OA]/],
  ['No le gusta', '#E5484D', /NO (ME |LE |LES |NOS )?(GUSTA|GUSTO|GUSTAN)\b|\bMAL[OA]S?\b|INCOMOD|DEFECT|PROBLEMA|RECLAM|QUEJA|SE ROMP|DESCOS|DEBIL/],
  ['Sugerencia', '#8B5CF6', /AGREGA|MEJORA|DEBERIA|PODRIA|SERIA BUENO|\bFALTA|CAMBIA|SUGIER|PROPON|QUISIERA|GUSTARIA|NECESITA/],
  ['Tallas', '#F29D12', /\bTALLA|CALCE|AJUSTE|QUEDA (GRANDE|CHIC)|MUY (GRANDE|CHIC)/],
  ['Tela / diseño', '#3B6EF5', /\bTELA|MATERIAL|\bCOLOR|DISENO|\bLOGO|REFLECT|CIERRE|BOLSILLO|COSTURA|GRAMAJE|CAPUCHA/],
  ['Entrega', '#14A3B8', /ENTREGA|PLAZO|DEMORA|ATRAS|LLEGADA|\bSTOCK/],
];
function tagComment(text) {
  const n = norm(text);
  let tags = R_TAGS.filter(([, , re]) => re.test(n)).map(([t]) => t);
  if (tags.includes('No le gusta')) tags = tags.filter(t => t !== 'Le gusta');
  return tags;
}
const tagColor = t => (R_TAGS.find(x => x[0] === t) || [, '#94A3B8'])[1];

// Separa el texto en comentarios y asigna producto y cliente a cada uno.
function extractComments(text, defClient) {
  const match = buildMatcher(researchCatalog());
  const knownClients = [...new Set([...S.projects.map(p => p.client), ...S.research.map(r => r.client)].filter(Boolean))];
  const allClients = [...new Set([...knownClients, defClient].filter(Boolean))];
  // Los nombres de clientes no cuentan para reconocer productos (ej. "Minera" en "Chaleco … Minera").
  const stripClients = s => allClients.reduce((acc, c) => acc.replace(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' '), s);
  const find = s => match(stripClients(s));
  const out = [];
  let blockCtx = null; // producto de un título; lo heredan las viñetas que vienen debajo
  for (const raw of String(text || '').split(/\n+/)) {
    let line = raw.trim();
    if (!line) continue;
    // Encabezados de la reunión (no son comentarios).
    if (/^(REUNION|ACTA|MINUTA|FECHA|ASISTENTES|PARTICIPANTES|ASISTIERON|TEMA|OBJETIVO)\b/.test(norm(line))) { blockCtx = null; continue; }
    const bullet = /^[-•*·–]|^\d+[.)]\s/.test(line);
    line = line.replace(/^([-•*·–]|\d+[.)])\s*/, '');
    // "Juan Pérez: comentario" → quién lo dijo (si lo de antes de ":" no es un producto).
    let speaker = null;
    const m = /^([^:]{2,40}):\s*(.+)$/.exec(line);
    const companyLike = m && /\b(MINERA|CONSTRUCTORA|EMPRESA|CLIENTE|COMPANIA|SPA|LTDA|S ?A|SR|SRA|DON|DONA|GERENTE|JEFE)\b/.test(norm(m[1]));
    if (m && (companyLike || !find(m[1]))) { speaker = m[1].trim(); line = m[2]; }
    const sentences = line.split(/(?<=[.!?;])\s+/).map(s => s.trim()).filter(s => s.length > 2);
    let lineCtx = bullet ? blockCtx : null; // dentro de una línea, las frases siguientes heredan el producto
    let heading = false;
    for (const s of sentences) {
      const p = find(s);
      if (p) lineCtx = p;
      const tags = tagComment(s);
      // Un título con solo el nombre del producto marca el contexto, no es un comentario.
      if (p && !tags.length && rToks(s).length <= 5 && s.length < 40) { blockCtx = p; heading = true; continue; }
      const nS = norm(s);
      const mentioned = knownClients.find(c => nS.includes(norm(c)));
      const client = speaker ? (defClient && speaker !== defClient ? `${speaker} · ${defClient}` : speaker) : (mentioned || defClient || '');
      out.push({ id: uid(), key: (p || lineCtx || GEN).key, text: s, tags, client });
    }
    if (!bullet && !heading) blockCtx = null; // una línea suelta corta el bloque del título
  }
  return out;
}

// Todos los comentarios con su documento, agrupados por producto.
function researchGroups() {
  const cat = researchCatalog();
  const byKey = new Map(cat.map(c => [c.key, { c, items: [] }]));
  byKey.set('gen', { c: GEN, items: [] });
  for (const d of S.research) for (const cm of d.comments || []) {
    if (!byKey.has(cm.key)) byKey.set(cm.key, { c: { ...GEN, key: cm.key, name: 'Producto eliminado' }, items: [] });
    byKey.get(cm.key).items.push({ cm, d });
  }
  // Los productos nuevos aparecen aunque aún no tengan comentarios.
  return [...byKey.values()].filter(g => g.items.length || g.c.kind === 'nuevo' || (rCard(g.c.key).photos || []).length);
}
const rCard = key => S.rcards.find(r => r.id === key) || { id: key, photos: [] };
function rTone(items) {
  const pos = items.filter(x => x.cm.tags.includes('Le gusta') || x.cm.tags.includes('Precio bajo')).length;
  const neg = items.filter(x => x.cm.tags.includes('No le gusta') || x.cm.tags.includes('Precio alto')).length;
  if (!pos && !neg) return ['Sin tono', '#94A3B8'];
  if (pos && !neg) return ['Positivo', '#24A866'];
  if (neg && !pos) return ['Negativo', '#E5484D'];
  return pos >= neg * 2 ? ['Mayormente positivo', '#24A866'] : neg >= pos * 2 ? ['Mayormente negativo', '#E5484D'] : ['Mixto', '#F29D12'];
}

// Fotos: se guardan como archivos; se muestran con una URL temporal del navegador.
const photoUrls = new Map();
async function hydratePhotos(root) {
  for (const img of $$('img[data-photo]', root)) {
    const id = img.dataset.photo;
    if (!photoUrls.has(id)) {
      const f = fileById(id);
      try { const b = f && await Store.getFile(f.path); if (b) photoUrls.set(id, URL.createObjectURL(b)); } catch { /* sin foto */ }
    }
    if (photoUrls.has(id)) img.src = photoUrls.get(id);
  }
}

function rCardHtml(g) {
  const { c, items } = g;
  const card = rCard(c.key);
  const photos = card.photos || [];
  const sorted = [...items].sort((a, b) => (b.d.date || '').localeCompare(a.d.date || ''));
  const last = sorted[0];
  const clients = [...new Set(items.map(x => x.cm.client).filter(Boolean))];
  const docs = new Set(items.map(x => x.d.id)).size;
  const [tone, toneC] = rTone(items);
  const tagCount = {};
  items.forEach(x => x.cm.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return `<div class="rcard" data-rcard="${esc(c.key)}">
    <div class="rc-band" style="background:${c.color}">${esc(c.band)}</div>
    <div class="rc-in">
      <div class="rc-title">${esc(c.name)}</div>
      <div class="rc-desc">${last ? `“${esc(last.cm.text)}”` : esc(c.notes || 'Sin comentarios todavía.')}</div>
      ${topTags.length ? `<div class="rc-tags">${topTags.map(([t, n]) => `<span class="tag" style="background:${hexA(tagColor(t), .12)};color:${shade(tagColor(t))}">${esc(t)} · ${n}</span>`).join('')}</div>` : ''}
      <div class="rc-mid">
        <div class="rc-avs">${photos.slice(0, 4).map(id => `<img class="rc-ph" data-photo="${esc(id)}" alt="">`).join('')}${clients.slice(0, Math.max(0, 5 - Math.min(photos.length, 4))).map(cl => `<span class="av" style="background:${personColor(cl)}" title="${esc(cl)}">${esc(initials(cl))}</span>`).join('')}</div>
        <span class="rc-tone" style="color:${shade(toneC)};background:${hexA(toneC, .12)}">${esc(tone)}</span>
      </div>
    </div>
    <div class="rc-foot"><span title="Comentarios">💬 ${items.length}</span><span title="Documentos">📄 ${docs}</span><span title="Fotos">🖼 ${photos.length}</span><span class="spacer"></span><span>${last ? fmtDay(last.d.date) : ''}</span></div>
  </div>`;
}

function researchHtml() {
  const q = norm(UI.rq);
  let groups = researchGroups();
  const allClients = [...new Set(S.research.flatMap(d => (d.comments || []).map(c => c.client)).filter(Boolean))].sort();
  // Filtros: texto, etiqueta y cliente filtran los comentarios; quedan los cuadros que tengan alguno.
  const keep = x => (!q || norm(x.cm.text + ' ' + x.cm.client).includes(q)) && (!UI.rTag || x.cm.tags.includes(UI.rTag)) && (!UI.rClient || x.cm.client === UI.rClient);
  const filtering = q || UI.rTag || UI.rClient;
  groups = groups.map(g => ({ ...g, items: g.items.filter(keep) }))
    .filter(g => !filtering ? true : g.items.length || (q && norm(g.c.name).includes(q)))
    .sort((a, b) => (a.c.kind === 'gen') - (b.c.kind === 'gen') || b.items.length - a.items.length);
  const totalC = S.research.reduce((a, d) => a + (d.comments || []).length, 0);
  const docs = [...S.research].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `
  <div class="toolbar" style="padding:8px 0 4px">
    <div class="search">${ICON.search}<input id="r-q" placeholder="Buscar en los comentarios" value="${esc(UI.rq)}"></div>
    <select class="select" id="r-tag"><option value="">Todos los temas</option>${R_TAGS.map(([t]) => `<option${t === UI.rTag ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <select class="select" id="r-client"><option value="">Todos los clientes</option>${allClients.map(c => `<option${c === UI.rClient ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <div class="spacer"></div>
    ${S.research.length && !S.research.some(d => d.example) ? '<button class="btn ghost" id="r-example">Ver ejemplo</button>' : ''}
    <button class="btn" id="r-newprod">+ Producto nuevo</button>
    <button class="btn" id="r-note">+ Nota rápida</button>
    <button class="btn primary" id="r-doc">${ICON.upload} Subir Word</button>
  </div>
  ${S.research.length || S.rproducts.length ? `
  <div class="kpis">
    <div class="kpi"><div class="l">Documentos y notas</div><div class="v">${S.research.length}</div><div class="s">reuniones registradas</div></div>
    <div class="kpi"><div class="l">Comentarios</div><div class="v">${totalC}</div><div class="s">${groups.filter(g => g.c.kind !== 'gen' && g.items.length).length} productos comentados</div></div>
    <div class="kpi"><div class="l">Precio alto</div><div class="v">${S.research.reduce((a, d) => a + (d.comments || []).filter(c => c.tags.includes('Precio alto')).length, 0)}</div><div class="s">menciones</div></div>
    <div class="kpi"><div class="l">Sugerencias</div><div class="v">${S.research.reduce((a, d) => a + (d.comments || []).filter(c => c.tags.includes('Sugerencia')).length, 0)}</div><div class="s">ideas de mejora</div></div>
  </div>
  <h2 class="an-h">Por producto <span class="sub" style="font-weight:500;color:var(--faint);font-size:12px">clic en un cuadro para ver todo lo que se ha dicho</span></h2>
  <div class="rgrid">${groups.map(rCardHtml).join('') || '<div class="sub" style="color:var(--faint)">No hay comentarios con estos filtros.</div>'}</div>
  <h2 class="an-h">Documentos y notas</h2>
  <table class="tbl"><thead><tr><th>Fecha</th><th>Título</th><th>Cliente</th><th>Asistieron</th><th class="num">Comentarios</th><th></th></tr></thead><tbody>
    ${docs.map(d => `<tr class="click" data-rdoc="${esc(d.id)}"><td style="white-space:nowrap">${fmtDay(d.date)}</td><td><b>${esc(d.title)}</b> <span class="tag" style="height:18px;font-size:10.5px">${d.example ? 'Ejemplo' : d.file_id ? 'Word' : 'Nota'}</span></td><td>${esc(d.client || '—')}</td>
      <td>${avatarStack(d.attendees || [])}</td><td class="num">${(d.comments || []).length}</td>
      <td style="white-space:nowrap">${d.file_id ? `<button class="icon-btn" data-dl="${esc(d.file_id)}" title="Descargar Word">${ICON.download}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="sub" style="color:var(--faint)">Sin documentos.</td></tr>'}
  </tbody></table>` : `<div class="empty"><div class="ic">${ICON.bulb}</div><h2>Investigación de clientes</h2><p>Sube el Word de una reunión o escribe una nota rápida. El programa busca los productos mencionados y arma un cuadro por producto con lo que dijo cada cliente: precio, gustos, sugerencias, tallas, tela…</p>
    <button class="btn" id="r-example">Ver un ejemplo</button></div>`}`;
}

// Nota de ejemplo para ver cómo quedan los cuadros (se borra como cualquier documento).
const EXAMPLE_TEXT = (names) => [
  `${names.dual}`,
  '- Les gusta mucho el color y la tela.',
  '- Agregarían bolsillos en las piernas.',
  '- El precio está alto comparado con la competencia.',
  `Juan Pérez: el ${names.geo} es muy cómodo, pero la talla L queda grande.`,
  `Del ${names.trek} dijeron que la tela es débil y se rompe en las rodillas.`,
  `Minera Norte: el ${names.dual} tiene buen precio para su calidad.`,
  'Consultaron por plazos de entrega para marzo.',
].join('\n');
async function createResearchExample() {
  const by = code => (S.products.find(p => p.code === code) || {}).name;
  const names = { dual: by('dual') || 'Buzo Dual Lite', geo: 'GeoLite', trek: by('treklite') || 'Pantalón Treklite' };
  const text = EXAMPLE_TEXT(names);
  const doc = {
    id: uid(), kind: 'nota', example: true, title: 'Ejemplo (puedes borrarlo)', date: isoDay(new Date()),
    client: 'Cliente de ejemplo', attendees: [me()], text, created_at: nowIso(),
  };
  doc.comments = extractComments(text, doc.client);
  await save('research', doc);
  toast('Ejemplo creado: haz clic en un cuadro para ver el detalle');
  render();
}

// Ventana para crear o editar un documento / nota. El texto se puede corregir antes de guardar.
function openResearchDoc(doc, file) {
  const isNew = !S.research.some(d => d.id === doc.id);
  const n = S.research.length + 1;
  const clients = [...new Set([...S.projects.map(p => p.client), ...S.research.map(r => r.client)].filter(Boolean))];
  openModal(`
    <div class="m-head"><h2>${isNew ? (file ? 'Nuevo documento' : 'Nota rápida') : 'Editar documento'}</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body"><div class="m-cols">
      <div>
        <div class="field"><label>Texto ${file ? `<span class="sub" style="color:var(--faint)">(leído de ${esc(file.name)}; puedes corregirlo)</span>` : ''}</label>
          <textarea class="input" id="rd-text" style="height:340px" placeholder="Ej:&#10;Buzo Dual Lite: les gusta, pero agregarían bolsillos.&#10;Minera X: el precio del GeoLite está alto.">${esc(doc.text || '')}</textarea></div>
        <div class="sub" style="color:var(--faint);font-size:11.5px">Consejo: escribe el producto al inicio de la frase o como título, y si sabes quién lo dijo, "Cliente: comentario".</div>
      </div>
      <div>
        <div class="field"><label>Título</label><input class="input" id="rd-title" value="${esc(doc.title || `Reunión ${n}`)}"></div>
        <div class="field"><label>Fecha de la reunión</label><input class="input" type="date" id="rd-date" value="${esc(doc.date || isoDay(new Date()))}"></div>
        <div class="field"><label>Cliente <span class="sub" style="color:var(--faint)">(si la reunión fue con uno)</span></label><input class="input" id="rd-client" list="rd-clients" value="${esc(doc.client || '')}"><datalist id="rd-clients">${clients.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="field"><label>Asistieron de K8</label><div class="chips">${PEOPLE.map(pp => `<label class="chip pick ${(doc.attendees || []).includes(pp) ? 'on' : ''}"><input type="checkbox" data-rd-att value="${esc(pp)}"${(doc.attendees || []).includes(pp) ? ' checked' : ''}>${avatar(pp, 'sm')} ${esc(pp.split(' ')[0])}</label>`).join('')}</div></div>
        <div class="field"><label>Lo que encontró el programa</label><div id="rd-preview" class="rd-prev"></div></div>
      </div>
    </div></div>
    <div class="m-foot">${isNew ? '' : `<button class="btn danger" id="rd-del" style="margin-right:auto">${ICON.trash} Eliminar</button>`}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rd-save">Guardar</button></div>`, {
    onMount: w => {
      $$('[data-rd-att]', w).forEach(cb => cb.onchange = () => cb.closest('.chip').classList.toggle('on', cb.checked));
      const preview = () => {
        const cms = extractComments($('#rd-text', w).value, $('#rd-client', w).value.trim());
        const cat = researchCatalog();
        const by = {};
        cms.forEach(c => { by[c.key] = (by[c.key] || 0) + 1; });
        $('#rd-preview', w).innerHTML = cms.length
          ? Object.entries(by).sort((a, b) => (a[0] === 'gen') - (b[0] === 'gen') || b[1] - a[1]).map(([k, v]) => `<div class="list-item" style="padding:4px 0"><div class="grow">${esc(k === 'gen' ? GEN.name : (cat.find(c => c.key === k) || {}).name || '—')}</div><b>${v}</b></div>`).join('')
          : '<div class="sub" style="color:var(--faint)">Escribe o pega el texto para ver los comentarios por producto.</div>';
        return cms;
      };
      let tm; $('#rd-text', w).oninput = () => { clearTimeout(tm); tm = setTimeout(preview, 300); };
      $('#rd-client', w).onchange = preview;
      preview();
      $('#rd-save', w).onclick = async () => {
        const text = $('#rd-text', w).value.trim();
        if (!text) return toast('El documento no tiene texto', true);
        const textChanged = text !== (doc.text || '').trim() || $('#rd-client', w).value.trim() !== (doc.client || '');
        if (!isNew && textChanged && !confirm('Cambiaste el texto o el cliente: se volverán a leer los comentarios y se perderán los cambios hechos a mano en ellos. ¿Continuar?')) return;
        Object.assign(doc, {
          title: $('#rd-title', w).value.trim() || `Reunión ${n}`, date: $('#rd-date', w).value || isoDay(new Date()),
          client: $('#rd-client', w).value.trim(), attendees: $$('[data-rd-att]', w).filter(c => c.checked).map(c => c.value), text,
        });
        if (isNew || textChanged) doc.comments = extractComments(text, doc.client);
        if (isNew && file) { try { doc.file_id = (await storeBackup(file, 'investigacion')).id; } catch (e) { toast('No se pudo guardar el Word: ' + (e.message || e), true); } }
        await save('research', doc);
        closeModal(); toast(`${doc.title}: ${doc.comments.length} comentarios`); render();
      };
      const del = $('#rd-del', w);
      if (del) del.onclick = async () => {
        if (!confirm(`¿Eliminar "${doc.title}" con sus ${(doc.comments || []).length} comentarios?`)) return;
        await deleteOrderFiles({ file_id: doc.file_id });
        await remove('research', doc.id); closeModal(); toast('Documento eliminado'); render();
      };
    },
  });
}

async function uploadResearchWord() {
  pickFiles('.docx,.txt', false, async ([file]) => {
    let text = '';
    try {
      if (/\.txt$/i.test(file.name)) text = await file.text();
      else {
        if (!window.mammoth) return toast('No se pudo cargar el lector de Word (revisa la conexión a internet)', true);
        text = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      }
    } catch (e) { return toast('No se pudo leer el Word: ' + (e.message || e), true); }
    // Word separa párrafos con líneas en blanco: se dejan en una sola.
    text = text.replace(/\r/g, '').replace(/\n{2,}/g, '\n').trim();
    openResearchDoc({ id: uid(), kind: 'doc', title: file.name.replace(/\.(docx|txt)$/i, ''), date: isoDay(new Date()), client: '', attendees: [me()], text, comments: [], created_at: nowIso() }, file);
  });
}

// Detalle de un cuadro: todos los comentarios del producto, fotos y correcciones.
function openResearchCard(key) {
  const g = researchGroups().find(x => x.c.key === key) || { c: researchCatalog().find(c => c.key === key) || GEN, items: [] };
  const { c } = g;
  const items = [...g.items].sort((a, b) => (b.d.date || '').localeCompare(a.d.date || ''));
  const cat = researchCatalog();
  const card = rCard(key);
  const rp = c.kind === 'nuevo' ? S.rproducts.find(r => 'n:' + r.id === key) : null;
  const tagCount = {};
  items.forEach(x => x.cm.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const moveOpts = sel => `<option value="gen"${sel === 'gen' ? ' selected' : ''}>${esc(GEN.name)}</option>` + cat.map(o => `<option value="${esc(o.key)}"${o.key === sel ? ' selected' : ''}>${esc(o.name)}${o.kind !== 'mix' ? ` (${o.kind === 'nuevo' ? 'nuevo' : 'cliente'})` : ''}</option>`).join('');
  openModal(`
    <div class="m-head" style="border-top:6px solid ${c.color}"><div><div class="sub" style="font-size:11px;font-weight:700;letter-spacing:.05em;color:${shade(c.color)}">${esc(c.band)}</div><h2>${esc(c.name)}</h2></div><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      ${rp ? `<div class="field"><label>Descripción del producto nuevo</label><textarea class="input" id="rp-notes">${esc(rp.notes || '')}</textarea></div>` : ''}
      <div class="rc-photos">${(card.photos || []).map(id => `<div class="rc-phbig"><img data-photo="${esc(id)}" alt=""><button data-ph-del="${esc(id)}" title="Quitar foto">×</button></div>`).join('')}
        <button class="rc-phadd" id="ph-add">+ Fotos</button></div>
      ${Object.keys(tagCount).length ? `<div class="rc-tags" style="margin:10px 0">${Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span class="tag" style="background:${hexA(tagColor(t), .12)};color:${shade(tagColor(t))}">${esc(t)} · ${n}</span>`).join('')}</div>` : ''}
      <div class="rc-list">${items.map(({ cm, d }) => `<div class="rc-cm">
        <div class="rc-cm-text">“${esc(cm.text)}”</div>
        <div class="rc-cm-meta">${cm.client ? `<b>${esc(cm.client)}</b> · ` : ''}${esc(d.title)} · ${fmtDay(d.date)}
          ${cm.tags.map(t => `<span class="tag" style="height:18px;font-size:10.5px;background:${hexA(tagColor(t), .12)};color:${shade(tagColor(t))}">${esc(t)}</span>`).join('')}</div>
        <div class="rc-cm-act"><select class="select" data-cm-move="${esc(d.id)}|${esc(cm.id)}" title="Mover a otro producto">${moveOpts(cm.key)}</select>
          <button class="icon-btn" data-cm-del="${esc(d.id)}|${esc(cm.id)}" title="Borrar comentario">${ICON.trash}</button></div>
      </div>`).join('') || '<div class="sub" style="color:var(--faint)">Aún no hay comentarios de este producto.</div>'}</div>
    </div>
    <div class="m-foot">${rp ? `<button class="btn danger" id="rp-del" style="margin-right:auto">${ICON.trash} Eliminar producto nuevo</button>` : ''}<button class="btn primary" data-close>Listo</button></div>`, {
    onMount: async w => {
      const reopen = () => { render(); openResearchCard(key); };
      const notes = $('#rp-notes', w);
      if (notes) notes.onchange = async () => { rp.notes = notes.value.trim(); await save('rproducts', rp); toast('Descripción guardada'); };
      $('#ph-add', w).onclick = () => pickFiles('image/*', true, async files => {
        const cardRow = { ...rCard(key) };
        for (const f of files) { try { cardRow.photos = [...(cardRow.photos || []), (await storeBackup(f, 'foto')).id]; } catch (e) { toast('No se pudo guardar la foto: ' + (e.message || e), true); } }
        await save('rcards', cardRow); toast(`${files.length} foto${files.length > 1 ? 's' : ''} agregada${files.length > 1 ? 's' : ''}`); reopen();
      });
      $$('[data-ph-del]', w).forEach(b => b.onclick = async () => {
        if (!confirm('¿Quitar esta foto?')) return;
        const cardRow = { ...rCard(key) };
        cardRow.photos = cardRow.photos.filter(x => x !== b.dataset.phDel);
        await deleteOrderFiles({ file_id: b.dataset.phDel });
        await save('rcards', cardRow); reopen();
      });
      $$('img[data-photo]', w).forEach(img => img.onclick = () => { if (img.src) window.open(img.src, '_blank'); });
      const cmRef = v => { const [did, cid] = v.split('|'); const d = S.research.find(x => x.id === did); return [d, d && d.comments.find(x => x.id === cid)]; };
      $$('[data-cm-move]', w).forEach(s => s.onchange = async () => {
        const [d, cm] = cmRef(s.dataset.cmMove); if (!cm) return;
        cm.key = s.value; await save('research', d); toast('Comentario movido'); reopen();
      });
      $$('[data-cm-del]', w).forEach(b => b.onclick = async () => {
        const [d, cm] = cmRef(b.dataset.cmDel); if (!cm || !confirm('¿Borrar este comentario?')) return;
        d.comments = d.comments.filter(x => x.id !== cm.id); await save('research', d); reopen();
      });
      const del = $('#rp-del', w);
      if (del) del.onclick = async () => {
        if (!confirm(`¿Eliminar el producto nuevo "${rp.name}"? Sus comentarios pasan a "Sin producto identificado".`)) return;
        for (const d of S.research) if ((d.comments || []).some(x => x.key === key)) { d.comments.forEach(x => { if (x.key === key) x.key = 'gen'; }); await save('research', d); }
        for (const id of card.photos || []) await deleteOrderFiles({ file_id: id });
        if (S.rcards.some(r => r.id === key)) await remove('rcards', key);
        await remove('rproducts', rp.id); closeModal(); toast('Producto nuevo eliminado'); render();
      };
      await hydratePhotos(w);
    },
  });
}

function openNewResearchProduct() {
  openModal(`
    <div class="m-head"><h2>Producto nuevo (investigación)</h2><div class="spacer"></div><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="m-body">
      <div class="field"><label>Nombre</label><input class="input" id="rpn-name" placeholder="Ej: Parka térmica con capucha"></div>
      <div class="field"><label>Descripción / idea</label><textarea class="input" id="rpn-notes"></textarea></div>
      <div class="sub" style="color:var(--faint);font-size:12px">Después de crearlo puedes agregarle fotos desde su cuadro. Los comentarios que lo mencionen se asignan solos.</div>
    </div>
    <div class="m-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="rpn-go">Crear</button></div>`, {
    narrow: true,
    onMount: w => {
      $('#rpn-name', w).focus();
      $('#rpn-go', w).onclick = async () => {
        const name = $('#rpn-name', w).value.trim();
        if (!name) return toast('Ponle un nombre', true);
        const r = { id: uid(), name, notes: $('#rpn-notes', w).value.trim(), created_at: nowIso() };
        await save('rproducts', r);
        closeModal(); toast('Producto nuevo creado'); render();
      };
    },
  });
}

function bindResearch(app) {
  const q = $('#r-q', app);
  if (q) q.oninput = e => { UI.rq = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#r-q'); n.focus(); n.setSelectionRange(pos, pos); };
  const t = $('#r-tag', app); if (t) t.onchange = () => { UI.rTag = t.value; render(); };
  const c = $('#r-client', app); if (c) c.onchange = () => { UI.rClient = c.value; render(); };
  $('#r-doc', app).onclick = uploadResearchWord;
  $('#r-note', app).onclick = () => openResearchDoc({ id: uid(), kind: 'nota', title: '', date: isoDay(new Date()), client: '', attendees: [me()], text: '', comments: [], created_at: nowIso() });
  $('#r-newprod', app).onclick = openNewResearchProduct;
  const ex = $('#r-example', app); if (ex) ex.onclick = createResearchExample;
  $$('[data-rcard]', app).forEach(el => el.onclick = () => openResearchCard(el.dataset.rcard));
  $$('[data-rdoc]', app).forEach(r => r.onclick = e => { if (e.target.closest('[data-dl]')) return; const d = S.research.find(x => x.id === r.dataset.rdoc); if (d) openResearchDoc(d); });
  hydratePhotos(app);
}

// ---------- Panel lateral de detalle ----------
function openDrawer(id) { UI.drawer = id; render(); }
function closeDrawer() { UI.drawer = null; render(); }

function renderDrawer() {
  const root = $('#drawer-root');
  const p = UI.drawer && productById(UI.drawer);
  if (!p) { root.innerHTML = ''; return; }
  const st = stage(p.stage);
  const sa = activeSample(p);
  const smp = samplesOf(p);
  const os = ordersOf(p);
  const evs = eventsOf(p).reverse();
  const resp = p.responsables || {};

  root.innerHTML = `<div class="scrim" data-close-drawer></div>
  <aside class="drawer" role="dialog" aria-label="${esc(p.name)}">
    <div class="d-head">
      <div style="flex:1;min-width:0">
        <span class="tag" style="${pillStyle(p.stage)}"><span class="dot" style="background:${st.c}"></span>${st.n} · ${esc(st.name)}</span>
        <h2>${esc(p.name)}</h2><div class="cd">${esc(p.code)} · ${esc(p.line)}${p.garment ? ' · ' + esc(p.garment) : ''}</div>
      </div>
      <button class="icon-btn" data-close-drawer>${ICON.x}</button>
    </div>
    <div class="d-body">
      <div class="sec"><h4>Etapa</h4>
        ${inFloorButOther(p) ? `<div class="callout" style="margin-bottom:12px;background:#FDF2F8;color:#8C2A5E">${ICON.info}<div style="flex:1">Este producto ya está en sala desde el <b>${fmtDay(saleSince(p))}</b>, pero aparece en <b>${esc(stage(p.stage).name)}</b>.</div><button class="btn sm" data-floor-one="${esc(p.id)}">Pasar a Venta</button></div>` : ''}
        <div class="stepper">${STAGES.map(s => `<button class="step ${s.n === p.stage ? 'cur' : ''}" data-step="${s.n}" title="${s.n} · ${esc(s.name)}"><i style="${s.n <= p.stage && p.stage !== DISC || s.n === p.stage ? `background:${s.c}` : ''}"></i><span>${esc(s.short)}</span></button>`).join('')}</div>
        ${evs.length ? `<div class="kv" style="margin-top:14px"><div class="k">En esta etapa desde</div><div style="display:flex;align-items:center;gap:8px"><input type="date" class="input" style="height:30px" data-ev-idx="0" value="${esc(isoDay(evs[0].at))}" max="${esc(isoDay(new Date()))}"><span class="sub" style="color:var(--muted)">${daysBetween(evs[0].at, new Date()) + 1} día(s)</span></div></div>` : ''}
      </div>

      <div class="sec"><h4>Responsables por etapa <button class="btn sm" data-open-config>Editar</button></h4>
        <div class="resp-grid">${STAGES.filter(s => s.n !== DISC).map(s => { const r = stageResp(s.n); return `<div class="resp-row ${s.n === p.stage ? 'cur' : ''}"><span class="dot" style="background:${s.c}"></span><span class="lab" title="${esc(s.name)}">${esc(s.short)}</span>${avatarStack(r)}<span class="names" title="${esc(r.join(', '))}">${esc(r.map(x => x.split(' ')[0]).join(', ') || '—')}</span></div>`; }).join('')}</div>
        <div class="sub" style="margin-top:8px;color:var(--faint);font-size:11.5px">Son los mismos para todos los productos.</div>
      </div>

      ${p.stage === 2 || smp.length ? `<div class="sec"><h4>Muestras ${!sa && !waitingSample(p) && p.stage === 2 ? `<button class="btn sm" data-start-sample="${esc(p.id)}">${ICON.flask} Iniciar ${esc(ROUNDS[Math.min(smp.length, 3)])}</button>` : ''}</h4>
        ${sa ? (() => { const t = sampleTime(sa); return `<div class="sample-card ${t.cls}" style="margin-bottom:10px">
          <div class="top"><div style="flex:1"><b>${esc(sa.round)}</b><div class="meta">inició ${fmtDay(sa.started_at)} · vence ${fmtDay(sa.due_at)}</div></div>${timerChip(sa)}</div>
          <div class="ttrack"><i style="width:${t.elapsed * 100}%"></i></div>
          <div class="person-select" style="border:1px solid var(--line-soft);border-radius:8px;padding:4px 8px">${avatar(sa.responsable, 'sm')}<select data-sample-resp="${esc(sa.id)}">${peopleOptions(sa.responsable)}</select></div>
          <div class="row-actions"><button class="btn sm" data-sample-ok="${esc(sa.id)}" style="color:var(--ok)">✓ Aprobar</button><button class="btn sm" data-sample-bad="${esc(sa.id)}" style="color:var(--danger)">✕ Rechazar</button></div></div>`; })() : ''}
        ${(() => { const w = waitingSample(p); if (!w) return ''; const prev = smp.filter(a => a.status === 'rechazada').pop(); return `<div class="sample-card espera" style="margin-bottom:10px"><div class="top"><div style="flex:1"><b>Esperando ${esc(w.round)}</b><div class="meta">se está fabricando · sin contador</div></div><span class="tag espera-tag">Pendiente</span></div>${prev && prev.note ? `<div class="sub" style="font-size:12px;color:var(--danger);background:rgba(229,72,77,.08);border-radius:8px;padding:6px 8px"><b>Rechazo de ${esc(prev.round)}:</b> ${esc(prev.note)}</div>` : ''}<div class="row-actions"><button class="btn sm primary" data-sample-arrive="${esc(w.id)}">Llegó la ${esc(w.round)} · iniciar ${SAMPLE_DAYS} días</button></div></div>`; })()}${smp.filter(s => s.status !== 'en_curso' && s.status !== 'esperando').reverse().map(s => `<div class="list-item"><div class="grow"><b>${esc(s.round)}</b><div class="sub">${fmtDay(s.started_at)} → ${fmtDay(s.closed_at)} · ${daysBetween(s.started_at, s.closed_at)} días · ${esc(s.responsable || 'sin responsable')}</div></div>${sampleTag(s)}</div>`).join('')}
      </div>` : ''}

      <div class="sec"><h4>Pedido y reposiciones <button class="btn sm" data-upload-for="${esc(p.id)}">${ICON.upload} Subir Excel</button></h4>
        ${cyclesHtml(p)}
      </div>

      <div class="sec"><h4>Ficha <button class="btn sm" id="swap-open" title="Pasa etapa, historial, fechas, envíos, muestras y ventas a otro producto y trae los de ese">⇄ Intercambiar datos con otro producto</button></h4>
        <div class="kv pf">
          <div class="k">Nombre</div><div><input class="input" id="pf-name" data-pf="name" value="${esc(p.name)}"></div>
          <div class="k">Código</div><div><input class="input" id="pf-code" data-pf="code" value="${esc(p.code)}"></div>
          <div class="k">Línea</div><div><select class="select" id="pf-line" data-pf="line">${[...new Set([...LINES, ...S.products.map(x => x.line)])].filter(Boolean).map(l => `<option${l === p.line ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
          <div class="k">Tipo de prenda</div><div><select class="select" id="pf-garment" data-pf="garment">${['Top', 'Bottom', 'Full Body', 'Sin clasificar'].map(g => `<option${g === p.garment ? ' selected' : ''}>${g}</option>`).join('')}</select></div>
          <div class="k">Colores</div><div><input class="input" id="pf-colors" data-pf="colors" value="${esc(p.colors || '')}"></div>
          <div class="k">Tallas</div><div><input class="input" id="pf-sizes" data-pf="sizes" value="${esc(p.sizes || '')}"></div>
          <div class="k">Composición</div><div><input class="input" id="pf-composition" data-pf="composition" value="${esc(p.composition || '')}"></div>
          <div class="k">Mínimo de fábrica</div><div><input class="input" type="number" min="0" step="50" id="pf-min_qty" data-pf="min_qty" value="${esc(p.min_qty || '')}" placeholder="${fmtInt(getSetting('min_qty', DEFAULT_MIN_QTY))} (general)"></div>
        </div>
      </div>
      ${p.stage >= SALE || salesOf(p).length || saleSince(p) ? `<div class="sec"><h4>Ventas registradas</h4>
        ${salesSectionHtml(p)}
      </div>` : ''}
      <div class="sec"><h4>Historial</h4>
        ${(() => { const after = stagesAfterCurrent(p); return after.length ? `<div class="callout warn" style="margin-bottom:10px">${ICON.info}<div style="flex:1">La etapa actual es <b>${esc(stage(p.stage).name)}</b>, pero el historial tiene después ${after.map(e => `<b>${esc(stage(e.stage).name)}</b> (${fmtDay(e.at)})`).join(', ')}. Por eso el Gantt muestra esa etapa al final.</div><button class="btn sm" data-fix-cross>Quitar ${after.length > 1 ? 'esas etapas' : esc(stage(after[0].stage).name)}</button></div>` : ''; })()}
        <div class="sub" style="color:var(--faint);font-size:11.5px;margin-bottom:6px">Para quitar una etapa, borra su fecha o usa la ×. El producto queda en la última etapa que quede.</div>
        <div class="history">${evs.map((e, i) => {
          const end = i === 0 ? new Date() : evs[i - 1].at;
          return `<div class="h"><span class="dot" style="background:${stage(e.stage).c}"></span>
            <div style="display:flex;align-items:center;gap:8px"><b style="flex:1">${esc(stage(e.stage).name)}</b>
              <span class="sub">${daysBetween(e.at, end) + (i === 0 ? 1 : 0)} d</span>
              <input type="date" class="input" style="height:28px;font-size:12px" data-ev-idx="${i}" value="${esc(isoDay(e.at))}" max="${esc(isoDay(new Date()))}" title="Fecha de inicio de esta etapa (bórrala para quitar la etapa)">
              ${evs.length > 1 ? `<button class="icon-btn ev-del" data-ev-del="${i}" title="Quitar esta etapa del historial">${ICON.x.replace(/16/g, '13')}</button>` : ''}</div>
            <div class="sub">${i === 0 ? 'Etapa actual' : 'Hasta ' + fmtDay(end)}${e.by ? ' · ' + esc(e.by) : ''}${e.note ? ' · ' + esc(e.note) : ''}</div></div>`;
        }).join('') || '<div class="sub">Sin movimientos.</div>'}</div>
        ${(() => { const ss = samplesOf(p).filter(x => x.status !== 'en_curso').reverse(); return ss.length ? `<h4 style="margin-top:14px">Muestras</h4><div class="history">${ss.map(x => `<div class="h"><span class="dot" style="background:${x.status === 'aprobada' ? 'var(--ok)' : x.status === 'rechazada' ? 'var(--danger)' : 'var(--faint)'}"></span><div style="display:flex;align-items:center;gap:8px"><b style="flex:1">${esc(x.round)} · ${esc(x.status.replace('_', ' '))}</b><span class="sub">${fmtDay(x.started_at)} → ${fmtDay(x.closed_at)}</span></div>${x.note ? `<div class="sub" style="color:${x.status === 'rechazada' ? 'var(--danger)' : 'var(--muted)'}">${esc(x.note)}</div>` : ''}</div>`).join('')}</div>` : ''; })()}
      </div>

      <div class="sec danger-zone"><h4>Eliminar</h4>
        <div style="display:flex;align-items:center;gap:10px"><span class="sub" style="color:var(--muted);font-size:12px;flex:1">Borra el producto con su historial, pedidos y reposiciones, muestras y ventas registradas.</span>
        <button class="btn danger" id="del-product">${ICON.trash} Eliminar producto</button></div>
      </div>
    </div>
  </aside>`;

  const d = $('.drawer', root);
  $$('[data-close-drawer]', root).forEach(b => b.onclick = closeDrawer);
  $$('[data-step]', d).forEach(b => b.onclick = () => {
    const n = +b.dataset.step;
    if (!confirmStageChange(p, n)) return;
    setStage(p, n);
  });
  // Corrige la fecha de inicio de una etapa (evs va del más reciente al más antiguo).
  $$('[data-ev-idx]', d).forEach(inp => onDateCommit(inp, async () => {
    const i = +inp.dataset.evIdx;
    const ev = evs[i];
    // Fecha vacía = quitar esa etapa del historial; el producto queda en la última que quede.
    if (!inp.value) {
      if (!confirm(`¿Quitar "${stage(ev.stage).name}" del historial de "${p.name}"?`)) { inp.value = isoDay(ev.at); return; }
      await removeStageEvent(p, ev);
      toast(`${stage(ev.stage).name} quitada · etapa actual: ${stage(p.stage).name}`);
      return render();
    }
    const day = parseDay(inp.value);
    const reset = msg => { toast(msg, true); inp.value = isoDay(ev.at); };
    if (!day) return reset('Fecha no válida');
    if (day > startOfDay(new Date())) return reset('No puede ser una fecha futura');
    // Sin bloqueos de orden: el historial se reordena solo por fecha.
    day.setHours(9);
    ev.at = day.toISOString();
    await save('events', ev);
    // Si la etapa actual quedó antes que otras, se ofrece quitar las posteriores.
    const after = stagesAfterCurrent(p);
    if (ev.stage === p.stage && after.length && confirm(`Con esa fecha, ${stage(p.stage).name} queda antes de ${after.map(e => `${stage(e.stage).name} (${fmtDay(e.at)})`).join(', ')}.\n\n¿Quitar esas etapas del historial para que ${stage(p.stage).name} siga siendo la etapa actual?`)) {
      for (const e of after) await remove('events', e.id);
    }
    await syncStageToHistory(p);
    toast(stage(ev.stage).name + ': inicio ' + fmtDay(ev.at));
    renderKeepFocus();
  }));
  $$('[data-ev-del]', d).forEach(b => b.onclick = async () => {
    const ev = evs[+b.dataset.evDel];
    if (!ev || !confirm(`¿Quitar "${stage(ev.stage).name}" (${fmtDay(ev.at)}) del historial de "${p.name}"?`)) return;
    await removeStageEvent(p, ev);
    toast(`${stage(ev.stage).name} quitada · etapa actual: ${stage(p.stage).name}`);
    render();
  });
  $$('[data-fix-cross]', d).forEach(b => b.onclick = async () => {
    for (const e of stagesAfterCurrent(p)) await remove('events', e.id);
    toast(`Historial corregido: queda en ${stage(p.stage).name}`);
    render();
  });
  bindCycles(d, p);
  bindSales(d, p);
  // Ficha editable: se guarda al salir del campo.
  $$('[data-pf]', d).forEach(inp => inp.onchange = async () => {
    const f = inp.dataset.pf, v = inp.value.trim();
    if ((f === 'name' || f === 'code') && !v) { inp.value = p[f]; return toast('No puede quedar vacío', true); }
    if (f === 'code' && S.products.some(x => x.id !== p.id && x.code === v)) { inp.value = p.code; return toast('Ese código ya lo usa otro producto', true); }
    p[f] = f === 'min_qty' ? (parseInt(v, 10) > 0 ? parseInt(v, 10) : null) : v; p.updated_at = nowIso();
    await save('products', p);
    toast('Ficha actualizada');
    renderKeepFocus();
  });
  $('#swap-open', d).onclick = () => openSwap(p);
  $$('[data-floor-one]', d).forEach(b => b.onclick = () => openFloorFix(p.id));
  $('#del-product', d).onclick = async () => {
    const name = p.name;
    if (await deleteProduct(p)) { UI.drawer = null; toast(`"${name}" eliminado`); render(); }
  };

  bindCommon(d);
}

// ---------- Eventos ----------
function bindCommon(el) {
  $$('[data-open]', el).forEach(b => b.onclick = () => openDrawer(b.dataset.open));
  $$('[data-open-config]', el).forEach(b => b.onclick = e => { e.stopPropagation(); openConfig(); });
  $$('[data-order-row]', el).forEach(r => r.onclick = e => { e.stopPropagation(); e.preventDefault(); if (!e.target.closest('[data-dl]')) openOrderDetail(r.dataset.orderRow); });
  $$('[data-dl]', el).forEach(b => b.onclick = e => { e.stopPropagation(); downloadFile(b.dataset.dl); });
  $$('[data-upload-for]', el).forEach(b => b.onclick = () => openUploadModal(b.dataset.uploadFor));
  $$('[data-upload-any]', el).forEach(b => b.onclick = () => openUploadModal());
  $$('[data-start-sample]', el).forEach(b => b.onclick = async () => { await startRound(productById(b.dataset.startSample)); render(); });
  $$('[data-sample-ok]', el).forEach(b => b.onclick = () => closeRound(S.samples.find(s => s.id === b.dataset.sampleOk), true));
  $$('[data-sample-arrive]', el).forEach(b => b.onclick = () => arriveSample(S.samples.find(s => s.id === b.dataset.sampleArrive)));
  $$('[data-sample-bad]', el).forEach(b => b.onclick = () => {
    const s = S.samples.find(x => x.id === b.dataset.sampleBad);
    rejectWithComment(s);
  });
  $$('[data-sample-resp]', el).forEach(sel => sel.onchange = async () => {
    const s = S.samples.find(x => x.id === sel.dataset.sampleResp);
    s.responsable = sel.value; await save('samples', s); render();
  });
}

function bindMain() {
  const app = $('#app');
  $$('[data-tab]', app).forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; lsSet('k8r_ui_tab', UI.tab); render(); });
  $$('[data-alert-close]', app).forEach(b => b.onclick = () => { lsSet('k8r_alert_hidden', isoDay(new Date())); render(); });
  $('#btn-upload').onclick = () => openUploadModal();
  const be = $('#btn-upload-empty'); if (be) be.onclick = () => openUploadModal();
  $('#me').onchange = e => { lsSet('k8r_me', e.target.value); render(); };
  const lo = $('#btn-logout'); if (lo) lo.onclick = async () => { await CloudStore.sb.auth.signOut(); location.reload(); };

  const q = $('#q');
  if (q) q.oninput = e => {
    UI.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const nq = $('#q'); nq.focus(); nq.setSelectionRange(pos, pos);
  };
  $$('[data-line]', app).forEach(b => b.onclick = () => { UI.line = b.dataset.line; render(); });
  // Número de reposiciones: se escribe el total que lleva el producto; las registradas
  // en el programa se suman solas, así que se guarda solo la diferencia (repo_base).
  $$('[data-repo-count]', app).forEach(b => b.onclick = e => { e.stopPropagation(); editRepoCount(productById(b.dataset.repoCount)); });
  // Informe de ventas.
  const su = $('#sales-up', app); if (su) su.onclick = () => pickFile();
  const sm = $('#sales-map', app); if (sm) sm.onclick = () => openSalesImport(latestReport(), null, true);
  $$('[data-sales-detail]', app).forEach(el => el.onclick = e => { e.preventDefault(); openSalesDetail(el.dataset.salesDetail); });
  $$('[data-sug-open]', app).forEach(el => el.onclick = () => openSugDetail(el.dataset.sugOpen));
  $$('[data-sug-xlsx]', app).forEach(b => b.onclick = downloadSugXlsx);
  $$('[data-dead-open]', app).forEach(a => a.onclick = () => openDeadModal());
  $$('[data-go-dead]', app).forEach(a => a.onclick = () => {
    UI.tab = 'analisis'; lsSet('k8r_ui_tab', 'analisis'); render();
    const c = $('#dead-card'); if (c) c.scrollIntoView({ block: 'start' });
  });
  // Filtros del Análisis.
  const af = $('#a-from'), at = $('#a-to'), ac = $('#a-clear');
  if (af) onDateCommit(af, () => { UI.aFrom = af.value; renderKeepFocus(); });
  if (at) onDateCommit(at, () => { UI.aTo = at.value; renderKeepFocus(); });
  if (ac) ac.onclick = () => { UI.aFrom = UI.aTo = ''; render(); };
  $$('[data-pj]', app).forEach(r => r.onclick = () => { UI.aProduct = r.dataset.pj; render(); });
  // Filtros de Pedidos y reposiciones.
  const oq = $('#o-q');
  if (oq) oq.oninput = e => { UI.oQ = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#o-q'); n.focus(); n.setSelectionRange(pos, pos); };
  const om = $('#o-month'); if (om) om.onchange = () => { UI.oMonth = om.value; render(); };
  const ok = $('#o-kind'); if (ok) ok.onchange = () => { UI.oKind = ok.value; render(); };
  $$('.mbars .mb[data-month]', app).forEach(g => g.onclick = () => {
    if (UI.tab === 'reposiciones') UI.oMonth = UI.oMonth === g.dataset.month ? '' : g.dataset.month;
    render();
  });
  $$('[data-zoom]', app).forEach(b => b.onclick = () => { UI.zoom = b.dataset.zoom; lsSet('k8r_ui_zoom', UI.zoom); UI.scrolledToToday = false; render(); });
  const gf = $('#g-from'), gt = $('#g-to'), gc = $('#g-clear');
  if (gf) onDateCommit(gf, () => { UI.gFrom = gf.value; lsSet('k8r_ui_gfrom', UI.gFrom); UI.scrolledToToday = false; renderKeepFocus(); });
  if (gt) onDateCommit(gt, () => { UI.gTo = gt.value; lsSet('k8r_ui_gto', UI.gTo); UI.scrolledToToday = false; renderKeepFocus(); });
  if (gc) gc.onclick = () => { UI.gFrom = UI.gTo = ''; lsSet('k8r_ui_gfrom', ''); lsSet('k8r_ui_gto', ''); UI.scrolledToToday = false; render(); };
  const fs = $('#f-stage'); if (fs) fs.onchange = e => { UI.stage = e.target.value; render(); };
  const fp = $('#f-person'); if (fp) fp.onchange = e => { UI.person = e.target.value; render(); };

  $$('[data-group]', app).forEach(g => g.onclick = () => {
    const l = g.dataset.group; UI.collapsed[l] = !UI.collapsed[l]; lsSet('k8r_ui_collapsed', UI.collapsed); render();
  });
  $$('[data-stage-of]', app).forEach(s => s.onchange = () => {
    const p = productById(s.dataset.stageOf), n = +s.value;
    if (!confirmStageChange(p, n)) { s.value = p.stage; return; }
    setStage(p, n);
  });
  const ff = $('#floor-fix'); if (ff) ff.onclick = () => openFloorFix();
  $$('[data-bar]', app).forEach(b => b.onclick = () => openDrawer(b.dataset.bar));
  $$('.mk[data-order]', app).forEach(m => m.onclick = e => { e.stopPropagation(); openOrderDetail(m.dataset.order); });
  $$('.g-row[data-id]', app).forEach(r => r.oncontextmenu = e => {
    if (e.target.closest('select')) return;
    e.preventDefault(); openCtx(productById(r.dataset.id), e.clientX, e.clientY);
  });
  if (UI.tab === 'importaciones') bindProjects(app);
  if (UI.tab === 'investigacion') bindResearch(app);
  bindCommon(app);
}

// Relojes de muestras: se actualizan cada 30 s sin redibujar todo.
function tickTimers() {
  $$('[data-timer]').forEach(el => {
    const s = S.samples.find(x => x.id === el.dataset.timer);
    if (!s) return;
    const t = sampleTime(s);
    el.className = 'timer ' + t.cls;
    el.lastChild.textContent = ' ' + t.txt;
  });
  $$('[data-clock]').forEach(el => {
    const s = S.samples.find(x => x.id === el.dataset.clock);
    if (!s) return;
    const t = sampleTime(s);
    el.innerHTML = t.ms > 0 ? `${t.d}<small> días </small>${t.h}<small> h</small>` : '<span style="color:var(--danger)">Vencida</span>';
  });
}

// ============================================================
// Inicio
// ============================================================
function renderLogin(errMsg = '') {
  $('#app').innerHTML = `<div class="login"><form class="box" id="login">
    <span class="logo">K8</span>
    <h1>Reposiciones y estados</h1>
    <p>Ingresa con tu usuario de K8 Chile.</p>
    <div class="field"><label>Correo</label><input class="input" type="email" id="l-email" autocomplete="username" required></div>
    <div class="field"><label>Contraseña</label><input class="input" type="password" id="l-pass" autocomplete="current-password" required></div>
    ${errMsg ? `<div class="callout warn" style="margin-bottom:12px">${esc(errMsg)}</div>` : ''}
    <button class="btn primary" style="width:100%;justify-content:center">Entrar</button>
  </form></div>`;
  $('#login').onsubmit = async e => {
    e.preventDefault();
    const { error } = await CloudStore.sb.auth.signInWithPassword({ email: $('#l-email').value, password: $('#l-pass').value });
    if (error) return renderLogin('No se pudo ingresar: ' + error.message);
    boot();
  };
}

// Primera vez: carga los productos de seed.js para que el Gantt no parta vacío.
async function loadSeed() {
  const at = nowIso();
  const prods = window.K8_SEED.map(i => ({ id: uid(), ...i, responsables: {}, created_at: at, updated_at: at }));
  const evs = prods.map(p => ({ id: uid(), product_id: p.id, stage: p.stage, at, by: me(), note: 'Carga inicial del mix' }));
  await save('products', prods);
  await save('events', evs);
}

let realtimeOn = false;
function subscribeRealtime() {
  if (realtimeOn || Store.mode !== 'cloud') return;
  realtimeOn = true;
  let tm;
  CloudStore.sb.channel('k8-repos')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      clearTimeout(tm);
      tm = setTimeout(async () => {
        if ($('#modal-root').innerHTML) return; // no interrumpir un formulario abierto
        await loadAll(); render();
      }, 600);
    })
    .subscribe();
}

// Resumen en Markdown de todos los datos del programa (para compartir o guardar). Solo lee: no cambia nada.
function buildSummaryMd() {
  const md = [];
  const n = v => fmtInt(Math.round(v || 0));
  const cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim() || '—';
  const table = (head, rows) => rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`), ''] : ['_Sin datos._', ''];
  const today = new Date();
  md.push(`# K8 Chile · Reposiciones y estados`, '', `Resumen generado el ${fmtDay(today)} desde el programa (${Store.mode === 'cloud' ? 'nube' : 'modo local, datos de este navegador'}).`, '');

  // Alertas
  const prs = S.products.map(p => ({ p, pr: projection(p) }));
  const withRate = prs.filter(x => x.pr && x.pr.rate);
  const rep = latestReport();
  const dead = rep ? rep.rows.filter(r => r.units === 0 && r.stock > 0) : [];
  md.push('## Alertas', '');
  const al = [];
  withRate.filter(x => x.pr.level === 'now').forEach(x => al.push(`- **Pedir ya:** ${x.p.name} — sugerido ${n(x.pr.suggested)} u.`));
  withRate.filter(x => x.pr.level === 'gap').forEach(x => al.push(`- **Quiebre de stock:** ${x.p.name} — sin stock desde el ${fmtDay(x.pr.gap.from)} hasta el ${fmtDay(x.pr.gap.to)}.`));
  withRate.filter(x => x.pr.stockNow / x.pr.rate > SLOW_DAYS).forEach(x => { const m = Math.round(x.pr.stockNow / x.pr.rate / 30); al.push(`- **Venta muy lenta:** ${x.p.name} — stock para ~${m < 24 ? m + " meses" : Math.round(m / 12) + " años"}.`); });
  if (dead.length) al.push(`- **Inmovilizado:** ${dead.length} códigos con stock y sin venta · ${n(dead.reduce((a, r) => a + r.stock, 0))} u. · $ ${n(dead.reduce((a, r) => a + r.stock * (r.price || 0), 0))} a precio lista.`);
  S.orders.filter(o => o.shared_review).forEach(o => al.push(`- **Revisar pedido compartido:** ${o.title} (${fmtDay(o.date)}), cantidades editadas a mano.`));
  md.push(...(al.length ? al : ['_Sin alertas._']), '');

  // Configuración
  const lead = { ...DEFAULT_LEAD, ...getSetting('lead_times', {}) };
  md.push('## Configuración', '');
  md.push(...table(['Etapa', 'Responsables'], STAGES.filter(s => s.n !== DISC).map(s => [`${s.n} · ${s.name}`, stageResp(s.n).join(', ')])));
  md.push(`- Llegada estimada: primer pedido ${lead.pedido} días · reposición ${lead.reposicion} días`,
    `- Sugerido: cubre ${coverDays()} días de venta desde que llega · mínimo de fábrica ${n(getSetting('min_qty', DEFAULT_MIN_QTY))} u. por pedido · mínimo ${n(sizeMinQty())} u. por talla · cantidades de ${QTY_STEP} en ${QTY_STEP}`, '');

  // Productos
  md.push(`## Productos del mix (${S.products.length})`, '');
  md.push(...table(['Etapa', 'Productos'], STAGES.map(s => [`${s.n} · ${s.name}`, String(S.products.filter(p => p.stage === s.n).length)])));
  const lines = [...new Set(S.products.map(p => p.line))].sort((a, b) => lineOrder(a) - lineOrder(b));
  for (const l of lines) {
    md.push(`### ${l || 'Sin línea'}`, '');
    md.push(...table(['Producto', 'Código', 'Etapa', 'Desde', 'Repos', 'Próxima llegada'], S.products.filter(p => p.line === l).map(p => {
      const ev = eventsOf(p).filter(e => e.stage === p.stage).pop();
      const eta = productEta(p);
      return [p.name, p.code, stage(p.stage).name, ev ? fmtDay(ev.at) : '', repoCount(p) ? `Repo ${repoCount(p)}` : '', eta ? fmtDay(eta.date) + (eta.chi ? ' (CHI)' : '') : ''];
    })));
  }

  // Muestras
  const active = S.samples.filter(s => s.status === 'en_curso');
  md.push(`## Muestras en curso (${active.length})`, '');
  md.push(...table(['Producto', 'Ronda', 'Inició', 'Vence', 'Responsable'], active.map(s => [(productById(s.product_id) || {}).name, s.round, fmtDay(s.started_at), fmtDay(s.due_at), s.responsable])));

  // Pedidos
  const os = [...S.orders].sort((a, b) => orderSort(b, a));
  md.push(`## Pedidos y reposiciones (${os.length} · ${n(os.reduce((a, o) => a + o.total, 0))} u. de K8)`, '');
  md.push(...table(['Fecha', 'Tipo', 'Documento', 'Productos', 'Unidades K8', 'Compartido', 'Estado', 'Llegada CHI / estimada', 'Llegada real', 'En sala'], os.map(o => [
    fmtDay(o.date), orderLabel(o).text, o.title, (o.product_ids || []).map(id => (productById(id) || {}).name).join(', '), n(o.total),
    o.shared ? `de ${n(o.total_all)}: ${o.shared.map(s => `${s.name} ${n(s.total)}`).join(', ')}` : '', o.status,
    o.eta_chi ? fmtDay(o.eta_chi) + ' (CHI)' : o.eta ? fmtDay(o.eta) : '', o.arrived_at ? fmtDay(o.arrived_at) : '', o.sale_at ? fmtDay(o.sale_at) : ''])));

  // Ventas reales
  md.push('## Ventas reales', '');
  if (!rep) md.push('_Aún no se ha subido un informe de ventas._', '');
  else {
    md.push(`Informe ${rep.start ? `${fmtDay(rep.start)} → ` : 'al '}${fmtDay(rep.date)} · ${S.salesreports.length} informe(s) guardado(s).`, '',
      `- Unidades vendidas: ${n(rep.rows.reduce((a, r) => a + r.units, 0))}`,
      `- Venta neta: $ ${n(rep.rows.reduce((a, r) => a + r.net, 0))}`,
      `- Stock total: ${n(rep.rows.reduce((a, r) => a + Math.max(0, r.stock), 0))}`, '');
    const sp = S.products.map(p => ({ p, sr: salesFromReport(p) })).filter(x => x.sr && x.sr.rep.id === rep.id).map(x => ({ ...x, pr: projection(x.p) })).sort((a, b) => b.sr.net - a.sr.net);
    md.push(...table(['Producto', 'Vendidas', 'Venta neta', 'Ritmo (u/mes)', 'Stock', 'Alcanza', 'Pedir antes de', 'Sugerido'], sp.map(({ p, sr, pr }) => {
      const rate = pr && pr.rate ? pr.rate : sr.overall;
      return [p.name, n(sr.units), '$ ' + n(sr.net), rate ? n(perMonth(rate)) : '', n(sr.stock), rate ? `${Math.round(sr.stock / rate)} d` : '', pr && pr.reorderBy ? fmtDay(pr.reorderBy) : '', pr && pr.suggested != null ? n(pr.suggested) : ''];
    })));
    if (dead.length) {
      md.push('### Inmovilizado', '');
      md.push(...table(['Código', 'Descripción', 'Stock', 'Valor a precio lista'], [...dead].sort((a, b) => b.stock * b.price - a.stock * a.price).map(r => [r.code, r.desc, n(r.stock), '$ ' + n(r.stock * r.price)])));
    }
  }

  // Qué pedir
  const sug = withRate.filter(x => x.pr.suggested > 0).sort((a, b) => a.pr.reorderBy - b.pr.reorderBy);
  md.push(`## Qué pedir (${n(sug.reduce((a, x) => a + x.pr.suggested, 0))} u. en ${sug.length} productos)`, '');
  if (!sug.length) md.push('_Ningún producto necesita reposición por ahora._', '');
  for (const { p, pr } of sug) {
    const inc = (pr.incList && pr.incList.length ? pr.incList : pr.incomingOrders || []).reduce((a, o) => a + (o.total || 0), 0);
    md.push(`### ${p.name} — ${n(pr.suggested)} u.`, '', `Pedir ${pr.daysToReorder <= 0 ? '**ya**' : `antes del ${fmtDay(pr.reorderBy)}`} · cubre ${coverDays()} días desde que llega${inc ? ` · ya vienen ${n(inc)} u. en camino` : ''}${pr.minInfo && pr.minInfo.raised ? ` · subido al mínimo de fábrica (por venta bastaban ${n(pr.minInfo.calc)})` : ''}.`, '');
    const colors = [...new Set(pr.split.map(l => l.color))], sizes = sortSizes([...new Set(pr.split.map(l => l.size))]);
    const q = (c, s) => pr.split.filter(l => l.color === c && l.size === s).reduce((a, l) => a + l.qty, 0);
    if (pr.split.length) md.push(...table(['Color', ...sizes, 'Total'], [...colors.map(c => [c, ...sizes.map(s => q(c, s) ? n(q(c, s)) : '—'), n(sizes.reduce((a, s) => a + q(c, s), 0))]), ['**Total**', ...sizes.map(s => n(colors.reduce((a, c) => a + q(c, s), 0))), `**${n(pr.suggested)}**`]]));
  }

  // Importaciones clientes
  md.push(`## Importaciones clientes (${S.projects.length})`, '');
  for (const pr of S.projects) {
    const items = projItems(pr);
    md.push(`### ${pr.client || 'Sin cliente'} · ${items.map(i => i.name).join(', ')}`, '');
    md.push(...table(['Producto', 'Código', 'Unidades', 'Etapa'], items.map(i => [i.name, i.code, n(i.units), stage(i.stage ?? pr.stage).name])));
    const fechas = [['Idea', pr.idea_date], ['Contrato', pr.contract_date], ['Pedido', pr.order_date], ['CHI', pr.eta_chi], ['Bodega', pr.arrived_at], ['Entrega', pr.delivered_at]].filter(f => f[1]);
    if (fechas.length) md.push(fechas.map(([k, v]) => `${k}: ${fmtDay(v)}`).join(' · '), '');
    if (pr.notes) md.push(`> ${cell(pr.notes)}`, '');
  }

  // Investigación
  const groups = researchGroups();
  md.push(`## Investigación (${S.research.length} documentos o notas)`, '');
  for (const g of groups) {
    md.push(`### ${g.c.name} (${g.items.length} comentario${g.items.length === 1 ? '' : 's'})`, '');
    for (const { cm, d } of g.items) md.push(`- ${cm.client || d.client ? `**${cm.client || d.client}:** ` : ''}${cell(cm.text)}${cm.tags && cm.tags.length ? ` _(${cm.tags.join(', ')})_` : ''} — ${d.title || 'nota'}, ${fmtDay(d.date)}`);
    md.push('');
  }
  return md.join('\n');
}
function downloadSummaryMd() { downloadText(`K8_resumen_${isoDay(new Date())}.md`, buildSummaryMd(), 'text/markdown'); }

// Pedidos subidos antes de leer la columna K8: se vuelve a leer su Excel guardado (una vez por pedido).
// Si el pedido aún tiene el total de todas las empresas, queda solo lo de K8 y lo demás se anota aparte.
// Si se editó a mano, no se toca: se marca para revisar en el detalle del envío.
async function fixSharedOrders() {
  const done = new Set(getSetting('shared_scan', []));
  const todo = S.orders.filter(o => o.file_id && !done.has(o.id));
  if (!todo.length) return 0;
  let fixed = 0;
  for (const o of todo) {
    const f = fileById(o.file_id);
    try {
      const blob = f && await Store.getFile(f.path);
      const wb = blob ? readWorkbook(await blob.arrayBuffer()) : null;
      const rep = wb && !isMixWorkbook(wb) ? parseReposicion(wb) : null;
      if (rep && rep.shared.length) {
        if (o.total === rep.total_all) { o.lines = rep.lines; o.total = rep.total; }
        if (o.total === rep.total) { setShared(o, rep.shared); o.shared_review = null; fixed++; }
        else o.shared_review = true;
        await save('orders', o);
      }
    } catch (e) { console.warn('No se pudo revisar el Excel de', o.title, e); continue; } // se reintenta la próxima vez
    done.add(o.id);
  }
  await setSetting('shared_scan', [...done]);
  return fixed;
}

async function boot() {
  try {
    const authed = await Store.init();
    if (Store.mode === 'cloud' && !authed) return renderLogin();
    await loadAll();
    await migrate();
    await cargarVentasPbi();   // informe automático de ventas desde el Power BI (Análisis)
    // Proyectos de importación creados con un solo producto: se pasan a la lista de productos.
    // Y el contrato único pasa a la lista de documentos.
    const legacy = S.projects.filter(p => !Array.isArray(p.items) || !Array.isArray(p.docs));
    for (const p of legacy) { projItems(p); projDocs(p); await saveProject(p); }    if (!S.products.length && Array.isArray(window.K8_SEED) && window.K8_SEED.length) await loadSeed();
    BOOTED = true;
    render();
    if (!LECTOR) fixSharedOrders().then(n => { if (n) { toast(`${n} pedido${n > 1 ? 's' : ''} compartido${n > 1 ? 's' : ''}: ahora cuenta solo lo de K8`); render(); } })
      .catch(e => console.warn(e));
    subscribeRealtime();
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="empty"><h2>No se pudo conectar</h2><p>${esc(e.message || e)}</p><p>Revisa la configuración en <b>config.js</b> y que hayas ejecutado <b>supabase.sql</b>.</p></div>`;
  }
}

document.addEventListener('mousedown', e => { if (!e.target.closest('.ctx')) closeCtx(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#ctx-root').innerHTML) closeCtx();
  else if ($('#modal-root').innerHTML) closeModal();
  else if (UI.drawer) closeDrawer();
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  if (e.target.closest('.drop')) return;
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f, UI.drawer || undefined);
});
setInterval(tickTimers, 30000);

window.K8 = { pbiInforme: () => PBI_REP, handleFile, parseMix, readWorkbook, state: S, projection, buildSummaryMd, ui: UI, render, pickFile, openConfig, setStage, productById, restoreBackup, applyBackup }; // ui/render/pickFile/openConfig/setStage/productById/restoreBackup: los usa panel-bridge.js (Panel K8)
boot();
})();
