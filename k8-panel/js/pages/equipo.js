// ============================================================
// Marketing y Desarrollo · Equipo (integrantes, permisos, colores)
// ============================================================
'use strict';

const EQ = { bajas: false };
const PERMS = [['admin', 'Administrador de la app'], ['ventas', 'Ventas'], ['campanas', 'Campañas']];
const TAGS = ['Diseño', 'TI'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const permName = id => (PERMS.find(x => x[0] === id) || [id, id])[1];

function personModal(person) {
  const all = Store.read('people', []);
  const p = person || { id: '', name: '', role: '', area: 'Marketing', bday: '', bmonth: '', color: '', perms: [], tags: [], account: '', online: false, active: true };
  const used = all.filter(x => x.id !== p.id && x.active !== false).map(x => x.color);
  let color = p.color || PALETTE.find(c => !used.includes(c)) || PALETTE[0];
  openModal(modalHtml(person ? 'Editar integrante' : 'Agregar integrante', `
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input class="input" id="pe-name" value="${esc(p.name)}" placeholder="Nombre y apellido"></div>
      <div class="field"><label>Cargo</label><input class="input" id="pe-role" value="${esc(p.role)}" placeholder="Ej: Diseñadora de Vestuario"><div class="hint">Opcional. Si lo dejas vacío, queda «Integrante».</div></div>
      <div class="field"><label>Área</label><select class="select" id="pe-area">${AREAS.map(a => `<option ${p.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Cumpleaños</label><div class="row"><select class="select" id="pe-bday"><option value="">— día</option>${Array.from({ length: 31 }, (_, i) => `<option ${String(i + 1) === String(p.bday) ? 'selected' : ''}>${i + 1}</option>`).join('')}</select><select class="select" id="pe-bmonth"><option value="">— mes</option>${MONTHS.map((m, i) => `<option value="${i + 1}" ${String(i + 1) === String(p.bmonth) ? 'selected' : ''}>${cap(m)}</option>`).join('')}</select></div><div class="hint">Opcional. Solo día y mes: aparece en el calendario de todos cada año.</div></div>
    </div>
    <div class="field"><label>Color de identidad</label>
      <div class="row wrap" id="pe-colors" style="gap:8px">${PALETTE.map(c => { const taken = used.includes(c); return `<button type="button" class="pe-color ${c === color ? 'on' : ''} ${taken ? 'taken' : ''}" data-color="${c}" style="--c:${c}" title="${taken ? 'Ya lo usa otro integrante' : c}"></button>`; }).join('')}</div>
      <div class="hint">Este color identifica a la persona en tareas, equipo y calendario. Los tachados ya los usa otro integrante.</div></div>
    <fieldset class="card flat" style="padding:12px 16px"><legend class="sm b muted" style="padding:0 6px">Permisos en esta app</legend>
      ${PERMS.map(([id, l]) => `<label class="row sm" style="padding:6px 0"><input type="checkbox" data-perm="${id}" ${p.perms?.includes(id) ? 'checked' : ''}> ${l}</label>`).join('')}
      <div class="hint">«Ventas» registra y ve sus ventas. «Campañas» crea y edita campañas y ve todas las ventas. «Administrador» puede todo en esta app.</div></fieldset>
    <fieldset class="card flat" style="padding:12px 16px"><legend class="sm b muted" style="padding:0 6px">Etiquetas</legend>
      <div class="row wrap">${TAGS.map(t => `<label class="row sm" style="padding:6px 12px 6px 0"><input type="checkbox" data-tag="${t}" ${p.tags?.includes(t) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
      <div class="hint">Solo identifican, no dan acceso a nada.</div></fieldset>
    <div class="field"><label>Cuenta</label><input class="input" id="pe-account" value="${esc(p.account || '')}" placeholder="Ej: t.sanchez"><div class="hint">Usuario con el que entra al servidor de K8 (lo asigna TI). Vacío = sin cuenta.</div></div>
    <label class="row sm"><input type="checkbox" id="pe-online" ${p.online ? 'checked' : ''}> Mostrar «en línea» (no tiene cuenta, así que se marca a mano)</label>
    <div class="hint">Estos permisos son solo de este panel. El acceso al servidor lo da TI.</div>
  `, `${person ? `<button class="btn ghost ${p.active === false ? '' : 'danger'}" id="pe-baja">${p.active === false ? 'Reincorporar' : 'Dar de baja'}</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pe-save">Guardar</button>`), {
    onMount(m) {
      $$('.pe-color', m).forEach(b => b.onclick = () => { color = b.dataset.color; $$('.pe-color', m).forEach(x => x.classList.toggle('on', x === b)); });
      $('#pe-save', m).onclick = () => {
        const name = $('#pe-name', m).value.trim(); if (!name) return toast('Escribe el nombre', true);
        const id = p.id || normName(name).replace(/\s+/g, '-') || uid();
        const row = { ...p, id, name, short: name.split(/\s+/)[0], role: $('#pe-role', m).value.trim() || 'Integrante', area: $('#pe-area', m).value, bday: $('#pe-bday', m).value, bmonth: $('#pe-bmonth', m).value, color, perms: $$('[data-perm]:checked', m).map(x => x.dataset.perm), tags: $$('[data-tag]:checked', m).map(x => x.dataset.tag), account: $('#pe-account', m).value.trim(), online: $('#pe-online', m).checked };
        const list = Store.read('people', []); const i = list.findIndex(x => x.id === id); if (i >= 0) list[i] = row; else list.push(row);
        Store.write('people', list); loadPeople(); closeModal(); toast(person ? 'Integrante guardado' : 'Integrante agregado'); render();
      };
      const baja = $('#pe-baja', m); if (baja) baja.onclick = () => { const list = Store.read('people', []); const x = list.find(y => y.id === p.id); x.active = x.active === false; Store.write('people', list); loadPeople(); closeModal(); toast(x.active ? 'Reincorporado' : 'Dado de baja'); render(); };
    },
  });
}

function equipoPersonas() {
  const all = Store.read('people', []); const t = todayIso();
  const list = all.filter(p => (p.active !== false) !== EQ.bajas);
  const tasks = Store.list('tasks');
  return `
  <div class="page-head"><div><h1>Equipo</h1><p>Quién está, qué tiene en curso y qué puede hacer cada uno en este panel.</p></div>
    <div class="actions"><button class="btn" id="eq-bajas">${EQ.bajas ? 'Ver activos' : `Ver bajas (${all.filter(p => p.active === false).length})`}</button><button class="btn primary" id="eq-new">${ICON.plus(14)} Agregar integrante</button></div></div>
  <div class="card" style="padding:6px 10px">${list.map(p => {
    const mine = tasks.filter(x => x.people.includes(p.id));
    const open = mine.filter(x => x.state !== 'done'), run = open.filter(x => x.running), late = open.filter(isLate);
    const done30 = mine.filter(x => x.state === 'done' && x.doneAt && daysBetween(x.doneAt, t) <= 30);
    return `<div class="list-item team-row" style="gap:12px;padding:10px 6px">
      ${avatar(p.name, 'lg')}
      <div style="min-width:0;flex:1.4">
        <div class="row wrap" style="gap:6px"><b>${esc(p.name)}</b>${chip(p.area || 'Marketing', 'var(--app-marketing)')}${(p.tags || []).map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
        <div class="xs muted">${esc(p.role)}${p.account ? ` · ${esc(p.account)}` : ''}${p.bday && p.bmonth ? ` · ${ICON.cal(10)} ${p.bday} ${MONTHS[p.bmonth - 1].slice(0, 3)}` : ''}${(p.perms || []).length ? ` · ${p.perms.map(permName).join(', ')}` : ''}</div>
      </div>
      <div class="sm team-run" style="flex:2;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:3px solid ${p.color};padding-left:8px">${run.length ? run.map(x => esc(x.title)).join(' · ') : '<span class="muted">Sin tareas en curso</span>'}</div>
      <div class="row team-nums" style="gap:10px;flex:none">${[[open.length, 'abiertas', ''], [late.length, 'vencidas', 'danger'], [done30.length, 'listas', 'ok']].map(([n, l, c]) => `<span class="sm" title="${l}"><b class="num ${c}">${n}</b> <span class="xs muted">${l}</span></span>`).join('')}</div>
      <span class="chip ${p.online || run.length ? 'c' : ''}" style="--c:var(--ok);flex:none">${p.online || run.length ? '<i></i>En línea' : 'Desconectado'}</span>
      <button class="icon-btn sm no-print" data-pedit="${p.id}" style="flex:none">${ICON.edit(13)}</button>
    </div>`; }).join('') || empty(EQ.bajas ? 'Sin bajas' : 'Sin integrantes', 'Usa «Agregar integrante»')}</div>`;
}
function bindPersonas(el) {
  $('#eq-new', el).onclick = () => personModal(null);
  $('#eq-bajas', el).onclick = () => { EQ.bajas = !EQ.bajas; render(); };
  $$('[data-pedit]', el).forEach(b => b.onclick = () => personModal(Store.read('people', []).find(p => p.id === b.dataset.pedit)));
}

/** Cumpleaños del mes (YYYY-MM) como eventos virtuales del calendario. */
function birthdayEvents(month) {
  const [y, m] = month.split('-').map(Number);
  return PEOPLE.filter(p => p.bday && Number(p.bmonth) === m).map(p => ({ id: 'bday-' + p.id, title: `Cumpleaños de ${p.short}`, type: 'cumple', date: `${y}-${pad(m)}-${pad(p.bday)}`, who: p.id, virtual: true }));
}
