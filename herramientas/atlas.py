# Recorta las hojas de ChatGPT, quita el magenta, reduce cada dibujo al tamaño del juego y lo junta todo en un atlas
# Salida: WorldSim/arte/atlas.png y WorldSim/js/arte_mapa.js (posición de cada sprite, ancla y llamas)
import json, os, numpy as np
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
  ('oak:forest', (80, 140), (160, 140), 24), ('pine:pine', (300, 140), (376, 138), 21), ('pine:snow', (497, 140), (570, 138), 25), ('acacia:dry', (700, 145), (797, 145), 33),
  ('birch:birch', (80, 295), (168, 300), 23), ('pine:blue', (305, 295), (376, 296), 25), ('willow:swamp', (500, 300), (585, 305), 28), ('palm:palm', (708, 300), (800, 305), 13),
  ('palm:coco', (82, 455), (162, 459), 13), ('oak:cherry', (293, 455), (380, 460), 30), ('pine:autumn', (498, 450), (574, 450), 21), ('acacia:sunset', (700, 455), (797, 460), 37),
  ('willow:moss', (82, 607), (170, 610), 28), ('cactus:cactus', (304, 608), (376, 608), 8), ('cactus:bloom', (500, 606), (569, 610), 11),
  ('ancient:elder', (980, 175), None, 40), ('ancient:frost', (1170, 178), None, 38), ('ancient:baobab', (1353, 178), None, 39), ('ancient:mangrove', (1528, 180), None, 38), ('ancient:life', (978, 395), None, 40),
]
def trunk_clean(img):  # motas rosas o verdes sueltas en el tronco (restos de la reducción): color de tronco
    a = np.array(img); h = a.shape[0]; r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    low = np.zeros_like(r, bool); low[int(h * .62):] = True
    stray = low & (a[..., 3] > 0) & (r > 190) & (b > 140) & (g < r - 20)
    a[stray, :3] = (110, 70, 36); return Image.fromarray(a, 'RGBA')
for key, p, bare, w in T6:
    img = shrink(cut(H6, [p]), w, 24); add(key, trunk_clean(img) if key == 'oak:cherry' else img)
    if bare: # el desnudo, a la misma altura que el vivo (si no, los troncos estrechos salían gigantes)
        b = cut(H6, [bare]); bw = max(3, min(w, round(b.width * img.height / b.height)))
        add(key + ':bare', shrink(b, bw, 16))
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

# ---- Texturas que se repiten (campos, murallas, puentes): tamaño exacto, sin conservar proporción ----
def tex(name, box, w, h, opaque=False, colors=16):
    x0, y0, x1, y1 = box; img = cut(name, [((x0 + x1) // 2, (y0 + y1) // 2)], box=box)
    small = img.convert('RGBa').resize((w, h), Image.BOX).convert('RGBA'); arr = np.array(small)
    alpha = np.ones(arr.shape[:2], bool) if opaque else arr[..., 3] >= 110
    rgb = Image.fromarray(arr[..., :3]).quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = np.array(rgb); out[..., 3] = alpha * 255
    return Image.fromarray(out, 'RGBA')
H7B = 'hoja_07B.png'
for k, (x, y) in {'arada':(131, 133), 'sembrado':(430, 134), 'brotes':(731, 134), 'trigo':(1031, 133), 'maiz':(131, 430), 'mijo':(430, 431), 'muerta':(731, 431), 'huerta':(1031, 432)}.items():
    add('tex:' + k, tex(H7B, (x + 10, y + 10, x + 84, y + 84), 10, 10, True, 12))
# Murallas: tramos horizontales (se repiten a lo ancho) y verticales (a lo alto)
add('tex:empalizada_h', tex(H7, (695, 439, 786, 538), 9, 10)) # tres troncos afilados (se repiten)
add('tex:empalizada_v', tex(H7, (1072, 391, 1120, 564), 6, 18))
add('tex:piedra_h', tex(H7, (380, 752, 563, 833), 15, 9))
add('tex:piedra_v', tex(H7, (750, 704, 819, 857), 7, 15))
# Puentes: tablero con barandillas (sin los postes de los extremos)
add('tex:puente_h', tex(H7, (398, 141, 545, 252), 10, 9)); add('tex:puente_v', tex(H7, (733, 102, 835, 247), 9, 10))
add('tex:puente_h5', tex(H7, (398, 141, 545, 252), 10, 5)); add('tex:puente_v5', tex(H7, (733, 102, 835, 247), 5, 10))
# Puertas de la muralla: cerradas y abiertas (de piedra y de madera)
HP = 'puertas.png'
add('gate:piedra', shrink(cut(HP, [(220, 250)]), 14, 14)); add('gate:piedra_abierta', shrink(cut(HP, [(1550, 250)]), 14, 14))
add('gate:madera', shrink(cut(HP, [(220, 690)]), 14, 14)); add('gate:madera_abierta', shrink(cut(HP, [(1020, 690), (1195, 690)]), 14, 14))  # (entreabierta: se ven las hojas)

# Cementerio, vallas y antorchas (hoja 07B)
add('tumba:lapida', shrink(cut(H7B, [(177, 784)]), 6, 12)); add('tumba:flores', shrink(cut(H7B, [(477, 784)]), 8, 12)); add('tumba:estela', shrink(cut(H7B, [(777, 772)]), 6, 12))
add('tex:valla_h', tex(H7B, (984, 752, 1094, 802), 10, 5)); add('tex:valla_v', tex(H7B, (1142, 718, 1176, 834), 3, 10))
add('antorcha:encendida', shrink(cut(H7B, [(774, 1066)]), 4, 10)); add('antorcha:apagada', shrink(cut(H7B, [(1077, 1066)]), 4, 10))

# ---- Globos: globo, cesta, plataforma, palo de la manga, la manga según la fuerza del viento (de recta a colgando) y rachas de viento ----
HG = 'globos_pista_controladorViento.png'
add('balloon:globo', shrink(cut(HG, [(265, 245)]), 28, 20)); add('balloon:cesta', shrink(cut(HG, [(660, 330)]), 13, 16))
add('aero:pista', shrink(cut(HG, [(205, 660)]), 45, 20)); add('aero:palo', shrink(cut(HG, [(505, 640)]), 12, 12), ax=2)
K = 12 / 172  # la misma escala que el palo, para que la manga encaje en su brazo
for k, (x, y) in enumerate([(705, 643), (900, 625), (1080, 655), (1252, 677), (1425, 678)]):
    p = find(HG, x, y); add(f'sock:{k}', shrink(cut(HG, [(x, y)]), max(4, round((p['x1'] - p['x0']) * K)), 12), ax=0)
def box_cut(name, box):  # todas las piezas que caen dentro de la caja (las rachas de viento vienen a trozos)
    _, _, parts = sheet(name); x0, y0, x1, y1 = box
    ps = [((p['x0'] + p['x1']) // 2, (p['y0'] + p['y1']) // 2) for p in parts if x0 <= (p['x0'] + p['x1']) / 2 < x1 and y0 <= (p['y0'] + p['y1']) / 2 < y1]
    return cut(name, ps, box)
for k, bx in enumerate([(90, 865, 225, 940), (325, 855, 535, 935), (620, 835, 835, 955), (915, 830, 1130, 960), (1225, 830, 1450, 970)]):
    add(f'wind:{k}', shrink(box_cut(HG, bx), max(6, round((bx[2] - bx[0]) * .07)), 6))

# ---- Instituciones: tribunal, cárcel, imprenta, casa del sindicato, parlamento y academia de la lengua ----
HI = 'instituciones.png'
for key, pt, w in [('court:tribunal', (260, 290), 40), ('jail:carcel', (770, 300), 34), ('press:imprenta', (1260, 300), 38),
                   ('union:sindicato', (260, 820), 38), ('parliament:parlamento', (770, 830), 54), ('academy:academia', (1270, 820), 40)]:
    add(key, shrink(cut(HI, [pt]), w))

# ---- Maravillas de los regímenes nuevos (hoja 9B) ----
H9B = '9B.png'
for key, pt, w in [('wonder:democracia', (260, 330), 54), ('wonder:partitocracia', (770, 300), 54), ('wonder:monarquia_parlamentaria', (1280, 300), 62),
                   ('wonder:oligarquia', (260, 800), 54), ('wonder:tecnocracia', (770, 800), 48), ('wonder:anarquia', (1280, 820), 46)]:
    add(key, shrink(cut(H9B, [pt]), w))
# ---- Mina (hoja «mina.png», o cualquiera de «devueltos» con «mina» en el nombre): todas sus piezas juntas ----
import glob
for f in glob.glob(os.path.join(SRC, '*mina*.png')):
    name = os.path.basename(f); _, _, parts = sheet(name)
    add('mine:mina', shrink(cut(name, [((p['x0'] + p['x1']) // 2, (p['y0'] + p['y1']) // 2) for p in parts if p['area'] > 300]), 52, 64)); break

# ---- Universidad, palacio del Consejo y casa de espías (hoja 10, si ya está) ----
H10 = next((n for n in ['hoja_10_ciencia.png', '10.png'] if os.path.exists(os.path.join(SRC, n))), None)
if H10:
    for key, pt, w in [('university:universidad', (256, 300), 50), ('council:consejo', (768, 300), 62), ('spy:espias', (1280, 320), 30)]:
        add(key, shrink(cut(H10, [pt]), w))

# ---- Vida cotidiana (hoja 11, si ya está): granero, ahumadero, leñera, casa de postas, mansión y chabola ----
H11 = next((n for n in ['11.png', 'hoja_11.png'] if os.path.exists(os.path.join(SRC, n))), None)
if H11:
    for key, cell, w in [('granary:granero', (0, 0), 34), ('smoke:ahumadero', (1, 0), 32), ('woodshed:lenera', (2, 0), 32),
                         ('post:postas', (0, 1), 40), ('house:mansion', (1, 1), 40), ('house:chabola', (2, 1), 22)]:
        _, _, parts = sheet(H11); x0, y0 = cell[0] * 512, cell[1] * 512
        pts = [((p['x0'] + p['x1']) // 2, (p['y0'] + p['y1']) // 2) for p in parts if x0 <= (p['x0'] + p['x1']) / 2 < x0 + 512 and y0 <= (p['y0'] + p['y1']) / 2 < y0 + 512 and p['area'] > 150]
        add(key, shrink(cut(H11, pts), w)) # todas las piezas de su casilla (sacos, humo, el caballo), recortadas justas

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
