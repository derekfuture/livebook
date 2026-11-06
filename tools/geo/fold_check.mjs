// 核对褶皱活页的模型：node tools/geo/fold_check.mjs（选必1 第 27 页）
import { surface, exposed, LAM } from '../../src/lessons/kit/fold.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const A = 0, S1 = LAM / 2;          // 背斜轴、向斜轴
ok(surface(A, 1, 0) > surface(S1, 1, 0), `刚挤出来时：背斜是山岭（${surface(A, 1, 0).toFixed(3)}），向斜是谷地（${surface(S1, 1, 0).toFixed(3)}）`);
ok(surface(A, 1, 1) < surface(S1, 1, 1), `外力长期作用后倒置：背斜成谷（${surface(A, 1, 1).toFixed(3)}），向斜成山（${surface(S1, 1, 1).toFixed(3)}）`);
ok(exposed(A, 1, 1) < exposed(A + 0.035, 1, 1), `背斜谷里：中心岩层老（第 ${exposed(A, 1, 1)} 层），两翼新（第 ${exposed(A + 0.035, 1, 1)} 层）`);
ok(exposed(S1, 1, 1) > exposed(S1 - 0.035, 1, 1), `向斜山上：中心岩层新（第 ${exposed(S1, 1, 1)} 层），两翼老（第 ${exposed(S1 - 0.035, 1, 1)} 层）`);
ok(surface(A, 0, 1) === surface(S1, 0, 1), '不挤压：岩层是平的，侵蚀均匀，地面也是平的');
let mono = true; for (let x = 0; x + 0.004 <= LAM / 2; x += 0.004) if (surface(x + 0.004, 1, 1) < surface(x, 1, 1) - 1e-9) mono = false;
ok(mono, '倒置以后，从背斜轴到向斜轴地面一路升高（向斜轴上就是山顶，不会两边高中间凹）');
ok(surface(0, 1, 1) > 0.005, '侵蚀到最后，地面还在地块里（没有冲穿）');
ok(exposed(0, 1, 0) === 6 && exposed(0, 1, 0.5) === 3, '挤压 1：侵蚀阶段从 0 到 0.5，背斜轴露头从第 6 层变为第 3 层');
process.exit(bad ? 1 : 0);
