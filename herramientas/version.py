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
