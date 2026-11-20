// 图6-6 的两块金属、电流表和电极界面。长度单位为米，微观图单独放大。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { textSprite } from './microworld.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const box = (w, h, d, color) =>
  inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color, { keep: true })), { width: 0.65 });
function roundedBox(w, h, d, r) {
  const geo = new THREE.BoxGeometry(w, h, d, 8, 8, 8);
  const points = geo.attributes.position;
  const extent = V(w / 2 - r, h / 2 - r, d / 2 - r);
  const min = extent.clone().negate(),
    v = V(0, 0),
    core = V(0, 0);
  for (let i = 0; i < points.count; i++) {
    v.fromBufferAttribute(points, i);
    core.copy(v).clamp(min, extent);
    v.sub(core).setLength(r).add(core);
    points.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
export function strip(copper) {
  return box(0.018, 0.096, 0.0024, copper ? 0xbb633c : 0x97a5ad);
}
const jawWidth = 0.0065, jawLength = 0.01, jawCenterY = -0.009, gripHeight = 0.017;
export function jawTouchesTop(grip, top, halfWidth) {
  const y = top.y - grip.y;
  return y >= jawCenterY - jawLength / 2 && y <= -gripHeight / 2 &&
    Math.abs(grip.x - top.x) <= halfWidth + jawWidth / 2 && Math.abs(grip.z - top.z) <= 0.0024;
}
export function clip(color) {
  const grip = new THREE.Mesh(roundedBox(0.01, gripHeight, 0.008, 0.003), paint(color, { keep: true }));
  for (const sign of [-1, 1]) {
    const jaw = box(jawWidth, jawLength, 0.0014, 0xb4bdc0);
    jaw.rotation.x = -sign * 0.13;
    jaw.position.set(0, jawCenterY, sign * 0.0016);
    grip.add(jaw);
  }
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 12, 8), paint(0xc4ccd0, { keep: true }));
  rivet.position.set(0, -0.003, 0.0039);
  rivet.scale.z = 0.32;
  grip.add(rivet);
  return grip;
}

export function ammeter() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(roundedBox(0.094, 0.067, 0.028, 0.004), paint(0x354746, { keep: true }));
  frame.position.y = 0.036;
  const dial = new THREE.Mesh(
    new THREE.PlaneGeometry(0.082, 0.05),
    new THREE.MeshBasicMaterial({
      map: canvasTex(492, 300, (c, w, h) => {
        c.fillStyle = '#f6f2e2';
        c.fillRect(0, 0, w, h);
        c.save();
        c.translate(w / 2, h * 0.92);
        c.strokeStyle = '#33403d';
        c.fillStyle = '#33403d';
        c.lineWidth = 3;
        for (let i = 0; i <= 20; i++) {
          c.save();
          c.rotate((i / 20 - 0.5) * 1.56);
          c.beginPath();
          c.moveTo(0, -199);
          c.lineTo(0, i % 5 ? -188 : -174);
          c.stroke();
          c.restore();
        }
        c.font = 'bold 44px serif';
        c.textAlign = 'center';
        c.fillText('A', 0, -61);
        c.font = '24px serif';
        c.fillText('0', -154, -149);
        c.restore();
      }),
    }),
  );
  dial.position.set(0, 0.039, 0.0143);
  const needle = new THREE.Group();
  needle.position.set(0, 0.018, 0.0148);
  const tip = box(0.0011, 0.033, 0.0006, 0xac3829);
  tip.position.y = 0.0165;
  needle.add(tip);
  const posts = [-1, 1].map((s) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0048, 0.005, 0.009, 20),
      paint(s > 0 ? 0xb74232 : 0x262d31, { keep: true }),
    );
    post.position.set(s * 0.036, 0.007, 0.022);
    g.add(post);
    return post;
  });
  const foot = box(0.099, 0.005, 0.05, 0x434c48);
  foot.position.y = 0.0026;
  g.add(frame, dial, needle, foot);
  return { g, posts, needle };
}

const unit = (x) => Math.max(0, Math.min(1, x));
export function interfaceScene() {
  let time, zinc, hydrogen, electrons, path, labels;
  const arrival = [5.3, 5.78];
  const start = V(-3.7, 0.68, 1.06);
  const transfer = {
    direct: '锌原子失去两个电子，成为 Zn²⁺ 进入溶液。沿导线看，两个电子正向铜片移动。',
    meter: '锌原子失去两个电子，成为 Zn²⁺ 进入溶液。电子沿导线经过电流表，到达铜片。',
    open: '锌原子失去两个电子，成为 Zn²⁺ 进入溶液。氢离子在锌片表面得到电子。',
  };
  const title = (c, word) => {
    const t = textSprite(word, '#222d3c', '#fff');
    t.scale.set(3.4, 1.28, 1);
    c.layer.add(t);
    return t;
  };
  return {
    holoBase: false,
    get time() {
      return time;
    },
    set time(t) {
      time = t;
    },
    init(c, st) {
      time = 0;
      const connected = st.circuit !== 'open';
      c.view.film = 0;
      // 淡色液面划出溶液和外电路的分界，Zn²⁺ 留在液体中，H₂ 从液面逸出。
      const solution = new THREE.Mesh(
        new THREE.BoxGeometry(12.1, 2.15, 5.8),
        new THREE.MeshBasicMaterial({
          color: 0x9cbfc8,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      solution.position.set(0, 1.075, 1.1);
      c.layer.add(solution);
      for (const [kind, x, present] of [
        ['Zn', -4.2, st.zinc],
        ['Cu', 4.2, st.copper],
      ]) {
        if (!present) continue;
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 2; col++) {
            c.add(kind, V(x + (col - 0.5) * 1.05, 0.6 + row * 1.02, -0.06), { fixed: true });
          }
      }
      zinc = c.add('Zn', start.clone(), { fixed: true });
      zinc.g.visible = st.zinc;
      const side = connected || !st.zinc ? 4.2 : -4.2;
      hydrogen = [-1, 1].map((s) => {
        const ion = c.add('H+', V(side + s * 0.85, 1.6, 3.1), { fixed: true });
        ion.ionLabel = title(c, 'H⁺');
        ion.atomLabel = title(c, 'H');
        return ion;
      });
      if (connected) {
        const left = [V(-4.15, 2.9, 0.4), V(-4.15, 4), V(-2.7, 4.9)];
        const right = [V(2.7, 4.9), V(4.15, 4), V(4.15, 2.9, 0.4)];
        path = new THREE.CurvePath();
        path.add(new THREE.LineCurve3(start, left[0]));
        const lead = (points, color) => {
          const curve = new THREE.CatmullRomCurve3(points);
          path.add(curve);
          c.layer.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.11, 10),
            new THREE.MeshStandardMaterial({ color })));
        };
        if (st.circuit === 'meter') {
          const inlet = V(-0.85, 4.9), outlet = V(0.85, 4.9);
          lead([...left, inlet], 0x333a40);
          path.add(new THREE.LineCurve3(inlet, outlet));
          lead([outlet, ...right], 0xb54335);
          const face = new THREE.Mesh(new THREE.CircleGeometry(0.94, 48),
            new THREE.MeshBasicMaterial({ color: 0xf6f2e2 }));
          face.position.set(0, 5.16, -0.05);
          const rim = new THREE.Mesh(new THREE.RingGeometry(0.88, 0.95, 48),
            new THREE.MeshBasicMaterial({ color: 0x354746 }));
          rim.position.z = 0.01;
          face.add(rim);
          c.layer.add(face);
          title(c, 'A').position.set(0, 5.48, 0.02);
        } else {
          lead([...left, ...right], 0x333a40);
        }
        path.add(new THREE.LineCurve3(right[2], V(3.65, 1.65, 0.85)));
      }
      electrons = [0, 1].map(() => {
        const e = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 20, 12),
          new THREE.MeshBasicMaterial({ color: 0xffcf4d }),
        );
        c.layer.add(e);
        return e;
      });
      labels = Object.fromEntries(['Zn', 'Zn²⁺', 'H₂', 'e⁻', 'Cu'].map((w) => [w, title(c, w)]));
      labels.Cu.position.set(6.0, 2.7, 0);
      labels.Cu.visible = st.copper;
    },
    step(c, st, dt) {
      if (st.zinc) time = (time + dt) % 9;
      const progress = (from, to) => unit((time - from) / (to - from));
      const connected = st.circuit !== 'open';
      const side = connected || !st.zinc ? 4.2 : -4.2;
      zinc.g.position.copy(start).lerp(V(-1.5, 0.95, 2.9), progress(1.1, 4));
      hydrogen.forEach((m, i) => {
        const s = i * 2 - 1;
        const reach = progress(0, 2.5),
          join = progress(5.8, 7.2),
          rise = progress(7.2, 9);
        m.g.position.set(
          side + s * (0.54 - 0.31 * join) - Math.sign(side) * rise * 1.9,
          1.6 + rise * 2.6,
          3.1 - 2.1 * reach + rise * 0.65,
        );
        const charged = time < arrival[i];
        m.ionLabel.visible = charged;
        m.atomLabel.visible = !charged && time < 7.2;
        const label = charged ? m.ionLabel : m.atomLabel;
        label.position.copy(m.g.position);
        label.position.x += s * 1.1;
        label.position.y += s * 0.65;
        m.glowS.visible = charged;
        m.glowS.material.opacity = 0.42;
        const e = electrons[i],
          u = progress(1.1 + i * 0.48, arrival[i]);
        if (connected && u < 0.88) e.position.copy(path.getPointAt(u / 0.88));
        else
          e.position
            .copy(connected ? path.getPointAt(1) : start)
            .lerp(m.g.position, connected ? unit((u - 0.88) / 0.12) : u);
        e.position.z += 0.18; // 电子移到粒子可见的表面时交接。
        e.visible = st.zinc && u > 0 && u < 1;
      });
      const mark = (word, visible, pos, dx, dy) => {
        const t = labels[word];
        t.visible = visible;
        t.position.set(pos.x + dx, pos.y + dy, pos.z);
      };
      mark('Zn', st.zinc && time < 1.1, zinc.g.position, 1.05, 0.8);
      mark('Zn²⁺', st.zinc && time >= 1.1, zinc.g.position, 0.95, -0.85);
      const electron = electrons.find((e) => e.visible);
      mark('e⁻', Boolean(electron), (electron || electrons[0]).position, -0.35, connected ? 1.45 : -1.45);
      mark('H₂', time >= 7.2, hydrogen[1].g.position, 0.8, 0.75);
    },
    text(c, st) {
      let cap;
      if (!st.zinc) cap = '铜片浸在稀硫酸里，铜片上没有气泡。';
      else if (time < 1.1) cap = '看锌片表面的一个锌原子。';
      else if (time < arrival[0]) cap = transfer[st.circuit];
      else if (time < arrival[1]) cap = '第一个氢离子得到一个电子，成为氢原子。';
      else if (time < 7.2) cap = '两个氢离子各得一个电子，形成的两个氢原子靠拢。';
      else cap = '两个氢原子结合成一个氢分子，从金属表面放出。';
      return { on: st.zinc, eq: time < arrival[0] ? 'Zn − 2e⁻ = Zn²⁺' : '2H⁺ + 2e⁻ = H₂↑', cap };
    },
  };
}
