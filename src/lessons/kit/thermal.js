// 热力环流的教学模型（纯计算，活页 thermal.js 和核对脚本共用）。一个竖直剖面：x 横向（东为正），z 向上，地面 z = 0，顶 z = H。
// 课本必修第一册第 36 页：A 地受热多 → 近地面空气膨胀上升 → 上空聚积形成高压（B、C 上空低压）→ 上空空气从 A 流向 B、C
// → A 近地面空气密度减小形成低压，B、C 下沉形成高压 → 近地面空气从 B、C 流回 A，形成热力环流。
export const XL = -0.17, XR = 0.17, H = 0.14, N = 68;
export const DX = (XR - XL) / N;
export const xOf = (i) => XL + (i + 0.5) * DX;
export const iOf = (x) => Math.max(0, Math.min(N - 1, Math.floor((x - XL) / DX)));
const meanOut = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return a.map((v) => v - m); };

/** 一个新的状态：地面温度距平 θ（℃），上空气压的反应 P（快），环流强度 S（慢） */
export function makeState() { return { th: new Float64Array(N), P: new Float64Array(N), S: new Float64Array(N) }; }
/** 往前走 dt 秒：P 跟着 θ 快一点（受热膨胀、上空先聚积），S 慢一点（空气流开以后近地面气压才变） */
export function step(st, dt, { tauP = 0.8, tauS = 2.2, relax = 0 } = {}) {
  const tp = meanOut(Array.from(st.th));
  for (let i = 0; i < N; i++) { st.P[i] += (tp[i] - st.P[i]) * Math.min(1, dt / tauP); st.S[i] += (tp[i] - st.S[i]) * Math.min(1, dt / tauS); if (relax) st.th[i] *= Math.max(0, 1 - dt / relax); }
  const t2 = st.th.slice(); for (let i = 1; i < N - 1; i++) st.th[i] = t2[i] + 0.15 * dt * (t2[i - 1] - 2 * t2[i] + t2[i + 1]) / 1;          // 地面上热量慢慢摊开一点
}
/** 风场（单位：模型速度）。上半层（上空）和上升气流跟着 P（受热膨胀、上空先聚积，先动起来），下半层（近地面）跟着 S（近地面气压后变，后动起来）。
 *  稳定以后 P = S，就是一个闭合的环流：w ∝ S′·sin(πz/H)，u 由连续性得出 u = −(π/H)·Φ(x)·cos(πz/H)，Φ = ∫S′dx */
export function field(st) {
  // 网格中心间线性插值，边缘延拓半格；积分与竖直速度使用同一连续函数，稳定时满足连续性。
  const xs = [XL, ...Array.from({ length: N }, (_, i) => xOf(i)), XR];
  const profile = (values) => {
    const v = [values[0], ...values, values[N - 1]], phi = [0];
    for (let i = 0; i < xs.length - 1; i++) phi.push(phi[i] + (v[i] + v[i + 1]) * (xs[i + 1] - xs[i]) / 2);
    return { v, phi };
  };
  const P = profile(st.P), S = profile(st.S);
  return {
    at(x, z) {
      x = Math.max(XL, Math.min(XR, x));
      const i = x < xOf(0) ? 0 : Math.min(N, Math.floor((x - xOf(0)) / DX) + 1), dx = x - xs[i], span = xs[i + 1] - xs[i];
      const sample = (a) => a.v[i] + (a.v[i + 1] - a.v[i]) * dx / span;
      const integral = (a) => a.phi[i] + a.v[i] * dx + (a.v[i + 1] - a.v[i]) * dx * dx / (2 * span);
      const k = Math.PI / H, c = Math.cos(k * z), ph = integral(c < 0 ? P : S);
      return [-k * ph * c * 0.02, sample(P) * Math.sin(k * z) * 0.02];
    },
  };
}
/** 地面温度距平 th 对应的稳定环流（用于比较稳定极限，不作为当前观察记录） */
export function steady(th) { const st = makeState(); st.th.set(th); const tp = meanOut(Array.from(th)); st.P.set(tp); st.S.set(tp); return st; }
/** 等压面：第 k 层原来在 zk。上空（zk 大）在受热的地方向上拱（高压），近地面（zk 小）向下凹（低压） */
export function isobar(st, zk, x) { const i = iOf(x), r = zk / H; return zk + 0.0016 * st.P[i] * r * r - 0.0016 * st.S[i] * (1 - r) * (1 - r); }
/** 气压高低（相对同一高度的别处）：近地面看 −S，上空看 P */
export function pressure(st, x, aloft) { const i = iOf(x); return aloft ? st.P[i] : -st.S[i]; }

// ---- 台湾海峡：福建（西）| 海峡 | 台湾（东）。陆地比热小，白天增温快、夜晚降温快；海洋变化小、慢 ----
export const COAST_W = -0.075, COAST_E = 0.095;
export const isLand = (x) => x < COAST_W || x > COAST_E;
// 理想海陆风：背景风较弱，未模拟季风、地形；依据 NWS https://www.weather.gov/hfo/kids
/** h 时（0–24）的教学温度距平；正弦与时刻是假设值，不是台湾海峡观测 */
export function seaLandTemp(x, h) { const w = (2 * Math.PI) / 24; return isLand(x) ? 5 * Math.sin(w * (h - 9)) : 1.2 * Math.sin(w * (h - 11)); }
/** 风向：按风从哪边吹来叫；u > 0 往东吹＝西风 */
export const windName = (u) => (Math.abs(u) < 1e-5 ? '静风' : u > 0 ? '西风' : '东风');

/** 与当前热力条件的稳定解比较；2% 是教学显示容差，不是观测标准。 */
export function settled(st) {
  const target = meanOut(Array.from(st.th)), scale = Math.max(0.1, ...target.map(Math.abs));
  return target.every((v, i) => Math.abs(st.P[i] - v) <= 0.02 * scale && Math.abs(st.S[i] - v) <= 0.02 * scale);
}
/** 从当前连续速度场积分瞬时流线；急转处缩短步长，停滞或出界时终止，不跨越反向区。 */
export function streamline(st, x, z, count = 600) {
  const F = field(st), points = [[x, z]], maxStep = 0.0008, minStep = 1e-7, cosLimit = Math.cos(4 * Math.PI / 180);
  const direction = (a, b) => { const v = F.at(a, b), speed = Math.hypot(...v); return speed < 1e-5 ? null : v.map((q) => q / speed); };
  const inside = (a, b) => a > XL && a < XR && b > 0 && b < H;
  const aligned = (a, b) => a && b && a[0] * b[0] + a[1] * b[1] >= cosLimit;
  for (let i = 0; i < count; i++) {
    const v = direction(x, z); if (!v) break;
    let ds = maxStep, next = null;
    while (ds >= minStep) {
      const mx = x + ds * v[0] / 2, mz = z + ds * v[1] / 2;
      if (!inside(mx, mz)) { ds /= 2; continue; }
      const mid = direction(mx, mz);
      if (mid) {
        const nx = x + ds * mid[0], nz = z + ds * mid[1];
        if (inside(nx, nz) && aligned(v, mid) && aligned(v, direction(nx, nz))) { next = [nx, nz]; break; }
      }
      ds /= 2;
    }
    if (!next) break;
    [x, z] = next; points.push(next);
    if (i > 20 && Math.hypot(x - points[0][0], z - points[0][1]) < ds) break;
  }
  return points;
}
/** 自动观察在尚未记录的6时、14时停留；记录完成后继续。时间速度为教学设定。 */
export function seaClock(hour, dt, logs) {
  const delta = dt * 1.2;
  for (const [target, slot] of [[6, '早上'], [14, '下午']]) {
    const distance = (target - hour + 24) % 24;
    if (!logs[slot] && distance <= delta + 1e-10) return target;
  }
  return (hour + delta) % 24;
}
