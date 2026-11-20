import * as THREE from 'three';
import { FM } from './kit/forcemeter.js';
import { frictionTrial, pullTo, STATIC_MU } from './kit/staticFriction.js';
import { AXIS, BOARD, BLOCK, RING, vec, staticFrictionRig } from './kit/staticFrictionRig.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, chart, table } from './kit/ui.js';

export default {
  id: 'staticfriction',
  fig: '图3.2-4',
  title: '测量最大静摩擦力',
  stampText: '测量',
  predict: {
    q: '水平拉木块，什么时候测力计的示数能告诉你最大静摩擦力？',
    options: ['木块还没动，轻轻拉时', '木块即将开始运动时', '木块已经滑动后'],
    answer: 1,
  },
  conclusion: {
    crops: [
      { page: 69, rect: [57.77, 505.08, 384.7, 631.19] },
      { page: 70, rect: [216.48, 369.33, 531.52, 477.16] },
    ],
    quote: '由于这时相互接触的两个物体之间只有相对运动的趋势，而没有相对运动，所以这时的摩擦力叫作静摩擦力（static frictional force）。静摩擦力的方向总是跟物体相对运动趋势的方向相反。只要沙发与地面间没有产生相对运动，静摩擦力的大小就随着推力的增大而增大，并与推力保持大小相等。……静摩擦力的增大有一个限度。图3.2-5中木块所受静摩擦力的最大值Fmax在数值上等于物体即将开始运动时的拉力。两物体之间实际产生的静摩擦力F在0与最大静摩擦力Fmax之间，即0 < F ≤ Fmax',
    why: '木块静止时，静摩擦力与水平拉力大小相等、方向相反。木块即将运动时，静摩擦力达到最大。小纸团留下了这一刻的指针位置。',
    src: '课本第 65–66 页 · 第三章 第2节 摩擦力',
  },
  create(ctx) {
    const rig = staticFrictionRig();
    const { group, grip, paper, paperPick, blockPick, meter, face, home, seat } = rig;
    const trace = [];
    const graph = chart({
      x: { label: 't / s', min: 0, max: 2 }, y: { label: 'F / N', min: 0, max: 5, ticks: [0, 1, 2, 3, 4, 5] },
      series: [{ points: trace, color: '#b24430' }], height: 130,
    });
    const rows = table(['木块', '观察记录']);
    const caption = h('p', { class: 'note' }, '本次拉动的拉力随时间变化（模型）');
    const record = h('div', {}, caption, graph.el);
    let ui, s, inserted, held, unload, near, returnDrag, draggingBlock, blockStart, target;
    let retry, reading, t, nextDraw, aim, onset, release;
    graph.extra = (c, X, Y) => {
      for (const mark of [onset, release]) {
        if (!mark) continue;
        const [time, force, label] = mark;
        c.fillStyle = label === '刚动' ? '#8c392a' : '#485c66';
        c.beginPath(); c.arc(X(time), Y(force), 5, 0, 2 * Math.PI); c.fill();
        c.font = '22px sans-serif';
        c.textAlign = label === '刚动' ? 'right' : 'left';
        c.fillText(label, X(time) + (label === '刚动' ? -6 : 6), Y(force) - 8);
      }
    };
    const steps = [
      ['light', '轻拉木块', '向右轻拉提环。红针偏离零刻度、木块仍贴着起线时松手。'],
      ['paper', '塞小纸团', '把小纸团拖到红针靠木块的一侧，让它记下红针到过的最远位置。'],
      ['pull', '拉到刚动', '向右慢慢拉提环，直到木块离开起线。留意它刚动时红针的变化。'],
      ['read', '读最大拉力', '点测力计看全尺，用纸团留下的位置读出最大静摩擦力。'],
    ];
    const boardSurface = new THREE.Group();
    boardSurface.position.y = BOARD;
    group.add(boardSurface);
    const bar = lessonBar({ ...ctx, group: boardSurface, back: leave, steps: steps.map(([id, title, todo]) => ({ id, title, todo, target: () => aim })) });
    const status = (text) => ui?.status(text);
    const field = h('input', { type: 'number', step: 'any', inputmode: 'decimal', 'aria-label': '纸团读数（N）' });
    field.style.cssText = 'width:5em;padding:5px 8px;font-size:16px';
    const form = h('form', { onsubmit(e) { e.preventDefault(); read(); } },
      h('label', {}, '纸团读数 ', field, ' N　'), h('button', { class: 'go ghost', type: 'submit' }, '记下读数'));
    const help = '每小格 0.2 N。找纸团朝零刻度的一边，读到最近的一条刻线。';
    function guide() {
      aim = null;
      if (retry) { aim = unload || draggingBlock || returnDrag ? null : rig.block; bar.say('把木块向左拖回起线，重新轻拉。'); }
      else if (near) bar.say(help);
      else if (bar.finished) bar.say('纸团记下了木块刚动前的最大拉力，可以掀开课本结论了。');
      else if (held || unload || returnDrag) bar.say(held && s.slipped ? '木块已离开起线。看红针和纸团怎样分开，再松手。' : '');
      else {
        aim = { light: meter.ring, paper, pull: meter.ring, read: paper }[bar.current];
        bar.say('');
      }
    }
    function leave() {
      if (near) ctx.back();
      near = false; form.hidden = true; bar.near(false); guide();
    }
    function inspect() {
      near = true; bar.near(true); form.hidden = false;
      const narrow = ctx.camera.aspect < 1;
      ctx.look([meter.position.x - (narrow ? 0.077 : 0.112), AXIS + 0.005, 0], [0, 1, 0.012], narrow ? 0.44 : 0.34, leave);
      guide();
    }
    function read() {
      if (!near) return;
      const value = field.valueAsNumber, tick = Math.round(s.peak * 5) / 5;
      if (!Number.isFinite(value) || value < 0 || value > FM.MAX) return status('这把测力计的量程是 0～5 N。');
      if (Math.abs(tick - value) > 0.001) {
        status(value === 0 ? '你读到的是松手后的红针。纸团仍停在刚才的最高读数处。'
          : '读数偏' + (value > tick ? '大' : '小') + '了。看纸团右边缘，每两个整数刻度之间有五小格。');
        return;
      }
      reading = value;
      rows.add(['刚要动', '最大静摩擦力约 ' + value.toFixed(1) + ' N']);
      bar.done('read'); leave();
      status('木块刚要动时，静摩擦力达到最大，约为 ' + value.toFixed(1) + ' N。');
    }
    function newTrace() {
      onset = release = null; trace.length = 0; trace.push([0, 0]);
      t = nextDraw = 0; graph.x.max = 2; graph.draw(); record.hidden = false;
    }
    function sample(dt, last) {
      t += dt;
      const previous = trace[trace.length - 1], older = trace[trace.length - 2];
      if (older && older[1] === previous[1] && previous[1] === s.tension) previous[0] = t;
      else trace.push([t, s.tension]);
      // 长时间反复拉同一轮时，每组保留最大值和最小值，峰值始终留在记录里。
      if (trace.length > 1800) {
        const compact = [trace[0]];
        for (let i = 1; i < trace.length - 1; i += 4) {
          const batch = trace.slice(i, Math.min(i + 4, trace.length - 1)).sort((a, b) => a[1] - b[1]);
          compact.push(...[batch[0], batch[batch.length - 1]].sort((a, b) => a[0] - b[0]));
        }
        trace.splice(0, trace.length - 1, ...compact);
      }
      if (t >= nextDraw || last) { nextDraw = t + 0.08; graph.x.max = Math.max(2, Math.ceil(t)); graph.draw(); }
    }
    function draw() { rig.draw(s, inserted ? s.peak : null); }
    function returnTo(obj, origin) { returnDrag = { obj, from: obj.position.clone(), origin, elapsed: 0 }; }
    function rewind() {
      s = frictionTrial(); held = unload = retry = draggingBlock = false; target = 0;
      inserted = false; paper.position.copy(home); draw();
      if (bar.has('light')) bar.undo('paper', 'pull', 'read');
      onset = release = null; trace.length = 0; record.hidden = true; graph.draw();
      status('木块已回到起线。'); guide();
    }
    function reset() {
      if (near) leave();
      reading = null; returnDrag = null; field.value = ''; form.hidden = true; rows.clear();
      bar.undo(...steps.map(([id]) => id)); rewind(); ui?.relock(); status(''); guide();
    }
    function endPull() {
      if (s.tension > 0.2) release = [t, s.tension, '松手'];
      held = false; unload = s.handle > s.x || s.v > 0;
      if (s.slipped && (!inserted || s.peak > STATIC_MU * s.mass * 9.8 + 0.14)) {
        retry = true;
        status(inserted ? '这一下拉得太快。木块已经滑动，纸团还被往前推，这次峰值不能用。'
          : '木块越过了起线。这次拉得太远，看不到它保持静止时的情形。');
      } else if (!s.slipped && s.peak >= 0.2 && bar.current === 'light') {
        rows.add(['静止', '红针偏转，木块仍在起线']);
        bar.done('light'); status('木块没动，红针却偏了。静摩擦力与向右的拉力等大，方向向左。');
      } else if (s.slipped) {
        bar.done('pull'); status('木块一动，拉力就变小了。红针退回，纸团留在最远处。');
      } else if (s.peak > 0 && inserted) status('木块还在起线，纸团只记下了木块静止时的拉力。再拉远一些。');
      guide();
    }
    // 纸团从木板升到指针所在的高度。沿连接两个落点的斜面拾取，两端都在鼠标下面。
    let handRay, paperOffset;
    const travelPlane = new THREE.Plane();
    function paperAtHand() {
      const dest = seat(), pos = new THREE.Vector3();
      travelPlane.setFromCoplanarPoints(home, home.clone().add(vec(1, 0, 0)), dest);
      const ray = handRay.ray.clone().applyMatrix4(group.matrixWorld.clone().invert());
      if (!ray.intersectPlane(travelPlane, pos)) return paper.position.clone();
      const y = clamp(pos.y, home.y, dest.y);
      if (pos.y !== y) ray.intersectPlane(travelPlane.set(vec(0, 1, 0), -y), pos);
      return pos;
    }
    const tip = (text) => () => ui?.step === 1 ? text : '';
    const canRead = () => bar.current === 'read' && !unload && !near;
    const pointer = draggable(group, [
      { obj: grip, anchor: meter, keepOffset: true, plane: 'xz', offset: AXIS,
        enabled: () => !retry && !unload && (bar.current === 'light' || bar.current === 'pull'),
        hint: tip('向右拖：水平拉木块'),
        onStart() { held = true; target = s.handle; status(''); newTrace(); guide(); },
        onDrag(p) { target = clamp(p.x - RING, 0, 0.118); },
        onEnd() { advance(1 / 480); endPull(); },
      },
      { obj: paperPick, anchor: paper, keepOffset: true, plane: 'xz', offset: AXIS + 0.008,
        enabled: () => (bar.current === 'paper' && !unload && !returnDrag) || canRead(),
        hint: () => ui?.step === 1 ? (inserted ? '点一下：近看全尺' : '拖纸团：塞到红针旁') : '',
        onTap() { if (canRead()) inspect(); },
        onStart() { paperOffset = handRay ? paper.position.clone().sub(paperAtHand()) : null; },
        onDrag(p) {
          if (inserted) return;
          if (handRay && paperOffset) paper.position.copy(paperAtHand().add(paperOffset));
          else paper.position.copy(p);
        },
        onEnd(moved) {
          if (inserted || !moved) return;
          if (paper.position.distanceTo(seat()) > 0.013) {
            returnTo(paper, home); status('纸团没贴到红针，指针推不到它。'); guide(); return;
          }
          inserted = true; s.peak = 0; draw(); bar.done('paper');
          status('纸团贴住红针了。红针能推它前进，退回时会和它分开。'); guide();
        },
      },
      { obj: blockPick, anchor: rig.block, keepOffset: true, plane: 'xz', offset: BOARD + 0.025,
        enabled: () => retry && !unload && !returnDrag, hint: tip('向左拖：木块归位'),
        onStart() { draggingBlock = true; blockStart = s.x; guide(); },
        onDrag(p) { s.handle = s.x = clamp(p.x - BLOCK, 0, blockStart); draw(); },
        onEnd() {
          draggingBlock = false;
          if (s.x < 0.004) {
            if (inserted) returnTo(paper, home);
            rewind();
            if (returnDrag) paper.position.copy(returnDrag.from);
          } else { returnTo(rig.block, vec(BLOCK + blockStart, BOARD, 0)); guide(); }
        },
      },
    ], { tip: ctx.tag('', 'pill'), taps: [
      { obj: face, enabled: canRead, hint: tip('点一下：近看全尺'), onTap: inspect },
    ] });
    function advance(dt) {
      const before = s.slipped;
      pullTo(s, held ? target : Math.max(s.x, s.handle - dt * 0.25), dt);
      draw();
      if (!before && s.slipped && held) {
        onset = [t + s.onsetTime, s.onsetForce, '刚动'];
        trace.push(onset.slice(0, 2)); guide();
      }
      if (unload && Math.abs(s.handle - s.x) < 0.00005 && !s.v) {
        s.handle = s.x; s.tension = 0; unload = false; draw(); sample(dt, true); guide();
      } else sample(dt, false);
    }
    reset();
    const enterRead = (value) => { field.value = String(value); form.querySelector('button').click(); };
    return {
      group: new THREE.Group().add(group), size: { w: 0.52, d: 0.19, h: 0.08 },
      view: { azim: -5, elev: 45, frameMargin: 1.01 }, toggles: ['steps'], reset,
      pointer: {
        items: () => pointer.items().filter(d => d.enabled()),
        down(ray, e) { if (ui?.step === 2) return false; handRay = ray; const hit = pointer.down(ray, e); if (hit && ui?.step === 0) ui.go(1); return hit; },
        move(ray, e) { handRay = ray; return ui?.step === 1 && pointer.move(ray, e); },
        up(ray, e) { handRay = null; return pointer.up(ray, e); },
      },
      mount(panel) {
        ui = panel; bar.attach({ need() {}, unlock() { panel.unlock(); panel.need(''); } });
        panel.controls.append(form); panel.data.append(record, rows.el);
        panel.notes.append(h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        const src = panel.el.querySelector('.answer .src');
        src.style.minHeight = '54px'; src.style.paddingRight = '76px';
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (held || unload) advance(dt);
        if (returnDrag) {
          const r = returnDrag; r.elapsed += dt;
          const k = Math.min(1, r.elapsed / 0.4);
          r.obj.position.lerpVectors(r.from, r.origin, k * (2 - k));
          if (r.obj === rig.block) { s.x = s.handle = rig.block.position.x - BLOCK; draw(); }
          if (k === 1) { returnDrag = null; guide(); }
        }
      },
      dispose() { pointer.dispose(); bar.dispose(); },
      debug: { bar, qa: qaFlow(pointer, [
        { name: '轻拉但木块不动', drag: grip, to: vec(RING + 0.032, AXIS, 0) },
        { name: '纸团放偏', drag: paperPick, to: vec(home.x - 0.045, home.y, home.z) },
        { name: '纸团退回原处', run() { if (inserted || !paper.position.equals(home)) throw Error('错放未归位'); } },
        { name: '塞到指针下', drag: paperPick, to: () => seat() },
        { name: '尚未拉动便松手', drag: grip, to: vec(RING + 0.043, AXIS, 0) },
        { name: '缓拉至木块起动', drag: grip, to: vec(RING + 0.0719, AXIS, 0) },
        { name: '对照回零指针和纸团', tap: paperPick },
        { name: '误读回零指针', run() { enterRead(0); if (!near || bar.finished) throw Error('误读通过'); } },
        { name: '记录纸团所在刻度', run() { enterRead(Math.round(s.peak * 5) / 5); } },
        { name: '掀开课本原文', run() {
          if (!bar.finished || rows.rows.length !== 2 || reading < 2.8 || reading > 3.2 || !s.slipped || s.tension || s.x <= 0) throw Error('缺少测量记录或木块未起动');
          ui.go(2); ui.el.querySelector('.flap-front').click();
        } },
      ]) },
    };
  },
};
