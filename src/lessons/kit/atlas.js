// 地球主探索：每张地理活页从地球的哪里进去（src/live/World.js 用）。
// 三种进法：
//   place：课本自己举的例子发生在哪里，就在哪里插旗；点旗，活页从地球上这一点长出来。旗只插在活页里真的讲到的地方
//          （点长白山，进去就是长白山）；进去以后是教学示意的，enter 写明课本的例子是什么、下面的模型是什么，不冒充真实地形。
//          pin.place：带进活页的地方（活页的 goPlace(name) 收）；pin.line：沿一条线切开的（赤道太平洋），在地球上画出这条线。
//   globe：活页本身就是一颗地球（昼夜、板块、气压带）：这颗地球直接落下去变成活页里的那颗；layer 是在地球目录里指着它时叠的那一层。
//          plain：活页里的地球不画海陆（气压带：先假设地表均匀），落下去时海陆淡掉。
//   idea：不在某一个地方的原理（岩石圈物质循环、褶皱、河谷、水循环、城市……）：照旧从课本的图里升起来，地球退到角上。
//   inplace：整颗地球的主题就在书后上方那颗地球上看（板块）：不落成另一颗，边界一直开着，切片从它身上拉出来落到书上。chip：地球旁“看法”按钮上的字。
//   page / sub：子情境对应的书页（PDF 页序）。pin.page：从这面旗进来翻到哪一页；sub[where]：活页里换到这个情境时书跟着翻到哪一页；figText：那时面板上写的图号和页码。
// 坐标取到小数点后一两位，只用来在地球上找到那一带。side：名字写在旗的东边（1）还是西边（−1）；up：往北挪多少（避开挨着的名字）。
export const ANCHORS = {
  // ---- 选择性必修1 ----
  earthsun: { kind: 'globe', layer: 'sun', chip: '昼夜', note: '整个地球：昼夜长短和正午太阳高度' },
  rockcycle: { kind: 'idea' },
  plates: { kind: 'globe', layer: 'plates', inplace: true, chip: '板块', note: '整个地球：板块和板块边界' },
  fold: { kind: 'idea' },
  fault: {
    kind: 'place', pins: [{ lat: 34.48, lon: 110.08, name: '华山—渭河平原', side: -1, up: 0.004 }],          // 选必1 第 28 页：华山（断块山）、渭河平原（地堑）
    enter: '课本的例子：华山（断块山）和渭河平原。下面的岩块是教学示意，不是这里的真实地形。',
  },
  river: { kind: 'idea' },
  front: {
    kind: 'place', pins: [{ lat: 25.8, lon: 104.2, name: '昆明准静止锋', side: -1, place: 'still', page: 48, figText: '课本第 44 页 · 昆明准静止锋' }], sub: { still: { page: 48, figText: '课本第 44 页 · 昆明准静止锋' } },          // 选必1 第 44 页：昆明准静止锋，贵阳阴雨、昆明晴
    enter: '课本的例子：南下的冷空气遇云贵高原上的山脉阻挡，锋面在昆明和贵阳之间停滞，形成昆明准静止锋，给贵阳等地带来持续的阴雨。下面是教学示意的地块：你家在冷空气一侧，像贵阳；邻城在山那边，像昆明。',
  },
  belts: { kind: 'globe', layer: 'belts', chip: '气压带', plain: 0x86b4d4, note: '整个地球：气压带和风带（先假设地表均匀）' },
  monsoon: {
    kind: 'place', pins: [{ lat: 33, lon: 124.5, name: '东亚季风', side: 1, up: -0.002 }],          // 选必1 第 52 页图 3.14 东亚季风示意
    enter: '课本的例子：东亚季风。下面是理想化的北半球：西边一块大陆、东边一片大洋，不是真实地图。',
  },
  current: { kind: 'idea' },
  enso: {
    kind: 'place', pins: [{ lat: 0, lon: -160, name: '赤道太平洋', side: 1, line: [[0, 120], [0, -80]] }],          // 选必1 第 74—75 页：印度尼西亚一带—秘鲁沿岸
    enter: '课本的例子：秘鲁沿岸、印度尼西亚一带。下面是沿赤道切开的太平洋剖面，海温和环流的位置是示意。',
  },
  zonation: {
    kind: 'place', pins: [{ lat: 27.99, lon: 86.93, name: '喜马拉雅山脉', side: -1, up: 0.003, place: 'hima' }, { lat: 42.0, lon: 128.06, name: '长白山', side: 1, up: 0.004, place: 'cb', extra: '活页补充的对比，课本这一节没有：带谱参考《植物生态学报》2017 年的研究资料' }],          // 选必1 第 89 页图 5.12、活动；长白山不在课本这一节，是活页补充的对比
    enter: '课本的例子：喜马拉雅山脉南北坡（图 5.12）。长白山是活页补充的对比，带谱参考研究资料。下面的山是教学示意。',
  },
  cyclone: {
    kind: 'place', pins: [{ lat: 24.48, lon: 118.09, name: '厦门：台风“莫兰蒂”登陆', side: -1, up: -0.004 }],          // 选必1 第 42 页图 3.1：“莫兰蒂”9 月 15 日在厦门登陆
    enter: '课本的例子：2016 年台风“莫兰蒂”在厦门登陆（台风是一种热带气旋）。下面是虚构地区的教学模型，不是“莫兰蒂”的实况。',
  },
  // ---- 必修第一册 ----
  karst: {
    kind: 'place', pins: [{ lat: 25.27, lon: 110.29, name: '广西桂林一带', side: -1 }],          // 必修第一册 第 66 页：广西、贵州、云南等地
    enter: '课本说：我国的广西、贵州、云南等地喀斯特地貌最为典型。下面三块岩石并排比，是原理对照，不是桂林的真实地形。',
  },
  water: { kind: 'idea' },
  tide: {
    kind: 'place', pins: [{ lat: 26.88, lon: 120.0, name: '福建霞浦：紫菜养殖', side: 1, up: -0.004 }],          // 必修第一册 图 3.22
    enter: '课本图 3.22：福建霞浦的紫菜养殖。下面是一段示意的海岸，潮位数值是示意。',
  },
  heat: { kind: 'idea' },
  thermal: {
    kind: 'place', pins: [{ lat: 24.0, lon: 119.6, name: '台湾海峡', side: 1, up: -0.002, place: 'sea', page: 38, figText: '图2.8 · 课本第 34 页 · 《台海使槎录》' }], sub: { sea: { page: 38, figText: '图2.8 · 课本第 34 页 · 《台海使槎录》' } },          // 必修第一册 第 34 页：《台海使槎录》
    enter: '课本开头的问题：台湾海峡两岸的风。下面是示意的海峡剖面，竖直方向夸大了。',
  },
  // ---- 必修第二册 ----
  urban: { kind: 'idea' },
  industry: {
    kind: 'place', pins: [{ lat: 30.72, lon: 121.35, name: '上海金山卫：石油化工厂选址', side: 1, place: 'petro' }],          // 必修第二册 第 66 页图 3.21：上海某石油化工厂（1972 年）选在金山卫
    enter: '课本的案例：上海某石油化工厂选址，最后定在金山卫（图 3.21）。下面是虚构的区域，各项成本是示意，用来比较各种工厂该建在哪。',
  },
  // ---- 选择性必修2 ----
  basin: {
    kind: 'place', pins: [{ lat: 34.8, lon: 114.3, name: '黄河下游（开封）', side: -1, place: 'main' }, { lat: 37.75, lon: 119.1, name: '黄河入海口', side: 1, up: 0.003, place: 'mouth', page: 68, figText: '图4.9 · 课本第 64 页 · 思考：入海口' }], sub: { mouth: { page: 68, figText: '图4.9 · 课本第 64 页 · 思考：入海口' } },          // 选必2 第 61—64 页；入海口：第 64 页“思考”
    enter: '课本的例子：黄河下游的“地上河”（开封）、小浪底调水调沙；“思考”问到黄河入海口。下面的流域是示意，泥沙按课本图 4.7 的实测年均值。',
  },
};

/** 接着看：同一个地方、同一个问题的下一张活页（只在两张活页确实接得上的时候） */
export const NEXT = {
  plates: [{ id: 'zonation', pin: 0, when: '喜马拉雅山', text: '同一座喜马拉雅，为什么南北坡景观不同？' }],
  zonation: [{ id: 'plates', place: '喜马拉雅山', when: 'hima', text: '这座山是怎么隆起来的？' }],
  front: [{ id: 'cyclone', text: '常见天气系统的另一种：气旋与反气旋' }],
  cyclone: [{ id: 'front', text: '常见天气系统的另一种：锋与天气' }],
  belts: [{ id: 'monsoon', text: '加上海陆分布：季风' }],
  monsoon: [{ id: 'belts', text: '回到理想的气压带和风带' }],
  current: [{ id: 'enso', text: '海—气相互作用：厄尔尼诺和拉尼娜' }],
  enso: [{ id: 'current', text: '回到洋流' }],
  fold: [{ id: 'fault', text: '构造地貌的另一种：断层' }],
  fault: [{ id: 'fold', text: '构造地貌的另一种：褶皱' }],
  heat: [{ id: 'thermal', text: '受热不均以后：热力环流' }],
  thermal: [{ id: 'heat', text: '回到大气的受热过程' }],
};

/** 章的颜色：同一章的活页一个颜色，地球上一眼看出哪些旗属于哪一章 */
export const CHAPTER_COLORS = ['#3d6fb4', '#a0603a', '#3c8fb0', '#2f8a7a', '#5e8a3a', '#8a5aa0', '#b0723a'];
/** 从“第二章第二节 构造地貌的形成”里取出第几章（1 起） */
export const chapterOf = (sec = '') => { const m = /第([一二三四五六七八九十]+)章/.exec(sec); if (!m) return 0; const n = '一二三四五六七八九十'.indexOf(m[1]) + 1; return n || 0; };
