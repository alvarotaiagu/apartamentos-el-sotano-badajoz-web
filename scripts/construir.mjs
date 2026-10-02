/* Rellena cada <picture data-foto="ID" …></picture> del HTML con sus fuentes
   AVIF/WebP/JPG, a partir de data/fotos.json (alt, ancho, alto y versiones).
   Así, cambiar una foto es cambiar el ID en el HTML y volver a ejecutar esto.

   Atributos que lee del <picture>:
     data-foto   ID de la foto de Booking (obligatorio)
     data-sizes  atributo sizes (por defecto 100vw)
     data-carga  eager | lazy (por defecto lazy); eager añade fetchpriority="high"
     data-alt    sustituye al alt de fotos.json ("" = decorativa)

   node scripts/construir.mjs      (idempotente: la segunda pasada no cambia nada)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fotos = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(raiz, 'data/fotos.json'), 'utf8')).fotos.map(f => [f.id, f]));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const attr = (t, n) => { const m = t.match(new RegExp('\\s' + n + '="([^"]*)"')); return m ? m[1] : null; };

export function picture(id, { sizes = '100vw', carga = 'lazy', alt = null, sangria = '' } = {}) {
  const f = fotos[id];
  if (!f) throw new Error('No está en data/fotos.json: ' + id);
  const set = ext => f.anchos.map(a => `assets/fotos/${id}-${a}.${ext} ${a}w`).join(', ');
  const mayor = f.anchos[f.anchos.length - 1];
  const alto = Math.round(f.h * mayor / f.w);
  const extra = carga === 'eager' ? ' fetchpriority="high"' : ' loading="lazy"';
  return [
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`,
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`,
    `<img src="assets/fotos/${id}-${mayor}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${mayor}" height="${alto}" alt="${esc(alt ?? f.alt)}" decoding="async"${extra}>`
  ].map(l => sangria + l).join('\n');
}

const paginas = process.argv.slice(2).filter(a => a.endsWith('.html'));
/* el estilo (--foco: encuadre de la foto) se queda en el <picture> y lo hereda el <img> */
for (const pagina of paginas.length ? paginas : ['index.html']) {
  const ruta = path.join(raiz, pagina);
  const antes = fs.readFileSync(ruta, 'utf8');
  let n = 0;
  const despues = antes.replace(/([ \t]*)<picture([^>]*\sdata-foto="(\d+)"[^>]*)>[\s\S]*?<\/picture>/g, (todo, sangria, atributos, id) => {
    n++;
    const dentro = picture(id, {
      sizes: attr(atributos, 'data-sizes') || '100vw',
      carga: attr(atributos, 'data-carga') || 'lazy',
      alt: attr(atributos, 'data-alt'),
      sangria: sangria + '  '
    });
    return `${sangria}<picture${atributos}>\n${dentro}\n${sangria}</picture>`;
  });
  if (despues.length < antes.length * 0.8) throw new Error('Me niego: ' + pagina + ' perdería demasiado');
  if (despues !== antes) fs.writeFileSync(ruta, despues);
  console.log((despues !== antes ? 'actualizado ' : 'sin cambios ') + pagina + ' · ' + n + ' fotos');
}
