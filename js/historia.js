/* ═══════════════════════════════════════════════════════════════════════════
   [MÓDULO HISTORIA] «Fue restaurante. Hoy es casa.»
   Este archivo es opcional: si falta (o falta la sección), no rompe nada, y
   main.js no depende de él. Hace tres cosas:
     1. el hueco de la FOTO ANTIGUA del restaurante: oculto hasta que
        data/config.json traiga "foto_antigua" (ver el ejemplo en ese archivo);
     2. el brillo cálido de arriba a la izquierda acompaña al scroll;
     3. las dos fotos suben a distinto ritmo (paralaje suave).
   Con movimiento reducido o sin GSAP, solo el punto 1.
   Se quita con node scripts/quitar-historia.mjs.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var seccion = document.getElementById('historia');
  if (!seccion) return;
  var API = window.ElSotano || {};
  var gsap = window.gsap;
  var movimiento = !!API.movimiento && !!gsap && !!window.ScrollTrigger;
  var t = API.t || function (s) { return s; };

  /* 1 · la foto antigua, si Manuel la tiene */
  function fotoAntigua(c) {
    var fig = document.getElementById('historia-antigua');
    var ventana = document.getElementById('historia-antigua-ventana');
    var pie = document.getElementById('historia-antigua-pie');
    var f = c && c.foto_antigua;
    if (!fig || !f || !f.src) { if (fig) fig.hidden = true; return; }
    var img = document.createElement('img');
    img.src = (/^(https?:)?\//.test(f.src) ? '' : API.raiz || '') + f.src;
    img.alt = t(f.alt || 'El restaurante El Sótano, en una foto antigua');
    if (f.ancho) img.width = f.ancho;
    if (f.alto) img.height = f.alto;
    img.loading = 'lazy'; img.decoding = 'async';
    ventana.textContent = '';
    ventana.appendChild(img);
    pie.textContent = f.pie ? t(f.pie) : '';
    fig.hidden = false;
    var marco = fig.querySelector('.marco');
    if (marco && API.prepararListones && API.montarListones && API.alEntrar) {
      API.prepararListones(marco);
      API.alEntrar(marco, function () { API.montarListones(marco, 0.05); });
    }
  }
  if (API.promesaConfig) API.promesaConfig.then(fotoAntigua);

  if (!movimiento) return;
  /* 2 · el brillo cálido baja más despacio que la página */
  var brillo = document.getElementById('historia-brillo');
  if (brillo) {
    gsap.fromTo(brillo, { yPercent: -12, opacity: .55 }, {
      yPercent: 14, opacity: 1, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: seccion, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }
  /* 3 · las fotos, a dos ritmos */
  var barra = seccion.querySelector('.historia__foto--barra');
  var puerta = seccion.querySelector('.historia__foto--puerta');
  if (barra) gsap.fromTo(barra, { y: 40 }, { y: -30, ease: 'none', immediateRender: false, scrollTrigger: { trigger: seccion, start: 'top bottom', end: 'bottom top', scrub: true } });
  if (puerta) gsap.fromTo(puerta, { y: 90 }, { y: -50, ease: 'none', immediateRender: false, scrollTrigger: { trigger: seccion, start: 'top bottom', end: 'bottom top', scrub: true } });
})();
