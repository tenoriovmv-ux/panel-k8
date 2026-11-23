// ============================================================
// Informes › K8 vs TLA (23-11-2026, Vicente): las dos empresas lado a lado en sus puntos más
// importantes, quién va mejor en cada uno y consejos de cómo mejorar según los datos de cada una.
// Usa el mismo cálculo del informe (infCalcular) con la marca cambiada un momento (infConMarca).
// ============================================================
'use strict';

const CMP = { per: 'acumulado' };
const CMP_COL = { k8: '#E7E9EE', tla: '#4F7BEA' };

// Corre fn con la marca mk (datos, vendedores y sucursales) y vuelve a la marca que estaba
function infConMarca(mk, fn) {
  const ant = INF.marca; const set = m => { INF.marca = m; INF_SUCS = INF_MARCAS[m].sucs; INF_VEND = m === 'tla' ? (INF.B.tla.vend || INF_VEND_TLA) : INF_VEND_K8; };
  if (ant !== mk) set(mk);
  try { return fn(); } finally { if (ant !== mk) set(ant); }
}
// Carga los datos de las dos marcas (una después de la otra)
async function infCargarAmbas() {
  for (const mk of ['k8', 'tla']) {
    if (INF.B[mk].loaded) continue;
    const ant = INF.marca; INF.marca = mk;
    try { await loadInformes(); } finally { INF.marca = ant; infUsarMarca(ant); }
  }
}

const cmpDiv = (a, b) => (b ? a / b : null);
// Puntos a comparar: [etiqueta, cómo se calcula, formato, qué es mejor ('alto' | 'bajo' | null), explicación corta]
const CMP_PUNTOS = [
  ['Invertido en publicidad', R => R.gasto.total, 'm', null, 'Meta y Google en el período'],
  ['Venta total', R => R.ventaTotal, 'm', 'alto', 'lo que facturaron sus vendedores'],
  ['Venta a clientes nuevos', R => R.ventaNuevos, 'm', 'alto', 'lo que compraron los que llegaron por primera vez'],
  ['Pesos de venta nueva por cada $1 invertido', R => R.retorno, 'x', 'alto', 'venta a nuevos ÷ invertido'],
  ['Clientes nuevos', R => R.nuevos, 'n', 'alto', 'primera compra en TLA en el período'],
  ['Inversión por cliente nuevo', R => R.costoNuevo, 'm', 'bajo', 'invertido ÷ clientes nuevos'],
  ['Compra promedio de un cliente nuevo', R => cmpDiv(R.ventaNuevos, R.nuevos), 'm', 'alto', 'venta a nuevos ÷ clientes nuevos'],
  ['Parte de la venta que es a clientes nuevos', R => cmpDiv(R.ventaNuevos, R.ventaTotal), 'p', 'alto', 'cuánto depende de clientes nuevos'],
  ['Clientes nuevos que ya volvieron a comprar', R => cmpDiv(R.nuevosRecompra, R.nuevos), 'p', 'alto', 'recompra: compraron en 2 o más días'],
  ['Clientes recuperados', R => R.recup.n, 'n', 'alto', 'volvieron tras +12 meses sin comprar'],
  ['Venta a recuperados', R => R.recup.venta, 'm', 'alto', ''],
  ['Cotizaciones ganadas', R => cmpDiv(R.cot.ganadas, R.cot.n), 'p', 'alto', 'con nota de venta'],
  ['Clientes que toca seguir', R => cmpDiv(R.tocaSeguimiento.length, R.clientes.length), 'p', 'bajo', 'ya pasaron su fecha de contacto'],
];
const cmpFmt = (v, f) => v == null || !isFinite(v) ? '—' : f === 'm' ? infMill(v) : f === 'x' ? v.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' x' : f === 'p' ? Math.round(v * 100) + '%' : fmtInt(v);

// ---------- Consejos según los datos de cada empresa (comparada con la otra) ----------
function cmpConsejos(mk, R, O) {
  const yo = INF_MARCAS[mk].n, otro = INF_MARCAS[mk === 'k8' ? 'tla' : 'k8'].n; const out = [];
  const p = x => Math.round(x * 100) + '%';
  if (R.gasto.total > 0 && R.retorno != null && O.retorno != null && R.retorno < O.retorno * 0.7)
    out.push({ t: 'warn', s: `Cada $1 en publicidad trae ${cmpFmt(R.retorno, 'x')} en venta nueva, contra ${cmpFmt(O.retorno, 'x')} en ${otro}. Revisa qué campañas traen clientes y baja el presupuesto de las que llevan semanas sin resultados.` });
  if (R.costoNuevo && O.costoNuevo && R.costoNuevo > O.costoNuevo * 1.4)
    out.push({ t: 'warn', s: `Cada cliente nuevo cuesta ${infMill(R.costoNuevo)} en publicidad (en ${otro}: ${infMill(O.costoNuevo)}). Prueba anuncios con precio o promoción visible y un llamado claro a escribir por WhatsApp.` });
  const rec = cmpDiv(R.nuevosRecompra, R.nuevos), recO = cmpDiv(O.nuevosRecompra, O.nuevos);
  if (rec != null && rec < 0.25)
    out.push({ t: 'warn', s: `Solo ${p(rec)} de los clientes nuevos volvió a comprar${recO != null ? ` (${otro}: ${p(recO)})` : ''}. Arma un seguimiento fijo: mensaje a los 7 días preguntando cómo le fue y otro a los 30 con una oferta para su rubro.` });
  const seg = cmpDiv(R.tocaSeguimiento.length, R.clientes.length);
  if (seg != null && seg > 0.3)
    out.push({ t: 'warn', s: `${fmtInt(R.tocaSeguimiento.length)} clientes (${p(seg)}) ya pasaron su fecha de contacto. Descarga la lista «Toca seguimiento» y repártela entre los vendedores esta semana.` });
  const gan = cmpDiv(R.cot.ganadas, R.cot.n), ganO = cmpDiv(O.cot.ganadas, O.cot.n);
  if (gan != null && R.cot.n >= 10 && (gan < 0.3 || (ganO != null && gan < ganO * 0.7)))
    out.push({ t: 'warn', s: `Se cierra ${p(gan)} de las cotizaciones${ganO != null ? ` (${otro}: ${p(ganO)})` : ''} y hay ${infMill(R.cot.abiertoMonto)} cotizados sin cerrar. Llama a las cotizaciones abiertas antes de que pasen 7 días.` });
  if (R.recup.n < O.recup.n * 0.6 && O.recup.n >= 5)
    out.push({ t: 'info', s: `Recuperó ${fmtInt(R.recup.n)} clientes antiguos (${otro}: ${fmtInt(O.recup.n)}). Una campaña o mensaje a la cartera que lleva más de un año sin comprar suele ser lo más barato para vender más.` });
  const prom = cmpDiv(R.ventaNuevos, R.nuevos), promO = cmpDiv(O.ventaNuevos, O.nuevos);
  if (prom && promO && prom < promO * 0.6)
    out.push({ t: 'info', s: `Un cliente nuevo compra en promedio ${infMill(prom)} (en ${otro}: ${infMill(promO)}). Ofrece combos o el siguiente producto que suele llevar ese rubro para subir la primera compra.` });
  const vs = R.vend.filter(v => v.venta > 0).sort((a, b) => b.venta - a.venta); const tot = vs.reduce((s, v) => s + v.venta, 0);
  if (vs.length > 1 && tot && vs[0].venta / tot > 0.6)
    out.push({ t: 'info', s: `${vs[0].n.split(' ')[0]} hace el ${p(vs[0].venta / tot)} de la venta. Conviene que los demás reciban más clientes nuevos de las campañas para no depender de una sola persona.` });
  if (mk === 'tla' && !(R.gasto.google > 0) && O.gasto.google > 0)
    out.push({ t: 'info', s: `${yo} no usa Google: K8 sí (${infMill(O.gasto.google)} en el período). Prueba una campaña chica de búsqueda con las telas que más se venden, para clientes que ya buscan comprar.` });
  if (mk === 'tla') { const T = INF.B.tla.tienda; const ult = T && T.ok ? asList(T.orders).filter(o => o.paid || o.status === 'completed').map(o => String(o.date).slice(0, 10)).sort().pop() : ''; const d = ult ? daysBetween(ult, todayIso()) : null;
    if (d != null && d > 30) out.unshift({ t: 'warn', s: `La tienda web textillasamericas.cl no recibe pedidos pagados desde el ${infDay(ult)} (${fmtInt(d)} días). Antes entraban unos 15 al mes: revisa que el carrito y el pago con Webpay funcionen.` }); }  if (R.gasto.total === 0) out.push({ t: 'info', s: `No hubo inversión en publicidad en el período: todo lo vendido a nuevos llegó por otros medios.` });
  // Lo que hace mejor que la otra (para mantener o copiar)
  const fuerte = CMP_PUNTOS.filter(x => x[3]).map(x => ({ l: x[0], a: x[1](R), b: x[1](O), mejor: x[3] })).filter(x => x.a != null && x.b != null && isFinite(x.a) && isFinite(x.b) && x.b > 0 && (x.mejor === 'alto' ? x.a > x.b * 1.25 : x.a < x.b * 0.8));
  if (fuerte.length) out.push({ t: 'ok', s: `Va mejor que ${otro} en: ${fuerte.slice(0, 3).map(x => x.l.toLowerCase()).join(', ')}. Mantén lo que se está haciendo ahí y compártelo con el equipo de ${otro}.` });
  return out.slice(0, 6);
}

// ---------- Página ----------
function informesComparar() {
  const listos = INF.B.k8.loaded && INF.B.tla.loaded;
  const head = `<div class="ivx-top"><div><h1 class="ivx-h1">K8 vs TLA</h1><p class="muted sm">Las dos empresas lado a lado: quién va mejor en cada punto y qué haría cada una para mejorar. K8 = local Dardignac · TLA = Krishna, Moira y Gabriel en Casa Matriz y Showroom.</p></div></div>`;
  if (!listos) { if (!CMP.cargando) { CMP.cargando = true; infCargarAmbas().then(() => { CMP.cargando = false; render(); }); } return head + `<div class="card">${empty('Cargando los datos de K8 y TLA…')}</div>`; }
  const pers = infConMarca('k8', () => infPeriodos());
  if (!pers.find(p => p.id === CMP.per)) CMP.per = 'acumulado';
  const per = pers.find(p => p.id === CMP.per);
  const meses = pers.filter(p => p.tipo === 'mes').slice().reverse();
  const RK = infConMarca('k8', () => infCalcular(per)), RT = infConMarca('tla', () => infCalcular(per));
  if (!RK.ok || !RT.ok) return head + `<div class="card">${empty('Faltan datos de una de las dos empresas')}</div>`;
  const pills = `<div class="ivx-filtros"><div class="ivx-seg">${[pers.find(p => p.tipo === 'acumulado'), ...meses].filter(Boolean).map(p => `<button class="${p.id === CMP.per ? 'on' : ''}" data-cmpper="${p.id}">${p.tipo === 'acumulado' ? 'Desde septiembre' : INF_MESL[+p.id.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase())}</button>`).join('')}</div><span class="spacer"></span><span class="xs muted">${esc(per.label)}${RK.dataHasta && RK.dataHasta < per.b ? ` · ventas hasta el ${infDay(RK.dataHasta)}` : ''}</span></div>`;
  // Marcador: cuántos puntos gana cada una
  let gK = 0, gT = 0;
  const filas = CMP_PUNTOS.map(([lbl, f, fm, mejor, nota]) => {
    const a = f(RK), b = f(RT); const ok = x => x != null && isFinite(x);
    let gana = '';
    if (mejor && ok(a) && ok(b) && a !== b) { gana = (mejor === 'alto' ? a > b : a < b) ? 'k8' : 'tla'; if (gana === 'k8') gK++; else gT++; }
    const mx = Math.max(ok(a) ? Math.abs(a) : 0, ok(b) ? Math.abs(b) : 0) || 1;
    const bar = (v, mk) => `<i class="cmp-bar ${mk}${gana === mk ? ' gana' : ''}" style="width:${ok(v) ? Math.max(2, Math.abs(v) / mx * 100) : 0}%"></i>`;
    return `<div class="cmp-fila">
      <div class="cmp-lado k8"><b class="${gana === 'k8' ? 'gana' : ''}">${cmpFmt(a, fm)}</b><span class="cmp-track">${bar(a, 'k8')}</span></div>
      <div class="cmp-lbl"><span>${esc(lbl)}</span>${nota ? `<small>${esc(nota)}</small>` : ''}${gana ? `<em class="${gana}">${gana === 'k8' ? '◀ K8' : 'TLA ▶'}</em>` : mejor ? '<em>empate</em>' : ''}</div>
      <div class="cmp-lado tla"><span class="cmp-track">${bar(b, 'tla')}</span><b class="${gana === 'tla' ? 'gana' : ''}">${cmpFmt(b, fm)}</b></div></div>`;
  }).join('');
  const marca = mk => `<div class="cmp-marca ${mk}"><img src="${INF_MARCAS[mk].logo}" alt=""><div><b>${esc(INF_MARCAS[mk].nombre)}</b><small>${esc(INF_MARCAS[mk].alcance)}</small></div><span class="cmp-gana"><b>${mk === 'k8' ? gK : gT}</b> puntos mejor</span></div>`;
  // Mes a mes: venta a nuevos y rendimiento de la publicidad
  const mm = meses.map(p => { const k = infConMarca('k8', () => infCalcularLiviano(p)), t = infConMarca('tla', () => infCalcularLiviano(p)); return { l: INF_MESL[+p.id.slice(5, 7) - 1].replace(/^./, s => s.toUpperCase()), cur: p.b >= todayIso(), k, t }; });
  const mesTabla = `<div class="ivx-card cmp-card"><div class="cmp-h">Mes a mes</div><table class="table"><thead><tr><th></th><th class="r">Invertido K8</th><th class="r">Invertido TLA</th><th class="r">Venta a nuevos K8</th><th class="r">Venta a nuevos TLA</th><th class="r">Rinde K8</th><th class="r">Rinde TLA</th></tr></thead><tbody>
    ${mm.map(x => { const rk = cmpDiv(x.k.ventaNuevos, x.k.gasto), rt = cmpDiv(x.t.ventaNuevos, x.t.gasto); return `<tr><td><b>${x.l}</b>${x.cur ? ' <span class="xs muted">en curso</span>' : ''}</td><td class="r">${infMill(x.k.gasto)}</td><td class="r">${infMill(x.t.gasto)}</td><td class="r">${infMill(x.k.ventaNuevos)}</td><td class="r">${infMill(x.t.ventaNuevos)}</td><td class="r${rk != null && rt != null && rk > rt ? ' cmp-win' : ''}">${cmpFmt(rk, 'x')}</td><td class="r${rk != null && rt != null && rt > rk ? ' cmp-win' : ''}">${cmpFmt(rt, 'x')}</td></tr>`; }).join('')}</tbody></table>
    <div class="xs muted" style="margin-top:8px">Rinde = pesos de venta a clientes nuevos por cada $1 invertido en publicidad ese mes.</div></div>`;
  const ico = { ok: ICON.check(14), warn: ICON.alert(14), info: ICON.spark(14) };
  const consejos = mk => { const R = mk === 'k8' ? RK : RT, O = mk === 'k8' ? RT : RK; const xs = cmpConsejos(mk, R, O);
    return `<div class="ivx-card cmp-card cmp-cons ${mk}"><div class="cmp-h"><img src="${INF_MARCAS[mk].logo}" alt="">Cómo mejorar ${esc(INF_MARCAS[mk].nombre)}</div>${xs.length ? xs.map(x => `<div class="cmp-tip ${x.t}"><span>${ico[x.t]}</span><p>${esc(x.s)}</p></div>`).join('') : `<div class="xs muted">Sin alertas en este período.</div>`}</div>`; };
  return head + pills + `<div class="ivx-card cmp-card"><div class="cmp-top">${marca('k8')}<span class="cmp-vs">VS</span>${marca('tla')}</div>${filas}
    <div class="xs muted" style="margin-top:10px">◀ ▶ = quién va mejor en ese punto. «Invertido» no tiene ganador: gastar más no es bueno ni malo por sí solo. Las cifras de K8 son solo del local Dardignac; las de TLA, solo de Krishna, Moira y Gabriel.</div></div>
    <div class="cmp-2">${consejos('k8')}${consejos('tla')}</div>${mesTabla}`;
}
function bindComparar(el) {
  $$('[data-cmpper]', el).forEach(b => b.onclick = () => { CMP.per = b.dataset.cmpper; render.animar = true; render(); });
}
