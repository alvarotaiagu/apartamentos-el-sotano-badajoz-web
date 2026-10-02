/* Mide «Badajoz a pie» y escribe data/alrededor.json.

   Desde la puerta del nº 6 (ref/geo.json de los bocetos, OpenStreetMap/Nominatim):
     · distancia en línea recta (haversine) y RUMBO (0º = norte, en el sentido del reloj):
       con esto se coloca cada punto en el radar, que es la geometría real;
     · distancia A PIE con el enrutador de OSM (perfil peatonal):
       https://routing.openstreetmap.de/routed-foot/route/v1/driving/{lon},{lat};{lon},{lat}?overview=false
       y los minutos a 75 m por minuto: es lo que enseña la etiqueta.
   Si el servicio falla, se queda la recta y la etiqueta dice «en línea recta».

   Conserva lo que se haya ajustado a mano en el JSON (nombre, lado y dy de cada
   etiqueta, dy en móvil): solo reescribe las medidas.

   node scripts/medir-alrededor.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const geo = JSON.parse(fs.readFileSync(path.join(raiz, '..', 'apartamentos-el-sotano-badajoz-bocetos', 'ref', 'geo.json'), 'utf8'));
const salida = path.join(raiz, 'data', 'alrededor.json');
const previo = fs.existsSync(salida) ? JSON.parse(fs.readFileSync(salida, 'utf8')) : { sitios: [] };
const antes = Object.fromEntries(previo.sitios.map(s => [s.clave, s]));

/* nombre tal como lo escribe la web de turismo del Ayuntamiento (turismo.badajoz.es), lado de la etiqueta y desfase */
const SITIOS = [
  { clave: 'plaza_espana', nombre: 'Plaza de España y Ayuntamiento', corto: 'Pl. de España', lado: 'r', dy: 4 },
  { clave: 'plaza_soledad', nombre: 'Plaza de la Soledad', corto: 'Pl. de la Soledad', lado: 'l', dy: -6 },
  { clave: 'catedral', nombre: 'Catedral de San Juan Bautista', corto: 'Catedral', lado: 'r', dy: 12 },
  { clave: 'plaza_alta', nombre: 'Plaza Alta', corto: 'Plaza Alta', lado: 'l', dy: 4 },
  { clave: 'espantaperros', nombre: 'Torre de Espantaperros', corto: 'Espantaperros', lado: 'r', dy: 6 },
  { clave: 'museo_arq', nombre: 'Museo Arqueológico', corto: 'Museo Arqueológico', lado: 'r', dy: -2 },
  { clave: 'lopez_ayala', nombre: 'Teatro López de Ayala', corto: 'López de Ayala', lado: 'l', dy: 4 },
  { clave: 'alcazaba', nombre: 'Alcazaba', corto: 'Alcazaba', lado: 'r', dy: 0 },
  { clave: 'puerta_palmas', nombre: 'Puerta de Palmas', corto: 'Puerta de Palmas', lado: 'c', dy: 18 },
  { clave: 'parque_legion', nombre: 'Parque de la Legión', corto: 'Parque de la Legión', lado: 'l', dy: -12 },
  { clave: 'puente_palmas', nombre: 'Puente de Palmas', corto: 'Puente de Palmas', lado: 'r', dy: 4 }
];

const [lat0, lon0] = geo.puerta6;
const R = 6371008.8, rad = Math.PI / 180;
function recta(lat, lon) {
  const dphi = (lat - lat0) * rad, dl = (lon - lon0) * rad;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(lat0 * rad) * Math.cos(lat * rad) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function rumbo(lat, lon) {
  const p1 = lat0 * rad, p2 = lat * rad, dl = (lon - lon0) * rad;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
async function aPie(lat, lon) {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${lon0},${lat0};${lon},${lat}?overview=false`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'el-sotano-web/1.0 (medicion puntual de distancias a pie)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.code !== 'Ok' || !j.routes || !j.routes[0]) throw new Error(j.code || 'sin ruta');
    return Math.round(j.routes[0].distance);
  } catch (e) {
    console.warn('  sin ruta a pie (' + e.message + '): se queda la recta');
    return null;
  }
}

const hoy = new Date().toISOString().slice(0, 10);
const sitios = [];
for (const s of SITIOS) {
  const [lat, lon, osm] = geo[s.clave];
  const m = Math.round(recta(lat, lon));
  const r = Math.round(rumbo(lat, lon));
  const pie = await aPie(lat, lon);
  const a = antes[s.clave] || {};
  const metros = pie ?? m;
  sitios.push({
    clave: s.clave,
    nombre: a.nombre || s.nombre,
    corto: a.corto || s.corto,
    lat, lon,
    recta_m: m,
    rumbo: r,
    a_pie_m: pie,
    minutos: Math.max(1, Math.ceil(metros / 75)),
    medida: pie ? 'a pie' : 'en línea recta',
    lado: a.lado || s.lado,
    dy: a.dy ?? s.dy,
    movil: a.movil || null,
    fuente: 'OpenStreetMap: Nominatim («' + osm + '») y routing.openstreetmap.de, perfil a pie',
    fecha: hoy
  });
  console.log(s.nombre.padEnd(32), String(m).padStart(4) + ' m recta', String(r).padStart(4) + 'º', pie ? String(pie).padStart(5) + ' m a pie' : '   — a pie');
  await esperar(900);
}
const datos = {
  origen: { nombre: 'C/ Virgen de la Soledad, 6', lat: lat0, lon: lon0, fuente: 'OpenStreetMap: ' + geo.puerta6[2] },
  ritmo_m_por_minuto: 75,
  nota: 'La posición en el radar usa el rumbo y la distancia en línea recta; la etiqueta, la distancia a pie. lado: l | r | c; dy en unidades del radar (600 × 600).',
  medido: hoy,
  sitios
};
fs.writeFileSync(salida, JSON.stringify(datos, null, 1) + '\n');
console.log('data/alrededor.json · ' + sitios.length + ' sitios · ' + sitios.filter(s => s.a_pie_m).length + ' medidos a pie');
