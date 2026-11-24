import * as THREE from 'three';
import { fallingRig, X, BASE, LEAD, TRAVEL, L, WIDTH, ZERO, LANE, RULER_Z } from './kit/ticker/fallRig.js';
import { fallingTape, energyPoints, GRAVITY } from './kit/ticker/fall.js';
import { PERIOD } from './kit/ticker/motion.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { note, table, h } from './kit/ui.js';

const MASS = 0.2, RESISTANCE = 0.1;
const steps = [['drop', '打出下落纸带'], ['select', '选起点和终点'], ['height', '量下降高度'], ['speed', '测速并比较能量']];
const labels = ['A', 'B', 'A 前一点', 'A 后一点', 'B 前一点', 'B 后一点'];
const fmt = value => Number(value.toFixed(1));

export default {
  id: 'fallenergy', fig: '图8.5-2', title: '验证机械能守恒定律', stampText: '测量',
  predict: {
    q: '重物从 A 落到 B，减少的重力势能都变成了动能吗？',
    options: ['几乎都变成了动能', '只有一小部分变成了动能', '动能没有增加'], answer: 0,
    hint: '用同一条纸带，比较这段下落中减少的重力势能和增加的动能。',
  },
  conclusion: {
    page: 99, rect: [63.77, 170.17, 378.83, 254.29],
    quote: '机械能守恒定律告诉我们，在只有重力或弹力做功的系统内，动能与势能相互转化时总的机械能保持不变。',
    why: '两项变化接近，说明减少的重力势能几乎都变成了动能。实际下落时空气和纸带的阻力做负功；只有忽略阻力时，重物与地球组成的系统才可看作机械能守恒。',
    src: '课本第 95 页 · 第八章 第5节 实验：验证机械能守恒定律',
  },
  create(ctx) {
    const { group, head, showPower, switchPick, jaw, weight, tape, tex, ink, ruler, vertical, flat } = fallingRig({ powerSwitch: true, onPage: true });
    const root = new THREE.Group(); root.add(group);
    head.group.attach(switchPick);
    const vec = (x, y, z) => new THREE.Vector3(x, y, z);
    const top = vec(X, BASE, 0), rest = vec(X, BASE - TRAVEL, 0);
    const hanging = rest.clone().add(vec(0, L / 2, 0)), laid = vec(ZERO - LEAD + L / 2, 0.004, LANE);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(vec(0, LANE, hanging.y - laid.y).normalize(), hanging);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(L + 0.006, WIDTH + 0.006), new THREE.MeshBasicMaterial({ color: 0xd7c8a9 }));
    slot.rotation.x = -Math.PI / 2; slot.position.copy(laid).y = 0.0005; group.add(slot);
    function pick(parent, width, height, depth, x = 0, y = 0) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({ visible: false }));
      mesh.position.set(x, y, 0); mesh.userData.pick = true; parent.add(mesh); return mesh;
    }
    const clip = pick(jaw, 0.055, 0.029, 0.024, 0.019);
    const grip = pick(weight, 0.05, 0.042, 0.048, 0, -0.028);
    const middle = pick(tape, 0.14, WIDTH * 1.25, 0.005);
    const dots = Array.from({ length: Math.ceil(Math.sqrt(2 * TRAVEL / (GRAVITY - RESISTANCE / MASS)) / PERIOD) + 1 }, () => pick(tape, 1, WIDTH, 0.002));
    dots.forEach(dot => { dot.visible = false; });
    const scale = ruler.material[2].map, canvas = scale.image, pen = canvas.getContext('2d');
    ruler.scale.x = 0.28 / ruler.geometry.parameters.width; ruler.position.x = ZERO + 0.13;
    pen.fillStyle = '#f4eddb'; pen.fillRect(0, 0, canvas.width, canvas.height);
    pen.fillStyle = '#293744'; pen.font = '600 56px sans-serif'; pen.textAlign = 'center';
    for (let mm = 0; mm <= 260; mm++) {
      const x = (10 + mm) / 280 * canvas.width;
      pen.fillRect(x - 1.1, 0, 2.2, canvas.height * (mm % 10 === 0 ? 0.41 : mm % 5 === 0 ? 0.3 : 0.18));
      if (mm % 10 === 0) pen.fillText(String(mm), x, canvas.height * 0.65);
    }
    pen.fillText('mm', canvas.width * 0.965, canvas.height * 0.93); scale.needsUpdate = true;
    let ui, target, phase, run, released, powerAt, powered = false, stationary = false, close = false;
    let first = null, last = null, reads = [], ray, grabOffset, returning, result = '';
    const now = () => performance.now() / 1000;
    const index = () => [first, last, first - 1, first + 1, last - 1, last + 1][reads.length];
    const expected = () => run.marks[index()].x * 1000;
    const validPair = (left, right) => right >= left + 3 && run.marks[right].x - run.marks[left].x >= 0.04;
    const enough = () => { const centers = energyPoints(run.marks); return centers.length > 1 && validPair(centers[0], centers[centers.length - 1]); };
    const bar = lessonBar({ ...ctx, group, back: leave, steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => target })) });
    const guide = (message, object = null) => { target = object; bar.say(message); };
    const input = h('input', { type: 'number', inputmode: 'decimal', step: '0.1', required: true, style: 'width:6em;margin:0 6px;padding:5px' });
    const caption = h('span'), submit = h('button', { class: 'go', type: 'submit', style: 'width:auto;margin:0' }, '记下');
    const form = h('form', { hidden: true, onsubmit(event) { event.preventDefault(); read(input.valueAsNumber); } }, h('label', {}, caption, input), submit);
    const rows = table(['纸带区间', '两端位置 / mm', '距离 / mm']);
    const calculations = h('div', { class: 'energy-math' });
    const comparison = h('div', { class: 'energy-compare', hidden: true });
    const repeat = h('button', { class: 'go ghost', onclick: reselect }, '在这条纸带上另选两点');
    function draw() {
      const { width, height } = tex.canvas;
      const px = pos => (LEAD + pos) / L * width;
      ink.fillStyle = '#fff8e5'; ink.fillRect(0, 0, width, height);
      function dot(pos) { ink.fillStyle = '#302c27'; ink.beginPath(); ink.arc(px(pos), height / 2, 6, 0, 2 * Math.PI); ink.fill(); }
      if (stationary) dot(0);
      const selected = [first, last];
      const active = last !== null && reads.length < 6 ? index() : null;
      run.marks.forEach((mark, k) => {
        const loc = px(mark.x);
        const label = k === active ? labels[reads.length] : selected.includes(k) ? labels[selected.indexOf(k)] : '';
        if (label) {
          ink.fillStyle = k === active ? '#953e2c' : '#21646a';
          ink.fillRect(loc - 1.6, height * 0.52, 3.2, height * 0.48);
          ink.font = 'bold 64px sans-serif'; ink.textAlign = 'center';
          if (k === active || active === null || Math.abs(mark.x - run.marks[active].x) > 0.0065) ink.fillText(selected.includes(k) ? labels[selected.indexOf(k)] : '▼', loc, height * 0.38);
        }
        dot(mark.x);
      });
      tex.needsUpdate = true;
    }
    function next() {
      if (phase === 'ready') return powered ? guide('绿灯亮了。松开上端夹子，让重物从静止下落。', jaw) : guide('先点开关，绿灯亮后再松夹子，纸带才会记下下落过程。', head.group);
      if (phase === 'fall') return guide(powered ? '重物拉着纸带下落，每隔 0.02 s 留一个点。' : '重物在下落，计时器没有打点。');
      if (phase === 'landed') return powered ? guide('重物已落到垫上。立即断电，再取纸带。', head.group) : guide((run.marks.length ? '打点结束。' : '没通电，下落没有留下点迹。') + '捏住纸带中段，拖到尺边浅色槽中央。', tape);
      if (!enough()) return guide((run.marks.length || stationary ? '连续点不够，测不出两个速度。' : '这是一条空白纸带，不能用来测速。') + '向上提回重物换新带，先通电再松手。', weight);
      if (reads.length === 6) return guide(result);
      if (!close) return guide('点纸带凑近看，用这条带上的点量高度、测速。', tape);
      if (first === null) return guide('等时打出的点越隔越远，重物越落越快。先选较早的点作 A，前后都要留一个点。');
      if (last === null) return guide('A 已标出。选较远的点作 B，前后也要有点，才能测速。');
      guide('读“' + labels[reads.length] + '”指线正对的毫米刻度，估读到 0.1 mm。');
    }
    function fresh() {
      phase = 'ready'; stationary = false; first = last = null; reads = []; result = '';
      run = fallingTape(MASS, RESISTANCE, TRAVEL);
      weight.position.copy(top); tape.position.copy(top).y += L / 2; tape.quaternion.copy(vertical); jaw.rotation.y = 0;
      dots.forEach(dot => { dot.visible = false; }); draw(); next();
    }
    function power() {
      const time = now(); powered = !powered;
      if (powered) { powerAt = time; if (phase === 'ready') { stationary = true; draw(); } }
      if (phase === 'fall') run.power(powered, time - released);
      showPower(powered); next();
    }
    function drop() {
      released = now(); if (powered) run.power(true, powerAt - released);
      phase = 'fall'; jaw.rotation.y = -0.85; next();
    }
    function inspect() {
      close = true; bar.near(true);
      const reading = last !== null;
      form.hidden = !reading; input.value = '';
      if (reading) caption.textContent = labels[reads.length] + ' 的位置 / mm';
      const end = run.marks[run.marks.length - 1].x;
      const center = reading ? clamp(expected() / 1000, 0.028, 0.236) : end / 2;
      ctx.look([ZERO + center, 0.004, (LANE + RULER_Z) / 2], [0, 1, 0.01], reading ? 0.17 : (end + 0.044) * 1.72, leave);
      next();
    }
    function leave() { close = false; form.hidden = true; bar.near(false); ctx.back(); next(); }
    function choose(k) {
      const centers = energyPoints(run.marks);
      if (!centers.includes(k)) return guide('这个点的前后没有两个清楚、连续的间隔。换一个内侧的点。');
      if (first === null) {
        if (!centers.some(other => validPair(k, other))) return guide('这个起点太靠后，留给 B 的距离太短。向左选。');
        first = k;
      } else if (k === first) first = null;
      else if (k < first) return guide('B 是较晚的位置，要在 A 的右边。');
      else if (!validPair(first, k)) return guide('A、B 太近，尺上同样的误差占比会更大。向右选远一点，或点 A 重选。');
      else { last = k; bar.done('select'); }
      draw(); inspect();
      if (last !== null) guide('A、B 间距就是下降高度。先读 A，再读 B；每小格 1 mm，估读到 0.1 mm。');
    }
    function read(value) {
      if (!close || last === null || reads.length >= 6 || !Number.isFinite(value)) return;
      const diff = value - expected();
      if (Math.abs(diff) > 0.35) { guide('读数偏' + (diff > 0 ? '大' : '小') + '。从红线左侧的整十刻线数起，每小格 1 mm。'); input.select(); return; }
      reads.push(fmt(value)); draw();
      const count = reads.length, distance = fmt(reads[count - 1] - reads[count - 2]);
      if (count % 2 === 0) {
        rows.el.hidden = false;
        rows.add([['A 到 B', 'A 点前后', 'B 点前后'][count / 2 - 1], reads[count - 2] + ' → ' + reads[count - 1], String(distance)]);
      }
      if (count === 2) { bar.done('height'); calculations.append(note(`Δh = (${reads[1]} − ${reads[0]}) mm = ${distance} mm`)); }
      if (count === 4 || count === 6) calculations.append(note(`v${count === 4 ? 'A' : 'B'} ≈ ${distance} × 10⁻³ m ÷ 0.04 s ≈ ${(distance / 40).toFixed(3)} m/s`));
      if (count < 6) {
        inspect();
        if (count === 2) guide(`重物下降了 ${distance} mm。读 A 前、后各一点，用这 0.04 s 的平均速度估计 A 点速度。`);
        else if (count === 4) guide(`A 点速度约为 ${(distance / 40).toFixed(3)} m/s。用同一方法读 B 前、后各一点。`);
        else guide(`记下了 ${reads[count - 1]} mm。再读“${labels[count]}”的红线。`);
        return;
      }
      const height = (reads[1] - reads[0]) / 1000, slow = (reads[3] - reads[2]) / 40, fast = distance / 40;
      const potential = MASS * GRAVITY * height, kinetic = MASS / 2 * (fast ** 2 - slow ** 2);
      const largest = Math.max(potential, kinetic);
      comparison.hidden = false;
      for (const [name, value, formula] of [
        ['重力势能减少', potential, `mgΔh = 0.200 × 9.8 × ${+height.toFixed(4)}`],
        ['动能增加', kinetic, `½m(vB² − vA²) ≈ 0.100 × (${fast.toFixed(3)}² − ${slow.toFixed(3)}²)`],
      ]) {
        comparison.append(h('div', {}, h('span', {}, name), h('b', {}, `≈ ${value.toFixed(3)} J`)),
          h('i', { style: `width:${100 * value / largest}%` }), h('small', {}, formula));
      }
      result = potential > kinetic ? '重力势能减少得略多。克服阻力要做功，所以减少的重力势能没有全部变成动能。读尺也有误差。' : '两项变化接近。这组读数没有分辨出阻力造成的损失，可以换两点再测。';
      bar.done('speed'); leave(); repeat.hidden = false;
      if (innerWidth <= 760) comparison.scrollIntoView({ block: 'center' });
    }
    function clearSheet() { rows.clear(); rows.el.hidden = repeat.hidden = comparison.hidden = true; calculations.replaceChildren(); comparison.replaceChildren(); input.value = ''; }
    function reselect() { first = last = null; reads = []; result = ''; clearSheet(); bar.undo('select', 'height', 'speed'); draw(); inspect(); }
    function reset() { returning = ray = grabOffset = null; powered = close = false; form.hidden = true; showPower(false); bar.near(false); ctx.back(); clearSheet(); bar.undo(...steps.map(step => step[0])); fresh(); ui?.relock(); ui?.fold(false); }
    function layAt(pos) {
      tape.position.copy(pos);
      const fraction = clamp((pos.y - laid.y) / (hanging.y - laid.y), 0, 1);
      tape.rotation.set(-Math.PI / 2 * (1 - fraction), 0, Math.asin(fraction), 'ZXY');
    }
    function hitPlane() {
      const hit = ray?.ray.intersectPlane(plane.clone().applyMatrix4(group.matrixWorld), new THREE.Vector3());
      return hit && group.worldToLocal(hit);
    }
    function recover(obj, dest, msg) { returning = { obj, from: obj.position.clone(), dest, time: 0 }; guide(msg); }
    const available = () => !returning && !close;
    const pointer = draggable(group, [
      { obj: middle, anchor: tape, keepOffset: true, plane: 'xy', enabled: () => available() && phase === 'landed' && !powered,
        hint: '拖中段：铺到尺边', onStart() { const pos = hitPlane(); grabOffset = pos && tape.position.clone().sub(pos); },
        onDrag(pos) { const hit = hitPlane(), dest = hit && grabOffset ? hit.add(grabOffset) : pos.clone();
          dest.y = clamp(dest.y, laid.y, hanging.y); dest.z = LANE * (hanging.y - dest.y) / (hanging.y - laid.y); layAt(dest); },
        onEnd(moved) { if (!moved) return;
          if (tape.position.distanceTo(laid) > 0.032) return recover(tape, hanging, '纸带没放进槽。捏住中段，对准浅色槽中央再松手。');
          layAt(laid); tape.quaternion.copy(flat); phase = 'bench';
          if (enough()) { bar.done('drop'); run.marks.forEach((mark, k, marks) => {
            const box = dots[k]; box.position.x = LEAD + mark.x - L / 2;
            box.scale.x = Math.min(0.019, k ? mark.x - marks[k - 1].x : 0.019, k + 1 < marks.length ? marks[k + 1].x - mark.x : 0.019) * 0.98; box.visible = true;
          }); }
          next(); } },
      { obj: grip, anchor: weight, keepOffset: true, plane: 'xy', enabled: () => available() && phase === 'bench' && !enough(),
        hint: '向上拖：提回重物换带', onDrag(pos) { weight.position.y = clamp(pos.y, rest.y, BASE); }, onEnd(moved) { if (!moved) return;
          if (weight.position.y < BASE - 0.022) return recover(weight, rest, '重物还没提到计时器下方。提到原来的高度再松手。'); fresh(); } },
    ], { tip: ctx.tag('', 'pill'), taps: [
      { obj: switchPick, enabled: () => available() && (phase === 'ready' || phase === 'fall' || powered), hint: () => powered ? '点一下：断开电源' : '点一下：接通电源', onTap: power },
      { obj: clip, enabled: () => available() && phase === 'ready', hint: '点夹子：释放重物', onTap: drop },
      { obj: tape, enabled: () => available() && phase === 'bench' && enough() && reads.length < 6, hint: '点纸带：凑近看点迹', onTap: inspect },
      ...dots.map((obj, k) => ({ obj, enabled: () => close && last === null && k < run.marks.length, hint: () => first === null ? '点一下：选起点 A' : k === first ? '点一下：重选起点' : '点一下：选终点 B', onTap: () => choose(k) })),
    ] });
    const stepBar = document.querySelector('.lbar');
    const layout = h('style', {}, `
      .energy-sheet .energy-math p {margin:5px 0;color:#394247;font-size:14px}
      .energy-sheet .energy-compare {margin:12px 0;font-size:14px;font-variant-numeric:tabular-nums}
      .energy-compare div {display:flex;justify-content:space-between}
      .energy-compare i {display:block;height:5px;background:#28666b;margin:4px 0}
      .energy-compare i:nth-of-type(2) {background:#a15338}
      .energy-compare small {display:block;color:#514c43;margin-bottom:9px;font-size:13px}
      #panel.energy-sheet .answer .src {padding-right:78px;min-height:45px}
      @media(max-width:760px){body:not(.predicting):not(.hide-steps) #panel.energy-sheet{height:calc(52vh - var(--energy-bar,76px));bottom:calc(8px + var(--energy-bar,76px))}body.lesson-on .lbar[data-energy]{bottom:6px}}`);
    const observer = new ResizeObserver(() => ui.el.style.setProperty('--energy-bar', stepBar.offsetHeight + 8 + 'px'));
    clearSheet(); fresh();
    const readTest = (k, wrong = false) => ({ name: wrong ? '读错毫米刻度' : '记录' + labels[k], run() {
      if (!close || reads.length !== k || last === null) throw Error('读尺状态不符');
      input.value = String(fmt(expected()) + (wrong ? 10 : 0)); submit.click();
      if (reads.length !== (wrong ? k : k + 1)) throw Error('记录条数不符');
    } });
    const lay = { name: '放平纸带', drag: middle, to: laid }, release = { name: '释放重物', tap: clip }, toggle = { name: '切换电源', tap: switchPick };
    return {
      group: root, reset, toggles: ['steps'], size: { w: 0.57, d: 0.38, h: 0.71 }, view: { elev: 16, azim: 4, get frameMargin() { return innerWidth <= 760 ? 1.25 : 1.06; } },
      pointer: { items: () => pointer.items().filter(item => item.enabled()), down(cast, event) { if (ui?.step === 2) return false; ray = cast; const held = pointer.down(cast, event); if (held && ui?.step === 0) ui.go(1); return held; },
        move(cast, event) { ray = cast; return ui?.step === 1 && pointer.move(cast, event); }, up(cast, event) { ray = null; return pointer.up(cast, event); } },
      mount(panel) {
        ui = panel; ui.el.classList.add('energy-sheet'); stepBar.dataset.energy = ''; ui.el.append(layout); observer.observe(stepBar);
        bar.attach({ need: () => ui.need(''), unlock() { ui.unlock(); ui.need(''); } }); ui.controls.append(form);
        ui.data.append(note('重物 0.200 kg　·　计时器 50 Hz'), rows.el, calculations, comparison, repeat);
        ui.notes.append(note('上端夹子代替手捏纸带。让纸带竖直穿过限位孔，选体积小、质量大的重物，可减小阻力的影响。模型取 g = 9.8 m/s²，总阻力取 0.10 N。比较等式两边时质量可以约去。'), h('button', { class: 'go ghost', onclick: reset }, '全部重来')); next();
      },
      update(dt) {
        bar.update(dt); const time = now(); head.update(powered, powered ? time - powerAt : 0);
        if (returning) { const ret = returning; ret.time += dt; const ratio = Math.min(1, ret.time / 0.4), pos = ret.from.clone().lerp(ret.dest, ratio * (2 - ratio));
          if (ret.obj === tape) layAt(pos); else weight.position.copy(pos); if (ratio === 1) returning = null; }
        if (phase !== 'fall') return;
        const elapsed = time - released, count = run.marks.length; run.advance(elapsed);
        weight.position.y = BASE - run.position(elapsed); tape.position.y = weight.position.y + L / 2;
        if (count !== run.marks.length) draw(); if (elapsed >= run.end) { phase = 'landed'; next(); }
      },
      debug: { bar, qa: qaFlow(pointer, [release, lay, { name: '核对空白带', run() { if (phase !== 'bench' || run.marks.length || bar.has('drop')) throw Error('空白带异常'); } },
        { name: '提回重物', drag: grip, to: top }, toggle, release, toggle, lay, { name: '近看纸带', tap: tape },
        { name: '选 A', tap: dots[3] }, { name: '尝试相邻的 B', tap: dots[4] }, { name: '选 B', tap: dots[8] }, readTest(0, true), ...labels.map((_, k) => readTest(k)),
        { name: '掀开原文', run() { if (!bar.finished || rows.rows.length !== 3) throw Error('测量记录不全'); ui.el.querySelectorAll('.p-step')[1].querySelector(':scope > button.go').click(); ui.el.querySelector('.flap-front').click(); if (!ui.el.querySelector('.flap.open')) throw Error('结论没有掀开'); } },
      ]) },
      dispose() { observer.disconnect(); layout.remove(); ui?.el.classList.remove('energy-sheet'); ui?.el.style.removeProperty('--energy-bar'); pointer.dispose(); bar.dispose(); tex.dispose(); },
    };
  },
};
