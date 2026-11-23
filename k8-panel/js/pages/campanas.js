// ============================================================
// Campañas · dashboard simple de Meta Ads y Google Ads
// (misma lista de campañas que Marketing › Ventas; solo visual,
//  la conexión real la hace el informático)
// ============================================================
'use strict';

const CP = Store.read('cp_ui', {}) || {};
CP.period = CP.period || 'mes'; CP.from = CP.from || ''; CP.to = CP.to || ''; CP.plat = CP.plat || ''; CP.zone = CP.zone || ''; CP.lstate = CP.lstate || 'all'; CP.ltype = CP.ltype || '';
const cpSave = () => Store.write('cp_ui', CP);

const cpTabs = on => `<div class="tabs no-print">${[['dashboard', 'Dashboard'], ['analisis', 'Análisis'], ['lista', 'Todas las campañas'], ['zonas', 'Por zona'], ['web', 'Sitio web'], ['whatsapp', 'WhatsApp'], ['mercadolibre', 'Mercado Libre']].map(([k, l]) => `<button class="${on === k ? 'on' : ''}" data-go="campanas/${k}">${l}</button>`).join('')}</div>`;
// Estado de las fuentes (Meta Ads / Google Ads): lo arma js/ads.js con lo que dejó el conector.
const connBanner = () => adsBar();
const autoChip = c => `<span class="chip" title="Datos traídos de ${PLATFORMS.find(p => p.id === c.platform)?.name || 'la plataforma'}${c.dataAt ? ` · al ${fmtDate(c.dataAt)}` : ''}">${ICON.zap(11)} auto</span>`;
const cpFilter = c => (!CP.plat || c.platform === CP.plat) && (!CP.zone || (CP.zone === 'all' ? c.regions.length === REGIONS.length : ZONES.find(z => z.id === CP.zone).regions.some(r => c.regions.includes(r))));
const paceTxt = c => { if (!c.budget || c.state !== 'on') return ''; const days = daysBetween(c.start, todayIso()) + 1; const exp = c.budget * Math.max(1, days); return `${fmtShort(c.spent || 0)} de ${fmtShort(exp)} esperados (${days} d × ${fmtShort(c.budget)})`; };

// ---------- Dashboard ----------
function campanasDashboard() {
  const range = periodRange(CP.period, CP.from, CP.to);
  const all = Store.list('campaigns').filter(c => !c.archived);
  const camps = all.filter(c => overlaps(c, range) && cpFilter(c));
  const active = camps.filter(c => c.state === 'on');
  // Con datos de la plataforma (detalle diario) se suma solo lo del período; si no, el total anotado.
  const sp = (c, k) => adsIn(c, k, range);
  const sum = k => camps.reduce((a, c) => a + sp(c, k), 0);
  const spent = sum('spent'), msgs = sum('messages'), imp = sum('impressions'), reach = sum('reach');
  const mets = camps.map(c => ({ c, m: campMetrics(c, range) }));
  const byPlat = PLATFORMS.map(p => { const xs = camps.filter(c => c.platform === p.id); return { p, n: xs.length, on: xs.filter(c => c.state === 'on').length, spent: xs.reduce((a, c) => a + sp(c, 'spent'), 0), msgs: xs.reduce((a, c) => a + sp(c, 'messages'), 0), imp: xs.reduce((a, c) => a + sp(c, 'impressions'), 0) }; });
  const byType = CAMPAIGN_TYPES.map(tp => { const xs = camps.filter(c => c.type === tp.id); return { tp, n: xs.length, on: xs.filter(c => c.state === 'on').length, spent: xs.reduce((a, c) => a + sp(c, 'spent'), 0), msgs: xs.reduce((a, c) => a + sp(c, 'messages'), 0) }; }).filter(x => x.n);
  const maxSpent = Math.max(1, ...byType.map(x => x.spent));
  const byZone = ZONES.map(z => { const xs = camps.filter(c => z.regions.some(r => c.regions.includes(r))); const sp2 = xs.reduce((a, c) => a + sp(c, 'spent'), 0), mg = xs.reduce((a, c) => a + sp(c, 'messages'), 0); const so = xs.reduce((a, c) => a + campMetrics(c, range).sold, 0); return { z, n: xs.length, sp: sp2, mg, so, roas: sp2 ? so / sp2 : null }; });
  const regCount = r => camps.filter(c => c.regions.includes(r)).length; const maxReg = Math.max(1, ...REGIONS.map(regCount));
  const topSpend = [...camps].map(c => ({ ...c, spentP: sp(c, 'spent') })).sort((a, b) => b.spentP - a.spentP).slice(0, 6); const maxC = Math.max(1, ...topSpend.map(c => c.spentP));
  return `
  <div class="page-head"><div><h1>Campañas</h1><p>Lo esencial de Meta Ads y Google Ads, en un solo lugar y fácil de leer.</p></div><div class="actions"><button class="btn" data-print="Campañas · Dashboard">${ICON.pdf(14)} Informe PDF</button><button class="btn primary" id="cp-new2">${ICON.plus(14)} Campaña</button></div></div>
  ${cpTabs('dashboard')}
  ${connBanner()}
  <div class="row wrap no-print" style="margin:0 4px 14px">${periodBar(CP.period, CP.from, CP.to, 'c')}<span class="spacer"></span>
    <div class="seg"><button class="${!CP.plat ? 'on' : ''}" data-cplat="">Ambas</button>${PLATFORMS.map(p => `<button class="${CP.plat === p.id ? 'on' : ''}" data-cplat="${p.id}">${p.name}</button>`).join('')}</div>
    <select class="select" id="cp-zone" style="width:150px"><option value="">Todas las zonas</option><option value="all" ${CP.zone === 'all' ? 'selected' : ''}>Todo Chile</option>${ZONES.map(z => `<option value="${z.id}" ${CP.zone === z.id ? 'selected' : ''}>${z.name}</option>`).join('')}</select></div>
  <div class="grid g6" style="margin-bottom:14px">
    ${kpi('Activas', active.length, `de ${camps.length} en el período`)}
    ${kpi('Gasto', fmtShort(spent), `${fmtShort(active.reduce((a, c) => a + (c.budget || 0), 0))} / día presupuestado`)}
    ${kpi('Mensajes · leads', fmtInt(msgs), msgs ? `${fmtMoney(spent / msgs)} por mensaje` : 'sin datos')}
    ${kpi('Costo por mensaje', msgs ? fmtMoney(spent / msgs) : '—', 'promedio del período')}
    ${kpi('Impresiones', imp ? fmtInt(imp) : '—', imp ? `${(spent / imp * 1000).toLocaleString('es-CL', { maximumFractionDigits: 0 })} $ CPM` : 'pendiente de conexión')}
    ${kpi('Alcance', reach ? fmtInt(reach) : '—', reach && imp ? `${(imp / reach).toLocaleString('es-CL', { maximumFractionDigits: 1 })} veces por persona` : 'pendiente de conexión')}
  </div>
  <div class="grid" style="grid-template-columns:1.3fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.mega(15), 'Campañas activas', 'Qué está corriendo ahora y para qué', 'campanas/lista', 'var(--app-campanas)')}
      <div class="list">${active.length ? active.map(c => `<div class="list-item link" data-cedit2="${c.id}" style="align-items:flex-start"><span class="icon-btn sm" style="color:${PLATFORMS.find(p => p.id === c.platform)?.c};flex:none" title="${PLATFORMS.find(p => p.id === c.platform)?.name}">${ICON.mega(13)}</span><div style="flex:1;min-width:0"><div class="row wrap" style="gap:6px"><b>${esc(c.name)}</b>${chip(ctypeOf(c.type).name, ctypeOf(c.type).c)}${platChip(c.platform)}</div><div class="xs muted" style="margin-top:2px">${ICON.pin(10)} ${zoneLabel(c.regions)} · desde ${fmtDate(c.start)} · ${c.budget ? fmtMoney(c.budget) + '/día' : 'sin presupuesto diario'}</div>${paceTxt(c) ? `<div class="xs muted">${paceTxt(c)}</div>` : ''}</div><div style="text-align:right;flex:none"><div class="num" style="font-size:16px">${sp(c, 'spent') ? fmtShort(sp(c, 'spent')) : '—'}</div><div class="xs muted">${resultTxt(c, range) || (sp(c, 'spent') ? `0 ${adsResult(c, range).label}` : 'sin datos')}</div></div></div>`).join('') : empty('Sin campañas activas', 'Las campañas que estén corriendo aparecerán aquí')}</div>
    </div>
    <div class="card">${cardHead(ICON.target(15), 'Por objetivo', 'Gasto y mensajes por tipo de campaña', '', 'var(--app-campanas)')}
      ${byType.length ? byType.sort((a, b) => b.spent - a.spent).map(x => `<div style="margin-bottom:10px"><div class="row sm"><span class="chip c" style="--c:${x.tp.c}"><i></i>${x.tp.name}</span><span class="muted">${x.n} ${x.n === 1 ? 'campaña' : 'campañas'}${x.on ? ` · ${x.on} activa${x.on > 1 ? 's' : ''}` : ''}</span><span class="spacer"></span><b>${fmtShort(x.spent)}</b><span class="muted" style="width:70px;text-align:right">${fmtInt(x.msgs)} msj</span></div><div class="bar thin" style="--c:${x.tp.c};margin-top:4px"><i style="width:${x.spent / maxSpent * 100}%"></i></div></div>`).join('') : empty('Sin campañas en el período')}
    </div>
  </div>
  <div class="grid g3" style="margin-bottom:14px">
    ${byPlat.map(x => `<div class="card">${cardHead(ICON.zap(15), x.p.name, (x.p.id === 'meta' ? CONN.meta : CONN.google) ? 'Conectado · datos de la plataforma' : 'Sin conectar · datos manuales', '', x.p.c)}
      <div class="grid g2" style="gap:8px">${[['Campañas', `${x.on} <span class="sm muted">/ ${x.n}</span>`], ['Gasto', fmtShort(x.spent)], ['Mensajes', fmtInt(x.msgs)], ['Costo/msj', x.msgs ? fmtMoney(x.spent / x.msgs) : '—']].map(([l, v]) => `<div class="card flat" style="padding:10px 12px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em">${l}</div><div class="num" style="font-size:20px">${v}</div></div>`).join('')}</div>
    </div>`).join('')}
    <div class="card">${cardHead(ICON.trend(15), 'Mayor gasto', 'Campañas que más invierten en el período', '', 'var(--app-campanas)')}
      ${topSpend.filter(c => c.spentP).map(c => `<div style="margin-bottom:8px"><div class="row sm"><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</span><b>${fmtShort(c.spentP)}</b></div><div class="bar thin" style="--c:${ctypeOf(c.type).c};margin-top:3px"><i style="width:${c.spentP / maxC * 100}%"></i></div></div>`).join('') || empty('Sin gasto registrado')}
    </div>
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:6px"><div><h3>Resultado por zona</h3><div class="sm muted">Norte, Centro, Sur y Todo Chile · el mapa se tiñe según el número de campañas por región</div></div><span class="spacer"></span><button class="btn sm" data-go="campanas/zonas">Ver por región ${ICON.arrow(12)}</button></div>
    <div class="grid map-grid2" style="grid-template-columns:1fr 140px;align-items:center">
      <table class="table"><thead><tr><th>Zona</th><th class="r">Campañas</th><th class="r">Gasto</th><th class="r">Mensajes</th><th class="r">Costo/msj</th><th class="r">Vendido</th><th class="r">ROAS</th></tr></thead><tbody>
        ${byZone.map(x => `<tr><td class="b">${x.z.name}</td><td class="r">${x.n}</td><td class="r">${fmtShort(x.sp)}</td><td class="r">${fmtInt(x.mg)}</td><td class="r">${x.mg ? fmtMoney(x.sp / x.mg) : '—'}</td><td class="r">${fmtShort(x.so)}</td><td class="r b">${roasTxt(x.roas)}</td></tr>`).join('')}
        <tr><td class="b">Todo Chile</td><td class="r">${camps.filter(c => c.regions.length === REGIONS.length).length}</td><td class="r" colspan="5"><span class="xs muted">campañas dirigidas a todas las regiones (incluidas arriba)</span></td></tr>
      </tbody></table>
      ${chileMapSvg(r => { const n = regCount(r); return n ? { fill: `color-mix(in srgb, var(--app-campanas) ${30 + 70 * n / maxReg}%, var(--line))`, title: `${n} campañas` } : {}; }, { w: 120, h: 280 })}
    </div>
  </div>`;
}

// ---------- Lista ----------
function campanasLista() {
  const all = Store.list('campaigns');
  const rows = all.filter(c => cpFilter(c) && (CP.lstate === 'all' ? !c.archived : CP.lstate === 'arch' ? c.archived : c.state === CP.lstate && !c.archived) && (!CP.ltype || c.type === CP.ltype)).sort((a, b) => (b.state === 'on') - (a.state === 'on') || (b.start || '').localeCompare(a.start || ''));
  return `
  <div class="page-head"><div><h1>Todas las campañas</h1><p>Cada una con su objetivo, plataforma, zona y resultados.</p></div><div class="actions"><button class="btn" data-print="Campañas · Lista">${ICON.pdf(14)} Informe PDF</button><button class="btn" id="cp-csv">${ICON.download(14)} Excel</button><button class="btn primary" id="cp-new2">${ICON.plus(14)} Campaña</button></div></div>
  ${cpTabs('lista')}
  <div class="row wrap no-print" style="margin:0 4px 14px">
    <div class="seg">${[['all', 'Todas'], ['on', 'Activas'], ['draft', 'Borradores'], ['off', 'Desactivadas'], ['arch', 'Archivadas']].map(([k, l]) => `<button class="${CP.lstate === k ? 'on' : ''}" data-clstate="${k}">${l}</button>`).join('')}</div>
    <div class="seg"><button class="${!CP.plat ? 'on' : ''}" data-cplat="">Ambas</button>${PLATFORMS.map(p => `<button class="${CP.plat === p.id ? 'on' : ''}" data-cplat="${p.id}">${p.name}</button>`).join('')}</div>
    <select class="select" id="cp-ltype" style="width:190px"><option value="">Todos los objetivos</option>${CAMPAIGN_TYPES.map(t => `<option value="${t.id}" ${CP.ltype === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
    <select class="select" id="cp-zone" style="width:150px"><option value="">Todas las zonas</option><option value="all" ${CP.zone === 'all' ? 'selected' : ''}>Todo Chile</option>${ZONES.map(z => `<option value="${z.id}" ${CP.zone === z.id ? 'selected' : ''}>${z.name}</option>`).join('')}</select>
    <span class="spacer"></span><span class="sm muted">${rows.length} campañas</span></div>
  <div class="card"><table class="table"><thead><tr><th>Campaña</th><th>Objetivo</th><th>Plataforma</th><th>Zona</th><th>Estado</th><th>Fechas</th><th class="r">Presup./día</th><th class="r">Gasto</th><th class="r">Impresiones</th><th class="r">Alcance</th><th class="r">Resultado</th><th class="r">Costo/resultado</th><th></th></tr></thead><tbody>
    ${rows.map(c => `<tr class="link" data-cedit2="${c.id}"><td class="b">${esc(c.name)}</td><td>${chip(ctypeOf(c.type).name, ctypeOf(c.type).c)}</td><td>${platChip(c.platform)}</td><td class="sm">${zoneLabel(c.regions)}</td><td>${stateChip(c.state)}</td><td class="sm muted" style="white-space:nowrap">${fmtDate(c.start)} → ${c.end ? fmtDate(c.end) : 'en curso'}</td><td class="r">${c.budget ? fmtShort(c.budget) : '—'}</td><td class="r b">${c.spent ? fmtShort(c.spent) : '—'}</td><td class="r">${c.impressions ? fmtInt(c.impressions) : '—'}</td><td class="r">${c.reach ? fmtInt(c.reach) : '—'}</td><td class="r" style="white-space:nowrap">${(() => { const r = adsResult(c); return r.n ? `<b>${fmtInt(r.n)}</b> <span class="xs muted">${r.label}</span>` : '—'; })()}</td><td class="r">${adsResult(c).n ? fmtMoney((c.spent || 0) / adsResult(c).n) : '—'}</td><td class="r no-print">${c.auto ? autoChip(c) : (!c.spent && !c.impressions ? pendingChip('Sin datos') : '')}</td></tr>`).join('') || `<tr><td colspan="13">${empty('Sin campañas en este filtro')}</td></tr>`}
  </tbody></table></div>`;
}

// ---------- Por zona ----------
function campanasZonas() {
  const range = periodRange(CP.period, CP.from, CP.to);
  const camps = Store.list('campaigns').filter(c => !c.archived && overlaps(c, range) && (!CP.plat || c.platform === CP.plat));
  const regStats = REGIONS.map(r => { const xs = camps.filter(c => c.regions.includes(r)); const sp = xs.reduce((a, c) => a + adsIn(c, 'spent', range), 0), mg = xs.reduce((a, c) => a + adsIn(c, 'messages', range), 0), so = xs.reduce((a, c) => a + campMetrics(c, range).sold, 0); return { r, z: zoneOfRegion(r), n: xs.length, on: xs.filter(c => c.state === 'on').length, sp, mg, so, roas: sp ? so / sp : null, types: [...new Set(xs.map(c => c.type))] }; });
  const maxN = Math.max(1, ...regStats.map(x => x.n));
  const sel = CP.zone && CP.zone !== 'all' ? ZONES.find(z => z.id === CP.zone) : null;
  const shown = sel ? regStats.filter(x => x.z === sel) : regStats;
  return `
  <div class="page-head"><div><h1>Por zona</h1><p>Dónde se están haciendo campañas y cómo rinden por región.</p></div><div class="actions"><button class="btn" data-print="Campañas · Por zona">${ICON.pdf(14)} Informe PDF</button></div></div>
  ${cpTabs('zonas')}
  <div class="row wrap no-print" style="margin:0 4px 14px">${periodBar(CP.period, CP.from, CP.to, 'c')}<span class="spacer"></span><div class="seg"><button class="${!CP.plat ? 'on' : ''}" data-cplat="">Ambas</button>${PLATFORMS.map(p => `<button class="${CP.plat === p.id ? 'on' : ''}" data-cplat="${p.id}">${p.name}</button>`).join('')}</div></div>
  <div class="grid" style="grid-template-columns:260px 1fr;align-items:start">
    <div class="card"><div class="chips" style="justify-content:center;margin-bottom:10px"><button class="chip-btn ${!sel ? 'on' : ''}" data-czone="">Todo Chile</button>${ZONES.map(z => `<button class="chip-btn ${CP.zone === z.id ? 'on' : ''}" data-czone="${z.id}">${z.name.replace('Zona ', '')}</button>`).join('')}</div>
      ${chileMapSvg(r => { const x = regStats.find(s => s.r === r); const dim = sel && x.z !== sel; return x.n && !dim ? { fill: `color-mix(in srgb, var(--app-campanas) ${30 + 70 * x.n / maxN}%, var(--line))`, title: `${x.n} campañas` } : {}; }, { w: 200, h: 420 })}
      <div class="xs muted" style="text-align:center;margin-top:8px">Más oscuro = más campañas en el período</div></div>
    <div class="grid" style="gap:10px">
      ${ZONES.filter(z => !sel || z === sel).map(z => { const xs = regStats.filter(x => x.z === z); const sp = xs.reduce((a, x) => a + x.sp, 0); return `<div class="card"><div class="row" style="margin-bottom:8px"><h3>${z.name}</h3><span class="sm muted">${[...new Set(camps.filter(c => z.regions.some(r => c.regions.includes(r))).map(c => c.id))].length} campañas · ${fmtShort(camps.filter(c => z.regions.some(r => c.regions.includes(r))).reduce((a, c) => a + adsIn(c, 'spent', range), 0))}</span></div>
        <table class="table"><thead><tr><th>Región</th><th class="r">Campañas</th><th class="r">Activas</th><th>Objetivos</th><th class="r">Gasto</th><th class="r">Mensajes</th><th class="r">ROAS</th></tr></thead><tbody>
        ${xs.map(x => `<tr><td class="b">${esc(x.r)}</td><td class="r">${x.n}</td><td class="r">${x.on ? `<span class="ok b">${x.on}</span>` : '<span class="muted">0</span>'}</td><td><div class="row wrap" style="gap:4px">${x.types.map(t => `<span class="chip c" style="--c:${ctypeOf(t).c}"><i></i>${ctypeOf(t).name}</span>`).join('') || '<span class="muted">—</span>'}</div></td><td class="r">${x.sp ? fmtShort(x.sp) : '—'}</td><td class="r">${x.mg ? fmtInt(x.mg) : '—'}</td><td class="r b">${roasTxt(x.roas)}</td></tr>`).join('')}
        </tbody></table></div>`; }).join('')}
      <div class="xs muted">Una campaña dirigida a varias regiones cuenta en cada una; el gasto se muestra completo por región (no se reparte).</div>
    </div>
  </div>`;
}

function bindCampanas(el) {
  $$('[data-print]', el).forEach(b => b.onclick = () => printSection(b.dataset.print));
  $$('[data-cperiod]', el).forEach(b => b.onclick = () => { CP.period = b.dataset.cperiod; cpSave(); render(); });
  $$('[data-cfrom]', el).forEach(i => i.onchange = e => { CP.from = e.target.value; cpSave(); render(); });
  $$('[data-cto]', el).forEach(i => i.onchange = e => { CP.to = e.target.value; cpSave(); render(); });
  $$('[data-cplat]', el).forEach(b => b.onclick = () => { CP.plat = b.dataset.cplat; cpSave(); render(); });
  $$('[data-czone]', el).forEach(b => b.onclick = () => { CP.zone = b.dataset.czone; cpSave(); render(); });
  $$('[data-clstate]', el).forEach(b => b.onclick = () => { CP.lstate = b.dataset.clstate; cpSave(); render(); });
  $$('[data-ascope]', el).forEach(b => b.onclick = () => { CP.ascope = b.dataset.ascope; cpSave(); render(); });
  const z = $('#cp-zone', el); if (z) z.onchange = e => { CP.zone = e.target.value; cpSave(); render(); };
  const lt = $('#cp-ltype', el); if (lt) lt.onchange = e => { CP.ltype = e.target.value; cpSave(); render(); };
  $$('[data-cedit2]', el).forEach(b => b.onclick = () => campaignModal(Store.list('campaigns').find(c => c.id === b.dataset.cedit2)));
  const n = $('#cp-new2', el); if (n) n.onclick = () => campaignModal(null);
  const rf = $('#ads-refresh', el); if (rf) rf.onclick = () => adsRefresh(rf);
  const csv = $('#cp-csv', el); if (csv) csv.onclick = () => {
    const rows = Store.list('campaigns').map(c => [c.name, ctypeOf(c.type).name, PLATFORMS.find(p => p.id === c.platform)?.name, zoneLabel(c.regions), c.regions.join(' / '), c.state === 'on' ? 'Activa' : c.state === 'draft' ? 'Borrador' : 'Desactivada', c.start, c.end, c.budget, c.spent, c.impressions, c.reach, c.messages, c.notes]);
    const out = [['Campaña', 'Objetivo', 'Plataforma', 'Zona', 'Regiones', 'Estado', 'Inicio', 'Término', 'Presupuesto diario', 'Gastado', 'Impresiones', 'Alcance', 'Mensajes', 'Notas'], ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + out], { type: 'text/csv;charset=utf-8' })); a.download = `K8_CAMPANAS_${todayIso()}.csv`; a.click();
  };
}

PAGES.campanas = route => {
  const map = { dashboard: ['Campañas · Dashboard', campanasDashboard], analisis: ['Campañas · Análisis', campanasAnalisis], lista: ['Campañas · Lista', campanasLista], zonas: ['Campañas · Por zona', campanasZonas], web: ['Campañas · Sitio web', campanasWeb, bindWeb], whatsapp: ['Campañas · WhatsApp', campanasWhatsapp, bindWhatsapp], mercadolibre: ['Campañas · Mercado Libre', campanasMercadoLibre, bindMercadoLibre] };
  const [title, fn, extra] = map[route.sec] || map.dashboard;
  return { title, html: fn(), mount: el => { bindCampanas(el); if (extra) extra(el); } };
};
