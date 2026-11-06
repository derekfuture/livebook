// 水循环的教学模型（纯计算，活页 water.js 和核对脚本共用）。课本必修第一册第 46–48 页，图 3.2 水循环示意、活动“认识砂田影响的水循环环节”。
// 一个东西向剖面：x 朝东。西边是一块内陆盆地（有个湖，水流不到海），中间一道山（分水岭），东边是沿海平原，再往东是海。
export const XL = -0.17, XR = 0.17;
export const DIVIDE = -0.07, COAST = 0.075, FIELD = [0.0, 0.055];          // 分水岭、海岸线、平原上那块田
export const SURF = {
  bare: { name: '裸田', inf: 0.32, run: 0.33, ev: 0.35 },
  sand: { name: '砂田（铺 10—15 厘米砂石）', inf: 0.62, run: 0.22, ev: 0.16 },          // 课本活动：砂石覆盖层利于下渗、减少蒸发，土壤含水量更高
  paved: { name: '硬化地面（城市）', inf: 0.05, run: 0.82, ev: 0.13 },
};
export const FOREST = { inf: 0.45, run: 0.3, ev: 0.25 };          // 山上的林地
/** 地面高度（示意）：x → y */
export function ground(x) {
  if (x > COAST) return 0.03 - (x - COAST) * 0.25;          // 海底往东变深
  const mtn = 0.05 * Math.exp(-(((x - DIVIDE) / 0.035) ** 2));
  const basin = x < DIVIDE ? -0.012 * Math.exp(-(((x + 0.135) / 0.03) ** 2)) : 0;          // 内陆盆地里低一块，积成湖
  return 0.036 + mtn + basin + (x > DIVIDE ? -0.006 * (x - DIVIDE) / (COAST - DIVIDE) : 0);
}
export const SEA_Y = 0.032, LAKE_X = -0.135, LAKE_Y = 0.03;
/** 按水汽来源、降水去向描述路径，不把内陆盆地等同陆地内循环。 */
export function cycleOf(x, source = 'sea') {
  if (source === 'land' && x > COAST) return { kind: 'big', name: '海陆间水分交换', text: '陆地蒸发的水汽输送到海洋降水，不属于陆地内循环' };
  if (source === 'land') return { kind: 'land', name: '陆地内循环', text: '本情境水汽来自陆地蒸发（蒸腾），又降落在陆地；陆地内循环也可发生在外流区域' };
  if (x > COAST) return { kind: 'sea', name: '海上内循环', text: '本情境海面蒸发的水汽凝结后降落回海洋' };
  return { kind: 'big', name: '海陆间循环', text: x < DIVIDE ? '海洋水汽输送到内陆盆地降水，仍是海洋向陆地的水分输送；水可暂存于湖中，不因跨山就成为陆地内循环' : '本情境海洋水汽输送到陆地降水，部分经地表、地下径流回海，部分暂存或再蒸发' };
}
/** 拖云选择三个独立教学情境，切换时必须重置在途水和账本；不是追踪同一朵云越山。 */
export const scenarioOf = (x) => cycleOf(x, x < DIVIDE ? 'land' : 'sea');
export const inLake = (x) => x > -0.165 && x < -0.105 && ground(x) < LAKE_Y;
/** 湖面直接入湖；其它地面三项为假设比例，并非实测。 */
export function split(x, surf) {
  if (x > COAST) return { inf: 0, run: 0, ev: 0, sea: 1, lake: 0 };
  if (inLake(x)) return { inf: 0, run: 0, ev: 0, sea: 0, lake: 1 };
  return { ...(x >= FIELD[0] && x <= FIELD[1] ? SURF[surf] : FOREST), sea: 0, lake: 0 };
}
/** 降雨带在当前独立情境范围内均匀分布，图表与粒子共用覆盖范围。 */
export function rainBounds(cx) { const kind = scenarioOf(cx).kind; return [Math.max(cx - 0.025, kind === 'sea' ? COAST + 1e-6 : kind === 'big' ? DIVIDE + 1e-6 : XL), Math.min(cx + 0.025, kind === 'land' ? DIVIDE - 1e-6 : kind === 'big' ? COAST : XR)]; }
export function rainSplit(cx, surf) { const [a, b] = rainBounds(cx), out = { inf: 0, run: 0, ev: 0, sea: 0, lake: 0 }; for (let i = 0; i < 1000; i++) { const q = split(a + (b - a) * (i + 0.5) / 1000, surf); for (const k in out) out[k] += q[k] / 1000; } return out; }
// 下渗可暂存土壤、被植物利用或蒸发；只有部分补给地下水。参见 USGS Infiltration and the Water Cycle。
/** 水粒账本：从源水体取出 = 回海 + 入湖 + 土壤储水 + 在途（包括云中）。 */
export function createWater(size = 420, random = Math.random) {
  const P = Array.from({ length: size }, () => ({ st: 'off' }));
  const S = { pend: 0, lake: 0, soil: 0, emitted: 0, cnt: { in: 0, out: 0 }, evT: 0 };
  const reset = () => { P.forEach((p) => { p.st = 'off'; }); Object.assign(S, { pend: 0, lake: 0, soil: 0, emitted: 0, cnt: { in: 0, out: 0 }, evT: 0 }); };
  const spawn = (st, x, y, z) => { const p = P.find((q) => q.st === 'off'); if (!p) return false; Object.assign(p, { st, x, y, z, d: 0 }); return true; };
  const step = (dt, cx, surf) => {
    const kind = scenarioOf(cx).kind, [a, b] = rainBounds(cx); S.evT += dt;
    while (S.evT >= 0.05) { S.evT -= 0.05; const land = kind === 'land'; if (spawn('vap', land ? LAKE_X : COAST + 0.01 + random() * (XR - COAST - 0.02), (land ? LAKE_Y : SEA_Y) + 0.002, (random() - 0.5) * 0.104)) { S.emitted++; if (!land) S.cnt.out++; } }
    while (S.pend > 0) { if (!spawn('rain', a + random() * (b - a), 0.1, (random() - 0.5) * 0.104)) break; S.pend--; }
    for (const p of P) {
      if (p.st === 'off') continue;
      if (p.st === 'vap' || p.st === 'ev') { p.y += dt * 0.035; p.x += (cx - p.x) * dt * 0.25; if (p.y > 0.102) { S.pend++; p.st = 'off'; } }
      else if (p.st === 'rain') {
        p.y -= dt * 0.12; const gy = p.x > COAST ? SEA_Y : inLake(p.x) ? LAKE_Y : ground(p.x);
        if (p.y <= gy) {
          if (p.x > COAST) { S.cnt.in++; p.st = 'off'; }
          else if (inLake(p.x)) { S.lake++; p.st = 'off'; }
          else { const q = split(p.x, surf), r = random(); p.st = r < q.inf ? 'inf' : r < q.inf + q.run ? 'run' : 'ev'; p.y = gy; p.d = 0; p.soil = random() < 0.5; }
        }
      } else if (p.st === 'run' || p.st === 'inf') {
        const inf = p.st === 'inf'; if (inf) p.d += dt * 0.012;
        if (inf && p.soil && p.d > 0.004) { S.soil++; p.st = 'off'; continue; }          // 示意将部分下渗水留在土壤，省略后续植物利用和再蒸发；一半只是模型假设
        if (!inf || p.d > 0.012) p.x += (p.x > DIVIDE ? 1 : Math.sign(LAKE_X - p.x) || 1) * dt * (inf ? 0.018 : 0.05);
        p.y = ground(p.x) + (inf ? -Math.min(0.016, p.d) : 0.0012);
        if (p.x > COAST) { S.cnt.in++; p.st = 'off'; }
        else if (inLake(p.x) && (!inf || p.d > 0.012)) { S.lake++; p.st = 'off'; }
      }
    }
  };
  const balance = () => { const transit = S.pend + P.filter((p) => p.st !== 'off').length; return { transit, error: S.emitted - S.cnt.in - S.lake - S.soil - transit }; };
  return { P, S, spawn, step, reset, balance };
}
