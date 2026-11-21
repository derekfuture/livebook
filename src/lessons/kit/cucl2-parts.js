// 图 4-9 的 U 形管和图 4-10 的两个电极界面。器材尺寸只用于取景。
import * as THREE from 'three';
import { chemBeaker } from './chem.js';
import { glass2, water2, bubble2, waterSurface } from './chemfx.js';
import { plate, wire } from './dianzhi-parts.js';
import { canvasTex } from './props.js';
import { textSprite } from './microworld.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const X = [-0.029, 0.029],
  R = 0.016,
  RIM = 0.113,
  LEVEL = 0.087,
  HALF = 0.035;
export const PAPER_TIP = 0.018,
  PAPER_Z = 0.013;
export const HOME = [V(0.108, 0.054, 0.008), V(-0.128, 0.145), V(-0.078, 0.145), V(0.075, 0.0035, PAPER_Z)];
export const pourAt = (side = 1) => V(X[side] + 0.0065, RIM + 0.007, HOME[0].z);
export const dipAt = (i) => V(X[i], LEVEL + 0.006);
export const paperAt = (i) => V(X[i] + PAPER_TIP, RIM + 0.002, PAPER_Z);
const unit = (n) => Math.max(0, Math.min(1, n));
const surface = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...options });
function part(parent, geo, mat, point) {
  const mesh = new THREE.Mesh(geo, mat);
  if (point) mesh.position.copy(point);
  parent.add(mesh);
  return mesh;
}
function box(parent, w, h, d, color, p) {
  return part(parent, new THREE.BoxGeometry(w, h, d), surface(color), p);
}
function nameplate(parent, text, p, w, h, bg) {
  const label = plate(text, w, h, { bg });
  label.position.copy(p);
  parent.add(label);
  return label;
}

function cell(group) {
  const bendY = 0.05;
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(V(X[0], RIM), V(X[0], bendY)));
  const arc = new THREE.EllipseCurve(0, bendY, X[1], X[1], Math.PI, 2 * Math.PI);
  const curve = new THREE.Curve();
  curve.getPoint = (t) => {
    const p = arc.getPoint(t);
    return V(p.x, p.y);
  };
  path.add(curve);
  path.add(new THREE.LineCurve3(V(X[1], bendY), V(X[1], RIM)));
  const wall = part(group, new THREE.TubeGeometry(path, 100, R, 40), glass2({ tint: 0xb8ccd3, rim: 0.54 }));
  wall.renderOrder = 9;
  const plane = new THREE.Plane(V(0, -1), 0);
  const fluid = water2({ color: 0x41968a, base: 0.32 });
  fluid.clippingPlanes = [plane];
  const water = part(group, new THREE.TubeGeometry(path, 100, R - 0.0011, 40), fluid);
  water.renderOrder = 7;
  const surfaces = X.map((x) => {
    const rim = part(group, new THREE.TorusGeometry(R, 0.0011, 12, 48), surface(0xa0bdc6), V(x, RIM));
    rim.rotation.x = Math.PI / 2;
    const guide = part(
      group,
      new THREE.TorusGeometry(0.0066, 0.001, 8, 28, Math.PI),
      surface(0x728588),
      V(x, RIM + 0.001),
    );
    guide.rotation.x = -Math.PI / 2;
    box(group, 0.0022, 0.002, 0.009, 0x728588, V(x, RIM + 0.001, -0.011));
    const s = waterSurface({ r: R - 0.0011, color: 0x68aaa3 });
    s.position.x = x;
    group.add(s);
    return s;
  });
  // 低矮的托座托住弯管，留出看两极的视线。
  box(group, 0.085, 0.005, 0.038, 0x697b7b, V(0, 0.0025));
  const tubeNames = ['U 形管', 'U形管·氯化铜溶液'].map((text) =>
    nameplate(group, text, V(0, 0.005, 0.020), 0.074, 0.010, '#f3edda'));
  for (const x of [-0.02, 0.02]) box(group, 0.009, 0.006, 0.02, 0x596969, V(x, 0.008));
  return (f) => {
    const y = 0.005 + f * (LEVEL - 0.005);
    plane.set(V(0, -1), y).applyMatrix4(group.matrixWorld);
    water.visible = f > 0;
    tubeNames[0].visible = f === 0;
    tubeNames[1].visible = f > 0;
    surfaces.forEach((s) => {
      s.visible = y > bendY;
      s.position.y = y;
    });
  };
}

function supply(group) {
  const at = V(-0.115, 0, -0.014);
  const body = new THREE.Group();
  body.position.copy(at);
  group.add(body);
  box(body, 0.09, 0.052, 0.046, 0xb9c6bf, V(0, 0.029));
  box(body, 0.093, 0.004, 0.048, 0x425554, V(0, 0.003));
  nameplate(body, '直流电源', V(0, 0.046, 0.0234), 0.059, 0.012, '#bdc8c0');
  // 图中串联的电流表画在电源面板上，只表现指针有无偏转。
  const dial = part(
    body,
    new THREE.PlaneGeometry(0.047, 0.024),
    new THREE.MeshBasicMaterial({
      map: canvasTex(360, 168, (ctx, w, h) => {
        ctx.fillStyle = '#f4f0de';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3b4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(180, 153, 125, -2.38, -0.76);
        ctx.stroke();
        for (let i = 0; i < 11; i++) {
          const a = -2.38 + i * 0.162;
          ctx.beginPath();
          ctx.moveTo(180 + 125 * Math.cos(a), 153 + 125 * Math.sin(a));
          ctx.lineTo(180 + 114 * Math.cos(a), 153 + 114 * Math.sin(a));
          ctx.stroke();
        }
        ctx.font = 'bold 41px serif';
        ctx.fillStyle = '#36423f';
        ctx.fillText('A', 166, 125);
      }),
    }),
    V(-0.014, 0.024, 0.0236),
  );
  const needle = new THREE.Group();
  nameplate(body, '电流表', V(0.026, 0.025, 0.0236), 0.027, 0.009, '#bdc8c0');
  needle.position.set(0, -0.01, 0.0002);
  dial.add(needle);
  box(needle, 0.0008, 0.0155, 0.0003, 0x854433, V(0, 0.0078));
  const sw = box(body, 0.018, 0.008, 0.016, 0x343e40, V(0, 0.058, 0.009));
  box(sw, 0.006, 0.0007, 0.0015, 0xe6e5d8, V(0, 0.0041, 0.004));
  sw.userData.track = true;
  sw.userData.ringY = 0.063;
  const terminals = [-1, 1].map((s, i) => {
    const p = V(s * 0.031, 0.06, -0.004);
    part(body, new THREE.CylinderGeometry(0.004, 0.005, 0.01, 20), surface(i ? 0xa94b40 : 0x353c3d), p);
    const label = nameplate(body, i ? '+' : '−', V(p.x, 0.0554, 0.012), 0.013, 0.011, '#bdc8c0');
    label.rotation.x = -Math.PI / 2;
    return p.clone().add(at).add(V(0, 0.005));
  });
  return {
    sw,
    terminals,
    draw(on, conducting) {
      sw.rotation.x = on ? -0.29 : 0.29;
      needle.rotation.z = conducting ? -0.4 : 0.78;
    },
  };
}

// 杯口是旋转支点。随余量减少而增大倾角，剪出贴着杯口的水平液面。
function pouringCup(cup, pivot) {
  const mesh = cup.liq, points = mesh.geometry.attributes.position;
  const original = points.clone(), r = cup.r - 0.0012, h = cup.h - 0.002;
  let lastFill, lastTilt;
  return (fill, tilt) => {
    if (fill === lastFill && tilt === lastTilt) return;
    lastFill = fill;
    lastTilt = tilt;
    const level = 0.047 * (1 - fill);
    const k = tilt / 1.6;
    const width = 2 * r * Math.min(1, Math.pow(2 * level / h, 0.6));
    const high = level + (h - level) * k;
    const low = level + (Math.max(0, 2 * level - h) - level) * k;
    const span = 2 * r + (width - 2 * r) * k;
    pivot.rotation.z = Math.atan2(high - low, span);
    mesh.visible = level > 0.00002;
    mesh.scale.y = 1;
    cup.surf.position.y = level + mesh.position.y;
    cup.surf.visible = mesh.visible && k < 0.001;
    for (let i = 0; i < points.count; i++) {
      const u = (original.getX(i) / r + 1) / 2;
      const x = -r + span * u;
      const z = Math.abs(original.getZ(i)) < 1e-7 ? 0 : Math.sign(original.getZ(i)) * Math.sqrt(Math.max(0, r * r - x * x));
      points.setXYZ(i, x, original.getY(i) * (high + (low - high) * u), z);
    }
    points.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  };
}

export function apparatus(group) {
  const setLevel = cell(group);
  const source = supply(group);
  const rods = X.map((x, i) => {
    const rod = part(group, new THREE.CylinderGeometry(0.0059, 0.0059, HALF * 2, 32), surface(0x363c40));
    part(
      rod,
      new THREE.CylinderGeometry(0.0066, 0.0066, 0.008, 24),
      surface(i ? 0xaa493e : 0x33393d),
      V(0, HALF - 0.003),
    );
    nameplate(rod, i ? '+' : '−', V(0, HALF - 0.004, 0.0068), 0.01, 0.008, i ? '#c27a67' : '#bcc6c5');
    return rod;
  });
  const leads = [wire(group, 0x354345), wire(group, 0xa24a3f)];
  const rodNames = ['负极侧石墨棒', '正极侧石墨棒'].map((text) =>
    nameplate(group, text, V(0, 0), 0.043, 0.009, '#f3edda'));
  // 铜层贴在实际浸没的棒段上，自下而上逐渐显现。
  const deposit = part(
    rods[0],
    new THREE.CylinderGeometry(0.00618, 0.00618, 1, 32),
    surface(0xc56a42, { metalness: 0.12, transparent: true, opacity: 0.96 }),
  );
  deposit.renderOrder = 9.4;
  deposit.geometry.translate(0, 0.5, 0);
  deposit.position.y = -HALF;
  const bath = new THREE.Group();
  group.add(bath);
  const beaker = chemBeaker({ r: 0.027, h: 0.052, level: 0.047, marks: false, color: 0x398f86 });
  beaker.position.set(0.03, -0.051, 0);
  bath.add(beaker);
  const drawCup = pouringCup(beaker, bath);
  const lip = part(beaker, new THREE.TorusGeometry(beaker.r, 0.00047, 8, 48), surface(0xb0c9cb), V(0, beaker.h));
  lip.rotation.x = Math.PI / 2;
  const cupNames = ['烧杯·氯化铜溶液', '烧杯'].map((text) =>
    nameplate(beaker, text, V(0, 0.024, 0.0275), 0.050, 0.012, '#f3edda'));
  const drip = part(group, new THREE.CylinderGeometry(0.001, 0.0012, 1, 10), water2({ color: 0x398f86, base: 0.77 }));
  drip.renderOrder = 9.5;
  const paper = part(group, new THREE.BoxGeometry(PAPER_TIP * 2, 0.0013, 0.015), surface(0xe9e2bf));
  paper.rotation.x = 0.22;
  const paperName = nameplate(group, '湿润的碘化钾淀粉试纸', V(0, 0), 0.064, 0.009, '#f3edda');
  const stainMat = new THREE.MeshBasicMaterial({
    map: canvasTex(256, 80, (c, w, h) => {
      const shade = c.createLinearGradient(0, 0, w, 0);
      shade.addColorStop(0, '#263a96');
      shade.addColorStop(0.5, '#4158aa');
      shade.addColorStop(1, 'rgba(64,85,155,0)');
      c.fillStyle = shade;
      c.fillRect(0, 0, w, h);
    }),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const stain = part(
    paper,
    new THREE.PlaneGeometry(PAPER_TIP * 1.8, 0.015),
    stainMat,
    V(-PAPER_TIP * 0.1, 0.00072),
  );
  stain.rotation.x = -Math.PI / 2;
  const bubbles = Array.from({ length: 15 }, () =>
    part(group, new THREE.SphereGeometry(1, 12, 10), bubbleMaterial),
  );
  function draw(S) {
    const [cup, neg, pos, strip] = S.pos;
    bath.position.copy(cup);
    drawCup(S.fill, S.tilt);
    cupNames[0].visible = S.fill < 1;
    cupNames[1].visible = S.fill === 1;
    setLevel(S.fill);
    paper.position.copy(strip);
    const lifted = unit((strip.y - HOME[3].y) / (RIM - HOME[3].y));
    paperName.position.set(strip.x + lifted * (strip.x < 0 ? -0.060 : 0.041), Math.max(0.005, strip.y - 0.005), strip.z + 0.026);
    stainMat.opacity = S.blue;
    stain.visible = S.blue > 0;
    rods.forEach((rod, i) => {
      rod.position.copy(i ? pos : neg);
      rodNames[i].position.set(rod.position.x + (i ? 0.030 : -0.030), rod.position.y + HALF - 0.003, 0.0068);
      leads[i].update(source.terminals[i], rod.position.clone().add(V(0, HALF + 0.001)), i ? 0.019 : 0.009);
    });
    const immersed = Math.max(0, LEVEL - (neg.y - HALF));
    deposit.scale.y = Math.max(0.00001, immersed * Math.min(1, S.charge / 2.5));
    deposit.visible = S.charge > 0 && immersed > 0;
    source.draw(S.power, S.power);
    const outer = X[1] + Math.sqrt(Math.max(0, (R - 0.0011) ** 2 - cup.z ** 2));
    const wallY = 0.05 - Math.sqrt(Math.max(0, outer ** 2 - cup.x ** 2));
    const streamEnd = Math.max(wallY, 0.005 + S.fill * (LEVEL - 0.005));
    drip.visible = S.grip === 0 && !S.returns[0] && S.tilt > 0 && S.fill < 1;
    if (drip.visible) {
      const p = cup;
      drip.scale.y = Math.max(0.001, p.y - streamEnd);
      drip.position.set(p.x, streamEnd + drip.scale.y / 2, p.z);
    }
    bubbles.forEach((b, i) => {
      const age = S.bubbleClock - i * 0.12;
      const u = (age % 1.8) / 1.8;
      const bottom = pos.y - HALF + 0.001;
      b.visible = age >= 0 && S.charge > 0 && (S.power || age % 1.8 > S.sinceOff);
      if (!b.visible) return;
      const a = i * 2.4;
      b.position.set(
        pos.x + Math.sin(a) * 0.007,
        bottom + u * (LEVEL - bottom),
        0.005 + Math.cos(a) * 0.003 + u * 0.002,
      );
      b.scale.setScalar(0.00125 + u * 0.0011);
      b.renderOrder = 10;
    });
  }
  return {
    draw,
    cup: bath,
    beakerPick: beaker.body,
    rods,
    paper,
    sw: source.sw,
    dispose() {
      leads.forEach((l) => l.dispose());
    },
  };
}
const bubbleMaterial = bubble2({ color: 0x557c74, white: 0.26 });

const ORIGINS = [V(-1.5, 0.7, 2), V(0.8, 1.7, 1.4), V(2.0, 0.05, 2.0)];
const DEST = [V(-4.25, 0.85, 0.74), V(3.55, 2.13, 0.72), V(4.94, -0.55, 0.72)];
const CYCLE = 10;
const captions = [
  '通电前，铜离子和氯离子在溶液中自由运动。',
  '铜离子向阴极迁移，氯离子向阳极迁移。',
  '电子从电源负极沿导线到达阴极。',
  '一个铜离子得到两个电子，两个氯离子各失去一个电子。',
  '铜原子留在阴极。两个氯原子靠拢，电子沿导线流向电源正极。',
  '两个氯原子结合成氯分子，从阳极表面逸出。',
  '电源已断开，溶液中的离子继续自由运动，已析出的铜留在阴极。',
];

function circuit(c, label) {
  // 液相用一块有上边界的剖面表示。导线从液面上方接入石墨。
  const bath = part(c.layer, new THREE.PlaneGeometry(12.8, 4.85),
    new THREE.MeshBasicMaterial({color: 0xb7ddd7, transparent: true, opacity: 0.56, depthWrite: false}), V(0, 0.25, -0.68));
  box(c.layer, 12.8, 0.045, 0.075, 0x65a89d, V(0, 2.68, bath.position.z));
  box(c.layer, 3.30, 0.98, 0.30, 0xe6dfcb, V(0, 5.18, 0));
  label('直流电源', V(0, 5.18, 0.20), 3.50);
  return [-1, 1].map((side) => {
    const x = side * 4.25, color = side < 0 ? 0x354345 : 0xa24a3f;
    box(c.layer, 1.68, 4.15, 0.82, 0x495455, V(x, 1.10, 0));
    box(c.layer, 0.09, 2.04, 0.09, color, V(x, 4.18, 0.39));
    box(c.layer, 2.62, 0.09, 0.09, color, V(side * 2.95, 5.18, 0.39));
    label(side < 0 ? '−' : '+', V(side * 1.90, 5.67, 0.40), 3.40);
    label(side < 0 ? '阴极' : '阳极', V(x, -2.70, 0.12), 3.5);
    // 两边横线上的箭头都朝左：负极供电子，正极接收电子。
    const arrow = part(c.layer, new THREE.ConeGeometry(0.15, 0.38, 12), surface(color), V(side * 3.08, 5.18, 0.39));
    arrow.rotation.z = Math.PI / 2;
    return arrow;
  });
}

export function electrodeScene() {
  let time = 0, idleTime = 0, paused = false, active = false, phaseIndex = 0;
  let ions, electrons, marks, bond, prior, arrows, replaying;
  function replay() {
    // 每组电极反应用独立的慢放时钟，短时通电也能看完一次电子转移。
    time = -1.5;
    idleTime = 0;
    paused = false;
  }
  return {
    holoBase: false,
    get time() { return { time, idleTime }; },
    set time(v) { ({ time, idleTime } = v); },
    get paused() { return paused; },
    set paused(v) { paused = v; },
    replay,
    init(c, st) {
      c.view.film = 0;
      replay();
      function label(word, p, width = 3.5) {
        const mark = textSprite(word, '#233c40', 'white');
        mark.scale.set(width, width * 0.375, 1);
        mark.position.copy(p);
        c.layer.add(mark);
        return mark;
      }
      arrows = circuit(c, label);
      ions = ['Cu2+', 'Cl-', 'Cl-'].map((k, i) => c.add(k, ORIGINS[i].clone(), { fixed: true }));
      prior = [V(-4.8, -0.46, 0.89), V(-3.76, -0.46, 0.89), DEST[0]].map((p) => c.add('Cu', p.clone(), { fixed: true }));
      electrons = Array.from({ length: 4 }, () =>
        part(c.layer, new THREE.SphereGeometry(0.15, 16, 12), surface(0xffd45c, { emissive: 0xa36b09 })),
      );
      bond = part(c.layer, new THREE.CylinderGeometry(0.095, 0.095, 1, 12), surface(0x537b61));
      marks = Object.fromEntries(['Cu²⁺', 'Cl⁻', 'Cu', 'Cl₂', 'e⁻'].map((s) => [s, label(s, V(0, 0))]));
    },
    step(c, st, dt) {
      if (!paused) {
        idleTime += dt;
        if (st.charge > 0) time = st.running ? time + dt : Math.min(CYCLE, time + dt);
      }
      replaying = st.charge > 0 && time < CYCLE;
      active = time >= 0 && (st.running || replaying);
      arrows.forEach((arrow) => { arrow.visible = active; });
      const cycle = Math.floor(Math.max(0, time) / CYCLE);
      const t = Math.max(0, time) % CYCLE;
      const phase = (a, b) => unit((t - a) / (b - a));
      const contact = active && t >= 5.4;
      const joined = active && t >= 7.1;
      phaseIndex = !active ? (st.charge > 0 && time >= 0 ? 6 : 0)
        : t < 2.4 ? 1 : t < 4.2 ? 2 : t < 5.4 ? 3 : t < 7.1 ? 4 : 5;
      prior.forEach((m, i) => {
        m.g.visible = active ? cycle > i : time >= 0 && st.charge > 0 && i === 0;
      });
      ions.forEach((m, i) => {
        const p = m.g.position, start = ORIGINS[i];
        if (!active) {
          p.copy(start).add(V(0.49 * Math.sin(idleTime * 1.1 + i * 2), 0.32 * Math.cos(idleTime * 0.75 + i), 0.17 * Math.sin(idleTime + i)));
        } else {
          const dest = i === 0 && cycle < prior.length ? prior[cycle].g.position : DEST[i];
          p.copy(start).lerp(dest, phase(0, 4.1));
          if (i) {
            p.lerp(V(4.22 + (i === 1 ? -0.56 : 0.56), 1.1 + (i === 1 ? 0.22 : -0.22), 1.55), phase(5.4, 7.1));
            const up = phase(7.1, CYCLE);
            p.y += 13 * up * up;
            p.x += 9 * up * up;
          }
        }
        if (m.glowS) m.glowS.visible = !contact;
      });
      // 两个时间窗在界面交接。金点从不跨越两根电极之间的溶液。
      electrons.forEach((e, i) => {
        const neg = i < 2, j = i % 2, side = neg ? -1 : 1;
        const u = neg ? (t - 2.4) / 3 : (7.6 - t) / 2.2;
        e.visible = active && u >= 0 && u <= 1;
        if (!e.visible) return;
        const x = 4.25 * side;
        const terminal = V(1.66 * side, 5.18, 0.46);
        const corner = V(x, 5.18, 0.46);
        const rod = V(x, 3.15, 0.46);
        const end = ions[neg ? 0 : j + 1].g.position.clone();
        if (!neg && t > 5.4) end.copy(DEST[j + 1]);
        end.y += neg ? (j ? 0.22 : -0.22) : 0;
        const k = unit((u - j * 0.09) / 0.91);
        if (k < 0.35) e.position.lerpVectors(terminal, corner, k / 0.35);
        else if (k < 0.6) e.position.lerpVectors(corner, rod, (k - 0.35) / 0.25);
        else e.position.lerpVectors(rod, end, (k - 0.6) / 0.4);
      });
      const a = ions[1].g.position, b = ions[2].g.position;
      bond.visible = joined;
      if (joined) {
        const d = b.clone().sub(a);
        bond.position.copy(a).lerp(b, 0.5);
        bond.scale.y = d.length();
        bond.quaternion.setFromUnitVectors(V(0, 1), d.normalize());
      }
      const electron = electrons.find((e) => e.visible);
      for (const [key, vis, p, dx, dy] of [
        ['Cu²⁺', !contact, ions[0].g.position, active ? 1.12 : -0.75, 0.84],
        ['Cl⁻', !contact, a, active ? -1.16 : 0.34, 0.78],
        ['Cu', contact, ions[0].g.position, 1.12, -0.65],
        ['Cl₂', joined, a, -1.05, 0.67],
        ['e⁻', !!electron, electron ? electron.position : a, -0.42, 0.62],
      ]) {
        marks[key].visible = vis;
        marks[key].position.copy(p).add(V(dx, dy));
      }
    },
    text() {
      return {
        on: active,
        eq: active
          ? '<span class="half-cell">Cu²⁺ + 2e⁻ = Cu</span><span class="eq-gap">　·　</span><span class="half-cell">2Cl⁻ − 2e⁻ = Cl₂↑</span>'
          : 'Cu²⁺　Cl⁻',
        cap: (replaying ? '从通电前回放 · ' : active ? '本轮通电中 · ' : '') + captions[phaseIndex],
      };
    },
  };
}
