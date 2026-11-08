// 地理世界里“现在这一刻”的读数：右上角星空里的一行字，不是表单。地球上的太阳照在哪个时刻（默认就是现在，跟着走）；
// 要换时刻，拖地球下面铜版上的那颗小太阳（GeoWorld 调 setFromSun）。下面是“你在这里”：选一座城（记住），今天的昼长、此刻太阳多高，
// 再用几根金线画“在这座城看天空”：今天太阳从哪升起、正午多高、从哪落下，现在在哪（地球、铜版、这条天空是同一个时刻）。
// 时间都按北京时间；日出日落也是北京时间（乌鲁木齐的太阳比北京晚两个多小时出来，就看得见）。不计大气折射，和课本算昼长的办法一样。
import { h } from '../ui/Panel.js';
import { subsolar } from '../live/WorldEarth.js';

const D2R = Math.PI / 180;
export const CITIES = [
  ['北京', 39.9, 116.4], ['天津', 39.13, 117.2], ['上海', 31.23, 121.47], ['重庆', 29.56, 106.55], ['石家庄', 38.04, 114.51], ['太原', 37.87, 112.55],
  ['呼和浩特', 40.84, 111.75], ['沈阳', 41.8, 123.43], ['长春', 43.82, 125.32], ['哈尔滨', 45.8, 126.53], ['南京', 32.06, 118.8], ['杭州', 30.27, 120.15],
  ['合肥', 31.82, 117.23], ['福州', 26.07, 119.3], ['南昌', 28.68, 115.86], ['济南', 36.65, 117.12], ['郑州', 34.75, 113.62], ['武汉', 30.59, 114.31],
  ['长沙', 28.23, 112.94], ['广州', 23.13, 113.26], ['南宁', 22.82, 108.37], ['海口', 20.04, 110.32], ['成都', 30.57, 104.07], ['贵阳', 26.65, 106.63],
  ['昆明', 25.04, 102.71], ['拉萨', 29.65, 91.13], ['西安', 34.34, 108.94], ['兰州', 36.06, 103.83], ['西宁', 36.62, 101.78], ['银川', 38.49, 106.23],
  ['乌鲁木齐', 43.83, 87.62], ['台北', 25.03, 121.57], ['香港', 22.32, 114.17], ['澳门', 22.2, 113.55],
].map(([name, lat, lon]) => ({ name, lat, lon }));
const KEY = 'livebook.city', TROPIC = 23.44;
const wrap = (d) => ((d + 540) % 360) - 180;

/** 某地看太阳：高度角、方位角（从正北顺时针，度）。H 是时角（下午为正，度），phi 纬度，dec 直射点纬度 */
export function sunAt(phi, dec, H) {
  const p = phi * D2R, d = dec * D2R, hh = H * D2R;
  const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(hh)) / D2R;
  const az = (Math.atan2(Math.sin(hh), Math.cos(hh) * Math.sin(p) - Math.tan(d) * Math.cos(p)) / D2R + 180 + 360) % 360;
  return { alt, az };
}
/** 昼长（小时）：日出日落时的时角 H0，cos H0 = −tan φ tan δ（极昼 24、极夜 0） */
export function dayLength(phi, dec) { const c = -Math.tan(phi * D2R) * Math.tan(dec * D2R); return c <= -1 ? 24 : c >= 1 ? 0 : (2 * Math.acos(c)) / D2R / 15; }

const pad = (n) => String(n).padStart(2, '0');
const bj = (t) => new Date(t + 8 * 3600000);          // 北京时间：取 UTC 的年月日时分
const hm = (hours) => { const m = Math.round((((hours % 24) + 24) % 24) * 60); return `${Math.floor(m / 60) % 24}:${pad(m % 60)}`; };
const latText = (lat) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;

export function timeCard({ earth }) {
  let live = true, sim = Date.now();
  let city = CITIES.find((c) => c.name === localStorage.getItem(KEY)) || CITIES[0];
  const listeners = new Set();
  let decYear = null, decs = null;          // 这一年每天正午的直射点纬度（拖太阳换季节时，按它找日子）

  const liveBtn = h('button', { class: 'gn-live', onclick: () => { live = true; sim = Date.now(); apply(); } }, '回到现在');
  const day = h('b'), clock = h('span');
  const sub = h('span', { class: 'gn-sub' });
  const pick = h('button', { class: 'gn-pick', onclick: (e) => { e.stopPropagation(); list.hidden = !list.hidden; } });
  const here = h('span');
  const list = h('div', { class: 'gn-list', hidden: true }, ...CITIES.map((c) => h('button', { onclick: () => { city = c; localStorage.setItem(KEY, c.name); list.hidden = true; apply(); } }, c.name)));
  addEventListener('pointerdown', (e) => { if (!list.hidden && !list.contains(e.target) && e.target !== pick) list.hidden = true; });
  const sky = h('canvas', { class: 'gn-sky', width: 260, height: 88 });
  const el = h('div', { class: 'geo-now' },
    h('div', { class: 'gn-when' }, day, clock),
    h('div', { class: 'gn-line' }, sub, liveBtn),
    h('div', { class: 'gn-line gn-city' }, '你在', pick, here, list),
    sky,
    h('small', { class: 'gn-src' }, '夜间灯光：NASA 2016 年卫星合成 · 月面：NASA LRO · 云和月亮的位置是示意 · 昼长、日出日落按太阳中心碰到地平线算，不计大气折射'));
  document.body.append(el);

  let last = '';
  function apply() {
    const s = earth.setTime(new Date(sim)), b = bj(sim);
    const H = wrap(city.lon - s.lon), now = sunAt(city.lat, s.lat, H), len = dayLength(city.lat, s.lat);
    const tNow = b.getUTCHours() + b.getUTCMinutes() / 60, noon = tNow + wrap(s.lon - city.lon) / 15;          // 再过几小时到正午（直射点每小时往西 15°）
    liveBtn.hidden = live;
    const key = `${Math.floor(sim / 60000)}|${city.name}`;
    if (key !== last) {
      last = key;
      day.textContent = `${b.getUTCMonth() + 1} 月 ${b.getUTCDate()} 日`;
      clock.textContent = `北京时间 ${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`;
      sub.textContent = `太阳直射 ${latText(s.lat)}`;
      pick.textContent = city.name;
      const mins = Math.round(len * 60);          // 先取整到分钟再拆成时、分（不然 11.999 时会写成 11 时 60 分）
      here.textContent = `昼长 ${Math.floor(mins / 60)} 时 ${pad(mins % 60)} 分 · 太阳${now.alt >= 0 ? `高 ${now.alt.toFixed(0)}°` : '在地平线下'}`;
      drawSky(sky, city, s.lat, H, { rise: noon - len / 2, set: noon + len / 2 });
    }
    for (const f of listeners) f({ city, sub: s, live, sim });
  }

  /** 在这座城看天空：几根金线——地平线、今天太阳走的弧、正午高度、日出日落，现在的太阳。
   *  一圈地平线全画出来，中间是正午太阳所在的那一边：一般在正南；回归线之间的地方，太阳直射点在这座城北边的那些天，正午太阳在正北（面朝北，东在右手） */
  function drawSky(c, cty, dec, H, t) {
    const noonP = sunAt(cty.lat, dec, 0), mid = dec > cty.lat ? 0 : 180;          // 画面中间对着正午太阳的方位：南（180）或北（0）
    const g = c.getContext('2d'), W = c.width, Hh = c.height, top = 14, hor = Hh - 28, X = (az) => W / 2 + (wrap(az - mid) / 360) * (W - 16),          // 方位角顺时针变大：面朝哪边，往右手边都是方位角变大（面朝南，西在右；面朝北，东在右）
       Y = (alt) => hor - (alt / 90) * (hor - top) * 1.15;
    g.clearRect(0, 0, W, Hh);
    g.strokeStyle = 'rgba(214,177,110,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, hor + 0.5); g.lineTo(W - 4, hor + 0.5); g.stroke();
    g.font = '10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(167,178,200,0.9)';
    const back = mid === 180 ? '北' : '南';
    for (const [n, az] of [['东', 90], ['南', 180], ['西', 270], ['北', 0]]) { if (n === back) continue; g.fillText(n, X(az), hor + 12); g.fillRect(X(az) - 0.5, hor - 2, 1, 4); }
    g.textAlign = 'left'; g.fillText(back, 2, hor + 12); g.textAlign = 'right'; g.fillText(back, W - 2, hor + 12); g.textAlign = 'center';          // 背后那个方向在两头
    g.strokeStyle = 'rgba(241,215,159,0.85)'; g.lineWidth = 1.3; g.beginPath();
    let pen = false, lx = null;
    for (let hh = -180; hh <= 180; hh += 1.5) { const p = sunAt(cty.lat, dec, hh), x = X(p.az); if (p.alt < 0 || (lx != null && Math.abs(x - lx) > W / 2)) { pen = false; lx = p.alt < 0 ? null : x; if (p.alt < 0) continue; } if (!pen) { g.moveTo(x, Y(p.alt)); pen = true; } else g.lineTo(x, Y(p.alt)); lx = x; }          // 极昼时太阳绕到背后：在两头断开
    g.stroke();
    g.fillStyle = 'rgba(241,215,159,0.95)';
    if (noonP.alt > 0) g.fillText(`正午 ${noonP.alt.toFixed(1)}°`, X(noonP.az), Math.max(10, Y(noonP.alt) - 5));
    const half = (t.set - t.rise) * 7.5, rp = sunAt(cty.lat, dec, -half), sp = sunAt(cty.lat, dec, half);
    g.fillStyle = 'rgba(167,178,200,0.95)';          // 日出、日落写在下面一行，左右两头（不压住弧的两端）
    g.textAlign = 'left'; g.fillText(`日出 ${hm(t.rise)}`, 4, hor + 25);
    g.textAlign = 'right'; g.fillText(`日落 ${hm(t.set)}`, W - 4, hor + 25);
    g.fillStyle = 'rgba(241,215,159,0.7)'; for (const q of [rp, sp]) g.fillRect(X(q.az) - 1.5, hor - 1.5, 3, 3);
    const p = sunAt(cty.lat, dec, H);
    {
      const x = X(p.az), y = p.alt >= 0 ? Y(p.alt) : hor + 1;
      g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2);
      if (p.alt >= 0) { g.fillStyle = '#ffd77a'; g.shadowColor = 'rgba(255,210,120,0.95)'; g.shadowBlur = 10; g.fill(); g.shadowBlur = 0; }
      else { g.strokeStyle = 'rgba(255,215,122,0.7)'; g.lineWidth = 1.2; g.stroke(); }
    }
  }

  /** 拖铜版上的小太阳：直射点拖到 (lat, lon)。纬度定日子（在这半年里找直射点纬度一样的那天：冬至到夏至直射点往北移、夏至到冬至往南移），经度定时刻（直射点每小时往西 15°） */
  function setFromSun(lat, lon) {
    live = false;
    const y = bj(sim).getUTCFullYear(), base = Date.UTC(y, 0, 1) - 8 * 3600000;          // 北京时间这一年的 1 月 1 日 0 点
    if (decYear !== y) { decYear = y; decs = []; for (let d = 0; d <= 366; d++) decs.push(subsolar(new Date(base + d * 86400000 + 12 * 3600000)).lat); }
    lat = Math.max(-TROPIC, Math.min(TROPIC, lat));
    const today = Math.max(0, Math.min(365, Math.floor((sim - base) / 86400000))), north = decs[today + 1] >= decs[today];
    let best = today, bd = 1e9;
    for (let d = 0; d < 366; d++) { if ((decs[d + 1] >= decs[d]) !== north) continue; const e = Math.abs(decs[d] - lat); if (e < bd) { bd = e; best = d; } }
    const tod = ((sim - base) % 86400000 + 86400000) % 86400000;
    sim = base + best * 86400000 + tod;
    sim += (wrap(subsolar(new Date(sim)).lon - lon) / 15) * 3600000;
    apply();
  }

  let acc = 0;
  apply();
  return {
    el,
    get city() { return city; },
    get live() { return live; },
    get sim() { return sim; },
    setFromSun,
    onChange(f) { listeners.add(f); f({ city, sub: earth.sub, live, sim }); },
    focus(on) { el.classList.toggle('focus', on); },
    show(on) { el.classList.toggle('hidden', !on); },
    update(dt) { if (!live) return; acc += dt; if (acc < 1) return; acc = 0; sim = Date.now(); apply(); },          // 跟着现在走：每秒算一次
  };
}
