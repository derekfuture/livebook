// 黄河流域调沙减淤的教学模型（纯计算，活页 basin.js 和核对脚本共用）。课本选必2 第 61–64 页，图 4.5 黄河下游的“地上河”、图 4.6 水土保持、图 4.7 主要水文站年均输沙量、图 4.9 小浪底放水调沙。
// 只算一件事：一年里有多少泥沙（亿吨）从哪来、到哪去。数都是示意，只有几个“锚”对着课本图 4.7：
//   不治理、没有水库：进入小浪底一带约 13.33 亿吨（图 4.7 小浪底站 1956—1986 年），入海约 9.78 亿吨（利津站），下游河道每年淤下约 3.6 亿吨。
//   上游（头道拐以上）来的沙固定取 1.41 亿吨（图 4.7 头道拐站 1956—1986 年）；其余来自中游黄土高原。
//   三类水土保持措施各减掉一部分中游来沙（比例是示意，只保证三样都做时，进入小浪底一带的量级和图 4.7 的 1987—2005 年小浪底站 5.46 亿吨相当）。
//   下游河道：泥沙多的浑水，大约三成淤在河道里（图 4.7 两个年代，利津比小浪底都少约三成左右）；水库放下来的是清水，会冲刷河床；调水调沙的人造洪峰冲得更多。
//   小浪底水库：拦下大部分进库的泥沙（示意：九成），但拦沙的库容有限——淤满了就拦不住了。进库的沙越少，水库能用得越久。
// 注意：真实的输沙量减少，还和降水变化、上游水库、引水用水等有关；这里只把课本讲的水土保持、水库拦沙、调水调沙拿出来比。
export const UP = 1.41, MID0 = 13.33 - 1.41, RES_CAP = 100;          // 上游来沙、中游来沙（不治理）、水库拦沙库容（亿吨，示意）
export const MEASURES = {
  bio: { name: '生物措施', where: '塬面、坡面：封山育林、退耕还林还草', how: '植被拦截雨水、固住土壤', cut: 0.3 },
  farm: { name: '耕作措施', where: '塬面、缓坡：沿等高线耕作、留茬少耕、免耕', how: '增加入渗、减少地表径流', cut: 0.25 },
  eng: { name: '工程措施', where: '坡上修梯田、挖鱼鳞坑，沟里打坝淤地', how: '拦截坡面径流、拦泥固沟（课本：保塬、护坡、固沟）', cut: 0.35 },
};
const MUDDY_KEEP = 0.73, CLEAR = 2, SCOUR = 0.15, FLUSH = 0.47, TRAP = 0.9;          // 浑水送到入海口的比例（9.78 / 13.33）；“清水”的界线；清水、调水调沙每年冲刷下游河床多少（示意，调水调沙对着图 4.7：小浪底站 0.55 → 利津站 1.02）
/** 中游来沙（亿吨／年） */
export function midLoad({ bio = false, farm = false, eng = false } = {}) { let m = MID0; for (const [k, on] of [['bio', bio], ['farm', farm], ['eng', eng]]) if (on) m *= 1 - MEASURES[k].cut; return m; }
/** 这一年（水库里已经淤了 res 亿吨）：各处的泥沙 */
export function loads(cfg = {}, res = 0) {
  const mid = midLoad(cfg), inflow = UP + mid, trapping = cfg.dam && res < RES_CAP, out = trapping ? inflow * (1 - TRAP) : inflow;
  const sea = out > CLEAR ? out * MUDDY_KEEP : out + (cfg.dam && cfg.flush ? FLUSH : cfg.dam ? SCOUR : 0);          // 浑水淤三成；清水冲刷河床
  return { up: UP, mid, inflow, out, sea, deposit: out - sea, trapped: trapping ? inflow - out : 0, full: cfg.dam && res >= RES_CAP };
}
/** 下游河床一年抬高多少米（示意：每淤 1 亿吨约抬高 2.5 厘米；不治理、没有水库时约 9 厘米一年） */
export const bedRise = (deposit) => deposit * 0.025;
/** 一口气走 years 年：返回每年的河床高度、最后水库淤了多少（配置在这几年里不变） */
export function run(cfg, { bed, res = 0 }, years = 10) {
  const beds = []; let b = bed, r = res, last = null;
  for (let y = 0; y < years; y++) { const l = loads(cfg, r); r += l.trapped; b += bedRise(l.deposit); beds.push(b); last = l; }
  return { beds, bed: b, res: Math.min(r, RES_CAP + 50), last, first: loads(cfg, res) };
}
