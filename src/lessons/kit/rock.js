// 岩石圈物质循环的教学模型（纯数据，活页 rockcycle.js 和核对脚本共用）。课本选必1 第 22–24 页，图 2.7 岩浆岩、图 2.8 沉积岩、图 2.9 变质岩、图 2.10 岩石圈物质循环示意。
// 跟着一块岩石走：它现在是哪一类、在哪；下一步能发生哪些作用（只有课本图 2.10 里有的箭头）。
// 变质岩的名字：页岩→板岩、石灰岩→大理岩是课本举的例子；花岗岩→片麻岩、砂岩→石英岩、砾岩→变质砾岩是常见的对应，课本没讲；玄武岩变质的产物随条件变，不写具体名字。
// 岩浆冷却：侵入岩、喷出岩，花岗岩、玄武岩只是例子——具体岩种还取决于岩浆的成分。
export const KIND = { magma: '岩浆', igneous: '岩浆岩', sediment: '沉积物', sedimentary: '沉积岩', metamorphic: '变质岩' };
export const ROCK = {
  magma: { kind: 'magma', name: '岩浆', at: 'chamber' },
  granite: { kind: 'igneous', name: '侵入岩（以花岗岩为例）', sub: '具体是哪种岩石，还取决于岩浆的成分', at: 'intrusion' },
  basalt: { kind: 'igneous', name: '喷出岩（以玄武岩为例）', sub: '具体是哪种岩石，还取决于岩浆的成分', at: 'lava' },
  gravel: { kind: 'sediment', name: '砾石', at: 'shore' }, sand: { kind: 'sediment', name: '石英砂', at: 'shallow' }, mud: { kind: 'sediment', name: '泥土', at: 'deep' }, shell: { kind: 'sediment', name: '碳酸钙质的生物遗体、化学沉淀物', at: 'deep' },
  conglomerate: { kind: 'sedimentary', name: '砾岩', at: 'buried' }, sandstone: { kind: 'sedimentary', name: '石英砂岩', at: 'buried' }, shale: { kind: 'sedimentary', name: '页岩', at: 'buried' }, limestone: { kind: 'sedimentary', name: '石灰岩', at: 'buried' },
  slate: { kind: 'metamorphic', name: '板岩', at: 'meta', book: true }, marble: { kind: 'metamorphic', name: '大理岩', at: 'meta', book: true }, gneiss: { kind: 'metamorphic', name: '片麻岩', at: 'meta' }, metabas: { kind: 'metamorphic', name: '变质岩（具体是哪种，取决于变质的温度、压力）', at: 'meta' }, quartzite: { kind: 'metamorphic', name: '石英岩', at: 'meta' }, metacong: { kind: 'metamorphic', name: '变质砾岩', at: 'meta' },
};
// 石英砂岩→石英岩限定为石英质实例；碳酸盐碎屑不因粒径变化而变成硅质。
// 参考：Physical Geology 7.2，https://opentextbc.ca/geology/chapter/7-2-classification-of-metamorphic-rocks/
const META = { shale: 'slate', limestone: 'marble', granite: 'gneiss', basalt: 'metabas', sandstone: 'quartzite', conglomerate: 'metacong', lithsandstone: 'metabas' };
const LITH = { gravel: 'conglomerate', sand: 'sandstone', mud: 'shale', shell: 'limestone', lithsand: 'lithsandstone', carbgravel: 'limestone', carbsand: 'limestone', carbmud: 'limestone' };
ROCK.lithsand = { kind: 'sediment', name: '砂级岩屑（非石英砂）', at: 'shallow', grain: 'sand' };
ROCK.lithsandstone = { kind: 'sedimentary', name: '岩屑砂岩（非石英砂岩）', at: 'buried' };
for (const [id, grain, name, at] of [['carbgravel', 'gravel', '砾级碳酸盐碎屑', 'shore'], ['carbsand', 'sand', '砂级碳酸盐碎屑', 'shallow'], ['carbmud', 'mud', '泥级碳酸盐碎屑', 'deep']]) ROCK[id] = { kind: 'sediment', name, at, grain };
for (const [id, r] of Object.entries(ROCK)) {
  r.composition = ['limestone', 'marble', 'shell', 'carbgravel', 'carbsand', 'carbmud'].includes(id) ? 'carbonate' : ['sand', 'sandstone', 'quartzite'].includes(id) ? 'quartz' : 'silicate';
  if (r.kind === 'sediment') r.grain ||= id;
}
for (const [id, r] of Object.entries(ROCK)) if (r.kind === 'metamorphic') ROCK[id + '_further'] = { ...r, name: '进一步变质的岩石', sub: '具体岩种取决于原岩成分及温度、压力等条件', origin: id };
/** 只认可连续的花岗岩风化取出石英砂、再固结的具体转换边。 */
export const provenGraniteSand = (path) => path.some((p, i) => p.id === 'granite' && path[i + 1]?.id === 'sand' && path[i + 1]?.proc.startsWith('抬升') && path[i + 2]?.id === 'sandstone' && path[i + 2]?.proc.startsWith('压实'));
/** 这块岩石下一步能经历的作用（课本图 2.10 的箭头）：[{ proc, to, why }] */
export function nexts(id) {
  const r = ROCK[id], out = [], source = r.origin || id;
  if (r.kind === 'magma') out.push({ proc: '冷却凝固（在岩石圈里）', to: 'granite', why: '以富硅岩浆侵入后慢慢冷却形成花岗岩为例；不是任意岩浆都能形成花岗岩' }, { proc: '冷却凝固（喷出地表）', to: 'basalt', why: '以玄武质岩浆喷出后冷却形成玄武岩为例；不是任意岩浆都能形成玄武岩' });
  if (['igneous', 'sedimentary', 'metamorphic'].includes(r.kind)) {
    const grains = r.composition === 'carbonate' ? ['carbgravel', 'carbsand', 'carbmud'] : r.composition === 'quartz' ? ['sand'] : ['gravel', ['granite', 'gneiss'].includes(source) ? 'sand' : 'lithsand', 'mud'];
    for (const to of grains) out.push({ proc: `抬升、风化、侵蚀、搬运和沉积（${ROCK[to].name}）`, to, why: to === 'sand' ? '跟踪原岩中的石英组分：经风化、搬运和分选，形成以石英为主的砂；不是整块岩石的所有成分都变成石英' : '岩石抬升后风化、侵蚀成碎屑，搬运并沉积；粒径变化不等于物质成分改变，碳酸盐碎屑仍沿碳酸盐路径' });
    if (r.composition === 'carbonate' || source === 'basalt' || source === 'metabas') out.push({ proc: '抬升、风化、侵蚀、搬运和沉积（溶解钙质形成碳酸盐沉积）', to: 'shell', why: '只跟踪风化溶液中的钙质，进入水体后在适当条件下参与碳酸钙沉淀或生物成壳；不是原岩全部物质都变成碳酸钙' });
    if (r.kind !== 'metamorphic') out.push({ proc: '变质作用（未熔融）', to: META[id], why: '在适当温度、压力等条件下，岩石主要在固态发生矿物组合和结构变化，尚未熔融' });
    else out.push({ proc: '变质作用（再一次，未熔融）', to: source + '_further', why: '继续在固态发生变质，具体岩种取决于原岩成分和条件，不能认定仍保留原岩名' });
    out.push({ proc: '熔化', to: 'magma', why: '在适当温度、压力和挥发分条件下越过固相线，发生部分熔融形成岩浆；减压或加入水等挥发分可促熔，升压本身通常不是促熔机制。此处回到岩浆类别，未追踪熔体成分，后续凝固需另选相应成分的实例' });
  }
  if (r.kind === 'sediment') out.push({ proc: '压实、固结', to: LITH[id], why: r.composition === 'carbonate' ? '碳酸盐沉积物经压实、胶结等成岩作用形成石灰岩，不会因粒径为砂级就变成石英砂岩' : '沉积物经压实、胶结等成岩作用固结；石英砂在此限定为形成石英砂岩的实例' });
  return out;
}
// 固态变质与熔融条件：Physical Geology 3.2，https://opentextbc.ca/geology/chapter/3-2-magma-and-magma-formation/
