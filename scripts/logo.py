"""Logo de El Sótano, redibujado a partir de su primer post de Instagram (1080 px).

El vector de los bocetos (ref/logo-sotano.svg) se trazó directamente sobre el
JPG y salió con dientes, esquinas romas y un halo gris alrededor del bronce.
Comparado a 3x contra el JPG, aquí no se vuelve a calcar: se reconstruye.

  1. Alfa suave por capa (bronce y gris) a partir de la luminancia, solo
     dentro de la zona de cada color: el borde tiene precisión de subpíxel
     aunque el JPG sea de 1080 px.
  2. Se amplía ×8 con interpolación bicúbica, se suaviza y se corta al 50 %.
  3. Cada letra según su forma:
       · rectas (E, L, T, A, N, tilde): polígono de potrace + Douglas-Peucker
         + chaflanes devueltos a esquina viva + aristas casi rectas
         enderezadas + altura de mayúscula y línea base comunes;
       · las dos «O»: REDIBUJADAS como anillo de esquinas redondeadas (caja y
         radio ajustados por IoU a las dos a la vez, así salen idénticas);
       · sus rayas: el mismo rectángulo exacto debajo de cada «O»;
       · la S: curvas de potrace sobre el alfa limpio.
  4. La SOMBRA no se calca. En el original es el contorno de las letras
     desplazado (−8, +8) (medido: 81 % de coincidencia, el mejor de todos los
     desplazamientos probados), pero SOLO en las caras que miran abajo o a la
     izquierda: no hay línea en las caras de arriba ni en las de la derecha.
     Se genera así, como trazo abierto, y el hueco blanco entre la letra y la
     sombra es un halo del color del fondo (web) o una máscara (archivos
     sueltos con fondo transparente).

Salidas:
  assets/logo/logo-el-sotano.svg            completo (fondo transparente)
  assets/logo/logo-el-sotano-corto.svg      sin «APARTAMENTOS» (cabecera fija)
  assets/logo/logo-el-sotano-oscuro.svg     para fondo oscuro (letras #C9A574)
  assets/favicon.svg                        la «Sº»
  scripts/fuentes/logo-capas.json           los paths, para quien los necesite
  y el sprite <svg class="simbolos"> dentro de las páginas, entre las marcas
  <!-- logo:inicio --> y <!-- logo:fin -->.

  python scripts/logo.py
"""
import json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage
import potrace

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..'))
JPG = os.path.normpath(os.path.join(RAIZ, '..', 'apartamentos-el-sotano-badajoz-bocetos', 'ref', 'ig', 'DGSvktBNDWE.jpg'))
ESC = 8
VB = (123, 371, 840, 346)          # mismo encuadre que el vector de los bocetos
VB_CORTO = (123, 371, 840, 278)    # sin «APARTAMENTOS»
SOMBRA_D = (-8, 8)
SOMBRA_GROSOR = 3.4                # 2,4 salía más fino que el logo oficial del cliente (PDF de Canva, 6-10-2026)
HALO = 7.0                          # ancho del trazo-halo: deja ~2,3 u de blanco entre letra y sombra
COL = dict(letras='#8F7049', sombra='#7B7B7B', apart='#7B7B7B',
           letras_osc='#C9A574', sombra_osc='rgba(247,244,239,.42)', apart_osc='rgba(247,244,239,.72)')

im = np.asarray(Image.open(JPG).convert('RGB')).astype(np.float64)
lum = .299 * im[..., 0] + .587 * im[..., 1] + .114 * im[..., 2]
sat = im.max(-1) - im.min(-1)
filas = np.arange(im.shape[0])[:, None] * np.ones((1, im.shape[1]))

bron_bin = ndimage.binary_opening((sat > 45) & (lum < 190))
gris_bin = (sat <= 30) & (lum < 200)
L_BRONCE = .299 * 143 + .587 * 112 + .114 * 71
L_GRIS = 120.0
zona_b = ndimage.binary_dilation(bron_bin, iterations=3)
alfa_b = np.clip((255 - lum) / (255 - L_BRONCE), 0, 1) * zona_b
zona_a = ndimage.binary_dilation(gris_bin & (filas > 660), iterations=2) & (filas > 660)
alfa_a = np.clip((255 - lum) / (255 - L_GRIS), 0, 1) * zona_a


def ampliar(alfa, caja, suave=0.42):
    """alfa suave de una caja (x0, y0, x1, y1) → máscara ×ESC cortada al 50 %"""
    x0, y0, x1, y1 = caja
    trozo = Image.fromarray(alfa[y0:y1, x0:x1].astype(np.float32), mode='F')
    grande = trozo.resize(((x1 - x0) * ESC, (y1 - y0) * ESC), Image.BICUBIC)
    g = ndimage.gaussian_filter(np.asarray(grande), suave * ESC)
    return g > 0.5


def trazar(mask, curvas):
    bm = potrace.Bitmap(~mask)                 # potracer traza los ceros
    if curvas:
        return bm.trace(turdsize=ESC * ESC * 4, alphamax=1.1, opticurve=True, opttolerance=0.8)
    return bm.trace(turdsize=ESC * ESC * 4, alphamax=0.0, opticurve=False)


def dp_abierto(a, tol):
    a = np.asarray(a, float)
    if len(a) < 3:
        return [tuple(x) for x in a]
    s, e = a[0], a[-1]
    dd = e - s
    nn = np.hypot(*dd) or 1e-9
    dist = np.abs(dd[0] * (a[:, 1] - s[1]) - dd[1] * (a[:, 0] - s[0])) / nn
    k = int(np.argmax(dist))
    if dist[k] > tol:
        return dp_abierto(a[:k + 1], tol)[:-1] + dp_abierto(a[k:], tol)
    return [tuple(s), tuple(e)]


def dp(puntos, tol):
    """Douglas-Peucker sobre un polígono cerrado"""
    if len(puntos) < 4:
        return puntos
    p = np.array(puntos, float)
    i0 = int(np.argmax(((p - p[0]) ** 2).sum(1)))   # partir por el punto más lejano del primero
    mitad = i0
    a = dp_abierto(p[:mitad + 1], tol)[:-1]
    b = dp_abierto(np.vstack([p[mitad:], p[:1]]), tol)[:-1]
    return a + b


def enderezar(poli, lineas_y=(), tol_ang=3.5, tol_y=2.6):
    """aristas casi verticales/horizontales → exactas; y cerca de una línea guía → a la línea"""
    p = [list(v) for v in poli]
    n = len(p)
    for _ in range(2):
        for i in range(n):
            a, b = p[i], p[(i + 1) % n]
            dx, dy = b[0] - a[0], b[1] - a[1]
            ang = np.degrees(np.arctan2(abs(dy), abs(dx)))
            if ang < tol_ang:
                m = (a[1] + b[1]) / 2; a[1] = b[1] = m
            elif ang > 90 - tol_ang:
                m = (a[0] + b[0]) / 2; a[0] = b[0] = m
    for v in p:
        for ly in lineas_y:
            if abs(v[1] - ly) < tol_y:
                v[1] = ly
    return [tuple(v) for v in p]


def esquinas(poli, corta=5.5, larga=6.0, ang_min=25):
    """chaflanes de 1-3 u que deja el suavizado en una esquina viva → la esquina"""
    p = [np.array(v, float) for v in poli]
    cambiado = True
    while cambiado and len(p) > 3:
        cambiado = False
        n = len(p)
        for i in range(n):
            a, b, c, d = p[i - 1], p[i], p[(i + 1) % n], p[(i + 2) % n]
            if np.hypot(*(c - b)) >= corta or np.hypot(*(b - a)) < larga or np.hypot(*(d - c)) < larga:
                continue
            u, v = b - a, d - c
            cos = abs(np.dot(u, v)) / (np.hypot(*u) * np.hypot(*v))
            if np.degrees(np.arccos(min(1, cos))) < ang_min:
                continue
            den = u[0] * v[1] - u[1] * v[0]
            if abs(den) < 1e-9:
                continue
            t = ((c[0] - a[0]) * v[1] - (c[1] - a[1]) * v[0]) / den
            x = a + u * t
            if np.hypot(*(x - b)) > 6 or np.hypot(*(x - c)) > 6:
                continue
            p[i] = x
            del p[(i + 1) % n]
            cambiado = True
            break
    return [tuple(v) for v in p]


# ── modelo común: cada contorno es una lista de segmentos ('L', p0, p1) o ('C', p0, c1, c2, p1) ──
def poligono_a_segs(vert):
    return [('L', tuple(vert[i]), tuple(vert[(i + 1) % len(vert)])) for i in range(len(vert))]


def potrace_a_segs(plist, ox, oy, curvas, lineas_y=(), tol=0.7):
    f = lambda pt: ((pt.x / ESC) + ox, (pt.y / ESC) + oy)
    contornos = []
    for curva in plist:
        if not curvas:
            vert = [f(s.c) for s in curva.segments]
            vert = enderezar(esquinas(enderezar(dp(vert, tol), lineas_y)), lineas_y)
            contornos.append(poligono_a_segs(vert))
            continue
        segs, prev = [], f(curva.start_point)
        for s in curva.segments:
            if s.is_corner:
                c, e = f(s.c), f(s.end_point)
                segs.append(('L', prev, c)); segs.append(('L', c, e))
            else:
                e = f(s.end_point)
                segs.append(('C', prev, f(s.c1), f(s.c2), e))
            prev = e
        contornos.append(segs)
    return contornos


def rrect(x0, y0, x1, y1, r, inverso=False):
    k = 0.5523 * r
    s = [('L', (x0 + r, y0), (x1 - r, y0)), ('C', (x1 - r, y0), (x1 - r + k, y0), (x1, y0 + r - k), (x1, y0 + r)),
         ('L', (x1, y0 + r), (x1, y1 - r)), ('C', (x1, y1 - r), (x1, y1 - r + k), (x1 - r + k, y1), (x1 - r, y1)),
         ('L', (x1 - r, y1), (x0 + r, y1)), ('C', (x0 + r, y1), (x0 + r - k, y1), (x0, y1 - r + k), (x0, y1 - r)),
         ('L', (x0, y1 - r), (x0, y0 + r)), ('C', (x0, y0 + r), (x0, y0 + r - k), (x0 + r - k, y0), (x0 + r, y0))]
    if not inverso:
        return s
    return [('L', g[2], g[1]) if g[0] == 'L' else ('C', g[4], g[3], g[2], g[1]) for g in reversed(s)]


def ajustar_rrect(region, ox, oy):
    """caja subpíxel + radio que mejor casa (IoU) con una región ×ESC"""
    ys, xs = np.nonzero(region)
    x0, x1 = xs.min() / ESC + ox, (xs.max() + 1) / ESC + ox
    y0, y1 = ys.min() / ESC + oy, (ys.max() + 1) / ESC + oy
    H, W = region.shape
    gy, gx = np.mgrid[0:H, 0:W]
    gx = (gx + .5) / ESC + ox
    gy = (gy + .5) / ESC + oy
    cx, cy, hw, hh = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    mejor = (0, 0)
    for r in np.arange(2, min(hw, hh) + .01, .5):
        dx = np.maximum(np.abs(gx - cx) - (hw - r), 0)
        dy = np.maximum(np.abs(gy - cy) - (hh - r), 0)
        m = np.hypot(dx, dy) <= r
        iou = (m & region).sum() / (m | region).sum()
        if iou > mejor[0]:
            mejor = (iou, r)
    return [x0, y0, x1, y1, mejor[1], mejor[0]]


def segs_a_d(contornos):
    d = []
    for segs in contornos:
        d.append('M%.1f %.1f' % segs[0][1])
        for g in segs:
            if g[0] == 'L':
                d.append('L%.1f %.1f' % g[2])
            else:
                d.append('C%.1f %.1f %.1f %.1f %.1f %.1f' % (g[2] + g[3] + g[4]))
        d.append('Z')
    return ''.join(d)


def aplanar(segs, paso=1.0):
    pts = []
    for g in segs:
        if g[0] == 'L':
            a, b = np.array(g[1]), np.array(g[2])
            n = max(1, int(np.hypot(*(b - a)) / paso))
            for i in range(n):
                pts.append(a + (b - a) * i / n)
        else:
            p0, p1, p2, p3 = map(np.array, g[1:])
            n = max(4, int((np.hypot(*(p1 - p0)) + np.hypot(*(p2 - p1)) + np.hypot(*(p3 - p2))) / paso))
            for i in range(n):
                t = i / n
                pts.append((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3)
    return np.array(pts)


def dentro(pt, polis):
    """par-impar sobre todos los contornos aplanados de una pieza"""
    x, y = pt
    c = False
    for P in polis:
        xa, ya = P[:, 0], P[:, 1]
        xb, yb = np.roll(xa, -1), np.roll(ya, -1)
        dy = np.where(yb - ya == 0, 1e-12, yb - ya)
        cruza = ((ya > y) != (yb > y)) & (x < (xb - xa) * (y - ya) / dy + xa)
        c ^= bool(cruza.sum() % 2)
    return c


def sombra_caras(contornos, umbral=0.12):
    """tramos del contorno cuya normal exterior mira abajo o a la izquierda, desplazados (−8, +8)"""
    polis = [aplanar(s) for s in contornos]
    luz = np.array([-1.0, 1.0]) / np.sqrt(2)
    trozos = []
    for P in polis:
        n = len(P)
        cara = np.zeros(n, bool)
        for i in range(n):
            t = P[(i + 1) % n] - P[i - 1]
            t = t / (np.hypot(*t) or 1)
            nor = np.array([t[1], -t[0]])
            if dentro(P[i] + nor * 0.9, polis):
                nor = -nor
            cara[i] = np.dot(nor, luz) > umbral
        if cara.all():
            trozos.append(np.vstack([P, P[:1]]))
            continue
        i0 = int(np.argmin(cara))               # empezar en un punto que no es cara
        actual = []
        for k in list(np.roll(np.arange(n), -i0)) + [i0]:
            if cara[k]:
                actual.append(P[k])
            elif actual:
                actual.append(P[k])             # cerrar el tramo en la esquina
                trozos.append(np.array(actual))
                actual = []
    d = []
    for T in trozos:
        if len(T) < 2:
            continue
        T = dp_abierto(np.asarray(T) + np.array(SOMBRA_D), 0.12)
        d.append('M' + 'L'.join('%.1f %.1f' % (x, y) for x, y in T))
    return ''.join(d)


def componentes(binaria, minimo):
    lab, n = ndimage.label(binaria)
    cajas = []
    for i, o in enumerate(ndimage.find_objects(lab)):
        if (lab[o] == i + 1).sum() < minimo:
            continue
        cajas.append((o[1].start, o[0].start, o[1].stop, o[0].stop))
    return sorted(cajas, key=lambda c: (c[0], c[1]))


# ── letras de bronce ──
CAP, BASE = 436.0, 632.0
piezas = []
for (x0, y0, x1, y1) in componentes(bron_bin, 200):
    if y0 > 600:
        tipo = 'raya'
    elif y1 - y0 < 60:
        tipo = 'tilde'
    elif y1 < 600:
        tipo = 'o'
    elif 300 < x0 < 470:
        tipo = 's'
    else:
        tipo = 'recta'
    piezas.append(dict(tipo=tipo, caja=[x0, y0, x1, y1], ventana=(x0 - 4, y0 - 4, x1 + 4, y1 + 4)))

# ── letras rectas, redibujadas ──
RECTAS = {'E': (130, 210), 'L': (225, 300), 'tilde': (505, 520), 'T': (580, 660), 'A': (660, 760), 'N': (765, 860)}


def letra_a():
    """A simétrica: cima plana de 21,3 u, patas con la misma pendiente por fuera y por dentro"""
    xc, k = 704.5, 0.1462                 # eje y pendiente (dx por dy) medidos
    ext = lambda y: 10.65 + (y - CAP) * k             # semiancho exterior
    inte = lambda y: (y - 506.0) * k                  # semiancho del hueco (vértice en y = 506)
    barra_arriba, barra_abajo = 587.6, 609.3
    fuera_ = [(xc - ext(BASE), BASE), (xc - 10.65, CAP), (xc + 10.65, CAP), (xc + ext(BASE), BASE),
              (xc + inte(BASE), BASE), (xc + inte(barra_abajo), barra_abajo),
              (xc - inte(barra_abajo), barra_abajo), (xc - inte(BASE), BASE)]
    hueco_ = [(xc, 506.0), (xc + inte(barra_arriba), barra_arriba), (xc - inte(barra_arriba), barra_arriba)]
    return [fuera_, hueco_]


def letra_n():
    """N: dos astas de 21 u y una diagonal de 22 u de ancho horizontal con la misma pendiente en sus dos bordes"""
    x0, x1, x2, x3 = 772.9, 794.0, 828.2, 849.1      # astas
    k = 0.278                                        # dx por dy de la diagonal
    arriba, abajo = 795.8, 828.3                    # dónde toca la diagonal arriba y abajo
    y_der = CAP + (x2 - arriba) / k                 # el borde de arriba llega al asta derecha
    y_izq = BASE - (abajo - x1) / k                 # el borde de abajo llega al asta izquierda
    return [[(x0, BASE), (x0, CAP), (arriba, CAP), (x2, y_der), (x2, CAP), (x3, CAP), (x3, BASE),
             (abajo, BASE), (x1, y_izq), (x1, BASE)]]


GEOMETRIA = {
    'E': [[(137.2, CAP), (202.2, CAP), (202.2, 457.7), (159.2, 457.7), (159.2, 520.0), (184.1, 520.0), (184.1, 542.3),
           (159.2, 542.3), (159.2, 611.0), (202.2, 611.0), (202.2, BASE), (137.2, BASE)]],
    'L': [[(231.2, CAP), (253.2, CAP), (253.2, 611.0), (291.2, 611.0), (291.2, BASE), (231.2, BASE)]],
    'T': [[(587.0, CAP), (654.0, CAP), (654.0, 457.8), (631.0, 457.8), (631.0, BASE), (609.0, BASE), (609.0, 457.8), (587.0, 457.8)]],
    'tilde': [[(513.2, 416.8), (532.0, 377.8), (548.4, 377.8), (524.2, 416.8)]],   # cuña: más gruesa arriba, como el original
    'A': letra_a(),
    'N': letra_n(),
}

# las dos «O» son la misma pieza: se ajustan juntas
os_ = [p for p in piezas if p['tipo'] == 'o']
fuera, hueco = [], []
for p in os_:
    c = p['ventana']
    m = ampliar(alfa_b, c, suave=0.5)
    lleno = ndimage.binary_fill_holes(m)
    fuera.append(ajustar_rrect(lleno, c[0], c[1]))
    hueco.append(ajustar_rrect(lleno & ~m, c[0], c[1]))
med = lambda L: float(np.mean(L))
W_O = med([f[2] - f[0] for f in fuera]); H_O = med([f[3] - f[1] for f in fuera])
R_O = med([f[4] for f in fuera]); R_I = med([h[4] for h in hueco])
I_L = med([h[0] - f[0] for h, f in zip(hueco, fuera)]); I_R = med([f[2] - h[2] for h, f in zip(hueco, fuera)])
I_T = med([h[1] - f[1] for h, f in zip(hueco, fuera)]); I_B = med([f[3] - h[3] for h, f in zip(hueco, fuera)])
Y_O = med([f[1] for f in fuera])
print('O: %.1f × %.1f, radio %.1f (IoU %.3f) · hueco: radio %.1f (IoU %.3f), paredes %.1f/%.1f, %.1f/%.1f'
      % (W_O, H_O, R_O, med([f[5] for f in fuera]), R_I, med([h[5] for h in hueco]), I_L, I_R, I_T, I_B))
for p, f in zip(os_, fuera):
    x = f[0]
    p['x_o'] = x
    p['contornos'] = [rrect(x, Y_O, x + W_O, Y_O + H_O, R_O),
                      rrect(x + I_L, Y_O + I_T, x + W_O - I_R, Y_O + H_O - I_B, R_I, inverso=True)]

for p in piezas:
    if p['tipo'] == 'o':
        continue
    c = p['ventana']
    if p['tipo'] == 's':
        p['contornos'] = potrace_a_segs(trazar(ampliar(alfa_b, c, suave=0.62), True), c[0], c[1], True)
    elif p['tipo'] == 'raya':
        o = min(os_, key=lambda q: abs(q['caja'][0] - p['caja'][0]))
        x = o['x_o']
        p['contornos'] = [poligono_a_segs([(x, 614.5), (x + W_O, 614.5), (x + W_O, 635.5), (x, 635.5)])]
    else:
        # Las rectas se REDIBUJAN con sus medidas. Calcadas, la línea gris de la sombra
        # se pega al bronce donde lo toca y deja mellas en la E, la A y la N. Las cifras
        # salen del polígono de potrace sobre el alfa limpio (python scripts/logo.py --medir).
        letra = next(k for k, (a, b) in RECTAS.items() if a <= p['caja'][0] < b)
        p['letra'] = letra
        p['contornos'] = [poligono_a_segs(v) for v in GEOMETRIA[letra]]
        if '--medir' in sys.argv:
            m = ampliar(alfa_b, c)
            cuadrado = np.ones((int(3.2 * ESC), int(3.2 * ESC)), bool)
            m = ndimage.binary_closing(ndimage.binary_opening(m, cuadrado), cuadrado)
            for s in potrace_a_segs(trazar(m, False), c[0], c[1], False, (CAP, BASE), tol=0.6):
                print('   medido', letra, ' '.join('(%.1f,%.1f)' % g[1] for g in s))
for p in piezas:
    p['d'] = segs_a_d(p['contornos'])
    print('%-6s x %d-%d  %d contornos  %d caracteres' % (p['tipo'], p['caja'][0], p['caja'][2], len(p['contornos']), len(p['d'])))
letras_d = ''.join(p['d'] for p in piezas)
sombra_d = ''.join(sombra_caras(p['contornos']) for p in piezas)

# ── «APARTAMENTOS», letra a letra (para poder animar el espaciado) ──
cajas_a = componentes(alfa_a > 0.35, 12)
assert len(cajas_a) == 12, 'APARTAMENTOS debería dar 12 letras y da %d' % len(cajas_a)
NOMBRES = list('APARTAMENTOS')
CURVAS_AP = set('PROS')
AP_T = float(np.median([c[1] for c, n in zip(cajas_a, NOMBRES) if n not in CURVAS_AP])) + .3
AP_B = float(np.median([c[3] for c, n in zip(cajas_a, NOMBRES) if n not in CURVAS_AP])) - .3
apart = []
for (x0, y0, x1, y1), letra in zip(cajas_a, NOMBRES):
    caja = (x0 - 3, y0 - 3, x1 + 3, y1 + 3)
    curvas = letra in CURVAS_AP
    m = ampliar(alfa_a, caja, suave=0.34)
    cont = potrace_a_segs(trazar(m, curvas), caja[0], caja[1], curvas, () if curvas else (AP_T, AP_B), tol=0.4)
    apart.append(dict(letra=letra, x=(x0 + x1) / 2, d=segs_a_d(cont)))

vb = lambda v: '%d %d %d %d' % v


def archivo(nombre, oscuro=False, corto=False):
    v = VB_CORTO if corto else VB
    x, y, w, h = v
    cl, cs, ca = (COL['letras_osc'], COL['sombra_osc'], COL['apart_osc']) if oscuro else (COL['letras'], COL['sombra'], COL['apart'])
    partes = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" role="img" aria-label="El Sótano · Apartamentos">' % vb(v),
              '<title>El Sótano · Apartamentos</title><defs>',
              '<path id="sot-letras" fill-rule="evenodd" d="%s"/>' % letras_d,
              '<mask id="sot-hueco" maskUnits="userSpaceOnUse" x="%d" y="%d" width="%d" height="%d">'
              '<rect x="%d" y="%d" width="%d" height="%d" fill="#fff"/>'
              '<use href="#sot-letras" fill="#000" stroke="#000" stroke-width="%.1f" stroke-linejoin="round"/></mask></defs>'
              % (x, y, w, h, x, y, w, h, HALO),
              '<g id="sombra" mask="url(#sot-hueco)"><path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"/></g>'
              % (sombra_d, cs, SOMBRA_GROSOR),
              '<g id="letras"><use href="#sot-letras" fill="%s"/></g>' % cl]
    if not corto:
        partes.append('<g id="apartamentos" fill="%s" fill-rule="evenodd">%s</g>' % (ca, ''.join('<path d="%s"/>' % a['d'] for a in apart)))
    partes.append('</svg>')
    with open(os.path.join(RAIZ, nombre), 'w', encoding='utf-8') as f:
        f.write(''.join(partes) + '\n')


os.makedirs(os.path.join(RAIZ, 'assets', 'logo'), exist_ok=True)
archivo('assets/logo/logo-el-sotano.svg')
archivo('assets/logo/logo-el-sotano-corto.svg', corto=True)
archivo('assets/logo/logo-el-sotano-oscuro.svg', oscuro=True)

# ── favicon: la «Sº» (la S y la última O con su raya, acercadas) sobre un cuadrado de cal ──
s_p = [p for p in piezas if p['tipo'] == 's'][0]
o_p = [p for p in piezas if p['tipo'] == 'o'][-1]
r_p = [p for p in piezas if p['tipo'] == 'raya'][-1]
dx = o_p['x_o'] - (s_p['caja'][2] + 9)          # la º a 9 u de la S
cx = (s_p['caja'][0] + o_p['x_o'] + W_O - dx) / 2
lado = 250
fx, fy = cx - lado / 2 - 3, 534 - lado / 2 + 5
desplazar = lambda segs: [tuple([g[0]] + [(q[0] - dx, q[1]) for q in g[1:]]) for g in segs]
cont_o = [desplazar(s) for s in o_p['contornos'] + r_p['contornos']]
fav_d = segs_a_d(s_p['contornos']) + segs_a_d(cont_o)
fav_s = sombra_caras(s_p['contornos']) + sombra_caras(o_p['contornos'] and cont_o[:2]) + sombra_caras(cont_o[2:])
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.1f %.1f %d %d">'
       '<defs><path id="f" fill-rule="evenodd" d="%s"/>'
       '<mask id="m" maskUnits="userSpaceOnUse" x="%.1f" y="%.1f" width="%d" height="%d"><rect x="%.1f" y="%.1f" width="%d" height="%d" fill="#fff"/>'
       '<use href="#f" fill="#000" stroke="#000" stroke-width="%.1f" stroke-linejoin="round"/></mask></defs>'
       '<rect x="%.1f" y="%.1f" width="%d" height="%d" rx="46" fill="#F7F4EF"/>'
       '<path mask="url(#m)" d="%s" fill="none" stroke="#7B7B7B" stroke-width="5" stroke-linejoin="round"/>'
       '<use href="#f" fill="#8F7049"/></svg>\n'
       % (fx, fy, lado, lado, fav_d, fx, fy, lado, lado, fx, fy, lado, lado, HALO + 3, fx, fy, lado, lado, fav_s))
with open(os.path.join(RAIZ, 'assets', 'favicon.svg'), 'w', encoding='utf-8') as f:
    f.write(fav)

capas = dict(viewBox=VB, viewBoxCorto=VB_CORTO, sombra=dict(desplazamiento=SOMBRA_D, grosor=SOMBRA_GROSOR, halo=HALO, d=sombra_d),
             letras=letras_d, apartamentos=[dict(letra=a['letra'], x=a['x'], d=a['d']) for a in apart])
os.makedirs(os.path.join(AQUI, 'fuentes'), exist_ok=True)
with open(os.path.join(AQUI, 'fuentes', 'logo-capas.json'), 'w', encoding='utf-8') as f:
    json.dump(capas, f)

# ── sprite para las páginas: sin fill en los paths de <defs> (lo pone cada <use>) y con fill-rule ──
sprite = ['<svg class="simbolos" aria-hidden="true" focusable="false"><defs>',
          '<path id="lg-letras" fill-rule="evenodd" d="%s"/>' % letras_d,
          '<path id="lg-sombra" d="%s"/>' % sombra_d]
for i, a in enumerate(apart):
    sprite.append('<path id="lg-ap-%d" fill-rule="evenodd" d="%s"/>' % (i, a['d']))
# símbolos estáticos (cabecera, contacto, pie): los colores entran por custom properties,
# que sí cruzan al árbol del <use>; los selectores de la página no
e_sombra = 'fill:none;stroke:var(--logo-sombra,#7B7B7B);stroke-width:%.1f;stroke-linejoin:round' % SOMBRA_GROSOR
e_letras = 'fill:var(--logo-letras,#8F7049);stroke:var(--logo-fondo,#FDFCFA);stroke-width:%.1f;stroke-linejoin:round;paint-order:stroke' % HALO
for idm, v, con_ap in (('lg-logo', VB, True), ('lg-logo-corto', VB_CORTO, False)):
    sprite.append('<symbol id="%s" viewBox="%s">' % (idm, vb(v)))
    sprite.append('<use href="#lg-sombra" style="%s"/>' % e_sombra)
    sprite.append('<use href="#lg-letras" style="%s"/>' % e_letras)
    if con_ap:
        sprite.append('<g style="fill:var(--logo-apart,#7B7B7B)">' + ''.join('<use href="#lg-ap-%d"/>' % i for i in range(len(apart))) + '</g>')
    sprite.append('</symbol>')
sprite.append('</defs></svg>')
bloque = '<!-- logo:inicio · generado por scripts/logo.py, no editar a mano -->\n' + ''.join(sprite) + '\n<!-- logo:fin -->'

for pagina in ('index.html', '404.html', 'aviso-legal.html', 'privacidad.html'):
    ruta = os.path.join(RAIZ, pagina)
    if not os.path.exists(ruta):
        continue
    t = open(ruta, encoding='utf-8').read()
    if '<!-- logo:inicio' not in t:
        print('sin marcas logo:inicio en', pagina)
        continue
    nuevo = re.sub(r'<!-- logo:inicio[^>]*-->.*?<!-- logo:fin -->', lambda _: bloque, t, count=1, flags=re.S)
    if len(nuevo) < len(t) * 0.6:
        sys.exit('Me niego: %s perdería demasiado' % pagina)
    if nuevo != t:
        open(ruta, 'w', encoding='utf-8', newline='').write(nuevo)
    print(('actualizado ' if nuevo != t else 'sin cambios ') + pagina)

# los SVG sueltos tienen que ser XML bien formado (un & suelto rompe el <img> sin avisar)
import xml.etree.ElementTree as ET
for n in ('assets/logo/logo-el-sotano.svg', 'assets/logo/logo-el-sotano-corto.svg', 'assets/logo/logo-el-sotano-oscuro.svg', 'assets/favicon.svg'):
    ET.parse(os.path.join(RAIZ, n))
print('letras %d · sombra %d · apartamentos %d caracteres · SVG válidos' % (len(letras_d), len(sombra_d), sum(len(a['d']) for a in apart)))
