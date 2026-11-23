// ============================================================
// K8 Panel · definiciones y datos iniciales (demo)
// Todo lo que está aquí es editable desde la app y se guarda en el Store.
// ============================================================
'use strict';

const LINES = [
  { id: 'Workwear',  name: 'Workwear',   c: 'var(--line-workwear)',  hex: '#F5A623' },
  { id: 'Outdoor',   name: 'Outdoor',    c: 'var(--line-outdoor)',   hex: '#E8541C' },
  { id: 'Corporate', name: 'Corporate',  c: 'var(--line-corporate)', hex: '#2B3F8C' },
  { id: 'Clinic',    name: 'Clinic',     c: 'var(--line-clinic)',    hex: '#4A9FD8' },
  { id: 'Global',    name: 'Global',     c: 'var(--line-global)',    hex: '#1A1A1A' },
  { id: 'Fabrics',   name: 'K8 Fabrics', c: 'var(--line-fabrics)',   hex: '#D9D9D4' },
];
const lineOf = id => LINES.find(l => l.id === id) || { id, name: id, c: 'var(--faint)', hex: '#999' };

const STAGES = [
  { n: 0, name: 'Idea / Cotización',  short: 'Idea',          c: 'var(--st-0)' },
  { n: 1, name: 'Documentos',         short: 'Documentos',    c: 'var(--st-1)' },
  { n: 2, name: 'Muestras',           short: 'Muestras',      c: 'var(--st-2)' },
  { n: 3, name: 'Producción',         short: 'Producción',    c: 'var(--st-3)' },
  { n: 4, name: 'Llegada',            short: 'Llegada',       c: 'var(--st-4)' },
  { n: 5, name: 'Control de calidad', short: 'Calidad',       c: 'var(--st-5)' },
  { n: 6, name: 'Venta',              short: 'Venta',         c: 'var(--st-6)' },
  { n: 7, name: 'Reposición',         short: 'Reposición',    c: 'var(--st-7)' },
  { n: 8, name: 'Descontinuado',      short: 'Descontinuado', c: 'var(--st-8)' },
];
const stageOf = n => STAGES[n] || STAGES[0];

let PEOPLE = [
  { id: 'vicente',   name: 'Vicente Tenorio', role: 'Marketing y Desarrollo', short: 'Vicente',   color: '#2F5BFF' },
  { id: 'tiare',     name: 'Tiare Sánchez',   role: 'Desarrollo de producto', short: 'Tiare',     color: '#FF4D9D' },
  { id: 'luz',       name: 'Luz',             role: 'Marketing',              short: 'Luz',       color: '#22E07A' },
  { id: 'gabriel',   name: 'Gabriel',         role: 'Ventas digitales',       short: 'Gabriel',   color: '#FF3B5C' },
  { id: 'baoxin',    name: 'Baoxin Gong',     role: 'Producción',             short: 'Baoxin',    color: '#00C2FF' },
  { id: 'francisca', name: 'Francisca Tolosa', role: 'Ventas',                short: 'Francisca', color: '#FFC21A' },
];
const personOf = id => (typeof PEOPLE_ALL !== 'undefined' && PEOPLE_ALL.find(p => p.id === id)) || PEOPLE.find(p => p.id === id) || { id, name: id, short: id };

const AREAS = ['Marketing', 'Desarrollo', 'Ventas'];
const TASK_STATES = [
  { id: 'todo',   name: 'Por hacer',     c: '#8A94A6' },
  { id: 'doing',  name: 'En progreso',   c: '#FF7A1A' },
  { id: 'review', name: 'En aprobación', c: '#2F5BFF' },
  { id: 'done',   name: 'Completada',    c: '#22E07A' },
];
const PRIORITIES = [
  { id: 'alta',  name: 'Alta',  c: 'var(--pri-alta)' },
  { id: 'media', name: 'Media', c: 'var(--pri-media)' },
  { id: 'baja',  name: 'Baja',  c: 'var(--pri-baja)' },
];
const priOf = id => PRIORITIES.find(p => p.id === id) || PRIORITIES[1];

const EVENT_TYPES = [
  { id: 'reunion',  name: 'Reunión',    c: '#2F5BFF' },
  { id: 'rrss',     name: 'RRSS',       c: '#A855F7' },
  { id: 'entrega',  name: 'Entrega',    c: '#22E07A' },
  { id: 'hito',     name: 'Hito',       c: '#FF7A1A' },
  { id: 'tarea',    name: 'Tarea',      c: '#FFC21A' },
  { id: 'cumple',   name: 'Cumpleaños', c: '#00C2FF' },
];
const evTypeOf = id => EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[0];

const CAMPAIGN_TYPES = [
  { id: 'reconocimiento', name: 'Reconocimiento',      c: '#A78BFA' },
  { id: 'trafico',        name: 'Tráfico',             c: '#60A5FA' },
  { id: 'interaccion',    name: 'Interacción',         c: '#F472B6' },
  { id: 'leads',          name: 'Clientes potenciales', c: '#FB923C' },
  { id: 'app',            name: 'Promoción de la app', c: '#2DD4BF' },
  { id: 'ventas',         name: 'Ventas',              c: '#34D399' },
  { id: 'advantage',      name: 'Ventas Advantage+',   c: '#4ADE80' },
  { id: 'geo',            name: 'Geolocalización',     c: '#FBBF24' },
  { id: 'otro',           name: 'Otro',                c: '#9CA3AF' },
];
const ctypeOf = id => CAMPAIGN_TYPES.find(t => t.id === id) || CAMPAIGN_TYPES.at(-1);
const PLATFORMS = [
  { id: 'meta',   name: 'Meta Ads',   c: '#2F5BFF' },
  { id: 'google', name: 'Google Ads', c: '#22E07A' },
];

const ZONES = [
  { id: 'norte',  name: 'Zona Norte',  regions: ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo'] },
  { id: 'centro', name: 'Zona Centro', regions: ['Valparaíso', 'Metropolitana', "O'Higgins", 'Maule'] },
  { id: 'sur',    name: 'Zona Sur',    regions: ['Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'] },
];
const REGIONS = ZONES.flatMap(z => z.regions);
const zoneOfRegion = r => ZONES.find(z => z.regions.includes(r));
const zoneLabel = regions => {
  if (!regions || !regions.length) return 'Sin zona';
  if (regions.length === REGIONS.length) return 'Todo Chile';
  const full = ZONES.filter(z => z.regions.every(r => regions.includes(r)));
  const rest = regions.filter(r => !full.some(z => z.regions.includes(r)));
  const parts = [...full.map(z => z.name), ...rest];
  return parts.length > 3 ? `${parts.slice(0, 3).join(', ')} +${parts.length - 3}` : parts.join(', ');
};

const DOC_TYPES = [
  'Ficha técnica', 'Ficha comercial', 'Tabla de tallas', 'Etiqueta de talla', 'Etiqueta marca y composición',
  'Hangtag', 'Bolsa', 'Caja', 'Códigos de barra', 'Etiqueta adhesiva caja',
];
const DOC_PER_COLOR = ['Códigos de barra', 'Etiqueta adhesiva caja'];

// ---------- Datos iniciales (solo la primera vez) ----------
function seedIfEmpty() {
  if (Store.read('seeded', false)) return;
  const t = todayIso();
  const d = n => { const x = parseDay(t); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

  Store.write('tasks', [
    { id: uid(), title: 'Instalación Letrero de Vitrinas · Temporadas', area: 'Marketing', state: 'todo', pri: 'media', people: ['luz'], start: d(-2), due: d(3), progress: 0 },
    { id: uid(), title: 'Mailing Diseño · Última semana de octubre', area: 'Marketing', state: 'todo', pri: 'alta', people: ['luz'], start: d(-8), due: d(-4), progress: 0 },
    { id: uid(), title: 'Creación Diseño Pilares', area: 'Marketing', state: 'todo', pri: 'baja', people: ['luz'], start: d(-8), due: d(-4), progress: 0 },
    { id: uid(), title: 'Personalización de Tecnologías', area: 'Marketing', state: 'doing', pri: 'alta', people: ['tiare'], start: d(-5), due: d(2), progress: 25, running: true },
    { id: uid(), title: 'Cubos Foam K8 · Nuevo', area: 'Desarrollo', state: 'doing', pri: 'media', people: ['luz'], start: d(-4), due: d(3), progress: 25 },
    { id: uid(), title: 'Diseño mini sala Entrada 2do piso', area: 'Marketing', state: 'doing', pri: 'media', people: ['luz'], start: d(-10), due: d(-4), progress: 25 },
    { id: uid(), title: 'Impresión letrero Madis · Jorge S', area: 'Marketing', state: 'doing', pri: 'alta', people: ['luz'], start: d(-12), due: d(-6), progress: 25, running: true },
    { id: uid(), title: 'Tabla de Costos', area: 'Desarrollo', state: 'doing', pri: 'alta', people: ['tiare'], start: d(-14), due: d(-7), progress: 50 },
    { id: uid(), title: 'Credenciales faltantes del personal', area: 'Marketing', state: 'review', pri: 'baja', people: ['luz'], start: d(-6), due: d(3), progress: 50 },
    { id: uid(), title: 'Mostrarios de tela sección categorías fabrics', area: 'Desarrollo', state: 'review', pri: 'media', people: ['luz'], start: d(-6), due: d(3), progress: 50, running: true },
    { id: uid(), title: 'Visual temporada verano e invierno', area: 'Marketing', state: 'review', pri: 'media', people: ['luz'], start: d(-6), due: d(4), progress: 50, running: true },
    { id: uid(), title: 'Ficha de polerón canguro', area: 'Desarrollo', state: 'review', pri: 'alta', people: ['tiare'], start: d(-7), due: d(0), progress: 50, running: true },
    { id: uid(), title: 'Grilla RRSS septiembre', area: 'Marketing', state: 'done', pri: 'media', people: ['luz', 'tiare'], start: d(-30), due: d(-20), progress: 100, doneAt: d(-19) },
    { id: uid(), title: 'Catálogo Clinic 2026', area: 'Marketing', state: 'done', pri: 'alta', people: ['luz'], start: d(-25), due: d(-12), progress: 100, doneAt: d(-12) },
  ]);

  Store.write('events', [
    { id: uid(), title: 'Tabla de Costos', type: 'tarea', date: d(-7), who: 'tiare' },
    { id: uid(), title: 'Impresión letrero', type: 'entrega', date: d(-6), who: 'luz' },
    { id: uid(), title: 'Creación Diseño Pilares', type: 'entrega', date: d(-4), who: 'luz' },
    { id: uid(), title: 'Post lanzamiento Workwear', type: 'rrss', date: d(-4), who: 'luz' },
    { id: uid(), title: 'Ficha de polerón canguro', type: 'tarea', date: d(0), who: 'tiare' },
    { id: uid(), title: 'Reunión semanal equipo', type: 'reunion', date: d(1), who: 'vicente', time: '10:00' },
    { id: uid(), title: 'Reel Outdoor · TrekLite', type: 'rrss', date: d(2), who: 'luz' },
    { id: uid(), title: 'Fotos de Insumos', type: 'entrega', date: d(3), who: 'luz' },
    { id: uid(), title: 'Mostrarios de tela', type: 'entrega', date: d(3), who: 'luz' },
    { id: uid(), title: 'Visual temporada', type: 'entrega', date: d(4), who: 'luz' },
    { id: uid(), title: 'Catálogo individual', type: 'hito', date: d(4), who: 'tiare' },
    { id: uid(), title: 'Carrusel Clinic', type: 'rrss', date: d(6), who: 'luz' },
    { id: uid(), title: 'Cumpleaños Gabriel', type: 'cumple', date: d(9), who: 'gabriel' },
  ]);

  Store.write('campaigns', [
    { id: 'c1', name: 'Poleron Canguro Oferta', type: 'ventas', platform: 'meta', regions: [...REGIONS], start: d(-34), end: d(-24), state: 'off', budget: 20000, spent: 21000, impressions: 184000, reach: 92000, messages: 62, notes: '' },
    { id: 'c2', name: 'Campaña GeoLite (Distribuidor)', type: 'leads', platform: 'meta', regions: [...REGIONS], start: d(-28), end: d(-14), state: 'off', budget: 15000, spent: 5900, impressions: 61000, reach: 30000, messages: 4, notes: '' },
    { id: 'c3', name: 'Pantalón TrekLite', type: 'ventas', platform: 'meta', regions: [...ZONES[0].regions], start: d(-28), end: d(-22), state: 'off', budget: 12000, spent: 7500, impressions: 54000, reach: 26000, messages: 20, notes: '' },
    { id: 'c4', name: 'Oferta Poleron+Buzo', type: 'ventas', platform: 'meta', regions: [...ZONES[1].regions], start: d(-20), end: d(-8), state: 'off', budget: 30000, spent: 290455, impressions: 1250000, reach: 540000, messages: 709, notes: '' },
    { id: 'c5', name: 'Campaña prueba', type: 'reconocimiento', platform: 'meta', regions: [...REGIONS], start: d(0), end: '', state: 'on', budget: 100000, spent: 0, impressions: 0, reach: 0, messages: 0, notes: '' },
    { id: 'c6', name: 'Búsqueda ropa clínica', type: 'trafico', platform: 'google', regions: [...ZONES[1].regions], start: d(-3), end: '', state: 'on', budget: 15000, spent: 0, impressions: 0, reach: 0, messages: 0, notes: 'Google Ads · pendiente de conexión' },
  ]);

  const sales = [];
  const names = ['INSTALACIONES FLYR SPA', 'Nicolas Sepúlveda', 'Andrea Palma', 'CLÍNICA LOS ANDES', 'Jorge Soto', 'MINERA NORTE LTDA', 'Camila Rojas', 'CONSTRUCTORA PIEDRA', 'Felipe Muñoz', 'LAB BIOCLIN'];
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 39; i++) {
    const day = -Math.floor(rnd() * 34);
    const amt = [9990, 9990, 71040, 24990, 139900, 353586, 45000, 18990][Math.floor(rnd() * 8)];
    const camp = rnd() < .45 ? ['c1', 'c2', 'c3', 'c4'][Math.floor(rnd() * 4)] : '';
    sales.push({ id: uid(), kind: 'venta', amount: amt, nv: String(55001600 + Math.floor(rnd() * 90)), campaign: camp, client: names[Math.floor(rnd() * names.length)], seller: rnd() < .8 ? 'gabriel' : 'francisca', date: d(day), time: `${pad(9 + Math.floor(rnd() * 9))}:${pad(Math.floor(rnd() * 60))}` });
  }
  Store.write('sales', sales);
  Store.write('goals', { [t.slice(0, 7)]: 3500000 });

  const P = (name, line, type, stage, colors, sizes = ['S', 'M', 'L', 'XL', 'XXL'], extra = {}) => ({ id: uid(), name, line, kind: 'prenda', type, stage, colors, sizes, composition: extra.composition || '', weight: extra.weight || '', docs: extra.docs || [], photos: [], since: d(-(extra.age || 20)) });
  const products = [
    P('Buzo Dual Lite Pilot Full', 'Workwear', 'Full Body', 0, [{ n: 'Naranjo flúor / Azul marino', hex: '#FF6A00' }], ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'], { docs: ['Bolsa', 'Caja', 'Códigos de barra · Naranjo flúor', 'Etiqueta adhesiva caja · Naranjo flúor', 'Etiqueta de talla', 'Etiqueta marca y composición', 'Ficha técnica'] }),
    P('Chaqueta StormFlex', 'Corporate', 'Top', 0, [{ n: 'Naranjo Flúor', hex: '#FF6A00' }, { n: 'Amarillo Flúor', hex: '#E5FF00' }]),
    P('Cortaviento Tech Pro 1', 'Corporate', 'Top', 1, [{ n: 'Negro', hex: '#111' }, { n: 'Gris', hex: '#888' }]),
    P('Cortaviento Tech Pro 2', 'Corporate', 'Top', 1, [{ n: 'Gris/Negro', hex: '#666' }, { n: 'Verde Olivo/Negro', hex: '#556B2F' }]),
    P('Cortaviento Tech Pro 3', 'Corporate', 'Top', 2, [{ n: 'Negro/Gris', hex: '#222' }, { n: 'Gris/Negro', hex: '#777' }]),
    P('Essential Top Men', 'Clinic', 'Top', 1, [{ n: 'Negro', hex: '#111' }, { n: 'Azul Rey', hex: '#1E40AF' }], undefined, { composition: '94% poliéster, 6% elastano', weight: '180', age: 27, docs: ['Bolsa', 'Caja', 'Etiqueta de talla', 'Etiqueta marca y composición', 'Ficha técnica', 'Hangtag'] }),
    P('Essential Pant Women', 'Clinic', 'Bottom', 3, [{ n: 'Azul Rey', hex: '#1E40AF' }, { n: 'Verde Quirúrgico', hex: '#2E8B7A' }], undefined, { composition: '94% poliéster, 6% elastano', weight: '180', age: 60, docs: DOC_TYPES.filter(x => !DOC_PER_COLOR.includes(x)) }),
    P('Delantal Blanco Clásico', 'Clinic', 'Top', 6, [{ n: 'Blanco', hex: '#F5F5F5' }], undefined, { age: 200, docs: DOC_TYPES.filter(x => !DOC_PER_COLOR.includes(x)) }),
    P('Blusa Horizon', 'Clinic', 'Top', 4, [{ n: 'Azul Marino', hex: '#1E2A5A' }, { n: 'Beige', hex: '#D9C9A8' }], undefined, { age: 90, docs: ['Bolsa', 'Caja', 'Códigos de barra · Azul Marino', 'Códigos de barra · Beige', 'Etiqueta adhesiva caja · Azul Marino', 'Etiqueta adhesiva caja · Beige', 'Etiqueta de talla', 'Etiqueta marca y composición', 'Ficha técnica', 'Hangtag', 'Tabla de tallas'] }),
    P('Polar Microfleece', 'Outdoor', 'Top', 3, [{ n: 'Negro', hex: '#111' }, { n: 'Azul Petróleo', hex: '#1F4E6B' }], undefined, { age: 45 }),
    P('Polerón Canguro', 'Global', 'Top', 7, [{ n: 'Negro', hex: '#111' }, { n: 'Gris Melange', hex: '#9A9A9A' }], undefined, { age: 320, docs: DOC_TYPES.filter(x => !DOC_PER_COLOR.includes(x)) }),
    P('Pantalón TrekLite', 'Outdoor', 'Bottom', 6, [{ n: 'Beige', hex: '#C9B38A' }, { n: 'Verde Musgo', hex: '#4F6B3A' }], undefined, { age: 150, docs: DOC_TYPES.filter(x => !DOC_PER_COLOR.includes(x)) }),
    P('Casco Protector Cuello', 'Workwear', 'Accesorio', 5, [{ n: 'Naranjo', hex: '#FF6A00' }], ['Única'], { age: 75 }),
    P('Chaqueta Softshell Corporate', 'Corporate', 'Top', 3, [{ n: 'Azul Marino', hex: '#1E2A5A' }], undefined, { age: 50 }),
  ];
  const fabrics = [
    { id: uid(), name: 'Poliéster Spandex 180g', line: 'Fabrics', kind: 'tela', type: 'Tela', stage: 6, colors: [{ n: 'Azul Rey', hex: '#1E40AF' }, { n: 'Negro', hex: '#111' }, { n: 'Verde', hex: '#2E8B7A' }], sizes: [], composition: '94% poliéster, 6% elastano', weight: '180', docs: ['Ficha técnica'], photos: [], since: d(-300) },
    { id: uid(), name: 'Softshell 3 capas', line: 'Fabrics', kind: 'tela', type: 'Tela', stage: 6, colors: [{ n: 'Negro', hex: '#111' }, { n: 'Gris', hex: '#888' }], sizes: [], composition: '100% poliéster laminado', weight: '320', docs: [], photos: [], since: d(-200) },
    { id: uid(), name: 'Gabardina Workwear', line: 'Fabrics', kind: 'tela', type: 'Tela', stage: 6, colors: [{ n: 'Naranjo', hex: '#FF6A00' }, { n: 'Azul marino', hex: '#1E2A5A' }], sizes: [], composition: '65% poliéster, 35% algodón', weight: '245', docs: ['Ficha técnica'], photos: [], since: d(-400) },
  ];
  const supplies = [
    { id: uid(), name: 'Cierre YKK #5 reversible', line: 'Global', kind: 'insumo', type: 'Cierre', stage: 6, colors: [{ n: 'Negro', hex: '#111' }], sizes: [], composition: '', weight: '', docs: [], photos: [], since: d(-300) },
    { id: uid(), name: 'Cinta reflectante 5 cm', line: 'Workwear', kind: 'insumo', type: 'Cinta', stage: 6, colors: [{ n: 'Plata', hex: '#C0C0C0' }], sizes: [], composition: '', weight: '', docs: ['Ficha técnica'], photos: [], since: d(-300) },
    { id: uid(), name: 'Hilo poliéster 40/2', line: 'Global', kind: 'insumo', type: 'Hilo', stage: 6, colors: [{ n: 'Varios', hex: '#999' }], sizes: [], composition: '', weight: '', docs: [], photos: [], since: d(-300) },
  ];
  Store.write('products', [...products, ...fabrics, ...supplies]);

  Store.write('resources', [
    { id: uid(), title: 'Catálogo Insumos Textiles', desc: 'Cierres, hilos, cintas y accesorios', file: 'CATALOGO_INSUMOS_2026.pdf', hasFile: false, updated: d(-10) },
    { id: uid(), title: 'Catálogo K8 Fabrics', desc: 'Telas con precios y colores', file: 'CATALOGO_K8_FABRICS_2026.pdf', hasFile: false, updated: d(-10) },
    { id: uid(), title: 'Lista de precios textil', desc: 'Documento general, común a todas las telas e insumos', file: 'LISTA_PRECIOS_TEXTIL_K8_2026.pdf', hasFile: false, updated: d(-5) },
  ]);

  Store.write('seeded', true);
}

// Personas editables desde Marketing › Equipo. Se guardan en el Store; PEOPLE siempre refleja la lista activa.
const PEOPLE_DEFAULTS = PEOPLE.map(p => ({ ...p, area: p.role.includes('Venta') ? 'Ventas' : p.role.includes('producto') || p.role.includes('Producción') ? 'Desarrollo' : 'Marketing', bday: '', bmonth: '', perms: [], tags: [], account: '', online: false, active: true }));
const PALETTE = ['#2F5BFF', '#00C2FF', '#22E07A', '#A3FF12', '#FFC21A', '#FF7A1A', '#FF3B5C', '#FF4D9D', '#A855F7', '#7C5CFF', '#14B8A6', '#F472B6', '#F97316', '#84CC16', '#38BDF8', '#E11D48'];
let PEOPLE_ALL = [];
function loadPeople() {
  let list = Store.read('people', null);
  // Migración a la paleta neón (27 oct): colores antiguos → nuevos.
  const MAP = { '#7C5CFF': '#2F5BFF', '#E6399B': '#FF4D9D', '#1B7A3A': '#22E07A', '#8B1E1E': '#FF3B5C', '#14A3B8': '#00C2FF', '#F2A51A': '#FFC21A' };
  if (list) list = list.map(p => ({ ...p, color: MAP[p.color] || p.color, roleK8: p.roleK8 || (p.id === 'vicente' ? 'Administrador K8' : undefined), perms: p.id === 'vicente' && !(p.perms || []).length ? ['admin'] : p.perms }));
  if (!list) { list = PEOPLE_DEFAULTS; Store.write('people', list); }
  PEOPLE_ALL = list;
  PEOPLE = list.filter(p => p.active !== false);
  return list;
}
loadPeople();
