// 人教版选择性必修 1，实验活动 2，印刷页 91–92。
import * as T from 'three';
import { h } from '../ui/Panel.js';
import { show } from '../ui/prefs.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { V, X, TIP, TOP, EQ, DROP, WALL_SECTORS, levelAt, emptyReading, cupLevel, apparatus, meniscusScale, plotCurve, ions, pH } from './kit/titration-parts.js';

const INTRO = '两支滴定管已用水检查，均不漏水。各用所盛溶液润洗两次。';
const NAMES = ['酸式滴定管', '碱式滴定管'],
  REAGENTS = ['标准盐酸', '待测 NaOH 溶液'];
const TITLES = ['分别润洗、装液和排气泡', '记录初读数', '量取待测液', '滴入酚酞', '边滴边摇', '观察并读数'];
const MODEL =
  '课本第 91—92 页。标准盐酸为 0.100 0 mol/L，待测液取 20.00 mL。模型取 25 ℃，假定强酸强碱完全电离，忽略活度和指示剂体积。理论 pH 按电荷守恒与水的离子积计算。';
const SCALE =
  '每次润洗取 4 mL，每滴酸约 0.04 mL，均为示意。靠近终点时减慢滴速，颜色按酚酞变色范围近似显示。连续滴酸加快显示，观察计时为 5 倍速。器材尺寸和离子数为示意。';
const FIX = (v) => v.toFixed(2),
  round = (v) => Math.round(v * 100) / 100;
const freshTube = () => ({
  rinses: 0,
  poured: 0,
  charge: 0,
  wet: false,
  wall: Array(WALL_SECTORS).fill(0),
  roll: 0,
  reading: null,
  primed: false,
  zero: false,
  angle: 0,
  bend: 0,
});
export default {
  id: 'titration',
  title: '强酸与强碱的中和滴定',
  fig: '实验活动 2',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '同样是半滴盐酸，在刚开始滴定和粉红色即将褪去时，哪一次会让 pH 下降得更多？',
    options: ['刚开始时', '即将褪色时', '两次一样多'],
    answer: 1,
  },
  need: '用标准盐酸滴定待测 NaOH 溶液，观察颜色和 pH 曲线。',
  conclusion: {
    crops: [{ page: 96, rect: [58, 473, 533, 557] }],
    quote:
      '把锥形瓶放在酸式滴定管的下方，瓶下垫一张白纸，小心地滴入酸。边滴边摇动锥形瓶（接近终点时，改为滴加半滴酸），直到因加入半滴酸后，溶液颜色从粉红色刚好变为无色，且半分钟内不变色。这表示已经到达滴定终点。记录滴定管液面的读数，并填入下表中。',
    formula: 'H⁺ + OH⁻ → H₂O',
    src: '课本第 92 页 · 实验活动 2',
  },
  create({ tag, look, back }) {
    const root = new T.Group(),
      g = new T.Group();
    root.add(g);
    paperSheet(g, { w: 0.53, d: 0.34 });
    const b = apparatus(g),
      cupHome = b.cups.map((c) => c.g.position.clone()),
      flaskHome = V(0.091, 0.001);
    const fresh = () => ({
      demo: false,
      tubes: [freshTube(), freshTube()],
      cupPos: cupHome.map((p) => p.clone()),
      cupAngle: [0, 0],
      waste: V(0),
      wasteVol: 0,
      parked: false,
      flask: flaskHome.clone(),
      station: null,
      pip: b.pipHome.clone(),
      base: 0,
      sampled: false,
      trial: 1,
      flow: null,
      transfer: null,
      closeScale: null,
      flights: [],
      dye: 0,
      trace: [],
      acid: 0,
      initial: null,
      final: null,
      clock: 0,
      acidOpen: false,
      dropTime: 0,
      mixed: 0,
      slosh: 0,
      returns: [],
      pulse: 0,
      source: null,
      grip: null,
      rows: [],
    });
    let s = fresh(),
      saved,
      W,
      lastDraw = '',
      cancelled = false,
      restoredMicro = false,
      panelView;
    const lens = tag('', 'tit-lens').show(false);
    const card = tag('', 'cond'),
      scene = ions();
    const mic = micro({
      tag,
      look,
      back,
      group: g,
      scene,
      at: () => s.flask.clone().add(V(0, 0.026)),
      btnAt: () => s.flask.clone().add(V(0, 0.047, 0.009)),
      state: () => ({ volume: arrivedAcid() }),
      show: () => s.sampled && !s.grip && !s.flights.length,
      bar: () => bar,
      label: '钻进锥形瓶里看',
      lookD: [0, 0.53, 1],
      dist: 0.31,
      scale: 0.008,
    });
    const microOverlay = Array.from(document.querySelectorAll('.mw')).pop();
    const enabled = (fn) => () => !mic.isOpen && !s.transfer && fn();
    const msg = (t) => {
      if (!s.demo) W?.ui.status(t);
    };
    const done = (k) => {
      if (!s.demo) bar.done(String(k));
    };
    const prep = () => s.tubes.every((t) => t.zero);
    const finished = () => s.final !== null;
    const near = () => s.acid >= round(EQ - DROP / 2);
    const over = () => s.acid > EQ;
    const sampling = () => s.station === 1 && !s.sampled;
    const finalReady = () => !finished() && (s.clock >= 30 || (over() && !inFlight('acid')));
    // The same meniscus is visible while dispensing and while recording.
    function meterTube() {
      const i = activeTube();
      if (s.transfer) return -1;
      if (i >= 0) return s.tubes[i].reading !== null ? i : -1;
      if (s.initial === null || finalReady()) return 0;
      return sampling() ? 1 : -1;
    }
    const activeTube = () => s.tubes.findIndex((t) => !t.zero);
    const note = (src) => {
      s.source = src;
      s.pulse = 0.32;
    };
    const inFlight = (field) => s.flights.reduce((sum, drop) => sum + (drop.field === field ? drop.amount : 0), 0);
    const arrivedAcid = () => round(s.acid - inFlight('acid'));
    function releaseDrop(i, field, amount, half = false, age = 0) {
      note(i);
      const prev = s.flights[s.flights.length - 1];
      if (field !== 'acid' && prev && prev.field === field && prev.age < 0.085 && !half) {
        prev.amount += amount;
        return;
      }
      const start = i === 2 ? pipTo() : V(X[i], TIP);
      s.flights.push({ i, field, amount, start, half, age });
    }
    function prompt() {
      const i = activeTube();
      if (i >= 0) {
        const t = s.tubes[i],
          n = NAMES[i];
        if (!t.charge && t.reading === null)
          return t.rinses < 2
            ? `将${REAGENTS[i]}的烧杯嘴拖到${n}上口，加入第 ${t.rinses + 1} 份润洗液。`
            : `用烧杯向${n}装液至零刻度以上。`;
        if (t.charge && !t.wet) return `将${n}上半部向外拖到接近水平，再向下拖，使管身转一圈。`;
        if (t.wet) return `点${n}的阀，将润洗液从下端放入废液烧杯。`;
        if (!t.primed)
          return i
            ? '捏住碱式滴定管的尖嘴，向左上翻起，挤压乳胶管赶出气泡。'
            : '打开酸式滴定管活塞，快速放液，赶出尖嘴中的气泡。';
        if (t.reading > 0) return `液面低于零刻度。用${REAGENTS[i]}补液，再调零。`;
        return `按住${n}的阀放液，接近零刻度时轻点，凹液面最低处到零时松手。`;
      }
      if (s.initial === null) return '平视酸式滴定管的放大刻度，读出凹液面最低处的初读数，填入记录。';
      if (!s.parked) return '向左前方拖开废液烧杯，空出两支滴定管下方的位置。';
      if (!s.sampled) {
        if (!sampling()) return '拖锥形瓶到碱式滴定管尖嘴正下方。';
        if (s.base > 20) return '取样超过 20.00 mL，点击重新取样。';
        return '按住碱式滴定管的玻璃球放液，接近 20.00 mL 时轻点。平视凹液面最低处，填入读数。';
      }
      if (s.dye < 2)
        return s.station === 1 ? '把锥形瓶拖到右侧空位，再加酚酞。' : '提起酚酞滴管，对准锥形瓶口滴入 2 滴。';
      if (s.station !== 0) return '拖锥形瓶到酸式滴定管下方的白纸上。';
      if (s.acid >= EQ && arrivedAcid() !== s.acid) return '观察酸滴落入锥形瓶。';
      if (over()) return finished() ? '本轮已标为过量，可重复滴定。' : '盐酸已过量。读出酸式滴定管的末读数，记下本轮耗酸量。';
      if (finished()) return '这次的读数已记入表中。';
      if (s.clock >= 30) return '平视酸式滴定管的放大刻度，读出凹液面最低处的末读数，填入记录。';
      if (s.acid >= EQ) return s.mixed < EQ ? '轻摇锥形瓶使溶液混匀，再观察颜色。' : '观察无色能否保持半分钟。';
      if (near()) return inFlight('acid') ? '观察酸滴落入锥形瓶。' : '轻点酸式滴定管活塞，加半滴酸，再轻摇锥形瓶。';
      return s.acidOpen ? '轻轻左右拖动锥形瓶摇匀。再点活塞可暂停滴酸。' : '点酸式滴定管活塞开始滴酸，再轻轻左右拖动锥形瓶摇匀。';
    }
    function target() {
      const i = activeTube();
      if (s.transfer) return null;
      if (i >= 0) {
        const t = s.tubes[i];
        if (t.reading > 0) return b.cups[i].g;
        if (i === 1 && t.reading !== null && !t.primed) return b.tubes[i].nozzle;
        return !t.charge && t.reading === null ? b.cups[i].g : t.charge && !t.wet ? b.tubes[i].t : b.tubes[i].valve;
      }
      if (finished()) return null;
      if (s.initial === null || finalReady()) return b.tubes[0].meniscus;
      if (s.acid >= EQ) return b.flask;
      if (!s.parked) return b.waste;
      if (sampling()) return s.base >= 20 ? b.tubes[1].meniscus : b.tubes[1].valve;
      if (s.sampled && s.dye < 2) return s.station === 1 ? b.flask : b.pip;
      return s.station === 0 && !s.acidOpen ? b.tubes[0].valve : b.flask;
    }
    const refresh = () => {
      if (!s.demo) {
        bar.say(prompt());
        msg(prompt());
      }
    };
    const addAcid = (v, age = 0) => {
      if (over() || finished()) return;
      s.acid = round(s.acid + v);
      s.trace.push(s.acid);
      s.tubes[0].reading = s.acid;
      s.clock = 0;
      releaseDrop(0, 'acid', v, v < DROP, age);
      if (near()) refresh();
    };
    const cupAllowed = (i) =>
      activeTube() === i && !s.tubes[i].charge && (s.tubes[i].reading === null || s.tubes[i].reading > 0);
    const pourTo = (i) => V(X[i], TOP + 0.009);
    const returns = (name, i, from, to, angle = 0, roll = 0) =>
      s.returns.push({ name, i, from: from.clone(), to: to.clone(), angle, roll, t: 0 });
    const begin = (name, i) => {
      s.returns = s.returns.filter((r) => r.name !== name || r.i !== i);
      s.grip = name;
    };
    const guarded = (obj, anchor, ok, hint, handlers) => {
      const available = enabled(ok);
      return { obj, anchor, keepOffset: true, enabled: available, hint: () => available() ? hint : '', ...handlers };
    };
    const drags = [];
    b.cups.forEach((c, i) => {
      drags.push(
        guarded(c.pick, c.lip, () => cupAllowed(i), `拖动${REAGENTS[i]}的烧杯嘴，对准管口`, {
          dropzones: [{
            name: `${NAMES[i]}上口`,
            position: () => pourTo(i),
            radius: 0.021,
            enabled: () => cupAllowed(i),
            onDrop() {
              const t = s.tubes[i], rinse = t.rinses < 2;
              const start = rinse ? 0 : t.reading ?? emptyReading;
              const end = rinse ? 4 : t.primed ? -2 : -2.5;
              s.transfer = { kind: rinse ? 'rinse' : 'fill', i, time: 0, duration: rinse ? 0.52 : 0.88,
                start, end, poured: t.poured };
            },
          }],
          onStart: () => begin('cup', i),
          onDrag(p) {
            const approach = clamp((p.y - 0.055) / (pourTo(i).y - 0.055), 0, 1);
            poseCup(i, p, approach);
          },
          onEnd(moved, dropped) {
            if (!dropped) returns('cup', i, s.cupPos[i], cupHome[i], s.cupAngle[i]);
            s.grip = null;
            refresh();
            if (moved && !cancelled && !dropped) {
              const lip = s.cupPos[i].clone().add(c.lip.position.clone().applyAxisAngle(V(0, 0, 1), s.cupAngle[i]));
              msg(
                lip.distanceTo(pourTo(1 - i)) < 0.012
                  ? '这支管装另一种溶液。将杯嘴移到对应滴定管的上口。'
                  : '杯嘴未对准管口，液体还在烧杯中。',
              );
            }
          },
        }),
      );
    });
    const tiltTo = (i) => V(X[i] + (i ? 1 : -1) * 0.125, TIP - 0.005);
    b.tubes.forEach((tube, i) =>
      drags.push(
        guarded(tube.body, tube.grasp, () => !!s.tubes[i].charge && !s.tubes[i].wet, '拖住管身向外倾转，润湿全部内壁', {
          onStart: () => begin('tube', i),
          onDrag(p) {
            const t = s.tubes[i], sign = i ? -1 : 1;
            const travel = Math.atan2(Math.max(0, sign * (X[i] - p.x)), p.y - TIP);
            const start = t.roll ? 1.26 + 0.30 * t.roll / (2 * Math.PI) : Math.abs(t.angle) / 1.25;
            // Follow the same tilt-then-roll path between sparse pointer events.
            const steps = Math.max(1, Math.ceil(Math.abs(travel - start) / 0.025));
            for (let j = 1; j <= steps; j++) {
              const u = start + (travel - start) * j / steps;
              t.angle = sign * Math.min(u * 1.25, Math.PI / 2 - 0.002);
              t.roll = clamp((u - 1.26) / 0.30, 0, 1) * Math.PI * 2;
              tube.sweepWall(t, t.angle, t.roll);
            }
          },
          onEnd() {
            const t = s.tubes[i];
            t.wet = !cancelled && t.wall.every((coverage) => coverage >= 0.999);
            returns('tube', i, V(0), V(0), t.angle, t.roll % (2 * Math.PI));
            s.grip = null;
            refresh();
          },
        }),
      ),
    );
    const wasteTo = V(-0.107, 0, 0.06);
    const wasteOK = () => s.initial !== null && !s.parked;
    drags.push(
      guarded(b.wastePick, b.waste, wasteOK, '把废液烧杯拖向左前方，移开杯口', {
        plane: 'xz',
        dropzones: [{ name: '左前方空位', position: wasteTo, radius: 0.078, enabled: wasteOK, onDrop() { s.parked = true; } }],
        onStart: () => begin('waste', 0),
        onDrag(p) {
          s.waste.copy(p).y = 0;
        },
        onEnd(moved, dropped) {
          if (!dropped) returns('waste', 0, s.waste, V(0));
          s.grip = null;
          refresh();
        },
      }),
    );
    const station = (i) => V(X[i], 0.001);
    const flaskOK = () => s.parked && !finished() && !inFlight('dye') && !inFlight('base') && (!sampling() || !s.base);
    const neck = V(0, 0.062);
    const flaskZone = (index, name, base, ready) => ({
      name, position: () => base().add(neck), radius: 0.016,
      enabled: () => flaskOK() && s.station !== index && ready(),
      onDrop() { s.station = index; },
    });
    drags.push(
      guarded(b.flaskPick, b.flask, flaskOK, '拖动锥形瓶，对准尖嘴；滴定时轻轻摇动', {
        dropOffset: neck,
        dropzones: [
          flaskZone(1, '碱式滴定管下方', () => station(1), () => !s.sampled),
          flaskZone(2, '右侧空位', () => flaskHome.clone(), () => s.sampled && s.dye < 2),
          flaskZone(0, '酸式滴定管下方的白纸', () => station(0), () => s.dye === 2),
        ],
        onStart() {
          begin('flask', 0);
        },
        onDrag(p) {
          if (s.station !== 0) {
            s.flask.set(p.x, clamp(p.y, 0.001, 0.135), 0);
            return;
          }
          const x = clamp(p.x, X[0] - 0.006, X[0] + 0.006);
          const dx = x - s.flask.x;
          s.flask.x = x;
          if (Math.abs(dx) > 0.00005) {
            s.slosh = clamp(s.slosh - dx * 32, -0.09, 0.09);
            const needsMix = s.mixed < EQ && arrivedAcid() === EQ;
            s.mixed = arrivedAcid();
            if (needsMix) refresh();
          }
        },
        onEnd(moved, dropped) {
          if (!dropped) returns('flask', 0, s.flask, s.station === null || s.station === 2 ? flaskHome : station(s.station));
          s.grip = null;
          refresh();
        },
      }),
    );
    const pipTo = () => s.flask.clone().add(V(0, 0.068));
    const pipOK = () => s.sampled && s.station === 2 && s.dye < 2 && !inFlight('dye');
    drags.push(
      guarded(b.pipPick, b.pip, pipOK, '将酚酞滴管尖端悬在瓶口上方', {
        dropzones: [{
          name: '锥形瓶口', position: pipTo, radius: 0.016, enabled: pipOK,
          onDrop() {
            releaseDrop(2, 'dye', 1);
          },
        }],
        onStart: () => begin('pip', 0),
        onDrag(p) {
          s.pip.copy(p);
        },
        onEnd() {
          returns('pip', 0, s.pip, b.pipHome);
          s.grip = null;
          refresh();
        },
      }),
    );
    function prime(i) {
      s.transfer = { kind: 'prime', i, time: 0, duration: 0.34, start: s.tubes[i].reading, end: -2, waste: s.wasteVol };
    }
    function valveOK(i) {
      const t = s.tubes[i];
      if (activeTube() === i) return t.wet || (t.reading !== null && t.reading <= 0 && (!i || t.primed));
      return i ? sampling() && s.base <= 20 : s.station === 0 && s.dye === 2 && !finished() && !over() && (!near() || !inFlight('acid'));
    }
    // One light press releases one drop. Holding the valve repeats drops until release.
    function dispense(i, drops = 1) {
      const t = s.tubes[i],
        amount = drops * DROP;
      t.reading = round(t.reading + amount);
      if (t.zero) s.base = t.reading;
      else s.wasteVol += amount;
      releaseDrop(i, t.zero ? 'base' : 'waste', amount);
    }
    const valves = b.tubes.map((tube, i) =>
      guarded(tube.handle, tube.valve, () => valveOK(i), i ? '轻挤乳胶管中的玻璃球' : '轻转玻璃活塞', {
        onStart() {
          if (!valveOK(i)) return;
          const t = s.tubes[i];
          if (t.wet) {
            s.transfer = { kind: 'drain', i, time: 0, duration: 0.48, start: t.charge, end: 0, waste: s.wasteVol };
          } else if (!t.primed) prime(i);
          else if (!i && t.zero) {
            if (near()) addAcid(DROP / 2);
            else {
              s.acidOpen = !s.acidOpen;
              s.dropTime = 0;
              if (s.acidOpen) addAcid(DROP);
            }
            refresh();
          } else {
            s.flow = { i, time: -0.24 };
            dispense(i);
          }
        },
        onEnd() {
          if (s.flow) {
            s.flow = null;
            const t = s.tubes[i];
            if (!t.zero && t.reading === 0) {
              t.zero = true;
              if (prep()) done(0);
            }
          }
          refresh();
        },
      }),
    );
    drags.push(...valves);
    function flowFor(dt) {
      if (!s.flow) return;
      const f = s.flow,
        t = s.tubes[f.i],
        target = t.zero ? 20 : 0;
      f.time += dt;
      while (t.reading <= target) {
        const interval = t.reading < target - 0.16 ? (t.zero ? 0.006 : 0.018) : 0.42;
        if (f.time < interval) break;
        f.time -= interval;
        dispense(f.i);
      }
    }
    const baseTip = b.tubes[1];
    drags.push(
      guarded(
        baseTip.endPick,
        baseTip.pivot,
        () => s.tubes[1].reading !== null && !s.tubes[1].primed,
        '向左上翻起尖嘴，挤出乳胶管内的气泡',
        {
          onStart: () => begin('tip', 1),
          onDrag(p) {
            s.tubes[1].bend = 2.85 * clamp((p.y - TIP) / 0.048, 0, 1);
          },
          onEnd(moved) {
            const t = s.tubes[1];
            if (moved && !cancelled && t.bend > 2.4) prime(1);
            returns('tip', 1, V(0), V(0), t.bend);
            s.grip = null;
            refresh();
          },
        },
      ),
    );
    const readTaps = b.tubes.map((tube, i) =>
      guarded(tube.readPick, tube.meniscus, () => meterTube() === i, '近看刻度和凹液面', {
        onTap() {
          s.closeScale = s.closeScale === i ? null : i;
        },
      }));
    const drag = draggable(g, drags, { taps: readTaps, tip: tag('', 'pill') });
    function drawTable() {
      if (s.demo) return;
      W.tbl.clear();
      for (const r of s.rows) {
        const cells = ['base', 'initial', 'final', 'used'].map((field) => {
          const value = r[field] == null ? '—' : FIX(r[field]);
          return field === r.field ? `${value}<small>${r.note}</small>` : value;
        });
        W.tbl.add([String(r.trial), ...cells], { highlight: false });
      }
      if (s.initial !== null && !finished())
        W.tbl.add([String(s.trial), s.sampled ? FIX(s.base) : '—', FIX(s.initial), '—', '—']);
    }
    function saveAttempt(values) {
      s.rows.push({ trial: s.trial, initial: s.initial, base: s.sampled ? s.base : null, ok: !values.note, ...values });
      drawTable();
      const valid = s.rows.filter((r) => r.ok);
      if (!s.demo && valid.length) {
        const validFinal = finished() && !over();
        const avg = valid.reduce((sum, r) => sum + (0.1 * r.used) / r.base, 0) / valid.length;
        W.result.textContent =
          (validFinal ? `本轮浓度 ${((0.1 * (s.final - s.initial)) / s.base).toPrecision(4)} mol/L。` : '') +
          (valid.length > 1 || !validFinal
            ? `${valid.length} 次有效滴定的平均浓度为 ${avg.toPrecision(4)} mol/L。`
            : '');
      }
      return valid.length;
    }
    function record(value) {
      const i = meterTube();
      if (i < 0 || !prep() || s.flow || !Number.isFinite(value) || value < 0 || value > 25) return;
      const trueValue = s.tubes[i].reading;
      if (sampling() && trueValue !== 20) {
        msg(trueValue < 20 ? '取样不足 20.00 mL，继续放液。' : prompt());
        return;
      }
      const err = round(value - trueValue);
      if (err) {
        const deviation = err > 0 ? '偏大' : '偏小';
        const field = sampling() ? 'base' : s.initial === null ? 'initial' : 'final';
        saveAttempt({
          [field]: value,
          field,
          note: deviation,
          used: field === 'final' ? round(value - s.initial) : null,
        });
        msg(`读数${deviation}。请平视凹液面最低处，重新读数。`);
        if (!over() && s.clock >= 30 && !s.demo) W.repeat.hidden = false;
        return;
      }
      if (sampling()) {
        s.sampled = true;
        done(2);
        drawTable();
      } else if (s.initial === null) {
        s.initial = value;
        done(1);
        drawTable();
      } else {
        s.final = value;
        const values = { final: value, used: round(value - s.initial) };
        if (over()) {
          saveAttempt({ ...values, field: 'used', note: '过量' });
          if (!s.demo) {
            W.repeat.hidden = false;
            W.entry.value = '';
          }
          refresh();
          return;
        }
        const count = saveAttempt(values);
        done(5);
        if (!s.demo) {
          W.review.hidden = false;
          W.repeat.hidden = count >= 3;
          W.ui.observePrediction(`本轮加入 ${FIX(s.acid)} mL 盐酸。终点附近，曲线比起初陡得多。`);
        }
      }
      if (!s.demo) W.entry.value = '';
      refresh();
    }

    const act = demoActs(drag, g),
      sequence = [],
      cuts = [0];
    const cut = () => cuts.push(sequence.length);
    const gesture = (name, obj, to, from) => sequence.push({ name, drag: obj, to, from });
    const tap = (name, obj) => sequence.push({ name, tap: obj });
    const action = (name, run, dur = 1) => sequence.push({ name, run, dur });
    function meterAction(i, goal, name) {
      const start = goal === 0 ? -2 : 0;
      const during = (k) => {
        if (k <= 0) return;
        const t = s.tubes[i];
        if (t.reading === start && !s.flow) valves[i].onStart();
        if (!s.flow) return;
        const wanted = start + Math.round(((goal - start) * Math.min(1, k / 0.9)) / DROP) * DROP;
        const drops = Math.round((wanted - t.reading) / DROP);
        if (drops > 0) dispense(i, drops);
        if (t.reading === goal) valves[i].onEnd();
      };
      sequence.push({ name, during, dur: goal ? 3.2 : 1.5, run: () => during(1) });
    }
    for (let i = 0; i < 2; i++) {
      const c = b.cups[i],
        t = b.tubes[i],
        from = () => cupHome[i].clone().add(c.lip.position);
      for (let j = 1; j <= 2; j++) {
        gesture(`${NAMES[i]}第 ${j} 次加入润洗液`, c.pick, () => pourTo(i), from);
        gesture(
          '倾转润湿内壁',
          t.body,
          () => tiltTo(i),
          () => V(X[i], TIP + 0.125),
        );
        tap('从下端放出润洗液', t.handle);
      }
      cut();
      gesture(`装入${REAGENTS[i]}`, c.pick, () => pourTo(i), from);
      if (i === 0) tap('打开活塞，赶出尖嘴中的气泡', t.handle);
      else gesture('翻起尖嘴，赶出乳胶管中的气泡', t.endPick, V(X[1] - 0.018, TIP + 0.05), () => V(X[1], TIP));
      meterAction(i, 0, `调节${NAMES[i]}液面至零刻度`);
      if (!i) cut();
    }
    action('平视记录初读数', () => record(0));
    cut();
    gesture('移开废液烧杯', b.wastePick, wasteTo, () => V(0));
    gesture(
      '锥形瓶移到碱式管下',
      b.flaskPick,
      () => station(1),
      () => flaskHome,
    );
    meterAction(1, 20, '挤压玻璃球放液，接近 20.00 mL 时逐滴调节');
    action('平视碱式管，确认取样体积', () => record(20));
    cut();
    gesture('把锥形瓶移到右侧空位', b.flaskPick, flaskHome, () => station(1));
    for (let i = 0; i < 2; i++) gesture('滴入一滴酚酞', b.pipPick, pipTo, () => b.pipHome);
    gesture(
      '移至酸式管下的白纸上',
      b.flaskPick,
      () => station(0),
      () => flaskHome,
    );
    cut();
    const shake = drags.find((d) => d.obj === b.flaskPick);
    tap('打开酸式滴定管活塞', b.tubes[0].handle);
    function rocking(k) {
      if (!k) return;
      if (s.grip !== 'flask') shake.onStart();
      shake.onDrag(station(0).add(V(0.0055 * Math.sin(k * 38), 0)));
      if (k === 1) shake.onEnd();
    }
    sequence.push({
      name: '轻摇锥形瓶，观察酸滴落入瓶内',
      during: rocking,
      dur: 7,
      run() {
        for (let j = 1; j <= 750 && !near(); j++) {
          rocking(j / 751);
          tick(0.04);
        }
        rocking(1);
      },
    });
    tap('轻转活塞加入半滴酸', b.tubes[0].handle);
    gesture('轻摇锥形瓶使溶液混匀', b.flaskPick, () => station(0).add(V(0.005, 0)), () => station(0));
    cut();
    action('观察半分钟内是否返色', () => {}, 6.6);
    action('平视记录末读数', () => record(s.acid));
    cut();
    function poseCup(i, lip, approach) {
      const c = b.cups[i];
      const angle = -c.sign * approach * c.water.pourAngle(cupLevel(s.tubes[i].poured));
      s.cupAngle[i] = angle;
      s.cupPos[i].copy(lip).sub(c.lip.position.clone().applyAxisAngle(V(0, 0, 1), angle));
    }
    function transferLiquid(dt) {
      const f = s.transfer;
      if (!f) return;
      f.time += dt;
      const k = Math.min(1, f.time / f.duration), t = s.tubes[f.i];
      const value = k === 1 ? f.end : f.start + (f.end - f.start) * k;
      if (f.kind === 'rinse' || f.kind === 'drain') t.charge = value;
      else t.reading = value;
      if (f.kind === 'rinse' || f.kind === 'fill') {
        t.poured = f.poured + Math.abs(value - f.start);
        poseCup(f.i, pourTo(f.i), 1);
        if (k === 1) returns('cup', f.i, s.cupPos[f.i], cupHome[f.i], s.cupAngle[f.i]);
      } else {
        s.wasteVol = f.waste + Math.abs(value - f.start);
        if (k === 1 && f.kind === 'drain') {
          t.rinses++;
          t.wet = false;
          t.wall.fill(0);
        }
        if (k === 1 && f.kind === 'prime') t.primed = true;
      }
      if (k === 1) {
        s.transfer = null;
        refresh();
      }
    }
    function sync() {
      b.cups.forEach((c, i) => {
        c.g.position.copy(s.cupPos[i]);
        c.g.rotation.z = s.cupAngle[i];
        const t = s.tubes[i];
        c.water.set(cupLevel(t.poured), s.cupAngle[i]);
        b.tubes[i].set(
          t.reading,
          t.charge,
          t.angle,
          t.reading !== null && !t.primed,
          (!i && s.acidOpen) || s.flow?.i === i || (s.transfer?.i === i && ['prime', 'drain'].includes(s.transfer.kind)) ? 1 : s.source === i ? s.pulse / 0.32 : 0,
          t.bend,
          t.roll,
          t.wall,
        );
      });
      b.waste.position.copy(s.waste);
      b.waste.setLevel(s.wasteVol ? 0.004 + (s.wasteVol - inFlight('waste')) * 0.00095 : 0);
      b.flask.position.copy(s.flask);
      b.pip.position.copy(s.pip);
      const base = round(s.base - inFlight('base')), acid = arrivedAcid();
      b.setFlask(base, acid, s.dye, s.mixed, s.slosh, X[0] - s.flask.x);
      const f = s.transfer;
      b.stream.visible = !!f;
      if (f) {
        const pouring = f.kind === 'fill' || f.kind === 'rinse';
        const t = s.tubes[f.i];
        const top = pouring ? pourTo(f.i) : V(X[f.i], TIP);
        if (!pouring && f.i) g.worldToLocal(b.tubes[1].nozzle.getWorldPosition(top));
        const bottom = pouring ? TIP + (t.reading === null ? levelAt(emptyReading-t.charge) : levelAt(t.reading)) : b.waste.level;
        b.stream.scale.y = Math.max(0.001, top.y - bottom);
        b.stream.position.copy(top).y -= b.stream.scale.y / 2;
      }
      b.drops.forEach((mesh, j) => {
        const drop = s.flights[j];
        mesh.visible = !!drop;
        if (!drop) return;
        const bottom = drop.field === 'waste' ? b.waste.level : s.flask.y + base*0.0005 + acid*0.00045;
        const k = Math.min(1, drop.age/0.32);
        mesh.position.copy(drop.start);
        mesh.position.y += (bottom - drop.start.y)*k*k;
        const scale = drop.half ? 0.79 : 1;
        mesh.scale.set(scale, scale*(1.1+0.5*k), scale);
      });
    }
    const bar = lessonBar({
      look,
      back,
      group: g,
      ringOptions: { minOpacity: 0.55 },
      steps: TITLES.map((title, i) => ({
        id: String(i),
        title,
        todo: i === 0 ? '拖动标准盐酸烧杯，将杯嘴对准酸式滴定管上口。' : title,
        target: () => (mic.isOpen || s.grip ? null : target()),
      })),
      reels: {
        demo: {
          label: '老师演示',
          seal: '演示',
          onStart() {
            drag.clearDropzones();
            saved = s;
            restoredMicro = mic.isOpen;
            if (restoredMicro) microOverlay.hidden = true;
            const body = W.ui.el.querySelector('.p-body'),
              tab = W.ui.el.querySelector('.p-tab');
            panelView = { step: W.ui.step, scroll: body.scrollTop, skip: tab.classList.contains('skip') };
            W.ui.go(1);
            s = fresh();
            s.demo = true;
            lastDraw = '';
            sync();
          },
          onEnd() {
            drag.clearDropzones();
            s = saved;
            saved = null;
            lastDraw = '';
            sync();
            W.ui.go(panelView.step);
            W.ui.el.querySelector('.p-tab').classList.toggle('skip', panelView.skip);
            W.ui.el.querySelector('.p-body').scrollTop = panelView.scroll;
            if (restoredMicro) {
              microOverlay.hidden = false;
              look([s.flask.x, s.flask.y + 0.076, s.flask.z], [0, 0.53, 1], 0.31);
            }
          },
          shots: film(),
        },
      },
    });
    function film() {
      return cuts.slice(1).map((end, index) => {
        const first = cuts[index];
        let start = 0,
          previous = -1;
        const parts = sequence.slice(first, end).map((q) => {
          const pouring = b.cups.some((cup) => cup.pick === q.drag);
          const duration = q.dur || (pouring ? 2.1 : q.drag ? 1.3 : 0.78);
          const apply =
            q.during ||
            (q.drag
              ? act.drag(q.drag, q.to, { from: q.from, t0: 0.03, t1: pouring ? 0.49 : 0.59, release: pouring ? 0.52 : 0.63 })
              : q.tap
                ? act.tap(q.tap, 0.35)
                : act.at(0.4, q.run));
          const part = { start, duration, apply, name: q.name };
          start += duration;
          return part;
        });
        return {
          cap: parts[0].name,
          dur: start,
          enter() {
            previous = -1;
            for (const part of parts) part.apply(0);
          },
          during(k) {
            const t = k * start;
            let i = parts.findIndex((p) => t < p.start + p.duration);
            if (i < 0) i = parts.length - 1;
            if (i !== previous) {
              if (previous >= 0) parts[previous].apply(1);
              bar.caption(parts[i].name);
              previous = i;
            }
            parts[i].apply(clamp((t - parts[i].start) / parts[i].duration, 0, 1));
          },
        };
      });
    }
    const pointer = wrapPointer(drag, bar);
    function reset(repeat = false) {
      if (bar.playing) bar.stop();
      drag.clearDropzones();
      mic.close();
      const previous = s;
      s = fresh();
      if (repeat) {
        s.rows = previous.rows;
        s.trial = previous.sampled ? previous.trial + 1 : previous.trial;
        s.tubes.forEach((t) => { t.rinses = 2; });
      }
      drawTable();
      W.result.textContent = '';
      W.entry.value = '';
      W.review.hidden = W.repeat.hidden = true;
      W.ui.relock({ full: !repeat });
      W.ui.observePrediction(null);
      bar.undo(...TITLES.map((_, i) => String(i)));
      bar.say(null);
      if (repeat) refresh();
      else msg(INTRO);
      lastDraw = '';
      sync();
    }
    const qa = qaFlow(drag, [
      ...sequence.map((q) => {
        const pouring = b.cups.some((cup) => cup.pick === q.drag);
        return { ...q, wait: q.dur === 6.6 ? 8 : pouring ? 1.4 : 0.6 };
      }),
      {
        name: '核对体积、浓度与结论',
        run() {
          if (!finished() || s.acid !== EQ || !s.rows[0].ok) throw Error(`读数或终点异常 ${s.acid} / ${s.final}`);
        },
      },
      { name: '钻进去看', run: () => mic.open(), wait: 4, scale: 1 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
    ]);
    function tick(dt) {
      for (const r of s.returns) {
        r.t += dt;
        const u = clamp(r.t / 0.4, 0, 1),
          k = u * u * (3 - 2 * u);
        if (r.name === 'cup') {
          s.cupPos[r.i].lerpVectors(r.from, r.to, k);
          s.cupAngle[r.i] = r.angle * (1 - k);
        } else if (r.name === 'tip') s.tubes[1].bend = r.angle * (1 - k);
        else if (r.name === 'tube') {
          s.tubes[r.i].angle = r.angle * (1 - k);
          s.tubes[r.i].roll = r.roll * (1 - k);
        } else s[r.name].lerpVectors(r.from, r.to, k);
      }
      s.returns = s.returns.filter((r) => r.t < 0.4);
      transferLiquid(dt);
      if (!s.demo) flowFor(dt);
      const before = arrivedAcid();
      const acidDt = s.demo && s.acid < 19.76 ? dt * 5 : dt;
      s.slosh *= Math.exp(-7 * dt);
      if (s.acidOpen) {
        s.dropTime += acidDt;
        while (!near()) {
          const interval = s.acid < 19.76 ? 0.042 : 0.40;
          if (s.dropTime < interval) break;
          s.dropTime -= interval;
          // Emit at distinct instants even when one frame spans several drops.
          addAcid(DROP, s.dropTime - acidDt);
        }
        if (near()) s.acidOpen = false;
      }
      for (const drop of s.flights) {
        drop.age += drop.field === 'acid' ? acidDt : dt;
        if (drop.field === 'dye' && drop.age >= 0.32) {
          s.dye += drop.amount;
          if (s.dye === 2) done(3);
          refresh();
        }
      }
      s.flights = s.flights.filter((drop) => drop.age < 0.32);
      const acid = arrivedAcid();
      if (before !== acid && near()) {
        if (acid === EQ) done(4);
        refresh();
      }
      if (acid === EQ && s.mixed === EQ && !finished() && s.clock < 30) {
        s.clock = Math.min(30, s.clock + dt * 5);
        if (s.clock === 30) refresh();
      }
      s.pulse = Math.max(0, s.pulse - dt);
      sync();
    }
    return {
      group: root,
      pointer: {
        ...pointer,
        up(r, e) {
          cancelled = e?.type === 'pointercancel';
          try {
            return pointer.up(r, e);
          } finally {
            cancelled = false;
          }
        },
      },
      size: { w: 0.43, d: 0.23, h: 0.285 },
      view: { elev: 14, azim: 0, lookY: 0.48, frameMargin: 1.15 },
      card: false,
      toggles: ['steps', 'cards'],
      mount(ui) {
        const graph = h('canvas', { style: 'display:block;width:100%;height:auto', 'aria-label': '滴定曲线' });
        const meter = h('canvas', { width: 184, height: 196, 'aria-label': '滴定管刻度与凹液面' });
        lens.el.append(meter);
        const entry = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: 0, max: 25,
          required: true, 'aria-label': '滴定管读数' });
        const readBox = h('form', { class: 'tit-record', onsubmit(e) {
          e.preventDefault();
          if (!s.demo) record(entry.valueAsNumber);
        } }, entry, ' mL ', h('button', { type: 'submit' }, '记下读数'));
        const chartBox = h('div', {}, graph);
        const review = h(
          'details',
          { class: 'more', hidden: true },
          h('summary', {}, '想一想（选做）'),
          h('p', {}, '末读数读大了，算出的 NaOH 浓度会怎样？初读数读大了呢？'),
        );
        const repeat = h('button', { class: 'go ghost', hidden: true, onclick: () => reset(true) }, '重复滴定');
        const resample = h('button', { class: 'go ghost', hidden: true, onclick: () => reset(true) }, '重新取样');
        const result = h('p', { class: 'fineprint' });
        const model = h(
          'details',
          { class: 'more' },
          h('summary', {}, '模型、近似和出处'),
          h('p', {}, MODEL),
          h('p', {}, SCALE),
        );
        W = {
          ...mountXuean(ui, {
            controls: [readBox, resample, chartBox, result, repeat, review, model, moreBox([], () => reset())],
            headers: ['次数', 'NaOH / mL', '初 / mL', '末 / mL', '耗酸 / mL'],
            intro: INTRO,
          }),
          ui,
          graph,
          meter,
          entry,
          readBox,
          chartBox,
          review,
          repeat,
          resample,
          result,
        };
        W.next.remove();
        const style = h(
          'style',
          {},
          `
          .titration-demo .status,.titration-demo .more,.titration-demo .data,.titration-demo .progress-need,.titration-demo button.go,.titration-demo .fineprint {visibility:hidden}
          .tag3d.tit-lens{width:0;height:0;z-index:4;pointer-events:none}
          .tit-lens canvas{display:block;position:absolute;top:0;transform:translateY(var(--level,-50%));right:19px;width:134px;height:142px;border:2px solid #657974;border-radius:16px;background:#fffdf5;box-shadow:0 3px 9px #47412e30}
          .tit-lens.close-scale canvas{width:172px;height:184px}
          @media(max-width:760px){.tit-lens canvas{width:92px;height:100px}.tit-lens.close-scale canvas{width:112px;height:120px}}
          .tit-lens::after{content:'';position:absolute;top:0;right:0;width:19px;border-top:1px solid #506963}
          .tit-lens.base canvas,.tit-lens.base::after{right:auto;left:19px}
          .tit-lens.base::after{left:0}
          .tit-record{display:flex;gap:.45em;align-items:center;margin:8px 0}
          .tit-record[hidden]{display:none}
          .tit-record input,.tit-record button{border:1px solid #b4ae9f;background:#fffdf5;border-radius:3px;color:inherit;font:inherit;padding:4px 8px}
          .tit-record input{width:6em;text-align:right;font-variant-numeric:tabular-nums}
          .tit-record button{cursor:pointer;border-color:#74857b}
          .xuean[data-titration] td small{display:block;font:12px/1.4 sans-serif;color:#874a38}
          .xuean[data-titration] .answer .src{padding-right:55px;min-height:45px}
          .xuean[data-titration] .answer .seal-stamp{right:14px;bottom:12px}
          @media(max-width:760px){.lbar[data-titration] .lb-steps{display:none}.lbar[data-titration]{gap:4px}}
        `,
        );
        W.style = style;
        document.head.append(style);
        ui.el.dataset.titration = '';
        document.querySelector('.lbar').dataset.titration = '';
        bar.attach(ui);
        sync();
      },
      update(dt) {
        const speed = bar.update(dt);
        drag.update(speed ? Math.min(dt, 0.08) : 0);
        tick(Math.min(dt, 0.08) * speed);
        if (!(s.demo && restoredMicro)) mic.update(dt, speed);
        if (!W) return;
        const acid = arrivedAcid();
        const color = !s.dye || s.mixed >= EQ ? '无色' : pH(s.mixed) < 10 ? '浅粉红' : '红色';
        card
          .text(
            `<div class="cc"><div class="cc-t"><span class="cc-name">锥形瓶</span><span class="cc-res">${color}</span></div>${acid === EQ && s.mixed === EQ ? `<div>已观察 ${Math.floor(s.clock)} s</div>` : ''}</div>`,
          )
          .loc(g, s.flask.x + 0.025, 0.065, -0.014)
          .show(show.cards && !s.demo && !mic.isOpen && !s.grip && !s.flights.length && s.base > 0);
        const i = meterTube(),
          volume = i >= 0 ? s.tubes[i].reading : null;
        if (s.closeScale !== i) s.closeScale = null;
        lens.el.classList.toggle('close-scale', i >= 0 && s.closeScale === i);
        lens.show(i >= 0 && !mic.isOpen && !s.grip);
        if (i >= 0) lens.loc(b.tubes[i].t, 0, levelAt(volume), 0.006);
        const key = [s.demo, i, volume, s.sampled, acid, finished()].join('/');
        if (key !== lastDraw) {
          lastDraw = key;
          W.ui.el.classList.toggle('titration-demo', s.demo);
          W.readBox.hidden = s.demo || i < 0 || !prep();
          W.resample.hidden = !sampling() || s.base <= 20;
          W.chartBox.hidden = !s.sampled;
          lens.el.classList.toggle('base', i === 1);
          if (i >= 0) meniscusScale(W.meter, volume);
          if (s.sampled) plotCurve(W.graph, acid, s.trace);
        }
      },
      reset: () => reset(),
      dispose() {
        W?.style.remove();
        W?.ui.el.removeAttribute('data-titration');
        drag.dispose();
        mic.dispose();
        bar.dispose();
      },
      debug: {
        get S() {
          return s;
        },
        qa,
        bar,
        mic,
      },
    };
  },
};
