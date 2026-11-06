// 核对工业区位活页的模型：node tools/geo/industry_check.mjs（必修第二册第 64–66 页）
// 每种工厂总成本最低的地方，要落在课本说的那种地方附近；污染、用地这些影响要在该出现的地方出现。
import { INDUSTRIES, PLACES, evaluate, cheapest, swing } from '../../src/lessons/kit/industry.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const d = (a, b) => Math.hypot(a.x - b.x, a.n - b.n);
const want = { sugar: ['cane', '原料地（甘蔗田）'], beer: ['city', '市场（大城市）'], alu: ['hydro', '能源（水电站）'], cloth: ['county', '廉价劳动力（县城）'], chip: ['univ', '高校、科技（大学城）'] };
for (const [k, [pl, what]] of Object.entries(want)) { const c = cheapest(k), dd = d(c, PLACES[pl]); ok(dd < 0.035, `${INDUSTRIES[k].name}总成本最低处靠近${what}（相距 ${dd.toFixed(3)}）`); }
const pc = cheapest('petro'); ok(d(pc, PLACES.port) < 0.06, `石油化工厂总成本最低处靠近港口（相距 ${d(pc, PLACES.port).toFixed(3)}）`);
ok(evaluate('petro', PLACES.city).fx.length + evaluate('petro', { x: 0.01, n: 0.036 }).fx.length > 0, '石化厂建在城里、河上游：会出现污染、用地等影响');
ok(evaluate('sugar', { x: 0.0, n: 0.034 }).fx.some((f) => f.k === 'water'), '制糖厂建在水源地上游的河边：污水流到水源地');
ok(!evaluate('chip', PLACES.univ).fx.length, '集成电路厂在大学城：没有污染提醒');
const lead = { sugar: '原料运输', beer: '产品运输', alu: '动力', cloth: '劳动力', chip: '技术' };
for (const [k, f] of Object.entries(lead)) { const r = swing(k), top = Object.entries(r).sort((a, b) => b[1] - a[1])[0][0]; ok(top === f, `${INDUSTRIES[k].name}：地点一变，变化最大的是${top}（应为${f}）`); }
ok(evaluate('petro', PLACES.intake).fx.some((f) => f.k === 'water'), '石化厂建在水源地：报水污染');
process.exit(bad ? 1 : 0);
