// 画面里的字：不再都用一样的白底牌子。四种：
//   地名——直接写在地面、水面上（平躺着，不带底，像地图上的字）：groundLabel
//   过程——贴着那支箭头、那股水写（朝着镜头，不带底，描一圈白边），只在它发生的时候亮：airLabel
//   剖面上的字——写在切开的那一面上：faceLabel
//   示意说明——角上一个小“示意”，鼠标移上去才展开：noteBadge（在 tag 上加一个 class，见 style.css）
import * as THREE from 'three';

const cache = new Map();
/** 一张写着字的透明贴图（2 倍清晰度）；返回贴图和宽高比 */
export function textTex(text, { color = '#24304a', stroke = 'rgba(255,255,255,0.9)', weight = 600, px = 64, font = '"PingFang SC", "Songti SC", sans-serif', strokeW = 10 } = {}) {
  const key = [text, color, stroke, weight, px, font, strokeW].join('|');
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${px}px ${font}`;
  const w = Math.ceil(g.measureText(text).width) + strokeW * 2 + 8, h = Math.ceil(px * 1.35) + strokeW;
  c.width = w; c.height = h; g.font = `${weight} ${px}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round';
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = strokeW; g.strokeText(text, w / 2, h / 2); }
  g.fillStyle = color; g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const r = { tex, aspect: w / h }; cache.set(key, r); return r;
}
const plane = (text, h, opt) => { const { tex, aspect } = textTex(text, opt); const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opt.opacity ?? 0.8, polygonOffset: true, polygonOffsetFactor: -2 })); m.raycast = () => {}; m.renderOrder = 12; m.userData.qaSupport = true; return m; };
/** 地名：平躺在地面上（y 是地面高度），rotY 可以让字顺着河、海岸转 */
export function groundLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.009, rotY = 0, color = '#2b3a4f', opacity = 0.75, stroke = 'rgba(255,255,255,0.55)' } = {}) {
  const m = plane(text, h, { color, opacity, stroke, strokeW: 6 }); m.rotation.set(-Math.PI / 2, 0, rotY); m.position.set(x, y + 0.0006, z); parent.add(m);
  m.setText = (t) => { const { tex, aspect } = textTex(t, { color, stroke, strokeW: 6 }); m.material.map = tex; m.geometry.dispose(); m.geometry = new THREE.PlaneGeometry(h * aspect, h); };
  return m;
}
/** 剖面上的字：贴在切开的那一面（朝 +z） */
export function faceLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.006, color = '#ffffff', opacity = 0.9, stroke = 'rgba(30,40,60,0.55)' } = {}) {
  const m = plane(text, h, { color, opacity, stroke, strokeW: 8 }); m.position.set(x, y, z + 0.0008); parent.add(m); return m;
}
/** 过程的名字：朝着镜头，不带底；setOn(true / false) 让它亮起来或淡下去 */
export function airLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.0075, color = '#1f3f75', dim = 0.18 } = {}) {
  const { tex, aspect } = textTex(text, { color });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })); s.scale.set(h * aspect, h, 1); s.position.set(x, y, z); s.raycast = () => {}; s.renderOrder = 14; parent.add(s);
  s.userData = { on: 1, want: 1, dim, h, color };
  s.setOn = (on) => { s.userData.want = on ? 1 : s.userData.dim; return s; };
  s.setText = (t) => { const r = textTex(t, { color: s.userData.color }); s.material.map = r.tex; s.scale.set(h * r.aspect, h, 1); return s; };
  s.tick = (dt) => { const u = s.userData; u.on += (u.want - u.on) * Math.min(1, dt * 4); s.material.opacity = u.on; s.visible = u.on > 0.03; };
  return s;
}
/** 角上的“示意”：tag 的元素上挂完整的说明，鼠标移上去才展开 */
export function noteBadge(tagFn, full) { const t = tagFn('示意', 'pill note-badge'); t.el.dataset.full = full; t.el.title = full; return t; }
