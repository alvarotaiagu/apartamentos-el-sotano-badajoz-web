/* Versiones responsive de las fotos graduadas: AVIF + WebP + JPG a 480, 960,
   1440 y 2000 px de ancho (sin pasar del original: las de abril, de 3000 px,
   llegan a 2000 y son las que llenan los huecos grandes; las de 2048 px de
   febrero-marzo se quedan en 1440 o 2000). Lee los másteres de
   scripts/fuentes/graduadas/ (los saca scripts/gradar.py) y escribe:

     assets/fotos/<id>-<ancho>.avif|webp|jpg
     data/fotos.json  ← añade w, h y anchos a cada foto (conserva alt y grupo)

   node scripts/fotos.mjs
   Usa sharp del node_modules de alvarotaiagu.github.io (no hay npm en este repo).
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/package.json');
const sharp = require('sharp');

const origen = path.join(raiz, 'scripts', 'fuentes', 'graduadas');
const destino = path.join(raiz, 'assets', 'fotos');
fs.mkdirSync(destino, { recursive: true });
const ANCHOS = [480, 960, 1440, 2000];
const ruta = path.join(raiz, 'data', 'fotos.json');
const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const solo = process.argv.slice(2);

let bytes = 0;
for (const f of datos.fotos) {
  if (solo.length && !solo.includes(f.id)) continue;
  const src = path.join(origen, f.id + '.jpg');
  const meta = await sharp(src).metadata();
  f.w = meta.width; f.h = meta.height;
  f.anchos = ANCHOS.filter(a => a <= meta.width - 40);
  for (const a of f.anchos) {
    const base = sharp(src).resize({ width: a, withoutEnlargement: true });
    const salidas = [
      [base.clone().avif({ quality: 50, effort: 4 }), 'avif'],
      [base.clone().webp({ quality: 74 }), 'webp'],
      [base.clone().jpeg({ quality: 78, mozjpeg: true, progressive: true }), 'jpg']
    ];
    for (const [s, ext] of salidas) {
      const out = path.join(destino, `${f.id}-${a}.${ext}`);
      await s.toFile(out);
      bytes += fs.statSync(out).size;
    }
  }
  process.stdout.write('.');
}
fs.writeFileSync(ruta, JSON.stringify(datos, null, 1) + '\n');
console.log('\n' + datos.fotos.length, 'fotos ·', (bytes / 1048576).toFixed(1), 'MB escritos en assets/fotos');
