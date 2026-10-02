# El Sótano · Apartamentos · Badajoz · «Los cuatro listones»

Web para **Apartamentos El Sótano**: apartamentos turísticos en el casco antiguo de Badajoz, en la C/ Virgen de la Soledad, 6 · 06002 (licencia **AT-BA-00367**). Lo gestiona Manuel con su familia. Hoy no tienen web: su Instagram enlaza a Booking.

**Estado:** construida el 2 de octubre de 2026 y publicada ese mismo día en GitHub Pages: https://alvarotaiagu.github.io/apartamentos-el-sotano-badajoz-web/ (repo público `alvarotaiagu/apartamentos-el-sotano-badajoz-web`). No está en Rúa.
- Lleva `noindex, nofollow` en todas las páginas.
- Lleva el mando de dos versiones, que solo aparece con `?revision` en la URL.
- Antes de entregarla, sigue la sección «Quitar el mando de maqueta».

```
node scripts/servir.mjs                 → http://127.0.0.1:4210  (hace falta servirla: lee data/*.json)
http://127.0.0.1:4210/?revision         → con el mando de las dos versiones y los avisos [VERIFICAR]
node scripts/verificar.mjs --capturas   → 126 comprobaciones + screenshots/
```

---

## Pendientes para Manuel

1. **El logo:** ¿tiene el vector original (AI, PDF o SVG)? ¿Cómo se llama la tipografía de «EL SÓTANO» y la de «APARTAMENTOS»? El de la web está redibujado desde su primer post de Instagram (ver «El logo» más abajo).
2. **Dos portales:** Booking y la fachada dicen C/ Virgen de la Soledad, 6; Google dice C/ Montesinos, 3, a unos 30 m. En Instagram sale un segundo portal con el nº 3 y un monograma «S». ¿Son dos portales? ¿Qué apartamentos hay en cada uno? ¿Qué dirección damos? Cuando conteste, rellenar `"segundo_portal"` en `data/config.json` (hay un ejemplo en ese archivo) y el contacto enseña las dos puertas.
3. **¿Cuatro o cinco apartamentos?** Booking enseña cuatro y la bio de Instagram dice «cinco». ¿Tienen nombre o número propio? Los «Nº 1-4» son nuestros.
4. **La barra:** ¿el mueble largo de madera con cajones del salón del Nº 2 es la barra del antiguo restaurante?
5. **El patio:** ¿el patio de las fotos del desayuno es solo del Nº 2 (Booking cuelga ahí sus fotos) o es de toda la casa? En la web va como «el patio», sin dueño.
6. **Fotos antiguas del restaurante**, si las hay: hay un hueco preparado en «La historia».
7. **Accesibilidad:** ¿qué apartamentos están adaptados a silla de ruedas? Booking dice además que hay ascensor a las plantas superiores, pero una opinión dice «no tiene ascensor». En la web no se habla del ascensor.
8. **Aparcamiento:** Booking se contradice («Parking gratis» y «parking público cerca, 34,20 € por día»). ¿Qué ofrecen de verdad? Hoy la web solo dice «¿Vienes en coche? Pregúntanos por el aparcamiento».
9. **Reserva directa:** ¿la acepta? ¿En qué condiciones (señal, cancelación, forma de pago)? Hoy el formulario solo prepara un mensaje para él.
10. **WhatsApp:** ¿el 657 77 11 35 tiene WhatsApp? Si sí, poner el número en `"whatsapp"` de `data/config.json` y el botón se enciende solo.
11. **Ficha de Google:** el Place ID o el enlace de la ficha, para que «5,0 en Google» lleve a sus reseñas y no a una búsqueda.
12. **Opiniones con nombre:** ¿podemos pedir permiso para citar con nombre de pila? Hoy van firmadas «Opinión en Booking».
13. **Él:** ¿quiere salir con su nombre (ya sale, porque así le llaman las opiniones), o también con foto?
14. **Portugués:** hablan portugués. ¿Le interesa la web en portugués? Quedaría como `/pt/` en una segunda fase.
15. **Dominio:** `apartamentoselsotano.es` o `.com`.
16. **Titular y NIF** para el aviso legal y la privacidad (hoy están como `[PENDIENTE]`).
17. **Toallas y sábanas:** Booking las lista como incluidas y, en otra línea, «Toallas/sábanas (cargo adicional)». La web dice que hay ropa de cama y toallas; confirmar que no se cobran aparte.
18. **Permiso para las fotos** de Booking en su web (son suyas, pero las sacamos de ahí).

## Qué es real y qué es provisional

| Dato | Estado | Fuente |
|---|---|---|
| Nombre, dirección del nº 6, teléfono, email, Instagram | **Real** | Logo, fachada, Booking, Google, Instagram |
| Licencia AT-BA-00367 y registro único | **Real** | Booking, placa «AT» |
| Los apartamentos: m², camas, terraza, balcón | **Real**, de Booking | Booking |
| **Números «Nº 1-4» y la lista de apartamentos** | **Provisional** (`"provisional": true` en el JSON; el mando lo avisa) | Nuestros |
| **Dirección**: Virgen de la Soledad 6 o Montesinos 3 | **Provisional**: sin resolver | Booking/fachada contra Google |
| **La barra del antiguo restaurante** | **Sin confirmar** (`[VERIFICAR]` con `?revision`) | Su texto de Booking + la foto |
| **Accesibilidad** (WC elevado con barras, lavamanos bajo) | **Real según Booking**, sin saber en qué apartamentos (`[VERIFICAR]`) | Booking |
| Equipamiento común, normas y horarios | **Real** | Booking |
| 9,5 «Excepcional», 289 comentarios y las 7 notas | **Real** a 2-10-2026 | Booking |
| 5,0 en Google | **Real**; **sin cifra de reseñas** en ningún sitio | Google |
| Las 9 citas | **Reales y textuales**, sin nombre y sin corregir | `ref/booking/texto.txt` |
| La historia del restaurante | **Real**: editada de su propio texto de Booking, sin añadir hechos y sin decir que sea la misma familia | Booking |
| Distancias a pie | **Medidas** con el enrutador de OSM el 2-10-2026 | `scripts/medir-alrededor.mjs` |
| Mascotas bajo petición | **Real** | Booking, Instagram |
| Precios | **No salen** (cambian con la fecha) | — |

## El concepto: «Los cuatro listones»

En la fachada del nº 6, el logo va en un **panel blanco** metido en el muro de almagre, dentro de un **marco de cuatro listones de madera que se cruzan en las esquinas**. La web repite ese gesto: cuatro listones llegan, se cruzan y enmarcan lo importante. Primero el logo, luego cada foto y cada apartamento y, al final, la placa del contacto. Todo sale de lo que ya es suyo: la fachada, la placa y el logo. Los listones son finos y rectos, sobre cal limpia: no tienen que parecer «rústico de casa rural».

1. **Cortina** (`#cortina`, ~2,2 s + 1 s de traspaso). Fondo de almagre en sombra `#5A3730` con enfoscado estático (ruido SVG en un data-URI).
   1. Los cuatro listones entran desde los bordes de la pantalla y se cruzan alrededor del centro (`expo.out` y el «clac» de 2 px).
   2. La cal se abre dentro del marco desde la línea central.
   3. Aparece solo la **sombra** del logo, como un contorno vacío. Luego las **letras** caen encima desplazadas (−9, 9) y se colocan, y nace el relieve. «APARTAMENTOS» asienta su espaciado.
   4. La placa (un clon con los ids renombrados) **vuela** al panel del hero mientras la capa sube con borde curvo y paralaje interno (`expo.inOut`). `alAbrirse()` arranca el hero cuando la capa empieza a subir. `lagSmoothing(0)` solo al retirarla.
   5. Se retira siempre: sin GSAP, sin JS (`<noscript>`), con el `setTimeout` inline de 7 s y con movimiento reducido (ni un fotograma).
2. **Hero.** El muro de almagre a la izquierda con la placa (panel + listones + logo) y el titular. A la derecha, la foto en su marco de listones, con cuatro fotos en fundido. **La sombra viva** (del boceto B): la capa `#sombra` del logo se mueve al contrario que el puntero (±9 unidades, `gsap.quickTo`), solo con `pointer:fine`.
3. **Los listones** son un único componente (`.listones` con `<i class="t r b l">`). Se montan con `scaleX`/`scaleY` desde su extremo, a 0,14 s uno de otro, y terminan con el clac. Al pasar por una tarjeta, el marco «respira» 4 px.
4. **El diálogo** de cada apartamento: el marco de la tarjeta crece hasta llenar la pantalla (FLIP sobre `left/top/width/height`, así los listones no se deforman) y sus cuatro listones son ya los del diálogo.

## Mapa de secciones

| # | Sección | id | Qué hace |
|---|---|---|---|
| 1 | Hero | `#inicio` | Muro con la placa, titular con char-reveal, CTAs, 9,5 · 289 · 5,0; foto en marco con fundido y paralaje |
| 2 | La casa | `#la-casa` | Cita editorial con char-reveal bajo un listón; cifras que cuentan (70–95 m², 9,7, 9,6 y el número de apartamentos **sacado del JSON**); el pasillo «LOVE» en su marco |
| 3 | Los apartamentos | `#los-apartamentos` | Una tarjeta-`<button>` por entrada del JSON; cada una abre su `<dialog>` con galería, camas y «Consultar fechas para este apartamento». En la sobria, además, la tabla comparativa |
| 4 | Lo que tienen todos | `#lo-de-todos` | Rejilla de 12 iconos dibujados a mano; aparte, con el mismo peso, mascotas y silla de ruedas |
| 5 | Los detalles | `#detalles` | Marquee doble en sentidos opuestos, con la velocidad ligada al scroll; se para con el ratón encima y con movimiento reducido |
| 6 | **La historia** | `#historia` | Módulo que se puede quitar. La única sección oscura, con fundido de entrada y salida |
| 7 | Badajoz a pie | `#badajoz-a-pie` | El radar (boceto D): Nº 6, la calle, la lista por distancia a pie y el SVG con anillos cada 100 m y el barrido |
| 8 | Opiniones | `#opiniones` | 9,5 que cuenta, las 7 notas como listones, las 9 citas de una en una |
| 9 | Para que todo vaya bien | `#normas` | Normas con tacto; la cabecera es la pieza sticky de la web (contenedor con `overflow:clip`) |
| 10 | Consultar fechas | `#fechas` | Formulario sin backend → mensaje para Manuel (email, copiar, llamar; WhatsApp apagado mientras sea `null`) |
| 11 | Contacto | `#contacto` | La placa sobre el almagre (los listones se montan por última vez), la puerta del nº 6 y el mapa bajo clic |
| 12 | Pie | — | Licencia, Instagram, idiomas, legales |

## Los apartamentos se editan en `data/apartamentos.json`

Cada entrada lleva `numero`, `nombre_booking`, `m2`, `dormitorios` (0 = planta abierta), `camas`, `camas_resumen`, `extras` (texto o `{ "texto", "verificar" }`), `terraza`, `balcon`, `lavadora`, `fotos` (ids de `data/fotos.json`; la primera es la principal) y `"provisional": true`.

- **Añadir un quinto es solo añadir una entrada.** Salen solas la tarjeta, la opción del formulario, la fila de la tabla y la cifra de «La casa». `verificar.mjs` lo prueba inyectando una quinta entrada.
- El número de apartamentos **no está escrito a mano en ningún texto** (verificar.mjs lo comprueba en el HTML).
- Con `"provisional": true`, el mando avisa «Apartamentos provisionales».
- Fotos nuevas: copiarlas a `apartamentos-el-sotano-badajoz-bocetos/ref/booking/<id>.jpg`, añadirlas a `data/fotos.json` y ejecutar `python scripts/gradar.py <id>` y `node scripts/fotos.mjs <id>`.

## El radar se edita en `data/alrededor.json`

- `node scripts/medir-alrededor.mjs` recalcula, desde `ref/geo.json`, la distancia en línea recta y el **rumbo** (con eso se coloca cada punto) y la distancia **a pie** con `routing.openstreetmap.de` (75 m por minuto). Si el servicio falla, se queda la recta y la etiqueta dice «en línea recta». Respeta los nombres y la colocación de las etiquetas.
- `node scripts/colocar-etiquetas.mjs` (con el servidor en marcha) elige el lado (`l | r | c`) y el `dy` de cada etiqueta, para escritorio y para móvil (`"movil"`), midiendo la letra de verdad en el navegador para que ninguna pise a otra, a un punto, al «6», a la «N» ni a las cifras de los anillos. Lo deja declarado en el JSON.
- Los nombres son los del Ayuntamiento (aytobadajoz.es → Monumentos) y su web de turismo, comprobados el 2-10-2026.
- **Ojo:** con las coordenadas corregidas de la Torre de Espantaperros (2º resultado de Nominatim), el rumbo sale de **44º y 299 m**, no de 53º como decía la primera tabla. Manda la geometría.

## Quitar el módulo «La historia»

Si a la familia no le apetece contar lo del restaurante:

```
node scripts/quitar-historia.mjs --aqui                 (en esta carpeta, sin vuelta atrás)
node scripts/quitar-historia.mjs ../copia-de-la-web     (sobre una copia)
```

1. `index.html`: borra la `<section id="historia" data-modulo="historia">` entre sus marcas `[MÓDULO HISTORIA]` y todas las líneas con `data-modulo="historia"`: el enlace del pie, el `<link>` de `css/historia.css` y el `<script>` de `js/historia.js`.
2. Borra `css/historia.css` y `js/historia.js`.
3. Vuelve a versionar CSS y JS.

No toca nada más: `main.js` y `estilos.css` no dependen del módulo. `verificar.mjs` lo ejecuta sobre una copia temporal y comprueba que no queda sección, enlace ni petición de sus archivos, que no hay errores ni 404 y que el resto de secciones sigue en orden.

**La foto antigua:** cuando Manuel la mande, guardarla en `assets/historia/` y rellenar `"foto_antigua"` en `data/config.json` (hay un ejemplo). El hueco aparece solo, con sus listones.

## Quitar el mando de maqueta

El mando (abajo a la izquierda, solo con `?revision`) cambia entre **«Cuatro listones»** (la cargada) y **«Sobria»**, y enseña los avisos pendientes. **Nunca viaja al cliente.**

**Caso A, entregar la cargada:**
```
node scripts/quitar-mando.mjs ../el-sotano-entrega
node scripts/comprobar-borrado.mjs ../el-sotano-entrega     → «Sin rastros del mando. Se puede entregar.»
```
Escribe una copia limpia fuera de esta carpeta y quita, por las marcas `[MANDO DE MAQUETA] … fin del bloque [MANDO DE MAQUETA]`:
- de `index.html`: el aviso, la lectura de `?revision` y de la densidad en el `<head>`, la tabla comparativa, el `<div class="mando">` y los `<span class="verificar">`;
- el bloque del mando y las reglas sobrias de `css/estilos.css` y `css/historia.css`;
- `mandoMaqueta()` de `js/main.js`;
- la fila `elsotano-densidad` de `privacidad.html`.

Después vuelve a versionar. `verificar.mjs` ejecuta la receta sobre una copia temporal, pasa `comprobar-borrado.mjs` y carga la copia: sin mando, ni con `?revision`, y sin errores.

**Caso B, si Manuel elige la sobria:** antes de quitar el mando, en `index.html` cambiar `class="sin-js densidad-listones"` por `class="sin-js densidad-sobria"` y sacar las reglas `.densidad-sobria …` del bloque del mando a la hoja normal (y la tabla comparativa de sus marcas, si la quiere). Luego, el caso A.

### Las dos versiones

- **Cuatro listones** (la cargada): listones en todas las fotos y tarjetas y bajo cada titular, el marco que crece al abrir un apartamento, la sombra viva, el marquee de detalles y el radar con onda y barrido.
- **Sobria:** los listones solo en la cortina, el panel del hero y el contacto; fotos con esquinas rectas; el diálogo con un fundido; la sombra quieta; el marquee como rejilla quieta; el radar ya encendido. **Añade** lo que la cargada no tiene: la **tabla comparativa** de los apartamentos (m², dormitorios, camas, terraza, balcón y lavadora), sacada del JSON, con «Consultar fechas» en cada fila.

## El logo

`python scripts/logo.py`. Se comparó a 3x el vector de los bocetos contra el JPG de Instagram: tenía dientes, esquinas romas y un halo gris alrededor del bronce. Así que **no se ha vuelto a trazar**:
- **E, L, T, A, N y la tilde están redibujadas** con sus medidas (altura de mayúscula, astas de 21-22 u, misma pendiente en las dos caras de la A y de la N). Las cifras salen del polígono de potrace sobre el alfa limpio (`--medir`).
- **Las dos «O» están redibujadas** como un anillo de esquinas redondeadas, ajustado por IoU a las dos a la vez (0,996), y sus **rayas** son el mismo rectángulo. Así salen idénticas.
- **La S** son curvas de potrace sobre un alfa de precisión subpíxel.
- **La sombra no se calca.** En el original es el contorno de las letras desplazado (−8, +8) (81 % de coincidencia, el mejor desplazamiento posible), solo en las caras que miran abajo o a la izquierda. Se genera así, como trazo, y el hueco blanco entre letra y sombra es un halo del color del panel (en la web) o una máscara (en los archivos sueltos).

Salen cuatro piezas:
- `assets/logo/logo-el-sotano.svg`, el completo;
- `logo-el-sotano-corto.svg`, sin «APARTAMENTOS», para la cabecera fija;
- `logo-el-sotano-oscuro.svg`, con letras `#C9A574` y sombra con alfa;
- `assets/favicon.svg`, la «Sº».

También genera el sprite de las páginas (`<!-- logo:inicio -->`): sin `fill` en los paths de `<defs>` y con `fill-rule`. Los `<svg>` que usan los símbolos llevan `viewBox="0 0 840 346"`, con origen 0: si copian el viewBox desplazado del símbolo, el logo cae fuera de vista.

## Cómo se trabaja

| Script | Para qué |
|---|---|
| `scripts/servir.mjs` | Servidor local (puerto 4210) |
| `scripts/gradar.py` | Gradación común de las 43 fotos (blancos a la cal cálida, barro y madera contenidos; sin recortes) |
| `scripts/fotos.mjs` | AVIF/WebP/JPG a 480, 960, 1440 y 2000 px (las de abril, de 3000 px, llenan los huecos grandes) |
| `scripts/construir.mjs` | Rellena cada `<picture data-foto>` del HTML desde `data/fotos.json` |
| `scripts/logo.py` | El logo, sus cuatro piezas y el sprite |
| `scripts/medir-alrededor.mjs` | Distancias y rumbos del radar |
| `scripts/colocar-etiquetas.mjs` | Etiquetas del radar sin choques |
| `scripts/generar-og.mjs` | `assets/og-el-sotano.jpg` (la placa sobre el almagre) |
| `scripts/versionar.mjs` | `?v=<huella>` en CSS y JS (solo en `href`/`src`) |
| `scripts/quitar-historia.mjs` | Quita el módulo «La historia» |
| `scripts/quitar-mando.mjs` · `comprobar-borrado.mjs` | La copia que viaja al cliente |
| `scripts/verificar.mjs` | Las comprobaciones (Playwright bajando con `mouse.wheel`) y `--capturas` |

Tras tocar CSS o JS: `node scripts/versionar.mjs`. Usa `sharp` y `playwright` del `node_modules` de `alvarotaiagu.github.io` (aquí no hay npm).

## Qué la separa del resto de la carpeta

- **De Las Dehesillas** (el alojamiento real con almagre):
  - aquí el almagre nunca va como zócalo: son bloques enteros (el muro del hero, el radar y el contacto);
  - ni Anton ni Spectral, sino League Gothic + Epilogue;
  - la cortina no es un monograma al rojo que se enfría: son listones que se cruzan;
  - no hay puntos sobre una foto aérea: el radar es un dibujo con el norte arriba.
- **De Casa María:**
  - no hay hilo que recorra la página;
  - los marcos son rectángulos de listones, no tejados;
  - no hay casa abierta en corte;
  - las opiniones van de una en una en grande, no en un mazo de notas;
  - el formulario funciona igual (mensaje para el anfitrión), pero con otro aspecto: panel de cal con campos de línea y el mensaje en tinta.
- **De `plantilla-hotel-rural-web`:** el radar no es una brújula. Solo lleva una «N» pequeña, sin rosa de los vientos ni aguja.
- **De `plantilla-viajes-web`:** comparte Epilogue, pero no la maquetación.
- **De Pazo do Souto:** aquí no se abre ninguna puerta ni portón: la cortina es una capa que sube.
- **De A Ponte y Ceibo:** el radar va con el norte arriba y anillos de distancia reales; no es un mapa girado ni un menú circular.
- **De La otra bodeguita y Restaurante Gabi:** nada de copas, carta ni pila de tarjetas. El restaurante es una sección que se puede quitar, no el concepto.

## Decisiones

- **El patio va sin dueño.** Las cuatro fotos del patio (incluida la 670608170 que Booking cuelga del Nº 2) son el mismo patio, y no se puede saber si es solo del Nº 2. En las secciones generales va como «el patio». En el Nº 2, «Terraza-patio» lleva `[VERIFICAR]`.
- **Una sola sección** tiene el id del logo: la sección de apartamentos es `#los-apartamentos`, porque `#apartamentos` es la capa «APARTAMENTOS» del logo (el encargo pide las capas `#letras`, `#sombra` y `#apartamentos`).
- **«Una sola vez al entrar» con IntersectionObserver** (umbral 0, sobre el bloque), no con `ScrollTrigger once`: el PLIEGO §6 recoge que `once` no dispara si el elemento ya está en pantalla. ScrollTrigger queda para el paralaje.
- **Las citas pasan solas** despacio. Siguiendo el patrón de carrusel accesible, mientras pasan solas el `aria-live` está en `off`. Al tocarlas (botón, clic o flechas) se paran y pasan a `polite`. Hay botón de pausa. Con movimiento reducido no pasan solas.
- **Las tipografías están en la carpeta** (`assets/fuentes/`, OFL), no en Google Fonts: así la web no manda la IP de nadie a Google.
- **No se habla del ascensor** (Booking y una opinión se contradicen) ni de la cuna o las camas supletorias (son condiciones).
- **Ropa de cama y toallas** va en «Lo que tienen todos» porque el encargo la da por confirmada, pero Booking también lista «Toallas/sábanas (cargo adicional)»: está en los pendientes.
- **Contraste:** el texto claro sobre el almagre da 5,3 (AA en texto normal), así que no hace falta oscurecer detrás del texto. `--acento-texto` es el bronce mezclado con la tinta (76 %), y da 5,6 sobre la cal. El listón y el bronce puro nunca van como texto pequeño.
- **La 404** se sirve en cualquier ruta del repo (`/repo/a/b/c`), así que sus enlaces llevan `data-raiz` y un script los rehace desde la raíz del sitio (`/<repo>/` en github.io, `/` en local). En rutas de un solo nivel ya funcionan sin el script.
