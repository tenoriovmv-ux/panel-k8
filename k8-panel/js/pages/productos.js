document.addEventListener('k8estados', () => { syncWithEstados(); const r = Router.parse(); if (r.app === 'productos' || r.app === 'inicio') render(); });// ============================================================
// Productos · Lista y ficha, Documentos (Drive), Recursos
// ============================================================
'use strict';

const PR = Store.read('pr_ui', {}) || {};
PR.kind = PR.kind || 'prenda'; PR.q = PR.q || ''; PR.line = PR.line || ''; PR.type = PR.type || ''; PR.tab = PR.tab || 'docs';
PR.docLine = PR.docLine || ''; PR.docProd = PR.docProd || '';
const prSave = () => Store.write('pr_ui', PR);

const KINDS = [['prenda', 'Prendas'], ['tela', 'Telas'], ['insumo', 'Insumos']];
const kindName = k => KINDS.find(x => x[0] === k)?.[1] || k;
const prodById = id => Store.list('products').find(p => p.id === id);

// ---------- Vínculo con el Gantt (Estados y Reposiciones) ----------
// El Gantt es la fuente de verdad de la ETAPA. Un producto del panel queda vinculado por estId
// (se busca por código o por nombre). Si está vinculado, la etapa se lee y se escribe allá.
const normName = s => String(s || '').normalize('NFD').replace(/[0300-036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const estOf = p => { if (!p || typeof estadosProducts !== 'function') return null; const list = estadosProducts(); return (p.estId && list.find(e => e.id === p.estId)) || (p.code && list.find(e => normName(e.code) === normName(p.code))) || list.find(e => normName(e.name) === normName(p.name)) || null; };
const stageOfProduct = p => { const e = estOf(p); return e ? e.stage : p.stage; };
const COLOR_HEX = [['naranjo', '#FF6A00'], ['amarillo', '#E5FF00'], ['azul marino', '#1E2A5A'], ['marino', '#1E2A5A'], ['azul rey', '#1E40AF'], ['azul', '#2B5FD9'], ['celeste', '#4A9FD8'], ['negro', '#111111'], ['blanco', '#F5F5F5'], ['gris', '#888888'], ['verde', '#2E8B7A'], ['rojo', '#C62828'], ['beige', '#D9C9A8'], ['cafe', '#6B4A2B'], ['burdeo', '#6D1B2B'], ['morado', '#6D28D9'], ['rosado', '#EC6FB0']];
const colorHex = n => (COLOR_HEX.find(([k]) => normName(n).includes(k)) || [0, '#777777'])[1];
const estToProduct = e => ({ id: uid(), estId: e.id, code: e.code, name: e.name, kind: 'prenda', line: e.line || 'Global', type: e.garment || '', stage: e.stage, colors: String(e.colors || '').split(/[,/]/).map(s => s.trim()).filter(Boolean).map(n => ({ n, hex: colorHex(n) })), sizes: String(e.sizes || '').split(/[,s]+/).filter(Boolean), composition: e.composition || '', weight: '', docs: [], photos: [], since: todayIso() });
/** Vincula los productos del panel con los del Gantt e importa los que falten. Devuelve {linked, imported}. */
function syncWithEstados() {
  const list = typeof estadosProducts === 'function' ? estadosProducts() : [];
  if (!list.length) return { linked: 0, imported: 0, empty: true };
  const prods = Store.list('products'); let linked = 0, imported = 0;
  prods.forEach(p => { if (p.kind !== 'prenda') return; const e = estOf(p); if (e && p.estId !== e.id) { p.estId = e.id; p.code = p.code || e.code; linked++; } });
  list.forEach(e => { if (!prods.some(p => p.estId === e.id)) { prods.push(estToProduct(e)); imported++; } });
  // Las prendas son exactamente las del Gantt: las que no están allá se quitan (telas e insumos se conservan).
  const seen = new Set();
  const kept = prods.filter(p => { if (p.kind !== 'prenda') return true; if (!list.some(e => e.id === p.estId) || seen.has(p.estId)) return false; seen.add(p.estId); return true; });
  const removed = prods.length - kept.length;
  Acceso.silencio(() => Store.write('products', kept)); return { linked, imported, removed };   // automático: el lector lo ve, pero no se guarda
}
document.addEventListener('k8estados', () => { const r = Router.parse(); if (r.app === 'productos' || r.app === 'inicio') render(); });

// Documentos: un producto guarda docs como objetos {type, version, by, date, file}. Los antiguos (texto) se normalizan.
const docOf = (d, p) => typeof d === 'string' ? { type: d, version: 1, by: 't.sanchez', date: p.since || todayIso(), file: '' } : d;
const prodDocs = p => (p.docs || []).map(d => docOf(d, p));
const neededDocs = p => p.kind === 'prenda' ? DOC_TYPES.flatMap(d => DOC_PER_COLOR.includes(d) ? p.colors.map(c => `${d} · ${c.n}`) : [d]) : ['Ficha técnica'];
const missingOf = p => neededDocs(p).filter(d => !prodDocs(p).some(x => x.type === d));
const photoHtml = (p, cls = '') => p.photos?.[0] ? `<img src="${p.photos[0]}" alt="" class="${cls}">` : ICON.shirt(56);
const lineChip = l => chip(lineOf(l).name, lineOf(l).c);
const stageChip = n => chip(stageOf(n).name, stageOf(n).c);
const colorDot = c => `<span class="chip"><i style="background:${c.hex};border:1px solid rgba(0,0,0,.15)"></i>${esc(c.n)}</span>`;

function readImage(file, cb) {
  const r = new FileReader();
  r.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 720 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = img.width * s; cv.height = img.height * s; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); cb(cv.toDataURL('image/jpeg', .82)); }; img.src = r.result; };
  r.readAsDataURL(file);
}

// ---------- Formulario de producto ----------
function productModal(prod, kind = PR.kind) {
  const p = prod || { name: '', kind, line: kind === 'tela' ? 'Fabrics' : 'Workwear', type: kind === 'prenda' ? 'Top' : kind === 'tela' ? 'Tela' : 'Insumo', stage: 0, colors: [], sizes: kind === 'prenda' ? ['S', 'M', 'L', 'XL', 'XXL'] : [], composition: '', weight: '', docs: [], photos: [], since: todayIso() };
  let colors = p.colors.map(c => ({ ...c }));
  const colorRows = () => colors.map((c, i) => `<div class="row" style="margin-bottom:6px"><input type="color" value="${c.hex}" data-chex="${i}" style="width:36px;height:34px;border:1px solid var(--line);border-radius:8px;background:none;padding:2px"><input class="input" value="${esc(c.n)}" data-cname="${i}" placeholder="Nombre del color"><button type="button" class="icon-btn sm" data-cdel="${i}">${ICON.x(12)}</button></div>`).join('');
  const lines = Store.read('lines_extra', []);
  openModal(modalHtml(prod ? 'Editar ficha' : `Nuevo ${kindName(kind).toLowerCase().replace(/s$/, '')}`, `
    <div class="form-grid">
      <div class="field full"><label>Nombre *</label><input class="input" id="pd-name" value="${esc(p.name)}" placeholder="Ej: Chaqueta StormFlex"></div>
      <div class="field"><label>Categoría</label><select class="select" id="pd-kind">${KINDS.map(([k, l]) => `<option value="${k}" ${p.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Línea</label><select class="select" id="pd-line">${[...LINES.map(l => l.id), ...lines].map(l => `<option value="${l}" ${p.line === l ? 'selected' : ''}>${lineOf(l).name}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo</label><input class="input" id="pd-type" value="${esc(p.type)}" placeholder="Top, Bottom, Full Body, Accesorio…" list="pd-types"><datalist id="pd-types">${['Top', 'Bottom', 'Full Body', 'Accesorio', 'Tela', 'Cierre', 'Hilo', 'Cinta', 'Botón', 'Etiqueta'].map(t => `<option value="${t}">`).join('')}</datalist></div>
      <div class="field"><label>Etapa</label><select class="select" id="pd-stage">${STAGES.map(s => `<option value="${s.n}" ${p.stage === s.n ? 'selected' : ''}>${s.n} · ${s.name}</option>`).join('')}</select><div class="hint">Es la misma etapa que ve Estados y Reposiciones.</div></div>
      <div class="field"><label>Composición</label><input class="input" id="pd-comp" value="${esc(p.composition)}" placeholder="94% poliéster, 6% elastano"></div>
      <div class="field"><label>Gramaje (g/m²)</label><input class="input" id="pd-weight" value="${esc(p.weight)}" placeholder="180"></div>
      <div class="field full"><label>Tallas (separadas por coma)</label><input class="input" id="pd-sizes" value="${esc(p.sizes.join(', '))}" placeholder="S, M, L, XL, XXL"></div>
      <div class="field full"><label>Colores</label><div id="pd-colors">${colorRows()}</div><button type="button" class="btn sm" id="pd-addc">${ICON.plus(12)} Agregar color</button></div>
      <div class="field full"><label>Foto</label><input class="input" type="file" accept="image/*" id="pd-photo"><div class="hint">Se guarda reducida para que cargue rápido.</div></div>
    </div>
  `, `${prod ? `<button class="btn ghost danger" id="pd-del">${ICON.trash(14)} Eliminar</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pd-save">${prod ? 'Guardar' : 'Crear'}</button>`), {
    onMount(m) {
      let photo = null;
      const bindColors = () => {
        $$('[data-chex]', m).forEach(i => i.oninput = () => colors[+i.dataset.chex].hex = i.value);
        $$('[data-cname]', m).forEach(i => i.oninput = () => colors[+i.dataset.cname].n = i.value);
        $$('[data-cdel]', m).forEach(b => b.onclick = () => { colors.splice(+b.dataset.cdel, 1); $('#pd-colors', m).innerHTML = colorRows(); bindColors(); });
      };
      bindColors();
      $('#pd-addc', m).onclick = () => { colors.push({ n: '', hex: '#333333' }); $('#pd-colors', m).innerHTML = colorRows(); bindColors(); };
      $('#pd-photo', m).onchange = e => { const f = e.target.files[0]; if (f) readImage(f, d => { photo = d; toast('Foto cargada'); }); };
      $('#pd-save', m).onclick = () => {
        const name = $('#pd-name', m).value.trim(); if (!name) return toast('Escribe el nombre', true);
        const row = { ...p, id: p.id || uid(), name, kind: $('#pd-kind', m).value, line: $('#pd-line', m).value, type: $('#pd-type', m).value.trim(), stage: Number($('#pd-stage', m).value), composition: $('#pd-comp', m).value.trim(), weight: $('#pd-weight', m).value.trim(), sizes: $('#pd-sizes', m).value.split(',').map(s => s.trim()).filter(Boolean), colors: colors.filter(c => c.n.trim()) };
        if (photo) row.photos = [photo];
        if (prod && prod.stage !== row.stage) { logProd(row, `Etapa cambiada a ${stageOf(row.stage).name}`); const est = estOf(prod); if (est) estadosSetStage(est.id, row.stage); }
        try { Store.upsert('products', row); } catch { return toast('No se pudo guardar (foto muy grande)', true); }
        if (!prod) logProd(row, 'Producto creado');
        closeModal(); toast('Ficha guardada'); if (!prod) Router.go(`productos/lista/${row.id}`); else render();
      };
      const del = $('#pd-del', m); if (del) del.onclick = () => confirmBox(`¿Eliminar «${esc(p.name)}» y sus documentos?`, () => { Store.remove('products', p.id); closeModal(); Router.go('productos/lista'); });
    },
  });
}
function logProd(p, text) { const log = Store.list('prod_activity'); log.unshift({ id: uid(), pid: p.id, text, at: new Date().toISOString(), who: personOf(ME.id).short }); Store.write('prod_activity', log.slice(0, 300)); }

function lineModal() {
  openModal(modalHtml('Nueva línea', `<div class="field"><label>Nombre de la línea</label><input class="input" id="ln-name" placeholder="Ej: Safety"></div><div class="hint">Las líneas base (Workwear, Outdoor, Corporate, Clinic, Global, K8 Fabrics) tienen su color de marca; las nuevas usan gris hasta que se defina.</div>`, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ln-save">Crear</button>`), { narrow: true, onMount(m) { $('#ln-save', m).onclick = () => { const n = $('#ln-name', m).value.trim(); if (!n) return; const ls = Store.read('lines_extra', []); if (!ls.includes(n)) ls.push(n); Store.write('lines_extra', ls); closeModal(); toast('Línea creada'); render(); }; } });
}

// ---------- Subir documento ----------
function docModal(p, presetType = '') {
  const existing = prodDocs(p).find(d => d.type === presetType);
  const types = [...new Set([...neededDocs(p), ...prodDocs(p).map(d => d.type), 'Ficha comercial', 'Recursos gráficos', 'Otro'])];
  openModal(modalHtml(existing ? `Nueva versión · ${esc(presetType)}` : 'Subir documento', `
    <div class="field"><label>Producto</label><input class="input" value="${esc(p.name)}" disabled></div>
    <div class="field"><label>Tipo de documento</label><select class="select" id="dc-type">${types.map(t => `<option ${t === presetType ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><label>Archivo</label><input class="input" type="file" id="dc-file" accept=".pdf,.ai,.png,.jpg,.jpeg,.xlsx,.docx"><div class="hint">PDF recomendado. ${existing ? `Reemplaza a la versión v${existing.version} (queda en el historial).` : ''}</div></div>
    <div class="field"><label>Nota de versión (opcional)</label><input class="input" id="dc-note" placeholder="Ej: corregido logo en etiqueta"></div>
  `, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="dc-save">${ICON.upload(14)} Subir</button>`), {
    narrow: true,
    onMount(m) {
      $('#dc-save', m).onclick = async () => {
        const f = $('#dc-file', m).files[0]; const type = $('#dc-type', m).value;
        const prev = prodDocs(p).find(d => d.type === type);
        const docs = prodDocs(p).filter(d => d.type !== type);
        const version = prev ? prev.version + 1 : 1;
        let fileKey = '';
        if (f) { fileKey = `doc:${p.id}:${normName(type)}:v${version}`; try { await FileStore.put(fileKey, f); } catch (e) { fileKey = ''; toast('El archivo no se pudo guardar en este navegador; queda solo el nombre', true); } }
        const hist = Store.list('doc_history'); if (prev) { hist.unshift({ id: uid(), pid: p.id, ...prev }); Store.write('doc_history', hist.slice(0, 500)); }
        docs.push({ type, version, by: personOf(ME.id).short, date: todayIso(), file: f ? f.name : '', fileKey, note: $('#dc-note', m).value.trim() });
        Store.upsert('products', { ...p, docs }); logProd(p, `${prev ? 'Nueva versión' : 'Subido'}: ${type}${f ? ' (' + f.name + ')' : ''}`);
        closeModal(); toast(f ? 'Documento subido' : 'Documento registrado (sin archivo)'); render();
      };
    },
  });
}

// ---------- Lista ----------
function productosLista() {
  const all = Store.list('products'); const q = PR.q.toLowerCase();
  const rows = all.filter(p => p.kind === PR.kind && (!PR.line || p.line === PR.line) && (!PR.type || p.type === PR.type) && (!q || p.name.toLowerCase().includes(q) || p.colors.some(c => c.n.toLowerCase().includes(q))));
  const types = [...new Set(all.filter(p => p.kind === PR.kind).map(p => p.type))].sort();
  const linesUsed = [...new Set(all.filter(p => p.kind === PR.kind).map(p => p.line))];
  return `
  <div class="page-head"><div><h1>Productos</h1><p>Información centralizada del equipo K8: prendas, telas e insumos.</p></div>
    <div class="actions"><button class="btn" id="pr-stock" title="Stock desde Manager">${ICON.box(14)} Stock Manager</button><button class="btn" id="pr-xls">${ICON.download(14)} Descargar mix (Excel)</button><button class="btn" id="pr-sync" title="Vincula e importa los productos del Gantt de Estados">${ICON.link(14)} Sincronizar con Gantt</button><button class="btn" id="pr-line">${ICON.plus(14)} Nueva línea</button><button class="btn primary" id="pr-new">${ICON.plus(14)} Nuevo ${kindName(PR.kind).toLowerCase().replace(/s$/, '')}</button></div></div>
  <div class="row wrap no-print" style="margin:0 4px 14px">
    <div class="seg">${KINDS.map(([k, l]) => `<button class="${PR.kind === k ? 'on' : ''}" data-kind="${k}">${l} <span class="chip" style="padding:0 6px;margin-left:4px">${all.filter(p => p.kind === k).length}</span></button>`).join('')}</div>
    <label class="search" style="max-width:300px">${ICON.search(14)}<input id="pr-q" placeholder="Buscar producto o color…" value="${esc(PR.q)}"></label>
    <select class="select" id="pr-fline" style="width:170px"><option value="">Todas las líneas</option>${linesUsed.map(l => `<option value="${l}" ${PR.line === l ? 'selected' : ''}>${lineOf(l).name}</option>`).join('')}</select>
    <select class="select" id="pr-ftype" style="width:160px"><option value="">Todos los tipos</option>${types.map(t => `<option ${PR.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <span class="spacer"></span><span class="sm muted">${rows.length} ${rows.length === 1 ? 'producto' : 'productos'}</span>
  </div>
  <div class="prod-grid">${rows.map(p => { const miss = missingOf(p).length; return `<div class="prod" data-open="${p.id}">
    <div class="ph">${photoHtml(p)}<span class="line-tag">${lineChip(p.line)}</span></div>
    <div class="body">
      <div class="row wrap" style="gap:6px">${p.type ? `<span class="chip">${esc(p.type)}</span>` : ''}${stageChip(stageOfProduct(p))}${estOf(p) ? `<span class="chip" title="Etapa sincronizada con el Gantt">${ICON.gantt(10)} Gantt</span>` : ''}</div>
      <b>${esc(p.name)}</b>
      <div class="row wrap" style="gap:4px"><span class="xs muted">${p.colors.length} ${p.colors.length === 1 ? 'color' : 'colores'}</span>${p.colors.slice(0, 3).map(colorDot).join('')}${p.colors.length > 3 ? `<span class="xs muted">+${p.colors.length - 3}</span>` : ''}</div>
      <div class="row" style="margin-top:4px"><span class="sm" style="color:var(--accent);font-weight:700">${Acceso.lector() ? 'Ver ficha' : 'Editar ficha'}</span><span class="spacer"></span>${miss ? `<span class="xs warn b">${ICON.alert(11)} ${miss} doc.</span>` : `<span class="xs ok b">${ICON.check(11)} Completo</span>`}</div>
    </div></div>`; }).join('') || empty('Sin productos', 'Crea el primero con el botón de arriba')}</div>`;
}
function bindLista(el) {
  $$('[data-kind]', el).forEach(b => b.onclick = () => { PR.kind = b.dataset.kind; PR.type = ''; prSave(); render(); });
  $('#pr-q', el).oninput = e => { PR.q = e.target.value; prSave(); const v = e.target.value; render(); const n = $('#pr-q'); n.focus(); n.setSelectionRange(v.length, v.length); };
  $('#pr-fline', el).onchange = e => { PR.line = e.target.value; prSave(); render(); };
  $('#pr-ftype', el).onchange = e => { PR.type = e.target.value; prSave(); render(); };
  $('#pr-new', el).onclick = () => productModal(null, PR.kind);
  $('#pr-line', el).onclick = lineModal;
  if (typeof estadosHost === 'function') estadosHost();
  seedExampleDoc();
  $('#pr-sync', el).onclick = () => { const r = syncWithEstados(); if (r.empty) { toast('El Gantt aún no envió sus productos; espera unos segundos', true); estadosSync(); return; } toast(`${r.imported} importados · ${r.linked} vinculados · ${r.removed} quitados`); render(); };
  $('#pr-stock', el).onclick = () => openModal(modalHtml('Stock Manager', `<p class="sm muted">El stock por talla y bodega se leerá desde Manager cuando esté la conexión. Mientras tanto puedes subir el informe de ventas de Manager en Estados › Análisis.</p>${pendingChip('Manager: pendiente de conexión')}`, `<button class="btn" data-close>Cerrar</button>`), { narrow: true });
  $('#pr-xls', el).onclick = () => {
    const rows = Store.list('products').map(p => [kindName(p.kind), p.name, lineOf(p.line).name, p.type, `${p.stage} · ${stageOf(p.stage).name}`, p.colors.map(c => c.n).join(' / '), p.sizes.join(' '), p.composition, p.weight, missingOf(p).length]);
    const csv = [['Categoría', 'Producto', 'Línea', 'Tipo', 'Etapa', 'Colores', 'Tallas', 'Composición', 'Gramaje', 'Docs faltantes'], ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `K8_MIX_${todayIso()}.csv`; a.click(); toast('Mix descargado');
  };
  $$('[data-open]', el).forEach(c => c.onclick = () => Router.go(`productos/lista/${c.dataset.open}`));
}

// ---------- Ficha ----------
function productoFicha(id) {
  const p0 = prodById(id); if (!p0) return empty('Producto no encontrado');
  const est = estOf(p0); const p = { ...p0, stage: stageOfProduct(p0) };
  const docs = prodDocs(p).sort((a, b) => a.type.localeCompare(b.type)); const miss = missingOf(p);
  const log = Store.list('prod_activity').filter(l => l.pid === p.id).slice(0, 20);
  const hist = Store.list('doc_history').filter(h => h.pid === p.id);
  const since = daysBetween(p.since || todayIso(), todayIso());
  const stageBlock = `<div class="card" style="margin-top:14px"><div class="row" style="margin-bottom:10px"><h3>Etapa</h3><span class="spacer"></span><span class="xs muted">desde hace ${since} días</span></div>
    <div class="list">${STAGES.map(s => `<div class="list-item" style="padding:6px 4px;${s.n === p.stage ? '' : 'opacity:.6'}"><span class="av" style="background:${s.n < p.stage ? 'var(--ok)' : s.n === p.stage ? s.c : 'var(--line)'};color:${s.n <= p.stage ? '#fff' : 'var(--muted)'};width:24px;height:24px">${s.n < p.stage ? ICON.check(12) : s.n}</span><div><div class="sm b">${s.name}</div>${s.n === p.stage ? '<div class="xs muted">Etapa actual</div>' : ''}</div></div>`).join('')}</div>
    <select class="select no-print" id="pf-stage" style="margin-top:10px">${STAGES.map(s => `<option value="${s.n}" ${s.n === p.stage ? 'selected' : ''}>${s.n} · ${s.name}</option>`).join('')}</select>
    <div class="hint" style="margin-top:6px">${est ? `${ICON.link(11)} Vinculado al Gantt (${esc(est.code || est.name)}): la etapa se lee y se cambia allá.` : 'Sin vínculo con el Gantt: la etapa queda solo en Productos. Usa «Sincronizar con Gantt» en la lista.'}</div></div>`;
  const tab = PR.tab;
  const tabContent = tab === 'docs' ? `
      <div class="row no-print" style="margin-bottom:10px"><button class="btn sm" id="pf-zip">${ICON.download(13)} Descargar todo (ZIP)</button><span class="xs muted">Solo la versión vigente de cada documento.</span><span class="spacer"></span><button class="btn primary sm" id="pf-doc">${ICON.upload(13)} Subir documento</button></div>
      <div class="grid" style="gap:8px">${docs.map(d => `<div class="doc-row"><span class="di">${ICON.pdf(16)}</span><div style="flex:1;min-width:0"><div class="b sm">${esc(d.type)}</div><div class="xs muted">v${d.version} vigente · ${esc(d.by)} · ${fmtDate(d.date)}${d.file ? ' · ' + esc(d.file) : ' · sin archivo adjunto'}${d.note ? ' · ' + esc(d.note) : ''}</div></div>${d.fileKey ? `<button class="btn sm no-print" data-dview="${esc(d.fileKey)}" data-dname="${esc(d.file)}">${ICON.eye(12)} Ver</button>` : ''}<button class="btn sm no-print" data-dver="${esc(d.type)}">Nueva versión</button><button class="btn sm no-print" data-ddl="${esc(d.fileKey || '')}" data-dname="${esc(d.file)}">${ICON.download(12)} Descargar</button><button class="icon-btn sm no-print" data-ddel="${esc(d.type)}" title="Eliminar">${ICON.trash(12)}</button></div>`).join('') || empty('Sin documentos aún')}</div>
      ${miss.length ? `<div class="row wrap" style="margin-top:14px"><span class="sm muted">Faltan por subir:</span>${miss.map(d => `<button class="chip-btn no-print" data-dnew="${esc(d)}">${ICON.plus(11)} ${esc(d)}</button>`).join('')}</div>` : `<div class="sm ok b" style="margin-top:14px">${ICON.check(13)} Documentación completa</div>`}
      ${hist.length ? `<details style="margin-top:14px"><summary class="sm muted" style="cursor:pointer">Versiones anteriores (${hist.length})</summary><div class="list">${hist.map(h => `<div class="list-item sm"><span class="muted">v${h.version}</span><b>${esc(h.type)}</b><span class="muted">${esc(h.by)} · ${fmtDate(h.date)}${h.file ? ' · ' + esc(h.file) : ''}</span></div>`).join('')}</div></details>` : ''}
      <div class="row no-print" style="margin-top:16px"><button class="btn dark" id="pf-mail">${ICON.mail(14)} Avisar por correo</button><span class="xs muted">Envía el aviso de documento actualizado al equipo y a los vendedores.</span></div>`
    : tab === 'muestras' ? `${empty('Muestras', '<div class="sm">Las rondas de muestra (reloj de 10 días, aprobar / rechazar) se gestionan en <b>Estados y Reposiciones › Muestras</b>.</div>')}<div style="margin-top:10px"><button class="btn" data-go="estados/muestras">Ir a Muestras ${ICON.arrow(13)}</button></div>`
    : tab === 'repos' ? `${empty('Pedidos y reposiciones', '<div class="sm">Pedido inicial, reposiciones, fechas CHI y llegada real se llevan en <b>Estados y Reposiciones</b>.</div>')}<div style="margin-top:10px"><button class="btn" data-go="estados/reposiciones">Ir a Pedidos y reposiciones ${ICON.arrow(13)}</button></div>`
    : `<div class="list">${log.map(l => `<div class="list-item sm"><span class="muted" style="width:120px">${new Date(l.at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span>${esc(l.text)}</span><span class="spacer"></span>${avatar(l.who)}</div>`).join('') || empty('Sin actividad registrada')}</div>`;
  return `
  <div class="row no-print" style="margin:0 4px 10px"><button class="btn ghost sm" data-go="productos/lista">${ICON.chevL(13)} Volver</button></div>
  <div class="grid" style="grid-template-columns:300px 1fr;align-items:start">
    <div>
      <div class="card flat" style="padding:0;overflow:hidden"><div class="ph" style="aspect-ratio:1;display:grid;place-items:center;background:var(--card-2);position:relative">${p.photos?.[0] ? `<img src="${p.photos[0]}" style="width:100%;height:100%;object-fit:cover">` : `<span style="opacity:.3">${ICON.shirt(72)}</span>`}<label class="btn sm no-print" style="position:absolute;right:10px;bottom:10px;cursor:pointer">${ICON.image(13)} Cambiar<input type="file" accept="image/*" id="pf-photo" hidden></label></div></div>
      ${stageBlock}
    </div>
    <div>
      <div class="row wrap" style="margin-bottom:4px"><h1>${esc(p.name)}</h1><span class="spacer"></span><button class="btn sm no-print" id="pf-edit">${ICON.edit(13)} Editar ficha</button></div>
      <div class="row wrap" style="margin-bottom:14px">${lineChip(p.line)}${p.type ? `<span class="chip">${esc(p.type)}</span>` : ''}${stageChip(p.stage)}${miss.length ? chip(`Faltan ${miss.length} documentos`, 'var(--warn)') : chip('Documentación completa', 'var(--ok)')}</div>
      <div class="grid g3" style="margin-bottom:14px">
        ${[['Ficha comercial', docs.find(d => d.type === 'Ficha comercial') ? 'Cargada' : 'Aún no cargada', 'Ficha comercial', ICON.doc(16), 'var(--app-estados)'], ['Recursos gráficos', 'Redes sociales y WhatsApp', 'Recursos gráficos', ICON.image(16), 'var(--app-marketing)'], ['Fotografía', `${p.photos?.length || 0} fotos cargadas`, '', ICON.shirt(16), 'var(--ok)']].map(([t, s, dt, ic, c]) => `<div class="card flat" style="border-bottom:3px solid ${c}"><span class="icon-btn sm" style="color:${c}">${ic}</span><div class="b" style="margin-top:10px">${t}</div><div class="xs muted" style="margin:2px 0 10px">${s}</div>${dt ? `<button class="btn sm no-print" data-dnew="${dt}">${ICON.upload(12)} Cargar</button>` : `<label class="btn sm no-print" style="cursor:pointer">${ICON.upload(12)} Cargar<input type="file" accept="image/*" class="pf-photo2" hidden></label>`}</div>`).join('')}
      </div>
      <div class="card" style="margin-bottom:14px"><div class="row" style="margin-bottom:8px"><h3>Stock disponible</h3><span class="spacer"></span><span class="xs muted">por talla · Manager</span></div>
        <div class="row" style="margin-bottom:10px"><span class="num" style="font-size:22px">${CONN.manager ? '0' : '—'}</span><span class="sm muted">unidades en bodega</span>${CONN.manager ? '' : pendingChip('Manager: pendiente de conexión')}</div>
        ${p.sizes.length ? `<div class="grid" style="grid-template-columns:repeat(${Math.min(6, p.sizes.length)},1fr);gap:8px">${p.sizes.map(s => `<div class="card flat" style="padding:8px;text-align:center"><div class="xs muted b">${esc(s)}</div><div class="num" style="font-size:18px">—</div></div>`).join('')}</div>` : ''}
      </div>
      <div class="card" style="margin-bottom:14px"><div class="row" style="margin-bottom:8px"><h3>Ficha del producto</h3><span class="spacer"></span><button class="btn sm no-print" id="pf-edit2">${ICON.edit(12)} Editar</button></div>
        <table class="table"><tr><td class="muted" style="width:120px">Composición</td><td>${esc(p.composition) || '—'}</td><td class="muted" style="width:90px">Gramaje</td><td>${esc(p.weight) || '—'}</td></tr>
        <tr><td class="muted">Tallas</td><td colspan="3">${p.sizes.join(' · ') || '—'}</td></tr>
        <tr><td class="muted">Colores</td><td colspan="3"><div class="row wrap">${p.colors.map(colorDot).join('') || '—'}</div></td></tr></table></div>
      <div class="card">
        <div class="tabs" style="margin:0 0 14px">${[['docs', `Documentos <span class="count">${docs.length}</span>`], ['muestras', 'Muestras'], ['repos', 'Reposiciones'], ['act', 'Actividad']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-ptab="${k}">${l}</button>`).join('')}</div>
        ${tabContent}
      </div>
    </div>
  </div>`;
}
function bindFicha(el, id) {
  const p = prodById(id); if (!p) return;
  $$('[data-ptab]', el).forEach(b => b.onclick = () => { PR.tab = b.dataset.ptab; prSave(); render(); });
  $$('#pf-edit, #pf-edit2', el).forEach(b => b.onclick = () => productModal(p));
  $('#pf-stage', el).onchange = e => { const n = Number(e.target.value); const est = estOf(p); logProd(p, `Etapa cambiada a ${stageOf(n).name}${est ? ' (en el Gantt)' : ''}`); Store.upsert('products', { ...p, stage: n, since: todayIso() }); if (est) { estadosSetStage(est.id, n); toast('Etapa actualizada en el Gantt'); } else { toast('Etapa actualizada'); render(); } };
  const setPhoto = f => readImage(f, d => { try { Store.upsert('products', { ...p, photos: [d, ...(p.photos || []).slice(0, 3)] }); logProd(p, 'Foto actualizada'); toast('Foto guardada'); render(); } catch { toast('Foto muy grande', true); } });
  const ph = $('#pf-photo', el); if (ph) ph.onchange = e => e.target.files[0] && setPhoto(e.target.files[0]);
  $$('.pf-photo2', el).forEach(i => i.onchange = e => e.target.files[0] && setPhoto(e.target.files[0]));
  $$('[data-dnew]', el).forEach(b => b.onclick = () => docModal(p, b.dataset.dnew));
  $$('[data-dver]', el).forEach(b => b.onclick = () => docModal(p, b.dataset.dver));
  $$('[data-ddl]', el).forEach(b => b.onclick = () => b.dataset.ddl ? downloadStoredFile(b.dataset.ddl, b.dataset.dname) : toast('Este documento no tiene archivo adjunto; súbelo con «Nueva versión»'));
  $$('[data-dview]', el).forEach(b => b.onclick = () => previewFile(b.dataset.dview, b.dataset.dname));
  $$('[data-ddel]', el).forEach(b => b.onclick = () => confirmBox(`¿Eliminar «${esc(b.dataset.ddel)}»?`, () => { const d = prodDocs(p).find(x => x.type === b.dataset.ddel); if (d?.fileKey) FileStore.del(d.fileKey).catch(() => {}); Store.upsert('products', { ...p, docs: prodDocs(p).filter(d => d.type !== b.dataset.ddel) }); logProd(p, `Eliminado: ${b.dataset.ddel}`); render(); }));
  const doc = $('#pf-doc', el); if (doc) doc.onclick = () => docModal(p);
  const zip = $('#pf-zip', el); if (zip) zip.onclick = () => toast('El ZIP se genera cuando los archivos estén en el servidor');
  const mail = $('#pf-mail', el); if (mail) mail.onclick = () => openModal(modalHtml('Avisar por correo', `<p class="sm muted">Se enviará al equipo y a los vendedores el aviso de que «${esc(p.name)}» tiene documentos actualizados.</p>${pendingChip('Envío de correo pendiente de conexión')}`, `<button class="btn" data-close>Cerrar</button>`), { narrow: true });
}

// ---------- Documentos (Drive: Línea › Producto › Documentos) ----------
function productosDocumentos() {
  const all = Store.list('products');
  const crumbs = `<div class="row no-print" style="margin:0 4px 14px"><button class="btn ghost sm" data-dl="" data-dp="">${ICON.folder(13)} Documentos</button>${PR.docLine ? `<span class="muted">/</span><button class="btn ghost sm" data-dl="${esc(PR.docLine)}" data-dp="">${lineOf(PR.docLine).name}</button>` : ''}${PR.docProd ? `<span class="muted">/</span><span class="btn ghost sm" style="color:var(--text)">${esc(prodById(PR.docProd)?.name || '')}</span>` : ''}</div>`;
  let body;
  if (!PR.docLine) {
    const lines = [...new Set(all.map(p => p.line))].sort((a, b) => LINES.findIndex(l => l.id === a) - LINES.findIndex(l => l.id === b));
    body = `<div class="folder-grid">${lines.map(l => { const ps = all.filter(p => p.line === l); const miss = ps.reduce((a, p) => a + missingOf(p).length, 0); const n = ps.reduce((a, p) => a + prodDocs(p).length, 0); return `<div class="folder" style="--c:${lineOf(l).c}" data-dl="${esc(l)}"><div class="fi"></div><div><b>${lineOf(l).name}</b><br><small>${ps.length} productos · ${n} documentos</small></div>${miss ? `<span class="xs warn b">${ICON.alert(11)} ${miss} por subir</span>` : `<span class="xs ok b">${ICON.check(11)} Completo</span>`}</div>`; }).join('')}</div>`;
  } else if (!PR.docProd) {
    const ps = all.filter(p => p.line === PR.docLine).sort((a, b) => a.name.localeCompare(b.name));
    body = `<div class="folder-grid">${ps.map(p => { const miss = missingOf(p).length; return `<div class="folder" style="--c:${lineOf(p.line).c}" data-dp="${p.id}"><div class="row"><div class="fi"></div><span class="spacer"></span><span class="chip">${kindName(p.kind)}</span></div><div><b>${esc(p.name)}</b><br><small>${prodDocs(p).length} documentos · v. vigente</small></div>${miss ? `<span class="xs warn b">${ICON.alert(11)} ${miss} por subir</span>` : `<span class="xs ok b">${ICON.check(11)} Completo</span>`}</div>`; }).join('') || empty('Sin productos en esta línea')}</div>`;
  } else {
    const p = prodById(PR.docProd); const docs = prodDocs(p).sort((a, b) => a.type.localeCompare(b.type)); const miss = missingOf(p);
    body = `<div class="card"><div class="row" style="margin-bottom:12px">${photoHtml(p) && p.photos?.[0] ? `<img src="${p.photos[0]}" style="width:44px;height:44px;border-radius:10px;object-fit:cover">` : `<span class="icon-btn">${ICON.shirt(16)}</span>`}<div><h3>${esc(p.name)}</h3><div class="sm muted">${lineOf(p.line).name} · ${docs.length} documentos · ${miss.length} por subir</div></div><span class="spacer"></span><button class="btn sm no-print" data-go="productos/lista/${p.id}">Abrir ficha ${ICON.arrow(12)}</button><button class="btn primary sm no-print" id="dd-up">${ICON.upload(12)} Subir</button></div>
      <table class="table"><thead><tr><th>Documento</th><th>Última versión</th><th>Responsable</th><th>Fecha</th><th>Archivo</th><th></th></tr></thead><tbody>
      ${docs.map(d => `<tr><td class="b">${ICON.pdf(13)} ${esc(d.type)}</td><td>v${d.version}</td><td>${esc(d.by)}</td><td class="muted">${fmtDate(d.date)}</td><td class="muted sm">${esc(d.file) || '—'}</td><td class="r no-print" style="white-space:nowrap">${d.fileKey ? `<button class="btn sm" data-dview="${esc(d.fileKey)}" data-dname="${esc(d.file)}">${ICON.eye(12)} Ver</button> ` : ''}<button class="btn sm" data-dver="${esc(d.type)}">Nueva versión</button> <button class="btn sm" data-ddl="${esc(d.fileKey || '')}" data-dname="${esc(d.file)}">${ICON.download(12)}</button></td></tr>`).join('')}
      ${miss.map(d => `<tr style="opacity:.65"><td class="muted">${ICON.doc(13)} ${esc(d)}</td><td colspan="4" class="muted sm">Pendiente de subir</td><td class="r no-print"><button class="btn sm" data-dnew="${esc(d)}">${ICON.plus(11)} Subir</button></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  return `<div class="page-head"><div><h1>Documentos</h1><p>Biblioteca documental K8 · carpetas por línea, producto y documento.</p></div><div class="actions"><button class="btn" data-print="Documentos">${ICON.pdf(14)} Informe PDF</button></div></div>${crumbs}${body}`;
}
function bindDocumentos(el) {
  $$('[data-dl]', el).forEach(b => b.onclick = () => { PR.docLine = b.dataset.dl; PR.docProd = b.dataset.dp ?? ''; prSave(); render(); });
  $$('[data-dp]', el).forEach(b => { if (b.dataset.dl === undefined) b.onclick = () => { PR.docProd = b.dataset.dp; prSave(); render(); }; });
  const p = prodById(PR.docProd);
  if (p) {
    $$('[data-dnew]', el).forEach(b => b.onclick = () => docModal(p, b.dataset.dnew));
    $$('[data-dver]', el).forEach(b => b.onclick = () => docModal(p, b.dataset.dver));
    $$('[data-ddl]', el).forEach(b => b.onclick = () => b.dataset.ddl ? downloadStoredFile(b.dataset.ddl, b.dataset.dname) : toast('Este documento no tiene archivo adjunto; súbelo con «Nueva versión»'));
    $$('[data-dview]', el).forEach(b => b.onclick = () => previewFile(b.dataset.dview, b.dataset.dname));
    const up = $('#dd-up', el); if (up) up.onclick = () => docModal(p);
  }
  $$('[data-print]', el).forEach(b => b.onclick = () => printSection(b.dataset.print));
}

// ---------- Recursos ----------
function resourceModal(r) {
  const x = r || { title: '', desc: '', file: '', hasFile: false, updated: todayIso() };
  openModal(modalHtml(r ? 'Editar recurso' : 'Nuevo recurso', `
    <div class="field"><label>Título</label><input class="input" id="rs-title" value="${esc(x.title)}" placeholder="Catálogo Insumos Textiles"></div>
    <div class="field"><label>Descripción</label><input class="input" id="rs-desc" value="${esc(x.desc)}" placeholder="Cierres, hilos, cintas y accesorios"></div>
    <div class="field"><label>Archivo (PDF)</label><input class="input" type="file" id="rs-file" accept=".pdf"><div class="hint">${x.file ? `Actual: ${esc(x.file)}${x.hasFile ? '' : ' (archivo pendiente)'}` : 'Puedes crear el recurso y subir el PDF después.'}</div></div>
  `, `${r ? `<button class="btn ghost danger" id="rs-del">${ICON.trash(14)} Eliminar</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rs-save">Guardar</button>`), {
    narrow: true,
    onMount(m) {
      $('#rs-save', m).onclick = async () => {
        const title = $('#rs-title', m).value.trim(); if (!title) return toast('Escribe el título', true);
        const f = $('#rs-file', m).files[0];
        const row = { ...x, id: x.id || uid(), title, desc: $('#rs-desc', m).value.trim(), updated: todayIso() };
        if (f) {
          row.file = f.name; row.fileKey = `res:${row.id}`; delete row.data;
          try { await FileStore.put(row.fileKey, f); row.hasFile = true; } catch (e) { row.fileKey = ''; row.hasFile = false; toast('El archivo no se pudo guardar en este navegador; queda solo el nombre', true); }
        }
        Store.upsert('resources', row); closeModal(); toast('Recurso guardado'); render();
      };
      const del = $('#rs-del', m); if (del) del.onclick = () => confirmBox('¿Eliminar este recurso?', () => { Store.remove('resources', x.id); closeModal(); render(); });
    },
  });
}
function productosRecursos() {
  const rs = Store.list('resources');
  return `<div class="page-head"><div><h1>Recursos</h1><p>Catálogos y documentos generales del equipo K8, para ver y descargar.</p></div><div class="actions"><button class="btn primary" id="rs-new">${ICON.plus(14)} Nuevo recurso</button></div></div>
  <div class="grid g3">${rs.map(r => `<div class="card flat" style="padding:0;overflow:hidden">
    <div style="padding:18px 20px;background:color-mix(in srgb, var(--app-productos) 12%, var(--card));border-bottom:1px solid var(--line)"><div class="xs b" style="letter-spacing:.08em;text-transform:uppercase;color:var(--app-productos)">K8 Recursos</div><h2 style="margin-top:4px">${esc(r.title)}</h2><div class="sm muted">${esc(r.desc)}</div></div>
    <div class="row" style="padding:12px 16px"><span class="icon-btn sm">${ICON.pdf(14)}</span><div style="min-width:0;flex:1"><div class="sm b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.file) || 'Sin archivo'}</div><div class="xs muted">${r.hasFile ? `Actualizado ${fmtDate(r.updated)}` : 'Archivo pendiente'}</div></div>${r.hasFile || r.fileKey ? `<button class="btn primary sm" data-rview="${r.id}">${ICON.eye(12)} Ver</button><button class="btn sm" data-rdl="${r.id}" title="Descargar">${ICON.download(12)}</button><button class="btn sm" data-rup="${r.id}" title="Reemplazar PDF">${ICON.upload(12)}</button>` : `<button class="btn primary sm" data-rup="${r.id}">${ICON.upload(12)} Subir PDF</button>`}<button class="icon-btn sm" data-redit="${r.id}" title="Editar">${ICON.edit(12)}</button></div>
  </div>`).join('') || empty('Sin recursos', 'Crea el primero con el botón de arriba')}</div>`;
}
function bindRecursos(el) {
  $('#rs-new', el).onclick = () => resourceModal(null);
  seedExampleResource();
  $$('[data-rup]', el).forEach(b => b.onclick = () => {
    const r = Store.list('resources').find(x => x.id === b.dataset.rup);
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,application/pdf,image/*';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const key = `res:${r.id}`;
      try { await FileStore.put(key, f); } catch (e) { return toast('No se pudo guardar el archivo en este navegador', true); }
      Store.upsert('resources', { ...r, file: f.name, fileKey: key, hasFile: true, data: undefined, updated: todayIso() });
      toast('PDF cargado · ya tiene vista previa'); render();
      setTimeout(() => previewFile(key, f.name), 300);
    };
    inp.click();
  });
  $$('[data-redit]', el).forEach(b => b.onclick = () => resourceModal(Store.list('resources').find(r => r.id === b.dataset.redit)));
  $$('[data-rview]', el).forEach(b => b.onclick = () => { const r = Store.list('resources').find(r => r.id === b.dataset.rview); if (r.fileKey) return previewFile(r.fileKey, r.file); openModal(modalHtml(esc(r.title), r.data ? `<iframe src="${r.data}" style="width:100%;height:74vh;border:0;border-radius:12px"></iframe>` : `<p class="sm muted">El archivo quedó registrado por nombre (${esc(r.file)}). Vuelve a subirlo con «Editar» para verlo aquí.</p>`, `<button class="btn" data-close>Cerrar</button>`), { wide: true }); });
  $$('[data-rdl]', el).forEach(b => b.onclick = () => { const r = Store.list('resources').find(r => r.id === b.dataset.rdl); if (r.fileKey) return downloadStoredFile(r.fileKey, r.file); if (r.data) { const a = document.createElement('a'); a.href = r.data; a.download = r.file; a.click(); } else toast('Este recurso no tiene archivo; súbelo con «Editar»'); });
}

// ---------- Registro ----------
PAGES.productos = route => {
  if (route.sec === 'documentos') return { title: 'Documentos', html: productosDocumentos(), mount: bindDocumentos };
  if (route.sec === 'recursos') return { title: 'Recursos', html: productosRecursos(), mount: bindRecursos };
  if (route.sub) return { title: prodById(route.sub)?.name || 'Producto', html: productoFicha(route.sub), mount: el => bindFicha(el, route.sub) };
  return { title: 'Productos', html: productosLista(), mount: bindLista };
};

// ---------- Ejemplo de vista previa ----------
// Una sola vez por navegador: adjunta un PDF de ejemplo como "Ficha técnica" del primer producto del Gantt,
// para que se vea cómo funciona el botón «Ver». Se puede eliminar desde la ficha como cualquier documento.
async function seedExampleDoc() {
  if (Acceso.lector()) return;
  if (Store.read('example_doc_seeded', false)) return;
  const prods = Store.list('products'); const p = prods.find(x => x.kind === 'prenda' && x.estId) || prods.find(x => x.kind === 'prenda');
  if (!p) return;
  try {
    const blob = await fetch('assets/ejemplo-ficha-tecnica.pdf').then(r => { if (!r.ok) throw new Error('404'); return r.blob(); });
    const key = `doc:${p.id}:ficha-tecnica:v1`;
    await FileStore.put(key, new File([blob], 'Ficha_tecnica_ejemplo.pdf', { type: 'application/pdf' }));
    const docs = prodDocs(p).filter(d => d.type !== 'Ficha técnica');
    docs.push({ type: 'Ficha técnica', version: 1, by: 'panel', date: todayIso(), file: 'Ficha_tecnica_ejemplo.pdf', fileKey: key, note: 'Ejemplo de vista previa' });
    Store.upsert('products', { ...p, docs }); Store.write('example_doc_seeded', true);
    toast(`PDF de ejemplo cargado en «${p.name}» · pruébalo con Ver`); render();
  } catch (e) { console.warn('ejemplo pdf', e); }
}
document.addEventListener('k8estados', () => seedExampleDoc(), { once: true });

// Ejemplo de vista previa en Recursos (una vez por navegador): el PDF de muestra queda en «Lista de precios textil».
async function seedExampleResource() {
  if (Acceso.lector()) return;
  if (Store.read('example_res_seeded', false)) return;
  const rs = Store.list('resources'); const r = rs.find(x => !x.hasFile && !x.fileKey); if (!r) return;
  try {
    const blob = await fetch('assets/ejemplo-ficha-tecnica.pdf').then(x => { if (!x.ok) throw new Error('404'); return x.blob(); });
    const key = `res:${r.id}`;
    await FileStore.put(key, new File([blob], 'Catalogo_ejemplo.pdf', { type: 'application/pdf' }));
    Store.upsert('resources', { ...r, file: 'Catalogo_ejemplo.pdf', fileKey: key, hasFile: true, updated: todayIso() });
    Store.write('example_res_seeded', true); toast(`PDF de ejemplo cargado en «${r.title}» · pruébalo con Ver`); render();
  } catch (e) { console.warn('ejemplo recurso', e); }
}
