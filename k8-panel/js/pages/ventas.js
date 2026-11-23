// ============================================================
// Marketing y Desarrollo · Ventas (Inicio, Campañas, Registro, Resumen)
// ============================================================
'use strict';

const VT = Store.read('vt_ui', {}) || {};
VT.period = VT.period || 'mes'; VT.from = VT.from || ''; VT.to = VT.to || '';
VT.cstate = VT.cstate || 'on'; VT.ctype = VT.ctype || ''; VT.czone = VT.czone || ''; VT.cq = VT.cq || '';
VT.rperiod = VT.rperiod || 'mes'; VT.rcamp = VT.rcamp || ''; VT.rkind = VT.rkind || ''; VT.rq = VT.rq || '';
VT.sstate = VT.sstate || ''; VT.stype = VT.stype || ''; VT.szone = VT.szone || '';
const vtSave = () => Store.write('vt_ui', VT);

// ---------- Período ----------
const PERIODS = [['mes', 'Este mes'], ['ant', 'Mes anterior'], ['3m', '3 meses'], ['ano', 'Este año'], ['todo', 'Todo'], ['custom', 'Fechas…']];
function periodRange(key, from, to) {
  const t = parseDay(todayIso()); const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const m0 = new Date(t.getFullYear(), t.getMonth(), 1);
  if (key === 'mes') return [iso(m0), todayIso()];
  if (key === 'ant') return [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), iso(new Date(t.getFullYear(), t.getMonth(), 0))];
  if (key === '3m') return [iso(new Date(t.getFullYear(), t.getMonth() - 2, 1)), todayIso()];
  if (key === 'ano') return [`${t.getFullYear()}-01-01`, todayIso()];
  if (key === 'custom') return [from || '2000-01-01', to || todayIso()];
  return ['2000-01-01', '2999-12-31'];
}
const inRange = (d, [a, b]) => d >= a && d <= b;
const overlaps = (c, [a, b]) => c.start <= b && (c.end || '2999-12-31') >= a;
function periodBar(key, from, to, prefix) {
  return `<div class="row wrap"><span class="xs muted b" style="letter-spacing:.07em;text-transform:uppercase">Período</span><div class="seg">${PERIODS.map(([k, l]) => `<button class="${key === k ? 'on' : ''}" data-${prefix}period="${k}">${l}</button>`).join('')}</div>${key === 'custom' ? `<input class="input" type="date" style="width:150px" data-${prefix}from value="${from}"> <input class="input" type="date" style="width:150px" data-${prefix}to value="${to}">` : ''}</div>`;
}

// ---------- Métricas de campaña ----------
function campMetrics(c, range) {
  const sales = Store.list('sales').filter(s => s.campaign === c.id && (!range || inRange(s.date, range)));
  const sold = sales.reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const n = sales.filter(s => s.kind === 'venta').length, nc = sales.filter(s => s.kind !== 'venta').length;
  const spent = c.spent || 0, profit = sold - spent, roas = spent ? sold / spent : null, margin = sold ? profit / sold : null;
  const cpm = c.messages ? spent / c.messages : null;
  const result = !spent && !sold ? 'sin' : roas == null ? 'sin' : roas >= 2 ? 'exitosa' : roas >= 1 ? 'regular' : 'perdida';
  return { sold, n, nc, spent, profit, roas, margin, cpm, result };
}
const resultChip = r => r === 'exitosa' ? chip(`${ICON.check(11)} Exitosa`, 'var(--ok)') : r === 'regular' ? chip('Regular', 'var(--warn)') : r === 'perdida' ? chip('No rentable', 'var(--danger)') : chip(`${ICON.clock(11)} Sin datos`, 'var(--faint)');
const roasTxt = r => r == null ? '—' : r.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'x';
const pctTxt = m => m == null ? '—' : Math.round(m * 100) + '%';
const durTxt = c => { const d = daysBetween(c.start, c.end || todayIso()) + 1; return `${fmtDate(c.start)} → ${c.end ? fmtDate(c.end) : 'en curso'} (${d} ${d === 1 ? 'día' : 'días'})`; };
const stateChip = s => s === 'on' ? chip('Activa', 'var(--ok)') : s === 'draft' ? chip('Borrador', 'var(--warn)') : chip('Desactivada', 'var(--faint)');
const platChip = p => { const x = PLATFORMS.find(q => q.id === p); return x ? chip(x.name, x.c) : ''; };

// ---------- Mapa de Chile (hexágonos) ----------
// Cada región: fila de hexágonos; cantidad según superficie aproximada, desplazada para dibujar la silueta.
const CHILE_ROWS = [
  ['Arica y Parinacota', 2, 1], ['Tarapacá', 3, 1], ['Antofagasta', 4, 1], ['Antofagasta', 4, 1.5], ['Atacama', 3, 1.5], ['Atacama', 3, 2],
  ['Coquimbo', 3, 2.5], ['Valparaíso', 3, 3], ['Metropolitana', 3, 3.2], ["O'Higgins", 3, 3.2], ['Maule', 3, 3.5], ['Ñuble', 2, 3.8],
  ['Biobío', 3, 3.8], ['La Araucanía', 3, 4], ['Los Ríos', 2, 4.3], ['Los Lagos', 3, 4.5], ['Los Lagos', 2, 5], ['Aysén', 3, 5.3], ['Aysén', 2, 5.8],
  ['Magallanes', 3, 6.2], ['Magallanes', 4, 6.6], ['Magallanes', 3, 7.2],
];
// Mapa como franja vertical: una fila por región de norte a sur, agrupadas por zona, con su nombre al lado.
// Mantiene la misma firma: fillOf(region) → { fill, cls, title }. Los rectángulos llevan data-region para poder hacer clic.
const CHILE_ABBR = { 'Arica y Parinacota': 'Arica', 'Tarapacá': 'Tarapacá', 'Antofagasta': 'Antofagasta', 'Atacama': 'Atacama', 'Coquimbo': 'Coquimbo', 'Valparaíso': 'Valparaíso', 'Metropolitana': 'Metropolitana', "O'Higgins": "O'Higgins", 'Maule': 'Maule', 'Ñuble': 'Ñuble', 'Biobío': 'Biobío', 'La Araucanía': 'Araucanía', 'Los Ríos': 'Los Ríos', 'Los Lagos': 'Los Lagos', 'Aysén': 'Aysén', 'Magallanes': 'Magallanes' };
function chileMapSvg(fillOf, { w = 120, h = 300, interactive = false, labels = true } = {}) {
  const rowH = 15, gap = 2, zoneGap = 10, barW = labels ? 34 : w - 8, x0 = labels ? w - barW - 4 : 4;
  let y = 4, out = '';
  ZONES.forEach(z => {
    out += `<text class="zone" x="${x0 + barW}" y="${y + 7}" text-anchor="end">${z.name.replace('Zona ', '')}</text>`; y += 10;
    z.regions.forEach(reg => {
      const f = fillOf(reg);
      out += `<rect class="reg ${f.cls || ''}" x="${x0}" y="${y}" width="${barW}" height="${rowH}" rx="4" ${f.fill ? `style="fill:${f.fill}"` : ''} data-region="${esc(reg)}"><title>${esc(reg)}${f.title ? ' · ' + f.title : ''}</title></rect>`;
      if (labels) out += `<text class="lbl" x="${x0 - 5}" y="${y + rowH / 2 + 3}" text-anchor="end">${esc(CHILE_ABBR[reg] || reg)}</text>`;
      y += rowH + gap;
    });
    y += zoneGap - gap;
  });
  const H = y + 2;
  return `<svg class="chile-map chile-strip" viewBox="0 0 ${w} ${H}" width="${w}" height="${Math.round(H * (h / H) > h ? h : H)}" preserveAspectRatio="xMidYMin meet" style="display:block;margin:0 auto;max-width:100%">${out}</svg>`;
}

// ---------- Ventas › Inicio ----------
function ventasInicio() {
  const t = todayIso(), month = t.slice(0, 7); const range = periodRange(VT.period, VT.from, VT.to);
  const camps = Store.list('campaigns'); const inP = camps.filter(c => overlaps(c, range));
  const sales = Store.list('sales').filter(s => inRange(s.date, range));
  const sold = sales.reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const spent = inP.reduce((a, c) => a + (c.spent || 0), 0), msgs = inP.reduce((a, c) => a + (c.messages || 0), 0);
  const withCamp = sales.filter(s => s.campaign).reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const active = camps.filter(c => c.state === 'on');
  const mets = inP.map(c => ({ c, m: campMetrics(c, range) }));
  const best = mets.filter(x => x.m.roas != null && x.m.spent).sort((a, b) => b.m.roas - a.m.roas)[0];
  const worst = mets.filter(x => x.m.spent && x.m.roas != null && x.m.roas < 1)[0];
  const goal = Store.read('goals', {})[month] || 0; const mesSold = Store.list('sales').filter(s => s.date.startsWith(month)).reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const dayN = Number(t.slice(8)), dim = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)), 0).getDate();
  const lastOff = camps.filter(c => c.state === 'off' && c.end).sort((a, b) => b.end.localeCompare(a.end))[0];
  const byType = CAMPAIGN_TYPES.map(tp => { const xs = mets.filter(x => x.c.type === tp.id); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0); return { tp, n: xs.length, roas: sp ? so / sp : null }; }).filter(x => x.n);
  const maxRoas = Math.max(1, ...byType.map(x => x.roas || 0));
  const regCount = r => inP.filter(c => c.regions.includes(r)).length;
  const regRoas = r => { const xs = mets.filter(x => x.c.regions.includes(r)); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0); return sp ? so / sp : null; };
  const maxReg = Math.max(1, ...REGIONS.map(regCount));
  const regionList = REGIONS.map(r => ({ r, n: regCount(r), roas: regRoas(r) }));

  return `
  <div class="page-head"><div><h1>Ventas</h1><p>Ventas digitales y campañas de Meta y Google Ads.</p></div><div class="actions"><button class="btn" data-print="Ventas · Inicio">${ICON.pdf(14)} Informe PDF</button></div></div>
  ${ventasTabs('inicio')}
  <div class="grid g3" style="margin-bottom:14px">
    <div class="card link" data-go="marketing/ventas/campanas">${cardHead(ICON.mega(15), 'Campañas', '', 'marketing/ventas/campanas', 'var(--app-marketing)')}<div class="num" style="font-size:30px">${active.length} <span class="sm muted" style="font-weight:600">de ${camps.length} activas</span></div><div class="sm muted" style="margin-top:4px">${lastOff ? `«${esc(lastOff.name)}» se desactivó hace ${daysBetween(lastOff.end, t)} días` : 'Sin campañas desactivadas'}</div></div>
    <div class="card link" data-go="marketing/ventas/registro">${cardHead(ICON.doc(15), 'Ventas', '', 'marketing/ventas/registro', 'var(--ok)')}<div class="num" style="font-size:30px">${fmtShort(sold)} <span class="sm muted" style="font-weight:600">vendido neto</span></div><div class="sm muted" style="margin-top:4px">${sales.filter(s => s.kind === 'venta').length} ventas · ${sales.filter(s => s.kind !== 'venta').length} notas de crédito</div></div>
    <div class="card link" data-go="marketing/ventas/resumen">${cardHead(ICON.spark(15), 'Resumen', '', 'marketing/ventas/resumen', 'var(--app-campanas)')}<div class="num" style="font-size:30px">${spent ? roasTxt(sold / spent) : '—'} <span class="sm muted" style="font-weight:600">ROAS</span></div><div class="sm muted" style="margin-top:4px">${best ? `Más exitosa: «${esc(best.c.name)}»` : 'Sin datos suficientes'}</div></div>
  </div>
  <div class="row wrap no-print" style="margin:0 4px 12px">${periodBar(VT.period, VT.from, VT.to, 'v')}<span class="spacer"></span><span class="sm muted"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);margin-right:6px"></i>Campañas activas: <b>${active.length} de ${camps.length}</b> · Período: del ${fmtDate(range[0])} al ${fmtDate(range[1])}</span></div>
  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Gastado total', fmtMoney(spent), inP.some(c => !c.budget) ? 'Sin presupuesto diario cargado' : `${fmtMoney(inP.reduce((a, c) => a + (c.budget || 0), 0))} presupuesto diario`)}
    ${kpi('Vendido neto', fmtMoney(sold), `<span class="ok b">ROAS ${spent ? roasTxt(sold / spent) : '—'} ${ICON.check(11)}</span> · ${sales.filter(s => s.kind === 'venta').length} ventas · con campaña ${fmtShort(withCamp)}`)}
    ${kpi('Ganancia', fmtMoney(sold - spent), `Margen ${sold ? Math.round((sold - spent) / sold * 100) : 0}% · antes de costos de producto`)}
    ${kpi('Mensajes', fmtInt(msgs), msgs ? `${fmtMoney(spent / msgs)} por mensaje` : pendingChip('Meta: pendiente de conexión'))}
  </div>
  <div class="card" style="margin-bottom:14px"><div class="row"><b>Meta de ${new Date().toLocaleDateString('es-CL', { month: 'long' })}</b><span class="sm muted">${goal ? `${pct(mesSold, goal)}% · ${fmtShort(mesSold)} de ${fmtShort(goal)} · faltan ${fmtShort(Math.max(0, goal - mesSold))} · día ${dayN} de ${dim}` : 'Sin meta definida'}</span><span class="spacer"></span><button class="icon-btn sm no-print" id="goal-edit" title="Editar meta">${ICON.edit(13)}</button></div><div style="margin-top:10px">${bar(goal ? pct(mesSold, goal) : 0, 'var(--ok)')}</div></div>
  <div class="grid" style="grid-template-columns:1.1fr 1fr">
    <div class="card">
      <div class="row" style="margin-bottom:6px"><div><h3>Dónde se han hecho campañas</h3><div class="sm muted">Color = n.º de campañas · lista = resultado</div></div></div>
      <div class="grid map-grid" style="grid-template-columns:1fr 140px 1fr;align-items:center">
        <div class="list">${regionList.slice(0, 8).map(x => regRow(x)).join('')}</div>
        ${chileMapSvg(r => { const n = regCount(r); return n ? { fill: `color-mix(in srgb, var(--app-marketing) ${30 + 70 * n / maxReg}%, var(--line))`, title: `${n} campañas` } : {}; })}
        <div class="list">${regionList.slice(8).map(x => regRow(x)).join('')}</div>
      </div>
    </div>
    <div class="card">
      <h3>Qué funcionó mejor</h3><div class="sm muted" style="margin-bottom:10px">Calculado con las ventas y gastos del período</div>
      <span class="chip c" style="--c:var(--app-marketing)">Análisis automático</span>
      <div class="list" style="margin-top:8px">
        ${best ? insight(ICON.spark(14), 'var(--ok)', `La campaña más exitosa fue <b>«${esc(best.c.name)}»</b> (${ctypeOf(best.c.type).name} · ${zoneLabel(best.c.regions)}): vendió <b>${fmtShort(best.m.sold)}</b> con <b>${fmtShort(best.m.spent)}</b> en Meta, <b>${roasTxt(best.m.roas)}</b> lo invertido.`) : insight(ICON.clock(14), 'var(--faint)', 'Aún no hay campañas con gasto y ventas en este período.')}
        ${worst ? insight(ICON.trend(14), 'var(--danger)', `<b>«${esc(worst.c.name)}»</b> no fue rentable: gastó <b>${fmtShort(worst.m.spent)}</b> y vendió <b>${fmtShort(worst.m.sold)}</b> (${roasTxt(worst.m.roas)}; necesita al menos 2,0x).`) : ''}
        ${insight(ICON.mega(14), 'var(--app-marketing)', `Se hicieron <b>${inP.length}</b> campañas: ${byType.map(x => `<b>${x.n}</b> de ${x.tp.name}`).join(' y ') || 'ninguna'}.`)}
      </div>
      ${byType.length ? `<div class="xs muted b" style="text-transform:uppercase;letter-spacing:.07em;margin:14px 0 6px">ROAS por tipo</div>${byType.sort((a, b) => (b.roas || 0) - (a.roas || 0)).map(x => `<div class="row" style="margin-bottom:6px"><span class="sm" style="width:140px">${x.tp.name}</span><div class="bar" style="flex:1;--c:${x.tp.c}"><i style="width:${(x.roas || 0) / maxRoas * 100}%"></i></div><b class="sm" style="width:44px;text-align:right">${roasTxt(x.roas)}</b></div>`).join('')}` : ''}
      <div class="xs muted" style="margin-top:12px">Calculado con las ventas registradas en esta app. Una venta cuenta para la campaña que eligió el vendedor; no es la atribución de Meta.</div>
    </div>
  </div>`;
}
const regRow = x => `<div class="list-item" style="padding:6px 4px"><span style="width:8px;height:8px;border-radius:50%;background:${x.n ? (x.roas == null ? 'var(--faint)' : x.roas >= 2 ? 'var(--ok)' : x.roas >= 1 ? 'var(--warn)' : 'var(--danger)') : 'var(--line)'};flex:none"></span><div style="min-width:0"><div class="sm b">${esc(x.r)}</div><div class="xs muted">${x.n ? (x.roas == null ? 'Sin datos' : `${x.roas >= 2 ? 'Exitosa' : x.roas >= 1 ? 'Regular' : 'No rentable'} · ${roasTxt(x.roas)}`) : 'Sin campañas'}</div></div><span class="spacer"></span><b class="num">${x.n}</b></div>`;
const insight = (ic, c, txt) => `<div class="list-item" style="align-items:flex-start"><span class="icon-btn sm" style="color:${c};flex:none">${ic}</span><div class="sm" style="white-space:normal;min-width:0">${txt}</div></div>`;
const ventasTabs = on => `<div class="tabs no-print">${[['inicio', 'Inicio'], ['campanas', 'Campañas'], ['registro', 'Registro'], ['resumen', 'Resumen']].map(([k, l]) => `<button class="${on === k ? 'on' : ''}" data-go="marketing/ventas/${k}">${l}</button>`).join('')}</div>`;

function goalModal() {
  const month = todayIso().slice(0, 7); const goals = Store.read('goals', {});
  openModal(modalHtml('Meta del mes', `<div class="field"><label>Meta de ventas digitales · ${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</label><input class="input" type="number" id="goal-v" value="${goals[month] || ''}" placeholder="3500000"><div class="hint">Monto neto, sin IVA.</div></div>`, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="goal-save">Guardar</button>`), { narrow: true, onMount(m) { $('#goal-save', m).onclick = () => { goals[month] = Number($('#goal-v', m).value) || 0; Store.write('goals', goals); closeModal(); render(); }; } });
}

// ---------- Ventas › Campañas ----------
function campaignModal(camp) {
  const c = camp || { name: '', type: 'ventas', platform: 'meta', regions: [], start: todayIso(), end: '', budget: '', spent: 0, impressions: 0, reach: 0, messages: 0, dataAt: '', notes: '', state: 'on' };
  let regions = [...c.regions], type = c.type, platform = c.platform, state = c.state;
  const regionChips = () => ZONES.map(z => `<div class="row wrap" style="margin-bottom:6px"><span class="sm muted" style="width:52px">${z.name.replace('Zona ', '')}:</span>${z.regions.map(r => `<button type="button" class="chip-btn ${regions.includes(r) ? 'on' : ''}" data-reg="${esc(r)}">${esc(r)}</button>`).join('')}</div>`).join('');
  openModal(modalHtml(camp ? 'Editar campaña' : 'Nueva campaña', `
    <div class="field"><label>Nombre *</label><input class="input" id="cp-name" value="${esc(c.name)}" placeholder="Ropa de trabajo Antofagasta"></div>
    <div class="form-grid">
      <div class="field"><label>Plataforma</label><div class="chips">${PLATFORMS.map(p => `<button type="button" class="chip-btn c ${p.id === platform ? 'on' : ''}" style="--c:${p.c}" data-plat="${p.id}"><i></i>${p.name}</button>`).join('')}</div></div>
      <div class="field"><label>Estado</label><div class="seg">${[['on', 'Activa'], ['draft', 'Borrador'], ['off', 'Desactivada']].map(([k, l]) => `<button type="button" class="${state === k ? 'on' : ''}" data-state="${k}">${l}</button>`).join('')}</div></div>
    </div>
    <div class="field"><label>Tipo de campaña *</label><div class="chips">${CAMPAIGN_TYPES.map(t => `<button type="button" class="chip-btn c ${t.id === type ? 'on' : ''}" style="--c:${t.c}" data-ctype="${t.id}"><i></i>${t.name}</button>`).join('')}</div><div class="hint">Elige el objetivo que tiene la campaña en Meta o Google.</div></div>
    <div class="field"><label>¿A quién va dirigida? *</label>
      <div class="grid" style="grid-template-columns:1fr 130px;align-items:start">
        <div>
          <div class="row wrap" style="margin-bottom:8px"><span class="sm muted" style="width:52px">Atajos:</span>${ZONES.map(z => `<button type="button" class="chip-btn" data-zone="${z.id}">${z.name}</button>`).join('')}<button type="button" class="chip-btn" data-zone="all">Todo Chile</button></div>
          <div id="cp-regions">${regionChips()}</div>
          <div class="sm">Seleccionado: <b id="cp-sel">${zoneLabel(regions)}</b></div>
        </div>
        <div id="cp-map">${chileMapSvg(r => regions.includes(r) ? { cls: 'on' } : {}, { w: 120, h: 230, interactive: true })}</div>
      </div>
    </div>
    <div class="grid g3">
      <div class="field"><label>Inicio *</label><input class="input" type="date" id="cp-start" value="${c.start}"></div>
      <div class="field"><label>Término</label><input class="input" type="date" id="cp-end" value="${c.end || ''}"><div class="hint">Vacío = en curso.</div></div>
      <div class="field"><label>Presupuesto diario $</label><input class="input" type="number" id="cp-budget" value="${c.budget || ''}" placeholder="10.000"><div class="hint">Lo que la plataforma gasta por día (opcional).</div></div>
    </div>
    <div class="field"><label>Resultados de la plataforma <span class="muted" style="font-weight:500">${c.auto ? `(vienen de ${PLATFORMS.find(p => p.id === c.platform)?.name || 'la plataforma'} y se actualizan solos; no se editan aquí)` : '(se completan solos cuando esté la conexión; mientras tanto puedes anotarlos)'}</span></label>
      <div class="grid g5">
        <div class="field"><label class="xs">Gastado $</label><input class="input" type="number" id="cp-spent" value="${c.spent || ''}" placeholder="0" ${c.auto ? 'readonly' : ''}></div>
        <div class="field"><label class="xs">Impresiones</label><input class="input" type="number" id="cp-imp" value="${c.impressions || ''}" placeholder="0" ${c.auto ? 'readonly' : ''}></div>
        <div class="field"><label class="xs">Alcance</label><input class="input" type="number" id="cp-reach" value="${c.reach || ''}" placeholder="0" ${c.auto ? 'readonly' : ''}></div>
        <div class="field"><label class="xs">Mensajes recibidos</label><input class="input" type="number" id="cp-msg" value="${c.messages || ''}" placeholder="0" ${c.auto ? 'readonly' : ''}></div>
        <div class="field"><label class="xs">Datos al</label><input class="input" type="date" id="cp-dataAt" value="${c.dataAt || ''}" ${c.auto ? 'readonly' : ''}></div>
      </div>${c.auto && c.url ? `<div class="hint"><a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir en ${PLATFORMS.find(p => p.id === c.platform)?.name} ↗</a>${c.leads ? ` · ${fmtInt(c.leads)} leads` : ''}${c.clicks ? ` · ${fmtInt(c.clicks)} clics` : ''}${c.purchases ? ` · ${fmtInt(c.purchases)} compras` : ''}</div>` : ''}</div>
    <div class="field"><label>Notas</label><textarea class="input" id="cp-notes" rows="2">${esc(c.notes || '')}</textarea></div>
  `, `${camp ? `<button class="btn ghost danger" id="cp-del">${ICON.trash(14)} Eliminar</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cp-save">Guardar campaña</button>`), {
    onMount(m) {
      const refresh = () => { $('#cp-regions', m).innerHTML = regionChips(); $('#cp-map', m).innerHTML = chileMapSvg(r => regions.includes(r) ? { cls: 'on' } : {}, { w: 120, h: 230, interactive: true }); $('#cp-sel', m).textContent = zoneLabel(regions); bindRegions(); };
      const bindRegions = () => {
        $$('[data-reg]', m).forEach(b => b.onclick = () => { const r = b.dataset.reg; regions = regions.includes(r) ? regions.filter(x => x !== r) : [...regions, r]; refresh(); });
        $$('[data-region]', m).forEach(h => h.onclick = () => { const r = h.dataset.region; regions = regions.includes(r) ? regions.filter(x => x !== r) : [...regions, r]; refresh(); });
      };
      bindRegions();
      $$('[data-zone]', m).forEach(b => b.onclick = () => { const z = b.dataset.zone; const set = z === 'all' ? REGIONS : ZONES.find(x => x.id === z).regions; const allOn = set.every(r => regions.includes(r)); regions = allOn ? regions.filter(r => !set.includes(r)) : [...new Set([...regions, ...set])]; refresh(); });
      $$('[data-ctype]', m).forEach(b => b.onclick = () => { type = b.dataset.ctype; $$('[data-ctype]', m).forEach(x => x.classList.toggle('on', x === b)); });
      $$('[data-plat]', m).forEach(b => b.onclick = () => { platform = b.dataset.plat; $$('[data-plat]', m).forEach(x => x.classList.toggle('on', x === b)); });
      $$('[data-state]', m).forEach(b => b.onclick = () => { state = b.dataset.state; $$('[data-state]', m).forEach(x => x.classList.toggle('on', x === b)); });
      $('#cp-save', m).onclick = () => {
        const name = $('#cp-name', m).value.trim(); if (!name) return toast('Escribe el nombre de la campaña', true);
        if (!regions.length) return toast('Elige al menos una región', true);
        const n = id => Number($(id, m).value) || 0;
        const row = { ...c, id: c.id || uid(), name, type, platform, state, regions, start: $('#cp-start', m).value, end: $('#cp-end', m).value, budget: n('#cp-budget'), spent: n('#cp-spent'), impressions: n('#cp-imp'), reach: n('#cp-reach'), messages: n('#cp-msg'), dataAt: $('#cp-dataAt', m).value, notes: $('#cp-notes', m).value };
        // Si la campaña viene de la plataforma, recordar qué cambió el equipo a mano para no pisarlo en la próxima actualización.
        if (c.auto) {
          const same = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());
          row.typeManual = c.typeManual || type !== (c.typeAuto || c.type);
          row.regionsManual = c.regionsManual || !same(regions, c.regionsAuto && c.regionsAuto.length ? c.regionsAuto : c.regions);
        }
        Store.upsert('campaigns', row); logActivity(camp ? (camp.state !== state ? (state === 'on' ? 'Activada' : state === 'off' ? 'Desactivada' : 'Borrador') : 'Editada') : 'Creada', row);
        if (!camp && state === 'on') logActivity('Activada', row);
        closeModal(); toast('Campaña guardada'); render();
      };
      const del = $('#cp-del', m); if (del) del.onclick = () => confirmBox('¿Eliminar esta campaña? Las ventas asociadas quedan sin campaña.', () => { Store.remove('campaigns', c.id); Store.write('sales', Store.list('sales').map(s => s.campaign === c.id ? { ...s, campaign: '' } : s)); closeModal(); render(); });
    },
  });
}
function logActivity(action, c) { const log = Store.list('activity'); log.unshift({ id: uid(), action, name: c.name, at: new Date().toISOString(), who: personOf(ME.id).name, end: c.end }); Store.write('activity', log.slice(0, 50)); }

function ventasCampanas() {
  const camps = Store.list('campaigns'); const q = VT.cq.toLowerCase();
  const count = s => camps.filter(c => s === 'all' ? true : s === 'arch' ? c.archived : c.state === s && !c.archived).length;
  const list = camps.filter(c => (VT.cstate === 'all' ? !c.archived : VT.cstate === 'arch' ? c.archived : c.state === VT.cstate && !c.archived) && (!VT.ctype || c.type === VT.ctype) && (!VT.czone || (VT.czone === 'all' ? c.regions.length === REGIONS.length : ZONES.find(z => z.id === VT.czone).regions.some(r => c.regions.includes(r)))) && (!q || c.name.toLowerCase().includes(q)))
    .sort((a, b) => (b.start || '').localeCompare(a.start || ''));
  const log = Store.list('activity').slice(0, 8);
  return `
  <div class="page-head"><div><h1>Campañas</h1><p>Meta Ads y Google Ads · cada campaña con su objetivo y su zona.</p></div><div class="actions"><button class="btn" data-print="Campañas">${ICON.pdf(14)} Informe PDF</button><button class="btn" id="cp-import">${ICON.upload(14)} Importar planilla</button><button class="btn primary" id="cp-new">${ICON.plus(14)} Campaña</button></div></div>
  ${ventasTabs('campanas')}
  <div class="row wrap no-print" style="margin:0 4px 14px">
    <div class="seg">${[['on', `Activas (${count('on')})`], ['draft', `Borradores (${count('draft')})`], ['off', `Desactivadas (${count('off')})`], ['all', 'Todas'], ['arch', 'Archivadas']].map(([k, l]) => `<button class="${VT.cstate === k ? 'on' : ''}" data-cstate="${k}">${l}</button>`).join('')}</div>
    <span class="sm muted">Tipo</span><select class="select" id="cp-ftype" style="width:190px"><option value="">Todos</option>${CAMPAIGN_TYPES.map(t => `<option value="${t.id}" ${VT.ctype === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
    <span class="sm muted">Zona</span><select class="select" id="cp-fzone" style="width:150px"><option value="">Todas</option><option value="all" ${VT.czone === 'all' ? 'selected' : ''}>Todo Chile</option>${ZONES.map(z => `<option value="${z.id}" ${VT.czone === z.id ? 'selected' : ''}>${z.name}</option>`).join('')}</select>
    <span class="spacer"></span><label class="search" style="max-width:260px">${ICON.search(14)}<input id="cp-q" placeholder="Buscar por nombre…" value="${esc(VT.cq)}"></label>
  </div>
  <div class="grid" style="gap:12px">
    ${list.map(c => { const m = campMetrics(c); return `<div class="card" style="border-left:3px solid ${c.state === 'on' ? 'var(--ok)' : c.state === 'draft' ? 'var(--warn)' : 'var(--line)'}">
      <div class="row" style="margin-bottom:8px">${stateChip(c.state)}${platChip(c.platform)}<span class="spacer"></span><button class="icon-btn sm no-print" data-cedit="${c.id}" title="Editar">${ICON.edit(13)}</button><button class="icon-btn sm no-print" data-carch="${c.id}" title="${c.archived ? 'Desarchivar' : 'Archivar'}">${ICON.box(13)}</button></div>
      <div class="row wrap"><h2>${esc(c.name)}</h2>${chip(ctypeOf(c.type).name, ctypeOf(c.type).c)}</div>
      <div class="sm muted" style="margin:2px 0 12px">${ICON.pin(11)} ${zoneLabel(c.regions)} · ${durTxt(c)}</div>
      <div class="grid g6">
        ${[['Gastado', fmtMoney(m.spent)], ['Vendido neto', fmtMoney(m.sold)], ['Ganancia', `<span class="${m.profit < 0 ? 'danger' : ''}">${fmtMoney(m.profit)}</span>`], ['ROAS', roasTxt(m.roas)], ['Margen', pctTxt(m.margin)], ['Presupuesto diario', c.budget ? fmtMoney(c.budget) : '—']].map(([l, v]) => `<div class="card flat" style="padding:10px 12px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em">${l}</div><div class="num" style="font-size:18px">${v}</div></div>`).join('')}
      </div>
      <div class="row wrap sm muted" style="margin-top:10px">Impresiones ${fmtInt(c.impressions)} · Alcance ${fmtInt(c.reach)} · Mensajes ${fmtInt(c.messages)} · ${m.n} ventas${c.dataAt ? ` · datos al ${fmtDate(c.dataAt)}` : ''}<span class="spacer"></span>${!c.spent && !c.impressions ? `<span class="muted">Sin datos de ${PLATFORMS.find(p => p.id === c.platform)?.name} todavía</span> ${pendingChip('Pendiente de conexión')}` : resultChip(m.result)}</div>
    </div>`; }).join('') || empty('Sin campañas en este filtro')}
  </div>
  <div class="card" style="margin-top:14px"><h3 style="margin-bottom:10px">Actividad reciente</h3><div class="list">${log.map(l => `<div class="list-item sm"><i style="width:8px;height:8px;border-radius:50%;background:${l.action === 'Activada' || l.action === 'Creada' ? 'var(--ok)' : 'var(--faint)'};flex:none"></i><b>${l.action}</b> · ${esc(l.name)}${l.action === 'Desactivada' && l.end ? ` · Término → ${fmtDate(l.end)}` : ''} <span class="muted">· ${new Date(l.at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${esc(l.who)}</span></div>`).join('') || '<div class="sm muted">Sin actividad aún</div>'}</div></div>`;
}

// ---------- Ventas › Registro ----------
function ventasRegistro() {
  const camps = Store.list('campaigns'); const range = periodRange(VT.rperiod === 'hoy' ? 'custom' : VT.rperiod === '7d' ? 'custom' : VT.rperiod, VT.rperiod === 'hoy' ? todayIso() : VT.rperiod === '7d' ? (() => { const d = parseDay(todayIso()); d.setDate(d.getDate() - 6); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })() : VT.from, todayIso());
  const q = VT.rq.toLowerCase();
  const rows = Store.list('sales').filter(s => inRange(s.date, range) && (!VT.rcamp || (VT.rcamp === 'none' ? !s.campaign : s.campaign === VT.rcamp)) && (!VT.rkind || s.kind === VT.rkind) && (!q || (s.client || '').toLowerCase().includes(q) || (s.nv || '').includes(q))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const net = rows.reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const byDay = {}; rows.forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
  const byMonth = {}; Object.keys(byDay).forEach(d => (byMonth[d.slice(0, 7)] = byMonth[d.slice(0, 7)] || []).push(d));
  const dayTitle = d => { const n = daysBetween(d, todayIso()); return `${n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : cap(parseDay(d).toLocaleDateString('es-CL', { weekday: 'long' }))} · ${parseDay(d).toLocaleDateString('es-CL', { weekday: n < 2 ? 'long' : undefined, day: 'numeric', month: 'short' })}`; };
  return `
  <div class="page-head"><div><h1>Registro</h1><p>Ventas digitales y notas de crédito, con la campaña que eligió el vendedor.</p></div><div class="actions"><button class="btn" data-print="Registro de ventas">${ICON.pdf(14)} Informe PDF</button><button class="btn" id="rg-trash">${ICON.trash(14)} Papelera</button></div></div>
  ${ventasTabs('registro')}
  <div class="card" style="margin-bottom:14px">
    <h3 style="margin-bottom:10px">Registrar venta</h3>
    <div class="seg" style="margin-bottom:12px"><button class="on" data-kind="venta">Venta</button><button data-kind="nc">Nota de crédito</button></div>
    <div class="form-grid">
      <div class="field"><label>Monto *</label><input class="input" type="number" id="rg-amount" placeholder="1.250.000"><div class="hint">Monto neto, sin IVA.</div></div>
      <div class="field"><label>N° nota de venta</label><input class="input" id="rg-nv" placeholder="55001682"></div>
      <div class="field"><label>Campaña *</label><select class="select" id="rg-camp"><option value="">Sin campaña</option>${camps.filter(c => !c.archived).map(c => `<option value="${c.id}">${esc(c.name)} · ${ctypeOf(c.type).name}</option>`).join('')}</select></div>
      <div class="field"><label>Razón social</label><input class="input" id="rg-client" placeholder="Cliente o empresa"></div>
      <div class="field"><label>A nombre de</label><select class="select" id="rg-seller"><option value="">Elige al vendedor…</option>${PEOPLE.filter(p => ['gabriel', 'francisca', 'vicente'].includes(p.id)).map(p => `<option value="${p.id}">${esc(p.short)}</option>`).join('')}</select></div>
      <div class="field"><label>Fecha</label><input class="input" type="date" id="rg-date" value="${todayIso()}"></div>
    </div>
    <div class="row" style="margin-top:12px"><span class="sm muted" id="rg-hint">Se registrará con fecha de hoy, ${fmtDate(todayIso())}.</span><span class="spacer"></span><button class="btn primary" id="rg-save">${ICON.plus(14)} Registrar venta</button></div>
  </div>
  <div class="row wrap no-print" style="margin:0 4px 10px"><span class="xs muted b" style="letter-spacing:.07em;text-transform:uppercase">Período</span><div class="seg">${[['hoy', 'Hoy'], ['7d', '7 días'], ['mes', 'Este mes'], ['todo', 'Todo'], ['custom', 'Fechas…']].map(([k, l]) => `<button class="${VT.rperiod === k ? 'on' : ''}" data-rperiod="${k}">${l}</button>`).join('')}</div>${VT.rperiod === 'custom' ? `<input class="input" type="date" style="width:150px" id="rg-from" value="${VT.from}">` : ''}
    <span class="sm muted">Campaña</span><select class="select" id="rg-fcamp" style="width:200px"><option value="">Todas</option><option value="none" ${VT.rcamp === 'none' ? 'selected' : ''}>Sin campaña</option>${camps.map(c => `<option value="${c.id}" ${VT.rcamp === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <span class="sm muted">Tipo</span><select class="select" id="rg-fkind" style="width:130px"><option value="">Todos</option><option value="venta" ${VT.rkind === 'venta' ? 'selected' : ''}>Ventas</option><option value="nc" ${VT.rkind === 'nc' ? 'selected' : ''}>Notas de crédito</option></select>
    <span class="spacer"></span><label class="search" style="max-width:260px">${ICON.search(14)}<input id="rg-q" placeholder="Buscar razón social o N° NV…" value="${esc(VT.rq)}"></label></div>
  <div class="card">
    <div class="sm" style="margin-bottom:8px"><b>${rows.filter(s => s.kind === 'venta').length} ventas</b> · ${rows.filter(s => s.kind !== 'venta').length} notas de crédito · neto <b>${fmtMoney(net)}</b></div>
    ${Object.keys(byMonth).sort().reverse().map(mo => `<div class="xs b muted" style="text-transform:uppercase;letter-spacing:.07em;padding:10px 0 4px;border-bottom:1px solid var(--line)">${parseDay(mo + '-01').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })} · ${byMonth[mo].reduce((a, d) => a + byDay[d].filter(s => s.kind === 'venta').length, 0)} ventas · ${fmtMoney(byMonth[mo].reduce((a, d) => a + byDay[d].reduce((b, s) => b + (s.kind === 'venta' ? s.amount : -s.amount), 0), 0))}</div>
      ${byMonth[mo].sort().reverse().map(d => `<div class="row sm" style="padding:10px 4px 4px"><b>${dayTitle(d)}</b><span class="spacer"></span><b>${fmtMoney(byDay[d].reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0))}</b></div>
        ${byDay[d].map(s => `<div class="list-item" style="padding:8px 4px"><span class="sm muted mono" style="width:40px">${s.time || ''}</span><b class="sm" style="width:100px">${s.nv ? 'NV ' + esc(s.nv) : (s.kind === 'nc' ? 'NC' : '—')}</b>${s.campaign ? chip(esc(camps.find(c => c.id === s.campaign)?.name || '?'), ctypeOf(camps.find(c => c.id === s.campaign)?.type).c) : chip('Sin campaña', 'var(--faint)')}<span class="sm" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.client || '')}</span>${s.seller ? `${avatar(personOf(s.seller).name)}<span class="sm muted">${esc(personOf(s.seller).short)}</span>` : ''}<b class="num ${s.kind === 'nc' ? 'danger' : ''}" style="width:90px;text-align:right">${s.kind === 'nc' ? '−' : ''}${fmtMoney(s.amount)}</b><button class="icon-btn sm no-print" data-sdel="${s.id}" title="Eliminar">${ICON.x(12)}</button></div>`).join('')}`).join('')}`).join('') || empty('Sin ventas en este filtro')}
  </div>`;
}

// ---------- Ventas › Resumen ----------
function ventasResumen() {
  const range = periodRange(VT.period, VT.from, VT.to);
  const camps = Store.list('campaigns').filter(c => overlaps(c, range) && (!VT.sstate || c.state === VT.sstate) && (!VT.stype || c.type === VT.stype) && (!VT.szone || (VT.szone === 'all' ? c.regions.length === REGIONS.length : ZONES.find(z => z.id === VT.szone).regions.some(r => c.regions.includes(r)))));
  const mets = camps.map(c => ({ c, m: campMetrics(c, range) }));
  const sales = Store.list('sales').filter(s => inRange(s.date, range));
  const sold = sales.reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const noCamp = sales.filter(s => !s.campaign).reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const spent = mets.reduce((a, x) => a + x.m.spent, 0), msgs = camps.reduce((a, c) => a + (c.messages || 0), 0), nSales = sales.filter(s => s.kind === 'venta').length;
  const byType = CAMPAIGN_TYPES.map(tp => { const xs = mets.filter(x => x.c.type === tp.id); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0), mg = xs.reduce((a, x) => a + (x.c.messages || 0), 0); return { tp, n: xs.length, sp, so, mg, roas: sp ? so / sp : null, cpm: mg ? sp / mg : null }; });
  const maxRoas = Math.max(1, ...byType.map(x => x.roas || 0));
  const ranking = [...mets].sort((a, b) => (b.m.roas || 0) - (a.m.roas || 0));
  const best = ranking.find(x => x.m.spent && x.m.roas);
  const typesWithData = byType.filter(x => x.sp);
  const cheap = [...typesWithData].filter(x => x.cpm).sort((a, b) => a.cpm - b.cpm);
  const byZone = ZONES.map(z => { const xs = mets.filter(x => z.regions.some(r => x.c.regions.includes(r))); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0); return { z, n: xs.length, sp, so, roas: sp ? so / sp : null }; });
  return `
  <div class="page-head"><div><h1>Resumen</h1><p>Rendimiento de las campañas en el período.</p></div><div class="actions"><button class="btn" id="rs-mail">${ICON.mail(14)} Enviar por correo</button><button class="btn primary" data-print="Ventas · Resumen">${ICON.pdf(14)} Informe PDF</button></div></div>
  ${ventasTabs('resumen')}
  <div class="card no-print" style="margin-bottom:14px;display:flex;flex-direction:column;gap:10px">
    ${periodBar(VT.period, VT.from, VT.to, 'v')}
    <div class="row wrap"><span class="xs muted b" style="letter-spacing:.07em;text-transform:uppercase">Estado</span><div class="seg">${[['', 'Todas'], ['on', 'Activas'], ['off', 'Desactivadas']].map(([k, l]) => `<button class="${VT.sstate === k ? 'on' : ''}" data-sstate="${k}">${l}</button>`).join('')}</div><span class="sm muted">Zona</span><select class="select" id="rs-zone" style="width:150px"><option value="">Todas</option><option value="all" ${VT.szone === 'all' ? 'selected' : ''}>Todo Chile</option>${ZONES.map(z => `<option value="${z.id}" ${VT.szone === z.id ? 'selected' : ''}>${z.name}</option>`).join('')}</select></div>
    <div class="row wrap"><span class="xs muted b" style="letter-spacing:.07em;text-transform:uppercase">Tipo</span><button class="chip-btn ${!VT.stype ? 'on' : ''}" data-stype="">Todos</button>${CAMPAIGN_TYPES.map(t => `<button class="chip-btn c ${VT.stype === t.id ? 'on' : ''}" style="--c:${t.c}" data-stype="${t.id}"><i></i>${t.name}</button>`).join('')}</div>
  </div>
  <div class="sm muted" style="margin:0 4px 10px"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);margin-right:6px"></i>Campañas activas: <b>${camps.filter(c => c.state === 'on').length} de ${camps.length}</b> · Período: del ${fmtDate(range[0])} al ${fmtDate(range[1])}</div>
  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Gastado total', fmtMoney(spent), camps.some(c => !c.budget) ? 'Sin presupuesto diario cargado' : '')}
    ${kpi('Vendido neto', fmtMoney(sold), `<span class="ok b">ROAS ${spent ? roasTxt(sold / spent) : '—'}</span> · ${nSales} ventas · con campaña ${fmtShort(sold - noCamp)}`)}
    ${kpi('Ganancia', fmtMoney(sold - spent), `Margen ${sold ? Math.round((sold - spent) / sold * 100) : 0}% · antes de costos de producto`)}
    ${kpi('Mensajes', fmtInt(msgs), msgs ? `${fmtMoney(spent / msgs)} por mensaje` : pendingChip('Pendiente de conexión'))}
  </div>
  <div class="card" style="margin-bottom:14px"><h3>Análisis</h3><span class="chip c" style="--c:var(--app-marketing);margin:6px 0">Análisis automático</span>
    <div class="list">
      ${best ? insight(ICON.spark(14), 'var(--ok)', `La campaña más exitosa fue <b>«${esc(best.c.name)}»</b> (${ctypeOf(best.c.type).name} · ${zoneLabel(best.c.regions)}): vendió <b>${fmtShort(best.m.sold)}</b> con <b>${fmtShort(best.m.spent)}</b>, <b>${roasTxt(best.m.roas)}</b> lo invertido.`) : insight(ICON.clock(14), 'var(--faint)', 'Sin campañas con datos en este período.')}
      ${insight(ICON.mega(14), 'var(--app-marketing)', `Se hicieron <b>${camps.length}</b> campañas: ${byType.filter(x => x.n).map(x => `<b>${x.n}</b> de ${x.tp.name}`).join(' y ') || 'ninguna'}.`)}
      ${noCamp ? insight(ICON.clock(14), 'var(--warn)', `El <b>${pct(noCamp, sold)}%</b> de lo vendido (<b>${fmtShort(noCamp)}</b>) no tiene campaña asociada: pide al equipo que elija la campaña al registrar para medir mejor.`) : ''}
      ${typesWithData.length > 1 ? insight(ICON.trend(14), 'var(--app-marketing)', `${typesWithData.sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((x, i) => `${i ? 'y las de' : 'Las campañas de'} <b>${x.tp.name}</b> rinden <b>${roasTxt(x.roas)}</b>`).join(' ')}. Conviene mover presupuesto hacia ${typesWithData[0].tp.name}.`) : ''}
      ${cheap.length ? insight(ICON.msg(14), 'var(--info)', `Cada mensaje costó <b>${fmtMoney(spent / (msgs || 1))}</b> en promedio; el más barato fue en ${cheap[0].tp.name} (<b>${fmtMoney(cheap[0].cpm)}</b>)${cheap.length > 1 ? ` y el más caro en ${cheap.at(-1).tp.name} (<b>${fmtMoney(cheap.at(-1).cpm)}</b>)` : ''}. De cada 100 mensajes salieron <b>${msgs ? (nSales / msgs * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '—'}</b> ventas.`) : ''}
    </div>
    <div class="xs muted" style="margin-top:8px">Calculado con las ventas registradas en esta app. Una venta cuenta para la campaña que eligió el vendedor; no es la atribución de Meta.</div>
  </div>
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card"><h3 style="margin-bottom:10px">Campañas por tipo</h3><table class="table"><thead><tr><th>Tipo</th><th class="r">Campañas</th><th class="r">Gastado</th><th class="r">Mensajes</th><th class="r">Vendido</th><th>ROAS</th><th class="r">Costo/msj</th></tr></thead><tbody>
      ${byType.map(x => `<tr class="${x.n ? '' : 'muted'}"><td>${chip(x.tp.name, x.tp.c)}</td><td class="r">${x.n}</td><td class="r">${fmtShort(x.sp)}</td><td class="r">${fmtInt(x.mg)}</td><td class="r">${fmtShort(x.so)}</td><td><div class="row" style="gap:6px"><b style="width:36px">${roasTxt(x.roas)}</b>${x.roas ? `<div class="bar thin" style="width:44px;--c:${x.tp.c}"><i style="width:${x.roas / maxRoas * 100}%"></i></div>` : ''}</div></td><td class="r">${x.cpm ? fmtMoney(x.cpm) : '—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3 style="margin-bottom:10px">Resultado por zona</h3><table class="table"><thead><tr><th>Zona</th><th class="r">Campañas</th><th class="r">Gastado</th><th class="r">Vendido</th><th class="r">ROAS</th></tr></thead><tbody>
      ${byZone.map(x => `<tr><td class="b">${x.z.name}</td><td class="r">${x.n}</td><td class="r">${fmtShort(x.sp)}</td><td class="r">${fmtShort(x.so)}</td><td class="r b">${roasTxt(x.roas)}</td></tr>`).join('')}</tbody></table>
      <div class="xs muted b" style="text-transform:uppercase;letter-spacing:.07em;margin:14px 0 6px">Por región</div>
      <div class="grid g2" style="gap:4px">${REGIONS.map(r => { const xs = mets.filter(x => x.c.regions.includes(r)); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0); return `<div class="row sm" style="padding:3px 0"><span class="muted" style="flex:1">${r}</span><span>${xs.length}</span><b style="width:44px;text-align:right">${sp ? roasTxt(so / sp) : '—'}</b></div>`; }).join('')}</div>
    </div>
  </div>
  <div class="card"><h3 style="margin-bottom:10px">Ranking de campañas (por ROAS)</h3><table class="table"><thead><tr><th>#</th><th>Campaña</th><th>Tipo</th><th>Estado</th><th class="r">Gastado</th><th class="r">Vendido neto</th><th class="r">Ganancia</th><th class="r">ROAS</th><th class="r">Margen</th><th>Resultado</th></tr></thead><tbody>
    ${ranking.map((x, i) => `<tr><td class="muted">${i + 1}</td><td><b style="color:var(--accent)">${esc(x.c.name)}</b> ${i === 0 && x.m.spent && x.m.roas >= 2 ? chip('La más exitosa', 'var(--ok)') : ''}<div class="xs muted">${zoneLabel(x.c.regions)} · ${durTxt(x.c)}</div></td><td>${chip(ctypeOf(x.c.type).name, ctypeOf(x.c.type).c)}</td><td>${stateChip(x.c.state)}</td><td class="r">${fmtShort(x.m.spent)}</td><td class="r">${fmtShort(x.m.sold)}</td><td class="r ${x.m.profit < 0 ? 'danger' : ''}">${fmtShort(x.m.profit)}</td><td class="r b">${roasTxt(x.m.roas)}</td><td class="r">${pctTxt(x.m.margin)}</td><td>${resultChip(x.m.result)}</td></tr>`).join('') || `<tr><td colspan="10">${empty('Sin campañas en este filtro')}</td></tr>`}</tbody></table></div>`;
}

// ---------- Enlaces de Ventas ----------
function bindVentas(el) {
  $$('[data-print]', el).forEach(b => b.onclick = () => printSection(b.dataset.print));
  $$('[data-vperiod]', el).forEach(b => b.onclick = () => { VT.period = b.dataset.vperiod; vtSave(); render(); });
  $$('[data-vfrom]', el).forEach(i => i.onchange = e => { VT.from = e.target.value; vtSave(); render(); });
  $$('[data-vto]', el).forEach(i => i.onchange = e => { VT.to = e.target.value; vtSave(); render(); });
  const ge = $('#goal-edit', el); if (ge) ge.onclick = goalModal;
  // Campañas
  const cn = $('#cp-new', el); if (cn) cn.onclick = () => campaignModal(null);
  const ci = $('#cp-import', el); if (ci) ci.onclick = () => openModal(modalHtml('Importar planilla', `<p class="sm muted">Sube el Excel exportado del administrador de anuncios (Meta o Google). Columnas esperadas: nombre, objetivo, inicio, término, gastado, impresiones, alcance, mensajes.</p><input class="input" type="file" accept=".xlsx,.csv"><div class="hint" style="margin-top:8px">${pendingChip('Lectura de planilla pendiente de conexión')}</div>`, `<button class="btn" data-close>Cerrar</button>`), { narrow: true });
  $$('[data-cstate]', el).forEach(b => b.onclick = () => { VT.cstate = b.dataset.cstate; vtSave(); render(); });
  const ft = $('#cp-ftype', el); if (ft) ft.onchange = e => { VT.ctype = e.target.value; vtSave(); render(); };
  const fz = $('#cp-fzone', el); if (fz) fz.onchange = e => { VT.czone = e.target.value; vtSave(); render(); };
  const cq = $('#cp-q', el); if (cq) cq.oninput = e => { VT.cq = e.target.value; vtSave(); const v = e.target.value; render(); const n = $('#cp-q'); n.focus(); n.setSelectionRange(v.length, v.length); };
  $$('[data-cedit]', el).forEach(b => b.onclick = () => campaignModal(Store.list('campaigns').find(c => c.id === b.dataset.cedit)));
  $$('[data-carch]', el).forEach(b => b.onclick = () => { const c = Store.list('campaigns').find(c => c.id === b.dataset.carch); c.archived = !c.archived; Store.upsert('campaigns', c); render(); });
  // Registro
  let kind = 'venta';
  $$('[data-kind]', el).forEach(b => b.onclick = () => { kind = b.dataset.kind; $$('[data-kind]', el).forEach(x => x.classList.toggle('on', x === b)); $('#rg-save', el).innerHTML = `${ICON.plus(14)} Registrar ${kind === 'venta' ? 'venta' : 'nota de crédito'}`; });
  const rd = $('#rg-date', el); if (rd) rd.onchange = e => { $('#rg-hint', el).textContent = `Se registrará con fecha ${fmtDate(e.target.value)}.`; };
  const rs = $('#rg-save', el); if (rs) rs.onclick = () => {
    const amount = Number($('#rg-amount', el).value); if (!amount) return toast('Ingresa el monto', true);
    const d = new Date();
    Store.upsert('sales', { id: uid(), kind, amount, nv: $('#rg-nv', el).value.trim(), campaign: $('#rg-camp', el).value, client: $('#rg-client', el).value.trim(), seller: $('#rg-seller', el).value, date: $('#rg-date', el).value || todayIso(), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` });
    toast(kind === 'venta' ? 'Venta registrada' : 'Nota de crédito registrada'); render();
  };
  $$('[data-rperiod]', el).forEach(b => b.onclick = () => { VT.rperiod = b.dataset.rperiod; vtSave(); render(); });
  const rf = $('#rg-from', el); if (rf) rf.onchange = e => { VT.from = e.target.value; vtSave(); render(); };
  const fc = $('#rg-fcamp', el); if (fc) fc.onchange = e => { VT.rcamp = e.target.value; vtSave(); render(); };
  const fk = $('#rg-fkind', el); if (fk) fk.onchange = e => { VT.rkind = e.target.value; vtSave(); render(); };
  const rq = $('#rg-q', el); if (rq) rq.oninput = e => { VT.rq = e.target.value; vtSave(); const v = e.target.value; render(); const n = $('#rg-q'); n.focus(); n.setSelectionRange(v.length, v.length); };
  $$('[data-sdel]', el).forEach(b => b.onclick = () => { const s = Store.list('sales').find(x => x.id === b.dataset.sdel); const tr = Store.list('trash'); tr.unshift({ ...s, deletedAt: todayIso() }); Store.write('trash', tr.slice(0, 100)); Store.remove('sales', s.id); toast('Movida a la papelera'); render(); });
  const tb = $('#rg-trash', el); if (tb) tb.onclick = () => { const tr = Store.list('trash'); openModal(modalHtml('Papelera', `<div class="list">${tr.map(s => `<div class="list-item sm"><span class="muted">${fmtDate(s.date)}</span><b>${s.nv ? 'NV ' + esc(s.nv) : '—'}</b><span style="flex:1">${esc(s.client || '')}</span><b>${fmtMoney(s.amount)}</b><button class="btn sm" data-restore="${s.id}">Restaurar</button></div>`).join('') || empty('Papelera vacía')}</div>`, `<button class="btn" data-close>Cerrar</button>`), { onMount(m) { $$('[data-restore]', m).forEach(b => b.onclick = () => { const s = tr.find(x => x.id === b.dataset.restore); delete s.deletedAt; Store.upsert('sales', s); Store.write('trash', tr.filter(x => x.id !== s.id)); closeModal(); render(); }); } }); };
  // Resumen
  $$('[data-sstate]', el).forEach(b => b.onclick = () => { VT.sstate = b.dataset.sstate; vtSave(); render(); });
  $$('[data-stype]', el).forEach(b => b.onclick = () => { VT.stype = b.dataset.stype; vtSave(); render(); });
  const sz = $('#rs-zone', el); if (sz) sz.onchange = e => { VT.szone = e.target.value; vtSave(); render(); };
  const rm = $('#rs-mail', el); if (rm) rm.onclick = () => openModal(modalHtml('Enviar por correo', `<div class="field"><label>Para</label><input class="input" placeholder="correo@k8.cl, otro@k8.cl"></div><div class="field"><label>Mensaje</label><textarea class="input" rows="3">Adjunto el resumen de ventas y campañas del período.</textarea></div><div class="hint">${pendingChip('Envío de correo pendiente de conexión')} Mientras tanto usa Informe PDF y adjúntalo.</div>`, `<button class="btn" data-close>Cerrar</button><button class="btn primary" disabled style="opacity:.5">Enviar</button>`), { narrow: true });
}
