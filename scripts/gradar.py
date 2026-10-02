"""Gradación común de las 43 fotos de Booking de El Sótano (memoria «food photo consistency»).

Hay dos tandas que no casan entre sí:
  · febrero-marzo (Nº 1, Nº 4 y Nº 3): fotos de móvil de 2048 px, blancos fríos
    y azulados, gran angular;
  · abril (Nº 2, el patio, la fachada y el pasillo): 3000 px, más contrastadas
    y algo amarillas bajo los focos.
La receta iguala el TONO sin tocar lo que hay en la foto: ni cambios de fondo,
ni recortes que escondan nada, ni desenfoques (son estancias, y desenfocarlas
mentiría sobre cómo son).

  1. Balance por «parche blanco»: los píxeles claros y poco saturados (paredes,
     techos, sábanas) se llevan hacia la cal cálida #F7F4EF. La fuerza depende
     de cuántos neutros haya.
  2. Brillo medio igualado hacia un objetivo común, sin quemar luces.
  3. Tono común: curva en S suave, sombras hacia la tinta #2B211C y luces hacia
     la cal; el negro se levanta un poco (nunca negro puro).
  4. Saturación contenida, y algo más en los naranjas y rojos (el barro, la
     madera, la puerta de la vidriera) y en el azul del sofá, que en las fotos
     de abril salen chillones.

Entrada: apartamentos-el-sotano-badajoz-bocetos/ref/booking/<id>.jpg (originales, no se tocan)
Salida:  scripts/fuentes/graduadas/<id>.jpg (máster a tamaño original, q 94)
Después: node scripts/fotos.mjs saca las versiones AVIF/WebP/JPG.

  python scripts/gradar.py            (todas)
  python scripts/gradar.py 670608186  (una, para probar)
"""
import os, sys, glob
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.normpath(os.path.join(AQUI, '..', '..', 'apartamentos-el-sotano-badajoz-bocetos', 'ref', 'booking'))
DESTINO = os.path.join(AQUI, 'fuentes', 'graduadas')
os.makedirs(DESTINO, exist_ok=True)

CAL = np.array([247, 244, 239]) / 255.0
TINTA = np.array([43, 33, 28]) / 255.0


def a_lineal(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def a_srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def tono(x):
    """matiz en grados (0-360) de una imagen RGB 0-1"""
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    mx, mn = x.max(-1), x.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return h * 60


def gradar(ruta):
    im = Image.open(ruta).convert('RGB')
    x = np.asarray(im).astype(np.float64) / 255.0
    lin = a_lineal(x)
    lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    mx, mn = x.max(-1), x.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)

    # 1 · parche blanco: claros (percentil 78-99,5 de luminancia) y poco saturados
    p78, p995 = np.percentile(lum, 78), np.percentile(lum, 99.5)
    neutros = (lum > p78) & (lum < p995) & (sat < 0.2)
    cuota = neutros.mean()
    if cuota > 0.004:
        medio = lin[neutros].mean(0)
        objetivo = a_lineal(CAL) * (medio.mean() / a_lineal(CAL).mean())
        ganancia = objetivo / np.maximum(medio, 1e-4)
        fuerza = float(np.clip(cuota / 0.05, 0.3, 0.9))
        ganancia = np.clip(1 + (ganancia - 1) * fuerza, 0.84, 1.2)
        lin = lin * ganancia
    x = np.clip(a_srgb(np.clip(lin, 0, 1)), 0, 1)

    # 2 · brillo medio común (gamma sobre la mediana, sin quemar)
    L = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    g = np.clip(np.log(0.58) / np.log(max(np.median(L), 1e-3)), 0.84, 1.16)
    x = np.power(x, g)

    # 3 · tono común: S suave + sombras a la tinta + luces a la cal
    L = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    s_curva = L + 0.085 * np.sin(np.pi * (L - 0.5)) * (1 - np.abs(2 * L - 1)) * 1.6
    x = x * (np.clip(s_curva, 0, 1) / np.maximum(L, 1e-4))[..., None]
    L = np.clip(0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2], 0, 1)
    sombra = np.clip(1 - L / 0.42, 0, 1) ** 1.6
    luz = np.clip((L - 0.62) / 0.38, 0, 1) ** 1.4
    x = x * (1 + sombra[..., None] * (TINTA / TINTA.mean() - 1) * 0.08 + luz[..., None] * (CAL / CAL.mean() - 1) * 0.6)
    x = TINTA * 0.5 + x * (1 - TINTA * 0.5)

    # 4 · saturación contenida; más en barro/madera (naranjas, rojos) y en el azul chillón
    L = (0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2])[..., None]
    mx, mn = x.max(-1), x.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    h = tono(x)
    calidos = np.clip(1 - np.abs(((h - 22 + 180) % 360) - 180) / 28, 0, 1)      # 0-50º: barro, madera
    azules = np.clip(1 - np.abs(((h - 215 + 180) % 360) - 180) / 30, 0, 1)
    vivos = np.clip((sat - 0.35) / 0.4, 0, 1)
    factor = 0.9 - 0.12 * vivos - (0.08 * calidos + 0.1 * azules) * np.clip(sat / 0.4, 0, 1)
    x = L + (x - L) * factor[..., None]

    return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))


if __name__ == '__main__':
    ids = sys.argv[1:] or [os.path.splitext(os.path.basename(p))[0] for p in sorted(glob.glob(os.path.join(ORIGEN, '[0-9]*.jpg')))]
    for i in ids:
        out = gradar(os.path.join(ORIGEN, i + '.jpg'))
        out.save(os.path.join(DESTINO, i + '.jpg'), quality=94, subsampling=0)
    print(len(ids), 'fotos graduadas en', DESTINO)
