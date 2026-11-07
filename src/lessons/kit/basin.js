// 黄河调沙减淤的教学数据（活页 basin.js 和核对脚本共用）。课本选必2 第 61–64 页，图 4.5、图 4.7、图 4.9。
// 一条真实的时间线：1956 年 → 2016 年。课本图 4.7 给了三个时段、四个水文站的实测年均输沙量（亿吨），这是画面里泥沙多少的唯一依据。
// 下游河床、大堤高出开封城里地面多少，只用课本的“锚”：图 4.5 河床高出两岸地面 7 米以上；2009—2015 年 9.66 亿吨淤沙入海、“地上河”没有再长高。
// 其余高度、三角洲的伸缩都是示意，只表示方向。注意：输沙量减少还和降水、上游水库、引水用水等有关，不全是治理的作用。
export const STATIONS = ['头道拐', '龙门', '小浪底', '利津'];
export const ERAS = [
  { key: 'pre', name: '治理前', span: '1956—1986 年', from: 1956, to: 1986, load: [1.41, 9.14, 13.33, 9.78] },
  { key: 'soil', name: '水土保持见效', span: '1987—2005 年', from: 1987, to: 2005, load: [0.39, 4.33, 5.46, 3.33] },
  { key: 'flush', name: '小浪底调水调沙', span: '2006—2016 年', from: 2006, to: 2016, load: [0.49, 1.04, 0.55, 1.02] },
];
export const Y0 = 1956, Y1 = 2016;
export const EVENTS = {
  diversion: 1976,          // 1976 年黄河入海流路人工改走清水沟（原刁口河流路一带此后不再有泥沙补给）
  damFill: 1999,          // 小浪底水库 1999 年 10 月下闸蓄水
  firstFlush: 2002,          // 2002 年首次调水调沙试验
  scourFrom: 2009, scourTo: 2015, scoured: 9.66,          // 课本：小浪底工程从 2009 年竣工到 2015 年，累计将下游河道中 9.66 亿吨淤沙送入大海
};
export const eraOf = (y) => ERAS.find((e) => y <= e.to + 0.999) ?? ERAS[ERAS.length - 1];
/** y 年的年均输沙量（按所在时段取图 4.7 的值，不在时段之间插值） */
export const loadAt = (y, station) => eraOf(y).load[STATIONS.indexOf(station)];
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
/** 下游河床高出开封城里地面多少米（示意）：治理前一路淤高，1986 年前后到 7 米以上（课本图 4.5）；水土保持以后淤得慢了；调水调沙以后主槽冲深，不再长高，但仍高出两岸 */
export function bedAt(y) {
  if (y <= 1986) return lerp(5.2, 7.4, (y - 1956) / 30);
  if (y <= 2001) return lerp(7.4, 8.0, (y - 1986) / 15);
  return lerp(8.0, 7.4, (y - 2001) / 14);
}
/** 假如一直不治理（示意）：照治理前的速度继续淤高 */
export const bedCounter = (y) => 5.2 + (2.2 / 30) * (y - 1956);
/** 大堤高出地面多少米（示意）：河床长高，大堤跟着一次次加高 */
export const leveeAt = (y) => 10 + (y >= 1964 ? 1.5 : 0) + (y >= 1976 ? 1.5 : 0) + (y >= 1986 ? 1.5 : 0);
/** 三角洲（示意）：老河口（1976 年以前的入海口）和新河口（1976 年以后）各向海里伸出多少（0—1）。伸出的快慢按利津站入海泥沙多少；没有泥沙补给的岸段被海浪侵蚀后退 */
export function delta(y) {
  let oldL = 0.2, newL = 0;
  for (let t = Y0; t < y; t += 0.25) {
    const sea = loadAt(t, '利津'), grow = Math.max(0, sea - 0.9) * 0.003, erode = 0.008;          // 入海泥沙少于约 0.9 亿吨时不再往外长（示意）
    if (t < EVENTS.diversion) oldL += grow * 0.25; else { oldL = Math.max(0.05, oldL - erode * 0.25); newL += grow * 0.25; }
  }
  return { old: Math.min(1, oldL), new: Math.min(1, newL), active: y < EVENTS.diversion ? 'old' : 'new' };
}
