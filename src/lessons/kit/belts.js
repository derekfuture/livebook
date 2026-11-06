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
/** 某纬度在哪个风带里、风从哪来、多大（rot：地球自转；不自转时每个半球只有一个环流圈，近地面风从极地直吹向赤道） */
export function windAt(lat, shift = 0, rot = true) {
  if (!rot) { const s = Math.sin((Math.PI * Math.min(90, Math.abs(lat - shift))) / 90), v = lat > shift ? -s : s; return { u: 0, v, speed: Math.abs(s), dir: Math.abs(s) < 0.15 ? '无风' : v < 0 ? '北风' : '南风', belt: '（假如地球不自转）', zone: null }; }
  const L = (x) => beltLat({ lat: x }, shift), edges = [90, 60, 30, 0, -30, -60, -90].map((x) => clampPole(Math.abs(x) === 90 ? x : x + shift));
  for (let i = 0; i < WINDS.length; i++) {
    const hi = edges[i], lo = edges[i + 1];
    if (lat <= hi && lat >= lo) {
      const t = (lat - lo) / (hi - lo), s = Math.sin(Math.PI * t), w = WINDS[i];          // 风带中间风大，靠近气压带（边上）风小
      const north = w.a >= 0, toward = (i === 0 || i === 2 || i === 5 || i === 3) ? (north ? -1 : 1) : (north ? 1 : -1);          // 信风、极地东风：吹向低纬；西风：吹向高纬
      const sideways = w.dir.includes('西') && !w.dir.startsWith('东') ? 1 : -1;          // 西风带吹向东（u>0）；信风、东风吹向西
      return { u: sideways * s * 0.9, v: toward * s * 0.45, speed: s, dir: s < 0.2 ? '无风或风很小' : w.dir, belt: w.name, zone: i };
    }
  }
  return { u: 0, v: 0, speed: 0, dir: '无风', belt: '', zone: null };
}
/** 离哪个气压带最近（在 tol 度以内就算在这个气压带里） */
export function beltNear(lat, shift = 0, tol = 5) { let best = null; for (const b of BELTS) { const d = Math.abs(lat - beltLat(b, shift)); if (d <= tol && (!best || d < best.d)) best = { ...b, d }; } return best; }
/** 船往 heading（从正北顺时针，度）走，这里的风是顺风、逆风还是侧风 */
export function relWind(lat, heading, shift = 0, rot = true) {
  const w = windAt(lat, shift, rot), hx = Math.sin((heading * Math.PI) / 180), hy = Math.cos((heading * Math.PI) / 180);
  if (w.speed < 0.2) return { ...w, rel: '平静无风' };
  const c = (w.u * hx + w.v * hy) / Math.hypot(w.u, w.v);
  return { ...w, rel: c > 0.35 ? '顺风' : c < -0.35 ? '逆风' : '侧风' };
}
