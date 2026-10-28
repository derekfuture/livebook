// 指针交互：把屏幕射线换算到实验里的局部坐标，做“拖着走”。
import * as THREE from 'three';
import { glowTexture } from './props.js';

const _p = new THREE.Plane(), _v = new THREE.Vector3(), _n = new THREE.Vector3();

/**
 * 射线与 obj 局部坐标系里的一个平面求交，返回局部坐标（或 null）。
 * plane: 'xy'（竖直面，z = offset）| 'xz'（水平面，y = offset）| 'yz'
 */
export function rayToLocal(ray, obj, plane = 'xy', offset = 0) {
  obj.updateMatrixWorld(true);
  _n.set(plane === 'xy' ? 0 : plane === 'yz' ? 1 : 0, plane === 'xz' ? 1 : 0, plane === 'xy' ? 1 : 0);
  const o = new THREE.Vector3().copy(_n).multiplyScalar(offset);
  _p.setFromNormalAndCoplanarPoint(_n, o).applyMatrix4(obj.matrixWorld);
  if (!ray.ray.intersectPlane(_p, _v)) return null;
  return obj.worldToLocal(_v.clone());
}

/** 射线是否打到 objs（或它们的子物体）中的某一个；返回那个 obj。 */
export function hitAny(ray, objs) {
  const hits = ray.intersectObjects(objs.filter(Boolean), true);
  // 只算真正的实体：跳过光晕（Sprite）、隐藏的、看不见的拾取辅助以外的东西
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const hit = hits.find((h) => !h.object.isSprite && !h.object.isPoints && !h.object.isLine && shown(h.object) && (h.object.material?.visible !== false || h.object.userData.pick || objs.includes(h.object)));     // 看不见的拾取盒本身就是要拖的东西时也算
  if (!hit) return null;
  for (let o = hit.object; o; o = o.parent) if (objs.includes(o)) return o;
  return null;
}

/**
 * 一组可拖动的东西：drags = [{ obj, plane, offset, onDrag(local, start), onEnd?, onTap?, hint? }]
 * 返回 pointer 对象，直接给实验的 pointer 用。
 * opts.taps = [{ obj, hint, onTap(ray) }]：只能点的实物（开关、灯、小桌……），点一下就做一个动作
 * opts.tip：ctx.tag('', 'pill') 做的标签——鼠标移到能动的东西上时，在它旁边说一句“拖到挂钩上”之类的提示，并给它一圈光
 */
export function draggable(root, drags, { onClick, taps = [], tip } = {}) {
  let active = null;
  const canvas = () => document.getElementById('c');
  let halo = null, frame = null;
  const GLOW = false;
  const BIG = 0.09;          // 超过这么大（实验自己的单位，米）的东西算“大件”
  const box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  const showHint = (item) => {
    if (!halo) {
      halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb35c, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      halo.raycast = () => {}; halo.renderOrder = 25; root.add(halo);
    }
    if (!frame) {
      // 大件（玻璃板、木板、桌面……）不用光晕——光晕会糊满整个画面——改成沿着它的边描一圈橙色细线
      frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.9 }));
      frame.raycast = () => {}; frame.renderOrder = 25; root.add(frame);
    }
    if (!item) { halo.visible = false; frame.visible = false; tip?.loc(root, 0, -9, 0); return; }
    root.updateMatrixWorld(true);
    box.setFromObject(item.obj); box.getCenter(c); box.getSize(sz);
    root.worldToLocal(c);
    const s = root.getWorldScale(new THREE.Vector3()).x || 1;
    const big = Math.max(sz.x, sz.y, sz.z) / s > BIG;
    // 暂时不用光晕和描边，只靠光标和文字提示（以后要恢复，把 GLOW 改成 true）
    halo.visible = GLOW && !big; frame.visible = GLOW && big;
    if (big) { frame.position.copy(c); frame.scale.set(sz.x / s + 0.002, sz.y / s + 0.002, sz.z / s + 0.002); }
    else { halo.position.copy(c); halo.scale.setScalar(Math.max(0.02, (Math.max(sz.x, sz.y, sz.z) / s) * 0.9)); }
    const h = typeof item.hint === 'function' ? item.hint() : item.hint;
    // 提示文字：小件放在它上方；大件放在它靠里的那条边上，不压住中间的器材
    if (tip) { if (h) (big ? tip.loc(root, c.x, c.y + (sz.y / s) / 2 + 0.006, c.z - (sz.z / s) / 2) : tip.loc(root, c.x, c.y + (sz.y / s) * 0.6 + 0.012, c.z)).text(h); else tip.loc(root, 0, -9, 0); }
  };
  const all = () => [...drags, ...taps];
  return {
    items: all,          // 给测试脚本用：列出能拖 / 能点的东西
    down(ray, e) {
      const hit = hitAny(ray, all().map((d) => d.obj));
      if (!hit) { return onClick ? onClick(ray, e) : false; }
      const tap = taps.find((x) => x.obj === hit);
      if (tap) { showHint(null); tap.onTap?.(ray, e); return true; }
      const d = drags.find((x) => x.obj === hit);
      const p = rayToLocal(ray, root, d.plane || 'xy', d.offset || 0);
      // keepOffset：记住“抓的地方”和物体位置之差，拖的时候物体不会跳到鼠标下面
      // anchor：onDrag 里真正被设置位置的对象（拾取盒可能只是它的一部分，中心不在它的原点）
      let delta = null;
      if (d.keepOffset && p) { root.updateMatrixWorld(true); const w = (d.anchor || hit).getWorldPosition(new THREE.Vector3()); delta = root.worldToLocal(w).sub(p); }
      // onStart / onDrag 拿到的都是“物体该在的位置”（加上了抓取偏移），两边可以直接相减
      const p0 = p && delta ? p.clone().add(delta) : p;
      active = { d, start: p0, moved: false, delta };
      showHint(null);
      d.onStart?.(p0);
      return true;
    },
    move(ray) {
      if (!active) {
        const hit = hitAny(ray, all().map((d) => d.obj));
        const item = hit && all().find((x) => x.obj === hit);
        canvas().style.cursor = hit ? (taps.includes(item) ? 'pointer' : 'grab') : '';
        showHint(item && item.enabled?.() !== false ? item : null);
        return false;
      }
      canvas().style.cursor = 'grabbing';
      const p = rayToLocal(ray, root, active.d.plane || 'xy', active.d.offset || 0);
      if (p && active.delta) p.add(active.delta);
      if (p && active.d.onDrag) { active.moved = true; active.d.onDrag(p, active.start); }
      return true;
    },
    up() {
      if (!active) return false;
      const d = active.d, moved = active.moved;
      active = null;
      canvas().style.cursor = '';
      d.onEnd?.(moved);
      if (!moved) d.onTap?.();
      return true;
    },
  };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const deg = Math.PI / 180;
