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

# ---- Deportes (sedes_deportes.png): estadio de fútbol, piscina y estadio de atletismo (la fila de abajo no se usa) ----
H12 = next((n for n in ['sedes_deportes.png', '12.png'] if os.path.exists(os.path.join(SRC, n))), None)
if H12:
    for key, cell, w in [('sport:futbol', (0, 0), 74), ('sport:natacion', (1, 0), 66), ('sport:atletismo', (2, 0), 78)]:
        _, _, parts = sheet(H12); x0, y0 = cell[0] * 512, cell[1] * 512
        pts = [((p['x0'] + p['x1']) // 2, (p['y0'] + p['y1']) // 2) for p in parts if x0 <= (p['x0'] + p['x1']) / 2 < x0 + 512 and y0 <= (p['y0'] + p['y1']) / 2 < y0 + 512 and p['area'] > 150]
        add(key, shrink(cut(H12, pts), w, 64))

# ---- Era industrial (hojas 13A, 13B y 13C) ----
def box_parts(name, box, min_area=80):  # todas las piezas cuyo centro cae en la caja (sin el marco de la casilla)
    _, _, parts = sheet(name); x0, y0, x1, y1 = box
    return cut(name, [((p['x0'] + p['x1']) // 2, (p['y0'] + p['y1']) // 2) for p in parts if x0 <= (p['x0'] + p['x1']) / 2 < x1 and y0 <= (p['y0'] + p['y1']) / 2 < y1 and p['area'] > min_area])
if os.path.exists(os.path.join(SRC, '13A.png')):
    for key, box, w in [('station:estacion', (60, 230, 470, 470), 44), ('factory:fabrica', (560, 160, 980, 470), 44), ('clock:reloj', (1190, 80, 1360, 470), 12),
                        ('observatory:observatorio', (150, 690, 360, 930), 24), ('embassy:embajada', (600, 690, 920, 930), 32),
                        ('ruin:ruinas_a', (1050, 720, 1270, 930), 26), ('ruin:ruinas_b', (1275, 790, 1480, 930), 22)]:
        add(key, shrink(box_parts('13A.png', box), w, 48))
if os.path.exists(os.path.join(SRC, '13B.png')):  # los grandes de la izquierda de cada fila (miran a la derecha)
    for key, box, w in [('train:locomotora', (22, 25, 250, 178), 22), ('train:vagon_p', (22, 210, 250, 340), 22), ('train:vagon_m', (22, 375, 250, 505), 21),
                        ('airship:dirigible', (22, 530, 250, 668), 34), ('ship:galeon', (22, 688, 250, 835), 28), ('ship:vapor', (22, 860, 250, 1005), 30)]:
        add(key, shrink(box_parts('13B.png', box, 40), w, 48))
if os.path.exists(os.path.join(SRC, '13C.png')):
    add('tex:carretera', tex('13C.png', (95, 112, 305, 160), 22, 5, True, 12)) # solo los adoquines (el bordillo lo pone el juego)
    # Vía del tren por casillas: recta, cruce, desvío (en T, con el ramal hacia abajo; el juego lo gira) y curvas (N = arriba, E = derecha...)
    for key, box in [('rail:h', (868, 92, 948, 175)), ('rail:v', (853, 252, 937, 334)), ('rail:x', (1335, 95, 1417, 177)), ('rail:t', (1068, 236, 1150, 318)),
                     ('rail:nw', (838, 425, 965, 545)), ('rail:se', (1000, 425, 1120, 545)), ('rail:sw', (1160, 425, 1290, 545)), ('rail:ne', (1325, 425, 1452, 545))]:
        add(key, tex('13C.png', box, 12, 12, False, 20)) # (12 px: se dibujan en una casilla de 5, con más detalle)
    add('fair:puesto', shrink(box_parts('13C.png', (200, 620, 620, 940)), 20, 40)); add('camp:oro', shrink(box_parts('13C.png', (860, 620, 1380, 940)), 32, 48))

# ---- Papeles y campos (hojas 14A y 14B) ----
if os.path.exists(os.path.join(SRC, '14A.png')):
    for key, box, w in [('civic:registro', (100, 130, 420, 500), 30), ('camp:centro', (520, 240, 990, 500), 40), ('camp:cantera', (1030, 190, 1510, 500), 40),
                        ('camp:barracon', (90, 780, 430, 985), 18), ('camp:torre', (650, 590, 870, 985), 12), ('house:okupada', (1100, 700, 1420, 985), 28)]:
        add(key, shrink(box_parts('14A.png', box), w, 40))
if os.path.exists(os.path.join(SRC, '14B.png')):  # iconos para la ficha (no van al atlas): arte/papeles/*.png
    dst = os.path.join(os.path.dirname(OUT_PNG), 'papeles'); os.makedirs(dst, exist_ok=True)
    for name, box, w in [('dni', (70, 150, 460, 410), 40), ('pasaporte', (610, 95, 900, 470), 22), ('pasaporte_abierto', (1015, 135, 1495, 450), 44),
                         ('permiso', (120, 560, 420, 985), 26), ('contrato', (540, 565, 970, 960), 32), ('sello', (1030, 600, 1500, 930), 38)]:
        shrink(box_parts('14B.png', box), w, 32).save(os.path.join(dst, name + '.png'), optimize=True)

if os.path.exists(os.path.join(SRC, 'plataforma, diriglbes.png')):  # plataforma elevada de los dirigibles (sustituye a la pista de los globos)
    add('aero:plataforma', shrink(box_parts('plataforma, diriglbes.png', (200, 150, 1340, 900)), 47, 40))

if os.path.exists(os.path.join(SRC, 'pisos.png')):  # bloques de pisos (era industrial): de 2 a 6 plantas, de izquierda a derecha
    for k, (box, w) in enumerate([((60, 300, 345, 724), 28), ((380, 260, 680, 724), 30), ((740, 200, 1095, 724), 34), ((1170, 120, 1540, 724), 36), ((1620, 40, 2070, 724), 40)]):
        add(f'house:bloque{k + 1}', shrink(box_parts('pisos.png', box), w, 40))

if os.path.exists(os.path.join(SRC, 'ventanaPisoOkupada.png')):  # la ventana de un piso okupado (se pinta encima de los bloques)
    add('okupa:ventana', shrink(box_parts('ventanaPisoOkupada.png', (240, 230, 1010, 1010)), 9, 40))

if os.path.exists(os.path.join(SRC, 'torreElectrica_GeneradorElectricoCarbon.png')):  # electricidad: torre de alta tensión y central de carbón
    add('pylon:torre', shrink(box_parts('torreElectrica_GeneradorElectricoCarbon.png', (240, 10, 680, 720)), 14, 40))
    add('power:central', shrink(box_parts('torreElectrica_GeneradorElectricoCarbon.png', (960, 120, 1880, 700)), 52, 40))

if os.path.exists(os.path.join(SRC, 'pozoPetrolero.png')):  # petróleo: el balancín del pozo en 8 fotogramas (fila de arriba)
    for k in range(8):
        add(f'oil:pozo{k}', shrink(box_parts('pozoPetrolero.png', (int((560 + 180 * k) * 1.086), 20, int((752 + 180 * k) * 1.086), 250)), 22, 40))
if os.path.exists(os.path.join(SRC, 'pozoPetroleroAcuatico.png')):
    add('oil:plataforma', shrink(box_parts('pozoPetroleroAcuatico.png', (240, 40, 1290, 970)), 44, 40))
if os.path.exists(os.path.join(SRC, 'refineriaPetrolera.png')):
    add('oil:refineria', shrink(box_parts('refineriaPetrolera.png', (70, 70, 830, 660)), 46, 40))
if os.path.exists(os.path.join(SRC, 'camion.png')):  # el camión, en 8 direcciones (a la misma escala: el de lado mide 16)
    for d, box, w in [('n', (680, 40, 860, 335), 8), ('ne', (1100, 40, 1370, 330), 12), ('e', (1065, 365, 1420, 600), 16), ('se', (1090, 620, 1380, 940), 13),
                      ('s', (665, 630, 870, 960), 9), ('so', (150, 620, 440, 940), 13), ('o', (115, 365, 470, 600), 16), ('no', (175, 40, 435, 330), 12)]:
        add(f'truck:{d}', shrink(box_parts('camion.png', box), w, 40))

if os.path.exists(os.path.join(SRC, 'barcoCarguero.png')):  # el carguero: lleno y vacío, de lado (proa a la derecha) y de frente
    S9 = 1.086
    for k, box, w in [('lleno', (60, 30, 730, 345), 40), ('vacio', (770, 30, 1445, 345), 40), ('lleno_f', (1490, 160, 1715, 505), 13), ('vacio_f', (1740, 160, 1965, 505), 13)]:
        add(f'cargo:{k}', shrink(box_parts('barcoCarguero.png', tuple(int(c * S9) for c in box)), w, 40))

if os.path.exists(os.path.join(SRC, 'panelSolar.png')):  # placa solar
    add('solar:placa', shrink(box_parts('panelSolar.png', (60, 270, 730, 910)), 14, 40))
if os.path.exists(os.path.join(SRC, 'turbinaEolica.png')):  # molino eólico: torre (con la góndola) y las aspas en 8 fotogramas
    add('wind:torre', shrink(box_parts('turbinaEolica.png', (560, 160, 720, 640)), 6, 40))
    add('wind:gondola', shrink(box_parts('turbinaEolica.png', (750, 170, 905, 330)), 5, 40))
    for k, box in enumerate([(990, 205, 1135, 360), (1130, 230, 1260, 350), (1225, 245, 1350, 385), (1345, 250, 1500, 390), (1015, 480, 1140, 635), (1120, 480, 1240, 625), (1235, 500, 1370, 635), (1350, 470, 1500, 605)]):
        add(f'wind:aspas{k}', shrink(box_parts('turbinaEolica.png', box), 15, 40))

if os.path.exists(os.path.join(SRC, 'casino.png')):
    add('casino:casino', shrink(box_parts('casino.png', (380, 190, 1150, 830)), 40, 48))

# ---- Fábricas de la revolución industrial (fabricas.png: 2 filas de 5) y extractora de agua ----
if os.path.exists(os.path.join(SRC, 'fabricas.png')):
    for k, name in enumerate(['textil', 'curtiduria', 'hierro', 'carbon', 'aserradero', 'cantera', 'peleteria', 'oro', 'alfareria', 'joyeria']):
        c, r = k % 5, k // 5
        add('fac:' + name, shrink(box_parts('fabricas.png', (c * 307, 130 + r * 390, (c + 1) * 307, 480 + r * 390)), 34, 48))
if os.path.exists(os.path.join(SRC, 'extractoraagua.png')):
    add('pump:extractora', shrink(box_parts('extractoraagua.png', (300, 70, 1240, 930)), 38, 48))

# ---- Castillos (castillos.png: 3 arriba y 3 abajo) ----
if os.path.exists(os.path.join(SRC, 'castillos.png')):
    for k, (name, w) in enumerate([('empalizada', 54), ('torre', 52), ('concentrico', 62), ('foso', 60), ('roca', 56), ('palacio', 64)]):
        c, r = k % 3, k // 3
        add('castle:' + name, shrink(box_parts('castillos.png', (c * 512, 80 + r * 450, (c + 1) * 512, 500 + r * 470)), w, 56))

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
open(OUT_JS, 'w', encoding='utf-8', newline='').write('// World Sim · Mapa del atlas de arte (generado: no editar a mano). clave: [x, y, ancho, alto, ancla x, llamas?]\nconst ART_MAP = ' + json.dumps(mapa, separators=(',', ':')) + ';\n')
print(len(keys), 'sprites · atlas', atlas.size)
for k in ['house:hut', 'altar:altar', 'cathedral:zigurat', 'forge:herreria', 'mill:aspas', 'boat:0', 'catapult:0', 'oak:forest']: print(k, mapa[k])
