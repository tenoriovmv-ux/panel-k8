// ============================================================
// Informes · vista (diseño de referencia de Vicente, 19-11: negro, acento lima, cifras grandes con "$" chico,
// barras y avatares bajo cada cifra, filtros en píldoras, panel claro con lista + detalle oscuro).
// Solo arma HTML; los números salen de infCalcular / infAcum (informes.js).
// ============================================================
'use strict';

// Número grande: "$" y unidad chicos, cifra grande
function ivNum(v, money = true) {
  v = Number(v || 0); let n, u = '';
  if (money && Math.abs(v) >= 1e6) { n = (v / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }); u = ' M'; }
  else if (money && Math.abs(v) >= 1e4) { n = Math.round(v / 1e3).toLocaleString('es-CL'); u = ' mil'; }
  else n = Math.round(v).toLocaleString('es-CL');
  return `${money ? '<small>$</small>' : ''}${n}${u ? `<small>${u}</small>` : ''}`;
}
const ivIni = n => String(n || '?').split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
const ivAvatar = (cod, extra = '') => { const v = INF_VEND[cod] || { n: cod, c: '#9CA3AF' }; return `<span class="ivx-avt" style="--c:${v.c}" title="${esc(v.n)}${extra ? ' · ' + esc(extra) : ''}">${ivIni(v.n)}</span>`; };
// Barra segmentada (como la línea de tiempo de la referencia)
function ivBar(parts) {
  const tot = parts.reduce((s, p) => s + Math.max(0, p.v), 0);
  if (!tot) return '<div class="ivx-bar"><i style="flex:1;background:var(--line)"></i></div>';
  return `<div class="ivx-bar">${parts.filter(p => p.v > 0).map(p => `<i style="flex:${p.v};background:${p.c}" title="${esc(p.l)}"></i>`).join('')}</div>`;
}

// ---------- Encabezado y períodos en píldoras ----------
function ivHead(pers, per) {
  const meses = pers.filter(p => p.tipo === 'mes').slice().reverse();
  const mesSel = per.tipo === 'acumulado' ? '' : per.id.slice(0, 7);
  const qs = mesSel ? pers.filter(p => p.id.startsWith(mesSel) && p.tipo === 'quincena').reverse() : [];
  const hoy = todayIso();
  const desc = INF.marca === 'tla' ? 'Telas Casa Matriz y Showroom TLA · lo invertido en Meta (cuenta de TLA) cruzado con lo que venden Krishna, Moira y Gabriel.' : 'Solo local Dardignac · lo invertido en Meta y Google cruzado con lo que venden Zorangie (antes Gabriel) por WhatsApp y Alberto y Catalina (antes Úrsula) en la sala.';
  return `${ivMarcas()}<div class="ivx-top"><div><h1 class="ivx-h1">Ventas y campañas</h1>
      <p class="muted sm">${desc}</p></div>
    <div class="actions">${ivActualizarHtml()}<button class="btn primary ivx-pill" id="inf-excel">${ICON.download(14)} Exportar Excel</button></div></div>
    <div class="ivx-filtros">
      <div class="ivx-seg">${[pers.find(p => p.tipo === 'acumulado'), ...meses].filter(Boolean).map(p => { const on = p.tipo === 'acumulado' ? per.tipo === 'acumulado' : mesSel === p.id; const lbl = p.tipo === 'acumulado' ? 'Desde septiembre' : INF_MESL[+p.id.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase()); return `<button class="${on ? 'on' : ''}" data-infper="${p.id}">${lbl}${p.tipo === 'mes' && p.b >= hoy ? ' <span class="ivx-dot" title="Mes en curso"></span>' : ''}</button>`; }).join('')}</div>
      ${mesSel ? `<div class="ivx-seg sm">${[pers.find(p => p.id === mesSel), ...qs].filter(Boolean).map(p => `<button class="${per.id === p.id ? 'on' : ''}" data-infper="${p.id}">${p.tipo === 'mes' ? 'Mes completo' : p.id.endsWith('q1') ? '1 al 15' : '16 al ' + p.b.slice(8)}</button>`).join('')}</div>` : ''}
      <span class="spacer"></span><span class="xs muted">${esc(per.label)}</span>
    </div>`;
}

// ---------- Menú de marcas (20-11): K8 y Textil Las Américas, cada una con su informe ----------
function ivMarcas() {
  return `<div class="ivx-marcas" role="tablist">${Object.entries(INF_MARCAS).map(([k, m]) => `<button class="ivx-marca${INF.marca === k ? ' on' : ''}" data-infmarca="${k}" role="tab" aria-selected="${INF.marca === k}"><img src="${m.logo}" alt=""><span><b>${esc(m.nombre)}</b><small>${esc(m.alcance)}</small></span></button>`).join('')}</div>`;
}
// TLA: en vez de los canales de K8 (WhatsApp / local), lo que vendió cada sucursal en el período
function ivSucursales(R) {
  const M = INF.m; if (!M) return '';
  const enP = f => f && f >= R.a && f <= R.b; const cli = {}; for (const c of M.clientes) cli[c.rut] = c;
  const per = R.per.tipo === 'acumulado' ? 'Total desde el 1 de septiembre' : R.per.label;
  const fila = s => { const ls = M.lineas.filter(l => l.suc === s && enP(l.f) && INF_VEND[l.vend]); const nuevos = ls.filter(l => cli[l.rut] && enP(cli[l.rut].primera_tla));
    return { s, venta: ls.reduce((t, l) => t + l.neto, 0), ventaN: nuevos.reduce((t, l) => t + l.neto, 0), n: new Set(nuevos.map(l => l.rut)).size, cl: new Set(ls.filter(l => l.rut && !/CLIENTE CON BOLETA/i.test(l.cli)).map(l => l.rut)).size, docs: new Set(ls.filter(l => l.doc !== 'NCV').map(l => l.doc + l.folio)).size }; };
  const xs = INF_MARCAS.tla.sucs.map(fila); const col = { 'TELAS CASA MATRIZ': '#4C8DFF', 'SHOWROOM TLA': '#2DD4BF' };
  return `<div class="ivx-row2">${xs.map(x => `<div class="ivx-card ivx-canal" style="--cc:${col[x.s] || INF_C}">
      <div class="ivx-canal-h"><span class="ivx-canal-ic">${ICON.pin(15)}</span><div><b>${esc(x.s.replace(/\b\w+/g, w => w.charAt(0) + w.slice(1).toLowerCase()).replace('Tla', 'TLA'))}</b><div class="xs muted">${fmtInt(x.cl)} clientes con RUT · ${fmtInt(x.docs)} documentos</div></div><span class="ivx-per">${esc(per)}</span></div>
      <div class="grid g3" style="gap:10px">${kpi('Venta total', infMill(x.venta), '')}${kpi('Clientes nuevos', fmtInt(x.n), '')}${kpi('Venta a clientes nuevos', infMill(x.ventaN), x.venta ? Math.round(x.ventaN / x.venta * 100) + '% de su venta' : '')}</div></div>`).join('')}</div>`;
}
// ---------- Franja del acumulado (cuando se mira un mes o quincena) ----------
function ivAcumLinea(R) {
  if (R.per.tipo === 'acumulado') return '';
  const A = infAcum(); if (!A) return '';
  const it = (que, lbl, val) => `<button class="ivx-acum-it" data-infdet="${que}|${A.a}|${A.b}"><span>${lbl}</span><b>${val}</b></button>`;
  return `<div class="ivx-acum"><span class="ivx-acum-t">Desde el 1 sep</span>${it('gasto', 'Invertido', infMill(A.gasto))}${it('ventaTotal', 'Venta total', infMill(A.ventaTotal))}${it('ventaNuevos', 'Venta a nuevos', infMill(A.ventaNuevos))}${it('nuevos', 'Clientes nuevos', fmtInt(A.nuevos))}${it('recuperados', 'Recuperados', `${fmtInt(A.recupN)} · ${infMill(A.recupVenta)}`)}<span class="ivx-acum-x">${A.retorno ? A.retorno.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' x' : ''}</span></div>`;
}

// ---------- Bloque principal: 4 cifras + panel lateral ----------
function ivHero(R) {
  const V = R.vend.filter(v => !v.sinCodigo);
  const tipos = Object.entries(INF_TIPO).map(([k, t]) => ({ l: `${t.n}: ${infMill(R.gasto[k] || 0)}`, v: R.gasto[k] || 0, c: t.c, n: t.n.split(' ')[0] }));
  const metr = (que, lbl, num, sub, parts, pie) => `<div class="ivx-m" data-infdet="${que}|${R.a}|${R.b}" title="Toca para ver el detalle por vendedor y mes">
      <div class="ivx-lbl">${lbl}<span class="ivx-go">${ICON.chevR(12)}</span></div><div class="ivx-num">${num}</div><div class="ivx-sub">${sub}</div>${ivMeses(R.a, R.b, que)}${ivBar(parts)}<div class="ivx-pie">${pie}</div></div>`;
  const avs = (key) => V.filter(v => v[key] > 0).sort((x, y) => y[key] - x[key]).slice(0, 6).map(v => ivAvatar(v.cod, key.startsWith('venta') ? infMill(v[key]) : fmtInt(v[key]))).join('');
  const venta = R.ventaTotal || 0;
  const top = V.filter(v => v.venta > 0).sort((x, y) => y.venta - x.venta);
  return `<div class="ivx-hero">
    <div class="ivx-card ivx-big">
      ${metr('gasto', 'Invertido', ivNum(R.gasto.total), (INF.marca === 'tla' ? `Meta (cuenta DECO TLA) · ${R.camps.length} campañas` : `Meta ${infMill(R.gasto.total - R.gasto.google)} · Google ${infMill(R.gasto.google)}`), tipos, tipos.filter(t => t.v > 0).map(t => `<span class="ivx-tag"><i style="background:${t.c}"></i>${esc(t.n)}</span>`).join(''))}
      ${metr('ventaNuevos', 'Venta a clientes nuevos', ivNum(R.ventaNuevos), R.retorno ? `<b class="ivx-lime">${R.retorno.toLocaleString('es-CL', { maximumFractionDigits: 1 })} x</b> lo invertido` : 'sin inversión en el período', V.map(v => ({ l: `${v.n}: ${infMill(v.ventaNuevos)}`, v: v.ventaNuevos, c: v.c })), avs('ventaNuevos'))}
      ${metr('nuevos', 'Clientes nuevos', ivNum(R.nuevos, false), `${R.costoNuevo ? infMill(R.costoNuevo) + ' por cliente' : '—'} · ${fmtInt(R.nuevosRecompra)} ya volvieron`, V.map(v => ({ l: `${v.n}: ${v.nuevos}`, v: v.nuevos, c: v.c })), avs('nuevos'))}
      ${metr('recuperados', 'Clientes recuperados', ivNum(R.recup.n, false), `${infMill(R.recup.venta)} · llevaban +12 meses sin comprar`, V.map(v => ({ l: `${v.n}: ${v.recup || 0}`, v: v.recup || 0, c: v.c })), avs('recup'))}
    </div>
    <div class="ivx-card ivx-side" data-infdet="ventaTotal|${R.a}|${R.b}" title="Toca para ver el detalle por vendedor y mes">
      <div class="ivx-lbl">${INF.marca === 'tla' ? 'Venta total' : 'Venta total del local'}<span class="ivx-go">${ICON.chevR(12)}</span></div>
      <div class="ivx-num">${ivNum(venta)}</div>
      <div class="ivx-sub">${fmtInt(R.clientes.length)} clientes con RUT · ${fmtInt(R.cot.n)} cotizaciones</div>
      <div class="ivx-stack">${top.slice(0, 4).map((v, i) => `<div class="ivx-mini${i === 0 ? ' hi' : ''}"><span class="xs">${esc(v.n.split(' ')[0])}</span><b>${infMill(v.venta)}</b><span class="xs">${venta ? Math.round(v.venta / venta * 100) : 0}%</span></div>`).join('') || '<div class="xs muted">Sin ventas en el período</div>'}</div>
    </div>
  </div>`;
}

// ---------- Clientes: panel claro con lista y detalle ----------
function ivClientes(R, titulo = 'Clientes del período') {
  const { tabs, cur, lista } = ivListaClientes(R);

  const sel = lista.find(c => c.rut === INF.cliSel) || lista[0];
  const tipoCorto = c => c.tipo === 'nuevo' ? 'Nuevo' : c.tipo === 'nuevo_volvio' ? 'Volvió' : c.recup ? 'Recuperado' : 'Cartera';
  const fila = c => `<button class="ivx-row${sel && c.rut === sel.rut ? ' on' : ''}" data-infcli="${esc(c.rut)}">
      ${ivAvatar(c.vendCod)}<span class="ivx-row-n"><b>${esc(c.cli || c.rut)}</b><span>${esc(c.rut)} · ${c.ultCompra ? 'compró ' + infDay(c.ultCompra) : ''}</span></span>
      <span class="ivx-chip${c.estado === 'Toca seguimiento' ? ' warn' : ''}">${c.estado === 'Toca seguimiento' ? 'Seguir' : tipoCorto(c)}</span><b class="ivx-row-m">${fmtMoney(c.venta)}</b></button>`;
  const tel = sel ? String(sel.tel || '').replace(/\D/g, '') : '';
  const det = sel ? `<div class="ivx-det">
      <div class="ivx-det-head"><div><div class="ivx-lbl">Cliente</div><div class="ivx-det-n">${esc(sel.cli || sel.rut)}</div><div class="xs muted">${esc(sel.rut)}${sel.comuna ? ' · ' + esc(sel.comuna) : ''}${sel.rubro ? ' · ' + esc(sel.rubro) : ''}</div></div>
        <div class="ivx-det-v">${ivAvatar(sel.vendCod)}<div>${sel.ultVend ? `<span class="xs muted">${sel.nVend > 1 ? 'Último en venderle' : 'Le vende'}</span><b class="sm" style="display:block">${esc(sel.ultVend)}${sel.ultVendF ? ` · ${infDay(sel.ultVendF)}` : ''}</b>${sel.nVend > 1 ? `<div class="xs muted">También: ${esc(sel.vend.split(', ').filter(n => n !== sel.ultVend).join(', '))}</div>` : ''}` : `<b class="sm">${esc(sel.vend || '—')}</b>`}<div class="xs muted">${esc(sel.tipoTxt)}</div></div></div></div>
      <div class="ivx-det-cards">
        <div class="ivx-dc"><span class="xs muted">Venta del período</span><b>${fmtMoney(sel.venta)}</b></div>
        <div class="ivx-dc"><span class="xs muted">Cotizado</span><b>${sel.cotMonto ? fmtMoney(sel.cotMonto) : '—'}</b></div>
        <div class="ivx-dc"><span class="xs muted">Nota de venta</span><b>${sel.nvMonto ? fmtMoney(sel.nvMonto) : '—'}</b></div>
      </div>
      <div class="ivx-det-grid">
        <div><span>Primera compra en TLA</span><b>${sel.primera ? infDay(sel.primera) + ' ' + sel.primera.slice(0, 4) : '—'}</b></div>
        <div><span>Compras</span><b>${fmtInt(sel.compras)}${sel.cada ? ` · cada ${sel.cada} días` : ''}</b></div>
        <div><span>Último contacto</span><b>${infDay(sel.ultContacto)}</b></div>
        <div><span>Próximo contacto</span><b class="${sel.estado === 'Toca seguimiento' ? 'ivx-warn' : ''}">${sel.prox ? infDay(sel.prox) : '—'} · ${esc(sel.estado)}</b></div>
        <div><span>Email</span><b>${sel.email ? esc(sel.email) : '—'}</b></div>
        <div><span>WhatsApp</span><b>${sel.wa ? esc(sel.wa) : 'sin chat'}</b></div>
      </div>
      <div class="ivx-det-foot"><span class="xs muted">Seguir cada ${sel.seguirCada} días</span><span class="spacer"></span>${tel.length >= 8 ? `<a class="btn primary ivx-pill" href="https://wa.me/${tel.length === 8 ? '569' + tel : tel.length === 9 ? '56' + tel : tel}" target="_blank" rel="noopener">${ICON.msg(14)} Escribir por WhatsApp</a>` : '<span class="xs muted">Sin teléfono en Manager</span>'}</div>
    </div>` : `<div class="ivx-det">${empty('Sin clientes en esta lista')}</div>`;
  return `<div class="ivx-light">
    <div class="ivx-light-head"><b>${esc(titulo)}</b>
      <div class="ivx-seg dark">${tabs.map(t => `<button class="${t[0] === cur[0] ? 'on' : ''}" data-infctab="${t[0]}">${t[1]} <span class="ivx-n">${t[2].length}</span></button>`).join('')}</div>
      <span class="spacer"></span><button class="ivx-dl" id="inf-cli-xls" title="Descargar esta lista en Excel">${ICON.download(14)} Excel</button><input class="ivx-search" id="inf-q" placeholder="Buscar cliente, RUT, vendedor…" value="${esc(INF.q)}"></div>
    <div class="ivx-light-body">
      <div class="ivx-list">${lista.slice(0, 120).map(fila).join('') || '<div class="xs" style="padding:18px;color:#6B7280">Sin clientes en esta lista</div>'}${lista.length > 120 ? `<div class="xs" style="padding:10px;color:#6B7280">y ${lista.length - 120} más (todos van en el Excel)</div>` : ''}</div>
      ${det}
    </div>
    <div class="xs" style="color:#6B7280;margin-top:10px">Seguimiento sugerido: nuevos cada ${R.cadencia.nuevos} días y cartera cada ${R.cadencia.cartera} días (o cada cuánto compra ese cliente). Contactado = mensaje de WhatsApp, cotización o compra.</div>
  </div>`;
}

// Desglose por mes bajo cada cifra (solo cuando el período abarca más de un mes)
function ivCoh(a, b) { const key = a + '|' + b + '|' + (INF.m && INF.m.cargado); if (!INF._coh || INF._coh.key !== key) INF._coh = { key, C: infCohortes(a, b) }; return INF._coh.C; }
function ivMeses(a, b, que) {
  if (a.slice(0, 7) === b.slice(0, 7)) return '';
  const C = ivCoh(a, b); const vs = Object.keys(C.T);
  const val = m => que === 'gasto' ? C.gasto[m].total : que === 'ventaNuevos' ? vs.reduce((s, v) => s + C.T[v][m].venta, 0) : que === 'nuevos' ? vs.reduce((s, v) => s + C.T[v][m].n, 0) : new Set(vs.flatMap(v => [...C.T[v][m].rec])).size;
  const xs = C.meses.map(m => ({ m, v: val(m) })); const mx = Math.max(1, ...xs.map(x => x.v));
  const fmt = v => que === 'gasto' || que === 'ventaNuevos' ? infMill(v) : fmtInt(v);
  // Subió o bajó contra el mes anterior (20-11, Vicente). Si el mes va en curso, se compara con los MISMOS DÍAS del mes anterior
  // (1 al 19 nov contra 1 al 19 oct), si no siempre parecería que bajó.
  const hasta = INF.m && INF.m.hasta && INF.m.hasta < b ? INF.m.hasta : b;
  const delta = i => {
    if (!i) return '<em></em>';
    const m = xs[i].m, pm = xs[i - 1].m, finMes = infIso(new Date(+m.slice(0, 4), +m.slice(5, 7), 0));
    let prev = xs[i - 1].v, ref = `${INF_MESL[+pm.slice(5, 7) - 1]} completo`;
    if (hasta < finMes) {   // mes en curso: mismos días del mes anterior
      const dia = Math.min(+hasta.slice(8, 10), new Date(+pm.slice(0, 4), +pm.slice(5, 7), 0).getDate());
      const pb = `${pm}-${String(dia).padStart(2, '0')}`; const C2 = ivCohRango(`${pm}-01`, pb); const v2 = Object.keys(C2.T);
      prev = que === 'gasto' ? C2.gasto[pm].total : que === 'ventaNuevos' ? v2.reduce((s, v) => s + C2.T[v][pm].venta, 0) : que === 'nuevos' ? v2.reduce((s, v) => s + C2.T[v][pm].n, 0) : new Set(v2.flatMap(v => [...C2.T[v][pm].rec])).size;
      ref = `1 al ${dia} de ${INF_MESL[+pm.slice(5, 7) - 1]} (mismos días)`;
    }
    const cur = xs[i].v; const p = prev ? Math.round((cur - prev) / prev * 100) : null;
    const dir = cur > prev ? 'up' : cur < prev ? 'down' : 'eq';
    const txt = p == null ? (cur ? 'nuevo' : '—') : `${dir === 'up' ? '▲' : dir === 'down' ? '▼' : '='} ${Math.abs(p) > 999 ? '+999' : Math.abs(p)}%`;
    return `<em class="${dir}${que === 'gasto' ? ' neutro' : ''}" title="${esc(`Contra ${ref}: ${fmt(prev)}`)}">${txt}</em>`;
  };
  const ult = xs[xs.length - 1].m, ultFin = infIso(new Date(+ult.slice(0, 4), +ult.slice(5, 7), 0));
  const nota = xs.length > 1 && hasta < ultFin ? `<div class="ivx-mes-nota">${INF_MESL[+ult.slice(5, 7) - 1].slice(0, 3)} en curso: vs 1–${+hasta.slice(8, 10)} ${INF_MESL[+xs[xs.length - 2].m.slice(5, 7) - 1].slice(0, 3)}</div>` : '';
  return `<div class="ivx-meses">${xs.map((x, i) => `<div class="ivx-mes"><span>${INF_MESL[+x.m.slice(5, 7) - 1].slice(0, 3)}</span><i><u style="width:${Math.round(x.v / mx * 100)}%"></u></i><b>${fmt(x.v)}</b>${delta(i)}</div>`).join('')}${nota}</div>`;
}
// Cohortes de un rango corto (para comparar el mes en curso con los mismos días del mes anterior); con su propio caché
function ivCohRango(a, b) { const key = a + '|' + b + '|' + (INF.m && INF.m.cargado); INF._coh2 = INF._coh2 || {}; return INF._coh2[key] || (INF._coh2[key] = infCohortes(a, b)); }
// Pestañas, cliente y búsqueda: se cambia solo el panel de clientes (sin redibujar la página ni moverla arriba)
function ivBindClientes(el, getR, titulo) {
  const bind = root => {
    $$('[data-infctab]', root).forEach(b => b.onclick = e => { e.preventDefault(); INF.ctab = b.dataset.infctab; INF.cliSel = null; upd(false); });
    $$('[data-infcli]', root).forEach(b => b.onclick = e => { e.preventDefault(); INF.cliSel = b.dataset.infcli; upd(true); });
    const x = $('#inf-cli-xls', root); if (x) x.onclick = () => ivDescargarLista(getR(), titulo, x);
    const q = $('#inf-q', root); if (q) q.oninput = ev => { INF.q = ev.target.value; clearTimeout(INF._t); INF._t = setTimeout(() => { upd(false); const n = $('#inf-q', el); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
  };
  const upd = mismaLista => {
    const old = $('.ivx-light', el); const R = getR(); if (!old || !R) return;
    const sc = mismaLista ? ($('.ivx-list', old) || {}).scrollTop || 0 : 0;
    const tmp = document.createElement('div'); tmp.innerHTML = ivClientes(R, titulo).trim(); const nuevo = tmp.firstElementChild;
    old.replaceWith(nuevo); const l = $('.ivx-list', nuevo); if (l) l.scrollTop = sc;
    bind(nuevo);
  };
  bind(el);
}
// ---------- Canales (WhatsApp y local): el período elegido, con el desglose de cada mes debajo ----------
function ivMesesPer(a, b) {
  const key = a + '|' + b + '|' + (INF.m && INF.m.cargado);
  if (INF._mp && INF._mp.key === key) return INF._mp.v;
  const out = []; for (let d = parseDay(a.slice(0, 7) + '-01'); infIso(d) <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const x = infIso(d) < a ? a : infIso(d), fin = infIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)), y = fin > b ? b : fin;
    out.push({ m: infIso(d).slice(0, 7), R: infCalcular({ id: 'm', tipo: 'mes', a: x, b: y, label: '' }) });
  }
  INF._mp = { key, v: out }; return out;
}
function ivCanales(R) {
  const varios = R.a.slice(0, 7) !== R.b.slice(0, 7); const MS = varios ? ivMesesPer(R.a, R.b) : [];
  const per = R.per.tipo === 'acumulado' ? 'Total desde el 1 de septiembre' : R.per.label;
  const meses = (canal, k, money) => { if (!varios) return ''; const xs = MS.map(x => ({ m: x.m, v: x.R.canal[canal][k] || 0 })); const mx = Math.max(1, ...xs.map(x => x.v));
    return `<div class="ivx-meses">${xs.map(x => `<div class="ivx-mes"><span>${INF_MESL[+x.m.slice(5, 7) - 1].slice(0, 3)}</span><i><u style="width:${Math.round(x.v / mx * 100)}%"></u></i><b>${money ? infMill(x.v) : fmtInt(x.v)}</b></div>`).join('')}</div>`; };
  const m = (lbl, val, sub, canal, k, money) => `<div class="ivx-cm"><div class="ivx-lbl">${lbl}</div><div class="ivx-num sm">${val}</div><div class="ivx-sub">${sub}</div>${meses(canal, k, money)}</div>`;
  const w = R.canal.whatsapp, l = R.canal.local;
  return `<div class="ivx-row2">
    <div class="ivx-card ivx-canal" style="--cc:#25D366">
      <div class="ivx-canal-h"><span class="ivx-canal-ic">${ICON.msg(15)}</span><div><b>Ventas digitales · WhatsApp</b><div class="xs muted">${w.zorangie ? 'Zorangie desde el 12 nov (antes Gabriel)' : 'Gabriel'} · campañas de venta y clientes potenciales</div></div><span class="ivx-per">${esc(per)}</span></div>
      <div class="ivx-cms">
        ${m('Invertido', ivNum(w.gasto), `${fmtInt(w.conv)} conversaciones según Meta`, 'whatsapp', 'gasto', true)}
        ${m('Chats nuevos', ivNum(w.chatsNuevos, false), `${fmtInt(w.chats)} escribieron`, 'whatsapp', 'chatsNuevos', false)}
        ${m('Venta facturada en el local', ivNum(w.venta), `${fmtInt(w.nuevos)} clientes nuevos captados`, 'whatsapp', 'venta', true)}
      </div>
      <div class="xs muted" style="margin-top:12px">${w.zorangie ? 'Zorangie factura con su código ZRM desde el 19 nov. ' : ''}Clientes nuevos con su teléfono en un chat anterior a la compra: <b>${fmtInt(R.nuevosWa)}</b> (${infMill(R.ventaNuevosWa)}).</div>
    </div>
    <div class="ivx-card ivx-canal" style="--cc:#00C2FF">
      <div class="ivx-canal-h"><span class="ivx-canal-ic">${ICON.pin(15)}</span><div><b>Tráfico al local · Dardignac</b><div class="xs muted">Alberto y Catalina (antes Úrsula) · campañas de tráfico y localización</div></div><span class="ivx-per">${esc(per)}</span></div>
      <div class="ivx-cms">
        ${m('Invertido', ivNum(l.gasto), `${fmtInt(l.clics)} clics del anuncio`, 'local', 'gasto', true)}
        ${m('Clientes nuevos', ivNum(l.nuevos, false), l.gasto && l.nuevos ? infMill(l.gasto / l.nuevos) + ' de inversión por cliente' : '', 'local', 'nuevos', false)}
        ${m('Venta a clientes nuevos', ivNum(l.ventaNuevos), `venta total ${infMill(l.venta)}`, 'local', 'ventaNuevos', true)}
      </div>
      <div class="xs muted" style="margin-top:12px">${varios ? 'Debajo de cada cifra, cada mes por separado. La venta a nuevos de los meses suma menos que el total: el total incluye lo que esos clientes volvieron a comprar en los meses siguientes.' : 'Venta a nuevos = lo que compraron en el período los clientes que hicieron su primera compra en TLA en el período.'}</div>
    </div>
  </div>`;
}
// ---------- Actualizar datos (Power BI, Meta, Google, web) desde el informe ----------
// Corre lo mismo que el ciclo de cada hora, pero ahora y forzando el Power BI. Muestra el tiempo estimado
// (lo que tardó la última vez en este navegador; la primera vez, 2 min 30 s) y cuánto falta.
const ivMmss = s => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.max(0, s) % 60)}`;
const ivUpdEst = () => Math.round(Number(Store.read('inf_upd_seg', 150)) || 150);
function ivDatosAl() {
  const M = INF.m; if (!M) return 'Sin datos de ventas';
  const c = M.cargado ? new Date(M.cargado) : null;
  const cuando = c && !isNaN(c) ? (infIso(c) === todayIso() ? 'hoy' : infDay(infIso(c))) + ' ' + pad(c.getHours()) + ':' + pad(c.getMinutes()) : '—';
  return `Actualizado ${cuando} · ${ivHastaTxt(M.hasta)}`;
}
// (23-11) Manager no factura sábado ni domingo y el Power BI se actualiza una vez al día (de noche): las ventas de HOY
// aparecen mañana. Si entre la última venta y ayer solo hay fin de semana, los datos están al día.
function ivHastaTxt(h) {
  if (!h) return 'sin ventas';
  const ayer = infIso(new Date(Date.now() - 864e5)); const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  let alDia = h >= ayer;
  if (!alDia) { alDia = true; for (let d = new Date(parseDay(h).getTime() + 864e5); infIso(d) <= ayer; d = new Date(d.getTime() + 864e5)) if (d.getDay() !== 0 && d.getDay() !== 6) { alDia = false; break; } }
  const dh = parseDay(h);
  return alDia ? `ventas al día (última: ${DIA[dh.getDay()]} ${infDay(h)}; lo de hoy llega mañana)` : `ventas hasta el ${DIA[dh.getDay()]} ${infDay(h)}`;
}
function ivActualizarHtml() {
  const U = INF.actualizando; const s = U ? Math.round((Date.now() - U.t0) / 1000) : 0;
  return `<div class="ivx-upd"><span class="xs muted" id="inf-upd-txt">${U ? (s < U.est ? `Tarda unos ${Math.ceil(U.est / 60)} min · faltan ~${ivMmss(U.est - s)}` : 'Casi listo…') : ivDatosAl()}</span>
    <button class="btn ivx-pill" id="inf-actualizar" ${U ? 'disabled' : ''} title="Trae de nuevo las ventas del Power BI y lo de Meta, Google y la web. Tarda unos ${Math.ceil(ivUpdEst() / 60)} minutos.">${ICON.clock(14)} ${U ? `Actualizando… ${ivMmss(s)}` : 'Actualizar datos'}</button></div>`;
}
function ivBindActualizar(el) {
  const b = $('#inf-actualizar', el); if (!b) return;
  b.onclick = async () => {
    if (INF.actualizando) return;
    INF.actualizando = { t0: Date.now(), est: ivUpdEst() };
    const tick = () => { if (!INF.actualizando) return; const s = Math.round((Date.now() - INF.actualizando.t0) / 1000), est = INF.actualizando.est;
      const bb = $('#inf-actualizar'), tx = $('#inf-upd-txt');
      if (bb) { bb.disabled = true; bb.innerHTML = `${ICON.clock(14)} Actualizando… ${ivMmss(s)}`; }
      if (tx) tx.textContent = s < est ? `Tarda unos ${Math.ceil(est / 60)} min · faltan ~${ivMmss(est - s)}` : 'Casi listo…'; };
    tick(); clearInterval(INF._updT); INF._updT = setInterval(tick, 1000);
    toast(`Actualizando datos: tarda unos ${Math.ceil(INF.actualizando.est / 60)} minutos. Puedes seguir mirando el informe.`);
    try {
      const r = await fetch('/api/manager/cargar', { method: 'POST', body: 'powerbi_cargar' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error');
      const seg = Math.round((Date.now() - INF.actualizando.t0) / 1000); Store.write('inf_upd_seg', seg);
      if (typeof loadAds === 'function') await loadAds();
      await loadInformes(true); INF._acum = null; INF._coh = null; INF._mp = null;
      toast(`Datos actualizados en ${ivMmss(seg)} · ventas hasta el ${infDay(INF.m.hasta)}`);
    } catch (e) { toast('No se pudo actualizar: ' + e.message, true); }
    clearInterval(INF._updT); INF.actualizando = null; render();
  };
}
// Lista de la pestaña abierta (la usa el panel y la descarga a Excel)
function ivListaClientes(R) {
  const tabs = [['nuevos', 'Nuevos', R.porTipo.nuevo], ['volvieron', 'Nuevos que volvieron', R.porTipo.nuevo_volvio], ['recuperados', 'Recuperados', R.porTipo.recuperado], ['cartera', 'Cartera', R.porTipo.cartera], ['seguir', 'Toca seguimiento', R.tocaSeguimiento]];
  const cur = tabs.find(t => t[0] === INF.ctab) || tabs[0];
  const qq = INF.q.toLowerCase(); let lista = cur[2].filter(c => !qq || `${c.cli} ${c.rut} ${c.vend} ${c.rubro} ${c.comuna}`.toLowerCase().includes(qq));
  if (cur[0] === 'seguir') lista = [...lista].sort((a, b) => (a.prox || '9').localeCompare(b.prox || '9'));   // los más atrasados primero
  return { tabs, cur, lista };
}
// Descargar la lista en Excel (el servidor lo arma con conectores/tabla-excel.ps1)
async function ivDescargarLista(R, titulo, btn) {
  if (!R) return; const { cur, lista } = ivListaClientes(R); if (!lista.length) return toast('La lista está vacía', true);
  const hoy = todayIso(); const per = titulo || R.per.label;
  const t0 = btn.innerHTML; btn.disabled = true; btn.textContent = 'Armando Excel…';
  const cols = [['Cliente', 'txt'], ['RUT', 'txt'], ['Tipo', 'txt'], ['Último en venderle', 'txt'], ['Fecha última venta', 'date'], ['Vendedores', 'txt'], ['Rubro', 'txt'], ['Comuna', 'txt'], ['Teléfono', 'txt'], ['Email', 'txt'], ['Chat de WhatsApp', 'txt'], ['Primera compra en TLA', 'date'], ['Última compra', 'date'], ['Compras', 'int'], ['Compra cada (días)', 'int'], ['Venta del período ($)', 'money'], ['Cotizado ($)', 'money'], ['Nota de venta ($)', 'money'], ['Último contacto', 'date'], ['Seguir cada (días)', 'int'], ['Próximo contacto', 'date'], ['Días de atraso', 'int'], ['Estado', 'txt']].map(([n, t]) => ({ n, t }));
  const filas = lista.map(c => [c.cli, c.rut, c.tipoTxt, c.ultVend || '', c.ultVendF || '', c.vend, c.rubro, c.comuna, c.tel, c.email, c.wa, c.primera, c.ultCompra, c.compras, c.cada, c.venta, c.cotMonto, c.nvMonto, c.ultContacto, c.seguirCada, c.prox, c.prox && c.prox < hoy ? daysBetween(c.prox, hoy) : null, c.estado]);
  const archivo = `${cur[1]} - ${per.replace(/[\\/:*?"<>|]/g, '-')} - ${hoy}`;
  try {
    const r = await fetch('/api/excel/tabla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivo, hoja: cur[1], titulo: `${cur[1]} · ${per}`, nota: `${lista.length} clientes · ${infAlcance().toLowerCase()} · generado el ${infDay(hoy)} ${hoy.slice(0, 4)}. Seguimiento: nuevos cada ${R.cadencia.nuevos} días, cartera cada ${R.cadencia.cartera} (o cada cuánto compra ese cliente). Contactado = WhatsApp, cotización o compra.`, cols, filas }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error || 'error');
    const a = document.createElement('a'); a.href = j.url; a.download = j.nombre; document.body.appendChild(a); a.click(); a.remove();
    toast('Excel listo: ' + j.nombre);
  } catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); }
  btn.disabled = false; btn.innerHTML = t0;
}
// ---------- TLA: tienda web textillasamericas.cl (WooCommerce, pedidos reales) ----------
function ivWebTla(R) {
  const T = INF.B.tla && INF.B.tla.tienda; if (!T || !T.ok) return '';
  const pag = asList(T.orders).filter(o => o.paid || o.status === 'completed' || o.status === 'processing');
  const enP = o => { const d = String(o.date || '').slice(0, 10); return d >= R.a && d <= R.b; };
  const per = pag.filter(enP); const monto = per.reduce((s, o) => s + Number(o.total || 0), 0);
  const ult = pag.map(o => String(o.date).slice(0, 10)).sort().pop() || '';
  const dias = ult ? daysBetween(ult, todayIso()) : null;
  const meses = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(infIso(d).slice(0, 7)); }
  const xs = meses.map(m => { const os = pag.filter(o => String(o.date).slice(0, 7) === m); return { m, n: os.length, v: os.reduce((s, o) => s + Number(o.total || 0), 0) }; });
  const mx = Math.max(1, ...xs.map(x => x.v));
  // Power BI: lo que Manager factura como «Ventas web» (VWB) en Casa Matriz y Showroom (para cruzar con la tienda)
  const lw = asList(INF.m && INF.m.lineas).filter(l => l.vend === 'VWB' && l.doc !== 'NCV'); const ultPbi = lw.map(l => l.f).sort().pop() || '';
  const pbiP = lw.filter(l => l.f >= R.a && l.f <= R.b).reduce((s, l) => s + l.neto, 0);
  const aviso = dias != null && dias > 30 ? `<div class="ivx-web-aviso">${ICON.alert(14)}<span><b>La tienda web no vende hace ${fmtInt(dias)} días</b> (último pedido pagado el ${infDay(ult)} ${ult.slice(0, 4)}). El Power BI dice lo mismo: «Ventas web» no factura en TLA ${ultPbi ? `desde el ${infDay(ultPbi)} ${ultPbi.slice(0, 4)}` : 'en este período'}. Revisa que se pueda comprar y pagar con Webpay.</span></div>` : '';
  return `<div class="ivx-card ivx-web" style="margin-bottom:14px">
    <div class="ivx-canal-h"><span class="ivx-canal-ic">${ICON.globe ? ICON.globe(15) : ICON.link(15)}</span><div><b>Tienda web · textillasamericas.cl</b><div class="xs muted">Pedidos reales de WooCommerce · pagados o completados</div></div><span class="ivx-per">${esc(R.per.tipo === 'acumulado' ? 'Total desde el 1 de septiembre' : R.per.label)}</span></div>
    ${aviso}
    <div class="grid g3" style="gap:10px;margin:10px 0 14px">${kpi('Pedidos en el período', fmtInt(per.length), '')}${kpi('Venta web', infMill(monto), per.length ? `${infMill(monto / per.length)} por pedido` : '')}${kpi('Último pedido', ult ? `${infDay(ult)}` : '—', ult ? `hace ${fmtInt(dias)} días` : '')}</div><div class="xs muted" style="margin:-6px 0 12px">Facturado en Manager como «Ventas web» en el período: <b>${infMill(pbiP)}</b></div>
    <div class="ivx-web-meses">${xs.map(x => `<div title="${INF_MESL[+x.m.slice(5, 7) - 1]} ${x.m.slice(0, 4)}: ${x.n} pedidos · ${fmtMoney(x.v)}"><i style="height:${Math.max(x.v ? 6 : 2, Math.round(x.v / mx * 100))}%"></i><span>${INF_MES[+x.m.slice(5, 7) - 1]}</span><b>${x.n || ''}</b></div>`).join('')}</div>
    <div class="xs muted" style="margin-top:6px">Venta por mes de los últimos 12 meses (número = pedidos). Google Analytics de TLA todavía no está conectado.</div></div>`;
}

// ---------- TLA: WhatsApp en espera (Vicente, 23-11: no hay conexión al WhatsApp de TLA) ----------
function ivWaTla() {
  return `<div class="ivx-card ivx-na" style="margin-bottom:14px" aria-disabled="true">
    <div class="ivx-na-fondo"><div class="ivx-canal-h"><span class="ivx-canal-ic">${ICON.msg(15)}</span><div><b>WhatsApp de TLA</b><div class="xs muted">Chats nuevos, quién escribió antes de comprar y conversaciones de las campañas</div></div></div>
      <div class="grid g3" style="gap:10px;margin-top:12px">${kpi('Chats nuevos', '000', '')}${kpi('Escribieron', '000', '')}${kpi('Nuevos que escribieron antes', '00', '')}</div></div>
    <div class="ivx-na-tapa"><span class="ivx-na-chip">No disponible</span><b>Sin conexión al WhatsApp de TLA</b><span class="xs muted">Queda en espera. Cuando el WhatsApp de TLA esté abierto en un navegador de este computador, se conecta igual que el de K8.</span></div></div>`;
}