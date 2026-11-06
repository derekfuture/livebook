// 喀斯特地貌的教学模型（纯计算，活页 karst.js 和核对脚本共用）。课本必修1 第 66–68 页，图 4.2 地表喀斯特地貌景观演变示意、图 4.4 溶洞。
// 喀斯特地貌：可溶性岩石（如石灰岩）的物质溶于水并被带走，或重新沉淀，在地表和地下形成的地貌。
// 演变的先后（图 4.2）：溶沟 → 洼地 → 峰丛 → 峰林 → 孤峰 → 残丘。地下：溶洞，顶部向下长石钟乳，底部向上长石笋，连起来成石柱。
// stage：0—1 的“发育程度”（示意）。发育得快慢：岩石可溶（石灰岩）、水多（湿润）才快；不可溶的岩石（花岗岩）不形成喀斯特地貌。
// 课本说“在适当条件下”；湿润、温暖、水里溶进二氧化碳多，溶蚀就强——我国广西、贵州、云南最典型。快慢的倍数是示意。
export const STAGES = [['溶沟', 0], ['洼地', 0.18], ['峰丛', 0.36], ['峰林', 0.56], ['孤峰', 0.76], ['残丘', 0.9]];
export const stageName = (t) => { let n = null; for (const [name, a] of STAGES) if (t >= a + 0.02) n = name; return n; };          // 刚开始（还没形成溶沟）是 null
export const RATE = { limestone: { wet: 1, dry: 0.15 }, granite: { wet: 0, dry: 0 } };
export const STEP = 0.12;          // “让一段很长的时间过去”一次，湿润地区的石灰岩往前走多少（示意）
/** 溶洞有多大、石钟乳和石笋长了多少（0—1）：洞先长大，钟乳石、石笋慢慢长，连起来成石柱 */
export const cave = (t) => ({ size: Math.min(1, t / 0.45), drip: Math.max(0, Math.min(1, (t - 0.2) / 0.5)), column: t > 0.66 });

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const joint = (x, z) => { const a = Math.abs(Math.sin((x * 0.92 + z * 0.39) * 160)), b = Math.abs(Math.sin((z * 0.95 - x * 0.31) * 140)); return Math.max((1 - a) ** 14, (1 - b) ** 14); };          // 岩石里两组节理（裂隙），溶沟顺着它们长
export const terrainHeight = (b, P, x, z, t, H0 = 0.09) => {
  if (b.rock === 'granite') return H0;          // 花岗岩地块保持不变：本活页不模拟其风化侵蚀
  const base = H0 - 0.05 * sm(0.14, 0.62, t) - 0.008 * sm(0.75, 1, t), c0 = 0.03 + 0.6 * sm(0.3, 0.78, t), hs = 1 - 0.78 * sm(0.84, 1, t);          // 地面一路溶低；峰的基部越来越窄（峰丛 → 峰林）；到最后峰也矮了（残丘）
  let top = 0; for (const p of P) { if (p.r < 0.82 * sm(0.62, 0.92, t)) continue; const cone = Math.max(0, 1 - Math.hypot(x - p.x, z - p.z) / (0.028 * p.k)); top = Math.max(top, sm(c0, 1, cone) ** (0.7 + 0.6 * t) * hs * (0.85 + 0.15 * p.r)); }          // 越往后，留下的峰越少（孤峰）
  let hgt = base + (H0 - base) * top;
  hgt -= 0.01 * sm(0, 0.16, t) * joint(x, z);          // 累计溶沟不回填；基面降低、残余峰体缩小，纯溶蚀中同一点高度不回升
  return Math.max(0.03, hgt);
};
