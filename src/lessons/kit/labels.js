// 画面里的字：不再都用一样的白底牌子。四种：
//   地名——直接写在地面、水面上（平躺着，不带底，像地图上的字）：groundLabel
//   过程——贴着那支箭头、那股水写（朝着镜头，不带底，描一圈白边），只在它发生的时候亮：airLabel
//   剖面上的字——写在切开的那一面上：faceLabel
//   示意说明——角上一个小“示意”，鼠标移上去才展开：noteBadge（在 tag 上加一个 class，见 style.css）
import * as THREE from 'three';

const cache = new Map();
export const SONG = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';
/** 一张写着字的透明贴图（高清）；返回贴图和宽高比。halo：字外面一圈柔和的纸色光晕（不是硬描边），压在杂乱背景上也读得清；spacing：字距（字号的倍数） */
export function textTex(text, { color = '#24304a', halo = true, weight = 600, px = 96, font = SONG, spacing = 0.06 } = {}) {
  const key = [text, color, halo, weight, px, font, spacing].join('|');
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'), g = c.getContext('2d'), pad = Math.round(px * 0.35), set = () => { g.font = `${weight} ${px}px ${font}`; g.letterSpacing = `${px * spacing}px`; };
  set(); const w = Math.ceil(g.measureText(text).width) + pad * 2, h = Math.ceil(px * 1.3) + pad;
  c.width = w; c.height = h; set(); g.textBaseline = 'middle'; g.textAlign = 'center';
  const cx = w / 2 + (px * spacing) / 2, cy = h / 2;          // 字距会在最后一个字后面多留一格，挪回来居中
  if (halo) { g.shadowColor = 'rgba(250,247,238,0.95)'; g.shadowBlur = px * 0.18; g.fillStyle = 'rgba(250,247,238,0.55)'; for (let k = 0; k < 2; k++) g.fillText(text, cx, cy); g.shadowBlur = 0; }
  g.fillStyle = color; g.fillText(text, cx, cy);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const r = { tex, aspect: w / h, fill: (px * 1.3) / h }; cache.set(key, r); return r;
}
const plane = (text, h, opt) => { const { tex, aspect, fill } = textTex(text, opt); h /= fill; const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opt.opacity ?? 0.8, polygonOffset: true, polygonOffsetFactor: -2 })); m.raycast = () => {}; m.renderOrder = 12; m.userData.qaSupport = true; return m; };
/** 地名：平躺在地面上（y 是地面高度），像直接印在地面、水面上（不带光晕）；rotY 可以让字顺着河、海岸转；spacing：大片地方（海洋）字距拉开 */
export function groundLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.009, rotY = 0, color = '#2b3a4f', opacity = 0.75, spacing = 0.25 } = {}) {
  const opt = { color, halo: false, spacing }, m = plane(text, h, { ...opt, opacity }); m.rotation.set(-Math.PI / 2, 0, rotY); m.position.set(x, y + 0.0006, z); parent.add(m);
  m.setText = (t) => { const r = textTex(t, opt); m.material.map = r.tex; m.geometry.dispose(); m.geometry = new THREE.PlaneGeometry((h / r.fill) * r.aspect, h / r.fill); };
  return m;
}
/** 剖面上的字：印在切开的那一面（朝 +z），墨色 */
export function faceLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.006, color = '#2a2622', opacity = 0.78, spacing = 0.1 } = {}) {
  const m = plane(text, h, { color, opacity, halo: false, spacing }); m.position.set(x, y, z + 0.0008); parent.add(m); return m;
}
/** 过程的名字：朝着镜头，外面一圈柔和的纸色光晕；setOn(true / false) 让它亮起来或淡下去（亮起来时轻轻往上浮一点） */
export function airLabel(parent, text, { x = 0, y = 0, z = 0, h = 0.0075, color = '#1f3f75', dim = 0.18 } = {}) {
  const fit = (r) => s.scale.set((h / r.fill) * r.aspect, h / r.fill, 1);
  const r0 = textTex(text, { color });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: r0.tex, transparent: true, depthWrite: false, depthTest: false })); fit(r0); s.position.set(x, y, z); s.raycast = () => {}; s.renderOrder = 14; parent.add(s);
  s.userData = { on: 1, want: 1, dim, h, color };
  s.setOn = (on) => { s.userData.want = on ? 1 : s.userData.dim; return s; };
  s.setText = (t) => { const r = textTex(t, { color: s.userData.color }); s.material.map = r.tex; fit(r); return s; };
  s.tick = (dt) => { const u = s.userData; u.on += (u.want - u.on) * Math.min(1, dt * 4); s.material.opacity = u.on; s.center.y = 0.5 + (1 - u.on) * 0.18; s.visible = u.on > 0.03; };
  return s;
}
/** 角上的“示意”：tag 的元素上挂完整的说明，鼠标移上去才展开 */
export function noteBadge(tagFn, full) { const t = tagFn('示意', 'pill note-badge'); t.el.dataset.full = full; t.el.title = full; return t; }
