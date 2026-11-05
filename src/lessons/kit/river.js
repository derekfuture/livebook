// 河谷演变的教学模型（纯计算，活页 river.js 和核对脚本共用）。坐标：x 顺流朝东，z 朝南（北＝−z），y 朝上；t：0 刚开始 → 1 很久以后（示意）。
// 课本第 33 页：初期落差大，以向下、向源头侵蚀为主，河谷加深、延长，横剖面呈“V”形；
// 之后落差减小，向下侵蚀减弱、向两岸侵蚀加强，河道变弯；凹岸侵蚀、凸岸堆积，河道更弯、河谷拓宽；最后横剖面呈宽而浅的槽形。
export const XL = -0.17, XR = 0.17, ZD = 0.1;
export const WC = 0.014, DC = 0.006;          // 河道宽、深
export const LAM = 0.22, APEX = 0.05;          // 河湾的波长；x = APEX 那个湾向北凸（北岸是凹岸、南岸是凸岸，像课本说的长江镇江段）
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const smooth = sm;

export function stage(t) {
  return {
    amp: 0.003 + 0.034 * sm(0.3, 0.95, t),          // 河湾弯多大
    head: -0.1 - 0.06 * sm(0, 0.4, t),          // 河谷的源头在哪（向源头侵蚀，河谷延长）
    floorHalf: WC / 2 + 0.002 + (0.034 + 0.014) * sm(0.3, 0.95, t),          // 谷底半宽：早期只有河道那么宽（V 形），后来比整条弯来弯去的河还宽一些（槽形）
    wall: 2.6 - 1.4 * sm(0.3, 1, t),          // 谷壁坡度（竖直/水平）：早期陡
    inc: sm(0, 0.55, t),          // 下切到哪了
  };
}
export const topY = (x) => 0.058 + 0.02 * (XR - x) / (XR - XL);          // 原来的高地：上游高、下游低
const endY = (x) => 0.02 + 0.004 * (XR - x) / (XR - XL);          // 很久以后的谷底：坡度小多了
/** 谷底高度：一开始就是高地面（落差大），慢慢下切到很缓的谷底（落差小） */
export function floorY(x, t) { const s = stage(t); return topY(x) - 0.003 - (topY(x) - 0.003 - endY(x)) * s.inc; }
/** 落差：河床从上游到下游降了多少（示意） */
export function drop(t) { return floorY(XL, t) - floorY(XR, t); }
export function centerZ(x, t) { const s = stage(t); return s.amp * Math.sin((2 * Math.PI / LAM) * (x - APEX) - Math.PI / 2); }          // APEX 处 = −amp（向北凸）
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
/** 谷壁上的冲沟：沿着河谷一条条切进谷壁，越往后越深（示意） */
export function gullyAt(x, z, t) {
  const s = stage(t), az = Math.abs(z), q = az - s.floorHalf; if (q < -0.001) return 0;
  const side = z > 0 ? 1 : 0, u = x * 44 + side * 0.37 + 0.35 * Math.sin(x * 23 + side), c = Math.floor(u), f = u - c - 0.5 - (hash(c + side * 50) - 0.5) * 0.6;          // 间距、位置都打乱一点，不像折纸
  const reach = (topY(x) - floorY(x, t)) / s.wall + 0.004 + 0.014 * hash(c * 3 + side), w = Math.exp(-((f / 0.16) ** 2));
  return 0.0035 * (0.3 + hash(c * 7 + side * 13 + 1)) * w * Math.max(0, 1 - q / reach) * sm(0.12, 0.55, t);
}
/** 地面高度（gully = false：不算冲沟，核对横剖面时用） */
export function heightAt(x, z, t, gully = true) {
  const s = stage(t), top = topY(x) + 0.0012 * Math.sin(x * 90 + z * 40) * Math.sin(z * 70 - x * 20);
  const f = sm(s.head, s.head + 0.04, x);          // 源头往上游还没有河谷
  if (f <= 0) return top;
  const fl = top - (top - floorY(x, t)) * f, az = Math.abs(z);
  let y = az <= s.floorHalf ? fl : Math.min(top, fl + (az - s.floorHalf) * s.wall);
  if (gully && az > s.floorHalf) y = Math.max(fl, y - gullyAt(x, z, t) * f);
  const zc = centerZ(x, t), u = (z - zc) / (WC / 2);
  if (Math.abs(u) < 1 && y <= fl + 1e-6) {          // 河道：凹岸那边深、陡，凸岸那边浅、缓
    const k = 2 * Math.PI / LAM, curv = s.amp * k * k * Math.sin(k * (x - APEX) - Math.PI / 2), o = Math.max(-1, Math.min(1, curv / (0.037 * k * k)));          // curv ＝ −z″：o > 0 表示凹岸在 +z（南）
    y -= DC * f * (1 - u * u) * (1 + 0.85 * o * u) * (0.6 + 0.4 * s.inc);
  }
  return y;
}
export function waterY(x, t) { return floorY(x, t) - 0.0016; }
/** 某处河岸到水边多远（在河道里返回负数） */
export function gapAt(x, z, t) { const zc = centerZ(x, t), d = Math.abs(z - zc) - WC / 2; return d; }
