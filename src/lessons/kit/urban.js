// 城镇内部空间结构（付租能力）的教学模型（纯计算，活页 urban.js 和核对脚本共用）。课本必修2 第 26–28 页，图 2.7 某城市各类土地利用付租能力随距离递减示意。
// 一座理想化的城市：市中心在原点，几条交通干线从市中心往外放射。d：到市中心的距离（0…4，示意单位）。
// 每一类活动愿意付的租金（付租能力）都随离市中心变远而递减：商业最陡、住宅其次、工业最平（图 2.7 的三条线）。
// 离交通干线越近，土地越“好用”，付租能力越高（课本：距交通干线越近，土地租金就越高）：这里用“离干线近，相当于离市中心近一些”来算。
// 一块地给出价最高的那一类用（课本：一块土地用于哪一种活动，主要取决于各种活动愿意付出租金的高低）。数值是示意。
export const USES = {
  shop: { name: '商业', zone: '商业区', a: 10, b: 8, color: '#b0418c' },
  home: { name: '住宅', zone: '住宅区', a: 6.5, b: 2.6, color: '#3f9a6a' },
  fact: { name: '工业', zone: '工业区', a: 3.6, b: 1.1, color: '#2f7fc0' },
};
export const KEYS = ['shop', 'home', 'fact'], RMAX = 4;
/** 离直线道路（从原点出发、方向 ang 弧度的射线）多远 */
const toRay = (x, y, ang) => { const ux = Math.cos(ang), uy = Math.sin(ang), t = Math.max(0, x * ux + y * uy); return Math.hypot(x - t * ux, y - t * uy); };
/** 这块地的“有效距离”：离干线近、离副中心近，都相当于离市中心近一些 */
export function effDist(x, y, { roads = [0, Math.PI / 2, Math.PI, -Math.PI / 2], sub = null } = {}) {
  const d = Math.hypot(x, y), near = Math.min(...roads.map((a) => toRay(x, y, a)));
  let e = d * (1 - 0.38 * Math.exp(-((near / 0.22) ** 2)));          // 紧挨着干线，相当于近了约四成
  if (sub) e = Math.min(e, 0.45 + 1.2 * Math.hypot(x - sub[0], y - sub[1]));          // 副中心：那一带又是一个“中心”，只是比市中心弱一些
  return e;
}
export const bid = (k, e) => USES[k].a - USES[k].b * e;
/** 这块地谁出价最高：返回用途（都付不起就是城外的农田） */
export function winner(x, y, opt) { const e = effDist(x, y, opt); let best = null, bv = 0; for (const k of KEYS) { const v = bid(k, e); if (v > bv) { bv = v; best = k; } } return { k: best, rent: bv, e }; }
/** 图 2.7 里的 A、B、C：两两相交、工业线降到 0 的距离（只看离市中心的距离，不算干线） */
export const A = (USES.shop.a - USES.home.a) / (USES.shop.b - USES.home.b), B = (USES.home.a - USES.fact.a) / (USES.home.b - USES.fact.b), C = USES.fact.a / USES.fact.b;
/** 沿着方向 ang 从市中心往外走，各段是什么区：[{k, from, to}]（d 是到市中心的真实距离） */
export function along(ang, opt, step = 0.01) {
  const out = []; let cur = null;
  for (let d = 0; d <= RMAX; d += step) { const w = winner(Math.cos(ang) * d, Math.sin(ang) * d, opt).k; if (!cur || cur.k !== w) { if (cur) cur.to = d; cur = { k: w, from: d, to: RMAX }; out.push(cur); } }
  return out;
}
