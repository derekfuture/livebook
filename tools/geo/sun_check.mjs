// 自动核对：高中地理“昼夜长短和正午太阳高度”里显示的数，和课本对得上。node tools/geo/sun_check.mjs
// 课本第 12 页：北京（40°N）夏至正午 73°26′、冬至 26°34′；图 1.15（北纬 40°）日出日落大致时间：夏至 4:30 / 19:30，二分 6:00 / 18:00，冬至 7:30 / 16:30。
import { D2R, decOf, dm, hm, dur, altText, dirName, sunAt, halfDay, noonAlt, snapSeason, noonText, skyJoin } from '../../src/lessons/kit/sun.js';

let bad = 0;
const ok = (name, got, want) => { const pass = got === want; if (!pass) bad++; console.log(`${pass ? '✓' : '✗'} ${name}：${got}${pass ? '' : `（应为 ${want}）`}`); };
const near = (name, got, want, tol, unit = '') => { const pass = Math.abs(got - want) <= tol; if (!pass) bad++; console.log(`${pass ? '✓' : '✗'} ${name}：${got.toFixed(3)}${unit}（课本 ${want}${unit}，允许 ±${tol}）`); };
const BJ = 40 * D2R, summer = decOf(90), winter = decOf(270), eq = decOf(0);
const day = (lat, d) => (2 * halfDay(lat, d) / D2R) / 15;

ok('夏至直射点纬度', dm(summer), '23°26′');
ok('冬至直射点纬度', dm(winter), '23°26′');
ok('二分直射点纬度', dm(eq), '0°');
ok('北京夏至正午太阳高度', dm(noonAlt(BJ, summer)), '73°26′');
ok('北京冬至正午太阳高度', dm(noonAlt(BJ, winter)), '26°34′');
ok('北京二分正午太阳高度', dm(noonAlt(BJ, eq)), '50°');
// 公式和逐时刻算出来的一致：正午那一刻的太阳高度就是 a
ok('正午那一刻（sunAt）＝公式（夏至）', dm(sunAt(BJ, summer, 0).alt), '73°26′');
ok('北京夏至正午太阳方向', dirName(sunAt(BJ, summer, 0).az), '正南');
// 图 1.15 的大致时间（课本标的是大致时间；按公式算差 5 分钟以内）
near('北纬 40° 夏至日出（时）', 12 - day(BJ, summer) / 2, 4.5, 0.1);
near('北纬 40° 夏至日落（时）', 12 + day(BJ, summer) / 2, 19.5, 0.1);
near('北纬 40° 冬至日出（时）', 12 - day(BJ, winter) / 2, 7.5, 0.1);
near('北纬 40° 冬至日落（时）', 12 + day(BJ, winter) / 2, 16.5, 0.1);
ok('二分全球昼长 12 小时（北京）', hm(day(BJ, eq)), '12:00');
ok('二分昼长 12 小时（赤道）', hm(day(0, eq)), '12:00');
ok('夏至日出方向（北京）', dirName(sunAt(BJ, summer, -halfDay(BJ, summer)).az), '东北');
ok('冬至日出方向（北京）', dirName(sunAt(BJ, winter, -halfDay(BJ, winter)).az), '东南');
ok('二分日出方向（北京）', dirName(sunAt(BJ, eq, -halfDay(BJ, eq)).az), '正东');
// 北回归线上夏至正午：太阳在头顶
ok('北回归线夏至正午太阳高度', dm(noonAlt(summer, summer)), '90°');
// 回归线之间：海口（20°N）夏至正午太阳在北边
ok('海口夏至正午太阳方向', dirName(sunAt(20 * D2R, summer, 0).az), '正北');
// 极昼极夜：北极圈（66°34′N）夏至极昼、冬至极夜
const arctic = (90 - 23 - 26 / 60) * D2R;
near('北极圈以北夏至昼长（极昼）', day(arctic + 1e-6, summer), 24, 0, ' 小时');
near('北极圈以北冬至昼长（极夜）', day(arctic + 1e-6, winter), 0, 0, ' 小时');
// 界面上显示的文字也要对：极昼不能写成 0 小时，太阳在地平线下不能写成正的高度（摩尔曼斯克 68.97°N）
{ const M = 68.97 * D2R; const okT = (n, g, w) => { const p = g === w; if (!p) bad++; console.log(`${p ? '✓' : '✗'} ${n}：${g}${p ? '' : `（应为 ${w}）`}`); };
  okT('摩尔曼斯克夏至白天（显示）', dur(day(M, summer)), '24 小时（极昼）');
  okT('摩尔曼斯克冬至白天（显示）', dur(day(M, winter)), '0（极夜）');
  okT('摩尔曼斯克冬至正午太阳高度（显示）', altText(noonAlt(M, winter)), '地平线下 2°24′');
}
ok('分钟进位：夏至 16.63°N', dur(day(16.63 * D2R, summer)), '13 小时 00 分');
ok('赤道春分正午在头顶', noonText(0, 0), '正午太阳高度 90°（在头顶）');
ok('回归线夏至在头顶', noonText(summer, summer), '正午太阳高度 90°（在头顶）');
ok('正午恰在地平线', noonText(Math.PI / 2 - summer, -summer), '正午太阳高度 0°（在地平线上）');
for (const lam of [3.9, 356.1, 89, 183, 267]) ok(`黄经 ${lam} 吸附准确节气`, snapSeason(lam) % 90, 0);
near('范围外不吸附', snapSeason(4.1), 4.1, 1e-10);
ok('89.5°N 吸附春分后画面和记录昼长均为 12 小时', day(89.5 * D2R, decOf(snapSeason(3.9))), 12);
let seams = 0, prev = null;
for (let k = 0; k <= 288; k++) { const sun = sunAt(68.97 * D2R, summer, (k / 288 * 24 - 12) * 15 * D2R), a = ((sun.az / D2R - 180 + 540) % 360) - 180, x = 160 + a / 180 * 160; if (prev !== null && !skyJoin(x, prev, 320)) seams++; prev = x; }
ok('摩尔曼斯克夏至路径在方位接缝断开', seams > 0, true);
console.log(bad ? `\n${bad} 项没对上` : '\n全部对上');
process.exit(bad ? 1 : 0);
