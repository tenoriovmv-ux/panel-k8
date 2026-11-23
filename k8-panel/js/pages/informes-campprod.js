// ============================================================
// Informes › Campañas por producto (23-11-2026, Vicente): ¿subió la venta del producto que anunciaba la campaña?
// Del nombre de la campaña se saca el producto (FELPA_BUS → «FELPA», LONETA_ASPEN → «LONETA ASPEN», dallas → «DALLAS»).
// Si no calza, se puede escribir a mano (queda guardado). Se compara la venta de ese producto en la sucursal de la
// marca (todos los vendedores): durante la campaña y 7 días después, contra los mismos días justo antes; y los 3 meses previos.
// ============================================================
'use strict';

const CP_STOP = new Set(['NUEVA', 'CAMPANA', 'DE', 'DEL', 'LA', 'EL', 'VENTA', 'VENTAS', 'VENT', 'BUS', 'PROMO', 'REGALO', 'REGALOO', 'INTERA', 'ULTIMO', 'STOCK', 'STOCKK', 'TLA', 'PINTANA', 'RECONOCIMIENTO', 'TRAFICO', 'MENSAJES', 'WHATSAPP', 'COPIA', 'EEUU', 'TELAS', 'CHILE', 'LOCAL', 'SHOWROOM', 'DARDIGNAC', 'VISITAS', 'MARKETPLACE', 'JORGE', 'OFERTA', 'OFERTAS', 'PACK', 'PACKS', 'NUEVOS', 'NUEVO', 'RUBROS', 'BIENVENIDA', 'INCORPORA', 'TIENDA', 'PARA', 'EMPRESAS', 'UNIDAD', 'WEB', 'BUSQUEDA', 'ROPA', 'TRABAJO', 'GORRO', 'CON', 'LOS', 'LAS', 'TUS', 'POR']);
const cpNorm = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const cpTokens = name => cpNorm(name).split(/[^A-Z0-9]+/).filter(t => t.length >= 3 && !/\d/.test(t) && !CP_STOP.has(t));
const cpStem = t => t.length >= 6 ? t.slice(0, 5) : t.replace(/S$/, '');
function cpLineas() { const M = INF.m; if (!M) return []; if (M._cpP !== M.lineas.length) { for (const l of M.lineas) l._P = cpNorm(l.prod); M._cpP = M.lineas.length; } return M.lineas; }
function cpMatcher(kw) { const toks = cpNorm(kw).split(/\s+/).filter(Boolean).map(cpStem); return toks.length ? (P => toks.every(t => P.includes(t))) : null; }
function cpAuto(name) {   // el producto más largo que calce con ventas reales; si no, va quitando palabras del final
  // prueba grupos de palabras seguidas, de los más largos a los más cortos («LONETA ASPEN», luego «LONETA», «ASPEN»…)
  const ls = cpLineas(); const toks = cpTokens(name);
  for (let n = toks.length; n >= 1; n--) for (let i = 0; i + n <= toks.length; i++) {
    const kw = toks.slice(i, i + n).join(' '); const f = cpMatcher(kw); if (f && ls.some(l => f(l._P))) return kw;
  }
  return '';
}
function cpVenta(f, a, b) { let v = 0, q = 0; const cl = new Set(); for (const l of cpLineas()) { if (l.f < a || l.f > b || !f(l._P)) continue; v += l.neto; q += l.q; if (l.rut) cl.add(l.rut); } return { v, q, cl: cl.size }; }
const cpMas = (iso, d) => infIso(new Date(parseDay(iso).getTime() + d * 864e5));

function ivCampProd(R) {
  const ads = infAds(); if (!ads || !INF.m) return '';
  const manual = Store.read('camp_prod_' + INF.marca, {}) || {};
  const hasta = INF.m.hasta || todayIso();
  const camps = asList(ads.campaigns).map(c => { const d = asList(c.daily).filter(x => x && Number(x.spent || 0) > 0).map(x => x.date).sort(); return { name: c.name, a: d[0], b: d[d.length - 1], gasto: asList(c.daily).reduce((s, x) => s + Number(x && x.spent || 0), 0) }; })
    .filter(c => c.a && c.b >= R.a && c.a <= R.b).sort((x, y) => y.a.localeCompare(x.a));
  if (!camps.length) return '';
  const filas = camps.map(c => {
    const kw = manual[c.name] != null ? manual[c.name] : cpAuto(c.name); const f = kw ? cpMatcher(kw) : null;
    if (!f) return { c, kw };
    const fin = cpMas(c.b, 7) > hasta ? hasta : cpMas(c.b, 7); const dias = Math.max(1, daysBetween(c.a, fin) + 1);
    const con = cpVenta(f, c.a, fin), antes = cpVenta(f, cpMas(c.a, -dias), cpMas(c.a, -1));
    const m0 = c.a.slice(0, 7); const meses = [];
    for (let i = 3; i >= 0; i--) { const d = parseDay(m0 + '-01'); d.setMonth(d.getMonth() - i); const a = infIso(d), b = infIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); meses.push({ m: a.slice(0, 7), cur: i === 0, ...cpVenta(f, a, b > hasta ? hasta : b), parcial: b > hasta }); }
    return { c, kw, con, antes, dias, meses, curso: cpMas(c.b, 7) > hasta, hasta };
  });
  const pct = (x, y) => y ? Math.round((x - y) / Math.abs(y) * 100) : null;
  const flecha = (p, v) => p == null ? `<span class="cp-delta${v > 0 ? ' up' : ''}">${v > 0 ? 'antes no se vendía' : 'sin ventas'}</span>` : `<span class="cp-delta ${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${Math.abs(p)}%</span>`;
  const uni = q => fmtInt(Math.round(q));
  return `<div class="ivx-card cp-card" style="margin-bottom:14px">
    <datalist id="cp-prod-list">${cpSugerencias().map(s => `<option value="${esc(s)}">`).join('')}</datalist>
    <div class="ivx-canal-h"><span class="ivx-canal-ic">${ICON.mega(15)}</span><div><b>Campañas por producto</b><div class="xs muted">¿Subió la venta del producto que anunciaba cada campaña? Venta en ${esc(infAlcance().toLowerCase())}, todos los vendedores. «Con campaña» = sus días + 7 días después; «Antes» = los mismos días justo antes.</div></div></div>
    ${filas.map(x => { const c = x.c;
      const kwInput = `<form class="cp-kw" data-campform="${esc(c.name)}" title="Producto que se busca en las ventas (puedes cambiarlo)">${ICON.search(12)}<input data-campkw="${esc(c.name)}" list="cp-prod-list" value="${esc(x.kw || '')}" placeholder="escribe el producto…" autocomplete="off"><button type="submit" class="cp-ok" title="Buscar este producto">Aplicar</button><span class="cp-hint"></span></form>`;
      const head = `<div class="cp-h"><b>${esc(c.name)}</b><span class="xs muted">${infDay(c.a)} al ${infDay(c.b)} · invertido ${infMill(c.gasto)}</span>${kwInput}</div>`;
      if (!x.con) return `<div class="cp-fila">${head}<div class="xs muted" style="padding:2px 0 4px">No se reconoce el producto: escribe cuál anunciaba (por ejemplo «felpa» o «lino dallas»).</div></div>`;
      const p = pct(x.con.v, x.antes.v); const mx = Math.max(1, ...x.meses.map(m => m.v));
      const extra = x.con.v > x.antes.v && c.gasto ? ((x.con.v - x.antes.v) / c.gasto).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' x' : '—';
      const aviso = x.curso ? `<div class="cp-curso">En curso: el Power BI trae ventas hasta el ${infDay(x.hasta)}, así que la comparación todavía no es completa.</div>` : '';
      return `<div class="cp-fila">${head}${aviso}
        <div class="cp-cuerpo">
          <div class="cp-vs"><div><span class="xs muted">Antes (${x.dias} días)</span><b>${infMill(x.antes.v)}</b><span class="xs muted">${uni(x.antes.q)} unid. · ${x.antes.cl} clientes</span></div>
            <div class="cp-flecha">${flecha(p, x.con.v)}</div>
            <div><span class="xs muted">Con campaña (${x.dias} días)</span><b>${infMill(x.con.v)}</b><span class="xs muted">${uni(x.con.q)} unid. · ${x.con.cl} clientes</span></div>
            <div class="cp-roi"><span class="xs muted">Venta extra por cada $1</span><b>${extra}</b></div></div>
          <div class="cp-meses">${x.meses.map(m => `<div class="${m.cur ? 'cur' : ''}" title="${INF_MESL[+m.m.slice(5, 7) - 1]}: ${fmtMoney(m.v)} · ${uni(m.q)} unidades${m.parcial ? ' (mes en curso)' : ''}"><i style="height:${Math.max(m.v > 0 ? 6 : 2, Math.round(m.v / mx * 100))}%"></i><b>${infMill(m.v)}</b><span>${INF_MES[+m.m.slice(5, 7) - 1]}${m.cur ? ' ★' : ''}</span></div>`).join('')}</div>
        </div></div>`; }).join('')}
    <div class="xs muted" style="margin-top:8px">★ = mes en que partió la campaña; las otras barras son los 3 meses anteriores. «Venta extra por cada $1» = (venta con campaña − venta antes) ÷ invertido. Si el producto detectado no es el correcto, cámbialo en el buscador de esa campaña.</div></div>`;
}
// Productos para sugerir al escribir: la «familia» de cada producto (sus primeras palabras, sin medidas ni colores), por venta
function cpSugerencias() {
  const M = INF.m; if (!M) return []; if (M._cpSug) return M._cpSug;
  const v = {}; for (const l of cpLineas()) { const w = l._P.split(/[^A-Z]+/).filter(x => x.length >= 3); if (!w.length) continue; for (const k of [w[0], w.slice(0, 2).join(' ')]) v[k] = (v[k] || 0) + Math.max(0, l.neto); }
  return (M._cpSug = Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, 400).map(([k]) => k));
}
// Cuántos productos distintos calzan con lo escrito (se muestra mientras se escribe)
function cpCuantos(kw) { const f = kw ? cpMatcher(kw) : null; if (!f) return null; const p = new Set(); for (const l of cpLineas()) if (f(l._P)) p.add(l._P); return p.size; }
function ivBindCampProd(el) {
  const card = $('.cp-card', el); if (!card) return;
  const aplicar = (name, valor) => {
    const k = 'camp_prod_' + INF.marca; const m = Store.read(k, {}) || {};
    if (valor) m[name] = valor; else delete m[name];   // vacío = vuelve al producto que se detecta solo
    Store.write(k, m);
    // se redibuja solo esta tarjeta: la página no se mueve
    const R = INF.last; if (!R) return; const tmp = document.createElement('div'); tmp.innerHTML = ivCampProd(R).trim();
    const nuevo = tmp.firstElementChild; const actual = $('.cp-card', el); if (!nuevo || !actual) return;
    actual.replaceWith(nuevo); ivBindCampProd(el);
    const fila = [...$$('.cp-fila', el)].find(x => x.querySelector(`[data-campform="${CSS.escape(name)}"]`));
    if (fila) { fila.classList.add('cp-flash'); setTimeout(() => fila.classList.remove('cp-flash'), 1200); }
  };
  $$('[data-campform]', card).forEach(fm => {
    const inp = $('input', fm), hint = $('.cp-hint', fm);
    const pista = () => { const n = cpCuantos(inp.value.trim()); hint.textContent = !inp.value.trim() ? '' : n ? `${n} producto${n === 1 ? '' : 's'}` : 'sin ventas'; hint.className = 'cp-hint' + (n ? ' ok' : inp.value.trim() ? ' no' : ''); };
    inp.oninput = pista;
    fm.onsubmit = e => { e.preventDefault(); aplicar(fm.dataset.campform, inp.value.trim()); };
  });
}