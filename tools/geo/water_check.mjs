// 核对水循环活页：node tools/geo/water_check.mjs（必修第一册第 46–48 页）
import { SURF, cycleOf, scenarioOf, rainSplit, createWater, split, ground, COAST, DIVIDE, SEA_Y, LAKE_X, LAKE_Y } from '../../src/lessons/kit/water.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(cycleOf(0.12).name === '海上内循环' && cycleOf(0.03).name === '海陆间循环' && scenarioOf(-0.12).name === '陆地内循环', '三个独立教学情境');
ok(SURF.sand.inf > SURF.bare.inf && SURF.sand.ev < SURF.bare.ev, '砂田比裸田：下渗多、蒸发少（课本活动）');
ok(SURF.paved.run > SURF.bare.run && SURF.paved.inf < SURF.bare.inf, '硬化地面：地表径流多、下渗少');
for (const k in SURF) ok(Math.abs(SURF[k].inf + SURF[k].run + SURF[k].ev - 1) < 1e-9, `${SURF[k].name}：三项加起来是全部雨水`);
ok(ground(DIVIDE) > ground(DIVIDE - 0.04) && ground(DIVIDE) > ground(DIVIDE + 0.04), '分水岭比两边高');
ok(ground(COAST + 0.03) < SEA_Y && ground(LAKE_X) < LAKE_Y, '海、湖的水面在地面之上');
ok(cycleOf(-0.135, 'sea').kind === 'big' && cycleOf(0.03, 'land').kind === 'land', '海洋水汽跨山不变为陆地内循环，外流区域也有陆地内循环');
ok(split(LAKE_X, 'bare').lake === 1, '湖中央降雨直接入湖');
for (const cx of [-0.14, -0.135, -0.08, 0, 0.03, 0.074, 0.076, 0.13]) {
  const q = rainSplit(cx, 'bare'); ok(Math.abs(Object.values(q).reduce((a, b) => a + b, 0) - 1) < 1e-10, `${cx} 覆盖区各分类之和为1`);
}
let seed = 13; const rnd = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
for (const size of [1, 8, 420]) {
  const sim = createWater(size, rnd); let valid = true;
  for (const cx of [0.03, 0.13, -0.135, -0.08]) {
    sim.reset(); valid &&= sim.balance().transit === 0 && sim.S.emitted === 0;
    for (let i = 0; i < 400; i++) { sim.step(0.05, cx, 'sand'); valid &&= sim.balance().error === 0; }
    if (cx === -0.135 && size === 420) ok(sim.S.lake > 0 && sim.S.cnt.out === 0, '无海洋蒸发时湖泊累计仍增长');
  }
  ok(valid, `粒子池容量${size}：平原10秒以上后切海上、湖面，逐步守恒；池满不丢水`);
}
const full = createWater(1, rnd); full.spawn('vap', 0.13, 0.032, 0); full.S.emitted = 1; full.S.pend = 2; full.S.emitted += 2; full.step(0.05, 0.13, 'bare');
ok(full.S.pend === 2 && full.S.emitted === 3 && full.balance().error === 0, '池满时失败的蒸发不入账，待降水不扣除');
process.exit(bad ? 1 : 0);
