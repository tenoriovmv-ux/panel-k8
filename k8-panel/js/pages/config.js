// ============================================================
// Configuración K8 · Stock Manager, Actividad, Equipo K8 (accesos), Mi perfil
// ============================================================
'use strict';

const CF = { q: '' };
const ROLES_K8 = ['Lector', 'Editor', 'Vendedor', 'Administrador K8'];
const CANALES = ['Sin canal', 'Ventas digitales', 'Showroom', 'Distribuidores', 'Licitaciones'];

// ---------- Stock Manager ----------
function cfgStock() {
  const rows = Store.read('stock_rows', []);
  const q = CF.q.toLowerCase();
  const list = rows.filter(r => !q || r.code.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)).slice(0, 200);
  const bodegas = ['SHBE', 'SHLF', 'SHGJ', 'SHCM', 'SHAT', 'SHDG'];
  return `
  <div class="page-head"><div><h1>Stock Manager</h1><p>Existencias por código y bodega, tal como las entrega Manager.</p></div>
    <div class="actions"><button class="btn" id="st-import">${ICON.upload(14)} Importar informe de Manager</button></div></div>
  <div class="row no-print" style="margin:0 4px 12px"><label class="search" style="max-width:none;flex:1">${ICON.search(14)}<input id="st-q" placeholder="Código o descripción en Manager…" value="${esc(CF.q)}"></label><button class="btn primary" id="st-buscar">Buscar</button></div>
  <div class="card">
    <div class="row" style="margin-bottom:8px"><span class="sm muted">${rows.length ? `${fmtInt(rows.length)} códigos` : 'Sin datos cargados'}</span><span class="spacer"></span><span class="sm muted">Fuente: Manager${rows.length && Store.read('stock_at', '') ? ' · ' + new Date(Store.read('stock_at', '')).toLocaleString('es-CL') : ''}</span>${CONN.manager ? '' : pendingChip('Manager: pendiente de conexión')}</div>
    ${rows.length ? `<table class="table"><thead><tr><th>Código</th><th>Descripción</th><th class="r">Total</th>${bodegas.map(b => `<th class="r">${b}</th>`).join('')}</tr></thead><tbody>
      ${list.map(r => `<tr><td class="mono b">${esc(r.code)}</td><td>${esc(r.desc)}</td><td class="r b ${r.total < 0 ? 'danger' : ''}">${r.total}</td>${bodegas.map(b => `<td class="r ${(r[b] || 0) < 0 ? 'danger' : ''}">${r[b] || 0}</td>`).join('')}</tr>`).join('')}
      </tbody></table>${list.length === 200 ? '<div class="xs muted" style="margin-top:8px">Se muestran los primeros 200; usa el buscador para acotar.</div>' : ''}`
      : empty('Sin stock cargado', '<div class="sm">Cuando Manager esté conectado, esta tabla se llena sola. Mientras tanto puedes importar el informe de existencias (Excel o CSV) con el botón de arriba.</div>')}
  </div>`;
}
function bindStock(el) {
  $('#st-q', el).oninput = e => { CF.q = e.target.value; };
  $('#st-buscar', el).onclick = () => render();
  $('#st-q', el).onkeydown = e => { if (e.key === 'Enter') render(); };
  $('#st-import', el).onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.xlsx,.xls';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        let rows = [];
        if (/\.csv$/i.test(f.name)) {
          const txt = await f.text(); const lines = txt.split(/\r?\n/).filter(Boolean); const sep = lines[0].includes(';') ? ';' : ',';
          const H = lines[0].split(sep).map(h => h.trim().toUpperCase());
          const ci = n => H.findIndex(h => h.includes(n));
          const iC = ci('CODIGO') >= 0 ? ci('CODIGO') : ci('CÓDIGO'), iD = ci('DESCRIP'), iT = ci('TOTAL');
          rows = lines.slice(1).map(l => { const c = l.split(sep); const r = { code: c[iC] || '', desc: c[iD] || '', total: Number(String(c[iT] || '0').replace(',', '.')) || 0 }; ['SHBE', 'SHLF', 'SHGJ', 'SHCM', 'SHAT', 'SHDG'].forEach(b => { const i = ci(b); if (i >= 0) r[b] = Number(String(c[i] || '0').replace(',', '.')) || 0; }); return r; }).filter(r => r.code);
        } else if (window.XLSX) {
          const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; const arr = XLSX.utils.sheet_to_json(ws, { header: 1 });
          const hi = arr.findIndex(r => r.some(c => /CODIGO|CÓDIGO/i.test(String(c)))); const H = arr[hi].map(h => String(h).toUpperCase());
          const ci = n => H.findIndex(h => h.includes(n));
          rows = arr.slice(hi + 1).map(c => { const r = { code: String(c[ci('CODIGO') >= 0 ? ci('CODIGO') : ci('CÓDIGO')] || ''), desc: String(c[ci('DESCRIP')] || ''), total: Number(c[ci('TOTAL')]) || 0 }; ['SHBE', 'SHLF', 'SHGJ', 'SHCM', 'SHAT', 'SHDG'].forEach(b => { const i = ci(b); if (i >= 0) r[b] = Number(c[i]) || 0; }); return r; }).filter(r => r.code);
        } else return toast('Para Excel se necesita la librería XLSX; usa CSV por ahora', true);
        Store.write('stock_rows', rows); Store.write('stock_at', new Date().toISOString()); toast(`${rows.length} códigos importados`); render();
      } catch (e) { console.error(e); toast('No se pudo leer el informe: ' + e.message, true); }
    };
    inp.click();
  };
}

// ---------- Actividad ----------
function cfgActividad() {
  const items = [];
  Store.list('prod_activity').forEach(l => items.push({ at: l.at, who: l.who, what: l.text, where: prodById(l.pid)?.name || '', app: 'Productos' }));
  Store.list('activity').forEach(l => items.push({ at: l.at, who: l.who, what: `${l.action} campaña`, where: l.name, app: 'Ventas' }));
  Store.list('tasks').filter(t => t.doneAt).forEach(t => items.push({ at: t.doneAt + 'T12:00:00', who: t.people.map(p => personOf(p).short).join(', '), what: 'Tarea completada', where: t.title, app: 'Tareas' }));
  Store.list('sales').slice(0, 40).forEach(s => items.push({ at: `${s.date}T${s.time || '12:00'}:00`, who: s.seller ? personOf(s.seller).short : '—', what: s.kind === 'nc' ? 'Nota de crédito' : 'Venta registrada', where: `${s.client || ''} · ${fmtMoney(s.amount)}`, app: 'Ventas' }));
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return `
  <div class="page-head"><div><h1>Actividad</h1><p>Lo último que hizo cada persona en K8 App.</p></div></div>
  <div class="card"><h3 style="margin-bottom:8px">Actividad K8</h3>
    <div class="list">${items.slice(0, 80).map(i => `<div class="act-row">${avatar(i.who || '?')}<div style="min-width:0"><div><span class="who">${esc(i.who || '—')}</span> · <span class="what">${esc(i.what)}</span></div><div class="sm" style="color:var(--accent)">${esc(i.where)}</div><div class="xs muted">${new Date(i.at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${i.app}</div></div></div>`).join('') || empty('Sin actividad todavía')}</div>
  </div>`;
}

// ---------- Equipo K8 (accesos) ----------
function cfgEquipo() {
  const people = Store.read('people', []).filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name));
  return `
  <div class="page-head"><div><h1>Equipo K8</h1><p>Acceso y rol de cada usuario dentro de K8 App.</p></div><div class="actions"><button class="btn" data-go="marketing/equipo/personas">${ICON.users(14)} Integrantes y colores</button></div></div>
  <div class="card"><h3>Acceso de usuarios existentes</h3><div class="sm muted" style="margin-bottom:10px">Este panel no crea cuentas ni cambia contraseñas. Las cuentas las administra TI en el servidor de K8.</div>
    <table class="table"><thead><tr><th>Usuario</th><th>Acceso</th><th>Rol K8</th><th>Canal vendedor</th></tr></thead><tbody>
    ${people.map(p => `<tr><td><b>${esc(p.name)}</b><div class="xs muted">${esc(p.account || 'sin cuenta')}${p.email ? ' · ' + esc(p.email) : ''}</div></td>
      <td><input type="checkbox" data-acc="${p.id}" ${p.access !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)"></td>
      <td><select class="select" data-role="${p.id}" style="width:190px">${ROLES_K8.map(r => `<option ${(p.roleK8 || (p.perms?.includes('admin') ? 'Administrador K8' : 'Lector')) === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><select class="select" data-canal="${p.id}" style="width:170px">${CANALES.map(c => `<option ${(p.canal || 'Sin canal') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td></tr>`).join('')}
    </tbody></table></div>`;
}
function bindEquipoK8(el) {
  const upd = (id, fn) => { const list = Store.read('people', []); const p = list.find(x => x.id === id); if (p) { fn(p); Store.write('people', list); loadPeople(); toast('Guardado'); } };
  $$('[data-acc]', el).forEach(i => i.onchange = () => upd(i.dataset.acc, p => { p.access = i.checked; }));
  $$('[data-role]', el).forEach(s => s.onchange = () => upd(s.dataset.role, p => { p.roleK8 = s.value; }));
  $$('[data-canal]', el).forEach(s => s.onchange = () => upd(s.dataset.canal, p => { p.canal = s.value; }));
}

// ---------- Mi perfil ----------
function cfgPerfil() {
  const me = personOf(ME.id); const full = Store.read('people', []).find(p => p.id === ME.id) || me;
  return `
  <div class="page-head"><div><h1>Mi perfil</h1><p>Quién eres dentro de K8 App.</p></div></div>
  <div class="card profile-card">
    ${avatar(me.name, 'lg')}
    <h2>${esc(me.name)}</h2><div class="sm muted">${esc(full.account || 'sin cuenta')}</div>
    <div class="role-box"><div class="lbl">Rol dentro de K8</div><div class="val">${esc(full.roleK8 || (full.perms?.includes('admin') ? 'Administrador K8' : 'Lector'))}</div></div>
    <div class="row wrap" style="justify-content:center;gap:6px">${chip(full.area || 'Marketing', 'var(--app-marketing)')}${(full.perms || []).map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    <div class="sm muted" style="margin-top:14px">La cuenta, la contraseña y los permisos generales se administran desde el servidor de K8 (TI).</div>
    <div style="margin-top:14px"><button class="btn" data-go="marketing/equipo/personas">${ICON.edit(13)} Editar mis datos en Equipo</button></div>
  </div>`;
}

PAGES.config = route => {
  const map = { stock: ['Stock Manager', cfgStock, bindStock], actividad: ['Actividad', cfgActividad], equipo: ['Equipo K8', cfgEquipo, bindEquipoK8], perfil: ['Mi perfil', cfgPerfil] };
  const [title, fn, mount] = map[route.sec] || map.perfil;
  return { title, html: fn(), mount };
};
