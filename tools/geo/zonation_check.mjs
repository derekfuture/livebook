import { readFileSync } from 'node:fs';
// 核对山地垂直地带性：node tools/geo/zonation_check.mjs（选必1 第 88–89 页，图 5.12）
import { MOUNTAINS, elev, terrainHeight, surfaceBandAt, LAKE_RADIUS, bandAt, bandsBelow, sideOf, KIND, colderBy } from '../../src/lessons/kit/zonation.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const H = MOUNTAINS.hima, nm = (k) => KIND[k].name;
ok(H.south.bands.map((b) => b[0]).join() === 'broad,mixed,conifer,shrub,meadow,desert,snow', `南坡从山麓到山顶：${H.south.bands.map((b) => nm(b[0])).join('、')}（课本图 5.12）`);
ok(H.north.bands.map((b) => b[0]).join() === 'meadowS,desert,snow', `北坡：${H.north.bands.map((b) => nm(b[0])).join('、')}（课本图 5.12）`);
for (const [h, k] of [[2499, 'broad'], [2501, 'mixed'], [3899, 'conifer'], [3901, 'shrub'], [4501, 'meadow'], [4801, 'desert'], [5501, 'snow']]) ok(bandAt('hima', 'south', h) === k, `南坡 ${h} 米是${nm(k)}`);
ok(H.south.shown.join() === '2500,3900,4500,4800,5500', '南坡写出来的界线只用课本图上标了的数字');
ok(Math.abs(elev('hima', -0.25) - 8848.86) < 1 && Math.abs(elev('hima', 1) - 1000) < 1 && Math.abs(elev('hima', -1) - 4300) < 1, '剖面：主峰 8 848.86 米，南坡山麓 1 000 米，北坡山麓（高原）约 4 300 米');
let mono = true; for (let x = -0.25; x < 1; x += 0.01) if (elev('hima', x + 0.01) > elev('hima', x)) mono = false; ok(mono, '南坡从主峰一路往下');
ok(sideOf('hima', 0.5) === 'south' && sideOf('hima', -0.6) === 'north', '主峰南边是南坡，北边是北坡');
ok(bandsBelow('hima', 'south', 8848).length > bandsBelow('hima', 'north', 8848).length, '南坡的带比北坡多（问题 1）');
const mS = H.south.bands.find((b) => b[0] === 'meadow'), mN = H.north.bands.find((b) => b[0] === 'meadowS'); ok(mN[1] < mS[1] && mN[2] - mN[1] > mS[2] - mS[1] && mN[1] === H.north.foot, `高山草甸：南坡 ${mS[1]}–${mS[2]} 米；北坡从山麓（约 ${mN[1]} 米）就是草甸草原，到约 ${mN[2]} 米，下限更低、范围更宽（问题 2）`);
ok(bandsBelow('hima', 'north', 8848, true)[0][0] === 'dry', '假如北坡山麓也低到 1 000 米：多出来的一段标成“要推断”，不替学生预设答案（问题 3）');
let capOk = true; for (const cut of [4500, 6000, 7500]) for (let x = -1; x <= 1; x += 0.01) if (elev('hima', x, { cut }) > cut + 1e-6) capOk = false; ok(capOk, '把山削低：最高处就是选的高度，带谱的统计和画面一致');
ok(bandsBelow('hima', 'south', 3000).length === 2 && bandsBelow('hima', 'south', 8848).length === 7, '把山削到 3 000 米，南坡只剩 2 个带：海拔越高，带谱越完整');
const C = MOUNTAINS.cb; ok(C.north.bands.length === 4 && C.north.foot === 500 && Math.abs(elev('cb', 1) - 500) < 1 && elev('cb', 0.12) > C.lake && elev('cb', 0) < C.lake, '长白山：山麓约 500 米、4 个带；山顶火山口里是天池');
ok(bandsBelow('cb', 'north', 2691).length < bandsBelow('hima', 'south', 8848).length, '长白山纬度高、山又低，带比喜马拉雅南坡少：纬度越低、海拔越高，带谱越完整');
ok(H.south.bands[0][0] === 'broad' && C.north.bands[0][0] === 'cbMixed', '山麓和当地的陆地自然地带一致：喜马拉雅南坡山麓是常绿阔叶林，长白山山麓是针阔叶混交林');
ok(Math.abs(colderBy('hima', 5500) - 27) < 0.01, '从 1 000 米爬到 5 500 米，气温约低 27 ℃（每 100 米约 0.6 ℃）');
for (const cut of [4500, 5500, 6000, 8848.86]) for (const northLow of [false, true]) {
  let valid = true; const seen = { south: new Set(), north: new Set() };
  for (let i = 0; i <= 220; i++) for (let j = 0; j <= 44; j++) {
    const u = -1 + 2 * i / 220, sd = sideOf('hima', u), height = terrainHeight('hima', u, j / 44, { cut, northLow }), kd = bandAt('hima', sd, height, northLow);
    seen[sd].add(kd); if (height > cut || !bandsBelow('hima', sd, cut, northLow).some((b) => b[0] === kd)) valid = false;
  }
  ok(valid && ['south', 'north'].every((sd) => seen[sd].size === bandsBelow('hima', sd, cut, northLow).length), `${cut} 米、低山麓 ${northLow}：完整网格限高、画面分带与统计一致`);
}
ok(bandsBelow('hima', 'north', 4500, true).map((b) => b[0]).join() === 'dry,meadowS', '低北坡削至 4500 米只有草甸草原与待推断段');
const lakeZn = (0.07 - 0.065) / 0.14;
ok(terrainHeight('cb', 0, lakeZn) < C.lake && surfaceBandAt('cb', 0, lakeZn) === null, '复核点 x=0、z=0.065：约 2091 米湖底不标为高山苔原');
ok(surfaceBandAt('cb', 0, 0) === null && surfaceBandAt('cb', LAKE_RADIUS * 0.999, 0) === null, '天池中心与岸线内侧不套用陆生植被标签');
ok(surfaceBandAt('cb', LAKE_RADIUS * 1.001, 0) === 'tundra' && surfaceBandAt('cb', 1, 0) === 'cbMixed', '岸外仍为苔原，低于湖面的外围山麓仍为混交林');
let waterOk = true;
for (let i = 0; i <= 220; i++) for (let j = 0; j <= 44; j++) {
  const u = -1 + 2 * i / 220, zn = j / 44, r = Math.hypot(u, zn * 0.14 / 0.19 * 1.15), wet = r < 0.12 && terrainHeight('cb', u, zn) <= C.lake;
  if ((surfaceBandAt('cb', u, zn) === null) !== wet || surfaceBandAt('hima', u, zn) === null) waterOk = false;
}
ok(waterOk && Math.abs(elev('cb', LAKE_RADIUS) - C.lake) < 1e-8, '完整网格水域判定与地形一致，岸线等于湖面海拔，喜马拉雅不受影响');
ok(['南坡植被类型较多；图示景观带南坡 7 个、北坡 3 个，包含积雪冰川带'].every((t) => readFileSync(new URL('../../src/lessons/zonation.js', import.meta.url), 'utf8').includes(t)), '本轮文字复核：概念或引文图号准确');
process.exit(bad ? 1 : 0);
