// 人教版高中化学必修第二册，第36页，实验6-3、图6-6。
import * as THREE from 'three';
import { chemBeaker } from './kit/chem.js';
import { plate, wire } from './kit/dianzhi-parts.js';
import { bubble2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { lessonBar } from './kit/lessonbar.js';
import { V, strip, ammeter, clip, jawTouchesTop, interfaceScene } from './kit/galvanic-parts.js';
import { h } from '../ui/Panel.js';

const CX = 0.035,
  R = 0.052,
  RIM = 0.084,
  LEVEL = 0.059,
  HALF = 0.048;
const REST = [V(CX - 0.024, RIM + 0.002), V(CX + 0.024, RIM + 0.002), V(0.136, 0.015), V(-0.037, 0.015)];
const lower = (i) => V(REST[i].x, 0.051);
const intro = '杯里盛着稀硫酸。把搭在杯口的锌片、铜片分别向下拖入溶液，比较两片金属的表面。';
const rows = {
  zinc: ['锌片入酸', '锌片冒泡'],
  copper: ['铜片入酸', '铜片无气泡'],
  direct: ['导线直连', '铜片冒泡'],
  meter: ['串入电流表', '铜片冒泡，指针偏转'],
};
export default {
  id: 'galvanic',
  fig: '图6-6',
  title: '原电池实验',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '铜片单独浸在稀硫酸里没有气泡。用导线把它和酸里的锌片连起来，铜片上会怎样？',
    hint: '实验6-3 · 先猜，再观察。',
    options: ['仍然没有气泡', '铜片上开始冒泡', '铜片逐渐溶解'],
    answer: 1,
  },
  need: '比较连接前后两片金属的表面，再串入电流表观察指针。',
  conclusion: {
    crops: [{ page: 40, rect: [219, 477, 532, 560] }],
    quote:
      '可以看到，当锌片与铜片插入稀硫酸时，锌片上有气泡产生，铜片上无气泡产生；当用导线将锌片和铜片相连后，铜片上有气泡产生；串联电流表后，电流表指针发生偏转，说明导线中有电流通过。',
    formula: 'Zn + 2H⁺ = Zn²⁺ + H₂↑',
    why: '锌原子失去电子，成为锌离子进入溶液。电子从锌片经导线流向铜片，两个氢离子在铜片表面各得到一个电子，形成的两个氢原子结合成氢分子。',
    src: '课本第 36 页 · 第六章 第一节',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(),
      group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.4, d: 0.24 });
    const cup = chemBeaker({ r: R, h: RIM, level: LEVEL, marks: false, color: 0xc9e1e5 });
    cup.position.x = CX;
    group.add(cup);
    const acid = plate('稀硫酸', 0.039, 0.013);
    acid.position.set(CX, 0.025, R + 0.001);
    group.add(acid);
    const meter = ammeter();
    meter.g.position.set(-0.101, 0, -0.022);
    group.add(meter.g);
    const terminals = meter.posts.map((p) =>
      p.position
        .clone()
        .add(meter.g.position)
        .add(V(0, 0.017, 0)),
    );
    const tools = [strip(false), strip(true), clip(0x30373e), clip(0xaf3c2c)];
    tools.forEach((o) => group.add(o));
    const metalLabels = ['Zn', 'Cu'].map((s, i) => {
      const p = plate(s, 0.015, 0.009, { bg: i ? '#be7048' : '#abb7bc' });
      p.position.set(0, 0.029, 0.0014);
      tools[i].add(p);
      return p;
    });
    const leads = [wire(group, 0x30383e), wire(group, 0xb54335)];
    const gasGeometry = new THREE.SphereGeometry(1, 14, 10);
    const gasMaterial = bubble2({ color: 0x506774, white: 0.26 });
    const bubbles = Array.from({ length: 20 }, () => {
      const b = new THREE.Mesh(gasGeometry, gasMaterial);
      b.renderOrder = 10;
      group.add(b);
      return b;
    });
    const card = tag('', 'cond');
    const fresh = () => ({
      demo: false,
      pos: REST.map((p) => p.clone()),
      wet: [false, false],
      ends: ['free', 'free'],
      drag: -1,
      returns: [],
      seen: {},
      gas: [],
      credit: 0,
      emitted: 0,
      needle: 0,
    });
    let S = fresh(),
      W,
      gen = 0;
    const circuit = () => {
      if (!S.wet.every(Boolean)) return 'open';
      if (S.ends[0] === 'copper') return 'direct';
      return S.ends[0] === 'post' && S.ends[1] === 'copper' ? 'meter' : 'open';
    };
    const reaction = () => ({ circuit: circuit(), zinc: S.wet[0], copper: S.wet[1] });
    const scene = interfaceScene();
    const mic = micro({
      tag,
      look,
      back,
      group,
      scene,
      at: () => V(CX, 0.095, 0),
      btnAt: () => V(CX + 0.023, 0.011, 0.085),
      scale: 0.011,
      dist: 0.3,
      lookD: [0.025, 0.48, 1],
      label: '钻进去看',
      state: reaction,
      key: () => [...S.wet, circuit()].join('/'),
      show: () => S.wet.some(Boolean),
      bar: () => bar,
    });
    const overlay = document.querySelectorAll('.mw');
    overlay[overlay.length - 1].classList.add('galvanic-micro');
    const layout = h(
      'style',
      {},
      `
      @media(max-width:760px){
        .galvanic-micro .mw-hud,.galvanic-micro .mw-scale {left:12px!important;width:calc(100% - 24px)!important}
        .galvanic-micro .mw-scale {top:52px!important;text-align:left}
        .galvanic-micro .mw-hud {top:51vh!important;background:#fffcf3;padding:12px;box-sizing:border-box;border-top:2px solid #768d9d}
        .galvanic-micro .mw-dim {background-color:rgba(245,242,233,.85);mask-image:none;-webkit-mask-image:none}
        body.lesson-on #viewctl {top:48px;bottom:auto;right:12px;flex-direction:row;align-items:center;gap:4px;pointer-events:none}
        #viewctl button {pointer-events:auto}
        #viewctl .show-tg:last-of-type,#viewctl .lesson-community {margin:0}
        #viewctl .lesson-community {padding:0;border:0}
        body.lesson-on:not(.predicting):not(.hide-steps) .lbar.do,body.lesson-on:not(.predicting) .lbar.film {display:grid;grid-template-columns:auto 1fr auto auto;gap:3px 6px;padding:5px 7px;font-size:13px;line-height:1.25}
        .lbar .lb-main {grid-column:2 / -1}
        .lbar .lb-steps {grid-column:2}
        .lbar .lb-seal {writing-mode:horizontal-tb;white-space:nowrap}

        .galvanic-micro .mw-close {left:auto!important;right:10px;top:42px!important}
      }`,
    );
    document.head.append(layout);
    const pin = (i) => V(0, HALF, 0).applyEuler(tools[i].rotation).add(S.pos[i]);
    const copperDock = () => pin(1).add(V(0, 0.011, 0));
    const redFirst = () => bar.current === 'direct' && S.ends[1] === 'copper';
    const removeRed = '先把红夹从铜片取下，再把黑夹夹到铜片上端。';
    function record(key, observation = rows[key]) {
      if (S.seen[key]) return;
      S.seen[key] = true;
      W.tbl.add(observation);
      if (key === 'direct') W.ui.observePrediction('用导线连接后，铜片上有气泡产生。');
    }
    function showConnection(fallback = '导线未接通。') {
      if (S.demo) return;
      const mode = circuit();
      let msg = fallback;
      if (mode !== 'open') {
        record(mode);
        msg = rows[mode].join('：') + '。';
        if (mode === 'direct' || bar.has('direct')) bar.done(mode);
      }
      let hint = null;
      if (redFirst()) hint = removeRed;
      else if (bar.current === 'meter' && S.ends[0] === 'post') hint = '黑夹已接到电流表。把红夹夹到铜片上端。';
      bar.say(hint);
      W.ui.status(hint ? (mode === 'open' ? hint : msg + hint) : msg);
      if (bar.finished && W.next.hidden) {
        W.next.hidden = false;
        W.question.open();
      }
    }
    function renderTools() {
      for (let i = 0; i < 4; i++) {
        tools[i].position.copy(S.pos[i]);
        if (i < 2) {
          const tilt = clamp((S.pos[i].y - lower(i).y) / (REST[i].y - lower(i).y), 0, 1);
          tools[i].rotation.x = (-Math.PI / 2) * tilt;
          metalLabels[i].userData.ringY = pin(i).y + 0.003;
        }
      }
      for (let j = 0; j < 2; j++)
        if (S.ends[j] === 'copper') {
          S.pos[j + 2].copy(copperDock());
          tools[j + 2].position.copy(S.pos[j + 2]);
        }
      leads[0].update(pin(0), S.pos[2].clone().add(V(0, 0.008, 0)), 0.029);
      const redStart = terminals[1].clone().sub(V(0, 0.012, 0));
      const redEnd = S.pos[3].clone().add(V(0, 0.008, 0));
      leads[1].update(redStart, redEnd, 0.022);
      // 红线向表盘前方弯出，让两条绝缘导线在空间里错开。
      const red = leads[1].mesh;
      red.quaternion.setFromAxisAngle(redEnd.sub(redStart).normalize(), 0.47);
      red.position.copy(redStart).sub(redStart.clone().applyQuaternion(red.quaternion));
    }
    function clipTarget(i, grip) {
      if (S.wet[1] && S.ends[3 - i] !== 'copper' && jawTouchesTop(grip, pin(1), tools[1].geometry.parameters.width / 2)) {
        return ['copper', copperDock()];
      }
      const post = meter.posts[0];
      const top = post.position.clone().add(meter.g.position);
      top.y += post.geometry.parameters.height / 2;
      if (i === 2 && jawTouchesTop(grip, top, post.geometry.parameters.radiusTop)) return ['post', terminals[0]];
      return null;
    }
    const hints = ['把锌片向下插入稀硫酸', '把铜片向下插入稀硫酸', '拖动黑夹，连接或断开导线', '把红夹夹到铜片上'];
    const drags = tools.map((obj, i) => ({
      obj,
      keepOffset: true,
      plane: 'xy',
      hint: hints[i],
      onStart() {
        S.drag = i;
        S.returns[i] = null;
      },
      onDrag(p) {
        if (i < 2 && S.wet[i]) return;
        if (i >= 2 && S.ends[i - 2] !== 'free') {
          S.ends[i - 2] = 'free';
          showConnection();
        }
        S.pos[i].copy(p).setZ(0);
        S.pos[i].y = clamp(p.y, i < 2 ? HALF + 0.002 : 0.015, 0.18);
        renderTools();
      },
      onEnd(moved) {
        S.drag = -1;
        if (!moved || (i < 2 && S.wet[i])) return;
        const p = S.pos[i];
        if (i < 2) {
          const bottom = pinBottom(i);
          if (
            Math.hypot(bottom.x - CX, bottom.z) < R - 0.011 &&
            Math.abs(p.x - S.pos[1 - i].x) > 0.019 &&
            bottom.y < LEVEL - 0.006
          ) {
            S.wet[i] = true;
            S.returns[i] = { from: p.clone(), to: p.clone().setY(lower(i).y), elapsed: 0 };
            // 保留学生实际放置的位置，接线夹和气泡都取这个电极的位置。
            const key = i === 0 ? 'zinc' : 'copper';
            if (!S.demo) {
              const observation = circuit() === 'open' ? rows[key] : [rows[key][0], '电路接通，铜片冒泡'];
              record(key, observation);
              bar.done(key);
              showConnection(observation.join('：') + '。');
            }
            return;
          }
        } else {
          const hit = clipTarget(i, p);
          if (hit) {
            S.ends[i - 2] = hit[0];
            p.copy(hit[1]);
            showConnection();
            return;
          }
        }
        S.returns[i] = { from: p.clone(), elapsed: 0 };
        if (i >= 2) showConnection('导线未接通。将导线夹对准接点，再松手。');
      },
    }));
    function pinBottom(i) {
      return V(0, -HALF, 0).applyEuler(tools[i].rotation).add(S.pos[i]);
    }
    // 电极放稳以后只操作导线；两个导线夹始终可以重新拿起。
    drags.slice(0, 2).forEach((d, i) => {
      d.enabled = () => !S.wet[i];
      d.hint = () => (S.wet[i] ? '' : hints[i]);
    });
    drags[3].hint = () => S.ends[1] === 'copper' ? '把红夹从铜片取下' : hints[3];
    const drag = draggable(group, drags, { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const blackPost = () => terminals[0].clone();
    const moves = [
      ['zinc', '插入锌片', '沿着光圈，把锌片向下拖进稀硫酸。', 0, () => lower(0)],
      ['copper', '插入铜片', '把铜片也向下拖进稀硫酸，比较两片金属的表面。', 1, () => lower(1)],
      ['direct', '连接导线', '黑导线的一端连着锌片。把黑夹夹到铜片上端，看铜片表面。', 2, copperDock],
      ['meter', '串入电流表', '把铜片上的黑夹移到电流表的黑接线柱，再把红夹夹到铜片上端。', 2, blackPost],
    ];
    const liftClip = (i, to) =>
      act.path(tools[i], [() => S.pos[i], () => S.pos[i].clone().setY(0.135), () => to().clone().setY(0.135), to], {
        t1: 0.72,
        release: 0.76,
      });
    const shots = moves.map(([, title, todo, i, to]) => ({
      cap: todo,
      dur: 3.3,
      during: i < 2 ? act.drag(tools[i], to, { from: () => S.pos[i], t1: 0.65, release: 0.7 }) : liftClip(i, to),
    }));
    shots.push(
      { cap: '红夹接上铜片，观察电流表指针。', dur: 3.3, during: liftClip(3, copperDock) },
      {
        cap: '从锌片出发，追踪两个电子。',
        dur: 10,
        cam: [[CX, 0.145, 0], [0.025, 0.48, 1], 0.3],
        enter: () => mic.open(true),
      },
    );
    const apply = () => {
      mic.close();
      renderTools();
    };
    const bar = lessonBar({
      group,
      look,
      back,
      ringOptions: { minOpacity: 0.55 },
      steps: moves.map(([id, title, todo, i]) => ({
        id,
        title,
        todo,
        target: () => (i < 2 ? metalLabels[i] : tools[redFirst() || (id === 'meter' && S.ends[0] === 'post') ? 3 : i]),
      })),
      reels: {
        demo: {
          label: '老师演示',
          seal: '演示',
          ...sandbox({
            get: () => S,
            set: (s) => {
              S = s;
            },
            fresh,
            apply,
            bar: () => bar,
            view: {
              save: () => (mic.isOpen ? { gen, time: scene.time } : null),
              restore: (v) => {
                if (v.gen === gen) {
                  mic.open();
                  scene.time = v.time;
                }
              },
            },
          }),
          shots,
        },
      },
    });
    function reset() {
      gen++;
      if (bar.playing) bar.stop();
      S = fresh();
      apply();
      W.tbl.clear();
      W.question.close();
      W.next.hidden = true;
      W.ui.relock();
      bar.undo(...moves.map((m) => m[0]));
      bar.say(null);
      W.ui.status(intro);
      W.ui.observePrediction('');
    }
    renderTools();
    function update(dt) {
      const k = bar.update(dt),
        elapsed = Math.min(dt, 0.05) * k;
      S.returns.forEach((r, i) => {
        if (!r) return;
        r.elapsed += elapsed;
        const t = clamp(r.elapsed / 0.38, 0, 1);
        S.pos[i].lerpVectors(r.from, r.to || REST[i], t);
        if (t === 1) S.returns[i] = null;
      });
      renderTools();
      const mode = circuit(), connected = mode !== 'open';
      const current = connected ? 0.6 / (120 + (mode === 'meter' ? 5 : 0)) : 0;
      const dial = mode === 'meter' ? current / 0.01 : 0;
      S.needle += (dial - S.needle) * Math.min(1, elapsed * 14);
      meter.needle.rotation.z = 0.78 - 1.56 * S.needle;
      const emitter = connected ? 1 : 0;
      const bottom = pinBottom(emitter);
      S.credit += S.wet[0] ? elapsed * (connected ? (current / 0.005) * 12 : 8) : 0;
      while (S.credit >= 1) {
        const n = ++S.emitted;
        S.gas.push({
          x: bottom.x + 0.006 * Math.sin(n * 7),
          y: bottom.y + 0.006 + (n % 4) * 0.003,
          z: bottom.z + 0.003,
          r: 0.0012 + (n % 5) * 0.0002,
        });
        S.credit--;
      }
      S.gas.forEach((b) => {
        b.y += elapsed * 0.042;
      });
      S.gas = S.gas.filter((b) => b.y < LEVEL);
      bubbles.forEach((mesh, j) => {
        const bubble = S.gas[j];
        mesh.visible = Boolean(bubble);
        if (bubble) {
          mesh.position.set(bubble.x, bubble.y, bubble.z);
          mesh.scale.setScalar(bubble.r);
        }
      });
      const stamp = connected ? '铜片冒泡' : S.wet[0] ? '锌片冒泡' : '无气泡';
      const note = mode === 'meter' ? '指针偏转' : S.wet[1] && !connected ? '铜片未产生气泡' : '';
      card
        .text(
          '<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里</span><span class="cc-res">' +
            stamp +
            '</span></div>' +
            (note ? '<div class="cc-note">' + note + '</div>' : '') +
            '</div>',
        )
        .loc(group, innerWidth <= 760 ? -0.094 : CX + R + 0.024, innerWidth <= 760 ? 0.132 : 0.07, 0)
        .show(S.wet.some(Boolean) && !mic.isOpen && !bar.playing);
      mic.update(dt, k);
    }
    const qa = qaFlow(drag, [
      ...moves.map(([, name, , i, to]) => ({ name, drag: tools[i], to })),
      { name: '接红夹', drag: tools[3], to: copperDock },
      { name: '钻进去看', run: () => mic.open(), wait: 4 },
      { name: '回到桌上', run: () => mic.close(), wait: 3 },
      { name: '断开红夹', drag: tools[3], to: () => REST[3] },
      {
        name: '核对',
        run: () => {
          if (!bar.finished || circuit() !== 'open' || S.needle > 0.01 || W.next.hidden) throw Error('断路或观察记录异常');
        },
      },
    ]);
    return {
      group: root,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.34, d: 0.18, h: 0.14 },
      view: { elev: 24, azim: 0, lookY: 0.42, frameMargin: 1.08 },
      pointer: wrapPointer(drag, bar),
      reset,
      update,
      mount(ui) {
        const question = think({
          title: '想一想（选做）',
          q: '铜片上冒出了氢气，提供电子的是谁？',
          options: ['锌原子', '铜原子'],
          ok: '锌原子失去电子，成为锌离子进入溶液。',
          wrong: ['沿着导线反向追踪，电子从哪一片金属出发？'],
          status: ui.status,
        });
        const note = h(
          'details',
          { class: 'more' },
          h('summary', {}, '模型、近似和出处'),
          h(
            'p',
            { class: 'fineprint' },
            '依据课本第 36 页图6-6、图6-7。指针偏角和气泡速率为示意。模型假设有效电动势为 0.60 V、电池内阻为 120 Ω、电流表内阻为 5 Ω，用来估算闭路时的电流。断路时电流为零。气泡突出显示主要析氢位置。粒子图只追踪一组反应，导线长度和电子运动时间经过缩放。',
          ),
        );
        const base = mountXuean(ui, {
          intro,
          headers: ['操作', '观察到的现象'],
          controls: [moreBox([], reset), note],
        });
        ui.data.nextElementSibling.style.display = 'none';
        ui.observePrediction('');
        ui.data.append(question.el, base.next);
        W = { ...base, question, ui };
        bar.attach(ui);
      },
      dispose() {
        gen++;
        layout.remove();
        bar.dispose();
        mic.dispose();
        drag.dispose();
        leads.forEach((w) => w.dispose());
      },
      debug: {
        get S() {
          return S;
        },
        bar,
        qa,
        picks: { zinc: tools[0], copper: tools[1], black: tools[2], red: tools[3] },
      },
    };
  },
};
