// ============================================================
// Datos reales de Meta Ads y Google Ads.
// El conector (k8-panel/conectores/actualizar-ads.ps1) deja los datos en
// k8-panel/data/ads.json. Aquí se leen, se marcan las fuentes como
// conectadas (CONN) y se vuelcan en la lista de campañas del panel:
// las campañas de las plataformas se crean/actualizan solas y lo que
// el equipo anota a mano (zona, tipo, notas) se conserva.
// ============================================================
'use strict';

const ADS = { data: null, loading: false };

// Clave ASCII de una región ("La Araucanía" → "laaraucania") para cruzar con lo que manda el conector.
const regionKeyOf = r => String(r || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
// El conector (PowerShell) entrega una lista de un solo elemento como objeto suelto: aqui se vuelve lista siempre.
const asList = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
const regionsFromKeys = keys => asList(keys).map(k => REGIONS.find(r => regionKeyOf(r).includes(k))).filter(Boolean);

// Métrica de una campaña dentro de un rango de fechas. Si la campaña trae detalle diario
// (viene de la plataforma) se suma solo lo del rango; si no, se usa el total anotado.
function adsIn(c, key, range) {
  if (!c) return 0;
  if (c.auto && range && key !== 'reach' && key !== 'impressions_total') {
    const [a, b] = range;
    // Si el rango abarca todo el detalle diario que tenemos (p. ej. «Todo»), vale el total histórico de la plataforma.
    if (c.dailyFrom && a <= c.dailyFrom && b >= todayIso()) return Number(c[key] || 0);
    let s = 0;
    for (const d of c.daily || []) if (d.date >= a && d.date <= b) s += Number(d[key] || 0);
    return s;
  }
  return Number(c[key] || 0);
}
// Resultado principal de la campaña según su objetivo (mensajes, leads, clics en el enlace, compras…).
function adsResult(c, range) {
  if (c && c.auto && c.resultKey) {
    const k = { link_clicks: 'linkClicks', post_engagement: 'postEngagement' }[c.resultKey] || c.resultKey;
    return { n: adsIn(c, k, range), label: c.resultLabel || 'resultados', key: c.resultKey };
  }
  return { n: adsIn(c, 'messages', range), label: 'msj', key: 'messages' };
}
const resultTxt = (c, range) => { const r = adsResult(c, range); return r.n ? `${fmtInt(r.n)} ${r.label}` : ''; };

async function loadAds() {
  try {
    const r = await fetch('data/ads.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return false;
    ADS.data = await r.json();
  } catch (e) { return false; }
  applyAds();
  return true;
}

function applyAds() {
  const d = ADS.data; if (!d) return;
  const src = d.sources || {};
  CONN.meta = !!(src.meta && src.meta.ok);
  CONN.google = !!(src.google && src.google.ok);
  let list = Store.list('campaigns'); let changed = false;
  const dataAt = String(d.updated_at || '').slice(0, 10);
  // Con alguna plataforma conectada, las campañas de ejemplo (semilla c1…c6) sobran: se quitan y sus ventas de ejemplo quedan sin campaña.
  const seedIds = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const sobra = c => seedIds.includes(c.id) && !c.auto && (CONN.meta || CONN.google);
  if (list.some(sobra)) {
    const gone = new Set(list.filter(sobra).map(c => c.id));
    list = list.filter(c => !gone.has(c.id)); changed = true;
    const sales = Store.list('sales'); if (sales.some(s => gone.has(s.campaign))) Store.write('sales', sales.map(s => gone.has(s.campaign) ? { ...s, campaign: '' } : s));
  }
  for (const x of d.campaigns || []) {
    let c = list.find(k => k.ext === x.id);
    const regs = regionsFromKeys(x.regions);
    if (!c) {
      c = { id: uid(), ext: x.id, name: x.name, type: x.type || 'otro', platform: x.platform, regions: regs.length ? regs : [...REGIONS], start: x.start || todayIso(), end: x.end || '', state: x.state || 'off', budget: 0, spent: 0, impressions: 0, reach: 0, messages: 0, notes: '', auto: true };
      list.push(c);
    }
    Object.assign(c, {
      name: x.name, platform: x.platform, start: x.start || c.start, end: x.end || '', state: x.state || 'off', archived: !!x.archived,
      budget: x.budget || 0, spent: x.spent || 0, impressions: x.impressions || 0, reach: x.reach || 0, clicks: x.clicks || 0,
      messages: x.messages || 0, leads: x.leads || 0, purchases: x.purchases || 0, dataAt, dailyFrom: x.daily_from || '',
      linkClicks: x.link_clicks || 0, postEngagement: x.post_engagement || 0, results: x.results || 0, resultKey: x.result_key || '', resultLabel: x.result_label || '',
      daily: asList(x.daily).map(d => ({ ...d, linkClicks: d.link_clicks || 0, postEngagement: d.post_engagement || 0 })),
      auto: true, objective: x.objective || '', goal: x.goal || '', url: x.url || '', typeAuto: x.type || 'otro', regionsAuto: regs,
    });
    if (!c.typeManual) c.type = x.type || c.type;
    if (!c.regionsManual && regs.length) c.regions = regs;
    changed = true;
  }
  if (changed) Store.write('campaigns', list);
}

// ---------- Barra de estado de las fuentes (app Campañas) ----------
const timeAgo = iso => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'recién'; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 36) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
};
function adsBar() {
  const d = ADS.data; const src = (d && d.sources) || {};
  const row = p => {
    const s = src[p.id];
    let txt, tone;
    if (!s || !s.configured) { txt = 'Sin conectar · los resultados se anotan a mano en cada campaña'; tone = 'var(--faint)'; }
    else if (s.ok) { txt = `Conectado · ${s.count} campañas · ${esc(s.account || '')} · actualizado ${timeAgo(s.at)}`; tone = 'var(--ok)'; }
    else { txt = `Error: ${esc(s.error || 'sin detalle')}${s.stale ? ` · se muestran los datos de ${timeAgo(s.at)}` : ''}`; tone = 'var(--danger)'; }
    return `<div class="row" style="gap:10px;min-width:0"><span style="width:9px;height:9px;border-radius:50%;background:${tone};box-shadow:0 0 8px ${tone};flex:none"></span><b style="color:${p.c};flex:none">${p.name}</b><span class="sm muted" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${txt.replace(/<[^>]+>/g, '')}">${txt}</span></div>`;
  };
  const any = Object.values(src).some(s => s && s.configured);
  return `<div class="card ads-bar" style="margin-bottom:14px;padding:12px 16px">
    <div class="row wrap" style="gap:12px;align-items:center">
      <div style="flex:1;min-width:260px;display:grid;gap:6px">${PLATFORMS.map(row).join('')}</div>
      <div class="row" style="gap:8px;flex:none">
        ${d && d.updated_at ? `<span class="xs muted">Datos ${timeAgo(d.updated_at)}</span>` : ''}
        <button class="btn sm" id="ads-refresh" title="Vuelve a consultar Meta Ads y Google Ads">${ICON.zap(13)} ${any ? 'Actualizar ahora' : 'Probar conexión'}</button>
        <a class="btn sm" href="docs/04-conectar-meta-y-google-ads.md" target="_blank" rel="noopener" title="Cómo obtener las credenciales">Guía de conexión</a>
        <a class="btn sm ghost" href="/api/ads/log" target="_blank" rel="noopener" title="Registro del último intento">Registro</a>
      </div>
    </div>
  </div>`;
}

async function adsRefresh(btn) {
  if (ADS.loading) return;
  ADS.loading = true; const prev = (ADS.data && ADS.data.updated_at) || '';
  const label = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.innerHTML = 'Consultando…'; }
  try {
    const r = await fetch('/api/ads/actualizar', { cache: 'no-store' });
    if (!r.ok) throw new Error('El servidor del panel no respondió');
  } catch (e) {
    ADS.loading = false; if (btn) { btn.disabled = false; btn.innerHTML = label; }
    return toast('No se pudo pedir la actualización. Abre el panel con "Abrir Panel K8.bat" o ejecuta "Actualizar campanas.bat".', true);
  }
  const t0 = Date.now();
  const poll = async () => {
    await loadAds();
    for (const f of ['loadWeb', 'loadWa', 'loadMl']) if (typeof window[f] === 'function') { try { await window[f](); } catch (e) { } }
    const now = (ADS.data && ADS.data.updated_at) || '';
    if (now && now !== prev) {
      ADS.loading = false;
      const src = ADS.data.sources || {}; const bad = Object.entries(src).filter(([, s]) => s.configured && !s.ok);
      toast(bad.length ? `Actualizado con errores en ${bad.map(([k]) => k === 'meta' ? 'Meta Ads' : 'Google Ads').join(' y ')}` : 'Campañas actualizadas', bad.length > 0);
      return render();
    }
    if (Date.now() - t0 > 180000) { ADS.loading = false; if (btn) { btn.disabled = false; btn.innerHTML = label; } return toast('La actualización está tardando. Revisa el Registro.', true); }
    setTimeout(poll, 4000);
  };
  setTimeout(poll, 4000);
}

window.addEventListener('load', () => { loadAds().then(ok => { if (ok && typeof render === 'function') render(); }); });
