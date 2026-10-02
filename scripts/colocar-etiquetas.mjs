/* Coloca las etiquetas del radar sin que se pisen y lo deja DECLARADO en
   data/alrededor.json (lado: l | r | c, dy), para escritorio y, aparte, para
   móvil (campo «movil»: solo nombres cortos, letra más grande).

   El boceto ya tuvo choques (Plaza de la Soledad contra Puerta de Palmas,
   Parque de la Legión contra el centro). En vez de probar a ojo, se mide en el
   navegador: para cada sitio se prueban los lados y desfases posibles, con la
   letra de verdad (getBBox), y se elige el que no toca ningún punto, ninguna
   otra etiqueta, el «6» del centro, la «N», las cifras de los anillos ni el
   borde del radar. Los sitios más apretados eligen primero.

   Necesita el servidor: node scripts/servir.mjs (puerto 4210)
   node scripts/colocar-etiquetas.mjs
   verificar.mjs comprueba luego, a 375 y a 1440 px, que nada se pisa.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ruta = path.join(raiz, 'data', 'alrededor.json');
const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const BASE = process.argv[2] || 'http://127.0.0.1:4210/';

const navegador = await chromium.launch();
async function resolver(ancho, movil) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, reducedMotion: 'reduce', isMobile: movil, hasTouch: movil });
  await ctx.addInitScript(() => { try { localStorage.setItem('elsotano-cookies', 'ok'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ElSotano && window.ElSotano.radar);
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate((movil) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.getElementById('radar');
    const gP = document.getElementById('radar-puntos');
    const sitios = window.ElSotano.radar.sitios;
    const C = 300, K = 262 / 700, MARGEN = movil ? 4 : -40;           /* en escritorio el radar puede asomar un poco */
    const caja = el => { const b = el.getBBox(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; };
    const choca = (a, b, h = 2) => a.x0 < b.x1 + h && b.x0 < a.x1 + h && a.y0 < b.y1 + h && b.y0 < a.y1 + h;
    const fijos = [];
    fijos.push({ x0: 285, y0: 285, x1: 315, y1: 315, que: 'el 6' });                                  /* el «6» */
    svg.querySelectorAll('.radar__norte, #radar-anillos .cifra').forEach(t => fijos.push(Object.assign(caja(t), { que: t.textContent })));
    const pts = sitios.map(s => {
      const a = s.rumbo * Math.PI / 180, rr = s.recta_m * K;
      return { s, x: C + rr * Math.sin(a), y: C - rr * Math.cos(a) };
    });
    pts.forEach(p => fijos.push({ x0: p.x - 7, y0: p.y - 7, x1: p.x + 7, y1: p.y + 7, punto: p.s.clave, que: 'punto ' + p.s.clave }));
    /* los más apretados eligen primero */
    pts.forEach(p => { p.vecinos = pts.filter(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 130).length; });
    const orden = pts.slice().sort((a, b) => b.vecinos - a.vecinos || a.s.recta_m - b.s.recta_m);
    const prueba = document.createElementNS(NS, 'g'); prueba.setAttribute('class', 'punto'); gP.appendChild(prueba);
    /* la etiqueta prefiere el lado que mira hacia FUERA del radar (no cruza el centro) */
    function candidatas(p, otras) {
      let mejor = null;
      for (const lado of ['r', 'l', 'c']) {
        const dys = lado === 'c' ? [-20, -24, -28, -32, -36, 26, 30, 34, 38, 42] : [0, 4, -4, 8, -8, 12, -12, 16, -16, 20, -20, 24, -24, 28, -28];
        for (const dy of dys) {
          const sep = movil ? 12 : 10;
          const tx = lado === 'c' ? p.x : (lado === 'r' ? p.x + sep : p.x - sep);
          const ty = p.y + (lado === 'c' ? 0 : (movil ? 7 : 4.5)) + dy;
          const t = document.createElementNS(NS, 'text');
          t.setAttribute('x', tx); t.setAttribute('y', ty);
          t.setAttribute('text-anchor', lado === 'c' ? 'middle' : (lado === 'r' ? 'start' : 'end'));
          t.appendChild(document.createTextNode(movil ? (p.s.corto || p.s.nombre) : p.s.nombre));
          if (!movil) { const ts = document.createElementNS(NS, 'tspan'); ts.setAttribute('class', 'punto__m'); ts.setAttribute('dx', 5); ts.textContent = (p.s.a_pie_m || p.s.recta_m) + ' m'; t.appendChild(ts); }
          prueba.appendChild(t);
          const b = caja(t);
          prueba.removeChild(t);
          let malas = 0; const con = [];
          fijos.forEach(f => { if (f.punto !== p.s.clave && choca(b, f, f.punto ? 1 : 2)) { malas++; con.push(f.que); } });
          otras.forEach(c => { if (c.que !== p.s.clave && choca(b, c, 3)) { malas++; con.push('etiqueta ' + c.que); } });
          if (b.x0 < MARGEN || b.x1 > 600 - MARGEN || b.y0 < 0 || b.y1 > 600) { malas += 2; con.push('borde'); }
          const haciaDentro = (lado === 'r' && p.x < C - 15) || (lado === 'l' && p.x > C + 15);
          const coste = malas * 1000 + Math.abs(dy) + (lado === 'c' ? 6 : 0) + (haciaDentro ? 14 : 0);
          if (!mejor || coste < mejor.coste) mejor = { coste, lado, dy, b: Object.assign(b, { que: p.s.clave }), malas, con };
        }
      }
      return mejor;
    }
    const elegidas = {};
    for (const p of orden) elegidas[p.s.clave] = candidatas(p, Object.values(elegidas).map(e => e.b));
    /* segunda y tercera pasada: cada una se recoloca sabiendo dónde quedaron todas las demás */
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      for (const p of orden) elegidas[p.s.clave] = candidatas(p, Object.values(elegidas).map(e => e.b));
    }
    const salida = {};
    for (const p of orden) { const e = elegidas[p.s.clave]; salida[p.s.clave] = { lado: e.lado, dy: e.dy, malas: e.malas, con: e.con }; }
    gP.removeChild(prueba);
    return salida;
  }, movil);
  await ctx.close();
  return r;
}

const escritorio = await resolver(1440, false);
const movil = await resolver(375, true);
await navegador.close();
let malas = 0;
for (const s of datos.sitios) {
  const e = escritorio[s.clave], m = movil[s.clave];
  s.lado = e.lado; s.dy = e.dy;
  s.movil = { lado: m.lado, dy: m.dy };
  malas += e.malas + m.malas;
  console.log(s.nombre.padEnd(32), 'escritorio', e.lado, String(e.dy).padStart(3), e.malas ? '  ✗ ' + e.con.join(', ') : '', '· móvil', m.lado, String(m.dy).padStart(3), m.malas ? '  ✗ ' + m.con.join(', ') : '');
}
fs.writeFileSync(ruta, JSON.stringify(datos, null, 1) + '\n');
console.log(malas ? malas + ' choques sin resolver: revisar a mano' : 'Sin choques. data/alrededor.json actualizado.');
