// 工业区位的教学模型（纯计算，活页 industry.js 和核对脚本共用）。一片虚构的区域（不是真实地图，不画任何边界）：x 朝东、n 朝北。
// 课本必修第二册第 64–66 页：在市场因素一定时，把工厂建在总成本最低的地方；原料易腐或运费高→近原料地（制糖）；产品易变质或运费高→近市场（啤酒）；
// 耗能多→近能源（电解铝近水电站）；劳动力多、技术要求低→近廉价劳动力（服装）；技术要求高→近高校和科技发达的地方（集成电路）；
// 污染重的要远离水源地、河流上游；还要看用地、环境、机场等（上海某石化厂选址案例）。数值都是示意，只用来比较。
export const XL = -0.16, XR = 0.16, NL = -0.11, NR = 0.11;
export const COAST = 0.112;          // 这条经线以东是海（海岸线在附近弯一弯）
export const coastX = (n) => COAST + 0.008 * Math.sin(n * 40) + 0.004 * Math.sin(n * 97);
export const PLACES = {
  city: { x: 0.075, n: 0.022, name: '大城市' },          // 市场
  port: { x: 0.104, n: -0.01, name: '港口' },
  univ: { x: 0.04, n: 0.062, name: '大学城' },          // 科技、人才
  county: { x: -0.07, n: -0.012, name: '县城' },          // 劳动力便宜
  cane: { x: -0.02, n: -0.07, name: '甘蔗田' },          // 原料
  hydro: { x: -0.125, n: 0.042, name: '水电站' },          // 电便宜
  airport: { x: 0.055, n: -0.06, name: '机场' },
  intake: { x: 0.03, n: 0.034, name: '城市水源地' },          // 城市从这里取水（河的上游）
  fishery: { x: 0.142, n: 0.075, name: '渔场' },
};
// 河：从西边山里（水电站）流过县城北边、水源地，从大城市旁边入海
export const RIVER = [[-0.155, 0.05], [-0.125, 0.042], [-0.1, 0.03], [-0.07, 0.018], [-0.04, 0.026], [-0.01, 0.036], [0.03, 0.034], [0.06, 0.03], [0.085, 0.012], [0.11, 0.006]];
export const MOUNTAIN_X = -0.105;          // 这以西是山地
export const WIND = [-0.6, 0.8];          // 盛行风吹去的方向（东南风：从东南吹向西北）
const dist = (a, b) => Math.hypot(a.x - b.x, a.n - b.n);
export function nearRiver(p) { let best = { d: 1e9, i: 0 }; for (let i = 0; i < RIVER.length - 1; i++) { const [ax, an] = RIVER[i], [bx, bn] = RIVER[i + 1], vx = bx - ax, vn = bn - an, t = Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.n - an) * vn) / (vx * vx + vn * vn))), d = Math.hypot(p.x - ax - t * vx, p.n - an - t * vn); if (d < best.d) best = { d, i: i + t }; } return best; }
export const isSea = (p) => p.x > coastX(p.n) - 0.002;
export const isFarm = (p) => (p.n < -0.035 && p.x > -0.09 && p.x < 0.04) || (dist(p, PLACES.city) < 0.06 && dist(p, PLACES.city) > 0.03 && p.x < 0.1);          // 南边平原的甘蔗田、城市周边的菜地
export const isMountain = (p) => p.x < MOUNTAIN_X;

// 六种工厂（每生产一个单位产品，示意的数）：m 原料多重、从哪来；pr 产品多重；e 耗能；l 用工多少；t 技术要求；水污染、空气污染、用地大、设备高
export const INDUSTRIES = {
  sugar: { name: '制糖厂', m: 7, mFrom: 'cane', perish: 1.6, pr: 1, e: 1, l: 1, t: 0, water: true, air: false, land: false, tall: false, lead: '原料' },
  beer: { name: '啤酒厂', m: 1.2, mFrom: 'cane', perish: 1, pr: 5, prPerish: 1.4, e: 1, l: 1, t: 0, water: false, air: false, land: false, tall: false, lead: '市场' },
  alu: { name: '电解铝厂', m: 2, mFrom: 'port', sea: true, pr: 1, e: 9, l: 1, t: 0, water: false, air: true, land: false, tall: false, lead: '动力' },
  cloth: { name: '服装厂', m: 0.6, mFrom: 'port', sea: true, pr: 0.6, e: 0.5, l: 7, t: 0, water: false, air: false, land: false, tall: false, lead: '劳动力' },
  chip: { name: '集成电路厂', m: 0.3, mFrom: 'port', sea: true, pr: 0.2, e: 1.5, l: 1, t: 8, water: false, air: false, land: false, tall: false, clean: true, lead: '技术' },
  petro: { name: '石油化工厂', m: 6, mFrom: 'port', sea: true, pr: 3, e: 0.6, l: 1, t: 1, water: true, air: true, land: true, tall: true, needWater: true, lead: '交通（港口）、水源，还要远离城市、水源地、机场' },
};
/** 某处建某种工厂：各项成本（示意）和影响 */
export function evaluate(kind, p) {
  const I = INDUSTRIES[kind], P = PLACES, c = {};
  const src = P[I.mFrom], dSrc = dist(p, src);
  c['原料运输'] = I.m * (I.perish || 1) * dSrc * (I.sea ? 0.6 : 1) * 10;          // 进口原料先海运到港口，从港口再往里运（陆运）
  c['产品运输'] = I.pr * (I.prPerish || 1) * dist(p, P.city) * 10;
  c['动力'] = I.e * (0.4 + dist(p, P.hydro) * 6);          // 离水电站越近，电越便宜（示意）
  const labor = dist(p, P.county) < 0.03 ? 1 : dist(p, P.city) < 0.04 ? 3 : 2;          // 县城劳动力便宜、城市贵
  c['劳动力'] = I.l * labor * 0.6;
  c['技术'] = I.t * dist(p, P.univ) * 6;
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const fx = [];
  const r = nearRiver(p), upstreamOfIntake = r.d < 0.02 && r.i < 6.0;          // 河在水源地（第 6 段）上游
  if (I.water && upstreamOfIntake) fx.push({ k: 'water', at: 'intake', text: '污水顺河流到城市水源地' });
  if (I.water && dist(p, P.fishery) < 0.06 && p.x > 0.09) fx.push({ k: 'fish', at: 'fishery', text: '污水排进渔场' });
  if (I.air) { const vx = P.city.x - p.x, vn = P.city.n - p.n, d = Math.hypot(vx, vn), along = (vx * WIND[0] + vn * WIND[1]) / (d || 1); if (d < 0.09 && along > 0.5) fx.push({ k: 'air', at: 'city', text: '烟顺着盛行风吹进城里' }); }
  if (I.land && isFarm(p)) fx.push({ k: 'farm', at: 'here', text: '占用大片农田' });
  if (I.tall && dist(p, P.airport) < 0.04) fx.push({ k: 'air2', at: 'airport', text: '高大设备、上升热气流影响飞机起降' });
  if (I.needWater && r.d > 0.03 && p.x < coastX(p.n) - 0.03) fx.push({ k: 'nowater', at: 'here', text: '用水量大，这里离河、离海都远' });
  if (I.clean && dist(p, P.county) > 0.2) fx.push({ k: 'x', at: 'here', text: '' });
  if (isMountain(p)) fx.push({ k: 'mount', at: 'here', text: '山区建厂、运输都难' }), (c['原料运输'] *= 1.4, c['产品运输'] *= 1.4);
  return { cost: c, total: Object.values(c).reduce((a, b) => a + b, 0), fx: fx.filter((f) => f.text) };
}
/** 全区总成本最低的地方（只在陆地上找，示意） */
export function cheapest(kind) { let best = null; for (let x = XL + 0.01; x < XR; x += 0.004) for (let n = NL + 0.01; n < NR; n += 0.004) { const p = { x, n }; if (isSea(p)) continue; const e = evaluate(kind, p); if (!best || e.total < best.total) best = { ...p, total: e.total }; } return best; }
