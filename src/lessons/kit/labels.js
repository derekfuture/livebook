// 画面里的字：不再都用一样的白底牌子。四种：
//   地名——直接写在地面、水面上（平躺着，不带底，像地图上的字）：groundLabel
//   过程——贴着那支箭头、那股水写（朝着镜头，不带底，描一圈白边，前面一个小图标），只在它发生的时候亮：airLabel
//   剖面上的字——写在切开的那一面上：faceLabel
//   示意说明——角上一个小“示意”，鼠标移上去才展开：noteBadge（在 tag 上加一个 class，见 style.css）
import * as THREE from 'three';

const cache = new Map();
// 字前面的小图标（24×24 的线稿，和字同色、同一圈白边）：一眼看出是哪种过程
export const ICONS = {
  vapor: 'M6 21c-2.2-2.6 2.2-4.4 0-7s2.2-4.4 0-7 M12 19c-2.2-2.6 2.2-4.4 0-7s2.2-4.4 0-7 M18 21c-2.2-2.6 2.2-4.4 0-7s2.2-4.4 0-7',          // 蒸发：一缕缕往上冒的水汽
  rain: 'M8 4l-2.4 5.5 M14 4l-2.4 5.5 M20 4l-2.4 5.5 M11 13l-2.4 5.5 M17 13l-2.4 5.5',          // 降水：斜着落的雨丝
  wind: 'M3 9h10.5a3 3 0 1 0-3-3 M3 15h14.5a3 3 0 1 1-3 3',          // 水汽输送：风
  flow: 'M2 9.5c2.5-2.6 4.5 2.6 7 0s4.5 2.6 7 0 4.5 2.6 6 1 M2 15.5c2.5-2.6 4.5 2.6 7 0s4.5 2.6 7 0 4.5 2.6 6 1',          // 地表径流：水波
  seep: 'M12 3v11 M8 10.5l4 4 4-4 M4 19h16 M7 22h10',          // 下渗：往地里去
  cycle: 'M19.5 13a7.5 7.5 0 1 1-2.2-6.3 M18 3v4.2h-4.2',          // 循环
  heat: 'M6 21c-2.2-2.6 2.2-4.4 0-7s2.2-4.4 0-7 M12 19c-2.2-2.6 2.2-4.4 0-7s2.2-4.4 0-7 M18 21c-2.2-2.6 2.2-4.4 0-7s2.2-4.4 0-7',          // 受热：地面往上冒热气（和水汽同一个样子，颜色不同）
  sun: 'M16 12a4 4 0 1 1-8 0a4 4 0 1 1 8 0 M12 2.5v2.5 M12 19v2.5 M2.5 12h2.5 M19 12h2.5 M5.3 5.3l1.8 1.8 M16.9 16.9l1.8 1.8 M5.3 18.7l1.8-1.8 M16.9 7.1l1.8-1.8',          // 太阳
  moon: 'M15.5 3.5a8.5 8.5 0 1 0 5 12.8 7 7 0 0 1-5-12.8z',          // 月亮
};
/** 一张写着字的透明贴图（2 倍清晰度）；返回贴图和宽高比。icon：字前面加一个小图标（ICONS 里的名字） */
export function textTex(text, { color = '#24304a', stroke = 'rgba(255,255,255,0.9)', weight = 600, px = 64, font = '"PingFang SC", "Songti SC", sans-serif', strokeW = 10, icon = null } = {}) {
  const key = [text, color, stroke, weight, px, font, strokeW, icon].join('|');
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${px}px ${font}`;
  const iw = icon ? px * 1.2 : 0, gap = icon && text ? px * 0.2 : 0, tw = text ? g.measureText(text).width : 0;
  const w = Math.ceil(iw + gap + tw) + strokeW * 2 + 8, h = Math.ceil(px * 1.35) + strokeW;
  c.width = w; c.height = h; g.font = `${weight} ${px}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round'; g.lineCap = 'round';
  const x0 = strokeW + 4, tx = x0 + iw + gap;
  if (icon) {
    const sc = iw / 24, path = new Path2D(ICONS[icon]); g.save(); g.translate(x0, h / 2 - iw / 2); g.scale(sc, sc);
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = (strokeW + 4) / sc; g.stroke(path); }
    g.strokeStyle = color; g.lineWidth = 2.7; g.stroke(path); g.restore();
  }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = strokeW; g.strokeText(text, tx, h / 2); }
  g.fillStyle = color; g.fillText(text, tx, h / 2);
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
export function faceLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.006, color = '#ffffff', opacity = 0.9, stroke = 'rgba(30,40,60,0.55)', icon = null } = {}) {
  const m = plane(text, h, { color, opacity, stroke, strokeW: 8, icon }); m.position.set(x, y, z + 0.0008); parent.add(m); return m;
}
/** 过程的名字：朝着镜头，不带底；setOn(true / false) 让它亮起来或淡下去 */
export function airLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.0075, color = '#1f3f75', dim = 0.18, icon = null } = {}) {
  const { tex, aspect } = textTex(text, { color, icon });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })); s.scale.set(h * aspect, h, 1); s.position.set(x, y, z); s.raycast = () => {}; s.renderOrder = 14; parent.add(s);
  s.userData = { on: 1, want: 1, dim, h, color, icon, hold: 0 };
  s.setOn = (on, delay = 0) => { const u = s.userData, w = on ? 1 : u.dim; if (w > u.want && delay) u.hold = delay; u.want = w; return s; };          // delay：过一会儿再亮（几个过程按水走的顺序依次亮）
  s.setColor = (c) => { s.userData.color = c; return s; };          // 换颜色（下一次 setText 生效），比如气压高红、低蓝
  s.setText = (t, ic = s.userData.icon) => { s.userData.icon = ic; const r = textTex(t, { color: s.userData.color, icon: ic }); s.material.map = r.tex; s.scale.set(h * r.aspect, h, 1); return s; };
  s.tick = (dt) => { const u = s.userData; if (u.hold > 0) { u.hold -= dt; return; } u.on += (u.want - u.on) * Math.min(1, dt * 4); s.material.opacity = u.on; s.center.y = 0.5 + (1 - u.on) * 0.15; s.visible = u.on > 0.03; };          // 亮起来时轻轻往上浮一点
  return s;
}
/** 角上的“示意”：tag 的元素上挂完整的说明，鼠标移上去才展开 */
export function noteBadge(tagFn, full) { const t = tagFn('示意', 'pill note-badge'); t.el.dataset.full = full; t.el.title = full; return t; }
