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
const W = 1440,
  H = 420,
  LEFT = 60,
  RIGHT = W - LEFT;
export function tapeReader(group, { look, back }) {
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
    }
  }
  function inspect() {
    if (!paper.visible && sheet) choose(sheets.indexOf(sheet));
    if (!paper.visible) return;
    inspecting = true;
    look([0, Y, Z], [0, 1, 0.16], 0.56, () => {
      inspecting = false;
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
  function draw() {
    if (!sheet || probe) return;
    clearPaper();
    const marks = sheet.run.marks,
      start = marks[0].x,
      span = marks.at(-1).x - start;
    label('第 ' + sheet.trial + ' 条纸带', LEFT, 38);
    label(sheet.used.size ? '点上排选计数点' : '点上排选起点', RIGHT, 38, 41, '#575247', 'right');
    for (const [i, m] of marks.entries())
      dot(
        LEFT + ((m.x - start) / span) * (RIGHT - LEFT),
        64,
        i === slots[slot] || i === sheet.origin ? 9 : 3,
        i === slots[slot] ? '#286a71' : i === sheet.origin ? '#a24b32' : '#343a40',
      );
    const c = slots[slot];
    label('计数点 ' + ((c - sheet.origin) * PERIOD).toFixed(2) + ' s', LEFT, 125);
    for (let i = c - 5; i <= c + 5; i++) {
      const x = px(mm(i));
      dot(x, 173, i === c ? 8 : 6);
      if (i === c - 5 || i === c + 5) label(i < c ? 'A' : 'B', x, 151, 40, '#323b40', 'center');
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
    label(message || '把两个游标分别拖到 A、B 的点心', W / 2, 358, 42, '#34404a', 'center');
    label('点空白回到实验台', W / 2, 409, 38, '#575247', 'center');
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
      : '已记录 · v = ' + v.toFixed(3) + ' m/s';
    if (sheet.used.size === 1 && slots.length > 1) {
      const recorded = message;
      slot = slot === slots.length - 1 ? slot - 1 : slot + 1;
      aim();
      message = recorded + ' · 再量一点';
    }
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
    drag,
    bind(record, graph) {
      onRecord = record;
      onGraph = graph;
    },
    add(run, trial) {
      const origin = run.marks.findIndex((_, i) => centers(run.marks, i).length);
      if (origin < 0) return false;
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
