import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { clamp, draggable, rayToLocal } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, think, wrapPointer } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { bench, ionScene, V, CUP, R, H, PAN, FILTER, RECEIVER, DISH, DY, MAT, STRIP, NAMES } from './kit/saltions-parts.js';

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
const wet = (x, y) => V(x, y, 0.012);
const phases = {
  weigh: [0, 'spoon', '把药匙里的粗盐移到天平的称量纸上。', V(PAN, 0.029, 0.011)],
  salt: [0, 'paper', '把称好的 5.0 g 粗盐连同称量纸提到烧杯口，倒入粗盐。', mouth(CUP)],
  water: [0, 'water', '提起量筒，把 20 mL 蒸馏水倒进 100 mL 烧杯。', mouth(CUP)],
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
  sample: [6, 'rod', '用玻璃棒蘸取滤液检验酸碱性，也可以继续逐滴加盐酸。', wet(RECEIVER, 0.026)],
  ph: [6, 'rod', '将棒端的滤液点在右侧 pH 试纸上，观察颜色。', wet(STRIP - 0.006, 0.0035)],
  pour: [7, 'filtrate', '提起滤液烧杯，把杯嘴移到蒸发皿上方，倒入滤液。', V(DISH, DY + 0.026)],
  light: [7, 'lamp', '点燃蒸发皿下的酒精灯。'],
  heatRod: [7, 'rod', '把玻璃棒下端伸进蒸发皿。', wet(DISH - 0.012, DY + 0.012)],
  heatMix: [7, 'rod', '在皿中来回搅拌。看到较多固体时，用灯帽盖灭酒精灯。', wet(DISH + 0.012, DY + 0.012)],
  stop: [7, 'lamp', '皿中已出现较多固体，用灯帽盖灭酒精灯，利用余热蒸干。'],
  grip: [8, 'tongs', '待余热蒸干后，将坩埚钳的钳口移到蒸发皿右缘。', V(DISH + 0.031, DY + 0.019, 0.013)],
  cool: [8, 'tongs', '用坩埚钳将蒸发皿轻放在左侧陶土网上冷却。', V(MAT + 0.031, 0.025, 0.013)],
};
const keys = Object.keys(phases);
const idx = (k) => keys.indexOf(k);
const MICRO_CAM = [[CUP, 0.141, 0], [0.015, 0.55, 1], 0.32];
const NOTE =
  '依据必修第二册第 29 页实验活动 4。BaCl₂ 溶液为 0.1 mol/L，NaOH 溶液为 20%，Na₂CO₃ 溶液饱和，盐酸为 6 mol/L。杯口中央代表按课本用量分批滴加，杯壁处代表沿壁滴加少量。滴液、静置、过滤和蒸发时间均压缩。杂质含量、沉淀量、试纸颜色和粒子运动为示意。每次加酸按示意的相对用量消耗剩余的碱和碳酸盐，试纸只表示酸碱性。微观画面追踪一组离子并入固体的过程，离子排列为局部示意。';

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
      smallBa: false,
      carbonateFirst: false,
      cloud: 0,
      gas: 0,
      effect: null,
      filtered: false,
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
      btnAt: () => V(CUP, 0.019, 0.086),
      dist: MICRO_CAM[2],
      lookD: MICRO_CAM[1],
      scale: 0.012,
      label: '钻进去看',
      state: () => ({ events: S.events }),
      show: () => S.events.length > 0,
      bar: () => bar,
    });
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
      .saltions-playback{display:flex;gap:8px;justify-content:center;margin-top:8px;pointer-events:auto}
      .saltions-playback button{display:inline-block;background:#fffaf1;color:#384952;border:1px solid #aca9a1;border-radius:5px;padding:2px 9px}
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
    function go(p) {
      const old = phases[S.phase][0],
        next = phases[p]?.[0] ?? 9;
      S.phase = p;
      if (p === 'ph') S.stained = '';
      if (!S.demo) {
        if (next > old) bar.done('s' + old);
        if (next < old) bar.undo(...GROUPS.slice(next, old + 1).map((_, i) => 's' + (next + i)));
        bar.say(phases[p]?.[2] || null);
        W.ui.status(phases[p]?.[2] || '蒸发皿已在陶土网上冷却。');
      }
    }
    function logEvent(kind) {
      S.events.push({ kind, spare: S.freeBa });
    }
    function returning(id, to = T[id].home) {
      S.returns[id] = { from: S.pos[id].clone(), to: to.clone(), t: 0 };
    }
    function enable(id) {
      if (S.phase === 'end' || mic.isOpen) return false;
      if (phases[S.phase][1] === id) return true;
      if (id === 'acid' && inside('guide', 'filter')) return S.transferred === 0;
      if (id === 'acid' && S.phase === 'sample') return !S.acidExcess;
      if (id === 'oh' && S.phase === 'ba' && !S.mg) return true;
      if (id === 'co' && S.phase === 'ba' && S.mg && !S.carbonateFirst) return true;
      if (id === 'rod' && S.phase === 'acid') return true;
      if (id === 'lamp' && S.lit) return true;
      return false;
    }
    const toolNames = {
      spoon: '药匙',
      paper: '称量纸',
      water: '量筒',
      rod: '玻璃棒',
      cup: '粗盐水烧杯',
      filtrate: '滤液烧杯',
      lamp: '酒精灯',
      tongs: '坩埚钳',
      ...NAMES,
    };
    function hint(id) {
      if (!enable(id)) return '';
      if (id === 'acid' && inside('guide', 'filter')) return '盐酸也可以滴入未过滤的粗盐水，观察沉淀。';
      if (id === 'co' && S.phase === 'ba') return '也可以先加碳酸钠，再试着检验硫酸根。';
      if (id === 'rod' && S.phase === 'acid') return '用玻璃棒蘸滤液，先检验此时的酸碱性。';
      if (id === 'oh' && S.phase === 'ba') return '也可以先加 NaOH 沉淀镁离子。';
      return id === 'lamp'
        ? S.lit
          ? '用灯帽盖灭酒精灯'
          : '点燃酒精灯'
        : toolNames[id] + ' · ' + (id === 'rod' && S.sampled ? '点样到 pH 试纸' : '按住拖动');
    }
    function nextFx(id, p, bottom, stream = false) {
      S.effect = { id, x: p.x, y: p.y, z: p.z, bottom, t: 0, dur: stream ? 0.55 : 0.56, stream };
    }
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
      const testing = ['baTest', 'ohTest', 'coTest'].includes(S.phase);
      if (testing && (!edge || S.cloud > 0.1)) {
        status(!edge ? '要检验上层清液，把滴管尖移到杯壁上方。' : '上层仍浑浊。等沉淀沉下，再沿杯壁检验。');
        return false;
      }
      nextFx(id, p, beforeFilter ? 0.02 : 0.04);
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
        if (edge) {
          status('把滴管移到杯口中央，按课本用量继续加 BaCl₂。');
          return false;
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
      if (id === 'acid') {
        S.effect.dur = 0.22;
        return true;
      }
      return false;
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
      if (NAMES[id]) return addReagent(id, p);
      const phase = S.phase,
        spec = phases[phase],
        target = spec[3];
      if (id === 'rod' && phase === 'acid' && close(p, phases.sample[3], 0.017, 0.01)) {
        S.sampled = true;
        S.rodDock = p.clone();
        go('ph');
        return true;
      }
      if (phase === 'filter') return onGuide(p);
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
          S.weighed = true;
          record('称量粗盐', '5.0 g');
          go('salt');
          break;
        case 'salt':
          S.salted = true;
          go('water');
          break;
        case 'water':
          S.watered = true;
          nextFx(id, p, 0.017, true);
          go('insert');
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
          } else if (S.acidExcess) {
            S.stained = '酸性';
            go('sample');
            record('用玻璃棒点样', '试纸呈红色，盐酸已加过量。');
            const retry = '盐酸已加过量。在更多中选全部重来，再试一次。';
            status(retry);
            if (!S.demo) bar.say(retry);
          } else {
            S.stained = '微酸性';
            if (S.gas > 0.06) {
              go('sample');
              status('试纸呈黄绿色。等气泡停止，再取样确认。');
            } else {
              go('pour');
              status('试纸呈黄绿色，滤液呈微酸性。将滤液倒入蒸发皿。');
            }
            record('用玻璃棒点样', '试纸呈黄绿色，滤液呈微酸性。');
          }
          break;
        case 'pour':
          S.filled = true;
          nextFx(id, p, DY + 0.014, true);
          go('light');
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
      if (!enable('lamp')) return;
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
      if (S.evaporation >= 0.62) {
        record('盖灭酒精灯', S.evaporation >= 0.999 ? '水已蒸干，皿中留有固体。' : '用蒸发皿的余热蒸干。');
        go('grip');
      } else {
        record('提前停止加热', '皿中仍有较多液体。');
        go('light');
        status('余热不足以蒸干，重新点灯，边加热边搅拌。');
      }
    }
    let pointerRay = null,
      heldPoint = null;
    const pourGoals = { water: 'water', cup: 'filter', paper: 'salt', filtrate: 'pour' };
    function rodAngle(u) {
      T.rod.g.rotation.set(0, -0.85 * (1 - u), (-Math.PI / 2) * (1 - u) - 0.31 * u, 'YXZ');
    }
    function pose(id, p) {
      const { g, home } = T[id];
      if (id === 'rod') {
        const u = clamp(p.distanceTo(home) / 0.034, 0, 1);
        rodAngle(u);
      } else if (pourGoals[id]) {
        const goal = phases[pourGoals[id]][3];
        const u = clamp(((p.x - home.x) / (goal.x - home.x)) * 1.65, 0, 1);
        const lift = clamp((p.y - home.y + 0.015) / 0.034, 0, 1);
        const angle = id === 'cup' ? Math.atan2(H, B.waterWidth(1 - S.transferred)) : 1.12;
        g.rotation.z = (id === 'paper' ? -0.9 : angle) * u * lift;
      }
    }
    const getZ = (id) => T[id].home.z;
    const drags = Object.keys(T)
      .filter((id) => id !== 'lamp')
      .map((id) => ({
        obj: T[id].pick,
        anchor: T[id].g,
        keepOffset: true,
        plane: 'xy',
        get offset() {
          return getZ(id);
        },
        enabled: () => enable(id) && !S.landed,
        hint: () => hint(id),
        onStart() {
          if (!enable(id)) return;
          S.hand = id;
          const t = T[id],
            hit = pointerRay?.intersectObject(t.pick, false)[0];
          heldPoint = hit ? t.g.worldToLocal(hit.point.clone()) : null;
          delete S.returns[id];
        },
        onDrag(p) {
          if (!p || S.hand !== id) return;
          const old = S.pos[id],
            q = V(
              clamp(p.x, -0.152, 0.151),
              clamp(p.y, id === 'cup' || id === 'filtrate' || id === 'water' ? 0.042 : 0.002, 0.172),
              getZ(id),
            );
          pose(id, q);
          if (pointerRay && heldPoint) {
            const tipUnderHand = () => {
              const offset = heldPoint.clone().applyQuaternion(T[id].g.quaternion);
              return rayToLocal(pointerRay, group, 'xy', getZ(id) + offset.z)?.sub(offset);
            };
            let tip = tipUnderHand();
            if (id === 'rod' && tip && tip.y < 0.002) {
              // Keep the grasp under the finger and the glass above the table.
              let low = 0,
                high = clamp(q.distanceTo(T[id].home) / 0.034, 0, 1);
              for (let i = 0; i < 8; i++) {
                const mid = (low + high) / 2;
                rodAngle(mid);
                if (tipUnderHand().y >= 0.002) low = mid;
                else high = mid;
              }
              rodAngle(low);
              tip = tipUnderHand();
            }
            if (tip) {
              q.x = clamp(tip.x, -0.152, 0.152);
              q.y = clamp(tip.y, 0.002, 0.178);
            }
          }
          if (['water', 'cup', 'filtrate'].includes(id)) q.y = Math.max(q.y, T[id].home.y);
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
        onEnd(moved) {
          if (S.hand !== id) return;
          const p = S.pos[id];
          if (moved) finishDrag(id, p);
          S.hand = '';
          heldPoint = null;
          if (id === 'rod' && S.rodDock) {
            if (p.distanceTo(S.rodDock) > 0.0002) returning(id, S.rodDock);
            return;
          }
          if (id === 'cup' && S.phase === 'filter' && onGuide(p)) return;
          if (id === 'tongs' && S.gripped) returning(id, phases.grip[3]);
          else returning(id);
        },
      }));
    const drag = draggable(group, drags, {
      tip: tag('', 'pill'),
      taps: [{ obj: T.lamp.pick, hint: () => hint('lamp'), enabled: () => enable('lamp'), onTap: tapLamp }],
    });
    const act = demoActs(drag, group);
    const route = keys.slice();
    route.splice(route.indexOf('pour'), 0, 'acid', 'acidRod', 'acidMix', 'acid', 'acidRod', 'acidMix', 'sample', 'ph');
    const duration = { heatMix: 4.6, filter: 3.35, cool: 2.3, ba: 1.8, co: 1.8, stop: 1.8 };
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
      const release = p === 'heatMix' ? 0.98 : 0.66;
      return {
        cap: todo,
        dur: duration[p] || 1.12,
        during: id === 'lamp' ? act.tap(tool.pick, 0.3) : act.path(tool.pick, points, { t0: 0.06, t1: release - 0.04, release }),
      };
    });
    shots.splice(keys.indexOf('guide'), 0, {
      cap: '回看刚刚形成的沉淀，追踪多加的钡离子。',
      dur: 5.5,
      cam: MICRO_CAM,
      enter: () => {
        mic.open(true);
        scene.time = Math.max(0, (S.events.length - 1) * 4.2);
      },
    });
    const afterMicro = shots[keys.indexOf('guide') + 1];
    afterMicro.enter = () => mic.close();
    const apply = () => {
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
        target: () => (phases[S.phase] && !(S.phase === 'filter' && onGuide(S.pos.cup)) ? T[phases[S.phase][1]].g : null),
      })),
      reels: {
        demo: {
          label: '老师演示',
          seal: '演示',
          onStart() {
            saved = { student: S, open: mic.isOpen, time: scene.time, paused: scene.paused };
            S = fresh();
            S.demo = true;
            apply();
          },
          onEnd() {
            const view = saved;
            saved = null;
            S = view.student;
            apply();
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
        wait: p === 'filter' ? 2.5 : ['ba', 'co', 'stop'].includes(p) ? 2 : 0.7,
      };
    });
    qaSteps.splice(route.indexOf('heatMix') + 1, 0,
      { name: '向左搅拌', drag: T.rod.pick, to: phases.heatRod[3] },
      { name: '再向右搅拌', drag: T.rod.pick, to: phases.heatMix[3] });
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
      const prep = inside('weigh', 'mix'),
        acidifying = inside('acid', 'pour');
      B.balance.visible = prep;
      B.readout.forEach((o, i) => {
        o.visible = i === Number(S.weighed && !S.salted);
      });
      B.sample.visible = S.weighed && !S.salted;
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
      B.stain.material.color.setHex(S.stained === '微酸性' ? 0xa8b953 : S.stained === '酸性' ? 0xc94b38 : 0x5279a7);
      for (const [id, t] of Object.entries(T)) {
        const o = t.g,
          p = S.pos[id];
        o.position.copy(p);
        if (NAMES[id]) {
          const active = id === 'acid' ? inside('guide', 'sample') || S.phase === 'ph' : inside('ba', 'coTest');
          B.bottles[id].visible = o.visible = active || !!S.returns[id];
        } else {
          o.visible = {
            spoon: prep,
            paper: prep,
            water: prep,
            cup: !S.filtered || S.hand === 'cup' || !!S.returns.cup,
            filtrate: (stage() >= idx('guide') && !S.filled) || S.effect?.id === 'filtrate',
            rod: !S.landed && !inside('grip', 'cool'),
            lamp: B.heater.visible,
            tongs: B.mat.visible,
          }[id];
        }
        if (S.hand !== id) pose(id, p);
      }

      const liquidLevel = 0.017 + (S.sulfate ? 0.002 : 0) + (S.ca ? 0.002 : 0);
      B.cylinder.setLevel(S.watered ? 0 : 0.049);
      const pouring = S.phase === 'filter' && onGuide(S.pos.cup) && S.transferred < 1;
      B.pouringWater.visible = pouring;
      if (pouring) B.filterWater(1 - S.transferred);
      B.bowl.setLevel(S.watered && !pouring ? liquidLevel * (1 - S.transferred) : 0);
      B.raw.visible = S.salted && !S.mixed;
      B.sand.visible = S.mixed && S.transferred < 1;
      B.sediment.visible = (S.sulfate || S.smallBa || S.mg || S.ca) && S.transferred < 1;
      B.sediment.scale.setScalar((S.ca ? 1 : S.mg ? 0.85 : 0.66) * (1 - S.cloud * 0.45));
      B.cloud.set(S.cloud);
      B.cloud.update(2 * (1 - S.cloud));
      B.receiver.setLevel(!S.filled ? 0.023 * S.collected : 0);
      B.dish.visible = B.heater.visible;
      B.dish.position.set(S.landed ? MAT : DISH, S.landed ? 0.006 : DY, 0);
      if (S.gripped) B.dish.position.copy(S.pos.tongs).add(S.gripOffset);
      B.brine.visible = S.filled && S.evaporation < 0.999;
      B.brine.scale.set(1 - S.evaporation * 0.46, Math.max(0.02, 1 - S.evaporation), 1 - S.evaporation * 0.46);
      B.brine.position.y = 0.0045 + B.brine.scale.y * 0.0055;
      B.crystals.children.forEach((c, i) => {
        c.visible =
          S.filled && i < B.crystals.children.length * Math.max(0, (S.evaporation - 0.35) / 0.65) * (S.splashed ? 0.78 : 1);
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
      B.capper.cap.visible = B.heater.visible;
      B.lamp.flame.setOn(flame);
      B.lamp.flame.update(dt);
      const e = S.effect;
      B.drop.visible = !!e && !e.stream;
      B.stream.visible = !!e && e.stream;
      if (e) {
        const k = e.t / e.dur;
        const falling = e.id === 'acid' && S.filtered ? k : (k * 4) % 1;
        B.drop.position.set(e.x, e.y + (e.bottom - e.y) * falling, e.z);
        B.stream.quaternion.identity();
        B.stream.position.set(e.x, (e.bottom + e.y) / 2, e.z);
        B.stream.scale.y = Math.max(0.002, e.y - e.bottom);
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
        .loc(group, S.landed ? MAT : evap ? DISH - 0.04 : 0.064, S.landed ? 0.048 : evap ? DY + 0.046 : 0.08, -0.002)
        .show(S.salted && !mic.isOpen && !bar?.playing);
      playback.hidden = !!bar?.playing;
    }
    function update(dt) {
      const k = bar.update(dt),
        delta = Math.min(dt, 0.06) * k;
      S.cloud = Math.max(0, S.cloud - delta * 0.78);
      S.gas = Math.max(0, S.gas - delta * 0.34);
      if (S.phase === 'filter') {
        if (onGuide(S.pos.cup)) S.transferred = Math.min(1, S.transferred + delta * 0.8);
        S.collected = Math.min(S.transferred, S.collected + delta * 0.6);
        if (S.collected === 1) {
          S.filtered = true;
          S.rodDock = null;
          returning('rod');
          if (S.hand !== 'cup') returning('cup');
          record('静置后过滤', '沉淀和难溶物留在滤纸上，滤液澄清。');
          go('acid');
        }
      }
      if (S.filtered) S.filterClear = Math.min(1, S.filterClear + delta * 1.5);
      if (S.effect) {
        S.effect.t += delta;
        if (S.effect.t >= S.effect.dur) {
          if (S.effect.id === 'acid' && S.filtered) acidInFiltrate();
          S.effect = null;
        }
      }
      if (S.lit) {
        S.heatingTime += delta;
        S.stillTime += delta;
        // Water is lost with time on the flame, independently of the rod's motion.
        S.evaporation = Math.min(1, S.evaporation + delta * (S.evaporation < 0.65 ? 0.13 : 0.025));
        if (!S.splashed && S.evaporation >= 0.35 && S.stillTime > 1.4 && S.evaporation < 1) {
          S.splashed = true;
          record('加热时停搅', '皿边有液滴飞溅，损失了部分盐。');
          status('皿边有液滴飞溅。来回搅拌，观察皿中固体的多少。');
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
    for (const event of ['down', 'move']) {
      const handle = pointer[event];
      pointer[event] = (ray, e) => {
        pointerRay = ray;
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
          ...mountXuean(ui, { intro: INTRO, headers: ['操作', '本轮观察'], controls: [moreBox([], reset), note] }),
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
