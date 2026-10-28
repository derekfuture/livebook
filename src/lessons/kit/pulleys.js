// 滑轮装置（课本图12.3-4、12.3-5、12.4-2 的画法）：横梁、定滑轮、动滑轮、绳子、钩码、弹簧测力计。
// 在 xy 平面里画（z = 0）。rig(kind) 返回 { group, set(s), info }：s 是绳端（测力计挂钩）移动的距离（米）。
//   kind：'direct' 直接提  'fixed' 定滑轮（向下拉）  'movable' 动滑轮（向上拉）  'g3' 滑轮组 3 段（向上拉）  'g2' 滑轮组 2 段（向下拉）
// 拉力 F = (G + n_m·G动)/n ×（1 + 摩擦）；钩码升高 h = s / n。
import * as THREE from 'three';
import { paint, inked, hull } from '../../live/ink.js';
import { hookWeight } from './props.js';
import { forceMeter } from './forcemeter.js';

export const RIG = {
  direct: { n: 1, down: false, fixed: false, movable: false, label: '直接用测力计提' },
  fixed: { n: 1, down: true, fixed: true, movable: false, label: '定滑轮' },
  movable: { n: 2, down: false, fixed: false, movable: true, label: '动滑轮' },
  g3: { n: 3, down: false, fixed: true, movable: true, label: '滑轮组（3 段绳子）' },
  g2: { n: 2, down: true, fixed: true, movable: true, label: '滑轮组（2 段绳子）' },
};

const R1 = 0.03, R2 = 0.02;         // 定滑轮、动滑轮半径（画得大一些，两边的绳子和测力计、钩码才不会挤在一起）

function wheel(r) {
  const g = new THREE.Group();
  const w = hull(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.008, 28), paint(0xd2d6dc)), 0.0012);
  w.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.01, 14), paint(0x8f99a8));
  hub.rotation.x = Math.PI / 2;
  const frame = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, r * 2.6, 0.012), paint(0xb8bec8)), { width: 1 });
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.001, 6, 12, Math.PI * 1.4), paint(0x8f99a8));
  g.add(w, hub, frame, hook);
  g.hook = hook;
  return g;
}

/**
 * top：横梁高度；nW：钩码个数（每个 wG 牛）；gm：动滑轮重；mu：摩擦（拉力增加的比例）
 */
export function rig(kind, { top = 0.5, nW = 4, wG = 0.5, gm = 0.3, mu = 0 } = {}) {
  const K = RIG[kind];
  const group = new THREE.Group();
  const beam = inked(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.05), paint(0xd9b98a)), { width: 1.2 });
  beam.position.y = top + 0.005;
  group.add(beam);
  const fixedW = K.fixed ? wheel(R1) : null, movW = K.movable ? wheel(R2) : null;
  const PF = new THREE.Vector3(0, top - 0.03, 0);
  if (fixedW) { fixedW.position.copy(PF); fixedW.hook.position.set(0, -R1 * 1.35, 0); group.add(fixedW); }
  if (movW) { movW.hook.position.set(0, -R2 * 1.35, 0); group.add(movW); }
  const weights = Array.from({ length: nW }, () => hookWeight({ r: 0.011, h: 0.02 }));
  weights.forEach((w) => group.add(w));
  const meter = forceMeter();
  if (K.down) meter.rotation.z = Math.PI;      // 向下拉：挂钩朝上，手拉下面的圆环
  group.add(meter);
  const rope = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2b2f3a }));
  group.add(rope);

  const G = nW * wG;
  const F0 = ((G + (K.movable ? gm : 0)) / K.n) * (1 + (K.fixed || K.movable ? mu : 0));
  // 初始：钩码底部离桌面 0.03；
  const loadBottom0 = 0.03, wH = weights[0].height + 0.002;
  const info = { n: K.n, G, F: F0, down: K.down, h: 0, s: 0, kind };

  const arc = (c, r, a0, a1, pts, k = 10) => { for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; pts.push(new THREE.Vector3(c.x + r * Math.cos(a), c.y + r * Math.sin(a), 0)); } };

  info.set = (s) => {
    info.s = s; info.h = s / K.n;
    const h = info.h;
    // 钩码：顶部挂点
    const loadTop = loadBottom0 + nW * wH + h;
    const lx = kind === 'fixed' ? -R1 : 0;       // 定滑轮：钩码挂在左边那段绳子下
    weights.forEach((w, i) => w.position.set(lx, loadTop - i * wH, 0));
    meter.set(F0);
    const L = -meter.hookEnd;     // 圆环到挂钩末端的长度
    const pts = [];
    let endY;   // 绳端（测力计挂钩）的位置
    if (kind === 'direct') {
      meter.position.set(0, loadTop + L + 0.004, 0);
      info.end = new THREE.Vector3(0, loadTop + 0.004, 0);
    } else if (kind === 'fixed') {
      // 左边吊钩码，右边向下拉
      endY = PF.y - 0.05 - s;          // 测力计挂在右边，挂钩朝上，手向下拉
      pts.push(new THREE.Vector3(-R1, loadTop + 0.004, 0)); arc(PF, R1, Math.PI, 0, pts); pts.push(new THREE.Vector3(R1, endY, 0));
      meter.position.set(R1, endY - L, 0);
      info.end = new THREE.Vector3(R1, endY, 0);
    } else {
      const PM = new THREE.Vector3(0, loadTop + 0.006 + R2 * 1.35, 0);
      movW.position.copy(PM);
      if (kind === 'movable') {
        // 手在横梁右边向上拉（绳端稍向右偏，和课本图丙一样画在旁边）
        const XE = 0.085;
        endY = PM.y + 0.06 + s;
        pts.push(new THREE.Vector3(-R2, top, 0), new THREE.Vector3(-R2, PM.y, 0)); arc(PM, R2, Math.PI, 2 * Math.PI, pts); pts.push(new THREE.Vector3(XE, endY, 0));
        meter.position.set(XE, endY + L, 0);
        info.end = new THREE.Vector3(XE, endY, 0);
      } else if (kind === 'g3') {
        // 绳子系在动滑轮的框架上 → 绕过定滑轮 → 绕过动滑轮 → 手向上拉
        const XE = 0.09 - R2;
        endY = PF.y - 0.02 - L + s;           // 测力计在横梁左边，挂钩在下
        pts.push(new THREE.Vector3(0, PM.y + R2 * 1.3, 0), new THREE.Vector3(-R1, PF.y, 0)); arc(PF, R1, Math.PI, 0, pts);
        pts.push(new THREE.Vector3(R2, PM.y, 0)); arc(PM, R2, 0, -Math.PI, pts); pts.push(new THREE.Vector3(-R2 - 0.0, PM.y, 0));
        pts.push(new THREE.Vector3(-R2 - XE, endY, 0));
        meter.position.set(-R2 - XE, endY + L, 0);
        info.end = new THREE.Vector3(-R2 - XE, endY, 0);
      } else {
        // g2：绳子系在定滑轮框架下 → 绕过动滑轮 → 绕过定滑轮 → 手向下拉
        endY = PF.y - 0.05 - s;
        pts.push(new THREE.Vector3(0, PF.y - R1 * 1.3, 0), new THREE.Vector3(-R2, PM.y, 0)); arc(PM, R2, Math.PI, 2 * Math.PI, pts);
        pts.push(new THREE.Vector3(R1, PF.y, 0)); arc(PF, R1, 0, Math.PI, pts); pts.push(new THREE.Vector3(-R1 - 0.0, PF.y, 0));
        pts.push(new THREE.Vector3(-R1 - 0.03, endY, 0));
        meter.position.set(-R1 - 0.03, endY - L, 0);
        info.end = new THREE.Vector3(-R1 - 0.03, endY, 0);
      }
    }
    rope.geometry.dispose();
    rope.geometry = new THREE.BufferGeometry().setFromPoints(pts.length ? pts : [new THREE.Vector3(), new THREE.Vector3()]);
    rope.visible = pts.length > 0;
    info.loadTop = loadTop;
    info.ring = meter.position.clone();
  };
  info.set(0);
  info.F = F0;
  return { group, meter, info, weights, beam };
}
