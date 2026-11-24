// ============================================================
// Campañas › Sitio web: cómo le va a k8chile.cl mes a mes.
// Los datos los deja el conector (conectores/google-analytics.ps1,
// lo corre actualizar-ads.ps1 cada 60 min) en data/web.json:
// visitas, visitantes, tiempo, páginas, por dónde entran, de dónde
// llegan, dispositivos, regiones, productos y clics al WhatsApp.
// ============================================================
'use strict';

const WEB = { data: null, loading: false, c: 'var(--info)' };

async function loadWeb() {
  try {
    const r = await fetch('data/web.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return false;
    WEB.data = await r.json();
    for (const k of ['months', 'daily', 'pages', 'landing', 'channels', 'sources', 'devices', 'regions', 'cities', 'items', 'wa', 'events', 'events_daily']) if (WEB.data && WEB.data.ok) WEB.data[k] = asList(WEB.data[k]);
  } catch (e) { return false; }
  CONN.analytics = !!(WEB.data && (WEB.data.ok || WEB.data.stale));
  // Pedidos reales de la tienda (WooCommerce), si el conector los dejó
  try {
    const r2 = await fetch('data/tienda.json?ts=' + Date.now(), { cache: 'no-store' });
    if (r2.ok) { WEB.tienda = await r2.json(); if (WEB.tienda) { WEB.tienda.orders = asList(WEB.tienda.orders).map(o => ({ ...o, items: asList(o.items) })); } }
  } catch (e) { WEB.tienda = null; }
  CONN.tienda = !!(WEB.tienda && WEB.tienda.orders && WEB.tienda.orders.length);
  // Analytics de TLA (textillasamericas.cl): data/web-tla.json, mismo formato que web.json
  try {
    const r4 = await fetch('data/web-tla.json?ts=' + Date.now(), { cache: 'no-store' });
    if (r4.ok) { WEB.dataTla = await r4.json(); if (WEB.dataTla && WEB.dataTla.ok !== undefined) for (const k of ['months', 'daily', 'pages', 'landing', 'channels', 'sources', 'devices', 'regions', 'cities', 'items', 'wa', 'events', 'events_daily']) if (WEB.dataTla[k] !== undefined) WEB.dataTla[k] = asList(WEB.dataTla[k]); }
  } catch (e) { WEB.dataTla = null; }
  // Tienda web de TLA (textillasamericas.cl): para Sitio web con el selector en TLA
  try {
    const r3 = await fetch('data/tienda-tla.json?ts=' + Date.now(), { cache: 'no-store' });
    if (r3.ok) { WEB.tiendaTla = await r3.json(); if (WEB.tiendaTla) WEB.tiendaTla.orders = asList(WEB.tiendaTla.orders).map(o => ({ ...o, items: asList(o.items) })); }
  } catch (e) { WEB.tiendaTla = null; }
  return true;
}
// Estado de un pedido: pagado, no pagado (abandonó en el pago) o devuelto
const ORDER_PAID = ['completed', 'processing'], ORDER_UNPAID = ['pending', 'failed', 'cancelled', 'on-hold', 'checkout-draft'];
const ORDER_ES = { completed: 'Completado', processing: 'Pagado, en proceso', pending: 'Pendiente de pago', failed: 'Pago fallido', cancelled: 'Cancelado', 'on-hold': 'En espera', refunded: 'Reembolsado', 'checkout-draft': 'Borrador' };

// ---------- utilidades de mes ----------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ymNow = () => todayIso().slice(0, 7);
const ymShift = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const ymLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${cap(MESES[m - 1])} ${y}`; };
const ymShort = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1].slice(0, 3)} ${String(y).slice(2)}`; };
const fmtDur = s => { s = Math.round(Number(s || 0)); if (!s) return '—'; const m = Math.floor(s / 60), r = s % 60; return m ? `${m} min ${pad(r)} s` : `${r} s`; };
const fmtPct = p => (Number(p || 0) * 100).toLocaleString('es-CL', { maximumFractionDigits: 0 }) + '%';
const sumBy = (rows, k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
// Agrupa filas por una clave y suma las métricas indicadas.
function groupSum(rows, keyOf, mets) {
  const m = new Map();
  for (const r of rows) { const k = keyOf(r); if (k == null) continue; let o = m.get(k); if (!o) { o = { key: k, row: r }; for (const x of mets) o[x] = 0; m.set(k, o); } for (const x of mets) o[x] += Number(r[x] || 0); }
  return [...m.values()];
}
// Título de página sin la coletilla del sitio ("… | K8 Chile").
const cleanTitle = (t, path) => { let s = String(t || '').split(/\s[|–-]\s(?=[^|–-]*(K8|Textil|TLA))/)[0].trim(); if (!s || /^(k8 chile|textil las am[eé]ricas)$/i.test(s)) s = path === '/' ? 'Portada' : String(path || ''); return s; };
const CHANNEL_ES = { 'Organic Search': 'Búsqueda en Google', 'Direct': 'Directo (escriben la dirección)', 'Organic Social': 'Redes sociales', 'Paid Social': 'Anuncios en Meta', 'Paid Search': 'Anuncios en Google', 'Cross-network': 'Anuncios Google (varias redes)', 'Referral': 'Desde otros sitios', 'Email': 'Correo', 'Unassigned': 'Sin clasificar', 'Organic Shopping': 'Google Shopping', 'Paid Shopping': 'Anuncios Shopping', 'Display': 'Banners', 'Organic Video': 'Video (YouTube)', 'Paid Video': 'Anuncios en video', 'Affiliates': 'Afiliados', 'SMS': 'SMS', 'Mobile Push Notifications': 'Notificaciones', 'Audio': 'Audio', 'Paid Other': 'Otros anuncios', 'AI Assistant': 'Asistentes de IA (ChatGPT y otros)' };
const channelEs = n => CHANNEL_ES[n] || n || 'Sin clasificar';
const DEVICE_ES = { mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet', 'smart tv': 'Smart TV' };
// Región de Analytics ("Santiago Metropolitan Region") → región del panel ("Metropolitana").
function gaRegion(name) {
  const k = regionKeyOf(name).replace(/region$/, '');
  if (!k || k === 'notset') return null;
  if (k.includes('metropolitan') || k.includes('santiago')) return 'Metropolitana';
  return REGIONS.find(r => { const rk = regionKeyOf(r); return k.includes(rk) || rk.includes(k); }) || null;
}

// ---------- Barra de estado de Analytics ----------
function webBar(d = WEB.data) {
  let txt, tone;
  if (!d || !d.configured) { txt = 'Sin conectar · falta autorizar Google con el permiso de Analytics'; tone = 'var(--faint)'; }
  else if (d.ok) { const pn = d.property?.name || ''; txt = `Conectado · ${esc(pn && pn !== d.site ? `${pn} · ${d.site || ''}` : (d.site || pn || 'Google Analytics'))} · actualizado ${timeAgo(d.at)}`; tone = 'var(--ok)'; }
  else { txt = `Error: ${esc(d.error || 'sin detalle')}${d.stale ? ` · se muestran los datos de ${timeAgo(d.at)}` : ''}`; tone = 'var(--danger)'; }
  const ga = d && d.property && d.property.id ? `https://analytics.google.com/analytics/web/#/p${d.property.id}/reports/intelligenthome` : 'https://analytics.google.com/';
  return `<div class="card ads-bar" style="margin-bottom:14px;padding:12px 16px">
    <div class="row wrap" style="gap:12px;align-items:center">
      <div class="row" style="gap:10px;min-width:0;flex:1"><span style="width:9px;height:9px;border-radius:50%;background:${tone};box-shadow:0 0 8px ${tone};flex:none"></span><b style="color:${WEB.c};flex:none">Google Analytics</b><span class="sm muted" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${txt.replace(/<[^>]+>/g, '')}">${txt}</span></div>
      <div class="row" style="gap:8px;flex:none">
        ${d && d.updated_at ? `<span class="xs muted">Datos ${timeAgo(d.updated_at)}</span>` : ''}
        <button class="btn sm" id="web-refresh" title="Vuelve a consultar Google Analytics (y las campañas)">${ICON.zap(13)} Actualizar ahora</button>
        <a class="btn sm" href="docs/05-sitio-web-analytics.md" target="_blank" rel="noopener" title="Cómo conectar">Guía de conexión</a>
        <a class="btn sm ghost" href="${ga}" target="_blank" rel="noopener" title="Abrir Google Analytics">Analytics ${ICON.arrow(11)}</a>
        <a class="btn sm ghost" href="/api/ads/log" target="_blank" rel="noopener" title="Registro del último intento">Registro</a>
      </div>
    </div>
  </div>`;
}

async function webRefresh(btn) {
  if (WEB.loading) return;
  WEB.loading = true; const prev = (WEB.data && WEB.data.updated_at) || '';
  const label = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.innerHTML = 'Consultando…'; }
  try {
    const r = await fetch('/api/ads/actualizar', { cache: 'no-store' });
    if (!r.ok) throw new Error('El servidor del panel no respondió');
  } catch (e) {
    WEB.loading = false; if (btn) { btn.disabled = false; btn.innerHTML = label; }
    return toast('No se pudo pedir la actualización. Abre el panel con "Abrir Panel K8.bat".', true);
  }
  const t0 = Date.now();
  const poll = async () => {
    await loadWeb(); await loadAds();
    const now = (WEB.data && WEB.data.updated_at) || '';
    if (now && now !== prev) { WEB.loading = false; toast(WEB.data.ok ? 'Sitio web actualizado' : `Analytics: ${WEB.data.error || 'error'}`, !WEB.data.ok); return render(); }
    if (Date.now() - t0 > 180000) { WEB.loading = false; if (btn) { btn.disabled = false; btn.innerHTML = label; } return toast('La actualización está tardando. Revisa el Registro.', true); }
    setTimeout(poll, 4000);
  };
  setTimeout(poll, 4000);
}

// ---------- Gráfico de barras mes a mes (clic en un mes para verlo) ----------
function monthBars(months, sel, key, color, fmt = fmtInt) {
  if (!months.length) return empty('Sin meses con datos');
  const max = Math.max(1, ...months.map(m => Number(m[key] || 0)));
  return `<div class="mbars" style="display:grid;grid-template-columns:repeat(${months.length},minmax(0,1fr));gap:6px;align-items:end;height:150px">
    ${months.map(m => { const v = Number(m[key] || 0), h = Math.max(2, v / max * 118); const on = m.ym === sel; return `<button class="mbar" data-wm="${m.ym}" title="${ymLabel(m.ym)} · ${fmt(v)}" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%;min-width:0;padding:0;background:none;border:0;cursor:pointer">
      <span class="xs b" style="color:${on ? color : 'var(--muted)'};font-size:10px;white-space:nowrap">${v ? (v >= 1000 ? (v / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'k' : v) : ''}</span>
      <span style="width:100%;max-width:34px;height:${h}px;border-radius:6px 6px 3px 3px;background:${color};opacity:${on ? 1 : .35};box-shadow:${on ? `0 0 12px ${color}` : 'none'};transition:opacity .15s"></span>
      <span class="xs ${on ? 'b' : 'muted'}" style="font-size:10px;white-space:nowrap;color:${on ? 'var(--text)' : ''}">${ymShort(m.ym)}</span></button>`; }).join('')}
  </div>`;
}

// Lista con barras proporcionales (nombre · valor · % del total).
function rankList(rows, { color = WEB.c, max = 8, fmt = fmtInt, total = 0, sub = null } = {}) {
  if (!rows.length) return empty('Sin datos este mes');
  const top = rows.slice(0, max); const mx = Math.max(1, ...top.map(r => r.v));
  return top.map(r => `<div style="margin-bottom:8px"><div class="row sm" style="gap:8px"><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(r.title || r.name)}">${esc(r.name)}</span>${sub && sub(r) ? `<span class="xs muted">${sub(r)}</span>` : ''}<b>${fmt(r.v)}</b>${total ? `<span class="xs muted" style="width:36px;text-align:right">${pct(r.v, total)}%</span>` : ''}</div><div class="bar thin" style="--c:${color};margin-top:3px"><i style="width:${r.v / mx * 100}%"></i></div></div>`).join('');
}

const deltaTxt = (now, prev, invert = false) => { if (prev == null || !prev) return ''; const d = (now - prev) / prev; if (Math.abs(d) < 0.03) return '<span class="muted">→ igual</span>'; const up = d > 0; const good = invert ? !up : up; return `<span style="color:${good ? 'var(--ok)' : 'var(--danger)'}">${up ? '↑' : '↓'} ${Math.round(Math.abs(d) * 100)}%</span>`; };

// ---------- Sitio web de TLA (24-11): pedidos reales de textillasamericas.cl (WooCommerce) ----------
// Google Analytics de TLA todavía no está conectado; se avisa y se muestra lo de la tienda.
function campanasWebTla() {
  const T = WEB.tiendaTla; const orders = (T && T.orders ? T.orders : []).filter(o => o.status !== 'trash');
  const has = orders.length > 0; const C = 'var(--ok)';
  // Todos los meses desde el primer pedido hasta hoy (también los que no tienen pedidos, para que se note si la tienda se detuvo)
  const avail = []; const first = orders.reduce((a, o) => (!a || o.date < a) ? o.date : a, '').slice(0, 7);
  if (first) for (let m = first; m <= ymNow(); m = ymShift(m, 1)) avail.push(m);
  const ultimo = orders.reduce((a, o) => o.date > a ? o.date : a, '').slice(0, 10);
  if (!CP.wm || !avail.includes(CP.wm)) CP.wm = ymNow();
  const ym = CP.wm, pym = ymShift(ym, -1), isNow = ym === ymNow(), dayN = isNow ? Number(todayIso().slice(8, 10)) : 31;
  const paidOf = xs => xs.filter(o => ORDER_PAID.includes(o.status)), sumT = xs => xs.reduce((a, o) => a + Number(o.total || 0), 0);
  const ordersM = orders.filter(o => o.date.startsWith(ym));
  const paidM = paidOf(ordersM), unpaidM = ordersM.filter(o => ORDER_UNPAID.includes(o.status)), refundM = ordersM.filter(o => o.status === 'refunded');
  const prevM = orders.filter(o => o.date.startsWith(pym) && (!isNow || Number(o.date.slice(8, 10)) <= dayN));
  const revenue = sumT(paidM), revPrev = sumT(paidOf(prevM)), unpaidAmt = sumT(unpaidM);
  const cmpLbl = isNow ? `vs mismos días de ${MESES[Number(pym.slice(5)) - 1]}` : `vs ${MESES[Number(pym.slice(5)) - 1]}`;
  const k = (lbl, val, now, prev, extra) => kpi(lbl, val, prev ? `${deltaTxt(now, prev)} <span class="muted">${cmpLbl}</span>` : `<span class="muted">${extra || (avail.includes(pym) ? `${MESES[Number(pym.slice(5)) - 1]}: ${now ? 'sin ventas' : 'tampoco hubo'}` : 'sin mes anterior')}</span>`);
  const meses = avail.map(m => { const xs = orders.filter(o => o.date.startsWith(m)); return { ym: m, revenue: sumT(paidOf(xs)), orders: xs.length }; });
  const dias = waDaysBetween([`${ym}-01`, isNow ? todayIso() : `${ym}-${pad(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate())}`]).map(day => ({ date: day, v: sumT(paidM.filter(o => o.date.startsWith(day))) }));
  const items = groupSum(paidM.flatMap(o => o.items.map(i => ({ name: i.name, qty: i.qty, total: i.total }))), r => r.name, ['qty', 'total']).map(o => ({ name: o.key, v: o.total, q: o.qty })).sort((a, b) => b.v - a.v);
  const unpaidItems = groupSum(unpaidM.flatMap(o => o.items.map(i => ({ name: i.name, qty: i.qty, total: i.total }))), r => r.name, ['qty', 'total']).map(o => ({ name: o.key, v: o.qty, title: fmtMoney(o.total) })).sort((a, b) => b.v - a.v);
  const pagos = groupSum(paidM, o => o.payment || 'Sin dato', ['total']).map(o => ({ name: o.key, v: o.total })).sort((a, b) => b.v - a.v);
  const clientes = new Set(paidM.map(o => o.customer || o.id)).size;
  const tone = T && T.ok ? 'var(--ok)' : T && T.configured ? 'var(--danger)' : 'var(--faint)';
  const bar = `<div class="card ads-bar" style="margin-bottom:14px;padding:12px 16px"><div class="row" style="gap:10px;min-width:0"><span style="width:9px;height:9px;border-radius:50%;background:${tone};box-shadow:0 0 8px ${tone};flex:none"></span><b style="color:${C};flex:none">Tienda web TLA</b><span class="sm muted" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${T && T.ok ? `Conectada · ${esc(T.store || 'textillasamericas.cl')} · ${fmtInt(orders.length)} pedidos desde ${fmtDate(String(T.since || '').slice(0, 10))} · último pedido el ${fmtDate(ultimo)} · actualizada ${timeAgo(T.at)}` : T && T.error ? 'Error: ' + esc(T.error) : 'Sin conectar'}</span></div>
    </div>`;
  const GA = WEB.dataTla || {};
  // Analytics de TLA conectado (24-11) pero todavía sin días con datos: recién empezó a medir
  const gaAviso = GA.ok ? `<div class="card" style="margin-bottom:14px;padding:14px 16px;border-left:3px solid var(--info)">${cardHead(ICON.clock(15), 'Google Analytics de TLA conectado', 'Empezó a medir el 24 de noviembre de 2026', '', 'var(--info)')}
    <div class="sm" style="line-height:1.6">El panel ya lee el Analytics de textillasamericas.cl, pero Google todavía no entrega días con datos (tarda unas horas en procesar las primeras visitas). Cuando lleguen, esta página muestra lo mismo que la de K8: visitas, visitantes, minutos en el sitio, páginas y productos más vistos, de dónde llegan y clics a WhatsApp. Se revisa sola cada hora.</div>
    ${GA.updated_at ? `<div class="xs muted" style="margin-top:8px">Última revisión: ${timeAgo(GA.updated_at)}</div>` : ''}</div>` : `<div class="card" style="margin-bottom:14px;padding:14px 16px;border-left:3px solid var(--warn)">${cardHead(ICON.alert(15), 'Falta el acceso al Google Analytics de TLA', 'Para ver visitas, visitantes, minutos en el sitio, productos más vistos, de dónde llegan y clics a WhatsApp, igual que en K8', '', 'var(--warn)')}
    <div class="sm" style="line-height:1.6">La web de TLA sí tiene Google Analytics (código <b>${esc(GA.measurement_id || 'G-B2Y42P43E7')}</b>), pero la cuenta de Google conectada al panel no tiene permiso para leerlo. Quien administra ese Analytics tiene que entrar a <b>Administrar › Administración de acceso a la propiedad</b> y agregar, con rol <b>Lector</b>, la misma cuenta de Google con la que se conectó el Analytics de K8. Apenas lo haga, el panel lo trae solo (cada hora) y esta página se completa igual que la de K8.</div>
    ${GA.updated_at ? `<div class="xs muted" style="margin-top:8px">Último intento: ${timeAgo(GA.updated_at)}</div>` : ''}</div>`;
  const title = `<div class="page-head"><div><h1>Sitio web · TLA</h1><p>Lo que vende textillasamericas.cl mes a mes: pedidos pagados, lo que queda sin pagar y qué productos se llevan.</p></div><div class="actions"><button class="btn" data-print="Campañas · Sitio web TLA">${ICON.pdf(14)} Informe PDF</button></div></div>`;
  const monthPick = `<div class="row wrap no-print" style="margin:0 4px 14px;gap:10px">
    <div class="seg"><button data-wm="${pym}" title="Mes anterior" ${avail.length && !avail.includes(pym) ? 'disabled' : ''}>${ICON.chevL(13)}</button><button class="on" style="min-width:150px">${ymLabel(ym)}</button><button data-wm="${ymShift(ym, 1)}" title="Mes siguiente" ${ymShift(ym, 1) > ymNow() ? 'disabled' : ''}>${ICON.chevR(13)}</button></div>
    ${!isNow ? `<button class="btn sm" data-wm="${ymNow()}">Este mes</button>` : `<span class="sm muted">en curso · ${dayN} días</span>`}</div>`;
  if (!has) return `${title}${cpTabs('web')}${bar}${gaAviso}<div class="card">${empty('Sin pedidos de la tienda de TLA', 'Cuando el conector traiga los pedidos de WooCommerce aparecerán aquí')}</div>`;
  const sinPedidos = ultimo && daysBetween(ultimo, todayIso()) > 30 ? `<div class="card" style="margin-bottom:14px;padding:12px 16px;border-left:3px solid var(--warn)"><div class="sm"><b>La tienda de TLA no recibe pedidos desde el ${fmtDate(ultimo)}</b> (hace ${fmtInt(daysBetween(ultimo, todayIso()))} días). Vale la pena revisar que el pago y el carrito de textillasamericas.cl estén funcionando.</div></div>` : '';
  return `${title}${cpTabs('web')}${bar}${gaAviso}${sinPedidos}${monthPick}
  <div class="grid g4" style="margin-bottom:14px">
    ${k('Vendido por la web', fmtShort(revenue), revenue, revPrev)}
    ${k('Pedidos pagados', fmtInt(paidM.length), paidM.length, paidOf(prevM).length)}
    ${kpi('Ticket promedio', paidM.length ? fmtMoney(revenue / paidM.length) : '—', paidM.length ? `${fmtInt(clientes)} ${clientes === 1 ? 'cliente' : 'clientes'} distintos` : 'sin pedidos pagados')}
    ${kpi('Sin pagar', fmtInt(unpaidM.length), unpaidM.length ? `${fmtShort(unpaidAmt)} que llegaron al pago y no pagaron${refundM.length ? ` · ${refundM.length} devueltos` : ''}` : 'nadie quedó en el pago')}
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.trend(15), 'Vendido por día', `${ymLabel(ym)} · pedidos pagados`, '', C)}${stockChart(dias, { color: C, height: 190, fmt: fmtShort, label: 'vendido' })}</div>
    <div class="card">${cardHead(ICON.chart(15), 'Mes a mes', 'Vendido por la web cada mes · toca un mes para verlo', '', C)}${monthBars(meses, ym, 'revenue', C, fmtShort)}</div>
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.box(15), 'Pedidos del mes', `${fmtInt(ordersM.length)} pedidos · ${fmtInt(paidM.length)} pagados · ${fmtInt(unpaidM.length)} sin pagar`, '', C)}
      ${ordersM.length ? `<table class="table"><thead><tr><th>Pedido</th><th>Estado</th><th>Productos</th><th class="r">Monto</th></tr></thead><tbody>${[...ordersM].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map(o => `<tr><td class="sm"><b>#${o.id}</b><div class="xs muted">${fmtDate(o.date.slice(0, 10))}${o.city ? ' · ' + esc(o.city) : ''}${o.company ? ' · ' + esc(o.company) : ''}</div></td><td>${chip(ORDER_ES[o.status] || o.status, ORDER_PAID.includes(o.status) ? 'var(--ok)' : o.status === 'refunded' ? 'var(--faint)' : 'var(--danger)')}</td><td class="sm muted" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(o.items.map(i => `${i.qty}× ${i.name}`).join(', '))}">${esc(o.items.map(i => `${i.qty}× ${i.name}`).join(', '))}</td><td class="r b">${fmtShort(o.total)}</td></tr>`).join('')}</tbody></table>${ordersM.length > 12 ? `<div class="xs muted">y ${ordersM.length - 12} más</div>` : ''}` : empty('Sin pedidos en el mes')}
    </div>
    <div class="card">${cardHead(ICON.shirt(15), 'Lo que más se vendió', 'Productos en pedidos pagados del mes', '', 'var(--app-productos)')}
      ${rankList(items, { color: 'var(--app-productos)', max: 8, fmt: fmtShort, sub: r => `${fmtInt(r.q)} u` })}
      ${unpaidItems.length ? `<div style="margin-top:12px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Qué dejaron sin pagar</div>${rankList(unpaidItems, { color: 'var(--danger)', max: 5 })}</div>` : ''}
      ${pagos.length ? `<div style="margin-top:12px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Cómo pagan</div>${rankList(pagos, { color: C, max: 4, fmt: fmtShort, total: revenue })}</div>` : ''}
    </div>
  </div>`;
}

// ---------- Página ----------
function campanasWeb() {
  const tla = typeof cpTla === 'function' && cpTla();
  const d = tla ? WEB.dataTla : WEB.data; const TI = tla ? WEB.tiendaTla : WEB.tienda;
  // TLA: con el Analytics conectado se muestran los mismos campos que K8 (aunque aún no haya días con datos); sin conexión, solo la tienda
  if (tla && !(d && (d.ok || d.stale))) return campanasWebTla(); const has = !!(d && (d.ok || d.stale) && d.months);
  const tlaAviso = tla && !(d.months || []).length ? `<div class="card" style="margin-bottom:14px;padding:12px 16px;border-left:3px solid var(--info)"><div class="sm"><b>Google Analytics de TLA conectado.</b> Empezó a medir el 24 de noviembre de 2026 y Google tarda unas horas en entregar las primeras visitas: mientras tanto los campos salen en cero. Se completan solos (el panel revisa cada hora).</div></div>` : '';
  const months = has ? d.months : [];
  const avail = months.map(m => m.ym);
  if (!CP.wm || (avail.length && !avail.includes(CP.wm))) CP.wm = avail.includes(ymNow()) ? ymNow() : (avail[avail.length - 1] || ymNow());
  const ym = CP.wm, pym = ymShift(ym, -1), isNow = ym === ymNow();
  const M = months.find(m => m.ym === ym) || {}, P = months.find(m => m.ym === pym) || null;
  const inYm = (rows, k = 'ym') => (rows || []).filter(r => r[k] === ym);
  const daily = has ? d.daily.filter(r => r.date.startsWith(ym)) : [];
  // En el mes en curso se compara con los mismos días del mes anterior, para no comparar 18 días contra 30.
  const dayN = isNow ? Number(todayIso().slice(8, 10)) : 31;
  const prevDaily = has && P ? d.daily.filter(r => r.date.startsWith(pym) && Number(r.date.slice(8, 10)) <= dayN) : [];
  const cmp = k => P ? (isNow ? sumBy(prevDaily, k) : Number(P[k] || 0)) : null;
  const cmpLbl = P ? (isNow ? `vs mismos días de ${MESES[Number(pym.slice(5)) - 1]}` : `vs ${MESES[Number(pym.slice(5)) - 1]}`) : 'sin mes anterior';
  const fullLbl = P ? `vs ${MESES[Number(pym.slice(5)) - 1]} completo` : 'sin mes anterior';
  const k = (lbl, val, now, prev, extra = '', invert = false, full = false) => kpi(lbl, val, `${deltaTxt(now, prev, invert)} <span class="muted">${prev != null && prev ? (full ? fullLbl : cmpLbl) : (extra || cmpLbl)}</span>`);

  const sessions = Number(M.sessions || 0), users = Number(M.users || 0), views = Number(M.views || 0), wa = Number(M.wa || 0);
  const pagesM = inYm(d && d.pages), landingM = inYm(d && d.landing), chM = inYm(d && d.channels), srcM = inYm(d && d.sources), devM = inYm(d && d.devices), regM = inYm(d && d.regions), cityM = inYm(d && d.cities), itemsM = inYm(d && d.items);
  const waRows = has ? d.wa.filter(r => r.date.startsWith(ym)) : [];

  const pages = groupSum(pagesM, r => r.path, ['views', 'users', 'eng']).map(o => ({ name: cleanTitle(o.row.title, o.key), path: o.key, v: o.views, users: o.users, t: o.views ? o.eng / o.views : 0 })).sort((a, b) => b.v - a.v);
  // Analytics entrega la página de entrada sin la barra final ("/shop"), las páginas con barra ("/shop/"): se cruzan sin ella.
  const noSlash = p => String(p || '').replace(/\/+$/, '') || '/';
  const landing = groupSum(landingM, r => noSlash(r.path), ['sessions', 'users']).map(o => { const pg = pages.find(p => noSlash(p.path) === o.key); return { name: o.key === '(not set)' ? 'Sin página de entrada (visitas sin registro de página)' : pg ? pg.name : (o.key === '/' ? 'Portada' : o.key), title: o.key, v: o.sessions }; }).sort((a, b) => b.v - a.v);
  const channels = groupSum(chM, r => r.name, ['sessions', 'users']).map(o => ({ name: channelEs(o.key), v: o.sessions })).sort((a, b) => b.v - a.v);
  const sources = groupSum(srcM, r => `${r.source} / ${r.medium}`, ['sessions']).map(o => ({ name: o.key.replace(' / (none)', '').replace('(direct)', 'directo').replace('(data not available) / (data not available)', 'Sin dato de origen'), v: o.sessions })).sort((a, b) => b.v - a.v);
  const devices = groupSum(devM, r => r.device, ['sessions']).map(o => ({ name: DEVICE_ES[o.key] || o.key, v: o.sessions })).sort((a, b) => b.v - a.v);
  const regs = groupSum(regM.filter(r => r.country === 'Chile'), r => gaRegion(r.region) || 'Sin región', ['sessions', 'users']);
  const regOf = r => regs.find(x => x.key === r); const maxReg = Math.max(1, ...regs.map(x => x.sessions));
  const abroad = sumBy(regM.filter(r => r.country !== 'Chile'), 'sessions');
  const countries = groupSum(regM.filter(r => r.country !== 'Chile'), r => r.country, ['sessions']).sort((a, b) => b.sessions - a.sessions).slice(0, 4);
  const cities = groupSum(cityM.filter(r => r.country === 'Chile' && r.city && r.city !== '(not set)'), r => r.city, ['sessions']).map(o => ({ name: o.key, v: o.sessions })).sort((a, b) => b.v - a.v);
  const prodPages = pages.filter(p => /^\/producto\//.test(p.path)).map(p => ({ name: p.name, title: p.path, v: p.v, users: p.users }));
  const items = groupSum(itemsM, r => r.name, ['views', 'carts', 'purchases', 'revenue']).map(o => ({ name: o.key, v: o.views, carts: o.carts, purchases: o.purchases, revenue: o.revenue })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const products = items.length ? items : prodPages;
  const cats = pages.filter(p => /^\/categoria-producto\//.test(p.path)).map(p => ({ name: p.name, title: p.path, v: p.v })).slice(0, 6);
  const waByPage = groupSum(waRows, r => r.path, ['n']).map(o => { const pg = pages.find(p => p.path === o.key); return { name: pg ? pg.name : o.key, title: o.key, v: o.n }; }).sort((a, b) => b.v - a.v);
  const waByEvent = groupSum(waRows, r => r.event, ['n']).sort((a, b) => b.n - a.n);
  const waDaily = daily.map(r => ({ date: r.date, v: r.wa }));
  const chartRows = daily.map(r => ({ date: r.date, v: r.sessions }));
  const avgDay = daily.length ? sessions / daily.length : 0;
  // Carrito, compras y formularios (eventos de tienda de Analytics, del mes elegido)
  const evM = inYm(d && d.events); const ev = name => { const r = evM.find(e => e.event === name); return r ? { n: Number(r.n || 0), users: Number(r.users || 0) } : { n: 0, users: 0 }; };
  const cartU = ev('add_to_cart').users;
  // Pedidos reales de WooCommerce del mes: llegaron al pago (pedido creado), pagaron, no pagaron
  const hasTienda = !!(TI && TI.orders && TI.orders.length);
  const ordersM = hasTienda ? TI.orders.filter(o => o.date.startsWith(ym) && o.status !== 'trash') : [];
  const paidM = ordersM.filter(o => ORDER_PAID.includes(o.status)), unpaidM = ordersM.filter(o => ORDER_UNPAID.includes(o.status)), refundM = ordersM.filter(o => o.status === 'refunded');
  const checkoutU = hasTienda ? ordersM.length : Math.max(ev('begin_checkout').users, ev('add_payment_info').users, ev('add_shipping_info').users);
  const buyU = hasTienda ? paidM.length : ev('purchase').users;
  const revenue = paidM.reduce((a, o) => a + Number(o.total || 0), 0), unpaidAmt = unpaidM.reduce((a, o) => a + Number(o.total || 0), 0);
  const abandon = Math.max(0, cartU - buyU);
  const boughtItems = groupSum(paidM.flatMap(o => o.items.map(i => ({ name: i.name, qty: i.qty, total: i.total }))), r => r.name, ['qty', 'total']).map(o => ({ name: o.key, v: o.qty, title: fmtMoney(o.total) })).sort((a, b) => b.v - a.v);
  const unpaidItems = groupSum(unpaidM.flatMap(o => o.items.map(i => ({ name: i.name, qty: i.qty, total: i.total }))), r => r.name, ['qty', 'total']).map(o => ({ name: o.key, v: o.qty, title: fmtMoney(o.total) })).sort((a, b) => b.v - a.v);
  const tiendaMeses = hasTienda ? groupSum(TI.orders.filter(o => o.status !== 'trash'), o => o.date.slice(0, 7), ['total']).map(o => ({ ym: o.key, orders: TI.orders.filter(x => x.date.startsWith(o.key)).length, paid: TI.orders.filter(x => x.date.startsWith(o.key) && ORDER_PAID.includes(x.status)).length, revenue: TI.orders.filter(x => x.date.startsWith(o.key) && ORDER_PAID.includes(x.status)).reduce((a, x) => a + Number(x.total || 0), 0) })).sort((a, b) => a.ym.localeCompare(b.ym)) : [];
  const evDaily = (has ? d.events_daily : []).filter(r => r.date.startsWith(ym));
  const evSeries = name => daily.map(r => { const x = evDaily.find(e => e.date === r.date && e.event === name); return { date: r.date, v: x ? Number(x.users || 0) : 0 }; });
  const cartItems = groupSum(itemsM, r => r.name, ['carts', 'purchases']).map(o => ({ name: o.key, v: o.carts, purchases: o.purchases })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const formU = ev('form_submit').users, formStartU = ev('form_start').users, contactU = ev('contact_link_click').users, cotizarU = ev('popup_dtf_cotizar').users;

  const title = `<div class="page-head"><div><h1>Sitio web${tla ? ' · TLA' : ''}</h1><p>Cómo le va a ${esc((d && d.site) || (tla ? 'textillasamericas.cl' : 'k8chile.cl'))} mes a mes: visitas, de dónde llegan, qué miran y cuántos escriben al WhatsApp.</p></div><div class="actions"><button class="btn" data-print="Campañas · Sitio web">${ICON.pdf(14)} Informe PDF</button></div></div>`;
  const monthPick = `<div class="row wrap no-print" style="margin:0 4px 14px;gap:10px">
    <div class="seg"><button data-wm="${ymShift(ym, -1)}" title="Mes anterior" ${avail.length && !avail.includes(ymShift(ym, -1)) ? 'disabled' : ''}>${ICON.chevL(13)}</button><button class="on" style="min-width:150px">${ymLabel(ym)}</button><button data-wm="${ymShift(ym, 1)}" title="Mes siguiente" ${ymShift(ym, 1) > ymNow() ? 'disabled' : ''}>${ICON.chevR(13)}</button></div>
    ${!isNow ? `<button class="btn sm" data-wm="${ymNow()}">Este mes</button>` : `<span class="sm muted">en curso · ${dayN} días</span>`}
    <span class="spacer"></span><span class="sm muted">${has && months.length ? `${months.length} meses de historia · desde ${ymLabel(months[0].ym).toLowerCase()}` : ''}</span></div>`;

  if (!has) {
    const err = d && d.error ? esc(d.error) : '';
    return `${title}${cpTabs('web')}${webBar(d)}${monthPick}
    <div class="grid g4" style="margin-bottom:14px">${kpi('Visitas', '—', 'pendiente de conexión')}${kpi('Visitantes', '—', 'pendiente de conexión')}${kpi('Tiempo promedio', '—', 'pendiente de conexión')}${kpi('Clics a WhatsApp', '—', 'pendiente de conexión')}</div>
    <div class="card" style="border-left:3px solid var(--warn)">${cardHead(ICON.alert(15), 'Falta conectar Google Analytics', 'Tres pasos, una sola vez', '', 'var(--warn)')}
      <ol class="sm" style="margin:0;padding-left:20px;line-height:1.8">
        <li>En Google Cloud (proyecto Panel K8) habilitar <b>Google Analytics Data API</b> y <b>Google Analytics Admin API</b>.</li>
        <li>Doble clic en <b>Autorizar Google Ads.bat</b> y aceptar también el permiso de Analytics (misma cuenta de Google que ve Analytics del sitio).</li>
        <li>Pulsar <b>Actualizar ahora</b> aquí arriba.</li>
      </ol>
      ${err ? `<div class="xs muted" style="margin-top:10px">Último intento: ${err}</div>` : ''}
      <div class="sm" style="margin-top:10px"><a class="btn sm" href="docs/05-sitio-web-analytics.md" target="_blank" rel="noopener">Ver la guía paso a paso</a></div>
    </div>`;
  }

  return `${title}${cpTabs('web')}${webBar(d)}${tlaAviso}${monthPick}
  <div class="grid g4" style="margin-bottom:14px">
    ${k('Visitas', fmtInt(sessions), sessions, cmp('sessions'))}
    ${k('Visitantes', fmtInt(users), users, cmp('users'))}
    ${k('Páginas vistas', fmtInt(views), views, cmp('views'))}
    ${k('Clics a WhatsApp', fmtInt(wa), wa, cmp('wa'))}
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${k('Tiempo promedio en el sitio', fmtDur(M.avg_duration), Number(M.avg_duration || 0), P ? Number(P.avg_duration || 0) : null, 'por visita', false, true)}
    ${k('Páginas por visita', Number(M.pages_per_session || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 }), Number(M.pages_per_session || 0), P ? Number(P.pages_per_session || 0) : null, '', false, true)}
    ${k('Visitantes nuevos', fmtInt(M.new_users), Number(M.new_users || 0), cmp('new_users'))}
    ${kpi('Se quedan e interactúan', fmtPct(M.engagement_rate), `${fmtPct(M.bounce_rate)} se van sin hacer nada · ${wa && sessions ? `${(wa / sessions * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% escribe al WhatsApp` : 'sin clics a WhatsApp'}`)}
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.trend(15), 'Visitas por día', `${ymLabel(ym)} · promedio ${avgDay.toLocaleString('es-CL', { maximumFractionDigits: 0 })} visitas al día`, '', WEB.c)}
      ${stockChart(chartRows, { color: WEB.c, height: 190, label: 'visitas' })}
    </div>
    <div class="card">${cardHead(ICON.chart(15), 'Mes a mes', 'Visitas de cada mes · toca un mes para verlo', '', WEB.c)}
      ${monthBars(months, ym, 'sessions', WEB.c)}
    </div>
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.eye(15), 'Páginas más visitadas', 'Qué miran y cuánto se quedan en cada una', '', WEB.c)}
      <table class="table"><thead><tr><th>Página</th><th class="r">Vistas</th><th class="r">Visitantes</th><th class="r">Tiempo prom.</th><th class="r">% vistas</th></tr></thead><tbody>
      ${pages.slice(0, 12).map(p => `<tr><td><div class="b" style="max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div><div class="xs muted" style="max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.path)}</div></td><td class="r b">${fmtInt(p.v)}</td><td class="r">${fmtInt(p.users)}</td><td class="r">${fmtDur(p.t)}</td><td class="r muted">${pct(p.v, views)}%</td></tr>`).join('') || `<tr><td colspan="5">${empty('Sin páginas este mes')}</td></tr>`}
      </tbody></table>
    </div>
    <div class="card">${cardHead(ICON.flag(15), 'Por dónde entran', 'Primera página que ven al llegar', '', WEB.c)}
      ${rankList(landing, { total: sessions, max: 10 })}
    </div>
  </div>
  <div class="grid g3" style="margin-bottom:14px">
    <div class="card">${cardHead(ICON.pin(15), 'De dónde llega la gente', 'Canal por el que entran al sitio', '', WEB.c)}
      ${rankList(channels, { total: sessions })}
    </div>
    <div class="card">${cardHead(ICON.link(15), 'Fuentes', 'Sitio o red de origen', '', WEB.c)}
      ${rankList(sources, { total: sessions })}
    </div>
    <div class="card">${cardHead(ICON.grid(15), 'Dispositivos', 'Desde qué aparato entran', '', WEB.c)}
      ${rankList(devices, { total: sessions })}
      <div style="margin-top:12px">${cardHead(ICON.pin(15), 'Ciudades', 'Las que más visitan', '', WEB.c)}${rankList(cities, { total: sessions, max: 6 })}</div>
    </div>
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.shirt(15), 'Productos más vistos', items.length ? 'Fichas de producto · vistas, agregados al carrito y compras' : 'Fichas de producto más visitadas', '', 'var(--app-productos)')}
      <table class="table"><thead><tr><th>Producto</th><th class="r">Vistas</th>${items.length ? '<th class="r">Al carrito</th><th class="r">Compras</th>' : '<th class="r">Visitantes</th>'}</tr></thead><tbody>
      ${products.slice(0, 10).map(p => `<tr><td class="b" style="max-width:380px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.title || p.name)}">${esc(p.name)}</td><td class="r b">${fmtInt(p.v)}</td>${items.length ? `<td class="r">${fmtInt(p.carts)}</td><td class="r">${fmtInt(p.purchases)}</td>` : `<td class="r">${fmtInt(p.users)}</td>`}</tr>`).join('') || `<tr><td colspan="4">${empty('Sin visitas a productos este mes')}</td></tr>`}
      </tbody></table>
      ${cats.length ? `<div style="margin-top:12px">${cardHead(ICON.layers(15), 'Categorías más vistas', '', '', 'var(--app-productos)')}${rankList(cats, { color: 'var(--app-productos)', max: 6 })}</div>` : ''}
    </div>
    <div class="card">${cardHead(ICON.msg(15), 'Clics a WhatsApp', 'Botón flotante y enlaces a WhatsApp del sitio', '', 'var(--ok)')}
      <div class="row" style="align-items:baseline;gap:10px;margin-bottom:6px"><span class="num" style="font-size:30px;color:var(--ok)">${fmtInt(wa)}</span><span class="sm muted">en ${ymLabel(ym)} · ${sessions ? `1 de cada ${Math.round(sessions / Math.max(1, wa))} visitas` : ''}</span></div>
      ${stockChart(waDaily, { color: 'var(--ok)', height: 120, fmt: fmtInt, label: 'clics por día' })}
      <div style="margin-top:12px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Desde qué páginas</div>${rankList(waByPage, { color: 'var(--ok)', total: wa, max: 6 })}</div>
      ${waByEvent.length ? `<div class="xs muted" style="margin-top:8px">Eventos contados: ${waByEvent.map(e => `${esc(e.key)} (${fmtInt(e.n)})`).join(' · ')}</div>` : '<div class="xs muted" style="margin-top:8px">Analytics no registró clics a WhatsApp este mes.</div>'}
    </div>
  </div>
  <div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.box(15), 'Carrito abandonado', hasTienda ? 'Analytics (carrito) + pedidos reales de WooCommerce (pago y compra)' : 'Personas que agregan al carrito y no compran', '', 'var(--danger)')}
      <div class="row" style="align-items:baseline;gap:10px;margin-bottom:8px"><span class="num" style="font-size:30px;color:var(--danger)">${fmtInt(abandon)}</span><span class="sm muted">de ${fmtInt(cartU)} que agregaron algo en ${ymLabel(ym)}${cartU ? ` · ${Math.round(abandon / cartU * 100)}% no compró` : ''}</span></div>
      ${[['Agregaron al carrito', cartU, 'var(--warn)', 'personas, según Analytics'], ['Llegaron al pago', checkoutU, 'var(--info)', hasTienda ? `pedidos creados · ${fmtInt(unpaidM.length)} no pagaron (${fmtShort(unpaidAmt)})` : ''], ['Compraron', buyU, 'var(--ok)', hasTienda ? `pedidos pagados · ${fmtShort(revenue)} vendidos` : '']].map(([l, v, c, s]) => `<div style="margin-bottom:8px"><div class="row sm"><span>${l}${s ? `<div class="xs muted">${s}</div>` : ''}</span><span class="spacer"></span><b>${fmtInt(v)}</b><span class="xs muted" style="width:36px;text-align:right">${cartU ? pct(v, cartU) : 0}%</span></div><div class="bar thin" style="--c:${c};margin-top:3px"><i style="width:${cartU ? pct(v, cartU) : 0}%"></i></div></div>`).join('')}
      ${stockChart(evSeries('add_to_cart'), { color: 'var(--warn)', height: 110, label: 'personas que agregaron al carrito por día' })}
      <div class="xs muted" style="margin-top:6px">${hasTienda ? 'Pago y compra vienen de los pedidos de WooCommerce (todos los estados); el carrito, de Analytics.' : 'La web no manda a Analytics el paso de pago ni todas las compras; conectar WooCommerce da el dato exacto.'}</div>
    </div>
    <div class="card">${cardHead(ICON.shirt(15), hasTienda ? 'Pedidos del mes' : 'Qué dejan en el carrito', hasTienda ? `${fmtInt(ordersM.length)} pedidos · ${fmtInt(paidM.length)} pagados · ${fmtInt(unpaidM.length)} sin pagar${refundM.length ? ` · ${refundM.length} devueltos` : ''}` : 'Unidades agregadas al carrito sin comprar', '', 'var(--warn)')}
      ${hasTienda ? `
        ${ordersM.length ? `<table class="table"><thead><tr><th>Pedido</th><th>Estado</th><th>Productos</th><th class="r">Monto</th></tr></thead><tbody>${[...ordersM].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(o => `<tr><td class="sm"><b>#${o.id}</b><div class="xs muted">${fmtDate(o.date.slice(0, 10))}${o.city ? ' · ' + esc(o.city) : ''}${o.company ? ' · ' + esc(o.company) : ''}</div></td><td>${chip(ORDER_ES[o.status] || o.status, ORDER_PAID.includes(o.status) ? 'var(--ok)' : o.status === 'refunded' ? 'var(--faint)' : 'var(--danger)')}</td><td class="sm muted" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(o.items.map(i => `${i.qty}× ${i.name}`).join(', '))}">${esc(o.items.map(i => `${i.qty}× ${i.name}`).join(', '))}</td><td class="r b">${fmtShort(o.total)}</td></tr>`).join('')}</tbody></table>` : empty('Sin pedidos en el mes', 'Ni pagados ni abandonados en el pago')}
        ${unpaidItems.length ? `<div style="margin-top:10px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Qué dejaron sin pagar</div>${rankList(unpaidItems, { color: 'var(--danger)', max: 5 })}</div>` : ''}
        ${tiendaMeses.length ? `<div style="margin-top:10px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Vendido por la web, mes a mes</div>${monthBars(tiendaMeses, ym, 'revenue', 'var(--ok)', fmtShort)}</div>` : ''}
        <div style="margin-top:10px"><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Qué se queda en el carrito (Analytics, unidades)</div>${rankList(cartItems.map(x => ({ name: x.name, v: x.v - x.purchases, title: `${fmtInt(x.v)} agregadas` })).filter(x => x.v > 0), { color: 'var(--warn)', max: 5 })}</div>`
      : rankList(cartItems.map(x => ({ name: x.name, v: x.v - x.purchases, title: `${fmtInt(x.v)} agregadas · ${fmtInt(x.purchases)} compradas` })).filter(x => x.v > 0), { color: 'var(--warn)', max: 10 })}
    </div>
    <div class="card">${cardHead(ICON.mail(15), 'Formularios y contacto', 'Otras formas de pedir cotización en la web', '', WEB.c)}
      ${[['Enviaron un formulario', formU, formStartU ? `${fmtInt(formStartU)} lo empezaron · ${pct(formU, formStartU)}% lo terminó` : ''], ['Pidieron cotizar en el aviso (popup)', cotizarU, ''], ['Clic en datos de contacto', contactU, 'teléfono o correo'], ['Clics a WhatsApp', wa, 'botón y enlaces']].map(([l, v, s]) => `<div class="row sm" style="gap:8px;margin-bottom:10px;align-items:baseline"><span style="flex:1">${l}${s ? `<div class="xs muted">${s}</div>` : ''}</span><b class="num" style="font-size:20px">${fmtInt(v)}</b></div>`).join('')}
      <div class="xs muted">Personas distintas en ${ymLabel(ym)}.</div>
    </div>
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:6px"><div><h3>Visitas por región</h3><div class="sm muted">Solo visitas desde Chile · ${abroad ? `${fmtInt(abroad)} visitas desde fuera (${countries.map(c => `${esc(c.key)} ${fmtInt(c.sessions)}`).join(', ')})` : 'sin visitas desde fuera de Chile'}</div></div></div>
    <div class="grid map-grid2" style="grid-template-columns:1fr 140px;align-items:center">
      <table class="table"><thead><tr><th>Región</th><th>Zona</th><th class="r">Visitas</th><th class="r">Visitantes</th><th class="r">% Chile</th></tr></thead><tbody>
        ${[...regs].sort((a, b) => b.sessions - a.sessions).slice(0, 12).map(x => `<tr><td class="b">${esc(x.key)}</td><td class="sm muted">${zoneOfRegion(x.key) ? zoneOfRegion(x.key).name : '—'}</td><td class="r b">${fmtInt(x.sessions)}</td><td class="r">${fmtInt(x.users)}</td><td class="r muted">${pct(x.sessions, sumBy(regs, 'sessions'))}%</td></tr>`).join('') || `<tr><td colspan="5">${empty('Sin visitas desde Chile este mes')}</td></tr>`}
      </tbody></table>
      ${chileMapSvg(r => { const x = regOf(r); return x && x.sessions ? { fill: `color-mix(in srgb, ${WEB.c} ${25 + 75 * x.sessions / maxReg}%, var(--line))`, title: `${fmtInt(x.sessions)} visitas` } : {}; }, { w: 120, h: 280 })}
    </div>
  </div>`;
}

function bindWeb(el) {
  $$('[data-wm]', el).forEach(b => b.onclick = () => { if (b.disabled) return; CP.wm = b.dataset.wm; cpSave(); render(); });
  const rf = $('#web-refresh', el); if (rf) rf.onclick = () => webRefresh(rf);
}

window.addEventListener('load', () => { loadWeb().then(ok => { if (ok && typeof render === 'function' && location.hash.includes('campanas/web')) render(); }); });
