// ============================================================
// K8 Panel · armazón: menú lateral, barra superior, enrutado
// ============================================================
'use strict';

const APPS = [
  { id: 'inicio',    name: 'Inicio',                  icon: ICON.home,  c: 'var(--app-inicio)',    sub: [] },
  // Antes «Marketing y Desarrollo». Vicente (20-11-2026): ahora es «Tareas», solo para sus tareas, con su checklist.
  // Las páginas de Equipo y Ventas siguen funcionando (se llega desde Inicio y Configuración) pero salen del menú.
  { id: 'marketing', name: 'Tareas', icon: ICON.check, c: 'var(--app-marketing)',
    sub: [
      { id: 'equipo/checklist',  name: 'Mi checklist' },
      { id: 'equipo/tareas',     name: 'Tablero' },
      { id: 'equipo/calendario', name: 'Calendario' },
    ] },
  { id: 'productos', name: 'Productos', icon: ICON.shirt, c: 'var(--app-productos)',
    sub: [
      { id: 'lista',      name: 'Productos' },
      { id: 'documentos', name: 'Documentos' },
      { id: 'recursos',   name: 'Recursos' },
    ] },
  { id: 'estados', name: 'Estados y Reposiciones', icon: ICON.gantt, c: 'var(--app-estados)',
    sub: [
      { id: 'gantt',         name: 'Gantt' },
      { id: 'muestras',      name: 'Muestras' },
      { id: 'reposiciones',  name: 'Pedidos y reposiciones' },
      { id: 'analisis',      name: 'Análisis' },
      { id: 'resumen',       name: 'Resumen' },
      { id: 'importaciones', name: 'Importaciones clientes' },
      { id: 'investigacion', name: 'Investigación' },
    ] },
  { id: 'campanas', name: 'Campañas', icon: ICON.mega, c: 'var(--app-campanas)',
    sub: [
      { id: 'dashboard', name: 'Dashboard' },
      { id: 'lista',     name: 'Todas las campañas' },
      { id: 'zonas',     name: 'Por zona' },
      { id: 'web',       name: 'Sitio web' },
      { id: 'whatsapp',  name: 'WhatsApp', soloK8: true },        // WhatsApp y Mercado Libre son solo de K8: con TLA elegida no aparecen
      { id: 'mercadolibre', name: 'Mercado Libre', soloK8: true },
    ] },
  { id: 'informes', name: 'Informes', icon: ICON.chart, c: 'var(--app-informes, #A78BFA)',
    sub: [
      { id: 'ventas', name: 'Ventas y campañas' },
      { id: 'comparar', name: 'K8 vs TLA' },
    ] },
];
const appOf = id => APPS.find(a => a.id === id) || APPS[0];

// Páginas registradas por cada módulo: PAGES[app] = (route) => { html, mount }


const ME = { id: 'vicente' };

function sidebarHtml(route) {
  const subs = a => a.sub.filter(s => !(s.soloK8 && typeof cpTla === 'function' && cpTla())).map(s => s.grp
    ? `<div class="grp">${s.grp}</div>`
    : `<button class="${route.app === a.id && `${route.sec}${route.sub ? '/' + route.sub : ''}` === s.id ? 'on' : ''}" data-nav="${a.id}/${s.id}">${s.name}</button>`).join('');
  const badges = { marketing: Store.list('tasks').filter(t => t.state !== 'done' && t.due && daysBetween(todayIso(), t.due) < 0).length };
  return `
  <aside class="sidebar">
    <div class="nav-sec">Aplicaciones</div>
    ${APPS.map(a => `
      <button class="nav-item ${route.app === a.id ? 'on' : ''}" style="--c:${a.c}" data-nav="${a.id}" title="${a.name}">
        <span class="ic">${a.icon(15)}</span><span class="lbl">${a.name}</span>
        ${badges[a.id] ? `<span class="nav-badge">${badges[a.id]}</span>` : ''}
      </button>
      ${(route.app === a.id || render.menuApp === a.id) && a.sub.length ? `<div class="nav-sub">${subs(a)}</div>` : ''}`).join('')}
    <div class="foot">
      <button class="btn ghost sm collapse-btn" id="collapse-btn" title="Plegar o desplegar el menú">${ICON.chevL(14)}<span class="lbl">Plegar menú</span></button>
    </div>
  </aside>`;
}

const CONFIG_PAGES = [
  { id: 'stock',     name: 'Stock Manager', icon: ICON.box },
  { id: 'actividad', name: 'Actividad',     icon: ICON.clock },
  { id: 'equipo',    name: 'Equipo K8',     icon: ICON.users },
  { id: 'perfil',    name: 'Mi perfil',     icon: ICON.users },
];

function topbarHtml(route) {
  const a = appOf(route.app);
  const isCfg = route.app === 'config';
  const cfg = isCfg ? CONFIG_PAGES.find(c => c.id === route.sec) : null;
  const sec = a.sub.find(s => s.id === `${route.sec}${route.sub ? '/' + route.sub : ''}`);
  const grp = (() => { let g = ''; for (const s of a.sub) { if (s.grp) g = s.grp; if (sec && s.id === sec.id) return g; } return ''; })();
  const me = personOf(ME.id);
  const alerts = Store.read('alerts_home', true);
  const lect = Acceso.lector();
  return `
  <div class="topbar">
    <button class="icon-btn menu-btn" id="menu-btn" title="Menú">${ICON.menu(16)}</button>
    <a class="brand-top" href="#/inicio" title="K8 App · Inicio"><img src="assets/logo-k8.webp" alt="K8"></a>
    <div class="crumbs">${isCfg ? `<span>Configuración</span><span class="sep">/</span><b>${cfg ? cfg.name : ''}</b>` : route.app === 'inicio' ? '<b>Inicio</b>' : `<span>${a.name}</span>${grp ? `<span class="sep">/</span><span>${grp}</span>` : ''}${sec ? `<span class="sep">/</span><b>${sec.name}</b>` : ''}`}</div>
    <span class="spacer"></span>
    <label class="search">${ICON.search(15)}<input id="global-q" placeholder="Buscar producto, campaña o tarea…"><kbd>Ctrl K</kbd></label>
    <button class="icon-btn" id="theme-btn" title="Cambiar tema">${Theme.isDark() ? ICON.sun(16) : ICON.moon(16)}</button>
    <button class="icon-btn" id="pdf-btn" title="Informe PDF de esta sección">${ICON.pdf(16)}</button>
    ${lect ? `<span class="lector-chip" title="Puedes mirar todo, pero no hacer cambios">${ICON.eye(13)} Modo lector</span>` : ''}
    <div class="menu-wrap">
      <button class="icon-btn" id="gear-btn" title="Configuración">${ICON.gear ? ICON.gear(16) : ICON.dots(16)}</button>
      <div class="menu-pop hide" id="gear-menu">
        <div class="menu-title">Configuración K8</div>
        ${lect ? `<div class="menu-item" style="opacity:.75">${ICON.eye(14)} Estás como lector</div>` : CONFIG_PAGES.map(c => `<button class="menu-item" data-go="config/${c.id}">${c.icon(14)} ${c.name}</button>`).join('')}
        ${lect ? '' : `<label class="menu-item"><input type="checkbox" id="alerts-home" ${alerts ? 'checked' : ''}> Alertas en la portada</label>`}
        ${lect || window.K8_PUBLICADO ? '' : `<button class="menu-item" id="pub-btn">${ICON.upload(14)} Publicar en la web</button>`}
        <div class="menu-item" style="gap:8px"><button class="icon-btn sm" id="theme-btn2" title="Cambiar tema">${Theme.isDark() ? ICON.sun(14) : ICON.moon(14)}</button><span class="seg"><button class="on">ES</button></span></div>
        <button class="menu-item danger" id="logout-btn">${ICON.logout ? ICON.logout(14) : ''} ${lect ? 'Salir (entrar como administrador)' : 'Cerrar sesión'}</button>
      </div>
    </div>
    ${lect ? `<span class="av-btn" title="Lector">${avatar('Lector', 'lg')}</span>` : `<button class="av-btn" id="me-btn" title="${esc(me.name)}" data-go="config/perfil">${avatar(me.name, 'lg')}</button>`}
  </div>`;
}

// Indicador de las pestañas: una píldora que se desliza en horizontal hasta la pestaña activa
// (en vez de redibujar el botón). Recuerda dónde estaba para partir desde ahí tras cada render.
function animateTabs(delay = 0) {
  const tabs = $('.tabs'); const on = tabs && $('button.on', tabs); if (!tabs || !on) { animateTabs.last = null; return; }
  let ind = $('.tabs-ind', tabs); if (!ind) { ind = document.createElement('span'); ind.className = 'tabs-ind'; tabs.prepend(ind); }
  const target = { left: on.offsetLeft, width: on.offsetWidth };
  const prev = animateTabs.last;
  ind.classList.add('noanim');
  const from = prev || target;
  ind.style.transform = `translateX(${from.left}px)`; ind.style.width = `${from.width}px`;
  ind.getBoundingClientRect();
  const go = () => { ind.classList.remove('noanim'); ind.style.transform = `translateX(${target.left}px)`; ind.style.width = `${target.width}px`; };
  if (delay) setTimeout(go, delay); else requestAnimationFrame(go);
  animateTabs.last = target;
}

// Selección del menú lateral (20-11): un cuadro que se DESLIZA hasta la app activa, igual que la píldora de las
// pestañas. Antes se usaba View Transitions y el ícono parecía «volar» de un lugar a otro (se veía raro).
// Parte desde donde estaba dibujado (aunque iba a medio camino) y cambia de color en el trayecto.
function navIndRect(sb) {
  const ind = sb && $('.nav-ind', sb); if (!ind) return null;
  // Mismo sistema de coordenadas que offsetTop de los botones: el contenedor posicionado más cercano.
  const p = ind.offsetParent || document.body;
  const r = ind.getBoundingClientRect(), s = p.getBoundingClientRect();
  return { top: r.top - s.top - p.clientTop + p.scrollTop, left: r.left - s.left - p.clientLeft + p.scrollLeft, width: r.width, height: r.height, c: ind.style.getPropertyValue('--c') };
}
function animateNav(prev, toBtn) {
  const sb = $('.sidebar'); const on = toBtn || (sb && $('.nav-item.on', sb)); if (!sb || !on) return;
  let ind = $('.nav-ind', sb); if (!ind) { ind = document.createElement('span'); ind.className = 'nav-ind'; sb.prepend(ind); }
  const place = (r, c) => { ind.style.transform = `translate(${r.left}px, ${r.top}px)`; ind.style.width = `${r.width}px`; ind.style.height = `${r.height}px`; if (c) ind.style.setProperty('--c', c); };
  const target = { top: on.offsetTop, left: on.offsetLeft, width: on.offsetWidth, height: on.offsetHeight };
  const c = on.style.getPropertyValue('--c');
  if (toBtn) { ind.classList.remove('noanim'); place(target, c); return; }   // clic: parte de inmediato
  ind.classList.add('noanim'); place(prev || target, prev ? prev.c : c); ind.getBoundingClientRect();
  if (prev && (Math.abs(prev.top - target.top) > 1 || Math.abs(prev.height - target.height) > 1 || prev.c !== c)) requestAnimationFrame(() => { ind.classList.remove('noanim'); place(target, c); });
  else ind.classList.remove('noanim');
}
// (23-11) Se probó la píldora que se estira del video de referencia (borde delantero 0,36 s, trasero 0,55 s) y a Vicente no le gustó: se volvió a este deslizamiento.

function render() {
  if (!Acceso.rol()) return accPantalla();   // (23-11) primero se elige: lector o administrador
  const route = Router.parse();
  if (route.app === 'config' && Acceso.lector()) return Router.go('inicio');   // Configuración es solo del administrador
  // Cambio de app o de pestaña: el contenido nuevo entra con un fundido CSS corto (.content.enter);
  // la selección del menú y la píldora de pestañas se deslizan (animateNav / animateTabs).
  const appChanged = render.lastRoute !== undefined && route.app !== String(render.lastRoute).split('/')[0];
  const navPrev = navIndRect($('.sidebar'));
  const navPos = {}; $$('.sidebar .nav-item, .sidebar .foot').forEach(b => { navPos[b.dataset.nav || 'foot'] = b.getBoundingClientRect().top; });
  const app = appOf(route.app);
  document.body.dataset.app = app.id;
  if (app.id !== 'estados' && typeof hideEstados === 'function') hideEstados();
  const page = (route.app === 'config' && PAGES.config ? PAGES.config : (PAGES[app.id] || PAGES.inicio))(route);
  const routeKey = `${route.app}/${route.sec}/${route.sub}`; const routeChanged = routeKey !== render.lastRoute; render.lastRoute = routeKey;
  $('#app').innerHTML = `<div class="shell ${Store.read('nav_collapsed', false) ? 'collapsed' : ''}">${sidebarHtml(route)}<div class="main">${topbarHtml(route)}<div class="content" id="content">${page.html}</div></div>${tabbarHtml(route)}</div>`;
  if (routeChanged) window.scrollTo(0, 0);
  decorateCards($('#app'));
  const animar = routeChanged || render.animar; render.animar = false;
  if (animar) $('#content').classList.add('enter');
  if (appChanged) animateTabs.last = null;   // otra app: pestañas nuevas, la píldora no viene de ninguna parte
  animateTabs();
  animateNav(navPrev);
  if (appChanged) animarMenu(navPos);
  // Menú de configuración (engranaje)
  const gm = $('#gear-menu');
  $('#gear-btn').onclick = e => { e.stopPropagation(); gm.classList.toggle('hide'); };
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) gm.classList.add('hide'); }, { once: true });
  if ($('#alerts-home')) $('#alerts-home').onchange = e => { Store.write('alerts_home', e.target.checked); toast(e.target.checked ? 'Alertas visibles en Inicio' : 'Alertas ocultas en Inicio'); };
  $('#theme-btn2').onclick = () => Theme.toggle();
  $('#logout-btn').onclick = () => Acceso.salir();
  const pb = $('#pub-btn'); if (pb) pb.onclick = () => { gm.classList.add('hide'); accPublicar(); };

  $$('[data-nav]').forEach(b => b.onclick = () => {
    const target = b.dataset.nav; const a = appOf(target.split('/')[0]);
    const first = a.sub.find(s => s.id);
    const inDrawer = b.closest('.sidebar') && $('.shell').classList.contains('menu-open');
    // En el menú deslizable (celular/tablet) tocar una app solo despliega sus secciones; se navega al tocar la sección.
    if (inDrawer && !target.includes('/') && first) {
      render.menuApp = render.menuApp === a.id ? '' : a.id;
      render(); $('.shell').classList.add('menu-open'); return;
    }
    render.menuApp = '';
    const dest = target.includes('/') || !first ? target : `${a.id}/${first.id}`;
    if (location.hash === `#/${dest}`) { $('.shell').classList.remove('menu-open'); return; }
    Router.go(dest);
  });
  // Menú lateral: la selección parte hacia la app tocada en el mismo instante (antes de redibujar la página).
  $$('.sidebar .nav-item[data-nav]').forEach(b => b.addEventListener('pointerdown', () => {
    if ($('.shell').classList.contains('menu-open') || b.classList.contains('on')) return;
    $$('.sidebar .nav-item').forEach(x => x.classList.toggle('on', x === b));
    animateNav(null, b);
  }));
  $$('[data-go]').forEach(b => b.onclick = e => { e.stopPropagation(); Router.go(b.dataset.go); });
  // Pestañas: la píldora parte hacia la pestaña en el mismo instante en que se toca (antes de redibujar la página).
  $$('.tabs button[data-go]').forEach(b => b.addEventListener('pointerdown', () => {
    const tabs = b.closest('.tabs'); const ind = $('.tabs-ind', tabs); if (!ind) return;
    $$('button', tabs).forEach(x => x.classList.toggle('on', x === b));
    const target = { left: b.offsetLeft, width: b.offsetWidth };
    ind.classList.remove('noanim'); ind.style.transform = `translateX(${target.left}px)`; ind.style.width = `${target.width}px`;
    animateTabs.last = target;
  }));
  $('#theme-btn').onclick = () => Theme.toggle();
  $('#pdf-btn').onclick = () => (typeof buildReport === 'function' ? buildReport(route) : printSection(page.title || app.name));
  $('#global-q').onkeydown = e => { if (e.key === 'Enter' && e.target.value.trim()) globalSearch(e.target.value.trim()); };
  $('#menu-btn').onclick = () => $('.shell').classList.toggle('menu-open');
  $('.shell').addEventListener('click', e => { if (e.target === $('.shell')) $('.shell').classList.remove('menu-open'); });
  const cb = $('#collapse-btn'); if (cb) cb.onclick = () => { Store.write('nav_collapsed', !Store.read('nav_collapsed', false)); render(); if (typeof placeEstados === 'function') requestAnimationFrame(placeEstados); };
  page.mount && page.mount($('#content'));
  if (animar) animarEntrada($('#content'));
}
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#global-q')?.focus(); } });

function globalSearch(q) {
  const n = q.toLowerCase();
  const prods = Store.list('products').filter(p => p.name.toLowerCase().includes(n));
  const camps = Store.list('campaigns').filter(c => c.name.toLowerCase().includes(n));
  const tasks = Store.list('tasks').filter(t => t.title.toLowerCase().includes(n));
  const row = (ic, t, s, go) => `<div class="list-item link" data-go="${go}"><span class="icon-btn sm">${ic}</span><div><div class="t">${esc(t)}</div><div class="s">${s}</div></div><span class="spacer"></span>${ICON.chevR(14)}</div>`;
  const html = [
    ...prods.map(p => row(ICON.shirt(14), p.name, `Producto · ${lineOf(p.line).name}`, `productos/lista/${p.id}`)),
    ...camps.map(c => row(ICON.mega(14), c.name, `Campaña · ${ctypeOf(c.type).name}`, `campanas/lista`)),
    ...tasks.map(t => row(ICON.tasks(14), t.title, `Tarea · ${t.area}`, `marketing/equipo/tareas`)),
  ].join('') || empty('Sin resultados', `Nada coincide con «${esc(q)}»`);
  openModal(modalHtml(`Resultados para «${esc(q)}»`, `<div class="list">${html}</div>`), { onMount: m => $$('[data-go]', m).forEach(b => b.onclick = () => { closeModal(); Router.go(b.dataset.go); }) });
}

// ---------- arranque ----------
window.addEventListener('DOMContentLoaded', () => {
  if (Acceso.rol()) { Acceso._arranque = true; try { seedIfEmpty(); } finally { Acceso._arranque = false; } }
  if (!location.hash) Router.go('inicio');
  // Lector en una ruta de configuración (Stock, Equipo, Perfil): vuelve a Inicio
  if (Acceso.lector() && Router.parse().app === 'config') Router.go('inicio');
  render();
});

// Barra inferior (solo celular y tablet): las cinco apps como en una app nativa
function tabbarHtml(route) {
  return `<nav class="tabbar">${APPS.map(a => `<button class="tab-item ${route.app === a.id ? 'on' : ''}" style="--c:${a.c}" data-nav="${a.id}"><span class="ic">${a.icon(18)}</span><span>${a.id === 'estados' ? 'Estados' : a.name}</span></button>`).join('')}</nav>`;
}

// ---------- Entrada animada del contenido (23-11, Vicente: «una animación más profesional») ----------
// Al cambiar de sección o de período: las tarjetas aparecen en cascada desde abajo, las barras crecen y las
// cifras grandes cuentan hasta su valor. Todo con transform/opacity (no traba) y respeta «reducir movimiento».
function animarEntrada(root) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('.card, .ivx-card, .ivx-light, .ivx-acum, .page-head, .ivx-top, .ivx-filtros, .ivx-marcas', root).filter(el => !el.parentElement.closest('.card, .ivx-card, .ivx-light')).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
  const nums = $$('.ivx-num, .kpi .val, .ivx-acum-it b, .ivx-mini b, .cmp-lado b, .ivx-dc b', root).slice(0, 60);
  for (const el of nums) contarHasta(el);
}
function contarHasta(el) {
  // busca el primer texto con número (p. ej. «$17,2 M», «134», «12 x») y lo hace subir desde 0, respetando su formato chileno
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode()) && !/\d/.test(n.nodeValue)) { }
  if (!n) return;
  const m = n.nodeValue.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/); if (!m) return;
  const txt = m[0], dec = (txt.split(',')[1] || '').length, miles = txt.includes('.');
  const fin = parseFloat(txt.replace(/\./g, '').replace(',', '.')); if (!isFinite(fin) || fin === 0) return;
  const antes = n.nodeValue.slice(0, m.index), despues = n.nodeValue.slice(m.index + txt.length), orig = n.nodeValue;
  const fmt = v => { let s = v.toFixed(dec).replace('.', ','); if (miles) { const [e, d] = s.split(','); s = e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : ''); } return s; };
  const dur = 900, t0 = performance.now() + 120, ease = x => 1 - Math.pow(1 - x, 3);
  n.nodeValue = antes + fmt(0) + despues;
  const paso = now => { const k = Math.min(1, Math.max(0, (now - t0) / dur)); n.nodeValue = k >= 1 ? orig : antes + fmt(fin * ease(k)) + despues; if (k < 1 && n.isConnected) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
// ---------- Menú lateral sin saltos (23-11, Vicente) ----------
// Cada app tiene distinta cantidad de subpestañas: al cambiar, los ítems de abajo saltaban. Ahora cada ítem se
// desliza desde donde estaba hasta su nuevo lugar (técnica FLIP) y las subpestañas nuevas aparecen en cascada.
function animarMenu(navPos) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ease = 'cubic-bezier(.16, 1, .3, 1)';
  $$('.sidebar .nav-item, .sidebar .foot').forEach(b => {
    const antes = navPos[b.dataset.nav || 'foot']; if (antes == null) return;
    const dy = antes - b.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) b.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: ease });
  });
  $$('.sidebar .nav-sub').forEach(s => {
    s.animate([{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 380, easing: ease, delay: 60, fill: 'backwards' });
    $$('button', s).forEach((b, i) => b.animate([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: ease, delay: 90 + i * 35, fill: 'backwards' }));
  });
}