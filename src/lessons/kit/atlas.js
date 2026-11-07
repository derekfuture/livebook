// 地球目录：每张地理活页在地球上的位置（活页 atlas.js 用）。
// 三种：place 是课本自己举的例子发生的地方（插旗）；layer 是整个地球的事（地球运动、大气环流、洋流、板块），在地球上叠一层；idea 是不分地方的原理模型。
// 插旗的地点只用课本正文、图里出现过的例子（页码是 PDF 页），坐标取到小数点后一两位，只用来在地球上找到那一带。side：名字写在旗的东边（1）还是西边（−1）；up：往北挪多少（避开挨着的名字）。
export const ANCHORS = {
  // ---- 选择性必修1 ----
  earthsun: { kind: 'layer', layer: 'sun', note: '整个地球：昼夜和四季' },
  rockcycle: { kind: 'idea', note: '原理：不在某一个地方' },
  plates: { kind: 'layer', layer: 'plates', note: '整个地球：六大板块和板块边界' },
  fold: { kind: 'idea', note: '原理：不在某一个地方' },
  fault: { kind: 'place', note: '课本的例子：华山（断块山）、渭河平原', pins: [{ lat: 34.48, lon: 110.08, name: '华山—渭河平原', side: -1, up: 0.004 }] },          // 选必1 PDF 第 33 页
  river: { kind: 'idea', note: '原理：不在某一个地方' },
  front: { kind: 'place', note: '课本的例子：江淮准静止锋带来的梅雨', pins: [{ lat: 30.9, lon: 116.8, name: '江淮：梅雨', side: -1, up: -0.001 }] },          // 选必1 PDF 第 49 页
  belts: { kind: 'layer', layer: 'belts', note: '整个地球：七个气压带、六个风带（未考虑海陆）' },
  monsoon: { kind: 'place', note: '课本的例子：东亚季风', pins: [{ lat: 33, lon: 124.5, name: '东亚季风', side: 1, up: -0.002 }] },          // 选必1 PDF 第 57 页图 3.14
  current: { kind: 'layer', layer: 'current', note: '整个地球：世界洋流；课本的例子：拉布拉多寒流、北大西洋暖流' },          // 选必1 PDF 第 76 页
  enso: { kind: 'place', note: '课本的例子：秘鲁沿岸、印度尼西亚一带', pins: [{ lat: -9, lon: -80.5, name: '秘鲁沿岸', side: -1 }] },          // 选必1 PDF 第 75、79 页
  zonation: { kind: 'place', note: '课本的例子：喜马拉雅山脉、长白山', pins: [{ lat: 27.99, lon: 86.93, name: '喜马拉雅山脉', side: -1, up: 0.003 }, { lat: 42.0, lon: 128.06, name: '长白山', side: 1, up: 0.004 }] },
  cyclone: { kind: 'place', note: '课本的例子：2016 年台风“莫兰蒂”在厦门登陆', pins: [{ lat: 24.48, lon: 118.09, name: '厦门：台风“莫兰蒂”登陆', side: -1, up: -0.004 }] },          // 选必1 PDF 第 47 页图 3.1
  // ---- 必修第一册 ----
  karst: { kind: 'place', note: '课本的例子：广西、贵州、云南', pins: [{ lat: 25.27, lon: 110.29, name: '广西桂林一带', side: -1 }] },
  water: { kind: 'idea', note: '原理：不在某一个地方' },
  tide: { kind: 'place', note: '课本的例子：福建霞浦紫菜养殖、浙江温岭江厦潮汐电站', pins: [{ lat: 26.88, lon: 120.0, name: '福建霞浦', side: 1, up: -0.004 }, { lat: 28.4, lon: 121.2, name: '浙江温岭江厦', side: 1, up: 0.003 }] },
  heat: { kind: 'layer', layer: 'sun', note: '整个地球：大气的受热过程' },
  thermal: { kind: 'place', note: '课本的例子：台湾海峡两岸的风', pins: [{ lat: 24.5, lon: 119.6, name: '台湾海峡', side: 1, up: -0.002 }] },
  // ---- 必修第二册 ----
  urban: { kind: 'idea', note: '原理：不在某一个地方' },
  industry: { kind: 'idea', note: '原理：不在某一个地方' },
  // ---- 选择性必修2 ----
  basin: { kind: 'place', note: '课本的例子：黄河下游、小浪底、黄河三角洲', pins: [{ lat: 34.8, lon: 114.3, name: '黄河下游（开封）', side: -1 }, { lat: 37.75, lon: 119.1, name: '黄河三角洲', side: 1, up: 0.003 }] },
};
/** 章的颜色：同一章的活页一个颜色，地球上一眼看出哪些旗属于哪一章 */
export const CHAPTER_COLORS = ['#3d6fb4', '#a0603a', '#3c8fb0', '#2f8a7a', '#5e8a3a', '#8a5aa0', '#b0723a'];
/** 从“第二章第二节 构造地貌的形成”里取出第几章（1 起） */
export const chapterOf = (sec = '') => { const m = /第([一二三四五六七八九十]+)章/.exec(sec); if (!m) return 0; const n = '一二三四五六七八九十'.indexOf(m[1]) + 1; return n || 0; };
