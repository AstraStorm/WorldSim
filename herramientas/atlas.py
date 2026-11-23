# Recorta las hojas de ChatGPT, quita el magenta, reduce cada dibujo al tamaño del juego y lo junta todo en un atlas
# Salida: WorldSim/arte/atlas.png y WorldSim/js/arte_mapa.js (posición de cada sprite, ancla y llamas)
import json, numpy as np
from PIL import Image
from scipy import ndimage
SRC = r'C:\Users\axelc\OneDrive\Escritorio\Forja de Mundos - Prompts de arte\devueltos'
OUT_PNG = r'C:\Users\axelc\WorldSim\arte\atlas.png'
OUT_JS = r'C:\Users\axelc\WorldSim\js\arte_mapa.js'

def load(name):
    a = np.array(Image.open(f'{SRC}\\{name}').convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    fg = ~((r - g > 80) & (b - g > 80))
    fg = ndimage.binary_opening(fg, iterations=1)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    parts = []
    for k, sl in enumerate(ndimage.find_objects(lab)):
        area = int((lab[sl] == k + 1).sum())
        if area < 60: continue
        parts.append(dict(x0=sl[1].start, y0=sl[0].start, x1=sl[1].stop, y1=sl[0].stop, id=k + 1, area=area))
    return a, lab, parts
SHEETS = {}
def sheet(name):
    if name not in SHEETS: SHEETS[name] = load(name)
    return SHEETS[name]
def find(name, x, y):  # la pieza cuya caja contiene (o está más cerca de) ese punto de la hoja
    _, _, parts = sheet(name)
    return min(parts, key=lambda p: 0 if (p['x0'] <= x < p['x1'] and p['y0'] <= y < p['y1']) else 1e9 + abs((p['x0'] + p['x1']) / 2 - x) + abs((p['y0'] + p['y1']) / 2 - y))

def cut(name, pts, box=None):
    """Recorta las piezas que contienen esos puntos (o una caja fija) con su transparencia."""
    a, lab, _ = sheet(name)
    ps = [find(name, x, y) for x, y in pts]
    x0 = min(p['x0'] for p in ps); y0 = min(p['y0'] for p in ps); x1 = max(p['x1'] for p in ps); y1 = max(p['y1'] for p in ps)
    if box: x0, y0, x1, y1 = box
    keep = np.isin(lab[y0:y1, x0:x1], [p['id'] for p in ps])
    keep = ndimage.binary_dilation(keep, iterations=2) & ~((a[y0:y1, x0:x1, 0] - a[y0:y1, x0:x1, 1] > 80) & (a[y0:y1, x0:x1, 2] - a[y0:y1, x0:x1, 1] > 80))
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); rgba[..., :3] = a[y0:y1, x0:x1]; rgba[..., 3] = keep * 255
    return Image.fromarray(rgba, 'RGBA')

def shrink(img, w, colors=28):
    """Reduce al ancho del juego (el alto, en proporción), deja el borde nítido y pocos colores, como pixel art."""
    h = max(1, round(img.height * w / img.width))
    small = img.convert('RGBa').resize((w, h), Image.BOX).convert('RGBA')
    arr = np.array(small); alpha = arr[..., 3] >= 110
    rgb = Image.fromarray(arr[..., :3]).quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = np.array(rgb); out[..., 3] = alpha * 255
    return Image.fromarray(out, 'RGBA')

def flames(img, region, mode):
    """Quita las llamas pintadas (las anima el juego). region: fracciones (x0,y0,x1,y1) donde buscarlas.
    mode 'hole': se vuelven transparentes; 'dark': se tapan de oscuro (fuego dentro de un horno)."""
    a = np.array(img); h, w = a.shape[:2]
    X0, Y0, X1, Y1 = int(region[0] * w), int(region[1] * h), int(np.ceil(region[2] * w)), int(np.ceil(region[3] * h))
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    fire = (r > 190) & (g > 60) & (b < 120) & (r - b > 110) & (a[..., 3] > 0)
    m = np.zeros_like(fire); m[Y0:Y1, X0:X1] = fire[Y0:Y1, X0:X1]
    ys, xs = np.nonzero(m)
    if not len(xs): return img, None
    if mode == 'hole': a[m, 3] = 0
    else: a[m, :3] = (42, 26, 16)
    return Image.fromarray(a, 'RGBA'), [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]

S = {}  # clave → dict(img, ax, fl)
def add(key, img, ax=None, fl=None): S[key] = dict(img=img, ax=ax if ax is not None else img.width // 2, fl=fl)

# ---- Edificios ----
H2, H3A, H3B, H4, H5A, H5B = 'hoja_02_edificios_basicos.png', 'hoja_03A.png', 'hoja_03B.png', 'hoja_04A.png', 'hoja_05A.png', 'hoja_05B.png'
B = [  # clave, hoja, puntos de las piezas, ancho en el juego
  ('house:hut', H2, [(260, 300)], 28), ('house:piedra', H2, [(760, 300)], 28), ('well:pozo', H2, [(1270, 300)], 18),
  ('store:almacen', H2, [(250, 830)], 36), ('tower:torre', H2, [(1290, 760)], 20),
  ('hall:ayuntamiento', H3A, [(260, 300)], 48), ('market:mercado', H3A, [(600, 350), (760, 350), (930, 350)], 44), ('bank:banco', H3A, [(1270, 320)], 36),
  ('hospital:hospital', H3A, [(260, 800)], 32), ('school:escuela', H3A, [(760, 770)], 48), ('tavern:taberna', H3A, [(1250, 790)], 40),
  ('theater:teatro', H3B, [(290, 310)], 52), ('coliseum:coliseo', H3B, [(760, 320)], 56), ('barracks:cuartel', H3B, [(1240, 300)], 44),
  ('tradehall:lonja', H3B, [(290, 790)], 44), ('quarry:cantera', H3B, [(1240, 780)], 46),
  ('temple:templo', H4, [(760, 300)], 40), ('obelisk:monumento', H4, [(1260, 300)], 18),
  ('cathedral:catedral', H4, [(270, 750)], 56), ('cathedral:panteon', H4, [(760, 790)], 60),
  ('wonder:republica', H5A, [(240, 370)], 54), ('wonder:monarquia', H5A, [(630, 340)], 62), ('wonder:dictadura', H5A, [(970, 350)], 38), ('wonder:comunismo', H5A, [(1300, 330)], 42),
  ('wonder:fascismo', H5B, [(300, 370)], 58), ('wonder:socialismo', H5B, [(770, 380)], 66), ('wonder:teocracia', H5B, [(1240, 350)], 62),
]
for key, sh, pts, w in B: add(key, shrink(cut(sh, pts), w))
# Con fuego: la llama se quita y la pinta el juego, animada
img, fl = flames(shrink(cut(H4, [(270, 330)]), 16), (0, 0, 1, .45), 'hole'); add('altar:altar', img, fl=fl)
img, fl = flames(shrink(cut(H4, [(1260, 780)]), 60), (.3, 0, .7, .25), 'hole'); add('cathedral:zigurat', img, fl=fl)
img, fl = flames(shrink(cut(H3B, [(760, 800)]), 28), (.4, .35, .85, .95), 'dark'); add('forge:herreria', img, fl=fl)  # (sin el humo: es otra pieza)
# Molino: la torre y, aparte, las aspas (el juego las hace girar)
add('mill:molino', shrink(cut(H2, [(680, 800)]), 20)); add('mill:aspas', shrink(cut(H2, [(910, 795)], box=(798, 685, 1022, 909)), 21, 12)) # cuadrado centrado en el buje: gira sobre sí mismo

# ---- Naturaleza (hoja_06: cada árbol con su versión desnuda al lado) ----
H6 = 'hoja_06.png'
T6 = [  # clave, punto del árbol con hojas, punto del desnudo (o None), ancho
  ('oak:forest', (80, 140), (160, 140), 24), ('pine:pine', (300, 140), None, 21), ('pine:snow', (497, 140), None, 25), ('acacia:dry', (700, 145), (797, 145), 33),
  ('birch:birch', (80, 295), (168, 300), 23), ('pine:blue', (305, 295), None, 25), ('willow:swamp', (500, 300), (585, 305), 28), ('palm:palm', (708, 300), None, 13),
  ('palm:coco', (82, 455), None, 13), ('oak:cherry', (293, 455), (380, 460), 30), ('pine:autumn', (498, 450), (574, 450), 21), ('acacia:sunset', (700, 455), (797, 460), 37),
  ('willow:moss', (82, 607), (170, 610), 28), ('cactus:cactus', (304, 608), None, 8), ('cactus:bloom', (500, 606), None, 11),
  ('ancient:elder', (980, 175), None, 40), ('ancient:frost', (1170, 178), None, 38), ('ancient:baobab', (1353, 178), None, 39), ('ancient:mangrove', (1528, 180), None, 38), ('ancient:life', (978, 395), None, 40),
]
for key, p, bare, w in T6:
    add(key, shrink(cut(H6, [p]), w, 24))
    if bare: add(key + ':bare', shrink(cut(H6, [bare]), w, 16))
for key, p, w in [('bush:red', (1169, 405), 11), ('bush:blueb', (1343, 405), 11), ('bush:goldb', (1522, 405), 11), ('bush:moon', (978, 590), 11), ('bush:empty', (1167, 590), 11),
                  ('rock:stone', (1732, 262), 8), ('big:stone', (1898, 250), 11), ('ore:iron', (2073, 250), 11), ('ore:gold', (1732, 469), 11), ('gem:amethyst', (1902, 469), 10), ('gem:mana', (2074, 464), 9)]:
    add(key, shrink(cut(H6, [p]), w, 16))
# ---- Cosas del mapa ----
H7 = 'hoja_07A.png'
add('fire:camp', shrink(cut(H7, [(163, 197)]), 11, 12))
add('camp:tienda', shrink(cut(H7, [(468, 1105)]), 16, 16)); add('camp:estera', shrink(cut(H7, [(779, 1116)]), 11, 12))
# Animaciones: los fotogramas, recortados con la misma caja para que no bailen
def frames(name, cols, rows, w, skip_small=True):
    a, lab, parts = sheet(name); H, Wd = a.shape[:2]; cw, ch = Wd / cols, H / rows; out = []
    cells = []
    for r in range(rows):
        for c in range(cols):
            ps = [p for p in parts if c * cw <= (p['x0'] + p['x1']) / 2 < (c + 1) * cw and r * ch <= (p['y0'] + p['y1']) / 2 < (r + 1) * ch and p['area'] > 5000]
            cells.append((c * cw, r * ch, ps))
    rx0 = min(min(p['x0'] for p in ps) - cx for cx, cy, ps in cells); ry0 = min(min(p['y0'] for p in ps) - cy for cx, cy, ps in cells)
    rx1 = max(max(p['x1'] for p in ps) - cx for cx, cy, ps in cells); ry1 = max(max(p['y1'] for p in ps) - cy for cx, cy, ps in cells)
    for cx, cy, ps in cells:
        box = (int(cx + rx0), int(cy + ry0), int(cx + rx1), int(cy + ry1))
        pt = ((ps[0]['x0'] + ps[0]['x1']) // 2, (ps[0]['y0'] + ps[0]['y1']) // 2)
        out.append(shrink(cut(name, [((p['x0'] + p['x1']) // 2, (p['y0'] + p['y1']) // 2) for p in ps], box), w, 16))
    return out
for k, f in enumerate(frames('barco.png', 4, 2, 30)): add(f'boat:{k}', f)
for k, f in enumerate(frames('catapulta.png', 4, 2, 18)): add(f'catapult:{k}', f)

# ---- Atlas: en filas, con 1 píxel de separación ----
keys = list(S); W = 512; x = y = rowh = 0; pos = {}
for k in sorted(keys, key=lambda k: -S[k]['img'].height):
    im = S[k]['img']
    if x + im.width + 1 > W: x = 0; y += rowh + 1; rowh = 0
    pos[k] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
atlas = Image.new('RGBA', (W, y + rowh + 1), (0, 0, 0, 0))
for k, (px, py) in pos.items(): atlas.paste(S[k]['img'], (px, py))
import os; os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True); atlas.save(OUT_PNG, optimize=True)
mapa = {k: [pos[k][0], pos[k][1], S[k]['img'].width, S[k]['img'].height, S[k]['ax']] + ([S[k]['fl']] if S[k]['fl'] else []) for k in keys}
open(OUT_JS, 'w', encoding='utf-8', newline='').write('// Forja de Mundos · Mapa del atlas de arte (generado: no editar a mano). clave: [x, y, ancho, alto, ancla x, llamas?]\nconst ART_MAP = ' + json.dumps(mapa, separators=(',', ':')) + ';\n')
print(len(keys), 'sprites · atlas', atlas.size)
for k in ['house:hut', 'altar:altar', 'cathedral:zigurat', 'forge:herreria', 'mill:aspas', 'boat:0', 'catapult:0', 'oak:forest']: print(k, mapa[k])
