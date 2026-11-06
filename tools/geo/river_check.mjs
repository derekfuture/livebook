// 核对河谷演变活页的模型：node tools/geo/river_check.mjs（课本第 33 页）
import { stage, waterY, waterBanks, bankDepth, gapAt, heightAt, floorY, drop, centerZ, topY, WC, APEX, LAM, ZD } from '../../src/lessons/kit/river.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const X = 0.12;          // 下游一处直一点的河段量横剖面
const section = (t) => { const fl = floorY(X, t), top = topY(X); let wTop = 0; for (let z = 0; z < ZD; z += 0.0005) if (heightAt(X, z, t, false) < top - 0.003) wTop = z; return { depth: top - fl, width: 2 * wTop, floor: 2 * stage(t).floorHalf }; };
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
ok(bankDepth(-0.13, -1, 0.62) > 0 && bankDepth(-0.13, 1, 0.62) > 0, '审稿复现点：源头过渡段两岸采样均为正水深');
ok(waterBanks(stage(0.62).head - 0.001, 0.62) === null && bankDepth(-0.17, 1, 0.62) === 0, '干地没有可放港口的岸线和水深');
let edgesOK = true, wetOK = true, gapOK = true;
for (let ti = 0; ti <= 20; ti++) for (let xi = 0; xi <= 100; xi++) {
  const t = ti / 20, x = -0.17 + 0.34 * xi / 100, banks = waterBanks(x, t); if (!banks) continue;
  for (const z of banks) edgesOK &&= Math.abs(heightAt(x, z, t) - waterY(x, t)) < 1e-8;
  for (let j = 1; j < 20; j++) { const z = banks[0] + (banks[1] - banks[0]) * j / 20; wetOK &&= waterY(x, t) > heightAt(x, z, t); gapOK &&= gapAt(x, z, t) < 0; }
}
ok(edgesOK, '全时段两侧实际水边满足河床高度等于水面高度（含非对称河湾）');
ok(wetOK, '水带内部连通且水深为正，没有水面伸入土中');
ok(gapOK, '港口距离和水带使用同一岸线');
const banks = waterBanks(APEX, 1);
ok(Math.abs(banks[0] - centerZ(APEX, 1)) > Math.abs(banks[1] - centerZ(APEX, 1)), '审稿复现点：凹岸水带更宽，凸岸更窄');
process.exit(bad ? 1 : 0);
