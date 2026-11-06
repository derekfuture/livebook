// 核对水循环活页：node tools/geo/water_check.mjs（必修第一册第 46–48 页）
import { SURF, cycleOf, split, ground, COAST, DIVIDE, SEA_Y, LAKE_X, LAKE_Y } from '../../src/lessons/kit/water.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(cycleOf(0.12).name === '海上内循环' && cycleOf(0.03).name === '海陆间循环' && cycleOf(-0.12).name === '陆地内循环', '云在海上、沿海平原、内陆盆地：三种水循环');
ok(SURF.sand.inf > SURF.bare.inf && SURF.sand.ev < SURF.bare.ev, '砂田比裸田：下渗多、蒸发少（课本活动）');
ok(SURF.paved.run > SURF.bare.run && SURF.paved.inf < SURF.bare.inf, '硬化地面：地表径流多、下渗少');
for (const k in SURF) ok(Math.abs(SURF[k].inf + SURF[k].run + SURF[k].ev - 1) < 1e-9, `${SURF[k].name}：三项加起来是全部雨水`);
ok(ground(DIVIDE) > ground(DIVIDE - 0.04) && ground(DIVIDE) > ground(DIVIDE + 0.04), '分水岭比两边高');
ok(ground(COAST + 0.03) < SEA_Y && ground(LAKE_X) < LAKE_Y, '海、湖的水面在地面之上');
process.exit(bad ? 1 : 0);
