// 锋面天气的教学模型；温压数值为示意，连续过渡不表示锋线处瞬间突变。
const sig = (x) => 1 / (1 + Math.exp(-x));
/** 你家气象站的读数（教学示意的数值，按课本第 43–44 页的变化方向）：d＝你家离锋线多远，正数＝锋线还没到。
 *  冷锋：过境后气温下降、气压上升，过境时风大；暖锋：过境后气温升高、气压降低（锋前气压就在慢慢降）；准静止锋：冷空气一侧阴冷。 */
export function stationAt(kind, d) {
  if (kind === 'cold') return { T: 11 + 9 * sig(d / 0.008), P: 1008 + 8 * sig(-d / 0.012) - 1.5 * Math.exp(-((d / 0.02) ** 2)), wind: Math.round(2 + 4 * Math.exp(-(((d + 0.012) / 0.02) ** 2))) };
  if (kind === 'warm') return { T: 16 - 8 * sig(d / 0.008), P: 1007 + 7 * sig((d - 0.06) / 0.03), wind: Math.round(2 + Math.exp(-((d / 0.04) ** 2))) };
  return { T: d >= 0 ? 16 : 10, P: d >= 0 ? 1009 : 1013, wind: 2 };
}
export function weatherAt(kind, d) {
  if (kind === 'cold') {
    if (d > 0.065) return { k: 'w0', text: '晴，较暖', s: '晴暖' };
    if (d > 0) return { k: 'w1', text: '云变厚，风渐大', s: '云厚风起' };
    if (d >= -0.045) return { k: 'w2', text: '大风、降温、下雨', s: '大风降温下雨' };
    return { k: 'w3', text: '转晴，较冷，气压升高', s: '转晴变冷' };
  }
  if (kind === 'still') {
    if (d >= 0) return { k: 'w0', text: '晴，较暖', s: '晴' };
    if (d >= -0.11) return { k: 'w2', text: '阴雨连绵', s: '阴雨连绵' };
    return { k: 'w1', text: '阴，较冷', s: '阴冷' };
  }
  if (d > 0.14) return { k: 'w0', text: '晴，较冷', s: '晴冷' };
  if (d > 0.095) return { k: 'w1', text: '云一层层变厚', s: '云渐厚' };
  if (d >= 0) return { k: 'w2', text: '锋线还没到，已经连续下雨，地面还冷', s: '连续下雨（地面还冷）' };
  return { k: 'w3', text: '转晴，变暖，气压降低', s: '转晴变暖' };          // 课本 p43：暖锋过境后气温升高，气压降低，天气转晴
}

/** 按实际拖动区间采样，并插入天气阶段边界，快速拖动也不会漏记。 */
export function frontPath(kind, from, to) {
  if (from == null || from === to) return [to];
  const cuts = kind === 'cold' ? [0.065, 0, -0.045] : kind === 'warm' ? [0.14, 0.095, 0] : [0, -0.11];
  const n = Math.ceil(Math.abs(to - from) / 0.002), points = Array.from({ length: n + 1 }, (_, i) => from + (to - from) * i / n);
  for (const cut of cuts) for (const d of [cut - 1e-8, cut, cut + 1e-8]) if (d > Math.min(from, to) && d < Math.max(from, to)) points.push(d);
  return points.sort((a, b) => to < from ? b - a : a - b);
}
