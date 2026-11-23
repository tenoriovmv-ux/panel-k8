// ============================================================
// Inicio · dashboard principal (mismo diseño que Informes: negro, cifras grandes, panel claro con lista + detalle).
// Arriba: lo hecho desde septiembre, solo local Dardignac (cada cifra abre su detalle) + mi checklist.
// Después: campañas activas, estados de productos y documentos. Abajo: clientes para hacer seguimiento.
// ============================================================
'use strict';

function missingDocs(p) {
  if (p.kind !== 'prenda') return [];
  const need = DOC_TYPES.flatMap(d => DOC_PER_COLOR.includes(d) ? p.colors.map(c => `${d} · ${c.n}`) : [d]);
  return need.filter(d => !(p.docs || []).includes(d));
}

function inicioHero(A) {
  if (!A) return `<div class="ivx-card" style="padding:28px;margin-bottom:14px">${empty(INF.loaded ? 'Sin datos de ventas' : 'Cargando ventas del Power BI…')}</div>`;
  const V = A.porVend || [];
  const avs = key => V.filter(v => v[key] > 0).sort((x, y) => y[key] - x[key]).map(v => ivAvatar(v.cod, key.startsWith('venta') ? infMill(v[key]) : fmtInt(v[key]))).join('');
  const bar = key => ivBar(V.map(v => ({ l: `${v.n}: ${key.startsWith('venta') ? infMill(v[key]) : fmtInt(v[key])}`, v: v[key] || 0, c: v.c })));
  const m = (que, lbl, num, sub, barra, pie) => `<div class="ivx-m" data-infdet="${que}|${A.a}|${A.b}" title="Toca para ver el detalle por vendedor y mes"><div class="ivx-lbl">${lbl}<span class="ivx-go">${ICON.chevR(12)}</span></div><div class="ivx-num">${num}</div><div class="ivx-sub">${sub}</div>${ivMeses(A.a, A.b, que)}${barra}<div class="ivx-pie">${pie}</div></div>`;
  const hasta = A.dataHasta && A.dataHasta < A.b ? A.dataHasta : A.b;
  return `<div class="ivx-big ivx-card">
      ${m('gasto', 'Invertido en Meta y Google', ivNum(A.gasto), `Meta ${infMill(A.gastoMeta)} · Google ${infMill(A.gastoGoogle)}`, ivBar([{ l: 'Meta', v: A.gastoMeta, c: '#4D78FF' }, { l: 'Google', v: A.gastoGoogle, c: '#F59E0B' }]), `<span class="ivx-tag"><i style="background:#4D78FF"></i>Meta</span><span class="ivx-tag"><i style="background:#F59E0B"></i>Google</span>`)}
      ${m('ventaNuevos', 'Venta a clientes nuevos', ivNum(A.ventaNuevos), A.retorno ? `<b class="ivx-lime">${A.retorno.toLocaleString('es-CL', { maximumFractionDigits: 1 })} x</b> lo invertido` : '', bar('ventaNuevos'), avs('ventaNuevos'))}
      ${m('nuevos', 'Clientes nuevos', ivNum(A.nuevos, false), `${A.costoNuevo ? infMill(A.costoNuevo) + ' por cliente' : ''} · ${fmtInt(A.nuevosRecompra)} ya volvieron`, bar('nuevos'), avs('nuevos'))}
      ${m('recuperados', 'Clientes recuperados', ivNum(A.recupN, false), `${infMill(A.recupVenta)} · +12 meses sin comprar`, bar('recup'), avs('recup'))}
    </div><div class="xs muted" style="margin:8px 4px 0">Desde el 1 de septiembre hasta el ${infDay(hasta)} · solo local Dardignac · venta total ${infMill(A.ventaTotal)}</div>`;
}

PAGES.inicio = () => {
  const t = todayIso();
  const prods = Store.list('products'), camps = Store.list('campaigns').filter(c => !c.archived);
  const me = personOf(ME.id);
  const h = new Date().getHours();
  const greet = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  infUsarMarca('k8');   // Inicio siempre muestra K8 (el menú de marcas está solo en Informes)
  if (!INF.loaded && !INF.promise) INF.promise = loadInformes().then(() => { INF.promise = null; render(); });
  const A = INF.loaded && INF.m ? infAcum() : null;
  const RA = A ? infAcumR() : null;

  const prendas = prods.filter(p => p.kind === 'prenda');
  const stg = p => typeof stageOfProduct === 'function' ? stageOfProduct(p) : p.stage;
  const enCamino = prendas.filter(p => stg(p) === 3 || stg(p) === 4);
  const docsFaltan = prendas.reduce((a, p) => a + missingDocs(p).length, 0);
  const docsTotal = prendas.reduce((a, p) => a + (p.docs || []).length, 0);
  const byStage = STAGES.map(s => ({ ...s, n2: prendas.filter(p => stg(p) === s.n).length })).filter(s => s.n2);
  const activas = camps.filter(c => c.state === 'on');
  const mesIni = t.slice(0, 8) + '01';
  const gastoMes = c => asList(c.daily).filter(x => x && x.date >= mesIni).reduce((s, x) => s + Number(x.spent || 0), 0) || (c.spent || 0);
  const ck = typeof ckLista === 'function' ? ckLista() : [];
  const pend = ck.filter(x => !x.hecho).sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9'));

  const html = `
  <div class="ivx-top"><div><h1 class="ivx-h1">${Acceso.lector() ? `${greet}` : `${greet}, ${esc(me.short)}`}</h1>
    <p class="muted sm">${cap(fmtDateLong(t))} · ${pend.length} tareas pendientes · ${activas.length} campañas activas · ${enCamino.length} productos en camino</p></div>
    <div class="actions"><button class="btn primary ivx-pill" data-go="informes/ventas">${ICON.chart(14)} Ver informe</button></div></div>

  <div class="ivx-hero">
    <div>${inicioHero(A)}</div>
    <div class="ivx-card ivx-side" data-go="marketing/equipo/checklist" title="Abrir mi checklist">
      <div class="ivx-lbl">Mi checklist<span class="ivx-go">${ICON.chevR(12)}</span></div>
      <div class="ivx-num">${pend.length}<small> pendientes</small></div>
      <div class="ivx-sub">${ck.length - pend.length} hechas de ${ck.length}</div>
      <div class="ivx-todo">${pend.slice(0, 3).map((x, i) => `<div class="ivx-mini${i === 0 ? ' hi' : ''}"><span class="xs">${esc(x.grupo)}${x.fecha ? ' · ' + fmtDate(x.fecha) : ''}</span><b class="ivx-todo-t">${esc(x.txt)}</b></div>`).join('') || '<div class="xs muted">Todo hecho</div>'}</div>
    </div>
  </div>

  <div class="ivx-row3">
    <div class="ivx-card ivx-box" data-go="campanas/dashboard">
      <div class="ivx-lbl">Campañas activas<span class="ivx-go">${ICON.chevR(12)}</span></div>
      <div class="ivx-num">${activas.length}<small> activas</small></div>
      <div class="ivx-sub">${infMill(activas.reduce((s, c) => s + gastoMes(c), 0))} invertido este mes</div>
      <div class="ivx-lines">${activas.slice(0, 5).map(c => `<div><span class="ivx-tag"><i style="background:${PLATFORMS.find(p => p.id === c.platform)?.c || 'var(--muted)'}"></i></span><span class="ivx-ln">${esc(c.name)}</span><b>${infMill(gastoMes(c))}</b></div>`).join('') || '<div class="xs muted">Sin campañas activas</div>'}</div>
    </div>
    <div class="ivx-card ivx-box" data-go="estados/gantt">
      <div class="ivx-lbl">Estados de productos<span class="ivx-go">${ICON.chevR(12)}</span></div>
      <div class="ivx-num">${enCamino.length}<small> en camino</small></div>
      <div class="ivx-sub">${prendas.length} productos en desarrollo</div>
      ${ivBar(byStage.map(s => ({ l: `${s.short}: ${s.n2}`, v: s.n2, c: s.c })))}
      <div class="ivx-lines">${byStage.map(s => `<div><span class="ivx-tag"><i style="background:${s.c}"></i></span><span class="ivx-ln">${esc(s.short)}</span><b>${s.n2}</b></div>`).join('')}</div>
    </div>
    <div class="ivx-card ivx-box" data-go="productos/documentos">
      <div class="ivx-lbl">Documentos por subir<span class="ivx-go">${ICON.chevR(12)}</span></div>
      <div class="ivx-num">${docsFaltan}<small> pendientes</small></div>
      <div class="ivx-sub">${docsTotal} subidos</div>
      ${ivBar([{ l: 'Subidos', v: docsTotal, c: 'var(--accent)' }, { l: 'Pendientes', v: docsFaltan, c: 'var(--line)' }])}
      <div class="ivx-lines">${prendas.filter(p => missingDocs(p).length).sort((a, b) => missingDocs(b).length - missingDocs(a).length).slice(0, 4).map(p => `<div><span class="ivx-ln">${esc(p.name)}</span><b>${missingDocs(p).length}</b></div>`).join('') || '<div class="xs muted">Todo al día</div>'}</div>
    </div>
  </div>

  ${RA && RA.ok ? ivClientes(RA, 'Clientes desde septiembre') : ''}`;

  return {
    title: 'Inicio',
    html,
    mount(el) {
      $$('[data-infdet]', el).forEach(d => d.onclick = e => { e.stopPropagation(); infAbrirDetalle(d.dataset.infdet); });
      ivBindClientes(el, () => infAcumR(), 'Clientes desde septiembre');

    },
  };
};
