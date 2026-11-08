// 人教版化学九上第 30–31 页、图 2-2（PDF 索引 36）。
// 定量部分是归一化教学模型：初始气体 100 份，其中氧气 21 份；其余 79 份合并表示。
// 反应进度只用于压缩历史过程，不拟合汞氧化速率。反应自动加速呈现；炉门、瓶塞、药匙由学生直接操作。
// 体积统一比较冷却后同温同压的值，忽略装置死体积和汞蒸气。
// 2Hg + O2 → 2HgO；强热时 2HgO → 2Hg + O2，正反过程共享同一氧量。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { glass2, flame2 } from './kit/chemfx.js';
import { glassTube, spatula } from './kit/chem.js';
import { textPlate } from './kit/props.js';
import { buttons } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, sandbox, wrapPointer, mountXuean, moreBox, think, qaFlow, demoActs } from './kit/chemlesson.js';
import { microWorld } from './kit/microworld.js';
import { h } from '../ui/Panel.js';

const V = THREE.Vector3;
const INITIAL = 100, OXYGEN = 21;
const HEAT_SECONDS = 4.5, DECOMPOSE_SECONDS = 3.5;
const LEFT = -0.19, BELL = -0.035, RIGHT = 0.14, COLLECT = 0.26;
const RED = 0xba4732, SILVER = 0xb8c1cd, BLUE = 0x2f7fd8;

// 微观图按配比画 HgO 单位，属于组成示意，不表示独立 HgO 分子或晶体结构。
function mercuryScene() {
  let pairs = 0;
  return {
    labels: (kind, molecule) => kind === 'O2' || molecule.g.position.x < -3.4 && molecule.g.position.z < 0,
    labelOnly: (kind, molecule) => kind === 'O2' || molecule.g.position.x < -3.4 && molecule.g.position.z < 0,
    init(c, st) {
      c.view.film = 0; c.view.paper = null;
      pairs = Math.round(5 * (st.bound / OXYGEN));
      for (let i = 0; i < 10; i++) {
        c.add(i < pairs * 2 ? 'HgO' : 'Hg', c.V([(i % 5 - 2) * 1.8, 0.8, Math.floor(i / 5) * 2 - 1]), { fixed: true });
      }
      for (let i = 0; i < 5 - pairs; i++) c.add('O2', c.inGas(), { gas: true });
      if (!st.transferred) for (let i = 0; i < 20; i++) c.add('N2', c.inGas(), { gas: true });
    },
    step(c, st) {
      if (c.events.length) return;
      const want = Math.round(5 * st.bound / OXYGEN);
      if (want > pairs) {
        const metal = c.free('Hg').slice(0, 2), oxygen = c.free('O2')[0];
        if (metal.length < 2 || !oxygen) return;
        const positions = metal.map((m) => m.g.position.clone());
        c.start({ in: ['Hg', 'Hg', 'O2'], out: ['HgO', 'HgO'], host: -1,
          atAbs: () => positions[0].clone().lerp(positions[1], 0.5),
          placeAbs: () => positions, dur: 1.4, approach: 0.6,
          after: [{ fixed: true }, { fixed: true }] }, [...metal, oxygen]);
        pairs++;
      } else if (want < pairs) {
        const oxide = c.free('HgO').slice(0, 2);
        if (oxide.length < 2) return;
        const positions = oxide.map((m) => m.g.position.clone());
        c.start({ in: ['HgO', 'HgO'], out: ['Hg', 'Hg', 'O2'], host: -1,
          atAbs: () => positions[0].clone().lerp(positions[1], 0.5),
          placeAbs: () => [...positions, positions[0].clone().add(c.V([0, 3, 0]))],
          dur: 1.4, approach: 0, after: [{ fixed: true }, { fixed: true }, { gas: true }] }, oxide);
        pairs--;
      }
    },
    text(c, st) {
      return {
        eq: st.transferred ? '2HgO —强热→ 2Hg + O₂' : '2Hg + O₂ —加热→ 2HgO',
        cap: '银灰色表示汞原子，红色表示氧原子。HgO 按组成配比示意；粒子数量与尺度经过简化。' +
          (st.transferred ? '两个氧原子重新组成氧分子，回到气体中。' : '空气中的氧与汞结合，留在红色固体中；氮气不参加这个反应。'),
      };
    },
  };
}

export default {
  id: 'lavoisier',
  fig: '图2-2',
  title: '拉瓦锡研究空气成分',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '汞加热后生成红色粉末，容器里的气体减少了。把红色粉末收集起来再加强热，会怎样？',
    hint: '跟着拉瓦锡寻找“减少的那部分气体”。',
    options: ['得到汞和气体，气体的体积与原来减少的相等', '粉末一直不变，气体已经消失了', '只得到汞，不会再有气体'],
    answer: 0,
  },
  need: '加热汞并冷却读数，再收集粉末强热，比较收回的氧气与原来减少的气体。',
  conclusion: {
    crops: [{ page: 36, rect: [210, 277, 464, 470] }, { page: 37, rect: [61, 49, 340, 143] }],
    quote: '氧气的体积恰好等于密闭容器里所减小的体积。他把得到的氧气加到前一个容器里剩下的气体中，结果所得气体的性质与空气的完全一样。',
    formula: '汞 + 氧气 —加热→ 氧化汞<br>氧化汞 —强热→ 汞 + 氧气',
    why: '减少的氧气与汞结合，成为红色的氧化汞。强热红色粉末，又能把这部分氧气收回来。拉瓦锡据此认识到空气含有性质不同的成分。<br>当时他把剩余气体都看作氮气；今天知道其中还有稀有气体等成分。模型以初始气体为 100 份，按现代空气组成取氧气 21 份、其余气体 79 份；这些份数用于同温同压比较，并非拉瓦锡原始实测数据。',
    src: '人教版化学九年级上册（2024 年新版）第 30–31 页，图2-2；反应时间、粒子数量、器材比例为教学示意。',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.66, d: 0.27, x: 0.02 });
    let W = null;
    const fresh = () => ({
      heated: 0, decomposed: 0, heating: false, strong: false, heat: 0,
      read: false, transferred: false, recovered: false,
      gates: [0, 0], capOff: [false, false], capCarry: [null, null], sealed: false,
      spoonCarry: null, spoonPos: null, returnFrom: null, returnT: 0, powder: 'retort', pouring: 0, lastRead: -1, lastRecovery: -1,
      mixed: false, mix: 0, records: [], demo: false, near: false,
    });
    let S = fresh();
    const consumed = () => OXYGEN * S.heated;
    const recovered = () => consumed() * S.decomposed;
    const bound = () => consumed() - recovered();
    const status = (text) => S.demo ? bar.caption(text) : W?.status(text);
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => {
      S.records.push(row);
      if (!S.demo) W?.tbl.add(row);
    };
    const metal = paint(SILVER, { keep: true });
    const red = paint(RED, { keep: true });
    function mesh(geometry, material, x, y, z = 0) {
      const obj = new THREE.Mesh(geometry, material);
      obj.position.set(x, y, z); group.add(obj); return obj;
    }
    function label(text, x, y, z, width = 0.09) {
      const obj = textPlate(text, { w: width, h: 0.012, color: '#2b3142', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(64, 460 / text.length, 512 * 0.012 / width * 0.75))}px PingFang SC, sans-serif` });
      obj.raycast = THREE.Mesh.prototype.raycast;
      obj.position.set(x, y, z); group.add(obj); return obj;
    }
    function furnace(x, radius, height) {
      const body = inked(mesh(new THREE.CylinderGeometry(radius, radius * 1.05, height, 32),
        paint(0xc8a484), x, height / 2), { width: 0.6 });
      for (const y of [0.005, height * 0.67, height - 0.004]) {
        const rim = mesh(new THREE.TorusGeometry(radius * 1.02, 0.0018, 8, 40), paint(0x796552), x, y);
        rim.rotation.x = Math.PI / 2;
      }
      const door = mesh(new THREE.PlaneGeometry(radius, height * 0.48), paint(0x3a3029), x, height * 0.45, radius * 1.05 + 0.001);
      const fire = flame2({ w: radius * 0.7, h: height * 0.43, core: 0xfff1bd, mid: 0xffb54c, edge: 0xe96535 });
      fire.position.set(x, height * 0.22, radius * 1.05 + 0.002); group.add(fire); fire.setOn(false);
      for (let i = -2; i <= 2; i++) mesh(new THREE.BoxGeometry(0.0015, height * 0.38, 0.0015), paint(0x51463c), x + i * radius * 0.16, height * 0.45, radius * 1.05 + 0.003);
      return { body, door, fire };
    }
    const stove = furnace(LEFT, 0.044, 0.085);
    const burner = furnace(RIGHT, 0.028, 0.06);
    const retort = mesh(new THREE.SphereGeometry(0.037, 40, 24), glass2({ base: 0.05, rim: 0.4 }), LEFT, 0.117);
    retort.renderOrder = 9;
    const mercury = mesh(new THREE.SphereGeometry(0.03, 32, 16), metal, LEFT, 0.094);
    mercury.scale.y = 0.22;
    // 红色颗粒先在汞表面零散出现，逐渐覆盖；不是一整块红球突然长大。
    function powder(x, y, radius, count = 64) {
      return Array.from({ length: count }, (_, i) => {
        const r = radius * Math.sqrt((i + 0.5) / count), a = i * 2.39996;
        const grain = mesh(new THREE.IcosahedronGeometry(0.0024, 0), red,
          x + r * Math.cos(a), y + (i % 3) * 0.0006, r * Math.sin(a));
        grain.scale.set(1, 0.5, 0.85); grain.rotation.y = a;
        return grain;
      });
    }
    const oxide = powder(LEFT, 0.101, 0.026);
    const neck = glassTube([new V(LEFT + 0.012, 0.148, 0), new V(-0.13, 0.173, 0),
      new V(-0.075, 0.14, 0), new V(BELL - 0.025, 0.029, 0), new V(BELL - 0.012, 0.029, 0), new V(BELL - 0.012, 0.09, 0)]);
    group.add(neck);
    function bell(x, radius, height, initialLevel) {
      const basin = mesh(new THREE.CylinderGeometry(radius * 1.65, radius * 1.45, 0.021, 32), paint(0x697988), x, 0.0105);
      mesh(new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.002, 32), metal, x, 0.022);
      const profile = [new THREE.Vector2(radius, 0.008), new THREE.Vector2(radius, height * 0.8),
        new THREE.Vector2(radius * 0.9, height * 0.95), new THREE.Vector2(radius * 0.5, height),
        new THREE.Vector2(0.001, height * 1.04)];
      const glass = mesh(new THREE.LatheGeometry(profile, 40), glass2({ base: 0.035, rim: 0.46 }), x, 0.016);
      glass.renderOrder = 9;
      const knob = mesh(new THREE.SphereGeometry(radius * 0.14, 12, 8), glass2(), x, 0.016 + height * 1.08); knob.renderOrder = 9;
      const liquid = mesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, 1, 32), metal, x, 0.025);
      liquid.geometry.translate(0, 0.5, 0);
      liquid.scale.y = initialLevel;
      return { basin, glass, liquid, base: 0.025, height, radius };
    }
    const airBell = bell(BELL, 0.032, 0.135, 0.008);
    const oxygenBell = bell(COLLECT, 0.024, 0.105, 0.08);
    const small = mesh(new THREE.SphereGeometry(0.026, 32, 20), glass2({ base: 0.05, rim: 0.4 }), RIGHT, 0.085);
    small.renderOrder = 9;
    const smallPowder = powder(RIGHT, 0.073, 0.017);
    const smallMetal = mesh(new THREE.SphereGeometry(0.02, 24, 12), metal, RIGHT, 0.068);
    smallMetal.scale.y = 0.16;
    group.add(glassTube([new V(RIGHT, 0.109, 0), new V(RIGHT + 0.025, 0.135, 0),
      new V(COLLECT - 0.025, 0.125, 0), new V(COLLECT - 0.012, 0.03, 0), new V(COLLECT, 0.027, 0)]));
    // 取样口与封存阀是交互模型的结构简化，并非图 2-2 原器材复刻。
    const mouths = [new V(LEFT, 0.158, 0), new V(RIGHT, 0.119, 0)];
    const capHomes = mouths.map(p => p.clone().add(new V(0, 0.006, 0)));
    const capRest = [new V(-0.275, 0.009, 0.035), new V(0.20, 0.009, 0.065)];
    const caps = mouths.map((p, i) => {
      const tube = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 24, 1, true), glass2(), p.x, p.y - 0.006);
      tube.renderOrder = 9;
      const cap = mesh(new THREE.CylinderGeometry(0.0095, 0.008, 0.014, 20), paint(0x967456, { keep: true }), capHomes[i].x, capHomes[i].y);
      return cap;
    });
    const gates = [stove, burner].map((f, i) => {
      const x = i ? RIGHT : LEFT, z = i ? 0.037 : 0.053;
      const gate = new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.023, 0.002), paint(0x514941, { keep: true })); group.add(gate);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.004, 0.008), paint(0x292c30, { keep: true })); handle.position.z = 0.004; gate.add(handle);
      gate.position.set(x, 0.033, z); return gate;
    });
    const valve = mesh(new THREE.BoxGeometry(0.026, 0.008, 0.008), paint(0x796552), -0.10, 0.153, 0.008);
    const valveStem = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.017, 12), metal, -0.10, 0.143, 0.008);
    label('封存阀', -0.10, 0.174, 0.008, 0.045);
    const spoon = spatula({ color: RED }); group.add(spoon); spoon.heap.material = red; spoon.heap.visible = false;
    const SPOON_HOME = new V(0.015, 0.012, 0.087);
    spoon.position.copy(SPOON_HOME);
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.016, 0.018), new THREE.MeshBasicMaterial({ visible: false }));
    spoonPick.position.x = 0.05; spoonPick.userData.pick = true; spoon.add(spoonPick);
    const falling = Array.from({length: 12}, (_,i) => mesh(new THREE.IcosahedronGeometry(0.0014, 0), red, RIGHT, 0.10));
    label('向右拉开炉门', LEFT, 0.01, 0.071, 0.095);
    label('向右拉开炉门', RIGHT, 0.01, 0.049, 0.085);
    label('药匙：取粉末 → 移入小容器', 0.07, 0.01, 0.118, 0.19);
    const mixControl = label('合并结果对照', COLLECT, 0.012, 0.063, 0.09);
    const gasDots = Array.from({ length: 40 }, (_, i) => {
      const dot = mesh(new THREE.SphereGeometry(0.0018, 8, 6), paint(i < 8 ? BLUE : 0x939ba6, { keep: true }), 0, 0);
      dot.raycast = () => {};
      return dot;
    });
    const returnedDots = Array.from({ length: 8 }, () => {
      const dot = mesh(new THREE.SphereGeometry(0.002, 8, 6), paint(BLUE, { keep: true }), 0, 0);
      dot.raycast = () => {}; return dot;
    });
    const leftCard = tag('', 'cond'), rightCard = tag('', 'cond');
    leftCard.px = [0, -36]; rightCard.px = [0, -36];
    const microState = () => ({ bound: bound(), transferred: S.transferred });
    const microAt = new V(LEFT, 0.14, 0);
    const mw = microWorld({ mode: 'holo', scene: mercuryScene(),
      place: () => ({ pos: group.localToWorld(microAt.clone()), scale: 0.007 * group.getWorldScale(new V()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进汞表面看 ⊙', 'pill mw-go', () => openMicro());
    const openMicro = () => {
      microAt.set(S.transferred ? RIGHT : LEFT, S.transferred ? 0.105 : 0.14, 0);
      if (mw.isOpen) return mw.close();
      look([microAt.x, microAt.y + 0.045, microAt.z], [0.04, 0.25, 1], 0.3);
      mw.open(() => {
        const v = group.localToWorld(microAt.clone()).project(window.__lb.stage.camera);
        return [(v.x + 1) * innerWidth / 2, (1 - v.y) * innerHeight / 2];
      }, microState());
    };
    mw.onClose = () => { if (!bar.playing) back(); };
    const A = {
      gate(i, p) {
        const x = i ? RIGHT : LEFT;
        const k = THREE.MathUtils.clamp((p.x - x) / 0.035, 0, 1);
        if (k > 0.1 && (S.capOff[i] || (i === 0 && S.sealed) || (i === 1 && !S.transferred))) {
          return status(S.capOff[i] ? '先把瓶塞放回取样口，气路密闭后再加热。' : i ? '先用药匙把红色粉末移入小容器。' : '气体已封存，接下来取红色粉末。');
        }
        S.gates[i] = k;
        S[i ? 'strong' : 'heating'] = k > 0.1;
      },
      cap(i, p) {
        if (S.heat > 0.01 || S.heating || S.strong) return status('器材还热着：先把炉门推回去，火灭后会快速冷却。');
        if (i === 0 && !S.sealed) return status('先向右拨封存阀，隔开钟罩里的剩余气体，再取下瓶塞。');
        S.capCarry[i] = new V(p.x, Math.max(0.009, p.y), 0);
        S.capOff[i] = S.capCarry[i].distanceTo(capHomes[i]) > 0.015;
      },
      capDrop(i) {
        if (!S.capCarry[i]) return;
        S.capOff[i] = S.capCarry[i].distanceTo(capHomes[i]) > 0.024;
        S.capCarry[i] = null;
      },
      seal(p) {
        if (!S.read) return status('先完成加热并关上炉门，冷却后观察记录会自动留下体积。');
        S.sealed = p.x > -0.09;
      },
      spoonDrag(p) {
        S.returnFrom = null;
        const next = new V(p.x, THREE.MathUtils.clamp(p.y, 0.012, 0.24), 0);
        const previous = S.spoonCarry || S.spoonPos || SPOON_HOME;
        // 只有从取样口上方进入才允许取样，不让药匙横穿玻璃壁。
        for (let i = 0; i < 2; i++) {
          const m = mouths[i];
          if (previous.y < m.y && Math.abs(previous.x - m.x) < 0.018 && Math.abs(next.x - m.x) >= 0.018) next.y = Math.max(next.y, m.y + 0.008);
          if (Math.abs(next.x - m.x) < 0.036 && next.y < m.y && previous.y < m.y && Math.abs(previous.x - m.x) > 0.013) next.y = m.y + 0.008;
          if (!S.capOff[i] && Math.abs(next.x - m.x) < 0.022 && next.y < m.y) next.y = m.y + 0.012;
        }
        S.spoonCarry = next; S.spoonPos = next.clone();
        if (S.powder === 'retort' && S.read && S.sealed && S.capOff[0] && Math.abs(next.x - LEFT) < 0.012 && next.y < 0.12) {
          S.powder = 'spoon'; status('红色粉末已在药匙里。先提起药匙，再移到右侧取样口上方。');
        }
      },
      spoonDrop() { S.spoonCarry = null; },
      read() {
        if (!S.heated || S.heating || S.heat > 0.01 || S.transferred || S.heated === S.lastRead) return;
        S.lastRead = S.heated;
        log(['冷却后', (INITIAL - consumed()).toFixed(1) + ' 份', '红色粉末生成；气体减少 ' + consumed().toFixed(1) + ' 份']);
        if (S.heated >= 1) { S.read = true; done('heat'); done('read'); status('剩余气体为 79 份。向右拨封存阀，再提起瓶塞，用药匙取红色粉末。'); }
        else status('提前关火，红色粉末和气体减少量都较少；拉开炉门可以继续。');
      },
      record() {
        if (!S.transferred || !S.decomposed || S.strong || S.heat > 0.01 || S.decomposed === S.lastRecovery) return;
        S.lastRecovery = S.decomposed;
        log(['强热后冷却', recovered().toFixed(1) + ' 份氧气', S.decomposed < 1 ? '仍有红色粉末，可继续强热' : '粉末消失，汞重现；氧气与减少量相等']);
        if (S.decomposed >= 1) { S.recovered = true; done('recover'); status('收回 21 份氧气，恰好等于先前减少的量。可查看合并结果对照。'); }
      },
      mix() {
        if (!S.recovered) return status('强热结束后关上炉门，冷却读数，再查看合并结果。');
        if (S.mixed || S.mix > 0) return;
        S.mix = 0.001; mw.close();
      },
      reset() {
        if (bar.playing) bar.stop();
        S = fresh(); mw.close(); W?.tbl.clear(); W?.question.close();
        if (W) W.next.hidden = true;
        bar.undo('heat', 'read', 'transfer', 'recover', 'mix', 'why');
        status('向右拉开左侧炉门，观察汞表面的变化。');
      },
    };
    const drag = draggable(group, [
      ...gates.map((obj, i) => ({ obj, plane: 'xy', offset: obj.position.z, keepOffset: true,
        hint: '抓住炉门把手，向右拉开加热；向左推回关火', onDrag: p => A.gate(i, p) })),
      { obj: valve, plane: 'xy', offset: 0.008, keepOffset: true, hint: '向右拨动，封存钟罩内剩余气体', onDrag: A.seal },
      ...caps.map((obj, i) => ({ obj, plane: 'xy', keepOffset: true,
        hint: '提起瓶塞放在一旁；加热前拖回取样口', onDrag: p => A.cap(i, p), onEnd: () => A.capDrop(i) })),
      { obj: spoonPick, anchor: spoon, keepOffset: true, plane: 'xy',
        hint: '拿起药匙，从左侧取样口伸入取粉，再提起移到右侧口上方', onDrag: A.spoonDrag, onEnd: A.spoonDrop },
    ], { tip: tag('', 'pill'), taps: [
      { obj: mixControl, hint: '查看两份气体合并的结果对照（示意）', onTap: A.mix },
    ] });
    const act = demoActs(drag, group);
    const gateAt = (i, open) => new V((i ? RIGHT : LEFT) + (open ? 0.035 : 0), 0.033, i ? 0.037 : 0.053);
    const scoopPath = [null, new V(LEFT, 0.19, 0), new V(LEFT, 0.111, 0), new V(LEFT, 0.19, 0), new V(RIGHT, 0.15, 0), new V(RIGHT, 0.13, 0)];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'heat', title: '加热汞', todo: '抓住<b>左侧炉门把手</b>向右拉开，观察红色颗粒逐渐生成。', target: () => gates[0] },
        { id: 'read', title: '关火读数', todo: '把<b>左侧炉门</b>向左推回。冷却已加速，稳定后自动留下观察记录。', target: () => gates[0] },
        { id: 'transfer', title: '取粉末', todo: '向右拨<b>封存阀</b>，提起两侧<b>瓶塞</b>；拿药匙从左口伸入取粉，再提起移到右口上方倒入。', target: () => !S.sealed ? valve : !S.capOff[0] ? caps[0] : !S.capOff[1] ? caps[1] : spoonPick },
        { id: 'recover', title: '强热粉末', todo: '把右侧<b>瓶塞</b>放回口上，拉开右侧炉门。粉末分解完后推回炉门，冷却比较氧气体积。', target: () => S.capOff[1] ? caps[1] : gates[1] },
        { id: 'mix', title: '比较结果', todo: '比较自己留下的体积记录，查看两部分气体合并的结果示意。', target: () => mixControl },
        { id: 'why', title: '解释现象', todo: '对照观察记录，解释原先减少的氧气去了哪里。' },
      ],
      reels: { demo: {
        label: '老师演示',
        ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => mw.close() }),
        shots: [
          { cap: '拉开炉门。加热过程加速呈现，红色颗粒逐渐生成。', dur: 6, during: act.drag(gates[0], gateAt(0, true), {t0: 0.02, t1: 0.15, release: 0.18}) },
          { cap: '推回炉门关火，冷却后记录气体体积：79 份。', dur: 2, during: act.drag(gates[0], gateAt(0, false), {t0: 0.02, t1: 0.3, release: 0.35}) },
          { cap: '封存剩余气体，提起两侧取样口的瓶塞。取样口与阀门是操作示意。', dur: 4,
            during: act.seq(act.drag(valve, new V(-0.075, 0.153, 0.008), {t0: 0.02, t1: 0.2, release: 0.22}), act.drag(caps[0], capRest[0], {t0: 0.25, t1: 0.5, release: 0.52}), act.drag(caps[1], capRest[1], {t0: 0.56, t1: 0.8, release: 0.82})) },
          { cap: '药匙从取样口伸入，取起红色粉末，提起后移到小容器口倒入。', dur: 5, during: act.path(spoonPick, scoopPath, {t0: 0.02, t1: 0.75, release: 0.98}) },
          { cap: '塞好右侧瓶塞，再拉开炉门强热。红色粉末减少，汞与氧气重新出现。', dur: 6,
            during: act.seq(act.drag(caps[1], capHomes[1], {t0: 0.02, t1: 0.15, release: 0.17}), act.drag(gates[1], gateAt(1, true), {t0: 0.2, t1: 0.3, release: 0.32})) },
          { cap: '推回炉门，冷却后得到 21 份氧气，恰好等于原来减少的量。', dur: 2, during: act.drag(gates[1], gateAt(1, false), {t0: 0.02, t1: 0.3, release: 0.32}) },
          { cap: '结果对照：79 份剩余气体加上 21 份氧气，恢复为 100 份。', dur: 2, during: act.tap(mixControl, 0.12) },
        ],
      } },
    });
    function update(dt, time) {
      const step = Math.min(dt, 1 / 30) * bar.update(dt);
      if (S.heating) { S.heated = Math.min(1, S.heated + step / HEAT_SECONDS); if (S.heated === 1) done('heat'); }
      if (S.strong) S.decomposed = Math.min(1, S.decomposed + step / DECOMPOSE_SECONDS);
      S.heat = S.heating || S.strong ? 1 : Math.max(0, S.heat - step / 0.65);
      if (S.heat === 0) { A.read(); A.record(); }
      gates.forEach((g,i) => { g.position.x = (i ? RIGHT : LEFT) + S.gates[i] * 0.035; });
      valve.position.x = S.sealed ? -0.075 : -0.10;
      caps.forEach((c,i) => { c.position.copy(S.capCarry[i] || (S.capOff[i] ? capRest[i] : capHomes[i])); c.rotation.z = S.capOff[i] && !S.capCarry[i] ? Math.PI : 0; });
      const sp = S.spoonCarry || S.spoonPos;
      spoon.position.copy(sp || SPOON_HOME);
      spoon.rotation.z = sp && Math.abs(sp.x - LEFT) < 0.025 && sp.y < mouths[0].y + 0.012 ? Math.PI / 2 : 0;
      spoon.rotation.x = 0;
      spoon.heap.visible = S.powder === 'spoon';
      const over = sp && S.capOff[1] && Math.abs(sp.x - RIGHT) < 0.012 && sp.y > mouths[1].y && sp.y < mouths[1].y + 0.03;
      if (over && S.powder === 'spoon') {
        S.pouring = Math.min(1, S.pouring + step / 0.5);
        spoon.rotation.x = -S.pouring * Math.PI;
        if (S.pouring === 1) { S.powder = 'small'; S.transferred = true; S.returnFrom = sp.clone(); S.returnT = 0; S.spoonCarry = null; S.spoonPos = null; spoon.rotation.x = 0; done('transfer'); status('粉末已倒入。把右侧瓶塞放回取样口，再拉开右侧炉门。'); }
      } else if (S.powder === 'spoon') S.pouring = 0;
      if (S.returnFrom) {
        S.returnT = Math.min(1, S.returnT + step / 0.6);
        spoon.position.lerpVectors(S.returnFrom, SPOON_HOME, S.returnT);
        spoon.position.y += Math.sin(S.returnT * Math.PI) * 0.04;
        if (S.returnT === 1) S.returnFrom = null;
      }
      falling.forEach((grain,i) => {
        grain.visible = !!over && S.powder === 'spoon' && S.pouring > 0.15;
        grain.position.set(RIGHT + Math.sin(i * 2.4) * 0.004, 0.13 - ((time * 3 + i / 12) % 1) * 0.055, Math.cos(i * 2.4) * 0.004);
      });
      if (S.mix > 0 && !S.mixed) {
        S.mix = Math.min(1, S.mix + step / 0.5);
        if (S.mix === 1) {
          S.mixed = true; done('mix');
          log(['合并气体', INITIAL.toFixed(1) + ' 份', '79 份剩余气体 + 21 份氧气']);
          if (!S.demo) W?.question.open();
        }
      }
      stove.fire.setOn(S.heating); burner.fire.setOn(S.strong);
      stove.fire.update(time); burner.fire.update(time);
      oxide.forEach((grain, i) => {
        grain.visible = S.powder === 'retort' && i / oxide.length < S.heated;
        const k = THREE.MathUtils.clamp(S.heated * oxide.length - i, 0, 1);
        grain.scale.set(k, k * 0.5, k * 0.85);
      });
      smallPowder.forEach((grain, i) => {
        const k = THREE.MathUtils.clamp((1 - S.decomposed) * smallPowder.length - i, 0, 1);
        grain.visible = S.transferred && k > 0;
        grain.scale.set(k, k * 0.5, k * 0.85);
      });
      smallMetal.visible = S.decomposed > 0;
      smallMetal.scale.set(S.decomposed, 0.16, S.decomposed);
      const remaining = INITIAL - consumed() + recovered() * S.mix;
      airBell.liquid.scale.y = 0.008 + (INITIAL - remaining) / INITIAL * 0.105;
      oxygenBell.liquid.scale.y = 0.08 - recovered() * (1 - S.mix) / OXYGEN * 0.063;
      for (let i = 0; i < gasDots.length; i++) {
        const dot = gasDots[i], angle = i * 2.4 + time * 0.25;
        dot.visible = i >= 8 || i < Math.round(8 * (1 - S.heated + S.decomposed * S.mix));
        dot.position.set(BELL + Math.cos(angle) * 0.019, airBell.base + airBell.liquid.scale.y + 0.008 + (i % 7) / 7 * (0.113 - airBell.liquid.scale.y), Math.sin(angle) * 0.019);
      }
      for (let i = 0; i < returnedDots.length; i++) {
        const dot = returnedDots[i], angle = i * 2.4 + time * 0.3;
        dot.visible = i < Math.round(S.decomposed * 8) && !S.mixed;
        dot.position.set(THREE.MathUtils.lerp(COLLECT, BELL, S.mix) + Math.cos(angle) * 0.012,
          THREE.MathUtils.lerp(oxygenBell.base + oxygenBell.liquid.scale.y + 0.005 + (i % 3) / 3 * (0.081 - oxygenBell.liquid.scale.y), 0.075 + (i % 3) * 0.008, S.mix) + Math.sin(S.mix * Math.PI) * 0.09, Math.sin(angle) * 0.012);
      }
      leftCard.loc(group, -0.11, 0.19, 0).text('<div class="cc"><div class="cc-t">原来的空气</div><div class="cc-more">' +
        (S.heat > 0.015 && !S.transferred ? '加热中 · 推回炉门关火' : remaining.toFixed(1) + ' / 100 份') +
        '<br><small>' + (S.transferred ? '已保留剩余气体' : '历史加热进程 ' + (S.heated * 12).toFixed(1) + ' / 12 天') + '</small></div></div>');
      rightCard.loc(group, 0.20, 0.16, 0).text('<div class="cc"><div class="cc-t">红色粉末放出的氧气</div><div class="cc-more">' +
        (S.heat > 0.015 && S.transferred ? '加热中 · 推回炉门关火' : (recovered() * (1 - S.mix)).toFixed(1) + ' 份') +
        '<br><small>气体小点与合并过程为示意</small></div></div>');
      goBtn.loc(group, S.transferred ? RIGHT - 0.025 : LEFT - 0.025, S.transferred ? 0.155 : 0.195, 0.025)
        .text(S.transferred ? '钻进红色粉末看 ⊙' : '钻进汞表面看 ⊙')
        .show(!mw.isOpen && !bar.playing);
      mw.set(microState()); mw.update(Math.min(step, 0.05));
    }
    return {
      group: root, pointer: wrapPointer(drag, bar), card: false, toggles: ['cards', 'steps'],
      size: { w: 0.62, d: 0.22, h: 0.22 },
      view: { elev: 22, azim: 0, lookY: 0.45, frameMargin: 1.12 },
      mount(ui) {
        const question = think({
          q: '气体减少了 21 份，强热红色粉末又收回 21 份。原先减少的氧气去了哪里？',
          ctx: () => S.records.map((r) => r.join(' · ')).join('<br>'),
          options: ['与汞结合，成为红色粉末中的一部分', '消失了，后来又凭空生成', '全部变成了氮气'],
          wrong: ['想一想：为什么偏偏是强热这份红色粉末，才能收回氧气？', '剩余气体与强热得到的氧气性质不同。'],
          ok: '氧气参与反应进入固体，强热后又释放出来。可以掀开课本对照。',
          status: (m) => ui.status(m),
          onOk: () => { if (!S.mixed) return status('再把两部分气体合并，完成体积比较。'); done('why'); W.next.hidden = false; },
        });
        const controls = buttons([
          { text: '看微观变化', ghost: true, onClick: openMicro },
          { text: '合并结果对照', ghost: true, onClick: A.mix },
        ]);
        const note = h('p', { class: 'fineprint' }, '拖动炉门、瓶塞和药匙来操作。反应与冷却已加速；取样口、封存阀为操作示意，不是历史器材复刻。汞及其化合物有毒，请勿自行复现。体积以初始 100 份归一化，在冷却后同温同压比较。');
        const xuean = mountXuean(ui, { controls: [note, controls, question.el, moreBox([], A.reset)],
          headers: ['操作', '体积', '观察'], intro: '抓住左侧炉门把手向右拉开，看汞表面生成红色粉末。' });
        W = { ...xuean, question, status: (m) => ui.status(m) };
        bar.attach(ui);
      },
      update,
      dispose() { mw.dispose(); bar.dispose(); },
      debug: {
        get S() { return S; }, A, bar,
        qa: qaFlow(drag, [
          { name: '拉开左炉门', drag: gates[0], to: gateAt(0, true), wait: 6 },
          { name: '推回炉门冷却', drag: gates[0], to: gateAt(0, false), wait: 1 },
          { name: '封存剩余气体', drag: valve, to: new V(-0.075, 0.153, 0.008) },
          { name: '取左瓶塞', drag: caps[0], to: capRest[0] },
          { name: '取右瓶塞', drag: caps[1], to: capRest[1] },
          { name: '药匙移到左口上方', drag: spoonPick, to: new V(LEFT, 0.19, 0) },
          { name: '伸入取粉', drag: spoonPick, to: new V(LEFT, 0.111, 0) },
          { name: '提起药匙', drag: spoonPick, to: new V(LEFT, 0.19, 0) },
          { name: '移到右口倒入', drag: spoonPick, to: new V(RIGHT, 0.13, 0), wait: 1 },
          { name: '放回右瓶塞', drag: caps[1], to: capHomes[1] },
          { name: '拉开右炉门', drag: gates[1], to: gateAt(1, true), wait: 5 },
          { name: '关火冷却', drag: gates[1], to: gateAt(1, false), wait: 1 },
          { name: '合并结果对照', tap: mixControl },
          { name: '回答', run: () => W.question.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
