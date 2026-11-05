// 实验基本操作（课本上册第 16–18 页）里各课都要用到的几件事，做成共用的小部件：
//   lampCap    酒精灯灯帽：点燃前取下放在桌上；用完用灯帽盖灭，盖灭后轻提一下灯帽，再重新盖好（第 18 页）。
//   dropBottle 滴瓶：胶头滴管插在滴瓶里，取液后保持橡胶帽在上，不平放、不倒置，用完插回原滴瓶（第 17 页）。
//   bottleCap  试剂瓶的瓶塞 / 瓶盖：拿起瓶子取用时先取下，倒放在桌上；放回原处后立即盖好（第 17 页）。
//   homeLift   把东西放回原处：先抬到原处上方，再放下去（不斜着穿过别的器材）。
import * as THREE from 'three';
import { clamp } from './interact.js';
import { glassMat } from './chem.js';
import { water2 } from './chemfx.js';
import { textPlate } from './props.js';
import { paint, glassEdge } from '../../live/ink.js';

const ease = (k) => k * k * (3 - 2 * k);

/**
 * 酒精灯灯帽。lamp：chemLamp()（可以缩放、可以在桌上挪动）；off：灯帽取下后放在桌上的位置（group 坐标，y 不用管）。
 * 每帧调用 update(h, lit)，返回火焰该不该亮：点燃时灯帽拿开了才有火；熄灭时灯帽盖上了火才灭。
 *   lamp.flame.setOn(cap.update(h, S.lit));
 */
export function lampCap(group, lamp, { off }) {
  const s = lamp.scale.x;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.03, 18), paint(0xcfd6dc, { unique: true, transparent: true, opacity: 0.55 }));
  cap.scale.setScalar(s); group.add(cap);
  const OFF = new THREE.Vector3(off.x, 0.015 * s, off.z);
  let K = 0, bob = 0;                     // K：0 盖着 → 1 在桌上；bob：盖灭以后“轻提一下再盖好”还剩多久
  const BOB = 0.5;
  const place = () => {
    const ON = lamp.position.clone().add(new THREE.Vector3(0, 0.072 * s, 0)), UP = ON.clone().add(new THREE.Vector3(0, 0.015 * s, 0));
    if (K < 0.3) cap.position.lerpVectors(ON, UP, ease(K / 0.3));
    else { const u = ease((K - 0.3) / 0.7); cap.position.lerpVectors(UP, OFF, u); cap.position.y += Math.sin(Math.PI * u) * 0.015 * s; }
    if (bob > 0) cap.position.y += Math.sin(Math.PI * (1 - bob / BOB)) * 0.007 * s;
  };
  place();
  return {
    cap,
    update(h, lit) {
      const was = K;
      K = clamp(K + clamp((lit ? 1 : 0) - K, -h * 1.6, h * 1.6), 0, 1);
      if (was > 0 && K === 0) bob = BOB;
      if (bob > 0) bob = Math.max(0, bob - h);
      place();
      return lit ? K > 0.6 : K > 0.12;
    },
    /** 一下子摆到点着 / 灭着的样子（重来时用） */
    snap(lit) { K = lit ? 1 : 0; bob = 0; place(); },
    get k() { return K; },
  };
}

/**
 * 滴瓶（瓶里插着胶头滴管）。pos：瓶底中心（group 坐标）。返回瓶子 g；g.tipHome 是滴管尖插在瓶里时的位置。
 * 滴管用 homeLift(d, g.tipHome, a) 插回去：先抬到瓶口上方，再竖直放下去。
 */
export function dropBottle(group, pos, { label = '', brown = false, liq = 0xe0ecef, r = 0.013, h = 0.04 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); group.add(g);
  const tint = { opacity: brown ? 0.3 : 0.18, color: brown ? 0xa9774f : 0xffffff };
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), glassMat(tint)); body.position.y = h / 2; body.renderOrder = 9; glassEdge(body, 0.0007);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, r - 0.002, 0.007, 20), glassMat(tint)); neck.position.y = h + 0.0035; neck.renderOrder = 9; glassEdge(neck, 0.0006);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.0015, r - 0.0015, h * 0.6, 20), water2({ color: liq, base: 0.36 })); fill.position.y = h * 0.3 + 0.0015; fill.renderOrder = 7;
  g.add(body, neck, fill);
  if (label) { const lab = textPlate(label, { w: r * 1.85, h: 0.008, bg: 'rgba(253,251,245,0.95)', font: 'bold 120px "Songti SC", serif' }); lab.position.set(0, h * 0.55, r + 0.0005); g.add(lab); g.label = lab; }
  g.tipHome = pos.clone().setY(pos.y + 0.0075);
  g.mouthY = pos.y + h + 0.007;
  g.fill = fill;
  return g;
}

/** 放回原处：先水平挪到原处上方（不低于现在的高度），再放下去。a：每帧靠近的比例。 */
export function homeLift(o, p, a, lift = 0) {
  const d = Math.hypot(o.position.x - p.x, o.position.z - p.z);
  o.position.lerp(d > 0.004 ? new THREE.Vector3(p.x, Math.max(o.position.y, p.y + lift), p.z) : p, a);
}

/**
 * 试剂瓶的瓶塞 / 瓶盖。cap：瓶子的子物体（在瓶口上的位置就是盖好的样子）；rest：倒放在桌上的位置（group 坐标）。
 * 每帧 update(a, open)：open = 瓶子拿起来了 / 正在取用。open 时瓶塞拔起来，挪到 rest，倒放；
 * 瓶子放回原处（open = false）以后，瓶塞抬起来、挪回瓶口上方、盖好。返回瓶塞是不是已经盖好。
 */
export function bottleCap(group, bottle, cap, { rest, lift = 0.012 }) {
  const ON = cap.position.clone(), REST = rest.clone();
  const half = new THREE.Box3().setFromObject(cap).getSize(new THREE.Vector3()).y / 2;
  REST.y = Math.max(REST.y, half);
  return {
    update(a, open) {
      if (open && cap.parent === bottle) group.attach(cap);
      if (cap.parent !== group) return true;
      const cp = cap.position;
      if (open) {
        // 先竖直拔起来，再横着挪开，放到桌上倒放
        const top = bottle.localToWorld(ON.clone()); group.worldToLocal(top); top.y += lift;
        const far = Math.hypot(cp.x - REST.x, cp.z - REST.z) > 0.003;
        const tgt = !far ? REST : cp.y < top.y - 0.002 && Math.hypot(cp.x - top.x, cp.z - top.z) < 0.004 ? top : new THREE.Vector3(REST.x, Math.max(REST.y, cp.y - 0.002), REST.z);
        cp.lerp(tgt, a);
        cap.rotation.x += (Math.PI - cap.rotation.x) * a * 0.6; cap.rotation.z += (0 - cap.rotation.z) * a * 0.6;
        return false;
      }
      // 盖回去：先抬到瓶口高度以上，横着挪过去，翻正，再放下去
      bottle.updateMatrixWorld(true);
      const to = group.worldToLocal(bottle.localToWorld(ON.clone())), far = Math.hypot(cp.x - to.x, cp.z - to.z) > 0.003;
      const tgt = !far ? to : cp.y < to.y + lift - 0.002 ? new THREE.Vector3(cp.x, to.y + lift, cp.z) : new THREE.Vector3(to.x, to.y + lift, to.z);
      cp.lerp(tgt, a);
      cap.rotation.x += (0 - cap.rotation.x) * a * 0.6; cap.rotation.z += (0 - cap.rotation.z) * a * 0.6;
      if (!far && cp.distanceTo(to) < 0.0006 && Math.abs(cap.rotation.x) < 0.02) { bottle.attach(cap); cap.position.copy(ON); cap.rotation.set(0, 0, 0); return true; }
      return false;
    },
    get on() { return cap.parent === bottle; },
  };
}
