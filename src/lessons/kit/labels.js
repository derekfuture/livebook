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
  ore: 'M3 19l5.5-8.5 3.5 4.5 3-4 6 8z',          // 原料：一堆矿石
  truck: 'M2 7h11v9H2z M13 10h4l4 4v2h-8 M8 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M19 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0',          // 产品运到市场
  bolt: 'M13 2 5.5 13H11l-1 9 7.5-12H12z',          // 动力
  person: 'M15 6.5a3 3 0 1 1-6 0a3 3 0 1 1 6 0 M5 21c0-4 3-7 7-7s7 3 7 7',          // 劳动力
  gear: 'M15.5 12a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0 M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',          // 技术
  warn: 'M12 3.5 21.5 20h-19z M12 10v4.5 M12 17.2v.3',          // 要注意
  flag: 'M6 21V4 M6 4.5h11l-2.2 4 2.2 4H6',          // 记下的方案
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z',          // 北极星
  home: 'M3.5 11 12 4l8.5 7 M6 9.5V20h12V9.5 M10 20v-5.5h4V20',          // 你家
  up: 'M12 20V5 M6.5 10.5 12 5l5.5 5.5',          // 上升
  down: 'M12 4v15 M6.5 13.5 12 19l5.5-5.5',          // 下沉
  thermo: 'M14 14.2V5.5a2 2 0 1 0-4 0v8.7a4 4 0 1 0 4 0z M12 10v7',          // 气温
  anchor: 'M12 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z M12 7.5V21 M7.5 11h9 M4 14c0 4 3.5 7 8 7s8-3 8-7',          // 港口
  peak: 'M2 20 9.5 7l4.2 6.2 2.8-3.7L22 20z M7.6 10.3l1.9 1.5 1.6-1.8',          // 山（海拔、带）
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
  m.show = (on) => { m.visible = on; return m; };
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
  s.show = (on) => s.setOn(on);          // 和 tag 一样的写法
  s.setColor = (c) => { s.userData.color = c; return s; };          // 换颜色（下一次 setText 生效），比如气压高红、低蓝
  s.setText = (t, ic = s.userData.icon) => { s.userData.icon = ic; const r = textTex(t, { color: s.userData.color, icon: ic }); s.material.map = r.tex; s.scale.set(h * r.aspect, h, 1); return s; };
  s.tick = (dt) => { const u = s.userData; if (u.hold > 0) { u.hold -= dt; return; } u.on += (u.want - u.on) * Math.min(1, dt * 4); s.material.opacity = u.on; s.center.y = 0.5 + (1 - u.on) * 0.15; s.visible = u.on > 0.03; };          // 亮起来时轻轻往上浮一点
  return s;
}
/** 角上的“示意”：tag 的元素上挂完整的说明，鼠标移上去才展开 */
export function noteBadge(tagFn, full) { const t = tagFn('示意', 'pill note-badge'); t.el.dataset.full = full; t.el.title = full; return t; }
