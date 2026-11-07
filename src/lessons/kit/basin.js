// 黄河调沙减淤的教学数据（活页 basin.js 和核对脚本共用）。课本选必2 第 61–64 页，图 4.5、图 4.7、图 4.9。
// 时间线 1956 → 2016 年。课本图 4.7 给了三个统计时段、四个水文站的实测年均输沙量（亿吨/年）——这是画面里泥沙多少的唯一定量依据。
// 三个时段只是输沙量的统计时段，不是治理的起止：水土保持 20 世纪 50 年代就开始了（课本第 63 页南小河沟），一直在做。
// 下游河床、大堤的高度只画成示意（没有可靠的逐年断面数据，不标米数）；三角洲的伸缩只表示方向。
// 输沙量减少还和降水、上游水库、引水用水等有关，不全是治理的作用。
export const STATIONS = ['头道拐', '龙门', '小浪底', '利津'];
export const ERAS = [
  { key: 'a', span: '1956—1986 年', from: 1956, to: 1986, load: [1.41, 9.14, 13.33, 9.78] },
  { key: 'b', span: '1987—2005 年', from: 1987, to: 2005, load: [0.39, 4.33, 5.46, 3.33] },
  { key: 'c', span: '2006—2016 年', from: 2006, to: 2016, load: [0.49, 1.04, 0.55, 1.02] },
];
export const Y0 = 1956, Y1 = 2016;
// 事件（课本外的年份已核对，出处见注释）
export const EVENTS = {
  damFill: 1999,          // 小浪底水库 1999 年 10 月下闸蓄水（中国水利网）；主体工程 2001 年底完工，2009 年通过国家竣工验收（课本写“2009 年竣工”）
  firstFlush: 2002, lastFlush: 2015,          // 2002 年首次调水调沙试验；此后到 2015 年汛前基本每年进行；2016 年没有进行（《地理学报》相关实测研究）
  scourFrom: 2009, scourTo: 2015, scoured: 9.66,          // 课本：2009 年到 2015 年，累计将下游河道中 9.66 亿吨淤沙送入大海
};
// 入海流路（中国科学院烟台海岸带研究所资料）：神仙沟 → 1964 年改走刁口河 → 1976 年改走清水沟 → 1996 年清 8 汊改道向东北入海
export const MOUTHS = [
  { key: 'sxg', name: '神仙沟', from: 1953, to: 1964, z: -0.02 },
  { key: 'dkh', name: '刁口河', from: 1964, to: 1976, z: -0.062 },
  { key: 'qsg', name: '清水沟', from: 1976, to: 1996, z: 0.05 },
  { key: 'q8', name: '清 8 汊', from: 1996, to: 9999, z: 0.022 },
];
export const eraOf = (y) => ERAS.find((e) => y <= e.to + 0.999) ?? ERAS[ERAS.length - 1];
/** y 年所在统计时段的年均输沙量（不在时段之间插值） */
export const loadAt = (y, station) => eraOf(y).load[STATIONS.indexOf(station)];
export const mouthAt = (y) => MOUTHS.find((m) => y >= m.from && y < m.to) ?? MOUTHS[0];
export const flushYear = (y) => Math.floor(y) >= EVENTS.firstFlush && Math.floor(y) <= EVENTS.lastFlush;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 下游河床高出城外地面（示意，0—1 的相对量）：治理前淤得快，后来淤得慢，调水调沙以后主槽冲深、不再抬高，但始终高出两岸 */
export const bedRel = (y) => 0.55 + 0.35 * sm(1956, 1999, y) - 0.1 * sm(2002, 2015, y);
/** 水土保持的范围（0—1，示意）：50 年代就开始，逐步扩大 */
export const soilRel = (y) => 0.15 + 0.85 * sm(1956, 2010, y);
/** 三角洲各个河口的叶瓣往海里伸出多少（0—1，只示意方向，不按输沙量算历史速度）。
 * 主流入海的河口一般向海淤长，失去主流水沙补给的老河口被海浪侵蚀后退；清 8 汊河口 1996—2002 年一度后退，调水调沙以后又向海淤长
 * （Wu et al., 2021, Water Resources Research, doi:10.1029/2021WR029581）。 */
export function delta(y) {
  const L = { sxg: 0.3, dkh: 0, qsg: 0, q8: 0 };
  for (let t = Y0; t < y; t += 0.25) {
    const act = mouthAt(t).key;
    for (const k in L) {
      if (k !== act) { L[k] = Math.max(0, L[k] - 0.006 * 0.25 * (L[k] > 0.05 ? 1 : 0)); continue; }
      const rate = k === 'q8' ? (t < 2002 ? -0.004 : 0.012) : 0.025;          // 主流河口淤长（示意）；清 8 汊 1996—2002 年一度后退、2002 年以后淤长
      L[k] = Math.min(1, Math.max(0, L[k] + rate * 0.25));          // 清 8 汊刚改道时就在清水沟叶瓣的侧翼，岸线由清水沟叶瓣决定；那几年那里随清水沟叶瓣一起后退
    }
  }
  return L;
}
/** 大堤高出地面（示意，0—1 同河床的尺度）：河床淤高时跟着加高；河床冲深时大堤不跟着变低 */
/** 岸线伸出多少（和活页画法一致：各叶瓣叠加） */
export const shoreAt = (z, L) => MOUTHS.reduce((a, m) => a + 0.075 * L[m.key] * Math.exp(-(((z - m.z) / 0.024) ** 2)), 0);
export const leveeRel = (y) => bedRel(Math.min(y, 2002));
