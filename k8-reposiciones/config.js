// Configuración del módulo de Reposiciones y Estados — K8 Chile.
//
// NUBE (Supabase): pega aquí la URL y la "anon public key" de tu proyecto
// (Supabase → Project Settings → API). Si quedan vacías, el módulo funciona
// en MODO LOCAL: todo se guarda solo en este navegador.
//
// La anon key es pública por diseño; los datos quedan protegidos porque
// solo los usuarios con login (Authentication → Users) pueden leer/escribir.
window.K8_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  bucket: 'k8-archivos',

  // Personas que aparecen en los desplegables de responsables.
  responsables: ['Vicente Tenorio', 'Tiare Sánchez', 'Baoxin Gong', 'Francisca Tolosa'],

  // Días corridos que tiene cada ronda de muestra para aprobarse o rechazarse.
  sampleDays: 10,
};
