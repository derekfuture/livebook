// 板块运动与地貌的计算（纯函数，活页 plates.js 和核对脚本共用）。课本选必1 第 29 页，图 2.20 六大板块分布、图 2.21 板块的相向运动。
// 地形：NOAA ETOPO1（公有领域，0.25° 子样）；边界：Bird (2003) PB2002，按课本六大板块合并（kit 外的 data/plates.js）。
export const NAMES = { EU: '亚欧板块', AF: '非洲板块', AM: '美洲板块', PA: '太平洋板块', IN: '印度洋板块', AN: '南极洲板块' };
// PB2002 的边界类别 → 课本的说法
export const CLASS = {
  OSR: { k: 'grow', name: '大洋中的生长边界', form: '海岭（大洋中脊）', how: '两侧的板块相离运动，岩浆从中间涌出，冷却后形成新的洋底' },
  CRB: { k: 'grow', name: '大陆上的生长边界', form: '裂谷', how: '大陆板块张裂、相离运动，形成裂谷；继续张裂可能形成海洋（像红海）' },
  SUB: { k: 'die', name: '消亡边界：大洋板块俯冲', form: '海沟，和海岸山脉或岛弧', how: '大洋板块与大陆板块（或另一块大洋板块）相向运动、碰撞，密度大的大洋板块俯冲到下方，俯冲处形成海沟，另一侧形成海岸山脉或岛弧' },
  OCB: { k: 'die', name: '消亡边界：大洋中的挤压', form: '挤压隆起的洋底', how: '两块大洋板块相向运动、相互挤压' },
  CCB: { k: 'die', name: '消亡边界：大陆与大陆碰撞', form: '巨大的褶皱山系、高原', how: '大陆板块与大陆板块相向运动、碰撞，相互挤压并抬升，形成巨大的褶皱山系（像青藏高原、喜马拉雅山）' },
  OTF: { k: 'slide', name: '转换边界（错动）', form: '断裂带', how: '两侧板块大致平行地相互错动（课本只讲了相向、相离两种，这种属于“等形式”里的另一种）' },
  CTF: { k: 'slide', name: '转换边界（错动）', form: '大断层（像圣安德列斯断层）', how: '两侧板块大致水平地相互错动（课本第 28 页的圣安德列斯断层就在这样的边界上）' },
};
const D2R = Math.PI / 180;
/** 经纬度（度）→ 单位球面上的点（和 three.js 的球面贴图对齐：经度 0 朝 +x，东经 90° 朝 −z） */
export const ll2v = (lat, lon) => { const la = lat * D2R, lo = lon * D2R; return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)]; };
export const v2ll = ([x, y, z]) => [Math.asin(Math.max(-1, Math.min(1, y))) / D2R, Math.atan2(-z, x) / D2R];
/** 从 (lat, lon) 出发，沿方位角 az（度，北 0 东 90）走 dist 千米到哪 */
export function dest(lat, lon, az, dist) {
  const R = 6371, d = dist / R, la = lat * D2R, th = az * D2R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(th));
  const lo2 = lon * D2R + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [la2 / D2R, ((lo2 / D2R + 540) % 360) - 180];
}
/** 两点间的方位角（度） */
export function bearing(lat1, lon1, lat2, lon2) { const a = lat1 * D2R, b = lat2 * D2R, dl = (lon2 - lon1) * D2R; return (Math.atan2(Math.sin(dl) * Math.cos(b), Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dl)) / D2R + 360) % 360; }
/** 高度表 hgt(lat, lon)（米） → 横穿边界的剖面：从 (lat, lon) 两侧各 half 千米，垂直于边界走向 strike（度） */
export function profile(hgt, lat, lon, strike, half = 1200, n = 121) {
  const out = []; for (let i = 0; i < n; i++) { const s = -half + (2 * half * i) / (n - 1), [la, lo] = dest(lat, lon, strike + 90, s); out.push({ s, h: hgt(la, lo) }); } return out;
}
