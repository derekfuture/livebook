// 图7.2-2 弹簧测力计 · 实验“用弹簧测力计测量力”。按课本的步骤：
//   1 认清测量范围和分度值  2 检查指针是否指在零刻度线，调零  3 用手拉挂钩到 1 N、3 N、5 N
//   4 (1) 挂文具袋，读 F₁  (2) 沿水平方向拖动桌上的文具袋，读 F₂  5 总结操作要求
// 板式测力计（课本图丙）：0~5 N，分度值 0.2 N，弹簧的伸长与拉力成正比（在弹性限度内）。拉过头弹簧会被拉坏（不再回到零）。
import * as THREE from 'three';
import { slider, buttons, goals, note, readout } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand } from './kit/props.js';
import { forceMeter, FM } from './kit/forcemeter.js';
import { paint, inked, hull } from '../live/ink.js';

const { MAX, PER_N, L } = FM;                              // 量程、每牛顿伸长、刻度板长
const BAG = 2.4, FS = 1.2, FK = 1.0, MBAG = BAG / 9.8;    // 文具袋重、最大静摩擦、滑动摩擦
const TOPY = 0.37;                                         // 吊挂点高度

export default {
  id: 'springscale',
  fig: '图7.2-2',
  title: '用弹簧测力计测量力',
  stampText: '测量',
  predict: {
    q: '一个弹簧测力计的最大测量值是 5 N。<br>用手使劲拉，拉到远超过 5 N 会怎样？',
    hint: '课本第 8 页',
    options: ['读数一直增大，没有影响', '弹簧可能被拉坏，测力计就不准了', '指针停在 5 N 不动'],
    answer: 1,
  },
  conclusion: {
    page: 12, rect: [196, 94, 456, 262],       // 课本第 8 页
    quote: '测量力的大小的工具叫作测力计。在弹性限度内，弹簧受到的拉力越大，弹簧的伸长量就越大。……使用弹簧测力计的时候，首先要看清它的测量范围。加在弹簧测力计上的力不允许超过它的最大测量值，否则会损坏弹簧测力计。',
    why: '使用弹簧测力计要注意：① 先看清测量范围和分度值（这个测力计 0~5 N，每小格 0.2 N）；② 使用前检查指针是否指在零刻度线，不在就调零；③ 被测的力不能超过最大测量值；④ 测力时，要使测力计内弹簧的轴线方向跟所测力的方向一致；⑤ 读数时，视线要正对刻度线。水平拖动文具袋时，要沿水平方向匀速拉动，示数才等于桌面对文具袋的摩擦力。',
    src: '课本第 8 页 · 第七章 第2节 弹力',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const st = stand({ height: 0.4, baseW: 0.14, baseD: 0.1 });
    st.position.set(-0.11 - st.rodX, 0, -0.03);
    const arm = st.clamp(TOPY + 0.006, 0.12);
    group.add(st);
    void arm;
    const sc = forceMeter();
    group.add(sc);
    // 文具袋
    const bag = new THREE.Group();
    const bagBody = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.032, 0.038), paint(0x3f7cc4)), { width: 1.2 });
    bagBody.position.y = 0.016;
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.002, 0.004), paint(0xd9d9d9));
    zip.position.y = 0.0325;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 14), paint(0x2b2f3a));
    bag.add(bagBody, zip, loop);
    group.add(bag);
    const handTag = tag('手', 'pill');
    // 状态
    const S = { mode: 'hang', pull: 0, zero: 0.2, broken: false, hits: new Set(), bag: false, xr: 0.13, xb: -0.02, vb: 0, steady: 0, F: 0, drag: false };
    let W = null;
    const reading = () => S.F + S.zero + (S.broken ? 0.6 : 0);

    const layout = () => {
      if (S.mode === 'hang') {
        sc.rotation.z = 0;
        sc.position.set(0, TOPY, -0.03);
        S.F = S.bag ? BAG : S.pull;
        sc.set(S.F, S.zero + (S.broken ? 0.6 : 0), S.broken);
        if (S.bag) { bag.visible = true; bag.rotation.set(0, 0, 0); bag.position.set(0, TOPY + sc.hookEnd - 0.036, -0.03); loop.position.set(0, 0.038, 0); }
        else bag.visible = false;
        handTag.loc(group, 0, TOPY + sc.hookEnd - 0.012, -0.012).text(S.bag ? '' : '拖挂钩');
      } else {
        // 测力计横放在桌面上（侧立，刻度朝着你），挂钩钩住文具袋，手拉圆环
        sc.rotation.z = -Math.PI / 2;
        sc.set(S.F, S.zero + (S.broken ? 0.6 : 0), S.broken);
        sc.position.set(S.xr, 0.026, 0.1);
        bag.visible = true;
        bag.position.set(S.xb, 0, 0.1);
        loop.position.set(0.039, 0.016, 0); loop.rotation.set(Math.PI / 2, 0, 0);
        handTag.loc(group, S.xr + 0.012, 0.05, 0.1).text('拖圆环');
      }
    };
    // 水平时：圆环在 xr，挂钩在 xr − (板长 + 伸长)，钩住文具袋右端
    const hookOffset = () => 0.012 + L + 0.012 + 0.006;
    const pickHook = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pickHook.userData.pick = true;
    group.add(pickHook);

    const pointer = draggable(group, [{ obj: pickHook, plane: 'xy', offset: -0.03, onStart: () => { S.drag = true; }, onEnd: () => { S.drag = false; if (S.mode === 'hang' && !S.bag) S.pull = 0; }, onDrag: (p) => {
      if (S.mode === 'hang') {
        if (S.bag) return;
        // 手往下拉：拉力 = 伸长 / 每牛伸长
        const hook0 = TOPY - 0.012 - L - 0.012 - 0.006;
        S.pull = clamp((hook0 - p.y) / PER_N, 0, 6.6);
      } else S.xr = clamp(p.x, 0.2, 0.42);
    } }]);

    const status = (m) => W?.status(m);
    let asked = null, ask = () => {};

    return {
      group,
      size: { w: 0.42, d: 0.22, h: 0.4 },
      view: { elev: 14, azim: 0, lookY: 0.5, margin: 1.15 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'r', label: '指针指的刻度', unit: 'N', secret: true }, { key: 'm', label: '' }]);
        const zero = slider('调零（旋动顶上的调零螺丝）', { min: -40, max: 40, value: 20, fmt: () => '看指针是否对准零刻度线', onInput: (v) => { if (S.bag || S.pull > 0.05 || S.mode !== 'hang') { zero.set(Math.round(S.zero * 100)); return status('调零要在<b>不受力</b>的时候：先取下挂着的东西，竖直挂好再调。'); } S.zero = v / 100; if (Math.abs(S.zero) < 0.025) { S.zero = 0; zero.set(0); W.goal.done('zero'); status('指针和零刻度线重合了。现在拖住下面的挂钩往下拉，分别拉到 1 N、3 N、5 N，感受一下这几个力。'); } } });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        ask = (id, q, opts0, right0, ok, hint) => { const order = opts0.map((_, i) => i).sort(() => Math.random() - 0.5); const opts = order.map((i) => opts0[i]), right = order.indexOf(right0); asked = { id, opts, right, ok, hint }; status(q); choices.btns.forEach((b, j) => (b.textContent = opts[j])); choices.el.hidden = false; };
        const answer = (j) => { if (!asked) return; if (j !== asked.right) return status(asked.hint); choices.el.hidden = true; W.goal.done(asked.id); if (asked.id === 'f1' || asked.id === 'f2') out.reveal('r'); const a = asked; asked = null; status(a.ok); };
        const acts = buttons([
          { text: '挂上文具袋', onClick: () => {
            if (S.mode !== 'hang') return status('先把测力计挂回铁架台上。');
            if (S.zero !== 0 || S.broken) return status(S.broken ? '弹簧被拉坏了，测出来不准——换一个新的测力计。' : '指针还没有对准零刻度线，这样测出来的力不准——<b>先调零</b>。');
            S.bag = true; S.pull = 0; layout();
            setTimeout(() => ask('f1', '文具袋静止后，看指针指在哪一格：<b>F₁ = ?</b>', ['2.4 N', '2.2 N', '12 N'], 0, '对：F₁ = 2.4 N（2 N 下面再数 2 小格，每小格 0.2 N）。', '再数一数：每一小格是 0.2 N，指针在 2 N 下面第几格？'), 900);
          } },
          { text: '沿水平方向拖文具袋', ghost: true, onClick: () => {
            if (S.zero !== 0 || S.broken) return status(S.broken ? '弹簧被拉坏了——换一个新的测力计。' : '先调零。');
            S.mode = 'flat'; S.bag = false; S.xr = 0.24; S.xb = 0.24 - hookOffset() - 0.035; S.vb = 0; S.F = 0; layout();
            look([0.12, 0.03, 0.1], [0, 0.55, 1], 0.8, () => back());       // 镜头移到桌面上
            status('测力计横过来，钩住桌上的文具袋。<b>按住圆环向右拖</b>，让文具袋在桌面上匀速移动。');
          } },
          { text: '挂回铁架台', ghost: true, onClick: () => { S.mode = 'hang'; S.bag = false; S.pull = 0; layout(); back(); status('测力计竖直挂在铁架台上。'); } },
          { text: '换一个新的测力计', ghost: true, onClick: () => { S.broken = false; S.zero = 0.2; zero.set(20); if (S.mode !== 'hang') back(); S.mode = 'hang'; S.bag = false; layout(); status('换了一个新的测力计——它的指针也没有对准零刻度线，记得先调零。'); } },
        ]);
        ui.controls.append(acts.el, zero.el, out.el, choices.el, note('拖动<b>挂钩</b>可以用手往下拉；水平拖动时拖<b>圆环</b>。'));
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['div', '认清测量范围和分度值'], ['zero', '检查指针是否对准零刻度线，调零'], ['feel', '用手拉挂钩，分别拉到 1 N、3 N、5 N'], ['f1', '挂上文具袋，读出 F₁'], ['f2', '沿水平方向匀速拖动文具袋，读出 F₂']]) };
        layout();
        ask('div', '先看清这个弹簧测力计：最大测量值 5 N。<b>每一小格表示多少牛？</b>', ['0.1 N', '0.2 N', '0.5 N'], 1, '对：1 N 之间有 5 小格，每小格 0.2 N。再看看指针——它指在零刻度线上吗？', '数一数 0 和 1.0 之间有几小格。');
      },
      update(dt) {
        if (S.mode === 'flat') {
          // 弹簧拉力 F = k·(伸长)；文具袋：静摩擦最大 1.2 N，滑动后摩擦 1.0 N
          const k = 1 / PER_N;
          const ext = S.xr - hookOffset() - (S.xb + 0.035);
          S.F = Math.max(0, ext * k);
          if (S.vb === 0 && S.F <= FS) { /* 静止 */ }
          else {
            const a = (S.F - FK) / MBAG - S.vb * 6;          // 加一点阻尼，让拖动平稳一些
            S.vb = Math.max(0, S.vb + a * dt);
            S.xb += S.vb * dt;
            if (S.vb < 0.002 && S.F < FK) S.vb = 0;
          }
          if (S.vb > 0.01 && Math.abs(S.F - FK) < 0.15) S.steady += dt; else S.steady = Math.max(0, S.steady - dt * 2);
          // 文具袋匀速移动了一会儿：让学生读此时的示数
          if (S.steady > 0.6 && !asked && W && !W.goal.has('f2')) {
            S.steady = -99;
            ask('f2', '文具袋在桌面上匀速移动。<b>此时测力计的示数 F₂ = ?</b>', ['1.0 N', '1.2 N', '2.4 N'], 0, '对：F₂ = 1.0 N。匀速拖动时，测力计的拉力和桌面对文具袋的摩擦力大小相等——比它的重 2.4 N 小得多。', '看匀速移动时指针停在哪里。刚开始拉动的一瞬间示数会大一点，那时还没有匀速。');
          }
          if (S.F > MAX * 1.1) S.broken = true;
        } else if (S.mode === 'hang' && !S.bag) {
          S.F = S.pull;
          for (const f of [1, 3, 5]) if (Math.abs(S.pull - f) < 0.1 && S.drag) S.hits.add(f);
          if (S.hits.size === 3 && W && !W.goal.has('feel')) { W.goal.done('feel'); status('1 N、3 N、5 N 都拉到了：拉力越大，弹簧伸得越长。现在点“挂上文具袋”。'); }
          if (S.pull > 5.2 && S.pull <= 6 && S.drag) status('<b>超过最大测量值了！</b>别再往下拉，会把弹簧拉坏。');
          if (S.pull > 6 && !S.broken) { S.broken = true; status('<b>弹簧被拉坏了：</b>松手后指针回不到零刻度线了。加在弹簧测力计上的力不能超过它的最大测量值。点“换一个新的测力计”。'); }
        }
        layout();
        pickHook.position.set(S.mode === 'hang' ? 0 : S.xr, S.mode === 'hang' ? TOPY + sc.hookEnd : 0.026, S.mode === 'hang' ? -0.03 : 0.1);
        W?.out.set('r', Math.max(0, reading()).toFixed(1));
        W?.out.set('m', S.broken ? '弹簧被拉坏了' : S.mode === 'flat' ? (S.vb > 0.005 ? '文具袋在动' : '文具袋没动') : S.bag ? '挂着文具袋' : S.pull > 0.05 ? '手在拉' : '');
      },
      debug: { S },
    };

  },
};
