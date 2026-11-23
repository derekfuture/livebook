// 容量瓶（默认 100 mL，20 ℃）：平底梨形瓶身 + 细长瓶颈 + 一圈刻度线 + 磨口塞。原点在瓶底中心。
// 体积和液面高度按内壁轮廓积分（瓶身的大小按“装到刻度线正好 vol mL”算出来）；液体是旋转体，液面变了重新生成。
// 液面在瓶颈里是凹液面：level 指凹液面最低处的高度（读数看最低处），边上高约 0.8 mm。
//   const f = volFlask(); group.add(f.group); f.setVolume(mL); f.mark（刻度线高度）; f.levelOf(mL); f.setStopper(on)
import * as THREE from 'three';
import { glassMat } from './chem.js';
import { water2 } from './chemfx.js';
import { paint, inked } from '../../live/ink.js';
import { textPlate } from './props.js';

const WALL = 0.0011;
// 内壁轮廓（半径, 高度），瓶身部分的半径之后整体缩放；瓶颈内半径固定
const BODY = [[0.0215, 0.0012], [0.026, 0.004], [0.0292, 0.011], [0.0306, 0.021], [0.0302, 0.031], [0.0278, 0.041], [0.0228, 0.05], [0.0158, 0.057], [0.0098, 0.0625]];

export function volFlask({ vol = 100, neckR = 0.0061, neckTop = 0.168, markY = 0.128, label = '100 mL\n20℃' } = {}) {
  // 先按给定的瓶身算出刻度线以下的体积，再把瓶身半径整体缩放，使装到 markY 正好是 vol mL
  const neck0 = 0.068;
  const prof = (k) => [...BODY.map(([r, y]) => [r * k, y]), [neckR, neck0], [neckR, neckTop]];
  const volTo = (p, y) => { let v = 0; for (let i = 1; i < p.length; i++) { const [r0, y0] = p[i - 1], [r1, y1] = p[i]; if (y0 >= y) break; const yb = Math.min(y1, y), t = (yb - y0) / (y1 - y0 || 1), rb = r0 + (r1 - r0) * t; v += Math.PI / 3 * (yb - y0) * (r0 * r0 + r0 * rb + rb * rb); } return v * 1e6; };
  let lo = 0.6, hi = 1.6;
  for (let i = 0; i < 40; i++) { const k = (lo + hi) / 2; if (volTo(prof(k), markY) > vol) hi = k; else lo = k; }
  const P = prof((lo + hi) / 2);
  const rAt = (y) => { for (let i = 1; i < P.length; i++) if (y <= P[i][1]) { const [r0, y0] = P[i - 1], [r1, y1] = P[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0 || 1); } return neckR; };
  const volumeAt = (y) => volTo(P, y);
  const levelOf = (mL) => { let a = P[0][1], b = neckTop; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (volumeAt(m) > mL) b = m; else a = m; } return (a + b) / 2; };

  const group = new THREE.Group();
  // 玻璃：外壁 = 内壁 + 壁厚；瓶底封住；瓶口外翻一点
  const outer = [[0.0001, 0], ...P.map(([r, y]) => [r + WALL, y]), [neckR + WALL + 0.0012, neckTop + 0.002]];
  const glass = new THREE.Mesh(new THREE.LatheGeometry(outer.map(([r, y]) => new THREE.Vector2(r, y)), 40), glassMat({ opacity: 0.22 }));
  glass.renderOrder = 9; group.add(glass);
  const rim = inked(new THREE.Mesh(new THREE.TorusGeometry(neckR + WALL + 0.0008, 0.0007, 6, 28), paint(0xdfe9ee)), { width: 0.4 }); rim.rotation.x = Math.PI / 2; rim.position.y = neckTop + 0.002; group.add(rim);
  const base = inked(new THREE.Mesh(new THREE.CylinderGeometry(P[0][0] + WALL, P[0][0] + WALL, 0.0012, 32), paint(0xe8eef1)), { width: 0.6 }); base.position.y = 0.0006; group.add(base);
  // 轮廓线（纸本画风：玻璃的边用细线描出来）
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.LatheGeometry(outer.map(([r, y]) => new THREE.Vector2(r, y)), 2), 30), new THREE.LineBasicMaterial({ color: 0x6f8190, transparent: true, opacity: 0.55 }));
  edge.renderOrder = 9; group.add(edge);
  // 刻度线：瓶颈上一整圈（前后两半都画，平视时前后重合成一条线）
  const mark = new THREE.Mesh(new THREE.TorusGeometry(neckR + WALL + 0.0001, 0.00028, 4, 48), paint(0x23293a, { keep: true }));
  mark.rotation.x = Math.PI / 2; mark.position.y = markY; mark.renderOrder = 11; group.add(mark);
  const lab = textPlate(label.split('\n').join('  '), { w: 0.03, h: 0.008, color: '#23293a', bg: 'rgba(255,255,255,0)', font: 'bold 64px "Times New Roman", serif' });
  lab.position.set(0, 0.026, rAt(0.026) + WALL + 0.0006); group.add(lab);

  // 液体（凹液面：中心最低）
  const liqMat = water2({ color: 0xc3dce4 });
  const liquid = new THREE.Mesh(new THREE.BufferGeometry(), liqMat); liquid.renderOrder = 7; group.add(liquid);
  let shownV = -1;
  const setVolume = (mL) => {
    mL = Math.max(0, mL);
    if (Math.abs(mL - shownV) < 0.004) return; shownV = mL;
    liquid.geometry.dispose();
    if (mL < 0.05) { liquid.geometry = new THREE.BufferGeometry(); return; }
    const L = levelOf(mL), pts = [new THREE.Vector2(0, P[0][1])];
    for (let i = 0; i < P.length && P[i][1] < L; i++) pts.push(new THREE.Vector2(P[i][0] - 0.0002, P[i][1]));
    const rl = rAt(L) - 0.0002, men = L < 0.068 ? 0 : 0.0008;          // 只有液面到了瓶颈里才明显凹下去
    pts.push(new THREE.Vector2(rl, L + men), new THREE.Vector2(rl * 0.5, L + men * 0.25), new THREE.Vector2(0, L));
    liquid.geometry = new THREE.LatheGeometry(pts, 32);
  };
  // 磨口塞：on 时塞在瓶口；off 时由课程自己摆放（stopper.group 加到别处）
  const stopper = new THREE.Group();
  { const m = paint(0xe3ecef, { transparent: true, opacity: 0.85 });
    const plug = inked(new THREE.Mesh(new THREE.CylinderGeometry(neckR + 0.0003, neckR - 0.0006, 0.012, 16), m), { width: 0.4 }); plug.position.y = -0.004; stopper.add(plug);
    const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.004, 20), m), { width: 0.5 }); head.position.y = 0.004; stopper.add(head); }
  stopper.position.y = neckTop + 0.004; group.add(stopper);
  const setStopper = (on) => { stopper.visible = on; };
  const pickH = markY - 0.004;          // 拾取只到刻度线下面：瓶口插着玻璃棒、滴管时，它们拿得到
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, pickH, 10), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.y = pickH / 2; pick.userData.pick = true; group.add(pick);
  setVolume(0);
  return { group, glass, liquid, liqMat, mark, markY, neckR, neckTop, rAt, levelOf, volumeAt, setVolume, stopper, setStopper, pick, mouth: new THREE.Vector3(0, neckTop + 0.002, 0) };
}
