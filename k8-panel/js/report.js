// ============================================================
// Informe PDF · documento formal por sección (se abre en una ventana
// limpia y se imprime / guarda como PDF desde el diálogo del navegador)
// ============================================================
'use strict';

const RPT = {
  css: `
    @page { margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font: 11.5pt/1.45 "Segoe UI", Arial, sans-serif; color: #111; margin: 0; padding: 24px; background: #fff; }
    .head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
    .head img { width: 46px; height: 46px; border-radius: 10px; }
    .head h1 { margin: 0; font-size: 20pt; letter-spacing: -.01em; }
    .head .meta { margin-left: auto; text-align: right; font-size: 9.5pt; color: #555; }
    h2 { font-size: 13.5pt; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
    h3 { font-size: 11.5pt; margin: 14px 0 6px; }
    p { margin: 4px 0; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 4px; }
    .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; }
    .kpi .l { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .06em; color: #666; }
    .kpi .v { font-size: 16pt; font-weight: 700; }
    .kpi .s { font-size: 9pt; color: #666; }
    table { width: 100%; border-collapse: collapse; font-size: 9.8pt; margin: 6px 0 10px; page-break-inside: auto; }
    th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; color: #444; background: #f1f1f1; padding: 6px 7px; border-bottom: 1px solid #bbb; }
    td { padding: 5px 7px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    tr { page-break-inside: avoid; }
    td.r, th.r { text-align: right; white-space: nowrap; }
    .muted { color: #666; } .b { font-weight: 700; } .danger { color: #B3261E; } .ok { color: #137333; }
    .tag { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 8.5pt; border: 1px solid #ccc; margin-right: 3px; white-space: nowrap; }
    .foot { margin-top: 26px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 8.5pt; color: #666; display: flex; justify-content: space-between; }
    .note { font-size: 9pt; color: #555; background: #f7f7f7; border-left: 3px solid #999; padding: 6px 10px; margin: 8px 0; }
    .toolbar { position: fixed; top: 10px; right: 10px; display: flex; gap: 6px; }
    .toolbar button { font: 600 10pt "Segoe UI", Arial; padding: 8px 14px; border-radius: 8px; border: 1px solid #ccc; background: #fff; cursor: pointer; }
    .toolbar button.p { background: #2F5BFF; color: #fff; border-color: #2F5BFF; }
    @media print { .toolbar { display: none; } body { padding: 0; } }
  `,
  table(cols, rows) {
    if (!rows.length) return '<p class="muted">Sin datos.</p>';
    return `<table><thead><tr>${cols.map(c => `<th class="${c.r ? 'r' : ''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.r ? 'r' : ''}">${r[c.k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  },
  kpis(list) { return `<div class="kpis">${list.map(([l, v, s]) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`).join('')}</div>`; },
  open(title, subtitle, body) {
    const now = new Date();
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)} · K8 App</title><style>${this.css}</style></head><body>
      <div class="toolbar"><button onclick="window.print()" class="p">Imprimir / Guardar PDF</button><button onclick="window.close()">Cerrar</button></div>
      <div class="head"><img src="${location.origin}${location.pathname.replace(/[^/]*$/, '')}assets/logo-k8.webp" alt="K8"><div><h1>${esc(title)}</h1><div class="muted">${esc(subtitle)}</div></div>
        <div class="meta">K8 App · K8 Chile<br>${now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} · ${esc(personOf(ME.id).name)}</div></div>
      ${body}
      <div class="foot"><span>Generado por K8 App</span><span>${esc(title)} · ${now.toLocaleDateString('es-CL')}</span></div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast('El navegador bloqueó la ventana del informe; permite ventanas emergentes para este sitio', true);
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* el usuario puede imprimir con el botón */ } }, 600);
  },
};

const rptStage = n => `<span class="tag">${stageOf(n).name}</span>`;
const rptPeople = ids => ids.map(p => personOf(p).short).join(', ');
const rptDue = t => { if (!t.due) return '—'; const d = dueLabel(t.due); return `${fmtDate(t.due)} <span class="${d.late ? 'danger' : 'muted'}">(${d.text})</span>`; };

function buildReport(route) {
  const app = route.app, t = todayIso(), month = t.slice(0, 7);
  const tasks = Store.list('tasks'), camps = Store.list('campaigns'), sales = Store.list('sales'), prods = Store.list('products'), events = Store.list('events');
  const open = tasks.filter(x => x.state !== 'done');

  // ----- Inicio: informe general -----
  if (app === 'inicio') {
    const prendas = prods.filter(p => p.kind === 'prenda');
    const stg = p => typeof stageOfProduct === 'function' ? stageOfProduct(p) : p.stage;
    const mes = sales.filter(s => s.date.startsWith(month)).reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
    const goal = Store.read('goals', {})[month] || 0;
    const body = `
      ${RPT.kpis([['Productos en camino', prendas.filter(p => [3, 4].includes(stg(p))).length, 'producción o llegada'], ['Documentos por subir', prendas.reduce((a, p) => a + missingOf(p).length, 0), `${prendas.filter(p => missingOf(p).length).length} productos`], ['Ventas del mes', fmtMoney(mes), goal ? `${pct(mes, goal)}% de la meta ${fmtShort(goal)}` : 'sin meta'], ['Tareas abiertas', open.length, `${open.filter(isLate).length} vencidas`]])}
      <h2>Productos por etapa</h2>${RPT.table([{ h: 'Etapa', k: 'e' }, { h: 'Productos', k: 'n', r: 1 }, { h: 'Nombres', k: 'p' }], STAGES.map(s => ({ e: s.name, n: prendas.filter(p => stg(p) === s.n).length, p: prendas.filter(p => stg(p) === s.n).map(p => esc(p.name)).join(', ') })).filter(r => r.n))}
      <h2>Tareas urgentes</h2>${RPT.table([{ h: 'Tarea', k: 'a' }, { h: 'Área', k: 'b' }, { h: 'Prioridad', k: 'c' }, { h: 'Responsables', k: 'd' }, { h: 'Vence', k: 'e' }], open.filter(x => x.pri === 'alta' || isLate(x)).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(x => ({ a: esc(x.title), b: x.area, c: priOf(x.pri).name, d: rptPeople(x.people), e: rptDue(x) })))}
      <h2>Campañas activas</h2>${RPT.table([{ h: 'Campaña', k: 'a' }, { h: 'Objetivo', k: 'b' }, { h: 'Plataforma', k: 'c' }, { h: 'Zona', k: 'd' }, { h: 'Inicio', k: 'e' }, { h: 'Gasto', k: 'f', r: 1 }, { h: 'Mensajes', k: 'g', r: 1 }], camps.filter(c => c.state === 'on').map(c => ({ a: esc(c.name), b: ctypeOf(c.type).name, c: PLATFORMS.find(p => p.id === c.platform)?.name, d: zoneLabel(c.regions), e: fmtDate(c.start), f: c.spent ? fmtMoney(c.spent) : '—', g: c.messages || '—' })))}
      <h2>Agenda próximos 7 días</h2>${RPT.table([{ h: 'Fecha', k: 'a' }, { h: 'Tipo', k: 'b' }, { h: 'Evento', k: 'c' }, { h: 'Responsable', k: 'd' }], events.filter(e => e.date >= t && daysBetween(t, e.date) <= 7).sort((a, b) => a.date.localeCompare(b.date)).map(e => ({ a: fmtDate(e.date), b: evTypeOf(e.type).name, c: esc(e.title), d: personOf(e.who).short })))}`;
    return RPT.open('Informe general', 'Resumen de todas las áreas', body);
  }

  // ----- Marketing: Equipo (tareas, calendario, personas) -----
  if (app === 'marketing' && route.sec === 'equipo') {
    const byState = TASK_STATES.map(s => ({ s, rows: tasks.filter(x => x.state === s.id) }));
    const perf = open.length ? Math.round(open.reduce((a, x) => a + x.progress, 0) / open.length) : 0;
    const body = `
      ${RPT.kpis([['Abiertas', open.length, ''], ['Vencidas', open.filter(isLate).length, ''], ['En aprobación', open.filter(x => x.state === 'review').length, ''], ['Avance promedio', perf + '%', 'de las abiertas']])}
      <h2>Carga por persona</h2>${RPT.table([{ h: 'Persona', k: 'a' }, { h: 'Área', k: 'b' }, { h: 'Abiertas', k: 'c', r: 1 }, { h: 'En curso', k: 'd', r: 1 }, { h: 'Vencidas', k: 'e', r: 1 }, { h: 'Cerradas 30 d', k: 'f', r: 1 }], PEOPLE.map(p => { const mine = tasks.filter(x => x.people.includes(p.id)); const o = mine.filter(x => x.state !== 'done'); return { a: esc(p.name), b: p.area || '', c: o.length, d: o.filter(x => x.running).length, e: o.filter(isLate).length, f: mine.filter(x => x.state === 'done' && x.doneAt && daysBetween(x.doneAt, t) <= 30).length }; }))}
      ${byState.map(({ s, rows }) => `<h2>${s.name} (${rows.length})</h2>${RPT.table([{ h: 'Tarea', k: 'a' }, { h: 'Área', k: 'b' }, { h: 'Prioridad', k: 'c' }, { h: 'Responsables', k: 'd' }, { h: 'Inicio', k: 'e' }, { h: 'Vence', k: 'f' }, { h: 'Avance', k: 'g', r: 1 }], rows.sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(x => ({ a: esc(x.title), b: x.area, c: priOf(x.pri).name, d: rptPeople(x.people), e: fmtDate(x.start), f: s.id === 'done' ? fmtDate(x.doneAt) : rptDue(x), g: x.progress + '%' })))}`).join('')}
      <h2>Calendario próximos 30 días</h2>${RPT.table([{ h: 'Fecha', k: 'a' }, { h: 'Tipo', k: 'b' }, { h: 'Evento', k: 'c' }, { h: 'Responsable', k: 'd' }], [...events, ...(typeof birthdayEvents === 'function' ? birthdayEvents(month) : [])].filter(e => e.date >= t && daysBetween(t, e.date) <= 30).sort((a, b) => a.date.localeCompare(b.date)).map(e => ({ a: fmtDate(e.date), b: evTypeOf(e.type).name, c: esc(e.title), d: personOf(e.who).short })))}`;
    return RPT.open('Informe de equipo', 'Tareas, carga por persona y calendario', body);
  }

  // ----- Marketing: Ventas / Campañas (misma base de datos) -----
  if ((app === 'marketing' && route.sec === 'ventas') || app === 'campanas') {
    const range = periodRange(app === 'campanas' ? CP.period : VT.period, app === 'campanas' ? CP.from : VT.from, app === 'campanas' ? CP.to : VT.to);
    const inP = camps.filter(c => !c.archived && overlaps(c, range));
    const sl = sales.filter(s => inRange(s.date, range));
    const sold = sl.reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
    const spent = inP.reduce((a, c) => a + (c.spent || 0), 0), msgs = inP.reduce((a, c) => a + (c.messages || 0), 0);
    const mets = inP.map(c => ({ c, m: campMetrics(c, range) })).sort((a, b) => (b.m.roas || 0) - (a.m.roas || 0));
    const byDay = {}; sl.forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
    const body = `
      <p class="muted">Período: ${fmtDate(range[0])} al ${fmtDate(range[1])}</p>
      ${RPT.kpis([['Gastado', fmtMoney(spent), `${inP.length} campañas`], ['Vendido neto', fmtMoney(sold), `${sl.filter(s => s.kind === 'venta').length} ventas · ${sl.filter(s => s.kind !== 'venta').length} NC`], ['ROAS', spent ? roasTxt(sold / spent) : '—', 'vendido / gastado'], ['Mensajes', fmtInt(msgs), msgs ? `${fmtMoney(spent / msgs)} por mensaje` : '']])}
      ${CONN.meta && CONN.google ? '' : '<div class="note">Los datos de gasto, impresiones, alcance y mensajes se anotan a mano mientras Meta Ads y Google Ads no estén conectados.</div>'}
      <h2>Ranking de campañas</h2>${RPT.table([{ h: '#', k: 'n', r: 1 }, { h: 'Campaña', k: 'a' }, { h: 'Objetivo', k: 'b' }, { h: 'Plataforma', k: 'c' }, { h: 'Zona', k: 'd' }, { h: 'Estado', k: 'e' }, { h: 'Fechas', k: 'f' }, { h: 'Gasto', k: 'g', r: 1 }, { h: 'Vendido', k: 'h', r: 1 }, { h: 'Ganancia', k: 'i', r: 1 }, { h: 'ROAS', k: 'j', r: 1 }, { h: 'Msj', k: 'k', r: 1 }], mets.map((x, i) => ({ n: i + 1, a: esc(x.c.name), b: ctypeOf(x.c.type).name, c: PLATFORMS.find(p => p.id === x.c.platform)?.name, d: zoneLabel(x.c.regions), e: x.c.state === 'on' ? 'Activa' : x.c.state === 'draft' ? 'Borrador' : 'Desactivada', f: `${fmtDate(x.c.start)} → ${x.c.end ? fmtDate(x.c.end) : 'en curso'}`, g: fmtMoney(x.m.spent), h: fmtMoney(x.m.sold), i: `<span class="${x.m.profit < 0 ? 'danger' : ''}">${fmtMoney(x.m.profit)}</span>`, j: roasTxt(x.m.roas), k: x.c.messages || '—' })))}
      <h2>Por objetivo</h2>${RPT.table([{ h: 'Objetivo', k: 'a' }, { h: 'Campañas', k: 'b', r: 1 }, { h: 'Gasto', k: 'c', r: 1 }, { h: 'Mensajes', k: 'd', r: 1 }, { h: 'Vendido', k: 'e', r: 1 }, { h: 'ROAS', k: 'f', r: 1 }], CAMPAIGN_TYPES.map(tp => { const xs = mets.filter(x => x.c.type === tp.id); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0); return { a: tp.name, b: xs.length, c: fmtMoney(sp), d: xs.reduce((a, x) => a + (x.c.messages || 0), 0), e: fmtMoney(so), f: sp ? roasTxt(so / sp) : '—' }; }).filter(r => r.b))}
      <h2>Por zona</h2>${RPT.table([{ h: 'Zona', k: 'a' }, { h: 'Campañas', k: 'b', r: 1 }, { h: 'Gasto', k: 'c', r: 1 }, { h: 'Vendido', k: 'd', r: 1 }, { h: 'ROAS', k: 'e', r: 1 }], ZONES.map(z => { const xs = mets.filter(x => z.regions.some(r => x.c.regions.includes(r))); const sp = xs.reduce((a, x) => a + x.m.spent, 0), so = xs.reduce((a, x) => a + x.m.sold, 0); return { a: z.name, b: xs.length, c: fmtMoney(sp), d: fmtMoney(so), e: sp ? roasTxt(so / sp) : '—' }; }))}
      <h2>Ventas del período por día</h2>${RPT.table([{ h: 'Día', k: 'a' }, { h: 'Ventas', k: 'b', r: 1 }, { h: 'Neto', k: 'c', r: 1 }, { h: 'Con campaña', k: 'd', r: 1 }, { h: 'Vendedores', k: 'e' }], Object.keys(byDay).sort().reverse().map(d => { const xs = byDay[d]; return { a: fmtDate(d), b: xs.filter(s => s.kind === 'venta').length, c: fmtMoney(xs.reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0)), d: fmtMoney(xs.filter(s => s.campaign).reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0)), e: [...new Set(xs.map(s => s.seller).filter(Boolean))].map(p => personOf(p).short).join(', ') }; }))}`;
    return RPT.open(app === 'campanas' ? 'Informe de campañas' : 'Informe de ventas digitales', 'Campañas, resultados por objetivo y zona, ventas registradas', body);
  }

  // ----- Productos -----
  if (app === 'productos') {
    const stg = p => typeof stageOfProduct === 'function' ? stageOfProduct(p) : p.stage;
    const prendas = prods.filter(p => p.kind === 'prenda').sort((a, b) => a.line.localeCompare(b.line) || a.name.localeCompare(b.name));
    const docsTot = prendas.reduce((a, p) => a + prodDocs(p).length, 0), missTot = prendas.reduce((a, p) => a + missingOf(p).length, 0);
    const body = `
      ${RPT.kpis([['Prendas', prendas.length, `${prods.filter(p => p.kind === 'tela').length} telas · ${prods.filter(p => p.kind === 'insumo').length} insumos`], ['Documentos subidos', docsTot, ''], ['Documentos faltantes', missTot, `${prendas.filter(p => missingOf(p).length).length} productos`], ['Completos', prendas.filter(p => !missingOf(p).length).length, 'con toda su documentación']])}
      ${LINES.map(l => { const ps = prendas.filter(p => p.line === l.id); return ps.length ? `<h2>${l.name} (${ps.length})</h2>${RPT.table([{ h: 'Producto', k: 'a' }, { h: 'Código', k: 'b' }, { h: 'Tipo', k: 'c' }, { h: 'Etapa', k: 'd' }, { h: 'Colores', k: 'e' }, { h: 'Tallas', k: 'f' }, { h: 'Docs', k: 'g', r: 1 }, { h: 'Faltan', k: 'h' }], ps.map(p => ({ a: `<b>${esc(p.name)}</b>`, b: esc(p.code || ''), c: esc(p.type || ''), d: rptStage(stg(p)), e: p.colors.map(c => esc(c.n)).join(', '), f: p.sizes.join(' '), g: prodDocs(p).length, h: missingOf(p).length ? `<span class="danger">${missingOf(p).length}</span>: ${missingOf(p).map(esc).join(', ')}` : '<span class="ok">Completo</span>' })))}` : ''; }).join('')}
      <h2>Telas e insumos</h2>${RPT.table([{ h: 'Nombre', k: 'a' }, { h: 'Categoría', k: 'b' }, { h: 'Línea', k: 'c' }, { h: 'Tipo', k: 'd' }, { h: 'Composición', k: 'e' }, { h: 'Colores', k: 'f' }], prods.filter(p => p.kind !== 'prenda').map(p => ({ a: esc(p.name), b: kindName(p.kind), c: lineOf(p.line).name, d: esc(p.type || ''), e: esc(p.composition || ''), f: p.colors.map(c => esc(c.n)).join(', ') })))}
      <h2>Recursos</h2>${RPT.table([{ h: 'Recurso', k: 'a' }, { h: 'Descripción', k: 'b' }, { h: 'Archivo', k: 'c' }, { h: 'Estado', k: 'd' }], Store.list('resources').map(r => ({ a: esc(r.title), b: esc(r.desc), c: esc(r.file || ''), d: r.hasFile ? 'Cargado' : 'Pendiente' })))}`;
    return RPT.open('Informe de productos', 'Mix, etapas y documentación por línea', body);
  }

  // ----- Estados y Reposiciones -----
  if (app === 'estados') {
    const est = typeof estadosProducts === 'function' ? estadosProducts() : [];
    const byLine = {}; est.forEach(p => (byLine[p.line || 'Sin línea'] = byLine[p.line || 'Sin línea'] || []).push(p));
    const body = `
      ${RPT.kpis(STAGES.filter(s => est.some(p => p.stage === s.n)).slice(0, 8).map(s => [s.name, est.filter(p => p.stage === s.n).length, 'productos']))}
      ${Object.keys(byLine).map(l => `<h2>${esc(l)} (${byLine[l].length})</h2>${RPT.table([{ h: 'Producto', k: 'a' }, { h: 'Código', k: 'b' }, { h: 'Tipo', k: 'c' }, { h: 'Etapa', k: 'd' }, { h: 'Colores', k: 'e' }, { h: 'Llegada estimada', k: 'f' }], byLine[l].sort((a, b) => a.stage - b.stage || a.name.localeCompare(b.name)).map(p => ({ a: `<b>${esc(p.name)}</b>`, b: esc(p.code || ''), c: esc(p.garment || ''), d: rptStage(p.stage), e: esc(p.colors || ''), f: p.eta ? fmtDate(p.eta) : '—' })))}`).join('')}
      <div class="note">Muestras, pedidos y reposiciones en detalle: usa Configuración → Descargar resumen (.md) dentro de Estados, o el Informe PDF de cada pestaña de la app original.</div>`;
    return RPT.open('Informe de estados', 'Productos del mix por línea y etapa', body);
  }

  // ----- Configuración u otros -----
  return printSection('K8 App');
}
