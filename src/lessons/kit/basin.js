// 黄河流域调沙减淤的教学模型（纯计算，活页 basin.js 和核对脚本共用）。课本选必2 第 61–64 页，图 4.5 黄河下游的“地上河”、图 4.6 水土保持、图 4.7 主要水文站年均输沙量、图 4.9 小浪底放水调沙。
// 只算一件事：一年里有多少泥沙（亿吨）从哪来、到哪去。数都是示意，只有几个“锚”对着课本图 4.7：
//   不治理、没有水库：进入小浪底一带约 13.33 亿吨（图 4.7 小浪底站 1956—1986 年），入海约 9.78 亿吨（利津站），下游河道每年淤下约 3.6 亿吨。
//   上游（头道拐以上）来的沙固定取 1.41 亿吨（图 4.7 头道拐站 1956—1986 年）；其余来自中游黄土高原。
//   三类水土保持措施各减掉一部分中游来沙（比例是示意，只保证三样都做时，进入小浪底一带的量级和图 4.7 的 1987—2005 年小浪底站 5.46 亿吨相当）。
//   下游河道：固定年水量、年内水文过程和河道条件，以假设年输沙能力阈值分段表示冲淤；不计算实际浓度或水动力。
//   小浪底水库：拦下大部分进库的泥沙（示意：九成），但假设拦沙质量容量有限——淤满了就拦不住了。进库的沙越少，达到假设上限越晚；不预测实际水库寿命。
// 注意：真实的输沙量减少，还和降水变化、上游水库、引水用水等有关；这里只把课本讲的水土保持、水库拦沙、调水调沙拿出来比。
export const UP = 1.41, MID0 = 13.33 - 1.41, RES_CAP = 100;          // 上游来沙、中游来沙（不治理）、假设拦沙质量容量（亿吨，非体积库容）
export const MEASURES = {
  bio: { name: '生物措施', where: '塬面、坡面：封山育林、退耕还林还草', how: '植被拦截雨水、固住土壤', cut: 0.3 },
  farm: { name: '耕作措施', where: '塬面、缓坡：沿等高线耕作、留茬少耕、免耕', how: '增加入渗、减少地表径流', cut: 0.25 },
  eng: { name: '工程措施', where: '坡上修梯田、挖鱼鳞坑，沟里打坝淤地', how: '拦截坡面径流、拦泥固沟（课本：保塬、护坡、固沟）', cut: 0.35 },
};
const MUDDY_KEEP = 0.73, CAPACITY = 2, SCOUR = 0.15, FLUSH = 0.47, TRAP = 0.9;          // 固定年水量、年内水文过程及河道条件；2 亿吨/年为假设输沙能力阈值，非浓度界线；各系数仅用于教学比较
/** 中游来沙（亿吨／年） */
export function midLoad({ bio = false, farm = false, eng = false } = {}) { let m = MID0; for (const [k, on] of [['bio', bio], ['farm', farm], ['eng', eng]]) if (on) m *= 1 - MEASURES[k].cut; return m; }
/** 这一年（水库里已经淤了 res 亿吨）：各处的泥沙 */
export function loads(cfg = {}, res = 0) {
  const mid = midLoad(cfg), inflow = UP + mid, trapped = cfg.dam ? Math.min(inflow * TRAP, Math.max(0, RES_CAP - res)) : 0, out = inflow - trapped;
  const sea = out > CAPACITY ? out * MUDDY_KEEP : out + (cfg.dam && cfg.flush ? FLUSH : cfg.dam ? SCOUR : 0);          // 固定水文前提下的分段冲淤示意，不用年沙量判断清浑
  return { up: UP, mid, inflow, out, sea, deposit: out - sea, trapped, full: !!cfg.dam && res + trapped >= RES_CAP };

}
/** 下游河床一年抬高多少米（示意：每淤 1 亿吨约抬高 2.5 厘米；不治理、没有水库时约 9 厘米一年） */
export const bedRise = (deposit) => deposit * 0.025;
/** 一口气走 years 年：返回每年的河床高度、最后水库淤了多少（配置在这几年里不变） */
export function run(cfg, { bed, res = 0 }, years = 10) {
  const beds = [], frames = []; let b = bed, r = res, last = null;
  for (let y = 0; y < years; y++) { const l = loads(cfg, r), from = { bed: b, res: r }; r += l.trapped; b += bedRise(l.deposit); beds.push(b); frames.push({ from, bed: b, res: r, loads: l }); last = l; }
  return { beds, frames, bed: b, res: r, last, first: loads(cfg, res) };
}
// 简化边界：未模拟库区排沙、减淤，只示意调度对下游的冲刷；不能预测小浪底长期运行或寿命。
// 真实库区排沙过程参见《湖泊科学》2024，DOI: 10.18307/2024.0544。

/** 年内只对同一年度的库存和河床插值；年输沙量保持该年度的收支值，并非瞬时流率。 */
export function frameAt(result, elapsed) {
  const k = Math.max(0, Math.min(result.frames.length, elapsed)), i = Math.min(result.frames.length - 1, Math.floor(k)), f = result.frames[i], t = k - i;
  return { bed: f.from.bed + (f.bed - f.from.bed) * t, res: f.from.res + (f.res - f.from.res) * t, loads: f.loads, year: i + 1 };
}
export const configKey = (cfg) => ['bio', 'farm', 'eng', 'dam', 'flush'].map((k) => k === 'flush' ? +(cfg.dam && cfg.flush) : +!!cfg[k]).join('');
export const configName = (cfg) => { const names = Object.keys(MEASURES).filter((k) => cfg[k]).map((k) => MEASURES[k].name); return `${names.length ? `中游${names.join('＋')}` : '中游不治理'}${cfg.dam ? (cfg.flush ? '，小浪底调水调沙' : '，小浪底只拦沙') : ''}`; };
export const leveeResult = (levee, flood) => levee < flood ? '堤顶仍低于模拟洪水位，仍有漫堤危险。' : levee === flood ? '堤顶仅与模拟洪水位齐平，尚无安全余量。' : '堤顶已高于本模型的模拟洪水位；这不代表实际防洪安全保证。';
