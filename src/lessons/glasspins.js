// 选择性必修一图 4.1-3。读数来自四个实插针孔重建的路径。
import * as THREE from 'three';
import { glassPinRig, PAPER_Y, EYE_Z, DOCK_X, RADIUS } from './kit/glassPinRig.js';
import { PIN_HEIGHT, HEAD_RADIUS, SHAFT_RADIUS } from './kit/glassBrick.js';
import { SLAB_WIDTH, SLAB_THICKNESS, tracePins, sightPin, indexFromPins, headSpan, hides } from './kit/glassSlab.js';
import { draggable, clamp, rayToLocal } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, h } from './kit/ui.js';

const names = 'ABCD',
  half = SLAB_WIDTH / 2,
  front = -SLAB_THICKNESS / 2,
  back = -front,
  deg = Math.PI / 180;
const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
export default {
  id: 'glasspins',
  fig: '图4.1-3',
  title: '测量玻璃的折射率',
  stampText: '测量',
  predict: {
    q: '怎样用四根针测出玻璃的折射率？移走玻璃砖后，哪两个点能确定砖内光线？',
    options: ['入射点 O 和出射点 O′', '入射侧的针孔 A 和 B', '出射侧的针孔 C 和 D'],
    answer: 0,
  },
  conclusion: {
    page: 91,
    rect: [64.05, 573.73, 380.27, 679.73],
    quote:
      '一种方法如图4.1-3所示，当光以一定的入射角透过一块两面平行的玻璃砖时，只要找出与入射光线 AO相对应的出射光线O′D，就能够画出光从空气射入玻璃后的折射光线OO′，于是就能测量入射角θ1、折射角θ2。 根据折射定律，就可以求出玻璃的折射率了。',
    why: 'A、B 确定入射线，C、D 确定出射线。将它们分别延长到两界面，在纸上连结两交点，得到玻璃内光线。空气的折射率近似为 1，故 n ≈ sin i / sin r。取斜入射、增大同侧两针间距，有利于读准角度。',
    src: '课本第 87 页 · 第四章 第1节 光的折射',
  },
  create(ctx) {
    const rig = glassPinRig();
    const { group, work, sheet, pins, brick, eye, prot, homes } = rig;
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const steps = [
      ['edges', '描出界面'],
      ['incident', '插入 A、B'],
      ['sight', '透过砖对针'],
      ['path', '按针孔画光路'],
      ['measure', '量角求折射率'],
    ];
    let ui, aim, view, edges, holes, removed, lines, sketch, sighted, docked, aligned, read;
    let start, edge, rawAngle, startAngle, turning, cancelled, eyeDrag, staged, previewHome;
    const returns = new Map();
    const bar = lessonBar({
      ...ctx,
      group: work,
      back: leave,
      steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => (ui?.step === 1 ? aim : null) })),
    });
    const rows = table(['入射角 θ₁', '折射角 θ₂', '折射率 n']);
    const formula = h('p', { class: 'note' });
    const inputs = ['入射角 θ₁', '折射角 θ₂'].map((name) =>
      h('input', {
        type: 'number',
        step: '1',
        inputmode: 'numeric',
        'aria-label': name,
        style: 'width:4.5em',
      }),
    );
    const submit = h('button', { class: 'go', type: 'submit' }, '记录读数');
    const form = h(
      'form',
      {
        hidden: true,
        novalidate: true,
        onsubmit(e) {
          e.preventDefault();
          record();
        },
      },
      ...inputs.map((field, i) =>
        h('label', { style: 'display:block;margin:7px 0' }, i ? '折射角 θ₂　' : '入射角 θ₁　', field, ' °'),
      ),
      submit,
    );
    const tip = ctx.tag('', 'pill');
    const canvas = document.getElementById('c');
    function say(message, target = null) {
      aim = !view && ui?.step !== 2 ? target : null;
      bar.say(message);
    }
    const draw = () =>
      rig.draw({
        edges,
        holes,
        lines: sketch ? lines.concat([sketch]) : lines,
        normal: lines.length === 3 ? lines[0][1].x : null,
        reading: view === 'scale',
        sighting: view === 'eye',
      });
    const rays = () => tracePins(holes[0], holes[1]);
    const measured = () => indexFromPins(...holes);
    const eyeX = (ray) => ray.exit + (EYE_Z - back) * ray.slope;
    const xyz = (p) => ({ x: p.x, z: p.z });
    function spring(obj, destination) {
      returns.set(obj, { from: obj.position.clone(), to: destination.clone(), t: 0 });
    }
    const edgeDone = (i) => edges[i] && edges[i][0] === -half && edges[i][1] === half;
    const side = () => (edgeDone(0) ? 1 : 0);
    const activePin = () => (holes[2] ? 3 : 2);
    function guide() {
      if (!bar.has('edges'))
        return say(
          edgeDone(0)
            ? '后边已留下边线 a。沿前长边从一端描到另一端，留下第二个界面。'
            : '沿玻璃砖的后长边从一端描到另一端，把界面的位置留在纸上。',
          brick,
        );
      if (!holes[0]) return say('两个界面已留在纸上。把红针 A 从针座拖到砖后方，给 B 留些距离。', pins[0]);
      if (!holes[1]) return say('A 已插好。把蓝针 B 插在 A 与砖之间，让 AB 斜向玻璃砖中部。', pins[1]);
      if (!bar.has('sight')) {
        if (!view) return say('AB 确定了入射方向。点前沿的“观察”，从另一侧透过砖看针。', eye);
        if (!sighted) return say('眼睛在砖的另一侧。左右拖动视野，蓝针 B 完全挡住红针 A 时松手。');
        return say(
          holes[2]
            ? 'C 已遮住 A、B。横拖黄针 D，让它遮住绿针 C，再松手插下。'
            : 'B 已遮住 A。保持眼位，横拖绿针 C 遮住蓝针 B，再松手插下。',
        );
      }
      if (view === 'eye') return say('只看见 D 了，CD 确定了出射方向。回到全景，留下针孔作图。');
      if (!removed.every(Boolean))
        return say('把四根针分别拖回对应的针座，留在纸上的四个针孔就是作图依据。', pins[removed.indexOf(false)]);
      if (!docked) return say('四个针孔都留下了。把玻璃砖向右拖到木座，露出两个界面。', brick);
      if (lines.length < 3)
        return say(
          [
            '从 A 孔沿 B 孔划到边线 a，找出光进入玻璃的位置 O。',
            '入射点 O 已找到。从 D 孔沿 C 孔划到边线 a′，找出出射点 O′。',
            '两条外部光线都画好了。从 O 划到 O′，补出砖内的光路。',
          ][lines.length],
          rig.holeMarks[lines.length === 0 ? 0 : lines.length === 1 ? 3 : 4],
        );
      if (bar.finished) return say('已用这条光路测出折射率，可以掀开课本原文了。');
      if (view === 'scale') return say('从法线的 0° 起，量 OA、OO′ 与法线的锐角，各读到 1°。');
      if (aligned) return say('圆心在 O，零线与法线重合。点圆心，俯视整圈刻度。', prot);
      return say('OO′ 是砖内光线。拖量角器圆心对准 O，再拖外圈，让零线与虚线法线重合。', prot);
    }
    function unstage() {
      if (staged !== null) {
        returns.delete(pins[staged]);
        pins[staged].position.copy(homes[staged]);
        staged = null;
      }
    }
    let savedZoom = null;
    function restoreLens() {
      if (savedZoom === null) return;
      ctx.camera.zoom = savedZoom;
      ctx.camera.updateProjectionMatrix();
      savedZoom = null;
    }
    function leave() {
      restoreLens();
      if (view) ctx.back();
      unstage();
      view = null;
      eyeDrag = null;
      form.hidden = true;
      tip.show(false);
      bar.near(false);
      draw();
      guide();
    }
    let eyeTime = 0;
    const lens = v(0, 0, 0),
      focus = v(0, 0, 0);
    function eyeShot() {
      const e = { x: eye.position.x, z: EYE_Z };
      const line = sightPin(holes[1], e);
      lens.set(e.x, PIN_HEIGHT, EYE_Z);
      focus.set(line ? line.exit : rays().exit, PIN_HEIGHT - 0.026, back);
      ctx.lookFrom(lens.clone().add(work.position).toArray(), focus.clone().add(work.position).toArray(), leave);
    }
    function openEye() {
      savedZoom = ctx.camera.zoom;
      view = 'eye';
      eyeTime = 0;
      bar.near(true);
      draw();
      eyeShot();
      if (sighted) preparePin();
      guide();
    }
    function preparePin() {
      const i = activePin(),
        z = i === 2 ? 0.065 : 0.105;
      const e = { x: eye.position.x, z: EYE_Z };
      const line = sightPin(holes[1], e);
      // 待插的针拿在近侧，给学生留出可见的横向偏差。
      const width = (EYE_Z - z) * Math.min(0.18, Math.tan((ctx.camera.fov * deg) / 2) * ctx.camera.aspect * 0.5);
      previewHome = v(e.x - (EYE_Z - z) * line.slope + width, 0, z);
      staged = i;
      pins[i].position.copy(previewHome);
    }
    const eyeAt = () => ({ x: eye.position.x, z: EYE_Z });
    const span = (p, through, radius) => headSpan(p, eyeAt(), radius, through);
    function covers(near, far, nearThrough, farThrough) {
      return [HEAD_RADIUS, SHAFT_RADIUS].every((radius) =>
        hides(span(near, nearThrough, radius), span(far, farThrough, radius)),
      );
    }
    const gain = () => 0.068 / Math.min(innerWidth * 0.7, 560);
    const eyeItems = () => (!sighted ? [eyeSurface] : staged === null ? [] : [eyePins[staged - 2]]);
    const eyeSurface = { obj: brick, hint: '左右拖：移动眼位' };
    const eyePins = [2, 3].map((i) => ({ obj: pins[i], hint: '横拖：对齐' + names[i] + '针' }));
    function inEye(ray, e, down) {
      if (!eyeDrag) {
        const target = eyeItems()[0];
        const hit = target && (!sighted || ray.intersectObject(target.obj, true).length);
        if (!down) {
          canvas.style.cursor = hit ? 'grab' : '';
          if (hit) tip.loc(target.obj, 0, target.obj === brick ? 0.008 : PIN_HEIGHT + 0.007, 0).text(target.hint);
          tip.show(!!hit && ui?.step === 1);
        } else if (hit && !returns.has(target.obj)) {
          tip.show(false);
          const p = staged === null ? null : rayToLocal(ray, work, 'xy', pins[staged].position.z);
          eyeDrag = { client: e.clientX, x: staged === null ? eye.position.x : pins[staged].position.x, p };
        }
      } else if (!down) {
        if (staged === null) {
          eye.position.x = clamp(eyeDrag.x + (e.clientX - eyeDrag.client) * gain(), -0.173, 0.173);
          eyeShot();
        } else {
          const pin = pins[staged],
            p = rayToLocal(ray, work, 'xy', pin.position.z);
          if (p && eyeDrag.p) pin.position.x = clamp(eyeDrag.x + p.x - eyeDrag.p.x, -0.169, 0.169);
        }
      }
      return true;
    }
    function endEye() {
      if (!eyeDrag) return;
      if (staged === null) {
        if (cancelled) {
          eye.position.x = eyeDrag.x;
          eyeShot();
        } else if (covers(holes[1], holes[0], true, true)) {
          sighted = true;
          preparePin();
          guide();
        } else say('红针还露在蓝针旁。左右微调眼位，直到只看见蓝针。');
      } else {
        const i = staged,
          pin = pins[i];
        if (cancelled || !covers(pin.position, holes[i - 1], false, i === 2)) {
          spring(pin, previewHome);
          say('后面的针还露在一旁。这根针没有插下，再横拖对齐。');
        } else {
          holes[i] = xyz(pin.position);
          staged = null;
          draw();
          if (i === 2) preparePin();
          else if (measured()) bar.done('sight');
          else {
            holes[3] = null;
            preparePin();
            draw();
          }
          guide();
        }
      }
      eyeDrag = null;
    }

    const pinDrags = pins.map((pin, i) => ({
      obj: pin,
      plane: 'xz',
      offset: PIN_HEIGHT,
      keepOffset: true,
      enabled: () =>
        !returns.has(pin) &&
        (bar.has('sight')
          ? !removed[i]
          : bar.has('edges') && !bar.has('incident') && i < 2 && (i === 0 || !!holes[0])),
      hint: () => (bar.has('sight') ? '拖回针座：拔针' : '拖到纸上：插' + names[i] + '针'),
      onStart() {
        start = pin.position.clone();
      },
      onDrag(p) {
        pin.position.set(p.x, start.y, p.z);
      },
      onEnd(moved) {
        if (!moved) return;
        const reject = (text) => {
          spring(pin, start);
          say(text, pin);
        };
        if (cancelled) return spring(pin, start);
        if (bar.has('sight')) {
          if (dist(pin.position, homes[i]) > 0.027) return reject('针没有放回对应的字母处，针孔的位置保留不变。');
          pin.position.copy(homes[i]);
          removed[i] = true;
          guide();
          return;
        }
        const p = xyz(pin.position);
        if (Math.abs(p.x) > 0.168 || p.z < -0.162 || p.z >= front - 0.009)
          return reject('针尖要落在玻璃砖后方的白纸上。');
        if (i === 1) {
          const ray = tracePins(holes[0], p);
          if (p.z <= holes[0].z || dist(holes[0], p) < 0.035)
            return reject('两针要分开些。把 B 放在 A 与砖之间，才容易辨认方向。');
          if (!ray || Math.abs(ray.slope) < 0.22 || Math.abs(eyeX(ray)) > 0.159)
            return reject('这个方向不便从前沿观察。移动 A 或 B，让 AB 斜穿两条长边的中部。');
          eye.position.x = eyeX(ray) + (eyeX(ray) > 0 ? -0.018 : 0.018);
          bar.done('incident');
        }
        holes[i] = p;
        pin.position.y = 0;
        draw();
        guide();
      },
    }));
    let traceHeight = 0;
    const brickDrag = {
      obj: brick,
      plane: 'xz',
      get offset() {
        return traceHeight;
      },
      enabled: () => !returns.has(brick) && (!bar.has('edges') || (removed.every(Boolean) && !docked)),
      hint: () => (bar.has('edges') ? '向右拖：移开玻璃砖' : '沿边拖：描出界面'),
      onStart(p) {
        start = p.clone();
        edge = side();
      },
      onDrag(p) {
        if (bar.has('edges')) {
          brick.position.x = clamp(p.x - start.x, -0.02, DOCK_X + 0.018);
          return;
        }
        const z = edge ? back : front;
        if (Math.abs(start.z - z) > 0.014 || Math.abs(p.z - z) > 0.018) return;
        edges[edge] = [clamp(Math.min(start.x, p.x), -half, half), clamp(Math.max(start.x, p.x), -half, half)];
        draw();
      },
      onEnd(moved) {
        if (!moved) return;
        if (bar.has('edges')) {
          if (cancelled || Math.abs(brick.position.x - DOCK_X) > 0.024) {
            spring(brick, v(0, brick.position.y, 0));
            say('玻璃砖没有落在右侧木座上，边线还被挡着。', brick);
            return;
          }
          brick.position.set(DOCK_X, brick.geometry.parameters.height / 2 + 0.002, 0);
          docked = true;
        } else {
          const range = edges[edge];
          if (cancelled || !range || range[0] > -half + 0.009 || range[1] < half - 0.009) {
            edges[edge] = null;
            draw();
            say('边线还没有描全。贴着这条长边，从一个端点划到另一个端点。', brick);
            return;
          }
          edges[edge] = [-half, half];
          draw();
          if (edgeDone(0) && edgeDone(1)) bar.done('edges');
        }
        guide();
      },
    };
    function segment(i) {
      const m = measured(),
        entry = { x: m.entry, z: front },
        exit = { x: m.exit, z: back };
      return [
        [holes[0], entry],
        [holes[3], exit],
        [entry, exit],
      ][i];
    }
    const paperDrag = {
      obj: sheet,
      plane: 'xz',
      offset: 0.0001,
      enabled: () => docked && lines.length < 3,
      hint: '沿纸面拖：画光线',
      onStart(p) {
        start = xyz(p);
      },
      onDrag(p) {
        sketch = [start, xyz(p)];
        draw();
      },
      onEnd(moved) {
        if (!moved || !sketch) return;
        const ends = segment(lines.length),
          last = sketch[1];
        sketch = null;
        const matches = (a, b) => dist(start, a) < 0.009 && dist(last, b) < 0.009;
        if (cancelled || !(matches(...ends) || matches(ends[1], ends[0]))) {
          draw();
          say(
            '线段没有连到两端。' +
              ['从 A 经过 B，一直划到边线 a。', '从 D 经过 C，一直划到边线 a′。', '把 O 和 O′ 两个交点连起来。'][
                lines.length
              ],
            rig.holeMarks[lines.length === 0 ? 0 : lines.length === 1 ? 3 : 4],
          );
          return;
        }
        lines.push(ends);
        if (lines.length === 1) rig.holeMarks[4].position.set(ends[1].x, 0, front);
        if (lines.length === 3) bar.done('path');
        draw();
        guide();
      },
    };
    const scaleAngle = (p) => Math.atan2(p.x - prot.position.x, prot.position.z - p.z);
    const centred = () => dist(prot.position, lines[0][1]) < 0.005;
    function openScale() {
      view = 'scale';
      bar.near(true);
      form.hidden = false;
      draw();
      const portrait = ctx.camera.aspect < 1;
      ctx.look(
        [work.position.x + prot.position.x, PAPER_Y + prot.position.y, front + (portrait ? 0.014 : 0)],
        [0, 1, 0.001],
        0.32,
        leave,
      );
      guide();
    }
    const scaleDrag = {
      obj: prot,
      plane: 'xz',
      offset: 0.001,
      enabled: () => lines.length === 3 && !read && !returns.has(prot),
      hint: () => (aligned ? '点圆心：凑近读数' : '拖动：移圆心或转外圈'),
      onStart(p) {
        start = prot.position.clone();
        rawAngle = scaleAngle(p);
        startAngle = prot.rotation.z;
        turning = dist(p, start) > RADIUS * 0.57;
      },
      onDrag(p, from) {
        if (turning) prot.rotation.z = startAngle - (scaleAngle(p) - rawAngle);
        else prot.position.set(start.x + p.x - from.x, 0.001, start.z + p.z - from.z);
      },
      onEnd(moved) {
        if (!moved) return;
        if (cancelled || !centred()) {
          prot.rotation.z = startAngle;
          spring(prot, start);
          say('圆心还没有落在入射点 O 上。拖量角器中部，把中心十字放到 O。', prot);
          return;
        }
        prot.position.set(lines[0][1].x, 0.001, front);
        aligned = Math.abs(Math.sin(prot.rotation.z)) < Math.sin(3 * deg);
        if (aligned) {
          prot.rotation.z = Math.round(prot.rotation.z / Math.PI) * Math.PI;
          guide();
        } else say('圆心已在 O。拖动外圈，把两个 0° 之间的直线转到虚线法线上。', prot);
      },
      onTap() {
        if (aligned && !turning) openScale();
        else guide();
      },
    };
    function record() {
      if (view !== 'scale' || read) return;
      const m = measured(),
        values = inputs.map((f) => f.valueAsNumber);
      const expected = [m.incident, m.refracted].map((a) => Math.abs(a / deg));
      for (let i = 0; i < 2; i++) {
        const value = values[i];
        if (Number.isInteger(value) && value > 0 && value < 90 && Math.abs(value - expected[i]) <= 1) continue;
        const name = i ? '折射角' : '入射角',
          ray = i ? 'OO′' : 'OA';
        const reference = Number.isFinite(value) && Math.abs(value - (90 - expected[i])) <= 2;
        say(
          (i ? '入射角读对了。' : '') +
            (reference ? name + '读成了光线与界面的夹角。' : name + '再读一次。') +
            '从法线的 0° 数到 ' +
            ray +
            '，每小格 1°。',
        );
        return;
      }
      const [a, b] = values,
        n = (Math.sin(a * deg) / Math.sin(b * deg)).toFixed(2);
      rows.add([a + '°', b + '°', n]);
      formula.textContent = 'n ≈ sin ' + a + '° / sin ' + b + '° ≈ ' + n;
      read = true;
      bar.done('measure');
      leave();
      say('入射角和折射角都从法线量起。这块玻璃的实测折射率约为 ' + n + '。');
    }
    const manip = draggable(work, [...pinDrags, brickDrag, paperDrag, scaleDrag], {
      tip,
      taps: [
        {
          obj: eye,
          enabled: () => bar.has('incident') && !bar.has('sight'),
          hint: '点一下：透过砖看针',
          onTap: openEye,
        },
      ],
    });
    const hideTip = () => tip.show(false);
    canvas.addEventListener('pointerleave', hideTip);
    const pointer = {
      items: () => (view === 'eye' ? eyeItems() : view ? [] : manip.items().filter((item) => item.enabled())),
      down(ray, e) {
        if (ui?.step === 2) return false;
        cancelled = false;
        hideTip();
        if (view === 'eye') return inEye(ray, e, true);
        if (view === 'scale') return true;
        traceHeight = 0;
        if (!bar.has('edges')) {
          // 在可见的上棱或贴纸的下棱起笔，都沿学生抓住的高度描同一个界面。
          const z = side() ? back : front,
            height = brick.geometry.parameters.height;
          const top = rayToLocal(ray, work, 'xz', height),
            foot = rayToLocal(ray, work, 'xz', 0);
          if (top && foot && Math.abs(top.z - z) < Math.abs(foot.z - z)) traceHeight = height;
        }
        return manip.down(ray, e);
      },
      move(ray, e) {
        if (ui?.step !== 1) {
          hideTip();
          return false;
        }
        if (view === 'eye') return inEye(ray, e, false);
        if (view) return true;
        tip.show(true);
        return manip.move(ray, e);
      },
      up(ray, e) {
        cancelled = e?.type === 'pointercancel';
        if (view === 'eye') {
          endEye();
          return true;
        }
        return view === 'scale' || manip.up(ray, e);
      },
    };
    function trial() {
      restoreLens();
      if (view) ctx.back();
      rig.reset();
      returns.clear();
      staged = eyeDrag = view = sketch = null;
      edges = [null, null];
      holes = Array(4).fill(null);
      removed = Array(4).fill(false);
      lines = [];
      sighted = docked = aligned = read = false;
      inputs.forEach((f) => {
        f.value = '';
      });
      form.hidden = true;
      bar.near(false);
      bar.undo(...steps.map((s) => s[0]));
      hideTip();
      draw();
      guide();
    }
    function reset() {
      trial();
      rows.clear();
      formula.textContent = '';
      ui?.relock();
      if (ui) ctx.reframe();
      guide();
    }
    const again = h(
      'button',
      {
        class: 'go ghost',
        hidden: true,
        onclick() {
          trial();
          ui.relock({ full: false });
          ui.unlock();
          ui.need('');
          again.hidden = true;
        },
      },
      '换个入射方向再测',
    );
    function update(dt) {
      bar.update(dt);
      if (view === 'eye') {
        // 鼠标视差会改变真实遮挡关系。进入观察位后，相机严格落在水平针头截面的眼点。
        eyeTime = Math.min(1, eyeTime + dt / 0.55);
        const camera = ctx.camera,
          target = work.localToWorld(focus.clone());
        const zoom = savedZoom * (innerWidth <= 760 && camera.aspect < 1 ? 0.32 : 1);
        if (camera.zoom !== zoom) {
          camera.zoom = zoom;
          camera.updateProjectionMatrix();
        }
        camera.position.lerp(work.localToWorld(lens.clone()), eyeTime);
        const original = camera.quaternion.clone();
        camera.lookAt(target);
        camera.quaternion.slerp(original, 1 - eyeTime);
        camera.updateMatrixWorld();
      }
      for (const [obj, r] of returns) {
        r.t = Math.min(1, r.t + dt / 0.38);
        obj.position.lerpVectors(r.from, r.to, 1 - (1 - r.t) ** 2);
        if (r.t === 1) returns.delete(obj);
      }
      again.hidden = !read;
      if (ui?.step !== 1) hideTip();
    }
    reset();
    return {
      group,
      card: false,
      size: { w: 0.66, d: 0.44, h: 0.06 },
      view: { azim: 0, elev: 49, frameMargin: 1.07 },
      toggles: ['steps'],
      pointer,
      reset,
      update,
      mount(panel) {
        ui = panel;
        document.querySelector('.lbar').dataset.lesson = 'glasspins';
        ui.el.append(
          h(
            'style',
            {},
            `
          @media (max-width:760px) {
            .lbar[data-lesson="glasspins"] { flex-wrap:wrap; gap:3px 7px; }
            .lbar[data-lesson="glasspins"] .lb-main { flex:1 0 calc(100% - 45px); }
            .lbar[data-lesson="glasspins"] .lb-steps { margin-left:auto; }
          }
        `,
          ),
        );
        bar.attach({ need: () => ui.need(''), unlock: () => ui.unlock() });
        ui.controls.append(form);
        ui.data.append(rows.el, formula);
        ui.controls.append(again);
        ui.notes.append(h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        const source = ui.el.querySelector('.answer .src');
        source.style.minHeight = '55px';
        source.style.paddingRight = '80px';
        guide();
      },
      debug: { bar, qa: buildQA() },
      dispose() {
        restoreLens();
        canvas.removeEventListener('pointerleave', hideTip);
        manip.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
    function buildQA() {
      // 描边、连线、转外圈的起点都在器材的特定位置。投影这些点，和学生走同一套拾取逻辑。
      const marker = new THREE.Mesh(new THREE.BufferGeometry());
      marker.geometry.boundingBox = new THREE.Box3(v(0, 0, 0), v(0, 0, 0));
      marker.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      const at = (point) => (typeof point === 'function' ? point() : point.clone());
      function gesture(name, from, to) {
        const mouse = {
          kind: to ? 'drag' : 'tap',
          get obj() {
            marker.position.copy(work.localToWorld(at(from)));
            return marker;
          },
          to: () => at(to),
        };
        return {
          name,
          mouse,
          run() {
            const fire = (method, point) => {
              const ndc = work.localToWorld(point).project(ctx.camera),
                ray = new THREE.Raycaster();
              ray.setFromCamera(ndc, ctx.camera);
              pointer[method](ray, {
                clientX: ((ndc.x + 1) * innerWidth) / 2,
                clientY: ((1 - ndc.y) * innerHeight) / 2,
              });
            };
            const first = at(from),
              end = to ? at(to) : first.clone();
            fire('down', first);
            if (to) fire('move', end.clone());
            fire('up', end);
          },
        };
      }
      const head = (i) => () => pins[i].position.clone().setY(PIN_HEIGHT);
      const paperPoint = (p) => v(p.x, 0.0001, p.z);
      const slideEye = () => {
        const p = work.localToWorld(glassPoint()).project(ctx.camera);
        p.x += (2 * (eyeX(rays()) - eye.position.x)) / (gain() * innerWidth);
        return work.worldToLocal(p.unproject(ctx.camera));
      };
      const glassPoint = () => v(rays().exit, PIN_HEIGHT, back);
      const align = (i) => () => {
        const pos = head(i)(),
          line = sightPin(holes[1], eyeAt());
        pos.x = eye.position.x - (EYE_Z - pos.z) * line.slope;
        return pos;
      };
      const join = (i, end) => () => paperPoint(segment(i)[end]);
      const center = () => v(measured().entry, 0.001, front);
      const rim = (angle) => () =>
        center().add(v(RADIUS * 0.86 * Math.sin(angle), 0, -RADIUS * 0.86 * Math.cos(angle)));
      function check(condition, message) {
        if (!condition) throw Error(message);
      }
      const reading = (name, wrong) => ({
        name,
        run() {
          check(view === 'scale', '未进入俯视读数');
          const m = measured(),
            a = Math.round(Math.abs(m.incident / deg)),
            b = Math.round(Math.abs(m.refracted / deg));
          inputs[0].value = String(a);
          inputs[1].value = String(wrong ? 90 - b : b);
          submit.click();
          if (wrong) check(view === 'scale' && !rows.rows.length && !bar.finished, '错读被记录');
          else
            check(
              bar.finished && rows.rows.length === 1 && formula.textContent.includes(rows.rows[0][2]),
              '读数或算式未记录',
            );
        },
      });
      return [
        gesture(
          '描后界面',
          v(-half + 0.002, brick.geometry.parameters.height, front + 0.001),
          v(half, brick.geometry.parameters.height, front),
        ),
        gesture('描前界面', v(-half + 0.001, 0, back), v(half, 0, back)),
        gesture('试插在砖上', head(0), v(-0.065, PIN_HEIGHT, 0)),
        {
          name: '核对错插归位',
          run() {
            check(!holes[0] && pins[0].position.equals(homes[0]), '错插后未归位');
          },
        },
        gesture('插 A', head(0), v(-0.092, PIN_HEIGHT, -0.146)),
        gesture('插 B', head(1), v(-0.052, PIN_HEIGHT, -0.081)),
        gesture('从另一侧观察', () => eye.position.clone()),
        gesture('移动眼位使 B 遮住 A', glassPoint, slideEye),
        gesture('试插偏的 C', head(2), () => head(2)().add(v(-0.002, 0, 0))),
        gesture('C 遮住 A、B', head(2), align(2)),
        gesture('D 遮住前三针', head(3), align(3)),
        {
          name: '回到纸面',
          run() {
            check(bar.has('sight'), '四针尚未对齐');
            document.querySelector('.lb-back').click();
          },
        },
        ...pins.map((_, i) =>
          gesture('把 ' + names[i] + ' 拖回针座', head(i), () => homes[i].clone().setY(PIN_HEIGHT)),
        ),
        gesture('把砖移到木座', v(0, 0, 0), v(DOCK_X, 0, 0)),
        gesture('沿 AB 找 O', join(0, 0), join(0, 1)),
        gesture('沿 DC 找 O′', join(1, 0), join(1, 1)),
        gesture('连接 O、O′', join(2, 0), join(2, 1)),
        gesture('量角器中心落在 O', () => prot.position.clone(), center),
        gesture('转外圈对准法线', rim(0), rim(0.38)),
        gesture('俯视整圈刻度', center),
        reading('把折射角读成余角', true),
        reading('记录两个角度', false),
        {
          name: '展开课本原文',
          run() {
            ui.go(2);
            ui.el.querySelector('.flap-front').click();
            check(ui.el.querySelector('.flap.open'), '结论未展开');
          },
        },
      ];
    }
  },
};
