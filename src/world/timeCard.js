// 地理世界右下角的“现在这一刻”：地球上的太阳照在哪个时刻（默认就是现在，跟着走），拖日期、拖时刻看晨昏线扫过去、直射点在回归线之间来回。
// 下面是“你在这里”：选一座城（记住），今天的昼长、此刻太阳多高，再画一条“在这座城看天空”的小条：今天太阳从哪升起、正午多高、从哪落下，现在在哪。
// 地球、这张卡、这条天空用的是同一个时刻（照 Bartosz《Earth and Sun》：同一个地点、同一个时刻，同时驱动太空里的地球和地面上的天空）。
// 时间都按北京时间显示；日出日落也是北京时间（乌鲁木齐的太阳比北京晚两个多小时才出来，就看得见）。不计大气折射，和课本算昼长的办法一样。
import { h } from '../ui/Panel.js';

const D2R = Math.PI / 180;
export const CITIES = [
  ['北京', 39.9, 116.4], ['天津', 39.13, 117.2], ['上海', 31.23, 121.47], ['重庆', 29.56, 106.55], ['石家庄', 38.04, 114.51], ['太原', 37.87, 112.55],
  ['呼和浩特', 40.84, 111.75], ['沈阳', 41.8, 123.43], ['长春', 43.82, 125.32], ['哈尔滨', 45.8, 126.53], ['南京', 32.06, 118.8], ['杭州', 30.27, 120.15],
  ['合肥', 31.82, 117.23], ['福州', 26.07, 119.3], ['南昌', 28.68, 115.86], ['济南', 36.65, 117.12], ['郑州', 34.75, 113.62], ['武汉', 30.59, 114.31],
  ['长沙', 28.23, 112.94], ['广州', 23.13, 113.26], ['南宁', 22.82, 108.37], ['海口', 20.04, 110.32], ['成都', 30.57, 104.07], ['贵阳', 26.65, 106.63],
  ['昆明', 25.04, 102.71], ['拉萨', 29.65, 91.13], ['西安', 34.34, 108.94], ['兰州', 36.06, 103.83], ['西宁', 36.62, 101.78], ['银川', 38.49, 106.23],
  ['乌鲁木齐', 43.83, 87.62], ['台北', 25.03, 121.57], ['香港', 22.32, 114.17], ['澳门', 22.2, 113.55],
].map(([name, lat, lon]) => ({ name, lat, lon }));
const KEY = 'livebook.city';
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
  const year = () => bj(sim).getUTCFullYear();
  const days = () => (year() % 4 === 0 && (year() % 100 !== 0 || year() % 400 === 0) ? 366 : 365);
  const dayOf = () => Math.floor((bj(sim).getTime() - Date.UTC(year(), 0, 1)) / 86400000);
  const minOf = () => { const b = bj(sim); return b.getUTCHours() * 60 + b.getUTCMinutes(); };
  const setSim = (day, min) => { live = false; sim = Date.UTC(year(), 0, 1) + day * 86400000 + (min - 480) * 60000; apply(); };

  const nowBtn = h('button', { class: 'gt-now', onclick: () => { live = true; sim = Date.now(); apply(); } }, '回到现在');
  const when = h('div', { class: 'gt-when' });
  const dateIn = h('input', { type: 'range', min: 0, max: 365, step: 1, oninput: () => setSim(+dateIn.value, minOf()) });
  const timeIn = h('input', { type: 'range', min: 0, max: 1439, step: 5, oninput: () => setSim(dayOf(), +timeIn.value) });
  const marks = h('div', { class: 'gt-marks' }, ...[['春分', 79], ['夏至', 171], ['秋分', 265], ['冬至', 355]].map(([n, d]) => h('span', { style: `left:${(d / 365) * 100}%`, onclick: () => setSim(d, minOf()) }, n)));          // 二分二至（每年差一两天，这里取常见的日子）
  const sub = h('div', { class: 'gt-sub' });
  const sel = h('select', { onchange: () => { city = CITIES[+sel.value]; localStorage.setItem(KEY, city.name); apply(); } }, ...CITIES.map((c, i) => h('option', { value: i }, c.name)));
  sel.value = String(CITIES.indexOf(city));
  const here = h('div', { class: 'gt-here' });
  const sky = h('canvas', { class: 'gt-sky', width: 268, height: 90 });
  const el = h('div', { class: 'geo-time' },
    h('div', { class: 'gt-head' }, h('b', {}, '现在这一刻'), nowBtn), when,
    h('label', { class: 'gt-row' }, h('span', {}, '日期'), h('div', { class: 'gt-track' }, dateIn, marks)),
    h('label', { class: 'gt-row' }, h('span', {}, '时刻'), h('div', { class: 'gt-track' }, timeIn)),
    sub,
    h('div', { class: 'gt-city' }, h('span', {}, '你在'), sel, here),
    sky,
    h('small', { class: 'gt-src' }, '夜间灯光：NASA 2016 年卫星合成 · 云是示意'));
  document.body.append(el);

  let last = '';
  function apply() {
    const s = earth.setTime(new Date(sim)), b = bj(sim);
    const H = wrap(city.lon - s.lon), now = sunAt(city.lat, s.lat, H), len = dayLength(city.lat, s.lat);
    const noonIn = wrap(s.lon - city.lon) / 15;          // 再过几小时到正午（直射点每小时往西 15°）
    const tNow = b.getUTCHours() + b.getUTCMinutes() / 60, noon = tNow + noonIn, rise = noon - len / 2, set = noon + len / 2;
    const key = `${Math.floor(sim / 60000)}|${city.name}`;
    nowBtn.hidden = live;
    if (key === last) return; last = key;
    when.textContent = `${b.getUTCMonth() + 1} 月 ${b.getUTCDate()} 日 周${'日一二三四五六'[b.getUTCDay()]} · 北京时间 ${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`;
    dateIn.max = days() - 1; dateIn.value = dayOf(); timeIn.value = minOf();
    sub.textContent = `太阳直射 ${latText(s.lat)}`;
    here.textContent = `昼长 ${Math.floor(len)} 小时 ${pad(Math.round((len % 1) * 60))} 分 · 太阳高度 ${now.alt >= 0 ? '' : '−'}${Math.abs(now.alt).toFixed(0)}°${now.alt < 0 ? '（在地平线下）' : ''}`;
    drawSky(sky, city, s.lat, H, { rise, set, noon });
    for (const f of listeners) f({ city, sub: s, live });
  }

  /** 在这座城看天空：横轴是方位（东北—东—南—西—西北），竖轴是高度；今天太阳走的那条弧、正午多高、日出日落，现在在哪 */
  function drawSky(c, cty, dec, H, t) {
    const g = c.getContext('2d'), W = c.width, Hh = c.height, top = 6, hor = Hh - 18, X = (az) => 8 + ((az - 45) / 270) * (W - 16), Y = (alt) => hor - (alt / 90) * (hor - top);
    const sunNow = sunAt(cty.lat, dec, H), day = sunNow.alt > 0, dusk = sunNow.alt > -6;
    g.clearRect(0, 0, W, Hh);
    const sk = g.createLinearGradient(0, top, 0, hor); sk.addColorStop(0, day ? '#9cc4ea' : dusk ? '#3b4d78' : '#141d36'); sk.addColorStop(1, day ? '#e4f0fa' : dusk ? '#e3a27a' : '#26304f');
    g.fillStyle = sk; g.fillRect(0, top, W, hor - top);
    g.fillStyle = '#6b6152'; g.fillRect(0, hor, W, Hh - hor);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, hor + 0.5); g.lineTo(W, hor + 0.5); g.stroke();
    // 今天太阳走的弧（地平线以上那一段）
    g.strokeStyle = day ? 'rgba(255,190,80,0.95)' : 'rgba(255,200,120,0.55)'; g.lineWidth = 1.6; g.setLineDash([]); g.beginPath();
    let pen = false;
    for (let hh = -180; hh <= 180; hh += 1.5) { const p = sunAt(cty.lat, dec, hh); if (p.alt < 0 || p.az < 45 || p.az > 315) { pen = false; continue; } if (!pen) { g.moveTo(X(p.az), Y(p.alt)); pen = true; } else g.lineTo(X(p.az), Y(p.alt)); }
    g.stroke();
    const noonP = sunAt(cty.lat, dec, 0);
    g.font = '10.5px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = day ? '#3a3326' : '#f1e6d2';
    if (noonP.alt > 0) g.fillText(`正午 ${noonP.alt.toFixed(1)}°`, X(noonP.az), Math.max(top + 10, Y(noonP.alt) - 6));
    // 东、南、西
    g.fillStyle = '#f4ecdc'; g.font = '11px system-ui, sans-serif';
    for (const [n, az] of [['东', 90], ['南', 180], ['西', 270]]) g.fillText(n, X(az), hor + 13);
    // 日出、日落：写在弧的两头、地平线上面
    g.font = '10px system-ui, sans-serif'; g.fillStyle = day ? '#4a3f2e' : '#f1e6d2';
    const rp = sunAt(cty.lat, dec, -(t.set - t.rise) * 7.5), sp = sunAt(cty.lat, dec, (t.set - t.rise) * 7.5);
    g.textAlign = 'left'; g.fillText(`日出 ${hm(t.rise)}`, Math.max(2, X(rp.az) - 6), hor - 4);
    g.textAlign = 'right'; g.fillText(`日落 ${hm(t.set)}`, Math.min(W - 2, X(sp.az) + 6), hor - 4);
    // 现在的太阳
    if (sunNow.az >= 45 && sunNow.az <= 315) {
      const x = X(sunNow.az), y = sunNow.alt >= 0 ? Y(sunNow.alt) : hor + 6;
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2);
      if (sunNow.alt >= 0) { g.fillStyle = '#ffcf5a'; g.shadowColor = 'rgba(255,200,80,0.9)'; g.shadowBlur = 10; g.fill(); g.shadowBlur = 0; }
      else { g.strokeStyle = 'rgba(255,207,90,0.8)'; g.lineWidth = 1.2; g.stroke(); }
    }
  }

  let acc = 0;
  apply();
  return {
    el,
    get city() { return city; },
    get live() { return live; },
    onChange(f) { listeners.add(f); f({ city, sub: earth.sub, live }); },
    focus(on) { el.classList.toggle('focus', on); },
    show(on) { el.classList.toggle('hidden', !on); },
    update(dt) { if (!live) return; acc += dt; if (acc < 1) return; acc = 0; sim = Date.now(); apply(); },          // 跟着现在走：每秒算一次
  };
}
