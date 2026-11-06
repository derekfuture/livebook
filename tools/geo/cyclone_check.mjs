// 核对气旋、反气旋活页里的风：node tools/geo/cyclone_check.mjs
// 课本第 45–46 页：北半球低压逆时针流入、高压顺时针流出（南半球相反）；气旋东部偏南风、西部偏北风；反气旋东部偏北风、西部偏南风。
import { windAt, windName, accP, MODEL, advect, windCaption } from '../../src/lessons/kit/pressure.js';
let bad = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) bad++; };
const R = 0.06, pts = { 东部: [R, 0], 西部: [-R, 0], 北部: [0, R], 南部: [0, -R] };
const spin = (mode, hemi) => { const [vx, vn] = windAt(mode, hemi, R, 0); return Math.sign(R * vn); };          // 东边那一点往北走＝逆时针
for (const [mode, nm] of [['low', '低压'], ['high', '高压']]) for (const [hemi, hn] of [[1, '北半球'], [-1, '南半球']]) {
  const s = spin(mode, hemi), want = (mode === 'low') === (hemi === 1) ? 1 : -1;
  ok(s === want, `${hn}${nm}：${s > 0 ? '逆' : '顺'}时针（应为${want > 0 ? '逆' : '顺'}时针）`);
  const [vx, vn] = windAt(mode, hemi, R, 0), [ax, an] = accP(mode, R, 0), inward = vx * Math.sign(-R) > 0;
  ok(inward === (mode === 'low'), `${hn}${nm}：风${inward ? '流进' : '流出'}中心`);
}
for (const [where, [x, n]] of Object.entries(pts)) {
  const lw = windName(...windAt('low', 1, x, n)), hw = windName(...windAt('high', 1, x, n));
  console.log(`  北半球 ${where}：气旋 ${lw.name}（${lw.lean ?? '—'}），反气旋 ${hw.name}（${hw.lean ?? '—'}）`);
}
ok(windName(...windAt('low', 1, R, 0)).lean === '偏南风', '气旋东部吹偏南风');
ok(windName(...windAt('low', 1, -R, 0)).lean === '偏北风', '气旋西部吹偏北风');
ok(windName(...windAt('high', 1, R, 0)).lean === '偏北风', '反气旋东部吹偏北风');
ok(windName(...windAt('high', 1, -R, 0)).lean === '偏南风', '反气旋西部吹偏南风');
const [vx, vn] = windAt('low', 1, R, 0), ang = Math.atan2(-vx, vn) * 180 / Math.PI;          // 和等压线（东边那一点是南北向）的夹角
ok(Math.abs(ang - Math.atan(MODEL.K / MODEL.F) * 180 / Math.PI) < 0.01 && ang > 10 && ang < 45, `风和等压线夹角 ${ang.toFixed(1)}°（示意，实际常见 10°–45°）`);
const [nx] = windAt('low', 0, R, 0); ok(windAt('low', 0, R, 0)[1] === 0 && nx < 0, '地球不自转：风直直吹向低压中心');
for (const mode of ['low', 'high']) for (const hemi of [-1, 0, 1]) {
  for (const [x, n] of [[0, 0], [1e-9, -1e-9]]) { const w = windName(...windAt(mode, hemi, x, n)); ok(w.name === '静风' && w.lean === null, `${mode}/${hemi} 中心及极小风速不报告风向：${x}`); }
}
for (const mode of ['low', 'high']) for (const hemi of [-1, 0, 1]) {
  let x = 0.07, n = 0, consistent = true;
  for (let i = 0; i < 240; i++) { const q = advect(mode, hemi, x, n, 1 / 240); x = q.x; n = q.n; const v = windAt(mode, hemi, x, n); consistent &&= q.velocity.every((u, j) => u === v[j]); }
  ok(consistent, `${mode}/${hemi} 一秒轨迹每步与同位置风向标共用速度场`);
  const q = advect(mode, hemi, 0, 0, 1); ok(q.x === 0 && q.n === 0 && q.velocity.every((v) => v === 0), '中心水平示踪速度为零');
}
ok(windCaption('静风') === '静风' && windCaption('北风') === '风从北边吹来', '天空静风不显示来向');
process.exit(bad ? 1 : 0);
