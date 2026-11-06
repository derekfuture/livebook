// 纸带放在实验台前沿。主视图和近看共用同一件器材、同一份读数。
import * as THREE from 'three';
import { canvasTex } from '../props.js';
import { clamp } from '../interact.js';
import { buttons } from '../ui.js';
import { PERIOD, centers } from './motion.js';

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
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH, DEPTH),
    new THREE.MeshBasicMaterial({ transparent: true }),
  );
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, Y, Z);
  group.add(paper);
  // 全景与近看共用实尺，只改变镜头。
  const resolution = 2;
  const bench = canvasTex(W * resolution, H * resolution, () => {});
  const benchInk = bench.canvas.getContext('2d');
  paper.material.map = bench;
  const stripTexture = canvasTex(2048, 96, () => {});
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.018), new THREE.MeshBasicMaterial({ map: stripTexture }));
  strip.rotation.x = -Math.PI / 2;
  strip.visible = false;
  group.add(strip);
  const paperZero = -WIDTH / 2 + (LEFT / W) * WIDTH;
  const stripZ = Z + (184 / H - 0.5) * DEPTH;
  let transfer = 0;
  function setStrip(marks, layout, carry = false, onArrival) {
    cancelAnimationFrame(transfer);
    strip.visible = !!marks;
    if (!strip.visible) return;
    const { length, lead } = layout;
    const ink = stripTexture.canvas.getContext('2d');
    ink.fillStyle = '#fff6dd';
    ink.fillRect(0, 0, 2048, 96);
    ink.fillStyle = '#343a40';
    for (const mark of marks) {
      ink.beginPath();
      ink.ellipse(((mark.x - marks[0].x + lead) / length) * 2048, 48, (0.00055 / length) * 2048, 3, 0, 0, Math.PI * 2);
      ink.fill();
    }
    stripTexture.needsUpdate = true;
    strip.scale.x = length;
    const dest = new THREE.Vector3(paperZero + length / 2 - lead, Y - 0.0001, stripZ);
    if (!carry) {
      strip.position.copy(dest);
      return;
    }
    const start = layout.center;
    const began = performance.now();
    function travel(now) {
      const t = Math.min(1, (now - began) / 650),
        u = t * t * (3 - 2 * t);
      strip.position.lerpVectors(start, dest, u);
      strip.position.z += 0.07 * Math.sin(Math.PI * u);
      if (t < 1) transfer = requestAnimationFrame(travel);
      else onArrival?.();
    }
    travel(began);
  }
  function showBench() {
    const ctx = benchInk,
      x = (mm) => LEFT + (mm * W) / (WIDTH * 1000);
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ead7af';
    ctx.fillRect(x(-4), 194, x(340) - x(-4), 36);
    for (let mm = 0; mm <= 340; mm++) {
      ctx.fillStyle = '#615747';
      ctx.fillRect(x(mm), 194, 0.65, mm % 10 === 0 ? 12 : mm % 5 === 0 ? 8 : 4);
      if (mm % 10 === 0) {
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(mm), x(mm), 219);
      }
    }
    ctx.font = '8px sans-serif';
    ctx.fillText('mm', x(5), 228);
    bench.needsUpdate = true;
  }
  showBench();
  const g = benchInk;
  let benchHasTape = false;
  const sheets = [];
  const archive = document.createElement('select');
  archive.setAttribute('aria-label', '选纸带');
  let sheet,
    slots = [],
    slot = 0,
    probe,
    probeIsTrial = false,
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
      showBench();
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
    inspecting = true;
    bar.near(true);
    onViewChange();
    if (probe) drawProbe();
    else draw();
    focus();
  }
  function focus() {
    const span = probe ? Math.max(0.1, (probe.at(-1)?.x || 0) - (probe[0]?.x || 0)) : WINDOW_MM / 1000;
    const x = paperZero + span / 2 + (probe ? 0 : low / 1000);
    look([x, Y, Z], [0, 1, 0.16], span * 1.7, () => {
      inspecting = false;
      showBench();
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
  function drawProbe() {
    showBench();
    if (!probeIsTrial) {
      label(probe.length ? '连续打点不足十个间隔' : '这条纸带没有打上点', LEFT, 151, 14);
    } else {
      label('无牵引试滑 · 比较三个 0.10 s 内的位移', LEFT, 130, 14);
      const x = (i) => LEFT + ((probe[i].x - probe[0].x) * W) / WIDTH;
      for (let i = 5; i <= 15; i += 5) {
        const left = x(i - 5),
          right = x(i);
        g.fillStyle = '#756b59';
        g.fillRect(left, 156, right - left, 0.8);
        g.fillRect(left, 154, 0.8, 8);
        g.fillRect(right, 154, 0.8, 8);
        label(
          ((probe[i].x - probe[i - 5].x) * 1000).toFixed(1) + ' mm',
          (left + right) / 2,
          150,
          12,
          '#34404a',
          'center',
        );
      }
    }
    bench.needsUpdate = true;
  }
  const timeAt = (i) => ((i - sheet.origin) * PERIOD).toFixed(2);
  function nextUnmeasured() {
    return slots.findIndex((i) => !sheet.used.has(i));
  }
  const required = () => sheet?.run.requiredSpeeds || 2;
  function canContinue() {
    return sheet.used.size > 0 && sheet.used.size < required() && sheet.used.has(slots[slot]) && nextUnmeasured() >= 0;
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
      if (inspecting) focus();
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
    showBench();
    controls.btns[1].disabled = slot === 0;
    controls.btns[2].disabled = slot === slots.length - 1;
    controls.btns[3].disabled = sheet.run.mode ? !sheet.complete : !sheet.used.size;
    fields.forEach((f, i) => {
      f.value = placed[i] ? readings[i].toFixed(1) : '';
      f.disabled = sheet.complete || sheet.used.has(slots[slot]);
    });
    record.btns[0].disabled = fields[0].disabled;
    if (!inspecting) return;
    // 批注与桌上的毫米刻度使用同一坐标。
    const scale = ((W / (WIDTH * 1000)) * WINDOW_MM) / (RIGHT - LEFT);
    g.translate(LEFT + (low * W) / (WIDTH * 1000) - LEFT * scale, 194 - 189 * scale);
    g.scale(scale, scale);
    const c = slots[slot],
      a = c - 5,
      b = c + 5;
    label('纸带 ' + sheet.trial + ' · 已测 ' + sheet.used.size + '/' + required() + ' 处', LEFT, 50, 38);
    label('相邻打点相隔 0.02 s', RIGHT, 50, 36, '#575247', 'right');
    g.fillStyle = 'rgba(40,106,113,.15)';
    g.fillRect(px(mm(a)), 144, px(mm(b)) - px(mm(a)), 33);
    for (const [i, name, color, align] of [
      [a, 'A', '#286a71', 'right'],
      [b, 'B', '#a44730', 'left'],
    ]) {
      const x = px(mm(i));
      if (x < LEFT || x > RIGHT) continue;
      g.fillStyle = color;
      g.fillRect(x - 1, 132, 2, 22);
      label(name, x, 127, 38, color, align);
    }
    // 编号始终属于原纸带上的同一个点，完成读数不自动换测量对象。
    if (px(mm(sheet.origin)) >= LEFT && px(mm(sheet.origin)) <= RIGHT)
      label('0', px(mm(sheet.origin)), 98, 34, '#756b59', 'center');
    for (const [j, i] of slots.entries()) {
      const x = px(mm(i));
      if (x < LEFT || x > RIGHT) continue;
      label(String(j + 1), x, 98, 34, i === c ? '#286a71' : '#756b59', 'center');
    }
    g.strokeStyle = '#286a71';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(px(mm(c)), 156, 9, 0, Math.PI * 2);
    g.stroke();
    for (const i of [a, b]) {
      const x = px(mm(i));
      g.fillStyle = i === a ? '#286a71' : '#a44730';
      g.fillRect(x - 0.8, 161, 1.6, 28);
    }
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
    label('第 ' + (slot + 1) + ' 点 · 时刻 ' + timeAt(c) + ' s', LEFT, 322, 40);
    const reading = (k) => (placed[k] || handle === k ? readings[k].toFixed(1) : '—');
    label('尺读数 A ' + reading(0) + '    B ' + reading(1) + ' mm', LEFT, 365, 40, '#554d42');
    label('本段用时 0.20 s', RIGHT, 322, 40, '#575247', 'right');
    if (message) label(message, LEFT, 409, 40, '#34404a');
    bench.needsUpdate = true;
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
  function choose(i, carry = false) {
    probe = null;
    stopPan();
    handle = -1;
    panStart = null;
    sheet = sheets[i];
    benchHasTape = true;
    if (!inspecting) showBench();
    setStrip(sheet.run.marks, sheet.layout, carry);
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
      : (b - a).toFixed(1) + ' mm ÷ 0.20 s ≈ ' + v.toFixed(3) + ' m/s';
    onViewChange();
    draw();
  }
  function pixel(p) {
    const x = (p.x / WIDTH + 0.5) * W,
      y = ((p.z - Z) / DEPTH + 0.5) * H;
    if (probe) return [x, y];
    return [px(((x - LEFT) * WIDTH * 1000) / W), 189 + ((y - 194) * (RIGHT - LEFT) * WIDTH * 1000) / (W * WINDOW_MM)];
  }
  const drag = {
    obj: paper,
    plane: 'xz',
    offset: Y,
    enabled: () => !!probe || (!el.hidden && !!sheet && benchHasTape),
    hint: '点纸带近看，沿同一把尺读 A、B',
    onStart(p) {
      handle = -1;
      if (!p) return;
      if (!inspecting) {
        inspect();
        return;
      }
      const [x, y] = pixel(p);
      if (probe) return;
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
        focus();
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
      const nearest = slots.reduce(
        (best, c, j) => (Math.abs(mm(c) - at) < Math.abs(mm(slots[best]) - at) ? j : best),
        0,
      );
      if (Math.abs(mm(slots[nearest]) - at) > 3) return;
      slot = nearest;
      aim();
    },
  };
  return {
    el,
    paper,
    get canMeasureMore() {
      return !!sheet && !probe && slots.length >= required();
    },
    get count() {
      return !probe && sheet ? sheet.used.size : 0;
    },
    get inspecting() {
      return inspecting;
    },
    get instruction() {
      if (probe) return '看这条纸带的实际点距，再回到全景。';
      if (canContinue()) {
        const first = sheet.points.find(([time]) => Math.abs(time - Number(timeAt(slots[slot]))) < 0.001);
        return (
          '第 ' +
          (slot + 1) +
          ' 点已测：' +
          first[1].toFixed(3) +
          ' m/s。点原纸带上的 ' +
          (nextUnmeasured() + 1) +
          '，测 ' +
          timeAt(slots[nextUnmeasured()]) +
          ' s 时的速度，比较先后变化。'
        );
      }
      if (sheet.used.size >= required()) return '这条纸带已量 ' + required() + ' 个时刻，回到实验台。';
      if (slots.length < required() && slots.length > 1)
        return '这条纸带可测的时刻太少，回实验台换新带，先通电再放车。';
      if (slots.length === 1) return '这条纸带只能量一个时刻。回实验台，换新带，先通电再放车。';
      return placed[0]
        ? 'A 已读好。再读 B 下的尺刻；B − A 是两点间长度，这一段用时 0.20 s。'
        : '求第 ' +
            (slot + 1) +
            ' 点（' +
            timeAt(slots[slot]) +
            ' s）的速度：先读 A，再读 B，求两点间长度。0 点是计时起点，每个打点间隔 0.02 s。';
    },
    leave,
    drag,
    bind(record, graph) {
      onRecord = record;
      onGraph = graph;
    },
    add(run, trial, layout) {
      benchHasTape = true;
      const origin = run.marks.findIndex((_, i) => centers(run.marks, i).length);
      if (origin < 0) {
        leave();
        probe = run.marks;
        el.hidden = true;
        paper.visible = true;
        probeIsTrial = false;
        setStrip(probe, layout, true, inspect);
        return false;
      }
      sheets.push({ run, trial, origin, layout, points: [], used: new Map() });
      archive.add(new Option('第 ' + trial + ' 条 · ' + run.load * 1000 + ' g', String(sheets.length - 1)));
      el.hidden = false;
      choose(sheets.length - 1, true);
      return true;
    },
    trialStrip(marks, layout) {
      leave();
      stopPan();
      panStart = null;
      handle = -1;
      probe = marks;
      el.hidden = true;
      paper.visible = true;
      probeIsTrial = true;
      setStrip(marks, layout, true, inspect);
    },
    stow() {
      stopPan();
      panStart = null;
      handle = -1;
      leave();
      probe = null;
      benchHasTape = false;
      setStrip();
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
      bench.dispose();
      cancelAnimationFrame(transfer);
      stripTexture.dispose();
    },
  };
}
