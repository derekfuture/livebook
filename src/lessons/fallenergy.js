// 人教版必修二图 8.5-2。测量依据是该次释放留下的纸带，读数不取自运动模型的速度。
import * as THREE from 'three';
import { fallingRig } from './kit/ticker/fallRig.js';
import { fallingTape, energyPoints, GRAVITY } from './kit/ticker/fall.js';
import { PERIOD } from './kit/ticker/motion.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { buttons, note, table, h } from './kit/ui.js';

const X = 0.13,
  HEAD = 0.365,
  LEAD = 0.047,
  TRAVEL = 0.255,
  MASS = 0.2,
  RESISTANCE = 0.1,
  L = 0.355,
  WIDTH = 0.027;
const BASE = HEAD - LEAD,
  ZERO = -0.16,
  LANE = 0.116,
  RULER_Z = LANE + WIDTH / 2 + 0.016;
export default {
  id: 'fallenergy',
  fig: '图8.5-2',
  title: '验证下落物体的机械能变化',
  stampText: '测量',
  predict: {
    q: '重物拉着纸带下落，计时器和空气带来阻力。重力势能的减少量和动能的增加量，通常哪一个略大？',
    options: ['势能减少量', '两者必定完全相等', '动能增加量'],
    answer: 0,
    hint: '从纸带上独立测出高度差和两个速度。',
  },
  conclusion: {
    page: 99, rect: [63.77, 170.17, 378.83, 254.29],
    quote: '机械能守恒定律告诉我们，在只有重力或弹力做功的系统内，动能与势能相互转化时总的机械能保持不变。',
    why: '比较同一重物在 A、B 两处的能量变化。下落高度差从纸带直接量，两个瞬时速度用相邻前后两点的平均速度估计。纸带摩擦和空气阻力做负功，机械能会减少；毫米读尺也会影响两项实测值的差。',
    src: '课本第 95 页 · 第八章 第5节 实验：验证机械能守恒定律',
  },
  create(ctx) {
    const { group, head, jaw, weight, tape, tex, ink, ruler, pencil, vertical, flat } = fallingRig();
    const now = () => performance.now() / 1000;
    let run,
      released = 0,
      powerAt = 0,
      on = false,
      phase = 'ready',
      transfer = 0,
      from,
      restStamp = false,
      near = false,
      a = null,
      b = null,
      spans = [],
      pair = [],
      ui,
      rows,
      summary,
      report,
      fields;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'drop', title: '打出下落纸带', todo: '接通计时器，再松开纸带。', target },
        { id: 'dist', title: '量高度差和速度', todo: '沿尺测 A、B 及相邻两点的距离。', target },
        { id: 'energy', title: '比较能量变化', todo: '用自己的读数求势能减少量和动能增加量。', target },
      ],
    });
    function target() {
      if (near) return null;
      if (phase === 'ready') return on ? jaw : head.group;
      if (phase === 'landed') return on ? head.group : tape;
      if (phase === 'bench') return enough() ? tape : weight;
      return null;
    }
    const px = (x) => ((LEAD + x) / L) * tex.canvas.width;
    function nextEnds() {
      if (b === null || spans.length >= 3) return null;
      return [
        [a, b],
        [a - 1, a + 1],
        [b - 1, b + 1],
      ][spans.length];
    }
    function draw() {
      const { width: w, height: h } = tex.canvas;
      ink.fillStyle = '#fff0d2';
      ink.fillRect(0, 0, w, h);
      ink.fillStyle = '#d0be99';
      ink.fillRect(0, 0, w, 2);
      ink.fillRect(0, h - 2, w, 2);
      const ends = nextEnds();
      if (ends) {
        const [i, j] = ends;
        ink.fillStyle = '#dfd3b1';
        ink.fillRect(px(run.marks[i].x), h * 0.32, px(run.marks[j].x) - px(run.marks[i].x), h * 0.37);
      }
      if (restStamp) {
        ink.fillStyle = '#393b39';
        ink.beginPath();
        ink.arc(px(0), h * 0.51, 6.5, 0, Math.PI * 2);
        ink.fill();
      }
      for (const mark of run?.marks || []) {
        ink.fillStyle = '#393b39';
        ink.beginPath();
        ink.arc(px(mark.x), h * 0.51, 6.5, 0, Math.PI * 2);
        ink.fill();
      }
      for (const [idx, name, color] of [
        [a, 'A', '#27636c'],
        [b, 'B', '#9e5033'],
      ]) {
        if (idx === null) continue;
        const x = px(run.marks[idx].x);
        ink.fillStyle = color;
        ink.fillRect(x - 1, 70, 3, 60);
        ink.font = 'bold 49px sans-serif';
        ink.textAlign = 'center';
        ink.fillText(name, x, 62);
      }
      for (const [i, j] of [
        [a, b],
        [a - 1, a + 1],
        [b - 1, b + 1],
      ].slice(0, spans.length)) {
        ink.fillStyle = '#94856c';
        for (const index of [i, j]) ink.fillRect(px(run.marks[index].x) - 1, 141, 2, 29);
      }
      if (ends)
        ends.forEach((i, k) => {
          const x = px(run.marks[i].x);
          ink.fillStyle = k ? '#a15338' : '#27636c';
          ink.fillRect(x - 2, 135, 4, 53);
        });
      tex.needsUpdate = true;
    }
    function setup() {
      run = fallingTape(MASS, RESISTANCE, TRAVEL);
      phase = 'ready';
      on = false;
      near = false;
      a = b = null;
      spans = [];
      pair = [];
      weight.position.set(X, BASE, 0);
      tape.position.set(X, BASE + L / 2, 0);
      tape.quaternion.copy(vertical);
      restStamp = false;
      jaw.rotation.y = 0;
      draw();
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function switchPower() {
      enter();
      if (phase === 'lay' || (phase === 'landed' && !on)) return;
      const t = now();
      on = !on;
      if (on) {
        powerAt = t;
        if (phase === 'ready') {
          restStamp = true;
          draw();
        }
      }
      if (phase === 'fall') run.power(on, t - released);
      guide();
    }
    function release() {
      if (phase !== 'ready') return;
      enter();
      released = now();
      if (on) run.power(true, powerAt - released);
      phase = 'fall';
      jaw.rotation.y = -0.65;
      guide();
    }
    function take() {
      if (phase === 'landed') {
        if (on) {
          bar.say('先关计时器，再解开重物上的纸带夹。');
          return;
        }
        transfer = 0;
        from = tape.position.clone();
        phase = 'lay';
        bar.say('解开纸带夹，把刚才打出的这条纸带放到尺旁。');
        return;
      }
      if (phase === 'bench' && !near) {
        inspect();
        return;
      }
    }
    function enough() {
      const ids = energyPoints(run.marks);
      return ids.length >= 2 && ids.at(-1) - ids[0] >= 3 && run.marks[ids.at(-1)].x - run.marks[ids[0]].x >= 0.04;
    }
    function guide() {
      if (phase === 'ready')
        bar.say(on ? '计时器已通电。点上端的夹子松手，观察重物下落。' : '先点计时器通电，再松开上端的纸带夹。');
      else if (phase === 'fall') bar.say(on ? '注意重物下落时点距怎样变。' : '重物仍在下落，计时器没有打点。');
      else if (phase === 'landed')
        bar.say(on ? '重物已落在垫上。关计时器，再取纸带。' : '点纸带，把它从重物的夹子上取下。');
      else if (phase === 'bench' && !near)
        bar.say(
          !enough()
            ? '可测的连续点不够。向上拖重物回到计时器下方，换新带再试。'
            : spans.length === 3
              ? '展开笔记本，用 A、B 两处的读数比较能量变化。'
              : '点台前的纸带近看，在同一条带上选 A、B。',
        );
      else if (near) {
        if (a === null) bar.say('点纸带上较早的一个点作为 A，两侧都要有相邻点。');
        else if (b === null) bar.say('再点后方较远的点作 B；点 A 可以重选起点。');
        else if (spans.length < 3) {
          const task = ['量 A 到 B 的高度差', '量 A 前后两个相邻点的距离', '量 B 前后两个相邻点的距离'][spans.length];
          bar.say(
            task +
              '：' +
              (pair.length
                ? '已读 ' + pair[0] + ' mm，沿同一把尺读右端。'
                : '从纸带标出的左端读到右端，可依次点尺或沿尺拖。'),
          );
        } else bar.say('已量到高度差和两个速度。回全景，展开笔记本比较能量。');
      }
    }
    function inspect() {
      if (!enough()) {
        guide();
        return;
      }
      near = true;
      bar.near(true);
      const last = run.marks.at(-1).x;
      ctx.look(
        [ZERO + last / 2, 0.004, (LANE + RULER_Z) / 2],
        [0, 1, 0.08],
        Math.max(0.22, (last + 0.03) * 1.48),
        leave,
      );
      guide();
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function choose(ray) {
      if (!near) {
        take();
        return;
      }
      if (b !== null) return;
      const hit = ray.intersectObject(tape, false)[0];
      if (!hit) return;
      const x = group.worldToLocal(hit.point.clone()).x - ZERO;
      const ids = energyPoints(run.marks),
        idx = run.marks.reduce((best, m, i) => (Math.abs(m.x - x) < Math.abs(run.marks[best].x - x) ? i : best), 0);
      if (!ids.includes(idx) || Math.abs(run.marks[idx].x - x) > 0.008) {
        bar.say('选有点迹的位置，并给它前后各留一个连续的打点间隔。');
        return;
      }
      if (idx === a) {
        a = null;
        draw();
        guide();
        return;
      }
      if (a === null) {
        if (!ids.some((i) => i >= idx + 3 && run.marks[i].x - run.marks[idx].x >= 0.04)) {
          bar.say('这个点太靠后，选一个较早的 A，给 B 留出距离。');
          return;
        }
        a = idx;
      } else if (idx < a + 3 || run.marks[idx].x - run.marks[a].x < 0.04) {
        bar.say('B 要在 A 后方，间距至少 4 cm，让毫米读尺误差所占比例小些。');
        return;
      } else b = idx;
      draw();
      guide();
    }
    function read(x) {
      const ends = nextEnds();
      if (!ends) return false;
      const mm = Math.round((x - ZERO) * 1000),
        idx = ends[pair.length],
        want = run.marks[idx].x * 1000;
      if (Math.abs(mm - want) > 1.5) {
        bar.say('再看所标' + (pair.length ? '右' : '左') + '端正下方的毫米刻线。');
        return false;
      }
      pair.push(mm);
      if (pair.length === 2) {
        const distance = pair[1] - pair[0];
        spans.push(distance);
        rows.el.hidden = false;
        rows.add([
          ['A 到 B', 'A 点前后', 'B 点前后'][spans.length - 1],
          pair[0] + ' → ' + pair[1],
          String(distance),
          spans.length === 1 ? '—' : (distance / 1000 / (2 * PERIOD)).toFixed(3),
        ]);
        pair = [];
        draw();
        if (spans.length === 3) {
          bar.done('dist');
          report.hidden = false;
          bar.say('B 点速度约 ' + (distance / 1000 / (2 * PERIOD)).toFixed(3) + ' m/s。回全景，展开笔记本比较能量。');
        } else if (spans.length === 1) bar.say('A 到 B 下降 ' + distance + ' mm。接着沿尺量 A 前后两个点之间的距离。');
        else
          bar.say('A 点速度约 ' + (distance / 1000 / (2 * PERIOD)).toFixed(3) + ' m/s。再量 B 前后两个点之间的距离。');
        return true;
      }
      guide();
      return true;
    }
    function check() {
      if (spans.length !== 3) return;
      const u = (MASS * GRAVITY * spans[0]) / 1000,
        v1 = spans[1] / 1000 / (2 * PERIOD),
        v2 = spans[2] / 1000 / (2 * PERIOD),
        k = (MASS * (v2 * v2 - v1 * v1)) / 2;
      const [guessedU, guessedK] = fields.map((f) => f.valueAsNumber);
      if (!Number.isFinite(guessedU) || Math.abs(guessedU - u) > 0.006) {
        bar.say('用 m g Δh 求势能减少量，先把毫米换成米。');
        return;
      }
      if (!Number.isFinite(guessedK) || Math.abs(guessedK - k) > 0.006) {
        bar.say('分别算 B 和 A 的动能，再用 B 减 A。重物在 A 处已经有速度。');
        return;
      }
      if (!bar.has('energy')) {
        summary.el.hidden = false;
        summary.add([
          String(summary.rows.length + 1),
          String(spans[0]),
          v1.toFixed(3),
          v2.toFixed(3),
          u.toFixed(3),
          k.toFixed(3),
        ]);
      }
      bar.done('energy');
      bar.say(
        '你的读数：势能减少 ' +
          u.toFixed(3) +
          ' J，动能增加 ' +
          k.toFixed(3) +
          ' J。' +
          (u >= k ? '势能多减少 ' : '动能多增加 ') +
          Math.abs(Number(u.toFixed(3)) - Number(k.toFixed(3))).toFixed(3) +
          ' J。',
      );
    }
    function anotherPair() {
      if (phase !== 'bench' || !enough()) return;
      a = b = null;
      spans = [];
      pair = [];
      rows.clear();
      rows.el.hidden = report.hidden = true;
      fields.forEach((f) => (f.value = ''));
      bar.undo('dist', 'energy');
      draw();
      ui.fold(true);
      inspect();
    }
    function restart() {
      ctx.back();
      bar.near(false);
      setup();
      pencil.visible = false;
      rows.clear();
      summary.clear();
      summary.el.hidden = true;
      rows.el.hidden = report.hidden = true;
      fields.forEach((f) => (f.value = ''));
      bar.undo('drop', 'dist', 'energy');
      guide();
    }
    let startX = null,
      lastX = 0,
      anchored = false;
    function preview(x) {
      lastX = x;
      pencil.visible = true;
      pencil.position.x = x;
      bar.say('尺上 ' + Math.round((x - ZERO) * 1000) + ' mm。沿尺微调，松手记下读数。');
    }
    const pointer = draggable(
      group,
      [
        {
          obj: ruler,
          plane: 'xz',
          offset: 0.0035,
          enabled: () => near && b !== null && spans.length < 3,
          hint: '沿两端的点读尺',
          onStart(p) {
            if (!p) return;
            startX = p.x;
            anchored = false;
            preview(p.x);
          },
          onDrag(p) {
            const ends = nextEnds();
            if (
              startX !== null &&
              !anchored &&
              !pair.length &&
              ends &&
              Math.abs(p.x - startX) > 0.002 &&
              Math.abs((startX - ZERO) * 1000 - run.marks[ends[0]].x * 1000) <= 1.5
            ) {
              anchored = read(startX);
            }
            preview(p.x);
          },
          onEnd() {
            if (startX !== null) read(lastX);
            startX = null;
            pencil.visible = false;
          },
        },
        {
          obj: weight,
          plane: 'xy',
          offset: 0,
          keepOffset: true,
          enabled: () => !near && ['ready', 'landed', 'bench'].includes(phase),
          hint: () => (phase === 'bench' ? '向上拖回计时器下方，重新装带' : '释放重物或解开纸带'),
          onDrag(p) {
            if (phase === 'bench') weight.position.y = clamp(p.y, BASE - TRAVEL, BASE);
          },
          onEnd(moved) {
            if (!moved || phase !== 'bench') return;
            if (weight.position.y >= BASE - 0.03) restart();
            else {
              weight.position.y = BASE - TRAVEL;
              bar.say('要重新放落，把重物拖回计时器正下方再松手。');
            }
          },
          onTap() {
            if (phase === 'ready') release();
            else if (phase === 'landed') take();
            else bar.say('向上拖回计时器下方可重新装带。只换测量点时，保留台面上的纸带。');
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: head.group,
            enabled: () => !near && (phase === 'ready' || phase === 'fall' || (phase === 'landed' && on)),
            hint: '计时器电源',
            onTap: switchPower,
          },
          { obj: jaw, enabled: () => phase === 'ready', hint: '松开上端纸带夹', onTap: release },
          {
            obj: tape,
            enabled: () => phase === 'landed' || phase === 'bench',
            hint: '取带、近看或选点',
            onTap: choose,
          },
        ],
      },
    );
    setup();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.65, d: 0.4, h: 0.71 },
      view: { elev: 14, azim: -9, lookY: 0.45, margin: 1.04 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['区间', '两端读数 / mm', '距离 / mm', '中点速度 / (m/s)']);
        summary = table(['组', '下降 / mm', 'vA / (m/s)', 'vB / (m/s)', '势能减少 / J', '动能增加 / J']);
        summary.el.hidden = rows.el.hidden = true;
        fields = ['势能减少量 / J', '动能增加量 / J'].map((s) =>
          h('input', { type: 'number', step: '.001', 'aria-label': s, style: 'width:5em' }),
        );
        report = h(
          'div',
          { hidden: true },
          note(
            '重物 0.200 kg，取 g = 9.8 m/s²。高度差来自 A 到 B；A、B 的速度均用前后两点的距离除以 0.04 s。结果用焦耳表示，可保留两位或三位小数。',
          ),
          ...fields.map((f, i) => h('label', {}, ['势能减少 / J ', ' 动能增加 / J '][i], f)),
          buttons([{ text: '比较两项变化', onClick: check }]).el,
        );
        ui.data.append(rows.el, report, summary.el);
        ui.notes.append(
          note('计时器 50 Hz。下落时纸带受到小的阻力，比较应使用同一次释放留下的记录。'),
          buttons([
            { text: '在原纸带另选两点', onClick: anotherPair },
            { text: '换新带重做', onClick: restart },
          ]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        head.update(on, on ? now() - powerAt : 0);
        if (phase === 'fall') {
          const t = now() - released,
            n = run.marks.length;
          run.advance(t);
          const x = run.position(t);
          weight.position.y = BASE - x;
          tape.position.y = BASE + L / 2 - x;
          if (n !== run.marks.length) draw();
          if (t >= run.end) {
            phase = 'landed';
            guide();
          }
        } else if (phase === 'lay') {
          transfer += dt;
          const u = clamp(transfer / 0.7, 0, 1),
            s = u * u * (3 - 2 * u);
          tape.position.copy(from).lerp(new THREE.Vector3(ZERO - LEAD + L / 2, 0.004, LANE), s);
          tape.position.z += 0.055 * Math.sin(Math.PI * u);
          tape.position.y += 0.055 * Math.sin(Math.PI * u);
          tape.quaternion.copy(vertical).slerp(flat, s);
          if (u === 1) {
            phase = 'bench';
            if (enough()) bar.done('drop');
            draw();
            guide();
          }
        }
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        tex.dispose();
      },
    };
  },
};
