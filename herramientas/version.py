# Pone un número de versión nuevo en los enlaces a los scripts, la hoja de estilo y el atlas, para que el navegador
# no use los de antes tras una actualización. Ejecutar antes de cada subida: python herramientas/version.py
import re, time, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = time.strftime('%Y%m%d%H%M')
p = os.path.join(R, 'index.html'); s = open(p, encoding='utf-8').read()
s = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+\.(?:js|css))(?:\?v=\d+)?"', lambda m: f'{m.group(1)}?v={v}"', s)
open(p, 'w', encoding='utf-8', newline='').write(s)
p = os.path.join(R, 'js', 'arte.js'); s = open(p, encoding='utf-8').read()
s = re.sub(r"'arte/atlas\.png(?:\?v=\d+)?'", f"'arte/atlas.png?v={v}'", s)
open(p, 'w', encoding='utf-8', newline='').write(s)
print('versión', v)

# ---- Manifiesto para el launcher de escritorio (escritorio/): versión, novedades y la huella de cada archivo del juego ----
# El launcher lo descarga de GitHub Pages, lo compara con el suyo y baja solo los archivos que han cambiado.
# La huella se calcula sin los \r (así da lo mismo cómo guarde git los finales de línea). Uso opcional:
#   python herramientas/version.py "Lo que trae esta actualización"   → sale la primera en las novedades
import hashlib, json, subprocess, sys
def huella(path):
    b = open(path, 'rb').read()
    if not path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.mp3', '.ogg', '.wav', '.woff', '.woff2', '.ttf')): b = b.replace(b'\r', b'')
    return hashlib.sha1(b).hexdigest()
files = {}
for top in ['index.html', 'css', 'js', 'arte']:
    full = os.path.join(R, top)
    if os.path.isfile(full): files[top] = huella(full); continue
    for d, _, fs in os.walk(full):
        for f in fs: rel = os.path.relpath(os.path.join(d, f), R).replace(os.sep, '/'); files[rel] = huella(os.path.join(d, f))
try: log = subprocess.run(['git', 'log', '-12', '--pretty=%cs\t%s'], cwd=R, capture_output=True, text=True, encoding='utf-8').stdout.strip().splitlines()
except Exception: log = []
notas = [{ 'fecha':l.split('\t')[0], 'texto':l.split('\t', 1)[1] } for l in log if '\t' in l]
if len(sys.argv) > 1: notas.insert(0, { 'fecha':time.strftime('%Y-%m-%d'), 'texto':sys.argv[1] })
man = { 'juego':'World Sim', 'version':v, 'fecha':time.strftime('%Y-%m-%d %H:%M'), 'novedades':notas[:12], 'archivos':files }
open(os.path.join(R, 'manifest.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(man, ensure_ascii=False, indent=1))
print('manifiesto:', len(files), 'archivos')
