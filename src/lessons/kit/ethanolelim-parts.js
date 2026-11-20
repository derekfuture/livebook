// 尺寸、气泡和时间均为示意。坐标以台面为原点，玻璃出气口和试管共用同一液面。
import * as THREE from 'three';
import { chemBeaker, chemLamp, glassTube, stopper, testTube, tubeClamp, tubeRack } from './chem.js';
import { bubble2, glass2, tubeLiquid, water2 } from './chemfx.js';
import { faceLabel, textTex } from './labels.js';
import { textSprite } from './microworld.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const FX = -0.071, WX = 0.025, XS = [0.087, 0.147];
export const MOUTH = V(FX, 0.143), SEAT = V(FX, 0.138), FLUID = 0.082;
export const RIM = 0.089, LEVEL = 0.044;
export const HOME = { cup: V(-0.153, 0.032), chips: V(-0.112, 0.005), plug: V(FX, 0.237), tip: V((XS[0] + XS[1]) / 2, RIM + 0.014), wash: V(WX - 0.021, 0.148) };
export const LIFT = HOME.wash.clone().add(V(0, 0.041));
export const POUR = V(FX - 0.002, MOUTH.y + 0.005), DROP = MOUTH.clone().add(V(0, 0.004));
export const wetPoint = (i) => V(XS[i], LEVEL - 0.016);
export const NAMES = ['酸性高锰酸钾溶液', '溴的四氯化碳溶液'];
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.54 });
function mesh(parent, geometry, material, p = V()) {
  const m = new THREE.Mesh(geometry, material); m.position.copy(p); parent.add(m); return m;
}
function node(parent, p) { const g = new THREE.Group(); parent.add(g); if (p) g.position.copy(p); return g; }
function rod(parent, a, b, r, material) {
  const d = b.clone().sub(a), m = mesh(parent, new THREE.CylinderGeometry(r, r, d.length(), 20), material, a.clone().lerp(b, 0.5));
  m.quaternion.setFromUnitVectors(V(0, 1), d.normalize()); return m;
}
function pick(parent, p, size) {
  const m = mesh(parent, new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }), p);
  m.userData.pick = true; return m;
}
const clear = new THREE.Color(0xe4e8e5);
function support(group, x, y, r, clampY) {
  const metal = mat(0x69716f), pole = x - 0.022, z = -0.024;
  mesh(group, new THREE.BoxGeometry(0.065, 0.005, 0.038), metal, V(x - 0.005, 0.0025, -0.026));
  rod(group, V(pole, 0.005, z), V(pole, y, z), 0.002, metal);
  rod(group, V(pole, clampY, z), V(x, clampY, -r), 0.0023, metal);
  const clamp = tubeClamp(r); clamp.position.set(x, clampY, 0); group.add(clamp);
}
function tubing(group, from, to) {
  const hose = mesh(group, new THREE.BufferGeometry(), mat(0x96734f));
  const lastA = V(Infinity), lastB = V(Infinity);
  return () => {
    const a = from(), b = to(); if (lastA.equals(a) && lastB.equals(b)) return;
    lastA.copy(a); lastB.copy(b);
    const c = new THREE.CubicBezierCurve3(a, a.clone().add(V(0.017, 0.002, -0.004)), b.clone().add(V(-0.017, 0.002, -0.004)), b);
    hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(c, 28, 0.0025, 12, false);
  };
}

export function apparatus(group) {
  const r = 0.028, cy = 0.084, glass = glass2({ base: 0.08, rim: 0.55 });
  const profile = [];
  for (let i = 0; i <= 32; i++) {
    const a = -Math.PI / 2 + (Math.PI - 0.32) * i / 32;
    profile.push(new THREE.Vector2(Math.max(0.0001, r * Math.cos(a)), cy + r * Math.sin(a)));
  }
  profile.push(new THREE.Vector2(0.009, MOUTH.y - 0.002), new THREE.Vector2(0.0105, MOUTH.y), new THREE.Vector2(0.0086, MOUTH.y));
  mesh(group, new THREE.LatheGeometry(profile, 48), glass, V(FX)).renderOrder = 9;
  const liquid = tubeLiquid({ R: r - 0.001, yc: cy, top: cy + 0.001, base: 0.48, specks: 0 });
  liquid.position.x = FX; group.add(liquid);
  support(group, FX, HOME.plug.y + 0.013, 0.0097, 0.122);
  // 图 3-9 中圆底烧瓶由铁圈和网托住，火焰在网下。
  const netY = cy - r - 0.0003, metal = mat(0x6d7474), half = 0.026;
  const frame = mesh(group, new THREE.TorusGeometry(half, 0.0011, 8, 40), metal, V(FX, netY - 0.001));
  frame.rotation.x = Math.PI / 2;
  rod(group, V(FX-0.022, netY-0.001, -0.024), V(FX-0.016, netY-0.001, -0.020), 0.0015, metal);
  const wire = [];
  for (let i = -8; i <= 8; i++) {
    const offset = i * half / 9, span = Math.sqrt(half * half - offset * offset);
    wire.push(V(FX-span,netY,offset), V(FX+span,netY,offset), V(FX+offset,netY,-span), V(FX+offset,netY,span));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: 0x646a69, transparent: true, opacity: 0.58 })));
  const lamp = chemLamp(); lamp.position.x = FX; lamp.scale.setScalar(0.52); group.add(lamp);
  const lampPick = pick(lamp, V(0, 0.036), [0.072, 0.07, 0.066]);

  // 杯嘴为拖动锚点，杯体绕杯嘴倾斜，水流落在烧瓶口内。
  const cup = node(group, HOME.cup), pivot = node(cup);
  const beaker = chemBeaker({ r: 0.014, h: 0.031, level: 0.023, marks: false, color: 0xdce4de });
  beaker.position.set(-0.017, -0.031, 0); beaker.rotation.y = Math.PI; pivot.add(beaker);
  // 按倾角在杯内截出水平液面。杯嘴接触瓶口后，剩余量减少，杯身继续倾斜。
  const cupLiquid = mesh(pivot, new THREE.BufferGeometry(), water2({ color: 0xd6e0dc, base: 0.52 }));
  cupLiquid.renderOrder = 8;
  beaker.liq.visible = beaker.surf.visible = false;
  const segments = 32, radius = 0.013, depth = 0.029;
  const data = new Float32Array(segments * 18 * 3);
  cupLiquid.geometry.setAttribute('position', new THREE.BufferAttribute(data, 3));
  cupLiquid.frustumCulled = false;
  let oldFill = -1, oldTilt = -1;
  function pourSurface(fill, tilt) {
    if (oldFill === fill && oldTilt === tilt) return;
    oldFill = fill; oldTilt = tilt;
    cupLiquid.visible = fill < 0.9999;
    const angle = Math.atan2(depth - 0.021 * (1-fill), radius * Math.max(0.015, 1-fill)) * tilt;
    pivot.rotation.z = -angle;
    const slope = Math.tan(angle), maxHeight = depth - 0.001;
    let lo = -radius*slope, hi = maxHeight + radius*slope;
    for (let pass = 0; pass < 16; pass++) {
      const mid = (lo+hi)/2; let total = 0, weight = 0;
      for (let i = 0; i < segments; i++) {
        const f = 2*(i+0.5)/segments-1, chord = Math.sqrt(1-f*f);
        total += chord * Math.max(0, Math.min(maxHeight, mid + radius*f*slope)); weight += chord;
      }
      if (total/weight < 0.021*(1-fill)) lo = mid; else hi = mid;
    }
    const height = (lo+hi)/2; let cursor = 0;
    function vertex(i, side, surface) {
      const t = i*Math.PI/segments, x = -radius*Math.cos(t);
      data[cursor++] = x-0.017;
      data[cursor++] = -0.030 + (surface ? Math.max(0,Math.min(maxHeight,height+x*slope)) : 0);
      data[cursor++] = side*radius*Math.sin(t);
    }
    for (let i = 0; i < segments; i++) {
      // 液面一条弦到下一条弦，再沿杯壁接到底部。
      vertex(i,1,true); vertex(i+1,1,true); vertex(i+1,-1,true);
      vertex(i,1,true); vertex(i+1,-1,true); vertex(i,-1,true);
      for (const side of [-1,1]) {
        vertex(i,side,false); vertex(i+1,side,false); vertex(i+1,side,true);
        vertex(i,side,false); vertex(i+1,side,true); vertex(i,side,true);
      }
    }
    cupLiquid.geometry.attributes.position.needsUpdate = true; cupLiquid.geometry.computeVertexNormals();
  }
  const cupPick = pick(pivot, V(-0.017, -0.016), [0.033, 0.032, 0.031]);
  const stream = mesh(group, new THREE.CylinderGeometry(0.0012, 0.0013, 1, 12), water2({ color: 0xc4d5d2, base: 0.65 }));
  stream.renderOrder = 10;
  const chips = node(group, HOME.chips);
  for (let i = 0; i < 3; i++) {
    const piece = mesh(chips, new THREE.DodecahedronGeometry(0.0035), mat(0xf1e9d7), V((i - 1) * 0.0035, i % 2 * 0.0018, (i % 2) * 0.002));
    piece.scale.set(1, 0.62, 0.76); piece.rotation.y = i * 1.9; piece.renderOrder = 11;
  }
  const chipsPick = pick(chips, V(), [0.017, 0.011, 0.012]);
  const plug = node(group, HOME.plug);
  const cork = stopper({ r1: 0.0085, r2: 0.010, h: 0.012 }); plug.add(cork);
  const probeX = -0.0031, bulbY = FLUID - SEAT.y - 0.012;
  rod(plug, V(probeX, bulbY), V(probeX, 0.055), 0.0017, glass).renderOrder = 10;
  const bulb = mesh(plug, new THREE.SphereGeometry(0.0021, 16, 12), mat(0x8e3333), V(probeX, bulbY)); bulb.scale.y = 1.5;
  const column = mesh(plug, new THREE.CylinderGeometry(0.00065, 0.00065, 1, 10), mat(0x9d3832)); column.renderOrder = 11;
  for (let i = 0; i < 10; i++) rod(plug, V(probeX, 0.017 + i * 0.0037, 0.0016), V(probeX + (i % 3 ? 0.001 : 0.002), 0.017 + i * 0.0037, 0.0016), 0.00019, mat(0x626159));
  const glassPath = (parent, pts) => { const t = glassTube(pts, { r: 0.0019 }); parent.add(t); return t; };
  const outlet = V(0.023, 0.028);
  glassPath(plug, [V(0.004, -0.004), V(0.004, 0.023), V(0.008, 0.028), outlet]);
  const plugPick = pick(plug, V(0, 0.007), [0.024, 0.024, 0.02]);
  // 暂放带温度计的塞子时由同一铁架的夹持位置托住。
  const parkY = HOME.plug.y + 0.004;
  rod(group, V(FX - 0.022, parkY, -0.024), V(HOME.plug.x, parkY, -0.011), 0.0018, mat(0x69716f));
  const fork = tubeClamp(0.0108); fork.position.set(HOME.plug.x, parkY, 0); group.add(fork);
  const wash = testTube({ r: 0.014, len: 0.098 }); wash.position.set(WX, 0.018, 0); group.add(wash);
  support(group, WX, 0.128, 0.015, 0.088);
  const washLiquid = tubeLiquid({ R: 0.0138, yc: 0.015, top: 0.095, color: 0xd5deda, base: 0.44, specks: 0 });
  wash.add(washLiquid); washLiquid.setLevel(0.048);
  const stop = stopper({ r1: 0.013, r2: 0.015, h: 0.011 }); stop.position.set(WX, 0.111, 0); group.add(stop);
  const inlet = node(group, HOME.wash), washOut = V(WX + 0.024, 0.137);
  glassPath(inlet, [V(), V(0.012), V(0.016, -0.005), V(0.016, -0.110)]);
  const washPick = pick(inlet, V(0.008, -0.002), [0.026, 0.019, 0.018]);
  glassPath(group, [V(WX + 0.005, 0.105), V(WX + 0.005, 0.132), V(WX + 0.01, 0.137), washOut]);
  const inletHose = tubing(group, () => plug.position.clone().add(outlet), () => inlet.position);

  const shades = [new THREE.Color(0x8b277c), new THREE.Color(0xe08324)];
  const tubes = XS.map((x, i) => {
    const rack = tubeRack({ r: 0.0142, h: 0.052, w: 0.042, d: 0.037 }); rack.position.x = x; group.add(rack);
    const t = testTube({ r: 0.013, len: RIM - 0.008 }); t.position.set(x, 0.008, 0); group.add(t);
    const l = tubeLiquid({ R: 0.0128, yc: 0.014, top: 0.079, base: 0.65, specks: 0 }); t.add(l); l.setLevel(LEVEL - 0.008);
    faceLabel(group, i ? 'Br₂ / CCl₄' : '酸性 KMnO₄', { x, y: 0.007, z: 0.021, h: 0.0106, opacity: 1, color: '#40382d', stroke: '#faf5e8' });
    return l;
  });
  faceLabel(group, 'NaOH 溶液', { x: WX, y: 0.015, z: 0.017, h: 0.0106, opacity: 1, color: '#40382d', stroke: '#faf5e8' });
  const tip = node(group, HOME.tip), bend = V(-0.014, 0.077);
  const stem = glassPath(tip, [V(), V(0, 0.072), V(-0.003, 0.077), bend]);
  const tipPick = pick(tip, V(0, 0.048), [0.013, 0.064, 0.014]);
  const endHose = tubing(group, () => washOut, () => tip.position.clone().add(bend));
  const bubbles = Array.from({ length: 3 }, () => Array.from({ length: 7 }, () => {
    const b = mesh(group, new THREE.SphereGeometry(1, 12, 8), bubble2({ color: 0x7d817d, white: 0.63 })); b.renderOrder = 11; return b;
  }));
  const tint = new THREE.Color();
  return {
    cup, chips, plug, tip, wash: inlet, washPick, lamp, stem, cork, bulb, cupPick, chipsPick, plugPick, tipPick, lampPick,
    display(s, wet) {
      for (const key of Object.keys(HOME)) this[key].position.copy(s.pos[key]);
      inlet.userData.ringY = inlet.position.y;
      pourSurface(s.fill, s.tilt);
      liquid.setLevel(cy - 0.027 + (FLUID - cy + 0.027) * Math.cbrt(s.fill));
      stream.visible = s.pouring && s.tilt >= 0.9 && s.fill < 1;
      if (stream.visible) {
        stream.position.copy(s.pos.cup); const h = Math.max(0.002, stream.position.y - MOUTH.y + 0.003);
        stream.scale.y = h; stream.position.y -= h / 2;
      }
      lamp.flame.visible = s.lit; if (s.lit) lamp.flame.update(s.time);
      const height = 0.079 + 0.044 * (s.temp - 20) / 150;
      column.scale.y = height; column.position.set(probeX, bulbY + height / 2, 0);
      inletHose(); endHose();
      tubes.forEach((l, i) => l.setColor(tint.copy(shades[i]).lerp(clear, s.fade[i])));
      const inletEnd = inlet.position.y - 0.110;
      [[FX + 0.005, 0.061, FLUID, s.lit && (s.gas || s.bump)], [WX - 0.005, inletEnd, 0.066, s.gas && inletEnd < 0.066], [s.pos.tip.x, s.pos.tip.y, LEVEL, s.gas && wet >= 0]].forEach(([x, y, top, on], j) => {
        bubbles[j].forEach((b, i) => {
          b.visible = !!on; if (!on) return;
          const u = (s.time * (s.bump && j === 0 ? 1.8 : 0.65) + i / 7) % 1;
          b.position.set(x + 0.003 * Math.sin(i * 2 + u * 4) * u, y + (top - y) * u, 0.002 + 0.002 * Math.cos(i * 3) * u);
          b.scale.setScalar((s.bump && j === 0 ? 0.004 : 0.00145) * (0.7 + u));
        });
      });
      // 液面有节律地冲高，表现未加碎瓷片时的暴沸风险。
      liquid.scale.y = s.bump && s.lit ? 1 + 0.12 * Math.pow(Math.max(0, Math.sin(s.time * 8)), 4) : 1;
      liquid.position.y = (1 - liquid.scale.y) * (cy - r);
    },
  };
}

// 只追踪反应式两边对应的原子，路径不表示酸催化反应的机理。
// 每个乙醇的序号依次为 C、C、三枚甲基 H、两枚亚甲基 H、O、羟基 H。
export function eliminationScene() {
  const kinds = ['C', 'C', 'H', 'H', 'H', 'H', 'H', 'O', 'H'];
  const styles = { C: [0x3d4350, 0.4], H: [0xf2f1ec, 0.24], O: [0xe0483a, 0.36] };
  const molecule = [V(-0.77), V(0.77)];
  function radial(i, angle, len) {
    const sign = i ? 1 : -1;
    return molecule[i].clone().add(V(sign / 3, Math.cos(angle) * Math.sqrt(8 / 9), Math.sin(angle) * Math.sqrt(8 / 9)).multiplyScalar(len));
  }
  for (const [i, a] of [[0, 2.244], [0, -1.944], [0, 0.15], [1, 1.244], [1, -2.944]]) molecule.push(radial(i, a, 1.09));
  molecule.push(radial(1, -0.85, 1.43));
  molecule.push(molecule[7].clone().add(V(0.96, 0.04, 0)));
  const original = [[0,1], [0,2], [0,3], [0,4], [1,5], [1,6], [1,7], [7,8]];
  const ethyl = [V(-2.32, 0.53, -0.70), V(-1.19, -0.24), V(-1.97, 0.91, -1.66), V(-3.17, -0.14, -0.86),
    V(-2.64, 1.36, -0.07), V(-1.47, -0.46, 1.03), V(-1.00, -1.17, -0.53)];
  const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  let atoms, bonds, labels, startPose, finalPose, branch, time, paused;
  function source(i, ether) {
    const p = molecule[i % 9].clone().applyAxisAngle(up, 0.59);
    if (ether) p.x = i < 9 ? p.x - 2.55 : 2.55 - p.x;
    return p;
  }
  function destination(i, ether) {
    if (ether) {
      if (i === 7) return V(-0.54, 2.62);
      if (i === 8) return V(0.22, 3.21);
      if (i === 17) return V(-1.30, 3.21);
      if (i === 16) return V(0, 0.56);
      const p = ethyl[i % 9].clone(); if (i >= 9) p.x = -p.x;
      return p;
    }
    return [V(-1.85), V(-0.51), V(-2.40, -0.94), V(-2.40, 0.94), V(1.78, 1.20),
      V(0.04, 0.94), V(0.04, -0.94), V(2.54, 0.61), V(3.30, 1.20)][i];
  }
  const axis = V(), up = V(0, 1);
  return {
    holoBase: false,
    get time() { return time; }, set time(t) { time = t; },
    get paused() { return paused; }, set paused(v) { paused = v; },
    init(c, st) {
      branch = st.branch; time = 0; paused = false;
      const ether = branch === 'ether', n = ether ? 18 : 9;
      startPose = Array.from({ length: n }, (_, i) => source(i, ether));
      finalPose = Array.from({ length: n }, (_, i) => destination(i, ether));
      const ball = new THREE.SphereGeometry(1, 28, 20), stick = new THREE.CylinderGeometry(1, 1, 1, 14);
      atoms = Array.from({ length: n }, (_, i) => {
        const [color, r] = styles[kinds[i % 9]], atom = mesh(c.layer, ball, mat(color));
        atom.scale.setScalar(r); return atom;
      });
      const pairs = ether ? [...original, ...original.map(([a,b]) => [a+9,b+9]), [1,16], [7,17]] : [...original, [0,1], [4,7]];
      bonds = pairs.map(([a,b], j) => {
        const lost = ether ? j === 6 || j === 15 : j === 3 || j === 6;
        const gained = j >= (ether ? 16 : 8);
        const m = mesh(c.layer, stick, mat(lost || gained ? 0xa36b36 : 0x858b91));
        return { a, b, m, lost, gained };
      });
      labels = (ether ? ['C₂H₅OH', 'C₂H₅OH', 'C₂H₅OC₂H₅', 'H₂O'] : ['C₂H₅OH', '', 'CH₂=CH₂', 'H₂O']).map(t => {
        let label;
        if (t === 'C₂H₅OC₂H₅') {
          const { tex, aspect } = textTex(t, { color: '#393733', stroke: '#fff', font: 'serif', strokeW: 4 });
          label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
          label.scale.set(0.49*aspect,0.49,1);
        } else { label = textSprite(t || ' ', '#393733', '#fff'); label.scale.multiplyScalar(0.78); }
        c.layer.add(label); return label;
      });
    },
    step(c, st, dt) {
      const ether = branch === 'ether', reacts = branch !== 'cold';
      if (reacts && !paused) time = Math.min(7.5, time + dt);
      const u = ease((time - 1.8) / 4.2), waterStart = ether ? 7 : 4;
      atoms.forEach((a, i) => {
        a.position.lerpVectors(startPose[i], finalPose[i], u);
        if (i === waterStart || i === 7 || i === 8 || (ether && i === 17)) a.position.y += Math.sin(Math.PI * u) * 0.62;
        a.position.y += 2.1;
      });
      // 羟基自己的 O—H 始终相连。保留键长，使两个球不会在转向时重合。
      const keepLength = (a,b,length) => {
        axis.subVectors(atoms[b].position,atoms[a].position).setLength(length);
        atoms[b].position.copy(atoms[a].position).add(axis);
      };
      keepLength(7,8,0.96);
      if (!ether) for (const [carbon,h] of [[0,2],[0,3],[1,5],[1,6]]) keepLength(carbon,h,1.09);
      bonds.forEach(({ a, b, m, lost, gained }, j) => {
        const thickness = lost ? 1 - ease((time - 1.8) / 1.9) : gained ? ease((time - 4) / 1.9) : 1;
        m.visible = thickness > 0.025; if (!m.visible) return;
        const start = atoms[a].position, end = atoms[b].position;
        m.position.copy(start).lerp(end, 0.5);
        if (!ether && (j === 0 || j === 8)) m.position.y += (j === 0 ? -1 : 1) * 0.12 * u;
        axis.subVectors(end, start); m.scale.set(0.068 * thickness, axis.length(), 0.068 * thickness);
        m.quaternion.setFromUnitVectors(up, axis.normalize());
      });
      labels.forEach((l,i) => { l.visible = i < 2 ? time < 2.1 && (i === 0 || ether) : time > 6.1; });
      labels[0].position.set(ether ? -2.55 : 0, 0.36, 0); labels[1].position.set(2.55, 0.36, 0);
      labels[2].position.set(ether ? 0 : -1.32, 0.32, 0); labels[3].position.set(ether ? 1.45 : 2.55, ether ? 4.9 : 1.65, 0);
    },
    text() {
      if (branch === 'cold') return { eq: 'CH₃CH₂OH', cap: '先认出红色的氧和与它相连的氢。此时尚未观察到脱水反应。' };
      const ether = branch === 'ether';
      if (time < 1.8) return { eq: ether ? '约 140 ℃ · 两个乙醇分子' : '170 ℃ · 一个乙醇分子', on: true,
        cap: ether ? '看两个乙醇分子相向的羟基。' : '右边的碳连着羟基。找到左边碳上朝上的那个氢。' };
      if (time < 6.1) return { eq: ether ? '分子间脱水' : '分子内脱水', on: true,
        cap: ether ? '一个分子的羟基与另一个羟基上的氢组成水，留下的氧连接两个乙基。' : '相邻碳上的 H 和 OH 组成水，两个碳之间形成双键。' };
      return { eq: ether ? 'C₂H₅OC₂H₅ + H₂O' : 'CH₂=CH₂ + H₂O', on: true,
        cap: ether ? '两个乙醇分子脱去一分子水，生成乙醚。' : '一个乙醇分子脱去一分子水，生成乙烯。' };
    },
  };
}
