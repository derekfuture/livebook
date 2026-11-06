// 核对板块运动与地貌：node tools/geo/plates_check.mjs（选必1 第 29 页）。用生成的高度图和边界核对几处有名的地形在不在对的边界上。
import L from '../../src/lessons/data/plates.js';
import { ll2v, CLASS } from '../../src/lessons/kit/plates.js';
import { readFileSync } from 'fs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const near = (lat, lon, pred = () => true) => { let best = null, bd = 9; const p = ll2v(lat, lon); for (const l of L) { if (!pred(l)) continue; for (const q of l.pts) { const v = ll2v(q[1], q[0]), d = Math.hypot(p[0] - v[0], p[1] - v[1], p[2] - v[2]); if (d < bd) { bd = d; best = l; } } } return { l: best, km: bd * 6371 }; };
const set = new Set(L.flatMap((l) => [l.p.slice(0, 2), l.p.slice(2)])); ok(['EU', 'AF', 'AM', 'PA', 'IN', 'AN'].every((k) => set.has(k)) && set.size === 6, '六大板块（课本图 2.20）');
const h = near(28.0, 86.9, (l) => l.k !== 'slide'); ok(h.l.c === 'CCB' && h.l.p === 'EUIN' && h.km < 300, `珠穆朗玛峰在亚欧板块和印度洋板块的碰撞边界附近（约 ${h.km.toFixed(0)} 千米）`);
const m = near(11.35, 142.2); ok(m.l.c === 'SUB' && m.km < 200, `马里亚纳海沟在俯冲边界上（约 ${m.km.toFixed(0)} 千米）`);
const a = near(-32.65, -70.0, (l) => l.k !== 'slide'); ok(a.l.c === 'SUB' && a.l.p === 'AMPA' && a.km < 300, `安第斯山的阿空加瓜峰旁边是美洲板块和太平洋板块的俯冲边界（约 ${a.km.toFixed(0)} 千米）`);
const r = near(-30, -13.5, (l) => l.k !== 'slide'); ok(r.l.c === 'OSR' && r.l.p === 'AFAM', '大西洋中脊是非洲板块和美洲板块之间的生长边界');
const e = near(5, 36.6, (l) => l.k !== 'slide'); ok(e.l.c === 'CRB' && e.l.p === 'AFAF', '东非裂谷是非洲板块内部的张裂（课本的六大板块里它在非洲板块内）');
const rs = near(20, 38.5, (l) => l.k !== 'slide'); ok(rs.l.k === 'grow', '红海中间是生长边界（课本第 30 页：红海还在不断扩张）');
ok(Object.values(CLASS).filter((c) => c.k === 'grow').every((c) => /相离/.test(c.how)) && ['SUB', 'CCB'].every((k) => /相向/.test(CLASS[k].how)), '生长边界都是相离运动，消亡边界都是相向运动');
const js = readFileSync(new URL('../../src/lessons/data/plates.js', import.meta.url), 'utf8'); ok(/Bird/.test(js), '边界数据写明了出处（Bird 2003, PB2002）');
process.exit(bad ? 1 : 0);
