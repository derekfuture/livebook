// 核对城镇内部空间结构：node tools/geo/urban_check.mjs（必修2 第 26–28 页，图 2.7）
import { USES, KEYS, A, B, C, bid, winner, along, effDist } from '../../src/lessons/kit/urban.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(KEYS.every((k) => bid(k, 1) < bid(k, 0)), '三类土地利用的付租能力都随距市中心距离增大而递减（思考 1：相同点）');
ok(USES.shop.b > USES.home.b && USES.home.b > USES.fact.b && USES.shop.a > USES.home.a && USES.home.a > USES.fact.a, '商业在市中心付得最多、递减最快；工业最少、最平（思考 1：不同点）');
ok(A < B && B < C && USES.shop.a / USES.shop.b < B && USES.home.a / USES.home.b < C, `和图 2.7 的样子一样：A（${A.toFixed(2)}）< B（${B.toFixed(2)}）< C（${C.toFixed(2)}），商业线在 A、B 之间降到 0，住宅线在 B、C 之间降到 0`);
const seg = along(Math.PI / 4, { roads: [] });
ok(seg.map((s) => s.k).join() === 'shop,home,fact,', `没有干线时：OA 是商业区、AB 是住宅区、BC 是工业区，C 以外没人付得起（思考 2）：${seg.map((s) => `${s.k ?? '城外'} ${s.from.toFixed(2)}–${s.to.toFixed(2)}`).join('，')}`);
const onRoad = along(0, {}), offRoad = along(Math.PI / 4, {});
const endOf = (sg, k) => sg.find((s) => s.k === k)?.to ?? 0;
ok(endOf(onRoad, 'shop') > endOf(offRoad, 'shop') * 1.3 && endOf(onRoad, 'home') > endOf(offRoad, 'home') * 1.3, `沿交通干线，各区都往外伸得更远（商业区到 ${endOf(onRoad, 'shop').toFixed(2)}，离干线远的方向只到 ${endOf(offRoad, 'shop').toFixed(2)}）：距交通干线越近，租金越高`);
ok(winner(2.5, 0.05, {}).rent > winner(2.5 * Math.SQRT1_2, 2.5 * Math.SQRT1_2, {}).rent, '同样离市中心 2.5，干线边上的地租比离干线远的高');
ok(winner(2.6, 1.2, { sub: [2.6, 1.2] }).k === 'shop' && winner(2.6, 1.2, {}).k !== 'shop', '建了副中心：那一带出现新的商业中心');
const subDirection = along(Math.atan2(-1.15, 2.55), { sub: [2.55, -1.15] });
ok(subDirection.map((s) => s.k).join() === 'shop,home,shop,home' && subDirection[2].from > 2.6 && subDirection[2].to < 3, '沿副中心剖面为商业、住宅、商业、住宅：动态 BC 是商业区');
process.exit(bad ? 1 : 0);
