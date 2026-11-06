// 岩石圈物质循环的教学模型（纯数据，活页 rockcycle.js 和核对脚本共用）。课本选必1 第 22–24 页，图 2.7 岩浆岩、图 2.8 沉积岩、图 2.9 变质岩、图 2.10 岩石圈物质循环示意。
// 跟着一块岩石走：它现在是哪一类、在哪；下一步能发生哪些作用（只有课本图 2.10 里有的箭头）。
// 变质岩的名字：页岩→板岩、石灰岩→大理岩是课本举的例子；花岗岩→片麻岩、砂岩→石英岩、砾岩→变质砾岩是常见的对应，课本没讲。
export const KIND = { magma: '岩浆', igneous: '岩浆岩', sediment: '沉积物', sedimentary: '沉积岩', metamorphic: '变质岩' };
export const ROCK = {
  magma: { kind: 'magma', name: '岩浆', at: 'chamber' },
  granite: { kind: 'igneous', name: '花岗岩', sub: '侵入岩', at: 'intrusion' },
  basalt: { kind: 'igneous', name: '玄武岩', sub: '喷出岩（火山岩）', at: 'lava' },
  gravel: { kind: 'sediment', name: '砾石', at: 'shore' }, sand: { kind: 'sediment', name: '沙子', at: 'shallow' }, mud: { kind: 'sediment', name: '泥土', at: 'deep' }, shell: { kind: 'sediment', name: '生物遗体、化学沉淀物', at: 'deep' },
  conglomerate: { kind: 'sedimentary', name: '砾岩', at: 'buried' }, sandstone: { kind: 'sedimentary', name: '砂岩', at: 'buried' }, shale: { kind: 'sedimentary', name: '页岩', at: 'buried' }, limestone: { kind: 'sedimentary', name: '石灰岩', at: 'buried' },
  slate: { kind: 'metamorphic', name: '板岩', at: 'meta', book: true }, marble: { kind: 'metamorphic', name: '大理岩', at: 'meta', book: true }, gneiss: { kind: 'metamorphic', name: '片麻岩', at: 'meta' }, quartzite: { kind: 'metamorphic', name: '石英岩', at: 'meta' }, metacong: { kind: 'metamorphic', name: '变质砾岩', at: 'meta' },
};
const META = { shale: 'slate', limestone: 'marble', granite: 'gneiss', basalt: 'gneiss', sandstone: 'quartzite', conglomerate: 'metacong' };          // 玄武岩变质的产物有好几种，这里笼统归成片麻岩一类（示意）
const LITH = { gravel: 'conglomerate', sand: 'sandstone', mud: 'shale', shell: 'limestone' };
/** 这块岩石下一步能经历的作用（课本图 2.10 的箭头）：[{ proc, to, why }] */
export function nexts(id) {
  const r = ROCK[id], out = [];
  if (r.kind === 'magma') out.push({ proc: '冷却凝固（在岩石圈里）', to: 'granite', why: '岩浆侵入岩石圈上部，慢慢冷却凝固' }, { proc: '冷却凝固（喷出地表）', to: 'basalt', why: '岩浆喷出地表，冷却凝固' });
  if (['igneous', 'sedimentary', 'metamorphic'].includes(r.kind)) {
    for (const [to, w] of [['gravel', '搬运得近，颗粒粗'], ['sand', '搬运得远一些'], ['mud', '搬运到更远、更静的水里']]) out.push({ proc: `抬升、风化、侵蚀、搬运和沉积（${w}）`, to, why: '被抬升到地表，风化、侵蚀成碎屑，被流水搬运后沉积下来' });
    out.push({ proc: '抬升、风化、侵蚀、搬运和沉积（溶进水里，在海里化学沉淀或被生物利用）', to: 'shell', why: '风化溶解的物质被带进海里，化学沉淀下来，或成了贝壳、珊瑚，生物遗体堆积起来' });
    if (r.kind !== 'metamorphic') out.push({ proc: '变质作用（高温、高压）', to: META[id], why: '在地球内部的高温、高压下，成分、性质发生改变' });
    else out.push({ proc: '变质作用（再一次）', to: id, why: '变质岩也可以再次变质（课本图 2.10 里变质岩自己的那个箭头）' });
    out.push({ proc: '熔化', to: 'magma', why: '在岩石圈深处或以下的高温高压下熔化，又成为岩浆' });
  }
  if (r.kind === 'sediment') out.push({ proc: '压实、固结', to: LITH[id], why: '一层层沉积物被压实、固结' });
  return out;
}
