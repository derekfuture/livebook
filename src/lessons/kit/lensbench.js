// 凸透镜/凹透镜成像的光路图：三条特殊光线 + 虚像的反向延长线。透镜在 x = 0，主光轴 y = 0。
import { OpticsScene, lensImage } from './optics.js';

/**
 * obj: { x: 负数（物体在左边）, h: 物体高度 }，f: 焦距（凹透镜为负），span: 光线画到右边多远
 * 返回 { real: [{pts}], virtual: [{pts}], image: { x, h, real } }
 */
export function lensRays({ u, h, f, lensH = 0.06, span = 0.6, left = 0.05 }) {
  const sc = new OpticsScene();
  sc.lenses.push({ x: 0, y: 0, h: lensH, f });
  const img = lensImage(u, f);
  const vx = img.v, vh = h * img.m;
  const P = { x: -u, y: h };
  const real = [], virtual = [];
  // 三条特殊光线的方向
  const dirs = [];
  dirs.push({ x: 1, y: 0 });                                   // 平行于主光轴
  dirs.push({ x: u, y: -h });                                  // 过光心
  if (f > 0 && Math.abs(u - f) > 1e-4) dirs.push(u > f ? { x: u - f, y: -h } : { x: f - u, y: h });   // 过焦点，或（物在焦点内时）延长线过焦点
  if (f < 0) dirs.push({ x: u - f, y: -h });                   // 凹透镜：射向另一侧焦点
  for (const d of dirs) {
    // 只画能打到透镜上的光线
    const yAtLens = P.y + (d.y / d.x) * u;
    if (Math.abs(yAtLens) > lensH * 0.98) continue;
    const t = sc.trace(P, d, { maxLen: u * 1.6 + span });
    const pts = t.pts.filter((p) => p.x <= span + 1e-6);
    if (pts.at(-1).x < span - 1e-4) {
      const a = t.pts[1], b = t.pts.at(-1);
      const k = (span - a.x) / (b.x - a.x || 1);
      pts.push({ x: span, y: a.y + (b.y - a.y) * Math.min(1, Math.max(0, k)) });
    }
    real.push({ pts: pts.slice(0, 3) });
    // 虚像：出射光线反向延长到像点
    if (!img.real && Number.isFinite(vx)) {
      const lensP = t.pts[1];
      virtual.push({ pts: [lensP, { x: vx, y: vh }] });
    }
  }
  return { real, virtual, image: { x: vx, h: vh, real: img.real, m: img.m } };
}

/** 像的文字描述 */
export function describeImage(u, f) {
  if (Math.abs(u - f) < 0.002) return { text: '不成像（光线平行射出）', real: null };
  const { v, m, real } = lensImage(u, f);
  const size = Math.abs(Math.abs(m) - 1) < 0.04 ? '等大' : Math.abs(m) > 1 ? '放大' : '缩小';
  return { text: `${m < 0 ? '倒立' : '正立'}、${size}的${real ? '实' : '虚'}像`, real, size, upright: m > 0, v, m };
}
