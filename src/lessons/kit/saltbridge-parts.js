// 选择性必修1，第96～97页。宏观盐桥和微观图共用同一条倒 U 形曲线。
import * as THREE from 'three';
import { textSprite } from './microworld.js';
import { clip, V } from './galvanic-parts.js';

export const span = 0.047, leg = 0.047, gripRadius = 0.0049;
export function bridgeClip(color) {
  const grip = clip(color);
  const jaws = grip.children.filter(part => part.geometry.type === 'BoxGeometry');
  // 从铆钉处张开，稍侧转夹身，让学生从实验台正面也能看到开口。
  function open(held) {
    grip.rotation.y = held ? 0.9 : 0;
    for (const jaw of jaws) {
      const side = Math.sign(jaw.position.z);
      const angle = held ? 0.86 : 0;
      jaw.rotation.x = -side * angle;
      jaw.position.y = -0.004 - 0.005 * Math.cos(angle);
      jaw.position.z = side * (0.0019 + 0.005 * Math.sin(angle));
    }
  }
  return { grip, open };
}

function arch(w, h, r) {
  const path = new THREE.CurvePath();
  const line = (a, b) => path.add(new THREE.LineCurve3(a, b));
  const bend = (a, b, c) => path.add(new THREE.QuadraticBezierCurve3(a, b, c));
  line(V(-w, -h), V(-w, -r));
  bend(V(-w, -r), V(-w, 0), V(-w + r, 0));
  line(V(-w + r, 0), V(w - r, 0));
  bend(V(w - r, 0), V(w, 0), V(w, -r));
  line(V(w, -r), V(w, -h));
  return path;
}

function tube(path, radius, material) {
  return new THREE.Mesh(new THREE.TubeGeometry(path, 64, radius, 16), material);
}

export function saltBridge() {
  const curve = arch(span, leg, 0.009);
  // 横管中段是握持点；两弯和两腿也可拾取。
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(gripRadius, gripRadius, 0.054, 24, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xc3d9d4, transparent: true, opacity: 0.26, depthWrite: false, roughness: 0.22, clearcoat: 1 }));
  grip.geometry.rotateZ(Math.PI / 2);
  const glass = tube(curve, 0.0047, new THREE.MeshPhysicalMaterial({
    color: 0xb8d7d4, transparent: true, opacity: 0.45, roughness: 0.16, clearcoat: 1, depthWrite: false,
  }));
  glass.renderOrder = 12;
  const gel = tube(curve, 0.00335, new THREE.MeshStandardMaterial({ color: 0xd7e5dd, roughness: 0.43 }));
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.00335, 20), gel.material);
    end.rotation.x = Math.PI / 2;
    end.position.set(side * span, -leg, 0);
    glass.add(end);
  }
  const body = new THREE.Group();
  body.add(grip, gel, glass);
  // 以横管为握持中心，点到弯管、两腿时也能拿起整件器材。
  const cast = grip.raycast.bind(grip);
  grip.raycast = (ray, hits) => {
    cast(ray, hits);
    const tubeHits = [];
    glass.raycast(ray, tubeHits);
    for (const hit of tubeHits) { hit.object = grip; hits.push(hit); }
  };
  return { body, grip };
}

// 从表前接线柱向外弯，再绕到杯外的电极，导线不会穿过表壳。
export function lead(group, post, side) {
  const material = new THREE.MeshStandardMaterial({ color: side < 0 ? 0x384046 : 0x9b4131, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  group.add(mesh);
  let last = null;
  return (end) => {
    if (last && last.distanceToSquared(end) < 1e-10) return;
    last = end.clone();
    const sideX = post.x + 0.034 * side;
    const top = Math.max(end.y + 0.017, 0.04);
    const path = new THREE.CatmullRomCurve3([post, post.clone().add(V(0.009 * side, 0.01, 0.006)),
      V(sideX, 0.025, post.z + 0.006), V(end.x + side * 0.017, top, end.z + 0.024),
      end.clone().add(V(side * 0.002, 0.009, 0)), end]);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(path, 50, 0.0014, 8);
  };
}

const segment = (t, a, b) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
export function transportScene() {
  let time = 0, wire, salt, ions, electrons, electronName, zn, cu, names;
  const fixed = { fixed: true };
  const zincX = -4.95, copperX = 4.95;
  const start = V(zincX - 0.35, 1.37, 0.54), dissolved = V(-5.6, 0.45, 3.8);
  const free = V(6.15, 0.55, 3.6), receive = V(5.78, 1.32, 1.25), deposit = V(5.48, 1.37, 0.55);
  const emitted = 1.55, arriving = 4.2, reduced = 6.3, deposited = 7.9, end = 9;
  // 持续通电时轮换观察两处电极表面，换景时淡出，避免把下一组看成上一组粒子倒着走。
  const period = end + 2;
  const phase = () => time % period;
  const ionStarts = [-0.22, 0.065, 0.38];
  const origin = V(), landing = V(), approach = V();
  const label = (c, word, color) => {
    const sprite = textSprite(word, color, '#fff');
    sprite.scale.set(3.55, 1.33, 1);
    c.layer.add(sprite);
    return sprite;
  };
  return {
    holoBase: false, still: true, labels: () => false, labelOnly: () => false,
    get time() { return time; },
    set time(v) { time = v; },
    get opacity() {
      const t = phase();
      return (time < period ? 1 : segment(t, 0, 0.45)) * (1 - segment(t, period - 0.45, period));
    },
    init(c, st) {
      time = 0;
      c.view.film = 0;
      c.view.paper = null;
      for (const [x, metal, color] of [[zincX, 'Zn', 0xc6d4d3], [copperX, 'Cu', 0x69b1cf]]) {
        const liquid = new THREE.Mesh(new THREE.BoxGeometry(5.7, 2.1, 5.0), new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.18, depthWrite: false,
        }));
        liquid.position.set(x * 0.85, 0.48, 1.45);
        c.layer.add(liquid);
        for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
          c.add(metal, V(x + (col - 0.5) * 1.09, 0.32 + row * 1.05, -0.5), fixed);
        }
      }
      zn = c.add('Zn', start, fixed);
      cu = c.add('Cu', free, fixed);
      names = [label(c, 'Zn', '#424d60'), label(c, 'Zn²⁺', '#424d60'),
        label(c, 'Cu²⁺', '#884222'), label(c, 'Cu', '#884222')];
      wire = new THREE.CatmullRomCurve3([V(zincX - 0.35, 2.7, 0.05), V(-4.65, 4.6, -0.75),
        V(-2.8, 5.45, -1.2), V(2.8, 5.45, -1.2), V(5.15, 4.6, -0.75), V(5.5, 2.7, 0.05)]);
      const conductor = tube(wire, 0.11, new THREE.MeshStandardMaterial({ color: 0x485153 }));
      conductor.visible = st.wired;
      c.layer.add(conductor);
      salt = arch(2.5, 2.85, 0.55);
      const bridge = tube(salt, 0.6, new THREE.MeshBasicMaterial({
        color: 0x749d99, opacity: 0.21, transparent: true, depthWrite: false,
      }));
      bridge.position.set(0, 3.65, 1.4);
      bridge.visible = st.immersed;
      c.layer.add(bridge);
      ions = [];
      for (let n = 0; n < 3; n++) for (const sign of [-1, 1]) {
        const atom = c.add(sign < 0 ? 'Cl-' : 'K+', V(0, 0), fixed);
        atom.g.visible = st.immersed;
        const name = n === 2 ? label(c, sign < 0 ? 'Cl⁻' : 'K⁺', sign < 0 ? '#1d6c39' : '#533688') : null;
        ions.push({ atom, name, sign, n });
      }
      electrons = [0, 1].map(() => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 12),
          new THREE.MeshBasicMaterial({ color: 0xf6ce64 }));
        c.layer.add(e);
        return e;
      });
      electronName = label(c, 'e⁻', '#30374e');
    },
    step(c, st, dt) {
      if (st.closed && !st.paused) time += dt;
      const t = st.closed ? phase() : st.worked ? end : 0;
      const nextSite = Math.floor(time / period) % 2;
      origin.copy(start).x += nextSite * 0.9;
      approach.copy(receive).x -= nextSite * 1.09;
      landing.copy(deposit).x -= nextSite * 1.09;
      zn.g.position.lerpVectors(origin, dissolved, segment(t, emitted, 3.8));
      if (t < reduced) cu.g.position.lerpVectors(free, approach, segment(t, 1.6, arriving));
      else cu.g.position.lerpVectors(approach, landing, segment(t, reduced, deposited));
      names.forEach((name, i) => {
        name.visible = i === (t < emitted ? 0 : 1) || i === (t < reduced ? 2 : 3);
        name.position.copy(i < 2 ? zn.g.position : cu.g.position).add(V(i < 2 ? -0.65 : 0.25, -0.87, 0.65));
      });
      electrons.forEach((e, j) => {
        const delay = 0.32 * j;
        const u = segment(t, 1.23 + delay, 5.05 + delay);
        e.visible = st.closed && u > 0 && t < reduced;
        if (u < 0.15) e.position.lerpVectors(origin, wire.getPointAt(0), u / 0.15);
        else if (u < 0.8) e.position.copy(wire.getPointAt((u - 0.15) / 0.65));
        else e.position.lerpVectors(wire.getPointAt(1), approach.clone().add(V(j ? 0.37 : -0.37, 0.46, 0.42)), (u - 0.8) / 0.2);
        e.position.z += 0.16;
      });
      electronName.visible = electrons[0].visible;
      electronName.position.copy(electrons[0].position).add(V(0.3, 0.83, 0.1));
      ions.forEach(({ atom, name, sign, n }) => {
        // 每侧两粒出桥补偿两个单位电荷，另一粒仍在桥内。
        const u = segment(t, emitted + (2 - n) * 0.35, end - n * 0.4);
        // 两种离子交错分布，起点与净迁移方向无关。
        const f = THREE.MathUtils.lerp(ionStarts[n], n ? 0.68 : 0.18, u);
        atom.g.position.copy(salt.getPointAt(0.5 + sign * Math.min(0.5, f))).add(V(0, 3.65, 1.4));
        atom.g.position.z += sign * 0.25;
        const out = Math.max(0, (f - 0.5) / 0.18);
        atom.g.position.add(V(sign * out * (n === 2 ? 0.57 : -0.75), -out * 0.28, out * (n === 2 ? 2.1 : 0.32)));
        atom.g.visible = st.immersed || out > 0;
        if (name) {
          name.visible = atom.g.visible;
          name.position.copy(atom.g.position).add(V(-sign * 0.35, -0.86, 0.55));
        }
      });
    },
    text(c, st) {
      if (!st.closed) return { eq: '电路断开', cap: !st.immersed
        ? (st.wired ? '导线仍连着两极，电路中没有持续电流。把盐桥放回两杯溶液，就能再看离子迁移。' : '导线和盐桥都没有接通，电路中没有持续电流。')
        : '盐桥两端已经浸入溶液，外电路还没有接通。' };
      const t = phase();
      if (t < 1.23) return { eq: '锌极　│　盐桥　│　铜极', cap: '看锌片表面的一个锌原子，同时留意盐桥内的两种离子。' };
      if (t < arriving) return { eq: 'Zn − 2e⁻ = Zn²⁺', cap: '锌原子失去两个电子，Zn²⁺ 进入溶液。电子沿导线流向铜极。' };
      if (t < reduced) return { eq: 'Cu²⁺ + 2e⁻ = Cu', cap: '看铜片表面，两个电子先后到达同一个 Cu²⁺。' };
      if (t < deposited) return { eq: 'Cu²⁺ + 2e⁻ = Cu', cap: 'Cu²⁺ 得到两个电子，变成铜原子，沉积在铜片上。' };
      if (t < end) return { eq: 'Zn + Cu²⁺ = Zn²⁺ + Cu', cap: '两个 Cl⁻ 移入锌侧溶液，两个 K⁺ 移入铜侧溶液，两侧保持电中性。' };
      return { eq: 'Zn + Cu²⁺ = Zn²⁺ + Cu', cap: '电路仍接通。换一处电极表面，继续追踪下一组粒子。' };
    },
  };
}
