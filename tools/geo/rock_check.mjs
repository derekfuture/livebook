import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
// 核对岩石圈物质循环：node tools/geo/rock_check.mjs（选必1 第 22–24 页，图 2.10）
import { ROCK, nexts, provenGraniteSand, TOUR, tourStep, EXTRA, NEW } from '../../src/lessons/kit/rock.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const kinds = (id) => [...new Set(nexts(id).map((n) => ROCK[n.to].kind))].sort().join();
ok(kinds('magma') === 'igneous', '岩浆只能冷却凝固成岩浆岩');
ok(nexts('magma').map((n) => n.to).sort().join() === 'basalt,granite' && ROCK.granite.name.startsWith('侵入岩') && ROCK.basalt.name.startsWith('喷出岩'), '侵入岩石圈冷却成侵入岩（如花岗岩），喷出地表冷却成喷出岩（如玄武岩）（图 2.7）');
ok(!nexts('quartzite').some((n) => n.to === 'shell') && nexts('limestone').some((n) => n.to === 'shell'), '碳酸钙质的沉积物只从含钙多的岩石来：石英岩走不到石灰岩');
for (const id of ['granite', 'sandstone']) ok(kinds(id) === ['magma', 'metamorphic', 'sediment'].sort().join(), `${ROCK[id].name}：可以风化成沉积物、变质成变质岩、熔化成岩浆`);
ok(kinds('slate') === ['magma', 'metamorphic', 'sediment'].sort().join(), '变质岩：可以风化成沉积物、再次变质、熔化成岩浆');
ok(['gravel', 'sand', 'mud', 'shell'].every((id) => kinds(id) === 'sedimentary'), '沉积物只能经压实、固结成沉积岩');
ok(ROCK[nexts('gravel')[0].to].name === '砾岩' && ROCK[nexts('sand')[0].to].name === '石英砂岩' && ROCK[nexts('mud')[0].to].name === '页岩' && ROCK[nexts('shell')[0].to].name === '石灰岩', '按颗粒大小：砾岩、砂岩、页岩；生物遗体、化学沉淀物：石灰岩（课本第 23 页）');
ok(ROCK[nexts('shale').find((n) => n.proc.startsWith('变质')).to].name === '板岩' && ROCK[nexts('limestone').find((n) => n.proc.startsWith('变质')).to].name === '大理岩', '页岩变质成为板岩，石灰岩变质成为大理岩（课本第 23 页）');
const seen = new Set(), q = ['magma']; while (q.length) { const id = q.pop(); if (seen.has(id)) continue; seen.add(id); for (const n of nexts(id)) { q.push(n.to); } }
ok(Object.keys(ROCK).every((id) => seen.has(id)), '从岩浆出发，每一种岩石都走得到；而每一种岩石最后也都能熔化回岩浆：一个循环');
for (const id of Object.keys(ROCK)) {
  const r = ROCK[id];
  ok(!!r.name && !!r.at && !!r.composition && nexts(id).every((n) => ROCK[n.to] && n.proc && n.why), `${id}：名称、位置、成分及转换目标完整`);
  if (r.composition === 'carbonate') ok(nexts(id).filter((n) => n.to !== 'magma').every((n) => ROCK[n.to].composition === 'carbonate'), `${id}：未熔融路径保留碳酸盐成分`);
  if (r.kind === 'sediment') ok(ROCK[nexts(id)[0].to].composition === r.composition && !!r.grain, `${id}：同时记录粒径与成分，固结不改变成分类别`);
  if (r.kind === 'metamorphic') ok(ROCK[nexts(id).find((n) => n.proc.startsWith('变质')).to].name === '进一步变质的岩石', `${id}：再次变质不保证保留原岩名`);
}
ok(!nexts('basalt').some((n) => n.to === 'sand') && nexts('limestone').some((n) => n.to === 'carbsand'), '玄武岩不凭空生成石英砂；石灰岩砂级碎屑走碳酸盐路径');
const path = (ids) => ids.map((id, i) => ({ id, proc: i ? nexts(ids[i - 1]).find((n) => n.to === id)?.proc || '错误路径' : '' }));
ok(provenGraniteSand(path(['magma', 'granite', 'sand', 'sandstone'])), '连续花岗岩→石英砂→石英砂岩可以证明');
ok(!provenGraniteSand(path(['granite', 'magma', 'basalt', 'lithsand', 'lithsandstone'])) && !provenGraniteSand(path(['granite', 'magma', 'basalt', 'sand', 'sandstone'])), '熔融绕行及旧版错误路径不能证明直接风化');
const source = readFileSync(new URL('../../src/lessons/rockcycle.js', import.meta.url), 'utf8');
const visuals = runInNewContext(source.slice(source.indexOf('const XL ='), source.indexOf('export default')).replaceAll('export const', 'const') + '; ({ AT, LOOK })', { ROCK });
for (const id of seen) ok(Number.isFinite(visuals.LOOK[id]?.c) && visuals.AT[ROCK[id].at]?.every(Number.isFinite) && (ROCK[id].kind !== 'sediment' || ['gravel', 'sand', 'mud', 'shell'].includes(visuals.LOOK[id]?.grain)), `${id}：所有可达状态有有效外观、粒径显示及场景位置`);
ok(['岩浆岩（图2.7）', '沉积岩（图2.8）', '变质岩（图2.9）'].every((t) => readFileSync(new URL('../../src/lessons/rockcycle.js', import.meta.url), 'utf8').includes(t)), '本轮文字复核：概念或引文图号准确');
// 自动演示：每一步都是 nexts() 里的箭头；图 2.10 原图的 10 根箭头（含变质岩再次变质）和正文补的 1 根（沉积岩熔化）都走到；最后回到岩浆
{ const K = (id) => ROCK[id].kind, edges = new Set(); let at = 'magma', legal = true; TOUR.forEach((to, i) => { const n = tourStep(at, i); if (!n) legal = false; else { edges.add(`${K(at)}>${K(to)}`); at = to; } });
  ok(legal, `自动演示 ${TOUR.length} 步，每一步都是 nexts() 里的箭头`);
  const FIG = ['magma>igneous', 'igneous>sediment', 'sedimentary>sediment', 'metamorphic>sediment', 'sediment>sedimentary', 'igneous>metamorphic', 'sedimentary>metamorphic', 'metamorphic>metamorphic', 'igneous>magma', 'metamorphic>magma'];
  ok(FIG.length === 10 && FIG.every((e) => edges.has(e)), '原图 10 根箭头都走到（图 2.10：5 根主循环 + 5 根支路，含变质岩自环）');
  ok(EXTRA.length === 1 && EXTRA.every((e) => edges.has(e) && !FIG.includes(e)) && edges.size === 11, '正文补的“沉积岩熔化”单独标出、不算原图箭头');
  ok(NEW[5] && NEW[7] && TOUR[4] === 'magma' && TOUR[6] === 'magma', '熔成岩浆以后换成另一种成分的岩浆凝固时，明确说明“另取一份岩浆”');
  ok(at === 'magma' && TOUR.indexOf('magma') === 4, '先走完一大圈（岩浆→岩浆岩→沉积物→沉积岩→变质岩→岩浆），最后回到岩浆'); }
process.exit(bad ? 1 : 0);
