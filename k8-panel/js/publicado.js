// ============================================================
// K8 Panel · Versión publicada en la web (GitHub Pages) — 23-11-2026
// Este archivo SOLO se carga en la copia publicada (lo inyecta conectores/publicar-web.ps1); en el computador no se usa.
// 1) Carga la «foto» de los datos (data/foto.js → window.K8_FOTO) en este navegador, una vez por foto nueva.
// 2) No hay servidor: las llamadas a /api/ (actualizar, armar Excel, etc.) responden «solo en el computador de K8».
// ============================================================
(function () {
  'use strict';
  window.K8_PUBLICADO = true;
  document.documentElement.classList.add('publicado');
  var F = window.K8_FOTO;
  try {
    if (F && F.at && F.ls && localStorage.getItem('k8pub:at') !== F.at) {
      Object.keys(localStorage).forEach(function (k) {
        if (/^(k8panel:|k8r_)/.test(k) && k !== 'k8panel:rol') localStorage.removeItem(k);
      });
      Object.keys(F.ls).forEach(function (k) { try { localStorage.setItem(k, F.ls[k]); } catch (e) { /* sin espacio */ } });
      localStorage.setItem('k8pub:at', F.at);
    }
  } catch (e) { /* sin almacenamiento */ }
  var f0 = window.fetch.bind(window);
  window.fetch = function (url, opt) {
    var u = String(url && url.url || url);
    if (/(^|\/)api\//.test(u)) {
      return Promise.resolve(new Response(JSON.stringify({ ok: false, publicado: true, error: 'Disponible solo en el computador de K8' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }));
    }
    return f0(url, opt);
  };
})();
