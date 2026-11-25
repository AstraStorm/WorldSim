// World Sim · Armas de fuego: con la pólvora y la metalurgia, la combustión
// ================= Armas de fuego =================
// · Nuevo descubrimiento, «la combustión» (hace falta saber de pólvora y de metalurgia): en la herrería, con hierro,
//   hacen mosquetes (mucho alcance y daño, pero se recargan despacio) y pistolas (para los jinetes y quien manda)
// · Los arqueros y ballesteros se van pasando al mosquete (uno cada poco, si hay hierro en el almacén)
// · Al disparar: estampido, fogonazo y humo de pólvora
(() => { if (DISCOVERIES.some(d => d.k === 'combustion')) return; const i = DISCOVERIES.findIndex(d => d.k === 'polvora');
  DISCOVERIES.splice(i + 1, 0, { k:'combustion', txt:'la combustión', cost:95, eff:'con pólvora y metal fabrican mosquetes y pistolas: sus soldados disparan de lejos', req:['polvora', 'metalurgia'].filter(k => DISCOVERIES.some(d => d.k === k)) });
  if (typeof SCI_REQ === 'object') SCI_REQ.combustion = ['polvora', 'metalurgia']; })();
let gunT = 0;
SYSTEMS.push(dt => {
  if (!world || (gunT -= dt) > 0) return; gunT = 8;
  for (const g of liveTowns()) {
    if (!knowsSci(g, 'combustion') || !hasForge(g) || (g.iron || 0) < 2) continue;
    const u = villagers.find(v => !v.dead && v.vid === g.id && (v.weapon === 'arco' || v.weapon === 'ballesta') && !v.away); if (!u) continue;
    g.iron -= 2; u.weapon = u.mount ? 'pistola' : 'mosquete'; floats.push({ x:u.x, y:u.y - 12, txt:GEAR_TXT[u.weapon], col:'#c8d0dc', life:0 });
    if (!g.gunMsg) { g.gunMsg = true; notify(`En la herrería de ${g.name} forjan los primeros mosquetes: sus soldados ya disparan con pólvora`, { x:u.x, y:u.y }); }
  }
});
