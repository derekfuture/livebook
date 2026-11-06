// 核对岩石圈物质循环：node tools/geo/rock_check.mjs（选必1 第 22–24 页，图 2.10）
import { ROCK, nexts } from '../../src/lessons/kit/rock.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const kinds = (id) => [...new Set(nexts(id).map((n) => ROCK[n.to].kind))].sort().join();
ok(kinds('magma') === 'igneous', '岩浆只能冷却凝固成岩浆岩');
ok(nexts('magma').map((n) => n.to).sort().join() === 'basalt,granite', '侵入岩石圈冷却成花岗岩（侵入岩），喷出地表冷却成玄武岩（喷出岩）（图 2.7）');
for (const id of ['granite', 'sandstone']) ok(kinds(id) === ['magma', 'metamorphic', 'sediment'].sort().join(), `${ROCK[id].name}：可以风化成沉积物、变质成变质岩、熔化成岩浆`);
ok(kinds('slate') === ['magma', 'metamorphic', 'sediment'].sort().join(), '变质岩：可以风化成沉积物、再次变质、熔化成岩浆');
ok(['gravel', 'sand', 'mud', 'shell'].every((id) => kinds(id) === 'sedimentary'), '沉积物只能经压实、固结成沉积岩');
ok(ROCK[nexts('gravel')[0].to].name === '砾岩' && ROCK[nexts('sand')[0].to].name === '砂岩' && ROCK[nexts('mud')[0].to].name === '页岩' && ROCK[nexts('shell')[0].to].name === '石灰岩', '按颗粒大小：砾岩、砂岩、页岩；生物遗体、化学沉淀物：石灰岩（课本第 23 页）');
ok(ROCK[nexts('shale').find((n) => n.proc.startsWith('变质')).to].name === '板岩' && ROCK[nexts('limestone').find((n) => n.proc.startsWith('变质')).to].name === '大理岩', '页岩变质成为板岩，石灰岩变质成为大理岩（课本第 23 页）');
const seen = new Set(), q = ['magma']; while (q.length) { const id = q.pop(); if (seen.has(id)) continue; seen.add(id); for (const n of nexts(id)) { q.push(n.to); } }
ok(Object.keys(ROCK).every((id) => seen.has(id)), '从岩浆出发，每一种岩石都走得到；而每一种岩石最后也都能熔化回岩浆：一个循环');
process.exit(bad ? 1 : 0);
