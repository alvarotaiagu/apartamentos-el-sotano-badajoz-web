/* Quita el módulo «La historia» («Fue restaurante. Hoy es casa.») de una carpeta de la web.

   node scripts/quitar-historia.mjs ../copia-de-la-web     (sobre una copia)
   node scripts/quitar-historia.mjs --aqui                 (en esta misma carpeta, sin vuelta atrás)

   Es exactamente la receta del README:
     1. index.html: borra la <section id="historia" data-modulo="historia"> entre
        sus marcas «[MÓDULO HISTORIA]» y todas las líneas con data-modulo="historia":
        el enlace del pie, el <link> de su hoja y el <script>.
     2. Borra css/historia.css y js/historia.js.
     3. Vuelve a versionar CSS y JS (?v=).
   No toca nada más: main.js y estilos.css no dependen del módulo.
   verificar.mjs lo ejecuta sobre una copia temporal y comprueba que la web
   sigue sin errores, sin 404 y con el resto de secciones en su orden.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
if (!arg) { console.error('Uso: node scripts/quitar-historia.mjs <carpeta> | --aqui'); process.exit(1); }
const raiz = arg === '--aqui' ? aqui : path.resolve(arg);

const ruta = path.join(raiz, 'index.html');
const antes = fs.readFileSync(ruta, 'utf8');
let t = antes;
const bloque = /[ \t]*<!-- ═+ \[MÓDULO HISTORIA\][^>]*-->[\s\S]*?<!-- ═+ fin \[MÓDULO HISTORIA\] ═+ -->\r?\n?/;
if (!bloque.test(t)) { console.error('No encuentro las marcas [MÓDULO HISTORIA] en index.html: ¿ya se quitó?'); process.exit(1); }
t = t.replace(bloque, '');
const lineas = t.split(/\r?\n/);
const quedan = lineas.filter(l => !/data-modulo="historia"/.test(l));
const quitadas = lineas.length - quedan.length;
t = quedan.join('\n');
if (t.length < antes.length * 0.75) { console.error('Me niego: index.html perdería demasiado.'); process.exit(1); }
fs.writeFileSync(ruta, t);
console.log('index.html: sección quitada y ' + quitadas + ' líneas con data-modulo="historia" (enlace del pie, hoja y script)');

for (const f of ['css/historia.css', 'js/historia.js']) {
  const r = path.join(raiz, f);
  if (fs.existsSync(r)) { fs.rmSync(r); console.log('borrado ' + f); }
}
execFileSync(process.execPath, [path.join(aqui, 'scripts/versionar.mjs'), raiz], { stdio: 'ignore' });
console.log('Módulo «La historia» quitado de ' + raiz);
