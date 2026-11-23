// ============================================================
// Campañas › Análisis: cómo va cada campaña (tendencia, costo por
// resultado, ritmo de gasto, ventas asociadas, meta de venta y
// proyección a 30 días).
// Usa el detalle diario que trae el conector (Meta / Google) y las
// ventas registradas en Marketing › Ventas › Registro.
// ============================================================
'use strict';

// Clave interna de la métrica de resultado de una campaña (lo que la plataforma cuenta como «resultado»).
const resKeyOf = c => ({ link_clicks: 'linkClicks', post_engagement: 'postEngagement' }[c.resultKey] || c.resultKey || 'messages');

function analyzeCampaign(c, all) {
  const today = todayIso();
  const rk = resKeyOf(c); const label = (adsResult(c).label || 'resultados');
  const daily = (c.daily || []).filter(d => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const ago = d => daysBetween(d.date, today);
  const win = (n, off = 0) => daily.filter(d => ago(d) >= off && ago(d) < off + n);
  const sum = (rows, k) => rows.reduce((a, d) => a + Number(d[k] || 0), 0);
  const cpr = rows => { const r = sum(rows, rk), s = sum(rows, 'spent'); return r ? s / r : null; };
  const l7 = win(7), p7 = win(7, 7), l30 = win(30);
  const spent7 = sum(l7, 'spent'), res7 = sum(l7, rk), spentP = sum(p7, 'spent'), resP = sum(p7, rk);
  const cprNow = cpr(l7), cprPrev = cpr(p7);
  const cprAll = c.results ? c.spent / c.results : null;

  // Tendencia del costo por resultado (últimos 7 días vs los 7 anteriores)
  let trend = 'sin', trendTxt = 'Sin datos suficientes para ver tendencia';
  if (cprNow != null && cprPrev != null) {
    const delta = (cprNow - cprPrev) / cprPrev;
    trend = delta <= -0.1 ? 'mejor' : delta >= 0.1 ? 'peor' : 'igual';
    trendTxt = trend === 'mejor' ? `Mejorando: cada resultado cuesta ${Math.round(-delta * 100)}% menos que la semana anterior`
      : trend === 'peor' ? `Empeorando: cada resultado cuesta ${Math.round(delta * 100)}% más que la semana anterior`
      : 'Estable: el costo por resultado se mantiene respecto a la semana anterior';
  } else if (spent7 > 0 && !res7) { trend = 'peor'; trendTxt = `Gastó ${fmtMoney(spent7)} en 7 días sin ningún resultado`; }
  else if (cprNow != null) { trend = 'igual'; trendTxt = 'Primera semana con datos; aún no hay con qué comparar'; }

  // Comparación con el resto de la cuenta (misma métrica de resultado)
  const peers = all.filter(x => x.id !== c.id && resKeyOf(x) === rk && x.results > 0 && x.spent > 0).map(x => x.spent / x.results).sort((a, b) => a - b);
  const median = peers.length ? peers[Math.floor(peers.length / 2)] : null;
  const ref = cprNow != null ? cprNow : cprAll;
  let bench = 'sin', benchTxt = 'No hay otras campañas con el mismo tipo de resultado para comparar';
  if (median != null && ref != null) {
    const r = ref / median;
    bench = r <= 0.85 ? 'bueno' : r >= 1.3 ? 'caro' : 'normal';
    const u = label.replace(/s$/, '');
    benchTxt = bench === 'bueno' ? `Más barata que el promedio de la cuenta (${fmtMoney(ref)} vs ${fmtMoney(median)} por ${u})`
      : bench === 'caro' ? `Más cara que el promedio de la cuenta (${fmtMoney(ref)} vs ${fmtMoney(median)} por ${u})`
      : `En línea con el promedio de la cuenta (${fmtMoney(ref)} vs ${fmtMoney(median)})`;
  }

  // Ritmo de gasto vs presupuesto
  let pace = null, paceTxt2 = '';
  if (c.state === 'on' && c.budget) {
    const days = Math.min(7, l7.length || 1); pace = spent7 / (c.budget * days);
    paceTxt2 = pace < 0.7 ? `Está gastando menos de lo presupuestado (${Math.round(pace * 100)}% de ${fmtMoney(c.budget)}/día): poca entrega, revisar público o anuncios`
      : pace > 1.15 ? `Está gastando por sobre el presupuesto diario (${Math.round(pace * 100)}%)`
      : `Gasta según lo presupuestado (${fmtMoney(c.budget)}/día)`;
  }

  // Ventas asociadas (lo que el equipo registra en Ventas › Registro)
  const m = campMetrics(c);
  const roasTxt2 = m.n ? `${m.n} ventas por ${fmtShort(m.sold)} · ROAS ${roasTxt(m.roas)}` : 'Sin ventas asociadas en el registro';

  // Meta de venta: con lo gastado hasta hoy, cuánto debe vender para no perder (1×) y para ser exitosa (2×)
  const goal = { spent: c.spent || 0, breakEven: (c.spent || 0), success: (c.spent || 0) * 2, sold: m.sold, missing: Math.max(0, (c.spent || 0) * 2 - m.sold) };

  // Proyección a 30 días al ritmo de la última semana
  let proj = null;
  if (c.state === 'on' && l7.length) {
    const days = l7.length; const dSpent = spent7 / days, dRes = res7 / days;
    const spend30 = dSpent * 30, res30 = dRes * 30;
    proj = { spend30, res30, breakEven: spend30, good: spend30 * 2, expected: m.n > 0 && m.roas != null && m.spent ? spend30 * m.roas : null };
  }

  // Veredicto
  let score = 'regular';
  if ((spent7 > 0 && !res7 && c.state === 'on') || (m.spent && m.roas != null && m.roas < 1 && m.n >= 2) || (bench === 'caro' && trend === 'peor')) score = 'mal';
  else if ((bench === 'bueno' || (m.roas != null && m.roas >= 2)) && trend !== 'peor') score = 'bien';
  else if (bench === 'normal' && (trend === 'mejor' || trend === 'igual')) score = 'bien';
  if (!c.results && !c.spent) score = 'sin';

  // Recomendaciones simples
  const tips = [];
  if (score === 'mal' && spent7 > 0 && !res7) tips.push('Pausar o cambiar el anuncio: una semana gastando sin resultados no suele mejorar sola.');
  if (trend === 'peor' && res7) tips.push('El costo sube: suele ser fatiga del anuncio. Probar una imagen o texto nuevo, o ampliar el público.');
  if (bench === 'bueno' && c.state === 'on' && (pace == null || pace <= 1.15)) tips.push('Rinde mejor que el promedio: es candidata a subir presupuesto de a poco (10–20% cada 3 días).');
  if (bench === 'caro' && trend !== 'mejor') tips.push('Rinde peor que otras campañas similares: comparar su público y anuncio con la que mejor rinde.');
  if (pace != null && pace < 0.7) tips.push('No alcanza a gastar el presupuesto: el público puede ser muy chico o los anuncios están limitados.');
  if (!m.n && c.results && (rk === 'messages' || rk === 'leads')) tips.push(`Hay ${fmtInt(c.results)} ${label} pero ninguna venta registrada con esta campaña: anotar las ventas en Registro para saber si es rentable.`);
  if (m.roas != null && m.roas >= 2) tips.push('Es rentable (vende más del doble de lo que gasta): mantener o escalar.');
  if (m.roas != null && m.roas < 1 && m.n >= 2) tips.push('Vende menos de lo que gasta: revisar precio, oferta o público antes de seguir invirtiendo.');
  if (!tips.length) tips.push(c.state === 'on' ? 'Sin alertas. Seguir observando el costo por resultado cada semana.' : 'Campaña detenida; sus datos quedan guardados para comparar.');

  return { rk, label, daily, l30, spent7, res7, spentP, resP, cprNow, cprPrev, cprAll, trend, trendTxt, bench, benchTxt, median, pace, paceTxt: paceTxt2, m, roasTxt: roasTxt2, goal, proj, score, tips };
}

// ---------- Gráfico tipo bolsa: línea suave con área degradada ----------
// Curva suave (Catmull-Rom → Bézier) por los puntos [x,y].
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
let stockSeq = 0;
// rows: [{date, v}], color, fmt(v). Dibuja línea + área, punto final con valor, y líneas guía.
function stockChart(rows, { color = 'var(--app-campanas)', fmt = fmtInt, height = 150, label = '' } = {}) {
  if (!rows.length) return `<div class="xs muted" style="padding:${height / 2 - 8}px 0;text-align:center">Sin detalle diario</div>`;
  const W = 600, H = height, top = 18, bottom = 22, left = 6, right = 54;
  const max = Math.max(1, ...rows.map(r => r.v)), min = 0;
  const n = rows.length; const x = i => left + (n === 1 ? (W - left - right) / 2 : i * (W - left - right) / (n - 1));
  const y = v => top + (H - top - bottom) * (1 - (v - min) / (max - min || 1));
  const pts = rows.map((r, i) => [x(i), y(r.v)]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${(H - bottom).toFixed(1)} L${pts[0][0].toFixed(1)},${(H - bottom).toFixed(1)} Z`;
  const id = `sg${++stockSeq}`;
  const last = rows[rows.length - 1], peak = rows.reduce((a, r) => r.v > a.v ? r : a, rows[0]);
  const guides = [0.25, 0.5, 0.75].map(f => `<line x1="${left}" x2="${W - right}" y1="${y(max * f).toFixed(1)}" y2="${y(max * f).toFixed(1)}" stroke="currentColor" stroke-opacity=".08" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"/>`).join('');
  const hover = rows.map((r, i) => `<rect x="${(x(i) - (W - left - right) / Math.max(1, n - 1) / 2).toFixed(1)}" y="0" width="${((W - left - right) / Math.max(1, n - 1)).toFixed(1)}" height="${H}" fill="transparent"><title>${fmtDate(r.date)} · ${fmt(r.v)}</title></rect>`).join('');
  const lx = i => Math.max(left + 2, Math.min(W - right - 2, x(i)));
  const dates = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, s) => s.indexOf(v) === i) : [0];
  return `<div class="stock" style="position:relative">
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block;overflow:visible">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".45"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient>
      <filter id="${id}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter></defs>
      ${guides}
      <path d="${area}" fill="url(#${id})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="3" stroke-opacity=".35" filter="url(#${id}g)" vector-effect="non-scaling-stroke"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="5" fill="${color}" stroke="var(--card)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      ${hover}
    </svg>
    <div class="xs b" style="position:absolute;right:0;top:${Math.max(0, pts[pts.length - 1][1] / H * 100 - 6).toFixed(1)}%;color:${color};transform:translateY(-50%)">${fmt(last.v)}</div>
    <div class="xs muted" style="position:absolute;left:${(lx(rows.indexOf(peak)) / W * 100).toFixed(1)}%;top:0;transform:translateX(-50%)">${peak !== last ? `máx ${fmt(peak.v)}` : ''}</div>
    <div class="row xs muted" style="justify-content:space-between;margin-top:-16px;padding:0 ${right / W * 100}% 0 0">${dates.map(i => `<span>${fmtDate(rows[i].date)}</span>`).join('')}</div>
    ${label ? `<div class="xs muted b" style="margin-top:6px;text-transform:uppercase;letter-spacing:.06em;color:${color}">${label}</div>` : ''}
  </div>`;
}

const scoreChip = s => s === 'bien' ? chip(`${ICON.check(11)} Va bien`, 'var(--ok)') : s === 'mal' ? chip('Va mal', 'var(--danger)') : s === 'regular' ? chip('Regular', 'var(--warn)') : chip('Sin datos', 'var(--faint)');
const arrow = (now, prev, invert) => { if (now == null || prev == null || !prev) return ''; const d = (now - prev) / prev; if (Math.abs(d) < 0.05) return '<span class="muted">→ igual</span>'; const up = d > 0; const good = invert ? !up : up; return `<span style="color:${good ? 'var(--ok)' : 'var(--danger)'}">${up ? '↑' : '↓'} ${Math.round(Math.abs(d) * 100)}%</span>`; };
const capTxt = s => s.charAt(0).toUpperCase() + s.slice(1);

function campanasAnalisis() {
  CP.ascope = CP.ascope || 'on';
  const base = Store.list('campaigns').filter(c => !c.archived && (!CP.plat || c.platform === CP.plat));
  const withData = base.filter(c => c.auto || c.spent);
  const shown = CP.ascope === 'on' ? withData.filter(c => c.state === 'on') : withData;
  const order = c => (c.state === 'on' ? 0 : 1);
  const items = shown.map(c => ({ c, a: analyzeCampaign(c, withData) })).sort((x, y) => order(x.c) - order(y.c) || (y.a.spent7 - x.a.spent7) || (y.c.spent - x.c.spent));
  const on = withData.filter(c => c.state === 'on').map(c => ({ c, a: analyzeCampaign(c, withData) }));
  const totOn = on.reduce((a, x) => a + (x.c.spent || 0), 0);
  const tot7 = on.reduce((a, x) => a + x.a.spent7, 0), totP = on.reduce((a, x) => a + x.a.spentP, 0);
  const soldOn = on.reduce((a, x) => a + x.a.m.sold, 0);
  const best = on.filter(x => x.a.score === 'bien')[0], worst = on.filter(x => x.a.score === 'mal')[0];
  const connected = CONN.meta || CONN.google;
  const short = s => s.length > 42 ? s.slice(0, 40) + '…' : s;
  return `
  <div class="page-head"><div><h1>Análisis</h1><p>Cómo va cada campaña: tendencia, costo por resultado, ventas, meta de venta y proyección.</p></div><div class="actions"><button class="btn" data-print="Campañas · Análisis">${ICON.pdf(14)} Informe PDF</button></div></div>
  ${cpTabs('analisis')}
  ${connected ? '' : `<div class="card" style="margin-bottom:14px;padding:12px 16px;border-left:3px solid var(--warn)"><div class="sm">El análisis necesita el detalle diario de la plataforma. Conecta Meta Ads o Google Ads (pestaña Dashboard › Guía de conexión).</div></div>`}
  <div class="row wrap no-print" style="margin:0 4px 14px">
    <div class="seg"><button class="${CP.ascope === 'on' ? 'on' : ''}" data-ascope="on">Activas</button><button class="${CP.ascope === 'all' ? 'on' : ''}" data-ascope="all">Todas</button></div>
    <div class="seg"><button class="${!CP.plat ? 'on' : ''}" data-cplat="">Ambas</button>${PLATFORMS.map(p => `<button class="${CP.plat === p.id ? 'on' : ''}" data-cplat="${p.id}">${p.name}</button>`).join('')}</div>
    <span class="spacer"></span><span class="sm muted">${on.length} activas · ${withData.length} con datos</span></div>
  <div class="grid g5" style="margin-bottom:14px">
    ${kpi('Gastado en activas', fmtShort(totOn), `${on.length} ${on.length === 1 ? 'campaña activa' : 'campañas activas'} · total desde que partieron`)}
    ${kpi('Gasto últimos 7 días', fmtShort(tot7), totP ? `${arrow(tot7, totP)} vs 7 días anteriores (${fmtShort(totP)})` : 'solo campañas activas')}
    ${kpi('Para ser exitosas', fmtShort(totOn * 2), soldOn ? `vendido registrado: ${fmtShort(soldOn)} (${Math.round(soldOn / (totOn * 2 || 1) * 100)}% de la meta)` : 'deben vender 2× lo gastado · sin ventas registradas aún')}
    ${kpi('Mejor campaña', best ? `<span style="font-size:15px;line-height:1.25;display:block" title="${esc(best.c.name)}">${esc(short(best.c.name))}</span>` : '—', best ? best.a.benchTxt.split('(')[0] : 'ninguna destaca esta semana')}
    ${kpi('Requiere atención', worst ? `<span style="font-size:15px;line-height:1.25;display:block" title="${esc(worst.c.name)}">${esc(short(worst.c.name))}</span>` : 'Ninguna', worst ? worst.a.tips[0] : 'todas las activas van regular o bien')}
  </div>
  ${items.length ? items.map(({ c, a }) => {
    const rows30 = a.l30.slice().sort((x, y) => x.date.localeCompare(y.date));
    const resRows = rows30.map(r => ({ date: r.date, v: Number(r[a.rk] || 0) }));
    const spentRows = rows30.map(r => ({ date: r.date, v: Number(r.spent || 0) }));
    const col = a.score === 'bien' ? 'var(--ok)' : a.score === 'mal' ? 'var(--danger)' : a.score === 'regular' ? 'var(--warn)' : 'var(--line)';
    return `<div class="card" style="margin-bottom:12px;border-left:3px solid ${col}">
    <div class="row wrap" style="gap:8px;margin-bottom:12px"><b style="font-size:15px">${esc(c.name)}</b>${scoreChip(a.score)}${stateChip(c.state)}${chip(ctypeOf(c.type).name, ctypeOf(c.type).c)}${platChip(c.platform)}<span class="spacer"></span><span class="xs muted">desde ${fmtDate(c.start)}${c.end ? ` hasta ${fmtDate(c.end)}` : ''}</span><button class="btn sm" data-cedit2="${c.id}">Ver campaña</button></div>
    <div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px;align-items:start">
      <div>
        <div class="grid g2" style="gap:14px">
          <div class="card flat" style="padding:12px 14px">${stockChart(resRows, { color: 'var(--ok)', fmt: fmtInt, label: `${a.label} por día` })}</div>
          <div class="card flat" style="padding:12px 14px">${stockChart(spentRows, { color: 'var(--app-campanas)', fmt: fmtShort, label: 'gasto por día' })}</div>
        </div>
        <div class="grid g4" style="gap:8px;margin-top:12px">
          ${[['Gasto 7 días', fmtShort(a.spent7), arrow(a.spent7, a.spentP)], [`${capTxt(a.label)} 7 días`, fmtInt(a.res7), arrow(a.res7, a.resP)], ['Costo por resultado', a.cprNow != null ? fmtMoney(a.cprNow) : '—', arrow(a.cprNow, a.cprPrev, true)], ['Total histórico', `${fmtShort(c.spent)} · ${fmtInt(c.results)}`, a.cprAll != null ? `${fmtMoney(a.cprAll)} c/u` : '']].map(([l, v, s]) => `<div class="card flat" style="padding:8px 10px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em">${l}</div><div class="num" style="font-size:17px">${v}</div><div class="xs">${s || '&nbsp;'}</div></div>`).join('')}
        </div>
      </div>
      <div class="sm" style="display:grid;gap:8px">
        <div class="card flat" style="padding:12px 14px;border-color:color-mix(in srgb, var(--ok) 35%, var(--line))">
          <div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Meta de venta para que sea exitosa</div>
          <div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:24px;color:var(--ok)">${fmtShort(a.goal.success)}</span><span class="muted">= 2 × lo gastado (${fmtShort(a.goal.spent)})</span></div>
          <div class="bar thin" style="--c:var(--ok);margin:8px 0 6px"><i style="width:${Math.min(100, a.goal.success ? a.goal.sold / a.goal.success * 100 : 0)}%"></i></div>
          <div class="row wrap xs muted" style="gap:10px"><span>Mínimo para no perder: <b>${fmtShort(a.goal.breakEven)}</b></span><span>Vendido registrado: <b>${fmtShort(a.goal.sold)}</b></span>${a.goal.sold ? `<span>Faltan: <b>${fmtShort(a.goal.missing)}</b></span>` : ''}</div>
        </div>
        <div class="row" style="gap:8px;align-items:flex-start"><span style="color:${a.trend === 'mejor' ? 'var(--ok)' : a.trend === 'peor' ? 'var(--danger)' : 'var(--muted)'};flex:none">${ICON.trend(14)}</span><span>${a.trendTxt}</span></div>
        <div class="row" style="gap:8px;align-items:flex-start"><span style="color:${a.bench === 'bueno' ? 'var(--ok)' : a.bench === 'caro' ? 'var(--danger)' : 'var(--muted)'};flex:none">${ICON.target(14)}</span><span>${a.benchTxt}</span></div>
        ${a.paceTxt ? `<div class="row" style="gap:8px;align-items:flex-start"><span style="color:${a.pace < 0.7 || a.pace > 1.15 ? 'var(--warn)' : 'var(--muted)'};flex:none">${ICON.zap(14)}</span><span>${a.paceTxt}</span></div>` : ''}
        <div class="row" style="gap:8px;align-items:flex-start"><span style="color:${a.m.n ? (a.m.roas >= 2 ? 'var(--ok)' : a.m.roas < 1 ? 'var(--danger)' : 'var(--warn)') : 'var(--muted)'};flex:none">${ICON.doc(14)}</span><span>${a.roasTxt}</span></div>
        ${a.proj ? `<div class="card flat" style="padding:10px 12px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Si sigue así, en 30 días</div>
          <div>Gastaría <b>${fmtShort(a.proj.spend30)}</b> y traería <b>${fmtInt(a.proj.res30)} ${a.label}</b>.</div>
          <div>Debería vender <b>${fmtShort(a.proj.good)}</b> en ese mes para ser exitosa (${fmtShort(a.proj.breakEven)} para no perder).</div>
          ${a.proj.expected != null ? `<div>Con el ROAS actual (${roasTxt(a.m.roas)}) vendería unos <b>${fmtShort(a.proj.expected)}</b>.</div>` : `<div class="xs muted">Registra las ventas de esta campaña para estimar cuánto vendería.</div>`}
        </div>` : ''}
        <div><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Qué hacer</div><ul style="margin:0;padding-left:18px;display:grid;gap:3px">${a.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
      </div>
    </div>
  </div>`; }).join('') : empty(CP.ascope === 'on' ? 'Sin campañas activas' : 'Sin campañas con datos', CP.ascope === 'on' ? 'Cambia a «Todas» para ver las campañas pasadas' : 'Cuando Meta o Google estén conectados, aquí aparece el análisis de cada campaña')}
  <div class="xs muted" style="margin-top:6px">Cómo se calcula: tendencia = costo por resultado de los últimos 7 días contra los 7 anteriores. Comparación = contra la mediana de las campañas de la cuenta con el mismo tipo de resultado. Meta de venta = 2 × gasto (ROAS 2). Proyección = promedio diario de la última semana × 30. ROAS = ventas registradas con la campaña ÷ gasto.</div>`;
}
