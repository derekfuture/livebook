// 核对河谷演变活页的模型：node tools/geo/river_check.mjs（课本第 33 页）
import { stage, heightAt, floorY, drop, centerZ, topY, WC, APEX, LAM, ZD } from '../../src/lessons/kit/river.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const X = 0.12;          // 下游一处直一点的河段量横剖面
const section = (t) => { const fl = floorY(X, t), top = topY(X); let wTop = 0; for (let z = 0; z < ZD; z += 0.0005) if (heightAt(X, z, t) < top - 0.003) wTop = z; return { depth: top - fl, width: 2 * wTop, floor: 2 * stage(t).floorHalf }; };
const a = section(0.35), c = section(1);
ok(a.depth / a.width > 0.45, `早期：深而窄（深/宽 = ${(a.depth / a.width).toFixed(2)}，谷底宽 ${a.floor.toFixed(3)}）——“V”形`);
ok(c.depth / c.width < 0.35 && c.floor > 4 * a.floor, `后来：宽而浅的槽形（深/宽 = ${(c.depth / c.width).toFixed(2)}，谷底宽 ${c.floor.toFixed(3)}）`);
ok(drop(0) > drop(0.25) && drop(0.25) > drop(0.5) && drop(0.5) >= drop(1) - 1e-9, `落差一直在减小：${drop(0).toFixed(3)} → ${drop(0.25).toFixed(3)} → ${drop(1).toFixed(3)}`);
ok(stage(0.4).head < stage(0).head, '向源头侵蚀：河谷的源头往上游移');
ok(floorY(X, 0.35) < floorY(X, 0), '早期以向下侵蚀为主：谷底变低');
ok(stage(0.3).amp < 0.005 && stage(1).amp > 0.03, '河道后来才变弯');
// 河湾：APEX 处向北凸，北岸是凹岸。凹岸一侧河床深、陡
const t = 1, zc = centerZ(APEX, t), dOuter = floorY(APEX, t) - heightAt(APEX, zc - WC * 0.3, t), dInner = floorY(APEX, t) - heightAt(APEX, zc + WC * 0.3, t);
ok(zc < 0 && dOuter > dInner * 1.5, `河湾处凹岸（北岸）一侧深 ${dOuter.toFixed(4)}，凸岸（南岸）一侧浅 ${dInner.toFixed(4)}`);
ok(centerZ(APEX, 1) < centerZ(APEX, 0.5), '河道向凹岸（北）移：凸岸（南岸）的岸线向北推移');
ok(centerZ(APEX - LAM / 2, 1) > 0, '下一个湾向南凸：凹岸在南岸');
process.exit(bad ? 1 : 0);
