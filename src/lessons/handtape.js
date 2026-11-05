// 必修一图 1.3-2。在一条真实依照手势打出的纸带上，把 DG 和 DF 都用于估计 E 点速度。
import * as THREE from 'three';
import { paint, inked, polyline } from '../live/ink.js';
import { canvasTex, rulerMesh, textPlate, woodBlock } from './kit/props.js';
import { clamp, draggable } from './kit/interact.js';
import { buttons, chart, note, table } from './kit/ui.js';
import { lessonBar } from './kit/lessonbar.js';
import { tickerHead, SLOT_Y } from './kit/ticker/head.js';
import { handTrace, comparison } from './kit/ticker/handtrace.js';
import { PERIOD } from './kit/ticker/motion.js';

const LENGTH = 0.34,
  WIDTH = 0.028,
  LEAD = 0.066,
  LIMIT = 0.252,
  ZERO = -0.17,
  LANE = 0.077,
  RULE_Z = 0.107;
const W = 3072,
  H = 256;
export default {
  id: 'handtape',
  fig: '图1.3-2',
  title: '手拉纸带测速度',
  stampText: '测量',
  predict: {
    q: '你先慢后快地拉同一条纸带，计时器仍每隔 0.02 s 打一点。哪一段的点距更大？',
    options: ['慢拉时', '快拉时', '两段一样大'],
    answer: 1,
    hint: '每个点是打点那一刻纸带的位置。',
  },
  conclusion: {
    quote: '用包含 E 点的一小段平均速度，可以估计纸带经过 E 时的瞬时速度。',
    why: '尺量位移，打点间隔给出时间。DG 有五个间隔，DF 有三个，两段都包含 E。对于平滑变化的速度，缩短取样时间通常能更好地反映附近的运动；取得太短，同样的读尺误差又会占更大比例。',
    src: '人教版高中物理必修第一册第 22–24 页',
  },
  create(ctx) {
    const group = new THREE.Group(),
      timer = tickerHead();
    group.add(timer.group);
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
    const texture = canvasTex(W, H, () => {}),
      ink = texture.canvas.getContext('2d');
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(LENGTH, WIDTH),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
    paper.rotation.x = -Math.PI / 2;
    group.add(paper);
    const ruler = rulerMesh({
      length: (LENGTH * 4096) / 4080,
      width: 0.032,
      divisions: 340,
      every: 10,
      labelEvery: 20,
    });
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
    const folded = new THREE.Mesh(new THREE.PlaneGeometry(0.021, WIDTH), paint(0xf5d99d, { side: THREE.DoubleSide }));
    folded.rotation.order = 'ZXY';
    folded.rotation.x = -Math.PI / 2;
    folded.rotation.z = -0.32;
    folded.position.set(-0.005, 0.0036, 0);
    grip.add(folded);
    group.add(grip);
    let pulled = 0,
      origin = 0,
      trace = null,
      powered = false,
      phase = 'pull',
      segment = null,
      step = 0,
      near = false,
      travelTime = 0,
      from,
      ui,
      records,
      graph;
    const estimates = [];
    let results = [],
      readings = [],
      dragBase = 0,
      pulling = false,
      lastMove = 0;
    const now = () => performance.now() / 1000;
    function positionPaper(left, y, z) {
      paper.position.set(left + LENGTH / 2, y, z);
      grip.position.set(left + 0.015, y, z);
      const exposed = -0.039 - left;
      hit.scale.set((exposed + 0.012) / 0.031, 1, 2);
      hit.position.x = exposed / 2 - 0.02;
    }
    function layout() {
      positionPaper(-LEAD - pulled, SLOT_Y, 0);
    }
    function draw() {
      ink.fillStyle = '#ffefd0';
      ink.fillRect(0, 0, W, H);
      ink.fillStyle = '#dbc9a6';
      ink.fillRect(0, 0, W, 2);
      ink.fillRect(0, H - 2, W, 2);
      const px = (x) => ((LEAD + x) / LENGTH) * W;
      ink.fillStyle = '#47423c';
      for (const m of trace?.marks || []) {
        ink.beginPath();
        ink.arc(px(m.x), H * 0.57, 4, 0, Math.PI * 2);
        ink.fill();
      }
      if (segment) {
        for (const [j, name, y, color] of [
          [0, 'D', 95, '#236469'],
          [1, 'E', 220, '#39444c'],
          [5, 'G', 95, step >= 2 ? '#998875' : '#a75035'],
          ...(step >= 2 ? [[3, 'F', 55, '#a75035']] : []),
        ]) {
          const x = px(segment[j].x);
          ink.fillStyle = color;
          ink.fillRect(x - 2, Math.min(y + 4, H * 0.57), 4, Math.abs(H * 0.57 - y - 4));
          ink.font = 'bold 48px sans-serif';
          ink.textAlign = name === 'D' ? 'right' : 'left';
          ink.fillText(name, x + (name === 'D' ? -4 : 4), y);
        }
        if (step >= 2) {
          ink.fillStyle = '#9c8977';
          ink.fillRect(px(segment[5].x) - 1, H * 0.57, 2, 24);
        }
      } else {
        ink.fillStyle = '#776956';
        ink.font = '40px sans-serif';
        ink.textAlign = 'left';
        ink.fillText('← 拉', 9, 100);
      }
      texture.needsUpdate = true;
    }
    function target() {
      if (near) return null;
      if (phase === 'pull') return powered ? grip : timer.group;
      return phase === 'laying' ? null : paper;
    }
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'trace', title: '手拉打点', todo: '接通计时器，向左拉纸带。', target },
        { id: 'long', title: '量 DG', todo: '用尺量出五个打点间隔的位移。', target },
        { id: 'short', title: '量 DF', todo: '保留 D 的读数，在同一把尺上读 F。', target },
      ],
    });
    function inform() {
      if (phase === 'pull')
        bar.say(
          powered
            ? pulled > 0.005
              ? '继续向左拉，改变手速看点距。拉好后点计时器关电。'
              : '抓住计时器左边露出的纸带端，向左拉。'
            : '点计时器通电，再抓住纸带左端往左拉。',
        );
      else if (phase === 'removed')
        bar.say(
          segment ? '点台前尺旁的纸带，近看自己留下的点。' : '可分辨的连续点不够。点计时器穿新带，通电后持续向左拉。',
        );
      else if (phase === 'stop') bar.say('已关电。点刚才拉出的纸带，把它平放到尺旁。');
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function toggle() {
      enter();
      if (phase === 'removed') {
        reset();
        return;
      }
      if (phase !== 'pull') return;
      if (powered) {
        trace.sample(now(), pulled);
        powered = false;
        phase = 'stop';
        draw();
      } else {
        origin = now();
        trace = handTrace(origin, pulled);
        powered = true;
        draw();
      }
      inform();
    }
    function take() {
      if (phase !== 'stop') return;
      segment = comparison(trace.marks);
      from = paper.position.clone();
      phase = 'laying';
      travelTime = 0;
      if (segment) bar.done('trace');
      bar.say('把这条纸带平放到台前的尺旁。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      if (step < 3) inform();
      else bar.say('点同一条纸带的另一段，可以再估一个时刻；点计时器换新带。');
    }
    function chooseAt(ray) {
      if (!segment) return;
      if (step === 0 || step === 3) {
        const hit = ray.intersectObject(paper, false)[0];
        if (hit) {
          const x = group.worldToLocal(hit.point.clone()).x - ZERO;
          if (x < segment[0].x - 0.003 || x > segment[5].x + 0.003) {
            const next = comparison(trace.marks, x);
            if (next[0].tick !== segment[0].tick) {
              segment = next;
              step = 0;
              readings = [];
              results = [];
              draw();
            }
          }
        }
      }
      inspect();
    }
    function report() {
      bar.say('同一 E 点附近，DG 段 ' + results[0].toFixed(3) + ' m/s，DF 段 ' + results[1].toFixed(3) + ' m/s。');
    }
    function instruction() {
      if (step === 3) {
        report();
        return;
      }
      bar.say(
        [
          '沿 D 点向下，在尺上点出它的位置。尺上数字是厘米，每小格 1 mm。',
          'D 在 ' + readings[0] + ' mm。沿 G 点读尺，DG 有五个间隔，共 0.10 s。',
          'DG 段 ' + results[0]?.toFixed(3) + ' m/s。保留 D 的读数，沿 F 点读尺：三个间隔，共 0.06 s。',
        ][step],
      );
    }
    function inspect() {
      if (!segment || phase !== 'removed') return;
      const left = ZERO + segment[0].x,
        right = ZERO + segment[5].x;
      near = true;
      bar.near(true);
      ctx.look(
        [(left + right) / 2, 0.003, (RULE_Z + LANE) / 2],
        [0, 1, 0.08],
        Math.max(0.15, (right - left + 0.025) * 2.4),
        leave,
      );
      instruction();
    }
    function read(x) {
      if (!near || step >= 3) return;
      const j = [0, 5, 3][step],
        name = ['D', 'G', 'F'][step],
        mm = Math.round((x - ZERO) * 1000);
      if (Math.abs(mm - segment[j].x * 1000) > 1) {
        bar.say('再看 ' + name + ' 点正下方的刻线，每小格是 1 mm。');
        return;
      }
      readings[step] = mm;
      if (step) {
        const dist = mm - readings[0],
          dt = j * PERIOD,
          v = dist / 1000 / dt;
        results.push(v);
        const firstMoving = trace.marks.find((m) => m.x > trace.marks[0].x);
        const time = (segment[1].tick - firstMoving.tick) * PERIOD;
        records.el.hidden = false;
        records.add([time.toFixed(2), 'D' + name, dist, dt.toFixed(2), v.toFixed(3)]);
        if (step === 2) {
          const previous = estimates.find((p) => p[0] === time);
          if (previous) previous[1] = v;
          else estimates.push([time, v]);
          estimates.sort((a, b) => a[0] - b[0]);
          graph.el.hidden = false;
          graph.draw();
        }
        bar.done(step === 1 ? 'long' : 'short');
      }
      step++;
      draw();
      instruction();
    }
    function reset() {
      powered = near = pulling = false;
      ctx.back();
      bar.near(false);
      phase = 'pull';
      pulled = step = 0;
      segment = trace = null;
      results = [];
      readings = [];
      records.clear();
      records.el.hidden = true;
      estimates.length = 0;
      graph.el.hidden = true;
      graph.draw();
      bar.undo('trace', 'long', 'short');
      layout();
      draw();
      inform();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: grip,
          plane: 'xz',
          offset: SLOT_Y,
          enabled: () => phase === 'pull',
          hint: '按住纸带端往左拉',
          onStart() {
            enter();
            dragBase = pulled;
            pulling = true;
            lastMove = now();
            if (powered) trace.sample(now(), pulled);
          },
          onDrag(p, start) {
            if (!start) return;
            lastMove = now();
            pulled = clamp(dragBase + start.x - p.x, pulled, LIMIT);
            if (powered) trace.sample(now(), pulled);
            layout();
            draw();
          },
          onEnd() {
            pulling = false;
            if (powered) trace.sample(now(), pulled);
            if (!powered && pulled > 0.01)
              bar.say('纸带已经移动，计时器还没通电。点计时器后继续拉，或在笔记本换新带。');
            else inform();
          },
        },
        {
          obj: ruler,
          plane: 'xz',
          offset: 0.0035,
          enabled: () => near,
          hint: '沿纸带上的点读尺',
          onStart(p) {
            if (p) read(p.x);
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: timer.group,
            enabled: () => !near && (phase === 'pull' || phase === 'removed'),
            hint: '接通或关闭计时器',
            onTap: toggle,
          },
          {
            obj: paper,
            enabled: () => !near && (phase === 'stop' || phase === 'removed'),
            hint: '拿起纸带或近看',
            onTap(ray) {
              if (phase === 'stop') take();
              else chooseAt(ray);
            },
          },
        ],
      },
    );
    layout();
    draw();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.72, d: 0.33, h: 0.085 },
      view: { elev: 35, azim: 0, lookY: 0.33, margin: 1.05 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['E 时刻 / s', '区间', '位移 / mm', '间隔 / s', '平均速度 / (m/s)']);
        graph = chart({
          x: { label: 't / s', min: 0, max: 0.5 },
          y: { label: 'v / (m/s)', min: 0, max: 0.1 },
          fit: true,
          series: [{ points: estimates, line: false, dots: true, color: '#28656f' }],
          legend: '第一个移开的打点为零时刻；每个点表示用 DF 段估计的 E 点速度。回全景点纸带另一处可继续描点。',
        });
        records.el.hidden = graph.el.hidden = true;
        ui.data.append(records.el, graph.el);
        ui.notes.append(
          note('50 Hz 计时器每隔 0.02 s 打一点。取下纸带后，用同一把尺量包含 E 的两个区间。'),
          buttons([{ text: '换新纸带', onClick: reset }]).el,
        );
        inform();
      },
      update(dt) {
        timer.update(powered, powered ? now() - origin : 0);
        bar.update(dt);
        if (powered && (!pulling || now() - lastMove > 0.06)) trace.sample(now(), pulled);
        if (phase === 'laying') {
          travelTime += dt;
          const u = Math.min(1, travelTime / 0.55),
            s = u * u * (3 - 2 * u);
          paper.position.copy(from).lerp(new THREE.Vector3(ZERO - LEAD + LENGTH / 2, 0.004, LANE), s);
          paper.position.y += 0.035 * Math.sin(u * Math.PI);
          grip.position.copy(paper.position);
          grip.position.x += 0.015 - LENGTH / 2;
          if (u === 1) {
            phase = 'removed';
            draw();
            inform();
          }
        }
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        texture.dispose();
      },
    };
  },
};
