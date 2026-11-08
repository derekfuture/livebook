// 人教版化学九上第 30–31 页、图 2-2（PDF 索引 36）。
// 定量部分是归一化教学模型：初始气体 100 份，其中氧气 21 份；其余 79 份合并表示。
// 反应进度只用于压缩历史过程，不拟合汞氧化速率。12 天压缩为 18 秒，强热过程也压缩。
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
import { paperSheet, sandbox, wrapPointer, mountXuean, moreBox, think, qaFlow } from './kit/chemlesson.js';
import { microWorld } from './kit/microworld.js';
import { h } from '../ui/Panel.js';

const V = THREE.Vector3;
const INITIAL = 100, OXYGEN = 21, HEAT_SECONDS = 18, DECOMPOSE_SECONDS = 10;
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
      const door = mesh(new THREE.PlaneGeometry(radius, height * 0.48), paint(0x3a3029), x, height * 0.45, radius * 1.05 + 0.001);
      const fire = flame2({ w: radius * 0.7, h: height * 0.43, core: 0xfff1bd, mid: 0xffb54c, edge: 0xe96535 });
      fire.position.set(x, height * 0.22, radius * 1.05 + 0.002); group.add(fire); fire.setOn(false);
      return { body, door, fire };
    }
    const stove = furnace(LEFT, 0.044, 0.085);
    const burner = furnace(RIGHT, 0.028, 0.06);
    const retort = mesh(new THREE.SphereGeometry(0.037, 40, 24), glass2({ base: 0.05, rim: 0.4 }), LEFT, 0.117);
    retort.renderOrder = 9;
    const mercury = mesh(new THREE.SphereGeometry(0.03, 32, 16), metal, LEFT, 0.094);
    mercury.scale.y = 0.22;
    const oxide = mesh(new THREE.SphereGeometry(0.027, 32, 12), red, LEFT, 0.101);
    oxide.scale.y = 0.12;
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
    const smallPowder = mesh(new THREE.SphereGeometry(0.019, 24, 12), red, RIGHT, 0.07);
    smallPowder.scale.y = 0.15;
    const smallMetal = mesh(new THREE.SphereGeometry(0.02, 24, 12), metal, RIGHT, 0.068);
    smallMetal.scale.y = 0.16;
    group.add(glassTube([new V(RIGHT, 0.109, 0), new V(RIGHT + 0.025, 0.135, 0),
      new V(COLLECT - 0.025, 0.125, 0), new V(COLLECT - 0.012, 0.03, 0), new V(COLLECT, 0.027, 0)]));
    // 收集粉末采用取样盘动画，保持原容器中剩余气体的体积记录；没有把两套气路连通。
    const sample = mesh(new THREE.SphereGeometry(0.015, 20, 12), red, LEFT, 0.12);
    sample.scale.y = 0.3; sample.visible = false;
    const heatControl = label('加热 / 停止', LEFT, 0.018, 0.052, 0.075);
    const strongControl = label('强热 / 停止', RIGHT, 0.017, 0.037, 0.065);
    const readControl = label('冷却后读数', BELL, 0.012, 0.067, 0.085);
    const transferControl = label('收集红色粉末', LEFT, 0.012, 0.10, 0.10);
    const mixControl = label('合并气体', COLLECT, 0.012, 0.063, 0.08);
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
        if (S.heated >= 1) return status('持续加热过程已结束。停止加热后等待冷却，再读数。');
        S.heating = !S.heating;
        status(S.heating ? '加热中：银白色汞表面逐渐出现红色粉末。历史上的 12 天在这里压缩为 18 秒。' : '已停止加热，等待冷却；也可以再次加热，继续观察。');
      },
      read() {
        if (S.heating || S.heat > 0.015) return status('先停止加热，等装置冷却后再比较体积。');
        if (S.heated === 0) return status('初始空气记为 100 份。先点左边的加热，看看有什么变化。');
        const remaining = INITIAL - consumed();
        log(['加热后冷却', remaining.toFixed(1) + ' 份', '比初始减少 ' + consumed().toFixed(1) + ' 份']);
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
        if (!S.transferred) return status('先收集左边生成的红色粉末。');
        if (S.decomposed >= 1) return status('红色粉末已经分解完，等待冷却后记录氧气体积。');
        S.strong = !S.strong;
        status(S.strong ? '强热红色粉末：银白色汞重新出现，氧气进入右侧收集容器。' : '已停止强热。');
      },
      record() {
        if (S.decomposed < 1) return status('先继续强热，直到红色粉末分解完。');
        if (S.strong || S.heat > 0.015) return status('等待冷却，统一在相同温度和压强下比较体积。');
        if (!S.recovered) log(['强热后冷却', recovered().toFixed(1) + ' 份氧气', '等于先前减少的气体体积']);
        S.recovered = true; done('recover');
        status('收回了 21 份氧气，恰好是原先减少的部分。可以把它与剩余气体合并。');
      },
      mix() {
        if (!S.recovered) return A.record();
        if (S.mixed || S.mix > 0) return;
        S.mix = 0.001; mw.close();
      },
      reset() {
        if (bar.playing) bar.stop();
        S = fresh(); mw.close(); W?.tbl.clear(); W?.question.close();
        if (W) W.next.hidden = true;
        bar.undo('heat', 'read', 'transfer', 'recover', 'mix', 'why');
        status('点左侧炉子的“加热 / 停止”，观察汞与空气。');
      },
    };
    const drag = draggable(group, [], { tip: tag('', 'pill'), taps: [
      { obj: heatControl, hint: () => S.transferred ? '' : '点一下开始或停止加热', onTap: A.heat },
      { obj: readControl, hint: '冷却后，读剩余气体的体积', onTap: A.read },
      { obj: transferControl, hint: () => S.transferred ? '' : '冷却读数后，收集红色粉末', onTap: A.transfer },
      { obj: strongControl, hint: '点一下开始或停止强热', onTap: A.strong },
      { obj: mixControl, hint: () => S.mixed ? '' : S.recovered ? '把收回的氧气和剩余气体合并' : '冷却后记录氧气体积', onTap: A.mix },
    ] });
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'heat', title: '加热汞', todo: '点左侧炉子的<b>加热 / 停止</b>。观察银白色汞表面的变化。', target: () => heatControl },
        { id: 'read', title: '冷却读数', todo: '等装置冷却后，点<b>冷却后读数</b>，比较气体体积。', target: () => readControl },
        { id: 'transfer', title: '收集粉末', todo: '点<b>收集红色粉末</b>，把它移到右侧的小容器。', target: () => transferControl },
        { id: 'recover', title: '强热粉末', todo: '点右侧<b>强热 / 停止</b>；冷却后，点右侧气体容器前的按钮记录体积。', target: () => S.decomposed >= 1 ? mixControl : strongControl },
        { id: 'mix', title: '合并比较', todo: '点<b>合并气体</b>，看总体积能否恢复。', target: () => mixControl },
        { id: 'why', title: '解释现象', todo: '对照左侧的观察记录，想一想减少的气体去了哪里。' },
      ],
      reels: { demo: {
        label: '老师演示',
        ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => mw.close() }),
        shots: [
          { cap: '加热汞，银白色液体表面逐渐生成红色粉末。12 天被压缩为 18 秒。', dur: 19, enter: A.heat },
          { cap: '停止加热，冷却后再读数。比较体积时需要相同的温度和压强。', dur: 5 },
          { cap: '气体从 100 份减少到 79 份。收集红色粉末到另一个小容器。', dur: 4, enter: () => { A.read(); A.transfer(); } },
          { cap: '再加强热，红色粉末分解，汞重新出现，并放出氧气。', dur: 11, enter: A.strong },
          { cap: '等待冷却，读出收回的氧气体积。', dur: 5 },
          { cap: '收回的 21 份氧气与剩下的 79 份气体合并，总体积恢复为 100 份。', dur: 5, enter: () => { A.record(); A.mix(); } },
        ],
      } },
    });
    function update(dt, time) {
      const step = Math.min(dt, 1 / 30) * bar.update(dt);
      if (S.heating) {
        S.heated = Math.min(1, S.heated + step / HEAT_SECONDS);
        if (S.heated === 1) { S.heating = false; done('heat'); }
      }
      if (S.strong) {
        S.decomposed = Math.min(1, S.decomposed + step / DECOMPOSE_SECONDS);
        if (S.decomposed === 1) S.strong = false;
      }
      S.heat = S.heating || S.strong ? 1 : Math.max(0, S.heat - step / 3);
      if (S.transfer > 0 && !S.transferred) {
        S.transfer = Math.min(1, S.transfer + step / 2.4);
        if (S.transfer === 1) { S.transferred = true; done('transfer'); }
      }
      if (S.mix > 0 && !S.mixed) {
        S.mix = Math.min(1, S.mix + step / 2.4);
        if (S.mix === 1) {
          S.mixed = true; done('mix');
          log(['合并气体', INITIAL.toFixed(1) + ' 份', '79 份剩余气体 + 21 份氧气']);
          if (!S.demo) W?.question.open();
        }
      }
      stove.fire.setOn(S.heating); burner.fire.setOn(S.strong);
      stove.fire.update(time); burner.fire.update(time);
      oxide.visible = !S.transferred;
      oxide.scale.set(0.1 + S.heated * 0.9, 0.12, 0.1 + S.heated * 0.9);
      oxide.visible &&= S.heated > 0;
      sample.visible = S.transfer > 0 && !S.transferred;
      sample.position.set(THREE.MathUtils.lerp(LEFT, RIGHT, S.transfer), 0.12 + Math.sin(S.transfer * Math.PI) * 0.075, 0);
      smallPowder.visible = S.transferred && S.decomposed < 1;
      smallPowder.scale.setScalar(Math.max(0.001, 1 - S.decomposed));
      smallPowder.scale.y *= 0.15;
      smallMetal.visible = S.decomposed > 0;
      smallMetal.scale.set(S.decomposed, 0.16, S.decomposed);
      const remaining = INITIAL - consumed() + recovered() * S.mix;
      airBell.liquid.scale.y = 0.008 + (INITIAL - remaining) / INITIAL * 0.105;
      oxygenBell.liquid.scale.y = 0.08 - recovered() * (1 - S.mix) / OXYGEN * 0.063;
      for (let i = 0; i < gasDots.length; i++) {
        const dot = gasDots[i], angle = i * 2.4 + time * 0.25;
        dot.visible = i >= 8 || i < Math.round(8 * (1 - S.heated + S.decomposed * S.mix));
        dot.position.set(BELL + Math.cos(angle) * 0.019, 0.055 + (i % 7) * 0.009, Math.sin(angle) * 0.019);
      }
      for (let i = 0; i < returnedDots.length; i++) {
        const dot = returnedDots[i], angle = i * 2.4 + time * 0.3;
        dot.visible = i < Math.round(S.decomposed * 8) && !S.mixed;
        dot.position.set(THREE.MathUtils.lerp(COLLECT, BELL, S.mix) + Math.cos(angle) * 0.012,
          0.08 + Math.sin(S.mix * Math.PI) * 0.09 + (i % 3) * 0.008, Math.sin(angle) * 0.012);
      }
      leftCard.loc(group, -0.11, 0.19, 0).text('<div class="cc"><div class="cc-t">原来的空气</div><div class="cc-more">' +
        (S.heat > 0.015 ? '冷却后比较体积' : remaining.toFixed(1) + ' / 100 份') +
        '<br><small>历史加热进程 ' + (S.heated * 12).toFixed(1) + ' / 12 天</small></div></div>');
      rightCard.loc(group, 0.20, 0.16, 0).text('<div class="cc"><div class="cc-t">红色粉末放出的氧气</div><div class="cc-more">' +
        (S.heat > 0.015 ? '冷却后比较体积' : (recovered() * (1 - S.mix)).toFixed(1) + ' 份') +
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
          { text: '冷却后读数', onClick: A.read },
          { text: '收集红色粉末', onClick: A.transfer },
          { text: '强热 / 停止', onClick: A.strong },
          { text: '记录氧气', onClick: A.record },
          { text: '合并气体', onClick: A.mix },
          { text: '看微观变化', ghost: true, onClick: openMicro },
        ]);
        const note = h('p', { class: 'fineprint' }, '历史实验的教学模拟。汞及其化合物有毒，请勿自行复现。时间、粒子和气路均作示意；以初始气体 100 份归一化，体积统一按冷却后同温同压比较。');
        const xuean = mountXuean(ui, { controls: [note, controls, question.el, moreBox([], A.reset)],
          headers: ['操作', '体积', '观察'], intro: '点左侧炉子开始加热，看红色粉末怎样出现。' });
        W = { ...xuean, question, status: (m) => ui.status(m) };
        bar.attach(ui);
      },
      update,
      dispose() { mw.dispose(); bar.dispose(); },
      debug: {
        get S() { return S; }, A, bar,
        qa: qaFlow(drag, [
          { name: '加热汞', tap: heatControl, wait: 20 },
          { name: '冷却', run: () => {}, wait: 4 },
          { name: '读剩余气体', tap: readControl },
          { name: '收集粉末', tap: transferControl, wait: 3 },
          { name: '强热', tap: strongControl, wait: 12 },
          { name: '再次冷却', run: () => {}, wait: 4 },
          { name: '记录氧气', tap: mixControl },
          { name: '合并气体', tap: mixControl, wait: 3 },
          { name: '回答', run: () => W.question.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
