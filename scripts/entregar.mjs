/* Genera la copia de PRODUCCIÓN: la maqueta sin mando, indexable y con el dominio puesto.
   No toca esta carpeta (la maqueta sigue siendo noindex, con sus dos versiones).

   node scripts/entregar.mjs --dominio apartamentoselsotano.com [--destino ../el-sotano-entrega]

   Hace, en orden:
     1. scripts/quitar-mando.mjs  → copia sin mando ni [VERIFICAR]
     2. quita el noindex de index, aviso legal y privacidad (la 404 lo conserva) y
        pone canonical, og:url, og:image absoluta y la URL en el JSON-LD
     3. escribe sitemap.xml, robots.txt y CNAME
     4. rellena titular / NIF / domicilio fiscal desde data/config.json (si están)
     5. si "reservas" tiene la URL de Octorate, ajusta aviso legal y privacidad
        (ya no es cierto que la web «no confirma reservas» ni que no hay terceros)
     6. quita README.md y CREDITOS.md (notas internas sobre el cliente)
     7. comprueba que no queda nada que impida publicar y lo lista

   Sale con código 1 si queda un bloqueante: la copia se escribe igual, para
   poder revisarla, pero NO se publica hasta que el informe diga «Lista».
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };

const dominio = String(arg('dominio') || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
if (!/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/.test(dominio)) {
  console.error('Uso: node scripts/entregar.mjs --dominio midominio.com [--destino ../carpeta]');
  process.exit(1);
}
const destino = path.resolve(arg('destino') || path.join(raiz, '..', 'el-sotano-entrega'));
const origen = 'https://' + dominio;
const config = JSON.parse(fs.readFileSync(path.join(raiz, 'data/config.json'), 'utf8'));
const html = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

execFileSync(process.execPath, [path.join(raiz, 'scripts/quitar-mando.mjs'), destino], { stdio: 'inherit' });

const leer = f => fs.readFileSync(path.join(destino, f), 'utf8');
const escribir = (f, t) => fs.writeFileSync(path.join(destino, f), t);
const aviso = [];   /* cosas que hay que saber, no bloquean */
const bloqueos = []; /* impiden publicar */

/* sustituye y avisa si el patrón no estaba: un cambio en el HTML no puede pasar en silencio */
function cambiar(f, antes, despues, que) {
  const t = leer(f);
  if (!t.includes(antes)) { bloqueos.push(`${f}: no encuentro ${que}; el HTML ha cambiado y este script no`); return; }
  escribir(f, t.replace(antes, () => despues));
}

/* ── 2 · indexable y con dominio ── */
const NOINDEX = '<meta name="robots" content="noindex, nofollow">';
const paginas = { 'index.html': '/', 'aviso-legal.html': '/aviso-legal.html', 'privacidad.html': '/privacidad.html' };
for (const [f, ruta] of Object.entries(paginas)) {
  cambiar(f, NOINDEX, `<link rel="canonical" href="${origen}${ruta}">`, 'el noindex');
}
cambiar('index.html', '<meta property="og:image" content="assets/og-el-sotano.jpg">',
  `<meta property="og:url" content="${origen}/">\n<meta property="og:image" content="${origen}/assets/og-el-sotano.jpg">\n<meta name="twitter:card" content="summary_large_image">`, 'el og:image');
cambiar('index.html', '"@id": "#el-sotano",', `"@id": "${origen}/#el-sotano",\n  "url": "${origen}/",`, 'el @id del JSON-LD');
cambiar('index.html', '"image": "assets/og-el-sotano.jpg",', `"image": "${origen}/assets/og-el-sotano.jpg",`, 'la imagen del JSON-LD');

/* ── 3 · sitemap, robots, CNAME ── */
const hoy = new Date().toISOString().slice(0, 10);
escribir('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  Object.values(paginas).map(r => `  <url><loc>${origen}${r}</loc><lastmod>${hoy}</lastmod></url>`).join('\n') + '\n</urlset>\n');
escribir('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origen}/sitemap.xml\n`);
escribir('CNAME', dominio + '\n');

/* ── 4 · titular, NIF, domicilio ── */
const PEND = '<span class="pendiente">[PENDIENTE]</span>';
if (config.titular && config.nif) {
  cambiar('aviso-legal.html', `${PEND} · El Sótano · Apartamentos`, `${html(config.titular)} · El Sótano · Apartamentos`, 'el titular');
  cambiar('aviso-legal.html', `<th scope="row">NIF</th><td>${PEND}</td>`, `<th scope="row">NIF</th><td>${html(config.nif)}</td>`, 'el NIF');
  cambiar('privacidad.html', `Titular: ${PEND} · NIF: ${PEND}`, `Titular: ${html(config.titular)} · NIF: ${html(config.nif)}`, 'titular y NIF de privacidad');
} else {
  bloqueos.push('data/config.json: faltan "titular" y "nif" (aviso legal y privacidad siguen con [PENDIENTE])');
}
if (config.domicilio_fiscal) {
  cambiar('aviso-legal.html', '<td>C/ Virgen de la Soledad, 6 · 06002 Badajoz</td>', `<td>${html(config.domicilio_fiscal)}</td>`, 'el domicilio');
  /* en privacidad el domicilio va tras el NIF: que no sea el del alojamiento si el titular vive en otro sitio */
  cambiar('privacidad.html', ' · C/ Virgen de la Soledad, 6 · 06002 Badajoz · <a href="mailto', ` · ${html(config.domicilio_fiscal)} · <a href="mailto`, 'el domicilio de privacidad');
}

/* ── 5 · con motor de reservas ── */
if (/^https:\/\//i.test(String(config.reservas || ''))) {
  cambiar('aviso-legal.html',
    'No vende ni confirma reservas: el formulario «Consultar fechas» solo prepara un mensaje en tu navegador, que eres tú quien envía (por email, copiándolo o llamando). La disponibilidad y el precio de cada fecha te los confirmamos al contestarte.',
    'Las reservas se hacen en el motor de reservas de Octorate (botón «Reservar»), que se abre en su propia web con la disponibilidad y los precios al momento. El formulario «Consultar fechas» solo prepara un mensaje en tu navegador, que eres tú quien envía (por email, copiándolo o llamando), para quien prefiera preguntar antes.',
    'el párrafo «Qué hace esta web»');
  cambiar('privacidad.html', '<li>Las tipografías están en la propia web',
    '<li><b>Octorate</b>: el motor de reservas se abre en la web de Octorate al pulsar «Reservar». Los datos que escribas allí para reservar los trata Octorate según su propia política de privacidad, además del titular de esta web para gestionar tu estancia.</li>\n    <li>Las tipografías y las librerías de animación están en la propia web',
    'la lista de servicios de terceros');
  cambiar('privacidad.html', 'Ninguno a través de la propia web. El formulario',
    'Ninguno a través de la propia web (la reserva se hace en el motor de Octorate, ver «Servicios de terceros»). El formulario', 'el párrafo «Qué datos se recogen»');
} else {
  aviso.push('data/config.json: "reservas" es null → los botones siguen llevando al formulario, no al motor de Octorate');
}

/* ── 6 · notas internas fuera ── */
for (const f of ['README.md', 'CREDITOS.md']) fs.rmSync(path.join(destino, f), { force: true });

/* ── 7 · revisión final ── */
execFileSync(process.execPath, [path.join(raiz, 'scripts/versionar.mjs'), destino], { stdio: 'ignore' });
try { execFileSync(process.execPath, [path.join(raiz, 'scripts/comprobar-borrado.mjs'), destino], { stdio: 'pipe' }); }
catch (e) { bloqueos.push('quedan rastros del mando de maqueta:\n' + String(e.stdout || e.message)); }

const prohibido = [
  ['index.html', /noindex/, 'noindex en la portada'],
  ['index.html', /\[VERIFICAR\]/, 'avisos [VERIFICAR]'],
  ['aviso-legal.html', /\[PENDIENTE\]/, '[PENDIENTE] en el aviso legal'],
  ['privacidad.html', /\[PENDIENTE\]/, '[PENDIENTE] en privacidad'],
  ['index.html', /(?:href|src)="https?:\/\/cdn\./, 'una librería desde CDN'],
  ['index.html', /"provisional"|Apartamentos provisionales/, 'marcas de provisional'],
];
for (const [f, re, que] of prohibido) if (re.test(leer(f))) bloqueos.push(`${f}: ${que}`);
const pisos = JSON.parse(leer('data/apartamentos.json')).apartamentos || [];
if (pisos.some(p => p.provisional)) bloqueos.push('data/apartamentos.json: los apartamentos siguen "provisional": true (¿cuántos son y cómo se llaman?)');
if (config.segundo_portal === null) aviso.push('data/config.json: "segundo_portal" es null → solo sale el portal del nº 6 (¿Montesinos 3 es otro portal?)');
if (config.whatsapp === null) aviso.push('data/config.json: "whatsapp" es null → el botón de WhatsApp sigue apagado');

console.log('\n── Entrega para ' + origen + ' en ' + destino + ' ──');
aviso.forEach(a => console.log('  AVISO     ' + a));
bloqueos.forEach(b => console.log('  BLOQUEA   ' + b));
if (bloqueos.length) { console.log('\nNO se publica todavía: ' + bloqueos.length + ' bloqueante(s).'); process.exit(1); }
console.log('\nLista para publicar.');
