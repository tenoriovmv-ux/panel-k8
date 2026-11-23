// ============================================================
// Informes › Ventas y campañas: cruza lo invertido en Meta y Google con lo que
// venden las personas que atienden cada tipo de campaña, por quincena o mes.
//   · Campañas de venta y clientes potenciales → WhatsApp → Zorangie (antes Gabriel)
//   · Campañas de tráfico / localización       → local Dardignac → Alberto y Catalina (antes Úrsula)
// Datos: data/manager.json (Excel "Vendedores de campaña" del Power BI, mientras no haya
// conexión directa), data/ads.json (Meta y Google por día), data/whatsapp.json y
// data/meta-publicos.json (a quién apunta cada campaña).
// El Excel se arma en el servidor con los mismos números (POST /api/informe/excel).
// ============================================================
'use strict';

const INF = { loading: false, per: null, ctab: 'nuevos', q: '', open: {}, marca: 'k8', B: { k8: { m: null, pub: null, ads: null, loaded: false }, tla: { m: null, pub: [], ads: null, loaded: false } } };
// Marca del informe (20-11, Vicente): K8 (local Dardignac) o TLA (Telas Casa Matriz + Showroom TLA). INF.m, INF.pub e INF.loaded
// apuntan a los datos de la marca elegida; así el resto del cálculo no cambia.
for (const k of ['m', 'pub', 'loaded']) Object.defineProperty(INF, k, { get: () => INF.B[INF.marca][k], set: v => { INF.B[INF.marca][k] = v; } });
const INF_C = 'var(--app-informes, #A78BFA)';
const INF_VEND_K8 = {
  AJA: { n: 'Alberto Acosta', canal: 'local', c: '#22E07A' },
  CTS: { n: 'Catalina Suárez', canal: 'local', c: '#00C2FF', desde: '2026-10-01' },
  UGZ: { n: 'Úrsula González', canal: 'local', c: '#99B6C1', hasta: '2026-09-30' },
  GML: { n: 'Gabriel Martínez', canal: 'whatsapp', c: '#FFB547', hasta: '2026-11-11' },
  ZRM: { n: 'Zorangie Ramos', canal: 'whatsapp', c: '#25D366', desde: '2026-11-12' },
};
let INF_VEND = INF_VEND_K8;
const INF_ZOR_DESDE = '2026-11-12';
const INF_MARCAS = {
  k8: { n: 'K8', nombre: 'K8 Chile', logo: 'assets/marca-k8.png', sucs: ['LOCAL DARDIGNAC K8'], alcance: 'Solo local Dardignac', archivo: 'manager.json' },
  tla: { n: 'TLA', nombre: 'Textil Las Américas', logo: 'assets/marca-tla.png', sucs: ['TELAS CASA MATRIZ', 'SHOWROOM TLA'], alcance: 'Krishna, Moira, Gabriel y web · Casa Matriz y Showroom', archivo: 'manager-tla.json' },
};
const INF_PALETA = ['#22E07A', '#00C2FF', '#FFB547', '#A78BFA', '#FF6B9A', '#25D366', '#4C8DFF', '#FF7A1A', '#2DD4BF', '#F472B6', '#FACC15', '#99B6C1', '#60A5FA', '#C084FC', '#FB923C', '#94A3B8'];
const infAds = () => INF.B[INF.marca].ads || (INF.marca === 'k8' ? (typeof ADS !== 'undefined' ? ADS.data : null) : null);
const infWa = () => INF.marca === 'k8' && typeof WA !== 'undefined' ? WA.data : null;
const infAlcance = () => INF_MARCAS[INF.marca].alcance;
// Vendedores de TLA (Vicente, 20-11): solo Krishna, Moira y Gabriel, en Telas Casa Matriz y Showroom TLA
const INF_VEND_TLA = {
  KCS: { n: 'Krishna Catalán', canal: 'local', c: '#00C2FF' },
  MCS: { n: 'Moira Celis', canal: 'local', c: '#FF6B9A', hasta: '2026-11-16' },   // dejó de trabajar el lunes 16-11-2026 (su última venta)
  GML: { n: 'Gabriel Martínez', canal: 'local', c: '#FFB547' },
  VWB: { n: 'Ventas web', canal: 'web', c: '#2DD4BF' },   // lo que Manager factura como venta de la tienda web (textillasamericas.cl)
};
function infVendTla(M) { return INF_VEND_TLA; }// Cambia la marca del informe: datos, vendedores, sucursales y cachés
function infUsarMarca(mk) {
  if (!INF_MARCAS[mk]) mk = 'k8';
  if (INF.marca !== mk) { INF.marca = mk; INF._acum = null; INF._coh = null; INF._coh2 = null; INF._mp = null; INF.last = null; INF.cliSel = null; }
  INF_SUCS = INF_MARCAS[mk].sucs;
  INF_VEND = mk === 'tla' ? (INF.B.tla.vend || {}) : INF_VEND_K8;
}
// Vicente: los informes van solo desde septiembre 2026 (cuando partieron las campañas)
const INF_DESDE = '2026-09-01';
const INF_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const INF_MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const infDay = s => { const d = parseDay(s); return d ? `${d.getDate()} ${INF_MES[d.getMonth()]}` : '—'; };
const infIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const infMill = n => { n = Number(n || 0); const a = Math.abs(n); return a >= 1e6 ? '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M' : a >= 1e3 ? '$' + Math.round(n / 1e3).toLocaleString('es-CL') + ' mil' : fmtMoney(n); };
const infTel = s => { const x = String(s || '').replace(/\D/g, ''); return x.length >= 8 ? x.slice(-8) : ''; };
const INF_TEL_GENERICOS = ['98002541'];
const infP75 = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))]; };
const infMedian = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ---------- Rubro de un cliente (por nombre, comentario o ficha) ----------
const INF_RUBROS = [
  ['Minería', /MINER|MINING|\bMINA\b/],
  ['Construcción e instaladores', /CONSTRU|INSTALA|MONTAJ|\bOBRAS?\b|INGENIER|ELECTRIC|SOLDAD|CLIMATIZ|GASFIT|PINTUR|ESTRUCTUR|METALMEC|METALIC|SANITAR|EXCAVA|TERMINACIONES|INMOBIL|ARQUITEC|PAISAJ|CORTINAS|VIDRI|ALUMIN|TECHO|REPARA/],
  ['Agro, pesca y forestal', /AGRIC|AGRO|FRUT|VINEDO|PESQ|ACUIC|FORESTAL|RIEGO|SALMON|LECHER|GANAD/],
  ['Transporte y logística', /TRANSP|TRAMSP|LOGIST|CARGA|FLETE|COURIER|BUSES|CAMION/],
  ['Seguridad', /SEGURIDAD|GUARDI|VIGILAN|TACTIC|BOMBER/],
  ['Salud', /CLINIC|SALUD|MEDIC|DENTAL|LABORAT|FARMAC|HOSPITAL|ENFERM/],
  ['Educación', /COLEGIO|EDUCA|ESCUELA|JARDIN INF|UNIVERS|LICEO/],
  ['Gastronomía y alimentos', /\bCAFE|CAFETER|RESTAUR|COCINA|ALIMENT|PANAD|BANQUET|CATERING|SUSHI|PIZZ/],
  ['Talleres y mecánica', /MECANIC|AUTOMOT|TALLER|REPARAUTO|NEUMAT|VEHIC|MOTOR/],
  ['Industria y fábricas', /MUEBLE|EMBALAJ|FABRIC|INDUSTR|PLASTIC|MADERER|ASERRAD|IMPRENT/],
  ['Confección, bordado y publicidad', /CONFEC|BORDAD|TEXTIL|PUBLICI|GRAFIC|ESTAMP|PRINT|UNIFORM|SERIGRAF|SUBLIM|COUTURE|FASHION|DISENO|MODA|VESTUARIO|LANYARD|SASTRE/],
  ['Eventos y producción', /PRODUCCIONES|EVENTOS/],
  ['Aseo, servicios y mantención', /ASEO|LIMPIEZA|MANTEN|SERVICIOS|TRANSITORI|OUTSOURC/],
  ['Comercio y tiendas', /COMERCIAL|COMERCIALIZ|TIENDA|DISTRIBUI|IMPORT|EXPORT|ALMACEN|FERRETER|BAZAR|MARKET|NEGOCIO|SHOP|STORE/],
];
const INF_SEG = { 'Instalador': 'Construcción e instaladores', 'Empresas de ingenieria': 'Construcción e instaladores', 'Decoradores': 'Construcción e instaladores', 'Confeccionista': 'Confección, bordado y publicidad', 'Publicidad y grafica': 'Confección, bordado y publicidad', 'Comercio': 'Comercio y tiendas', 'Centro Educacional': 'Educación', 'Persona Natural': 'Persona natural' };
// Qué rubros cubre cada interés de Meta (para comparar lo buscado con lo que llega)
const INF_INTERES = [[/tapic/i, 'Tapicería'], [/mueble/i, 'Fábrica de muebles'], [/decora|interior/i, 'Decoradores'], [/cortin/i, 'Cortinajes'], [/costur|confec/i, 'Confeccionista'], [/constru/i, 'Construcción e instaladores'], [/miner/i, 'Minería'], [/agric|pesca|forest/i, 'Agro, pesca y forestal'], [/transport|logist/i, 'Transporte y logística'], [/segur/i, 'Seguridad'], [/salud|medic/i, 'Salud'], [/educa/i, 'Educación'], [/gastron|restaur|aliment/i, 'Gastronomía y alimentos'], [/textil|moda|confec|publicid/i, 'Confección, bordado y publicidad'], [/comercio|tienda|retail|minorist/i, 'Comercio y tiendas'], [/industr|manufact|fábric/i, 'Industria y fábricas']];
// TLA (Vicente, 23-11): sus clientes son de telas y ya traen el rubro en la ficha de Manager (segmento): Tapicería, Fábrica de muebles,
// Confeccionista, Cortinajes, Decoradores... Se usa ese; los rubros por nombre (minería, construcción...) son los de K8 (ropa de trabajo).
const INF_SEG_TLA = { 'Fabrica de muebles': 'Fábrica de muebles', 'Tapicería automotriz': 'Tapicería automotriz', 'Persona Natural': 'Persona natural', 'Otros Giros': 'Otros giros', 'Hoteleria, gastronomia y eventos': 'Hotelería, gastronomía y eventos', 'Publicidad y grafica': 'Publicidad y gráfica' };
function infRubro(c) {
  if (INF.marca === 'tla') { const s = String(c.seg || '').trim(); if (s) return INF_SEG_TLA[s] || s; }
  const txt = String(`${c.cli || ''} ${c.comentario || ''}`).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [n, re] of INF_RUBROS) if (re.test(txt)) return n;
  if (INF_SEG[c.seg]) return INF_SEG[c.seg];
  if (!/\b(SPA|LTDA|LIMITADA|EIRL|E\.I\.R\.L|S\.A|SA|CIA|COMPANIA|COOPERATIVA|COMUNIDAD|GRUPO|EDIFICIO|CONDOMINIO|CORPORACION|FUNDACION|ASOCIACION|SOCIEDAD|INVERSIONES)\b/.test(txt)) return 'Persona natural';
  return 'Otra empresa (rubro no claro)';
}

// ---------- Carga de datos ----------
// Vicente: todo lo de K8 es SOLO lo que sale del local Dardignac (también lo de Zorangie y Gabriel por WhatsApp).
// Se filtran aquí las ventas y cotizaciones; la historia de compra del cliente (para saber si es nuevo en TLA) sigue siendo de todo TLA.
// Captado = su primera compra en TLA fue en el local; si fue en otra sucursal, el cliente igual es "nuevo" pero no lo captó nadie del local.
let INF_SUCS = ['LOCAL DARDIGNAC K8']; const INF_SUC = 'LOCAL DARDIGNAC K8'; const infEnSuc = s => INF_SUCS.includes(s);
function infSoloLocal(M) {
  M.lineasFuera = M.lineas.filter(l => !infEnSuc(l.suc) && l.f >= INF_DESDE && INF_VEND[l.vend]).reduce((t, l) => t + l.neto, 0);
  M.lineas = M.lineas.filter(l => infEnSuc(l.suc));
  M.cotizaciones = M.cotizaciones.filter(q => !q.suc || infEnSuc(q.suc));
  const diaLocal = new Set(M.lineas.map(l => l.rut + '|' + l.f));
  for (const c of M.clientes) if (c.capto && c.primera_tla && !diaLocal.has(c.rut + '|' + c.primera_tla)) { c.captoFuera = c.capto; c.capto = ''; }
}
async function loadInformes(force = false) {
  if (INF.loaded && !force) return;
  if (INF.loading) return INF._carga;
  let fin; INF._carga = new Promise(r => { fin = r; });
  INF.loading = true; const mkCarga = INF.marca;
  try {
    const mk = mkCarga, get = f => fetch('data/' + f + '?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
    const [m, p, ads, tienda] = await Promise.all([get(INF_MARCAS[mk].archivo), mk === 'k8' ? get('meta-publicos.json') : null, mk === 'tla' ? get('ads-tla.json') : null, mk === 'tla' ? get('tienda-tla.json') : null]);
    const B = INF.B[mk]; B.m = m; B.pub = asList(p); if (mk === 'tla') { B.ads = ads; B.tienda = tienda; }
    if (m) { m.lineas = asList(m.lineas); m.clientes = asList(m.clientes); m.cotizaciones = asList(m.cotizaciones); if (mk === 'tla') B.vend = infVendTla(m); const ant = INF.marca; INF.marca = mk; infUsarMarca(mk); infSoloLocal(m); INF.marca = ant; infUsarMarca(ant); }
    if (mk === 'k8' && !ADS.data && typeof loadAds === 'function') await loadAds();
    if (mk === 'k8' && !(typeof WA !== 'undefined' && WA.data) && typeof loadWa === 'function') await loadWa();
  } finally { INF.loading = false; INF.B[mkCarga].loaded = true; fin(); }
}

// ---------- Períodos: quincenas (1–15 y 16–fin) y meses ----------
function infPeriodos() {
  const hoy = todayIso(); const desde = INF_DESDE;
  const out = []; let d = parseDay(desde);
  while (infIso(d) <= hoy) {
    const y = d.getFullYear(), mo = d.getMonth(); const fin = new Date(y, mo + 1, 0);
    const q1 = [infIso(new Date(y, mo, 1)), infIso(new Date(y, mo, 15))], q2 = [infIso(new Date(y, mo, 16)), infIso(fin)];
    const nm = `${INF_MESL[mo]} ${y}`;
    out.push({ id: `${y}-${pad(mo + 1)}`, tipo: 'mes', a: q1[0], b: q2[1], label: nm.charAt(0).toUpperCase() + nm.slice(1) + ' (mes completo)' });
    out.push({ id: `${y}-${pad(mo + 1)}-q1`, tipo: 'quincena', a: q1[0], b: q1[1], label: `1 al 15 de ${nm}` });
    if (q2[0] <= hoy) out.push({ id: `${y}-${pad(mo + 1)}-q2`, tipo: 'quincena', a: q2[0], b: q2[1], label: `16 al ${fin.getDate()} de ${nm}` });
    d = new Date(y, mo + 1, 1);
  }
  out.reverse();
  // Acumulado: todo desde septiembre hasta hoy (lo que pidió Vicente: ver la suma de todo, no por meses)
  out.unshift({ id: 'acumulado', tipo: 'acumulado', a: INF_DESDE, b: hoy, label: 'Todo desde septiembre (acumulado)' });
  return out;
}

// ---------- Tipo de campaña y a quién llega ----------
function infTipoCampana(c) {
  if (c.platform === 'google') return 'google';
  if (/showroom|local|sucursal|dardignac|visita/i.test(c.name || '')) return 'local';
  if (c.type === 'ventas' || c.type === 'leads') return 'whatsapp';
  if (c.type === 'trafico' && c.goal !== 'LANDING_PAGE_VIEWS') return 'local';
  return 'otras';
}
const INF_TIPO = {
  whatsapp: { n: 'Venta y clientes potenciales', a: 'WhatsApp · Zorangie (antes Gabriel)', c: '#25D366' },
  local: { n: 'Tráfico al local', a: 'Local · Alberto y Catalina (antes Úrsula)', c: '#00C2FF' },
  google: { n: 'Google búsqueda', a: 'Web y WhatsApp', c: '#FFC21A' },
  otras: { n: 'Otras (alcance, web, interacción)', a: 'Sin vendedor fijo', c: '#99B6C1' },
};

// ---------- Cálculo del informe de un período ----------
// (23-11) El informe completo se calcula una vez por período y se guarda: redibujar la página ya no lo recalcula
// (antes tardaba ~240 ms en cada dibujo y la app «se quedaba pegada» al cambiar de sección o de período).
function infCalcular(per) {
  const ads = infAds(), wa = infWa();
  const key = [INF.marca, per.id, per.a, per.b, INF.m && INF.m.cargado, ads && ads.updated_at, wa && wa.captured_at, (INF.pub || []).length].join('|');
  INF._calc = INF._calc || new Map();
  if (INF._calc.has(key)) return INF._calc.get(key);
  const R = infCalcular0(per);
  if (INF._calc.size > 60) INF._calc.clear();
  INF._calc.set(key, R); return R;
}
function infCalcular0(per) {
  const M = INF.m; const [a, b] = [per.a, per.b];
  const enP = f => f && f >= a && f <= b;
  const hoy = todayIso(); const dataHasta = M ? M.hasta : null;
  const R = { per, a, b, dataHasta, mgr: !!M, ok: true };

  // --- Campañas: gasto y resultados por día dentro del período
  const camps = asList(infAds() && infAds().campaigns).map(c => {
    const d = asList(c.daily).filter(x => x && x.date && enP(x.date));
    const s = k => d.reduce((t, x) => t + Number(x[k] || 0), 0);
    const tipo = infTipoCampana(c);
    const pub = (INF.pub || []).find(p => p.campana === c.name);
    return { name: c.name, platform: c.platform, tipo, gasto: s('spent'), conv: s('messages'), leads: c.platform === 'google' ? 0 : s('leads'), clics: s('link_clicks'), impr: s('impressions'), dias: d.length, desde: d.length ? d[0].date : '', hasta: d.length ? d[d.length - 1].date : '', pub, state: c.state, result_label: c.result_label };
  }).filter(c => c.gasto > 0).sort((x, y) => y.gasto - x.gasto);
  R.camps = camps;
  R.gasto = { total: camps.reduce((t, c) => t + c.gasto, 0) }; for (const k of Object.keys(INF_TIPO)) R.gasto[k] = camps.filter(c => c.tipo === k).reduce((t, c) => t + c.gasto, 0);
  R.conv = camps.filter(c => c.tipo === 'whatsapp').reduce((t, c) => t + c.conv, 0);
  R.clicsLocal = camps.filter(c => c.tipo === 'local').reduce((t, c) => t + c.clics, 0);
  R.googleConv = camps.filter(c => c.tipo === 'google').reduce((t, c) => t + c.conv, 0);

  // --- WhatsApp (la app): chats que escribieron y chats nuevos
  const chats = (infWa() ? asList(infWa().chats) : []).filter(c => !c.group && !(typeof waInterno === 'function' && waInterno(c)));
  const waTel = {}; for (const c of chats) { const t = infTel(c.phone); if (t && !INF_TEL_GENERICOS.includes(t)) waTel[t] = c; }
  const primerMsg = c => c.hist_from ? infIso(new Date(c.hist_from * 1000)) : '';
  const ultimoMsg = c => c.t ? infIso(new Date(c.t * 1000)) : '';
  R.waEscribieron = chats.filter(c => Object.entries(c.days || {}).some(([d, v]) => enP(d) && Number(v.in || 0) > 0)).length;
  R.waNuevos = chats.filter(c => enP(primerMsg(c))).length;
  R.waConEtiquetaVenta = chats.filter(c => (c.labels || []).some(l => /gesti[oó]n|compr|vend|pagad/i.test(l)) && enP(ultimoMsg(c))).length;

  if (!M) { R.ok = false; return R; }
  // --- Clientes y líneas de venta
  const cliPorRut = {}; for (const c of M.clientes) cliPorRut[c.rut] = c;
  const lineas = M.lineas.filter(l => enP(l.f));
  const linRut = {}; for (const l of lineas) (linRut[l.rut] || (linRut[l.rut] = [])).push(l);
  // (23-11) quién le vendió por ÚLTIMA vez a cada cliente (Vicente: si le vendieron varios, saber quién fue el último)
  const ultV = {}; for (const l of M.lineas) { if (!l.rut || l.doc === 'NCV' || !INF_VEND[l.vend] || l.f > b) continue; const u = ultV[l.rut]; if (!u || l.f > u.f || (l.f === u.f && l.neto > u.neto)) ultV[l.rut] = { f: l.f, cod: l.vend, neto: l.neto }; }   // (23-11) índice por cliente: antes se filtraban todas las líneas por cada cliente y el informe se congelaba
  const vendDe = l => l.vend;
  const esLocal = v => INF_VEND[v] && INF_VEND[v].canal === 'local';
  R.ventaTotal = lineas.filter(l => INF_VEND[l.vend]).reduce((t, l) => t + l.neto, 0);   // solo Alberto, Catalina, Úrsula, Gabriel y Zorangie (no la cartera mayorista que también factura en el local)
  // Tipo de cliente dentro del período
  const hace = (iso, d) => infIso(new Date(parseDay(iso).getTime() - d * 864e5));
  const tipoCli = rut => { const c = cliPorRut[rut]; if (!c) return 'anonimo'; const p = c.primera_tla; if (enP(p)) return 'nuevo'; if (p && p < a && p >= hace(a, 180)) return 'nuevo_volvio'; return 'cartera'; };
  const recuperado = rut => { const c = cliPorRut[rut]; const ds = asList(c && c.dias).filter(d => d < a); const ult = ds.length ? ds[ds.length - 1] : ''; return !!c && (ult ? ult < hace(a, 365) : !!(c.primera_tla && c.primera_tla < a)); };   // sin compras desde 2022 = recuperado
  // Por cliente
  const porRut = {};
  for (const l of M.lineas) { if (!l.rut || /CLIENTE CON BOLETA/i.test(l.cli) || l.doc === 'NCV') continue; const x = porRut[l.rut] || (porRut[l.rut] = { dias: new Set(), ultima: '', vend: {} }); x.dias.add(l.f); if (l.f > x.ultima) x.ultima = l.f; x.vend[l.vend] = (x.vend[l.vend] || 0) + l.neto; }
  const gapProm = rut => { const hc = cliPorRut[rut] && asList(cliPorRut[rut].dias); const ds = (hc && hc.length ? [...hc] : [...(porRut[rut] ? porRut[rut].dias : [])]).filter(d => d <= b).sort(); if (ds.length < 2) return null; let s = 0; for (let i = 1; i < ds.length; i++) s += daysBetween(ds[i - 1], ds[i]); return s / (ds.length - 1); };
  // Cadencia de recompra según los datos (mediana de días entre compras)
  const gapsN = [], gapsC = [];
  for (const rut of Object.keys(porRut)) { const g = gapProm(rut); if (g == null) continue; const c = cliPorRut[rut]; (c && c.primera_tla >= (M.desde || '')) ? gapsN.push(g) : gapsC.push(g); }
  R.cadencia = { nuevos: Math.max(15, Math.round(infMedian(gapsN) || 21)), cartera: Math.max(15, Math.round(infMedian(gapsC) || 30)), medNuevos: Math.round(infMedian(gapsN) || 0), medCartera: Math.round(infMedian(gapsC) || 0), nN: gapsN.length, nC: gapsC.length };

  // --- Por vendedor
  R.vend = Object.entries(INF_VEND).map(([cod, v]) => {
    const ls = lineas.filter(l => l.vend === cod);
    const nuevosCli = M.clientes.filter(c => c.capto === cod && enP(c.primera_tla));
    const ventaNuevos = ls.filter(l => enP((cliPorRut[l.rut] || {}).primera_tla)).reduce((t, l) => t + l.neto, 0);
    const cots = M.cotizaciones.filter(q => q.vend === cod && enP(q.f));
    const activo = (!v.desde || v.desde <= b) && (!v.hasta || v.hasta >= a);
    return { cod, ...v, activo, venta: ls.reduce((t, l) => t + l.neto, 0), ventaNuevos, nuevos: nuevosCli.length, docs: new Set(ls.filter(l => l.doc !== 'NCV').map(l => l.doc + l.folio)).size, boletasAnon: new Set(ls.filter(l => /CLIENTE CON BOLETA/i.test(l.cli)).map(l => l.folio)).size, cot: cots.length, cotMonto: cots.reduce((t, q) => t + q.monto, 0), cotGanadas: cots.filter(q => q.estado === 'Ganada').length, cotAbiertas: cots.filter(q => q.estado === 'Abierta').length, cotAbiertoMonto: cots.filter(q => q.estado === 'Abierta').reduce((t, q) => t + q.monto, 0), cotProspectos: cots.filter(q => q.tipo === 'Prospecto nuevo').length };
  }).filter(v => v.activo || v.venta > 0);
  const nuevosP = M.clientes.filter(c => enP(c.primera_tla) && INF_VEND[c.capto]);
  R.nuevos = nuevosP.length;
  R.nuevosLocal = nuevosP.filter(c => esLocal(c.capto)).length;
  const rutsNuevos = new Set(M.clientes.filter(c => enP(c.primera_tla)).map(c => c.rut));
  R.ventaNuevos = lineas.filter(l => rutsNuevos.has(l.rut) && INF_VEND[l.vend]).reduce((t, l) => t + l.neto, 0);
  R.ventaNuevosLocal = lineas.filter(l => rutsNuevos.has(l.rut) && esLocal((cliPorRut[l.rut] || {}).capto)).reduce((t, l) => t + l.neto, 0);
  // Nuevos que escribieron antes al WhatsApp (mismo teléfono, chat anterior a la primera compra)
  const chatDe = c => { const t = infTel(c.tel); return t && !INF_TEL_GENERICOS.includes(t) ? waTel[t] : null; };
  const nuevosWa = nuevosP.filter(c => { const ch = chatDe(c); return ch && (!primerMsg(ch) || primerMsg(ch) <= c.primera_tla); });
  R.nuevosWa = nuevosWa.length; R.ventaNuevosWa = lineas.filter(l => new Set(nuevosWa.map(c => c.rut)).has(l.rut)).reduce((t, l) => t + l.neto, 0);
  R.retorno = R.gasto.total ? R.ventaNuevos / R.gasto.total : null;
  R.costoNuevo = R.nuevos ? R.gasto.total / R.nuevos : null;
  // Cotizaciones del período
  const cots = M.cotizaciones.filter(q => enP(q.f) && INF_VEND[q.vend]);
  R.cot = { n: cots.length, monto: cots.reduce((t, q) => t + q.monto, 0), prosp: cots.filter(q => q.tipo === 'Prospecto nuevo').length, ganadas: cots.filter(q => q.estado === 'Ganada').length, abiertas: cots.filter(q => q.estado === 'Abierta').length, abiertoMonto: cots.filter(q => q.estado === 'Abierta').reduce((t, q) => t + q.monto, 0) };

  // --- Canales (lo que pide Vicente: cada tipo de campaña con su gente)
  const vLocal = R.vend.filter(v => v.canal === 'local'), vWa = R.vend.filter(v => v.canal === 'whatsapp');
  R.canal = {
    whatsapp: { gasto: R.gasto.whatsapp, conv: R.conv, chats: R.waEscribieron, chatsNuevos: R.waNuevos, venta: vWa.reduce((t, v) => t + v.venta, 0), ventaNuevos: vWa.reduce((t, v) => t + v.ventaNuevos, 0), nuevos: vWa.reduce((t, v) => t + v.nuevos, 0), nuevosWa: R.nuevosWa, zorangie: b >= INF_ZOR_DESDE, quien: (vWa.filter(v => v.venta || v.activo).map(v => v.n.split(' ')[0]).join(' y ') || 'Nadie') },
    local: { gasto: R.gasto.local, clics: R.clicsLocal, venta: vLocal.reduce((t, v) => t + v.venta, 0), ventaNuevos: vLocal.reduce((t, v) => t + v.ventaNuevos, 0), nuevos: vLocal.reduce((t, v) => t + v.nuevos, 0) },
  };

  // --- Productos (por modelo, sin talla)
  const modelo = p => String(p || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/^[UHM]\w{5,7}\s+/, '').trim();
  const prod = {}; for (const l of lineas) { if (l.doc === 'NCV' || !INF_VEND[l.vend]) continue; const k = modelo(l.prod); const x = prod[k] || (prod[k] = { n: k, grupo: l.grupo, un: l.un, q: 0, venta: 0, ventaNuevos: 0, clientes: new Set() }); x.q += l.q; x.venta += l.neto; if (rutsNuevos.has(l.rut)) x.ventaNuevos += l.neto; if (l.rut) x.clientes.add(l.rut); }
  R.productos = Object.values(prod).map(x => ({ ...x, clientes: x.clientes.size })).sort((x, y) => y.venta - x.venta);
  R.productosNuevos = [...R.productos].filter(x => x.ventaNuevos > 0).sort((x, y) => y.ventaNuevos - x.ventaNuevos);

  // --- Rubros: qué llega vs qué busca cada campaña
  const rub = {}; for (const c of nuevosP) { const r = infRubro(c); const x = rub[r] || (rub[r] = { n: r, nuevos: 0, venta: 0 }); x.nuevos++; x.venta += (linRut[c.rut] || []).reduce((t, l) => t + l.neto, 0); }
  R.rubros = Object.values(rub).sort((x, y) => y.nuevos - x.nuevos);
  R.rubroCamp = camps.filter(c => c.platform === 'meta').map(c => {
    const intereses = c.pub ? [c.pub.intereses, c.pub.sectores, c.pub.cargos].filter(Boolean).join(', ') : '';
    const busca = [...new Set(INF_INTERES.filter(([re]) => re.test(intereses)).map(([, r]) => r))];
    const porNombre = /contratist/i.test(c.name) ? ['Construcción e instaladores'] : /tienda/i.test(c.name) ? ['Comercio y tiendas', 'Confección, bordado y publicidad'] : [];
    const objetivo = busca.length ? busca : porNombre;
    const llegan = nuevosP.filter(n => (c.tipo === 'local' ? esLocal(n.capto) : true) && n.primera_tla >= c.desde && n.primera_tla <= (c.hasta ? infIso(new Date(parseDay(c.hasta).getTime() + 14 * 864e5)) : b));
    const rubLl = {}; for (const n of llegan) { const r = infRubro(n); rubLl[r] = (rubLl[r] || 0) + 1; }
    const top = Object.entries(rubLl).sort((x, y) => y[1] - x[1]);
    const cumplen = objetivo.length ? llegan.filter(n => objetivo.includes(infRubro(n))).length : null;
    return { name: c.name, tipo: c.tipo, gasto: c.gasto, abierto: !intereses, intereses, zonas: c.pub ? c.pub.zonas : '', objetivo, llegan: llegan.length, cumplen, top };
  });
  // --- Clientes del período (nuevos, nuevos que volvieron, cartera que volvió) con seguimiento
  const cotPorRut = {}; for (const q of M.cotizaciones) { if (!q.rut) continue; (cotPorRut[q.rut] || (cotPorRut[q.rut] = [])).push(q); }
  const refHoy = hoy;
  const ruts = [...new Set(lineas.filter(l => l.rut && !/CLIENTE CON BOLETA/i.test(l.cli) && INF_VEND[l.vend]).map(l => l.rut))];
  R.clientes = ruts.map(rut => {
    const c = cliPorRut[rut] || { rut, cli: ((linRut[rut] || [])[0] || {}).cli };
    const t = tipoCli(rut); const ls = linRut[rut] || [];
    const vend = Object.entries(ls.reduce((o, l) => (o[l.vend] = (o[l.vend] || 0) + l.neto, o), {})).sort((x, y) => y[1] - x[1]).map(([k]) => k);
    const qs = (cotPorRut[rut] || []); const qsP = qs.filter(q => enP(q.f));
    const ch = chatDe(c); const gap = gapProm(rut);
    const ultCompra = porRut[rut] ? porRut[rut].ultima : '';
    const ultCot = qs.map(q => q.f).sort().pop() || '';
    const ultWa = ch ? ultimoMsg(ch) : '';
    const ultContacto = [ultCompra, ultCot, ultWa].filter(Boolean).sort().pop() || '';
    // seguimiento: cada cuánto compra él (entre 7 y 90 días); si es recuperado o compró una vez, el plazo típico de su grupo
    const esRecup = t === 'cartera' && recuperado(rut);
    const cada = gap && !esRecup ? Math.min(90, Math.max(7, Math.round(gap))) : (t === 'cartera' ? R.cadencia.cartera : R.cadencia.nuevos);
    const prox = ultContacto ? infIso(new Date(parseDay(ultContacto).getTime() + cada * 864e5)) : '';
    const estado = !ultContacto ? 'Sin datos' : prox < refHoy ? 'Toca seguimiento' : 'Al día';
    return { rut, cli: c.cli, tipo: t, recup: t === 'cartera' && !!recuperado(rut), tipoTxt: { nuevo: 'Nuevo', nuevo_volvio: 'Nuevo que volvió a comprar', cartera: recuperado(rut) ? 'Cartera recuperada (+12 meses sin comprar)' : 'Cartera que volvió' }[t] || t, vend: vend.map(k => (INF_VEND[k] || {}).n || k).join(', '), vendCod: (ultV[rut] || {}).cod || vend[0] || '', ultVendCod: (ultV[rut] || {}).cod || '', ultVend: ultV[rut] ? ((INF_VEND[ultV[rut].cod] || {}).n || ultV[rut].cod) : '', ultVendF: (ultV[rut] || {}).f || '', nVend: vend.length, seg: c.seg || '', rubro: infRubro(c), comuna: c.comuna || '', primera: c.primera_tla || '', compras: Math.max(asList(c.dias).filter(d => d <= b).length, porRut[rut] ? porRut[rut].dias.size : 0), cada: gap ? Math.round(gap) : null, ultCompra, venta: ls.reduce((s, l) => s + l.neto, 0), cotMonto: qsP.reduce((s, q) => s + q.monto, 0), nvMonto: qsP.reduce((s, q) => s + q.monto_nv, 0), email: /sin@correo|notiene/i.test(c.email || '') ? '' : (c.email || ''), tel: c.tel || '', wa: ch ? ch.name : '', waDesde: ch ? primerMsg(ch) : '', ultContacto, seguirCada: cada, prox, estado };
  }).sort((x, y) => y.venta - x.venta);
  R.porTipo = { nuevo: R.clientes.filter(c => c.tipo === 'nuevo'), nuevo_volvio: R.clientes.filter(c => c.tipo === 'nuevo_volvio'), recuperado: R.clientes.filter(c => c.recup), cartera: R.clientes.filter(c => c.tipo === 'cartera' && !c.recup) };
  // Recuperados: clientes que volvieron a comprar después de más de 12 meses sin comprar en TLA (importante para Vicente)
  const rutsRec = new Set(R.porTipo.recuperado.map(c => c.rut));
  R.recup = { n: rutsRec.size, venta: lineas.filter(l => rutsRec.has(l.rut) && INF_VEND[l.vend]).reduce((s, l) => s + l.neto, 0) };
  for (const v of R.vend) { const ls = lineas.filter(l => l.vend === v.cod && rutsRec.has(l.rut)); v.recup = new Set(ls.map(l => l.rut)).size; v.ventaRecup = ls.reduce((s, l) => s + l.neto, 0); }
  R.tocaSeguimiento = R.clientes.filter(c => c.estado === 'Toca seguimiento');
  // Clientes nuevos del período que volvieron a comprar dentro de los datos
  R.nuevosRecompra = nuevosP.filter(c => porRut[c.rut] && porRut[c.rut].dias.size > 1).length;

  // --- Conclusiones y sugerencias automáticas
  R.insights = infInsights(R);
  if (R.recup.n) R.insights.splice(1, 0, { t: 'ok', s: `Recuperaste ${fmtInt(R.recup.n)} cliente${R.recup.n === 1 ? '' : 's'} que llevaba${R.recup.n === 1 ? '' : 'n'} más de 12 meses sin comprar: compraron ${infMill(R.recup.venta)}. ${R.vend.filter(v => v.recup).sort((x, y) => y.ventaRecup - x.ventaRecup).map(v => `${v.n.split(' ')[0]} ${v.recup}`).join(', ')}.` });
  return R;
}

function infInsights(R) {
  const out = [];
  const cw = R.canal.whatsapp, cl = R.canal.local;
  if (R.gasto.total) out.push({ t: 'ok', s: `Invertiste ${infMill(R.gasto.total)} y los clientes nuevos del período compraron ${infMill(R.ventaNuevos)}: ${R.retorno ? R.retorno.toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '—'} pesos de venta nueva por cada peso invertido.` });
  if (cl.gasto) out.push({ t: cl.ventaNuevos > cl.gasto * 3 ? 'ok' : 'warn', s: `Tráfico al local: ${infMill(cl.gasto)} en campañas y ${fmtInt(cl.nuevos)} clientes nuevos de Alberto y Catalina (${cl.nuevos ? infMill(cl.gasto / cl.nuevos) : '—'} por cliente nuevo).` });
  else out.push({ t: 'info', s: `Sin campañas de tráfico al local en el período: Alberto y Catalina captaron ${fmtInt(cl.nuevos)} clientes nuevos igual (venta a nuevos ${infMill(cl.ventaNuevos)}).` });
  if (cw.gasto) out.push({ t: cw.venta > cw.gasto ? 'ok' : 'warn', s: `Venta por WhatsApp: ${infMill(cw.gasto)}, ${fmtInt(cw.conv)} conversaciones según Meta y ${fmtInt(cw.chatsNuevos)} chats nuevos en el WhatsApp. ${cw.quien} facturó ${infMill(cw.venta)} y captó ${fmtInt(cw.nuevos)} clientes nuevos${cw.gasto ? ` (${(cw.venta / cw.gasto).toLocaleString('es-CL', { maximumFractionDigits: 1 })} pesos vendidos por cada peso en estas campañas)` : ''}.` });
  const abiertas = (R.rubroCamp || []).filter(c => c.abierto).length;
  if (abiertas) out.push({ t: 'warn', s: `${abiertas} de ${(R.rubroCamp || []).length} campañas de Meta del período no apuntan a ningún rubro (público automático). Si quieres un rubro, agrégalo como interés o sube una lista de clientes de ese rubro para crear un público similar.` });
  const r1 = (R.rubros || []).filter(r => !/no claro|Persona/.test(r.n))[0];
  if (r1) out.push({ t: 'info', s: `El rubro que más llega es ${r1.n} (${r1.nuevos} clientes nuevos, ${infMill(r1.venta)}). Vale una campaña dirigida a ese rubro con un producto que ya compran.` });
  const otra = (R.rubros || []).find(r => /no claro/.test(r.n));
  if (otra && otra.nuevos >= 3) out.push({ t: 'info', s: `${otra.nuevos} clientes nuevos no tienen rubro claro ("Otros Giros"). Completar el segmento en la ficha de Manager mejora este análisis.` });
  if (R.nuevos && R.nuevosWa / R.nuevos < 0.1) out.push({ t: 'warn', s: `Solo ${R.nuevosWa} de ${R.nuevos} clientes nuevos tienen su teléfono en un chat del WhatsApp de ventas. Anotar el celular del cliente en Manager (el mismo del WhatsApp) permite medir cuánto vende lo que llega por WhatsApp.` });
  if (R.tocaSeguimiento && R.tocaSeguimiento.length) out.push({ t: 'warn', s: `${R.tocaSeguimiento.length} clientes del período ya pasaron su fecha de seguimiento. Lista en "Toca seguimiento".` });
  return out;
}

// ---------- Gráficos (SVG simples, sin librerías) ----------
function infBarsLine(rows, { h = 200, bar = '#00C2FF', line = '#FFB547' } = {}) {
  if (!rows.length) return empty('Sin datos');
  const w = 640, pl = 10, pr = 10, pt = 18, pb = 34; const n = rows.length; const bw = (w - pl - pr) / n;
  const mx = Math.max(1, ...rows.map(r => r.v1)) * 1.12; const mx2 = Math.max(1, ...rows.map(r => r.v2)) * 1.25; const y = v => pt + (h - pt - pb) * (1 - v / mx); const y2 = v => pt + (h - pt - pb) * (1 - v / mx2);
  let g = `<line x1="${pl}" x2="${w - pr}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>`;
  rows.forEach((r, i) => { const x = pl + i * bw; g += `<rect x="${x + bw * .2}" y="${y(r.v1)}" width="${bw * .6}" height="${Math.max(0, y(0) - y(r.v1))}" rx="4" fill="${bar}"><title>${esc(r.l)} · venta a nuevos ${fmtMoney(r.v1)}</title></rect><text x="${x + bw / 2}" y="${h - 18}" fill="var(--muted)" font-size="10.5" text-anchor="middle">${esc(r.l)}</text><text x="${x + bw / 2}" y="${y(r.v1) - 5}" fill="var(--text)" font-size="10" text-anchor="middle">${infMill(r.v1)}</text>`; });
  g += `<polyline points="${rows.map((r, i) => `${pl + i * bw + bw / 2},${y2(r.v2)}`).join(' ')}" fill="none" stroke="${line}" stroke-width="2.5"/>` + rows.map((r, i) => `<circle cx="${pl + i * bw + bw / 2}" cy="${y2(r.v2)}" r="4" fill="${line}"><title>${esc(r.l)} · invertido ${fmtMoney(r.v2)}</title></circle>${r.v2 ? `<text x="${pl + i * bw + bw / 2}" y="${y2(r.v2) - 8}" fill="${line}" font-size="9.5" text-anchor="middle">${infMill(r.v2)}</text>` : ''}`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img">${g}</svg>`;
}
// Inversión y venta a clientes nuevos por quincena (rediseño 20-11, Vicente: «se ve súper feo»).
// Antes: barras + línea con DOS escalas (confundía y las cifras se montaban). Ahora: barras pareadas en UNA sola escala de pesos
// (venta a nuevos e invertido), así se ve de verdad cuánto más se vende que lo que se invierte; debajo, cuántos pesos vuelven por
// cada peso invertido. Pasar el mouse por una quincena muestra el detalle. La quincena en curso va más tenue.
function infInvVenta(rows) {
  if (!rows.length) return empty('Sin datos');
  const W = 640, H = 236, pl = 46, pr = 6, pt = 22, pb = 50, n = rows.length, gw = (W - pl - pr) / n;
  const top = Math.max(1, ...rows.map(r => Math.max(r.v1, r.v2)));
  const p10 = 10 ** Math.floor(Math.log10(top / 4)); const step = [1, 2, 2.5, 5, 10].map(k => k * p10).find(s => s * 4 >= top);
  const mx = step * 4; const y = v => pt + (H - pt - pb) * (1 - v / mx); const base = y(0);
  const bw = Math.min(30, gw * .3), gap = 3;
  const barra = (x, v, fill) => { const t = y(v), h = base - t; if (h <= 0) return ''; const r = Math.min(5, h, bw / 2);
    return `<path class="ivch-bar" d="M${x},${base} V${t + r} Q${x},${t} ${x + r},${t} H${x + bw - r} Q${x + bw},${t} ${x + bw},${t + r} V${base} Z" fill="${fill}"/>`; };
  const ret = r => r.v2 ? (r.v1 / r.v2).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'x' : '—';
  let g = `<defs><linearGradient id="ivg-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FD3FF"/><stop offset="1" stop-color="#0A8FD6"/></linearGradient>
    <linearGradient id="ivg-i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC56B"/><stop offset="1" stop-color="#E8902A"/></linearGradient></defs>`;
  for (let k = 0; k <= 4; k++) { const v = step * k, yy = y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="var(--line)" ${k ? 'stroke-dasharray="2 4" opacity=".7"' : ''}/><text x="${pl - 8}" y="${yy + 3.5}" fill="var(--faint)" font-size="10" text-anchor="end">${k ? infMill(v).replace(' ', '') : '$0'}</text>`; }
  rows.forEach((r, i) => {
    const cx = pl + gw * i + gw / 2, x1 = cx - bw - gap / 2, x2 = cx + gap / 2;
    g += `<g class="ivch-g${r.cur ? ' cur' : ''}" data-i="${i}" style="--d:${i * 60}ms">
      <rect class="ivch-hl" x="${pl + gw * i + 3}" y="${pt - 14}" width="${gw - 6}" height="${base - pt + 14 + 40}" rx="10"/>
      ${barra(x1, r.v1, 'url(#ivg-v)')}${barra(x2, r.v2, 'url(#ivg-i)')}
      ${r.v1 ? `<text x="${x1 + bw / 2}" y="${y(r.v1) - 7}" fill="var(--text)" font-size="11" font-weight="700" text-anchor="middle">${infMill(r.v1).replace(' M', 'M')}</text>` : ''}
      <text x="${cx}" y="${base + 18}" fill="var(--muted)" font-size="11" text-anchor="middle">${esc(r.l)}</text>
      <text x="${cx}" y="${base + 35}" fill="${r.cur ? 'var(--faint)' : 'var(--text)'}" font-size="10.5" font-weight="700" text-anchor="middle">${r.cur ? 'en curso' : ret(r)}</text>
      <rect x="${pl + gw * i}" y="0" width="${gw}" height="${H}" fill="transparent"/></g>`;
  });
  const tv = rows.reduce((s, r) => s + r.v1, 0), ti = rows.reduce((s, r) => s + r.v2, 0);
  return `<div class="ivch" data-rows="${esc(JSON.stringify(rows.map(r => ({ l: r.l, v1: r.v1, v2: r.v2, cur: !!r.cur }))))}">
    <div class="ivch-leg"><span><i style="background:linear-gradient(#3FD3FF,#0A8FD6)"></i>Venta a clientes nuevos <b>${infMill(tv)}</b></span><span><i style="background:linear-gradient(#FFC56B,#E8902A)"></i>Invertido en Meta y Google <b>${infMill(ti)}</b></span><span class="muted">«${ti ? (tv / ti).toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '—'}x» = pesos de venta nueva por cada peso invertido</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Venta a clientes nuevos e inversión por quincena">${g}</svg><div class="ivch-tip" hidden></div></div>`;
}
function infBindInvVenta(el) {
  $$('.ivch', el).forEach(box => {
    const rows = JSON.parse(box.dataset.rows || '[]'); const tip = $('.ivch-tip', box);
    $$('.ivch-g', box).forEach(gr => {
      gr.onmouseenter = () => { const r = rows[+gr.dataset.i]; if (!r) return;
        tip.innerHTML = `<b>${esc(r.l)}${r.cur ? ' · en curso' : ''}</b><div><i style="background:#2FC6FF"></i>Venta a nuevos<span>${fmtMoney(r.v1)}</span></div><div><i style="background:#F5A740"></i>Invertido<span>${fmtMoney(r.v2)}</span></div><div class="ivch-tip-r">Por cada $1 invertido<span>${r.v2 ? '$' + (r.v1 / r.v2).toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '—'}</span></div>`;
        tip.hidden = false; const b = box.getBoundingClientRect(), gb = gr.getBoundingClientRect();
        // al lado de la quincena (a la derecha, o a la izquierda si no cabe), sin tapar sus barras
        const der = gb.right - b.left - gb.width * .12, izq = gb.left - b.left + gb.width * .12 - tip.offsetWidth;
        tip.style.left = Math.max(4, der + tip.offsetWidth <= b.width ? der : izq) + 'px'; };
      gr.onmouseleave = () => { tip.hidden = true; };
    });
  });
}
function infHBars(rows, { color = INF_C, fmt = infMill, max = 8 } = {}) {
  rows = rows.slice(0, max); if (!rows.length) return empty('Sin datos');
  const mx = Math.max(1, ...rows.map(r => r.v));
  return rows.map(r => `<div style="margin-bottom:9px"><div class="row sm" style="gap:8px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.l)}">${esc(r.l)}</span><span class="spacer"></span><b style="flex:none">${fmt(r.v)}</b>${r.s ? `<span class="xs muted" style="flex:none">${r.s}</span>` : ''}</div><div class="bar thin" style="--c:${r.c || color};margin-top:3px"><i style="width:${r.v / mx * 100}%"></i></div></div>`).join('');
}
function infDonut(parts, centro, sub) {
  const tot = parts.reduce((t, p) => t + p.v, 0) || 1; let ang = -Math.PI / 2; const R = 54, r = 34, cx = 70, cy = 70;
  const arcs = parts.filter(p => p.v > 0).map(p => { const a0 = ang, a1 = ang + 2 * Math.PI * p.v / tot; ang = a1; const big = a1 - a0 > Math.PI ? 1 : 0; const P = (rad, t) => `${cx + rad * Math.cos(t)},${cy + rad * Math.sin(t)}`; if (p.v === tot) return `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${p.c}" stroke-width="${R - r}"/>`; return `<path d="M${P(R, a0)} A${R},${R} 0 ${big} 1 ${P(R, a1)} L${P(r, a1)} A${r},${r} 0 ${big} 0 ${P(r, a0)} Z" fill="${p.c}"><title>${esc(p.l)}: ${fmtInt(p.v)}</title></path>`; }).join('');
  return `<div class="row" style="gap:16px;align-items:center"><svg viewBox="0 0 140 140" width="140" height="140" style="flex:none">${arcs}<text x="70" y="68" text-anchor="middle" font-size="20" font-weight="800" fill="var(--text)">${centro}</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="var(--muted)">${sub}</text></svg><div style="flex:1;min-width:0">${parts.map(p => `<div class="row sm" style="gap:8px;margin-bottom:6px"><span style="width:10px;height:10px;border-radius:3px;background:${p.c};flex:none"></span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.l)}</span><span class="spacer"></span><b>${fmtInt(p.v)}</b><span class="xs muted" style="width:34px;text-align:right">${pct(p.v, tot)}%</span></div>`).join('')}</div></div>`;
}
const infTile = (icon, color, lbl, val, sub) => `<div class="card kpi" style="display:flex;gap:14px;align-items:flex-start"><span style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none;background:color-mix(in srgb, ${color} 20%, transparent);color:${color}">${icon}</span><div style="min-width:0"><div class="lbl">${lbl}</div><div class="val num">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;

// ---------- Página ----------
function informesVentas() {
  infUsarMarca(Store.read('inf_marca', 'k8'));
  const pers = infPeriodos();
  if (!INF.per || !pers.find(p => p.id === INF.per)) INF.per = 'acumulado';   // por defecto: todo desde septiembre
  const per = pers.find(p => p.id === INF.per);
  const head = ivHead(pers, per);
  const headViejo = `<div class="page-head"><div><h1>Ventas y campañas</h1><p>Lo que inviertes en Meta y Google cruzado con lo que venden Zorangie (antes Gabriel) por WhatsApp y Alberto y Catalina (antes Úrsula) en el local.</p></div>
    <div class="actions"><select id="inf-per" class="input" style="min-width:240px">${['acumulado', 'quincena', 'mes'].map(t => `<optgroup label="${t === 'mes' ? 'Meses' : t === 'acumulado' ? 'Acumulado' : 'Quincenas'}">${pers.filter(p => p.tipo === t).map(p => `<option value="${p.id}" ${p.id === INF.per ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</optgroup>`).join('')}</select>
    <button class="btn" id="inf-cargar" title="Vuelve a leer el Excel de Manager más nuevo">${ICON.upload(14)} Cargar datos de Manager</button><button class="btn primary" id="inf-excel">${ICON.download(14)} Exportar Excel</button></div></div>`;
  if (!INF.loaded) { if (!INF.promise) INF.promise = loadInformes().then(() => { INF.promise = null; render(); }); return head + `<div class="card">${empty('Cargando datos…')}</div>`; }
  const R = infCalcular(per); INF.last = R;
  if (!INF.autoHecho) setTimeout(infAutoGenerar, 3000);
  const M = INF.m;
  const fuente = `<div class="card ads-bar" style="margin-bottom:14px;padding:12px 16px"><div class="row wrap" style="gap:14px;align-items:center">
    <span class="sm"><b style="color:${INF_C}">Manager</b> <span class="muted">${M ? `${esc(M.fuente)} · datos del ${infDay(M.desde)} al ${infDay(M.hasta)} · ${esc(M.archivo)}` : 'sin datos: deja el Excel "Vendedores de campaña" en Descargas y pulsa Cargar'}</span></span>
    <span class="sm"><b style="color:#4C8DFF">Meta y Google</b> <span class="muted">${infAds() ? 'al ' + timeAgo(infAds().updated_at) : 'sin datos'}</span></span>
    ${INF.marca === 'k8' ? `<span class="sm"><b style="color:#25D366">WhatsApp</b> <span class="muted">${infWa() ? 'al ' + timeAgo(infWa().captured_at) : 'sin datos'}</span></span>` : ''}
    ${M && R.b > M.hasta ? `<span class="chip" style="--c:var(--warn)"><i></i>Ventas de Manager solo hasta el ${infDay(M.hasta)}</span>` : ''}${M && /conexi[oó]n directa/.test(M.fuente || '') ? '' : '<span class="spacer"></span><button class="btn sm primary" id="inf-pbi">Conectar Power BI</button>'}</div></div>`;
  const pbiCard = INF.pbiCode ? `<div class="card" style="margin-bottom:14px;border-left:3px solid ${INF_C}">${cardHead(ICON.link(15), 'Conectar el Power BI de ventas', 'Una sola vez, con tu cuenta de Power BI. Después el informe se actualiza solo.', '', INF_C)}<ol class="sm" style="margin:0 0 12px;padding-left:20px;line-height:1.9"><li>Abre <a href="${esc(INF.pbiCode.url)}" target="_blank" rel="noopener"><b>${esc(INF.pbiCode.url)}</b></a></li><li>Escribe este código: <b style="font-size:20px;letter-spacing:.12em;color:${INF_C}">${esc(INF.pbiCode.codigo)}</b> <span class="xs muted">(vale ${INF.pbiCode.minutos} minutos)</span></li><li>Entra con tu cuenta de Power BI y acepta.</li><li>Vuelve aquí y pulsa <b>Ya lo aprobé</b>.</li></ol><div class="row" style="gap:8px"><button class="btn primary" id="inf-pbi-ok">Ya lo aprobé</button><button class="btn ghost" id="inf-pbi-cancel">Cancelar</button><span class="xs muted" id="inf-pbi-msg"></span></div></div>` : '';
  if (!R.ok) return head + fuente + (INF.pbiCode ? pbiCard : '') + `<div class="card">${empty('Faltan los datos de Manager', 'Deja el Excel "Vendedores de campaña" del Power BI en Descargas (o en k8-panel/datos-manager) y pulsa "Cargar datos de Manager".')}</div>`;

  // Serie por quincena para el gráfico (últimas 8 quincenas)
  const serie = pers.filter(p => p.tipo === 'quincena').slice(0, 8).reverse().map(p => { const x = infCalcularLiviano(p); const d1 = parseDay(p.a), d2 = parseDay(p.b); return { l: `${d1.getDate()}–${d2.getDate()} ${INF_MES[d1.getMonth()]}`, v1: x.ventaNuevos, v2: x.gasto, cur: p.b >= todayIso() }; });
  const vendAct = R.vend;
  const kpis = ivHero(R);
  const kpisViejo = `<div class="grid g4" style="margin-bottom:14px">
    ${infClic('gasto', R, infTile(ICON.money(18), '#FFB547', 'Invertido', infMill(R.gasto.total), `Meta ${infMill(R.gasto.total - R.gasto.google)} · Google ${infMill(R.gasto.google)}`))}
    ${infClic('ventaNuevos', R, infTile(ICON.trend(18), '#22E07A', 'Venta a clientes nuevos', infMill(R.ventaNuevos), `${R.retorno ? R.retorno.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' pesos por cada peso invertido' : 'sin inversión en el período'}`))}
    ${infClic('nuevos', R, infTile(ICON.users(18), '#00C2FF', 'Clientes nuevos', fmtInt(R.nuevos), `${R.costoNuevo ? infMill(R.costoNuevo) + ' de inversión por cliente nuevo' : '—'} · ${fmtInt(R.nuevosRecompra)} ya volvieron a comprar`))}
    ${infTile(ICON.msg(18), '#25D366', 'Chats nuevos en WhatsApp', fmtInt(R.waNuevos), `${fmtInt(R.conv)} conversaciones según Meta · ${fmtInt(R.waEscribieron)} escribieron`)}
  </div>`;
  const canales = `<div class="grid g2" style="margin-bottom:14px">
    <div class="card" style="border-top:3px solid #25D366">${cardHead(ICON.msg(15), 'Ventas digitales · WhatsApp', R.canal.whatsapp.zorangie ? 'Zorangie desde el 12 nov (antes Gabriel) · campañas de venta y clientes potenciales · solo ventas del local Dardignac' : 'Gabriel · campañas de venta y clientes potenciales', '', '#25D366')}
      <div class="grid g3" style="gap:10px">${kpi('Invertido', infMill(R.canal.whatsapp.gasto), `${fmtInt(R.canal.whatsapp.conv)} conversaciones`)}${kpi('Chats nuevos', fmtInt(R.canal.whatsapp.chatsNuevos), `${fmtInt(R.canal.whatsapp.chats)} escribieron`)}${kpi('Venta facturada', infMill(R.canal.whatsapp.venta), `${fmtInt(R.canal.whatsapp.nuevos)} clientes nuevos`)}</div>
      <div class="xs muted" style="margin-top:8px">${R.canal.whatsapp.zorangie ? 'Zorangie factura con su código ZRM desde el 19 nov. ' : ''}Clientes nuevos del período con su teléfono en un chat anterior a la compra: <b>${fmtInt(R.nuevosWa)}</b> (${infMill(R.ventaNuevosWa)}).</div></div>
    <div class="card" style="border-top:3px solid #00C2FF">${cardHead(ICON.pin(15), 'Tráfico al local · Dardignac', 'Alberto y Catalina (antes Úrsula) · campañas de tráfico y localización', '', '#00C2FF')}
      <div class="grid g3" style="gap:10px">${kpi('Invertido', infMill(R.canal.local.gasto), `${fmtInt(R.canal.local.clics)} clics del anuncio`)}${kpi('Clientes nuevos', fmtInt(R.canal.local.nuevos), R.canal.local.gasto && R.canal.local.nuevos ? infMill(R.canal.local.gasto / R.canal.local.nuevos) + ' por cliente' : '')}${kpi('Venta a nuevos', infMill(R.canal.local.ventaNuevos), `venta total ${infMill(R.canal.local.venta)}`)}</div>
      <div class="xs muted" style="margin-top:8px">Venta a nuevos = todo lo que compraron en el período los clientes que hicieron su primera compra en TLA en el período.</div></div>
  </div>`;
  const graf = `<div class="grid" style="grid-template-columns:1.5fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.chart(15), 'Inversión y venta a clientes nuevos por quincena', 'Las dos en la misma escala de pesos · pasa el mouse por una quincena para ver el detalle', '', INF_C)}${infInvVenta(serie)}</div>
    <div class="card">${cardHead(ICON.users(15), 'Clientes nuevos por vendedor', `${R.per.label}`, '', INF_C)}${infDonut(vendAct.filter(v => v.nuevos > 0).map(v => ({ l: v.n, v: v.nuevos, c: v.c })), fmtInt(R.nuevos), 'clientes nuevos')}</div>
  </div>`;
  const ranking = `<div class="card" style="margin-bottom:14px">${cardHead(ICON.target(15), 'Vendedores', `${infAlcance()} · ${R.per.label}` + (R.per.tipo === 'quincena' ? ' (para ver todo el mes, elige «Mes completo»)' : ''), '', INF_C)}
    <table class="table"><thead><tr><th>Vendedor</th><th>Atiende</th><th class="r">Venta</th><th class="r">Venta a nuevos</th><th class="r">Clientes nuevos</th><th class="r">Recuperados</th><th class="r">Cotizaciones</th><th class="r">Ganadas</th><th class="r">Abiertas (monto)</th></tr></thead><tbody>
    ${vendAct.map(v => `<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${v.c};margin-right:7px"></span><b>${esc(v.n)}</b></td><td class="sm muted">${INF.marca === 'tla' ? (v.canal === 'web' ? 'Tienda web' : 'Casa Matriz / Showroom') : v.canal === 'whatsapp' ? 'WhatsApp' : 'Local'}${v.hasta ? ` (hasta ${infDay(v.hasta)})` : v.desde ? ` (desde ${infDay(v.desde)})` : ''}</td>${v.sinCodigo ? `<td class="r sm muted" colspan="7">sin código en Manager todavía</td>` : `<td class="r">${fmtMoney(v.venta)}</td><td class="r"><b>${fmtMoney(v.ventaNuevos)}</b></td><td class="r">${fmtInt(v.nuevos)}</td><td class="r">${v.recup ? `${fmtInt(v.recup)} · ${infMill(v.ventaRecup)}` : '0'}</td><td class="r">${fmtInt(v.cot)}</td><td class="r">${v.cot ? pct(v.cotGanadas, v.cot) + '%' : '—'}</td><td class="r">${fmtInt(v.cotAbiertas)} · ${infMill(v.cotAbiertoMonto)}</td>`}</tr>`).join('')}
    </tbody></table></div>`;
  const prods = `<div class="grid g2" style="margin-bottom:14px">
    <div class="card">${cardHead(ICON.shirt(15), 'Lo que más se vendió', 'Todos los clientes del local en el período', '', INF_C)}${infHBars(R.productos.map(p => ({ l: p.n, v: p.venta, s: `${fmtInt(p.q)} ${String(p.un || '').toLowerCase().startsWith('u') ? 'u' : esc(String(p.un || '').toLowerCase())}` })))}</div>
    <div class="card">${cardHead(ICON.spark(15), 'Lo que compran los clientes nuevos', 'Productos que se llevaron los nuevos', '', '#22E07A')}${infHBars(R.productosNuevos.map(p => ({ l: p.n, v: p.ventaNuevos, s: `${p.clientes} cl.`, c: '#22E07A' })))}</div>
  </div>`;
  const icoT = { ok: ICON.check(14), warn: ICON.alert(14), info: ICON.spark(14) }, colT = { ok: 'var(--ok)', warn: 'var(--warn)', info: '#00C2FF' };
  const insights = `<div class="card" style="margin-bottom:14px">${cardHead(ICON.zap(15), 'Lo que se ve y qué haría', 'Calculado con los datos del período', '', INF_C)}
    ${R.insights.map(x => `<div class="row" style="gap:10px;align-items:flex-start;margin-bottom:10px"><span style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:none;background:color-mix(in srgb, ${colT[x.t]} 20%, transparent);color:${colT[x.t]}">${icoT[x.t]}</span><div class="sm" style="padding-top:3px">${esc(x.s)}</div></div>`).join('')}</div>`;
  const rubros = `<div class="grid" style="grid-template-columns:1fr 1.3fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.layers(15), 'Rubros que llegaron', 'Clientes nuevos del período por rubro', '', INF_C)}${infHBars(R.rubros.map(r => ({ l: r.n, v: r.nuevos, s: infMill(r.venta) })), { fmt: fmtInt, max: 10 })}</div>
    <div class="card">${cardHead(ICON.target(15), '¿Llega el rubro al que apunta cada campaña?', 'Público configurado en Meta y clientes nuevos durante la campaña y 14 días después', '', INF_C)}
      ${R.rubroCamp.length ? R.rubroCamp.map(c => `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><div class="row sm" style="gap:8px"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</b><span class="spacer"></span>${c.objetivo.length ? chip(c.cumplen + ' de ' + c.llegan + ' del rubro', c.llegan && c.cumplen / c.llegan >= 0.4 ? 'var(--ok)' : 'var(--warn)') : chip('público abierto', 'var(--faint)')}</div>
        <div class="xs muted" style="margin-top:3px">${c.objetivo.length ? 'Busca: ' + esc(c.objetivo.join(', ')) : 'No apunta a ningún rubro (público automático de Meta)'} · Llegaron: ${c.top.slice(0, 3).map(([r, n]) => esc(r) + ' ' + n).join(', ') || '—'}</div></div>`).join('') : empty('Sin campañas de Meta en el período')}</div>
  </div>`;
  // Campañas por mes, hacia abajo y desplegables
  const meses = {}; for (const c of asList(infAds() && infAds().campaigns)) for (const x of asList(c.daily)) { if (!x || !x.date || Number(x.spent || 0) <= 0) continue; const m = x.date.slice(0, 7); (meses[m] || (meses[m] = {}))[c.name] = (meses[m][c.name] || 0) + Number(x.spent); }
  const campMes = `<div class="card" style="margin-bottom:14px">${cardHead(ICON.mega(15), 'Campañas por mes', 'Toca un mes para ver sus campañas', '', INF_C)}
    ${Object.keys(meses).sort().reverse().map(m => { const per2 = { a: m + '-01', b: infIso(new Date(+m.slice(0, 4), +m.slice(5, 7), 0)), label: '' }; const cs = infCalcularCamps(per2); const tot = cs.reduce((t, c) => t + c.gasto, 0); const open = INF.open[m] != null ? INF.open[m] : m === (R.a || '').slice(0, 7);
      return `<details ${open ? 'open' : ''} data-infmes="${m}" style="border-bottom:1px solid var(--line);padding:10px 0"><summary class="row" style="gap:10px;cursor:pointer;list-style:none"><b>${INF_MESL[+m.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase())} ${m.slice(0, 4)}</b><span class="xs muted">${cs.length} campañas</span><span class="spacer"></span>${Object.entries(INF_TIPO).map(([k, t]) => { const g = cs.filter(c => c.tipo === k).reduce((s, c) => s + c.gasto, 0); return g ? `<span class="xs" style="color:${t.c}">${t.n.split(' ')[0]} ${infMill(g)}</span>` : ''; }).join(' · ')}<b style="margin-left:8px">${infMill(tot)}</b>${ICON.chevD(14)}</summary>
        <table class="table" style="margin-top:8px"><thead><tr><th>Campaña</th><th>Tipo · a quién llega</th><th>Días</th><th class="r">Invertido</th><th class="r">Resultado</th><th class="r">Costo c/u</th></tr></thead><tbody>${cs.map(c => { const res = c.tipo === 'local' || c.tipo === 'otras' ? c.clics : c.conv + c.leads; return `<tr><td><b>${esc(c.name)}</b></td><td class="sm"><span style="color:${INF_TIPO[c.tipo].c}">${INF_TIPO[c.tipo].n}</span><div class="xs muted">${INF_TIPO[c.tipo].a}</div></td><td class="sm">${infDay(c.desde)} al ${infDay(c.hasta)}</td><td class="r">${fmtMoney(c.gasto)}</td><td class="r">${fmtInt(res)} <span class="xs muted">${c.tipo === 'local' || c.tipo === 'otras' ? 'clics' : c.tipo === 'google' ? 'conversiones' : 'conversaciones'}</span></td><td class="r">${res ? fmtMoney(c.gasto / res) : '—'}</td></tr>`; }).join('')}</tbody></table></details>`; }).join('')}</div>`;
  // Clientes
  const tabs = [['nuevos', 'Nuevos', R.porTipo.nuevo], ['volvieron', 'Nuevos que volvieron', R.porTipo.nuevo_volvio], ['cartera', 'Cartera que volvió', R.porTipo.cartera], ['seguir', 'Toca seguimiento', R.tocaSeguimiento]];
  const cur = tabs.find(t => t[0] === INF.ctab) || tabs[0];
  const qq = INF.q.toLowerCase(); const lista = cur[2].filter(c => !qq || `${c.cli} ${c.rut} ${c.vend} ${c.rubro} ${c.comuna}`.toLowerCase().includes(qq));
  const clientes = `<div class="card" style="margin-bottom:14px">${cardHead(ICON.users(15), 'Clientes del período', `Seguimiento sugerido según tus datos: clientes nuevos cada ${R.cadencia.nuevos} días y cartera cada ${R.cadencia.cartera} días (la mitad de los que vuelven a comprar lo hace antes de ese plazo); si el cliente ya compró varias veces, cada cuánto compra él. Contactado = mensaje de WhatsApp, cotización o compra.`, '', INF_C)}
    <div class="row wrap" style="gap:10px;margin-bottom:10px"><div class="seg">${tabs.map(t => `<button class="${t[0] === cur[0] ? 'on' : ''}" data-infctab="${t[0]}">${t[1]} <span class="muted">${t[2].length}</span></button>`).join('')}</div><span class="spacer"></span><input class="input" id="inf-q" placeholder="Buscar cliente, RUT, vendedor, rubro…" value="${esc(INF.q)}" style="max-width:280px"></div>
    <div style="overflow-x:auto"><table class="table"><thead><tr><th>Cliente</th><th>Tipo</th><th>Vendedor</th><th>Rubro</th><th>Primera compra</th><th class="r">Compras</th><th class="r">Cada (días)</th><th class="r">Venta período</th><th class="r">Cotizado</th><th class="r">Nota de venta</th><th>Contacto</th><th>WhatsApp</th><th>Último contacto</th><th>Próximo</th></tr></thead><tbody>
    ${lista.slice(0, 150).map(c => `<tr><td><b style="display:block;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.cli)}">${esc(c.cli)}</b><span class="xs muted">${esc(c.rut)}${c.comuna ? ' · ' + esc(c.comuna) : ''}</span></td><td class="sm">${esc(c.tipoTxt)}</td><td class="sm">${esc(c.vend)}</td><td class="sm">${esc(c.rubro)}</td><td class="sm">${infDay(c.primera)}</td><td class="r">${c.compras}</td><td class="r">${c.cada ?? '—'}</td><td class="r">${fmtMoney(c.venta)}</td><td class="r">${c.cotMonto ? fmtMoney(c.cotMonto) : '—'}</td><td class="r">${c.nvMonto ? fmtMoney(c.nvMonto) : '—'}</td><td class="xs">${c.email ? esc(c.email) + '<br>' : ''}${esc(c.tel)}</td><td class="xs">${c.wa ? `<span style="color:#25D366">${esc(c.wa)}</span>` : '<span class="muted">sin chat</span>'}</td><td class="sm">${infDay(c.ultContacto)}</td><td>${c.estado === 'Toca seguimiento' ? chip('desde ' + infDay(c.prox), 'var(--warn)') : chip(infDay(c.prox), 'var(--ok)')}</td></tr>`).join('') || `<tr><td colspan="14">${empty('Sin clientes en esta lista')}</td></tr>`}
    </tbody></table></div>${lista.length > 150 ? `<div class="xs muted">y ${lista.length - 150} más (todos van en el Excel)</div>` : ''}</div>`;
  const ads = infAds(); const metaOk = ads && ads.sources && ads.sources.meta && ads.sources.meta.ok;
  const avisoMeta = INF.marca === 'tla' && !metaOk ? `<div class="card" style="margin-bottom:14px;border-left:3px solid var(--warn)">${cardHead(ICON.alert(15), 'Falta conectar Meta de TLA', 'Las ventas ya vienen del Power BI. Mientras no se conecte la cuenta de anuncios de Deco TLA, lo invertido sale en $0 y no se calcula el retorno.', '', 'var(--warn)')}</div>` : '';
  return head + avisoMeta + pbiCard + ivAcumLinea(R) + kpis + insights + ivClientes(R) + (INF.marca === 'tla' ? ivSucursales(R) + `<div class="cmp-2">${ivWebTla(R)}${ivWaTla()}</div>` : ivCanales(R)) + graf + ranking + prods + rubros + (typeof ivCampProd === 'function' ? ivCampProd(R) : '') + campMes + fuente;
}
// Versiones livianas para el gráfico y la lista por mes (sin clientes ni rubros)
function infCalcularCamps(per) { return asList(infAds() && infAds().campaigns).map(c => { const d = asList(c.daily).filter(x => x && x.date && x.date >= per.a && x.date <= per.b && Number(x.spent || 0) > 0); const s = k => d.reduce((t, x) => t + Number(x[k] || 0), 0); return { name: c.name, tipo: infTipoCampana(c), gasto: s('spent'), conv: s('messages'), leads: c.platform === 'google' ? 0 : s('leads'), clics: s('link_clicks'), desde: d.length ? d[0].date : '', hasta: d.length ? d[d.length - 1].date : '' }; }).filter(c => c.gasto > 0).sort((x, y) => y.gasto - x.gasto); }
function infCalcularLiviano(per) {
  const gasto = infCalcularCamps(per).reduce((t, c) => t + c.gasto, 0); const M = INF.m; if (!M) return { gasto, ventaNuevos: 0 };
  const ruts = new Set(M.clientes.filter(c => c.primera_tla >= per.a && c.primera_tla <= per.b).map(c => c.rut));
  return { gasto, ventaNuevos: M.lineas.filter(l => l.f >= per.a && l.f <= per.b && ruts.has(l.rut) && INF_VEND[l.vend]).reduce((t, l) => t + l.neto, 0) };
}

function bindInformes(el) {
  const pb = $('#inf-pbi', el); if (pb) pb.onclick = async () => { pb.disabled = true; pb.textContent = 'Pidiendo código…'; try { const r = await fetch('/api/manager/cargar', { method: 'POST', body: 'powerbi_codigo' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error'); INF.pbiCode = j; render(); } catch (e) { toast('No se pudo pedir el código: ' + e.message, true); pb.disabled = false; pb.textContent = 'Conectar Power BI'; } };
  const pc = $('#inf-pbi-cancel', el); if (pc) pc.onclick = () => { INF.pbiCode = null; render(); };
  const po = $('#inf-pbi-ok', el); if (po) po.onclick = async () => { const msg = $('#inf-pbi-msg', el); po.disabled = true; msg.textContent = 'Revisando…';
    try { const r = await fetch('/api/manager/cargar', { method: 'POST', body: 'powerbi_confirmar' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error');
      if (j.estado === 'pendiente') { msg.textContent = 'Todavía no aparece aprobado. Termina en la página de Microsoft y vuelve a pulsar.'; po.disabled = false; return; }
      if (j.estado === 'expirado') { msg.textContent = 'El código venció. Pide uno nuevo.'; INF.pbiCode = null; setTimeout(render, 1500); return; }
      msg.textContent = 'Conectado. Trayendo las ventas del Power BI (puede tardar un minuto)…';
      const r2 = await fetch('/api/manager/cargar', { method: 'POST', body: 'powerbi_cargar' }); const j2 = await r2.json(); if (!j2.ok) throw new Error(j2.error || 'error');
      INF.pbiCode = null; await loadInformes(true); render(); toast('Power BI conectado');
    } catch (e) { msg.textContent = 'Error: ' + e.message; po.disabled = false; } };
  $$('[data-infdet]', el).forEach(d => d.onclick = () => infAbrirDetalle(d.dataset.infdet));
  $$('[data-infmarca]', el).forEach(b => b.onclick = () => { const mk = b.dataset.infmarca; if (mk === INF.marca) return; Store.write('inf_marca', mk); infUsarMarca(mk); INF.per = 'acumulado'; render.animar = true; render(); window.scrollTo(0, 0); });
  $$('[data-infper]', el).forEach(b => b.onclick = () => { INF.per = b.dataset.infper; INF.cliSel = null; render.animar = true; render(); });
  ivBindClientes(el, () => INF.last);   // pestañas, cliente y búsqueda sin mover la página
  ivBindActualizar(el);
  infBindInvVenta(el);
  if (typeof ivBindCampProd === 'function') ivBindCampProd(el);
  const s = $('#inf-per', el); if (s) s.onchange = e => { INF.per = e.target.value; render(); };
  $$('details[data-infmes]', el).forEach(d => d.ontoggle = () => { INF.open[d.dataset.infmes] = d.open; });
  const c = $('#inf-cargar', el); if (c) c.onclick = async () => { c.disabled = true; c.textContent = 'Cargando…'; try { const r = await fetch('/api/manager/cargar', { method: 'POST' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error'); toast(j.nuevo ? `Manager: ${j.archivo} (${j.desde} a ${j.hasta})` : 'Ya estaba cargado el Excel más nuevo'); INF.loaded = false; await loadInformes(true); render(); } catch (e) { toast('No se pudo cargar: ' + e.message, true); c.disabled = false; } };
  const x = $('#inf-excel', el); if (x) x.onclick = async () => {
    const R = INF.last; if (!R || !R.ok) return toast('Faltan datos de Manager', true);
    x.disabled = true; const t0 = x.innerHTML; x.textContent = 'Armando Excel…';
    try {
      const body = infCuerpoExcel(R);
      const r = await fetch('/api/informe/excel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error');
      const a = document.createElement('a'); a.href = j.url; a.download = j.nombre; document.body.appendChild(a); a.click(); a.remove();
      toast('Excel listo: ' + j.nombre);
    } catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); }
    x.disabled = false; x.innerHTML = t0;
  };
}

// ---------- Acumulado desde septiembre (siempre visible arriba y en el Excel) ----------
// Cliente nuevo = primera compra en TLA desde el 1 de septiembre; venta a nuevos = todo lo que compraron desde entonces.
function infAcum(hasta) {
  const b = hasta && hasta < todayIso() ? hasta : todayIso(); const key = b + '|' + (INF.m && INF.m.cargado) + '|' + (infAds() && infAds().updated_at);
  if (INF._acum && INF._acum.key === key) return INF._acum.v;
  const R = infCalcular({ id: 'acumulado', tipo: 'acumulado', a: INF_DESDE, b, label: 'Desde septiembre' });
  const v = R.ok ? { a: INF_DESDE, b, dataHasta: R.dataHasta, gasto: R.gasto.total, gastoGoogle: R.gasto.google, gastoMeta: R.gasto.total - R.gasto.google, ventaTotal: R.ventaTotal, ventaNuevos: R.ventaNuevos, nuevos: R.nuevos, nuevosRecompra: R.nuevosRecompra, recupN: R.recup.n, recupVenta: R.recup.venta, retorno: R.retorno, costoNuevo: R.costoNuevo, porVend: R.vend.filter(x => !x.sinCodigo).map(x => ({ cod: x.cod, n: x.n, c: x.c, venta: x.venta, ventaNuevos: x.ventaNuevos, nuevos: x.nuevos, recup: x.recup, ventaRecup: x.ventaRecup })) } : null;
  INF._acum = { key, v, R }; return v;
}
const infAcumR = () => { infAcum(); return INF._acum && INF._acum.R; };   // el cálculo completo del acumulado (lo usa Inicio)
function infAcumHtml(R) {
  if (R.per.tipo === 'acumulado') return '';
  const A = infAcum(); if (!A) return '';
  const hastaTxt = A.dataHasta && A.dataHasta < A.b ? infDay(A.dataHasta) : infDay(A.b);
  return `<div class="card" style="margin-bottom:14px;border-left:3px solid ${INF_C}">${cardHead(ICON.chart(15), 'Acumulado desde el 1 de septiembre', `Todo lo hecho desde que partieron las campañas, hasta el ${hastaTxt}. Las tarjetas de más abajo son solo de ${R.per.label.toLowerCase()}.`, '', INF_C)}
    <div class="grid g4" style="gap:10px">${infClic('gasto', A, kpi('Invertido en Meta y Google', infMill(A.gasto), `Meta ${infMill(A.gastoMeta)} · Google ${infMill(A.gastoGoogle)} · ver por mes ›`))}${infClic('ventaTotal', A, kpi('Venta total', infMill(A.ventaTotal), 'solo local Dardignac · ver detalle ›'))}${infClic('ventaNuevos', A, kpi('Venta a clientes nuevos', infMill(A.ventaNuevos), (A.retorno ? A.retorno.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' pesos por cada peso invertido · ' : '') + 'ver detalle ›'))}${infClic('nuevos', A, kpi('Clientes nuevos', fmtInt(A.nuevos), `${A.costoNuevo ? infMill(A.costoNuevo) + ' de inversión por cliente' : ''} · ${fmtInt(A.nuevosRecompra)} ya volvieron · ver detalle ›`))}</div></div>`;
}
// ---------- Detalle al hacer clic en una cifra (ventana emergente) ----------
// Por vendedor y por mes: clientes nuevos que llegaron ese mes y la plata que dejaron (todo lo que compraron en el local
// desde su primera compra hasta el final del período). Suma exacto la cifra de la tarjeta.
function infCohortes(a, b) {
  const M = INF.m; const cli = {}; for (const c of M.clientes) cli[c.rut] = c;
  const meses = []; for (let d = parseDay(a.slice(0, 7) + '-01'); infIso(d) <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) meses.push(infIso(d).slice(0, 7));
  const T = {}; for (const v of Object.keys(INF_VEND)) { T[v] = {}; for (const m of meses) T[v][m] = { n: 0, venta: 0, total: 0, vnS: 0, atend: new Set(), rec: new Set(), recV: 0 }; }
  const enP = f => f && f >= a && f <= b;
  for (const c of M.clientes) if (T[c.capto] && enP(c.primera_tla)) T[c.capto][c.primera_tla.slice(0, 7)].n++;
  for (const l of M.lineas) {
    if (!T[l.vend] || !enP(l.f)) continue; T[l.vend][l.f.slice(0, 7)].total += l.neto;
    const c = cli[l.rut]; if (c && enP(c.primera_tla)) { const x = T[l.vend][c.primera_tla.slice(0, 7)]; x.venta += l.neto; x.atend.add(l.rut); T[l.vend][l.f.slice(0, 7)].vnS += l.neto; }   // vnS = venta a nuevos según el mes de la venta
  }
  // Recuperados: compraron en el período y llevaban más de 12 meses sin comprar en TLA (mes = su primera compra del período)
  const hace365 = infIso(new Date(parseDay(a).getTime() - 365 * 864e5)); const primeraP = {};
  for (const l of M.lineas) if (T[l.vend] && enP(l.f) && l.rut && l.doc !== 'NCV' && (!primeraP[l.rut] || l.f < primeraP[l.rut])) primeraP[l.rut] = l.f;
  const antDe = rut => asList((cli[rut] || {}).dias).filter(d => d < a).pop() || '';
  const esRec = rut => { const c = cli[rut]; if (!c || !c.primera_tla || c.primera_tla >= a) return false; const ant = antDe(rut); return !ant || ant < hace365; };
  const recList = {};
  for (const l of M.lineas) { if (!T[l.vend] || !enP(l.f) || !primeraP[l.rut] || !esRec(l.rut)) continue; const x = T[l.vend][primeraP[l.rut].slice(0, 7)]; x.recV += l.neto; x.rec.add(l.rut); const r = recList[l.rut] || (recList[l.rut] = { rut: l.rut, cli: (cli[l.rut] || {}).cli || l.cli, ant: antDe(l.rut) || (cli[l.rut] || {}).primera_tla, f1: primeraP[l.rut], venta: 0, vend: {} }); r.venta += l.neto; r.vend[l.vend] = 1; }
  const gasto = {}; for (const m of meses) { const x = infIso(new Date(Math.max(parseDay(m + '-01'), parseDay(a)))), y = infIso(new Date(Math.min(new Date(+m.slice(0, 4), +m.slice(5, 7), 0), parseDay(b)))); const cs = infCalcularCamps({ a: x, b: y }); gasto[m] = {}; for (const k of Object.keys(INF_TIPO)) gasto[m][k] = cs.filter(c => c.tipo === k).reduce((s, c) => s + c.gasto, 0); gasto[m].total = cs.reduce((s, c) => s + c.gasto, 0); }
  const vends = Object.keys(T).filter(v => meses.some(m => T[v][m].n || T[v][m].total));
  return { meses, T, vends, gasto, recList: Object.values(recList).sort((x, y) => y.venta - x.venta) };
}
const infMesCorto = m => INF_MESL[+m.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase());
function infAbrirDetalle(clave) {
  const [que, a, b] = clave.split('|'); const C = infCohortes(a, b); const { meses, T, vends, gasto } = C;
  const sum = (v, k) => meses.reduce((s, m) => s + T[v][m][k], 0), sumM = (m, k) => vends.reduce((s, v) => s + T[v][m][k], 0), tot = k => vends.reduce((s, v) => s + sum(v, k), 0);
  const at = sets => new Set(sets.flatMap(s => [...s])).size;   // clientes nuevos atendidos (sin repetir)
  const atV = v => at(meses.map(m => T[v][m].atend)), atM = m => at(vends.map(v => T[v][m].atend)), atT = () => at(vends.flatMap(v => meses.map(m => T[v][m].atend)));
  const punto = v => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${INF_VEND[v].c};margin-right:7px"></span>`;
  const rango = `${infDay(a)} al ${infDay(INF.m && INF.m.hasta < b ? INF.m.hasta : b)}`;
  let titulo, nota, cuerpo;
  if (que === 'gasto') {
    titulo = 'Invertido en Meta y Google por mes';
    nota = `${rango}. Cuántos clientes nuevos llegaron cada mes y cuánta plata dejaron, contra lo invertido.`;
    const fila = (lbl, f, bold) => `<tr><td>${lbl}</td>${meses.map(m => `<td class="r">${f(m)}</td>`).join('')}<td class="r"><b>${f(null)}</b></td></tr>`;
    const g = (m, k) => m ? gasto[m][k] : meses.reduce((s, x) => s + gasto[x][k], 0);
    const vn = m => m ? sumM(m, 'venta') : tot('venta'), nn = m => m ? sumM(m, 'n') : tot('n');
    cuerpo = `<table class="table"><thead><tr><th></th>${meses.map(m => `<th class="r">${infMesCorto(m)}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>
      ${Object.entries(INF_TIPO).filter(([k]) => g(null, k) > 0).map(([k, t]) => fila(`<span style="color:${t.c}">${t.n}</span>`, m => fmtMoney(g(m, k)))).join('')}
      ${fila('<b>Invertido</b>', m => `<b>${fmtMoney(g(m, 'total'))}</b>`)}
      ${fila('Clientes nuevos', m => fmtInt(nn(m)))}
      ${fila('Venta a clientes nuevos', m => fmtMoney(vn(m)))}
      ${fila('Pesos por cada peso invertido', m => g(m, 'total') ? (vn(m) / g(m, 'total')).toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '—')}
      ${fila('Inversión por cliente nuevo', m => nn(m) ? fmtMoney(g(m, 'total') / nn(m)) : '—')}</tbody></table>`;
  } else if (que === 'recuperados') {
    titulo = 'Clientes recuperados por vendedor y mes';
    nota = `${rango}. Clientes que volvieron a comprar en el local después de más de 12 meses sin comprar en TLA. Mes = su primera compra del período; la plata es todo lo que le compraron a ese vendedor en el período.`;
    const rNv = v => at(meses.map(m => T[v][m].rec)), rNm = m => at(vends.map(v => T[v][m].rec)), rNt = () => at(vends.flatMap(v => meses.map(m => T[v][m].rec)));
    const vs = vends.filter(v => rNv(v));
    const celda = (n, v) => `<b>${fmtMoney(v)}</b><div class="xs muted">${fmtInt(n)} recuperado${n === 1 ? '' : 's'}</div>`;
    cuerpo = `<div style="margin-bottom:14px">${infHBars(vs.map(v => ({ l: INF_VEND[v].n, v: sum(v, 'recV'), s: `${rNv(v)} clientes`, c: INF_VEND[v].c })).sort((x, y) => y.v - x.v))}</div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Vendedor</th>${meses.map(m => `<th class="r">${infMesCorto(m)}</th>`).join('')}<th class="r">Total</th><th class="r">Por cliente</th></tr></thead><tbody>
      ${vs.map(v => `<tr><td>${punto(v)}<b>${esc(INF_VEND[v].n)}</b></td>${meses.map(m => `<td class="r">${celda(T[v][m].rec.size, T[v][m].recV)}</td>`).join('')}<td class="r">${celda(rNv(v), sum(v, 'recV'))}</td><td class="r">${rNv(v) ? fmtMoney(sum(v, 'recV') / rNv(v)) : '—'}</td></tr>`).join('')}
      <tr style="border-top:2px solid var(--line)"><td><b>Total</b></td>${meses.map(m => `<td class="r">${celda(rNm(m), sumM(m, 'recV'))}</td>`).join('')}<td class="r">${celda(rNt(), tot('recV'))}</td><td class="r">${rNt() ? fmtMoney(tot('recV') / rNt()) : '—'}</td></tr></tbody></table></div>
      <h3 class="sm" style="margin:18px 0 8px">Quiénes son</h3><div style="overflow-x:auto;max-height:320px"><table class="table"><thead><tr><th>Cliente</th><th>Le vendió</th><th>Compra anterior</th><th>Volvió</th><th class="r">Compró</th></tr></thead><tbody>
      ${C.recList.map(r => `<tr><td><b>${esc(r.cli || r.rut)}</b><div class="xs muted">${esc(r.rut)}</div></td><td class="sm">${Object.keys(r.vend).map(k => esc(INF_VEND[k].n.split(' ')[0])).join(', ')}</td><td class="sm">${r.ant ? infDay(r.ant) + ' ' + r.ant.slice(0, 4) : 'antes de 2022'}</td><td class="sm">${infDay(r.f1)}</td><td class="r">${fmtMoney(r.venta)}</td></tr>`).join('') || `<tr><td colspan="5">${empty('Sin clientes recuperados')}</td></tr>`}</tbody></table></div>`;
  } else {
    const k = que === 'ventaTotal' ? 'total' : 'venta';
    titulo = que === 'ventaTotal' ? 'Venta total por vendedor y mes' : que === 'nuevos' ? 'Clientes nuevos por vendedor y mes' : 'Venta a clientes nuevos por vendedor y mes';
    nota = que === 'ventaTotal' ? `${rango}. Todo lo que facturó cada uno en el local Dardignac, por mes de la venta. Debajo de cada cifra: cuánto de eso fue a clientes nuevos (los que compraron por primera vez en TLA desde el ${infDay(a)}).`
      : `${rango}. Mes en que llegó el cliente (su primera compra en TLA). Captados = su primera compra fue con ese vendedor. Atendió = clientes nuevos de ese mes que le compraron a él aunque los haya captado otro. La plata es todo lo que esos clientes nuevos le compraron en el local hasta el final del período.`;
    const vtN = vn => `<div class="xs" style="color:var(--accent)">${fmtMoney(vn)} a nuevos</div>`;
    const celdaVT = (v, m) => `<b>${fmtMoney(m ? T[v][m].total : sum(v, 'total'))}</b>${vtN(m ? T[v][m].vnS : sum(v, 'vnS'))}`;
    const pct = (x, y) => y ? Math.round(x / y * 100) + '%' : '—';
    const celda = (n, v, a2) => que === 'ventaTotal' ? `<b>${fmtMoney(v)}</b>` : `<b>${fmtMoney(v)}</b><div class="xs muted">${fmtInt(n)} captado${n === 1 ? '' : 's'}${a2 > n ? ` · atendió ${a2}` : ''}</div>`;
    // Venta total (20-11, Vicente): además de la venta total, cuánto se vendió a clientes nuevos (por vendedor, mes y fila propia)
    if (que === 'ventaTotal') cuerpo = `<div style="margin-bottom:14px">${infHBars(vends.map(v => ({ l: INF_VEND[v].n, v: sum(v, 'total'), s: `${infMill(sum(v, 'vnS'))} a clientes nuevos`, c: INF_VEND[v].c })).sort((x, y) => y.v - x.v))}</div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Vendedor</th>${meses.map(m => `<th class="r">${infMesCorto(m)}</th>`).join('')}<th class="r">Total</th><th class="r">% a nuevos</th></tr></thead><tbody>
      ${vends.map(v => `<tr><td>${punto(v)}<b>${esc(INF_VEND[v].n)}</b></td>${meses.map(m => `<td class="r">${celdaVT(v, m)}</td>`).join('')}<td class="r">${celdaVT(v, null)}</td><td class="r">${pct(sum(v, 'vnS'), sum(v, 'total'))}</td></tr>`).join('')}
      <tr style="border-top:2px solid var(--line)"><td><b>Venta total</b></td>${meses.map(m => `<td class="r"><b>${fmtMoney(sumM(m, 'total'))}</b></td>`).join('')}<td class="r"><b>${fmtMoney(tot('total'))}</b></td><td class="r">100%</td></tr>
      <tr style="background:color-mix(in srgb, var(--accent) 10%, transparent)"><td><b style="color:var(--accent)">Venta a clientes nuevos</b><div class="xs muted">${fmtInt(tot('n'))} clientes nuevos</div></td>${meses.map(m => `<td class="r"><b style="color:var(--accent)">${fmtMoney(sumM(m, 'vnS'))}</b></td>`).join('')}<td class="r"><b style="color:var(--accent)">${fmtMoney(tot('vnS'))}</b></td><td class="r"><b>${pct(tot('vnS'), tot('total'))}</b></td></tr></tbody></table></div>`;
    else cuerpo = `<div style="margin-bottom:14px">${infHBars(vends.map(v => ({ l: INF_VEND[v].n, v: sum(v, k), s: que === 'ventaTotal' ? '' : `${fmtInt(sum(v, 'n'))} nuevos`, c: INF_VEND[v].c })).sort((x, y) => y.v - x.v))}</div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Vendedor</th>${meses.map(m => `<th class="r">${infMesCorto(m)}</th>`).join('')}<th class="r">Total</th>${que === 'ventaTotal' ? '' : '<th class="r">Por cliente nuevo</th>'}</tr></thead><tbody>
      ${vends.map(v => `<tr><td>${punto(v)}<b>${esc(INF_VEND[v].n)}</b></td>${meses.map(m => `<td class="r">${celda(T[v][m].n, T[v][m][k], T[v][m].atend.size)}</td>`).join('')}<td class="r">${celda(sum(v, 'n'), sum(v, k), atV(v))}</td>${que === 'ventaTotal' ? '' : `<td class="r">${sum(v, 'n') ? fmtMoney(sum(v, 'venta') / sum(v, 'n')) : '—'}</td>`}</tr>`).join('')}
      <tr style="border-top:2px solid var(--line)"><td><b>Total</b></td>${meses.map(m => `<td class="r">${celda(sumM(m, 'n'), sumM(m, k), atM(m))}</td>`).join('')}<td class="r">${celda(tot('n'), tot(k), atT())}</td>${que === 'ventaTotal' ? '' : `<td class="r">${tot('n') ? fmtMoney(tot('venta') / tot('n')) : '—'}</td>`}</tr></tbody></table></div>`;
  }
  openModal(modalHtml(titulo, `<p class="sm muted" style="margin:0 0 14px">${esc(nota)}</p>${cuerpo}`), { wide: true });
}
const infClic = (que, per, html) => `<div data-infdet="${que}|${per.a}|${per.b}" style="cursor:pointer" title="Toca para ver el detalle por vendedor y por mes">${html}</div>`;
// ---------- Hojas del Excel = las mismas secciones del dashboard, con su detalle (20-11, Vicente: «tantas pestañas es engorroso») ----------
// Resumen (la arma el servidor: tarjetas, canales, gráficos y conclusiones) · Clientes · Vendedores · Productos y rubros ·
// Campañas · Detalle de ventas. Las tablas del Excel de Francisca siguen todas, pero dentro de la hoja que les corresponde.
// Ojo: Excel permite UN filtro por hoja, por eso solo la última tabla de cada hoja lleva filtro.
function infHojasExcel(per, R) {
  const F = {}; for (const h of infTablas(per, R)) F[h.nombre] = h;
  const C = (n, t = 'txt', s = false) => ({ n, t, s });
  const conTitulo = (h, titulo) => h ? h.tablas.map((t, i) => ({ ...t, filtro: false, titulo: t.titulo || (i === 0 ? titulo || h.titulo : ''), nota: t.nota || (i === 0 ? h.nota : '') })) : [];
  const ultFiltro = tablas => { tablas.forEach((t, i) => { if (i < tablas.length - 1) t.filtro = false; }); return tablas; };
  const hoy = todayIso(); const P = infCohortes(per.a, per.b); const { meses, T, vends, gasto } = P; const mc = infMesCorto;
  const sum = (v, k) => meses.reduce((s, m) => s + T[v][m][k], 0);
  const nom = v => (INF_VEND[v] || {}).n || v;

  // ===== Clientes: lo mismo que el panel de clientes (pestañas Nuevos, Nuevos que volvieron, Recuperados, Cartera, Toca seguimiento)
  const tabs = [['Nuevos', R.porTipo.nuevo], ['Nuevos que volvieron a comprar', R.porTipo.nuevo_volvio], ['Recuperados (+12 meses sin comprar)', R.porTipo.recuperado], ['Cartera que volvió', R.porTipo.cartera]];
  const fr = {}; const tc = F['Todos los clientes']; if (tc) for (const f of tc.tablas[0].filas) fr[f[3]] = f;   // columnas extra del Excel de Francisca
  const filasCli = R.clientes.map(c => { const f = fr[c.rut] || []; const atraso = c.prox && c.prox < hoy ? daysBetween(c.prox, hoy) : null;
    return [c.estado, atraso, c.cli, c.rut, c.tipoTxt, c.ultVend || '', c.ultVendF || '', c.vend, f[0] ? nom(f[0]) : '', c.rubro, c.comuna, c.tel, c.email, c.wa, c.primera, c.ultCompra, c.compras, c.cada, c.venta, f[15] || 0, f[16] || 0, c.cotMonto, c.nvMonto, f[14] || '', c.ultContacto, c.seguirCada, c.prox, f[28] || '']; })
    .sort((x, y) => (x[0] === 'Toca seguimiento' ? 0 : 1) - (y[0] === 'Toca seguimiento' ? 0 : 1) || (y[1] || 0) - (x[1] || 0) || y[18] - x[18]);
  const clientes = { nombre: 'Clientes', titulo: `Clientes · ${per.label}`, nota: `Lo mismo que el panel «Clientes» del dashboard. Seguimiento sugerido: nuevos cada ${R.cadencia.nuevos} días, cartera cada ${R.cadencia.cartera} (o cada cuánto compra ese cliente). Contactado = WhatsApp, cotización o compra. Solo local Dardignac.`, tablas: ultFiltro([
    { titulo: 'Resumen por tipo de cliente', cols: [C('Tipo'), C('Clientes', 'int', true), C('Venta del período ($)', 'money', true), C('Toca seguimiento', 'int', true)],
      filas: tabs.map(([n, l]) => [n, l.length, l.reduce((s, c) => s + c.venta, 0), l.filter(c => c.estado === 'Toca seguimiento').length]), total: true },
    { titulo: 'Todos los clientes', nota: 'Primero los que toca seguir (los más atrasados arriba). Filtra por Estado o por Tipo para ver cada pestaña del dashboard.',
      cols: [C('Estado'), C('Días de atraso', 'int'), C('Cliente'), C('RUT'), C('Tipo'), C('Último en venderle'), C('Fecha última venta', 'date'), C('Le vendió'), C('Lo captó'), C('Rubro'), C('Comuna'), C('Teléfono'), C('Email'), C('Chat de WhatsApp'), C('Primera compra en TLA', 'date'), C('Última compra', 'date'), C('Compras', 'int'), C('Compra cada (días)', 'int'), C('Venta del período ($)', 'money', true), C('Venta ropa ($)', 'money', true), C('Venta telas y otros ($)', 'money', true), C('Cotizado ($)', 'money', true), C('Nota de venta ($)', 'money', true), C('Qué compró'), C('Último contacto', 'date'), C('Seguir cada (días)', 'int'), C('Próximo contacto', 'date'), C('Campañas activas en su primera compra')],
      filas: filasCli, total: true, filtro: true },
  ]) };

  // ===== Vendedores: la tabla del dashboard, el detalle por mes (lo que se abre al tocar las cifras) y las tablas de Francisca
  const celdasMes = (v, k1, k2) => meses.flatMap(m => [T[v][m][k1], T[v][m][k2]]);
  const vendedores = { nombre: 'Vendedores', titulo: `Vendedores · ${per.label}`, nota: 'Solo ventas y cotizaciones del local Dardignac. Abajo, el detalle por mes y las tablas del informe de vendedores de campaña.', tablas: ultFiltro([
    { titulo: 'Vendedores (igual que el dashboard)', cols: [C('Vendedor'), C('Atiende'), C('Venta ($)', 'money', true), C('Venta a clientes nuevos ($)', 'money', true), C('% a nuevos', 'pct'), C('Clientes nuevos', 'int', true), C('Recuperados', 'int', true), C('Venta a recuperados ($)', 'money', true), C('Cotizaciones', 'int', true), C('% ganadas', 'pct'), C('Abiertas', 'int', true), C('Monto abierto ($)', 'money', true)],
      filas: R.vend.map(v => [v.n, (INF.marca === 'tla' ? (v.canal === 'web' ? 'Tienda web' : 'Casa Matriz / Showroom') : v.canal === 'whatsapp' ? 'WhatsApp' : 'Local') + (v.hasta ? ` (hasta ${infDay(v.hasta)})` : v.desde ? ` (desde ${infDay(v.desde)})` : ''), ...(v.sinCodigo ? ['', '', '', '', '', '', '', '', '', ''] : [v.venta, v.ventaNuevos, v.venta ? v.ventaNuevos / v.venta : null, v.nuevos, v.recup, v.ventaRecup, v.cot, v.cot ? v.cotGanadas / v.cot : null, v.cotAbiertas, v.cotAbiertoMonto])]), total: true },
    { titulo: 'Venta total por vendedor y mes, y cuánto fue a clientes nuevos', nota: 'Por mes de la venta. Cliente nuevo = primera compra en TLA dentro del período.',
      cols: [C('Vendedor'), ...meses.flatMap(m => [C(`Venta ${mc(m)} ($)`, 'money', true), C(`A nuevos ${mc(m)} ($)`, 'money', true)]), C('Venta total ($)', 'money', true), C('A clientes nuevos ($)', 'money', true), C('% a nuevos', 'pct')],
      filas: vends.map(v => [nom(v), ...celdasMes(v, 'total', 'vnS'), sum(v, 'total'), sum(v, 'vnS'), sum(v, 'total') ? sum(v, 'vnS') / sum(v, 'total') : null]), total: true },
    { titulo: 'Clientes nuevos por vendedor y mes', nota: 'Mes en que llegó el cliente (su primera compra). Venta = todo lo que esos clientes le compraron hasta el final del período.',
      cols: [C('Vendedor'), ...meses.flatMap(m => [C(`Nuevos ${mc(m)}`, 'int', true), C(`Su venta ${mc(m)} ($)`, 'money', true)]), C('Clientes nuevos', 'int', true), C('Venta a nuevos ($)', 'money', true), C('Por cliente nuevo ($)', 'money')],
      filas: vends.map(v => [nom(v), ...celdasMes(v, 'n', 'venta'), sum(v, 'n'), sum(v, 'venta'), sum(v, 'n') ? sum(v, 'venta') / sum(v, 'n') : null]), total: true },
    { titulo: 'Clientes recuperados por vendedor y mes', nota: 'Volvieron a comprar después de más de 12 meses sin comprar en TLA.',
      cols: [C('Vendedor'), ...meses.flatMap(m => [C(`Recuperados ${mc(m)}`, 'int', true), C(`Su venta ${mc(m)} ($)`, 'money', true)]), C('Recuperados', 'int', true), C('Venta ($)', 'money', true)],
      filas: vends.filter(v => meses.some(m => T[v][m].rec.size)).map(v => [nom(v), ...meses.flatMap(m => [T[v][m].rec.size, T[v][m].recV]), new Set(meses.flatMap(m => [...T[v][m].rec])).size, sum(v, 'recV')]), total: true },
    { titulo: 'Quiénes son los recuperados', cols: [C('Cliente'), C('RUT'), C('Le vendió'), C('Compra anterior', 'date'), C('Volvió', 'date'), C('Compró ($)', 'money', true)],
      filas: P.recList.map(r => [r.cli || r.rut, r.rut, Object.keys(r.vend).map(nom).join(', '), r.ant || '', r.f1, r.venta]), total: true },
    ...conTitulo(F['Ranking vendedores'], 'Captación de clientes nuevos (informe de vendedores de campaña)'),
    ...conTitulo(F['Mes a mes']),
    ...conTitulo(F['Semana a semana']),
    ...conTitulo(F['Cotizaciones']).map(t => ({ ...t, filtro: true })),
  ]) };

  // ===== Productos y rubros: lo que más se vendió, lo que compran los nuevos, rubros y si llega el rubro de cada campaña
  const sug = x => x.abierto ? 'Público abierto: no elige rubro. Para apuntar a un rubro, agrega intereses o un público similar a tus clientes de ese rubro.' : x.llegan && x.cumplen != null && x.cumplen / x.llegan < 0.4 ? `Llega poco del rubro buscado (${x.cumplen} de ${x.llegan}). Revisa el aviso (que muestre ese rubro) o afina los intereses.` : 'Está llegando el rubro buscado: mantener.';
  const productos = { nombre: 'Productos y rubros', titulo: `Productos y rubros · ${per.label}`, nota: 'Por modelo (todas las tallas juntas). Cantidad en la unidad del producto (metros o unidades: no sumar entre sí).', tablas: ultFiltro([
    { titulo: 'Lo que más se vendió', cols: [C('Producto'), C('Grupo'), C('Unidad'), C('Cantidad', 'dec'), C('Venta ($)', 'money', true), C('Venta a clientes nuevos ($)', 'money', true), C('Clientes', 'int')], filas: R.productos.slice(0, 60).map(x => [x.n, x.grupo, x.un, x.q, x.venta, x.ventaNuevos, x.clientes]), total: true },
    { titulo: 'Rubros que llegaron', nota: 'Clientes nuevos del período por rubro (por su nombre, comentario o segmento en la ficha de Manager).', cols: [C('Rubro'), C('Clientes nuevos', 'int', true), C('% de los nuevos', 'pct'), C('Lo que compraron ($)', 'money', true)], filas: R.rubros.map(x => [x.n, x.nuevos, R.nuevos ? x.nuevos / R.nuevos : null, x.venta]), total: true },
    { titulo: '¿Llega el rubro al que apunta cada campaña?', nota: 'Público configurado en Meta y clientes nuevos durante la campaña y 14 días después.', cols: [C('Campaña de Meta'), C('Tipo'), C('Invertido ($)', 'money', true), C('Público en Meta'), C('Rubro que busca'), C('Clientes nuevos', 'int'), C('Del rubro buscado', 'int'), C('Rubros que más llegaron'), C('Sugerencia')],
      filas: R.rubroCamp.map(x => [x.name, (INF_TIPO[x.tipo] || {}).n || x.tipo, x.gasto, x.abierto ? 'Abierto (automático de Meta)' : x.intereses, x.objetivo.length ? x.objetivo.join(', ') : '—', x.llegan, x.cumplen, x.top.slice(0, 3).map(([k, n]) => `${k} ${n}`).join(', '), sug(x)]), total: false },
    ...conTitulo(F['Qué vendieron a nuevos']).map(t => ({ ...t, filtro: true })),
  ]) };

  // ===== Campañas: inversión por mes contra clientes nuevos (lo que se abre al tocar «Invertido»); el servidor agrega abajo cada campaña por mes
  const tipos = Object.keys(INF_TIPO).filter(k => meses.some(m => gasto[m][k] > 0));
  const nM = m => vends.reduce((s, v) => s + T[v][m].n, 0), vM = m => vends.reduce((s, v) => s + T[v][m].venta, 0);
  const campanas = { nombre: 'Campañas', titulo: `Campañas · ${per.label}`, nota: 'Inversión de cada mes en Meta y Google contra los clientes nuevos que llegaron ese mes y lo que compraron. Más abajo, cada campaña por mes (toca el + de la izquierda para abrir cada mes).', tablas: [
    { titulo: 'Inversión por mes', cols: [C('Mes'), ...tipos.map(k => C(INF_TIPO[k].n + ' ($)', 'money', true)), C('Invertido ($)', 'money', true), C('Clientes nuevos', 'int', true), C('Venta a clientes nuevos ($)', 'money', true), C('Pesos por cada peso invertido', 'dec'), C('Inversión por cliente nuevo ($)', 'money')],
      filas: meses.map(m => [INF_MESL[+m.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase()) + ' ' + m.slice(0, 4), ...tipos.map(k => gasto[m][k]), gasto[m].total, nM(m), vM(m), gasto[m].total ? vM(m) / gasto[m].total : null, nM(m) ? gasto[m].total / nM(m) : null]), total: true },
  ] };

  const detalle = F['Detalle'] ? { ...F['Detalle'], nombre: 'Detalle de ventas' } : null;
  return [clientes, vendedores, productos, campanas, detalle].filter(Boolean);
}

// Lo que se manda al servidor para armar el Excel de un período (mismo cálculo que la pantalla + hojas del Excel de Manager)
function infCuerpoExcel(R) {
  const per = R.per;
  const pers = infPeriodos().filter(p => p.b <= per.b); const serie = pers.filter(p => p.tipo === 'quincena').slice(0, 8).reverse().map(p => { const d1 = parseDay(p.a), d2 = parseDay(p.b); return { periodo: `${d1.getDate()}–${d2.getDate()} ${INF_MES[d1.getMonth()]}`, ...infCalcularLiviano(p) }; });
  const meses = [...new Set(asList(infAds() && infAds().campaigns).flatMap(c => asList(c.daily).filter(x => x && x.date && Number(x.spent || 0) > 0).map(x => x.date.slice(0, 7))))].filter(m => m >= INF_DESDE.slice(0, 7) && m <= per.b.slice(0, 7)).sort().reverse();
  const campMeses = meses.map(m => ({ mes: m, label: INF_MESL[+m.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase()) + ' ' + m.slice(0, 4), camps: infCalcularCamps({ a: m + '-01', b: infIso(new Date(+m.slice(0, 4), +m.slice(5, 7), 0)) }) }));
  const hojas = infHojasExcel(per, R);
  const acum = infAcum(per.b);
  return JSON.stringify({ ...R, marca: INF.marca, marcaNombre: INF_MARCAS[INF.marca].nombre, alcance: infAlcance(), serie, campMeses, hojas, acum, vendedores: R.vend, generado: new Date().toISOString() }, (k, v) => v instanceof Set ? [...v] : v);
}

// Informes automáticos: cada quincena y cada mes cerrado (desde septiembre 2026, cuando partieron las campañas)
// se arma solo su Excel en k8-panel/informes/ la primera vez que se abre el panel después del cierre.
// El servidor los hace en fila, en segundo plano. Se espera 2 días después del cierre para que Manager tenga las ventas.
const INF_AUTO_DESDE = INF_DESDE;
async function infAutoGenerar() {
  if (INF.marca !== 'k8' || INF.autoHecho || !INF.m || !infAds()) return; INF.autoHecho = true;
  try {
    const hoy = todayIso(); const lim = infIso(new Date(parseDay(hoy).getTime() - 2 * 864e5));
    const lista = await (await fetch('/api/informes/lista')).json(); const hay = new Set(asList(lista.archivos).map(x => x.nombre));
    const falta = infPeriodos().filter(p => p.a >= INF_AUTO_DESDE && p.b <= lim && p.b <= INF.m.hasta && !hay.has(`Informe ventas y campañas K8 ${p.id}.xlsx`)).reverse();
    for (const p of falta) {
      const R = infCalcular(p);
      const r = await fetch('/api/informe/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: infCuerpoExcel(R) });
      const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error');
    }
    if (falta.length) { const ult = falta.map(p => p.b).sort().pop(); const per = { id: 'acumulado-desde-septiembre', tipo: 'acumulado', a: INF_DESDE, b: ult, label: `Todo desde septiembre hasta el ${infDay(ult)}` }; await fetch('/api/informe/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: infCuerpoExcel(infCalcular(per)) }); }
    if (falta.length) toast(`Armando ${falta.length} informe${falta.length > 1 ? 's' : ''} nuevo${falta.length > 1 ? 's' : ''} en segundo plano (${falta.map(p => p.label).join(', ')}). Quedan en k8-panel/informes.`);
  } catch (e) { console.warn('Informes automáticos:', e); }
}
PAGES.informes = route => route.sec === 'comparar' && typeof informesComparar === 'function' ? { title: 'Informes · K8 vs TLA', html: informesComparar(), mount: bindComparar } : { title: 'Informes · Ventas y campañas', html: informesVentas(), mount: bindInformes };
