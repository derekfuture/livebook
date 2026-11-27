// 人教版必修第一册，第 109 页探究、第 122 页实验活动 3 的同周期部分。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { V, LEN, RIM, X, PAD, HOT, apparatus, shellScene, liquidY, salts, solids } from './kit/period3-parts.js';

const INTRO = '回想钠遇水时浮在水面，熔成小球，四处游动。镁在冷水和热水中会怎样？';
const INIT = '将镁条贴着砂纸来回拖，磨亮后提起，把一端放进试管口，再松手。';
const QUANT = '平视量筒，读凹液面最低处。把 2 mL 水倒入试管。';
const COLD = '提起酚酞滴管，悬在管口上方滴入 2 滴，观察冷水里的镁条。';
const LIGHT = '点燃酒精灯，准备加热镁条所在的试管。';
const HEAT = '用试管夹斜持试管，管口朝向无人处。在外焰上来回移动，使盛有液体的一段管壁均匀受热。';
const RETURN_HOT = '观察气泡和颜色后，将试管放回架上。';
const COVER = '把灯帽提到灯芯正上方，放下盖灭酒精灯。';
const UNCOVER = '提起灯帽，移到灯旁放下，再点燃酒精灯继续加热。';
const ATOMS = '比较 Na、Mg、Al 的原子结构';
const DUPLICATE = '两份样品加了同一种试剂，无法作酸碱对照。换掉刚才误滴的那一份，再加另一种试剂。';
const SUB = ['Ⅰ', 'Ⅱ'];
const IDs = ['ribbon', 'water', 'cold', 'heat', 'alPrep', 'alTest', 'mgPrep', 'mgTest'];
const TITLES = ['处理镁条', '加水', '冷水中观察', '加热试管', '制取铝的沉淀', '比较铝的沉淀', '制取镁的沉淀', '比较镁的沉淀'];
const saltStep = (i, test) => IDs[4 + i * 2 + Number(test)];
const newTube = () => ({ vol: 0, solid: 0, reagent: '', drops: 0, mixedDrops: 0, finished: false });
const clearColor = 0xcbdfe4;
const acidName = (key) => key === 'acid' ? '盐酸' : 'NaOH 溶液';
const stockName = (i) => '2 mL 1 mol/L ' + salts[i] + ' 溶液';
const sampleName = (j) => solids[Math.floor(j / 2)] + ' ' + SUB[j % 2];
const mouth = (x) => V(x, RIM + 0.007);
const ANGLE = 0.62;
const flamePoint = (depth) => V(HOT + Math.sin(ANGLE) * (LEN - depth) - 0.004, 0.074 + Math.cos(ANGLE) * (LEN - depth));
const capSeat = V(HOT, 0.049);
const batchSize = (key) => key === 'acid' ? 10 : 6;
const DURATION = 0.40;
// 量筒以倒液口为原点。直立横移时，筒底要高过试管口。
const carryHeight = (measure) => RIM + measure.home.y + 0.012;

export default {
  id: 'period3', title: '第三周期元素性质的递变', fig: '探究', stampText: '实验', style: 'paper',
  predict: {
    q: '两种白色沉淀都能溶于足量盐酸。换成足量 NaOH 溶液，哪种会溶解？',
    options: ['只有 Al(OH)₃', '只有 Mg(OH)₂', '两种都溶解', '两种都不溶解'], answer: 0,
  },
  need: '比较镁与冷水、热水的反应，再比较两种白色沉淀在酸和强碱中的变化。',
  conclusion: {
    crops: [{ page: 114, rect: [219, 57, 537, 202] }],
    quote: '对其他周期主族元素进行同样的研究，一般情况下也会得出类似的结论。在同一周期中，各元素的原子核外电子层数虽然相同，但从左到右，核电荷数依次增多，原子半径逐渐减小，失电子能力逐渐减弱，得电子能力逐渐增强。因此，金属性逐渐减弱，非金属性逐渐增强。元素的金属性和非金属性随着原子序数的递增而呈周期性的变化。',
    formula: '',
    why: '钠在冷水中就剧烈反应，镁加热后反应更明显。NaOH 是强碱，Mg(OH)₂ 是中强碱，Al(OH)₃ 是两性氢氧化物。从 Na、Mg 到 Al，元素的金属性逐渐减弱。',
    src: '必修第一册第 110 页 · 第四章 第二节 元素周期律',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.53, d: 0.36, z: -0.086 });
    const A = apparatus(group);
    const scene = shellScene();
    const cards = Array.from({ length: 4 }, () => tag('', 'cond'));
    cards.forEach((card) => { card.el.dataset.period3Card = ''; });
    const gear = { strip: A.strip, cap: A.cap, cold: A.cold, ind: A.ind, hotTube: A.mg, al: A.measures[0], mg: A.measures[1], nh: A.nh, acid: A.acid, base: A.base };
    A.tubes.forEach((t, i) => { gear['t' + i] = t; });
    const pick = (key) => gear[key].pick;
    const prepKey = (i) => i ? 'mg' : 'al';
    const isTube = (key) => /^t[0-3]$/.test(key);
    const pose = (p) => ({ x: p.x, y: p.y, rot: 0 });
    const fresh = () => ({
      demo: false, mode: -1, rubbed: 0, inserted: false, fall: 0, water: 0, ind: 0, coldTime: 0,
      coldSeen: false, lit: false, heat: 0, warmth: 0, boiled: false, packed: false, replace: -1, loaded: [0, 0], nh: [0, 0],
      split: [0, 0], tubes: X.map(newTube), grip: null, returns: {}, poses: Object.fromEntries(
        Object.entries(gear).map(([key, t]) => [key, pose(t.home)])),
      capped: false, seating: null, readKey: null, lastSample: -1, flight: [], drip: 0, stream: null, clock: 0,
    });
    let S = fresh(), W, saved, viewTime, playingAction, lastPrompt = '';
    const done = (id) => { if (!S.demo) bar.done(id); };
    const say = (s) => { if (!S.demo) W?.ui.status(s); };
    const record = (row) => { if (!S.demo) W?.tbl.add(row); };
    const clean = () => S.rubbed >= 0.045;
    const inSalt = () => S.mode >= 0;
    const section = () => Math.min(1, Math.max(0, S.mode));
    const activePair = () => section() * 2;
    const leftComplete = () => S.tubes[activePair()].finished;
    const rightComplete = () => S.tubes[activePair() + 1].finished;
    const currentTube = () => activePair() + (leftComplete() ? 1 : 0);
    const snapObj = (key) => {
      const { x, y, rot } = S.poses[key], g = gear[key].g;
      g.position.set(x, y, 0); g.rotation.z = rot;
    };
    const wetObs = () => S.boiled ? (clean() ? '气泡增多，溶液变红' : '沸腾，有气泡，红色较浅') :
      S.coldSeen ? (clean() ? '气泡很少，红色不明显' : '变化不明显') : '无色';
    // 每份约含 1 mmol 沉淀。每滴酸或碱约含 0.10 mmol H⁺ 或 OH⁻。
    const equivalent = (j) => S.tubes[j].reagent === 'base' ? 10 : j < 2 ? 30 : 20;
    const alBase = () => S.tubes.slice(0, 2).find((t) => t.reagent === 'base');
    const ammoniaNeed = (i) => i ? 8 : 12;
    const remaining = (j) => {
      const t = S.tubes[j];
      if (!t.reagent || (t.reagent === 'base' && j >= 2)) return t.solid;
      const mixedDose = t.mixedDrops + 0.84 * (t.drops - t.mixedDrops);
      return Math.max(0, t.solid - Math.min(1, mixedDose / equivalent(j)));
    };
    const observation = (j) => {
      const t = S.tubes[j];
      if (t.solid <= 0) return t.vol ? '无色' : '空管';
      if (remaining(j) <= 0.001) return '澄清';
      if (remaining(j) < t.solid - 0.02) return '沉淀减少';
      return j < 2 ? '白色胶状' : '白色沉淀';
    };
    function finishTube(j) {
      const t = S.tubes[j];
      if (t.finished || S.replace >= 0 || t.drops === t.mixedDrops || pending(t.reagent, j)) return;
      const before = t.mixedDrops;
      t.mixedDrops = t.drops;
      if (t.reagent === 'base') {
        // 铝管澄清后还要再补加、振荡。镁管至少用到本轮铝管实际用过的量。
        if (j < 2 && before < equivalent(j)) return;
        if (j >= 2 && t.drops < alBase().drops) return;
      } else if (remaining(j) > 0.001) return;
      t.finished = true;
      say(sampleName(j) + (remaining(j) > 0.001 ? ' 中仍有白色沉淀。' : ' 中的沉淀已经溶解。'));
      record([sampleName(j) + ' 加' + acidName(t.reagent) + '（' + t.drops + ' 滴）、振荡', remaining(j) > 0.001 ? '白色沉淀仍在' : '沉淀溶解，液体澄清']);
      if (leftComplete() && rightComplete()) {
        const i = section();
        done(saltStep(i, true));
        if (i === 0) {
          S.mode = 1;
          say('保留这两支试管。用 MgCl₂ 溶液在右边两支试管做同样的比较。');
        } else {
          S.mode = 2;
          if (!S.demo) {
            W.review.hidden = W.evidence.hidden = false;
            const baseObs = [0, 1].map((n) => {
              const j = S.tubes.findIndex((v, k) => Math.floor(k / 2) === n && v.reagent === 'base');
              return solids[n] + (remaining(j) < 0.001 ? ' 溶解' : ' 仍有白色沉淀');
            });
            W.ui.observePrediction('加入 NaOH 溶液并振荡后，' + baseObs.join('，') + '。');
            say('本轮实验观察：' + baseObs.join('，') + '。再读下表，比较第三周期非金属元素的性质。');
          }
        }
      }
    }

    function allowed(key) {
      if (S.seating || S.readKey || mic?.isOpen || S.replace >= 0) return false;
      if (isTube(key) && S.tubes[Number(key[1])].finished) return true;
      if (S.mode === 2) return false;
      if (S.packed && !inSalt()) return key === 'al';
      if (!inSalt()) {
        if (key === 'strip') return !S.inserted;
        if (key === 'cold') return S.inserted && S.water < 2;
        if (key === 'ind') return S.water >= 2 && !S.coldSeen;
        if (key === 'cap') return S.lit || S.capped;
        if (key === 'hotTube') return S.coldSeen && !S.boiled;
        return false;
      }
      const i = section(), k = activePair();
      if (key === prepKey(i)) return S.loaded[i] < 2;
      if (key === 'nh') return S.loaded[i] >= 2 && !S.split[i];
      if (key === 'acid' || key === 'base') return S.split[i] >= 1;
      if (isTube(key)) {
        const j = Number(key[1]);
        return j === k && S.nh[i] >= ammoniaNeed(i) + 1 || (j === k + 1 && S.split[i] >= 1);
      }
      return false;
    }
    function cue() {
      if (!S.inserted) return ['strip', clean() ? '提起磨亮的镁条，把一端伸进试管口后松手。' : INIT];
      if (S.water < 2) return ['cold', QUANT];
      if (!S.coldSeen) return [S.ind >= 2 ? null : 'ind', S.ind >= 2 ? '观察冷水里镁条表面和液体的颜色。' : COLD];
      if (S.packed && !inSalt()) return ['al', '观察热水中的现象后，拿起 AlCl₃ 量筒，开始沉淀对照。'];
      if (!inSalt()) {
        if (S.capped) return ['cap', UNCOVER];
        if (S.boiled) return S.grip?.key === 'hotTube' ? [null, RETURN_HOT] : ['cap', COVER];
        return S.lit ? ['hotTube', HEAT] : ['lamp', LIGHT];
      }
      if (S.mode === 2) return [null, ''];
      const i = section(), k = currentTube();
      if (S.replace >= 0) return [null, DUPLICATE];
      if (S.loaded[i] < 2) return [prepKey(i), '把装有 ' + salts[i] + ' 溶液的量筒移到' + (i ? '右' : '左') + '组Ⅰ管口，倒入溶液。'];
      if (S.nh[i] < ammoniaNeed(i) + 1) return ['nh', '向' + salts[i] + ' 溶液滴加氨水，直到白色沉淀不再增加。'];
      if (S.split[i] < 1) return ['t' + activePair(), '提起' + solids[i] + ' Ⅰ管，把管口移到同组Ⅱ管口上方，分一半过去。'];
      const t = S.tubes[k];
      if (t.drops > t.mixedDrops) return ['t' + k, '提起' + sampleName(k) + '，左右轻摇，观察沉淀。'];
      const other = S.tubes[activePair() + (k % 2 ? 0 : 1)].reagent;
      const key = t.reagent || (other === 'acid' ? 'base' : 'acid');
      if (key === 'base' && k >= 2) return [key, '铝管用了 ' + alBase().drops + ' 滴 NaOH 溶液，镁管已加 ' + t.drops + ' 滴。继续分批滴加至用量相同，每次轻摇后观察。'];
      if (key === 'base' && t.mixedDrops >= equivalent(k)) return [key, '铝样品已经澄清。再补加少量 NaOH 溶液并轻摇，观察是否仍然澄清。'];
      return [key, '向' + sampleName(k) + ' 滴加 2 mol/L ' + acidName(key) + '，边滴加边振荡。'];
    }
    const hint = (key) => {
      if (!allowed(key)) return '';
      if (key === 'strip') return '拖动镁条，在砂纸上来回磨';
      if (key === 'hotTube') return '用试管夹斜持试管，在外焰上来回移动';
      if (key === 'cap') return S.capped ? UNCOVER : COVER;
      if (key === 'cold' || key === 'al' || key === 'mg') return '拖动量筒，使倒液口对准试管口';
      if (isTube(key)) return !S.tubes[Number(key[1])].finished && S.split[section()] < 1 ? '提起试管，向同组Ⅱ管分装' : '提起试管，左右轻摇';
      return '提起' + ({ nh: '氨水', ind: '酚酞', acid: '盐酸', base: 'NaOH' }[key]) + '滴管，使尖端悬在管口上方';
    };
    function start(key) {
      if (!allowed(key)) return;
      delete S.returns[key];
      const p = S.poses[key];
      S.grip = { key, split: isTube(key) && !S.tubes[Number(key[1])].finished && S.split[section()] < 1, prevX: p.x, prevY: p.y, shake: 0, direction: 0, reversed: false, lifted: false };
      S.drip = 0;
    }
    function heatWall(a, grip) {
      if (!S.lit || S.boiled) return;
      // 把外焰上的一点投到试管轴上，判断火焰扫过的是哪一段湿管壁。
      const sin = Math.sin(a.rot), cos = Math.cos(a.rot);
      const dx = HOT - a.x - LEN * sin, dy = 0.074 - a.y + LEN * cos;
      const depth = dy * cos - dx * sin;
      if (Math.abs(dx * cos + dy * sin) > 0.013 || depth < -0.005 || depth > liquidY(S.water + S.ind * 0.05) + 0.005) {
        grip.zone = 0; return;
      }
      const zone = depth < 0.005 ? -1 : depth > 0.010 ? 1 : 0;
      if (zone && grip.zone && zone !== grip.zone) S.heat += 0.25;
      if (zone) grip.zone = zone;
      S.warmth = S.heat;
      if (S.heat >= 1) {
        S.boiled = true; record(['加热至沸腾', wetObs()]); say(RETURN_HOT);
      }
    }
    function move(key, p) {
      const g = S.grip;
      if (!p || g?.key !== key) return;
      if (key === 'al' && S.packed && !inSalt()) S.mode = 0;
      const t = gear[key], home = t.home, a = S.poses[key];
      const x = clamp(p.x, -0.19, 0.19), y = clamp(p.y, home.y < 0.010 ? 0.003 : 0.006, 0.234);
      const tube = isTube(key) || key === 'hotTube';
      // 在架内只允许竖直提出。管底出了架口，再跟随手横移。
      const isPip = ['ind', 'nh', 'acid', 'base'].includes(key);
      const liftY = tube ? RIM + 0.039 : isPip ? 0.041 : 0;
      if (y >= liftY) g.lifted = true;
      a.x = g.lifted || !liftY ? x : home.x;
      a.y = Math.max(tube && !g.lifted ? home.y : 0.003, y);
      if (key === 'strip') {
        if (!S.demo && W?.ui.step === 0 && Math.hypot(a.x - home.x, a.y - home.y) > 0.001) W.ui.go(1);
        if (Math.abs(a.x - PAD) < 0.036 && a.y < 0.008 && g.prevY < 0.008) {
          const before = clean();
          S.rubbed = Math.min(0.05, S.rubbed + Math.abs(a.x - g.prevX));
          if (!before && clean()) say('镁条表面已经磨亮。把一端伸进试管口后松手。');
        }
        a.rot = clamp((a.y - 0.008) / 0.040, 0, 1) * Math.PI / 2;
      } else if (key === 'hotTube') {
        a.rot = -ANGLE * clamp((a.x - home.x) / (HOT - home.x), 0, 1);
        a.y = Math.max(a.y, LEN * Math.cos(a.rot) + 0.003);
        heatWall(a, g);
      } else if (key === 'cap') {
        a.y = Math.max(a.y, t.home.y);
        if (a.y > capSeat.y + 0.014) g.aboveWick = true;
        if (S.capped && !g.aboveWick) a.x = HOT;
        if (Math.abs(a.x - HOT) < 0.018) a.y = Math.max(a.y, S.lit ? 0.094 : capSeat.y);
      } else if (isTube(key) && !g.split) {
        const j = Number(key[1]), dx = a.x - g.prevX;
        if (g.lifted && a.y >= RIM + 0.030 && Math.abs(dx) > 0.0002) {
          if (g.direction && Math.sign(dx) !== g.direction) g.reversed = true;
          g.direction = Math.sign(dx); g.shake += Math.abs(dx);
          if (g.reversed && g.shake > 0.012 && S.tubes[j].reagent) {
            finishTube(j);
          }
        }
        a.rot = clamp(dx * -6, -0.13, 0.13);
      } else if (!isPip) {
        const target = key === 'cold' ? A.mg.home.x : isTube(key) ? X[activePair() + 1] : X[activePair()];
        const close = clamp((0.049 - Math.abs(a.x - target)) / 0.033, 0, 1);
        const lifted = clamp((a.y - RIM + 0.012) / 0.016, 0, 1);
        const travel = clamp(Math.abs(a.x - home.x) / 0.034, 0, 1);
        a.rot = -1.64 * close * lifted * travel;
        a.y = Math.max(a.y, (isTube(key) ? LEN : 0.058) * Math.max(0, Math.cos(a.rot)) + 0.003);
      }
      if (tube) a.y = Math.max(a.y, LEN * Math.cos(a.rot) + 0.008 * Math.abs(Math.sin(a.rot)) + 0.003);
      g.prevX = a.x; g.prevY = a.y;
      snapObj(key);
    }
    function end(key, moved, zone) {
      const g = S.grip, a = S.poses[key];
      if (g?.key !== key) return;
      if (moved && zone && gear[key].bottle && (g.lastDropX === undefined || Math.abs(g.lastDropX - a.x) > 0.008)) {
        // 管尖刚对准就松手也落一滴；已在此管连续滴加时不额外补一滴。
        S.drip = 1; transfer(0);
      }
      if (key === 'strip' && moved && zone) {
        S.inserted = true;
        done('ribbon');
        record(['放入镁条', clean() ? '表面已磨亮' : '氧化膜未除净']);
        if (clean()) say('磨亮的镁条已落入试管。接下来加入水和酚酞。');
        if (!clean()) say('镁条表面还留着氧化膜。留意反应是否明显，也可以全部重来再比较。');
      } else if (moved && key === 'strip' && !clean() && a.y > 0.02) say('镁条已放回砂纸。贴着砂纸磨亮，再把一端伸进试管口。');
      if (key === 'cap' && S.lit && moved && zone && g.aboveWick) {
        S.seating = { y: a.y, t: 0 };
      } else if (key === 'cap' && S.capped && (!g.aboveWick || Math.abs(a.x - HOT) < 0.018)) {
        Object.assign(a, pose(capSeat));
      } else {
        if (key === 'cap') S.capped = false;
        S.returns[key] = { from: { ...a }, t: 0 };
        if (key === 'hotTube' && S.boiled) say(COVER);
      }
      S.grip = null; S.stream = null;
    }
    function tickReturns(d) {
      if (S.seating) {
        const cap = S.seating;
        cap.t = Math.min(1, cap.t + d / DURATION);
        S.poses.cap.x = HOT;
        S.poses.cap.y = THREE.MathUtils.lerp(cap.y, capSeat.y, cap.t * cap.t * (3 - 2 * cap.t));
        if (cap.t === 1) {
          S.seating = null; S.lit = false; S.capped = true;
          if (S.boiled) {
            S.packed = true; done('heat');
            say('镁与热水反应比与冷水明显。接下来用氨水制取两种白色沉淀。');
          } else say(UNCOVER);
        }
      }
      for (const [key, r] of Object.entries(S.returns)) {
        r.t += d;
        const a = S.poses[key], tool = gear[key], b = tool.home;
        if (tool.cup && (Math.abs(r.from.x - b.x) > 0.001 || r.from.rot !== 0)) {
          const u = Math.min(1, r.t / 1.05);
          const phase = THREE.MathUtils.smoothstep;
          const high = Math.max(r.from.y, carryHeight(tool));
          a.y = THREE.MathUtils.lerp(r.from.y, high, phase(u, 0, 0.27));
          a.rot = r.from.rot * (1 - phase(u, 0.22, 0.42));
          a.x = THREE.MathUtils.lerp(r.from.x, b.x, phase(u, 0.42, 0.76));
          a.y = THREE.MathUtils.lerp(a.y, b.y, phase(u, 0.76, 1));
          if (u === 1) delete S.returns[key];
          continue;
        }
        const u = Math.min(1, r.t / DURATION), k = u * u * (3 - 2 * u);
        a.x = THREE.MathUtils.lerp(r.from.x, b.x, k);
        a.y = THREE.MathUtils.lerp(r.from.y, b.y, k);
        a.rot = r.from.rot * (1 - k);
        // 试管和滴管先回到架口、瓶口上方，再落座。
        if ((isTube(key) || key === 'hotTube' || gear[key].bottle) && Math.abs(r.from.x - b.x) > 0.006) {
          const mid = Math.max(r.from.y, isTube(key) || key === 'hotTube' ? RIM + 0.040 : 0.043);
          const across = clamp(k / 0.64, 0, 1), lower = clamp((k - 0.64) / 0.36, 0, 1);
          a.x = THREE.MathUtils.lerp(r.from.x, b.x, across);
          a.rot = r.from.rot * (1 - across);
          a.y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(r.from.y, mid, across), b.y, lower);
        }
        if (u === 1) delete S.returns[key];
      }
    }
    const canLight = () => S.coldSeen && !S.lit && !S.capped && !S.returns.cap && !S.packed && !mic.isOpen;
    function light() {
      if (!canLight()) return;
      S.lit = true; say(HEAT);
    }
    function replaceSample() {
      const j = S.replace;
      if (j < 0) return;
      const i = section();
      S.flight = S.flight.filter((q) => q.j !== j);
      S.tubes[j] = { ...newTube(), vol: (S.loaded[i] + S.nh[i] * 0.05) / 2, solid: 1 };
      S.replace = -1;
      say(sampleName(j) + ' 已换上等量的新沉淀。请滴加另一种试剂。');
    }
    function onDrop(key, j) {
      if (key === 'ind') { S.ind++; return; }
      S.lastSample = j;
      const t = S.tubes[j], i = Math.floor(j / 2);
      t.vol += 0.05;
      if (key === 'nh') {
        S.nh[i]++;
        t.solid = 2 * Math.min(1, S.nh[i] / ammoniaNeed(i));
        if (S.nh[i] === ammoniaNeed(i) + 1) {
          say('继续滴加氨水，白色沉淀已经不再增加。');
          record([salts[i] + ' 溶液滴加氨水', i ? '白色沉淀不再增加' : '白色胶状沉淀不再增加']);
        }
      } else {
        t.reagent = key;
        t.drops++;
        if (t.drops === 1 && S.tubes[j ^ 1].reagent === key) {
          S.replace = j;
          say(DUPLICATE);
        }
      }
    }
    const pending = (key, j) => S.flight.filter((q) => q.key === key && q.j === j).length;
    function transfer(d) {
      S.stream = null;
      const hand = S.grip, key = hand?.key, i = section(), k = activePair();
      if (!key) return;
      const a = S.poses[key], wet = !inSalt();
      if (key === 'hotTube' || key === 'cap' || S.replace >= 0) return;
      const pour = ['cold', 'al', 'mg'].includes(key) || (hand.split && S.split[i] < 1);
      const pos = wet ? [A.mg.home.x] : X;
      const j = pos.findIndex((x) => Math.abs(x - a.x) < 0.0066);
      if (j < 0 || a.y < RIM + 0.001 || a.y > RIM + (pour ? 0.019 : 0.033)) return;
      if (pour) {
        if (a.rot > -1.50) return;
        if (isTube(key)) {
          if (j !== k + 1 || S.nh[i] < ammoniaNeed(i) + 1) return;
          const from = S.tubes[k], to = S.tubes[j], f = Math.min(1 - S.split[i], d * 1.6);
          const volume = f * (from.vol + to.vol) / 2;
          S.lastSample = j;
          from.vol -= volume; to.vol += volume; from.solid -= f; to.solid += f; S.split[i] += f;
          if (S.split[i] >= 1) { done(saltStep(i, false)); say('两支试管现在各有一份白色沉淀。分别用盐酸和 NaOH 溶液比较。'); }
        } else {
          if (!wet && j !== k) return;
          const prev = wet ? S.water : S.loaded[i], v = Math.min(2 - prev, d * 2.5);
          if (v <= 0) return;
          if (wet) { S.water += v; if (S.water >= 2) { done('water'); say('水已倒入试管，接着滴入酚酞。'); } }
          else { S.lastSample = k; S.loaded[i] += v; S.tubes[k].vol += v; if (S.loaded[i] >= 2) say('Ⅰ管中已加入 ' + salts[i] + ' 溶液。'); }
        }
        const lip = isTube(key) ? 0.008 : 0;
        S.stream = { milky: isTube(key), x: a.x + lip * Math.cos(a.rot), y: a.y + lip * Math.sin(a.rot), end: RIM - LEN + liquidY(wet ? S.water : S.tubes[j].vol) };
      } else if (['ind', 'nh', 'acid', 'base'].includes(key)) {
        if (!wet && (j < k || j > k + 1)) return;
        if (key === 'ind' && S.ind + pending(key, j) >= 2) return;
        if (key === 'nh' && (j !== k || S.nh[i] + pending(key, j) >= ammoniaNeed(i) + 1)) return;
        if (key === 'acid' || key === 'base') {
          if (S.split[i] < 1 || S.tubes[j].finished) return;
          const assigned = S.tubes[j].reagent || S.flight.find((q) => q.j === j)?.key;
          if (assigned && assigned !== key) {
            say('这一份已加过另一种试剂。请将滴管移到同组另一支试管。');
            return;
          }
          const t = S.tubes[j], queued = pending(key, j);
          if (t.drops - t.mixedDrops + queued >= batchSize(key)) return;
          if ((S.tubes[j ^ 1].reagent === key || pending(key, j ^ 1)) && queued) return;
          if (key === 'base' && j >= 2 && t.drops + queued >= alBase().drops) return;
        }
        S.drip += d * (key === 'ind' ? 2.8 : 9);
        if (S.drip >= 1) {
          hand.lastDropX = a.x; S.drip %= 1;
          S.flight.push({ x: a.x, y: a.y, v: 0.16, key, j });
        }
      }
    }
    function tick(d) {
      S.clock += d;
      if (S.inserted) S.fall = Math.min(1, S.fall + d * 3.4);
      tickReturns(d);
      S.warmth = Math.max(0, S.warmth - d * 0.22);
      transfer(d);
      for (let n = S.flight.length - 1; n >= 0; n--) {
        const q = S.flight[n];
        q.v += d * 1.8; q.y -= q.v * d;
        if (q.y <= RIM - LEN + liquidY(q.key === 'ind' ? S.water : S.tubes[q.j].vol)) {
          S.flight.splice(n, 1); onDrop(q.key, q.j);
        }
      }
      if (S.ind >= 2 && !S.coldSeen) {
        S.coldTime += d;
        if (S.coldTime > 1.2) {
          S.coldSeen = true; done('cold');
          record(['冷水中滴入 2 滴酚酞', wetObs()]); say('将冷水里的情况记下，再加热同一支试管。');
        }
      }
    }
    function setPlate(plate, name) {
      if (plate.name !== name) { plate.name = name; plate.setText(name); }
    }
    const measureKey = () => S.packed ? prepKey(section()) : 'cold';
    function readMeasure(key) {
      const cup = gear[key].cup, pos = gear[key].home;
      S.readKey = key;
      look([pos.x + cup.position.x, pos.y + cup.position.y + cup.level, gear[key].g.parent.position.z], [0, 0, 1],
        0.130, () => { S.readKey = null; });
    }
    function leaveMeasure() {
      if (S.readKey) { S.readKey = null; back(); }
    }
    const reader = tag('近看量筒刻度', 'pill', () => {
      if (S.readKey) leaveMeasure(); else readMeasure(measureKey());
    });
    reader.el.setAttribute('role', 'button');
    function draw() {
      const wet = !inSalt(), t = S.clock;
      const row = wet ? A.wet : A.compare;
      if (W) W.replace.hidden = S.replace < 0 || S.demo;
      Object.keys(gear).forEach(snapObj);
      A.strip.g.visible = !S.inserted;
      A.seated.visible = S.inserted;
      A.seated.position.y = THREE.MathUtils.lerp(LEN - 0.006, 0.013, S.fall * S.fall);
      A.stripMat.color.setHex(clean() ? 0xe2e8eb : 0x86898b);
      A.stripMat.roughness = clean() ? 0.23 : 0.68;
      A.lamp.flame.setOn(S.lit);
      A.lamp.flame.scale.setScalar(S.seating ? clamp((S.poses.cap.y - 0.061) / 0.033, 0, 1) : 1);
      A.lamp.flame.update(t);
      A.lamp.flame.visible = S.lit;
      setPlate(A.cold.lab, S.water >= 2 ? '空量筒' : '量筒 · 水');
      A.cold.fill(2 - S.water, S.poses.cold.rot);
      setPlate(A.wetName, !S.inserted ? '空试管' : S.ind ? '试管 · 镁、水和酚酞' : S.water ? '试管 · 镁和水' : '试管 · 镁条');
      const wetLevel = liquidY(S.water + S.ind * 0.05);
      const pink = clean() ? 0xdb4983 : 0xe5a2b5;
      const tint = new THREE.Color(clearColor).lerp(new THREE.Color(pink), S.ind ? S.heat : 0);
      A.mg.liq.visible = !A.mg.tilted(S.poses.hotTube.rot, S.water + S.ind * 0.05, tint);
      A.mg.liq.setLevel(wetLevel).setColor(tint).setMilk(0).update(t);
      A.bubbles.forEach((b, n) => {
        const count = S.water ? (clean() ? 1 : 0) + Math.floor(S.warmth * (clean() ? 19 : 12)) : 0;
        b.visible = n < count;
        if (!b.visible) return;
        const u = (t * (0.22 + S.heat * 1.4) + n * 0.631) % 1;
        b.position.set(Math.sin(n * 7.9 + u) * 0.004, 0.004 + u * (wetLevel - 0.005), 0.001 + 0.0032 * Math.cos(n));
        b.scale.setScalar(0.8 + u * 0.60);
      });
      A.measures.forEach((m, j) => {
        setPlate(m.lab, S.loaded[j] >= 2 ? '空量筒' : '量筒 · ' + salts[j]);
        m.fill(2 - S.loaded[j], S.poses[prepKey(j)].rot);
      });
      A.tubes.forEach((tube, j) => {
        const sample = S.tubes[j];
        const solid = remaining(j);
        const content = !sample.vol ? '空管' : solid > 0.001 ? solids[Math.floor(j / 2)] + ' 沉淀' :
          sample.reagent ? '澄清溶液' : salts[Math.floor(j / 2)] + ' 溶液';
        setPlate(A.tubeNames[j], content);
        tube.liq.visible = !tube.tilted(S.poses['t' + j].rot, sample.vol, remaining(j) > 0.02 ? 0xf7f5ea : clearColor);
        tube.liq.setLevel(liquidY(sample.vol)).setColor(clearColor)
          .setMilk(solid / 2.8, 0xfffcf3, 0xb5b4ac).update(t);
      });
      A.drops.forEach((m, n) => {
        const q = S.flight[n]; m.visible = Boolean(q);
        if (q) { m.position.set(q.x, q.y, row.position.z); m.scale.y = 1.55; m.renderOrder = 11; }
      });
      A.stream.visible = Boolean(S.stream);
      if (S.stream) {
        const s = S.stream;
        A.stream.material.color.setHex(s.milky ? 0xf5f3e6 : 0xb0cbd4);
        A.stream.position.set(s.x, (s.y + s.end) / 2, row.position.z);
        A.stream.scale.y = Math.max(0.001, s.y - s.end);
      }
      const key = S.readKey || measureKey(), cylinder = gear[key], reading = !!S.readKey;
      A.sizePlates(reading, mic.isOpen);
      reader.text(reading ? '回到实验台' : '近看量筒刻度')
        .loc(cylinder.g, cylinder.cup.position.x + (reading ? 0.019 : 0), reading ? cylinder.cup.level - 0.041 : 0.009, 0.006)
        .show(!S.demo && !S.grip && !mic.isOpen && (reading || allowed(key)));
      if (W) W.atoms.hidden = S.mode !== 2 || S.demo || mic.isOpen;
      const showCard = !S.demo && !mic.isOpen && !reading && !S.grip;
      cards.forEach((c, j) => {
        const active = wet ? j === 0 && S.water > 0 : S.tubes[j].vol > 0 && (innerWidth > 760 || S.lastSample === j);
        c.show(showCard && active);
        if (!showCard || !active) return;
        const name = wet ? '镁条试管' : (j < 2 ? '铝' : '镁') + SUB[j % 2] + '管' + (S.tubes[j].reagent ? ' · ' + (S.tubes[j].reagent === 'acid' ? '盐酸' : 'NaOH') : '');
        const word = wet ? (S.boiled ? (clean() ? '变红' : '浅红') : S.coldSeen && clean() ? '少量气泡' : '无色') : observation(j);
        const target = wet ? A.mg : A.tubes[j];
        c.text('<div class="cc"><div class="cc-t"><span class="cc-name">' + name +
          '</span><span class="cc-res">' + word + '</span></div></div>')
          .loc(row, target.home.x, RIM + (wet || j % 2 ? 0.014 : 0.035), -0.008);
      });
    }

    const microPoint = () => V(0, 0.11, 0.02);
    const mic = micro({ tag, look, back, group, scene, bar: () => bar,
      label: ATOMS, at: microPoint,
      scale: 0.0108, dist: 0.35, lookD: [0, 0.27, 1],
      show: () => false, state: () => ({}) });

    // 管尖和量筒倒液口就是拖动原点。分装时用斜管下沿，镁条用竖起后先入管的一端。
    const heatedWall = V(-Math.sin(ANGLE) * (LEN - 0.0075), -Math.cos(ANGLE) * (LEN - 0.0075));
    const splitLip = V(0.008 * Math.cos(-1.64), 0.008 * Math.sin(-1.64));
    function zones(key) {
      if (key === 'strip') return [{ name: '镁条试管', position: V(A.mg.home.x, RIM - 0.016), radius: 0.028 }];
      if (key === 'cap') return [{ name: '灯芯', position: V(HOT, 0.071), radius: 0.030, enabled: () => S.lit && S.grip?.aboveWick === true }];
      if (key === 'hotTube') {
        // 两个落点对应外焰扫过的两段湿管壁，仍须亲手往返移动才能加热。
        return [0, 0.015].map((depth) => ({ name: '外焰', position: flamePoint(depth).add(heatedWall), radius: 0.020,
          enabled: () => S.lit && S.grip?.lifted }));
      }
      if (key === 'cold' || key === 'ind') return [{ name: '镁条试管', position: mouth(A.mg.home.x), radius: 0.028 }];
      return X.map((x, j) => ({
        name: (j < 2 ? '铝' : '镁') + SUB[j % 2] + '管',
        position: isTube(key) ? mouth(x).add(splitLip) : mouth(x), radius: 0.024,
        enabled: () => {
          if (Math.floor(j / 2) !== section()) return false;
          if (isTube(key)) return S.grip?.split && S.grip.lifted && j === activePair() + 1;
          return key === 'acid' || key === 'base' ? !S.tubes[j].finished : j === activePair();
        },
      }));
    }
    const drag = draggable(group, Object.keys(gear).map((key) => ({
      dropzones: zones(key), dropOffset: key === 'strip' ? V(0, -0.012) : key === 'hotTube' ? heatedWall : isTube(key) ? splitLip : null,
      obj: pick(key), plane: 'xy', offset: gear[key].g.parent.position.z, keepOffset: true, anchor: gear[key].g,
      hint: () => hint(key), enabled: () => allowed(key),
      onStart: () => start(key), onDrag: (p) => move(key, p), onEnd: (moved, zone) => end(key, moved, zone),
    })), { tip: tag('', 'pill'), taps: [{ obj: A.lamp.children[0], enabled: canLight,
      hint: LIGHT, onTap: light }] });
    const act = demoActs(drag, group);
    // 演示与质检都拿同一件器材、经过同一串手的位置。允许提前松手和再次拿起。
    const trip = (key, points, opt = {}) => act.path(pick(key), [gear[key].home, ...points], {
      t0: 0.015, t1: 0.50, release: 0.94, ...opt });
    const slide = (key, x) => trip(key, [V(gear[key].home.x, 0.142), V(x, 0.142), mouth(x)]);
    const pourMeasure = (key, x) => {
      const high = carryHeight(gear[key]);
      return trip(key, [V(gear[key].home.x, high), V(x, high), mouth(x)], { t1: 0.36, release: 0.70 });
    };
    const rub = () => trip('strip', [V(PAD - 0.015, 0.0035), V(PAD + 0.016, 0.0035), V(PAD - 0.012, 0.0035)], { t1: 0.81 });
    const placeStrip = () => trip('strip', [V(PAD, RIM + 0.018), V(A.mg.home.x, RIM + 0.018), V(A.mg.home.x, RIM - 0.004)]);
    const warm = () => trip('hotTube', [V(A.mg.home.x, RIM + 0.052),
      ...[0, 0.015, 0, 0.015, 0, 0.015, 0].map(flamePoint)], { t1: 0.85 });
    const cover = () => trip('cap', [V(A.cap.home.x, 0.099), V(HOT, 0.099), V(HOT, 0.071)], { release: 0.71 });
    const split = (i) => slide('t' + (2 * i), X[2 * i + 1]);
    const shake = (j) => {
      const x = X[j], y = RIM + 0.046;
      return trip('t' + j, [V(x, y), V(x + 0.010, y), V(x - 0.010, y), V(x + 0.008, y), V(x, y)], { t1: 0.88 });
    };
    // 分批滴加，放回滴管再振荡。演示也以本轮样品的观察结果为准。
    function alternate(key, j, batches) {
      const dose = slide(key, X[j]), mix = shake(j);
      let last = -1;
      return (u) => {
        const pos = u * batches, n = Math.min(batches - 1, Math.floor(pos)), part = pos - n;
        if (u === 0 || n !== last) { dose(0); mix(0); last = n; }
        if (S.tubes[j].finished) { mix(1); return; }
        if (part <= 0.65) dose(part / 0.65);
        else { dose(1); mix((part - 0.65) / 0.35); }
      };
    }
    const moves = [
      { cap: '把镁条贴着砂纸来回移动，除去表面的氧化膜。', name: '打磨镁条', fn: rub, dur: 1.7 },
      { cap: '把磨亮的镁条放入试管。', name: '放入镁条', fn: placeStrip, dur: 1.6 },
      { cap: '向试管中加入 2 mL 水。', name: '倒入水', fn: () => pourMeasure('cold', A.mg.home.x), dur: 4 },
      { cap: '滴入 2 滴酚酞，先观察冷水里的镁条。', name: '冷水和酚酞', fn: () => slide('ind', A.mg.home.x), dur: 4.8 },
      { cap: LIGHT, name: '点燃酒精灯', fn: () => act.tap(A.lamp.children[0], 0.25), dur: 1.3 },
      { cap: HEAT, name: '加热至沸腾', fn: warm, dur: 5.4 },
      { cap: COVER, name: '盖灭酒精灯', fn: cover, dur: 1.8 },
    ];
    for (const i of [0, 1]) {
      const k = i * 2;
      moves.push(
        { name: '倒入' + salts[i], cap: '向Ⅰ管加入' + stockName(i) + '。', fn: () => pourMeasure(prepKey(i), X[k]), dur: 4 },
        { name: salts[i] + '滴氨水', cap: '滴加氨水，直到白色沉淀不再增加。', fn: () => slide('nh', X[k]), dur: 4.8 },
        { name: '分装' + solids[i], cap: '将' + solids[i] + ' 沉淀分装在两支试管中。', fn: () => split(i), dur: 3.0 });
      for (const [offset, key] of [[0, 'acid'], [1, 'base']]) {
        const j = k + offset;
        const batches = key === 'acid' ? (i ? 2 : 3) : 3;
        moves.push({ name: sampleName(j) + '滴' + acidName(key) + '并振荡',
          cap: '向' + sampleName(j) + ' 分批滴加 2 mol/L ' + acidName(key) + '，每次轻摇后观察。',
          fn: () => alternate(key, j, batches), dur: batches * (key === 'acid' ? 5.2 : 4.3) });
      }
    }
    // 同一镜头可以有多个连续动作，底部不挤出二十个镜头编号。
    const sequence = (first, end) => {
      const chunk = moves.slice(first, end), dur = chunk.reduce((sum, m) => sum + m.dur, 0);
      const parts = chunk.map((m) => m.fn());
      let prev = -1;
      return { cap: chunk[0].cap, dur: dur / 1.8, speed: 1.8,
        enter() { prev = -1; },
        during(k) {
          let seconds = k * dur, n = 0;
          while (n < chunk.length - 1 && seconds >= chunk[n].dur) { seconds -= chunk[n].dur; n++; }
          if (prev !== n) {
            if (prev >= 0) parts[prev](1);
            parts[n](0); prev = n; bar.caption(chunk[n].cap);
          }
          parts[n](seconds / chunk[n].dur);
        } };
    };
    const bar = lessonBar({ look, back, group, ringOptions: { minOpacity: 0.58 },
      steps: IDs.map((id, j) => ({ id, title: TITLES[j], todo: j === 0 ? INIT : TITLES[j],
        target: () => { const [key] = cue(); return mic.isOpen || S.readKey || S.grip || S.seating || !key ? null : key === 'lamp' ? A.lamp : gear[key].g; } })),
      reels: { demo: { label: '老师演示', seal: '演示',
        onStart() {
          W?.ui.el.classList.add('period3-demo');
          saved = S; viewTime = mic.isOpen ? scene.time() : null;
          if (S.readKey) back();
          drag.clearDropzones(); mic.close(); S = fresh(); S.demo = true; draw();
        },
        onEnd() {
          W?.ui.el.classList.remove('period3-demo');
          mic.close(); S = saved; saved = null; draw();
          if (viewTime !== null) { mic.open(); scene.time(viewTime); }
          if (S.readKey) readMeasure(S.readKey);
          lastPrompt = '';
        },
        shots: [sequence(0, 2), sequence(2, 4), sequence(4, 7), sequence(7, 10), sequence(10, 12),
          sequence(12, 15), sequence(15, 17), { cap: '比较三种原子的电子层、核电荷和半径。', dur: 4,
            cam: () => { const p = microPoint(); return [[p.x, p.y + 0.05, p.z], [0, 0.27, 1], 0.35]; }, enter: () => mic.open(true) }],
      } },
    });
    const layer = [...document.querySelectorAll('.mw')].pop(); layer.dataset.period3 = '';
    const barEl = [...document.querySelectorAll('.lbar')].pop(); barEl.dataset.period3 = '';
    const layout = h('style', {}, `
      [data-period3].period3-demo .p-body {visibility:hidden}
      [data-period3] .big-next:disabled { display:none }
      .mw[data-period3] .mw-hud { top:80px!important }
      .mw[data-period3] .mw-dim {
        background:rgba(246,242,232,.86);
        -webkit-mask-image:none;mask-image:none;
        -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
      }
      .period3-evidence {margin:6px 0 10px;padding:8px 10px;background:#f5f0e5;color:#423d36;font:14px/1.45 var(--sans)}
      .period3-evidence p {margin:3px 0}
      .period3-evidence table {width:100%;border-collapse:collapse}
      .period3-evidence td {border-bottom:1px solid #d8d0bf;padding:2px 4px}
      [data-period3] .cc-t { gap:4px }
      [data-period3] .answer .src { padding:0 72px 13px 0;min-height:50px }
      @media(max-width:760px) {
        .lbar[data-period3] .lb-steps { display:none }
        .mw[data-period3] .mw-hud,.mw[data-period3] .mw-scale { left:4%!important;width:92%!important }
        .mw[data-period3] .mw-hud { top:34vh!important;background:rgba(250,248,241,.94);padding:4px 0 }
        .mw[data-period3] .mw-eq { font-size:20px }
        [data-period3] .opts { grid-template-columns:1fr 1fr;gap:4px }
        .tag3d[data-period3-card] .cc { padding:2px 4px }
        .tag3d[data-period3-card] .cc-t { flex-direction:column;gap:1px;font-size:10px }
        .tag3d[data-period3-card] .cc-name,.tag3d[data-period3-card] .cc-res { font-size:10px }
        .mw[data-period3] .mw-close { left:auto!important;right:10px;top:52px!important }
      }
    `);
    document.head.append(layout);
    const reset = () => {
      if (bar.playing) bar.stop();
      playingAction = null; drag.clearDropzones(); leaveMeasure(); mic.close(); S = fresh(); draw(); lastPrompt = '';
      W.review.hidden = W.evidence.hidden = true; W.tbl.clear(); W.ui.observePrediction(null); W.ui.relock();
      bar.undo(...IDs); bar.say(null); say(INTRO);
    };
    const qa = qaFlow(drag, moves.map((m, j) => j === 1 ? { name: m.name, drag: pick('strip'), to: V(A.mg.home.x, RIM - 0.004) } : j === 4 ? { name: m.name, tap: A.lamp.children[0] } : {
      name: m.name, scale: 2, wait: m.dur + 0.8, run() {
        const fn = m.fn(); fn(0); playingAction = { fn, time: 0, dur: m.dur };
      },
    }).concat([
      { name: '核对四支试管', run() {
        if (!S.boiled || S.lit || !S.packed || !S.coldSeen || !bar.finished || S.mode !== 2 || !S.tubes.every((t) => t.finished) ||
            S.tubes[1].drops <= equivalent(1) || S.tubes[1].drops !== S.tubes[3].drops ||
            ![0, 1, 2].every((j) => remaining(j) < 0.001) || remaining(3) < 0.99) throw Error('四组实验现象未完成');
      } },
      { name: '比较原子结构', run: () => mic.open(), wait: 2.5, scale: 1 },
      { name: '回到桌上', run: () => mic.close(), wait: 1 },
    ]));
    draw();
    return {
      group: root, card: false, pointer: { ...drag,
        down(r, e) { if (bar.playing) { bar.stop(); return true; } return drag.down(r, e); },
        items: () => drag.items().filter((item) => item.enabled()) }, toggles: ['cards', 'steps'],
      size: { w: 0.38, d: 0.24, h: 0.21 }, view: { azim: 0, elev: 38, lookY: 0.46, get frameMargin() { return innerWidth <= 760 ? 1.46 : 1.13; } },
      mount(ui) {
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '氯化铝和氯化镁都能用氨水制出白色沉淀。只加盐酸，能区分这两种沉淀吗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '第 36 页回顾：2Na + 2H₂O ═ 2NaOH + H₂↑。第 109 页探究：Mg + 2H₂O ═ Mg(OH)₂ + H₂↑（加热）。沸腾时气泡中也有水蒸气。'),
          h('p', { class: 'fineprint' }, '每组取 2 mL 1 mol/L 氯化物溶液。盐酸和 NaOH 溶液均为 2 mol/L。每滴约 0.05 mL。模型只估算酸、碱与沉淀的反应，观察时以振荡后的现象为准。氨水用量、反应快慢、气泡多少和颜色深浅均为示意。'),
          h('p', { class: 'fineprint' }, '课本安全图标提醒佩戴护目镜、穿实验服，留意腐蚀性试剂和火焰，实验后洗手。'),
          h('p', { class: 'fineprint' }, '第 108 页表 4-5 给出原子半径。三个模型共用一把比例尺，圆圈表示电子层，点表示电子，不表示运动轨迹。'));
        const replace = h('button', { class: 'go ghost', hidden: true, onclick: replaceSample }, '换一份同组样品');
        const evidence = h('section', { class: 'period3-evidence', hidden: true },
          h('strong', {}, '课本资料 · 第 109 页'),
          h('p', {}, '最高价氧化物对应水化物的酸性'),
          h('table', {}, h('tbody', {}, [
            ['Si', 'H₂SiO₃', '弱酸'], ['P', 'H₃PO₄', '中强酸'], ['S', 'H₂SO₄', '强酸'], ['Cl', 'HClO₄', '强于硫酸'],
          ].map((row) => h('tr', {}, row.map((v) => h('td', {}, v)))))),
          h('p', {}, '从 Si 到 Cl，酸性依次增强，说明这四种元素的非金属性逐渐增强。'));
        const atoms = h('button', { class: 'go ghost', hidden: true, onclick: () => mic.open() }, ATOMS);
        ui.el.querySelector('.flap-wrap').after(atoms);
        W = { ...mountXuean(ui, { controls: [replace, review, model, moreBox([], reset)], headers: ['操作', '本轮所见'], intro: INTRO }), ui, review, evidence, replace, atoms };
        ui.el.dataset.period3 = '';
        const next = ui.el.querySelector('.progress-need').previousElementSibling;
        next.classList.add('big-next'); ui.controls.prepend(evidence, next); W.next.remove();
        ui.observePrediction(null);
        bar.attach(ui);
      },
      update(dt) {
        const speed = bar.update(dt), d = dt * speed;
        if (playingAction && !S.demo) {
          const q = playingAction; q.time += d; q.fn(Math.min(1, q.time / q.dur));
          if (q.time >= q.dur) playingAction = null;
        }
        drag.update(Math.min(d, 0.08));
        if (d > 0) tick(d);
        if (!S.demo) {
          const prompt = cue()[1];
          if (prompt !== lastPrompt) { lastPrompt = prompt; bar.say(prompt || null); }
        }
        draw(); mic.update(dt, speed);
      },
      reset, dispose() { layout.remove(); drag.dispose(); bar.dispose(); mic.dispose(); },
      debug: { get S() { return S; }, bar, qa, mic, picks: Object.fromEntries(Object.keys(gear).map((k) => [k, pick(k)])) },
    };
  },
};
