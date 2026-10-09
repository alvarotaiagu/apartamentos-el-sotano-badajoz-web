/* ═══════════════════════════════════════════════════════════════════════════
   El Sótano · «Los cuatro listones»
   En la fachada del nº 6 el logo va en un panel blanco dentro de un marco de
   cuatro listones de madera que se cruzan en las esquinas. Aquí los listones
   llegan, se cruzan y enmarcan lo importante: primero el logo (cortina →
   panel del hero), luego cada foto y cada apartamento (y el marco crece hasta
   ser el del diálogo) y, al final, la placa del contacto.

   Banderas separadas a propósito:
     gsapReady  → hay motor de animación (GSAP + ScrollTrigger cargados)
     movimiento → además el usuario NO ha pedido reducir el movimiento
   Con movimiento reducido el CONTENIDO sigue (las cifras, el radar encendido,
   los listones montados, la cita que eliges); lo que se apaga es el viaje.

   Los apartamentos salen de data/apartamentos.json: su número no se escribe
   a mano en ningún texto. «La historia» vive en js/historia.js y este archivo
   no depende de él. Clases de estado siempre con prefijo (es-…).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esTactil = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var punteroFino = window.matchMedia('(pointer: fine)').matches;
  var gsapReady = !!(window.gsap && window.ScrollTrigger);
  var movimiento = gsapReady && !reduce;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;

  if (gsapReady) gsap.registerPlugin(ST);
  html.classList.add(movimiento ? 'con-movimiento' : 'sin-movimiento');

  /* lo mismo que data/config.json, por si el JSON no llega */
  var CONFIG = {
    telefono: '657 77 11 35', telefono_enlace: '+34657771135',
    email: 'apartamentoselsotano@gmail.com', whatsapp: null, reservas: null,
    booking: 'https://www.booking.com/hotel/es/apartamentos-el-sotano.es.html',
    segundo_portal: null, foto_antigua: null
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function todos(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function densidad() { return html.classList.contains('densidad-sobria') ? 'sobria' : 'listones'; }
  function esMovil() { return window.matchMedia('(max-width: 900px)').matches; }
  function alturaCabecera() { var c = $('#cabecera'); return c ? c.offsetHeight : 76; }
  function refrescar() { if (ST) ST.refresh(); }
  function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esperar(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function dos(n) { return String(n).padStart(2, '0'); }
  function crear(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; }

  /* una sola vez al entrar: IntersectionObserver sobre el BLOQUE, umbral 0
     (un umbral en % sobre una sección alta no se alcanza nunca en móvil) */
  function alEntrar(nodos, fn, margen) {
    nodos = [].concat(nodos).filter(Boolean);
    if (!('IntersectionObserver' in window)) { nodos.forEach(fn); return; }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        fn(en.target);
      });
    }, { threshold: 0, rootMargin: margen || '0px 0px -12% 0px' });
    nodos.forEach(function (n) { obs.observe(n); });
  }

  var API = window.ElSotano = window.ElSotano || {};
  API.densidad = densidad;
  API.movimiento = movimiento;
  API.alEntrar = alEntrar;

  /* ───────────────────────── datos ───────────────────────── */
  function cargarJSON(url) {
    if (!window.fetch) return Promise.reject(new Error('sin fetch'));
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }
  var promesaFotos = cargarJSON('data/fotos.json').then(function (d) { var m = {}; d.fotos.forEach(function (f) { m[f.id] = f; }); return m; });
  var promesaPisos = cargarJSON('data/apartamentos.json');
  var promesaConfig = cargarJSON('data/config.json').then(function (c) {
    Object.keys(c).forEach(function (k) { CONFIG[k] = c[k]; });
    document.dispatchEvent(new CustomEvent('config-cargada', { detail: CONFIG }));
    return CONFIG;
  }).catch(function () { return CONFIG; });
  API.config = function () { return CONFIG; };
  API.promesaConfig = promesaConfig;

  function picture(f, sizes, carga, alt) {
    var set = function (ext) { return f.anchos.map(function (a) { return 'assets/fotos/' + f.id + '-' + a + '.' + ext + ' ' + a + 'w'; }).join(', '); };
    var mayor = f.anchos[f.anchos.length - 1];
    var p = document.createElement('picture');
    ['avif', 'webp'].forEach(function (ext) {
      var s = document.createElement('source');
      s.type = 'image/' + ext; s.srcset = set(ext); s.sizes = sizes; p.appendChild(s);
    });
    var img = document.createElement('img');
    img.src = 'assets/fotos/' + f.id + '-' + mayor + '.jpg';
    img.srcset = set('jpg'); img.sizes = sizes;
    img.width = mayor; img.height = Math.round(f.h * mayor / f.w);
    img.alt = alt == null ? f.alt : alt;
    img.decoding = 'async';
    if (carga !== 'eager') img.loading = 'lazy';
    p.appendChild(img);
    return p;
  }
  API.picture = picture;
  API.promesaFotos = promesaFotos;

  /* ───────────────────────── Lenis ───────────────────────── */
  var lenis = null;
  if (movimiento && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  }
  API.lenis = lenis;

  function irA(destino) {
    var desfase = -alturaCabecera() + 1;
    if (destino === 0) { if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo(0, 0); return; }
    if (lenis) { lenis.scrollTo(destino, { offset: desfase, duration: 1.5 }); return; }
    var el = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + desfase);
  }
  API.irA = irA;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || !document.querySelector(id)) return;
    e.preventDefault();
    cerrarMenu();
    irA(id === '#inicio' ? 0 : id);
  });

  /* ───────────────────── titulares partidos (char-reveal) ───────────────────── */
  function partir(el) {
    var modo = el.dataset.revelar;
    var texto = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', texto);
    var piezas = [];
    function trocear(cadena, destino) {
      cadena.split(/(\s+)/).forEach(function (trozo) {
        if (!trozo) return;
        if (/^\s+$/.test(trozo)) { destino.appendChild(document.createTextNode(' ')); return; }
        var caja = crear('span', 'palabra');
        caja.setAttribute('aria-hidden', 'true');
        if (modo === 'letras') {
          Array.from(trozo).forEach(function (c) { var s = crear('span', 'letra', c); caja.appendChild(s); piezas.push(s); });
        } else {
          var s = crear('span', 'palabra-int', trozo); caja.appendChild(s); piezas.push(s);
        }
        destino.appendChild(caja);
      });
    }
    var hijos = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    hijos.forEach(function (n) {
      if (n.nodeType === 3) { trocear(n.textContent, el); return; }
      if (n.nodeType === 1) {
        var envoltura = n.cloneNode(false);
        envoltura.setAttribute('aria-hidden', 'true');
        el.appendChild(envoltura);
        trocear(n.textContent, envoltura);
      }
    });
    return piezas;
  }
  function revelar(el, piezas, retardo) {
    var letras = el.dataset.revelar === 'letras';
    /* GSAP lee el translate3d del CSS como y en píxeles: se anima y Y yPercent a 0 */
    gsap.to(piezas, {
      y: 0, yPercent: 0, duration: 1.15, ease: 'expo.out', delay: retardo || 0,
      stagger: letras ? Math.min(0.03, 1.1 / piezas.length) : 0.07
    });
  }

  /* ─────────────────── cortina: avisar del momento de apertura ─────────────────── */
  var cortinaAbierta = false;
  function avisarApertura() {
    if (cortinaAbierta) return;
    cortinaAbierta = true;
    document.dispatchEvent(new CustomEvent('cortina-abre'));
  }
  function alAbrirse(fn) { if (cortinaAbierta) fn(); else document.addEventListener('cortina-abre', fn, { once: true }); }
  API.alAbrirse = alAbrirse;

  todos('[data-revelar]').forEach(function (el) {
    var piezas = partir(el);
    if (!movimiento) return;
    if (el.closest('.hero')) { alAbrirse(function () { revelar(el, piezas, 0.3); }); return; }
    alEntrar(el, function () { revelar(el, piezas); });
  });

  /* ═══════════════ los cuatro listones ═══════════════
     Se montan con scaleX / scaleY, cada uno desde su extremo, 0,14 s entre
     uno y otro, y al terminar un retroceso de 2 px: el «clac». */
  function listonesDe(cont) {
    var c = cont.classList && cont.classList.contains('listones') ? cont : cont.querySelector(':scope > .listones');
    if (!c) return null;
    return ['t', 'r', 'b', 'l'].map(function (k) { return c.querySelector('.' + k); });
  }
  function prepararListones(cont) {
    if (!movimiento) return;
    var l = listonesDe(cont);
    if (!l) return;
    gsap.set([l[0], l[2]], { scaleX: 0 });
    gsap.set([l[1], l[3]], { scaleY: 0 });
  }
  function montarListones(cont, retardo) {
    var l = listonesDe(cont);
    if (!l || !movimiento) return null;
    var tl = gsap.timeline({
      delay: retardo || 0,
      onComplete: function () {
        /* GSAP deja translate/scale «none» en línea: fuera, para que el CSS (el marco que respira) mande */
        gsap.set(l, { clearProps: 'transform,translate,rotate,scale' });
      }
    });
    l.forEach(function (el, i) {
      var eje = i % 2 === 0 ? 'scaleX' : 'scaleY';
      var de = {}; de[eje] = 0;
      var a = { duration: 0.62, ease: 'expo.out', immediateRender: false }; a[eje] = 1;
      tl.fromTo(el, de, a, i * 0.14);
    });
    /* el clac: los cuatro retroceden 2 px hacia fuera y vuelven */
    var fin = 3 * 0.14 + 0.5;
    tl.to(l[0], { y: -2, duration: 0.07, ease: 'power2.out' }, fin)
      .to(l[1], { x: 2, duration: 0.07, ease: 'power2.out' }, fin)
      .to(l[2], { y: 2, duration: 0.07, ease: 'power2.out' }, fin)
      .to(l[3], { x: -2, duration: 0.07, ease: 'power2.out' }, fin)
      .to(l, { x: 0, y: 0, duration: 0.24, ease: 'power3.out' }, fin + 0.07);
    return tl;
  }
  function vigilarListones(conts) {
    conts = [].concat(conts).filter(Boolean);
    if (!movimiento) return;
    conts.forEach(prepararListones);
    alEntrar(conts, function (c) { montarListones(c, 0.05); }, '0px 0px -8% 0px');
  }
  API.montarListones = montarListones;
  API.prepararListones = prepararListones;

  /* los listones de las fotos y de la placa del contacto se montan al entrar (los de la
     cinta, todos a la vez cuando entra su fila; los del hero, al abrirse la cortina) */
  vigilarListones(todos('.marco').filter(function (m) { return !m.closest('.hero') && !m.closest('.cinta') && !m.closest('.dialogo') && !m.closest('#historia-antigua'); }));
  vigilarListones($('#contacto-placa'));

  /* el listón bajo cada titular se desliza al entrar */
  alEntrar(todos('.liston-titulo'), function (el) { el.classList.add('es-visto'); }, '0px 0px -6% 0px');

  /* ═══════════════ cortina: los listones se cruzan ═══════════════ */
  (function cortina() {
    var cort = $('#cortina');
    var heroPlaca = $('#hero-placa');
    if (!cort || !heroPlaca) { avisarApertura(); return; }
    var hecho = false;

    function retirar() {
      if (hecho) return;
      hecho = true;
      avisarApertura();
      heroPlaca.classList.remove('es-esperando');
      cort.classList.add('es-fuera');
      html.classList.add('cortina-fuera');
      /* con Lenis, lagSmoothing(0) al retirarla, nunca antes (el tirón de la carga en frío saltaría la secuencia) */
      if (gsapReady) gsap.ticker.lagSmoothing(0);
      refrescar();
      document.dispatchEvent(new CustomEvent('cortina-retirada'));
    }
    API.retirarCortina = retirar;

    if (!movimiento) {
      /* sin GSAP o con movimiento reducido se retira igual: nunca tapa la página */
      setTimeout(retirar, reduce ? 0 : 60);
      return;
    }

    /* si la red de seguridad del <head> ya la retiró (los scripts tardaron más de 7 s en llegar),
       no se monta: si no, la placa del hero se quedaría oculta esperando a una cortina invisible */
    if (html.classList.contains('cortina-fuera')) { retirar(); return; }

    var capa = $('#cortina-capa'), interior = $('#cortina-interior'), lugar = $('#cortina-lugar');
    var borde = $('#cortina-borde-d'), caja = $('#cortina-placa');
    heroPlaca.classList.add('es-esperando');

    /* clon de la placa del hero: ids renombrados y url(#…) actualizados (los <use> apuntan al sprite, que no se clona) */
    var clon = heroPlaca.cloneNode(true);
    clon.removeAttribute('id');
    clon.classList.remove('es-esperando');
    clon.classList.add('placa--cortina');
    clon.setAttribute('aria-hidden', 'true');
    todos('title', clon).forEach(function (t) { t.remove(); });
    var svgClon = clon.querySelector('svg');
    svgClon.removeAttribute('role'); svgClon.removeAttribute('aria-labelledby');
    var mapa = {};
    todos('[id]', clon).forEach(function (n) { mapa[n.id] = n.id + '-cortina'; n.id = mapa[n.id]; });
    todos('*', clon).forEach(function (n) {
      ['mask', 'clip-path', 'fill', 'filter', 'href'].forEach(function (a) {
        var v = n.getAttribute(a);
        if (!v) return;
        var m = v.match(/^url\(#(.+)\)$/) || v.match(/^#(.+)$/);
        if (m && mapa[m[1]]) n.setAttribute(a, v.replace(m[1], mapa[m[1]]));
      });
    });
    caja.appendChild(clon);
    var fondo = clon.querySelector('.placa__fondo');
    var lst = listonesDe(clon);
    var sombra = $('#sombra-cortina'), letras = $('#letras-cortina');
    var aps = todos('#apartamentos-cortina use');

    /* geometría: el clon se coloca encima del panel real y se lleva al centro, más grande */
    var destino = null, k = 1.3, desde = { x: 0, y: 0 };
    function medir() {
      destino = heroPlaca.getBoundingClientRect();
      clon.style.left = destino.left + 'px'; clon.style.top = destino.top + 'px';
      clon.style.width = destino.width + 'px'; clon.style.height = destino.height + 'px';
      var vw = window.innerWidth, vh = window.innerHeight;
      k = limitar(Math.min(vw * 0.74 / destino.width, vh * 0.42 / destino.height), 1, 1.45);
      desde.x = (vw - destino.width * k) / 2 - destino.left;
      desde.y = (vh - destino.height * k) / 2 - destino.top - vh * 0.03;
    }
    medir();
    var vuelo = { p: 0 };
    function colocar() {
      var p = vuelo.p, e = k + (1 - k) * p;
      clon.style.transform = 'translate(' + (desde.x * (1 - p)).toFixed(2) + 'px,' + (desde.y * (1 - p)).toFixed(2) + 'px) scale(' + e.toFixed(4) + ')';
    }
    colocar();
    window.addEventListener('resize', function () { if (!hecho) { medir(); colocar(); } });

    /* estado de salida: listones fuera de la pantalla, panel cerrado por la línea central, logo sin pintar */
    var vw = window.innerWidth, vh = window.innerHeight;
    var r0 = { l: destino.left + desde.x, t: destino.top + desde.y, w: destino.width * k, h: destino.height * k };
    gsap.set(lst[0], { x: -(r0.l + r0.w + 60) / k });
    gsap.set(lst[1], { y: -(r0.t + r0.h + 60) / k });
    gsap.set(lst[2], { x: (vw - r0.l + 60) / k });
    gsap.set(lst[3], { y: (vh - r0.t + 60) / k });
    /* el clip-path se lleva con un número: el navegador devuelve «inset(50% 0px 50%)» con tres
       valores y GSAP, al interpolar contra cuatro, abría solo la mitad de abajo */
    var apertura = { v: 50 };
    function abrirPanel() { fondo.style.clipPath = 'inset(' + apertura.v.toFixed(2) + '% 0% ' + apertura.v.toFixed(2) + '% 0%)'; }
    abrirPanel();
    gsap.set(sombra, { opacity: 0 });
    gsap.set(letras, { opacity: 0, x: -9, y: 9 });
    var centroAp = 0;
    aps.forEach(function (u) { var b = u.getBBox(); centroAp += b.x + b.width / 2; });
    centroAp /= aps.length || 1;
    aps.forEach(function (u) { var b = u.getBBox(); gsap.set(u, { x: (b.x + b.width / 2 - centroAp) * 0.55, opacity: 0 }); });

    var T_AP = 2.2;
    var tl = gsap.timeline({ paused: true, onComplete: retirar });
    API.cortina = { get tl() { return tl; }, get apertura() { return apertura.v; } };

    /* 1 · los cuatro listones entran desde los bordes de la pantalla y se cruzan: expo.out y el clac */
    lst.forEach(function (el, i) { tl.to(el, { x: 0, y: 0, duration: 0.86, ease: 'expo.out' }, 0.05 + i * 0.14); });
    tl.to(lst[0], { y: -2, duration: 0.06, ease: 'power2.out' }, 1.18)
      .to(lst[1], { x: 2, duration: 0.06, ease: 'power2.out' }, 1.18)
      .to(lst[2], { y: 2, duration: 0.06, ease: 'power2.out' }, 1.18)
      .to(lst[3], { x: -2, duration: 0.06, ease: 'power2.out' }, 1.18)
      .to(lst, { x: 0, y: 0, duration: 0.22, ease: 'power3.out' }, 1.24);
    /* 2 · la cal se abre dentro del marco desde la línea central */
    tl.to(apertura, { v: 0, duration: 0.45, ease: 'power3.inOut', onUpdate: abrirPanel }, 0.86);
    /* 3 · primero la sombra gris sola, como un contorno vacío… */
    tl.to(sombra, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 1.18);
    /* …luego las letras de bronce caen encima desplazadas (−9, 9) y se colocan: nace el relieve */
    tl.to(letras, { opacity: 1, duration: 0.18, ease: 'none' }, 1.5)
      .to(letras, { x: 0, y: 0, duration: 0.5, ease: 'power3.out' }, 1.62);
    /* «APARTAMENTOS» asienta su espaciado */
    tl.to(aps, { x: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.012 }, 1.5);
    tl.to(lugar, { opacity: 1, letterSpacing: '.32em', duration: 0.8, ease: 'expo.out' }, 1.4);

    /* 4 · traspaso: la capa se levanta con borde curvo y paralaje interno mientras la placa vuela al hero */
    tl.call(function () { medir(); }, null, T_AP - 0.01)
      .call(avisarApertura, null, T_AP)
      .to(lugar, { opacity: 0, duration: 0.3, ease: 'power1.out' }, T_AP)
      .to(capa, { yPercent: -100, duration: 1.0, ease: 'expo.inOut' }, T_AP)
      .to(interior, { yPercent: -16, duration: 1.0, ease: 'expo.inOut' }, T_AP)
      .to(borde, { attr: { d: 'M0 0H100Q50 0 0 0Z' }, duration: 1.0, ease: 'expo.inOut' }, T_AP)
      .to(vuelo, { p: 1, duration: 1.0, ease: 'expo.inOut', onUpdate: colocar, onComplete: aterrizar }, T_AP);

    gsap.set(lugar, { opacity: 0, letterSpacing: '.6em' });

    function aterrizar() {
      /* medida para verificar.mjs: el clon tiene que acabar encima del panel real */
      var a = clon.getBoundingClientRect(), b = heroPlaca.getBoundingClientRect();
      API.aterrizaje = { dx: Math.abs(a.left - b.left), dy: Math.abs(a.top - b.top), dw: Math.abs(a.width - b.width) };
      heroPlaca.classList.remove('es-esperando');
      clon.style.opacity = '0';
    }

    /* arranca enseguida: el logo es SVG y no espera a la letra (como mucho 450 ms) */
    var arrancada = false;
    function arrancar() { if (!arrancada) { arrancada = true; medir(); colocar(); tl.play(); } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(arrancar);
    setTimeout(arrancar, 450);

    /* quien empieza a bajar no espera: la cortina acelera, no se corta */
    function prisa() { if (!hecho) tl.timeScale(3); }
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, prisa, { passive: true, once: true }); });

    /* red de seguridad: pase lo que pase, a los 6 s la cortina se va */
    setTimeout(function () { if (!hecho) { aterrizar(); retirar(); } }, 6000);
  })();

  /* ═══════════════ hero: fotos en fundido, paralaje y la sombra viva ═══════════════ */
  (function hero() {
    var seccion = $('#inicio');
    if (!seccion) return;
    var fotos = todos('.hero__img', seccion);
    var pie = $('#hero-pie'), cuenta = $('#hero-cuenta'), verif = $('#hero-pie-verificar');
    var marco = $('#hero-marco');
    /* [ELEGIR HERO] el carrusel solo trabaja si es la versión que se ve (?hero=carrusel) */
    var carrusel = html.classList.contains('hero-carrusel');
    var actual = 0, temporizador = null, encima = false;
    function mostrar(i) {
      actual = (i + fotos.length) % fotos.length;
      fotos.forEach(function (f, k) { f.classList.toggle('es-activa', k === actual); });
      pie.textContent = fotos[actual].getAttribute('data-pie') || '';
      if (verif) verif.hidden = !fotos[actual].hasAttribute('data-verificar');
      cuenta.textContent = dos(actual + 1) + ' / ' + dos(fotos.length);
    }
    function programar() {
      clearTimeout(temporizador);
      if (reduce) return;                       /* con movimiento reducido, quieta en la primera */
      temporizador = setTimeout(function () { if (!encima && !document.hidden) mostrar(actual + 1); programar(); }, 5200);
    }
    marco.addEventListener('pointerenter', function () { encima = true; });
    marco.addEventListener('pointerleave', function () { encima = false; });
    mostrar(0);
    if (carrusel) alAbrirse(programar);
    API.hero = { mostrar: mostrar, get actual() { return actual; }, carrusel: carrusel };

    if (!movimiento) return;
    var resto = todos('.hero__entrada, .hero__acciones > *, .hero__notas', seccion);
    var nav = todos('.cabecera__nav > a');
    var fotosCaja = $('#hero-fotos');
    gsap.set(resto, { opacity: 0, y: 18 });
    if (!esMovil()) gsap.set(nav, { opacity: 0, y: -10 });
    alAbrirse(function () {
      gsap.to(resto, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.7 });
      gsap.to(nav, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.5, clearProps: 'transform,translate,opacity' });
    });
    if (!carrusel) return;
    prepararListones(marco);
    gsap.set(fotosCaja, { scale: 1.1 });
    alAbrirse(function () {
      montarListones(marco, 0.25);
      gsap.to(fotosCaja, { scale: 1, duration: 2.2, ease: 'expo.out', delay: 0.4 });
    });
    /* paralaje suave dentro del marco */
    gsap.fromTo(fotosCaja, { yPercent: -4 }, {
      yPercent: 4, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: seccion, start: 'top top', end: 'bottom top', scrub: true }
    });
  })();

  /* [ELEGIR HERO] la versión de los tres marcos: sus listones se montan uno detrás de otro al
     abrirse la cortina y cada marco tiene su paralaje (profundidades distintas) */
  (function heroMarcos() {
    var caja = $('#hero-marcos');
    if (!caja || html.classList.contains('hero-carrusel')) return;
    var detalles = todos('.detalle', caja);
    var marcosD = detalles.map(function (d) { return d.querySelector('.marco'); });
    if (!movimiento) return;
    marcosD.forEach(prepararListones);
    var fotos = detalles.map(function (d) { return d.querySelector('.marco__ventana'); });
    gsap.set(fotos, { opacity: 0, scale: 1.08 });
    alAbrirse(function () {
      marcosD.forEach(function (m, i) { montarListones(m, 0.3 + i * 0.32); });
      gsap.to(fotos, { opacity: 1, scale: 1, duration: 1.6, ease: 'expo.out', stagger: 0.32, delay: 0.55, clearProps: 'transform' });
    });
    [-46, 34, -18].forEach(function (y, i) {
      gsap.fromTo(detalles[i], { y: 0 }, { y: y, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
    });
  })();

  /* la sombra viva: la capa #sombra se desplaza al contrario que el puntero, como si la luz
     fuera tuya (hasta ±9 unidades del viewBox). Solo con pointer:fine y movimiento. */
  (function sombraViva() {
    var hero = $('#inicio'), sombra = $('#sombra'), logo = $('#logo-hero');
    if (!hero || !sombra || !movimiento || !punteroFino) return;
    var qx = gsap.quickTo(sombra, 'x', { duration: 0.75, ease: 'power3.out' });
    var qy = gsap.quickTo(sombra, 'y', { duration: 0.75, ease: 'power3.out' });
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (densidad() !== 'listones' || !cortinaAbierta) return;
      var r = hero.getBoundingClientRect(), l = logo.getBoundingClientRect();
      var nx = limitar((e.clientX - (l.left + l.width / 2)) / (r.width * 0.5), -1, 1);
      var ny = limitar((e.clientY - (l.top + l.height / 2)) / (r.height * 0.5), -1, 1);
      qx(-nx * 9); qy(-ny * 9);
    });
    hero.addEventListener('pointerleave', function () { qx(0); qy(0); });
    document.addEventListener('densidad-cambiada', function () { qx(0); qy(0); });
  })();

  /* ───────────────── cifras que cuentan al entrar ───────────────── */
  function formatear(v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); }
  function contar(el) {
    var fin = parseFloat(el.getAttribute('data-contar'));
    var dec = parseInt(el.getAttribute('data-decimales') || '0', 10);
    if (!movimiento) { el.textContent = formatear(fin, dec); return; }
    var t0 = null, dur = 1500;
    (function paso(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = formatear(fin * (1 - Math.pow(1 - k, 4)), dec);
      if (k < 1) requestAnimationFrame(paso);
    })(performance.now());
  }
  API.contar = contar;
  var cifras = todos('[data-contar]');
  if (movimiento) cifras.forEach(function (el) { el.textContent = formatear(0, parseInt(el.getAttribute('data-decimales') || '0', 10)); });
  alEntrar(cifras, contar, '0px 0px -8% 0px');

  /* ═══════════════ el diálogo de un apartamento: el marco crece (FLIP) ═══════════════ */
  var dialogo = (function () {
    var dlg = $('#dialogo');
    if (!dlg || typeof dlg.showModal !== 'function') return null;
    var marco = $('#dialogo-marco'), vuelo = $('#dialogo-vuelo');
    var figura = $('#dialogo-figura'), cuenta = $('#dialogo-cuenta'), minis = $('#dialogo-minis');
    var lista = [], i = 0, origen = null, ap = null, fotos = {}, cerrando = false, abierto = false;

    /* La foto nueva entra con un fundido ENCIMA de la anterior (que se queda debajo hasta el final):
       sin hueco en blanco entre una y otra. Se espera a decode() para no fundir una imagen a medio
       cargar. Si se pasan fotos deprisa, cada una corta a la anterior (turno) y la última limpia. */
    var turno = 0;
    function pintar() {
      var f = fotos[lista[i]], t = ++turno;
      var nueva = f ? picture(f, '(max-width: 900px) 100vw, 70vw', 'eager') : null;
      if (!nueva || !figura.firstElementChild || !movimiento || !abierto) {
        figura.textContent = '';
        if (nueva) figura.appendChild(nueva);
      } else {
        nueva.className = 'dialogo__nueva';
        gsap.set(nueva, { opacity: 0 });
        figura.appendChild(nueva);
        var img = nueva.querySelector('img');
        var decodificada = img && img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        decodificada.then(function () {
          if (t !== turno) { if (nueva.parentNode) nueva.parentNode.removeChild(nueva); return; }
          gsap.to(nueva, { opacity: 1, duration: 0.22, ease: 'power2.out', onComplete: function () {
            if (t !== turno) return;
            while (figura.firstElementChild && figura.firstElementChild !== nueva) figura.removeChild(figura.firstElementChild);
            nueva.className = '';
            gsap.set(nueva, { clearProps: 'opacity' });
          } });
        });
      }
      cuenta.textContent = 'Foto ' + (i + 1) + ' de ' + lista.length;
      todos('button', minis).forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      var activa = minis.children[i];
      if (activa && activa.scrollIntoView && abierto) activa.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function ir(d) { if (!lista.length) return; i = (i + d + lista.length) % lista.length; pintar(); }
    function lineas(ul, items) {
      ul.textContent = '';
      items.forEach(function (x) {
        var li = crear('li');
        li.appendChild(document.createTextNode(typeof x === 'string' ? x : x.texto));
        if (x && x.verificar) {
          var v = crear('span', 'verificar', '[VERIFICAR]'); v.hidden = true; v.title = x.verificar;
          li.appendChild(document.createTextNode(' ')); li.appendChild(v);
        }
        ul.appendChild(li);
      });
    }
    function rectMarco(boton) {
      var m = boton && boton.querySelector('.piso__marco');
      return m ? m.getBoundingClientRect() : null;
    }

    function abrir(apto, boton, comunes) {
      return promesaFotos.then(function (m) {
        fotos = m; ap = apto; origen = boton || document.activeElement;
        lista = apto.fotos.filter(function (id) { return m[id]; });
        i = 0;
        var titulo = $('#dialogo-titulo');
        titulo.textContent = '';
        titulo.appendChild(nroHTML(apto.numero));
        var m2 = crear('span', 'piso__m2', ' · ' + apto.m2 + ' ');
        m2.appendChild(crear('small', null, 'm²'));
        titulo.appendChild(m2);
        /* Se reserva en Octorate: el nombre que hay que reconocer es el de su motor, no el de Booking */
        $('#dialogo-booking').textContent = apto.nombre_reserva ? 'Al reservar: «' + apto.nombre_reserva + '»' : 'En Booking: «' + apto.nombre_booking + '»';
        lineas($('#dialogo-camas'), apto.camas);
        lineas($('#dialogo-extras'), apto.extras);
        $('#dialogo-comunes').textContent = (comunes || []).join(' · ') + '.';
        minis.textContent = '';
        lista.forEach(function (id, k) {
          var li = crear('li');
          var b = crear('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Foto ' + (k + 1) + ': ' + m[id].alt);
          b.appendChild(picture(m[id], '64px', 'lazy', ''));
          b.addEventListener('click', function () { i = k; pintar(); });
          li.appendChild(b); minis.appendChild(li);
        });
        pintar();
        abierto = true;
        dlg.showModal();
        if (lenis) lenis.stop();
        var conMarco = movimiento && densidad() === 'listones';
        var r0 = rectMarco(origen);
        if (conMarco && r0) {
          /* FLIP: el marco de la tarjeta crece hasta llenar la pantalla; sus cuatro listones son ya los del diálogo */
          var r1 = marco.getBoundingClientRect();
          vuelo.textContent = '';
          vuelo.appendChild(picture(m[lista[0]], '(max-width: 900px) 100vw, 70vw', 'eager', ''));
          dlg.classList.add('es-moviendo');
          gsap.set(vuelo, { opacity: 1 });
          gsap.fromTo(dlg, { backgroundColor: 'rgba(26,17,13,0)' }, { backgroundColor: 'rgba(26,17,13,.9)', duration: 0.5, ease: 'power2.out' });
          gsap.fromTo(marco, { left: r0.left, top: r0.top, width: r0.width, height: r0.height }, {
            left: r1.left, top: r1.top, width: r1.width, height: r1.height, duration: 0.78, ease: 'expo.inOut',
            onComplete: function () {
              gsap.set(marco, { clearProps: 'left,top,width,height' });
              dlg.classList.remove('es-moviendo');
              gsap.to(vuelo, { opacity: 0, duration: 0.35, ease: 'power1.out' });
            }
          });
        } else if (movimiento) {
          /* versión sobria: un fundido */
          gsap.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out', clearProps: 'opacity' });
        }
        $('#dialogo-sig').focus({ preventScroll: true });
        API.dialogoAbierto = apto.numero;
      });
    }

    function terminar() {
      dlg.close();
      dlg.classList.remove('es-moviendo');
      gsap && gsap.set && gsapReady && gsap.set([marco, dlg, vuelo], { clearProps: 'left,top,width,height,opacity,backgroundColor' });
      cerrando = false; abierto = false;
      if (lenis) lenis.start();
      if (origen && origen.focus) origen.focus({ preventScroll: true });
      API.dialogoAbierto = null;
    }
    function cerrar(rapido) {
      if (!dlg.open || cerrando) return;
      cerrando = true;
      var r0 = rectMarco(origen);
      if (!rapido && movimiento && densidad() === 'listones' && r0 && r0.bottom > 0 && r0.top < window.innerHeight) {
        var r1 = marco.getBoundingClientRect();
        vuelo.textContent = '';
        var f = fotos[lista[0]];
        if (f) vuelo.appendChild(picture(f, '(max-width: 900px) 100vw, 70vw', 'eager', ''));
        dlg.classList.add('es-moviendo');
        gsap.set(vuelo, { opacity: 1 });
        gsap.to(dlg, { backgroundColor: 'rgba(26,17,13,0)', duration: 0.6, ease: 'power2.in' });
        gsap.fromTo(marco, { left: r1.left, top: r1.top, width: r1.width, height: r1.height }, {
          left: r0.left, top: r0.top, width: r0.width, height: r0.height, duration: 0.62, ease: 'expo.inOut', onComplete: terminar
        });
      } else if (!rapido && movimiento) {
        gsap.to(dlg, { opacity: 0, duration: 0.25, ease: 'power1.in', onComplete: terminar });
      } else {
        terminar();
      }
    }
    $('#dialogo-ant').addEventListener('click', function () { ir(-1); });
    $('#dialogo-sig').addEventListener('click', function () { ir(1); });
    $('#dialogo-cerrar').addEventListener('click', function () { cerrar(); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });          /* Escape */
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) cerrar(); });
    $('#dialogo-fechas').addEventListener('click', function () {
      var url = urlReserva(ap);
      if (url) { window.open(url, '_blank', 'noopener'); return; }
      var n = ap && ap.numero;
      cerrar(true);
      elegirApartamento(n);
    });
    /* deslizar con el dedo: la foto sigue al dedo y, al soltar, pasa (más de 40 px, o un gesto rápido
       aunque sea corto) o vuelve a su sitio. Con ratón solo cuenta el gesto: arrastrar una foto con el
       ratón no es lo que nadie espera. La galería da la vuelta, así que no hay bordes que frenar. */
    var x0 = null, t0 = 0, arrastrada = null;
    figura.addEventListener('pointerdown', function (e) {
      x0 = e.clientX; t0 = Date.now();
      arrastrada = movimiento && e.pointerType !== 'mouse' ? figura.lastElementChild : null;
      if (arrastrada) gsap.killTweensOf(arrastrada, 'x');
    });
    figura.addEventListener('pointermove', function (e) {
      if (x0 === null || !arrastrada) return;
      var dx = e.clientX - x0;
      gsap.set(arrastrada, { x: lista.length > 1 ? dx : dx * 0.25 });   /* con una sola foto, cede pero no pasa */
    });
    function soltar(e, cancelado) {
      if (x0 === null) return;
      var dx = cancelado ? 0 : e.clientX - x0;
      var rapido = Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.3;   /* px/ms: un golpe de dedo, no un arrastre lento */
      var pasa = lista.length > 1 && (Math.abs(dx) > 40 || (rapido && Math.abs(dx) > 15));
      var el = arrastrada; x0 = null; arrastrada = null;
      if (pasa) {
        if (el) gsap.to(el, { x: dx < 0 ? '-=60' : '+=60', duration: 0.25, ease: 'power2.out' });   /* la que se va sigue su camino bajo la nueva */
        ir(dx < 0 ? 1 : -1);
      } else if (el) {
        gsap.to(el, { x: 0, duration: 0.25, ease: 'power2.out', clearProps: 'x' });
      }
    }
    figura.addEventListener('pointerup', function (e) { soltar(e, false); });
    figura.addEventListener('pointercancel', function (e) { soltar(e, true); });
    var api = { abrir: abrir, cerrar: cerrar, get indice() { return i; }, get lista() { return lista.slice(); } };
    API.dialogo = api;
    return api;
  })();

  function nroHTML(n) {
    var s = crear('span', 'nro');
    var vis = crear('span'); vis.setAttribute('aria-hidden', 'true');
    vis.appendChild(document.createTextNode('N'));
    vis.appendChild(crear('span', 'o', 'o'));
    s.appendChild(vis);
    s.appendChild(crear('span', 'visualmente-oculto', 'Número'));
    s.appendChild(document.createTextNode(' ' + n));
    return s;
  }
  function textoExtra(x) { return typeof x === 'string' ? x : x.texto; }
  /* El motor de Octorate abre el calendario de un solo apartamento con &room=: quien ya ha elegido
     no tiene que volver a buscarlo entre los cinco. Sin motor (null), cada botón sigue a su formulario. */
  function urlReserva(ap) {
    var url = String(CONFIG.reservas || '');
    if (!/^https:\/\//i.test(url)) return null;
    var room = ap && String(ap.octorate_room || '');
    return /^\d+$/.test(room) ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'room=' + room : url;
  }

  /* ═══════════════ los apartamentos, pintados desde data/apartamentos.json ═══════════════ */
  function elegirApartamento(n) {
    var sel = $('#apartamento');
    if (sel && n != null) sel.value = String(n);
    irA('#fechas');
    setTimeout(function () { if (sel) sel.focus({ preventScroll: true }); }, lenis ? 1600 : 50);
  }
  API.elegirApartamento = elegirApartamento;

  (function pisos() {
    var lista = $('#pisos-lista'), sinjs = $('#pisos-sinjs');
    if (!lista) return;
    Promise.all([promesaPisos, promesaFotos]).then(function (res) {
      var datos = res[0], fotos = res[1];
      var aps = datos.apartamentos.slice().sort(function (a, b) { return a.numero - b.numero; });
      lista.textContent = '';
      var marcos = [];
      aps.forEach(function (ap) {
        var li = crear('li', 'piso');
        var b = crear('button', 'piso__boton');
        b.type = 'button';
        b.setAttribute('aria-haspopup', 'dialog');
        b.setAttribute('data-numero', ap.numero);
        b.setAttribute('aria-label', 'Apartamento número ' + ap.numero + ', ' + ap.m2 + ' metros: ver sus ' + ap.fotos.length + ' fotos y detalles');
        var m = crear('span', 'marco piso__marco');
        m.innerHTML = '<span class="listones" aria-hidden="true"><i class="t"></i><i class="r"></i><i class="b"></i><i class="l"></i></span>';
        var v = crear('span', 'marco__ventana');
        var f = fotos[ap.fotos[0]];
        if (f) v.appendChild(picture(f, '(max-width: 640px) calc(100vw - 32px), (max-width: 1180px) 46vw, 300px', 'lazy'));
        m.appendChild(v);
        var cab = crear('span', 'piso__cabeza');
        cab.appendChild(nroHTML(ap.numero));
        cab.appendChild(crear('span', 'piso__punto', '·'));
        var m2 = crear('span', 'piso__m2', ap.m2 + ' ');
        m2.appendChild(crear('small', null, 'm²'));
        cab.appendChild(m2);
        b.appendChild(m);
        b.appendChild(cab);
        b.appendChild(crear('span', 'piso__camas', ap.camas_resumen || ap.camas.join(' · ')));
        b.appendChild(crear('span', 'piso__extras', ap.extras.slice(0, 3).map(textoExtra).join(' · ')));
        b.appendChild(crear('span', 'piso__ver', 'Ver fotos y detalles'));
        b.addEventListener('click', function () { if (dialogo) dialogo.abrir(ap, b, datos.comunes); });
        li.appendChild(b);
        lista.appendChild(li);
        marcos.push(m);
      });
      sinjs.hidden = true;
      vigilarListones(marcos);

      /* el formulario: un apartamento por entrada, más «Me da igual» */
      var sel = $('#apartamento');
      if (sel) {
        todos('option', sel).forEach(function (o) { if (o.value) o.remove(); });
        aps.forEach(function (ap) { var o = crear('option', null, 'Nº ' + ap.numero + ' · ' + ap.m2 + ' m² · ' + (ap.camas_resumen || '')); o.value = String(ap.numero); sel.appendChild(o); });
      }

      /* «La casa»: el número de apartamentos y los m² salen del JSON, nunca escritos a mano */
      var n = aps.length, min = Math.min.apply(null, aps.map(function (a) { return a.m2; })), max = Math.max.apply(null, aps.map(function (a) { return a.m2; }));
      var cifraN = $('#cifra-pisos-n');
      if (cifraN) { cifraN.setAttribute('data-contar', n); cifraN.textContent = movimiento ? '0' : String(n); $('#cifra-pisos').hidden = false; alEntrar(cifraN, contar); }
      var cMin = $('#cifra-m2-min'), cMax = $('#cifra-m2-max');
      if (cMin) { cMin.setAttribute('data-contar', min); if (!movimiento) cMin.textContent = min; }
      if (cMax) { cMax.setAttribute('data-contar', max); if (!movimiento) cMax.textContent = max; }

      /* la tabla comparativa (versión sobria) */
      var cuerpo = $('#comparativa-tabla tbody');
      if (cuerpo) {
        cuerpo.textContent = '';
        aps.forEach(function (ap) {
          var tr = crear('tr');
          var th = crear('th'); th.scope = 'row'; th.appendChild(nroHTML(ap.numero)); tr.appendChild(th);
          var td = function (txt, cls) { var c = crear('td', cls, txt); tr.appendChild(c); return c; };
          td(String(ap.m2), 'cifra-tabla');
          td(ap.dormitorios === 0 ? 'Planta abierta' : String(ap.dormitorios));
          td(ap.camas.join(' · '));
          td(ap.terraza ? 'Sí' : 'No');
          td(ap.balcon ? 'Sí' : 'No');
          td(ap.lavadora ? 'Sí' : 'No');
          var c = td('');
          var bt = crear('button', 'boton boton--linea', 'Consultar fechas');
          bt.type = 'button';
          bt.setAttribute('aria-label', 'Consultar fechas para el apartamento ' + ap.numero);
          bt.addEventListener('click', function () {
            var url = urlReserva(ap);
            if (url) window.open(url, '_blank', 'noopener'); else elegirApartamento(ap.numero);
          });
          c.appendChild(bt);
          cuerpo.appendChild(tr);
        });
      }
      API.pisos = { datos: datos, total: n };
      document.dispatchEvent(new CustomEvent('pisos-cargados', { detail: datos }));
      setTimeout(refrescar, 80);
    }).catch(function () {
      /* sin JSON (abierta con doble clic, sin servidor): queda el aviso con Booking y el teléfono */
      sinjs.hidden = false;
    });
  })();

  /* ───────────────── la cinta de detalles: dos filas en sentidos opuestos ───────────────── */
  (function cinta() {
    var filas = todos('.cinta__fila');
    var seccion = $('#cinta');
    if (!filas.length) return;
    filas.forEach(function (fila) {
      var pista = fila.querySelector('.cinta__pista');
      var originales = todos(':scope > li', pista);
      var anchoGrupo = pista.scrollWidth || 1000;
      var copias = Math.max(1, Math.ceil((window.innerWidth * 2) / anchoGrupo));
      for (var c = 0; c < copias; c++) {
        originales.forEach(function (li) {
          var x = li.cloneNode(true);
          x.setAttribute('aria-hidden', 'true');
          todos('img', x).forEach(function (im) { im.alt = ''; });
          pista.appendChild(x);
        });
      }
      fila._ancho = function () {
        var gap = parseFloat(getComputedStyle(pista).columnGap) || 0;
        return originales.reduce(function (a, li) { return a + li.offsetWidth; }, 0) + originales.length * gap;
      };
    });
    if (!movimiento) return;                        /* con movimiento reducido, quieta */
    /* los listones de la cinta, originales y copias, se montan todos a la vez cuando entra su fila */
    filas.forEach(function (fila) {
      var marcos = todos('.marco', fila);
      marcos.forEach(prepararListones);
      alEntrar(fila, function () { marcos.forEach(function (m, i) { montarListones(m, 0.08 * (i % 4)); }); });
    });
    var extra = 0, visible = true, encima = false;
    if (lenis) lenis.on('scroll', function (e) { extra = Math.min(Math.abs(e.velocity || 0) * 0.25, 7); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(seccion);
    seccion.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') encima = true; });
    seccion.addEventListener('pointerleave', function () { encima = false; });
    var pos = filas.map(function (f) { return f.getAttribute('data-sentido') === '-1' ? -f._ancho() : 0; });
    /* rAF propio: ningún tween de GSAP toca esta propiedad */
    (function paso() {
      if (visible && !encima && densidad() === 'listones') {
        filas.forEach(function (f, i) {
          var ancho = f._ancho(), s = parseFloat(f.getAttribute('data-sentido'));
          pos[i] -= s * (0.42 + extra);
          if (pos[i] <= -ancho) pos[i] += ancho;
          if (pos[i] > 0) pos[i] -= ancho;
          f.firstElementChild.style.transform = 'translate3d(' + pos[i].toFixed(2) + 'px,0,0)';
        });
        extra *= 0.94;
      }
      requestAnimationFrame(paso);
    })();
    API.cinta = { get parada() { return encima; } };
  })();

  /* ═══════════════ Badajoz a pie: el radar, desde data/alrededor.json ═══════════════
     La POSICIÓN usa el rumbo y la distancia en línea recta (la geometría real);
     la ETIQUETA y la lista, la distancia a pie. Norte arriba, anillos cada 100 m. */
  (function radar() {
    var svg = $('#radar'), gA = $('#radar-anillos'), gP = $('#radar-puntos'), barrido = $('#radar-barrido');
    var listaEl = $('#radar-lista');
    if (!svg || !window.fetch) return;
    var NS = 'http://www.w3.org/2000/svg';
    var C = 300, R700 = 262, K = R700 / 700;
    function el(tag, attrs, padre) {
      var e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (padre) padre.appendChild(e);
      return e;
    }
    var anillos = [];
    for (var m = 100; m <= 700; m += 100) {
      var r = m * K;
      anillos.push(el('circle', { class: 'anillo' + (m % 200 ? ' anillo--punteado' : ''), cx: C, cy: C, r: r.toFixed(1) }, gA));
      if (m % 200 === 0) {
        /* las cifras van al suroeste (240º), donde no cae ningún sitio */
        var a = 240 * Math.PI / 180;
        var t = el('text', { class: 'cifra', x: (C + r * Math.sin(a) - 4).toFixed(1), y: (C - r * Math.cos(a) + 4).toFixed(1), 'text-anchor': 'end' }, gA);
        t.textContent = m + ' m';
      }
    }
    var sitios = [], puntos = {}, filas = {}, modoMovil = null;
    function etiqueta(s) { return s.a_pie_m ? s.a_pie_m + ' m' : s.recta_m + ' m'; }
    function pintarPuntos() {
      modoMovil = esMovil();
      gP.textContent = '';
      sitios.forEach(function (s) {
        var ang = s.rumbo * Math.PI / 180, rr = s.recta_m * K;
        var x = C + rr * Math.sin(ang), y = C - rr * Math.cos(ang);
        var g = el('g', { class: 'punto', 'data-clave': s.clave, 'data-rumbo': s.rumbo }, gP);
        el('circle', { class: 'punto__halo', cx: x.toFixed(1), cy: y.toFixed(1), r: 13 }, g);
        el('circle', { class: 'punto__p', cx: x.toFixed(1), cy: y.toFixed(1), r: 5 }, g);
        var conf = modoMovil && s.movil ? s.movil : s;
        var lado = conf.lado || 'r', dy = conf.dy || 0;
        var sep = modoMovil ? 12 : 10;
        var tx = lado === 'c' ? x : (lado === 'r' ? x + sep : x - sep);
        var ty = y + (lado === 'c' ? 0 : (modoMovil ? 7 : 4.5)) + dy;
        var t = el('text', { x: tx.toFixed(1), y: ty.toFixed(1), 'text-anchor': lado === 'c' ? 'middle' : (lado === 'r' ? 'start' : 'end') }, g);
        t.appendChild(document.createTextNode(modoMovil ? (s.corto || s.nombre) : s.nombre));
        if (!modoMovil) { var ts = el('tspan', { class: 'punto__m', dx: 5 }, t); ts.textContent = etiqueta(s); }
        g.addEventListener('pointerenter', function () { activar(s.clave, true); });
        g.addEventListener('pointerleave', function () { activar(s.clave, false); });
        puntos[s.clave] = g;
        if (svg.classList.contains('es-hecho') || encendidos[s.clave]) g.classList.add('es-encendido');
      });
    }
    function activar(clave, si) {
      if (puntos[clave]) puntos[clave].classList.toggle('es-activa', si);
      if (filas[clave]) filas[clave].classList.toggle('es-activa', si);
    }
    var encendidos = {};
    function encender(clave, conPulso) {
      if (encendidos[clave]) return;
      encendidos[clave] = true;
      var g = puntos[clave];
      if (!g) return;
      g.classList.add('es-encendido');
      if (conPulso) { g.classList.add('es-recien'); setTimeout(function () { g.classList.remove('es-recien'); }, 950); }
    }
    function encenderTodo() {
      sitios.forEach(function (s) { encender(s.clave, false); });
      svg.classList.add('es-hecho');
      svg.classList.remove('es-barriendo');
    }
    function barrer() {
      if (!movimiento || densidad() !== 'listones') { encenderTodo(); return; }
      /* los anillos se abren como una onda… */
      gsap.set(anillos, { svgOrigin: C + ' ' + C, scale: 0, opacity: 0 });   /* svgOrigin: el origen es el centro del viewBox, no del bbox */
      gsap.to(anillos, { scale: 1, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.09 });
      /* …y una sola vuelta del barrido enciende cada sitio al pasar por su rumbo */
      var estado = { a: 0 };
      svg.classList.add('es-barriendo');
      gsap.to(estado, {
        a: 360, duration: 2.6, ease: 'power1.inOut', delay: 0.8,
        onUpdate: function () {
          barrido.setAttribute('transform', 'rotate(' + estado.a.toFixed(2) + ' ' + C + ' ' + C + ')');
          sitios.forEach(function (s) { if (s.rumbo <= estado.a) encender(s.clave, true); });
          API.radarAngulo = estado.a;
        },
        onComplete: encenderTodo
      });
    }
    cargarJSON('data/alrededor.json').then(function (d) {
      sitios = d.sitios;
      pintarPuntos();
      /* la lista, ordenada por distancia a pie */
      var orden = sitios.slice().sort(function (a, b) { return (a.a_pie_m || a.recta_m) - (b.a_pie_m || b.recta_m); });
      listaEl.textContent = '';
      orden.forEach(function (s) {
        var li = crear('li');
        li.setAttribute('data-clave', s.clave);
        li.appendChild(crear('span', 'radar-lista__nombre', s.nombre));
        var m = s.a_pie_m ? s.a_pie_m + ' m · ' + s.minutos + ' min a pie' : s.recta_m + ' m en línea recta';
        li.appendChild(crear('span', 'radar-lista__m', m));
        li.addEventListener('pointerenter', function () { activar(s.clave, true); });
        li.addEventListener('pointerleave', function () { activar(s.clave, false); });
        listaEl.appendChild(li);
        filas[s.clave] = li;
      });
      API.radar = { sitios: sitios, encenderTodo: encenderTodo };
      /* sin movimiento (o en la versión sobria) el radar está encendido desde el principio, sin esperar a verlo */
      if (!movimiento || densidad() === 'sobria') encenderTodo();
      else alEntrar(svg, barrer, '0px 0px -15% 0px');
      window.addEventListener('resize', esperar(function () { if (esMovil() !== modoMovil) pintarPuntos(); }, 200));
      document.addEventListener('densidad-cambiada', function () { if (densidad() === 'sobria') encenderTodo(); });
      setTimeout(refrescar, 60);
    }).catch(function () { encenderTodo(); });
  })();

  /* ═══════════════ opiniones: categorías como listones y una cita cada vez ═══════════════ */
  (function opiniones() {
    var cats = $('#categorias');
    if (cats) {
      todos('li', cats).forEach(function (li, i) { li.style.setProperty('--i', i); });
      alEntrar(cats, function () { cats.classList.add('es-visto'); });
    }
    var carr = $('#carrusel');
    if (!carr) return;
    var pista = $('#carrusel-pista'), citas = todos('.cita', carr), cuenta = $('#carrusel-cuenta'), pausa = $('#carrusel-pausa');
    var i = 0, auto = !reduce, encima = false, dentro = false, t = null, empezado = false;
    function mostrar(k, delUsuario) {
      i = (k + citas.length) % citas.length;
      citas.forEach(function (c, n) { c.classList.toggle('es-activa', n === i); });
      cuenta.textContent = (i + 1) + ' / ' + citas.length;
      /* patrón de carrusel accesible: mientras pasa sola no se anuncia; cuando la mueves tú, sí */
      pista.setAttribute('aria-live', auto && !delUsuario ? 'off' : 'polite');
    }
    function parar() {
      auto = false; clearTimeout(t);
      pausa.setAttribute('aria-pressed', 'true'); pausa.textContent = 'Reanudar';
      pista.setAttribute('aria-live', 'polite');
    }
    function programar() {
      clearTimeout(t);
      if (!auto) return;
      t = setTimeout(function () { if (!encima && !dentro && !document.hidden) mostrar(i + 1); programar(); }, 6800);
    }
    $('#carrusel-sig').addEventListener('click', function () { parar(); mostrar(i + 1, true); });
    $('#carrusel-ant').addEventListener('click', function () { parar(); mostrar(i - 1, true); });
    pista.addEventListener('click', function () { parar(); mostrar(i + 1, true); });
    pausa.addEventListener('click', function () {
      if (auto) { parar(); return; }
      auto = true; pausa.setAttribute('aria-pressed', 'false'); pausa.textContent = 'Pausar';
      pista.setAttribute('aria-live', 'off');
      programar();
    });
    carr.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); parar(); mostrar(i + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); parar(); mostrar(i - 1, true); }
    });
    carr.addEventListener('pointerenter', function () { encima = true; });
    carr.addEventListener('pointerleave', function () { encima = false; });
    carr.addEventListener('focusin', function () { dentro = true; });
    carr.addEventListener('focusout', function () { dentro = false; });
    if (reduce) { pausa.hidden = true; pista.setAttribute('aria-live', 'polite'); }
    mostrar(0, true);
    alEntrar(carr, function () { if (!empezado) { empezado = true; if (auto) pista.setAttribute('aria-live', 'off'); programar(); } });
    API.carrusel = { get i() { return i; }, get auto() { return auto; }, mostrar: mostrar };
  })();

  /* ───────────────── cabecera fija y menú móvil ───────────────── */
  var cabecera = $('#cabecera');
  var boton = $('#hamburguesa');
  (function cabeceraFija() {
    if (!cabecera) return;
    /* en cuanto se baja un poco: la cabecera transparente del muro no puede quedar encima de la placa */
    function actualizar() { cabecera.classList.toggle('es-fija', window.pageYOffset > 40); }
    window.addEventListener('scroll', actualizar, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  })();
  function cerrarMenu() {
    if (!cabecera || !boton || !cabecera.classList.contains('menu-abierto')) return;
    cabecera.classList.remove('menu-abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.querySelector('.visualmente-oculto').textContent = 'Abrir menú';
    if (lenis) lenis.start();
  }
  if (boton) {
    boton.addEventListener('click', function () {
      var abierto = cabecera.classList.toggle('menu-abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      boton.querySelector('.visualmente-oculto').textContent = abierto ? 'Cerrar menú' : 'Abrir menú';
      if (lenis) { if (abierto) lenis.stop(); else lenis.start(); }
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  /* ───────────────── botones magnéticos ───────────────── */
  (function imanes() {
    if (!movimiento || esTactil) return;
    todos('.iman').forEach(function (el) {
      var aX = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' });
      var aY = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var c = el.getBoundingClientRect();
        aX((e.clientX - (c.left + c.width / 2)) * 0.32);
        aY((e.clientY - (c.top + c.height / 2)) * 0.42);
      });
      el.addEventListener('pointerleave', function () { aX(0); aY(0); });
    });
  })();

  /* ───────────────── cursor propio: punto bronce + aro de listón ───────────────── */
  (function cursor() {
    if (!movimiento || esTactil) return;
    var aro = crear('div', 'cursor'), pt = crear('div', 'cursor-punto');
    [aro, pt].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); document.body.appendChild(n); });
    var aX = gsap.quickTo(aro, 'x', { duration: 0.28, ease: 'power3.out' });
    var aY = gsap.quickTo(aro, 'y', { duration: 0.28, ease: 'power3.out' });
    var ultimo = null;
    function ver(si) { aro.classList.toggle('es-vivo', si); pt.classList.toggle('es-vivo', si); }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      /* un <dialog> modal vive en la capa superior y tapa todo lo que cuelga del body: el cursor se muda dentro mientras dure */
      var anfitrion = document.querySelector('dialog[open]') || document.body;
      if (aro.parentNode !== anfitrion) { anfitrion.appendChild(aro); anfitrion.appendChild(pt); }
      if (!aro.classList.contains('es-vivo')) { gsap.set(aro, { x: e.clientX, y: e.clientY }); ver(true); }
      /* el del sistema se oculta solo cuando el propio ya se ve */
      if (!html.classList.contains('con-cursor')) html.classList.add('con-cursor');
      gsap.set(pt, { x: e.clientX, y: e.clientY });
      aX(e.clientX); aY(e.clientY);
      /* el estado se decide aquí, por el objetivo (pointerover no siempre llega) */
      if (e.target !== ultimo) {
        ultimo = e.target;
        var t = e.target.closest ? e.target : null;
        var sobre = !!(t && t.closest('a, button, label, input, select, textarea, [role="button"], .carrusel__pista'));
        var oscuro = !!(t && t.closest('.enfoscado, .historia, .pie, .dialogo, .cookies, .mando, .listo') && !t.closest('.placa, .dialogo__ficha'));
        aro.classList.toggle('es-activo', sobre);
        aro.classList.toggle('es-oscuro', oscuro);
        pt.classList.toggle('es-activo', sobre);
      }
    });
    html.addEventListener('mouseleave', function () { ver(false); });
    html.addEventListener('mouseenter', function () { if (html.classList.contains('con-cursor')) ver(true); });
  })();

  /* ───────────────── contacto: mapa solo bajo clic y el segundo portal ───────────────── */
  (function mapa() {
    var btn = $('#mapa-boton'), caja = $('#mapa-consentimiento');
    if (!btn || !caja) return;
    btn.addEventListener('click', function () {
      var marco = document.createElement('iframe');
      marco.src = 'https://www.google.com/maps?q=Calle+Virgen+de+la+Soledad+6+Badajoz&output=embed';
      marco.loading = 'lazy';
      marco.title = 'Mapa: El Sótano, C/ Virgen de la Soledad 6, Badajoz';
      marco.allowFullscreen = true;
      marco.referrerPolicy = 'no-referrer-when-downgrade';
      caja.parentNode.replaceChild(marco, caja);
      setTimeout(refrescar, 60);
    });
  })();
  (function segundoPortal() {
    var caja = $('#segundo-portal');
    if (!caja) return;
    function pintar() {
      var p = CONFIG.segundo_portal;
      if (!p || !p.calle) { caja.hidden = true; return; }
      caja.textContent = '';
      caja.appendChild(crear('strong', null, 'Dos portales'));
      var t = crear('p', null, 'Según el apartamento, la entrada es por ' + CONFIG.direccion.calle + ' o por ' + p.calle + '. Te lo decimos al confirmar la reserva.');
      caja.appendChild(t);
      var a = crear('a', null, 'Cómo llegar a ' + p.calle);
      a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.calle + ' ' + (CONFIG.direccion.cp || '') + ' Badajoz');
      a.rel = 'noopener';
      caja.appendChild(a);
      caja.hidden = false;
    }
    document.addEventListener('config-cargada', pintar);
  })();

  /* ───────────────── consultar fechas: mensaje para Manuel ───────────────── */
  /* mailto según RFC 6068: saltos de línea como CRLF y todo codificado */
  function mailto(asunto, cuerpo) {
    return 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo.replace(/\r?\n/g, '\r\n'));
  }
  API.mailto = mailto;
  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    }
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t);
    return ok;
  }
  /* envío real vía Web3Forms; sin "web3forms_key" en config.json, ni lo intenta (sigue
     siendo "sin backend": el mensaje se queda preparado para email, copiar o llamar) */
  var cargadaEn = Date.now();
  var PAUSA_ENVIOS = 60000;   /* un envío por minuto y navegador */
  function ultimoEnvio() { try { return Number(localStorage.getItem('elsotano-envio')) || 0; } catch (e) { return 0; } }
  function enviarMensaje(nombre, asunto, cuerpo, cebo) {
    if (!CONFIG.web3forms_key || !window.fetch) return Promise.resolve(false);
    /* antirrobot: el cebo relleno, un formulario enviado a los 3 s de cargar o un envío hace menos de un minuto no salen */
    if (cebo || Date.now() - cargadaEn < 3000 || Date.now() - ultimoEnvio() < PAUSA_ENVIOS) return Promise.resolve(false);
    return fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: CONFIG.web3forms_key, subject: asunto, from_name: nombre, message: cuerpo, botcheck: false })
    }).then(function (r) { return r.json(); }).then(function (r) { return !!(r && r.success); }).catch(function () { return false; });
  }
  (function reserva() {
    var form = $('#reserva');
    if (!form) return;
    var llegada = $('#llegada'), salida = $('#salida');
    var errFechas = $('#fechas-error'), err = $('#reserva-error');
    var listo = $('#reserva-listo'), salidaTxt = $('#reserva-texto'), email = $('#reserva-email');
    var wa = $('#reserva-whatsapp'), waNota = $('#whatsapp-nota'), copiadoAnuncio = $('#reserva-copiado-anuncio');
    var nota = $('#reserva-nota'), notaManual = nota.textContent;
    var resultado = $('#reserva-resultado'), resultadoIcono = $('#reserva-resultado-icono');
    var resultadoTitulo = $('#reserva-resultado-titulo'), resultadoTexto = $('#reserva-resultado-texto');
    var texto = '';
    /* iconos mínimos del resultado del envío (trazo = currentColor, lo pinta el CSS según el estado) */
    var ICONOS_RESULTADO = {
      enviando: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="26 40" stroke-linecap="round"/>',
      ok: '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
      error: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.15" fill="currentColor" stroke="none"/>'
    };
    function mostrarResultado(tipo, titulo, texto2) {
      listo.dataset.resultado = tipo;
      resultadoIcono.innerHTML = ICONOS_RESULTADO[tipo];
      resultadoIcono.classList.toggle('es-girando', tipo === 'enviando');
      resultadoTitulo.textContent = titulo;
      resultadoTexto.textContent = texto2 || '';
      resultado.hidden = false;
      if (resultado.scrollIntoView) resultado.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    function aFecha(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function iso(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }
    function largo(d, conAnio) { return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + (conAnio ? ' de ' + d.getFullYear() : ''); }
    function corto(d) { return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    llegada.min = iso(hoy);

    function comprobarFechas(final) {
      llegada.removeAttribute('aria-invalid'); salida.removeAttribute('aria-invalid');
      if (!llegada.value || !salida.value) {
        errFechas.textContent = final ? 'Elige la fecha de llegada y la de salida.' : '';
        if (final) (llegada.value ? salida : llegada).setAttribute('aria-invalid', 'true');
        return false;
      }
      if (aFecha(salida.value) <= aFecha(llegada.value)) {
        errFechas.textContent = 'La salida tiene que ser posterior a la llegada.';
        salida.setAttribute('aria-invalid', 'true');
        return false;
      }
      errFechas.textContent = '';
      return true;
    }
    llegada.addEventListener('change', function () {
      if (llegada.value) { var a = aFecha(llegada.value); a.setDate(a.getDate() + 1); salida.min = iso(a); }
      if (salida.value) comprobarFechas(false);
    });
    salida.addEventListener('change', function () { comprobarFechas(false); });

    function pintarWhatsapp() {
      var activo = !!CONFIG.whatsapp;
      wa.disabled = !activo;
      wa.classList.toggle('es-apagado', !activo);
      waNota.hidden = activo;
    }
    pintarWhatsapp();
    document.addEventListener('config-cargada', pintarWhatsapp);
    /* con envío real el botón envía; sin él, solo prepara. Uno por mensaje: mientras sale o ya salió, no se puede repetir */
    var botonEnviar = form.querySelector('[type="submit"]'), rotuloPreparar = botonEnviar.textContent;
    var enviando = false, enviado = false;
    function rotuloBoton() {
      if (enviando) return 'Enviando…';
      if (enviado) return 'Enviado';
      return CONFIG.web3forms_key ? 'Enviar consulta' : rotuloPreparar;
    }
    function pintarBoton() {
      botonEnviar.textContent = rotuloBoton();
      botonEnviar.disabled = enviando || enviado;
      botonEnviar.classList.toggle('es-apagado', enviando || enviado);
    }
    function pintarNota() {
      nota.textContent = CONFIG.web3forms_key ? 'Se envía directamente a Apartamentos El Sótano; si no se puede, te dejamos el mensaje para que lo mandes tú.' : notaManual;
      pintarBoton();
    }
    /* cambiar cualquier dato abre otro mensaje: se puede volver a enviar */
    form.addEventListener('input', function () { if (enviado) { enviado = false; pintarBoton(); } });
    pintarNota();
    document.addEventListener('config-cargada', pintarNota);
    wa.addEventListener('click', function () {
      if (!CONFIG.whatsapp || !texto) return;
      window.open('https://wa.me/' + String(CONFIG.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando || enviado) return;
      var okFechas = comprobarFechas(true);
      var nombre = form.elements.nombre.value.trim();
      form.elements.nombre.toggleAttribute('aria-invalid', !nombre);
      err.textContent = nombre ? '' : 'Falta tu nombre, para que sepamos quién escribe.';
      if (!okFechas || !nombre) { listo.hidden = true; return; }
      var a = aFecha(llegada.value), b = aFecha(salida.value);
      var noches = Math.round((b - a) / 864e5);
      var ad = Math.max(1, parseInt(form.elements.adultos.value, 10) || 1);
      var ni = Math.max(0, parseInt(form.elements.ninos.value, 10) || 0);
      var quienes = ad + (ad === 1 ? ' adulto' : ' adultos') + (ni ? ' y ' + ni + (ni === 1 ? ' niño' : ' niños') : '');
      var mascota = form.elements.mascota.value === 'si';
      var apto = form.elements.apartamento.value;
      var cual = apto ? 'el Nº ' + apto : 'un apartamento';
      var mismoAnio = a.getFullYear() === b.getFullYear();
      var lineas = [
        'Hola, somos ' + quienes + (mascota ? ' con mascota' : '') + ' y queremos ' + cual + ' del ' + largo(a, !mismoAnio) + ' al ' + largo(b, true) +
          ' (' + noches + (noches === 1 ? ' noche' : ' noches') + ').'
      ];
      var msg = form.elements.mensaje.value.trim();
      if (msg) lineas.push('', msg);
      lineas.push('', '¿Lo tienes libre esas fechas?', '', 'Un saludo,', nombre);
      var tel = form.elements.telefono.value.trim();
      if (tel) lineas.push('Tel. ' + tel);
      texto = lineas.join('\n');
      var asunto = 'Consulta de fechas · ' + (apto ? 'Nº ' + apto + ' · ' : '') + corto(a) + ' – ' + corto(b);
      salidaTxt.textContent = texto;
      email.href = mailto(asunto, texto);
      listo.hidden = false;
      resultado.hidden = true;
      delete listo.dataset.resultado;
      setTimeout(refrescar, 30);
      if (listo.scrollIntoView) listo.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      if (CONFIG.web3forms_key) {
        mostrarResultado('enviando', 'Enviando…', '');
        enviando = true; pintarBoton();
        enviarMensaje(nombre, asunto, texto, form.elements.web.value).then(function (ok) {
          if (ok) { try { localStorage.setItem('elsotano-envio', String(Date.now())); } catch (e) {} }
          enviando = false; enviado = ok; pintarBoton();
          if (ok) mostrarResultado('ok', 'Mensaje enviado', 'Te contestamos en cuanto podamos.');
          else mostrarResultado('error', 'No se ha podido enviar solo', 'Usa uno de los botones de abajo para mandarlo tú.');
        });
      }
    });
    /* el propio botón confirma donde está mirando quien lo pulsa; el aviso es para el lector de pantalla */
    var botonCopiar = $('#reserva-copiar'), rotuloCopiar = botonCopiar.textContent, vueltaCopiar = 0;
    botonCopiar.addEventListener('click', function () {
      copiar(texto).then(function (ok) {
        copiadoAnuncio.textContent = ok ? 'Mensaje copiado. Pégalo donde quieras.' : 'No se ha podido copiar: selecciona el texto y cópialo a mano.';
        if (!ok) return;
        botonCopiar.style.minWidth = botonCopiar.offsetWidth + 'px';   /* que no encoja y mueva a su vecino */
        botonCopiar.textContent = 'Copiado';
        clearTimeout(vueltaCopiar);
        vueltaCopiar = setTimeout(function () { botonCopiar.textContent = rotuloCopiar; }, 1600);
      });
    });
  })();

  /* ───────────────── aviso de cookies ───────────────── */
  (function cookies() {
    var caja = $('#cookies'), ok = $('#cookies-aceptar'), reabrir = $('#cookies-reabrir');
    if (!caja || !ok) return;
    function ver(si) {
      caja.hidden = !si;                      /* el CSS pone display solo si NO hay [hidden] */
      document.body.classList.toggle('cookies-visibles', si);
    }
    var guardado = null;
    try { guardado = localStorage.getItem('elsotano-cookies'); } catch (e) {}
    if (guardado !== 'ok') ver(true);
    ok.addEventListener('click', function () {
      ver(false);
      try { localStorage.setItem('elsotano-cookies', 'ok'); } catch (e) {}
    });
    if (reabrir) reabrir.addEventListener('click', function () { ver(true); ok.focus(); });
  })();

  /* ───────────────── motor de reservas (Octorate) ─────────────────
     Mientras "reservas" sea null en data/config.json no pasa nada: los botones
     siguen llevando al formulario de consulta. Con una URL https, todos los
     «Consultar fechas» pasan a ser «Reservar» y salen al motor, y el formulario
     queda como consulta para quien prefiera preguntar antes. */
  function motorDeReservas() {
    var url = String(CONFIG.reservas || '');
    if (!/^https:\/\//i.test(url)) return;
    todos('a[href="#fechas"]').forEach(function (a) {
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Reservar';
    });
    var dlgBtn = $('#dialogo-fechas');
    if (dlgBtn) dlgBtn.textContent = 'Reservar este apartamento';
    var ante = $('#fechas .antetitulo'), entrada = $('#fechas .seccion__entrada');
    if (ante) ante.textContent = 'Consultas';
    if (entrada && !$('#fechas .fechas__motor')) {
      entrada.textContent = '¿Prefieres preguntarnos antes de reservar? Rellena esto y te dejamos escrito el mensaje. Lo envías tú, por email o como prefieras, y te contestamos con la disponibilidad y el precio de esas fechas.';
      var p = crear('p', 'fechas__motor');
      var a = crear('a', 'boton boton--almagre', 'Reservar online');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      p.appendChild(a);
      entrada.parentNode.insertBefore(p, entrada.nextSibling);
    }
  }
  promesaConfig.then(motorDeReservas);

  var anio = $('#anio');
  if (anio) anio.textContent = new Date().getFullYear();

  if (gsapReady && document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);
  /* contenido que cambia de alto (tarjetas, mensaje, mapa): el fin de página de ScrollTrigger se queda viejo */
  if (gsapReady && 'ResizeObserver' in window) {
    var altoPrevio = 0;
    var refrescarTarde = esperar(refrescar, 150);
    new ResizeObserver(function () {
      var a = document.body.offsetHeight;
      if (Math.abs(a - altoPrevio) < 40) return;
      altoPrevio = a;
      refrescarTarde();
    }).observe(document.body);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     [MANDO DE MAQUETA] — SOLO REVISIÓN INTERNA. NO PUBLICAR.
     Borrar este bloque entero, el bloque CSS marcado igual en estilos.css,
     el <div class="mando">, la tabla comparativa del HTML y la parte de
     densidad del script bloqueante del <head>. Receta en el README.
     ═══════════════════════════════════════════════════════════════════════ */
  (function mandoMaqueta() {
    var mando = $('#mando');
    if (!mando) return;
    /* solo con ?revision: el enlace que recibe el cliente sale limpio */
    if (!/[?&]revision\b/.test(window.location.search)) return;
    mando.hidden = false;                       /* sin JS no haría nada: lo enseña el JS */
    var botones = todos('[data-densidad]', mando);
    var avisos = $('#mando-avisos');
    function aplicar(d) {
      html.classList.remove('densidad-listones', 'densidad-sobria');
      html.classList.add('densidad-' + d);
      botones.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-densidad') === d ? 'true' : 'false'); });
      try { localStorage.setItem('elsotano-densidad', d); } catch (e) {}
      document.dispatchEvent(new CustomEvent('densidad-cambiada', { detail: d }));
      setTimeout(refrescar, 90);
    }
    var actual = densidad();
    botones.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-densidad') === actual ? 'true' : 'false');
      b.addEventListener('click', function () { aplicar(b.getAttribute('data-densidad')); });
    });
    /* los avisos pendientes, mientras lo sean */
    var lista = {};
    function aviso(clave, texto) {
      if (lista[clave]) return;
      var li = crear('li', null, texto); li.setAttribute('data-aviso', clave);
      avisos.appendChild(li); lista[clave] = li;
    }
    promesaPisos.then(function (d) { if (d.provisional || d.apartamentos.some(function (a) { return a.provisional; })) aviso('pisos', 'Apartamentos provisionales: números y nombres, pendiente de Manuel'); }).catch(function () {});
    promesaConfig.then(function (c) { if (!c.segundo_portal) aviso('portales', 'Dos direcciones: pendiente de Manuel'); });
    aviso('barra', 'La barra del antiguo restaurante: sin confirmar');
    API.mando = { aplicar: aplicar };
  })();
  /* ═══════════ fin del bloque [MANDO DE MAQUETA] ═══════════ */
})();
