// 必修一图 1.3-2。在一条真实依照手势打出的纸带上，把 DG 和 DF 都用于估计 E 点速度。
import * as THREE from 'three';
import { paint, inked, polyline } from '../live/ink.js';
import { canvasTex, rulerMesh, textPlate, woodBlock } from './kit/props.js';
import { clamp, draggable } from './kit/interact.js';
import { chart, h, table } from './kit/ui.js';
import { lessonBar } from './kit/lessonbar.js';
import { tickerHead, powerControls, SLOT_Y } from './kit/ticker/head.js';
import { handTrace, comparison } from './kit/ticker/handtrace.js';
import { qaFlow } from './kit/chemlesson.js';
import { PERIOD } from './kit/ticker/motion.js';

const LENGTH = 0.28,
  WIDTH = 0.028,
  LEAD = 0.066,
  LIMIT = 0.195,
  ZERO = -0.114,
  LANE = 0.105,
  RULE_Z = 0.135;
const W = 3072,
  H = 256;
// 侧视剖面把上盖内的振片、振针和复写纸分开画，便于对照桌上的器材。
function constructionDiagram() {
  const pic = canvasTex(640, 310, (g, w, height) => {
    g.fillStyle = '#faf5e7';
    g.fillRect(0, 0, w, height);
    const block = (x, y, width, depth, fill) => {
      g.fillStyle = fill;
      g.fillRect(x, y, width, depth);
    };
    const steel = '#4a5960';
    block(78, 97, 26, 111, steel);
    block(86, 104, 322, 8, steel);
    for (let x = 115; x < 221; x += 15) block(x, 88, 10, 40, '#ae6d39');
    block(395, 111, 6, 64, steel);
    block(327, 53, 67, 24, '#526e70');
    block(345, 178, 111, 4, '#47423f');
    block(39, 183, 553, 8, '#dbb675');
    for (const x of [266, 493]) {
      block(x, 159, 11, 22, '#78878a');
      block(x, 192, 11, 17, '#78878a');
    }
    block(56, 208, 497, 13, '#4f6571');
    function label(text, x, y, partX, partY, fromAbove) {
      g.fillStyle = '#303e48';
      g.font = '22px sans-serif';
      g.textAlign = 'center';
      g.fillText(text, x, y);
      g.strokeStyle = '#65747b';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y + (fromAbove ? 6 : -23));
      g.lineTo(partX, partY);
      g.stroke();
    }
    label('线圈', 142, 49, 151, 87, true);
    label('振片', 244, 49, 284, 103, true);
    label('永久磁体', 370, 32, 365, 52, true);
    label('振针', 459, 92, 400, 148, true);
    label('复写纸', 550, 135, 443, 177, true);
    label('限位孔', 282, 267, 271, 190, false);
    label('纸带', 568, 247, 567, 191, false);
  });
  const canvas = pic.canvas;
  canvas.style.cssText = 'width:100%;height:auto;display:block';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '电磁打点计时器构造示意');
  const el = h(
    'figure',
    { style: 'margin:12px 0' },
    canvas,
    h('figcaption', { class: 'note' }, '电磁打点计时器构造示意'),
  );
  return { el, dispose: () => pic.dispose() };
}
export default {
  id: 'handtape',
  fig: '图1.3-2',
  title: '手拉纸带测速度',
  stampText: '测量',
  predict: {
    q: '你先慢后快地拉同一条纸带，计时器仍每隔 0.02 s 打一点。哪一段的点距更大？',
    options: ['慢拉时', '快拉时', '两段一样大'],
    answer: 1,
    hint: '怎样用这行点估计打下 E 点时纸带的速度？',
  },
  conclusion: {
    page: 27,
    rect: [63.75, 492.1, 384.8, 662.06],
    quote:
      '我们可以这样考虑：E点在D、G两点之间， D、G两点间的平均速度我们可以求出。如果不要求很精确，用这个平均速度粗略地代表E点的瞬时速度，也未尝不可。不过，如果把包含E点在内的间隔取得小一些，例如取图1.3-3中的DF线段，那么经过D、F两点所用的时间Δt就会变短，用两点间的位移Δx和时间Δt算出的平均速度代表纸带在E点的瞬时速度，就会精确一些。D、F 两点离E点越近，算出的平均速度越接近E点的瞬时速度。',
    why: '尺量位移，打点间隔给出时间。DG 有五个间隔，DF 有三个，两段都包含 E。对于平滑变化的速度，缩短取样时间通常能更好地反映附近的运动；取得太短，同样的读尺误差又会占更大比例。',
    src: '课本第 23 页 · 第一章 第3节 位置变化快慢的描述——速度',
  },
  create(ctx) {
    const group = new THREE.Group(),
      timer = tickerHead();
    group.add(timer.group);
    // 计时器正面（朝镜头）的电源开关和指示灯，和其他打点计时器的课一样：点开关接通、断开电源
    const showPower = powerControls(timer.group, { y: 0.02, z: 0.0362, rockerX: 0.016, lampX: -0.018 });
    const switchPick = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.027, 0.013),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    switchPick.position.set(0.016, 0.02, 0.042);
    switchPick.userData.pick = true;
    timer.group.add(switchPick);
    const supply = inked(new THREE.Mesh(new THREE.BoxGeometry(0.079, 0.042, 0.064), paint(0x37686d)));
    supply.position.set(0.03, 0.021, -0.095);
    group.add(supply);
    const plate = textPlate('AC  50 Hz', {
      w: 0.065,
      h: 0.023,
      color: '#33434a',
      bg: '#e7e1d1',
      font: 'bold 86px sans-serif',
    });
    plate.position.set(0, 0.003, 0.0322);
    supply.add(plate);
    for (const off of [-0.015, 0.015])
      group.add(
        polyline(
          [
            [off, 0.025, -0.034],
            [off, 0.01, -0.053],
            [0.03 + off, 0.026, -0.065],
          ].map((p) => new THREE.Vector3(...p)),
          { color: 0x42494b, width: 1.5 },
        ),
      );
    for (const [x, length] of [
      [-0.181, 0.284],
      [0.166, 0.254],
    ]) {
      const board = woodBlock(length, SLOT_Y - 0.001, 0.055);
      board.position.set(x, (SLOT_Y - 0.001) / 2, 0);
      group.add(board);
    }
    const direction = textPlate('← 运动正方向', {
      w: 0.135, h: 0.026, font: 'bold 72px sans-serif', color: '#294953', bg: '#f7edcf',
    });
    direction.position.set(-0.18, 0.022, 0.028);
    group.add(direction);
    const texture = canvasTex(W, H, () => {}),
      ink = texture.canvas.getContext('2d');
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(LENGTH, WIDTH),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
    paper.rotation.x = -Math.PI / 2;
    group.add(paper);
    const ruler = rulerMesh({
      length: (0.28 * 4096) / 4080,
      width: 0.032,
      divisions: 280,
      every: 10,
      labelEvery: 20,
    });
    // 尺的两端没有相邻标号，向尺内排字，使 0 和 28 都能完整读出。
    const face = ruler.material[2].map;
    const scaleInk = face.canvas.getContext('2d');
    const { width, height } = face.canvas;
    scaleInk.font = 'bold ' + Math.round(height * 0.32) + 'px sans-serif';
    for (const [label, x, align] of [
      ['0', 8, 'left'],
      ['28', width - 8, 'right'],
    ]) {
      const room = scaleInk.measureText(label).width + 8;
      scaleInk.fillStyle = '#f5f1e6';
      scaleInk.fillRect(align === 'left' ? 0 : width - room, height * 0.45, room, height * 0.55);
      scaleInk.fillStyle = '#1d2433';
      scaleInk.textAlign = align;
      scaleInk.fillText(label, x, height * 0.82);
    }
    face.needsUpdate = true;
    ruler.position.set(ZERO + LENGTH / 2, 0.002, RULE_Z);
    group.add(ruler);
    const grip = new THREE.Group();
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.031, 0.012, WIDTH),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.userData.pick = true;
    grip.add(hit);
    // 留出纸带折起的一端，手抓的位置在计时器的压纸桥外。
    const folded = new THREE.Mesh(
      new THREE.PlaneGeometry(0.021, WIDTH),
      paint(0xf5d99d, { side: THREE.DoubleSide }),
    );
    folded.rotation.order = 'ZXY';
    folded.rotation.x = -Math.PI / 2;
    folded.rotation.z = -0.32;
    folded.position.set(-0.005, 0.0036, 0);
    hit.add(folded);
    group.add(grip);
    grip.add(paper);
    paper.position.x = LENGTH / 2 - 0.015;
    const point = (x, y, z) => new THREE.Vector3(x, y, z);
    const home = point(0.06, SLOT_Y, 0);
    const threaded = point(0.015 - LEAD, SLOT_Y, 0);
    const extracted = point(0.015 - LENGTH - 0.043, SLOT_Y, 0);
    const ruled = point(ZERO - LEAD + 0.015, 0.004, LANE);
    const foot = woodBlock(0.045, 0.012, 0.04);
    foot.position.set(-0.024, 0.006, 0.047);
    group.add(foot);
    const bolt = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.009, 6), paint(0x788390)));
    bolt.position.set(-0.024, 0.021, 0.05);
    group.add(bolt);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.001, 0.002), paint(0x384147));
    slot.position.y = 0.0046;
    bolt.add(slot);
    const guide = new THREE.Mesh(
      new THREE.PlaneGeometry(LENGTH, WIDTH),
      new THREE.MeshBasicMaterial({ color: 0xcac5b7, transparent: true, opacity: 0.38 }),
    );
    guide.rotation.x = -Math.PI / 2;
    guide.position.set(ruled.x + LENGTH / 2 - 0.015, 0.001, LANE);
    group.add(guide);

    let phase, ui, trace, segment, origin, powered, returning, records, near;
    let reading, counts, values, firstColumn, rawReadings;
    const anatomy = constructionDiagram();
    const estimates = [];
    const graph = chart({
      x: { label: 't / s', min: 0, max: 0.2 },
      y: { label: 'v / (m/s)', min: 0, max: 0.1 },
      fit: true,
      height: 125,
      series: [{ points: estimates, line: false, dots: true }],
      legend: '以第一个移开的点为零时刻。图中各点表示对 E 点速度的估计，正值表示纸带向左运动。',
    });
    const now = () => performance.now() / 1000;
    const pulled = () => threaded.x - grip.position.x;
    const atPullLimit = () => grip.position.x <= threaded.x - LIMIT;
    const steps = [
      ['fix', '固定计时器', '找到铜色线圈和打点的振针，拧紧底座前的螺钉，固定计时器。'],
      ['install', '安装纸带', '底座固定好了。把右边的纸带头向左穿过限位孔，直到左端露出。'],
      ['mark', '通电拉带', '纸带穿好了。点开关接通电源，让振针开始打点。'],
      ['take', '取下纸带', '灯灭了。继续向左抽纸带，直到右端离开限位孔。'],
      ['count', '数点计时', '在纸带上选一段点迹清楚的地方，点一下放大。'],
      ['measure', '量位移', '用尺读出 D、G 的位置，求出 DG 的位移。'],
      ['short', '估计瞬时速度', '保留 D 的读数，再量较短的 DF 段。'],
    ];
    function target() {
      if (near || returning || phase === 'retry') return null;
      if (phase === 'fix') return bolt;
      if (phase === 'mark' && (!powered || segment || atPullLimit())) return timer.group;
      if (['select', 'read'].includes(phase)) return paper;
      return hit;
    }
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: steps.map(([id, title, todo]) => ({ id, title, todo, target })),
    });
    const say = (msg) => bar.say(msg);
    function draw() {
      ink.fillStyle = '#f8dfac';
      ink.fillRect(0, 0, W, H);
      ink.fillStyle = '#b89358';
      ink.fillRect(0, 0, W, 3);
      ink.fillRect(0, H - 3, W, 3);
      const px = (x) => ((LEAD + x) / LENGTH) * W;
      ink.fillStyle = '#39352d';
      for (const m of trace?.marks || []) {
        ink.beginPath();
        ink.ellipse(px(m.x), 138, 4.5, (((4.5 * H) / W) * LENGTH) / WIDTH, 0, 0, 2 * Math.PI);
        ink.fill();
      }
      if (phase === 'read') {
        const labels = [
          [0, 'D', 75, 'right'],
          [1, 'E', 230, 'left'],
          [5, 'G', 75, 'left'],
        ];
        if (reading >= 2) labels.push([3, 'F', 65, 'right']);
        for (const [i, label, y, align] of labels) {
          const x = px(segment[i].x);
          ink.fillStyle = '#275965';
          ink.fillRect(x - 1.5, Math.min(y + 4, 138), 3, Math.abs(138 - y - 4));
          ink.font = 'bold 50px sans-serif';
          ink.textAlign = align;
          ink.fillText(label, x + (align === 'right' ? -3 : 3), y);
        }
      }
      texture.needsUpdate = true;
    }
    const field = h('input', { type: 'number', step: 'any', inputmode: 'decimal', style: 'width:5.5em' });
    const label = h('label', { for: 'handtape-value' });
    field.id = 'handtape-value';
    const submit = h('button', { class: 'go ghost', type: 'submit' }, '记下');
    const form = h(
      'form',
      {
        onsubmit(e) {
          e.preventDefault();
          record();
        },
      },
      label,
      field,
      submit,
    );
    const header = h(
      'select',
      { 'aria-label': '时间、位移的先后顺序' },
      ...['选择栏目', '时间 / s', '位移 / mm'].map((t, i) => h('option', { value: i }, t)),
    );
    const design = h('label', {}, '区间后先记 ', header);
    header.onchange = () => {
      if (!Number(header.value)) return;
      firstColumn = Number(header.value);
      const cols = ['时间 / s', '位移 / mm'];
      if (firstColumn === 2) cols.reverse();
      records = table(['E 时刻 / s', '区间', ...cols, '平均速度 / (m/s)'], {
        note: '取向左为正方向。纸带上的点从左到右依次打出，两点的尺读数之差给出位移大小。',
      });
      ui.data.prepend(records.el);
      say('表头已定。数一数从 D 到 G 有几个打点间隔。');
      fields();
    };
    const work = h('p', { class: 'note', style: 'color:#394955;font-size:14px;line-height:1.55' });
    const status = ['DG 间隔数', 'D 的尺读数 / mm', 'G 的尺读数 / mm', 'DF 间隔数', 'F 的尺读数 / mm'];
    function fields() {
      design.hidden = !(near && !firstColumn);
      form.hidden = !(near && firstColumn && reading < 5);
      label.textContent = (status[reading] || '') + ' ';
      field.setAttribute('aria-label', status[reading] || '读数');
      field.value = '';
    }
    function record() {
      if (form.hidden) return;
      const n = reading === 0 || reading === 3 ? Number(field.value) : Math.round(Number(field.value) * 10) / 10;
      if (!field.value || !Number.isFinite(n)) return say('先填入你数出的间隔数或读到的刻度值。');
      if (reading === 0 || reading === 3) {
        const j = reading === 0 ? 5 : 3;
        if (n !== j) return say('相邻两点之间才算一个间隔。从 D 出发，逐格数到终点。');
        counts.push(n);
        if (reading === 0) bar.done('count');
        say(
          n +
            ' 个间隔共 ' +
            n +
            ' × 0.02 s = ' +
            (n * PERIOD).toFixed(2) +
            ' s。' +
            (reading === 0 ? '沿 D 点向下读尺。尺上数字是厘米，每小格 1 mm，估读到 0.1 mm。' : '沿 F 点读尺，和 D 的读数相减。'),
        );
      } else {
        const j = reading === 1 ? 0 : reading === 2 ? 5 : 3;
        const diff = n - segment[j].x * 1000;
        if (Math.abs(diff) > 0.7)
          return say('读数偏' + (diff > 0 ? '大' : '小') + '。对准点的中心，尺上 1 cm 要记作 10 mm。');
        values.push(n);
        if (reading === 1) {
          rawReadings = h('span');
          work.append(rawReadings, h('br'));
        }
        rawReadings.textContent = '尺读数（mm）　' +
          values.map((value, i) => ['D', 'G', 'F'][i] + ' ' + value.toFixed(1)).join('　');
        if (reading === 1) say('已记下 D 的读数。沿 G 点向下读同一把尺。');
        else {
          const name = reading === 2 ? 'DG' : 'DF';
          const dx = +(n - values[0]).toFixed(1),
            dt = counts[counts.length - 1] * PERIOD,
            v = dx / 1000 / dt;
          const cells = [dt.toFixed(2), dx.toFixed(1)];
          if (firstColumn === 2) cells.reverse();
          const firstMoving = trace.marks.find((m) => m.x > trace.marks[0].x);
          const time = (segment[1].tick - firstMoving.tick) * PERIOD;
          records.add([time.toFixed(2), name, ...cells, v.toFixed(3)]);
          if (reading === 4) {
            const old = estimates.find((p) => p[0] === time);
            if (old) old[1] = v;
            else estimates.push([time, v]);
            graph.el.hidden = false;
            graph.draw();
          }
          work.append(
            h(
              'span',
              {},
              name +
                '：(' +
                n.toFixed(1) +
                ' − ' +
                values[0].toFixed(1) +
                ') mm = ' +
                dx.toFixed(1) +
                ' mm；' +
                (dx / 1000).toFixed(4) +
                ' m ÷ ' +
                dt.toFixed(2) +
                ' s ≈ ' +
                v.toFixed(3) +
                ' m/s。',
            ),
            h('br'),
          );
          bar.done(reading === 2 ? 'measure' : 'short');
          say(
            reading === 2
              ? 'DG 的平均速度可以粗估 E 点速度。改用较短的 DF，先数间隔。'
              : 'DF 包含 E，时间更短，它的平均速度描述的是更靠近 E 的这段运动。可以掀开结论了。',
          );
        }
      }
      reading++;
      fields();
      draw();
    }
    function inspect(ray) {
      if (phase === 'select' || reading === 5) {
        if (reading === 5) {
          reading = 0;
          values = [];
          counts = [];
        }
        const contact = ray?.intersectObject(paper)[0];
        if (contact) segment = comparison(trace.marks, group.worldToLocal(contact.point.clone()).x - ZERO);
        phase = 'read';
        draw();
      }
      near = true;
      bar.near(true);
      ctx.look(
        [ZERO + (segment[0].x + segment[5].x) / 2, 0.004, (LANE + RULE_Z) / 2],
        [0, 1, 0.001],
        Math.max(0.16, (segment[5].x - segment[0].x + 0.04) * 2.2),
        leave,
      );
      if (!firstColumn) say('已标出这段点迹。选好时间、位移两栏的顺序，再数点。');
      else if (reading < 5) say('继续记录' + status[reading] + '。');
      fields();
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      fields();
      if (reading === 5) say('点纸带另一处，可以估计另一个时刻的速度。');
      else say('点纸带，凑近看点迹和尺上的刻度。');
    }
    function fix() {
      bolt.rotation.y = Math.PI / 2;
      bolt.position.y = 0.0165;
      phase = 'install';
      anatomy.el.hidden = true;
      bar.done('fix');
    }
    function toggle() {
      if (!powered) {
        powered = true;
        origin = now();
        trace = handTrace(origin, pulled());
        say('灯亮了。取向左为正方向，抓住纸带左端向左水平拉，试试改变手速。');
      } else {
        trace.sample(now(), pulled());
        powered = false;
        segment = comparison(trace.marks);
        phase = 'extract';
        bar.done('mark');
        if (!segment) say('已断电。点迹不足以分辨六个连续点，先向左抽出这条纸带。');
      }
      draw();
    }
    function rebound(to, msg) {
      returning = { from: grip.position.clone(), to, elapsed: 0 };
      say(msg);
    }
    let start,
      held = false,
      lastMove = 0;
    const gripDrag = {
      obj: hit,
      anchor: grip,
      keepOffset: true,
      plane: 'xz',
      offset: SLOT_Y,
      enabled: () => !returning && ['install', 'mark', 'extract', 'lay'].includes(phase),
      hint: () =>
        phase === 'install'
          ? '向左拖：穿过限位孔'
          : phase === 'lay'
            ? '向前拖：放到尺旁'
            : phase === 'extract'
              ? '向左拖：抽出纸带'
              : '向左拖：拉动纸带',
      onStart() {
        start = grip.position.clone();
        held = true;
        lastMove = now();
        if (powered) trace.sample(lastMove, pulled());
      },
      onDrag(p) {
        lastMove = now();
        if (phase === 'lay') {
          // 指针射线与纸带实际移动的表面相交：先离开木轨，再沿斜面落到尺旁。
          const eye = group.worldToLocal(ctx.camera.getWorldPosition(new THREE.Vector3()));
          const ray = p.clone().sub(eye);
          const slope = (ruled.y - SLOT_Y) / 0.035;
          const atY = (y) => eye.clone().addScaledVector(ray, (y - eye.y) / ray.y);
          let dest = p;
          if (p.z > 0.05) {
            const t = (SLOT_Y + slope * (eye.z - 0.05) - eye.y) / (ray.y - slope * ray.z);
            dest = eye.clone().addScaledVector(ray, t);
            if (dest.z >= 0.085) dest = atY(ruled.y);
          }
          const z = clamp(dest.z, 0, LANE + 0.022);
          const clearance = clamp((z - 0.039) / 0.022, 0, 1);
          grip.position.set(
            clamp(dest.x, extracted.x, extracted.x + (home.x - extracted.x) * clearance),
            SLOT_Y + (ruled.y - SLOT_Y) * clamp((z - 0.05) / 0.035, 0, 1),
            z,
          );
        } else {
          const lower = phase === 'install' ? threaded.x : phase === 'extract' ? extracted.x : threaded.x - LIMIT;
          grip.position.x = clamp(p.x, lower, phase === 'install' ? home.x : start.x);
          if (powered) {
            trace.sample(now(), pulled());
            draw();
          }
        }
      },
      onEnd(moved) {
        held = false;
        if (!moved) return;
        if (phase === 'install') {
          if (grip.position.x > threaded.x + 0.003)
            return rebound(home, '带头还没穿出来。沿槽再向左推，让左端露出。');
          grip.position.copy(threaded);
          phase = 'mark';
          bar.done('install');
        } else if (phase === 'mark') {
          if (!powered) return rebound(start, '灯没亮，拉过的纸带上没有点。先接通电源。');
          trace.sample(now(), pulled());
          segment = comparison(trace.marks);
          if (segment) say('纸带上留下了一行点。打完点，立即点开关断电。');
          else if (atPullLimit()) say('纸带已拉到底，清晰的点还不够。先断电，取下纸带平放，换新后拉慢一些。');
          else say('清晰的点还不够。继续平稳地拉出一段，再断电。');
        } else if (phase === 'extract') {
          if (grip.position.x > extracted.x + 0.002) return say('右端还在孔里。继续向左抽到纸带完全离开。');
          phase = 'lay';
          guide.visible = true;
          say('纸带已离开计时器。拖到尺旁的浅色带上，平放后数点。');
        } else if (phase === 'lay') {
          if (Math.abs(grip.position.z - LANE) > 0.014 || Math.abs(grip.position.x - ruled.x) > 0.025)
            return rebound(extracted, '纸带还没对齐。把纸带两端对齐尺旁浅色带的两端。');
          grip.position.copy(ruled);
          guide.visible = false;
          if (!segment) {
            phase = 'retry';
            say('这条纸带没有足够清晰的连续点。换新纸带，再通电拉一段。');
            retry.hidden = false;
          } else {
            phase = 'select';
            bar.done('take');
          }
        }
      },
    };
    const pointer = draggable(group, [gripDrag], {
      tip: ctx.tag('', 'pill'),
      taps: [
        { obj: bolt, enabled: () => phase === 'fix', hint: '点一下：拧紧螺钉', onTap: fix },
        {
          obj: switchPick,
          enabled: () => phase === 'mark' && !returning,
          hint: () => (powered ? '点一下：断开电源' : '点一下：接通电源'),
          onTap: toggle,
        },
        {
          obj: paper,
          enabled: () => !near && ['select', 'read'].includes(phase),
          hint: '点一下：近看点迹',
          onTap: inspect,
        },
      ],
    });
    function newTape() {
      phase = 'install';
      trace = segment = returning = null;
      powered = near = false;
      reading = firstColumn = 0;
      values = [];
      counts = [];
      estimates.length = 0;
      graph.el.hidden = true;
      graph.draw();
      grip.position.copy(home);
      guide.visible = false;
      retry.hidden = true;
      header.value = '0';
      records?.el.remove();
      work.replaceChildren();
      fields();
      draw();
      bar.undo(...steps.slice(1).map((s) => s[0]));
      bar.say(null);
    }
    const retry = h('button', { class: 'go ghost', onclick: newTape }, '换新纸带');
    function reset() {
      newTape();
      phase = 'fix';
      anatomy.el.hidden = false;
      bolt.rotation.y = 0;
      bolt.position.y = 0.021;
      ctx.back();
      bar.near(false);
      bar.undo('fix');
      ui?.relock();
    }
    reset();
    const dragTo = (name, to) => ({ name, drag: hit, to });
    const input = (name, getValue) => ({
      name,
      run() {
        field.value = String(getValue());
        submit.click();
      },
    });
    const mm = (j) => Math.round(segment[j].x * 10000) / 10;
    const root = new THREE.Group();
    root.add(group);
    return {
      group: root,
      size: { w: 0.71, d: 0.34, h: 0.085 },
      view: { elev: 32, azim: 0, lookY: 0.33 },
      toggles: ['steps'],
      reset,
      pointer: {
        items: () => pointer.items().filter((i) => i.enabled()),
        down(ray, e) {
          const took = pointer.down(ray, e);
          if (took && ui?.step === 0) ui.go(1);
          return took;
        },
        move(ray, e) {
          return ui?.step === 1 && pointer.move(ray, e);
        },
        up: (ray, e) => pointer.up(ray, e),
      },
      mount(panel) {
        ui = panel;
        bar.attach({ ...ui, need: () => ui.need('') });
        ui.status('线圈通入 50 Hz 交流电，振片带动振针，每隔 0.02 s 透过复写纸在纸带上留一个点。');
        ui.controls.append(anatomy.el, design, form, retry);
        ui.data.append(work, graph.el, h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        const source = ui.el.querySelector('.answer .src');
        source.style.paddingRight = '85px';
        source.style.minHeight = '46px';
        fields();
      },
      update(dt) {
        direction.visible = !near;
        if (powered && (!held || now() - lastMove > 0.065)) trace.sample(now(), pulled());
        timer.update(powered, powered ? now() - origin : 0);
        showPower(powered);
        if (returning) {
          returning.elapsed += dt;
          const t = Math.min(1, returning.elapsed / 0.38);
          grip.position.lerpVectors(returning.from, returning.to, 1 - (1 - t) ** 2);
          if (t === 1) returning = null;
        }
        bar.update(dt);
      },
      dispose() {
        anatomy.dispose();
        pointer.dispose();
        bar.dispose();
        texture.dispose();
      },
      debug: {
        bar,
        qa: qaFlow(pointer, [
          { name: '固定底座', tap: bolt },
          dragTo('穿好纸带', threaded),
          dragTo('断电拉带', point(threaded.x - 0.038, SLOT_Y, 0)),
          { name: '接通电源', tap: switchPick },
          dragTo('水平拉带', point(threaded.x - LIMIT, SLOT_Y, 0)),
          { name: '关闭电源', tap: switchPick },
          dragTo('抽出纸带', extracted),
          dragTo('平放尺旁', ruled),
          { name: '选段近看', tap: paper },
          {
            name: '设计表头',
            run() {
              header.value = '1';
              header.dispatchEvent(new Event('change'));
            },
          },
          input('把点数当间隔数', () => 6),
          input('数 DG 间隔', () => 5),
          input('误读 D', () => mm(0) + 10),
          input('读 D', () => mm(0)),
          input('读 G', () => mm(5)),
          input('数 DF 间隔', () => 3),
          input('读 F', () => mm(3)),
          {
            name: '查看结论',
            run() {
              if (!bar.finished || records.rows.length !== 2) throw Error('两次测量未完成');
              ui.go(2);
              ui.el.querySelector('.flap-front').click();
            },
          },
        ]),
      },
    };
  },
};
