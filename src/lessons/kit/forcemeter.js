// 板式弹簧测力计（课本图7.2-2 丙）：绿色刻度板，中间槽里一根弹簧，红色指针，0~max N，分度值 0.2 N。
// 原点在顶上的圆环；挂钩朝 −y。set(F, zeroErr, broken) 设置拉力；hookEnd 是挂钩下端（局部 y）。
import * as THREE from 'three';
import { canvasTex } from './props.js';
import { paint, inked } from '../../live/ink.js';
import { clamp } from './interact.js';

export const FM = { MAX: 5, PER_N: 0.024, L: 0.2, ZERO: 0.034 };

export function forceMeter({ max = FM.MAX, perN = FM.PER_N, length = FM.L } = {}) {
  const MAX = max, PER_N = perN, L = length, ZERO = FM.ZERO;
  const g = new THREE.Group();
  const W = 0.046;
  const tex = canvasTex(256, 1100, (c, w, h) => {
    c.fillStyle = '#cfe0c8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f7f6ef'; c.fillRect(w / 2 - 22, 40, 44, h - 80);      // 中间的槽
    const px = h / L;
    c.strokeStyle = '#23293a'; c.fillStyle = '#23293a'; c.textAlign = 'center';
    for (let i = 0; i <= MAX * 5; i++) {
      const y = (ZERO + (i / 5) * PER_N) * px, major = i % 5 === 0;
      c.lineWidth = major ? 5 : 2.6;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * 22, y); c.lineTo(w / 2 + s * (22 + (major ? 36 : 20)), y); c.stroke(); }
      if (major) { c.font = 'bold 40px sans-serif'; for (const s of [-1, 1]) c.fillText((i / 5).toFixed(1).replace('.0', i ? '.0' : ''), w / 2 + s * 92, y + 14); }
    }
    c.font = 'bold 46px serif'; c.fillText('N', w / 2 - 92, 62); c.fillText('N', w / 2 + 92, 62);
  });
  const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(W, L, 0.008), [paint(0xb9cdb2), paint(0xb9cdb2), paint(0xb9cdb2), paint(0xb9cdb2), new THREE.MeshBasicMaterial({ map: tex }), paint(0xb9cdb2)]), { width: 1.3 });
  plate.position.y = -0.012 - L / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0015, 6, 18), paint(0x8f99a8));
  ring.position.y = -0.005;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.008), paint(0x8f99a8));
  cap.position.y = -0.011;
  // 弹簧（一条螺旋线，跟着伸长）
  const N = 220, coil = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x5a6070 }));
  coil.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  coil.position.z = 0.0048;
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0016, 0.0018), new THREE.MeshBasicMaterial({ color: 0xd23b2b }));
  pointer.position.z = 0.0055;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 1, 8), paint(0x8f99a8));
  rod.geometry.translate(0, -0.5, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0016, 6, 16, Math.PI * 1.4), paint(0x8f99a8));
  hook.rotation.z = Math.PI * 0.8;
  g.add(plate, ring, cap, coil, pointer, rod, hook);
  g.pointer = pointer;          // 给“凑近看指针”用
  g.set = (F, zeroErr = 0, broken = false) => {
    const ext = clamp(F + zeroErr, -0.3, MAX * 1.35) * PER_N;
    const py = -0.012 - ZERO - ext;
    pointer.position.y = py;
    const top = -0.016, len = py - top, turns = 14;
    const pos = coil.geometry.attributes.position;
    for (let i = 0; i < N; i++) { const t = i / (N - 1); pos.setXYZ(i, Math.sin(t * turns * Math.PI * 2) * 0.007 * (broken ? 0.6 + 0.4 * Math.sin(t * 9) : 1), top + len * t, Math.cos(t * turns * Math.PI * 2) * 0.001); }
    pos.needsUpdate = true;
    rod.position.y = py; rod.scale.y = L - ZERO - ext + 0.006 + 0.012 + ext;
    hook.position.y = -0.012 - L - 0.012 - ext + 0.0;
    g.hookEnd = hook.position.y - 0.006;
  };
  g.set(0);
  return g;
}

