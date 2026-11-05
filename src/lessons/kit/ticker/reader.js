// 纸带放在实验台前沿。主视图和近看共用同一件器材、同一份读数。
import * as THREE from 'three';
import { canvasTex } from '../props.js';
import { clamp } from '../interact.js';
import { buttons } from '../ui.js';
import { PERIOD, TRAVEL, centers } from './motion.js';

const WIDTH = 0.36,
  DEPTH = 0.155,
  Z = 0.145,
  Y = 0.009;
const WINDOW_MM = 100; // 固定放大倍率；看远处的点只平移，从不重画成另一种分度。
const W = 1440,
  H = 420,
  LEFT = 60,
  RIGHT = W - LEFT;
export function tapeReader(group, { look, back }, bar, onViewChange) {
  const texture = canvasTex(W, H, () => {});
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, DEPTH), new THREE.MeshBasicMaterial({ map: texture }));
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, Y, Z);
  group.add(paper);
  const bench = canvasTex(W, H, () => {});
  const benchInk = bench.canvas.getContext('2d');
  paper.material.transparent = true;
  function showBench(marks = []) {
    const ctx = benchInk,
      x = (mm) => LEFT + (mm * W) / (WIDTH * 1000);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ead7af';
    ctx.fillRect(x(-4), 194, x(340) - x(-4), 60);
    for (let mm = 0; mm <= 340; mm++) {
      ctx.fillStyle = '#615747';
      ctx.fillRect(x(mm), 194, 1.5, mm % 10 === 0 ? 19 : mm % 5 === 0 ? 12 : 7);
      if (mm % 10 === 0) {
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(mm), x(mm), 236);
      }
    }
    ctx.font = '14px sans-serif';
    ctx.fillText('mm', x(5), 250);
    if (marks.length) {
      ctx.fillStyle = '#fff6dd';
      ctx.fillRect(x(-4), 147, x(340) - x(-4), 46);
      ctx.fillStyle = '#343a40';
      for (const mark of marks) {
        ctx.beginPath();
        ctx.arc(x((mark.x - marks[0].x) * 1000), 172, 2.6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    bench.needsUpdate = true;
    paper.material.map = bench;
  }
  showBench();
  const g = texture.canvas.getContext('2d');
  let benchHasTape = false;
  const sheets = [];
  const archive = document.createElement('select');
  archive.setAttribute('aria-label', '选纸带');
  let sheet,
    slots = [],
    slot = 0,
    probe,
    inspecting = false,
    handle = -1,
    low = -5,
    panStart = null,
    animation = 0;
  let readings = [0, 0],
    placed = [false, false],
    message = '';
  let onRecord, onGraph;
  const controls = buttons([
    { text: '近看纸带', onClick: inspect },
    { text: '上一个计数点', onClick: () => move(-1) },
    { text: '下一个计数点', onClick: () => move(1) },
    {
      text: '看图表',
      onClick: () => {
        leave();
        onGraph(sheet);
      },
    },
  ]);
  const el = document.createElement('div');
  const manual = document.createElement('div');
  manual.className = 'ctl';
  const fields = ['A / mm', 'B / mm'].map((text) => {
    const label = document.createElement('label'),
      input = document.createElement('input');
    input.type = 'number';
    input.step = '0.1';
    input.style.width = '5em';
    input.setAttribute('aria-label', text);
    label.append(text + ' ', input);
    manual.append(label);
    return input;
  });
  const record = buttons([
    {
      text: '记录尺上读数',
      onClick: () => {
        const values = fields.map((input) => input.valueAsNumber);
        if (!values.every(Number.isFinite) || !sheet || sheet.complete || sheet.used.has(slots[slot])) return;
        readings = values;
        placed = [true, true];
        handle = 1;
        finish();
      },
    },
  ]);
  el.append(archive, controls.el, manual, record.el);
  el.hidden = true;
  function leave() {
    if (inspecting) {
      back();
      inspecting = false;
      showBench(probe ?? sheet?.run.marks);
      stopPan();
      bar.near(false);
      onViewChange();
    }
  }
  function inspect() {
    if (el.hidden && !probe) return;
    if (!benchHasTape && sheet && !probe) {
      choose(sheets.indexOf(sheet));
      benchHasTape = true;
    }
    paper.material.map = texture;
    inspecting = true;
    bar.near(true);
    onViewChange();
    look([0, Y, Z], [0, 1, 0.16], 0.56, () => {
      inspecting = false;
      showBench(probe ?? sheet?.run.marks);
      stopPan();
      bar.near(false);
      onViewChange();
    });
  }
  const mm = (i) => (sheet.run.marks[i].x - sheet.run.marks[0].x) * 1000;
  const px = (v) => LEFT + ((v - low) / WINDOW_MM) * (RIGHT - LEFT);
  function label(text, x, y, size = 45, color = '#34404a', align = 'left') {
    g.fillStyle = color;
    g.font = size + 'px sans-serif';
    g.textAlign = align;
    g.fillText(text, x, y);
  }
  function dot(x, y, r = 5, color = '#303940') {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, 2 * Math.PI);
    g.fill();
  }
  function clearPaper() {
    g.fillStyle = '#fff6dd';
    g.fillRect(0, 0, W, H);
  }
  const timeAt = (i) => ((i - sheet.origin) * PERIOD).toFixed(2);
  function nextUnmeasured() {
    return slots.findIndex((i) => !sheet.used.has(i));
  }
  function canContinue() {
    return sheet.used.size === 1 && sheet.used.has(slots[slot]) && nextUnmeasured() >= 0;
  }
  function stopPan() {
    cancelAnimationFrame(animation);
    animation = 0;
  }
  function panTo(value) {
    stopPan();
    const to = clamp(value, -5, Math.max(-5, mm(sheet.run.marks.length - 1) - WINDOW_MM + 5));
    const from = low,
      start = performance.now();
    if (Math.abs(to - from) < 0.01) return;
    function frame(now) {
      const u = Math.min(1, (now - start) / 350);
      low = from + (to - from) * u * (2 - u);
      draw();
      animation = u < 1 ? requestAnimationFrame(frame) : 0;
    }
    animation = requestAnimationFrame(frame);
  }
  function reveal(i) {
    const x = mm(i);
    if (x < low + 2 || x > low + WINDOW_MM - 2) panTo(x - WINDOW_MM * 0.35);
  }
  function draw() {
    if (!sheet || probe) return;
    clearPaper();
    const marks = sheet.run.marks,
      c = slots[slot],
      a = c - 5,
      b = c + 5;
    label(sheet.run.load * 1000 + ' g · 第 ' + sheet.trial + ' 条纸带', LEFT, 46, 43);
    label('相邻两点相隔 0.02 s', RIGHT, 46, 39, '#575247', 'right');
    g.fillStyle = '#f5ead2';
    g.fillRect(LEFT, 77, RIGHT - LEFT, 105);
    g.save();
    g.beginPath();
    g.rect(LEFT, 69, RIGHT - LEFT, 120);
    g.clip();
    g.fillStyle = '#e6dab9';
    g.fillRect(px(mm(a)), 130, px(mm(b)) - px(mm(a)), 39);
    for (let i = 0; i < marks.length; i++) {
      const x = px(mm(i));
      if (x < LEFT - 8 || x > RIGHT + 8) continue;
      dot(x, 159, i === c ? 8 : i === a || i === b ? 6 : 3.5, i === c ? '#286a71' : '#343a40');
    }
    g.restore();
    if (px(mm(a)) >= LEFT && px(mm(a)) <= RIGHT)
      label('A ' + timeAt(a) + ' s', Math.max(180, px(mm(a))), 120, 32, '#286a71', 'right');
    if (px(mm(b)) >= LEFT && px(mm(b)) <= RIGHT)
      label('B ' + timeAt(b) + ' s', Math.min(RIGHT - 125, px(mm(b))), 120, 32, '#a44730', 'left');
    g.fillStyle = '#ead7af';
    g.fillRect(LEFT, 189, RIGHT - LEFT, 79);
    for (let v = Math.max(0, Math.ceil(low)); v <= low + WINDOW_MM; v++) {
      const x = px(v);
      g.fillStyle = '#615747';
      g.fillRect(x, 189, 2, v % 10 === 0 ? 31 : v % 5 === 0 ? 22 : 10);
      if (v % 10 === 0) label(String(v), x, 251, 33, '#554d42', 'center');
    }
    label('mm', W - 4, 251, 28, '#554d42', 'right');
    // 已读的两处在原位留短线，学生换测量时刻仍能找到上一段。
    g.fillStyle = '#867b68';
    for (const values of sheet.used.values()) {
      for (const value of values) {
        const x = px(value);
        if (x >= LEFT && x <= RIGHT) g.fillRect(x - 1, 168, 2, 19);
      }
    }
    readings.forEach((v, k) => {
      if (!placed[k] && handle !== k) return;
      const x = px(v),
        color = k ? '#a44730' : '#286a71';
      if (x >= LEFT && x <= RIGHT) {
        g.fillStyle = color;
        g.fillRect(x - 2, 151, 4, 100);
      }
    });
    label('测起点后 ' + timeAt(c) + ' s 的速度', LEFT, 313, 40);
    const reading = (k) => (placed[k] || handle === k ? readings[k].toFixed(1) : '—');
    label('A ' + reading(0) + '    B ' + reading(1) + ' mm', RIGHT, 313, 37, '#554d42', 'right');
    label(
      message || (placed[0] ? '已读 A。在 B 点正下方读尺。' : '在 A 点正下方读尺。'),
      W / 2,
      362,
      40,
      '#34404a',
      'center',
    );
    if (!sheet.complete && sheet.points.length > 1) {
      const first = sheet.points[0],
        last = sheet.points.at(-1);
      label(
        first[0].toFixed(2) +
          ' s：' +
          first[1].toFixed(3) +
          ' → ' +
          last[0].toFixed(2) +
          ' s：' +
          last[1].toFixed(3) +
          ' m/s',
        LEFT,
        409,
        34,
        '#286a71',
      );
    }
    if (canContinue()) label('沿纸带量 ' + timeAt(slots[nextUnmeasured()]) + ' s ›', LEFT, 409, 38, '#286a71');
    label('回实验台', RIGHT, 409, 38, '#575247', 'right');
    texture.needsUpdate = true;
    controls.btns[1].disabled = slot === 0;
    controls.btns[2].disabled = slot === slots.length - 1;
    controls.btns[3].disabled = sheet.run.mode ? !sheet.complete : !sheet.used.size;
    fields.forEach((f, i) => {
      f.value = placed[i] ? readings[i].toFixed(1) : '';
      f.disabled = sheet.complete || sheet.used.has(c);
    });
    record.btns[0].disabled = fields[0].disabled;
  }
  function aim() {
    const c = slots[slot],
      previous = sheet.used.get(c);
    readings = previous ? [...previous] : [0, 0];
    placed = [!!previous, !!previous];
    message = previous ? '这组读数已记录' : sheet.complete ? '本条加速度已记录' : '';
    reveal(c - 5);
    draw();
    if (inspecting) onViewChange();
  }
  function move(delta) {
    if (!sheet) return;
    if (probe || !benchHasTape) choose(sheets.indexOf(sheet));
    slot = clamp(slot + delta, 0, slots.length - 1);
    aim();
  }
  function choose(i) {
    probe = null;
    stopPan();
    handle = -1;
    panStart = null;
    sheet = sheets[i];
    benchHasTape = true;
    if (!inspecting) showBench(sheet.run.marks);
    low = -5;
    archive.value = String(i);
    slots = centers(sheet.run.marks, sheet.origin);
    slot = 0;
    paper.visible = true;
    aim();
  }
  archive.onchange = () => {
    choose(Number(archive.value));
    inspect();
  };
  function place(x) {
    readings[handle] =
      Math.round(10 * clamp(low + ((x - LEFT) / (RIGHT - LEFT)) * WINDOW_MM, Math.max(0, low), low + WINDOW_MM)) / 10;
    draw();
  }
  function finish() {
    if (handle < 0) return;
    const c = slots[slot],
      k = handle;
    handle = -1;
    const [a, b] = readings;
    if (Math.abs(readings[k] - mm(c + (k ? 5 : -5))) > 1 || (k && b <= a)) {
      placed[k] = false;
      message = '再看 ' + (k ? 'B' : 'A') + ' 点正下方的尺刻，用毫米读数。';
      draw();
      return;
    }
    placed[k] = true;
    if (!placed.every(Boolean)) {
      message = 'A = ' + a.toFixed(1) + ' mm。沿同一把尺读 B。';
      reveal(c + 5);
      draw();
      if (inspecting) onViewChange();
      return;
    }
    if (Math.abs(a - mm(c - 5)) > 1) {
      placed = [false, false];
      message = '请重新读 A 的位置。';
      draw();
      return;
    }
    const v = (b - a) / 1000 / (10 * PERIOD);
    sheet.used.set(c, [a, b]);
    onRecord(sheet, (c - sheet.origin) * PERIOD, v, a, b);
    message = sheet.complete
      ? '已记录 · a = ' + sheet.acceleration.toFixed(3) + ' m/s²'
      : timeAt(c) + ' s 的速度：' + (b - a).toFixed(1) + ' mm ÷ 0.20 s ≈ ' + v.toFixed(3) + ' m/s';
    onViewChange();
    draw();
  }
  const pixel = (p) => [(p.x / WIDTH + 0.5) * W, ((p.z - Z) / DEPTH + 0.5) * H];
  const drag = {
    obj: paper,
    plane: 'xz',
    offset: Y,
    enabled: () => paper.material.map === texture || (!el.hidden && !!sheet && benchHasTape),
    hint: '点纸带近看，沿同一把尺读 A、B',
    onStart(p) {
      handle = -1;
      if (!p) return;
      if (!inspecting) {
        inspect();
        return;
      }
      const [x, y] = pixel(p);
      if (probe) {
        leave();
        return;
      }
      if (y > 369) {
        if (canContinue() && x < W / 2) {
          slot = nextUnmeasured();
          aim();
          return;
        }
        if (x > W * 0.7) leave();
        return;
      }
      if (y < 184) {
        stopPan();
        panStart = { x, low };
        return;
      }
      if (y > 278 || sheet.complete || sheet.used.has(slots[slot])) return;
      handle = placed[0] ? 1 : 0;
      stopPan();
      place(x);
    },
    onDrag(p) {
      const x = pixel(p)[0];
      if (panStart) {
        low = clamp(
          panStart.low - ((x - panStart.x) / (RIGHT - LEFT)) * WINDOW_MM,
          -5,
          Math.max(-5, mm(sheet.run.marks.length - 1) - WINDOW_MM + 5),
        );
        draw();
      } else if (handle >= 0) place(x);
    },
    onEnd(moved) {
      if (!panStart) {
        finish();
        return;
      }
      const at = low + ((panStart.x - LEFT) / (RIGHT - LEFT)) * WINDOW_MM;
      panStart = null;
      if (moved) return;
      if (sheet.used.size) {
        slot = slots.reduce((best, c, j) => (Math.abs(mm(c) - at) < Math.abs(mm(slots[best]) - at) ? j : best), 0);
      } else {
        const nearest = sheet.run.marks.reduce(
          (best, _, i) => (Math.abs(mm(i) - at) < Math.abs(mm(best) - at) ? i : best),
          0,
        );
        const available = centers(sheet.run.marks, nearest);
        if (available.length < 2) {
          message = '这个起点后没有足够的点量两个时刻，请向左选。';
          draw();
          return;
        }
        sheet.origin = nearest;
        slots = available;
        slot = 0;
      }
      aim();
    },
  };
  return {
    el,
    paper,
    get canMeasureMore() {
      return !!sheet && !probe && slots.length >= 2;
    },
    get count() {
      return !probe && sheet ? sheet.used.size : 0;
    },
    get inspecting() {
      return inspecting;
    },
    get instruction() {
      if (probe) return '看这条纸带的实际点距，再回到全景。';
      if (canContinue()) return '已测 ' + timeAt(slots[slot]) + ' s。点纸带左下的下一时刻，沿同一把尺再读一次。';
      if (sheet.used.size >= 2) return '这条纸带已量两个时刻，回到实验台。';
      if (slots.length === 1) return '这条纸带只能量一个时刻。回实验台，换新带，先通电再放车。';
      return placed[0] ? '沿尺读 B 点的位置；B 减 A 就是这段距离。' : '在 A 点正下方点尺刻，记下第一个位置。';
    },
    leave,
    drag,
    bind(record, graph) {
      onRecord = record;
      onGraph = graph;
    },
    add(run, trial) {
      benchHasTape = true;
      const origin = run.marks.findIndex((_, i) => centers(run.marks, i).length);
      if (origin < 0) {
        leave();
        probe = run.marks;
        el.hidden = true;
        paper.visible = true;
        clearPaper();
        label('第 ' + trial + ' 条纸带', LEFT, 62, 37);
        for (const mark of run.marks) dot(LEFT + (mark.x / TRAVEL) * (RIGHT - LEFT), 154, 5);
        label(run.marks.length ? '连续打点不足十个间隔' : '纸带上没有点', W / 2, 235, 48, '#34404a', 'center');
        label('点纸带返回，换新带；先通电再放车', W / 2, 360, 34, '#34404a', 'center');
        texture.needsUpdate = true;
        inspect();
        return false;
      }
      sheets.push({ run, trial, origin, points: [], used: new Map() });
      archive.add(new Option('第 ' + trial + ' 条 · ' + run.load * 1000 + ' g', String(sheets.length - 1)));
      el.hidden = false;
      choose(sheets.length - 1);
      return true;
    },
    trialStrip(marks) {
      leave();
      stopPan();
      panStart = null;
      handle = -1;
      probe = marks;
      el.hidden = true;
      paper.visible = true;
      clearPaper();
      label('无牵引试滑 · 每段 0.10 s', LEFT, 62, 37);
      const x = (i) => LEFT + (marks[i].x / marks[15].x) * (RIGHT - LEFT);
      for (let i = 0; i <= 15; i++) dot(x(i), 154, i % 5 === 0 ? 9 : 4);
      for (let i = 5; i <= 15; i += 5) {
        g.fillStyle = '#756b59';
        g.fillRect(x(i - 5), 184, x(i) - x(i - 5), 2);
        g.fillRect(x(i - 5), 168, 2, 20);
        g.fillRect(x(i), 168, 2, 20);
        label(
          ((marks[i].x - marks[i - 5].x) * 1000).toFixed(1) + ' mm',
          (x(i) + x(i - 5)) / 2,
          247,
          40,
          '#34404a',
          'center',
        );
      }
      label('点纸带返回，再调木板或挂槽码', W / 2, 360, 30, '#34404a', 'center');
      texture.needsUpdate = true;
      inspect();
    },
    stow() {
      stopPan();
      panStart = null;
      handle = -1;
      leave();
      probe = null;
      benchHasTape = false;
      showBench();
      el.hidden = !sheets.length;
    },
    clear() {
      this.stow();
      stopPan();
      sheet = null;
      sheets.length = 0;
      archive.replaceChildren();
      el.hidden = true;
    },
    dispose() {
      stopPan();
      texture.dispose();
      bench.dispose();
    },
  };
}
