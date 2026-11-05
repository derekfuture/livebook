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
/** 风场（单位：模型速度）：上升 w ∝ S′·sin(πz/H)，水平 u 由连续性得出 u = −(π/H)·Φ(x)·cos(πz/H)，Φ = ∫S′dx */
export function field(st) {
  const Phi = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) Phi[i + 1] = Phi[i] + st.S[i] * DX;
  return {
    at(x, z) {
      const f = (x - XL) / DX, i = Math.max(0, Math.min(N - 1, Math.floor(f))), ph = Phi[i] + (Phi[i + 1] - Phi[i]) * Math.min(1, Math.max(0, f - i));
      const s = st.S[i], k = Math.PI / H;
      return [-k * ph * Math.cos(k * z) * 0.02, s * Math.sin(k * z) * 0.02];
    },
  };
}
/** 等压面：第 k 层原来在 zk。上空（zk 大）在受热的地方向上拱（高压），近地面（zk 小）向下凹（低压） */
export function isobar(st, zk, x) { const i = iOf(x), r = zk / H; return zk + 0.0016 * st.P[i] * r * r - 0.0016 * st.S[i] * (1 - r) * (1 - r); }
/** 气压高低（相对同一高度的别处）：近地面看 −S，上空看 P */
export function pressure(st, x, aloft) { const i = iOf(x); return aloft ? st.P[i] : -st.S[i]; }

// ---- 台湾海峡：福建（西）| 海峡 | 台湾（东）。陆地比热小，白天增温快、夜晚降温快；海洋变化小、慢 ----
export const COAST_W = -0.075, COAST_E = 0.095;
export const isLand = (x) => x < COAST_W || x > COAST_E;
/** h 时（0–24）的地面温度距平 */
export function seaLandTemp(x, h) { const w = (2 * Math.PI) / 24; return isLand(x) ? 5 * Math.sin(w * (h - 9)) : 1.2 * Math.sin(w * (h - 11)); }
/** 风向：按风从哪边吹来叫；u > 0 往东吹＝西风 */
export const windName = (u) => (Math.abs(u) < 1e-5 ? '静风' : u > 0 ? '西风' : '东风');
