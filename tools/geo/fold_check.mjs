// 核对褶皱活页的模型：node tools/geo/fold_check.mjs（选必1 第 27 页）
import { surface, exposed, LAM } from '../../src/lessons/kit/fold.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const A = 0, S1 = LAM / 2;          // 背斜轴、向斜轴
ok(surface(A, 1, 0) > surface(S1, 1, 0), `刚挤出来时：背斜是山岭（${surface(A, 1, 0).toFixed(3)}），向斜是谷地（${surface(S1, 1, 0).toFixed(3)}）`);
ok(surface(A, 1, 1) < surface(S1, 1, 1), `外力长期作用后倒置：背斜成谷（${surface(A, 1, 1).toFixed(3)}），向斜成山（${surface(S1, 1, 1).toFixed(3)}）`);
ok(exposed(A, 1, 1) < exposed(A + 0.035, 1, 1), `背斜谷里：中心岩层老（第 ${exposed(A, 1, 1)} 层），两翼新（第 ${exposed(A + 0.035, 1, 1)} 层）`);
ok(exposed(S1, 1, 1) > exposed(S1 - 0.035, 1, 1), `向斜山上：中心岩层新（第 ${exposed(S1, 1, 1)} 层），两翼老（第 ${exposed(S1 - 0.035, 1, 1)} 层）`);
ok(surface(A, 0, 1) === surface(S1, 0, 1), '不挤压：岩层是平的，侵蚀均匀，地面也是平的');
process.exit(bad ? 1 : 0);
