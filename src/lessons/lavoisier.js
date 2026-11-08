// 人教版化学九上第 30–31 页、图 2-2（PDF 索引 36）。
// 定量部分是归一化教学模型：初始气体 100 份，其中氧气 21 份；其余 79 份合并表示。
// 反应进度只用于压缩历史过程，不拟合汞氧化速率。用可拖动的进程轴推进，不把等待秒数当成实验操作。
// 体积统一比较冷却后同温同压的值，忽略装置死体积和汞蒸气。
// 2Hg + O2 → 2HgO；强热时 2HgO → 2Hg + O2，正反过程共享同一氧量。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { glass2, flame2 } from './kit/chemfx.js';
import { glassTube } from './kit/chem.js';
import { textPlate } from './kit/props.js';
import { buttons } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, sandbox, wrapPointer, mountXuean, moreBox, think, qaFlow, demoActs } from './kit/chemlesson.js';
import { microWorld } from './kit/microworld.js';
import { h } from '../ui/Panel.js';

const V = THREE.Vector3;
const INITIAL = 100, OXYGEN = 21;
const TIME_START = -0.23, TIME_END = 0.09, TIME_Z = 0.118;
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
      read: false, transferred: false, transfer: 0, recovered: false,
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
      const obj = textPlate(text, { w: width, h: 0.012, color: '#2b3142', bg: '#fffaf0' });
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
    // 收集粉末采用取样盘动画，保持原容器中剩余气体的体积记录；没有把两套气路连通。
    const sample = mesh(new THREE.SphereGeometry(0.015, 20, 12), red, LEFT, 0.12);
    sample.scale.y = 0.3; sample.visible = false;
    const heatControl = label('加热 / 停止', LEFT, 0.018, 0.052, 0.075);
    const strongControl = label('强热 / 停止', RIGHT, 0.017, 0.037, 0.065);
    const readControl = label('冷却并读数', BELL, 0.012, 0.067, 0.085);
    const transferControl = label('收集红色粉末', LEFT, 0.012, 0.077, 0.10);
    const mixControl = label('合并气体', COLLECT, 0.012, 0.063, 0.08);
    const timeRail = mesh(new THREE.BoxGeometry(TIME_END - TIME_START, 0.002, 0.003), paint(0x9b9286), (TIME_START + TIME_END) / 2, 0.006, TIME_Z);
    const timeKnob = mesh(new THREE.SphereGeometry(0.007, 20, 12), paint(0xd09548, { keep: true }), TIME_START, 0.009, TIME_Z);
    for (let i = 0; i <= 12; i++) mesh(new THREE.BoxGeometry(0.001, 0.001, i % 3 ? 0.004 : 0.009), paint(0x9b9286), THREE.MathUtils.lerp(TIME_START, TIME_END, i / 12), 0.006, TIME_Z);
    label('拖动推进', 0.19, 0.014, TIME_Z, 0.09);
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
    const openMicro = () => {
      microAt.x = S.transferred ? RIGHT : LEFT;
      if (mw.isOpen) return mw.close();
      look([microAt.x, microAt.y + 0.045, microAt.z], [0.04, 0.25, 1], 0.3);
      mw.open(() => {
        const v = group.localToWorld(microAt.clone()).project(window.__lb.stage.camera);
        return [(v.x + 1) * innerWidth / 2, (1 - v.y) * innerHeight / 2];
      }, microState());
    };
    mw.onClose = () => { if (!bar.playing) back(); };
    const A = {
      heat() {
        if (S.transferred) return status('红色粉末已收集到右侧的小容器，接下来点右边的强热。');
        if (S.heated >= 1) return status('加热过程已完成。点玻璃钟罩，推进到冷却后并读数。');
        S.heating = !S.heating;
        S.heat = 1;
        status(S.heating ? '炉火已点燃。向右拖动前方时间轴，推进历史上的 12 天；停下来就能细看汞表面的变化。' : '已停止加热。点钟罩冷却读数，或再次点炉子继续。');
      },
      advance(value) {
        if (!S.heating && !S.strong) return status('先点相应的炉子，再拖动进程轴。');
        const key = S.transferred ? 'decomposed' : 'heated';
        S[key] = Math.max(S[key], value >= 0.995 ? 1 : THREE.MathUtils.clamp(value, 0, 1));
        // 进程只向前；回看用暂停观察或“再做一次”，不倒放化学反应。
        if (S[key] >= 1) {
          S.heating = S.strong = false;
          if (key === 'heated') done('heat');
          status('反应进程已完成。点气体容器，推进到冷却后并记录体积。');
        }
      },
      cool() { S.heating = S.strong = false; S.heat = 0; },
      read() {
        if (S.transferred) return status(S.mixed ? '合并后的气体为 100 份，原来的剩余气体读数保留在观察记录里。' : '这部分剩余气体已封存，冷却后的体积为 79 份。');
        if (S.heated === 0) return status('初始空气记为 100 份。先点左边的加热，看看有什么变化。');
        A.cool();
        const remaining = INITIAL - consumed();
        log(['加热后冷却', remaining.toFixed(1) + ' 份', '生成红色粉末；气体减少 ' + consumed().toFixed(1) + ' 份']);
        status(S.heated < 1 ? '这次提前停止了加热，减少的体积还不到 21 份。继续加热后可以重新读数。' : '剩余气体 79 份，减少 21 份。减少的气体会不会留在红色粉末里？');
        if (S.heated >= 1) { S.read = true; done('heat'); done('read'); }
      },
      transfer() {
        if (!S.read) return status('先完成加热，并在冷却后读取剩余气体体积。');
        if (S.transferred || S.transfer > 0) return;
        S.transfer = 0.001; mw.close();
        status('把生成的红色粉末收集到另一个小容器里，再加强热。取样和封存步骤用动画概括。');
      },
      strong() {
        if (S.transfer > 0) A.finishTransfer();
        if (!S.transferred) return status('先收集左边生成的红色粉末。');
        if (S.decomposed >= 1) return status('红色粉末已经分解完，点右侧气体容器冷却并记录。');
        S.strong = !S.strong;
        S.heat = 1;
        status(S.strong ? '向右拖动进程轴：红色粉末逐渐减少，银白色汞重新出现，氧气被收集。' : '已停止强热。可以先冷却读数，再继续。');
      },
      record() {
        if (S.mixed || S.mix > 0) return status('氧气已与剩余气体合并，原来的 21 份读数保留在观察记录里。');
        if (!S.transferred || !S.decomposed) return status('先收集红色粉末，再点右侧炉子并推进强热进程。');
        A.cool();
        if (S.decomposed < 1) {
          log(['强热中途冷却', recovered().toFixed(1) + ' 份氧气', '仍有红色粉末，氧气尚未全部收回']);
          return status('仍有红色粉末，收回的氧气少于原先减少的量。可以继续强热来比较。');
        }
        if (!S.recovered) log(['强热后冷却', recovered().toFixed(1) + ' 份氧气', '红色粉末消失、汞重现；与减少量相等']);
        S.recovered = true; done('recover');
        status('收回了 21 份氧气，恰好是原先减少的部分。可以把它与剩余气体合并。');
      },
      finishTransfer() { S.transfer = 1; S.transferred = true; done('transfer'); },
      mix() {
        if (!S.recovered) return status('先点右侧收集容器，冷却并记录完整的氧气体积，再合并比较。');
        if (S.mixed || S.mix > 0) return;
        S.mix = 0.001; mw.close();
      },
      reset() {
        if (bar.playing) bar.stop();
        S = fresh(); mw.close(); W?.tbl.clear(); W?.question.close();
        if (W) W.next.hidden = true;
        bar.undo('heat', 'read', 'transfer', 'recover', 'mix', 'why');
        status('点左侧炉子，拖动前方时间轴。无需等待倒计时。');
      },
    };
    const drag = draggable(group, [{
      obj: timeKnob, plane: 'xz', offset: 0.009,
      hint: () => S.heating || S.strong ? '向右拖动推进反应；松手停在当前现象' : '先点炉子，再拖动进程轴',
      onDrag: (p) => A.advance((p.x - TIME_START) / (TIME_END - TIME_START)),
    }], { tip: tag('', 'pill'), taps: [
      { obj: stove.body, hint: '点炉子开始或停止加热', onTap: A.heat },
      { obj: airBell.glass, hint: '停止加热、推进到冷却后，记录剩余气体', onTap: A.read },
      { obj: transferControl, hint: () => S.transferred ? '' : '收集粉末到右侧容器（取样过程概括）', onTap: A.transfer },
      { obj: burner.body, hint: '点炉子开始或停止强热', onTap: A.strong },
      { obj: oxygenBell.glass, hint: '停止强热、推进到冷却后，记录氧气', onTap: A.record },
      { obj: mixControl, hint: () => S.mixed ? '' : '将两份气体合并比较（示意）', onTap: A.mix },
    ] });
    const act = demoActs(drag, group);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'heat', title: '加热汞', todo: '点<b>左侧炉子</b>，向右拖动前方进程轴；停在任意阶段观察红色粉末。', target: () => S.heating ? timeKnob : stove.body },
        { id: 'read', title: '冷却读数', todo: '点<b>左侧玻璃钟罩</b>，推进到停止加热、冷却后的状态，记录体积。', target: () => airBell.glass },
        { id: 'transfer', title: '收集粉末', todo: '点<b>收集红色粉末</b>，把它移到右侧的小容器。', target: () => transferControl },
        { id: 'recover', title: '强热粉末', todo: '点<b>右侧炉子</b>，拖动进程轴；再点右侧气体容器冷却并读数。', target: () => S.decomposed >= 1 ? oxygenBell.glass : S.strong ? timeKnob : burner.body },
        { id: 'mix', title: '合并比较', todo: '点<b>合并气体</b>，看总体积能否恢复。', target: () => mixControl },
        { id: 'why', title: '解释现象', todo: '对照左侧的观察记录，想一想减少的气体去了哪里。' },
      ],
      reels: { demo: {
        label: '老师演示',
        ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => mw.close() }),
        shots: [
          { cap: '点燃炉火，拖动进程轴推进历史上的 12 天。红色颗粒逐渐出现在汞表面。', dur: 5,
            during: act.seq(act.tap(stove.body, 0.02), act.drag(timeKnob, new V(TIME_END, 0.009, TIME_Z), { t0: 0.12, t1: 0.9, release: 0.95 })) },
          { cap: '点钟罩推进到冷却后读数：100 份变成 79 份。这里省略冷却等待，不表示瞬间冷却。', dur: 3, during: act.tap(airBell.glass, 0.12) },
          { cap: '收集红色粉末，剩余气体另行保留。取样与封存过程概括呈现。', dur: 3, during: act.tap(transferControl, 0.12) },
          { cap: '再点右侧炉子，推进强热。红色粉末减少，银白色汞重新出现，并放出氧气。', dur: 5,
            during: act.seq(act.tap(burner.body, 0.02), act.drag(timeKnob, new V(TIME_END, 0.009, TIME_Z), { t0: 0.12, t1: 0.9, release: 0.95 })) },
          { cap: '推进到冷却后记录：收回 21 份氧气，恰好等于原来减少的体积。', dur: 3, during: act.tap(oxygenBell.glass, 0.12) },
          { cap: '将两份气体合并比较：79 + 21 = 100。减少的氧气并没有消失。', dur: 3, during: act.tap(mixControl, 0.12) },
        ],
      } },
    });
    function update(dt, time) {
      const step = Math.min(dt, 1 / 30) * bar.update(dt);
      // 学生掌握进程；松开滑块即停留，不再使用强制倒计时。
      const progress = S.transferred ? S.decomposed : S.heated;
      timeKnob.position.x = THREE.MathUtils.lerp(TIME_START, TIME_END, progress);
      if (W?.timeline) {
        W.timeline.value = String(progress * 100);
        W.timeline.disabled = !S.heating && !S.strong;
        W.timeText.textContent = S.transferred ? '强热进程 ' + Math.round(progress * 100) + '%' : '加热进程 ' + (progress * 12).toFixed(1) + ' / 12 天';
      }
      if (S.transfer > 0 && !S.transferred) {
        S.transfer = Math.min(1, S.transfer + step / 0.45);
        if (S.transfer === 1) A.finishTransfer();
      }
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
        grain.visible = !S.transferred && i / oxide.length < S.heated;
        const k = THREE.MathUtils.clamp(S.heated * oxide.length - i, 0, 1);
        grain.scale.set(k, k * 0.5, k * 0.85);
      });
      sample.visible = S.transfer > 0 && !S.transferred;
      sample.position.set(THREE.MathUtils.lerp(LEFT, RIGHT, S.transfer), 0.12 + Math.sin(S.transfer * Math.PI) * 0.075, 0);
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
        (S.heat > 0.015 && !S.transferred ? '热态 · 点钟罩冷却读数' : remaining.toFixed(1) + ' / 100 份') +
        '<br><small>' + (S.transferred ? '已保留剩余气体' : '历史加热进程 ' + (S.heated * 12).toFixed(1) + ' / 12 天') + '</small></div></div>');
      rightCard.loc(group, 0.20, 0.16, 0).text('<div class="cc"><div class="cc-t">红色粉末放出的氧气</div><div class="cc-more">' +
        (S.heat > 0.015 && S.transferred ? '热态 · 点容器冷却读数' : (recovered() * (1 - S.mix)).toFixed(1) + ' 份') +
        '<br><small>气体小点与合并过程为示意</small></div></div>');
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
          { text: '加热 / 停止', onClick: A.heat },
          { text: '冷却并读数', onClick: A.read },
          { text: '收集红色粉末', onClick: A.transfer },
          { text: '强热 / 停止', onClick: A.strong },
          { text: '冷却并记录氧气', onClick: A.record },
          { text: '合并气体', onClick: A.mix },
          { text: '看微观变化', ghost: true, onClick: openMicro },
        ]);
        const timeline = h('input', { type: 'range', min: '0', max: '100', step: '0.1', 'aria-label': '推进反应进程' });
        timeline.style.width = '100%';
        timeline.addEventListener('input', () => A.advance(Number(timeline.value) / 100));
        const timeText = h('p', { class: 'fineprint' }, '加热进程 0 / 12 天');
        const timeHelp = h('p', { class: 'fineprint' }, '点炉子后拖动进程轴，停下即可观察；冷却直接推进到完成状态，无需等待。进程只向前，重新观察请点“再做一次”。');
        const note = h('p', { class: 'fineprint' }, '历史实验的教学模拟。汞及其化合物有毒，请勿自行复现。进程轴不表示真实反应速率；冷却、取样和合并步骤作概括，气体小点为示意；以初始气体 100 份归一化，体积统一按冷却后同温同压比较。');
        const xuean = mountXuean(ui, { controls: [note, timeText, timeline, timeHelp, controls, question.el, moreBox([], A.reset)],
          headers: ['操作', '体积', '观察'], intro: '点左侧炉子，再拖动前方进程轴，看红色粉末怎样出现。' });
        W = { ...xuean, timeline, timeText, question, status: (m) => ui.status(m) };
        bar.attach(ui);
      },
      update,
      dispose() { mw.dispose(); bar.dispose(); },
      debug: {
        get S() { return S; }, A, bar,
        qa: qaFlow(drag, [
          { name: '加热汞', tap: stove.body },
          { name: '推进加热进程', drag: timeKnob, to: new V(TIME_END, 0.009, TIME_Z) },
          { name: '冷却读剩余气体', tap: airBell.glass },
          { name: '收集粉末', tap: transferControl },
          { name: '强热', tap: burner.body },
          { name: '推进强热进程', drag: timeKnob, to: new V(TIME_END, 0.009, TIME_Z) },
          { name: '冷却记录氧气', tap: oxygenBell.glass },
          { name: '合并气体', tap: mixControl },
          { name: '回答', run: () => W.question.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
