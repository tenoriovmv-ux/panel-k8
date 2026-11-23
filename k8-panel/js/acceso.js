// ============================================================
// K8 Panel · Ingreso «Lector» / «Administrador» (23-11-2026, Vicente)
// - Lector: entra gratis y solo mira. No se guarda ningún cambio, no se suben archivos,
//   no se actualizan conexiones ni se envían correos. Los filtros y pestañas sí funcionan
//   (se recuerdan solo mientras dure la visita, en memoria).
// - Administrador: entra con la clave de Vicente y puede hacer todo, como siempre.
// La clave no se guarda escrita: se compara su huella SHA-256. Para cambiarla, reemplazar ACC_HASH
// por la huella de la clave nueva (en la consola: await accHuella('clave nueva')).
// Ojo: esto ordena quién edita; no es una caja fuerte. En una página publicada, los datos que se
// publiquen los puede descargar quien tenga el enlace.
// ============================================================
'use strict';

const ACC_KEY = 'k8panel:rol';
const ACC_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';   // «1234»
// Claves que son solo de vista (filtros, pestañas, menú plegado): el lector puede cambiarlas, pero quedan en memoria.
const ACC_UI = /^(nav_collapsed|vt_ui|pr_ui|mk_ui|cp_ui|inf_marca|inf_upd_seg|alerts_home|theme|est_products|est_synced_at)$/;

const Acceso = {
  rol() { try { const r = localStorage.getItem(ACC_KEY); return r === 'admin' || r === 'lector' ? r : ''; } catch { return 'lector'; } },
  lector() { return this.rol() === 'lector'; },
  entrar(rol) { try { localStorage.setItem(ACC_KEY, rol); } catch { /* sin storage */ } location.reload(); },
  salir() { try { localStorage.removeItem(ACC_KEY); } catch { /* sin storage */ } location.hash = '#/inicio'; location.reload(); },
  _mem: new Map(),     // lo que el lector cambia en filtros y pestañas (no se guarda)
  _arranque: false,    // mientras arranca el panel, los datos de ejemplo van a memoria sin aviso
  _aviso: 0,
  // Escrituras automáticas (sincronizar con el Gantt, etc.): como lector quedan en memoria y sin aviso
  silencio(fn) { if (!this.lector()) return fn(); const a = this._arranque; this._arranque = true; try { return fn(); } finally { this._arranque = a; } },
  avisar(msg = 'Modo lector: puedes mirar todo, pero no hacer cambios') {
    const t = Date.now(); if (t - this._aviso < 2500) return; this._aviso = t;
    if (typeof toast === 'function') toast(msg, true);
  },
};
async function accHuella(txt) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(txt)));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ---------- Bloqueo de escritura en modo lector ----------
if (Acceso.lector()) {
  document.documentElement.classList.add('lector');
  const rd = Store.read.bind(Store), wr = Store.write.bind(Store);
  Store.read = function (key, fallback) { return Acceso._mem.has(key) ? JSON.parse(Acceso._mem.get(key)) : rd(key, fallback); };
  Store.write = function (key, value) {
    if (ACC_UI.test(key) || Acceso._arranque) { Acceso._mem.set(key, JSON.stringify(value)); return; }
    Acceso.avisar();
  };
  void wr;   // la escritura real no se usa nunca como lector
  FileStore.put = () => { Acceso.avisar('Modo lector: no se pueden subir archivos'); return Promise.reject(new Error('modo lector')); };
  FileStore.del = () => { Acceso.avisar(); return Promise.reject(new Error('modo lector')); };
  // Selectores de archivo: no se abren
  const clk = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () { if (this.type === 'file') return Acceso.avisar('Modo lector: no se pueden subir archivos'); return clk.call(this); };
  document.addEventListener('click', e => { const i = e.target.closest && e.target.closest('input[type=file]'); if (i) { e.preventDefault(); Acceso.avisar('Modo lector: no se pueden subir archivos'); } }, true);
  document.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); Acceso.avisar('Modo lector: no se pueden subir archivos'); } }, true);
  // Llamadas al servidor que cambian algo (actualizar conexiones, guardar informes, registrar ventas): no se hacen
  const f0 = window.fetch.bind(window);
  const LEE = /\/api\/(informe\/excel|excel\/tabla)\b/;   // estas solo arman una descarga
  window.fetch = function (url, opt = {}) {
    const u = String(url && url.url || url); const m = String(opt.method || 'GET').toUpperCase();
    if (/\/api\//.test(u) && !LEE.test(u) && (m !== 'GET' || /actualizar|venta|auto/.test(u))) {
      if (!/informe\/auto/.test(u)) Acceso.avisar('Modo lector: las actualizaciones las hace el administrador');
      return Promise.resolve(new Response(JSON.stringify({ ok: false, lector: true, error: 'Modo lector' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }
    return f0(url, opt);
  };
  // Correos (mailto): el lector no envía nada a nombre del panel
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) { e.preventDefault(); Acceso.avisar(); } }, true);
}

// ---------- Pantalla de ingreso ----------
function accPantalla() {
  document.body.dataset.app = 'inicio';
  $('#app').innerHTML = `
  <div class="acc">
    <div class="acc-caja">
      <img class="acc-logo" src="assets/logo-k8.webp" alt="K8">
      <h1>Panel K8</h1>
      <p class="acc-sub">Elige cómo quieres entrar</p>
      <div class="acc-ops">
        <button class="acc-op" id="acc-lector" type="button">
          <span class="acc-ic">${ICON.eye(20)}</span>
          <b>Entrar como lector</b>
          <span>Puedes ver todo el panel. No se puede editar, cambiar datos ni subir archivos.</span>
          <em>Entrar ${ICON.chevR(14)}</em>
        </button>
        <form class="acc-op admin" id="acc-form" autocomplete="off">
          <span class="acc-ic">${ICON.gear(20)}</span>
          <b>Administrador</b>
          <span>Acceso completo para editar y actualizar.</span>
          <div class="acc-clave"><input id="acc-pass" type="password" inputmode="numeric" placeholder="Contraseña" aria-label="Contraseña de administrador"><button class="btn primary" type="submit">Entrar</button></div>
          <span class="acc-err" id="acc-err" role="alert"></span>
        </form>
      </div>
    </div>
  </div>`;
  $('#acc-lector').onclick = () => Acceso.entrar('lector');
  const fm = $('#acc-form'), inp = $('#acc-pass'), err = $('#acc-err');
  fm.onsubmit = async e => {
    e.preventDefault();
    let ok = false;
    try { ok = (await accHuella(inp.value)) === ACC_HASH; } catch { ok = false; }
    if (ok) return Acceso.entrar('admin');
    err.textContent = 'Contraseña incorrecta'; inp.value = ''; inp.focus();
    fm.classList.remove('mal'); void fm.offsetWidth; fm.classList.add('mal');
  };
}

// ---------- Publicar en la web (solo administrador, en el computador) ----------
// Manda al servidor local una foto de los datos de este navegador; el servidor arma la copia y la sube a GitHub.
function accPublicar() {
  const url = (() => { try { return JSON.parse(localStorage.getItem('k8pub:url') || '""'); } catch { return ''; } })();
  openModal(modalHtml('Publicar en la web', `<p class="sm">Se sube una <b>foto de los datos de hoy</b> (ventas, informes, productos, Estados, campañas) a la página web para compartir.</p>
    <p class="sm muted">Quien abra el link entra como <b>lector</b> y solo puede mirar. Lo que cambies después en el panel no aparece en la web hasta que vuelvas a publicar. Ojo: el link es público y los datos se pueden descargar.</p>
    ${url ? `<p class="sm">Link: <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></p>` : ''}<div class="sm b" id="pub-est"></div>`,
    `<button class="btn" data-close>Cerrar</button><button class="btn primary" id="pub-go">${ICON.upload(14)} Publicar ahora</button>`), { narrow: true, onMount: m => {
    const est = $('#pub-est', m), go = $('#pub-go', m);
    go.onclick = async () => {
      go.disabled = true; est.textContent = 'Preparando los datos…';
      const ls = {}; for (const k of Object.keys(localStorage)) if (/^(k8panel:|k8r_)/.test(k) && !/^k8panel:rol$|backup|respaldo/i.test(k)) ls[k] = localStorage.getItem(k);
      try {
        const r = await fetch('/api/publicar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ at: new Date().toISOString(), ls }) });
        const j = await r.json(); if (!j.ok) throw new Error(j.error || 'no se pudo');
      } catch (e) { est.textContent = 'No se pudo publicar: ' + e.message; go.disabled = false; return; }
      est.textContent = 'Subiendo a GitHub… (tarda 1 o 2 minutos)';
      for (let i = 0; i < 90; i++) {
        await new Promise(x => setTimeout(x, 2500));
        let s = {}; try { s = await (await fetch('/api/publicar/estado', { cache: 'no-store' })).json(); } catch { continue; }
        if (s.ok === true) { if (s.url) localStorage.setItem('k8pub:url', JSON.stringify(s.url)); est.innerHTML = `Listo ✓ ${esc(s.msg || '')}. La web se actualiza en 1 o 2 minutos más.${s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}`; go.disabled = false; return; }
        if (s.ok === false) { est.textContent = 'No se pudo publicar: ' + (s.msg || 'error'); go.disabled = false; return; }
        est.textContent = s.paso === 'subiendo' ? 'Subiendo a GitHub…' : 'Armando la copia…';
      }
      est.textContent = 'Sigue trabajando en segundo plano; revisa el link en unos minutos.'; go.disabled = false;
    };
  } });
}
