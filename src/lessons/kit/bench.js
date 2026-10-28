// 电学实验台：亲手连电路。
//   · 从一个接线柱按住拖到另一个接线柱 → 连一根导线（拖的时候导线跟着鼠标）
//   · 点一下导线 → 拆掉它
//   · 点开关 → 合上 / 断开；点小灯泡（允许时）→ 拧下 / 拧上；拖滑动变阻器的滑片 → 改变接入的电阻
// 每次改动后重新求解电路，回调 onChange(circuit)，实验据此判断“连对了没有”。
import * as THREE from 'three';
import { rayToLocal } from './interact.js';
import { paint } from '../../live/ink.js';
import { splitId } from './circuit.js';

export class Bench {
  /**
   * circuit：kit/circuit.js 的 Circuit（它的 group 已经加到 root 里）
   * opts.locked：这些导线不能拆（实验预先连好的部分），数组 [[a, b], ...]
   * opts.unscrew：允许拧下小灯泡
   * opts.maxWires：最多几根导线（防止乱连）
   */
  constructor(circuit, root, { onChange, locked = [], unscrew = true, maxWires = 14, tag } = {}) {
    Object.assign(this, { circuit, root, onChange, unscrew, maxWires });
    this.locked = new Set(locked.map(([a, b]) => key(a, b)));
    this.enabled = true;
    // 每个接线柱一个看不见的拾取球 + 一个悬停时出现的光圈
    this.posts = [];
    const pickGeo = new THREE.SphereGeometry(0.0085, 10, 8);
    const ringGeo = new THREE.TorusGeometry(0.0075, 0.0012, 6, 24);
    for (const p of circuit.parts.values()) {
      for (const [t, pos] of Object.entries(p.terminals)) {
        if (t === 'P') continue;                  // 滑片不是接线柱
        const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false }));
        pick.position.set(...pos);
        pick.userData.term = `${p.name}.${t}`;
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0, depthTest: false }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(...pos);
        ring.renderOrder = 30;
        p.group.add(pick, ring);
        this.posts.push({ pick, ring, id: pick.userData.term, part: p });
      }
    }
    // 拖动中的临时导线
    this.temp = new THREE.Mesh(new THREE.BufferGeometry(), paint(0xe08a3c, { unique: true, transparent: true, opacity: 0.75 }));
    this.temp.visible = false;
    circuit.group.add(this.temp);
    this.drag = null;
    this.hover = null;
    this.t = 0;
    circuit.solve();
  }

  _hit(ray) {
    const objs = [...this.posts.map((p) => p.pick)];
    const wires = this.circuit.wireGroup.children.filter((c) => c.userData.wire);
    const hits = ray.intersectObjects([...objs, ...wires], false);
    // 接线柱优先（接线柱上已经接着导线时，按下去仍然是从接线柱拖出新导线）
    const t = hits.find((h) => h.object.userData.term);
    // 滑动变阻器的滑片走到头时会挨着 C/D 接线柱：只有正对接线柱中心点下去才算接线柱，否则算抓滑片
    const sl = [...this.circuit.parts.values()].filter((p) => p.kind === 'rheostat').map((p) => ({ p, h: ray.intersectObject(p.slider, true)[0] })).find((x) => x.h);
    if (t && sl) {
      const c = t.object.getWorldPosition(new THREE.Vector3()), r = 0.0085 * t.object.getWorldScale(new THREE.Vector3()).x;
      if (ray.ray.distanceToPoint(c) > r * 0.5) return { part: sl.p, point: sl.h.point };
    }
    if (t) return { term: t.object.userData.term, point: t.point };
    // 滑片 / 夹子压在导线下面时，抓的是滑片（导线可以点导线别处来拆）
    if (sl) return { part: sl.p, point: sl.h.point };
    const w = hits.find((h) => h.object.userData.wire);
    if (w) return { wire: w.object.userData.wire, point: w.point };
    // 元件本身（开关、灯、滑动变阻器）
    for (const p of this.circuit.parts.values()) {
      if (!p.clickable) continue;
      const hh = ray.intersectObject(p.group, true);
      if (hh.length) return { part: p, point: hh[0].point };
    }
    return null;
  }

  pointer() {
    return {
      down: (ray) => {
        if (!this.enabled) return false;
        const hit = this._hit(ray);
        if (!hit) return false;
        if (hit.term) {
          if (this.circuit.wires.length >= this.maxWires) { this.onChange?.(this.circuit, { msg: '导线太多了，先拆掉几根（点导线就能拆）。' }); return true; }
          this.drag = { from: hit.term, moved: false };
          return true;
        }
        if (hit.wire) { this.drag = { wire: hit.wire, moved: false }; return true; }
        if (hit.part) {
          const p = hit.part;
          if (p.kind === 'rheostat') { this.drag = { slider: p, moved: false }; return true; }
          this.drag = { part: p, moved: false };
          return true;
        }
        return false;
      },
      move: (ray) => {
        const hit = this.enabled ? this._hit(ray) : null;
        this.hover = hit?.term || null;
        const c = document.getElementById('c');
        if (!this.drag) { c.style.cursor = hit ? (hit.term ? 'crosshair' : 'pointer') : ''; return !!hit; }
        this.drag.moved = true;
        if (this.drag.from) {
          // 临时导线：从起点接线柱到鼠标（鼠标所在的桌面高度）
          const a = this.circuit.terminalWorld(this.drag.from);
          const b = hit?.term ? this.circuit.terminalWorld(hit.term) : rayToLocal(ray, this.circuit.group, 'xz', a.y);
          if (b) this._tempWire(a, b);
          this.drag.to = hit?.term && hit.term !== this.drag.from ? hit.term : null;
        }
        if (this.drag.slider) {
          const p = this.drag.slider;
          const loc = rayToLocal(ray, p.group, 'xz', p.dragY ?? 0.04);
          if (loc) { p.setPos(p.posFromLocalX(loc.x)); this.onChange?.(this.circuit, {}); }
        }
        return true;
      },
      up: () => {
        const d = this.drag;
        this.drag = null;
        this.temp.visible = false;
        if (!d) return false;
        const C = this.circuit;
        if (d.from) {
          if (d.to) {
            if (C.wires.some((w) => key(w.a, w.b) === key(d.from, d.to))) this.onChange?.(C, { msg: '这两个接线柱之间已经有一根导线了。' });
            else { C.wire(d.from, d.to); C.solve(); this.onChange?.(C, { added: [d.from, d.to] }); }
          }
          return true;
        }
        if (d.wire && !d.moved) {
          if (this.locked.has(key(d.wire.a, d.wire.b))) { this.onChange?.(C, { msg: '这根导线是实验里固定好的。' }); return true; }
          C.removeWire(d.wire.a, d.wire.b); C.solve(); this.onChange?.(C, { removed: [d.wire.a, d.wire.b] });
          return true;
        }
        if (d.part && !d.moved) {
          const p = d.part;
          if (p.kind === 'switch') { p.toggle(); this.onChange?.(C, { toggled: p.name }); }
          else if (p.kind === 'lamp' && this.unscrew) { p.unscrew(); this.onChange?.(C, { unscrewed: p.name }); }
          return true;
        }
        if (d.slider) C.solve();
        return true;
      },
    };
  }

  _tempWire(a, b) {
    const lift = Math.min(0.05, 0.01 + a.distanceTo(b) * 0.15);
    const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + lift;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    this.temp.geometry.dispose();
    this.temp.geometry = new THREE.TubeGeometry(curve, 24, 0.0018, 6, false);
    this.temp.visible = true;
  }

  update(dt) {
    this.t += dt;
    for (const p of this.posts) {
      const target = this.drag?.from ? (p.id === this.drag.from ? 1 : p.id === this.drag.to ? 1 : 0.35) : p.id === this.hover ? 1 : 0;
      p.ring.material.opacity += (target - p.ring.material.opacity) * Math.min(1, dt * 12);
      p.ring.scale.setScalar(1 + (p.id === this.hover || p.id === this.drag?.to ? 0.25 + Math.sin(this.t * 8) * 0.08 : 0));
    }
    // 电源被短路：导线发红
    const shorted = [...this.circuit.parts.values()].some((p) => p.kind === 'battery' && p.short);
    for (const t of this.circuit._wireTubes || []) {
      const m = t.material;
      if (shorted && !t.userData.hot) { t.material = paint(0xe0473a, { unique: true }); t.userData.hot = m; }
      else if (!shorted && t.userData.hot) { t.material.dispose(); t.material = t.userData.hot; t.userData.hot = null; }
    }
  }
}

const key = (a, b) => [a, b].sort().join('~');

// ---------------------------------------------------------------- 电路的拓扑判断（实验用来检查“连对了没有”）

/** 把导线和闭合的开关看成理想连线，求“电气上相连”的端子分组。返回 find(term) → 组号。 */
export function nets(circuit, { closedSwitch = true } = {}) {
  const parent = new Map();
  const find = (x) => { if (!parent.has(x)) parent.set(x, x); while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const join = (a, b) => parent.set(find(a), find(b));
  for (const w of circuit.wires) join(w.a, w.b);
  for (const p of circuit.parts.values()) {
    if (p.kind === 'switch' && closedSwitch && p.closed) join(`${p.name}.a`, `${p.name}.b`);
    for (const [a, b] of p.shorted || []) join(`${p.name}.${a}`, `${p.name}.${b}`);
  }
  return find;
}

/** 流过某个元件的电流大小（A） */
export const currentOf = (circuit, name) => Math.abs(circuit.current(name));

/** 某元件两端的电压大小（V） */
export function voltageOf(circuit, name, a = 'a', b = 'b') {
  try { return Math.abs(circuit.voltage(`${name}.${a}`, `${name}.${b}`)); } catch { return 0; }
}
