// 褶皱的教学模型（纯计算，活页 fold.js 和核对脚本共用）。一个东西向的剖面：x 朝东，y 朝上，褶皱的轴线沿南北（z）方向，所以只看 x。
// 课本选必1 第 27 页：挤压力使岩层波状弯曲成褶皱；背斜向上拱起形成山岭，向斜向下弯曲形成谷地；
// 在外力长期作用下会倒置：背斜顶部受张力产生裂隙，容易被侵蚀成谷地；向斜槽部受挤压、岩石致密，不易被侵蚀，相对高耸成山岭。
// 判断背斜、向斜看岩层新老：背斜中心的岩层老、两翼新；向斜中心新、两翼老。数值都是示意。
export const XL = -0.17, XR = 0.17;
export const NLAY = 6, TH = 0.009, Y0 = 0.058;          // 6 层，每层 9 mm（示意）；第 1 层最老在最下面
export const LAM = 0.17;          // 褶皱的波长：x = 0 是背斜的轴，x = ±LAM/2 是向斜的轴
export const AMP = 0.02;          // 挤压到底时弯曲的幅度
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 岩层被挤弯后往上抬了多少（c：挤压 0–1） */
export const bend = (x, c) => AMP * c * Math.cos((2 * Math.PI * x) / LAM);
/** 背斜顶部的裂隙有多密（0–1）：只在挤得够弯、靠近背斜轴的地方 */
export const crack = (x, c) => sm(0.4, 0.9, c) * sm(0.35, 0.95, Math.cos((2 * Math.PI * x) / LAM));
/** 向斜槽部被挤压得有多致密（0–1） */
export const tight = (x, c) => sm(0.4, 0.9, c) * sm(0.35, 0.95, -Math.cos((2 * Math.PI * x) / LAM));
/** 地面高度：c 挤压，e 外力侵蚀了多久（0–1） */
export function surface(x, c, e) {
  const erode = e * (0.012 + 0.05 * sm(0.4, 0.9, c) * (1 + Math.cos((2 * Math.PI * x) / LAM)) / 2);          // 越靠近背斜轴（裂隙越多）冲得越快，越靠近向斜轴（致密）冲得越慢；平滑变化，倒置以后背斜是谷、向斜是山
  return Y0 + bend(x, c) - erode;
}
/** (x, y) 处是第几层（1 最老 … NLAY 最新；在最上一层上面就是 NLAY） */
export function layerAt(x, y, c) { const k = Math.floor((y - bend(x, c)) / TH) + 1; return Math.max(1, Math.min(NLAY, k)); }
/** 地面上露出来的是第几层 */
export const exposed = (x, c, e) => layerAt(x, surface(x, c, e) - 1e-6, c);
