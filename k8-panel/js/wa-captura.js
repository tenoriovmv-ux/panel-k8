// ============================================================
// Panel K8 · captador de WhatsApp Business Web (versión 2).
// Corre DENTRO de la pestaña web.whatsapp.com (lo carga el script de
// Tampermonkey conectores/whatsapp.user.js, o Claude desde el navegador)
// y arma un resumen de los chats: nombre, etiquetas, mensajes por día,
// textos recibidos (para saber qué piden) y tiempos de respuesta.
// WhatsApp Web solo tiene en memoria los últimos mensajes de cada chat:
// k8WaBackfill() le pide a WhatsApp los anteriores (hasta DIAS días) la
// primera vez, para que los números del panel sean reales.
// No manda mensajes ni cambia nada en WhatsApp.
// ============================================================
(function () {
  'use strict';
  var DIAS = 90;           // días de historia que se intentan cargar y de textos que se guardan
  var MAX_TEXTOS = 40;     // textos recibidos por chat
  var LARGO_TEXTO = 240;   // largo máximo de cada texto
  var MAX_RESP = 40;       // tiempos de respuesta por chat

  // Dentro de Tampermonkey, "window" es una caja aislada: lo real de la página está en unsafeWindow.
  var W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
  function req(n) { try { return W.require(n); } catch (e) { return null; } }
  function colecciones() { var C = req('WAWebCollections'); if (!C || !C.Chat) throw new Error('No se encontraron las colecciones de WhatsApp Web (cambió la versión)'); return C; }
  function msgsDe(c) { try { return c.msgs && c.msgs.getModelsArray ? c.msgs.getModelsArray() : []; } catch (e) { return []; } }
  function esRuido(tipo) { return /notification|gp2|e2e|ciphertext|revoked|protocol|call_log/.test(tipo); }

  // Carga mensajes anteriores de los chats con movimiento en los últimos DIAS días, hasta cubrir ese período.
  // opts: { dias, maxChats, maxLlamadas, presupuestoMs, avisar(txt) }  → devuelve { chats, llamadas, ms, completos }
  function k8WaBackfill(opts) {
    opts = opts || {};
    var dias = opts.dias || DIAS, maxChats = opts.maxChats || 600, maxLlamadas = opts.maxLlamadas || 6, presupuesto = opts.presupuestoMs || 300000;
    var avisar = typeof opts.avisar === 'function' ? opts.avisar : function () { };
    var L = req('WAWebChatLoadMessages');
    if (!L || typeof L.loadEarlierMsgs !== 'function') return Promise.resolve({ chats: 0, llamadas: 0, ms: 0, completos: 0, error: 'WhatsApp Web no expone loadEarlierMsgs' });
    var C = colecciones();
    var desde = Math.floor(Date.now() / 1000) - dias * 86400;
    var lista = C.Chat.getModelsArray().filter(function (c) { return !c.isGroup && Number(c.t || 0) >= desde && !(c.id && /@broadcast$/.test(c.id._serialized || '')); })
      .sort(function (a, b) { return b.t - a.t; }).slice(0, maxChats);
    var t0 = Date.now(), i = 0, llamadas = 0, completos = 0;
    function masAntiguo(c) { var m = msgsDe(c); var t = 0; for (var k = 0; k < m.length; k++) { var x = Number(m[k].t || 0); if (x && (!t || x < t)) t = x; } return t; }
    function cubierto(c) { var t = masAntiguo(c); return c.noEarlierMsgs || (t && t <= desde); }
    return new Promise(function (resolve) {
      function paso() {
        if (i >= lista.length || Date.now() - t0 > presupuesto) return resolve({ chats: i, llamadas: llamadas, ms: Date.now() - t0, completos: completos, total: lista.length });
        var c = lista[i]; var n = 0;
        function cargar() {
          if (cubierto(c) || n >= maxLlamadas || Date.now() - t0 > presupuesto) { if (cubierto(c)) completos++; i++; if (i % 10 === 0) avisar('cargando historia: ' + i + ' de ' + lista.length + ' chats'); return setTimeout(paso, 40); }
          n++; llamadas++;
          var antes = msgsDe(c).length;
          Promise.resolve().then(function () { return L.loadEarlierMsgs({ chat: c }); })
            .then(function (r) { var ahora = msgsDe(c).length; if (ahora <= antes || !r || (Array.isArray(r) && !r.length)) { c.__k8sinMas = true; i++; return setTimeout(paso, 40); } setTimeout(cargar, 60); })
            .catch(function () { i++; setTimeout(paso, 120); });
        }
        cargar();
      }
      paso();
    });
  }

  function k8WaCaptura() {
    var C = colecciones();
    var labelsById = {};
    var labels = (C.Label && C.Label.getModelsArray ? C.Label.getModelsArray() : []).map(function (l) {
      var o = { id: String(l.id), name: l.name, color: l.colorIndex != null ? l.colorIndex : (l.color || 0), count: l.count || 0 };
      labelsById[o.id] = o.name; return o;
    });
    var ahora = Math.floor(Date.now() / 1000);
    var desde = ahora - DIAS * 86400;
    var chats = [];
    C.Chat.getModelsArray().forEach(function (c) {
      var id = c.id && c.id._serialized ? c.id._serialized : String(c.id || '');
      if (!id || id === 'status@broadcast' || /@broadcast$/.test(id)) return;
      var ct = c.contact || null;
      var phone = '';
      try {
        if (/@c\.us$/.test(id)) phone = id.replace(/@c\.us$/, '');
        else if (ct && ct.phoneNumber) phone = String(ct.phoneNumber._serialized || ct.phoneNumber).replace(/@.*$/, '');
      } catch (e) { phone = ''; }
      var msgs = msgsDe(c).filter(function (m) { return Number(m.t || 0) > 0 && !esRuido(String(m.type || '')); })
        .sort(function (a, b) { return Number(a.t) - Number(b.t); });
      var nIn = 0, nOut = 0, firstT = 0, firstInT = 0, lastInT = 0, lastOutT = 0, lastInText = '', textos = [], porDia = {};
      var respK8 = [], respCli = [], esperandoDesde = 0, esperandoCliDesde = 0, prevFromMe = null;
      msgs.forEach(function (m) {
        var t = Number(m.t); var tipo = String(m.type || ''); var fromMe = !!(m.id && m.id.fromMe);
        if (!firstT) firstT = t;
        var dia = new Date(t * 1000).toISOString().slice(0, 10);
        if (!porDia[dia]) porDia[dia] = { in: 0, out: 0 };
        if (fromMe) {
          nOut++; porDia[dia].out++; if (t > lastOutT) lastOutT = t;
          // K8 responde a un mensaje del cliente que estaba sin contestar
          if (esperandoDesde && t >= desde && respK8.length < MAX_RESP) respK8.push({ t: t, s: t - esperandoDesde });
          esperandoDesde = 0; if (prevFromMe !== true) esperandoCliDesde = t;
        } else {
          nIn++; porDia[dia].in++; if (!firstInT) firstInT = t;
          var body = tipo === 'chat' ? String(m.body || '') : (m.caption ? String(m.caption) : '[' + tipo + ']');
          if (t > lastInT) { lastInT = t; lastInText = body.slice(0, LARGO_TEXTO); }
          if (t >= desde && tipo === 'chat' && body.trim()) textos.push({ t: t, s: body.slice(0, LARGO_TEXTO) });
          if (esperandoCliDesde && t >= desde && respCli.length < MAX_RESP) respCli.push({ t: t, s: t - esperandoCliDesde });
          esperandoCliDesde = 0; if (prevFromMe !== false) esperandoDesde = t;
        }
        prevFromMe = fromMe;
      });
      textos.sort(function (a, b) { return b.t - a.t; }); textos = textos.slice(0, MAX_TEXTOS);
      var lbl = (c.labels || []).map(function (x) { return labelsById[String(x)] || String(x); });
      chats.push({
        id: id, phone: phone, name: c.formattedTitle || c.name || (ct && (ct.name || ct.pushname)) || phone || id,
        group: !!c.isGroup, business: !!(ct && (ct.isBusiness || ct.isEnterprise)), verified: (ct && ct.verifiedName) || '',
        myContact: !!(ct && ct.isMyContact), labels: lbl, unread: Number(c.unreadCount || 0), archived: !!c.archive, pinned: !!c.pin,
        t: Number(c.t || 0), first_t: firstT, first_in_t: firstInT, last_in_t: lastInT, last_out_t: lastOutT, n_in: nIn, n_out: nOut, loaded: msgs.length,
        hist_from: firstT, hist_complete: !!(c.noEarlierMsgs || c.__k8sinMas || (firstT && firstT <= desde)),
        waiting_since: esperandoDesde, last_in_text: lastInText, by_day: porDia, texts: textos, resp_k8: respK8, resp_cli: respCli
      });
    });
    chats.sort(function (a, b) { return b.t - a.t; });
    var me = '';
    try { var Conn = req('WAWebConnModel'); me = (Conn && Conn.Conn && Conn.Conn.wid && Conn.Conn.wid.user) || ''; } catch (e) { me = ''; }
    return { captured_at: new Date().toISOString(), version: 2, me: me, days_text: DIAS, labels: labels, chats: chats };
  }

  // ---- Comprobantes de pago ----
  // En los chats con etiqueta de venta (En Gestión, Compró, Vendido, Pagado…) busca las fotos y PDF que mandó el
  // cliente: suelen ser el comprobante de transferencia. El servidor del panel las lee (OCR) y suma el monto.
  var ETIQUETA_VENTA = /gesti[oó]n|compr[oó]|vendid|venta|pagad|pag[oó]/i;
  var MAX_BYTES = 8 * 1024 * 1024;
  var candidatosPorId = {};
  function k8WaCandidatos(yaEnviados) {
    var C = colecciones(); var ya = yaEnviados || {};
    var labelsById = {};
    (C.Label && C.Label.getModelsArray ? C.Label.getModelsArray() : []).forEach(function (l) { labelsById[String(l.id)] = l.name; });
    var desde = Math.floor(Date.now() / 1000) - DIAS * 86400; var out = []; candidatosPorId = {};
    C.Chat.getModelsArray().forEach(function (c) {
      if (c.isGroup) return;
      var lbl = (c.labels || []).map(function (x) { return labelsById[String(x)] || String(x); });
      if (!lbl.some(function (n) { return ETIQUETA_VENTA.test(n); })) return;
      var chatId = c.id && c.id._serialized ? c.id._serialized : String(c.id || '');
      msgsDe(c).forEach(function (m) {
        var tipo = String(m.type || ''); var mime = String(m.mimetype || '');
        if (m.id && m.id.fromMe) return;
        if (!(tipo === 'image' || (tipo === 'document' && /pdf|image/i.test(mime)))) return;
        if (Number(m.t || 0) < desde) return;
        var mid = m.id && m.id._serialized ? m.id._serialized : String(m.id || '');
        if (!mid || ya[mid]) return;
        if (Number(m.size || 0) > MAX_BYTES) return;
        candidatosPorId[mid] = m;
        out.push({ id: mid, chat_id: chatId, name: c.formattedTitle || c.name || '', phone: /@c\.us$/.test(chatId) ? chatId.replace(/@c\.us$/, '') : '', labels: lbl,
          t: Number(m.t), type: tipo, mimetype: mime, filename: String(m.filename || ''), caption: String(m.caption || '').slice(0, 300), size: Number(m.size || 0) });
      });
    });
    out.sort(function (a, b) { return b.t - a.t; });
    return out;
  }
  function aBase64(blob) {
    return new Promise(function (ok, mal) {
      var fr = new (W.FileReader || FileReader)();
      fr.onload = function () { var s = String(fr.result || ''); ok(s.slice(s.indexOf(',') + 1)); };
      fr.onerror = function () { mal(new Error('no se pudo leer el archivo')); };
      fr.readAsDataURL(blob);
    });
  }
  function blobDe(m) {
    try { var mb = m.mediaData && m.mediaData.mediaBlob; if (mb) { if (typeof mb.forceToBlob === 'function') return mb.forceToBlob(); if (mb._blob) return mb._blob; if (mb instanceof W.Blob) return mb; } } catch (e) { }
    return null;
  }
  // Baja el archivo de un candidato → Promise<{ b64, mimetype }>
  function k8WaBajar(mid) {
    var m = candidatosPorId[mid]; if (!m) return Promise.reject(new Error('mensaje no encontrado'));
    var b = blobDe(m); if (b) return Promise.resolve(b).then(aBase64).then(function (x) { return { b64: x, mimetype: m.mimetype }; });
    var DM = req('WAWebDownloadManager'); var dm = DM && (DM.downloadManager || DM.default || DM);
    var directo = (dm && typeof dm.downloadAndMaybeDecrypt === 'function') ? Promise.resolve().then(function () {
      return dm.downloadAndMaybeDecrypt({ directPath: m.directPath, encFilehash: m.encFilehash, filehash: m.filehash, mediaKey: m.mediaKey, mediaKeyTimestamp: m.mediaKeyTimestamp, type: m.type, signal: new W.AbortController().signal });
    }).then(function (buf) { return new W.Blob([new W.Uint8Array(buf)], { type: m.mimetype }); }) : Promise.reject(new Error('sin downloadManager'));
    return directo.catch(function () {
      // Plan B: que WhatsApp lo descargue como si se abriera la foto, y tomarlo de memoria
      if (typeof m.downloadMedia !== 'function') throw new Error('WhatsApp Web no deja bajar el archivo');
      return Promise.resolve(m.downloadMedia({ downloadEvenIfExpensive: true, rmrReason: 1, isUserInitiated: true })).then(function () {
        return new Promise(function (ok, mal) { var n = 0; (function esperar() { var x = blobDe(m); if (x) return ok(x); if (++n > 40) return mal(new Error('la descarga no terminó')); setTimeout(esperar, 250); })(); });
      });
    }).then(function (blob) { return Promise.resolve(blob).then(aBase64).then(function (x) { return { b64: x, mimetype: m.mimetype }; }); });
  }

  window.k8WaCaptura = k8WaCaptura; window.k8WaBackfill = k8WaBackfill; window.k8WaCandidatos = k8WaCandidatos; window.k8WaBajar = k8WaBajar;
  try { W.k8WaCaptura = k8WaCaptura; W.k8WaBackfill = k8WaBackfill; W.k8WaCandidatos = k8WaCandidatos; W.k8WaBajar = k8WaBajar; } catch (e) { }
})();
