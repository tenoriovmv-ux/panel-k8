// ============================================================
// Informes · hojas iguales al Excel "Vendedores de campaña Dardignac" (Power BI de Francisca),
// calculadas con los datos de Manager del panel (Power BI directo) para cualquier período,
// más columnas de campañas, WhatsApp y seguimiento. Las usa el Excel del informe.
// Definiciones (las mismas del Excel):
//   Nuevo = primera compra en TLA dentro del período · Nuevo en ropa = era cliente (de telas) y compra ropa
//   de trabajo por primera vez · Recuperado = más de 12 meses sin comprar · Recurrente = el resto ·
//   Boleta anónima = sin RUT. Captado = el vendedor de su primera compra.
// ============================================================
'use strict';

const INF_ANON = /CLIENTE CON BOLETA/i;
const infModelo = cod => String(cod || '').split('.').slice(0, -1).join('.') || cod;
const infSinTalla = p => String(p || '').replace(/\s*\([^)]*\)\s*$/, '').trim();

function infTablas(per, R) {
  const M = INF.m; if (!M) return [];
  const [a, b] = [per.a, per.b]; const enP = f => f && f >= a && f <= b;
  const hace = (iso, d) => infIso(new Date(parseDay(iso).getTime() - d * 864e5));
  const VEND = Object.keys(INF_VEND);
  const nom = cod => (INF_VEND[cod] || {}).n || cod;
  const cli = {}; for (const c of M.clientes) cli[c.rut] = c;
  const lin = M.lineas.filter(l => enP(l.f) && VEND.includes(l.vend) && infEnSuc(l.suc));
  const anon = l => !l.rut || INF_ANON.test(l.cli) || /^66666666/.test(l.rut);
  // días con compra en el período (en todo TLA, cualquier vendedor) y quién compró ropa a estos vendedores
  const diasP = {}; for (const l of M.lineas) if (enP(l.f) && l.doc !== 'NCV' && l.rut) (diasP[l.rut] = diasP[l.rut] || new Set()).add(l.f);
  const ropaP = new Set(lin.filter(l => l.grupo === 'Ropa de trabajo' && l.doc !== 'NCV').map(l => l.rut));
  // Tipo de cliente en el período
  const tipoDe = {};
  // El Power BI tiene historia desde 2022: si el Excel de Manager (historia desde 2020) ya lo marcó como cliente antiguo pese a comprar ropa, es que ya compraba ropa antes
  const yaRopaAntes = c => c.primera_tla < '2022-01-01' && /^(Recuperado|Recurrente)$/.test(c.tipo_excel || '') && (!M.excel_hasta || c.primera_ropa <= M.excel_hasta);
  const tipo = rut => {
    if (tipoDe[rut]) return tipoDe[rut];
    const c = cli[rut]; let t = 'Recurrente';
    if (!c) t = 'Recurrente';
    else if (enP(c.primera_tla)) t = 'Nuevo';
    else if (c.primera_ropa && enP(c.primera_ropa) && ropaP.has(rut) && !yaRopaAntes(c)) t = 'Nuevo en ropa';
    else { const ant = asList(c.dias).filter(d => d < a).pop() || ''; if (!ant || ant < hace(a, 365)) t = 'Recuperado'; }
    return (tipoDe[rut] = t);
  };
  const tipoLinea = l => anon(l) ? 'Boleta anónima' : tipo(l.rut);
  // Cotizaciones de estos vendedores en el período
  const cotsTodas = M.cotizaciones.filter(q => enP(q.f) && (VEND.includes(q.vend) || (!q.vend && q.origen && infEnSuc(q.suc))));
  const cots = cotsTodas.filter(q => q.vend);
  // Chats de WhatsApp por teléfono (para las columnas nuevas)
  const chats = (infWa() ? asList(infWa().chats) : []);
  const waTel = {}; for (const ch of chats) { const t = infTel(ch.phone); if (t && !INF_TEL_GENERICOS.includes(t)) waTel[t] = ch; }
  const chatDe = c => { const t = infTel(c && c.tel); return t && !INF_TEL_GENERICOS.includes(t) ? waTel[t] : null; };
  const isoT = t => t ? infIso(new Date(t * 1000)) : '';
  const camps = asList(infAds() && infAds().campaigns).map(c => { const d = asList(c.daily).filter(x => x && x.date && Number(x.spent || 0) > 0).map(x => x.date).sort(); return { name: c.name, tipo: infTipoCampana(c), a: d[0], b: d[d.length - 1] }; }).filter(c => c.a);
  const campEn = f => camps.filter(c => c.a <= f && infIso(new Date(parseDay(c.b).getTime() + 14 * 864e5)) >= f).map(c => `${c.name} [${INF_TIPO[c.tipo].n}]`).join(' · ');
  const vendActivos = VEND.filter(v => lin.some(l => l.vend === v) || cots.some(q => q.vend === v));

  // ---------- Ranking vendedores ----------
  const rk1 = [], rk2 = [], rk3 = [];
  for (const v of vendActivos) {
    const ls = lin.filter(l => l.vend === v); const qs = cots.filter(q => q.vend === v);
    const fechas = [...ls.map(l => l.f), ...qs.map(q => q.f)].sort();
    // igual que el Excel: activo desde su primera venta o cotización (o desde que entró) hasta hoy o hasta que salió; semanas redondeadas
    const iv = INF_VEND[v]; let desde = fechas[0] || a, hasta = fechas[fechas.length - 1] || a;
    if (iv.desde && iv.desde > desde) desde = iv.desde; if (iv.hasta && iv.hasta < hasta) hasta = iv.hasta;
    const activo = (!iv.hasta || iv.hasta >= b) && hasta >= hace(b, 7);
    const sem = Math.max(1, Math.round(daysBetween(desde, activo ? b : hasta) / 7));
    const sucs = {}; for (const l of ls) sucs[l.suc] = (sucs[l.suc] || 0) + l.neto; const sucMas = Object.entries(sucs).sort((x, y) => y[1] - x[1])[0];
    const captados = M.clientes.filter(c => c.capto === v && enP(c.primera_tla));
    const lsN = ls.filter(l => !anon(l) && tipo(l.rut) === 'Nuevo');
    const atend = [...new Set(lsN.map(l => l.rut))];
    const ventaN = lsN.reduce((t, l) => t + l.neto, 0);
    const docsN = new Set(lsN.filter(l => l.doc !== 'NCV').map(l => l.doc + l.folio)).size;
    const diasCli = rut => (diasP[rut] || new Set()).size;
    const volvieron = atend.filter(r => diasCli(r) > 1).length;
    const boletas = new Set(ls.filter(l => anon(l) && l.doc !== 'NCV').map(l => l.doc + l.folio)).size;
    rk1.push([nom(v), v, sucMas ? sucMas[0] : '', desde, activo ? 'Activo' : hasta, sem, captados.length, captados.length / sem, atend.length, ventaN, ventaN / sem, docsN ? ventaN / docsN : 0, atend.length ? ventaN / atend.length : 0, volvieron, atend.length ? volvieron / atend.length : 0, boletas]);
    const venta = ls.reduce((t, l) => t + l.neto, 0);
    const pros = qs.filter(q => q.tipo === 'Prospecto nuevo');
    rk2.push([nom(v), venta, venta / sem, ls.filter(l => l.grupo === 'Ropa de trabajo').reduce((t, l) => t + l.neto, 0), ls.filter(l => l.grupo !== 'Ropa de trabajo').reduce((t, l) => t + l.neto, 0), venta ? ventaN / venta : 0, new Set(ls.filter(l => !anon(l) && l.doc !== 'NCV').map(l => l.rut)).size, new Set(ls.filter(l => l.doc !== 'NCV').map(l => l.doc + l.folio)).size, qs.length, qs.reduce((t, q) => t + q.monto, 0), qs.filter(q => q.estado === 'Ganada').length, qs.length ? qs.filter(q => q.estado === 'Ganada').length / qs.length : 0, qs.filter(q => q.estado === 'Abierta').length, qs.filter(q => q.estado === 'Abierta').reduce((t, q) => t + q.monto, 0), pros.length, pros.filter(q => q.estado === 'Ganada').length, pros.length ? pros.filter(q => q.estado === 'Ganada').length / pros.length : 0, pros.filter(q => q.estado === 'Abierta').length, pros.filter(q => q.estado === 'Abierta').reduce((t, q) => t + q.monto, 0)]);
    const porT = t => { const x = ls.filter(l => tipoLinea(l) === t); return [new Set(x.filter(l => l.doc !== 'NCV').map(l => l.rut)).size, x.reduce((s, l) => s + l.neto, 0)]; };
    const [nr, vr] = porT('Nuevo en ropa'), [rc, vrc] = porT('Recuperado'), [re, vre] = porT('Recurrente');
    rk3.push([nom(v), captados.length, atend.length, ventaN, nr, vr, rc, vrc, re, vre, boletas, ls.filter(l => anon(l)).reduce((s, l) => s + l.neto, 0), venta]);
  }
  const C = (n, t = 'txt', s = false) => ({ n, t, s });
  const hojas = [];
  const sub = `Período ${infDay(a)} al ${infDay(b)}${M.hasta < b ? ` (ventas hasta el ${infDay(M.hasta)})` : ''}. ${INF.marca === 'tla' ? 'Solo ventas y cotizaciones de Krishna, Moira y Gabriel en TELAS CASA MATRIZ y SHOWROOM TLA.' : 'Solo ventas y cotizaciones emitidas en LOCAL DARDIGNAC K8 (Alberto, Catalina, Úrsula y, por WhatsApp, Gabriel y Zorangie); no incluye lo que vendieron en otras sucursales.'} Fuente: Power BI de TLA.`;
  hojas.push({ nombre: 'Ranking vendedores', titulo: 'Vendedores de campaña: captación de clientes nuevos', nota: sub + ' Cliente nuevo = primera compra en TLA dentro del período. Captado = su primera compra en TLA fue en el local con ese vendedor; atendido = le vendió algo.', tablas: [
    { cols: [C('Vendedor'), C('Código'), C('Sucursal donde más vende'), C('Activo desde', 'date'), C('Activo hasta', 'date'), C('Semanas activas en el período', 'int'), C('Clientes nuevos captados', 'int', true), C('Captados por semana', 'dec'), C('Clientes nuevos atendidos', 'int', true), C('Venta a clientes nuevos ($)', 'money', true), C('Venta a nuevos por semana ($)', 'money'), C('Ticket prom. por compra de un nuevo ($)', 'money'), C('Venta prom. por cliente nuevo ($)', 'money'), C('Nuevos que volvieron a comprar', 'int', true), C('% recompra', 'pct'), C('Boletas anónimas (sin RUT)', 'int', true)], filas: rk1, total: true },
    { titulo: 'Venta y cotizaciones', nota: 'Prospecto nuevo = cliente sin compras en TLA antes de la cotización. Ganada = tiene nota de venta. Abierta = sin nota de venta todavía. Después del último Excel de Manager el estado se estima (Ganada = compró dentro de 30 días).', cols: [C('Vendedor'), C('Venta total ($)', 'money', true), C('Venta por semana ($)', 'money'), C('Venta ropa de trabajo ($)', 'money', true), C('Venta telas y otros ($)', 'money', true), C('% de su venta que es a clientes nuevos', 'pct'), C('Clientes con RUT', 'int', true), C('Documentos', 'int', true), C('Cotizaciones', 'int', true), C('Monto cotizado ($)', 'money', true), C('Cotizaciones ganadas (con NV)', 'int', true), C('% conversión', 'pct'), C('Cotizaciones abiertas', 'int', true), C('Monto abierto ($)', 'money', true), C('Cotizaciones a prospectos nuevos', 'int', true), C('Ganadas a prospectos', 'int', true), C('% conversión prospectos', 'pct'), C('Abiertas a prospectos', 'int', true), C('Monto abierto prospectos ($)', 'money', true)], filas: rk2, total: true },
    { titulo: 'Venta por tipo de cliente', nota: 'Un cliente atendido por dos vendedores cuenta en ambos.', cols: [C('Vendedor'), C('Nuevos captados', 'int', true), C('Nuevos atendidos', 'int', true), C('Venta nuevos ($)', 'money', true), C('Nuevos en ropa (eran clientes de telas)', 'int', true), C('Venta nuevos en ropa ($)', 'money', true), C('Recuperados (+12 meses sin comprar)', 'int', true), C('Venta recuperados ($)', 'money', true), C('Recurrentes', 'int', true), C('Venta recurrentes ($)', 'money', true), C('Boletas anónimas', 'int', true), C('Venta boletas anónimas ($)', 'money', true), C('Venta total ($)', 'money', true)], filas: rk3, total: true },
  ] });

  // ---------- Semana a semana ----------
  const lunes = d => { const x = parseDay(d); const k = (x.getDay() + 6) % 7; return infIso(new Date(x.getTime() - k * 864e5)); };
  const sems = []; for (let d = lunes(a); d <= b; d = infIso(new Date(parseDay(d).getTime() + 7 * 864e5))) sems.push(d);
  const gastoSem = (s, tipos) => { const e = infIso(new Date(parseDay(s).getTime() + 6 * 864e5)); return asList(infAds() && infAds().campaigns).filter(c => tipos.includes(infTipoCampana(c))).reduce((t, c) => t + asList(c.daily).filter(x => x && x.date >= s && x.date <= e).reduce((u, x) => u + Number(x.spent || 0), 0), 0); };
  const vSem = vendActivos;
  hojas.push({ nombre: 'Semana a semana', titulo: 'Clientes nuevos captados por semana', nota: 'Semana de la primera compra del cliente, cruzada con lo invertido en Meta y Google esa semana.', tablas: [
    { cols: [C('Semana (lunes)', 'date'), ...vSem.map(v => C(nom(v), 'int', true)), C('Total', 'int', true), C('Invertido Meta tráfico al local ($)', 'money', true), C('Invertido Meta WhatsApp ($)', 'money', true), C('Invertido Meta otras ($)', 'money', true), C('Invertido Google ($)', 'money', true)],
      filas: sems.map(s => { const e = infIso(new Date(parseDay(s).getTime() + 6 * 864e5)); const n = vSem.map(v => M.clientes.filter(c => c.capto === v && c.primera_tla >= s && c.primera_tla <= e && enP(c.primera_tla)).length); return [s, ...n, n.reduce((t, x) => t + x, 0), gastoSem(s, ['local']), gastoSem(s, ['whatsapp']), gastoSem(s, ['otras']), gastoSem(s, ['google'])]; }), total: true },
  ] });

  // ---------- Mes a mes (desde septiembre 2026, cuando partieron las campañas) ----------
  const meses = []; for (let d = parseDay(INF_DESDE); infIso(d) <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) meses.push([infIso(d), infIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)), `${INF_MES[d.getMonth()].replace(/^./, s => s.toUpperCase())} ${d.getFullYear()}`]);
  const vLocal = Object.keys(INF_VEND); const enCanal = (v, l) => infEnSuc(l.suc);
  const gastoMes = (x, y, tipos) => asList(infAds() && infAds().campaigns).filter(c => tipos.includes(infTipoCampana(c))).reduce((t, c) => t + asList(c.daily).filter(d => d && d.date >= x && d.date <= y).reduce((u, d) => u + Number(d.spent || 0), 0), 0);
  hojas.push({ nombre: 'Mes a mes', titulo: 'Mes a mes de cada vendedor desde septiembre 2026', nota: 'Clientes nuevos captados y venta de cada uno por mes, con lo invertido en Meta y Google. Vacío = sin ventas ese mes. Local: Alberto, Catalina y Úrsula; WhatsApp: Gabriel y Zorangie.', tablas: [
    { cols: [C('Mes'), ...vLocal.map(v => C('Clientes nuevos captados ' + v, 'int')), ...vLocal.map(v => C('Venta total ' + v + ' ($)', 'money')), C('Invertido Meta tráfico al local ($)', 'money'), C('Invertido Meta WhatsApp ($)', 'money'), C('Invertido Meta otras ($)', 'money'), C('Invertido Google ($)', 'money')],
      filas: meses.map(([x, y, lbl]) => { const ventas = vLocal.map(v => M.lineas.filter(l => l.vend === v && l.f >= x && l.f <= y && enCanal(v, l)).reduce((t, l) => t + l.neto, 0)); return [lbl, ...vLocal.map((v, i) => ventas[i] ? M.clientes.filter(c => c.capto === v && c.primera_tla >= x && c.primera_tla <= y).length : null), ...ventas.map(z => z || null), gastoMes(x, y, ['local']), gastoMes(x, y, ['whatsapp']), gastoMes(x, y, ['otras']), gastoMes(x, y, ['google'])]; }), total: false },
  ] });

  // ---------- Clientes (nuevos y todos) ----------
  const fila = rut => {
    const c = cli[rut] || {}; const ls = lin.filter(l => l.rut === rut);
    const porV = {}; for (const l of ls) porV[l.vend] = (porV[l.vend] || 0) + l.neto;
    const prods = {}; for (const l of ls) { if (l.doc === 'NCV') continue; const k = infSinTalla(l.prod); prods[k] = prods[k] || { q: 0, v: 0 }; prods[k].q += l.q; prods[k].v += l.neto; }
    const qs = cotsTodas.filter(q => q.rut === rut); const abiertas = qs.filter(q => q.estado === 'Abierta');
    const ch = chatDe(c); const fs = ls.map(l => l.f).sort();
    const rc = (R && R.clientes || []).find(x => x.rut === rut) || {};
    return [c.capto || '', Object.entries(porV).sort((x, y) => y[1] - x[1]).map(([k]) => k).join(', '), tipo(rut), rut, c.cli || (ls[0] || {}).cli || '', c.seg || '', c.comuna || '', c.tel || '', /sin@correo|notiene/i.test(c.email || '') ? '' : (c.email || ''), c.primera_tla || '', asList(c.dias).filter(d => d < a).pop() || '', fs[0] || '', fs[fs.length - 1] || '', new Set(fs).size, Object.entries(prods).sort((x, y) => y[1].v - x[1].v).slice(0, 6).map(([k, x]) => `${Math.round(x.q)} ${k}`).join('; '), ls.filter(l => l.grupo === 'Ropa de trabajo').reduce((t, l) => t + l.neto, 0), ls.filter(l => l.grupo !== 'Ropa de trabajo').reduce((t, l) => t + l.neto, 0), ls.reduce((t, l) => t + l.neto, 0), new Set(ls.filter(l => l.doc !== 'NCV').map(l => l.doc + l.folio)).size, abiertas.length, abiertas.reduce((t, q) => t + q.monto, 0), c.comentario || '',
      infRubro(c), ch ? ch.name : '', ch ? isoT(ch.hist_from) : '', rc.ultContacto || '', rc.prox || '', rc.estado || '', fs[0] ? campEn(fs[0]) : ''];
  };
  const colsCli = [C('Lo captó'), C('Le vendieron'), C('Tipo'), C('RUT'), C('Cliente'), C('Segmento (ficha)'), C('Comuna'), C('Teléfono'), C('Email'), C('Primera compra en TLA', 'date'), C('Compra anterior al período', 'date'), C('Primera compra en el período', 'date'), C('Última compra', 'date'), C('Días con compra', 'int'), C('Qué compró'), C('Venta ropa ($)', 'money', true), C('Venta telas y otros ($)', 'money', true), C('Venta total ($)', 'money', true), C('Documentos', 'int', true), C('Cotizaciones abiertas', 'int', true), C('Monto abierto ($)', 'money', true), C('Comentario en la ficha'),
    C('Rubro'), C('Chat de WhatsApp'), C('Primer mensaje en WhatsApp', 'date'), C('Último contacto', 'date'), C('Próximo contacto', 'date'), C('Seguimiento'), C('Campañas activas en su primera compra del período')];
  const rutsTodos = [...new Set(lin.filter(l => !anon(l)).map(l => l.rut))];
  const filasTodos = rutsTodos.map(fila).sort((x, y) => y[17] - x[17]);
  const nuevos = filasTodos.filter(f => f[2] === 'Nuevo');
  hojas.push({ nombre: 'Clientes nuevos', titulo: 'Clientes nuevos de estos vendedores', nota: 'Lo captó = vendedor de su primera compra. Úsalo para seguimiento y recompra. A la derecha: rubro, WhatsApp, seguimiento y campañas que corrían.', tablas: [{ cols: colsCli, filas: nuevos, total: true, filtro: true }] });

  // ---------- Qué vendieron a nuevos ----------
  const qv = {};
  for (const l of lin) { if (anon(l) || tipo(l.rut) !== 'Nuevo' || l.doc === 'NCV') continue; const k = l.vend + '|' + infModelo(l.cod); const x = qv[k] || (qv[k] = { v: l.vend, grupo: l.grupo, fam: l.linea || '', mod: infModelo(l.cod), desc: infSinTalla(l.prod).replace(/^[UHM]\w{5,7}\s+/, ''), un: l.un || '', q: 0, venta: 0, cl: new Set() }); x.q += l.q; x.venta += l.neto; x.cl.add(l.rut); }
  hojas.push({ nombre: 'Qué vendieron a nuevos', titulo: 'Qué le vendió cada uno a sus clientes nuevos', nota: 'Modelo = código sin la talla o variante. Cantidad en la unidad del producto (metros o unidades: no sumar entre sí).', tablas: [{ cols: [C('Código vend.'), C('Vendedor'), C('Grupo'), C('Familia'), C('Modelo'), C('Descripción'), C('Unidad'), C('Cantidad', 'dec'), C('Venta a clientes nuevos ($)', 'money', true), C('Clientes nuevos', 'int')], filas: Object.values(qv).sort((x, y) => x.v.localeCompare(y.v) || y.venta - x.venta).map(x => [x.v, nom(x.v), x.grupo, x.fam, x.mod, x.desc, x.un, x.q, x.venta, x.cl.size]), total: true, filtro: true }] });

  // ---------- Cotizaciones ----------
  hojas.push({ nombre: 'Cotizaciones', titulo: 'Cotizaciones de estos vendedores', nota: 'Filtra Estado = Abierta y Tipo = Prospecto nuevo para ver las oportunidades de campaña que faltan cerrar.', tablas: [{ cols: [C('Fecha', 'date'), C('N° cotización'), C('Vendedor'), C('Sucursal'), C('RUT'), C('Cliente'), C('Tipo de cliente'), C('Estado'), C('Monto cotizado ($)', 'money', true), C('Fecha NV', 'date'), C('Monto NV ($)', 'money', true), C('Teléfono'), C('Email'), C('Comuna'), C('Chat de WhatsApp'), C('Campañas que corrían')],
    filas: cotsTodas.sort((x, y) => x.f.localeCompare(y.f)).map(q => { const c = cli[q.rut] || {}; const tel = q.tel || c.tel || ''; const ch = chatDe({ tel }); return [q.f, q.num, q.vend || 'Sin asignar (estimado)', q.suc || '', q.rut, q.cli, q.tipo, q.estado + (q.origen ? ' (estimado)' : ''), q.monto, q.f_nv || '', q.monto_nv, tel, /sin@correo|notiene/i.test(q.email || c.email || '') ? '' : (q.email || c.email || ''), q.comuna || c.comuna || '', ch ? ch.name : '', campEn(q.f)]; }), total: true, filtro: true }] });

  hojas.push({ nombre: 'Todos los clientes', titulo: 'Todos los clientes con RUT de estos vendedores', nota: 'Incluye nuevos, nuevos en ropa, recuperados y recurrentes. Filtra por Tipo o por Le vendieron.', tablas: [{ cols: colsCli, filas: filasTodos, total: true, filtro: true }] });

  // ---------- Detalle ----------
  hojas.push({ nombre: 'Detalle', titulo: 'Detalle línea a línea', nota: 'Notas de crédito en negativo. Neto línea = neto del documento prorrateado.', tablas: [{ cols: [C('Fecha', 'date'), C('Tipo doc.'), C('Folio'), C('Sucursal'), C('Vendedor'), C('Tipo de cliente'), C('Lo captó este vendedor'), C('RUT'), C('Cliente'), C('Grupo'), C('Código'), C('Producto'), C('Unidad'), C('Cantidad', 'dec', true), C('Neto línea ($)', 'money', true)],
    filas: lin.sort((x, y) => x.f.localeCompare(y.f) || String(x.folio).localeCompare(String(y.folio))).map(l => { const t = tipoLinea(l); const c = cli[l.rut]; return [l.f, l.doc, l.folio, l.suc, l.vend, t, t === 'Nuevo' && c && c.capto === l.vend ? 'Sí' : '', l.rut, l.cli, l.grupo, l.cod, l.prod, l.un || '', l.q, l.neto]; }), total: true, filtro: true }] });
  return hojas;
}
