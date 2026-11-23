// ============================================================
// Tareas › Mi checklist · las tareas personales de Vicente como lista para marcar.
// Se guarda en este navegador (Store 'checklist'). Las tareas que Vicente le va pidiendo a Claude
// se suman con CK_SEMILLA: solo se agregan las que faltan (por id), nunca se borra ni se pisa lo que él escribió.
// ============================================================
'use strict';

const CK_GRUPOS = ['Informes y campañas', 'Conexiones del panel', 'STM', 'Panel K8', 'Otras'];
const CK_SEMILLA = [
  // 20-11-2026 · de lo conversado con Claude
  { id: 'ck-informe-q2nov', grupo: 'Informes y campañas', txt: 'Revisar el informe de la 2ª quincena de noviembre (se arma solo en Informes el 2 de diciembre)', fecha: '2026-12-02' },
  { id: 'ck-informe-nov', grupo: 'Informes y campañas', txt: 'Revisar el informe de noviembre completo y el acumulado desde septiembre', fecha: '2026-12-02' },
  { id: 'ck-rubros-meta', grupo: 'Informes y campañas', txt: 'Campañas de Meta con público abierto: agregar intereses o un público similar del rubro al que apuntan', fecha: '' },
  { id: 'ck-zrm-codigo', grupo: 'Informes y campañas', txt: 'Confirmar con Zorangie que todas sus ventas de WhatsApp se facturen con su código ZRM en el local Dardignac', fecha: '' },
  { id: 'ck-wa-gestion', grupo: 'Informes y campañas', txt: 'Venta cerrada por WhatsApp: marcar el chat con la etiqueta «En Gestión» y subir el comprobante', fecha: '' },
  { id: 'ck-pbi-pro', grupo: 'Conexiones del panel', txt: 'Pedir licencia Power BI Pro antes de que venza la prueba de 60 días (si no, el informe deja de leer el Power BI)', fecha: '2027-01-10' },
  { id: 'ck-meli', grupo: 'Conexiones del panel', txt: 'Autorizar Mercado Libre en el panel con la cuenta dueña de la tienda', fecha: '' },
  { id: 'ck-gads-api', grupo: 'Conexiones del panel', txt: 'Google Ads: conseguir acceso a la API (hoy se conecta por la hoja del script)', fecha: '' },
  { id: 'ck-stm-logo', grupo: 'STM', txt: 'Definir con gerencia si STM usa un solo logo o los dos (materiales y construcción)', fecha: '' },
  { id: 'ck-stm-productos', grupo: 'STM', txt: 'Enviar la lista de productos de STM cuando estén definidos', fecha: '' },
  { id: 'ck-stm-illustrator', grupo: 'STM', txt: 'Enviar los logos de STM en Illustrator', fecha: '' },
  { id: 'ck-menu-marca', grupo: 'Panel K8', txt: 'Menú por marca en el panel (K8 / STM)', fecha: '' },
];

const CK = { verHechas: false, grupo: CK_GRUPOS[0], editando: null };
function ckLista() {
  let L = Store.list('checklist');
  const ya = new Set(Store.read('checklist_semilla', []));
  const nuevas = CK_SEMILLA.filter(s => !ya.has(s.id) && !L.some(x => x.id === s.id));
  if (nuevas.length) {
    L = [...L, ...nuevas.map(s => ({ ...s, hecho: false, creado: todayIso() }))];
    Store.write('checklist', L); Store.write('checklist_semilla', [...ya, ...nuevas.map(s => s.id)]);
  }
  return L;
}
const ckGuardar = L => Store.write('checklist', L);

function checklistPagina() {
  const L = ckLista(); const hoy = todayIso();
  const pend = L.filter(x => !x.hecho), hechas = L.filter(x => x.hecho);
  const grupos = [...CK_GRUPOS, ...new Set(L.map(x => x.grupo).filter(g => !CK_GRUPOS.includes(g)))];
  const fila = x => {
    const late = !x.hecho && x.fecha && x.fecha < hoy;
    return `<div class="ck-row${x.hecho ? ' done' : ''}" data-ck="${x.id}">
      <button class="ck-box" data-cktoggle="${x.id}" title="${x.hecho ? 'Marcar como pendiente' : 'Marcar como hecha'}">${x.hecho ? ICON.check(13) : ''}</button>
      ${CK.editando === x.id ? `<input class="input ck-edit" id="ck-edit" value="${esc(x.txt)}">` : `<div class="ck-txt" data-ckedit="${x.id}" title="Toca para editar">${esc(x.txt)}</div>`}
      <span class="ck-fecha${late ? ' late' : ''}">${x.hecho && x.hechoEn ? 'hecha ' + fmtDate(x.hechoEn) : x.fecha ? ICON.cal(11) + ' ' + fmtDate(x.fecha) : ''}</span>
      <button class="icon-btn sm ck-del" data-ckdel="${x.id}" title="Borrar">${ICON.trash(13)}</button>
    </div>`;
  };
  const bloques = grupos.map(g => {
    const rows = L.filter(x => x.grupo === g && (CK.verHechas || !x.hecho)).sort((a, b) => (a.hecho - b.hecho) || (a.fecha || '9').localeCompare(b.fecha || '9'));
    const total = L.filter(x => x.grupo === g).length, ok = L.filter(x => x.grupo === g && x.hecho).length;
    if (!rows.length) return '';
    return `<div class="card ck-grupo"><div class="row" style="gap:10px;margin-bottom:6px"><b>${esc(g)}</b><span class="xs muted">${ok} de ${total} hechas</span></div>${rows.map(fila).join('')}</div>`;
  }).join('');
  const pct = L.length ? Math.round(hechas.length / L.length * 100) : 0;
  return `<div class="page-head"><div><h1>Mi checklist</h1><p>Tus tareas personales. Marca lo que ya hiciste; lo que me vayas pidiendo como pendiente se suma aquí.</p></div>
    <div class="actions"><button class="btn ${CK.verHechas ? 'primary' : ''}" id="ck-ver">${ICON.check(14)} ${CK.verHechas ? 'Ocultar hechas' : `Ver hechas (${hechas.length})`}</button></div></div>
    <div class="card" style="margin-bottom:14px">
      <div class="row" style="gap:12px;margin-bottom:12px"><b class="num" style="font-size:22px">${pend.length}</b><span class="sm muted">pendientes · ${hechas.length} hechas</span><span class="spacer"></span><span class="xs muted">${pct}%</span></div>
      <div class="ck-bar"><i style="width:${pct}%"></i></div>
      <form class="ck-nueva" id="ck-form"><input class="input" id="ck-txt" placeholder="Nueva tarea…" autocomplete="off">
        <select class="input" id="ck-grupo">${grupos.map(g => `<option ${g === CK.grupo ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <input class="input" type="date" id="ck-fecha"><button class="btn primary" type="submit">${ICON.plus(14)} Agregar</button></form>
    </div>
    ${bloques || `<div class="card">${empty('Todo hecho', 'No tienes tareas pendientes.')}</div>`}`;
}

function bindChecklist(el) {
  const L = () => Store.list('checklist');
  $('#ck-ver', el).onclick = () => { CK.verHechas = !CK.verHechas; render(); };
  $('#ck-form', el).onsubmit = e => {
    e.preventDefault(); const txt = $('#ck-txt', el).value.trim(); if (!txt) return;
    CK.grupo = $('#ck-grupo', el).value;
    ckGuardar([...L(), { id: uid(), txt, grupo: CK.grupo, fecha: $('#ck-fecha', el).value || '', hecho: false, creado: todayIso() }]);
    render(); const n = $('#ck-txt'); if (n) n.focus();
  };
  $$('[data-cktoggle]', el).forEach(b => b.onclick = () => { ckGuardar(L().map(x => x.id === b.dataset.cktoggle ? { ...x, hecho: !x.hecho, hechoEn: !x.hecho ? todayIso() : '' } : x)); render(); });
  $$('[data-ckdel]', el).forEach(b => b.onclick = () => { const x = L().find(y => y.id === b.dataset.ckdel); if (x && confirm(`¿Borrar «${x.txt}»?`)) { ckGuardar(L().filter(y => y.id !== x.id)); render(); } });
  $$('[data-ckedit]', el).forEach(d => d.onclick = () => { CK.editando = d.dataset.ckedit; render(); });
  const ed = $('#ck-edit', el);
  if (ed) {
    ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length);
    const fin = ok => { const id = CK.editando; CK.editando = null; const v = ed.value.trim(); if (ok && v) ckGuardar(L().map(x => x.id === id ? { ...x, txt: v } : x)); render(); };
    ed.onkeydown = e => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); };
    ed.onblur = () => fin(true);
  }
}
