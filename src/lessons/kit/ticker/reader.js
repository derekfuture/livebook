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
  paper.visible = false;
  const g = texture.canvas.getContext('2d');
  const sheets = [];
  const archive = document.createElement('select');
  archive.setAttribute('aria-label', '选纸带');
  let sheet,
    slots = [],
    slot = 0,
    probe,
    inspecting = false,
    handle = -1,
    low = 0,
    high = 1;
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
      bar.near(false);
      onViewChange();
    }
  }
  function inspect() {
    if (!paper.visible && sheet) choose(sheets.indexOf(sheet));
    if (!paper.visible) return;
    inspecting = true;
    bar.near(true);
    onViewChange();
    look([0, Y, Z], [0, 1, 0.16], 0.56, () => {
      inspecting = false;
      bar.near(false);
      onViewChange();
    });
  }
  const mm = (i) => (sheet.run.marks[i].x - sheet.run.marks[sheet.origin].x) * 1000;
  const px = (v) => LEFT + ((v - low) / (high - low)) * (RIGHT - LEFT);
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
  function draw() {
    if (!sheet || probe) return;
    clearPaper();
    const marks = sheet.run.marks,
      start = marks[0].x,
      span = marks.at(-1).x - start;
    label(sheet.run.load * 1000 + ' g · 第 ' + sheet.trial + ' 条', LEFT, 38);
    label('整条纸带 · 红点是 0 s · 每隔 0.02 s 一点', RIGHT, 38, 38, '#575247', 'right');
    const c = slots[slot];
    const wholeX = (i) => LEFT + ((marks[i].x - start) / span) * (RIGHT - LEFT);
    g.fillStyle = '#dfd7b6';
    g.fillRect(wholeX(c - 5) - 4, 51, wholeX(c + 5) - wholeX(c - 5) + 8, 25);
    for (const [i] of marks.entries())
      dot(
        wholeX(i),
        64,
        i === c || i === sheet.origin ? 8 : 3,
        i === c ? '#286a71' : i === sheet.origin ? '#a24b32' : '#343a40',
      );
    label('放大所选段 · 测起点后 ' + timeAt(c) + ' s 的速度', LEFT, 115, 40);
    for (let i = c - 5; i <= c + 5; i++) {
      const x = px(mm(i));
      dot(x, 177, i === c ? 9 : 6, i === c ? '#286a71' : '#303940');
      if (i === c - 5 || i === c + 5) {
        const left = i < c;
        label((left ? 'A ' : 'B ') + timeAt(i) + ' s', x, 155, 34, left ? '#286a71' : '#a44730', 'center');
      }
    }
    g.fillStyle = '#ead7af';
    g.fillRect(0, 190, W, 90);
    for (let v = Math.ceil(low); v <= high; v++) {
      const x = px(v);
      g.fillStyle = '#615747';
      g.fillRect(x, 190, 2, v % 10 === 0 ? 34 : v % 5 === 0 ? 24 : 12);
      if (v % 10 === 0) label(String(v), x, 260, 37, '#554d42', 'center');
    }
    label('mm', W - 10, 276, 33, '#554d42', 'right');
    readings.forEach((v, k) => {
      const x = px(v),
        color = k ? '#a44730' : '#286a71';
      g.fillStyle = color;
      g.fillRect(x - 2, 157, 4, 124);
      g.beginPath();
      g.moveTo(x, 265);
      g.lineTo(x - 14, 290);
      g.lineTo(x + 14, 290);
      g.fill();
      label(v.toFixed(1), clamp(x, 60, W - 60), 316, 39, color, 'center');
    });
    label(message || '尺上读 A、B 的位置；两点相隔 0.20 s', W / 2, 358, 39, '#34404a', 'center');
    if (canContinue()) label('量下个时刻 ' + timeAt(slots[nextUnmeasured()]) + ' s ›', LEFT, 409, 38, '#286a71');
    label('回实验台', RIGHT, 409, 38, '#575247', 'right');
    texture.needsUpdate = true;
    controls.btns[1].disabled = slot === 0;
    controls.btns[2].disabled = slot === slots.length - 1;
    controls.btns[3].disabled = sheet.run.mode ? !sheet.complete : !sheet.used.size;
    fields.forEach((f, i) => {
      f.value = readings[i].toFixed(1);
      f.disabled = sheet.complete || sheet.used.has(c);
    });
    record.btns[0].disabled = fields[0].disabled;
  }
  function aim() {
    const c = slots[slot],
      a = mm(c - 5),
      b = mm(c + 5);
    const margin = Math.max(4, (b - a) * 0.18);
    low = Math.floor(a - margin);
    high = Math.ceil(b + margin);
    const previous = sheet.used.get(c);
    readings = previous ? [...previous] : [low + 1, high - 1];
    placed = [false, false];
    message = previous ? '此点已记录' : sheet.complete ? '本条加速度已记录' : '';
    draw();
    if (inspecting) onViewChange();
  }
  function move(delta) {
    if (!sheet) return;
    if (probe || !paper.visible) choose(sheets.indexOf(sheet));
    slot = clamp(slot + delta, 0, slots.length - 1);
    aim();
  }
  function choose(i) {
    probe = null;
    sheet = sheets[i];
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
    readings[handle] = Math.round(10 * clamp(low + ((x - LEFT) / (RIGHT - LEFT)) * (high - low), low, high)) / 10;
    draw();
  }
  function finish() {
    if (handle < 0) return;
    placed[handle] = true;
    handle = -1;
    if (!placed.every(Boolean)) return;
    const c = slots[slot],
      [a, b] = readings;
    if (Math.abs(a - mm(c - 5)) > 1 || Math.abs(b - mm(c + 5)) > 1 || b <= a) {
      message = '游标还没对准点心，可继续拖动';
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
    enabled: () => paper.visible,
    hint: '点纸带近看，拖游标量点距',
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
        leave();
        return;
      }
      if (y < 96) {
        const marks = sheet.run.marks,
          target = marks[0].x + clamp((x - LEFT) / (RIGHT - LEFT), 0, 1) * (marks.at(-1).x - marks[0].x);
        if (sheet.used.size) {
          slot = slots.reduce(
            (best, c, j) => (Math.abs(marks[c].x - target) < Math.abs(marks[slots[best]].x - target) ? j : best),
            0,
          );
          aim();
          return;
        }
        let i = 0;
        for (let j = 1; j < marks.length; j++) if (Math.abs(marks[j].x - target) < Math.abs(marks[i].x - target)) i = j;
        const available = centers(marks, i);
        if (available.length) {
          sheet.origin = i;
          slots = available;
          slot = 0;
          aim();
        } else {
          message = '起点后需有连续十个间隔，请向左选';
          draw();
        }
        return;
      }
      if (y < 132 || y > 325 || sheet.complete || sheet.used.has(slots[slot])) return;
      handle = Math.abs(x - px(readings[0])) <= Math.abs(x - px(readings[1])) ? 0 : 1;
      place(x);
    },
    onDrag(p) {
      if (handle >= 0) place(pixel(p)[0]);
    },
    onEnd: finish,
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
      if (canContinue()) return '已测 ' + timeAt(slots[slot]) + ' s。点纸带左下「量下个时刻」，再测一次。';
      if (sheet.used.size >= 2) return '这条纸带已量两个时刻，回到实验台。';
      if (slots.length === 1) return '这条纸带只能量一个时刻。回实验台，换新带，先通电再放车。';
      return '从纸带起点算时间。把青色游标拖到 A、红色拖到 B，用这段的平均速度估计中间时刻的速度。';
    },
    leave,
    drag,
    bind(record, graph) {
      onRecord = record;
      onGraph = graph;
    },
    add(run, trial) {
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
      inspect();
      return true;
    },
    trialStrip(marks) {
      leave();
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
      leave();
      probe = null;
      paper.visible = false;
      el.hidden = !sheets.length;
    },
    clear() {
      this.stow();
      sheet = null;
      sheets.length = 0;
      archive.replaceChildren();
      el.hidden = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}
