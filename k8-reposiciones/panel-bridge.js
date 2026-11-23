// ============================================================
// Puente con el Panel K8. Solo actúa cuando la app se abre
// embebida (?embed=1). Recibe pestaña, tema y acciones desde el panel
// y le envía la pestaña actual, contadores y la lista de productos
// con su etapa (el Gantt es la fuente de verdad de la etapa).
// Usa lo que app.js expone en window.K8; no cambia su funcionamiento.
// ============================================================
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('embed') !== '1') return;
  document.body.classList.add('embedded');
  if (params.get('theme') === 'dark') document.body.classList.add('dark');

  // En celular el Gantt parte en escala de meses, para que quepan más barras.
  try {
    if (window.innerWidth <= 700 && !localStorage.getItem('k8r_mobile_zoom_set')) {
      localStorage.setItem('k8r_ui_zoom', JSON.stringify('mes')); localStorage.setItem('k8r_mobile_zoom_set', '1');
      const k0 = window.K8; if (k0 && k0.ui && k0.ui.zoom !== 'mes') { k0.ui.zoom = 'mes'; k0.ui.scrolledToToday = false; setTimeout(() => { k0.render && k0.render(); setTimeout(() => { const g = document.querySelector('.gantt'); const td = document.querySelector('.ticks .today'); if (g && td) g.scrollLeft = Math.max(0, td.offsetLeft - 190); }, 150); }, 50); }
    }
  } catch (e) { /* sin storage */ }
  const VALID = ['gantt', 'muestras', 'reposiciones', 'analisis', 'resumen', 'importaciones', 'investigacion'];
  const wantTab = (params.get('tab') || '').toLowerCase();
  if (VALID.includes(wantTab)) {
    try { localStorage.setItem('k8r_ui_tab', JSON.stringify(wantTab)); } catch (e) { /* sin storage */ }
  }
  const K = () => window.K8 || {};

  window.addEventListener('message', e => {
    const d = e.data || {};
    if (d.type !== 'k8panel') return;
    const k = K();
    // (23-11) Modo lector: el panel no puede pedirle a esta app que suba, configure, cambie etapas ni restaure
    if (document.documentElement.classList.contains('lector') && /^(upload|config|setStage|restore)$/.test(d.action || '')) return;
    if (d.theme) { const was = document.body.classList.contains('dark'); document.body.classList.toggle('dark', d.theme === 'dark'); if (was !== (d.theme === 'dark') && k.render) k.render(); }
    if (d.tab && VALID.includes(d.tab) && k.ui && k.render) {
      if (k.ui.tab !== d.tab) { k.ui.tab = d.tab; k.ui.drawer = null; try { localStorage.setItem('k8r_ui_tab', JSON.stringify(d.tab)); } catch (err) { /* sin storage */ } k.render(); }
    }
    if (d.action === 'upload' && k.pickFile) k.pickFile();
    if (d.action === 'config' && k.openConfig) k.openConfig();
    if (d.action === 'print') window.print();
    if (d.action === 'setStage' && k.setStage && k.productById) {
      const p = k.productById(d.id);
      if (p) k.setStage(p, Number(d.stage), d.note || 'Cambiado desde Productos (Panel K8)').then(notify);
    }
    if (d.action === 'sync') notify();
    if (d.action === 'restore') { if (d.data && k.applyBackup) k.applyBackup(d.data, !!d.silent); else if (k.restoreBackup) k.restoreBackup(); }
  });

  // Avisar al panel la pestaña actual, contadores y productos cada vez que la app redibuja.
  let t = null;
  const notify = () => {
    const k = K(); if (!k.ui || !k.state) return;
    const S = k.state;
    const products = (S.products || []).map(p => ({ id: p.id, code: p.code, name: p.name, line: p.line, garment: p.garment, colors: p.colors, stage: p.stage, composition: p.composition, sizes: p.sizes, eta: p.eta, updated_at: p.updated_at }));
    parent.postMessage({ type: 'k8estados', tab: k.ui.tab, products: products.length, samples: (S.samples || []).filter(s => s.status === 'en_curso').length, orders: (S.orders || []).length, list: products }, '*');
  };
  // Botón «Filtros» en la barra del Gantt (solo se ve en celular, ver panel-skin.css)
  const ensureFiltersBtn = () => {
    const tb = document.querySelector('.toolbar'); if (!tb || tb.querySelector('.filters-btn')) return;
    const b = document.createElement('button'); b.className = 'filters-btn'; b.type = 'button'; b.style.display = 'none';
    b.innerHTML = 'Filtros'; b.onclick = () => document.body.classList.toggle('filters-open');
    const s = tb.querySelector('.search'); if (s) s.insertAdjacentElement('afterend', b); else tb.prepend(b);
  };
  const app = document.getElementById('app');
  // En celular, la primera vez que se dibuja el Gantt se centra en el mes actual (la app lo deja 420 px a la derecha, fuera de pantalla).
  let needCenter = window.innerWidth <= 700;
  const centerToday = () => { if (!needCenter) return; const g = document.querySelector('.gantt'); const td = document.querySelector('.ticks .today'); if (g && td) { g.scrollLeft = Math.max(0, td.offsetLeft - 190); needCenter = false; } };
  if (app) new MutationObserver(() => { ensureFiltersBtn(); setTimeout(centerToday, 60); clearTimeout(t); t = setTimeout(notify, 150); }).observe(app, { childList: true, subtree: true });
  ensureFiltersBtn();
  window.addEventListener('load', () => setTimeout(notify, 800));
})();
