import * as THREE from 'three';

// 钉在 3D 位置上的 HTML 小标签（字比贴图清楚，也方便用课本字体）。
const tags = new Set();
const v = new THREE.Vector3();
const mouse = { x: -1e4, y: -1e4 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

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

// 别的画面层（活页里的批注 kit/annot.js）也要在这一帧、用同一台相机摆位置，不晚一帧
const hooks = new Set();
export function onTagsUpdate(fn) { hooks.add(fn); return () => hooks.delete(fn); }

export function updateTags(camera) {
  for (const f of hooks) f(camera);
  const w = innerWidth, h = innerHeight;
  const fd = focus && camera.position.distanceTo(focus.target) + focus.depth;
  const crowd = [], pinned = [];
  for (const t of tags) {
    if (t.obj) { v.copy(t.offset); t.obj.localToWorld(v); } else v.copy(t.pos);
    let vis = t.visible && (!t.obj || isShown(t.obj));
    if (focus && camera.position.distanceTo(v) > fd) vis = false;
    v.project(camera);
    if (v.z > 1) vis = false;
    t.el.style.opacity = vis ? '' : '0';
    t.el.style.pointerEvents = vis ? '' : 'none';
    if (!vis) { t._p = null; continue; }
    const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
    // 卡片：在物体旁边固定的几十像素处（t.px = [dx, dy]），不随镜头远近飘远
    // 卡片被关掉（纯净操作）：鼠标停到那件东西附近时，它的卡片才浮出来
    if (t.el.classList.contains('cond') && hideCards() && Math.hypot(x - mouse.x, y - mouse.y) > 70) { t.el.style.opacity = '0'; t.el.style.pointerEvents = 'none'; t._p = null; continue; }
    if (t.el.classList.contains('cond')) { const [dx, dy] = t.px || [0, 0]; crowd.push({ t, x: x + dx, y: y + dy, w: t.el.offsetWidth + 8, h: t.el.offsetHeight + 6 }); continue; }
    t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    if (t.el.classList.contains('mw-go')) pinned.push({ x, y, w: t.el.offsetWidth + 8, h: t.el.offsetHeight + 6 });
  }
  if (crowd.length) layoutCards(crowd, w, h, pinned);
}

// 卡片（.cond）就放在物体旁边，互相让开：几轮两两推开（沿重叠少的方向），收进画面里，再平滑地挪过去，不会一帧一跳
// pinned：钉在原地的按钮（“钻进…看”）：卡片整张让开，不压住它们
function layoutCards(crowd, w, h, pinned = []) {
  const panel = document.getElementById('panel');
  const left = (panel && !panel.hidden && !panel.classList.contains('folded') && w > 760 ? panel.getBoundingClientRect().right : 0) + 10;
  const right = w - 64, top = 58, bottom = h - 92;            // 右边留给视角按钮，下边留给步骤栏
  for (let it = 0; it < 8; it++) {
    for (let i = 0; i < crowd.length; i++) for (let j = i + 1; j < crowd.length; j++) {
      const a = crowd[i], b = crowd[j];
      const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
      if (ox <= 0 || oy <= 0) continue;
      if (oy < ox * 1.6) { const d = (oy / 2 + 0.5) * Math.sign(a.y - b.y || i - j); a.y += d; b.y -= d; }
      else { const d = (ox / 2 + 0.5) * Math.sign(a.x - b.x || i - j); a.x += d; b.x -= d; }
    }
    for (const a of crowd) for (const b of pinned) {
      const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
      if (ox <= 0 || oy <= 0) continue;
      a.x += (ox + 1) * Math.sign(a.x - b.x || 1);        // 往旁边让：卡片本来就在器材旁边，上下挪容易压到器材
    }
    for (const c of crowd) { c.x = Math.min(right - c.w / 2, Math.max(left + c.w / 2, c.x)); c.y = Math.min(bottom - c.h / 2, Math.max(top + c.h / 2, c.y)); }
  }
  for (const c of crowd) {
    const p = c.t._p || (c.t._p = { x: c.x, y: c.y });
    p.x += (c.x - p.x) * 0.25; p.y += (c.y - p.y) * 0.25;
    c.t.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
  }
}

const hideCards = () => document.body.classList.contains('hide-cards') && !document.body.classList.contains('cards-force');

function isShown(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
