// ============================================================
// Marketing y Desarrollo · Equipo (Inicio, Tareas, Calendario)
// ============================================================
'use strict';

const MK = Store.read('mk_ui', {}) || {};
MK.board = MK.board || 'tablero'; MK.area = MK.area || 'Todas'; MK.q = MK.q || '';
MK.calMonth = MK.calMonth || todayIso().slice(0, 7); MK.calWho = MK.calWho || ''; MK.calDay = MK.calDay || todayIso();
const mkSave = () => Store.write('mk_ui', MK);

const taskState = id => TASK_STATES.find(s => s.id === id) || TASK_STATES[0];
const tasksOpen = () => Store.list('tasks').filter(t => t.state !== 'done');
const isLate = t => t.state !== 'done' && t.due && daysBetween(todayIso(), t.due) < 0;
const peopleChips = (sel, name = 'people') => PEOPLE.map(p => `<button type="button" class="chip-btn c ${sel.includes(p.id) ? 'on' : ''}" style="--c:${personColor(p.name)}" data-${name}="${p.id}"><i></i>${esc(p.short)}</button>`).join('');

// ---------- Tarjeta de tarea ----------
function taskCard(t) {
  const d = dueLabel(t.due); const pri = priOf(t.pri);
  const pc = t.people.length ? personColor(personOf(t.people[0]).name) : 'var(--faint)';
  const tags = [`#${t.area.toLowerCase()}`, `#${pri.name.toLowerCase()}`, ...(t.running ? ['#en-curso'] : []), ...(isLate(t) ? ['#vencida'] : [])];
  return `<div class="task" style="--pc:${pc}" data-task="${t.id}">
    <div class="task-head"><div class="tags">${tags.map((x, i) => `<span class="tag ${i === 1 ? 'pri' : ''} ${x === '#vencida' ? 'late' : ''} ${x === '#en-curso' ? 'run' : ''}" ${i === 1 ? `style="--c:${pri.c}"` : ''}>${esc(x)}</span>`).join('')}</div><button class="icon-btn sm task-menu no-print" data-tmenu="${t.id}" title="Opciones">${ICON.dots(14)}</button></div>
    <div class="t">${esc(t.title)}</div>
    ${t.note ? `<div class="task-note">Nota: ${esc(t.note)}</div>` : ''}
    <div class="row task-prog"><span class="xs">Avance</span><span class="spacer"></span><span class="xs b">${t.progress}%</span></div>
    <div class="dots">${Array.from({ length: 10 }, (_, i) => `<i class="${t.progress >= (i + 1) * 10 ? 'on' : ''}" data-prog="${(i + 1) * 10}" title="${(i + 1) * 10}%"></i>`).join('')}</div>
    <div class="task-foot"><span class="av-stack">${t.people.map(p => avatar(personOf(p).name)).join('')}</span><span class="spacer"></span><span class="pill ${d.late ? 'late' : ''}" title="Vencimiento">${ICON.cal(11)} ${t.due ? fmtDate(t.due) : '—'}</span>${t.files?.length ? `<span class="pill" title="Adjuntos">${ICON.paper(11)} ${t.files.length}</span>` : ''}</div>
  </div>`;
}
function taskMenu(btn, t) {
  const old = $('#task-menu-pop'); if (old) old.remove();
  const m = document.createElement('div'); m.id = 'task-menu-pop'; m.className = 'menu-pop';
  m.innerHTML = `
    <button class="menu-item" data-act="run">${t.running ? ICON.pause(14) : ICON.play(14)} ${t.running ? 'Pausar' : 'Marcar en curso'}</button>
    <button class="menu-item" data-act="edit">${ICON.edit(14)} Editar</button>
    ${t.state !== 'todo' ? `<button class="menu-item" data-act="back">${ICON.chevL(14)} Mover atrás</button>` : ''}
    ${t.state !== 'done' ? `<button class="menu-item" data-act="next">${ICON.chevR(14)} Mover adelante</button>` : ''}
    <button class="menu-item danger" data-act="del">${ICON.trash(14)} Eliminar</button>`;
  const r = btn.getBoundingClientRect();
  m.style.cssText = `position:fixed;top:${r.bottom + 6}px;left:${Math.min(r.left, innerWidth - 230)}px;width:220px;z-index:70`;
  document.body.appendChild(m);
  const close = () => m.remove();
  setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
  $$('[data-act]', m).forEach(b => b.onclick = e => {
    e.stopPropagation(); close(); const a = b.dataset.act;
    if (a === 'edit') return taskModal(t);
    if (a === 'run') { t.running = !t.running; if (t.running && t.state === 'todo') { t.state = 'doing'; t.progress = Math.max(t.progress, 10); } Store.upsert('tasks', t); return render(); }
    if (a === 'back' || a === 'next') { const i = TASK_STATES.findIndex(s => s.id === t.state) + (a === 'next' ? 1 : -1); if (i < 0 || i >= TASK_STATES.length) return; t.state = TASK_STATES[i].id; if (t.state === 'done') { t.progress = 100; t.doneAt = todayIso(); t.running = false; } else if (t.progress === 100) t.progress = 90; Store.upsert('tasks', t); return render(); }
    if (a === 'del') return confirmBox(`¿Eliminar «${esc(t.title)}»?`, () => { Store.remove('tasks', t.id); render(); });
  });
}

function taskModal(task, presetState) {
  const t = task || { title: '', area: 'Marketing', state: presetState || 'todo', pri: 'media', people: [], start: todayIso(), due: '', progress: 0, files: [], note: '' };
  let people = [...t.people];
  openModal(modalHtml(task ? 'Editar tarea' : 'Nueva tarea', `
    <div class="field"><label>Tarea</label><input class="input" id="tk-title" value="${esc(t.title)}" placeholder="Ej: Grilla RRSS septiembre"></div>
    <div class="form-grid">
      <div class="field"><label>Área</label><select class="select" id="tk-area">${AREAS.map(a => `<option ${a === t.area ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Estado</label><select class="select" id="tk-state">${TASK_STATES.map(s => `<option value="${s.id}" ${s.id === t.state ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Prioridad</label><div class="chips" id="tk-pri">${PRIORITIES.map(p => `<button type="button" class="chip-btn c ${p.id === t.pri ? 'on' : ''}" style="--c:${p.c}" data-pri="${p.id}"><i></i>${p.name}</button>`).join('')}</div></div>
    <div class="field"><label>Responsables (uno o varios)</label><div class="chips" id="tk-people">${peopleChips(people)}</div><div class="hint">Marca a todos los que trabajan la tarea. Si es en conjunto, la verán todos ellos.</div></div>
    <div class="form-grid">
      <div class="field"><label>Fecha de inicio</label><input class="input" type="date" id="tk-start" value="${t.start || ''}"></div>
      <div class="field"><label>Fecha de término</label><input class="input" type="date" id="tk-due" value="${t.due || ''}"></div>
    </div>
    <div class="field"><label>Nota (opcional)</label><input class="input" id="tk-note" value="${esc(t.note || '')}" placeholder="Ej: revisar con Luz antes del viernes"></div>
    <div class="field"><label>Evidencia (opcional)</label><input class="input" type="file" id="tk-files" multiple accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt"><div class="hint">PDF, imagen, Word, Excel, CSV o TXT. Hasta 5 archivos de 10 MB. ${t.files?.length ? `Adjuntos: ${t.files.map(esc).join(', ')}` : ''}</div></div>
  `, `${task ? `<button class="btn ghost danger" id="tk-del">${ICON.trash(14)} Eliminar</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="tk-save">${task ? 'Guardar' : 'Crear'}</button>`), {
    onMount(m) {
      let pri = t.pri;
      $$('[data-pri]', m).forEach(b => b.onclick = () => { pri = b.dataset.pri; $$('[data-pri]', m).forEach(x => x.classList.toggle('on', x === b)); });
      $$('[data-people]', m).forEach(b => b.onclick = () => { const id = b.dataset.people; people = people.includes(id) ? people.filter(x => x !== id) : [...people, id]; b.classList.toggle('on'); });
      $('#tk-save', m).onclick = () => {
        const title = $('#tk-title', m).value.trim(); if (!title) return toast('Escribe el nombre de la tarea', true);
        const files = [...($('#tk-files', m).files || [])].slice(0, 5).map(f => f.name);
        const row = { ...t, id: t.id || uid(), title, area: $('#tk-area', m).value, state: $('#tk-state', m).value, pri, people, start: $('#tk-start', m).value, due: $('#tk-due', m).value, note: $('#tk-note', m).value.trim(), files: files.length ? files : (t.files || []) };
        if (row.state === 'done') { row.progress = 100; row.doneAt = row.doneAt || todayIso(); row.running = false; }
        Store.upsert('tasks', row); closeModal(); toast(task ? 'Tarea guardada' : 'Tarea creada'); render();
      };
      const del = $('#tk-del', m); if (del) del.onclick = () => confirmBox('¿Eliminar esta tarea?', () => { Store.remove('tasks', t.id); closeModal(); render(); });
    },
  });
}

function bindTasks(el) {
  $$('[data-edit]', el).forEach(b => b.onclick = e => { e.stopPropagation(); taskModal(Store.list('tasks').find(t => t.id === b.dataset.edit)); });
  $$('[data-run]', el).forEach(b => b.onclick = e => { e.stopPropagation(); const t = Store.list('tasks').find(t => t.id === b.dataset.run); t.running = !t.running; if (t.running && t.state === 'todo') { t.state = 'doing'; t.progress = Math.max(t.progress, 25); } Store.upsert('tasks', t); render(); });
  $$('[data-move]', el).forEach(b => b.onclick = e => {
    e.stopPropagation(); const [id, dir] = b.dataset.move.split(':'); const t = Store.list('tasks').find(t => t.id === id);
    const i = TASK_STATES.findIndex(s => s.id === t.state) + Number(dir); if (i < 0 || i >= TASK_STATES.length) return;
    t.state = TASK_STATES[i].id; if (t.state === 'done') { t.progress = 100; t.doneAt = todayIso(); t.running = false; } else if (t.progress === 100) t.progress = 75;
    Store.upsert('tasks', t); render();
  });
  $$('[data-prog]', el).forEach(i => i.onclick = e => { e.stopPropagation(); const t = Store.list('tasks').find(t => t.id === i.closest('[data-task]').dataset.task); t.progress = Number(i.dataset.prog); if (t.progress === 100) { t.state = 'done'; t.doneAt = todayIso(); t.running = false; } Store.upsert('tasks', t); render(); });
  $$('[data-tmenu]', el).forEach(b => b.onclick = e => { e.stopPropagation(); taskMenu(b, Store.list('tasks').find(t => t.id === b.dataset.tmenu)); });
  $$('.task', el).forEach(c => c.onclick = () => taskModal(Store.list('tasks').find(t => t.id === c.dataset.task)));
}

// ---------- Equipo › Inicio ----------
function equipoInicio() {
  const t = todayIso(), month = t.slice(0, 7);
  const tasks = Store.list('tasks'), open = tasksOpen();
  const late = open.filter(isLate), review = open.filter(x => x.state === 'review');
  const closed30 = tasks.filter(x => x.state === 'done' && x.doneAt && daysBetween(x.doneAt, t) <= 30);
  const risk = open.filter(x => !isLate(x) && x.due && daysBetween(t, x.due) <= 2);
  const ok = open.length - late.length - risk.length;
  const perf = open.length ? Math.round(open.reduce((a, x) => a + x.progress, 0) / open.length) : 0;
  const urgent = [...open].sort((a, b) => (isLate(b) - isLate(a)) || (a.pri === 'alta' ? -1 : 1) || (a.due || '').localeCompare(b.due || '')).slice(0, 5);
  const agenda = Store.list('events').filter(e => e.date === t);
  const sales = Store.list('sales'); const mes = sales.filter(s => s.date.startsWith(month)).reduce((a, s) => a + (s.kind === 'venta' ? s.amount : -s.amount), 0);
  const goal = Store.read('goals', {})[month] || 0;
  const spent = Store.list('campaigns').filter(c => (c.end || t) >= `${month}-01`).reduce((a, c) => a + (c.spent || 0), 0);
  const active = Store.list('campaigns').filter(c => c.state === 'on').length;
  const h = new Date().getHours(); const greet = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const wk = Math.ceil((((parseDay(t) - new Date(parseDay(t).getFullYear(), 0, 1)) / DAY) + new Date(parseDay(t).getFullYear(), 0, 1).getDay() + 1) / 7);
  return `
  <div class="page-head"><div><h1>${greet}, ${esc(personOf(ME.id).short)}</h1><p>${cap(fmtDateLong(t))} · Semana ${wk}</p></div><div class="actions"><div class="num" id="clock" style="font-size:34px"></div></div></div>
  <div class="grid" style="grid-template-columns:1fr 1.4fr;margin-bottom:14px">
    <div class="card">${cardHead(ICON.users(15), 'Equipo ahora', 'Qué tiene cada persona en curso', '', 'var(--app-marketing)')}
      <div class="list">${PEOPLE.filter(p => p.id !== ME.id).map(p => { const run = open.filter(x => x.people.includes(p.id) && x.running); return `<div class="list-item">${avatar(p.name, 'lg')}<div style="min-width:0"><div class="t">${esc(p.short)}</div><div class="s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${run.length ? run.map(x => esc(x.title)).join(' · ') : 'Sin tareas en curso'}</div></div><span class="spacer"></span>${run.length ? chip(`${run.length} en curso`, 'var(--ok)') : chip('En pausa', 'var(--faint)')}</div>`; }).join('')}</div>
    </div>
    <div class="card">${cardHead(ICON.tasks(15), 'Tareas del equipo', 'Lo urgente primero', 'marketing/equipo/tareas', 'var(--app-marketing)')}
      <div class="grid g4" style="margin-bottom:12px">${[['Activas', open.length, ''], ['Vencidas', late.length, 'danger'], ['Aprobación', review.length, ''], ['Cerradas (30 d)', closed30.length, 'ok']].map(([l, n, c]) => `<div class="card flat" style="padding:10px 12px;text-align:center"><div class="num ${c}" style="font-size:22px">${n}</div><div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em">${l}</div></div>`).join('')}</div>
      <div class="list">${urgent.map(x => { const d = dueLabel(x.due); return `<div class="list-item link" data-go="marketing/equipo/tareas"><span style="width:8px;height:8px;border-radius:50%;background:${priOf(x.pri).c};flex:none"></span><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title)}</div><span class="spacer"></span>${avStack(x.people.map(p => personOf(p).name))}<span class="sm ${d.late ? 'danger b' : 'muted'}" style="white-space:nowrap">${d.text}</span></div>`; }).join('')}</div>
    </div>
  </div>
  <div class="grid g3">
    <div class="card">${cardHead(ICON.trend(15), 'Rendimiento', 'Cumplimiento del equipo', '', 'var(--app-marketing)')}
      ${gaugeSvg(perf)}
      <div class="sm muted" style="text-align:center;margin-top:8px">Avance promedio · ${ok} al día · ${risk.length} en riesgo · ${late.length} vencidas</div>
      <div class="row" style="justify-content:center;gap:14px;margin-top:8px">${[['Al día', 'var(--ok)'], ['Riesgo', 'var(--warn)'], ['Vencidas', 'var(--danger)']].map(([l, c]) => `<span class="xs muted row" style="gap:5px"><i style="width:8px;height:8px;border-radius:2px;background:${c}"></i>${l}</span>`).join('')}</div>
    </div>
    <div class="card">${cardHead(ICON.cal(15), 'Agenda de hoy', `${agenda.length} ${agenda.length === 1 ? 'evento' : 'eventos'} · ves todo el equipo`, 'marketing/equipo/calendario', 'var(--app-marketing)')}
      <div class="list">${agenda.length ? agenda.map(e => `<div class="list-item" style="border-left:3px solid ${evTypeOf(e.type).c};padding-left:10px">${chip(evTypeOf(e.type).name, evTypeOf(e.type).c)}<div class="t">${esc(e.title)}</div><span class="spacer"></span>${avatar(personOf(e.who).name)}</div>`).join('') : empty('Sin eventos hoy')}</div>
    </div>
    <div class="card">${cardHead(ICON.chart(15), 'Ventas', `Meta de ${new Date().toLocaleDateString('es-CL', { month: 'long' })}`, 'marketing/ventas/inicio', 'var(--app-marketing)')}
      <div class="xs muted b" style="text-transform:uppercase;letter-spacing:.06em">Vendido en ${new Date().toLocaleDateString('es-CL', { month: 'long' })}</div>
      <div class="num ok" style="font-size:28px">${fmtMoney(mes)}</div>
      <div class="row" style="margin:6px 0 4px"><div style="flex:1">${bar(goal ? pct(mes, goal) : 0, 'var(--ok)')}</div><b class="sm">${goal ? pct(mes, goal) : 0}%</b></div>
      <div class="sm muted">Meta: ${goal ? fmtShort(goal) : '—'} · faltan ${fmtMoney(Math.max(0, goal - mes))}</div>
      <div class="sm muted" style="margin-top:10px">Gastado en el mes: <b>${fmtMoney(spent)}</b> · ${active} campañas activas</div>
      <div style="margin-top:12px"><button class="btn primary sm" data-go="marketing/ventas/registro">${ICON.plus(13)} Venta</button></div>
    </div>
  </div>`;
}

// ---------- Equipo › Tareas ----------
function equipoTareas() {
  const all = Store.list('tasks'); const q = MK.q.toLowerCase();
  const filt = all.filter(t => (MK.area === 'Todas' || t.area === MK.area) && (!q || t.title.toLowerCase().includes(q)));
  const hist = filt.filter(t => t.state === 'done' && t.doneAt && daysBetween(t.doneAt, todayIso()) > 3);
  const board = filt.filter(t => !hist.includes(t));
  const t = todayIso(); const d = parseDay(t);
  const filtersOn = MK.showFilters || MK.area !== 'Todas' || !!MK.q;
  return `
  <div class="card board-head">
    <div class="bh-date"><b>${cap(d.toLocaleDateString('es-CL', { month: 'long' }))}</b><span class="sm muted">Hoy es ${d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
    <div class="bh-sep"></div>
    <div class="bh-board"><b>Tablero</b><span class="muted">–</span><div class="seg">${[['tablero', 'Tareas'], ['historial', `Historial (${hist.length})`]].map(([k, l]) => `<button class="${MK.board === k ? 'on' : ''}" data-board="${k}">${l}</button>`).join('')}</div></div>
    <span class="spacer"></span>
    <span class="av-stack bh-people">${PEOPLE.filter(p => all.some(x => x.people.includes(p.id))).map(p => avatar(p.name)).join('')}</span>
    <button class="btn ${filtersOn ? 'primary' : ''}" id="tk-filters">${ICON.gantt(14)} Filtros</button>
    <button class="btn" id="tk-pdf" title="Informe PDF">${ICON.pdf(14)}</button>
    <button class="btn dark" id="tk-new">${ICON.plus(14)} Crear tarea</button>
  </div>
  ${filtersOn ? `<div class="row wrap no-print" style="margin:0 4px 14px">
    <div class="seg">${['Todas', ...AREAS].map(a => `<button class="${MK.area === a ? 'on' : ''}" data-area="${a}">${a}</button>`).join('')}</div>
    <label class="search" style="max-width:280px">${ICON.search(14)}<input id="tk-q" placeholder="Buscar…" value="${esc(MK.q)}"></label>
  </div>` : ''}
  ${MK.board === 'tablero' ? `<div class="kanban">${TASK_STATES.map(s => { const rows = board.filter(t => t.state === s.id).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')); return `<div class="kcol"><div class="kcol-head"><span class="kc-caret">${ICON.chevR(12)}</span><span class="kc-title">${s.name}</span><span class="n">${rows.length}</span><span class="spacer"></span><button class="icon-btn sm no-print" data-knew="${s.id}" title="Nueva tarea en ${s.name}">${ICON.plus(13)}</button></div><div class="kcol-body">${rows.map(taskCard).join('') || '<div class="xs muted" style="text-align:center;padding:14px">Sin tareas</div>'}</div></div>`; }).join('')}</div>`
    : `<div class="card"><table class="table"><thead><tr><th>Tarea</th><th>Área</th><th>Prioridad</th><th>Responsables</th><th>Cerrada</th><th></th></tr></thead><tbody>${hist.sort((a, b) => b.doneAt.localeCompare(a.doneAt)).map(t => `<tr><td class="b">${esc(t.title)}</td><td>${chip(t.area, 'var(--app-marketing)')}</td><td>${chip(priOf(t.pri).name, priOf(t.pri).c)}</td><td>${avStack(t.people.map(p => personOf(p).name))}</td><td class="muted">${fmtDate(t.doneAt)}</td><td class="r"><button class="icon-btn sm" data-edit="${t.id}">${ICON.edit(13)}</button></td></tr>`).join('') || `<tr><td colspan="6">${empty('Historial vacío')}</td></tr>`}</tbody></table></div>`}`;
}
function bindTareas(el) {
  $('#tk-new', el).onclick = () => taskModal(null);
  $('#tk-pdf', el).onclick = () => (typeof buildReport === 'function' ? buildReport(Router.parse()) : printSection('Tareas'));
  $('#tk-filters', el).onclick = () => { MK.showFilters = !MK.showFilters; if (!MK.showFilters) { MK.area = 'Todas'; MK.q = ''; } mkSave(); render(); };
  $$('[data-board]', el).forEach(b => b.onclick = () => { MK.board = b.dataset.board; mkSave(); render(); });
  $$('[data-area]', el).forEach(b => b.onclick = () => { MK.area = b.dataset.area; mkSave(); render(); });
  $$('[data-knew]', el).forEach(b => b.onclick = () => taskModal(null, b.dataset.knew));
  const q = $('#tk-q', el); if (q) q.oninput = e => { MK.q = e.target.value; mkSave(); const v = e.target; render(); const n = $('#tk-q'); if (n) { n.focus(); n.setSelectionRange(v.value.length, v.value.length); } };
  bindTasks(el);
}

// ---------- Equipo › Calendario ----------
function eventModal(ev, date) {
  const e = ev || { title: '', type: 'rrss', date: date || MK.calDay, who: ME.id, time: '', notes: '' };
  openModal(modalHtml(ev ? 'Editar evento' : 'Agendar', `
    <div class="field"><label>Título</label><input class="input" id="ev-title" value="${esc(e.title)}" placeholder="Ej: Reel lanzamiento Workwear"></div>
    <div class="field"><label>Tipo</label><div class="chips" id="ev-type">${EVENT_TYPES.map(t => `<button type="button" class="chip-btn c ${t.id === e.type ? 'on' : ''}" style="--c:${t.c}" data-type="${t.id}"><i></i>${t.name}</button>`).join('')}</div></div>
    <div class="form-grid">
      <div class="field"><label>Fecha</label><input class="input" type="date" id="ev-date" value="${e.date}"></div>
      <div class="field"><label>Hora (opcional)</label><input class="input" type="time" id="ev-time" value="${e.time || ''}"></div>
    </div>
    <div class="field"><label>Responsable</label><div class="chips">${peopleChips([e.who], 'who')}</div></div>
    <div class="field"><label>Notas</label><textarea class="input" id="ev-notes" rows="3">${esc(e.notes || '')}</textarea></div>
  `, `${ev ? `<button class="btn ghost danger" id="ev-del">${ICON.trash(14)} Eliminar</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ev-save">${ev ? 'Guardar' : 'Agendar'}</button>`), {
    narrow: true,
    onMount(m) {
      let type = e.type, who = e.who;
      $$('[data-type]', m).forEach(b => b.onclick = () => { type = b.dataset.type; $$('[data-type]', m).forEach(x => x.classList.toggle('on', x === b)); });
      $$('[data-who]', m).forEach(b => b.onclick = () => { who = b.dataset.who; $$('[data-who]', m).forEach(x => x.classList.toggle('on', x === b)); });
      $('#ev-save', m).onclick = () => { const title = $('#ev-title', m).value.trim(); if (!title) return toast('Escribe un título', true); Store.upsert('events', { ...e, id: e.id || uid(), title, type, who, date: $('#ev-date', m).value, time: $('#ev-time', m).value, notes: $('#ev-notes', m).value }); MK.calDay = $('#ev-date', m).value; mkSave(); closeModal(); render(); };
      const del = $('#ev-del', m); if (del) del.onclick = () => { Store.remove('events', e.id); closeModal(); render(); };
    },
  });
}
function equipoCalendario() {
  const [y, m] = MK.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1); const startDow = (first.getDay() + 6) % 7; const dim = new Date(y, m, 0).getDate();
  const evs = [...Store.list('events'), ...birthdayEvents(MK.calMonth)].filter(e => !MK.calWho || e.who === MK.calWho);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m - 1, 1 - startDow + i); const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const list = evs.filter(e => e.date === iso).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    cells.push(`<div class="day ${d.getMonth() !== m - 1 ? 'out' : ''} ${iso === todayIso() ? 'today' : ''} ${iso === MK.calDay ? 'sel' : ''}" data-day="${iso}"><span class="n">${d.getDate()}</span><span class="dotrow">${list.map(e => `<i style="background:${evTypeOf(e.type).c}"></i>`).join('')}</span>${list.slice(0, 3).map(e => `<span class="ev" style="--c:${evTypeOf(e.type).c}" title="${esc(e.title)}">${esc(e.title)}</span>`).join('')}${list.length > 3 ? `<span class="xs muted">+${list.length - 3} más</span>` : ''}</div>`);
    if (i === 34 && new Date(y, m - 1, 1 - startDow + 35).getMonth() !== m - 1) break;
  }
  const dayList = evs.filter(e => e.date === MK.calDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const tasksDue = Store.list('tasks').filter(t => t.due === MK.calDay && t.state !== 'done');
  const dd = parseDay(MK.calDay);
  const monthName = first.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return `
  <div class="page-head"><div><h1>Calendario</h1><p>Organización de redes sociales, entregas, reuniones e hitos del equipo.</p></div>
    <div class="actions"><button class="btn" id="cal-pdf">${ICON.pdf(14)} Informe PDF</button><button class="btn primary" id="cal-new">${ICON.plus(14)} Agendar</button></div></div>
  <div class="grid" style="grid-template-columns:1fr 300px">
    <div class="card">
      <div class="row cal-head" style="margin-bottom:10px"><button class="icon-btn sm" id="cal-prev">${ICON.chevL(14)}</button><h3 style="min-width:170px;text-align:center">${cap(monthName)}</h3><button class="icon-btn sm" id="cal-next">${ICON.chevR(14)}</button><button class="btn ghost sm" id="cal-today">Hoy</button><span class="spacer"></span><span class="sm muted">Agenda de</span><select class="select" id="cal-who" style="width:170px"><option value="">Todo el equipo</option>${PEOPLE.map(p => `<option value="${p.id}" ${MK.calWho === p.id ? 'selected' : ''}>${esc(p.short)}</option>`).join('')}</select></div>
      <div class="chips" style="margin-bottom:12px">${EVENT_TYPES.map(t => `<span class="xs muted row" style="gap:5px"><i style="width:8px;height:8px;border-radius:50%;background:${t.c}"></i>${t.name}</span>`).join('')}</div>
      <div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="dow">${d}</div>`).join('')}${cells.join('')}</div>
    </div>
    <div class="card" style="align-self:start">
      <h2>${cap(dd.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' }))}</h2>
      <div class="sm muted" style="margin-bottom:12px">${dd.toLocaleDateString('es-CL', { month: 'long' })} · ${dayList.length + tasksDue.length} ${dayList.length + tasksDue.length === 1 ? 'ítem' : 'ítems'}</div>
      <div class="grid" style="gap:8px">
        ${dayList.map(e => `<div class="card flat link" data-ev="${e.id}" style="padding:12px;border-left:3px solid ${evTypeOf(e.type).c}"><div class="row"><span class="xs b muted" style="text-transform:uppercase;letter-spacing:.06em">${evTypeOf(e.type).name}${e.time ? ' · ' + e.time : ''}</span></div><div class="b" style="margin:4px 0 8px">${esc(e.title)}</div><div class="row">${avatar(personOf(e.who).name)}<span class="sm muted">${esc(personOf(e.who).short)}</span></div></div>`).join('')}
        ${tasksDue.map(t => `<div class="card flat link" data-go="marketing/equipo/tareas" style="padding:12px;border-left:3px solid ${priOf(t.pri).c}"><span class="xs b muted" style="text-transform:uppercase;letter-spacing:.06em">Término de tarea</span><div class="b" style="margin:4px 0 8px">${esc(t.title)}</div><div class="row">${avStack(t.people.map(p => personOf(p).name))}<span class="spacer"></span><span class="sm" style="color:var(--accent)">Ver en Tareas</span></div></div>`).join('')}
        ${!dayList.length && !tasksDue.length ? empty('Nada agendado', '<div class="sm">Usa + Agendar para añadir</div>') : ''}
      </div>
    </div>
  </div>`;
}
function bindCalendario(el) {
  const shift = n => { const [y, m] = MK.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); MK.calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; mkSave(); render(); };
  $('#cal-prev', el).onclick = () => shift(-1); $('#cal-next', el).onclick = () => shift(1);
  $('#cal-today', el).onclick = () => { MK.calMonth = todayIso().slice(0, 7); MK.calDay = todayIso(); mkSave(); render(); };
  $('#cal-new', el).onclick = () => eventModal(null, MK.calDay);
  $('#cal-pdf', el).onclick = () => printSection('Calendario');
  $('#cal-who', el).onchange = e => { MK.calWho = e.target.value; mkSave(); render(); };
  $$('[data-day]', el).forEach(d => { d.onclick = () => { MK.calDay = d.dataset.day; mkSave(); render(); }; d.ondblclick = () => eventModal(null, d.dataset.day); });
  $$('[data-ev]', el).forEach(c => c.onclick = () => { const e = Store.list('events').find(e => e.id === c.dataset.ev); if (e) eventModal(e); else Router.go('marketing/equipo/personas'); });
}

// ---------- Registro de páginas ----------
PAGES.marketing = route => {
  const key = `${route.sec}/${route.sub}`;
  const map = {
    'equipo/inicio':     { title: 'Equipo · Inicio',     html: equipoInicio, mount: el => { const tick = () => { const d = new Date(); const c = $('#clock', el); if (c) c.innerHTML = `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}<small class="sm muted" style="margin-left:4px">${d.getHours() < 12 ? 'AM' : 'PM'}</small>`; }; tick(); } },
    'equipo/checklist':  { title: 'Mi checklist', html: checklistPagina, mount: bindChecklist },
    'equipo/tareas':     { title: 'Tablero',    html: equipoTareas,     mount: bindTareas },
    'equipo/calendario': { title: 'Calendario', html: equipoCalendario, mount: bindCalendario },
    'equipo/personas':   { title: 'Equipo',     html: equipoPersonas,   mount: bindPersonas },
    'ventas/inicio':     { title: 'Ventas · Inicio', html: () => ventasInicio(route),  mount: bindVentas },
    'ventas/campanas':   { title: 'Campañas',  html: () => ventasCampanas(route), mount: bindVentas },
    'ventas/registro':   { title: 'Registro de ventas', html: () => ventasRegistro(route), mount: bindVentas },
    'ventas/resumen':    { title: 'Ventas · Resumen', html: () => ventasResumen(route),  mount: bindVentas },
  };
  const p = map[key] || map['equipo/checklist'];
  return { title: p.title, html: p.html(), mount: p.mount };
};
