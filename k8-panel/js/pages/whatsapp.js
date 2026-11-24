// ============================================================
// Campañas › WhatsApp: el WhatsApp de ventas (WhatsApp Business) en el
// panel. Los datos los deja el captador que corre dentro de WhatsApp Web
// (js/wa-captura.js, lo manda conectores/whatsapp.user.js cada hora al
// servidor) acumulados en data/whatsapp.json: chats, etiquetas, actividad
// por día, textos recibidos y tiempos de respuesta (hasta 90 días de
// historia por chat).
// ============================================================
'use strict';

const WA = { data: null, ventas: null, c: '#25D366' };
// Etiquetas que cuentan como venta cerrada (igual que en el captador): En Gestión, Compró, Vendido, Pagado…
const WA_VENTA_RE = /gesti[oó]n|compr[oó]|vendid|venta|pagad|pag[oó]/i;
const waVendio = c => (c.labels || []).some(l => WA_VENTA_RE.test(l));
// Monto de un comprobante: el corregido a mano manda sobre el leído
const waMonto = x => x.manual != null ? Number(x.manual) : Number(x.amount || 0);
const WA_LABEL_COLORS = ['#FF9485', '#64C4FF', '#FFD429', '#DFAEF0', '#99B6C1', '#9BB4FF', '#FF9BEF', '#8FDFFF', '#B6F9A1', '#8ED9D0', '#F7C0A5', '#FFC7F3', '#D0D4A9', '#A0D6FF', '#B2B2B2', '#F58C8C', '#FFD4A1', '#BDB6FF', '#8AD8A4', '#C4A484'];
// Etiquetas de sistema de WhatsApp que no son de K8
const WA_SYS_LABELS = ['No leídos', 'Favoritos', 'Grupos', 'Canales'];
// Temas que se buscan en los textos recibidos (qué piden / qué cotizan)
const WA_TEMAS = [
  ['Polerones', /polero/i], ['Parkas', /parka/i], ['Poleras', /polera|piqu[eé]|\bpolo\b/i], ['Pantalones', /pantal[oó]n|\bcargo\b|jeans?/i], ['Chalecos', /chaleco|geotech/i],
  ['Chaquetas', /chaqueta|softshell|cortaviento|casaca/i], ['Polar', /\bpolar/i], ['Camisas', /camisa|blusa/i], ['Overoles · buzos', /overol|buzo/i], ['Gorros', /gorro|jockey|beanie/i],
  ['Calzado', /zapat|bot[ií]n|calzado/i], ['Telas', /\btela|gabardina|spandex|tejido|\brollo|metro[s]? de|poli ?lona|drill|algod[oó]n|poli[eé]ster/i], ['Bordado · logo', /bordad|estampad|\blogo|serigraf|sublim|personaliz|marcad/i],
  ['Uniformes', /uniforme/i], ['Clínica', /cl[ií]nic|salud|enfermer|scrub|dental|ambo/i], ['Corporativo', /corporativ|ejecutiv|oficina|institucional/i], ['Trabajo · seguridad', /ropa de trabajo|seguridad|reflectante|\bepp\b|contratista|faena|obra/i],
  ['Cotización · precio', /cotiz|precio|valor|cu[aá]nto (sale|cuesta|vale|es)|presupuesto/i], ['Ofertas · promociones', /oferta|promo|descuento|liquidaci|rebaja|pack/i], ['Tallas', /\btalla/i], ['Catálogo', /cat[aá]logo|catalogo|lista de precios/i],
  ['Stock · despacho', /stock|disponib|despacho|env[ií]o|entrega|retiro|demora|plazo/i], ['Muestras', /muestra/i], ['Licitación', /licitaci|mercado p[uú]blico|compra [aá]gil/i], ['Showroom · visita', /showroom|visitar|direcci[oó]n|d[oó]nde est[aá]n|horario|tienda/i],
  ['Cantidad · por mayor', /\d+\s*(unidades|und|uds|u\b|piezas)|por mayor|mayorista|cantidad/i], ['Pago · factura', /factura|transferencia|pago|boleta|orden de compra|\boc\b/i],
];
// Chats internos (equipo K8, bot de Meta): no cuentan como clientes
const WA_INTERNO_RE = /k8 chile|k8chile|tienda k8|panel k8|asistente para empresas|^k8\b|\bk8$|\(t[uú]\)/i;
const waInterno = c => WA_INTERNO_RE.test(c.name || '') || c.id === (WA.data && WA.data.me ? WA.data.me + '@c.us' : '');

async function loadWa() {
  try {
    const r = await fetch('data/whatsapp.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return false;
    WA.data = await r.json();
    try { const v = await fetch('data/wa-ventas.json?ts=' + Date.now(), { cache: 'no-store' }); WA.ventas = v.ok ? await v.json() : null; if (WA.ventas) { WA.ventas.items = asList(WA.ventas.items); for (const x of WA.ventas.items) x.labels = asList(x.labels); } } catch (e) { WA.ventas = null; }
    if (WA.data) { WA.data.chats = asList(WA.data.chats); WA.data.labels = asList(WA.data.labels); for (const c of WA.data.chats) { c.labels = asList(c.labels); c.texts = asList(c.texts); c.resp_k8 = asList(c.resp_k8); c.resp_cli = asList(c.resp_cli); } }
  } catch (e) { return false; }
  CONN.whatsapp = !!(WA.data && WA.data.chats && WA.data.chats.length);
  return true;
}

const waAgo = t => t ? timeAgo(new Date(t * 1000).toISOString()) : '';
const waLabelColor = name => { const l = (WA.data && WA.data.labels || []).find(x => x.name === name); return WA_LABEL_COLORS[(l ? l.color : 14) % WA_LABEL_COLORS.length]; };
const waLabelChips = ls => (ls || []).filter(l => !WA_SYS_LABELS.includes(l)).map(l => chip(esc(l), waLabelColor(l))).join(' ');
// Tipo de cliente: solo por las etiquetas de WhatsApp (Empresas / Persona Natural). Lo demás queda "sin etiquetar".
function waTipo(c) {
  const ls = c.labels || [];
  if (ls.includes('Empresas')) return { k: 'empresa', txt: 'Empresa' };
  if (ls.includes('Persona Natural')) return { k: 'persona', txt: 'Persona natural' };
  return { k: 'sin', txt: 'Sin etiquetar' };
}
const waTipoChip = c => { const t = waTipo(c); return t.k === 'empresa' ? chip('Empresa', 'var(--app-marketing)') : t.k === 'persona' ? chip('Persona', 'var(--app-productos)') : ''; };
// Duración legible: "35 s", "12 min", "2 h 10 min", "3 d"
const fmtResp = s => { s = Math.round(Number(s || 0)); if (!s) return '—'; if (s < 60) return `${s} s`; if (s < 3600) return `${Math.round(s / 60)} min`; if (s < 86400) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? `${h} h ${m} min` : `${h} h`; } return `${(s / 86400).toLocaleString('es-CL', { maximumFractionDigits: 1 })} d`; };
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const dayOf = t => { const d = new Date(t * 1000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

function waRange(key) {
  const t = parseDay(todayIso()); const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (key === '7') return [iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6)), todayIso()];
  if (key === 'mes') return [iso(new Date(t.getFullYear(), t.getMonth(), 1)), todayIso()];
  if (key === '90') return [iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 89)), todayIso()];
  return [iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29)), todayIso()];
}
const waDaysBetween = ([a, b]) => { const out = []; let d = parseDay(a); const end = parseDay(b); while (d <= end) { out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); } return out; };

function waBar() {
  const d = WA.data; let txt, tone;
  if (!d || !d.chats || !d.chats.length) { txt = 'Sin datos · instala el script de Tampermonkey o carga una captura (ver guía)'; tone = 'var(--faint)'; }
  else { const h = (Date.now() - new Date(d.captured_at).getTime()) / 36e5; txt = `${fmtInt(d.chats.length)} chats · ${d.captures} ${d.captures === 1 ? 'captura' : 'capturas'} · última ${timeAgo(d.captured_at)}${h > 26 ? ' · lleva más de un día sin actualizarse: ¿está abierto WhatsApp Web con el script?' : ''}`; tone = h > 26 ? 'var(--warn)' : 'var(--ok)'; }
  return `<div class="card ads-bar" style="margin-bottom:14px;padding:12px 16px">
    <div class="row wrap" style="gap:12px;align-items:center">
      <div class="row" style="gap:10px;min-width:0;flex:1"><span style="width:9px;height:9px;border-radius:50%;background:${tone};box-shadow:0 0 8px ${tone};flex:none"></span><b style="color:${WA.c};flex:none">WhatsApp Business</b><span class="sm muted" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${txt}">${txt}</span></div>
      <div class="row" style="gap:8px;flex:none">
        <a class="btn sm" href="https://web.whatsapp.com/" target="_blank" rel="noopener">Abrir WhatsApp Web ${ICON.arrow(11)}</a>
        <a class="btn sm" href="docs/06-whatsapp.md" target="_blank" rel="noopener" title="Cómo se actualiza">Guía</a>
        <a class="btn sm ghost" href="/api/ads/log" target="_blank" rel="noopener">Registro</a>
      </div>
    </div>
  </div>`;
}

function campanasWhatsapp() {
  CP.wperiod = CP.wperiod || '30';
  const d = WA.data; const has = !!(d && d.chats && d.chats.length);
  const range = waRange(CP.wperiod); const days = waDaysBetween(range); const [from, to] = range; const hoy = todayIso();
  const hist = (d && d.history) || {};
  const H = k => days.map(day => ({ date: day, v: Number((hist[day] || {})[k] || 0) }));
  const chats = has ? d.chats.filter(c => !c.group && !waInterno(c)) : [];
  const internos = has ? d.chats.filter(c => !c.group && waInterno(c)).length : 0;
  const daysOf = c => Object.entries(c.days || {});
  const inRange = c => daysOf(c).some(([day]) => day >= from && day <= to);
  const wroteIn = c => daysOf(c).some(([day, v]) => day >= from && day <= to && Number(v.in || 0) > 0);
  const active = chats.filter(inRange), wrote = chats.filter(wroteIn);
  const chatDaysIn = chats.reduce((a, c) => a + daysOf(c).filter(([day, v]) => day >= from && day <= to && Number(v.in || 0) > 0).length, 0);
  const hoyIn = chats.filter(c => c.days && c.days[hoy] && Number(c.days[hoy].in || 0) > 0).length;
  const nuevos = chats.filter(c => c.first_seen && c.first_seen >= from && c.first_seen <= to);
  // Retomados: escribieron en el período y antes llevaban 30+ días sin escribir (o nunca habían escrito en lo cargado)
  const retomados = chats.filter(c => {
    if (!wroteIn(c) || nuevos.includes(c)) return false;
    const inDays = daysOf(c).filter(([, v]) => Number(v.in || 0) > 0).map(([day]) => day).sort();
    const first = inDays.find(day => day >= from); const prev = inDays.filter(day => day < first).pop();
    return !prev ? (c.hist_complete && c.hist_from && dayOf(c.hist_from) < from) : daysBetween(prev, first) >= 30;
  });
  const unreadChats = chats.filter(c => Number(c.unread || 0) > 0 && !c.missing).sort((a, b) => b.t - a.t);
  const unreadMsgs = unreadChats.reduce((a, c) => a + Number(c.unread || 0), 0);
  // Etiquetas
  const labelNames = has ? d.labels.map(l => l.name).filter(n => !WA_SYS_LABELS.includes(n)) : [];
  const labelCount = labelNames.map(n => ({ name: n, v: chats.filter(c => (c.labels || []).includes(n)).length, nuevos: chats.filter(c => c.label_history && c.label_history[n] && c.label_history[n] >= from && c.label_history[n] <= to).length })).sort((a, b) => b.v - a.v);
  const funnel = ['Pendiente de Cotización', 'Cotización Enviada', 'En Gestión'].map(n => labelCount.find(l => l.name === n) || { name: n, v: 0, nuevos: 0 });
  const sinEtiqueta = chats.filter(c => !(c.labels || []).some(l => !WA_SYS_LABELS.includes(l))).length;
  // Empresa / persona natural: solo etiquetas
  const tipos = base => { const o = { empresa: 0, persona: 0, sin: 0 }; for (const c of base) o[waTipo(c).k]++; return o; };
  const tAct = tipos(active); const bizWa = active.filter(c => c.business && waTipo(c).k === 'sin').length;
  // Temas en los textos recibidos del período
  const textsIn = []; for (const c of chats) for (const x of (c.texts || [])) { const day = dayOf(x.t); if (day >= from && day <= to) textsIn.push({ c, t: x.t, s: x.s }); }
  const chatsConTexto = new Set(textsIn.map(x => x.c.id)).size;
  const temas = WA_TEMAS.map(([name, re]) => { const ids = new Set(textsIn.filter(x => re.test(x.s)).map(x => x.c.id)); return { name, v: ids.size }; }).filter(x => x.v).sort((a, b) => b.v - a.v);
  // Tiempos de respuesta en el período
  const rK8 = [], rCli = [];
  for (const c of chats) { for (const x of (c.resp_k8 || [])) { const day = dayOf(x.t); if (day >= from && day <= to) rK8.push(Number(x.s)); } for (const x of (c.resp_cli || [])) { const day = dayOf(x.t); if (day >= from && day <= to) rCli.push(Number(x.s)); } }
  const medK8 = median(rK8), avgK8 = rK8.length ? rK8.reduce((a, b) => a + b, 0) / rK8.length : null, medCli = median(rCli);
  const buckets = [['menos de 15 min', 900], ['15 min a 1 h', 3600], ['1 a 4 h', 14400], ['4 a 24 h', 86400], ['más de un día', Infinity]];
  let prevLim = 0; const dist = buckets.map(([l, lim]) => { const n = rK8.filter(s => s >= prevLim && s < lim).length; prevLim = lim; return { l, n }; });
  const within1h = rK8.length ? Math.round(rK8.filter(s => s < 3600).length / rK8.length * 100) : null;
  const esperando = chats.filter(c => c.waiting_since && !c.missing && c.waiting_since * 1000 > Date.now() - 7 * 86400000).sort((a, b) => a.waiting_since - b.waiting_since);
  const recientes = [...chats].filter(c => !c.missing).sort((a, b) => b.t - a.t).slice(0, 15);
  const ultimos = textsIn.sort((a, b) => b.t - a.t).slice(0, 8);
  const perDay = days.length ? chatDaysIn / days.length : 0;
  // Pendientes al empezar el día: clientes que escribieron y nadie les contestó, según cuándo escribieron
  const ayer = (() => { const x = parseDay(hoy); x.setDate(x.getDate() - 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; })();
  const espHoy = esperando.filter(c => dayOf(c.waiting_since) === hoy).length, espAyer = esperando.filter(c => dayOf(c.waiting_since) === ayer).length;
  const espAntes = esperando.length - espHoy - espAyer;
  // "Escribieron hoy" solo vale si ya hubo una captura hoy (si no, mostraría 0 aunque haya gente escribiendo)
  const capHoy = has && d.captured_at && dayOf(new Date(d.captured_at).getTime() / 1000) === hoy;
  const capHora = has && d.captured_at ? new Date(d.captured_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
  const ayerIn = chats.filter(c => c.days && c.days[ayer] && Number(c.days[ayer].in || 0) > 0).length;
  const msgsIn = H('in').reduce((a, r) => a + r.v, 0), msgsOut = H('out').reduce((a, r) => a + r.v, 0);
  const completos = chats.filter(c => c.hist_complete).length;
  const histDesde = chats.reduce((a, c) => (c.hist_from && (!a || c.hist_from < a)) ? c.hist_from : a, 0);
  // Ventas: chats con etiqueta de venta (En Gestión…) y los montos leídos de los comprobantes que mandó el cliente
  const vendidos = chats.filter(c => waVendio(c) && !c.missing);
  const vendidosNuevos = vendidos.filter(c => Object.entries(c.label_history || {}).some(([n, day]) => WA_VENTA_RE.test(n) && day >= from && day <= to));
  const compsAll = ((WA.ventas && WA.ventas.items) || []).filter(x => /^comprobante/.test(x.tipo || '') && x.tipo !== 'descartado');
  const comps = compsAll.filter(x => x.date >= from && x.date <= to).sort((a, b) => b.t - a.t);
  const vendido = comps.reduce((a, x) => a + waMonto(x), 0);
  const chatsConComp = new Set(comps.filter(x => waMonto(x) > 0).map(x => x.chat_id));
  const sinComp = vendidos.filter(c => !compsAll.some(x => x.chat_id === c.id && waMonto(x) > 0)).sort((a, b) => b.t - a.t);
  const porRevisar = comps.filter(x => !waMonto(x)).length;

  const title = `<div class="page-head"><div><h1>WhatsApp</h1><p>El WhatsApp de ventas: cuántos escriben cada día, cuánto tardamos en responder, quiénes son, en qué etapa van y qué piden.</p></div><div class="actions"><button class="btn" data-print="Campañas · WhatsApp">${ICON.pdf(14)} Informe PDF</button></div></div>`;
  const periodo = `<div class="row wrap no-print" style="margin:0 4px 14px;gap:10px"><span class="xs muted b" style="letter-spacing:.07em;text-transform:uppercase">Período</span><div class="seg">${[['7', '7 días'], ['30', '30 días'], ['mes', 'Este mes'], ['90', '90 días']].map(([k, l]) => `<button class="${CP.wperiod === k ? 'on' : ''}" data-wperiod="${k}">${l}</button>`).join('')}</div><span class="spacer"></span><span class="sm muted">${has ? `${d.captures} ${d.captures === 1 ? 'captura' : 'capturas'} · historia cargada en ${fmtInt(completos)} de ${fmtInt(chats.length)} chats${histDesde ? ` · desde ${fmtDate(dayOf(histDesde))}` : ''}${internos ? ` · ${internos} chats del equipo K8 excluidos` : ''}` : ''}</span></div>`;

  if (!has) {
    return `${title}${cpTabs('whatsapp')}${waBar()}${periodo}
    <div class="grid g4" style="margin-bottom:14px">${kpi('Escribieron hoy', '—', 'pendiente de conexión')}${kpi('Chats nuevos', '—', 'pendiente de conexión')}${kpi('No leídos', '—', 'pendiente de conexión')}${kpi('Tiempo de respuesta', '—', 'pendiente de conexión')}</div>
    <div class="card" style="border-left:3px solid var(--warn)">${cardHead(ICON.alert(15), 'Falta conectar WhatsApp', 'Una sola vez, 3 minutos', '', 'var(--warn)')}
      <ol class="sm" style="margin:0;padding-left:20px;line-height:1.8"><li>Instalar la extensión <b>Tampermonkey</b> en el navegador donde se usa WhatsApp Web.</li><li>Abrir <b>http://localhost:8790/k8-panel/conectores/whatsapp.user.js</b> y pulsar Instalar.</li><li>Dejar abierto <b>web.whatsapp.com</b> con el WhatsApp de ventas: cada hora manda el resumen al panel.</li></ol>
      <div class="sm" style="margin-top:10px"><a class="btn sm" href="docs/06-whatsapp.md" target="_blank" rel="noopener">Ver la guía paso a paso</a></div></div>`;
  }

  return `${title}${cpTabs('whatsapp')}${waBar()}${periodo}
  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Por responder', fmtInt(esperando.length), esperando.length ? `clientes que escribieron y nadie les contestó · <b>${fmtInt(espHoy)}</b> de hoy · <b>${fmtInt(espAyer)}</b> de ayer · <b>${fmtInt(espAntes)}</b> de días anteriores (hasta 7 días) · el más antiguo ${waAgo(esperando[0].waiting_since)}` : 'nadie espera respuesta')}
    ${kpi('No leídos', fmtInt(unreadChats.length), `chats con mensajes sin leer · ${fmtInt(unreadMsgs)} mensajes`)}
    ${kpi('Escribieron hoy', capHoy ? fmtInt(hoyIn) : '—', capHoy ? `clientes con mensajes desde las 00:00 · datos de las ${capHora} · ayer escribieron ${fmtInt(ayerIn)} · promedio ${perDay.toLocaleString('es-CL', { maximumFractionDigits: 1 })} por día en el período` : `todavía no llega la captura de hoy (la última es de ${timeAgo(d.captured_at)}) · ayer escribieron ${fmtInt(ayerIn)} · abre WhatsApp Web para que se actualice`)}
    ${kpi('Chats nuevos', fmtInt(nuevos.length + retomados.length), `${fmtInt(nuevos.length)} nunca vistos${retomados.length ? ` · ${fmtInt(retomados.length)} que volvieron tras 30+ días sin escribir` : ''}${d.captures < 2 && !nuevos.length ? ' · los nunca vistos se cuentan desde la segunda captura' : ''}`)}
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Tiempo de respuesta de K8', fmtResp(medK8), rK8.length ? `típico (mediana) · promedio ${fmtResp(avgK8)} · ${within1h}% en menos de 1 h · ${fmtInt(rK8.length)} respuestas` : 'sin respuestas en el período')}
    ${kpi('Tiempo de respuesta del cliente', fmtResp(medCli), rCli.length ? `típico · lo que tarda el cliente en contestar a K8 · ${fmtInt(rCli.length)} casos` : 'sin datos')}
    ${kpi('Mensajes', `${fmtInt(msgsIn)} <span class="sm muted">recibidos</span>`, `${fmtInt(msgsOut)} enviados por K8 en el período`)}
    ${kpi('Empresas · personas', `${fmtInt(tAct.empresa)} <span class="sm muted">/</span> ${fmtInt(tAct.persona)}`, `según etiquetas · ${fmtInt(tAct.sin)} de ${fmtInt(active.length)} activos sin etiquetar`)}
  </div>
  <div class="card" style="margin-bottom:14px">${cardHead(ICON.money(15), 'Ventas por WhatsApp', 'Chats con etiqueta En Gestión (venta cerrada) y el monto leído del comprobante que mandó el cliente', '', WA.c)}
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi('Vendido', fmtMoney(vendido), `${fmtInt(comps.length)} ${comps.length === 1 ? 'comprobante' : 'comprobantes'} en el período${porRevisar ? ` · <span style="color:var(--warn)">${porRevisar} sin monto, revisar</span>` : ''}`)}
      ${kpi('Ventas cerradas', fmtInt(vendidos.length), `chats con etiqueta En Gestión hoy${vendidosNuevos.length ? ` · +${fmtInt(vendidosNuevos.length)} etiquetados en el período` : ''}`)}
      ${kpi('Ticket promedio', chatsConComp.size ? fmtMoney(vendido / chatsConComp.size) : '—', chatsConComp.size ? `por cliente con comprobante (${fmtInt(chatsConComp.size)})` : 'sin comprobantes leídos')}
      ${kpi('Sin comprobante', fmtInt(sinComp.length), sinComp.length ? 'ventas cerradas sin comprobante leído' : 'todas las ventas tienen comprobante')}
    </div>
    <div class="grid" style="grid-template-columns:1.6fr 1fr;gap:18px">
      <div>${comps.length ? `<table class="table"><thead><tr><th>Cliente</th><th>Fecha</th><th>Banco</th><th class="r">Monto</th><th></th></tr></thead><tbody>
        ${comps.slice(0, 20).map(x => { const m = waMonto(x); return `<tr><td><div class="b" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.name)}</div><div class="xs muted">${x.manual != null ? 'monto corregido a mano' : m ? `leído del comprobante (${esc(x.amount_src || 'OCR')})` : 'no se encontró el monto'}</div></td><td class="sm">${fmtDate(x.date)}</td><td class="sm muted">${esc(x.banco || '—')}</td><td class="r b" style="${m ? '' : 'color:var(--warn)'}">${m ? fmtMoney(m) : 'revisar'}</td><td class="r no-print" style="white-space:nowrap">${x.file ? `<a class="btn sm ghost" href="${esc(x.file)}" target="_blank" rel="noopener" title="Ver el comprobante">${ICON.eye(12)}</a>` : ''}<button class="btn sm ghost" data-wa-monto="${esc(x.id)}" data-wa-actual="${m}" title="Corregir el monto">${ICON.edit(12)}</button></td></tr>`; }).join('')}
        </tbody></table>${comps.length > 20 ? `<div class="xs muted">y ${comps.length - 20} más</div>` : ''}` : empty('Sin comprobantes leídos en el período')}
        <div class="xs muted" style="margin-top:6px">El script de WhatsApp manda las fotos y PDF que envía el cliente en los chats con etiqueta En Gestión. El panel lee el monto (lo que dice "Monto", "Total" o "Transferido"). Las fotos que no son comprobantes se descartan. Si un monto quedó mal, corrígelo con el lápiz.</div></div>
      <div>${cardHead(ICON.alert(15), 'Vendidas sin comprobante', 'Etiqueta En Gestión pero sin monto leído', '', 'var(--warn)')}
        ${sinComp.slice(0, 10).map(c => `<div class="row sm" style="gap:8px;margin-bottom:8px"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</b>${waTipoChip(c)}<span class="spacer"></span><span class="xs muted" style="white-space:nowrap">${waAgo(c.t)}</span></div>`).join('') || empty('Ninguna')}
        ${sinComp.length > 10 ? `<div class="xs muted">y ${sinComp.length - 10} más</div>` : ''}
        <div class="xs muted" style="margin-top:6px">El comprobante aparece cuando el cliente lo manda como foto o PDF y el script vuelve a pasar (cada hora).</div></div>
    </div>
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.msg(15), 'Clientes que escribieron por día', 'Chats con mensajes recibidos cada día', '', WA.c)}
      ${stockChart(H('active_in'), { color: WA.c, height: 170, label: 'chats que escribieron' })}
      <div class="row xs muted" style="gap:14px;margin-top:8px"><span>Contactados por K8 (mensajes enviados): <b>${fmtInt(H('active_out').reduce((a, r) => a + r.v, 0))}</b> chat-días</span></div>
    </div>
    <div class="card">${cardHead(ICON.clock(15), 'Cuánto tardamos en responder', 'Respuestas de K8 a mensajes de clientes, en el período', '', WA.c)}
      ${rK8.length ? dist.map(b => `<div style="margin-bottom:8px"><div class="row sm"><span>${b.l}</span><span class="spacer"></span><b>${fmtInt(b.n)}</b><span class="xs muted" style="width:36px;text-align:right">${pct(b.n, rK8.length)}%</span></div><div class="bar thin" style="--c:${WA.c};margin-top:3px"><i style="width:${pct(b.n, rK8.length)}%"></i></div></div>`).join('') : empty('Sin respuestas en el período')}
      <div class="xs muted" style="margin-top:6px">Se mide desde el primer mensaje del cliente sin contestar hasta la siguiente respuesta de K8, a cualquier hora (incluye noches y fines de semana).</div>
    </div>
  </div>
  <div class="grid g3" style="margin-bottom:14px">
    <div class="card">${cardHead(ICON.flag(15), 'Etapa de venta', 'Según las etiquetas de WhatsApp', '', WA.c)}
      ${funnel.map(f => `<div style="margin-bottom:10px"><div class="row sm"><span class="chip c" style="--c:${waLabelColor(f.name)}"><i></i>${esc(f.name)}</span><span class="spacer"></span><b>${fmtInt(f.v)}</b><span class="xs muted" style="width:90px;text-align:right">${f.nuevos ? `+${f.nuevos} en el período` : ''}</span></div><div class="bar thin" style="--c:${waLabelColor(f.name)};margin-top:4px"><i style="width:${f.v / Math.max(1, ...funnel.map(x => x.v)) * 100}%"></i></div></div>`).join('')}
      <div style="margin-top:12px">${cardHead(ICON.layers(15), 'Todas las etiquetas', '', '', WA.c)}${labelCount.filter(l => l.v).map(l => `<div class="row sm" style="margin-bottom:5px"><span class="chip c" style="--c:${waLabelColor(l.name)}"><i></i>${esc(l.name)}</span><span class="spacer"></span><b>${fmtInt(l.v)}</b></div>`).join('') || '<div class="xs muted">Ningún chat etiquetado todavía</div>'}
      <div class="xs muted" style="margin-top:4px">${fmtInt(sinEtiqueta)} chats sin etiqueta. <b>En Gestión</b> cuenta como venta cerrada.</div></div>
    </div>
    <div class="card">${cardHead(ICON.users(15), 'Empresa o persona natural', 'Por etiquetas de WhatsApp · chats activos en el período', '', WA.c)}
      ${[['Empresas', tAct.empresa, 'var(--app-marketing)'], ['Personas naturales', tAct.persona, 'var(--app-productos)'], ['Sin etiquetar', tAct.sin, 'var(--faint)']].map(([l, v, c]) => `<div style="margin-bottom:8px"><div class="row sm"><span>${l}</span><span class="spacer"></span><b>${fmtInt(v)}</b><span class="xs muted" style="width:36px;text-align:right">${pct(v, active.length)}%</span></div><div class="bar thin" style="--c:${c};margin-top:3px"><i style="width:${pct(v, active.length)}%"></i></div></div>`).join('')}
      <div class="xs muted" style="margin-top:6px">Se cuenta solo lo etiquetado en WhatsApp como <b>Empresas</b> o <b>Persona Natural</b>. Pista: ${fmtInt(bizWa)} de los sin etiquetar tienen cuenta de empresa en WhatsApp.</div>
    </div>
    <div class="card">${cardHead(ICON.search(15), 'Qué piden', `Temas en los mensajes recibidos · ${fmtInt(chatsConTexto)} chats con texto`, '', WA.c)}
      ${temas.length ? temas.slice(0, 12).map(t => `<div style="margin-bottom:7px"><div class="row sm"><span>${t.name}</span><span class="spacer"></span><b>${fmtInt(t.v)}</b><span class="xs muted" style="width:36px;text-align:right">${pct(t.v, chatsConTexto)}%</span></div><div class="bar thin" style="--c:${WA.c};margin-top:3px"><i style="width:${t.v / temas[0].v * 100}%"></i></div></div>`).join('') : empty('Sin textos en el período')}
      <div class="xs muted" style="margin-top:4px">Chats que mencionan cada tema (uno puede contar en varios). Fotos y audios no se leen.</div>
    </div>
  </div>
  <div class="grid" style="grid-template-columns:1.3fr 1fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.msg(15), 'Últimas conversaciones', 'Los 15 chats con movimiento más reciente', '', WA.c)}
      <table class="table"><thead><tr><th>Contacto</th><th>Tipo</th><th>Etiquetas</th><th>Último mensaje recibido</th><th class="r">Hace</th></tr></thead><tbody>
      ${recientes.map(c => `<tr><td><div class="b" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</div><div class="xs muted">${esc(c.phone ? '+' + c.phone : '')}${Number(c.unread || 0) ? ` · <span style="color:var(--ok)">${c.unread} sin leer</span>` : ''}</div></td><td>${waTipoChip(c) || '<span class="xs muted">—</span>'}</td><td><div class="row wrap" style="gap:4px">${waLabelChips(c.labels) || '<span class="xs muted">—</span>'}</div></td><td class="sm muted" style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(c.last_in_text)}">${esc(c.last_in_text || '—')}</td><td class="r xs muted" style="white-space:nowrap">${waAgo(c.t)}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card">${cardHead(ICON.bell(15), 'No leídos', 'Chats con mensajes sin leer', '', 'var(--ok)')}
      ${unreadChats.slice(0, 12).map(c => `<div class="row sm" style="gap:8px;margin-bottom:8px"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</b>${waTipoChip(c)}<span class="spacer"></span><span class="chip" style="flex:none">${c.unread}</span><span class="xs muted" style="white-space:nowrap">${waAgo(c.t)}</span></div>`).join('') || empty('Todo leído')}
      ${unreadChats.length > 12 ? `<div class="xs muted">y ${unreadChats.length - 12} más</div>` : ''}
      <div style="margin-top:12px">${cardHead(ICON.clock(15), 'Lo último que escriben', '', '', WA.c)}
      ${ultimos.map(x => `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--line)"><div class="row sm" style="gap:6px"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.c.name)}</b>${waTipoChip(x.c)}<span class="spacer"></span><span class="xs muted">${waAgo(x.t)}</span></div><div class="sm" style="color:var(--muted);margin-top:2px">${esc(x.s.slice(0, 120))}${x.s.length > 120 ? '…' : ''}</div></div>`).join('') || empty('Sin mensajes en el período')}</div>
    </div>
  </div>`;
}

function bindWhatsapp(el) {
  $$('[data-wperiod]', el).forEach(b => b.onclick = () => { CP.wperiod = b.dataset.wperiod; cpSave(); render(); });
  // Corregir el monto de un comprobante (queda guardado en data/wa-ventas.json para todos los equipos)
  $$('[data-wa-monto]', el).forEach(b => b.onclick = async () => {
    const r = prompt('Monto correcto en pesos (sin puntos). Déjalo vacío para volver al leído del comprobante, o escribe 0 si no es una venta.', b.dataset.waActual && b.dataset.waActual !== '0' ? b.dataset.waActual : '');
    if (r === null) return;
    const v = r.replace(/[^\d]/g, '');
    try {
      const res = await fetch('/api/whatsapp/venta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.dataset.waMonto, amount: r.trim() === '' ? null : Number(v || 0), tipo: r.trim() !== '' && !Number(v || 0) ? 'descartado' : '' }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error || 'error');
      await loadWa(); render(); toast('Monto guardado');
    } catch (e) { toast('No se pudo guardar: ' + e.message); }
  });
}

window.addEventListener('load', () => { loadWa().then(ok => { if (ok && typeof render === 'function' && location.hash.includes('campanas/whatsapp')) render(); }); });
