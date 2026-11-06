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
/** 云在 x 处下雨：这是哪一种水循环、雨水往哪去 */
export function cycleOf(x) {
  if (x > COAST) return { kind: 'sea', name: '海上内循环', text: '海面蒸发的水汽在海洋上空凝结，降落到海面' };
  if (x < DIVIDE) return { kind: 'land', name: '陆地内循环', text: '雨落在内陆盆地，流进湖里，再蒸发成水汽，仍降在陆地上，流不到海' };
  return { kind: 'big', name: '海陆间循环', text: '海上的水汽被气流送到陆地上空，降水落到地面，经地表径流、地下径流汇入江河，回到海洋' };
}
/** 雨落在 x 处的地面：下渗、地表径流、蒸发（蒸腾）各占多少 */
export function split(x, surf) {
  if (x > COAST) return { inf: 0, run: 0, ev: 0, sea: 1 };
  if (x >= FIELD[0] && x <= FIELD[1]) return { ...SURF[surf], sea: 0 };
  return { ...FOREST, sea: 0 };
}
