// 人教版高中化学必修第二册，第36页，实验6-3、图6-6。
import * as THREE from 'three';
import { chemBeaker } from './kit/chem.js';
import { plate, wire } from './kit/dianzhi-parts.js';
import { bubble2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { lessonBar } from './kit/lessonbar.js';
import { V, strip, electrodeHolder, ammeter, clip, jawTouchesTop, interfaceScene } from './kit/galvanic-parts.js';
import { h } from '../ui/Panel.js';

const CX = 0.035,
  R = 0.052,
  RIM = 0.084,
  LEVEL = 0.059,
  HALF = 0.048,
  SLOT_X = 0.024;
const REST = [V(CX - SLOT_X, HALF + 0.070), V(CX + SLOT_X, HALF + 0.070), V(0.136, 0.015), V(-0.037, 0.015)];
const lower = (i) => V(REST[i].x, HALF + 0.025);
const stripOffset = V(0, -HALF);
const jawOffset = V(0, -0.011);
const intro = '杯口两侧各有一个绿色绝缘夹。沿各自的夹槽，把锌片和铜片向下拖入稀硫酸，比较两片金属的表面。';
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
    const holder = electrodeHolder(R + 0.003, SLOT_X);
    holder.position.y = RIM + 0.0006;
    cup.add(holder);
    const acid = plate('烧杯 · 稀硫酸', 0.056, 0.010);
    acid.position.set(CX, 0.023, R + 0.001);
    group.add(acid);
    const meter = ammeter('电流表');
    meter.g.position.set(-0.101, 0, -0.022);
    group.add(meter.g);
    const terminals = meter.posts.map((p) =>
      p.position
        .clone()
        .add(meter.g.position)
        .add(V(0, 0.017, 0)),
    );
    const blackPostTop = meter.posts[0].position.clone().add(meter.g.position);
    blackPostTop.y += meter.posts[0].geometry.parameters.height / 2;
    const tools = [strip(false), strip(true), clip(0x30373e), clip(0xaf3c2c)];
    tools.forEach((o) => group.add(o));
    const metalLabels = ['锌片', '铜片'].map((s, i) => {
      const p = plate(s, 0.015, 0.009, { bg: i ? '#be7048' : '#abb7bc' });
      p.position.set(0, 0.029, 0.0014);
      tools[i].add(p);
      return p;
    });
    const clipLabels = ['黑导线夹', '红导线夹'].map((word, i) => {
      const label = plate(word, 0.026, 0.008);
      label.position.set(0, 0.005, 0.005);
      label.raycast = THREE.Mesh.prototype.raycast;
      tools[i + 2].add(label);
      return label;
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
    const circuitMode = (zinc, copper, blackEnd, redEnd) => {
      if (!zinc || !copper) return 'open';
      if (blackEnd === 'copper') return 'direct';
      return blackEnd === 'post' && redEnd === 'copper' ? 'meter' : 'open';
    };
    const settledCircuit = () => circuitMode(...S.wet, ...S.ends);
    const contact = { zinc: false, copper: false, circuit: 'open' };
    const scene = interfaceScene();
    const mic = micro({
      tag,
      look,
      back,
      group,
      scene,
      at: () => V(CX, 0.095, 0),
      btnAt: () => V(CX, 0.011, R),
      scale: 0.011,
      dist: 0.3,
      lookD: [0.025, 0.48, 1],
      label: '钻进烧杯里看',
      state: () => ({ ...contact }),
      key: () => [contact.zinc, contact.copper, contact.circuit].join('/'),
      show: () => contact.zinc || contact.copper,
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
    const pin = (i) => V(0, HALF).add(S.pos[i]);
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
      const mode = settledCircuit();
      let msg = fallback;
      if (mode !== 'open') {
        msg = rows[mode].join('：') + '。';
        if (mode === 'direct' || S.seen.direct) {
          record(mode);
          bar.done(mode);
        }
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
    function bendLead(lead, start, end, lift, angle) {
      lead.update(start, end, lift);
      lead.mesh.quaternion.setFromAxisAngle(end.clone().sub(start).normalize(), angle);
      lead.mesh.position.copy(start).sub(start.clone().applyQuaternion(lead.mesh.quaternion));
    }
    function renderTools() {
      const small = innerWidth <= 760;
      acid.scale.setScalar(small ? 1.55 : 1);
      acid.position.y = small ? 0.035 : 0.023;
      clipLabels.forEach((label) => label.scale.setScalar(small ? 1.55 : 1));
      for (let i = 0; i < 4; i++) {
        tools[i].position.copy(S.pos[i]);
        if (i < 2) {
          metalLabels[i].scale.setScalar(small ? 1.6 : 1);
          metalLabels[i].userData.ringY = pin(i).y + 0.003;
        }
      }
      for (let j = 0; j < 2; j++)
        if (S.ends[j] === 'copper') {
          S.pos[j + 2].copy(copperDock());
          tools[j + 2].position.copy(S.pos[j + 2]);
        }
      // 黑线从电极后方绕过，红线从表盘前方绕过。
      bendLead(leads[0], pin(0), S.pos[2].clone().add(V(0, 0.008, 0)), 0.029, -0.28);
      const redStart = terminals[1].clone().sub(V(0, 0.012, 0));
      const redEnd = S.pos[3].clone().add(V(0, 0.008, 0));
      bendLead(leads[1], redStart, redEnd, 0.022, 0.47);
    }
    function immerse(i) {
      S.wet[i] = true;
      if (S.demo) return;
      const key = i === 0 ? 'zinc' : 'copper';
      const observation = settledCircuit() === 'open' ? rows[key] : [rows[key][0], '电路接通，铜片冒泡'];
      record(key, observation);
      bar.done(key);
      showConnection(observation.join('：') + '。');
    }
    let departure = null;
    let cancelling = false;
    function returnPath(i) {
      const from = S.pos[i].clone(), to = REST[i];
      const path = new THREE.CurvePath();
      const points = [from];
      if (i >= 2 && Math.min(from.x, to.x) < CX + R + 0.01 && Math.max(from.x, to.x) > CX - R - 0.01) {
        const above = Math.max(from.y, pin(0).y + 0.02, pin(1).y + 0.02);
        points.push(from.clone().setY(above), to.clone().setY(above));
      }
      points.push(to);
      for (let n = 1; n < points.length; n++) {
        if (!points[n].equals(points[n - 1])) path.add(new THREE.LineCurve3(points[n - 1], points[n]));
      }
      return path.curves.length ? path : null;
    }
    function zones(i) {
      if (i < 2) return [{
        name: '烧杯', position: lower(i).add(stripOffset), radius: 0.026,
        onDrop: () => immerse(i),
      }];
      const copper = {
        dock: 'copper', name: '铜片上端', position: () => pin(1), radius: 0.032,
        enabled: () => departure?.zone !== copper && S.wet[1] && S.ends[3 - i] !== 'copper',
        onDrop: () => { S.ends[i - 2] = 'copper'; showConnection(); },
      };
      if (i === 3) return [copper];
      const post = {
        dock: 'post', name: '黑接线柱', position: () => terminals[0].clone().add(jawOffset), radius: 0.029,
        enabled: () => departure?.zone !== post,
        onDrop: () => { S.ends[0] = 'post'; showConnection(); },
      };
      return [copper, post];
    }
    const hints = ['把锌片向下插入稀硫酸', '把铜片向下插入稀硫酸', '拖动黑夹，连接或断开导线', '把红夹夹到铜片上'];
    const drags = tools.map((obj, i) => ({
      obj,
      keepOffset: true,
      plane: 'xy',
      dropOffset: i < 2 ? stripOffset : jawOffset,
      dropzones: zones(i),
      hint: hints[i],
      onStart() {
        S.drag = i;
        S.returns[i] = null;
        const zone = i >= 2 && this.dropzones.find((z) => z.dock === S.ends[i - 2]);
        departure = zone ? { zone, distance: 0, idle: 0 } : null;
      },
      onDrag(p) {
        if (i < 2 && S.wet[i]) return;
        if (departure) {
          const distance = p.clone().add(jawOffset).distanceTo(departure.zone.position());
          if (S.ends[i - 2] !== 'free' && distance <= 0.004) return;
          S.ends[i - 2] = 'free';
          // 向外取夹时跟手；回拖或短暂停手后，原接点重新参与公共吸附。
          if (distance > departure.zone.radius || distance < departure.distance - 0.0001) departure = null;
          else if (distance > departure.distance) {
            departure.distance = distance;
            departure.idle = 0;
          }
        }
        if (i < 2) S.pos[i].y = clamp(p.y, lower(i).y, REST[i].y);
        else S.pos[i].set(p.x, clamp(p.y, 0.015, 0.18), 0);
        renderTools();
      },
      onEnd(moved, zone) {
        S.drag = -1;
        departure = null;
        if (!moved || zone) return;
        if (i < 2 && !cancelling && S.pos[i].y === lower(i).y) {
          immerse(i);
          return;
        }
        if (i >= 2 && S.ends[i - 2] !== 'free') return;
        const path = returnPath(i);
        S.returns[i] = path ? { path, elapsed: 0 } : null;
        if (i >= 2) showConnection('导线未接通。将导线夹对准接点，再松手。');
      },
    }));
    const inAcid = (p) => p.y < LEVEL && Math.hypot(p.x - CX, p.z) < R;
    function updateContact(bottoms) {
      contact.zinc = inAcid(bottoms[0]);
      contact.copper = inAcid(bottoms[1]);
      const top = pin(1);
      let blackEnd = 'free';
      if (jawTouchesTop(S.pos[2], top, 0.009)) blackEnd = 'copper';
      else if (jawTouchesTop(S.pos[2], blackPostTop, 0.0048)) blackEnd = 'post';
      const redEnd = jawTouchesTop(S.pos[3], top, 0.009) ? 'copper' : 'free';
      const mode = circuitMode(contact.zinc, contact.copper, blackEnd, redEnd);
      if (S.drag >= 0 && !S.demo && mode !== contact.circuit) {
        W.ui.status(mode === 'open' ? '导线未接通。' : '导线已接通。');
      }
      contact.circuit = mode;
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
      departure = null;
      drag.clearDropzones();
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
      if (departure && departure.distance > 0) {
        departure.idle += elapsed;
        if (departure.idle >= 0.09) departure = null;
      }
      drag.update(elapsed);
      S.returns.forEach((r, i) => {
        if (!r) return;
        r.elapsed += elapsed;
        const duration = Math.max(0.38, r.path.getLength() / 0.32);
        const t = clamp(r.elapsed / duration, 0, 1);
        S.pos[i].copy(r.path.getPoint(t));
        if (t === 1) S.returns[i] = null;
      });
      renderTools();
      const bottoms = [0, 1].map((i) => S.pos[i].clone().add(stripOffset));
      updateContact(bottoms);
      const mode = contact.circuit, connected = mode !== 'open';
      const dial = mode === 'meter' ? 0.48 : 0;
      S.needle += (dial - S.needle) * Math.min(1, elapsed * 14);
      meter.needle.rotation.z = 0.78 - 1.56 * S.needle;
      const emitter = connected ? 1 : 0;
      const bottom = bottoms[emitter];
      S.credit += contact.zinc ? elapsed * (connected ? 12 : 8) : 0;
      while (S.credit >= 1) {
        const n = ++S.emitted;
        S.gas.push({
          x: bottom.x + 0.006 * Math.sin(n * 7),
          y: bottom.y + Math.min(0.006 + (n % 4) * 0.003, (LEVEL - bottom.y) / 2),
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
      const stamp = connected ? '铜片冒泡' : contact.zinc ? '锌片冒泡' : '无气泡';
      const note = contact.copper && !connected ? '铜片未产生气泡' : '';
      card
        .text(
          '<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里</span><span class="cc-res">' +
            stamp +
            '</span></div>' +
            (note ? '<div class="cc-note">' + note + '</div>' : '') +
            '</div>',
        )
        .loc(group, innerWidth <= 760 ? -0.094 : CX + R + 0.024, innerWidth <= 760 ? 0.132 : 0.07, 0)
        .show((contact.zinc || contact.copper) && !mic.isOpen && !bar.playing);
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
          if (!bar.finished || contact.circuit !== 'open' || S.needle > 0.01 || W.next.hidden) throw Error('断路或观察记录异常');
        },
      },
    ]);
    return {
      group: root,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.34, d: 0.18, h: 0.14 },
      view: { elev: 24, azim: 0, lookY: 0.42, frameMargin: 1.08 },
      pointer: wrapPointer({
        ...drag,
        up(ray, event) {
          departure = null;
          cancelling = event?.type === 'pointercancel';
          const handled = drag.up(ray, event);
          cancelling = false;
          return handled;
        },
      }, bar),
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
            '依据课本第 36 页图6-6、图6-7。指针偏角和气泡速率为示意。气泡突出显示主要析氢位置。粒子图只追踪一组反应，导线长度和电子运动时间经过缩放。',
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
