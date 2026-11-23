// ============================================================
// Campañas › Mercado Libre: ventas por día, qué se vende más y menos,
// publicaciones (activas, pausadas, stock, visitas) y Product Ads
// (gasto, campañas activas, ventas atribuidas).
// Los datos los deja conectores/mercadolibre.ps1 (cada hora, con
// actualizar-ads.ps1) en data/mercadolibre.json.
// ============================================================
'use strict';

const ML = { data: null, c: '#FFE600', ink: '#2D3277' };
const ML_STATUS_ES = { paid: 'Pagado', confirmed: 'Confirmado', payment_required: 'Pago pendiente', payment_in_process: 'Pago en proceso', partially_paid: 'Pago parcial', cancelled: 'Cancelado', invalid: 'Inválido', partially_refunded: 'Reembolso parcial', pending_cancel: 'Cancelando' };
const ML_PAID = ['paid', 'confirmed', 'partially_refunded'];

async function loadMl() {
  try {
    const r = await fetch('data/mercadolibre.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return false;
    ML.data = await r.json();
    if (ML.data) { ML.data.orders = asList(ML.data.orders).map(o => ({ ...o, items: asList(o.items) })); ML.data.items = asList(ML.data.items); if (ML.data.ads) ML.data.ads.campaigns = asList(ML.data.ads.campaigns).map(c => ({ ...c, daily: asList(c.daily) })); }
  } catch (e) { return false; }
  CONN.mercadolibre = !!(ML.data && (ML.data.ok || ML.data.stale));
  return true;
}

function mlBar() {
  const d = ML.data; let txt, tone;
  if (!d || !d.configured) { txt = 'Sin conectar · falta crear la app y autorizar con la cuenta dueña (ver guía)'; tone = 'var(--faint)'; }
  else if (d.ok) { txt = `Conectado · ${esc(d.seller?.nickname || '')} · ${fmtInt(d.orders.length)} pedidos en ${d.days} días · actualizado ${timeAgo(d.at)}`; tone = 'var(--ok)'; }
  else { txt = `Error: ${esc(d.error || 'sin detalle')}${d.stale ? ` · se muestran los datos de ${timeAgo(d.at)}` : ''}`; tone = 'var(--danger)'; }
  return `<div class="card ads-bar" style="margin-bottom:14px;padding:12px 16px">
    <div class="row wrap" style="gap:12px;align-items:center">
      <div class="row" style="gap:10px;min-width:0;flex:1"><span style="width:9px;height:9px;border-radius:50%;background:${tone};box-shadow:0 0 8px ${tone};flex:none"></span><b style="color:${ML.c};flex:none">Mercado Libre</b><span class="sm muted" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${txt}">${txt}</span></div>
      <div class="row" style="gap:8px;flex:none">
        ${d && d.updated_at ? `<span class="xs muted">Datos ${timeAgo(d.updated_at)}</span>` : ''}
        <button class="btn sm" id="ml-refresh" title="Vuelve a consultar Mercado Libre (y las demás fuentes)">${ICON.zap(13)} Actualizar ahora</button>
        <a class="btn sm" href="docs/07-mercado-libre.md" target="_blank" rel="noopener">Guía de conexión</a>
        <a class="btn sm ghost" href="${d && d.seller && d.seller.url ? esc(d.seller.url) : 'https://www.mercadolibre.cl/'}" target="_blank" rel="noopener">Tienda ${ICON.arrow(11)}</a>
        <a class="btn sm ghost" href="/api/ads/log" target="_blank" rel="noopener">Registro</a>
      </div>
    </div>
  </div>`;
}

function campanasMercadoLibre() {
  CP.mperiod = CP.mperiod || '30';
  const d = ML.data; const has = !!(d && (d.ok || d.stale) && d.orders);
  const range = waRange(CP.mperiod); const days = waDaysBetween(range); const [from, to] = range;
  const orders = has ? d.orders.filter(o => o.date.slice(0, 10) >= from && o.date.slice(0, 10) <= to) : [];
  const paid = orders.filter(o => ML_PAID.includes(o.status)), cancelled = orders.filter(o => o.status === 'cancelled');
  const sold = paid.reduce((a, o) => a + Number(o.total || 0), 0), units = paid.reduce((a, o) => a + Number(o.units || 0), 0);
  const byDay = days.map(day => { const os = paid.filter(o => o.date.startsWith(day)); return { date: day, v: os.reduce((a, o) => a + Number(o.total || 0), 0), n: os.length }; });
  const prodSales = groupSum(paid.flatMap(o => o.items.map(i => ({ id: i.id, title: i.title, qty: i.qty, total: i.total }))), r => r.id, ['qty', 'total']).map(o => ({ id: o.key, name: o.row.title, v: o.qty, total: o.total })).sort((a, b) => b.v - a.v || b.total - a.total);
  const items = has ? d.items : []; const active = items.filter(i => i.status === 'active');
  const soldIds = new Set(prodSales.map(p => p.id));
  const noSales = active.filter(i => !soldIds.has(i.id)).sort((a, b) => (b.visits || 0) - (a.visits || 0));
  const lowStock = active.filter(i => i.stock <= 2).sort((a, b) => a.stock - b.stock);
  const ads = has && d.ads && d.ads.ok ? d.ads : null;
  const camps = ads ? ads.campaigns : []; const campsOn = camps.filter(c => c.status === 'active');
  const adsFrom = ads ? ads.from : from;
  // Gasto de Product Ads en el período: por día si vino el detalle; si no, el total del tramo de 90 días
  const hasDaily = camps.some(c => c.daily.length);
  const adsCost = hasDaily ? camps.reduce((a, c) => a + c.daily.filter(r => r.date >= from && r.date <= to).reduce((s, r) => s + Number(r.cost || 0), 0), 0) : camps.reduce((a, c) => a + Number(c.cost || 0), 0);
  const adsAmount = hasDaily ? camps.reduce((a, c) => a + c.daily.filter(r => r.date >= from && r.date <= to).reduce((s, r) => s + Number(r.amount || 0), 0), 0) : camps.reduce((a, c) => a + Number(c.amount || 0), 0);
  const adsDaily = days.map(day => ({ date: day, v: camps.reduce((a, c) => a + c.daily.filter(r => r.date === day).reduce((s, r) => s + Number(r.cost || 0), 0), 0) }));
  const acos = adsAmount ? adsCost / adsAmount : null;
  const recientes = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  const title = `<div class="page-head"><div><h1>Mercado Libre</h1><p>Ventas por día, qué se vende más y menos, publicaciones y lo que gastan las campañas de Product Ads.</p></div><div class="actions"><button class="btn" data-print="Campañas · Mercado Libre">${ICON.pdf(14)} Informe PDF</button></div></div>`;
  const periodo = `<div class="row wrap no-print" style="margin:0 4px 14px;gap:10px"><span class="xs muted b" style="letter-spacing:.07em;text-transform:uppercase">Período</span><div class="seg">${[['7', '7 días'], ['30', '30 días'], ['mes', 'Este mes'], ['90', '90 días']].map(([k, l]) => `<button class="${CP.mperiod === k ? 'on' : ''}" data-mperiod="${k}">${l}</button>`).join('')}</div><span class="spacer"></span><span class="sm muted">${has ? `datos desde ${fmtDate(d.since)}` : ''}</span></div>`;

  if (!has) {
    return `${title}${cpTabs('mercadolibre')}${mlBar()}${periodo}
    <div class="grid g4" style="margin-bottom:14px">${kpi('Vendido', '—', 'pendiente de conexión')}${kpi('Pedidos', '—', 'pendiente de conexión')}${kpi('Publicaciones activas', '—', 'pendiente de conexión')}${kpi('Gasto Product Ads', '—', 'pendiente de conexión')}</div>
    <div class="card" style="border-left:3px solid var(--warn)">${cardHead(ICON.alert(15), 'Falta conectar Mercado Libre', 'Lo hace la cuenta dueña de la tienda, una sola vez', '', 'var(--warn)')}
      <ol class="sm" style="margin:0;padding-left:20px;line-height:1.8"><li>Con la cuenta <b>dueña</b> de Mercado Libre (no un colaborador), crear una aplicación en developers.mercadolibre.cl con URI de redirect <b>http://127.0.0.1:8793/</b>.</li><li>Pegar el App ID y la Clave secreta en <b>credenciales.json</b> → bloque <b>mercadolibre</b>.</li><li>Doble clic en <b>Autorizar Mercado Libre.bat</b> y aceptar con la cuenta dueña.</li><li>Pulsar <b>Actualizar ahora</b>.</li></ol>
      ${d && d.error ? `<div class="xs muted" style="margin-top:10px">Último intento: ${esc(d.error)}</div>` : ''}
      <div class="sm" style="margin-top:10px"><a class="btn sm" href="docs/07-mercado-libre.md" target="_blank" rel="noopener">Ver la guía paso a paso</a></div></div>`;
  }

  return `${title}${cpTabs('mercadolibre')}${mlBar()}${periodo}
  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Vendido', fmtShort(sold), `${fmtInt(paid.length)} pedidos pagados · ${fmtInt(units)} unidades${cancelled.length ? ` · ${cancelled.length} cancelados` : ''}`)}
    ${kpi('Por día', fmtShort(days.length ? sold / days.length : 0), `promedio en ${days.length} días · ticket ${paid.length ? fmtMoney(sold / paid.length) : '—'}`)}
    ${kpi('Publicaciones', `${fmtInt(d.counts.active)} <span class="sm muted">activas</span>`, `${fmtInt(d.counts.paused)} pausadas · ${fmtInt(d.counts.closed)} finalizadas · ${fmtInt(lowStock.length)} con stock de 2 o menos`)}
    ${kpi('Product Ads', ads ? fmtShort(adsCost) : '—', ads ? `${fmtInt(campsOn.length)} de ${fmtInt(camps.length)} campañas activas · ${hasDaily ? 'en el período' : `desde ${fmtDate(adsFrom)}`}${acos != null ? ` · ACOS ${Math.round(acos * 100)}%` : ''}` : (d.ads && d.ads.error ? `sin acceso: ${esc(d.ads.error).slice(0, 60)}` : 'sin datos'))}
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.trend(15), 'Ventas por día', `${fmtShort(sold)} en el período · pedidos pagados`, '', ML.c)}
      ${stockChart(byDay, { color: ML.c, height: 180, fmt: fmtShort, label: 'vendido por día' })}
    </div>
    <div class="card">${cardHead(ICON.mega(15), 'Gasto de Product Ads por día', ads ? `${fmtShort(adsCost)} gastados · ${fmtShort(adsAmount)} vendidos con anuncios` : 'Sin acceso a Product Ads', '', 'var(--app-campanas)')}
      ${ads && hasDaily ? stockChart(adsDaily, { color: 'var(--app-campanas)', height: 180, fmt: fmtShort, label: 'gasto por día' }) : `<div class="xs muted" style="padding:40px 0;text-align:center">${ads ? 'Mercado Libre no entregó el detalle por día; se muestran los totales del tramo.' : (d.ads && d.ads.error ? esc(d.ads.error) : 'La cuenta no tiene Product Ads')}</div>`}
    </div>
  </div>
  <div class="grid g3" style="margin-bottom:14px">
    <div class="card">${cardHead(ICON.shirt(15), 'Lo que más se vende', 'Unidades pagadas en el período', '', ML.c)}
      ${rankList(prodSales.map(p => ({ name: p.name, v: p.v, title: `${fmtMoney(p.total)} · ${p.id}` })), { color: ML.c, max: 10, sub: r => r.title.split(' · ')[0] })}
    </div>
    <div class="card">${cardHead(ICON.eye(15), 'Publicadas que no venden', `${fmtInt(noSales.length)} activas sin ventas en el período · ordenadas por visitas`, '', 'var(--danger)')}
      ${noSales.length ? noSales.slice(0, 10).map(i => `<div class="row sm" style="gap:8px;margin-bottom:8px"><a href="${esc(i.url)}" target="_blank" rel="noopener" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${esc(i.title)}">${esc(i.title)}</a><span class="xs muted" style="white-space:nowrap">${fmtInt(i.visits || 0)} visitas · stock ${fmtInt(i.stock)}</span><b>${fmtShort(i.price)}</b></div>`).join('') : empty('Todas las activas vendieron algo')}
      <div class="xs muted" style="margin-top:4px">Muchas visitas y cero ventas suele ser precio, fotos o envío.</div>
    </div>
    <div class="card">${cardHead(ICON.box(15), 'Stock bajo', 'Activas con 2 unidades o menos', '', 'var(--warn)')}
      ${lowStock.length ? lowStock.slice(0, 10).map(i => `<div class="row sm" style="gap:8px;margin-bottom:8px"><a href="${esc(i.url)}" target="_blank" rel="noopener" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${esc(i.title)}">${esc(i.title)}</a>${chip(`${i.stock} en stock`, i.stock === 0 ? 'var(--danger)' : 'var(--warn)')}</div>`).join('') : empty('Sin publicaciones con stock bajo')}
    </div>
  </div>
  <div class="grid" style="grid-template-columns:1.3fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.mega(15), 'Campañas de Product Ads', ads ? `${fmtInt(camps.length)} campañas · gasto desde ${fmtDate(adsFrom)}` : 'Sin acceso', '', 'var(--app-campanas)')}
      ${camps.length ? `<table class="table"><thead><tr><th>Campaña</th><th>Estado</th><th class="r">Presup./día</th><th class="r">Gasto</th><th class="r">Clics</th><th class="r">Vendido</th><th class="r">ACOS</th></tr></thead><tbody>${[...camps].sort((a, b) => (b.status === 'active') - (a.status === 'active') || b.cost - a.cost).map(c => `<tr><td class="b" style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</td><td>${chip(c.status === 'active' ? 'Activa' : c.status === 'paused' ? 'Pausada' : esc(c.status), c.status === 'active' ? 'var(--ok)' : 'var(--faint)')}</td><td class="r">${c.budget ? fmtShort(c.budget) : '—'}</td><td class="r b">${fmtShort(c.cost)}</td><td class="r">${fmtInt(c.clicks)}</td><td class="r">${fmtShort(c.amount)}</td><td class="r">${c.amount ? Math.round(c.cost / c.amount * 100) + '%' : '—'}</td></tr>`).join('')}</tbody></table>` : empty(ads ? 'Sin campañas de Product Ads' : 'Sin acceso a Product Ads', ads ? '' : (d.ads && d.ads.error ? esc(d.ads.error) : ''))}
      <div class="xs muted" style="margin-top:6px">ACOS = gasto en anuncios ÷ ventas atribuidas. Más bajo es mejor; sobre 100% la campaña gasta más de lo que vende.</div>
    </div>
    <div class="card">${cardHead(ICON.doc(15), 'Últimos pedidos', 'En el período', '', ML.c)}
      ${recientes.length ? `<table class="table"><thead><tr><th>Pedido</th><th>Estado</th><th>Productos</th><th class="r">Monto</th></tr></thead><tbody>${recientes.map(o => `<tr><td class="sm"><b>#${esc(String(o.id).slice(-8))}</b><div class="xs muted">${fmtDate(o.date.slice(0, 10))}</div></td><td>${chip(ML_STATUS_ES[o.status] || esc(o.status), ML_PAID.includes(o.status) ? 'var(--ok)' : o.status === 'cancelled' ? 'var(--danger)' : 'var(--warn)')}</td><td class="sm muted" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(o.items.map(i => `${i.qty}× ${i.title}`).join(', '))}">${esc(o.items.map(i => `${i.qty}× ${i.title}`).join(', '))}</td><td class="r b">${fmtShort(o.total)}</td></tr>`).join('')}</tbody></table>` : empty('Sin pedidos en el período')}
    </div>
  </div>`;
}

async function mlRefresh(btn) { return adsRefresh(btn); }

function bindMercadoLibre(el) {
  $$('[data-mperiod]', el).forEach(b => b.onclick = () => { CP.mperiod = b.dataset.mperiod; cpSave(); render(); });
  const rf = $('#ml-refresh', el); if (rf) rf.onclick = () => mlRefresh(rf);
}

window.addEventListener('load', () => { loadMl().then(ok => { if (ok && typeof render === 'function' && location.hash.includes('campanas/mercadolibre')) render(); }); });
