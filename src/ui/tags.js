import * as THREE from 'three';

// 钉在 3D 位置上的 HTML 小标签（字比贴图清楚，也方便用课本字体）。
const tags = new Set();
const v = new THREE.Vector3();

export function tag(text, cls = '', onClick) {
  const el = document.createElement('div');
  el.className = `tag3d ${cls}${onClick ? ' btn' : ''}`;
  el.innerHTML = text;
  if (onClick) el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  document.body.appendChild(el);
  const t = {
    el, pos: new THREE.Vector3(), obj: null, visible: true,
    at(x, y, z) { if (x.isVector3) this.pos.copy(x); else this.pos.set(x, y, z); return this; },
    follow(obj, offset = new THREE.Vector3()) { this.obj = obj; this.offset = offset; return this; },
    /** 钉在 obj 的局部坐标 (x, y, z) 上，每帧跟着 obj 走。 */
    loc(obj, x, y, z) { this.obj = obj; (this.offset ||= new THREE.Vector3()).set(x, y, z); return this; },
    text(s) { if (el._t !== s) { el.innerHTML = s; el._t = s; } return this; },
    show(on) { this.visible = on; return this; },
    remove() { el.remove(); tags.delete(t); },
  };
  tags.add(t);
  return t;
}

// 凑近看（look）时：比看的那一点更远的标签（在器材后面）先藏起来，免得盖在表盘上
let focus = null;
export function tagFocus(target, depth) { focus = target ? { target: target.clone(), depth } : null; }

export function updateTags(camera) {
  const w = innerWidth, h = innerHeight;
  const fd = focus && camera.position.distanceTo(focus.target) + focus.depth;
  for (const t of tags) {
    if (t.obj) { v.copy(t.offset); t.obj.localToWorld(v); } else v.copy(t.pos);
    let vis = t.visible && (!t.obj || isShown(t.obj));
    if (focus && camera.position.distanceTo(v) > fd) vis = false;
    v.project(camera);
    if (v.z > 1) vis = false;
    t.el.style.opacity = vis ? '' : '0';
    t.el.style.pointerEvents = vis ? '' : 'none';
    if (vis) t.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
  }
}

function isShown(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
