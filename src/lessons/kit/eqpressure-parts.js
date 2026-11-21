// 实验 2-2。体积以Ⅰ处的 20 mL 为单位，Ⅱ处的具体位置为示意。
import * as THREE from 'three';
import { canvasTex } from './props.js';
import { glass2 } from './chemfx.js';
import { faceLabel } from './labels.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const I = 1, II = 2.15, MIN = 0.53;
export const AXIS = 0.034, LEFT = -0.143, UNIT = 0.065, ROD = 0.169;
export const faceX = v => LEFT + UNIT * v;
export const gripAt = v => V(faceX(v) + ROD, AXIS);
export const volumeAt = x => clamp((x - ROD - LEFT) / UNIT, MIN, II);
export const FORMULA = '2NO₂(g) ⇌ N₂O₄(g)';

// 示意单位：n(NO₂) + 2n(N₂O₄) = 4，平衡时 c(N₂O₄) = 1.5 c(NO₂)²。
// 求 3n² + Vn - 4V = 0 的正根。初态 V=1、n=1。
export const equilibrium = v => 8 / (1 + Math.sqrt(1 + 48 / v));

function mesh(parent, geometry, material, x, y, z, order = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.renderOrder = order;
  parent.add(m);
  return m;
}
const solid = color => new THREE.MeshStandardMaterial({ color, roughness: 0.49 });
function cylinder(parent, x, y, len, rLeft, rRight, mat, order = 0, open = false) {
  const m = mesh(parent, new THREE.CylinderGeometry(rRight, rLeft, len, 64, 1, open), mat, x, y, 0, order);
  m.rotation.z = -Math.PI / 2;
  return m;
}

export function syringe(group) {
  const r = 0.024, length = 2.5 * UNIT, back = LEFT + length;
  const shadowMap = canvasTex(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(62,45,32,0.34)');
    grad.addColorStop(0.60, 'rgba(62,45,32,0.13)');
    grad.addColorStop(1, 'rgba(62,45,32,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  function shadow(x, w, d) {
    const plane = mesh(group, new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
      map: shadowMap, transparent: true, depthWrite: false,
    }), x, 0.0013, -0.004, 2);
    plane.rotation.x = -Math.PI / 2;
    plane.userData.noFrame = true;
    return plane;
  }
  shadow(LEFT + length / 2, length * 1.60, 0.069);
  const gripShadow = shadow(0, 0.076, 0.052);
  const glass = glass2({ tint: 0xc4d8d7, base: 0.075, rim: 0.71, band: 0.38 });
  const rim = glass2({ tint: 0xaec7ca, base: 0.40, rim: 0.65, band: 0.28 });
  const rubber = solid(0x393a38), rib = solid(0x515450);
  const stem = solid(0xabc2c0), pad = solid(0xc5d6d1);
  cylinder(group, LEFT + length / 2, AXIS, length, r, r, glass, 8, true);
  cylinder(group, LEFT - 0.003, AXIS, 0.006, r * 0.72, r, glass, 8);
  cylinder(group, LEFT - 0.013, AXIS, 0.016, 0.0052, 0.006, rim, 8);
  cylinder(group, LEFT - 0.025, AXIS, 0.018, 0.010, 0.008, rubber);
  cylinder(group, LEFT - 0.033, AXIS, 0.002, 0.0102, 0.0102, rib);
  cylinder(group, back, AXIS, 0.0038, r + 0.008, r + 0.008, rim, 9);
  cylinder(group, LEFT + 0.0012, AXIS, 0.0024, r, r, rim, 9, true);

  // 刻线贴在管壁外侧；较长的两条对应图中的活塞气体侧边缘。
  const ink = new THREE.LineBasicMaterial({ color: 0x48575a, transparent: true, opacity: 0.8 });
  function mark(x, long) {
    const points = [];
    for (let j = 0; j <= 8; j++) {
      const a = 0.25 + (long ? 0.94 : 0.30) * j / 8;
      points.push(V(x, AXIS + (r + 0.0002) * Math.sin(a), (r + 0.0002) * Math.cos(a)));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ink);
    line.renderOrder = 11;
    group.add(line);
  }
  for (let k = 1; k < 25; k++) {
    const v = k / 10;
    if (Math.abs(v - II) > 0.08) mark(faceX(v), k === 10);
  }
  mark(faceX(II), true);
  for (const [v, label] of [[I, 'Ⅰ'], [II, 'Ⅱ']]) {
    faceLabel(group, label, { x: faceX(v), y: AXIS - 0.006, z: r, h: 0.016, color: '#29383a', stroke: '#f4f0e5', opacity: 1 });
  }

  const volumeLabel = faceLabel(group, '20 mL', { x: faceX(I) - 0.010, y: AXIS + 0.019, z: r * 0.69, h: 0.0105, color: '#29383a', stroke: '#f4f0e5', opacity: 1 });

  const gasMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { conc: { value: 1 } },
    vertexShader: `varying vec3 n; varying vec3 eye;
      void main(){ vec4 p = modelViewMatrix * vec4(position,1.0);
      n = normalMatrix * normal; eye = -p.xyz; gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform float conc; varying vec3 n; varying vec3 eye;
      void main(){ float chord = max(0.0, dot(normalize(n),normalize(eye)));
      vec3 col = mix(vec3(0.88,0.53,0.29), vec3(0.48,0.16,0.055), smoothstep(0.44,0.65,conc));
      col = mix(col, vec3(0.27,0.072,0.024), smoothstep(0.65,1.0,conc));
      col = mix(col, vec3(0.084,0.008,0.002), smoothstep(1.0,1.36,conc));
      gl_FragColor = vec4(col, 1.0-exp(-2.55*conc*chord));
      #include <colorspace_fragment>
      }`,
  });
  gasMat.userData.see = 'gas';
  const gas = cylinder(group, 0, AXIS, 1, r - 0.0007, r - 0.0007, gasMat, 5);
  const piston = new THREE.Group();
  group.add(piston);
  cylinder(piston, -ROD + 0.004, 0, 0.008, r - 0.0011, r - 0.0011, rubber);
  for (const dx of [0.0016, 0.0068]) cylinder(piston, -ROD + dx, 0, 0.0017, r - 0.00055, r - 0.00055, rib);
  for (const angle of [-0.36, Math.PI / 2 - 0.36]) {
    const fin = mesh(piston, new THREE.BoxGeometry(ROD - 0.009, 0.027, 0.0025), stem, (-ROD + 0.008) / 2, 0, 0);
    fin.rotation.x = angle;
  }
  const handle = cylinder(piston, 0, 0, 0.0045, 0.028, 0.028, pad);
  cylinder(piston, -0.0048, 0, 0.0055, 0.011, 0.018, stem);
  const pick = mesh(piston, new THREE.BoxGeometry(0.032, 0.062, 0.056), new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  // 黑色胶头和十字推杆也是同一根活塞的抓取部位。
  for (const child of piston.children.slice()) {
    if (child !== pick) pick.add(child);
  }
  pick.userData.pick = true;
  pick.userData.track = true;
  pick.name = '活塞柄';
  handle.userData.ringY = AXIS + 0.002;
  return { handle, pick, piston, volumeLabel, draw(v, n) {
    gas.position.x = LEFT + UNIT * v / 2;
    gas.scale.y = UNIT * v;
    gasMat.uniforms.conc.value = n / v;
    piston.position.copy(gripAt(v));
    gripShadow.position.x = piston.position.x;
  } };
}

const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const rot = [1, -1].map(sign => new THREE.Quaternion().setFromAxisAngle(V(1), -Math.PI / 2)
  .multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -sign * Math.PI / 2)));

// 用同一对 NO₂ 片段演完整个过程。成键位时，所有六个原子和 MOL.N2O4 重合。
export function pressureScene() {
  let clock = 0, saved = null, slots, frame, wall, endFace, cap;
  const chamberWidth = v => 9.2 * v;
  // 每个位置容纳一组 N₂O₄ 或两个 NO₂。Ⅰ处 4 个 NO₂、6 个 N₂O₄，之后按同一比例取整。
  const layout = [[0.28, -4.5], [0.73, -4.1], [0.21, -1.6], [0.66, -1.3],
    [0.32, 1.4], [0.79, 1.8], [0.26, 4.2], [0.69, 4.5]];
  const splitOrder = [1, 6, 5, 4, 3, 7, 2, 0];
  const splitCount = n => Math.round(2 * n);
  const molScale = 0.65;
  const volumeStart = 1.65, netStart = 3.65, netEnd = 5.5;
  const motionText = join => join ? '两个 NO₂ 靠拢，两个氮原子之间形成键。' : 'N₂O₄ 的氮氮键断开，两个 NO₂ 分开。';
  function appearance(c, slot, joined) {
    const kind = joined ? 'N2O4' : 'NO2';
    if (slot.mols[0]?.kind === kind) return;
    slot.mols.forEach(c.remove);
    slot.mols = (joined ? [0] : [0, 1]).map(() => c.add(kind, V(), { fixed: true }));
  }
  function border(c, color) {
    const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(), V(), V(), V()]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    c.layer.add(m);
    return m;
  }
  function line(m, points) {
    const a = m.geometry.attributes.position;
    points.forEach(([x,y,z], i) => a.setXYZ(i,x,y,z));
    a.needsUpdate = true;
    m.geometry.computeBoundingSphere();
  }
  function draw(c, st) {
    const outward = st.v > st.startV;
    const before = splitCount(st.startN), after = splitCount(st.n);
    const netJoin = after < before;
    const volumePhase = smooth((clock - volumeStart) / 1.1);
    const width = chamberWidth(st.startV + (st.v - st.startV) * volumePhase);
    const left = -chamberWidth(II) / 2, right = left + width;
    endFace.position.set(right, 1.95, 0);
    line(frame, [[right,0,5.8],[left,0,5.8],[left,0,-5.8],[right,0,-5.8]]);
    line(wall, [[right,0,5.8],[right,0,-5.8],[right,0.9,-5.8],[right,0,-5.8]]);
    const net = smooth((clock - netStart) / (netEnd - netStart));
    const gaps = [];
    splitOrder.forEach((slot, rank) => {
      const from = Number(rank < before), to = Number(rank < after);
      gaps[slot] = from + (to - from) * net;
    });
    if (clock < volumeStart) cap = '先看活塞移动前的分子和它们占据的空间。';
    else if (clock < netStart) cap = outward ? '空间变大的一瞬间，NO₂ 数目未变，浓度减小。' : '空间变小的一瞬间，NO₂ 数目未变，浓度增大。';
    else if (net < 1 && before !== after) {
      cap = netJoin ? '本段净消耗 NO₂。图中两个 NO₂ 结合成一个 N₂O₄（示意）。'
        : '本段净生成 NO₂。图中一个 N₂O₄ 分解成两个 NO₂（示意）。';
    } else if (st.settled && clock >= netEnd) {
      // 新平衡里，一个分解事件与另一个位置的一次结合交替出现。
      const t = Math.max(0, clock - netEnd - 1.15), cycle = Math.floor(t / 4.8);
      const u = t % 4.8, pair = [splitOrder[after], splitOrder[1]];
      const split = pair[cycle % 2], join = pair[1 - cycle % 2];
      const a = smooth((u - 0.55) / 1.2), b = smooth((u - 2.8) / 1.2);
      const splitFirst = netJoin;
      const first = splitFirst ? split : join, second = splitFirst ? join : split;
      gaps[split] = splitFirst ? a : b;
      gaps[join] = 1 - (splitFirst ? b : a);
      const active = a > 0 && a < 1 ? first : b > 0 && b < 1 ? second : -1;
      cap = active < 0 ? '达到新平衡，结合和分解仍在进行，两者速率相等。' : motionText(active === join);
    } else cap = '继续观察两种分子的相互转化。';
    slots.forEach((slot, i) => {
      const gap = gaps[i], joined = gap < 0.001;
      appearance(c, slot, joined);
      const [fx, z] = layout[i], drift = 0.09 * Math.sin(clock * 1.2 + i * 1.8);
      slot.mols.forEach((m, j) => {
        m.g.scale.setScalar(molScale);
        m.g.position.set(left + width * fx + drift, 1.2 + 0.08 * Math.sin(clock + i), z + 0.12 * Math.cos(clock + i));
        if (joined) m.g.rotation.set(0, 0, 0);
        else {
          m.g.position.x += (j ? 1 : -1) * molScale * (1.12 + gap * Math.min(1.04, width * 0.085));
          m.g.quaternion.copy(rot[j]);
        }
        m.rep = false;
      });
    });
    for (const kind of ['N2O4','NO2']) {
      const slot = slots.find(s => s.mols[0].kind === kind);
      if (slot) slot.mols[0].rep = true;
    }
  }
  return {
    holoBase: false, labels: (_, m) => m.rep, labelOnly: (_, m) => m.rep,
    snapshot: () => clock, resume(value) { saved = value; },
    init(c, st) {
      clock = saved ?? 0; saved = null;
      slots = layout.map(() => ({ mols: [] }));
      frame = border(c, 0x516e76); wall = border(c, 0x3f5558);
      endFace = mesh(c.layer, new THREE.BoxGeometry(0.16, 3.9, 11.6),
        new THREE.MeshBasicMaterial({ color: 0x638084, transparent: true, opacity: 0.27, depthWrite: false }), 0, 0, 0);
      draw(c, st);
    },
    step(c, st, dt) { clock += dt; draw(c, st); },
    text() { return { eq: FORMULA, on: true, cap }; },
  };
}
