// World Sim · Qué tarjeta gráfica usa el juego (en Ajustes)
// ================= Gráfica =================
// · El navegador (y la versión de escritorio) dibuja los lienzos con la tarjeta gráfica si puede. Aquí se mira cuál
//   es y si de verdad está acelerado: si sale un dibujante por software (SwiftShader, «Microsoft Basic Render»...),
//   el juego va con el procesador y se avisa de cómo activar la aceleración
function gpuInfo(){
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return { name:'desconocida', soft:true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const clean = String(name).replace(/^ANGLE \(/, '').replace(/\)$/, '').replace(/ Direct3D.*$/, '').replace(/^(NVIDIA|AMD|Intel)[^,]*, /, '').replace(/ \(0x[0-9A-F]+\)/i, '');
    return { name:clean, soft:/SwiftShader|llvmpipe|Software|Basic Render/i.test(name), integrated:/Intel|UHD|Iris|Radeon\(TM\) Graphics|Vega \d+ Graphics/i.test(name) };
  } catch (e) { return { name:'desconocida', soft:true }; }
}
function showGpu(){
  const el = document.getElementById('gpuInfo'); if (!el) return;
  const g = gpuInfo(), desk = location.protocol === 'forja:'; // la versión de escritorio
  el.innerHTML = g.soft
    ? `⚠ Se está dibujando <b>sin la tarjeta gráfica</b> (${esc(g.name)}). ${desk ? 'Actualiza los controladores de la gráfica.' : 'Activa «Usar aceleración gráfica cuando esté disponible» en los ajustes del navegador y reinícialo.'}`
    : `Dibuja con: <b>${esc(g.name)}</b>${g.integrated ? `<br>Es la gráfica integrada. ${desk ? 'La versión de escritorio pide la potente; si no, en Windows: Configuración › Pantalla › Gráficos › World Sim › Alto rendimiento.' : 'Para usar la potente, en Windows: Configuración › Pantalla › Gráficos › tu navegador › Alto rendimiento.'}` : ''}`;
}
window.addEventListener('load', () => setTimeout(showGpu, 500));
