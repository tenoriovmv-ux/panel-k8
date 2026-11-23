// ============================================================
// Estados y Reposiciones · la app propia embebida con la piel del panel.
// El iframe se crea una sola vez y se mantiene vivo entre navegaciones
// (así no recarga sus datos cada vez que se cambia de pestaña).
// ============================================================
'use strict';

const ESTADOS_SRC = '../k8-reposiciones/index.html';
const ESTADOS_TABS = {
  gantt: 'Gantt', muestras: 'Muestras', reposiciones: 'Pedidos y reposiciones', analisis: 'Análisis',
  resumen: 'Resumen', importaciones: 'Importaciones clientes', investigacion: 'Investigación',
};
const EST = { host: null, frame: null, info: {} };

function estadosHost() {
  if (EST.host) return EST.host;
  const host = document.createElement('div');
  host.id = 'estados-host';
  host.style.cssText = 'position:fixed;display:none;z-index:5;border-radius:20px;overflow:hidden;border:1px solid var(--glass-border);box-shadow:var(--shadow-sm);background:var(--glass-strong)';
  const f = document.createElement('iframe');
  f.className = 'module-frame'; f.title = 'Estados y Reposiciones';
  f.src = `${ESTADOS_SRC}?embed=1&theme=${Theme.isDark() ? 'dark' : 'light'}&tab=${Router.parse().sec || 'gantt'}${Acceso.lector() ? '&lector=1' : ''}`;
  host.appendChild(f); document.body.appendChild(host);
  EST.host = host; EST.frame = f;
  window.addEventListener('resize', placeEstados);
  window.addEventListener('scroll', placeEstados, { passive: true });
  document.addEventListener('scroll', e => { if (e.target.id === 'content' || e.target === document) placeEstados(); }, { passive: true, capture: true });
  window.addEventListener('message', e => {
    if (e.data?.type !== 'k8estados') return;
    EST.info = e.data; const c = $('#est-counts'); if (c) c.innerHTML = estadosCounts();
    if (Array.isArray(e.data.list)) { Store.write('est_products', e.data.list); Store.write('est_synced_at', new Date().toISOString()); document.dispatchEvent(new CustomEvent('k8estados')); }
    estadosAutoRestore();
  });
  return host;
}
const estadosCounts = () => EST.info.products != null ? `${EST.info.products} productos · ${EST.info.samples} muestras en curso · ${EST.info.orders} envíos` : 'Cargando datos…';
function placeEstados() {
  const ph = $('#estados-slot'); if (!ph || !EST.host) return;
  const r = ph.getBoundingClientRect();
  Object.assign(EST.host.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', display: 'block' });
}
function estadosSend(msg) { EST.frame?.contentWindow?.postMessage({ type: 'k8panel', ...msg }, '*'); }
function hideEstados() { if (EST.host) EST.host.style.display = 'none'; }

PAGES.estados = route => {
  const tab = ESTADOS_TABS[route.sec] ? route.sec : 'gantt';
  return {
    title: `Estados · ${ESTADOS_TABS[tab]}`,
    html: `
    <div class="page-head" style="margin-bottom:12px"><div><h1>${ESTADOS_TABS[tab]}</h1><p id="est-counts">${estadosCounts()}</p></div>
      <div class="actions">${tab === 'muestras' ? `<button class="btn primary" id="est-correo" title="Arma un correo en Outlook con las muestras en curso para que las aprueben o no">${ICON.msg ? ICON.msg(14) : ''} Enviar correo</button>` : ''}<button class="btn" id="est-restore" title="Cargar un respaldo .json descargado desde Configuración">${ICON.upload(14)} Restaurar respaldo</button><button class="btn" id="est-config">${ICON.users(14)} Configuración</button><button class="btn" id="est-print">${ICON.pdf(14)} Informe PDF</button><button class="btn primary" id="est-upload">${ICON.upload(14)} Subir Excel</button></div></div>
    <div id="estados-slot" style="height:calc(100vh - 150px)"></div>`,
    mount(el) {
      estadosHost(); placeEstados();
      estadosSend({ tab, theme: Theme.isDark() ? 'dark' : 'light' });
      $('#est-upload', el).onclick = () => estadosSend({ action: 'upload' });
      $('#est-config', el).onclick = () => estadosSend({ action: 'config' });
      $('#est-restore', el).onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const data = JSON.parse(await f.text()); estadosSend({ action: 'restore', data }); } catch { toast('El archivo no es un respaldo válido', true); } }; inp.click(); };
      $('#est-print', el).onclick = () => estadosSend({ action: 'print' });
      const ec = $('#est-correo', el); if (ec) ec.onclick = () => muestrasCorreo();
      requestAnimationFrame(placeEstados);
    },
  };
};

// ---------- API para otras apps del panel ----------
/** Lista de productos del Gantt (última copia recibida). */
const estadosProducts = () => Store.read('est_products', []);
/** Cambia la etapa de un producto en el Gantt (fuente de verdad). */
function estadosSetStage(id, stage, note) { estadosHost(); estadosSend({ action: 'setStage', id, stage, note }); }
/** Pide al Gantt que reenvíe su lista (carga el iframe oculto si hace falta). */
function estadosSync() { estadosHost(); estadosSend({ action: 'sync' }); }

// ---------- Restauración automática del último respaldo ----------
// Si en k8-reposiciones/respaldos/ultimo.json hay un respaldo más nuevo que el último aplicado en este
// navegador, se carga solo (una vez por respaldo). Así cada computador parte con los mismos datos.
let _autoRestoring = false;
async function estadosAutoRestore() {
  if (_autoRestoring || Acceso.lector()) return; _autoRestoring = true;   // el lector no restaura nada
  try {
    const r = await fetch(`../k8-reposiciones/respaldos/ultimo.json?x=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data?.at || Store.read('est_restored_at', '') === data.at) return;
    estadosSend({ action: 'restore', data, silent: true });
    Store.write('est_restored_at', data.at);
    toast(`Datos de Estados actualizados al respaldo del ${new Date(data.at).toLocaleString('es-CL')}`);
  } catch (e) { console.warn('auto-restore', e); }
  finally { setTimeout(() => { _autoRestoring = false; }, 5000); }
}

// ---------- Muestras: correo para aprobar (23-11, Vicente) ----------
// Arma un borrador en Outlook (el programa de correo del computador) con todas las muestras en curso, cuántos días
// quedan y, para cada una, «APROBADO» o «NO APROBADO + comentario». Los correos de Para y CC se recuerdan.
function muestrasLista() {
  let s = [], p = []; try { s = JSON.parse(localStorage.getItem('k8r_samples') || '[]'); p = JSON.parse(localStorage.getItem('k8r_products') || '[]'); } catch (e) { }
  const nom = id => (p.find(x => x.id === id) || {}).name || 'Producto';
  const hoy = todayIso();
  return s.filter(m => m.status === 'en_curso').map(m => { const v = String(m.due_at || '').slice(0, 10); return { n: nom(m.product_id), ronda: m.round || 'Muestra', vence: v, dias: v ? daysBetween(hoy, v) : null, resp: m.responsable || '' }; })
    .sort((a, b) => (a.vence || '9').localeCompare(b.vence || '9'));
}
function muestrasTexto(ls) {
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dia = iso => { const d = parseDay(iso); return d ? `${d.getDate()} de ${MES[d.getMonth()]}` : 'sin fecha'; };
  const quedan = d => d == null ? '' : d < 0 ? `venció hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoy' : `quedan ${d} día${d === 1 ? '' : 's'}`;
  const min = ls.filter(m => m.dias != null).reduce((a, m) => Math.min(a, m.dias), Infinity);
  const prox = ls.find(m => m.dias === min);
  const asunto = `Muestras por aprobar · ${isFinite(min) ? quedan(min) : 'revisión'}${prox ? ` (hasta el ${dia(prox.vence)})` : ''}`;
  // (23-11) Vicente: más cercano («Hola equipo») y que al final diga que es un mensaje automático, sin firma personal
  const cuerpo = [`Hola equipo, ¿cómo están?`, ``,
    `Les escribo para recordarles que ${isFinite(min) ? quedan(min) + (prox ? ` (hasta el ${dia(prox.vence)})` : '') : 'tenemos pendiente la revisión'} para decidir si se aprueban o no las siguientes muestras.`,
    `Cuando puedan, respondan este correo indicando en cada una APROBADO, o NO APROBADO con un comentario de qué habría que cambiar:`, ``,
    ...ls.flatMap((m, i) => [`${i + 1}. ${m.n} · ${m.ronda} · vence el ${dia(m.vence)} (${quedan(m.dias)})`, `   Respuesta: APROBADO / NO APROBADO`, `   Comentario (si no se aprueba): `, ``]),
    `¡Muchas gracias por su ayuda!`, ``, `—`, `Este mensaje es automático, enviado desde el panel de K8.`].join('\n');
  return { asunto, cuerpo };
}
function muestrasCorreo() {
  const ls = muestrasLista();
  if (!ls.length) return toast('No hay muestras en curso para enviar', true);
  const MC_CC = 't.sanchez@k8chile.cl, f.toloza@textillasamericas.cl, b.gong@textillasamericas.cl';   // Tiare, Francisca Tolosa y Baoxin Gong (Vicente, 23-11)
  // (23-11) Vicente: «pone los correos de las personas al tiro» → van directo en Para; CC queda libre
  const cfg = Store.read('muestras_correo', { para: MC_CC, cc: '' }); if (!cfg.para) { cfg.para = MC_CC; if (cfg.cc === MC_CC) cfg.cc = ''; }
  const { asunto, cuerpo } = muestrasTexto(ls);
  openModal(modalHtml('Enviar correo de muestras', `
    <p class="sm muted" style="margin:0 0 12px">${ls.length} muestras en curso. Se abre un borrador en Outlook con este texto; tú lo revisas y lo envías desde tu correo.</p>
    <label class="sm" style="display:block;margin-bottom:8px">Para<input class="input" id="mc-para" style="width:100%;margin-top:4px" value="${esc(cfg.para || '')}" placeholder="correo@empresa.cl (varios separados por coma)"></label>
    <label class="sm" style="display:block;margin-bottom:8px">Con copia (CC)<input class="input" id="mc-cc" style="width:100%;margin-top:4px" value="${esc(cfg.cc || '')}" placeholder="opcional: otros correos, separados por coma"></label>
    <label class="sm" style="display:block;margin-bottom:8px">Asunto<input class="input" id="mc-asunto" style="width:100%;margin-top:4px" value="${esc(asunto)}"></label>
    <label class="sm" style="display:block">Mensaje<textarea class="input" id="mc-cuerpo" rows="14" style="width:100%;margin-top:4px;font:12.5px/1.5 var(--font);resize:vertical">${esc(cuerpo)}</textarea></label>`,
    `<button class="btn" id="mc-copiar">Copiar texto</button><span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="mc-abrir">Abrir en Outlook</button>`), { wide: true });
  const g = id => document.getElementById(id);
  const guardar = () => Store.write('muestras_correo', { para: g('mc-para').value.trim(), cc: g('mc-cc').value.trim() });
  g('mc-copiar').onclick = async () => { guardar(); try { await navigator.clipboard.writeText(g('mc-cuerpo').value); toast('Texto copiado'); } catch (e) { toast('No se pudo copiar', true); } };
  g('mc-abrir').onclick = () => {
    guardar();
    const enc = encodeURIComponent; const cc = g('mc-cc').value.trim();
    const url = `mailto:${g('mc-para').value.trim().split(/[;,\s]+/).filter(Boolean).join(',')}?${cc ? `cc=${enc(cc.split(/[;,\s]+/).filter(Boolean).join(','))}&` : ''}subject=${enc(g('mc-asunto').value)}&body=${enc(g('mc-cuerpo').value.replace(/\n/g, '\r\n'))}`;
    window.location.href = url; toast('Abriendo Outlook con el borrador…');
  };
}