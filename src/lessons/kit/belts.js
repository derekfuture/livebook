// 气压带和风带的教学模型（纯计算，活页 belts.js 和核对脚本共用）。课本选必1 第 48–50 页，图 3.10、3.11。
// 假设地球表面均匀（不画、不算海陆），只看受热不均和地转偏向力。shift：气压带随太阳直射点季节移动的度数（北半球夏季偏北为正，示意 5°）。
// 风向按“从哪边吹来”叫；风矢量 (u, v)：u 向东为正，v 向北为正。
export const BELTS = [
  { lat: 90, name: '北极地高压带', p: 'H' }, { lat: 60, name: '北半球副极地低压带', p: 'L' }, { lat: 30, name: '北半球副热带高压带', p: 'H' },
  { lat: 0, name: '赤道低压带', p: 'L' },
  { lat: -30, name: '南半球副热带高压带', p: 'H' }, { lat: -60, name: '南半球副极地低压带', p: 'L' }, { lat: -90, name: '南极地高压带', p: 'H' },
];
export const WINDS = [
  { a: 60, b: 90, name: '北半球极地东风带', dir: '东北风' }, { a: 30, b: 60, name: '北半球中纬西风带', dir: '西南风' }, { a: 0, b: 30, name: '北半球低纬信风带', dir: '东北风' },
  { a: -30, b: 0, name: '南半球低纬信风带', dir: '东南风' }, { a: -60, b: -30, name: '南半球中纬西风带', dir: '西北风' }, { a: -90, b: -60, name: '南半球极地东风带', dir: '东南风' },
];
const clampPole = (x) => Math.max(-90, Math.min(90, x));
/** 加上季节移动以后各气压带所在的纬度（两极不动） */
export const beltLat = (b, shift) => (Math.abs(b.lat) === 90 ? b.lat : b.lat + shift);
/** 只示意方向，不计算风速；气压带附近显示辐合/辐散，不指定单一来风方向。 */
export function windAt(lat, shift = 0, rot = true) {
  const unknown = (dir, belt, zone = null) => ({ u: 0, v: 0, known: false, dir, belt, zone });
  if (!rot) { if (Math.abs(lat) < 2 || Math.abs(lat) > 88) return unknown('环流交汇处，未指定单一风向', '理想化无地转偏转模型'); const v = lat > 0 ? -1 : 1; return { u: 0, v, known: true, dir: v < 0 ? '北风' : '南风', belt: '理想化无地转偏转模型', zone: null }; }
  if (shift !== 0 && lat >= Math.min(0, shift) && lat <= Math.max(0, shift)) return unknown('跨赤道转向未模拟', '跨赤道气流区');
  const near = beltNear(lat, shift, 2);
  if (near) return unknown(near.p === 'H' ? '近地面辐散' : '近地面辐合', near.name);
  const edges = [90, 60, 30, 0, -30, -60, -90].map((x) => clampPole(Math.abs(x) === 90 ? x : x + shift));
  for (let i = 0; i < WINDS.length; i++) {
    if (lat <= edges[i] && lat >= edges[i + 1]) {
      const w = WINDS[i], north = w.a >= 0, toward = (i === 0 || i === 2 || i === 5 || i === 3) ? (north ? -1 : 1) : (north ? 1 : -1);
      const sideways = w.dir.startsWith('西') ? 1 : -1;
      return { u: sideways * 0.9, v: toward * 0.45, known: true, dir: w.dir, belt: w.name, zone: i };
    }
  }
  return unknown('未指定风向', '');
}
/** 离哪个气压带最近（在 tol 度以内就算在这个气压带里） */
export function beltNear(lat, shift = 0, tol = 5) { let best = null; for (const b of BELTS) { const d = Math.abs(lat - beltLat(b, shift)); if (d <= tol && (!best || d < best.d)) best = { ...b, d }; } return best; }
/** 船往 heading（从正北顺时针，度）走，这里的风是顺风、逆风还是侧风 */
export function relWind(lat, heading, shift = 0, rot = true) {
  const w = windAt(lat, shift, rot), hx = Math.sin((heading * Math.PI) / 180), hy = Math.cos((heading * Math.PI) / 180);
  if (!w.known) return { ...w, rel: '不判定顺逆风' };
  const c = (w.u * hx + w.v * hy) / Math.hypot(w.u, w.v);
  return { ...w, rel: c > 0.35 ? '顺风' : c < -0.35 ? '逆风' : '侧风' };
}

// 单圈模型的理想化条件参见 NOAA：https://www.noaa.gov/jetstream/global/global-atmospheric-circulations

/** 这段航程难不难（rate 0—1：沿目标航线前进的快慢，只区分航行难易，不代表真实船速；本模型不计算风速）：顺风最轻松，逆风要迎风换舷走之字形；
 * 副热带高压带（马纬度）、赤道低压带（赤道无风带）一带风弱而多变，帆船几乎寸步难行；副极地低压带一带风大浪急、天气多变。 */
export function sailing(lat, heading, shift = 0, rot = true) {
  const bn = rot ? beltNear(lat, shift, 2) : null, w = relWind(lat, heading, shift, rot);          // 和 windAt 用同一个范围：气压带两侧各 2°
  if (bn && bn.p === 'H') return { k: 'calm', rate: 0.15, text: `${bn.name.replace(/^(北半球|南半球)/, '')}：气流下沉，带中间水平气压差小，近地面通常风弱而多变，少雨、多晴天；本航程示意帆船几乎走不动${bn.lat === -30 ? '（课本：麦哲伦船队在 30°S 附近“平静无风……航行十分艰难”）' : ''}` };
  if (bn && bn.name === '赤道低压带') return { k: 'doldrums', rate: 0.16, text: '赤道低压带：气流上升，两边的信风在这里汇合，近地面通常风弱而多变，多对流雨（对流云下也会有阵风），帆船很难走（航海上叫“赤道无风带”）' };
  if (bn && bn.p === 'L') return { k: 'storm', rate: 0.45, text: `${bn.name.replace(/^(北半球|南半球)/, '')}：冷暖气流在这里相遇抬升，气旋多，多阴雨，风浪常常很大` };
  if (!w.known) return { k: 'unknown', rate: 0, text: `${w.dir}：航况不判定` };          // 跨赤道转向区、无偏转模型的交汇处
  if (w.rel === '顺风') return { k: 'tail', rate: 1, text: `${w.dir}从身后吹来：顺风，这段航程最轻松` };
  if (w.rel === '逆风') return { k: 'head', rate: 0.28, text: `${w.dir}迎面吹来：逆风，帆船不能正对着风开，只能在离来风约 45° 的两边轮流走之字形（迎风换舷），沿航线前进很慢` };
  return { k: 'side', rate: 0.65, text: `${w.dir}从侧面吹来：侧风，船还能走` };
}

/** 迎风换舷：目标航向落在来风两侧 nogo 度以内（禁航区）时，取禁航区两边的两个航向 h1、h2，按 a、b 的比例轮流走，a·h1 + b·h2 的方向就是目标航向。不在禁航区里返回 null。 */
export function tackLegs(lat, heading, shift = 0, rot = true, nogo = 45) {
  const w = windAt(lat, shift, rot); if (!w.known) return null;
  const from = (Math.atan2(w.u, w.v) * 180 / Math.PI + 540) % 360, off = Math.abs(((heading - from + 540) % 360) - 180); if (off >= nogo) return null;
  const d = (h) => [Math.sin((h * Math.PI) / 180), Math.cos((h * Math.PI) / 180)], h1 = from + nogo, h2 = from - nogo, [x1, y1] = d(h1), [x2, y2] = d(h2), [xc, yc] = d(heading), det = x1 * y2 - x2 * y1;
  return { from, h1: (h1 + 360) % 360, h2: (h2 + 360) % 360, a: (xc * y2 - x2 * yc) / det, b: (x1 * yc - xc * y1) / det };
}
/** 两舷各走多久（秒，动画用）：严格按 a:b，整个周期一起拉长保证短舷不少于 0.5 秒 */
export function tackTimes(tk, cycle = 2.6, min = 0.5) { const k = Math.max(cycle / (tk.a + tk.b), min / Math.min(tk.a, tk.b)); return [k * tk.a, k * tk.b]; }
