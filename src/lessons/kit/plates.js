// 板块运动与地貌的计算（纯函数，活页 plates.js 和核对脚本共用）。课本选必1 第 29 页，图 2.20 六大板块分布、图 2.21 板块的相向运动。
// 地形：NOAA ETOPO1 冰面版；PB2002 具体板块与课本六大板块标注分层，不合并边界。
export const SIX_NAMES = { EU: '亚欧板块', AF: '非洲板块', AM: '美洲板块', PA: '太平洋板块', IN: '印度洋板块', AN: '南极洲板块' };
export const NAMES = Object.fromEntries(Object.entries({ AF: '非洲', AM: '阿穆尔', AN: '南极洲', AP: '阿尔蒂普拉诺', AR: '阿拉伯', AS: '爱琴海', AT: '安纳托利亚', AU: '澳大利亚', BH: '鸟首', BR: '巴尔莫勒尔礁', BS: '班达海', BU: '缅甸', CA: '加勒比', CL: '加罗林', CO: '科科斯', CR: '康韦礁', EA: '复活节', EU: '亚欧', FT: '富图纳', GP: '加拉帕戈斯', IN: '印度', JF: '胡安·德富卡', JZ: '胡安·费尔南德斯', KE: '克马德克', MA: '马里亚纳', MN: '马努斯', MO: '毛克', MS: '摩鹿加海', NA: '北美', NB: '北俾斯麦', ND: '北安第斯', NH: '新赫布里底', NI: '纽阿福欧', NZ: '纳斯卡', OK: '鄂霍次克', ON: '冲绳', PA: '太平洋', PM: '巴拿马', PS: '菲律宾海', RI: '里韦拉', SA: '南美', SB: '南俾斯麦', SC: '斯科舍', SL: '设得兰', SO: '索马里', SS: '所罗门海', SU: '巽他', SW: '桑威奇', TI: '帝汶', TO: '汤加', WL: '伍德拉克', YA: '扬子' }).map(([k, v]) => [k, v + '板块']));
// 分类依据 Bird (2003) 原始 README：OCB、CCB 均为非 SUB 类，不能据类别确诊地貌。
export const CLASS = {
  OSR: { k: 'grow', name: '大洋扩张边界', form: '相离运动示意', how: '两侧板块相离运动，新的洋底在扩张边界形成' },
  CRB: { k: 'grow', name: '大陆张裂边界', form: '张裂示意', how: '两侧板块相离运动，大陆发生张裂' },
  SUB: { k: 'die', name: '俯冲边界', form: '板片下插示意', how: '两侧板块相向运动，一侧板片下插；释放的流体可促进上覆地幔楔局部部分熔融' },
  OCB: { k: 'die', name: '大洋汇聚边界（非俯冲类）', form: '挤压变形示意', how: '两侧板块相向运动、相互挤压；PB2002 未将这一段归为俯冲带，不能自动推断海沟或火山' },
  CCB: { k: 'die', name: '大陆汇聚边界', form: '挤压变形示意', how: '两侧板块相向运动、发生挤压变形；这一分类不等于每一处都发生喜马拉雅式大陆碰撞' },
  OTF: { k: 'slide', name: '大洋转换边界', form: '沿边界错动示意', how: '两侧板块主要沿边界水平错动' },
  CTF: { k: 'slide', name: '大陆转换边界', form: '沿边界错动示意', how: '两侧板块主要沿边界水平错动' },
};
export const OVERVIEW = '许多活动山系、海沟和洋中脊与现今板块边界密切相关；板块内部也有古老山系和局部活动构造';
export const roundedHeight = (h) => Math.round(h / 100) * 100;
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

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const n = Math.hypot(...a); return a.map((v) => v / n); };
const angle = (a, b) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));
/** 球面短弧上的最近点；端点、日期变更线和转换边界一视同仁，不替换类别。 */
export function nearestBoundary(lines, lat, lon) {
  const p = ll2v(lat, lon); let best = null;
  for (const l of lines) for (let i = 0; i < l.pts.length - 1; i++) {
    const a = ll2v(l.pts[i][1], l.pts[i][0]), b = ll2v(l.pts[i + 1][1], l.pts[i + 1][0]), normal = unit(cross(a, b));
    let q = angle(p, a) <= angle(p, b) ? a : b;
    const projected = p.map((v, j) => v - dot(p, normal) * normal[j]);
    if (Math.hypot(...projected) > 1e-12) { const t = unit(projected); if (Math.abs(angle(a, t) + angle(t, b) - angle(a, b)) < 1e-8) q = t; }
    const dist = angle(p, q) * 6371;
    if (!best || dist < best.dist - 1e-8) {
      const [la, lo] = v2ll(q), ahead = unit(cross(normal, q)), east = [-Math.sin(lo * D2R), 0, -Math.cos(lo * D2R)], north = cross(q, east);
      best = { l, lat: la, lon: lo, strike: (Math.atan2(dot(ahead, east), dot(ahead, north)) / D2R + 360) % 360, dist };
    }
  }
  return best;
}
/** +Z 为箭头尖端；across 指向有向边界右侧，sd 为所在侧。 */
export function arrowFrame(lat, lon, strike, kind, sd) {
  const radial = ll2v(lat, lon), east = [-Math.sin(lon * D2R), 0, -Math.cos(lon * D2R)], north = cross(radial, east);
  const along = north.map((v, i) => v * Math.cos(strike * D2R) + east[i] * Math.sin(strike * D2R));
  const across = unit(cross(along, radial)), side = across.map((v) => v * sd);
  return { radial, across, position: unit(radial.map((v, i) => v + side[i] * 0.03)), direction: side.map((v) => v * (kind === 'grow' ? 1 : -1)) };
}
/** 剖面沿走向 +90° 前进，负距离在边界左侧。反向展示必须同时交换板块及俯冲侧。 */
export function sectionSides(line, reverse = false) {
  const left = reverse ? line.right : line.left, right = reverse ? line.left : line.right;
  return { left, right, subLeft: line.c === 'SUB' && line.subducting === left };
}
export function decodeHeight(encoded, grid) {
  const raw = atob(encoded); if (raw.length !== grid.width * grid.height * 2) throw new Error('高程数据长度不符');
  const out = new Int16Array(grid.width * grid.height);
  for (let i = 0; i < out.length; i++) { const v = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8); out[i] = v > 32767 ? v - 65536 : v; }
  return out;
}
export function sampleHeight(data, grid, lat, lon) {
  if (!data) return null;
  const x = ((Math.round((lon - grid.lon0) / grid.dlon) % grid.width) + grid.width) % grid.width;
  const y = Math.max(0, Math.min(grid.height - 1, Math.round((lat - grid.lat0) / grid.dlat)));
  return data[y * grid.width + x];
}
/** 统一加载状态；未就绪时不产生剖面或数值。 */
export function elevationState(grid) {
  return { status: 'loading', data: null, load(encoded) { try { this.data = decodeHeight(encoded, grid); this.status = 'ready'; } catch { this.data = null; this.status = 'failed'; } }, sample(lat, lon) { return sampleHeight(this.data, grid, lat, lon); } };
}
