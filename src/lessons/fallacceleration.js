// 必修一图 2.4-2：同一计时器、同一把尺，改变实际下落重物的质量。
import * as THREE from 'three';
import { fallingRig, X, BASE, LEAD, TRAVEL, L, WIDTH, ZERO, LANE, RULER_Z } from './kit/ticker/fallRig.js';
import { fallingTape } from './kit/ticker/fall.js';
import { fallQuartets, compareIntervals, STRIDE } from './kit/ticker/fallAcceleration.js';
import { PERIOD } from './kit/ticker/motion.js';
import { paint } from '../live/ink.js';
import { textPlate } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { chart, h, note, table } from './kit/ui.js';

const DRAG = 0.015,
  T = STRIDE * PERIOD;
export default {
  id: 'fallacceleration',
  fig: '图2.4-2',
  title: '用纸带研究自由落体运动',
  stampText: '测量',
  predict: {
    q: '重物从静止开始下落，它的加速度会越来越大吗？',
    options: ['越来越大', '基本不变', '越来越小'],
    answer: 1,
    hint: '用纸带测一测，再换一个更重的重物比较。',
  },
  conclusion: {
    page: 53, rect: [57.78, 98.12, 378.84, 182.5],
    quote: '对不同物体进行的实验结果表明，在同一地点，一切物体自由下落的加速度都相同，这个加速度叫作自由落体加速度（free-fall acceleration），也叫作重力加速度（gravitational acceleration），通常用g表示。',
    why: '两条纸带测出的速度都随时间近似均匀地增加。换了质量，测得的加速度仍接近。纸带有阻力，测量近似反映自由落体运动。',
    src: '课本第 49 页 · 第二章 第4节 自由落体运动',
  },
  create(ctx) {
    const rig = fallingRig({ mass: 150, powerSwitch: true, onPage: true });
    const { group, head, showPower, switchPick, jaw, weight, tape, tex, ink, ruler, massPlate, vertical, flat } = rig;
    const ledge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 48), paint(0xaa8450));
    ledge.position.y = -0.037;
    weight.add(ledge);
    const ring = new THREE.Group();
    const ringMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0.0216, -0.007],
          [0.029, -0.007],
          [0.029, 0.007],
          [0.0216, 0.007],
          [0.0216, -0.007],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        48,
      ),
      paint(0x9c865d),
    );
    ring.add(ringMesh);
    const ringLabel = textPlate('+100 g', { w: 0.04, h: 0.014, font: 'bold 150px sans-serif', bg: '#e8c58d' });
    ringLabel.position.set(0, 0, 0.0292);
    ring.add(ringLabel);
    group.add(ring);
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const rack = v(-0.13, 0.008, 0);
    const rest = v(X, BASE - TRAVEL, 0);
    const top = v(X, BASE, 0);
    const hanging = v(X, rest.y + L / 2, 0);
    const laid = v(ZERO - LEAD + L / 2, 0.004, LANE);
    const seat = () => v(X, weight.position.y - 0.028, 0);
    const root = new THREE.Group();
    root.add(group);

    function pick(parent, w, height, depth, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, depth), new THREE.MeshBasicMaterial({ visible: false }));
      mesh.userData.pick = true;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    const clipPick = pick(jaw, 0.054, 0.03, 0.025, 0.019, 0, 0);
    const weightPick = pick(weight, 0.055, 0.042, 0.05, 0, -0.028, 0);
    const ringPick = pick(ring, 0.061, 0.023, 0.058, 0, 0, 0);
    // 拿住纸带中央，它从竖直面移到前方的尺边。纸带中心走的平面包含两处实物位置。
    const tapePick = pick(tape, 0.10, WIDTH * 1.3, 0.006, 0, 0, 0);
    const tapePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(v(0, LANE, hanging.y - laid.y).normalize(), hanging);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(L + 0.006, WIDTH + 0.006), new THREE.MeshBasicMaterial({ color: 0xd6c9ac }));
    slot.rotation.x = -Math.PI / 2;
    slot.position.copy(laid).y = 0.0004;
    group.add(slot);

    // 在尺身两端留白，零刻线和纸带的打点原点在同一个局部坐标。
    const rulerMap = ruler.material[2].map, cv = rulerMap.image;
    ruler.scale.x = 0.35 / ruler.geometry.parameters.width;
    ruler.position.x = ZERO + 0.165;
    const pen = cv.getContext('2d');
    pen.fillStyle = '#f4eddb';
    pen.fillRect(0, 0, cv.width, cv.height);
    pen.fillStyle = '#283139';
    pen.textAlign = 'center';
    pen.font = '600 54px sans-serif';
    for (let mm = 0; mm <= 330; mm++) {
      const x = (10 + mm) / 350 * cv.width;
      pen.fillRect(x - 0.9, 0, 1.8, cv.height * (mm % 10 === 0 ? 0.43 : mm % 5 === 0 ? 0.31 : 0.2));
      if (mm % 10 === 0) pen.fillText(String(mm), x, cv.height * 0.68);
    }
    pen.fillText('mm', cv.width * 0.96, cv.height * 0.93);
    rulerMap.needsUpdate = true;

    const phases = [['drop', '打出第一条纸带'], ['read', '测下落加速度'], ['change', '换重物再打点'], ['compare', '比较两次测量']];
    let ui, target, phase, run, on = false, added = false, near = false, released, powerAt;
    let start = null, restStamp = false, returning = null, dragRay, tapeOffset;
    const sets = [[], []];
    const index = () => Number(added);
    const values = () => sets[index()];
    const mass = () => added ? 250 : 150;
    const pointMM = k => run.marks[start + k * STRIDE].x * 1000;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: phases.map(([id, title]) => ({ id, title, todo: title, target: () => target })) });
    const rows = table(['重物', 'P₀', 'P₁', 'P₂', 'P₃']);
    const series = ['#27636c', '#a15338'].map((color, i) => ({ points: [], dots: true, color, dash: !!i }));
    const graph = chart({ x: { label: 't / s', min: 0, max: 0.18, ticks: [0, 0.03, 0.09, 0.15] },
      y: { label: 'v / (m/s)', min: 0, max: 2.5, ticks: [0, 1, 2] }, series, height: 135 });
    const formula = h('div', { style: 'font-size:14px;line-height:1.55;font-variant-numeric:tabular-nums' });
    const field = h('input', { type: 'number', inputmode: 'decimal', step: 'any', required: true, style: 'width:6em;margin:0 8px;padding:4px' });
    const label = h('span');
    const reread = h('button', { class: 'go ghost', hidden: true, onclick: rereadTape }, '重读这条纸带');
    const submit = h('button', { type: 'submit', class: 'go', style: 'width:auto;margin:0' }, '记下');
    const form = h('form', { hidden: true, onsubmit(e) { e.preventDefault(); read(field.valueAsNumber); } }, h('label', {}, label, field), submit);
    function recordSheet() {
      reread.hidden = phase !== 'bench' || values().length !== 4;
      rows.clear();
      formula.replaceChildren();
      sets.forEach((positions, i) => {
        const { steps, estimates } = compareIntervals(positions);
        const g = i ? 250 : 150;
        series[i].points = steps.map((s, k) => [(k + 0.5) * T, s / (1000 * T)]);
        if (!positions.length) return;
        rows.add([g + ' g', ...Array.from({ length: 4 }, (_, k) => positions[k] === undefined ? '—' : String(positions[k]))]);
        if (positions.length === 4) {
          const a = (estimates[0] + estimates[1]) / 2;
          formula.append(h('p', {}, h('b', {}, g + ' g'), '　等时位移 ' + steps.map(s => +s.toFixed(1)).join('、') + ' mm', h('br'),
            'a = (s₃ − s₁)/(2T²) ≈ (' + (+steps[2].toFixed(1)) + ' − ' + (+steps[0].toFixed(1)) + ') × 10⁻³ / (2 × 0.06²) ≈ ' + a.toFixed(2) + ' m/s²'));
        }
      });
      graph.draw();
    }
    function guide(text, obj = null) { target = obj; bar.say(text); }
    function next() {
      if (phase === 'ready') {
        if (sets[0].length === 4 && !added) return guide('把 100 g 配重拖到重物上，用同一高度再测一次。', ringPick);
        return on ? guide('绿灯亮了。点上端夹子松开纸带，让重物从静止下落。', clipPick)
          : guide('点计时器上的开关。绿灯亮起后再松手，才能记下下落过程。', switchPick);
      }
      if (phase === 'fall') return guide(on ? '重物拉着纸带下落，计时器每隔 0.02 s 打一个点。' : '计时器没通电，纸带经过时没有留下点。');
      if (phase === 'landed') {
        if (on) return guide('重物已落到垫上。现在关掉计时器，结束打点。', switchPick);
        return guide((run.marks.length ? '打点结束。' : '纸带上没有下落的点迹。') + '把纸带中段拖到尺边的浅色槽里。', tapePick);
      }
      if (start === null) return guide((run.marks.length ? '连续的点太少，量不出三段位移。' : '这条纸带没有下落记录。') + '向上拖回重物换新带，先通电再松手。', weightPick);
      if (values().length === 4) {
        if (added) return guide('两次的速度图线斜率接近：重物变重，下落加速度仍基本相同。可以掀开结论了。');
        return guide('三个速度点接近一条直线，下落加速度基本不变。向上拖回重物，准备换质量。', weightPick);
      }
      if (near) return guide('读 P' + values().length + ' 指线对着的毫米刻度，估读到 0.1 mm。');
      guide('每隔三个打点间隔取一点。点纸带近看，读出四个位置，比较三个 0.06 s 内的位移。', tape);
    }
    function draw() {
      const { width: w, height: h } = tex.canvas;
      const px = m => (LEAD + m) / L * w;
      ink.fillStyle = '#fff9e9';
      ink.fillRect(0, 0, w, h);
      const dot = x => { ink.beginPath(); ink.arc(px(x), h * 0.50, 6, 0, 2 * Math.PI); ink.fill(); };
      ink.fillStyle = '#39352d';
      if (restStamp) dot(0);
      run.marks.forEach(m => dot(m.x));
      if (start !== null) for (let k = 0; k < 4; k++) {
        const x = px(pointMM(k) / 1000);
        ink.fillStyle = k === values().length ? '#a15338' : '#27636c';
        ink.textAlign = 'center';
        ink.font = 'bold 64px sans-serif';
        ink.fillText('P' + k, x, 76);
        ink.fillRect(x - 1.1, h * 0.56, 2.2, h * 0.44);
      }
      tex.needsUpdate = true;
    }
    function placeRing() {
      ring.position.copy(added ? seat() : rack);
      massPlate.visible = !added;
      ringLabel.visible = !added;
      totalLabel.visible = added;
    }
    const totalLabel = textPlate('250 g', { w: 0.044, h: 0.017, bg: '#e8c58d', font: 'bold 175px sans-serif' });
    totalLabel.position.set(0, 0, 0.03);
    ring.add(totalLabel);
    function fresh() {
      reread.hidden = true;
      phase = 'ready'; start = null; restStamp = false;
      run = fallingTape(mass() / 1000, DRAG, TRAVEL);
      weight.position.copy(top);
      placeRing();
      tape.position.set(X, BASE + L / 2, 0);
      tape.quaternion.copy(vertical);
      jaw.rotation.y = 0;
      draw(); next();
    }
    function switchPower() {
      on = !on;
      const t = performance.now() / 1000;
      if (on) powerAt = t;
      if (on && phase === 'ready') { restStamp = true; draw(); }
      if (phase === 'fall') run.power(on, t - released);
      showPower(on); next();
    }
    function release() {
      released = performance.now() / 1000;
      if (on) run.power(true, powerAt - released);
      phase = 'fall';
      jaw.rotation.y = -0.85;
      next();
    }
    function setTape(p) {
      tape.position.copy(p);
      const u = clamp((p.y - laid.y) / (hanging.y - laid.y), 0, 1);
      tape.rotation.set(-Math.PI / 2 * (1 - u), 0, Math.asin(u), 'ZXY');
    }
    function rayPoint() {
      if (!dragRay) return null;
      const world = dragRay.ray.intersectPlane(tapePlane.clone().applyMatrix4(group.matrixWorld), v(0, 0, 0));
      return world && group.worldToLocal(world);
    }
    function putBack(obj, dest, feedback) {
      returning = { obj, from: obj.position.clone(), dest, elapsed: 0 };
      guide(feedback, obj === tape ? tapePick : obj === ring ? ringPick : weightPick);
    }
    function inspect() {
      near = true; bar.near(true); form.hidden = false; field.value = '';
      label.textContent = 'P' + values().length + ' 的位置 / mm';
      const center = clamp(pointMM(values().length) / 1000, 0.024, 0.302);
      ctx.look([ZERO + center, 0.004, (LANE + RULER_Z) / 2], [0, 1, 0.012], 0.185, leave);
      next();
    }
    function leave() {
      near = false; form.hidden = true; bar.near(false); ctx.back(); next();
    }
    function rereadTape() {
      if (phase !== 'bench' || values().length !== 4) return;
      values().length = 0;
      bar.undo(added ? 'compare' : 'read');
      if (added) ui.relock({ full: false });
      recordSheet(); draw(); inspect();
    }
    function read(value) {
      if (!near || !Number.isFinite(value)) return;
      const k = values().length, diff = value - pointMM(k);
      if (Math.abs(diff) > 0.3) {
        guide('读数偏' + (diff > 0 ? '大' : '小') + '。从 P' + k + ' 左侧的整十刻线数起，每小格是 1 mm。');
        field.select(); return;
      }
      values().push(Math.round(value * 10) / 10);
      draw(); recordSheet();
      if (k === 3) { bar.done(added ? 'compare' : 'read'); leave(); }
      else { inspect(); guide('已记下 P' + k + '。读 P' + (k + 1) + ' 指线对着的毫米刻度。'); }
    }
    const waitingMass = () => !added && sets[0].length === 4 && phase === 'ready';
    const available = () => !near && !returning;
    const tapeDrag = {
      obj: tapePick, anchor: tape, plane: 'xy', keepOffset: true,
      enabled: () => available() && phase === 'landed' && !on,
      hint: '拖中段：把纸带放到尺边',
      onStart() { const p = rayPoint(); tapeOffset = p && tape.position.clone().sub(p); },
      onDrag(p) {
        const hit = rayPoint();
        const q = hit && tapeOffset ? hit.add(tapeOffset) : p.clone();
        q.y = clamp(q.y, laid.y, hanging.y);
        q.z = LANE * (hanging.y - q.y) / (hanging.y - laid.y);
        q.x = clamp(q.x, -0.23, 0.23);
        setTape(q);
      },
      onEnd(moved) {
        if (!moved) return;
        if (tape.position.distanceTo(laid) > 0.033) return putBack(tape, hanging, '纸带还没放平。抓住中段，放在尺边浅色槽的中央。');
        setTape(laid); tape.quaternion.copy(flat);
        phase = 'bench';
        const starts = fallQuartets(run.marks);
        start = starts.length ? starts[starts.length - 1] : null;
        if (start !== null) bar.done(added ? 'change' : 'drop');
        draw(); next();
      },
    };
    const lift = {
      obj: weightPick, anchor: weight, plane: 'xy', keepOffset: true,
      enabled: () => available() && phase === 'bench' && (start === null || (!added && values().length === 4)),
      hint: '向上拖：提回重物换纸带',
      onDrag(p) { weight.position.y = clamp(p.y, rest.y, BASE); placeRing(); },
      onEnd(moved) {
        if (!moved) return;
        if (weight.position.y < BASE - 0.022) return putBack(weight, rest, '重物还没提到计时器下方。再向上提到原来的高度。');
        fresh();
      },
    };
    const change = {
      obj: ringPick, anchor: ring, plane: 'xy', keepOffset: true,
      enabled: () => available() && !on && !added && phase === 'ready',
      hint: '拖配重：套到重物上',
      onDrag(p) { ring.position.set(clamp(p.x, -0.26, 0.25), clamp(p.y, rack.y, BASE + 0.06), 0); },
      onEnd(moved) {
        if (!moved) return;
        if (!waitingMass()) return putBack(ring, rack, '先测原来 150 g 的重物，留下比较的依据。');
        if (ring.position.distanceTo(seat()) > 0.033) return putBack(ring, rack, '配重没套上。把配重的孔对准重物再松手。');
        added = true; fresh();
        guide('总质量变为 250 g。接通电源，从相同高度再打一次纸带。', switchPick);
      },
    };
    const pointer = draggable(group, [tapeDrag, lift, change], { tip: ctx.tag('', 'pill'), taps: [
      { obj: switchPick, enabled: () => available() && !waitingMass() && (phase === 'ready' || phase === 'fall' || on),
        hint: () => on ? '点一下：断开电源' : '点一下：接通电源', onTap: switchPower },
      { obj: clipPick, enabled: () => available() && phase === 'ready' && !waitingMass(), hint: '点夹子：释放纸带', onTap: release },
      { obj: tape, enabled: () => available() && phase === 'bench' && start !== null && values().length < 4,
        hint: '点纸带：凑近读尺', onTap: inspect },
    ] });
    function reset() {
      if (near) leave();
      added = on = false; returning = null; tapeOffset = dragRay = null;
      sets.forEach(s => { s.length = 0; });
      bar.undo(...phases.map(([id]) => id)); bar.near(false);
      field.value = ''; form.hidden = true;
      fresh(); recordSheet(); showPower(false); ui?.relock();
    }
    // 手机上把步骤栏放在笔记本下方，给竖直装置留出完整的上半屏。
    const mobileLayout = h('style', {}, `
      @media (max-width:760px) {
        body:not(.predicting):not(.hide-steps) #panel.fall-sheet {
          height:calc(52vh - var(--fall-steps, 76px)); bottom:calc(8px + var(--fall-steps, 76px));
        }
        body.lesson-on .lbar[data-fall-steps] { bottom:6px; }
      }
    `);
    const stepBar = document.querySelector('.lbar');
    const fitSteps = new ResizeObserver(() => {
      if (ui) ui.el.style.setProperty('--fall-steps', (stepBar.offsetHeight + 8) + 'px');
    });
    fresh();
    const qaRead = (k, wrong = false) => ({ name: wrong ? '错读后检查反馈' : '记录 P' + k, run() {
      if (!near || values().length !== k) throw Error('没有进入当前点的读数');
      field.value = String(Math.round(pointMM(k) * 10) / 10 + (wrong ? 10 : 0)); submit.click();
      if (values().length !== (wrong ? k : k + 1)) throw Error('读数记录有误');
    } });
    const lay = { name: '把纸带铺到尺边', drag: tapePick, to: laid };
    const raise = { name: '提起重物换新带', drag: weightPick, to: top };
    const power = { name: '操作电源开关', tap: switchPick };
    const drop = { name: '松开纸带', tap: clipPick };
    const measure = [power, drop, power, lay, { name: '观察纸带和刻度', tap: tape }];
    return {
      group: root, reset, size: { w: 0.57, d: 0.38, h: 0.71 }, view: { elev: 16, azim: 4, get frameMargin() { return innerWidth <= 760 ? 1.25 : 1.06; } }, toggles: ['steps'],
      pointer: {
        items: () => pointer.items().filter(item => item.enabled()),
        down(ray, e) { dragRay = ray; const held = pointer.down(ray, e); if (held && ui?.step === 0) ui.go(1); return held; },
        move(ray, e) { if (ui?.step !== 1) return false; dragRay = ray; return pointer.move(ray, e); },
        up(ray, e) { dragRay = null; return pointer.up(ray, e); },
      },
      mount(panel) {
        ui = panel;
        ui.el.classList.add('fall-sheet'); stepBar.dataset.fallSteps = '';
        ui.el.append(mobileLayout); fitSteps.observe(stepBar);
        bar.attach({ need: () => ui.need(''), unlock() { ui.unlock(); ui.need(''); } });
        ui.controls.append(form);
        ui.data.append(note('位置 / mm　　相邻计数点间隔 T = 0.06 s'), rows.el, graph.el,
          note('速度图　蓝实线 150 g，棕虚线 250 g。以 P₀ 为计时起点，向下为正。每段位移除以 T 得平均速度，标在该段中间时刻。'), formula);
        ui.notes.append(reread, note('上端夹子代替手捏纸带。模型取 g = 9.8 m/s²，纸带阻力取 0.015 N。'),
          h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        const source = ui.el.querySelector('.answer .src');
        source.style.cssText = 'padding-right:82px;min-height:52px';
        recordSheet(); next();
      },
      update(dt) {
        bar.update(dt);
        const t = performance.now() / 1000;
        head.update(on, on ? t - powerAt : 0);
        if (returning) {
          const r = returning;
          r.elapsed += dt;
          const u = Math.min(1, r.elapsed / 0.4);
          const p = r.from.clone().lerp(r.dest, u * (2 - u));
          if (r.obj === tape) setTape(p);
          else { r.obj.position.copy(p); if (r.obj === weight) placeRing(); }
          if (u === 1) returning = null;
        }
        if (phase !== 'fall') return;
        const elapsed = t - released, count = run.marks.length;
        run.advance(elapsed);
        weight.position.y = BASE - run.position(elapsed);
        placeRing(); tape.position.y = weight.position.y + L / 2;
        if (count !== run.marks.length) draw();
        if (elapsed >= run.end) { phase = 'landed'; next(); }
      },
      dispose() {
        fitSteps.disconnect(); mobileLayout.remove();
        ui?.el.classList.remove('fall-sheet'); ui?.el.style.removeProperty('--fall-steps');
        pointer.dispose(); bar.dispose(); tex.dispose();
      },
      debug: { bar, qa: qaFlow(pointer, [
        drop, lay, { name: '检查空白纸带', run() { if (phase !== 'bench' || run.marks.length || bar.has('drop')) throw Error('断电打出了有效纸带'); } }, raise,
        ...measure, qaRead(0, true), ...[0, 1, 2, 3].map(k => qaRead(k)), raise,
        { name: '配重未套准', drag: ringPick, to: v(-0.06, 0.14, 0) },
        { name: '套上配重', drag: ringPick, to: seat }, ...measure, ...[0, 1, 2, 3].map(k => qaRead(k)),
        { name: '核对结果并掀开课本', run() {
          if (!bar.finished || series.some(s => s.points.length !== 3) || rows.rows.length !== 2) throw Error('两组测量未完成');
          ui.go(2); ui.el.querySelector('.flap-front').click();
        } },
      ]) },
    };
  },
};
