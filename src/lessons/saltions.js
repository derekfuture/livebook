import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { clamp, draggable, rayToLocal } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, think, wrapPointer } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { bench, ionScene, V, WATER_LEVEL, CUP, R, H, PAN, FILTER, RECEIVER, DISH, DY, MAT, STRIP, NAMES, PH_COLORS } from './kit/saltions-parts.js';

const INTRO = '用药匙把粗盐放到已去皮的天平上称量。';
const GROUPS = [
  '溶解粗盐',
  '沉淀硫酸根',
  '检验硫酸根',
  '沉淀镁、钙和钡',
  '检验上层清液',
  '静置过滤',
  '调节酸碱性',
  '蒸发结晶',
  '夹持冷却',
];
// Each target is the actual working end in bench coordinates.
const mouth = (x) => V(x, H + 0.005);
const wall = () => mouth(CUP + R - 0.003);
const capOff = V(DISH - 0.048, 0.015 * 0.75, 0.053);
const wick = V(DISH, 0.016 + 0.072 * 0.75);
const wet = (x, y) => V(x, y, 0.012);
const phases = {
  weigh: [0, 'spoon', '用药匙把粗盐移到称量纸上，观察天平示数，称取 5.0 g。', V(PAN, 0.029, 0.011)],
  salt: [0, 'paper', '看天平示数，再提起称量纸，把粗盐倒进烧杯。', mouth(CUP)],
  water: [0, 'water', '平视量筒，凹液面最低点对应多少毫升？读数后，将水倒入 100 mL 烧杯。', mouth(CUP)],
  insert: [0, 'rod', '把玻璃棒下端伸进烧杯的水里。', wet(CUP - 0.012, 0.01)],
  mix: [0, 'rod', '在杯底左右移动玻璃棒，搅拌至盐粒溶解。', wet(CUP + 0.012, 0.01)],
  ba: [1, 'ba', '把 BaCl₂ 滴管提到杯口中央，滴加 2～3 mL 后静置。', mouth(CUP)],
  baTest: [2, 'ba', '待沉淀沉下，提起 BaCl₂ 滴管，沿杯壁向上层清液再滴 2～3 滴。', wall()],
  oh: [3, 'oh', '把 NaOH 滴管移到杯口，滴加约 0.25 mL 溶液。', mouth(CUP)],
  co: [3, 'co', '把 Na₂CO₃ 滴管移到杯口，滴加 2～3 mL 饱和溶液。', mouth(CUP)],
  ohTest: [4, 'oh', '静置后，提起 NaOH 滴管，沿杯壁检验上层清液。', wall()],
  coTest: [4, 'co', '再用 Na₂CO₃ 滴管沿杯壁检验上层清液。', wall()],
  guide: [5, 'rod', '把玻璃棒下端斜靠在漏斗的三层滤纸一侧。', wet(FILTER + 0.012, 0.114)],
  filter: [5, 'cup', '提起粗盐水烧杯，让杯嘴靠在玻璃棒上，沿棒过滤。', wet(FILTER + 0.023, 0.147)],
  acid: [6, 'acid', '把盐酸滴管移到滤液上方，逐滴加入盐酸。', V(RECEIVER, 0.076)],
  acidRod: [6, 'rod', '把玻璃棒伸进接滤液的烧杯。', wet(RECEIVER - 0.012, 0.027)],
  acidMix: [6, 'rod', '在滤液中左右移动玻璃棒，观察气泡。', wet(RECEIVER + 0.012, 0.027)],
  sample: [6, 'rod', '用玻璃棒蘸取滤液，检验酸碱性。', wet(RECEIVER, 0.026)],
  ph: [6, 'rod', '将棒端的滤液点在右侧 pH 试纸上，观察颜色。', wet(STRIP - 0.006, 0.0035)],
  pour: [7, 'filtrate', '提起滤液烧杯，把杯嘴移到蒸发皿上方，倒入滤液。', V(DISH, DY + 0.026)],
  light: [7, 'cap', '点燃蒸发皿下的酒精灯。'],
  heatRod: [7, 'rod', '把玻璃棒下端伸进蒸发皿。', wet(DISH - 0.012, DY + 0.012)],
  heatMix: [7, 'rod', '在皿中来回搅拌。看到较多固体时，用灯帽盖灭酒精灯。', wet(DISH + 0.012, DY + 0.012)],
  stop: [7, 'cap', '皿中已出现较多固体，把灯帽移到灯芯上盖灭酒精灯，利用余热蒸干。', wick],
  grip: [8, 'tongs', '待余热蒸干后，将坩埚钳的钳口移到蒸发皿右缘。', V(DISH + 0.031, DY + 0.019, 0.013)],
  cool: [8, 'tongs', '用坩埚钳将蒸发皿轻放在左侧陶土网上冷却。', V(MAT + 0.031, 0.025, 0.013)],
};
const STOP_AT = 0.62;
const waterCheck = '凹液面最低点在 20 mL 刻度，与教材用量相符。';
const keys = Object.keys(phases);
const idx = (k) => keys.indexOf(k);
const MICRO_CAM = [[CUP, 0.141, 0], [0.015, 0.55, 1], 0.32];
const NOTE =
  '依据必修第二册第 29 页实验活动 4。BaCl₂ 溶液为 0.1 mol/L，NaOH 溶液为 20%，Na₂CO₃ 溶液饱和，盐酸为 6 mol/L。杯口中央代表按课本用量分批滴加，杯壁处代表沿壁滴加少量。滴液、静置、过滤和蒸发时间均压缩。杂质含量、沉淀量、试纸颜色和粒子运动为示意。每次加酸按示意的相对用量消耗剩余的碱和碳酸盐，试纸只表示酸碱性。实际操作中，观察气泡并用试纸判断终点。微观画面追踪一组离子并入固体的过程，离子排列为局部示意。';

export default {
  id: 'saltions',
  fig: '实验活动4',
  title: '用化学沉淀法去除粗盐中的杂质离子',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '加过量 BaCl₂ 后，硫酸根沉淀完全了。多出来的 Ba²⁺ 会在哪一步被除去？',
    options: ['和 BaSO₄ 一起直接被滤纸截住', '加入 Na₂CO₃ 后进入沉淀，再被滤纸截住', '加入盐酸后随气泡逸出'],
    answer: 1,
    hint: '第 29 页 · 先猜一猜，再追踪这一份钡离子。',
  },
  need: '检验杂质离子沉淀完全，过滤并调节滤液的酸碱性，再蒸发、冷却。',
  conclusion: {
    crops: [
      { page: 33, rect: [104, 623, 320.3, 639] },
      { page: 33, rect: [320.2, 623, 476, 639] },
    ],
    quote: '用坩埚钳将蒸发皿夹持到陶土网上冷却，得到去除了杂质离子的精盐。',
    formula: 'Ba²⁺ + CO₃²⁻ → BaCO₃↓',
    why: '过量 BaCl₂ 使硫酸根沉淀完全。后加的 Na₂CO₃ 使钙离子和剩余的钡离子进入沉淀。滤纸截留这些固体，滤液中的过量碱和碳酸盐再用盐酸除去。',
    src: '人教版化学必修第二册 · 第 29 页 · 实验活动 4',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(),
      group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.44, d: 0.235, z: 0.01 });
    const B = bench(group),
      T = B.tools;
    T.cap = { g: B.capper.cap, pick: B.capper.cap, home: capOff };
    B.capper.cap.name = '灯帽';
    T.rod.home.set(0.079, 0.003, 0.012);
    T.cup.home.z = T.rod.home.z;
    T.filtrate.g.userData.ringY = 0.031;
    T.lamp.g.userData.ringY = 0.039;
    const fresh = () => ({
      phase: 'weigh',
      demo: false,
      events: [],
      pos: Object.fromEntries(Object.entries(T).map(([id, t]) => [id, t.home.clone()])),
      returns: {},
      hand: '',
      rodDock: null,
      stir: 0,
      weighed: false,
      salted: false,
      watered: false,
      mixed: false,
      sulfate: false,
      mg: false,
      ca: false,
      freeBa: false,
      hydroxide: 0,
      carbonate: 0,
      bicarbonate: 0,
      acidExcess: 0,
      filtrateBase: null,
      retry: null,
      smallBa: false,
      carbonateFirst: false,
      cloud: 0,
      gas: 0,
      effect: null,
      filtered: false,
      filterDocked: false,
      transferred: 0,
      collected: 0,
      filterClear: 0,
      stained: '',
      sampled: false,
      filled: false,
      lit: false,
      stillTime: 0,
      stirSide: 0,
      passes: 0,
      splashed: false,
      heatingTime: 0,
      evaporation: 0,
      cooling: 0,
      gripped: false,
      landed: false,
    });
    let S = fresh(),
      W,
      bar,
      saved = null;
    const scene = ionScene();
    const mic = micro({
      tag,
      look,
      back,
      group,
      scene,
      at: () => V(CUP, 0.084),
      btnAt: () => V(CUP, 0.035, R),
      dist: MICRO_CAM[2],
      lookD: MICRO_CAM[1],
      scale: 0.012,
      label: '钻进粗盐水烧杯里看',
      state: () => ({ events: S.events }),
      show: () => S.events.length > 0 && inside('ba', 'guide') && !S.effect && !S.hand,
      bar: () => bar,
    });
    let reading = false;
    function readScale() {
      reading = true;
      look([0.112, T.water.home.y - B.cylinder.h + WATER_LEVEL, 0], [0, 0, 1], 0.093, () => { reading = false; });
    }
    function closeScale() {
      reading = false;
      back();
    }
    const scaleButton = tag('近看量筒刻度', 'pill mw-go', () => {
      if (!reading) return readScale();
      closeScale();
      if (S.phase === 'water') status(waterCheck);
    });
    function nameplate(obj, x, y, z, label) {
      const plate = tag('', 'saltions-name').loc(obj, x, y, z);
      return () => plate.text(typeof label === 'function' ? label() : label).show(!mic.isOpen && !reading);
    }
    const plates = [
      nameplate(B.balance, -0.026, 0.009, 0.04, '天平'),
      nameplate(T.paper.g, 0, 0.004, -0.018, () => S.weighed && !S.salted ? '称量纸 · 粗盐' : '称量纸'),
      nameplate(T.spoon.g, 0.025, 0.002, 0.025, () => S.weighed ? '药匙' : '药匙 · 粗盐'),
      nameplate(B.cylinder, 0, 0.001, 0.020, () => level('water') ? '量筒 · 蒸馏水' : '量筒'),
      nameplate(B.bowl, 0, 0.014, R + 0.001, () => S.transferred === 1 ? '烧杯' : S.mixed ? '烧杯 · 粗盐水' : S.salted || progress('paper') ? '烧杯 · 粗盐' : '烧杯'),
      nameplate(T.rod.g, -0.006, 0.048, 0.009, '玻璃棒'),
      ...Object.entries(NAMES).map(([id, name]) => nameplate(T[id].g, 0, 0.068, 0, '<span class="saltions-dropper">胶头滴管</span><span class="saltions-sep"> · </span>' + name)),
      nameplate(B.funnel, 0, 0.016, 0.024, () => S.transferred ? '漏斗 · 滤纸和滤渣' : '漏斗 · 滤纸'),
      nameplate(B.fs, 0.004, 0.010, 0.037, '铁架台'),
      nameplate(B.receiver, 0, 0.01, R + 0.001, () => level('filtrate') ? '烧杯 · 滤液' : '接滤液烧杯'),
      nameplate(B.strip, 0, 0.004, -0.012, 'pH 试纸'),
      nameplate(B.dish, 0.003, 0.010, 0.030, () => S.retry === 'heat' ? '蒸发皿 · 固体' : S.evaporation >= 0.999 ? '蒸发皿 · 精盐' : S.filled || progress('filtrate') ? '蒸发皿 · 滤液' : '蒸发皿'),
      nameplate(B.heater, -0.032, 0.015, 0.027, '铁架台'),
      nameplate(T.lamp.g, 0, 0.015, 0.041, '酒精灯'),
      nameplate(B.capper.cap, 0, 0.014, 0.008, '灯帽'),
      nameplate(T.tongs.g, 0.044, 0.004, 0.018, '坩埚钳'),
      nameplate(B.mat, 0, 0.003, 0.045, '陶土网'),
    ];
    const overlays = document.querySelectorAll('.mw'),
      overlay = overlays[overlays.length - 1];
    overlay.classList.add('saltions-micro');
    const hud = overlay.querySelector('.mw-hud');
    const pause = h(
      'button',
      {
        class: 'lb-pause',
        onclick: () => {
          scene.paused = !scene.paused;
          pause.textContent = scene.paused ? '继续' : '暂停';
        },
      },
      '暂停',
    );
    const replay = h(
      'button',
      {
        class: 'lb-exit',
        onclick: () => {
          scene.time = 0;
          scene.paused = false;
          pause.textContent = '暂停';
        },
      },
      '重看',
    );
    const playback = h('div', { class: 'saltions-playback' }, pause, replay);
    hud.append(playback);
    const style = h(
      'style',
      {},
      `
      .lbar[data-saltions].film .lb-steps i{display:none}
      .lbar[data-saltions].film .lb-steps i.cur{display:block;width:auto;border:0;background:transparent;color:inherit}
      .lbar[data-saltions].film .lb-steps{gap:0;align-items:center}
      .lbar[data-saltions].film .lb-steps::after{content:"/" attr(data-total);font-size:12px}
      .lbar[data-saltions].film .lb-n{display:none}
      body.predicting .tag3d.saltions-name{visibility:visible!important}
      .tag3d.saltions-name{border-radius:2px;background:#fffbf1ed;padding:2px 5px;color:#3f4949;font:500 clamp(10px,.92vw,14px)/1.15 var(--sans);text-shadow:none}
      .saltions-playback{display:flex;gap:8px;justify-content:center;margin-top:8px;pointer-events:auto}
      .saltions-playback button{display:inline-block;background:#fffaf1;color:#384952;border:1px solid #aca9a1;border-radius:5px;padding:2px 9px}
      @media(max-width:760px){
        .lbar[data-saltions].do{flex-wrap:wrap;row-gap:3px;padding:5px 9px}
        .lbar[data-saltions].do .lb-main{flex:1 1 calc(100% - 40px)}
        .lbar[data-saltions].do .lb-steps{flex:1;max-width:none;gap:2px}
        .lbar[data-saltions].do .lb-steps i{width:15px;height:15px;line-height:13px;font-size:10px}
        .lbar[data-saltions].do .lb-steps i.done{font-size:0}
        .lbar[data-saltions].do .lb-steps i.done::after{line-height:13px}
        .tag3d.saltions-name{text-align:center;padding:1px 2px}
        .saltions-dropper{display:block}
        .saltions-sep{display:none}
      }
      @media(max-width:760px){.lbar[data-saltions].film{bottom:max(12px,env(safe-area-inset-bottom))}.saltions-micro .mw-hud{left:10px!important;width:calc(100% - 20px)!important;top:52vh!important;background:#fffcf4;padding:8px;box-sizing:border-box}}
    `,
    );
    document.head.append(style);
    const card = tag('', 'cond');
    const stage = () => idx(S.phase);
    const inside = (lo, hi) => stage() >= idx(lo) && stage() <= idx(hi);
    const record = (a, b) => {
      if (!S.demo) W.tbl.add([a, b]);
    };
    const status = (m) => {
      if (!S.demo) W.ui.status(m);
    };
    function instruct(message) {
      if (S.demo) return;
      bar.say(message);
      status(message);
    }
    function go(p) {
      const old = phases[S.phase][0],
        next = phases[p]?.[0] ?? 9;
      S.phase = p;
      if (p === 'ph') S.stained = '';
      if (!S.demo) {
        if (next > old) bar.done('s' + old);
        if (next < old) bar.undo(...GROUPS.slice(next, old + 1).map((_, i) => 's' + (next + i)));
        const instruction = S.lit && S.evaporation >= STOP_AT ? phases.stop[2] : phases[p]?.[2];
        bar.say(instruction || null);
        status(instruction || '蒸发皿已在陶土网上冷却。');
      }
    }
    function logEvent(kind) {
      S.events.push({ kind, spare: S.freeBa });
    }
    function returning(id, to = T[id].home) {
      S.returns[id] = { from: S.pos[id].clone(), to: to.clone(), t: 0 };
    }
    function enable(id) {
      if (S.phase === 'end' || mic.isOpen || S.effect || reading) return false;
      if (S.retry) return id === 'cap' && S.lit;
      if (phases[S.phase][1] === id) return true;
      if (id === 'acid' && inside('guide', 'filter')) return S.transferred === 0;
      if (id === 'acid' && S.phase === 'sample') return true;
      if (id === 'oh' && S.phase === 'ba' && !S.mg) return true;
      if (id === 'co' && S.phase === 'ba' && S.mg && !S.carbonateFirst) return true;
      if (id === 'rod' && S.phase === 'acid') return true;
      if (id === 'cap' && S.lit) return true;
      return false;
    }
    const toolNames = {
      spoon: '药匙',
      paper: '称量纸',
      water: '量筒',
      rod: '玻璃棒',
      cup: '粗盐水烧杯',
      filtrate: '滤液烧杯',
      cap: '灯帽',
      tongs: '坩埚钳',
      ...NAMES,
    };
    function hint(id) {
      if (!enable(id)) return '';
      if (id === 'acid' && inside('guide', 'filter')) return '盐酸也可以滴入未过滤的粗盐水，观察沉淀。';
      if (id === 'co' && S.phase === 'ba') return '也可以先加碳酸钠，再试着检验硫酸根。';
      if (id === 'rod' && S.phase === 'acid') return '用玻璃棒蘸滤液，先检验此时的酸碱性。';
      if (id === 'oh' && S.phase === 'ba') return '也可以先加 NaOH 沉淀镁离子。';
      return id === 'cap'
        ? S.lit
          ? '拖动灯帽，盖住灯芯'
          : '点燃酒精灯'
        : toolNames[id] + ' · ' + (id === 'rod' && S.sampled ? '点样到 pH 试纸' : '按住拖动');
    }
    function transfer(id, p, count = 0, batches = 1) {
      const interval = batches > 1 ? 0.16 : 0.30;
      const burst = count * interval;
      const cycle = burst + 0.34;
      const dur = count ? (batches - 1) * cycle + burst : id === 'paper' || id === 'spoon' ? 0.38 : 1.05;
      S.effect = { id, p: p.clone(), count, batches, interval, burst, cycle, dur, t: 0 };
    }
    const testingClearLiquid = () => ['baTest', 'ohTest', 'coTest'].includes(S.phase);
    function carbonate() {
      const trapsBa = S.freeBa;
      S.ca = true;
      logEvent('calcium');
      if (S.freeBa) {
        logEvent('barium');
        S.freeBa = false;
      }
      S.carbonate = 2.5;
      S.cloud = 1;
      record(
        '加饱和 Na₂CO₃',
        trapsBa ? '出现白色沉淀，Ca²⁺ 和 Ba²⁺ 进入碳酸盐沉淀。' : '出现白色 CaCO₃ 沉淀，溶液中还有多余的碳酸根。',
      );
      if (trapsBa && !S.demo) W.ui.observePrediction('加 Na₂CO₃ 后，过量 Ba²⁺ 进入 BaCO₃ 沉淀。');
    }
    function addReagent(id, p) {
      const beforeFilter = inside('ba', 'filter');
      const cx = beforeFilter ? CUP : RECEIVER,
        rim = beforeFilter ? H : 0.071;
      const dx = Math.abs(p.x - cx);
      if (dx > R + 0.001 || p.y < rim - 0.001 || p.y > rim + 0.017) return false;
      const edge = dx > R * 0.63;
      const testing = testingClearLiquid();
      if (testing && (!edge || S.cloud > 0.1)) {
        status(!edge ? '要检验上层清液，把滴管尖移到杯壁上方。' : '上层仍浑浊。等沉淀沉下，再沿杯壁检验。');
        return false;
      }
      if (id === 'ba' && S.phase === 'ba' && edge && S.smallBa && !S.carbonateFirst) {
        status('把滴管移到杯口中央，按课本用量继续加 BaCl₂。');
        return false;
      }
      if (id === 'acid') transfer(id, p, 1);
      else if (testing || edge) transfer(id, p, 3);
      else if (id === 'oh') transfer(id, p, 5);
      else transfer(id, p, 5, 3);
      return true;
    }
    function react(id, p) {
      const beforeFilter = inside('ba', 'filter');
      const edge = Math.abs(p.x - CUP) > R * 0.63;
      const testing = testingClearLiquid();
      if (id === 'acid' && beforeFilter) {
        S.gas = 1;
        S.cloud = 0;
        S.ca = false;
        S.mg = false;
        S.carbonate = 0;
        S.hydroxide = 0;
        S.freeBa = true;
        record('过滤前加盐酸', '冒出气泡，部分白色沉淀溶解，BaSO₄ 留下。');
        S.rodDock = null;
        returning('rod');
        go('oh');
        status('碳酸盐和氢氧化镁遇酸溶解，钙、钡、镁回到溶液。重新加 NaOH、Na₂CO₃ 并检验，再过滤。');
        return true;
      }
      if (id === 'ba' && S.carbonateFirst) {
        S.cloud = 1;
        logEvent('competing');
        if (S.phase === 'ba') go('baTest');
        record('碳酸钠后加 BaCl₂', '出现白色浑浊，碳酸根干扰硫酸根的检验。');
        status('Ba²⁺ 与 CO₃²⁻ 也会生成白色沉淀，仅凭浑浊无法判断硫酸根是否除尽。可在更多中全部重来，先检验硫酸根。');
        return true;
      }
      if (id === 'ba' && S.phase === 'ba') {
        if (edge && !S.smallBa) {
          S.smallBa = true;
          S.cloud = 1;
          logEvent('sulfate');
          go('baTest');
          record('先沿壁滴几滴 BaCl₂', '滴入处出现白色浑浊。');
          status('先静置，再沿杯壁加几滴 BaCl₂，检查上层清液。');
          return true;
        }
        S.sulfate = true;
        S.freeBa = true;
        S.cloud = 1;
        logEvent('sulfate');
        record('加过量 BaCl₂', '生成白色 BaSO₄ 沉淀。');
        go('baTest');
        return true;
      }
      if (testing) {
        if (id === 'ba' && !S.sulfate) {
          S.cloud = 1;
          logEvent('sulfate');
          go('ba');
          record('少量加药后检验', '上层又出现白色浑浊，硫酸根尚未沉淀完全。');
          status('上层又出现白色浑浊。把滴管移到杯口中央补加 BaCl₂，静置后再次检验。');
          return true;
        }
        record('沿壁滴 ' + NAMES[id], '上层清液没有出现新的浑浊。');
        go(S.phase === 'baTest' ? (S.mg ? 'co' : 'oh') : S.phase === 'ohTest' ? 'coTest' : 'guide');
        return true;
      }
      if (id === 'oh') {
        S.mg = true;
        S.hydroxide = 1;
        S.cloud = 1;
        logEvent('magnesium');
        record('加 NaOH', '出现白色 Mg(OH)₂ 沉淀。');
        if (S.phase === 'oh') go('co');
        return true;
      }
      if (id === 'co') {
        carbonate();
        if (S.phase === 'ba') {
          S.carbonateFirst = true;
          status('杯里已有过量碳酸根。再加 BaCl₂，观察上层清液。');
        } else go('ohTest');
        return true;
      }
      if (id === 'acid') acidInFiltrate();
    }
    function acidInFiltrate() {
      // Relative equivalents per addition. Acid neutralizes OH−, converts
      // carbonate to bicarbonate, then liberates CO₂ from bicarbonate.
      let acid = 2;
      const oh = Math.min(acid, S.hydroxide);
      S.hydroxide -= oh;
      acid -= oh;
      const co = Math.min(acid, S.carbonate);
      S.carbonate -= co;
      S.bicarbonate += co;
      acid -= co;
      const gas = Math.min(acid, S.bicarbonate);
      S.bicarbonate -= gas;
      S.acidExcess += acid - gas;
      if (gas) S.gas = Math.min(1, 0.55 + gas * 0.3);
      record('向滤液滴盐酸', gas ? '有气泡冒出液面。' : '这次滴加没有产生气泡。');
      go('acidRod');
    }
    const close = (p, q, dx, dy) => Math.abs(p.x - q.x) <= dx && Math.abs(p.y - q.y) <= dy && Math.abs(p.z - q.z) < 0.022;
    const rodSlope = Math.tan(0.31);
    function onGuide(p) {
      if (!S.rodDock) return false;
      const height = p.y - S.rodDock.y;
      return height > 0.019 && height < 0.065 &&
        Math.abs(p.x - S.rodDock.x - height * rodSlope) < 0.004 &&
        Math.abs(p.z - S.rodDock.z) < 0.004;
    }
    function finishDrag(id, p) {
      if (!enable(id)) return false;
      if (NAMES[id]) return addReagent(id, p);
      if (id === 'cap' && S.lit) { tapLamp(); B.capper.snap(false); return true; }
      const phase = S.phase,
        spec = phases[phase],
        target = spec[3];
      if (id === 'rod' && phase === 'acid' && close(p, phases.sample[3], 0.017, 0.01)) {
        S.sampled = true;
        S.rodDock = p.clone();
        go('ph');
        return true;
      }
      if (phase === 'filter') { S.filterDocked = onGuide(p); return S.filterDocked; }
      if (id !== spec[1] || !target) return false;
      const stir = ['mix', 'acidMix', 'heatMix'].includes(phase);
      const cx = phase === 'mix' ? CUP : phase === 'acidMix' ? RECEIVER : DISH;
      const hit = stir
        ? Math.abs(p.x - cx) < 0.023 && Math.abs(p.y - target.y) < 0.009
        : close(
            p,
            target,
            ['water', 'salt', 'pour', 'insert', 'acidRod', 'heatRod', 'sample'].includes(phase) ? 0.015 : 0.009,
            ['grip', 'cool', 'ph'].includes(phase) ? 0.006 : 0.011,
          );
      if (!hit) return false;
      if (phase === 'guide') {
        const wallY = 0.096 + Math.hypot(p.x - FILTER, p.z);
        if (Math.abs(p.y - wallY) > 0.004) return false;
      }
      if (id === 'rod') S.rodDock = null;
      switch (phase) {
        case 'weigh':
        case 'salt':
        case 'water':
          transfer(id, p);
          break;
        case 'insert':
        case 'acidRod':
        case 'heatRod':
          S.rodDock = p.clone();
          if (phase === 'heatRod') S.stirSide = Math.sign(p.x - DISH);
          S.stir = 0;
          go(keys[idx(phase) + 1]);
          break;
        case 'heatMix':
          S.rodDock = p.clone();
          break;
        case 'mix':
        case 'acidMix':
          if (S.stir < 0.017) {
            S.rodDock = p.clone();
            status('让棒端留在液体里，左右拖动一段距离。');
            break;
          }
          if (phase === 'mix') {
            S.mixed = true;
            record('加水搅拌', '盐粒溶解，杯底仍有难溶物。');
            go('ba');
          }
          if (phase === 'acidMix') go('sample');
          break;
        case 'guide':
          S.rodDock = p.clone();
          go('filter');
          break;
        case 'sample':
          S.sampled = true;
          S.rodDock = p.clone();
          go('ph');
          break;
        case 'ph':
          S.sampled = false;
          if (S.hydroxide || S.carbonate || S.bicarbonate) {
            S.stained = '碱性';
            go('acid');
            record('用玻璃棒点样', '试纸呈蓝色，滤液仍呈碱性。');
            status('继续逐滴加盐酸，搅拌后再用试纸检验。');
          } else if (S.acidExcess > 2) {
            S.stained = '酸性';
            S.retry = 'acid';
            record('用玻璃棒点样', '试纸呈红色，盐酸已加过量。');
            instruct('盐酸已明显过量。重做本步，用过滤后的滤液重新调节。');
          } else {
            S.stained = S.acidExcess ? '微酸性' : '中性';
            const result = S.acidExcess ? '试纸呈黄绿色，滤液呈微酸性。' : '试纸呈绿色，滤液呈中性。';
            record('用玻璃棒点样', result);
            if (S.gas > 0) {
              go('sample');
              instruct(result + '等气泡停止，再取样确认。');
            } else {
              go('pour');
              status(result + '将滤液倒入蒸发皿。');
            }
          }
          break;
        case 'pour':
          transfer(id, p);
          break;
        case 'grip':
          if (S.evaporation < 0.999) {
            status('皿中还有少量水，等余热蒸干再夹持。');
            break;
          }
          S.gripped = true;
          S.gripOffset = V(DISH, DY).sub(p);
          go('cool');
          break;
        case 'cool':
          S.landed = true;
          S.gripped = false;
          S.cooling = 0.65;
          break;
      }
      return true;
    }
    function tapLamp() {
      if (!enable('cap')) return;
      if (!S.lit) {
        S.lit = true;
        S.stillTime = 0;
        S.stirSide = 0;
        go('heatRod');
        return;
      }
      S.lit = false;
      S.rodDock = null;
      returning('rod');
      if (S.passes >= 2) record('加热时搅拌', '玻璃棒在皿中来回移动。');
      S.passes = 0;
      if (S.retry === 'heat') {
        instruct('酒精灯已盖灭。重做本步，在皿中还有少量液体时停火。');
      } else if (S.evaporation >= STOP_AT) {
        record('盖灭酒精灯', '用蒸发皿的余热蒸干。');
        go('grip');
      } else {
        record('提前停止加热', '皿中仍有较多液体。');
        go('light');
        status('余热不足以蒸干，重新点灯，边加热边搅拌。');
      }
    }
    function retryStep() {
      if (S.lit || !S.retry || S.demo) return;
      const retry = S.retry;
      S.retry = null;
      S.rodDock = null;
      returning('rod');
      if (retry === 'acid') {
        Object.assign(S, S.filtrateBase, { bicarbonate: 0, acidExcess: 0, gas: 0, stained: '', sampled: false });
        go('acid');
      } else {
        Object.assign(S, { filled: false, evaporation: 0, heatingTime: 0, splashed: false });
        go('pour');
      }
    }
    const retryButton = h('button', { class: 'go', hidden: true, onclick: retryStep }, '重做本步');
    let cancelled = false, pointerRay = null,
      heldPoint = null;
    const grabOffset = V(), tipOffset = V();
    const stirring = () => ['mix', 'acidMix', 'heatMix'].includes(S.phase);
    const pourGoals = { water: 'water', cup: 'filter', paper: 'salt', filtrate: 'pour' };
    function rodAngle(u) {
      T.rod.g.rotation.set(0, -0.85 * (1 - u), (-Math.PI / 2) * (1 - u) - 0.31 * u, 'YXZ');
    }
    function progress(id) {
      return S.effect?.id === id ? Math.min(1, S.effect.t / S.effect.dur) : 0;
    }
    function level(id) {
      if (id === 'water') return WATER_LEVEL * (S.watered ? 0 : 1 - progress(id));
      if (id === 'filtrate') return 0.023 * S.collected * (S.filled ? 0 : 1 - progress(id));
      const full = 0.017 + (S.sulfate ? 0.002 : 0) + (S.ca ? 0.002 : 0);
      return full * (S.watered ? 1 : progress('water')) * (1 - S.transferred);
    }
    function pose(id, p) {
      const { g, home } = T[id];
      if (id === 'rod') {
        const u = clamp(p.distanceTo(home) / 0.034, 0, 1);
        rodAngle(u);
      } else if (pourGoals[id]) {
        const goal = phases[pourGoals[id]][3];
        const u = clamp(((p.x - home.x) / (goal.x - home.x)) * 1.65, 0, 1);
        const near = clamp(1 - p.distanceTo(goal) / 0.035, 0, 1);
        const angle = id === 'paper' ? -0.9 : B.liquid[id].angle(level(id));
        g.rotation.z = angle * u * near;
      }
    }
    const getZ = (id) => T[id].home.z;
    // The drag plane preserves the original grasp. As a tool rotates, pass the
    // displacement of its actual working end to the shared dropzone scanner.
    function alignGrasp(ray) {
      const id = S.hand;
      if (!id || !heldPoint) return;
      const raw = rayToLocal(ray, group, 'xy', getZ(id));
      if (!raw) return;
      raw.add(grabOffset);
      pose(id, raw);
      const tipUnderHand = () => {
        const offset = heldPoint.clone().multiply(T[id].g.scale).applyQuaternion(T[id].g.quaternion);
        return rayToLocal(ray, group, 'xy', getZ(id) + offset.z)?.sub(offset);
      };
      let tip = tipUnderHand();
      if (id === 'rod' && tip && tip.y < 0.002) {
        let low = 0, high = clamp(raw.distanceTo(T[id].home) / 0.034, 0, 1);
        for (let i = 0; i < 8; i++) {
          const mid = (low + high) / 2;
          rodAngle(mid);
          if (tipUnderHand().y >= 0.002) low = mid;
          else high = mid;
        }
        rodAngle(low);
        tip = tipUnderHand();
      }
      if (tip) tipOffset.subVectors(tip, raw);
    }
    function zones(id) {
      const zone = (name, position, enabled, radius = 0.026) => ({
        name, position, enabled, radius, onDrop: (point) => finishDrag(id, point),
      });
      if (id === 'cap') return [zone('灯芯', wick, () => S.lit)];
      if (NAMES[id]) return [
        zone('粗盐水烧杯中央', mouth(CUP), () => inside('ba', 'filter') && !testingClearLiquid()),
        ...[-1, 1].map((side) => zone('粗盐水烧杯内壁', mouth(CUP + side * (R - 0.003)),
          () => testingClearLiquid() || (id === 'ba' && S.phase === 'ba' && !S.smallBa))),
        zone('滤液烧杯', phases.acid[3], () => id === 'acid' && S.filtered),
      ];
      return [zone(toolNames[id], () => S.phase === 'acid' ? phases.sample[3] : phases[S.phase][3],
        () => !stirring() && (phases[S.phase]?.[1] === id || (id === 'rod' && S.phase === 'acid')))];
    }
    const drags = Object.keys(T)
      .filter((id) => id !== 'lamp')
      .map((id) => ({
        obj: T[id].pick,
        anchor: T[id].g,
        keepOffset: true,
        dropOffset: tipOffset,
        dropzones: zones(id),
        ...(id === 'cap' ? { onTap: () => { if (!S.lit) tapLamp(); } } : {}),
        plane: 'xy',
        get offset() {
          return getZ(id);
        },
        enabled: () => enable(id) && !S.landed,
        hint: () => hint(id),
        onStart() {
          if (!enable(id)) return;
          S.hand = id;
          tipOffset.set(0, 0, 0);
          if (id === 'cup') S.filterDocked = false;
          if (pointerRay) grabOffset.subVectors(S.pos[id], rayToLocal(pointerRay, group, 'xy', getZ(id)));
          const t = T[id],
            hit = pointerRay?.intersectObject(t.pick, false)[0];
          heldPoint = hit ? t.g.worldToLocal(hit.point.clone()) : null;
          delete S.returns[id];
        },
        onDrag(p) {
          if (!p || S.hand !== id || (id === 'cap' && !S.lit)) return;
          const old = S.pos[id],
            q = p.clone().add(tipOffset);
          q.x = clamp(q.x, -0.152, 0.151);
          q.y = clamp(q.y, 0.002, 0.178);
          q.z = id === 'cap' ? capOff.z * clamp(Math.hypot(q.x - wick.x, q.y - wick.y) / 0.068, 0, 1) : getZ(id);
          if (!heldPoint || id !== 'rod') pose(id, q);
          if (B.liquid[id]) {
            const cup = T[id].model, angle = T[id].g.rotation.z;
            q.y = Math.max(q.y, cup.h * Math.cos(angle) - 0.003 * Math.sin(angle) + 0.001);
          }
          if (id === 'rod' && ['mix', 'acidMix', 'heatMix'].includes(S.phase)) {
            const x = S.phase === 'mix' ? CUP : S.phase === 'acidMix' ? RECEIVER : DISH,
              y = phases[S.phase][3].y;
            if ([q, old].every((v) => Math.abs(v.x - x) < 0.024 && Math.abs(v.y - y) < 0.01)) {
              const distance = Math.abs(q.x - old.x);
              S.stir += distance;
              if (S.lit && distance > 0.00004) {
                S.stillTime = 0;
                const side = Math.abs(q.x - DISH) >= 0.007 ? Math.sign(q.x - DISH) : 0;
                if (side && S.stirSide && side !== S.stirSide) S.passes++;
                if (side) S.stirSide = side;
              }
            }
          }
          S.pos[id] = q;
          T[id].g.position.copy(q);
        },
        onEnd(moved, zone) {
          if (S.hand !== id) return;
          const p = S.pos[id];
          if (moved && !zone && !cancelled && stirring() && id === 'rod') finishDrag(id, p);
          S.hand = '';
          heldPoint = null;
          tipOffset.set(0, 0, 0);
          if (S.effect?.id === id || (id === 'cap' && (!S.lit || !moved))) return;
          if (id === 'rod' && S.rodDock) {
            if (p.distanceTo(S.rodDock) > 0.0002) returning(id, S.rodDock);
            return;
          }
          if (id === 'cup' && S.filterDocked) return;
          if (id === 'tongs' && S.gripped) returning(id, phases.grip[3]);
          else returning(id);
        },
      }));
    const drag = draggable(group, drags, {
      tip: tag('', 'pill'),
    });
    const act = demoActs(drag, group);
    const route = keys.slice();
    route.splice(route.indexOf('pour'), 0, 'acid', 'acidRod', 'acidMix', 'acid', 'acidRod', 'acidMix', 'sample', 'ph');
    const duration = { weigh: 1.16, salt: 1.16, heatMix: 4.6, filter: 3.1, cool: 2.3, ba: 3.4, co: 3.4, oh: 2.3, stop: 1.8, acid: 1.15 };
    const shots = route.map((p) => {
      const [, id, todo, to] = phases[p],
        tool = T[id];
      const from = () => S.pos[id].clone();
      const docked = (id === 'tongs' && p === 'cool') || (id === 'rod' && ['mix', 'heatMix', 'acidMix'].includes(p));
      const points = p === 'heatMix'
        ? [from, to, phases.heatRod[3], to, phases.heatRod[3], to, phases.heatRod[3], to]
        : docked
          ? [from, to]
          : [from, () => from().setY(Math.max(from().y, to.y) + 0.015), () => to.clone().add(V(0, 0.016)), to];
      const pouring = p === 'water' || p === 'pour';
      const release = ['ba', 'co', 'oh'].includes(p) ? 0.26 : p === 'heatMix' ? 0.98 : pouring || NAMES[id] ? 0.38 : 0.66;
      return {
        cap: todo,
        speed: p === 'ba' || p === 'co' ? 1.8 : p === 'filter' ? 1.65 : 1,
        dur: duration[p] || (pouring ? 1.9 : NAMES[id] ? 1.55 : 1.0),
        during: p === 'light' ? act.tap(tool.pick, 0.3) : act.path(tool.pick, points, { t0: 0.06, t1: release - 0.04, release }),
      };
    });
    shots.splice(keys.indexOf('guide'), 0, {
      cap: '回看刚刚形成的沉淀，追踪多加的钡离子。',
      dur: 4.3,
      cam: MICRO_CAM,
      enter: () => {
        mic.open(true);
        scene.time = Math.max(0, (S.events.length - 1) * 4.2);
      },
    });
    const afterMicro = shots[keys.indexOf('guide') + 1];
    afterMicro.enter = () => mic.close();
    const apply = () => {
      drag.clearDropzones();
      heldPoint = null;
      tipOffset.set(0, 0, 0);
      mic.close();
      scene.paused = false;
      pause.textContent = '暂停';
      B.capper.snap(S.lit);
      draw(0);
    };
    bar = lessonBar({
      look,
      back,
      group,
      ringOptions: { minOpacity: 0.7 },
      steps: GROUPS.map((title, i) => ({
        id: 's' + i,
        title,
        todo: Object.values(phases).find((s) => s[0] === i)[2],
        target: () => {
          if (!phases[S.phase] || S.hand || S.effect || S.filterDocked || reading || mic.isOpen) return null;
          if (S.retry && !S.lit) return null;
          return S.lit && S.evaporation >= STOP_AT ? T.cap.g : T[phases[S.phase][1]].g;
        },
      })),
      reels: {
        demo: {
          label: '老师演示',
          seal: '演示',
          onStart() {
            saved = { student: S, reading, open: mic.isOpen, time: scene.time, paused: scene.paused };
            if (reading) closeScale();
            S = fresh();
            S.demo = true;
            apply();
          },
          onEnd() {
            const view = saved;
            saved = null;
            S = view.student;
            apply();
            if (view.reading) readScale();
            if (view.open) {
              mic.open();
              scene.time = view.time;
              scene.paused = view.paused;
              pause.textContent = view.paused ? '继续' : '暂停';
            }
          },
          shots,
        },
      },
    });
    const demoBar = document.querySelector('.lbar');
    demoBar.dataset.saltions = '';
    demoBar.querySelector('.lb-steps').dataset.total = shots.length;
    const qaSteps = route.map((p) => {
      const [, id, , to] = phases[p];
      return {
        name: p === 'baTest' ? '沿壁检验硫酸根' : phases[p][2],
        ...(to ? { drag: T[id].pick, to: () => to } : { tap: T[id].pick }),
        scale: ['light', 'heatRod', 'heatMix', 'stop'].includes(p) ? 1 : undefined,
        wait: ['ba', 'co'].includes(p) ? 4.6 : p === 'filter' ? 2.5 : p === 'stop' ? 2 : NAMES[id] || p === 'water' || p === 'pour' ? 1.55 : 0.7,
      };
    });
    qaSteps.splice(route.indexOf('heatMix') + 1, 0,
      { name: '向左搅拌', scale: 1, drag: T.rod.pick, to: phases.heatRod[3] },
      { name: '再向右搅拌', scale: 1, drag: T.rod.pick, to: phases.heatMix[3] });
    qaSteps.splice(
      keys.indexOf('guide'),
      0,
      { name: '钻进去看', run: () => mic.open(), wait: 3 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
    );
    qaSteps.push({
      name: '核对精盐与结论',
      run: () => {
        if (
          !bar.finished ||
          W.next.hidden ||
          !S.landed ||
          S.events.map((e) => e.kind).join('/') !== 'sulfate/magnesium/calcium/barium'
        )
          throw Error('实验未完成，停在 ' + S.phase);
      },
    });
    const qa = qaFlow(drag, qaSteps);
    function draw(dt) {
      for (const [id, r] of Object.entries(S.returns)) {
        r.t += dt;
        const u = clamp(r.t / 0.43, 0, 1);
        S.pos[id].lerpVectors(r.from, r.to, u * u * (3 - 2 * u));
        if (u === 1) delete S.returns[id];
      }
      retryButton.hidden = !S.retry || S.lit || S.demo;
      const prep = inside('weigh', 'mix'),
        acidifying = inside('acid', 'pour');
      B.balance.visible = prep;
      const paperPour = progress('paper'), spoonPour = progress('spoon');
      const onPan = S.pos.paper.distanceTo(T.paper.home) < 0.002;
      B.readout(onPan && !S.salted ? 5 * (S.weighed ? 1 : spoonPour) : 0);
      B.sample.scale.setScalar(S.weighed ? 1 - paperPour : spoonPour);
      B.spoon.heap.scale.set(1.3, 0.6, 1).multiplyScalar(1 - spoonPour);
      B.fallingSalt.visible = paperPour > 0 || spoonPour > 0;
      if (B.fallingSalt.visible) {
        const fraction = paperPour || spoonPour;
        const source = paperPour ? S.pos.paper : S.pos.spoon;
        const top = paperPour ? source.y - 0.013 : source.y;
        const bottom = paperPour ? 0.004 : T.paper.home.y + 0.003;
        B.fallingSalt.position.set(source.x + (paperPour ? 0.009 : 0), 0, source.z);
        B.fallingSalt.children.forEach((grain, i) => {
          const travel = fraction * 1.8 - 0.8 * i / (B.fallingSalt.children.length - 1);
          grain.visible = travel > 0 && travel < 1;
          grain.position.y = top + (bottom - top) * travel * travel;
        });
      }
      B.sample.visible = spoonPour > 0 || S.weighed && !S.salted;
      B.spoon.heap.visible = !S.weighed;
      B.fs.visible = B.funnel.visible = inside('guide', 'pour');
      // Lift the stem clear before swinging the filter aside. Keep the residue in view.
      const lift = clamp(S.filterClear * 2, 0, 1);
      const turn = clamp((S.filterClear - 0.5) * 2, 0, 1) * 1.36;
      B.filterArm.position.y = 0.113 + 0.018 * lift;
      B.filterArm.rotation.y = turn;
      B.funnel.position.set(FILTER + 0.054 * (Math.cos(turn) - 1), 0.112 + 0.018 * lift, -0.054 * Math.sin(turn));
      B.draining.visible = S.collected < S.transferred;
      B.draining.position.set(FILTER, 0.063 - ((S.collected * 8) % 1) * (0.042 - 0.023 * S.collected), 0);
      B.residue.visible = S.transferred > 0;
      B.residue.scale.setScalar(Math.sqrt(S.transferred));
      B.heater.visible = stage() >= idx('pour') || S.landed;
      B.mat.visible = stage() >= idx('grip') || S.landed;
      T.rod.g.userData.ringY = S.phase === 'heatRod' && !S.hand ? 0.019 : undefined;
      B.strip.visible = acidifying;
      B.stain.visible = !!S.stained;
      B.stain.material.color.setHex(PH_COLORS[S.stained] || PH_COLORS['碱性']);
      for (const [id, t] of Object.entries(T)) {
        const o = t.g,
          p = S.pos[id];
        o.position.copy(p);
        if (NAMES[id]) {
          const active = id === 'acid' ? inside('guide', 'sample') || S.phase === 'ph' : inside('ba', 'coTest');
          B.bottles[id].visible = o.visible = active || !!S.returns[id] || S.effect?.id === id;
        } else {
          o.visible = {
            cap: B.heater.visible,
            spoon: prep,
            paper: prep,
            water: prep,
            cup: !S.filtered || S.hand === 'cup' || !!S.returns.cup,
            filtrate: (stage() >= idx('guide') && !S.filled) || !!S.returns.filtrate,
            rod: !S.landed && !inside('grip', 'cool'),
            lamp: B.heater.visible,
            tongs: B.mat.visible,
          }[id];
        }
        if (S.hand !== id) pose(id, p);
      }

      const pouring = S.phase === 'filter' && S.filterDocked && S.transferred < 1;
      for (const id of Object.keys(B.liquid)) B.liquid[id].draw(level(id), T[id].g.rotation.z);
      B.meniscus.visible = level('water') > 0.002 && T.water.g.rotation.z <= 0.001;
      B.meniscus.position.y = level('water');
      if (B.meniscus.visible) B.cylinder.surf.visible = false;
      scaleButton.text(reading ? (S.phase === 'water' ? '核对用量并返回' : '回到实验台') : '近看量筒刻度')
        .loc(B.cylinder, !reading && innerWidth <= 760 ? -0.019 : 0, reading ? 0.040 : 0.070, 0.014)
        .show(prep && !S.watered && !S.hand && !S.effect && !S.demo);
      B.raw.visible = (S.salted || paperPour > 0) && !S.mixed;
      B.raw.scale.setScalar(S.salted ? (S.phase === 'mix' ? 1 - clamp(S.stir / 0.017, 0, 1) : 1) : paperPour);
      B.sand.visible = S.mixed && S.transferred < 1;
      B.sediment.visible = (S.sulfate || S.smallBa || S.mg || S.ca) && S.transferred < 1;
      B.sediment.scale.setScalar((S.ca ? 1 : S.mg ? 0.85 : 0.66) * (1 - S.cloud * 0.45));
      B.cloud.set(S.cloud);
      B.cloud.update(2 * (1 - S.cloud));

      B.dish.visible = B.heater.visible;
      B.dish.position.set(S.landed ? MAT : DISH, S.landed ? 0.006 : DY, 0);
      if (S.gripped) B.dish.position.copy(S.pos.tongs).add(S.gripOffset);
      const brine = (S.filled ? 1 : progress('filtrate')) * (1 - S.evaporation);
      B.brine.visible = brine > 0.001;
      B.brine.scale.set(0.54 + brine * 0.46, brine, 0.54 + brine * 0.46);
      B.brine.position.y = 0.0045 + B.brine.scale.y * 0.0055;
      const crystals = B.crystals.children;
      const grown = Math.max(0, (S.evaporation - 0.35) / 0.65) * (S.splashed ? 0.78 : 1);
      crystals.forEach((c, i) => {
        c.visible = S.filled && crystals.length - 1 - i < crystals.length * grown;
      });
      B.spray.forEach((b, i) => {
        b.visible = S.lit && S.splashed && S.stillTime > 1.4 && S.evaporation < 1;
        const u = (S.heatingTime * 1.5 + i * 0.22) % 1;
        b.position.set(
          DISH + (0.016 + u * 0.025) * Math.cos(i * 2.4),
          DY + 0.015 + 0.032 * Math.sin(u * Math.PI),
          (0.014 + u * 0.025) * Math.sin(i * 2.4),
        );
      });
      const flame = B.capper.update(dt, S.lit);
      if ((S.hand === 'cap' && S.lit) || S.returns.cap) B.capper.cap.position.copy(S.pos.cap);
      else S.pos.cap.copy(B.capper.cap.position);
      B.capper.cap.visible = B.heater.visible;
      B.lamp.flame.setOn(flame);
      B.lamp.flame.update(dt);
      const e = S.effect;
      B.drop.visible = false;
      B.stream.visible = false;
      if (e && e.id !== 'paper' && e.id !== 'spoon') {
        const source = S.pos[e.id];
        const bottom = e.id === 'filtrate' ? DY + B.brine.position.y + 0.0055 * brine :
          S.filtered ? 0.017 + level('filtrate') : 0.001 + level('cup');
        if (e.count) {
          const inBatch = e.t % e.cycle;
          const step = (inBatch / e.interval) % 1;
          B.drop.visible = inBatch < e.burst && step < 0.86;
          B.drop.position.copy(source);
          B.drop.position.y += (bottom - source.y) * (step / 0.86) ** 2;
        } else {
          B.stream.visible = true;
          B.stream.quaternion.identity();
          B.stream.position.set(source.x, (bottom + source.y) / 2, source.z);
          B.stream.scale.y = source.y - bottom;
        }
      }
      if (pouring) {
        const tip = S.rodDock, spout = S.pos.cup;
        const flow = spout.clone().sub(tip);
        B.stream.visible = true;
        B.stream.position.copy(tip).addScaledVector(flow, 0.5);
        B.stream.position.x -= 0.0017;
        B.stream.position.z += 0.0017;
        B.stream.scale.y = flow.length();
        B.stream.quaternion.setFromUnitVectors(V(0, 1), flow.normalize());
      }
      B.bubbles.forEach((b, i) => {
        const frac = (1 - S.gas) * 3 + i * 0.618;
        const size = 0.003 + (frac % 1) * 0.0035;
        b.scale.set(size, size * ((frac % 1) > 0.9 ? 0.55 : 1), 1);
        b.visible = S.gas > 0.001 && i < Math.ceil(S.gas * 18);
        b.position.set(
          (S.filtered ? RECEIVER : CUP) + Math.sin(i * 4) * 0.017,
          (S.filtered ? 0.026 : 0.005) + (frac % 1) * 0.028,
          0.008 + Math.cos(i * 5) * 0.012,
        );
      });
      const evap = B.heater.visible && S.filled;
      const name = evap ? '蒸发皿里' : S.filtered ? '滤液烧杯' : '烧杯里';
      const word = evap
        ? S.evaporation >= 0.999
          ? '白色晶粒'
          : S.evaporation > 0.38
            ? '结晶'
            : '清液'
        : S.gas > 0.01
          ? '冒泡'
          : S.filtered
            ? '澄清'
            : S.cloud > 0.1
              ? '浑浊'
              : B.sediment.visible
                ? '沉淀'
                : S.mixed
                  ? '有泥沙'
                  : S.watered
                    ? '有盐粒'
                    : '粗盐';
      card
        .text(
          '<div class="cc"><div class="cc-t"><span class="cc-name">' +
            name +
            '</span><span class="cc-res">' +
            word +
            '</span></div></div>',
        )
        .loc(group, S.landed ? MAT : evap ? DISH - 0.04 : S.filtered ? RECEIVER : 0.064, S.landed ? 0.048 : evap ? DY + 0.046 : 0.084, -0.005)
        .show(S.salted && !S.hand && !S.effect && !S.filterDocked && !reading && !mic.isOpen && !bar?.playing);
      for (const refresh of plates) refresh();
      playback.hidden = !!bar?.playing;
    }
    function update(dt) {
      const k = bar.update(dt),
        delta = Math.min(dt, 0.06) * k;
      drag.update(delta);
      S.cloud = Math.max(0, S.cloud - delta * 0.78);
      S.gas = Math.max(0, S.gas - delta * 0.34);
      if (S.phase === 'filter') {
        if (S.filterDocked) S.transferred = Math.min(1, S.transferred + delta * 0.8);
        S.collected = Math.min(S.transferred, S.collected + delta * 0.6);
        if (S.collected === 1) {
          S.filtered = true;
          S.filtrateBase = { hydroxide: S.hydroxide, carbonate: S.carbonate };
          S.filterDocked = false;
          S.rodDock = null;
          returning('rod');
          if (S.hand !== 'cup') returning('cup');
          record('静置后过滤', '沉淀和难溶物留在滤纸上，滤液澄清。');
          go('acid');
        }
      }
      if (S.filtered) S.filterClear = Math.min(1, S.filterClear + delta * 1.5);
      if (S.effect) {
        const e = S.effect;
        const previousTime = e.t;
        e.t += delta;
        if (e.batches > 1) {
          const batch = Math.floor(e.t / e.cycle);
          if (previousTime === 0 || batch !== Math.floor(previousTime / e.cycle))
            instruct('分批滴加中（' + (batch + 1) + '/' + e.batches + '）。');
          if (e.t >= e.interval * 0.86) S.cloud = Math.min(1, e.t / e.burst);
        }

        if (e.t >= e.dur) {
          if (e.count) react(e.id, e.p);
          if (e.id === 'spoon') {
            S.weighed = true;
            record('称量粗盐', '粗盐已放在去皮的天平上。');
            go('salt');
          }
          if (e.id === 'paper') {
            S.salted = true;
            go('water');
          }
          if (e.id === 'water' || e.id === 'filtrate') {
            if (e.id === 'water') {
              S.watered = true;
              record('量取蒸馏水', waterCheck);
            } else S.filled = true;
            go(e.id === 'water' ? 'insert' : 'light');
          }
          returning(e.id);
          S.effect = null;
        }
      }
      if (S.lit) {
        S.heatingTime += delta;
        S.stillTime += delta;
        // Water is lost with time on the flame, independently of the rod's motion.
        const previous = S.evaporation;
        S.evaporation = Math.min(1, S.evaporation + delta * (S.evaporation < 0.65 ? 0.13 : 0.025));
        if (previous < STOP_AT && S.evaporation >= STOP_AT) instruct(phases.stop[2]);
        if (previous < 1 && S.evaporation === 1) {
          S.retry = 'heat';
          record('直火蒸干', '皿中液体已在火上蒸干，错过了停火时机。');
          instruct('皿中液体已在火上蒸干。先用灯帽盖灭酒精灯，再重做本步。');
        }
        if (!S.splashed && S.evaporation >= 0.35 && S.stillTime > 1.4 && S.evaporation < 1) {
          S.splashed = true;
          record('加热时停搅', '皿边有液滴飞溅，损失了部分盐。');
          if (S.evaporation < STOP_AT) status('皿边有液滴飞溅。来回搅拌，观察皿中固体的多少。');
        }
      }
      if (S.phase === 'grip') S.evaporation = Math.min(1, S.evaporation + delta * 0.32);
      if (S.landed && S.phase === 'cool' && (S.cooling -= delta) <= 0) {
        record('移到陶土网上冷却', S.splashed ? '皿中有白色精盐，加热时曾有飞溅损失。' : '蒸发皿中留下白色精盐。');
        go('end');
        if (!S.demo) {
          W.next.hidden = false;
          W.review.open();
        }
      }
      draw(delta);
      mic.update(dt, k);
    }
    function reset() {
      if (bar.playing) bar.stop();
      drag.clearDropzones();
      if (reading) closeScale();
      S = fresh();
      apply();
      W.tbl.clear();
      W.review.close();
      W.next.hidden = true;
      bar.undo(...GROUPS.map((_, i) => 's' + i));
      bar.say(null);
      W.ui.relock();
      W.ui.status(INTRO);
      W.ui.observePrediction('');
    }
    const pointer = wrapPointer(drag, bar);
    for (const event of ['down', 'move', 'up']) {
      const handle = pointer[event];
      pointer[event] = (ray, e) => {
        pointerRay = ray;
        cancelled = e?.type === 'pointercancel';
        if (event !== 'down' && ray) alignGrasp(ray);
        try {
          return handle(ray, e);
        } finally {
          pointerRay = null;
        }
      };
    }
    draw(0);
    return {
      group: root,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.34, d: 0.17, h: 0.21 },
      view: { auto: false, elev: 26, azim: 0, lookY: 0.25, margin: 1.1 },
      pointer,
      reset,
      update,
      mount(ui) {
        const review = think({
          title: '想一想（选做）',
          q: '如果在过滤前就滴加足量盐酸，哪些沉淀会重新溶解？',
          options: ['Mg(OH)₂、CaCO₃ 和 BaCO₃', '只有 BaSO₄'],
          ok: '盐酸使氢氧化镁和两种碳酸盐溶解，镁、钙和钡重新进入溶液。',
          wrong: ['回想加入盐酸时，哪些固体能和酸反应。'],
          status: ui.status,
        });
        const note = h(
          'details',
          { class: 'more' },
          h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, NOTE),
        );
        W = {
          ...mountXuean(ui, { intro: INTRO, headers: ['操作', '本轮观察'], controls: [retryButton, moreBox([], reset), note] }),
          review,
          ui,
        };
        ui.data.nextElementSibling.style.display = 'none';
        ui.controls.prepend(W.next);
        ui.data.append(review.el);
        ui.observePrediction('');
        bar.attach(ui);
      },
      dispose() {
        bar.dispose();
        mic.dispose();
        drag.dispose();
        style.remove();
      },
      debug: {
        get S() {
          return S;
        },
        bar,
        qa,
        picks: Object.fromEntries(Object.entries(T).map(([id, t]) => [id, t.pick])),
      },
    };
  },
};
