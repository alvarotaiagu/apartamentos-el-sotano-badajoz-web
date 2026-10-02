/* og:image hecha a propósito (1200 × 630): la placa de la fachada (panel de cal
   con el logo y sus cuatro listones cruzados) sobre el almagre enfoscado, y
   debajo «Apartamentos turísticos · Badajoz». Se compone en HTML y se
   fotografía con Playwright.

   node scripts/generar-og.mjs   → assets/og-el-sotano.jpg
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logo = fs.readFileSync(path.join(raiz, 'assets/logo/logo-el-sotano.svg'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'css/estilos.css'), 'utf8');
/* el mismo enfoscado y la misma madera que la web, sacados de la hoja */
const enfoscado = css.match(/--enfoscado:\s*([\s\S]*?);\n/)[1];
const maderaH = css.match(/--madera-h:\s*([\s\S]*?);\n/)[1];
const maderaV = css.match(/--madera-v:\s*([\s\S]*?);\n/)[1];
/* en base64: una página about:blank no puede leer file:// */
const epilogue = fs.readFileSync(path.join(raiz, 'assets/fuentes/epilogue-latin.woff2')).toString('base64');
const W = 1200, H = 630, PW = 560, PH = 300, G = 9, S = 18;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Epilogue; src: url(data:font/woff2;base64,${epilogue}) format('woff2'); font-weight: 100 900; }
  body { margin: 0; width: ${W}px; height: ${H}px; position: relative; overflow: hidden;
    background-color: #8C5B4D; background-image: ${enfoscado}; background-size: 260px 260px, 900px 900px; font-family: Epilogue, sans-serif; }
  .placa { position: absolute; left: ${(W - PW) / 2}px; top: 112px; width: ${PW}px; height: ${PH}px; background: #FDFCFA;
    box-shadow: 0 34px 50px -34px rgba(32, 12, 6, .8); display: grid; place-items: center; }
  .placa svg { width: 82%; height: auto; overflow: visible; }
  i { position: absolute; display: block; box-shadow: 0 1.5px 0 rgba(43, 33, 28, .34); }
  .t, .b { left: ${-S}px; right: ${-S}px; height: ${G}px; background: ${maderaH}; z-index: 2; }
  .l, .r { top: ${-S}px; bottom: ${-S}px; width: ${G}px; background: ${maderaV}; }
  .t { top: ${-G / 2}px; } .b { bottom: ${-G / 2}px; } .l { left: ${-G / 2}px; } .r { right: ${-G / 2}px; }
  p { position: absolute; left: 0; right: 0; top: 486px; margin: 0; text-align: center; color: #FBF6F1;
    font-weight: 650; font-size: 22px; letter-spacing: .32em; text-transform: uppercase; }
</style></head><body>
<div class="placa"><i class="t"></i><i class="r"></i><i class="b"></i><i class="l"></i>${logo}</div>
<p>Apartamentos turísticos · Badajoz</p>
</body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: W, height: H } });
await pagina.setContent(html, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: path.join(raiz, 'assets/og-el-sotano.jpg'), type: 'jpeg', quality: 88 });
await navegador.close();
console.log('assets/og-el-sotano.jpg');
