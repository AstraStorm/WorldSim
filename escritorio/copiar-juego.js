// Copia el juego (index.html, css, js, arte y manifest.json) a juego-base/: es la versión que va dentro del ejecutable.
// Al abrirlo por primera vez se copia a la carpeta del usuario y, desde ahí, el launcher la mantiene al día.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), OUT = path.join(__dirname, 'juego-base');
fs.rmSync(OUT, { recursive:true, force:true }); fs.mkdirSync(OUT, { recursive:true });
for (const top of ['index.html', 'manifest.json', 'css', 'js', 'arte']) fs.cpSync(path.join(R, top), path.join(OUT, top), { recursive:true });
console.log('juego copiado en', OUT);
