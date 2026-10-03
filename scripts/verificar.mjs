/* Verificación de El Sótano · «Los cuatro listones».
   Levanta un servidor estático, abre la web con Playwright (Chromium) y comprueba:
     · un test por cada punto del checklist de web desde cero (cursor, sticky,
       menú móvil, cookies, cortina, hero en móviles bajos, con-movimiento,
       trazos con autoRound, clases de estado con prefijo);
     · la cortina: un fotograma con los listones a medias, otro con la sombra
       sin letras, el panel que aterriza en su sitio, y la retirada sin CDN y con
       movimiento reducido;
     · la sombra viva: el transform de #sombra con el ratón en dos esquinas, y
       quieta en táctil;
     · los listones: scaleX muestreado a lo largo del montaje (no la captura final);
     · los apartamentos: tantas tarjetas como entradas en el JSON, cada botón abre
       su <dialog> con sus fotos, Escape lo cierra y devuelve el foco, el marco
       crece desde la tarjeta, y una quinta entrada en el JSON crea la quinta tarjeta;
     · el radar: cada sitio en su rumbo (±2º, medido en el SVG), ninguna etiqueta
       pisada a 375 y a 1440, y la lista igual que el JSON;
     · el formulario: fechas, mailto bien codificado, apartamento preseleccionado
       desde el diálogo, WhatsApp apagado con null;
     · el borrado del módulo «La historia» sobre una copia temporal;
     · las dos densidades, y que sin ?revision no hay mando;
     · textos prohibidos, citas sin nombre, interlineado de League Gothic con tildes,
       contraste y los obligatorios (noindex, JSON-LD, ?v=, og:image…).
   Se baja con mouse.wheel: con Lenis, window.scrollTo no dispara ScrollTrigger.

   node scripts/verificar.mjs            (todo)
   node scripts/verificar.mjs --capturas (además guarda screenshots/)
*/
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const conCapturas = process.argv.includes('--capturas');
if (conCapturas) fs.mkdirSync(path.join(raiz, 'screenshots'), { recursive: true });
const foto = n => path.join(raiz, 'screenshots', n);
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.woff2': 'font/woff2'
};
function servir(dir, puerto) {
  const s = http.createServer((req, res) => {
    const limpia = decodeURIComponent(req.url.split('?')[0]);
    const destino = path.join(dir, limpia === '/' ? 'index.html' : limpia);
    if (!destino.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(dir, '404.html')));
      return;
    }
    res.writeHead(200, { 'content-type': tipos[path.extname(destino)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(destino));
  });
  return new Promise(r => s.listen(puerto, '127.0.0.1', () => r(s)));
}

const fallos = [], notas = [];
function comprobar(ok, mensaje) { (ok ? notas : fallos).push((ok ? 'OK   ' : 'FALLA') + ' · ' + mensaje); }
async function hastaAbajo(page, paso = 700) {
  let ant = -1;
  for (let i = 0; i < 220; i++) {
    await page.mouse.wheel(0, paso);
    await page.waitForTimeout(120);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === ant && i > 3) break;
    ant = y;
  }
  await page.waitForTimeout(2200);
}
/* ir a un elemento con la rueda, llevando la cuenta de lo despachado (Lenis va por detrás de scrollY) */
async function irA(page, selector, margen = 0.15, espera = 1600) {
  const destino = await page.evaluate(([s, m]) => {
    const el = document.querySelector(s); if (!el) return null;
    return Math.round(el.getBoundingClientRect().top + window.scrollY - innerHeight * m);
  }, [selector, margen]);
  if (destino == null) return false;
  let restante = destino - await page.evaluate(() => window.scrollY);
  while (Math.abs(restante) > 12) {
    const d = Math.sign(restante) * Math.min(Math.abs(restante), 420);
    await page.mouse.wheel(0, d); restante -= d;
    await page.waitForTimeout(55);
  }
  await page.waitForTimeout(espera);
  return true;
}
const PUERTO = 4211;
const BASE = 'http://127.0.0.1:' + PUERTO + '/';
const CDN = /cdn\.jsdelivr\.net\/npm\/(gsap|lenis)/;

const servidor = await servir(raiz, PUERTO);
const navegador = await chromium.launch();
async function nuevaPagina(opciones = {}, { cookiesVistas = true, bloquearCDN = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, ...opciones });
  if (cookiesVistas) await ctx.addInitScript(() => { try { localStorage.setItem('elsotano-cookies', 'ok'); } catch (e) {} });
  if (bloquearCDN) await ctx.route(CDN, r => r.abort());
  const page = await ctx.newPage();
  page.errores = []; page.respuestas = [];
  page.on('console', m => { if (m.type() === 'error') page.errores.push(m.text()); });
  page.on('pageerror', e => page.errores.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) page.respuestas.push(r.status() + ' ' + r.url()); });
  return { ctx, page };
}
const movilOpc = (w, h) => ({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });

const pisosJson = JSON.parse(fs.readFileSync(path.join(raiz, 'data/apartamentos.json'), 'utf8'));
const alrededorJson = JSON.parse(fs.readFileSync(path.join(raiz, 'data/alrededor.json'), 'utf8'));
const configJson = JSON.parse(fs.readFileSync(path.join(raiz, 'data/config.json'), 'utf8'));
const CITAS = [
  'Tal como se ve en las fotos e incluso mejor. Muy limpio. Camas super cómodas.',
  'Ubicado en pleno centro, a dos minutos de la Catedral, Ayuntamiento.',
  'Nos ha venido de maravilla el servicio de guardamaletas.',
  'La terraza superbonita para desconectar después de las excursiones de todo el dia.',
  'Al ser un bajo, era tan fresco que no hacía falta poner el aire, lo que se agradecía al venir de la calle con 40 grados.',
  'Apartamento amplio, limpio y totalmente equipado.',
  'La atención de Manuel fue extraordinaria',
  'Y buena atención con las mascotas.',
  'Amplitud, climatización, dos ambientes, accesibilidad, limpieza., ubicación...'
];

/* espera a que la cortina haya ARRANCADO y la pausa enseguida (si se pausa antes, su play() la reanuda),
   y comprueba que sigue puesta: bajo carga, la red de seguridad de 6 s puede haberla retirado ya, y
   un elemento con display:none devuelve transform «none». Si pasa, se recarga (hasta tres veces). */
async function cortinaPausada(page) {
  for (let intento = 0; intento < 3; intento++) {
    await page.waitForFunction(() => window.ElSotano && window.ElSotano.cortina && window.ElSotano.cortina.tl && window.ElSotano.cortina.tl.time() > 0.02, null, { polling: 'raf', timeout: 8000 });
    const puesta = await page.evaluate(() => { const tl = window.ElSotano.cortina.tl; tl.pause(); return tl.time() < 1.5 && getComputedStyle(document.getElementById('cortina')).display === 'block'; });
    if (puesta) return;
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
}

try {
  /* ═══════════════ 0 · carga limpia: la cortina tapa, se retira y el panel aterriza ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await ctx.addInitScript(() => {
      window.__m = { cubre: null, tarde: false };
      document.addEventListener('DOMContentLoaded', () => {
        const c = document.getElementById('cortina');
        window.__m.cubre = c ? getComputedStyle(c).display : 'sin cortina';
        /* la red de seguridad de 7 s del <head> ya saltó: el CDN tardó (la prueba se repite) */
        window.__m.tarde = document.documentElement.classList.contains('cortina-fuera');
      });
    });
    for (let intento = 0; intento < 3; intento++) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4600);
      if (!(await page.evaluate(() => window.__m.tarde))) break;
      notas.push('       (carga ' + (intento + 1) + ': el CDN tardó más de 7 s y la red de seguridad retiró la cortina; se repite)');
    }
    const m = await page.evaluate(() => ({
      cubre: window.__m.cubre, aterrizaje: window.ElSotano.aterrizaje,
      cortina: getComputedStyle(document.getElementById('cortina')).display,
      placa: getComputedStyle(document.getElementById('hero-placa')).visibility,
      mov: document.documentElement.classList.contains('con-movimiento'),
      lenis: document.documentElement.classList.contains('lenis'),
      colorCortina: getComputedStyle(document.querySelector('.cortina__capa')).backgroundColor,
      colorMuro: getComputedStyle(document.querySelector('.hero__muro')).backgroundColor
    }));
    comprobar(m.cubre === 'block', 'checklist 5 · la cortina tapa la página al cargar (display ' + m.cubre + ')');
    comprobar(m.colorCortina !== m.colorMuro, 'checklist 5 · la cortina (' + m.colorCortina + ') no es del color del muro que destapa (' + m.colorMuro + ')');
    comprobar(m.aterrizaje && m.aterrizaje.dx < 2 && m.aterrizaje.dy < 2 && m.aterrizaje.dw < 2, 'cortina: el panel con sus listones aterriza en el panel del hero ' + JSON.stringify(m.aterrizaje));
    comprobar(m.cortina === 'none' && m.placa === 'visible', 'cortina: acaba en display:none y el panel real se ve');
    comprobar(m.mov, 'checklist 7 · con GSAP y sin movimiento reducido hay html.con-movimiento');
    comprobar(m.lenis, 'Lenis carga (desde jsDelivr) y gobierna el scroll');
    await page.mouse.move(700, 450);
    await hastaAbajo(page);
    const imgs = await page.evaluate(() => [...document.images].filter(i => i.getBoundingClientRect().height > 0 && i.complete).map(i => ({ src: i.currentSrc, w: i.naturalWidth })));
    comprobar(imgs.length > 25 && imgs.every(i => i.w > 0), 'fotos: ' + imgs.length + ' imágenes cargadas, ninguna rota');
    const formatos = await page.evaluate(() => [...document.images].filter(i => i.currentSrc).map(i => i.currentSrc.split('.').pop()));
    comprobar(formatos.includes('avif'), 'fotos: el navegador recibe AVIF (' + [...new Set(formatos)].join(', ') + ')');
    const fin = await page.evaluate(() => ({ placa: [...document.querySelectorAll('#contacto-placa > .listones i')].map(i => new DOMMatrix(getComputedStyle(i).transform)).map(mx => +(mx.a * mx.d).toFixed(2)) }));
    comprobar(fin.placa.every(v => v === 1), 'contacto: los cuatro listones de su placa quedan montados (' + fin.placa.join(' / ') + ')');
    comprobar(page.errores.length === 0, 'consola limpia en escritorio' + (page.errores.length ? ': ' + page.errores.slice(0, 3).join(' | ') : ''));
    comprobar(page.respuestas.length === 0, 'sin respuestas 4xx/5xx' + (page.respuestas.length ? ': ' + page.respuestas.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ═══════════════ cortina: fotogramas a medias (línea de tiempo pausada, página nueva para cada uno) ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await cortinaPausada(page);
    await page.evaluate(() => { window.ElSotano.cortina.tl.seek(0.42, false); 0; });
    if (conCapturas) await page.screenshot({ path: foto('cortina-1-listones-a-medias.png') });
    const a = await page.evaluate(() => {
      const t = document.querySelector('#cortina-placa .listones .t');
      const x = new DOMMatrix(getComputedStyle(t).transform).m41;
      return { x, tiempo: window.ElSotano.cortina.tl.time(), cortina: getComputedStyle(document.getElementById('cortina')).display };
    });
    comprobar(a.x < -2 && a.x > -2000 && a.cortina === 'block', 'cortina: fotograma con los listones a medias (a ' + a.tiempo.toFixed(2) + ' s el de arriba aún está a ' + Math.round(a.x) + ' px de su sitio)');
    await ctx.close();
  }
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await cortinaPausada(page);
    await page.evaluate(() => { window.ElSotano.cortina.tl.seek(1.46, false); 0; });
    await page.waitForTimeout(120);
    const s = await page.evaluate(() => ({
      sombra: +getComputedStyle(document.getElementById('sombra-cortina')).opacity,
      letras: +getComputedStyle(document.getElementById('letras-cortina')).opacity,
      apertura: window.ElSotano.cortina.apertura
    }));
    comprobar(s.sombra > 0.4 && s.letras === 0 && s.apertura < 1, 'cortina: fotograma con la sombra sin letras (sombra ' + s.sombra.toFixed(2) + ', letras ' + s.letras + ') y el panel ya abierto');
    if (conCapturas) await page.screenshot({ path: foto('cortina-2-sombra-sin-letras.png') });
    await page.evaluate(() => { window.ElSotano.cortina.tl.seek(1.0, false); 0; });
    await page.waitForTimeout(100);
    const ab = await page.evaluate(() => ({ v: window.ElSotano.cortina.apertura, cp: document.querySelector('#cortina-placa .placa__fondo').style.clipPath }));
    const nums = (ab.cp.match(/[\d.]+/g) || []).map(Number);
    /* el navegador normaliza «inset(a 0 a 0)» como «inset(a 0)»: arriba y abajo iguales */
    const simetrica = nums.length === 2 || (nums.length === 4 && nums[0] === nums[2]);
    comprobar(ab.v > 2 && ab.v < 48 && simetrica, 'cortina: la cal se abre desde la línea central, simétrica (' + ab.cp + ')');
    if (conCapturas) await page.screenshot({ path: foto('cortina-1b-panel-abriendose.png') });
    await ctx.close();
  }
  {
    /* el traspaso, en vivo: la capa sube con el borde curvo mientras la placa vuela */
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await cortinaPausada(page);
    await page.evaluate(() => { const tl = window.ElSotano.cortina.tl; tl.seek(2.15, false); tl.play(); 0; });
    await page.waitForFunction(() => { const c = document.getElementById('cortina-capa'); return c && new DOMMatrix(getComputedStyle(c).transform).m42 < -innerHeight * 0.35; }, null, { polling: 'raf', timeout: 5000 });
    await page.evaluate(() => { window.ElSotano.cortina.tl.pause(); 0; });
    const t = await page.evaluate(() => ({ abierta: document.documentElement.querySelector('#hero-titulo') && true, d: document.getElementById('cortina-borde-d').getAttribute('d') }));
    comprobar(/Q50 [1-9]/.test(t.d), 'cortina: la capa se levanta con borde curvo (' + t.d + ')');
    if (conCapturas) await page.screenshot({ path: foto('cortina-3-traspaso.png') });
    await ctx.close();
  }

  /* ═══════════════ cortina: retirada sin CDN, sin JS y con movimiento reducido ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({}, { bloquearCDN: true });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => ({
      cortina: getComputedStyle(document.getElementById('cortina')).display,
      mov: document.documentElement.classList.contains('con-movimiento'),
      letra: getComputedStyle(document.querySelector('.hero__titulo .letra')).transform,
      placa: getComputedStyle(document.getElementById('hero-placa')).visibility,
      tarjetas: document.querySelectorAll('.piso__boton').length,
      listones: [...document.querySelectorAll('.casa__foto .listones i')].map(i => getComputedStyle(i).transform)
    }));
    comprobar(r.cortina === 'none', 'sin CDN: la cortina se retira (display ' + r.cortina + ')');
    comprobar(!r.mov, 'checklist 7 · sin GSAP no hay html.con-movimiento');
    comprobar(r.letra === 'none' && r.placa === 'visible', 'sin CDN: titular y panel se ven');
    comprobar(r.tarjetas === pisosJson.apartamentos.length && r.listones.every(t => t === 'none'), 'sin CDN: tarjetas pintadas y listones montados de serie');
    if (conCapturas) await page.screenshot({ path: foto('sin-cdn-1440.png') });
    await ctx.close();
  }
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    const r = await page.evaluate(() => ({ cortina: getComputedStyle(document.getElementById('cortina')).display, aviso: !!document.getElementById('pisos-sinjs') && getComputedStyle(document.getElementById('pisos-sinjs')).display }));
    comprobar(r.cortina === 'none' && r.aviso !== 'none', 'sin JS: la cortina no aparece y los apartamentos dejan el aviso con Booking y el teléfono');
    await ctx.close();
  }
  {
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await ctx.addInitScript(() => {
      window.__vista = [];
      document.addEventListener('DOMContentLoaded', () => {
        const c = document.getElementById('cortina');
        window.__vista.push(getComputedStyle(c).display);
        requestAnimationFrame(() => window.__vista.push(getComputedStyle(c).display));
      });
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const v = await page.evaluate(() => window.__vista);
    comprobar(v.length && v.every(d => d === 'none'), 'movimiento reducido: la cortina no pinta ni un fotograma (' + v.join(',') + ')');
    const r = await page.evaluate(() => ({
      mov: document.documentElement.classList.contains('con-movimiento'),
      letra: getComputedStyle(document.querySelector('.hero__titulo .letra')).transform,
      cifra: document.querySelector('[data-contar="9.7"]').textContent,
      pisos: (document.getElementById('cifra-pisos-n') || {}).textContent,
      puntos: document.querySelectorAll('.punto.es-encendido').length,
      listones: [...document.querySelectorAll('.marco .listones i')].every(i => getComputedStyle(i).transform === 'none'),
      sombra: document.getElementById('sombra').getAttribute('transform')
    }));
    comprobar(!r.mov && r.letra === 'none', 'checklist 7 · con movimiento reducido no hay con-movimiento y el titular se ve');
    comprobar(r.cifra === '9,7' && r.pisos === String(pisosJson.apartamentos.length), 'movimiento reducido: las cifras se ven con su valor (9,7 · ' + r.pisos + ' apartamentos, del JSON)');
    comprobar(r.puntos === alrededorJson.sitios.length, 'movimiento reducido: el radar ya encendido (' + r.puntos + ' sitios)');
    comprobar(r.listones, 'movimiento reducido: los listones montados');
    await page.mouse.move(100, 100); await page.mouse.move(1300, 800); await page.waitForTimeout(300);
    comprobar(!(await page.evaluate(() => document.getElementById('sombra').getAttribute('transform'))), 'movimiento reducido: la sombra viva se queda quieta');
    comprobar(page.errores.length === 0, 'consola limpia con movimiento reducido' + (page.errores.length ? ': ' + page.errores[0] : ''));
    if (conCapturas) { await irA(page, '#badajoz-a-pie', 0); await page.screenshot({ path: foto('reducido-radar-1440.png') }); }
    await ctx.close();
  }

  /* ═══════════════ la sombra viva: se mueve al contrario que el puntero; quieta en táctil ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4200);
    const leer = () => page.evaluate(() => { const g = document.getElementById('sombra'); return { x: +window.gsap.getProperty(g, 'x'), y: +window.gsap.getProperty(g, 'y'), t: g.getAttribute('transform') }; });
    await page.mouse.move(20, 90, { steps: 6 }); await page.waitForTimeout(1300);
    const a = await leer();
    await page.mouse.move(760, 880, { steps: 10 }); await page.waitForTimeout(1300);
    const b = await leer();
    comprobar(a.x > 2 && a.y > 2 && b.x < -2 && b.y < -2 && Math.max(Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y)) <= 9.01,
      'sombra viva: con el ratón arriba a la izquierda la sombra va abajo a la derecha y al revés, sin pasar de ±9 u (' + [a.x, a.y, b.x, b.y].map(v => v.toFixed(1)).join(', ') + ' · ' + b.t + ')');
    await page.mouse.move(1200, 1000); await page.mouse.wheel(0, 900); await page.waitForTimeout(1500);
    const c = await leer();
    comprobar(Math.abs(c.x) < 0.5 && Math.abs(c.y) < 0.5, 'sombra viva: vuelve a 0 al salir del hero');
    await ctx.close();
  }
  {
    const { ctx, page } = await nuevaPagina(movilOpc(390, 844));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4200);
    await page.mouse.move(20, 200); await page.mouse.move(370, 600, { steps: 6 }); await page.tap('.hero__titulo'); await page.waitForTimeout(800);
    const t = await page.evaluate(() => ({ attr: document.getElementById('sombra').getAttribute('transform'), fino: matchMedia('(pointer: fine)').matches }));
    comprobar(!t.fino && !t.attr, 'sombra viva: en táctil (pointer coarse) no se mueve (transform ' + t.attr + ')');
    await ctx.close();
  }

  /* ═══════════════ checklist 1 · cursor propio ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.mouse.move(300, 300); await page.mouse.move(320, 310);
    await page.waitForTimeout(200);
    const r1 = await page.evaluate(() => ({ cur: getComputedStyle(document.body).cursor, html: document.documentElement.classList.contains('con-cursor'), aro: getComputedStyle(document.querySelector('.cursor')).opacity, punto: getComputedStyle(document.querySelector('.cursor-punto')).backgroundColor }));
    comprobar(r1.cur === 'none' && r1.html && parseFloat(r1.aro) > 0.9, 'checklist 1 · cursor propio: el del sistema se oculta y el aro se ve');
    comprobar(r1.punto === 'rgb(143, 112, 73)', 'checklist 1 · el punto es bronce (' + r1.punto + ')');
    const b = await page.locator('.hero__acciones .boton--cal').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
    await page.waitForTimeout(500);
    const r2 = await page.evaluate(() => { const a = document.querySelector('.cursor'); const c = getComputedStyle(a).backgroundColor.match(/[\d.]+/g); return { activo: a.classList.contains('es-activo'), alfa: c && c[3] ? parseFloat(c[3]) : 1 }; });
    comprobar(r2.activo && r2.alfa >= 0.35, 'checklist 1 · sobre un botón el aro crece con relleno visible (alfa ' + r2.alfa + ')');
    await ctx.close();
  }

  /* ═══════════════ checklist 4 · cookies ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({}, { cookiesVistas: false });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    const d1 = await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display);
    await page.click('#cookies-aceptar');
    const d2 = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('cookies')).display, k: localStorage.getItem('elsotano-cookies') }));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
    const d3 = await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display);
    comprobar(d1 === 'flex' && d2.d === 'none' && d2.k === 'ok' && d3 === 'none', 'checklist 4 · cookies: sale, el botón lo cierra de verdad y no vuelve al recargar (' + [d1, d2.d, d3].join(' → ') + ')');
    await ctx.close();
  }

  /* ═══════════════ checklist 3 · menú móvil (con la cabecera ya fija) ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina(movilOpc(390, 844));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(600);
    const fija = await page.evaluate(() => document.getElementById('cabecera').classList.contains('es-fija') && getComputedStyle(document.getElementById('cabecera')).backdropFilter);
    const cerrado = await page.evaluate(() => getComputedStyle(document.getElementById('navegacion')).visibility);
    await page.click('#hamburguesa');
    await page.waitForTimeout(700);
    const abierto = await page.evaluate(() => { const r = document.getElementById('navegacion').getBoundingClientRect(); return { top: r.top, h: r.height, exp: document.getElementById('hamburguesa').getAttribute('aria-expanded') }; });
    await page.click('#hamburguesa', { timeout: 3000 });
    await page.waitForTimeout(700);
    const otra = await page.evaluate(() => document.getElementById('hamburguesa').getAttribute('aria-expanded'));
    comprobar(fija && fija !== 'none' && cerrado === 'hidden' && abierto.top === 0 && abierto.h >= 840 && abierto.exp === 'true' && otra === 'false',
      'checklist 3 · menú móvil con la cabecera ya fija (backdrop-filter): cerrado no asoma, abierto mide la pantalla (' + Math.round(abierto.h) + ' px, 100dvh) y el botón lo vuelve a cerrar');
    await ctx.close();
  }

  /* ═══════════════ checklist 2 · lo sticky de esta web: la cabecera de las normas ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.mouse.move(700, 450);
    await irA(page, '#normas', 0, 1400);
    const contenedor = await page.evaluate(() => getComputedStyle(document.getElementById('normas')).overflow);
    const tops = [];
    for (let i = 0; i < 7; i++) {
      await page.mouse.wheel(0, 90); await page.waitForTimeout(260);
      tops.push(await page.evaluate(() => {
        const c = document.getElementById('normas-cabeza').getBoundingClientRect(), cab = document.getElementById('cabecera').getBoundingClientRect();
        const s = document.getElementById('normas').getBoundingClientRect();
        const enPunto = document.elementFromPoint(c.left + 40, c.top + 40);
        return { top: Math.round(c.top), cab: Math.round(cab.bottom), libre: s.bottom > c.bottom + 4, sobre: !!(enPunto && enPunto.closest('#normas-cabeza')) };
      }));
    }
    const pegados = tops.filter(t => t.libre);
    comprobar(contenedor.includes('clip') && pegados.length >= 3 && pegados.every(t => Math.abs(t.top - pegados[0].top) <= 2 && t.top >= t.cab && t.sobre),
      'checklist 2 · la cabecera de las normas se queda pegada bajo la cabecera (overflow:' + contenedor + ') y nada la tapa ' + JSON.stringify(pegados.map(t => t.top)));
    await ctx.close();
  }

  /* ═══════════════ checklist 6 · hero en móviles bajos (sin solapes) + capturas por sección ═══════════════ */
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024], [1440, 900]]) {
    const { ctx, page } = await nuevaPagina(w < 1000 ? movilOpc(w, h) : { viewport: { width: w, height: h } });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4400);
    const r = await page.evaluate(() => {
      const caja = s => { const e = document.querySelector(s).getBoundingClientRect(); return { l: e.left, t: e.top, r: e.right, b: e.bottom, w: e.width }; };
      /* la foto del hero son los tres marcos (versión por defecto): su caja es la unión de los tres */
      const union = s => { const rs = [...document.querySelectorAll(s)].map(e => e.getBoundingClientRect()); const l = Math.min(...rs.map(r => r.left)), r = Math.max(...rs.map(r => r.right)); return { l, t: Math.min(...rs.map(r => r.top)), r, b: Math.max(...rs.map(r => r.bottom)), w: r - l }; };
      const piezas = { cab: caja('#cabecera .cabecera__menu') && caja(innerWidth > 900 ? '#navegacion' : '#hamburguesa'), placa: caja('#hero-placa'), titulo: caja('#hero-titulo'), entrada: caja('.hero__entrada'), acciones: caja('.hero__acciones'), notas: caja('.hero__notas'), foto: union('#hero-marcos .detalle .marco') };
      const choca = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
      const n = Object.keys(piezas), choques = [];
      for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (choca(piezas[n[i]], piezas[n[j]])) choques.push(n[i] + '×' + n[j]);
      return { choques, piezas, ancho: document.documentElement.scrollWidth, vw: innerWidth };
    });
    comprobar(r.choques.length === 0, 'checklist 6 · hero ' + w + '×' + h + ': cabecera, panel, titular, entradilla, botones, notas y foto no se pisan' + (r.choques.length ? ' (' + r.choques.join(', ') + ')' : ''));
    comprobar(r.ancho <= r.vw, 'sin desbordamiento horizontal a ' + w + ' px (' + r.ancho + ')');
    if (w <= 900) comprobar(r.piezas.foto.t >= r.piezas.notas.b && Math.abs(r.piezas.foto.w - (w - 32)) <= 2, 'hero ' + w + ': los tres marcos van debajo y ocupan el ancho menos 32 px (' + Math.round(r.piezas.foto.w) + ')');
    if (conCapturas) {
      await page.screenshot({ path: foto(`${w}x${h}-01-hero.png`) });
      const secciones = [['#la-casa', '02-la-casa'], ['#los-apartamentos', '03-apartamentos'], ['#lo-de-todos', '04-lo-de-todos'], ['#detalles', '05-detalles'], ['#historia', '06-historia'], ['#badajoz-a-pie', '07-badajoz-a-pie'], ['#radar', '07b-radar'], ['#opiniones', '08-opiniones'], ['#normas', '09-normas'], ['#fechas', '10-fechas'], ['#contacto', '11-contacto'], ['#pie', '12-pie']];
      for (const [sel, n] of secciones) {
        await irA(page, sel, sel === '#radar' ? 0.08 : 0.02, 2000);
        await page.screenshot({ path: foto(`${w}x${h}-${n}.png`) });
      }
    }
    if (page.errores.length) comprobar(false, 'consola a ' + w + ' px: ' + page.errores[0]);
    await ctx.close();
  }

  /* ═══════════════ [ELEGIR HERO] los tres marcos (la versión elegida, por defecto) ═══════════════ */
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { ctx, page } = await nuevaPagina(w < 1000 ? movilOpc(w, h) : { viewport: { width: w, height: h } });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4600);
    const r = await page.evaluate(() => {
      const S = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sobresale')) || 12;
      const caja = (e, s = 0) => { const b = e.getBoundingClientRect(); return { l: b.left - s, t: b.top - s, r: b.right + s, b: b.bottom + s }; };
      const marcos = [...document.querySelectorAll('#hero-marcos .detalle')].map(d => ({ marco: caja(d.querySelector('.marco'), S), pie: caja(d.querySelector('figcaption')) }));
      const choca = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
      const choques = [];
      marcos.forEach((a, i) => marcos.forEach((b, j) => { if (j !== i && (choca(a.marco, b.marco) || choca(a.marco, b.pie))) choques.push(i + '×' + j); }));
      const texto = ['#hero-titulo', '.hero__acciones', '.hero__notas'].map(s => caja(document.querySelector(s)));
      marcos.forEach((a, i) => texto.forEach((t, k) => { if (choca(a.marco, t)) choques.push('marco ' + i + '×texto ' + k); }));
      return { n: marcos.length, choques, foto: getComputedStyle(document.querySelector('.hero__foto')).display, vistas: [...document.querySelectorAll('#hero-marcos img')].filter(i => i.complete && i.naturalWidth > 0).length, ancho: document.documentElement.scrollWidth, vw: innerWidth };
    });
    comprobar(r.n === 3 && r.foto === 'none' && r.vistas === 3 && r.choques.length === 0 && r.ancho <= r.vw && page.errores.length === 0,
      'hero «tres marcos» ' + w + ': tres detalles con sus fotos, sin pisarse entre ellos (listones incluidos) ni con el texto, sin errores' + (r.choques.length ? ' (' + r.choques.join(', ') + ')' : '') + (page.errores[0] ? ': ' + page.errores[0] : ''));
    if (conCapturas) await page.screenshot({ path: foto('hero-v4-marcos-' + w + '.png') });
    await ctx.close();
  }
  /* [ELEGIR HERO] el carrusel (la versión 1) sigue disponible con ?hero=carrusel */
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { ctx, page } = await nuevaPagina(w < 1000 ? movilOpc(w, h) : { viewport: { width: w, height: h } });
    const pedidas = []; page.on('request', rq => pedidas.push(rq.url()));
    await page.goto(BASE + '?hero=carrusel', { waitUntil: 'load' });
    await page.waitForTimeout(4600);
    const r = await page.evaluate(() => {
      const caja = s => { const e = document.querySelector(s).getBoundingClientRect(); return { l: e.left, t: e.top, r: e.right, b: e.bottom, w: e.width }; };
      const choca = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
      const foto = caja('#hero-marco'), texto = ['#hero-placa', '#hero-titulo', '.hero__acciones', '.hero__notas'].map(caja);
      const antes = document.getElementById('hero-pie').textContent;
      window.ElSotano.hero.mostrar(1);
      return { foto, choques: texto.filter(t => choca(t, foto)).length, marcos: getComputedStyle(document.getElementById('hero-marcos')).display, fotos: document.querySelectorAll('.hero__img').length, pie: antes !== document.getElementById('hero-pie').textContent, carrusel: window.ElSotano.hero.carrusel, notas: caja('.hero__notas') };
    });
    comprobar(r.carrusel && r.marcos === 'none' && r.fotos === 3 && r.pie && r.choques === 0 && page.errores.length === 0 && (w > 900 || (r.foto.t >= r.notas.b && Math.abs(r.foto.w - (w - 32)) <= 2)),
      'hero «carrusel» con ?hero=carrusel ' + w + ': tres fotos que pasan con su pie, sin pisar el texto y sin errores' + (page.errores[0] ? ': ' + page.errores[0] : ''));
    if (conCapturas) await page.screenshot({ path: foto('hero-v1-carrusel-' + w + '.png') });
    await ctx.close();
  }
  {
    /* por defecto, el carrusel oculto no descarga sus fotos (la 670608170 solo sale en él) */
    const { ctx, page } = await nuevaPagina();
    const pedidas = []; page.on('request', rq => pedidas.push(rq.url()));
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(1500);
    comprobar(!pedidas.some(u => /670608170-/.test(u)), 'hero por defecto: el carrusel oculto no descarga sus fotos');
    await ctx.close();
  }

  /* ═══════════════ los listones: scaleX muestreado a lo largo del montaje ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4200);
    await page.mouse.move(700, 450);
    await page.evaluate(() => {
      window.__esc = [];
      (function paso() {
        const t = document.querySelector('.piso__marco .listones .t');
        if (t) window.__esc.push(new DOMMatrix(getComputedStyle(t).transform).a);
        if (window.__esc.length < 4000) requestAnimationFrame(paso);
      })();
      0;
    });
    await irA(page, '#los-apartamentos', 0, 2600);
    const esc = await page.evaluate(() => window.__esc);
    const medios = esc.filter(v => v > 0.04 && v < 0.96);
    let bajadas = 0; for (let i = 1; i < esc.length; i++) if (esc[i] < esc[i - 1] - 0.01) bajadas++;
    comprobar(esc[0] < 0.01 && new Set(medios.map(v => v.toFixed(2))).size >= 5 && bajadas === 0 && Math.abs(esc[esc.length - 1] - 1) < 0.001,
      'listones: el de arriba de la primera tarjeta pasa por ' + new Set(medios.map(v => v.toFixed(2))).size + ' valores de scaleX entre 0 y 1, sin retroceder, y acaba en 1');
    /* al pasar por encima el marco respira 4 px y la foto escala a 1,04 */
    const b = await page.locator('.piso__boton').first().boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + 60, { steps: 4 });
    await page.waitForTimeout(1200);
    const hov = await page.evaluate(() => ({ t: getComputedStyle(document.querySelector('.piso__marco .listones .t')).translate, img: new DOMMatrix(getComputedStyle(document.querySelector('.piso__marco img')).transform).a }));
    comprobar(/-4px/.test(hov.t) && Math.abs(hov.img - 1.04) < 0.005, 'tarjeta: al pasar por encima los listones se abren 4 px (' + hov.t + ') y la foto escala a ' + hov.img.toFixed(3));
    await ctx.close();
  }

  /* ═══════════════ apartamentos: una tarjeta por entrada, cada una abre su diálogo ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const n = await page.evaluate(() => document.querySelectorAll('#pisos-lista .piso__boton').length);
    comprobar(n === pisosJson.apartamentos.length, 'apartamentos: ' + n + ' tarjetas, tantas como entradas en data/apartamentos.json');
    let bien = 0; const malas = [];
    for (const ap of pisosJson.apartamentos) {
      const sel = '.piso__boton[data-numero="' + ap.numero + '"]';
      await page.locator(sel).scrollIntoViewIfNeeded();
      await page.locator(sel).click();
      await page.waitForFunction(() => document.getElementById('dialogo').open && document.querySelector('#dialogo-figura img'));
      const g = await page.evaluate(() => ({
        n: document.querySelectorAll('#dialogo-minis button').length,
        src: document.querySelector('#dialogo-figura img').getAttribute('src'),
        titulo: document.getElementById('dialogo-titulo').textContent,
        camas: document.querySelectorAll('#dialogo-camas li').length
      }));
      await page.keyboard.press('ArrowRight');
      const segunda = await page.evaluate(() => document.querySelector('#dialogo-figura img').getAttribute('src'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const r = await page.evaluate(s => ({ cerrado: !document.getElementById('dialogo').open, foco: document.activeElement === document.querySelector(s) }), sel);
      const ok = g.n === ap.fotos.length && g.src.includes(ap.fotos[0]) && segunda.includes(ap.fotos[1]) && g.titulo.includes(String(ap.m2)) && g.camas === ap.camas.length && r.cerrado && r.foco;
      if (ok) bien++; else malas.push(ap.numero + ' ' + JSON.stringify(g) + ' ' + JSON.stringify(r));
    }
    comprobar(bien === pisosJson.apartamentos.length, 'apartamentos: cada botón abre su <dialog> con sus fotos y sus camas, la flecha pasa, Escape cierra y el foco vuelve a la tarjeta (' + bien + '/' + pisosJson.apartamentos.length + ')' + (malas.length ? ' ' + malas.join(' | ') : ''));
    /* «Consultar fechas para este apartamento» preselecciona el formulario */
    await page.locator('.piso__boton[data-numero="3"]').click();
    await page.waitForFunction(() => document.getElementById('dialogo').open);
    await page.click('#dialogo-fechas');
    await page.waitForTimeout(500);
    const pre = await page.evaluate(() => ({ v: document.getElementById('apartamento').value, abierto: document.getElementById('dialogo').open }));
    comprobar(pre.v === '3' && !pre.abierto, 'formulario: el botón del diálogo cierra y deja preseleccionado el Nº 3 (' + pre.v + ')');
    await ctx.close();
  }
  {
    /* el marco crece desde la tarjeta (FLIP) y en móvil el diálogo va a pantalla completa */
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(4200);
    await page.mouse.move(700, 450);
    await irA(page, '#pisos-lista', 0.2, 2200);
    const tarjeta = await page.evaluate(() => { const r = document.querySelector('.piso__boton[data-numero="2"] .piso__marco').getBoundingClientRect(); return { w: r.width, h: r.height }; });
    await page.locator('.piso__boton[data-numero="2"]').click();
    await page.waitForTimeout(90);
    const medio = await page.evaluate(() => document.getElementById('dialogo-marco').getBoundingClientRect().width);
    await page.waitForTimeout(250);
    if (conCapturas) await page.screenshot({ path: foto('dialogo-1-marco-creciendo-1440.png') });
    await page.waitForTimeout(1100);
    const fin = await page.evaluate(() => document.getElementById('dialogo-marco').getBoundingClientRect().width);
    comprobar(medio < fin - 100 && medio >= tarjeta.w - 2, 'diálogo: el marco de la tarjeta crece hasta llenar la pantalla (' + Math.round(tarjeta.w) + ' → ' + Math.round(medio) + ' → ' + Math.round(fin) + ' px)');
    if (conCapturas) await page.screenshot({ path: foto('dialogo-2-abierto-1440.png') });
    await page.keyboard.press('Escape'); await page.waitForTimeout(1000);
    await ctx.close();
    const m = await nuevaPagina(movilOpc(390, 844), { cookiesVistas: true });
    await m.page.goto(BASE, { waitUntil: 'load' }); await m.page.waitForTimeout(4200);
    await m.page.locator('.piso__boton[data-numero="2"]').scrollIntoViewIfNeeded();
    await m.page.waitForTimeout(600);
    await m.page.locator('.piso__boton[data-numero="2"]').click();
    await m.page.waitForTimeout(1600);
    const r = await m.page.evaluate(() => {
      const b = document.getElementById('dialogo-marco').getBoundingClientRect();
      const minis = document.getElementById('dialogo-minis').getBoundingClientRect(), fig = document.getElementById('dialogo-figura').getBoundingClientRect(), ficha = document.querySelector('.dialogo__ficha').getBoundingClientRect();
      return { l: b.left, t: b.top, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight, orden: fig.bottom <= minis.top + 1 && minis.bottom <= ficha.top + 1 };
    });
    comprobar(Math.abs(r.l) < 1 && Math.abs(r.t) < 1 && Math.abs(r.w - r.vw) < 1 && Math.abs(r.h - r.vh) < 1, 'diálogo en móvil: a pantalla completa (' + Math.round(r.w) + '×' + Math.round(r.h) + ')');
    comprobar(r.orden, 'diálogo en móvil: foto, miniaturas y ficha una debajo de otra, sin montarse');
    if (conCapturas) await m.page.screenshot({ path: foto('dialogo-3-abierto-390.png') });
    await m.ctx.close();
  }
  {
    /* añadir una entrada al JSON crea la quinta tarjeta (y la opción del formulario y la cifra) */
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    const otro = JSON.parse(JSON.stringify(pisosJson));
    otro.apartamentos.push({ numero: 5, nombre_booking: 'Apartamento de prueba', m2: 60, dormitorios: 1, camas: ['Dormitorio: 1 cama doble'], camas_resumen: '1 cama doble', extras: ['Prueba'], terraza: false, balcon: false, lavadora: true, fotos: ['650532099', '671007138'], provisional: true });
    await page.route('**/data/apartamentos.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(otro) }));
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(900);
    const r = await page.evaluate(() => ({ n: document.querySelectorAll('#pisos-lista .piso__boton').length, opciones: document.querySelectorAll('#apartamento option').length, cifra: document.getElementById('cifra-pisos-n').textContent, min: document.getElementById('cifra-m2-min').textContent, filas: document.querySelectorAll('#comparativa-tabla tbody tr').length }));
    comprobar(r.n === 5 && r.opciones === 6 && r.cifra === '5' && r.min === '60' && r.filas === 5, 'apartamentos: una quinta entrada en el JSON crea la quinta tarjeta, su opción, su fila y las cifras (' + JSON.stringify(r) + ')');
    await ctx.close();
    const fuente = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/, '');
    const visible = fuente.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
    comprobar(!/\b(cuatro|cinco|[45])\s+apartamentos\b/i.test(visible), 'el número de apartamentos no está escrito a mano en el HTML (sale del JSON)');
  }

  /* ═══════════════ el radar: rumbos reales, etiquetas sin pisarse y la lista ═══════════════ */
  for (const [w, h] of [[375, 740], [1440, 900]]) {
    const { ctx, page } = await nuevaPagina(w < 900 ? { ...movilOpc(w, h), reducedMotion: 'reduce' } : { viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(900);
    await page.locator('#radar').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const svg = document.getElementById('radar');
      const out = { rumbos: [], textos: [], puntos: [], centro: document.querySelector('.radar__centro rect').getBoundingClientRect() };
      document.querySelectorAll('#radar-puntos .punto').forEach(g => {
        const c = g.querySelector('.punto__p');
        const dx = +c.getAttribute('cx') - 300, dy = +c.getAttribute('cy') - 300;
        let ang = Math.atan2(dx, -dy) * 180 / Math.PI; if (ang < 0) ang += 360;
        out.rumbos.push({ clave: g.dataset.clave, medido: ang, radio: Math.hypot(dx, dy) });
        const t = g.querySelector('text').getBoundingClientRect();
        out.textos.push({ clave: g.dataset.clave, l: t.left, t: t.top, r: t.right, b: t.bottom });
        const p = c.getBoundingClientRect();
        out.puntos.push({ clave: g.dataset.clave, l: p.left, t: p.top, r: p.right, b: p.bottom });
      });
      out.svg = svg.getBoundingClientRect();
      out.lista = [...document.querySelectorAll('#radar-lista li')].map(li => ({ clave: li.dataset.clave, texto: li.textContent }));
      return out;
    });
    const K = 262 / 700;
    const desv = r.rumbos.map(x => { const s = alrededorJson.sitios.find(q => q.clave === x.clave); const d = Math.abs(((x.medido - s.rumbo + 540) % 360) - 180); return { clave: x.clave, d, dist: Math.abs(x.radio / K - s.recta_m) }; });
    comprobar(desv.length === alrededorJson.sitios.length && desv.every(x => x.d <= 2 && x.dist <= 3), 'radar ' + w + ': cada sitio en su rumbo (máx. ' + Math.max(...desv.map(x => x.d)).toFixed(2) + 'º) y a su distancia en línea recta');
    const choca = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
    const choques = [];
    r.textos.forEach((a, i) => {
      r.textos.forEach((b, j) => { if (j > i && choca(a, b)) choques.push(a.clave + '×' + b.clave); });
      r.puntos.forEach(p => { if (p.clave !== a.clave && choca(a, p)) choques.push(a.clave + '×punto ' + p.clave); });
      if (choca(a, { l: r.centro.left, t: r.centro.top, r: r.centro.right, b: r.centro.bottom })) choques.push(a.clave + '×el 6');
    });
    comprobar(choques.length === 0, 'radar ' + w + ': ninguna etiqueta se pisa con otra, con un punto ni con el «6»' + (choques.length ? ' (' + choques.join(', ') + ')' : ''));
    const fuera = r.textos.filter(t => t.l < 0 || t.r > w);
    comprobar(fuera.length === 0, 'radar ' + w + ': ninguna etiqueta se sale de la pantalla');
    const orden = alrededorJson.sitios.slice().sort((a, b) => (a.a_pie_m || a.recta_m) - (b.a_pie_m || b.recta_m));
    const igual = r.lista.length === orden.length && orden.every((s, i) => r.lista[i].clave === s.clave && r.lista[i].texto.includes(s.nombre) && r.lista[i].texto.includes((s.a_pie_m || s.recta_m) + ' m'));
    comprobar(igual, 'radar ' + w + ': la lista tiene los mismos sitios que el JSON, ordenados por distancia a pie y con sus metros');
    if (w < 900) {
      const metros = await page.evaluate(() => [...document.querySelectorAll('#radar .punto text')].some(t => /\d+ m/.test(t.textContent) && getComputedStyle(t.querySelector('tspan') || t).display !== 'none' && t.querySelector('tspan')));
      comprobar(!metros, 'radar en móvil: solo nombres, sin metros dentro del SVG');
    } else {
      await page.hover('#radar-lista li:nth-child(3)');
      const activo = await page.evaluate(() => { const c = document.querySelector('#radar-lista li:nth-child(3)').dataset.clave; return document.querySelector('.punto[data-clave="' + c + '"]').classList.contains('es-activa'); });
      comprobar(activo, 'radar: al pasar por una fila de la lista se resalta su punto');
    }
    await ctx.close();
  }
  {
    /* el barrido de verdad: los sitios se encienden al pasar por su rumbo; captura a medio barrido */
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(4200);
    await page.mouse.move(700, 450);
    await irA(page, '#radar', 0.06, 50);
    await page.waitForFunction(() => window.ElSotano.radarAngulo > 150, null, { polling: 'raf', timeout: 8000 });
    const m = await page.evaluate(() => {
      const a = window.ElSotano.radarAngulo;
      const pts = [...document.querySelectorAll('.punto')].map(g => ({ r: +g.dataset.rumbo, on: g.classList.contains('es-encendido') }));
      return { a, bien: pts.every(p => (p.r <= a - 1 ? p.on : true) && (p.r > a + 8 ? !p.on : true)), on: pts.filter(p => p.on).length };
    });
    comprobar(m.bien && m.on > 0 && m.on < alrededorJson.sitios.length, 'radar: a ' + Math.round(m.a) + 'º del barrido hay ' + m.on + ' sitios encendidos, justo los de rumbo menor');
    if (conCapturas) await page.screenshot({ path: foto('radar-a-medio-barrido-1440.png') });
    await page.waitForTimeout(3000);
    const todos = await page.evaluate(() => document.querySelectorAll('.punto.es-encendido').length);
    comprobar(todos === alrededorJson.sitios.length, 'radar: tras una sola vuelta, los ' + todos + ' sitios encendidos');
    await ctx.close();
  }
  {
    const m = await nuevaPagina(movilOpc(375, 740));
    await m.page.goto(BASE, { waitUntil: 'load' }); await m.page.waitForTimeout(4200);
    await m.page.locator('#radar').scrollIntoViewIfNeeded();
    await m.page.waitForFunction(() => window.ElSotano.radarAngulo > 150, null, { polling: 'raf', timeout: 8000 }).catch(() => {});
    if (conCapturas) await m.page.screenshot({ path: foto('radar-a-medio-barrido-375.png') });
    await m.ctx.close();
  }

  /* ═══════════════ formulario: fechas, mailto, WhatsApp; mapa bajo clic; segundo portal ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const hoy = new Date(); const f = d => { const x = new Date(hoy); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
    await page.fill('#llegada', f(30)); await page.fill('#salida', f(28));
    await page.fill('#nombre', 'Prueba');
    await page.click('#reserva button[type="submit"]');
    const e1 = await page.evaluate(() => ({ txt: document.getElementById('fechas-error').textContent, inv: document.getElementById('salida').getAttribute('aria-invalid'), listo: document.getElementById('reserva-listo').hidden }));
    comprobar(/posterior/.test(e1.txt) && e1.inv === 'true' && e1.listo, 'formulario: una salida anterior a la llegada da un aviso en línea y no compone nada');
    await page.fill('#salida', f(32)); await page.fill('#adultos', '2'); await page.fill('#ninos', '1');
    await page.selectOption('#apartamento', '2');
    await page.check('input[name="mascota"][value="si"]');
    await page.click('#reserva button[type="submit"]');
    const r = await page.evaluate(() => ({ href: document.getElementById('reserva-email').getAttribute('href'), texto: document.getElementById('reserva-texto').textContent, wa: document.getElementById('reserva-whatsapp').disabled }));
    const cuerpo = decodeURIComponent((r.href.split('body=')[1] || ''));
    comprobar(r.href.startsWith('mailto:apartamentoselsotano@gmail.com?subject=Consulta%20de%20fechas') && r.href.includes('%0D%0A') && !/ /.test(r.href) && cuerpo.startsWith('Hola Manuel, somos 2 adultos y 1 niño con mascota y queremos el Nº 2 del'),
      'formulario: el mailto lleva asunto y cuerpo bien codificados (CRLF, tildes, «Hola Manuel, … el Nº 2 del …»)');
    comprobar(/2 noches/.test(r.texto), 'formulario: el mensaje cuenta las noches');
    comprobar(r.wa === true, 'formulario: WhatsApp apagado con "whatsapp": null');
    const cfg = JSON.parse(JSON.stringify(configJson)); cfg.whatsapp = '34657771135'; cfg.segundo_portal = { calle: 'C/ Montesinos, 3' };
    await page.route('**/data/config.json', rr => rr.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cfg) }));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
    const r2 = await page.evaluate(() => ({ wa: document.getElementById('reserva-whatsapp').disabled, portal: document.getElementById('segundo-portal').hidden, txt: document.getElementById('segundo-portal').textContent }));
    comprobar(r2.wa === false, 'formulario: con un número en config.json el botón de WhatsApp se enciende');
    comprobar(!r2.portal && /Montesinos, 3/.test(r2.txt) && /Virgen de la Soledad, 6/.test(r2.txt), 'contacto: con "segundo_portal" relleno enseña los dos portales');
    await page.unroute('**/data/config.json');
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
    comprobar(await page.evaluate(() => document.getElementById('segundo-portal').hidden), 'contacto: con "segundo_portal": null, solo la puerta del nº 6');
    const antes = await page.evaluate(() => document.querySelectorAll('iframe').length);
    await page.click('.map-consent');
    const src = await page.evaluate(() => (document.querySelector('#mapa iframe') || {}).src || '');
    comprobar(antes === 0 && src.includes('maps?q=Calle+Virgen+de+la+Soledad+6+Badajoz&output=embed'), 'mapa: no hay iframe hasta pulsar .map-consent');
    comprobar(await page.evaluate(() => [...document.querySelectorAll('a')].some(a => a.href === 'https://www.booking.com/hotel/es/apartamentos-el-sotano.es.html')), 'formulario: enlace «También puedes reservar en Booking» sin aid, label ni sid');
    await ctx.close();
  }

  /* ═══════════════ opiniones: una cita cada vez, firmadas «Opinión en Booking» ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(4200);
    const citas = await page.evaluate(() => [...document.querySelectorAll('blockquote')].map(b => ({ q: b.textContent.trim(), firma: (b.closest('figure').querySelector('figcaption') || {}).textContent })));
    comprobar(citas.length >= 9 && citas.every(c => CITAS_OK(c.q)) && citas.every(c => c.firma === 'Opinión en Booking'), 'opiniones: ' + citas.length + ' citas textuales, todas firmadas «Opinión en Booking», sin nombre de cliente');
    await irA(page, '#opiniones', 0.05, 1200);
    const i0 = await page.evaluate(() => window.ElSotano.carrusel.i);
    await page.click('#carrusel-sig');
    const r = await page.evaluate(() => ({ i: window.ElSotano.carrusel.i, auto: window.ElSotano.carrusel.auto, vivo: document.getElementById('carrusel-pista').getAttribute('aria-live'), visibles: [...document.querySelectorAll('.cita')].filter(c => getComputedStyle(c).visibility === 'visible').length }));
    comprobar(r.i === i0 + 1 && !r.auto && r.vivo === 'polite', 'opiniones: el botón pasa a la siguiente, para el autoplay y la anuncia con aria-live="polite"');
    await page.waitForTimeout(900);
    comprobar(await page.evaluate(() => [...document.querySelectorAll('.cita')].filter(c => getComputedStyle(c).visibility === 'visible').length) === 1, 'opiniones: se ve una cita cada vez');
    await ctx.close();
  }

  /* ═══════════════ módulo «La historia»: el borrado, sobre una copia ═══════════════ */
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elsotano-'));
    const fuera = new Set(['scripts', 'screenshots', '.git']);
    const copiar = (de, a) => { fs.mkdirSync(a, { recursive: true }); for (const e of fs.readdirSync(de, { withFileTypes: true })) { if (fuera.has(e.name)) continue; const o = path.join(de, e.name), d = path.join(a, e.name); if (e.isDirectory()) copiar(o, d); else fs.copyFileSync(o, d); } };
    copiar(raiz, tmp);
    execFileSync(process.execPath, [path.join(raiz, 'scripts/quitar-historia.mjs'), tmp], { stdio: 'ignore' });
    const s2 = await servir(tmp, PUERTO + 1);
    const c2 = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    await c2.addInitScript(() => { try { localStorage.setItem('elsotano-cookies', 'ok'); } catch (e) {} });
    const p2 = await c2.newPage(); const err2 = [], resp2 = [], pedidas = [];
    p2.on('console', m => { if (m.type() === 'error') err2.push(m.text()); });
    p2.on('pageerror', e => err2.push(e.message));
    p2.on('request', rq => pedidas.push(rq.url()));
    p2.on('response', rr => { if (rr.status() >= 400) resp2.push(rr.status() + ' ' + rr.url()); });
    await p2.goto('http://127.0.0.1:' + (PUERTO + 1) + '/', { waitUntil: 'load' });
    await p2.waitForTimeout(4200);
    await p2.mouse.move(700, 450);
    await hastaAbajo(p2);
    const q = await p2.evaluate(() => ({
      seccion: !!document.getElementById('historia'), enlaces: document.querySelectorAll('[href="#historia"]').length,
      orden: [...document.querySelectorAll('main > section[id]')].map(s => s.id).join(','),
      radar: document.querySelectorAll('.punto.es-encendido').length
    }));
    comprobar(!q.seccion && q.enlaces === 0 && !pedidas.some(u => /historia\.(css|js)/.test(u)), 'borrado de «La historia»: sin sección, sin enlace y sin pedir su CSS ni su JS');
    comprobar(q.orden === 'inicio,la-casa,los-apartamentos,lo-de-todos,detalles,badajoz-a-pie,opiniones,normas,fechas,contacto', 'borrado de «La historia»: el resto de secciones sigue en orden (' + q.orden + ')');
    comprobar(err2.length === 0 && resp2.length === 0 && q.radar === alrededorJson.sitios.length, 'borrado de «La historia»: sin errores, sin 404 y el radar sigue funcionando' + (err2[0] ? ': ' + err2[0] : '') + (resp2[0] ? ' ' + resp2[0] : ''));
    await c2.close(); s2.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  {
    /* la copia que viaja a Manuel: sin mando (receta del README, comprobada contra los archivos) y funcionando */
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elsotano-entrega-'));
    execFileSync(process.execPath, [path.join(raiz, 'scripts/quitar-mando.mjs'), tmp], { stdio: 'ignore' });
    let limpio = true;
    try { execFileSync(process.execPath, [path.join(raiz, 'scripts/comprobar-borrado.mjs'), tmp], { stdio: 'ignore' }); } catch (e) { limpio = false; }
    const s3 = await servir(tmp, PUERTO + 2);
    const c3 = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    await c3.addInitScript(() => { try { localStorage.setItem('elsotano-cookies', 'ok'); } catch (e) {} });
    const p3 = await c3.newPage(); const err3 = [], resp3 = [];
    p3.on('console', m => { if (m.type() === 'error') err3.push(m.text()); });
    p3.on('pageerror', e => err3.push(e.message));
    p3.on('response', rr => { if (rr.status() >= 400) resp3.push(rr.status() + ' ' + rr.url()); });
    await p3.goto('http://127.0.0.1:' + (PUERTO + 2) + '/?revision', { waitUntil: 'load' });
    await p3.waitForTimeout(4400);
    await p3.mouse.move(700, 450);
    await hastaAbajo(p3);
    const e = await p3.evaluate(() => ({ mando: !!document.getElementById('mando'), tarjetas: document.querySelectorAll('.piso__boton').length, rev: document.documentElement.classList.contains('con-revision') }));
    comprobar(limpio && !e.mando && !e.rev && e.tarjetas === pisosJson.apartamentos.length && err3.length === 0 && resp3.length === 0,
      'entrega: quitar-mando.mjs deja una copia sin rastros (comprobar-borrado.mjs), que ni con ?revision enseña nada y funciona sin errores' + (err3[0] ? ': ' + err3[0] : '') + (resp3[0] ? ' ' + resp3[0] : ''));
    await c3.close(); s3.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  {
    /* la foto antigua: oculta con null; con datos en config.json, aparece */
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(700);
    const oculta = await page.evaluate(() => document.getElementById('historia-antigua').hidden);
    const cfg = JSON.parse(JSON.stringify(configJson)); cfg.foto_antigua = { src: 'assets/fotos/670608186-480.jpg', alt: 'Prueba', pie: 'Prueba de foto antigua' };
    await page.route('**/data/config.json', rr => rr.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cfg) }));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
    const vista = await page.evaluate(() => ({ h: document.getElementById('historia-antigua').hidden, img: !!document.querySelector('#historia-antigua img') }));
    comprobar(oculta && !vista.h && vista.img, 'La historia: el hueco de la foto antigua se oculta con null y aparece al rellenar "foto_antigua"');
    await ctx.close();
  }

  /* ═══════════════ densidades: sin ?revision no hay mando; las dos versiones ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const sin = await page.evaluate(() => ({ hidden: document.getElementById('mando').hidden, d: getComputedStyle(document.getElementById('mando')).display, rev: document.documentElement.classList.contains('con-revision'), verif: [...document.querySelectorAll('.verificar')].some(v => getComputedStyle(v).display !== 'none') }));
    comprobar(sin.hidden && sin.d === 'none' && !sin.rev && !sin.verif, 'sin ?revision no hay mando ni avisos [VERIFICAR]');
    await ctx.close();
  }
  {
    const { ctx, page } = await nuevaPagina({}, { cookiesVistas: false });
    await page.goto(BASE + '?revision', { waitUntil: 'load' }); await page.waitForTimeout(4200);
    const conCookies = await page.evaluate(() => getComputedStyle(document.getElementById('mando')).visibility);
    await page.click('#cookies-aceptar'); await page.waitForTimeout(500);
    const r0 = await page.evaluate(() => ({ vis: getComputedStyle(document.getElementById('mando')).visibility, avisos: [...document.querySelectorAll('#mando-avisos li')].map(l => l.textContent), verif: [...document.querySelectorAll('.verificar')].filter(v => getComputedStyle(v).display !== 'none').length }));
    comprobar(conCookies === 'hidden' && r0.vis === 'visible', 'mando: se aparta mientras está el aviso de cookies y aparece al cerrarlo');
    comprobar(r0.avisos.length === 4 && r0.avisos.some(a => /provisionales/.test(a)) && r0.avisos.some(a => a === 'Dos direcciones: pendiente de Manuel') && r0.avisos.some(a => /barra/.test(a)) && r0.avisos.some(a => /Accesibilidad/.test(a)), 'mando: enseña los avisos pendientes (' + r0.avisos.join(' · ') + ')');
    comprobar(r0.verif >= 3, 'revisión: los [VERIFICAR] (barra, accesibilidad) se ven con ?revision (' + r0.verif + ')');
    if (conCapturas) await page.screenshot({ path: foto('densidad-listones-1440.png') });
    await page.click('[data-densidad="sobria"]'); await page.waitForTimeout(1200);
    const s = await page.evaluate(() => ({
      clase: document.documentElement.classList.contains('densidad-sobria'),
      fotos: getComputedStyle(document.querySelector('.casa__foto .listones')).display,
      hero: getComputedStyle(document.querySelector('#hero-placa .listones')).display,
      contacto: getComputedStyle(document.querySelector('#contacto-placa .listones')).display,
      tituloListon: getComputedStyle(document.querySelector('#pisos-titulo + .liston-titulo')).height,
      cinta: getComputedStyle(document.querySelector('.cinta__pista')).display,
      tabla: getComputedStyle(document.getElementById('comparativa')).display,
      filas: document.querySelectorAll('#comparativa-tabla tbody tr').length,
      radar: document.getElementById('radar').classList.contains('es-hecho'),
      ancho: document.documentElement.scrollWidth, vw: innerWidth
    }));
    comprobar(s.clase && s.fotos === 'none' && s.hero !== 'none' && s.contacto !== 'none' && s.tituloListon === '1px', 'sobria: los listones solo en la cortina, el panel del hero y el contacto (fotos sin marco, titulares con una línea)');
    comprobar(s.cinta === 'grid' && s.radar, 'sobria: la cinta pasa a rejilla quieta y el radar queda encendido sin barrido');
    comprobar(s.tabla === 'block' && s.filas === pisosJson.apartamentos.length, 'sobria: añade la tabla comparativa sacada del JSON (' + s.filas + ' filas)');
    comprobar(s.ancho <= s.vw, 'sobria: sin desbordamiento horizontal');
    await page.mouse.move(40, 120); await page.waitForTimeout(700);
    comprobar(!(await page.evaluate(() => { const t = document.getElementById('sombra').getAttribute('transform'); return t && !/matrix\(1,0,0,1,0,0\)|translate\(0(px)?,\s*0(px)?\)/.test(t) && Math.abs(window.gsap.getProperty('#sombra', 'x')) > 0.5; })), 'sobria: la sombra se queda quieta');
    if (conCapturas) {
      await page.screenshot({ path: foto('densidad-sobria-1440.png') });
      await irA(page, '#comparativa', 0.1); await page.screenshot({ path: foto('densidad-sobria-tabla-1440.png') });
      await irA(page, '#detalles', 0.02); await page.screenshot({ path: foto('densidad-sobria-detalles-1440.png') });
    }
    await irA(page, '#pisos-lista', 0.2, 900);
    await page.locator('.piso__boton[data-numero="1"]').click();
    await page.waitForTimeout(90);
    const fundido = await page.evaluate(() => ({ op: +getComputedStyle(document.getElementById('dialogo')).opacity, w: document.getElementById('dialogo-marco').getBoundingClientRect().width, vw: innerWidth }));
    comprobar(fundido.op < 1 && fundido.w > fundido.vw * 0.8, 'sobria: el diálogo se abre con un fundido, sin marco que crece (opacidad ' + fundido.op.toFixed(2) + ')');
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    await page.click('[data-densidad="listones"]'); await page.waitForTimeout(1000);
    const v = await page.evaluate(() => ({ clase: document.documentElement.classList.contains('densidad-listones'), fotos: getComputedStyle(document.querySelector('.casa__foto .listones')).display, tabla: getComputedStyle(document.getElementById('comparativa')).display }));
    comprobar(v.clase && v.fotos !== 'none' && v.tabla === 'none', 'densidades: se puede volver a «Cuatro listones»');
    comprobar(page.errores.length === 0, 'consola limpia en modo revisión' + (page.errores.length ? ': ' + page.errores[0] : ''));
    await ctx.close();
  }

  /* ═══════════════ textos, tipografía, contraste, legales y estáticos ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    const prohibido = [/desde\s*\d+[.,]?\d*\s*€/i, /m[aá]s barato/i, /sin comisi[oó]n/i, /parking gratis/i, /aparcamiento gratis/i, /inolvidable/i, /\blujo/i, /sostenib/i, /casa rural/i, /rinc[oó]n con encanto/i, /cancelaci[oó]n gratis/i, /mejor precio/i,
      /\d+\s*(reseñas|opiniones|valoraciones)[^.]{0,30}google/i, /google[^.]{0,30}\b\d+\s*(reseñas|opiniones|valoraciones)/i, /\b(1|una)( sola| única)? reseña/i];
    for (const pag of ['', 'aviso-legal.html', 'privacidad.html', 'no-existe']) {
      const res = await page.goto(BASE + pag, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => ({ texto: document.body.textContent + ' ' + document.title + ' ' + (document.querySelector('meta[name="description"]') || {}).content, robots: (document.querySelector('meta[name="robots"]') || {}).content, primera: document.head.firstElementChild.getAttribute('charset') }));
      const malos = prohibido.filter(re => re.test(r.texto)).map(String);
      comprobar(malos.length === 0, 'textos prohibidos en /' + pag + ': ' + (malos.join(', ') || 'ninguno'));
      comprobar(r.robots === 'noindex, nofollow' && r.primera === 'utf-8', 'noindex en /' + pag);
      if (pag === '') {
        comprobar(/AT-BA-00367/.test(await page.evaluate(() => document.querySelector('.pie').textContent)), 'pie: licencia AT-BA-00367');
        comprobar(/Hablamos español y portugués/.test(r.texto) && /Instagram/.test(await page.evaluate(() => document.querySelector('.pie').textContent)), 'pie: idiomas e Instagram');
        comprobar(!/\[PENDIENTE\]|\bTODO\b/.test(r.texto) && !/lorem ipsum/i.test(r.texto), 'portada sin [PENDIENTE], TODO ni relleno');
        comprobar(/¿Vienes en coche\?/.test(r.texto) && /Pregúntanos por el aparcamiento/.test(r.texto), 'parking: solo «¿Vienes en coche? Pregúntanos por el aparcamiento»');
        const ld = await page.evaluate(() => JSON.parse(document.getElementById('datos-estructurados').textContent));
        comprobar(ld['@type'] === 'LodgingBusiness' && ld.address.streetAddress === 'Calle Virgen de la Soledad, 6' && ld.geo && ld.telephone && ld.email && ld.petsAllowed === true && ld.sameAs.length === 2 && !('aggregateRating' in ld) && !('review' in ld) && !JSON.stringify(ld).includes('ratingCount'),
          'JSON-LD LodgingBusiness: dirección del nº 6, geo, teléfono, email, petsAllowed, sameAs y SIN aggregateRating');
        const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]').content);
        comprobar(fs.existsSync(path.join(raiz, og)), 'og:image hecha a propósito (' + og + ')');
        const v = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"], script[src]')].map(n => n.getAttribute('href') || n.getAttribute('src')).filter(u => !/^https?:/.test(u)));
        comprobar(v.length === 4 && v.every(u => /\?v=[0-9a-f]{8}$/.test(u)), 'CSS y JS propios versionados con ?v=<huella> (' + v.length + ')');
        comprobar(!(await page.evaluate(() => document.documentElement.outerHTML)).includes('cdnjs.cloudflare.com/ajax/libs/lenis'), 'Lenis no sale de cdnjs (404 silencioso)');
        /* interlineado: ningún titular en League Gothic con tildes por debajo de 1,02 */
        const lh = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, blockquote, .titular, .casa__cita, .piso__cabeza, .contacto__datos a, .mini figcaption')].filter(el => /League Gothic/.test(getComputedStyle(el).fontFamily) && /[ÁÉÍÓÚáéíóú]/.test(el.textContent)).map(el => { const cs = getComputedStyle(el); return { t: el.textContent.trim().slice(0, 28), r: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) }; }));
        const bajos = lh.filter(x => !(x.r >= 1.019));
        comprobar(lh.length >= 8 && bajos.length === 0, 'tipografía: los ' + lh.length + ' titulares en League Gothic con tildes van a 1,02 o más' + (bajos.length ? ' (' + bajos.map(b => b.t + ' ' + b.r.toFixed(2)).join(' | ') + ')' : ''));
        /* contraste: componiendo el alfa sobre el fondo real (y leyendo color(srgb …) de color-mix) */
        const contraste = await page.evaluate(() => {
          const parse = c => { const m = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : +m[4]]; const n = c.match(/[\d.]+/g).map(Number); return [n[0], n[1], n[2], n[3] == null ? 1 : n[3]]; };
          const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const fondo = el => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0.95) return c; e = e.parentElement; } return [247, 244, 239, 1]; };
          const mezcla = (c, f) => [c[0] * c[3] + f[0] * (1 - c[3]), c[1] * c[3] + f[1] * (1 - c[3]), c[2] * c[3] + f[2] * (1 - c[3])];
          const ALMAGRE = [140, 91, 77, 1];
          const casos = ['.antetitulo', '.seccion__entrada', '.casa__parrafo', '.cifra dt', '.cifra dd', '.hero__entrada', '.hero__notas', '.hero__pie', '.piso__extras', '.piso__ver', '.todos__rejilla span', '.mini figcaption', '.radar-lista li', '.radar-sec__nota', '.radar-sec__frase', '.historia__texto p', '.historia figcaption', '.nota-sub', '.cita figcaption', '.categorias li', '.norma p', '.campo label', '.reserva__nota', '.contacto__dato-eti', '.contacto__puerta figcaption', '.pie__col', '.pie__legal', '.cabecera__nav a', '.boton--almagre', '.boton--cal', '.cifras__fuente'];
          /* la cabecera, arriba, flota sobre el muro de almagre (que no es su antecesor) */
          const sobreMuro = s => s === '.cabecera__nav a' && !document.getElementById('cabecera').classList.contains('es-fija');
          return casos.map(s => { const el = document.querySelector(s); if (!el) return { s, ratio: 0 }; const f = sobreMuro(s) ? ALMAGRE : fondo(el); const c = mezcla(parse(getComputedStyle(el).color), f); const a = lum(c), b = lum(f); const fs = parseFloat(getComputedStyle(el).fontSize), w = +getComputedStyle(el).fontWeight; return { s, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), grande: fs >= 24 || (fs >= 18.66 && w >= 700) }; });
        });
        const flojos = contraste.filter(c => c.ratio < (c.grande ? 3 : 4.5));
        comprobar(flojos.length === 0, 'contraste AA en ' + contraste.length + ' pares texto/fondo (mínimo ' + Math.min(...contraste.map(c => c.ratio)).toFixed(2) + ')' + (flojos.length ? ': ' + flojos.map(f => f.s + ' ' + f.ratio.toFixed(2)).join(' | ') : ''));
        notas.push('       contraste: ' + contraste.map(c => c.s + ' ' + c.ratio.toFixed(1)).join(' · '));
      }
      if (pag === 'aviso-legal.html' || pag === 'privacidad.html') comprobar(/Titular[^]*\[PENDIENTE\][^]*NIF[^]*\[PENDIENTE\]/.test(r.texto), pag + ': titular y NIF como [PENDIENTE]');
      if (pag === 'no-existe') comprobar(res.status() === 404, '404.html responde en una ruta que no existe');
    }
    /* checklist 9 · clases de estado con prefijo (estático) */
    const js = ['js/main.js', 'js/historia.js'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n');
    const clases = [...js.matchAll(/classList\.(?:add|toggle|remove)\('([^']+)'/g)].map(m => m[1]);
    const sinPrefijo = [...new Set(clases)].filter(c => !/^(es-|con-|sin-|densidad-|cortina-fuera$|menu-abierto$|cookies-visibles$|placa--cortina$)/.test(c));
    comprobar(sinPrefijo.length === 0, 'checklist 9 · clases de estado con prefijo (es-…): ' + (sinPrefijo.join(', ') || 'todas'));
    const css = fs.readFileSync(path.join(raiz, 'css/estilos.css'), 'utf8') + fs.readFileSync(path.join(raiz, 'css/historia.css'), 'utf8');
    const sueltas = css.match(/(^|[},])\s*\.es-[a-z-]+\s*[{,]/gm) || [];
    const bloques = new Set([...fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)).filter(c => !c.startsWith('es-')));
    const estados = [...new Set(clases.filter(c => c.startsWith('es-')).map(c => c.slice(3)))];
    const chocan = estados.filter(e => bloques.has(e));
    comprobar(sueltas.length === 0 && chocan.length === 0, 'checklist 9 · ninguna clase de estado coincide con un bloque ni va suelta en el CSS' + (sueltas.length || chocan.length ? ': ' + sueltas.concat(chocan).join(' ') : ''));
    /* checklist 8 · trazos con autoRound:false: en esta web nada se dibuja con stroke-dashoffset
       (los listones son scaleX/scaleY y se muestrean aparte); si algún día se añade, tiene que llevarlo */
    const tweens = [...js.matchAll(/strokeDashoffset:\s*[^,}]+[^}]*\}/g)].map(m => m[0]);
    comprobar(tweens.every(t => /autoRound:\s*false/.test(t)), 'checklist 8 · trazos con autoRound:false (' + tweens.length + ' tweens de strokeDashoffset; el montaje de los listones se muestrea en su propia prueba)');
    /* ninguna capa con overflow:hidden en un contenedor de algo sticky */
    comprobar(!/\.(normas|radar-sec)\s*\{[^}]*overflow:\s*hidden/.test(css), 'overflow:clip (nunca hidden) en los contenedores de lo sticky');
    await ctx.close();
  }
} catch (e) {
  comprobar(false, 'el script se ha caído: ' + (e && e.stack || e));
} finally {
  await navegador.close();
  servidor.close();
}

function CITAS_OK(q) { return CITAS.includes(q); }

console.log(notas.join('\n'));
if (fallos.length) console.log('\n' + fallos.join('\n'));
console.log('\n' + notas.filter(n => n.startsWith('OK')).length + ' bien · ' + fallos.length + ' mal');
process.exitCode = fallos.length ? 1 : 0;
