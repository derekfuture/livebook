// 喀斯特地貌的教学模型（纯计算，活页 karst.js 和核对脚本共用）。课本必修1 第 66–68 页，图 4.2 地表喀斯特地貌景观演变示意、图 4.4 溶洞。
// 喀斯特地貌：可溶性岩石（如石灰岩）的物质溶于水并被带走，或重新沉淀，在地表和地下形成的地貌。
// 演变的先后（图 4.2）：溶沟 → 洼地 → 峰丛 → 峰林 → 孤峰 → 残丘。地下：溶洞，顶部向下长石钟乳，底部向上长石笋，连起来成石柱。
// stage：0—1 的“发育程度”（示意）。发育得快慢：岩石可溶（石灰岩）、水多（湿润）才快；不可溶的岩石（花岗岩）不形成喀斯特地貌。
// 课本说“在适当条件下”；湿润、温暖、水里溶进二氧化碳多，溶蚀就强——我国广西、贵州、云南最典型。快慢的倍数是示意。
export const STAGES = [['溶沟', 0], ['洼地', 0.18], ['峰丛', 0.36], ['峰林', 0.56], ['孤峰', 0.76], ['残丘', 0.9]];
/** 峰丛正在变成峰林：峰与峰之间的连接正在溶低（这段时间里不能说“基部相连”，也还不能说“一座座分开”） */
export const shifting = (t) => t > 0.545 && t < 0.58;
export const stageName = (t) => { let n = null; for (const [name, a] of STAGES) if (t >= a + 0.02) n = name; return n; };          // 刚开始（还没形成溶沟）是 null
export const RATE = { limestone: { wet: 1, dry: 0.15 }, granite: { wet: 0, dry: 0 } };
export const STEP = 0.12;          // “让一段很长的时间过去”一次，湿润地区的石灰岩往前走多少（示意）
/** 溶洞有多大、石钟乳和石笋长了多少（0—1）：洞先长大，钟乳石、石笋慢慢长，连起来成石柱 */
export const cave = (t) => ({ size: Math.min(1, t / 0.45), drip: Math.max(0, Math.min(1, (t - 0.2) / 0.5)), column: t > 0.66 });

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const joint = (x, z) => { const a = Math.abs(Math.sin((x * 0.92 + z * 0.39 + 0.004 * Math.sin(z * 90 + 1)) * 160)), b = Math.abs(Math.sin((z * 0.95 - x * 0.31 + 0.004 * Math.sin(x * 80)) * 140)); return Math.max((1 - a) ** 14, (1 - b) ** 14); };          // 岩石里两组节理（裂隙，略弯曲），溶沟顺着它们长
/** 一座峰在 (x, z) 处的“锥度”（0 峰外 … 1 峰顶）：四壁一道道竖的溶槽（半径随方位起伏），往上一层层的岩坎（顺着层面）。只和位置有关 */
export const peakCone = (p, x, z) => {
  const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d >= 0.034 * p.k * 1.15) return 0;          // 离得远：不在这座峰上（先判断，省得算三角函数）
  const a = Math.atan2(dz, dx), ph = p.r * 9.7;
  const R = 0.034 * p.k * (1 + 0.075 * Math.sin(6 * a + ph) + 0.045 * Math.sin(11 * a + ph * 1.7) + 0.025 * Math.sin(19 * a + ph * 2.3));
  const c = Math.max(0, 1 - d / R);
  return c > 0 ? Math.min(1, c + 0.022 * Math.sin(c * 31 + ph) * c) : 0;
};
/** 地形高度：cones[i] 是这一点在第 i 座峰上的锥度（peakCone），jv 是节理（joint）；这两样只和位置有关，可以先算好存着（拖时间时只算下面这些） */
export const terrainFrom = (b, P, cones, jv, t, H0 = 0.09) => {
  if (b.rock === 'granite') return H0;          // 花岗岩地块保持不变：本活页不模拟其风化侵蚀
  const base = H0 - 0.05 * sm(0.14, 0.62, t) - 0.008 * sm(0.75, 1, t), c0 = 0.03 + 0.56 * sm(0.545, 0.575, t), hs = 1 - 0.78 * sm(0.84, 1, t), alive = 0.82 * sm(0.62, 0.92, t);          // 地面一路溶低；峰的基部越来越窄（峰丛 → 峰林）；到最后峰也矮了（残丘）
  let top = 0; for (let i = 0; i < P.length; i++) { const p = P[i], cone = cones[i]; if (p.r < alive || cone <= 0) continue; top = Math.max(top, sm(c0, c0 + 0.42 * (1 - c0), cone) * (0.8 + 0.2 * Math.sqrt(cone)) * hs * (0.85 + 0.15 * p.r)); }          // 峰体四壁陡、顶部浑圆（像桂林的峰林）；越往后，留下的峰越少（孤峰）
  let hgt = base + (H0 - base) * top;
  hgt -= 0.01 * sm(0, 0.16, t) * jv;          // 累计溶沟不回填；基面降低、残余峰体缩小，纯溶蚀中同一点高度不回升
  return Math.max(0.03, hgt);
};
export const terrainHeight = (b, P, x, z, t, H0 = 0.09) => (b.rock === 'granite' ? H0 : terrainFrom(b, P, P.map((p) => peakCone(p, x, z)), joint(x, z), t, H0));
