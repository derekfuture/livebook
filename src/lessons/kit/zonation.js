// 山地垂直地带性的教学模型（纯数据和计算，活页 zonation.js 和核对脚本共用）。课本选必1 第 88–89 页，图 5.12 喜马拉雅山脉的垂直地域分异。
// 两座山：
//   喜马拉雅山脉（约 28°N）：南坡、北坡的带谱照课本图 5.12。课本图上标了南坡的界线 2 500、3 900、4 500、4 800、5 500 米；
//     混交林和针叶林之间的界线图上没标，这里取约 3 100 米（示意，不写数字）；北坡的界线图上也没标，按图读：山麓约 4 300 米，往上约 4 900、6 000 米。
//   长白山（约 42°N，主峰 2 691 米）：北坡常见资料的带谱，界线是约数，各资料略有出入。
// x：模型里的横向位置（−1 北端 … +1 南端）；海拔单位都是米。
export const LAPSE = 0.6;          // 海拔每升高 100 米，气温约降低 0.6 ℃（课本必修1 对流层）

export const KIND = {
  broad: { name: '常绿阔叶林', color: 0x3d7a37 },
  mixed: { name: '高山针叶阔叶混交林', color: 0x4c7b3d },
  conifer: { name: '高山针叶林', color: 0x2e5a3a },
  shrub: { name: '高山灌木林', color: 0x7c7448 },
  meadow: { name: '高山草甸', color: 0x9cbc5c },
  meadowS: { name: '高山草甸草原', color: 0xaab866 },
  desert: { name: '高寒荒漠', color: 0xb5a17e },
  snow: { name: '积雪冰川', color: 0xf3f5f8 },
  dry: { name: '？要看水热条件推断', color: 0xcfc6b2 },
  cbMixed: { name: '针阔叶混交林', color: 0x47793c },
  cbDark: { name: '暗针叶林（云杉、冷杉）', color: 0x2c5638 },
  birch: { name: '岳桦林', color: 0x8ea667 },
  tundra: { name: '高山苔原', color: 0xa09a6c },
};

// 每一坡的带谱：[种类, 下界, 上界]，从山麓往上；shown：课本图上标了数字的界线
export const MOUNTAINS = {
  hima: {
    name: '喜马拉雅山脉', lat: '约 28°N', peak: 8848.86, peakName: '珠穆朗玛峰',
    south: { foot: 1000, bands: [['broad', 1000, 2500], ['mixed', 2500, 3100], ['conifer', 3100, 3900], ['shrub', 3900, 4500], ['meadow', 4500, 4800], ['desert', 4800, 5500], ['snow', 5500, 9000]], shown: [2500, 3900, 4500, 4800, 5500] },
    north: { foot: 4300, bands: [['meadowS', 4300, 4900], ['desert', 4900, 6000], ['snow', 6000, 9000]], shown: [] },
    northLow: { foot: 1000, bands: [['dry', 1000, 4300], ['meadowS', 4300, 4900], ['desert', 4900, 6000], ['snow', 6000, 9000]], shown: [] },          // 假如北坡山麓也低到 1 000 米：多出来的这一段长什么，课本没有给答案（问题 3 要学生推断），这里不画植被，只标“？”
  },
  cb: {
    name: '长白山', lat: '约 42°N', peak: 2691, peakName: '白云峰（中国境内最高峰）', lake: 2189,          // 山顶是火山口，里面是天池（水面约 2 189 米）
    north: { foot: 500, bands: [['cbMixed', 500, 1100], ['cbDark', 1100, 1800], ['birch', 1800, 2000], ['tundra', 2000, 3000]], shown: [1100, 1800, 2000] },
  },
};

/** 一座山的剖面：x（−1 北 … +1 南）处的海拔。cut：假如把山削低到多少米（只对喜马拉雅） */
export function elev(m, x, { cut = Infinity, northLow = false, r = null } = {}) {          // r：长白山按离火山口中心的距离算（−1…1 的尺度），不给就用 |x|
  let e; x = Math.max(-1, Math.min(1, x));
  if (m === 'hima') {
    const xp = -0.25;          // 主峰偏北：北坡短而陡、山麓是高原；南坡长，一直降到 1 000 米
    if (x >= xp) { const u = (x - xp) / (1 - xp); e = 1000 + (8848.86 - 1000) * (1 - u) ** 1.55; }
    else { const u = (xp - x) / (1 + xp); e = northLow ? 1000 + (8848.86 - 1000) * (1 - u) ** 1.35 : 4300 + (8848.86 - 4300) * Math.max(0, 1 - u * 1.35) ** 1.6; }
    if (e > cut) e = cut - Math.min(60, (e - cut) * 0.03);          // 削平的山顶：最高就是 cut，顶上往下留一点起伏
  } else {
    const rr = r ?? Math.abs(x), crater = 0.12;          // 长白山：一座火山，山顶的火山口里是天池
    e = rr < crater ? 2050 + (2691 - 2050) * (rr / crater) ** 2 : 500 + (2691 - 500) * Math.max(0, 1 - (rr - crater) / (1 - crater)) ** 1.7;          // 火山口底约 2 050 米，天池的水面约 2 189 米
  }
  return e;
}
/** x 在哪一坡（看主峰在哪边） */
export const sideOf = (m, x) => (m === 'hima' ? (x >= -0.25 ? 'south' : 'north') : 'north');
/** 这一坡、这个海拔是哪一种 */
export function bandAt(m, side, h, northLow = false) {
  const B = MOUNTAINS[m][side === 'north' && northLow ? 'northLow' : side].bands;
  for (const b of B) if (h < b[2]) return b[0];
  return B[B.length - 1][0];
}
/** 这一坡在山高 top 以下，一共有几个带 */
export const bandsBelow = (m, side, top, northLow = false) => MOUNTAINS[m][side === 'north' && northLow ? 'northLow' : side].bands.filter((b) => b[1] < top);
/** 比这座山最低的山麓冷多少（℃） */
export const colderBy = (m, h) => ((h - (m === 'hima' ? 1000 : 500)) / 100) * LAPSE;

/** 最终地形海拔：所有起伏之后统一限高；zn 从前剖面 0 到后缘 1。 */
export function terrainHeight(m, u, zn, opt = {}) {
  if (m === 'cb') return elev(m, u, { r: Math.hypot(u, zn * 0.14 / 0.19 * 1.15) });
  const wob = 0.06 * Math.sin(zn * 4.2 + 0.8) * zn * (1 - Math.abs(u) * 0.6);
  let e = elev(m, u + wob, opt);
  e += zn * (160 * Math.sin(u * 17 + zn * 9) + 90 * Math.sin(u * 41 - zn * 13)) * Math.min(1, (e - 900) / 1500);
  const foot = MOUNTAINS.hima[sideOf(m, u) === 'north' && opt.northLow ? 'northLow' : sideOf(m, u)].foot;
  return Math.max(foot, Math.min(e, Math.min(opt.cut ?? Infinity, MOUNTAINS.hima.peak) - 1e-6));          // 顶部不形成零厚度的新带，与 bandsBelow 的严格下界一致
}

// 递减率随时地变化，0.6℃/100米仅作海拔影响估算：https://courses.ems.psu.edu/meteo3/node/1968 。
// 长白山带界参考《植物生态学报》2017，41(12):1228–1238，研究区概况：https://www.plant-ecology.com/article/2017/1005-264X/1005-264X-41-12-1228.shtml 。

/** 天池的示意岸线半径：由火山口地形与湖面相交求得，不是真实湖泊尺度。 */
export const LAKE_RADIUS = 0.12 * Math.sqrt((MOUNTAINS.cb.lake - 2050) / (2691 - 2050));
/** 水域不属于陆生植被带；低海拔山麓即使低于湖面，也不是天池。 */
export function surfaceBandAt(m, u, zn, opt = {}) {
  const r = Math.hypot(u, zn * 0.14 / 0.19 * 1.15);
  if (m === 'cb' && r <= LAKE_RADIUS) return null;
  return bandAt(m, sideOf(m, u), terrainHeight(m, u, zn, opt), m === 'hima' && opt.northLow);
}
