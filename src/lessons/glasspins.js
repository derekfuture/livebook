// 选择性必修一图 4.1-3。读数来自四个实插针孔重建的路径。
import * as THREE from 'three';
import { glassPinRig, PAPER_Y, EYE_Z } from './kit/glassPinRig.js';
import { PIN_HEIGHT, HEAD_RADIUS } from './kit/glassBrick.js';
import { SLAB_WIDTH, SLAB_THICKNESS, tracePins, sightPin, indexFromPins, headSpan, hides } from './kit/glassSlab.js';
import { draggable, clamp, rayToLocal } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, note, buttons, h } from './kit/ui.js';

const names = 'ABCD',
  half = SLAB_WIDTH / 2,
  front = -SLAB_THICKNESS / 2,
  back = -front,
  R = 0.064,
  deg = Math.PI / 180;
const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
export default {
  id: 'glasspins',
  fig: '图4.1-3',
  title: '用插针法测量玻璃砖折射率',
  stampText: '测量',
  predict: {
    q: '从另一侧看见 B 遮住 A，再插两根针遮住它们。移走玻璃砖后，哪段线能给出玻璃内部的折射光线？',
    options: ['两个界面上的入射点和出射点之间', 'A、B 两针之间', 'C、D 两针之间'],
    answer: 0,
    hint: '前后两对针确定的是两段空气中的光线。',
  },
  conclusion: {
    page: 91, rect: [64.05, 573.73, 380.27, 679.73],
    quote: '一种方法如图4.1-3所示，当光以一定的入射角透过一块两面平行的玻璃砖时，只要找出与入射光线 AO相对应的出射光线O′D，就能够画出光从空气射入玻璃后的折射光线OO′，于是就能测量入射角θ1、折射角θ2。 根据折射定律，就可以求出玻璃的折射率了。',
    why: 'A、B 确定入射线，C、D 确定出射线。将它们分别延长到两界面，在纸上连结两交点，得到玻璃内光线。空气的折射率近似为 1，故 n ≈ sin i / sin r。取斜入射、增大同侧两针间距，有利于读准角度。',
    src: '课本第 87 页 · 第四章 第1节 光的折射',
  },
  create(ctx) {
    const rig = glassPinRig(),
      { group, work, pins, brick, eye, prot } = rig;
    let ui,
      rows,
      form,
      input,
      aim,
      edges,
      holes,
      lines,
      sketch,
      normal,
      sighted,
      alignedC,
      placed,
      removed,
      lineStep,
      angles,
      doneReading,
      view,
      eyeControl,
      sightFeedbackIn = -1;
    let edge, start, oldX, angle0, rotation0, turning;
    const previous = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'edges', title: '描边插针', todo: '沿两条长边描线，再插入 A、B 两针。', target: () => aim },
        { id: 'sight', title: '对齐四针', todo: '从近侧观察，插 C、D 遮住远侧的针。', target: () => aim },
        { id: 'path', title: '按针孔作图', todo: '移走器材，从针孔画出三段光线。', target: () => aim },
        { id: 'index', title: '测角求折射率', todo: '将量角器对准法线，测两组入射角和折射角。', target: () => aim },
      ],
    });
    const say = (s, o = null) => {
        aim = view ? null : o;
        bar.say(s);
      },
      enter = () => {
        if (ui && document.body.classList.contains('predicting')) ui.go(1);
      };
    const drawn = (range) => range && range[0] <= -half + 0.007 && range[1] >= half - 0.007;
    const both = () => edges.every(drawn);
    const refresh = () => rig.draw({ edges, holes, lines: sketch ? [...lines, sketch] : lines, normal, previous });
    const xy = (p) => ({ x: p.x, z: p.z });
    function path() {
      return holes[0] && holes[1] ? tracePins(holes[0], holes[1]) : null;
    }
    function feasible() {
      const ray = path();
      return (
        ray &&
        holes[1].z - holes[0].z >= 0.03 &&
        Math.abs(ray.slope) >= 0.25 &&
        Math.abs(ray.exit + (EYE_Z - back) * ray.slope) < 0.172
      );
    }
    function measured() {
      return indexFromPins(...holes);
    }
    function guide() {
      if (bar.finished) return say('两组已记录。笔记本中保留了各组针孔测出的角度和折射率。');
      if (!both())
        return say('按住玻璃的' + (!drawn(edges[0]) ? '后' : '前') + '长边，从一端沿边划到另一端，在纸上描线。', brick);
      if (!placed[0] || !placed[1] || !feasible())
        return say(
          !placed[0]
            ? '把 A 从左边针座拖到玻璃后方的纸上。'
            : !placed[1]
              ? '把 B 插在 A 与玻璃之间，和 A 横向错开。'
              : '移动 A 或 B，让两针相隔至少 3 cm，斜向两条长边中部。',
          pins[placed[0] ? 1 : 0],
        );
      if (!sighted)
        return say(
          view === 'eye'
            ? '左右拖空白处移动眼位。B 刚好遮住 A 时，点玻璃确认。'
            : '点纸前沿的观察位，低头透过玻璃看 A、B。',
          eye,
        );
      const k = !placed[2] ? 2 : alignedC && !placed[3] ? 3 : null;
      if (k !== null)
        return say(
          view === 'eye'
            ? '保持眼位，点想让 ' + names[k] + ' 针头落下的位置。插入后可以直接横向拖它。'
            : '把 ' + names[k] + ' 从针座拖到玻璃近侧' + (k === 3 ? '，比 C 更靠近眼睛。' : '的纸上，再到原眼位观察。'),
          pins[k],
        );
      if (!bar.has('sight'))
        return say(
          view === 'eye'
            ? alignedC
              ? '横向拖 D 直到遮住前三根针，再点玻璃检查。'
              : '横向拖 C 直到遮住 A、B，再点玻璃检查。'
            : '点前沿观察位，在原眼位调整近侧的针。',
          eye,
        );
      if (view === 'eye') return say('四针已对齐。回全景，取下四根针，把砖向右移到木座。');
      if (!removed.every(Boolean)) return say('点纸上的针，逐根拔出，保留四个针孔。', pins[removed.indexOf(false)]);
      if (brick.position.x < 0.2) return say('把玻璃砖沿桌面向右拖到木座，露出原来的两条边线。', brick);
      if (lineStep < 3)
        return say(
          [
            '从 A 孔沿 B 孔划线，延长到第一条边。',
            '从 D 孔沿 C 孔划线，延长到第二条边。',
            '连接两条边上的交点，画出玻璃内部的光路。',
          ][lineStep],
        );
      if (doneReading) return say('把砖从木座拖回两条描边之间，改变入射方向再做一组。', brick);
      if (angles.length === 2) return say('展开笔记本，用这两个实测角计算 sin i / sin r。');
      if (view === 'scale')
        return say(angles.length ? '沿砖内光线点刻度，从法线读折射角。' : '沿入射光线点刻度，从法线读入射角。');
      say('把量角器中心拖到入射点，转动外圈使零线对准法线，再点圆心近看。', prot);
    }
    function leave() {
      if (view) ctx.back();
      view = null;
      eyeControl = null;
      bar.near(false);
      guide();
    }
    function cameraEye() {
      return work.worldToLocal(ctx.camera.getWorldPosition(new THREE.Vector3()));
    }
    function eyeShot() {
      const e = { x: eye.position.x, z: EYE_Z },
        b = sightPin(holes[1], e);
      const targetX = b ? b.exit : clamp(holes[1].x, -half, half);
      ctx.lookFrom([e.x, PAPER_Y + PIN_HEIGHT, e.z], [targetX, PAPER_Y + PIN_HEIGHT, back], leave);
    }
    function inspectEye() {
      enter();
      if (!feasible() || bar.has('sight')) {
        guide();
        return;
      }
      view = 'eye';
      bar.near(true);
      eyeShot();
      guide();
    }
    function coincidence() {
      const e = cameraEye(),
        a = headSpan(holes[0], e, HEAD_RADIUS, true),
        b = headSpan(holes[1], e, HEAD_RADIUS, true);
      if (!a || !b || Math.abs(e.y - PIN_HEIGHT) > 0.003) return null;
      return { aligned: hides(b, a), e, b };
    }
    function checkSight() {
      const s = coincidence();
      if (!s?.aligned) {
        say('当前 A 和 B 未重合。左右缓慢移动眼位，让近一些的 B 遮住 A。');
        return;
      }
      if (!sighted) {
        sighted = true;
        guide();
        return;
      }
      for (const i of [2, 3]) {
        if (!placed[i]) {
          guide();
          return;
        }
        const nearHead = headSpan(holes[i], s.e, HEAD_RADIUS, false);
        const farHead = i === 2 ? s.b : headSpan(holes[2], s.e, HEAD_RADIUS, false);
        if (!hides(nearHead, farHead)) {
          if (i === 2) alignedC = false;
          say('沿纸面横向拖 ' + names[i] + ' 针，使它遮住后方针尖。');
          return;
        }
        if (i === 2 && !alignedC) {
          alignedC = true;
          guide();
          return;
        }
      }
      if (!measured()) {
        say('两条针线未在两界面内形成有效折射角。重新插针。');
        return;
      }
      bar.done('sight');
      guide();
    }
    function layoutPin(i, p) {
      const z = clamp(p.z, -0.156, 0.156),
        x = clamp(p.x, -0.162, 0.162);
      if ((i < 2 && z >= front - 0.008) || (i >= 2 && z <= back + 0.008)) {
        say(i < 2 ? 'A、B 要插到玻璃后侧。' : 'C、D 要插到玻璃近侧。');
        return false;
      }
      if (i === 1 && holes[0] && z <= holes[0].z + 0.03) {
        say('B 应在 A 前方，相隔至少 3 cm。');
        return false;
      }
      if (i === 3 && holes[2] && z <= holes[2].z + 0.025) {
        say('D 应比 C 更靠近眼睛，两针相隔至少 2.5 cm。');
        return false;
      }
      holes[i] = { x, z };
      placed[i] = true;
      pins[i].position.set(x, 0, z);
      refresh();
      if (feasible()) bar.done('edges');
      else bar.undo('edges');
      guide();
      return true;
    }
    function pull(i) {
      removed[i] = true;
      pins[i].position.copy(rig.homes[i]);
      refresh();
      guide();
    }
    function nextTrial() {
      previous.push({
        angle: angles[0],
        holes: holes.map((p) => ({ ...p })),
        lines: lines.map((pair) => pair.map((p) => ({ ...p }))),
      });
      rig.reset();
      holes = Array(4).fill(null);
      placed = Array(4).fill(false);
      removed = Array(4).fill(false);
      sighted = alignedC = false;
      lineStep = 0;
      lines = [];
      sketch = null;
      normal = null;
      angles = [];
      doneReading = false;
      prot.rotation.z = 0.38;
      bar.undo('edges', 'sight', 'path');
      refresh();
      guide();
    }
    function readyForLines() {
      return removed.every(Boolean) && brick.position.x >= 0.2 && !doneReading;
    }
    function segment() {
      const p = measured(),
        on = { x: p.entry, z: front },
        off = { x: p.exit, z: back };
      return [
        [holes[0], holes[1], on],
        [holes[3], holes[2], off],
        [on, off, off],
      ][lineStep];
    }
    const nearPoint = (a, b) => dist(a, b) < 0.009;
    const pinDrags = pins.map((pin, i) => ({
      obj: pin,
      plane: 'xz',
      offset: 0,
      keepOffset: true,
      enabled: () =>
        both() && !removed[i] && (bar.has('sight') || (i < 2 ? !sighted : i === 2 ? sighted && !alignedC : alignedC)),
      hint: () => (bar.has('sight') ? '拔出 ' + names[i] + ' 针' : '拖动 ' + names[i] + ' 针'),
      onStart() {
        enter();
        start = pin.position.clone();
      },
      onDrag(p) {
        if (bar.has('sight') || (i === 3 && !placed[2])) return;
        pin.position.set(p.x, 0.006, p.z);
      },
      onEnd(moved) {
        if (!moved) return;
        if (bar.has('sight')) {
          pull(i);
          return;
        }
        const p = xy(pin.position);
        pin.position.copy(start);
        if (i === 3 && !placed[2]) {
          guide();
          return;
        }
        layoutPin(i, p);
      },
      onTap() {
        if (bar.has('sight')) pull(i);
        else guide();
      },
    }));
    function alignScale() {
      const p = measured();
      return (
        Math.hypot(prot.position.x - p.entry, prot.position.z - front) < 0.0025 &&
        Math.abs(Math.sin(prot.rotation.z)) < Math.sin(1.1 * deg)
      );
    }
    function inspectScale() {
      if (!alignScale()) {
        say('圆心放到入射点，零线沿纸上的法线，再点圆心近看。', prot);
        return;
      }
      view = 'scale';
      bar.near(true);
      ctx.look(
        [prot.position.x, PAPER_Y + 0.002, prot.position.z],
        [0, 1, 0.01],
        ctx.camera.aspect >= 1 ? 0.34 : 0.2,
        leave,
      );
      guide();
    }
    function readAngle(ray) {
      const p = rayToLocal(ray, work, 'xz', 0.002);
      if (!p) return;
      const dx = p.x - prot.position.x,
        dz = p.z - prot.position.z;
      if (Math.abs(Math.hypot(dx, dz) - R * 0.94) > 0.006) {
        say('点外圈与光线相交的刻线。');
        return;
      }
      const m = measured(),
        incident = !angles.length,
        expected = incident ? -m.incident : Math.PI - m.refracted;
      const theta = Math.atan2(dx, -dz);
      const rayAngle = Math.atan2(p.x - m.entry, front - p.z);
      if (Math.abs(Math.atan2(Math.sin(rayAngle - expected), Math.cos(rayAngle - expected))) > 1.5 * deg) {
        say('沿' + (incident ? '入射线，从交点朝 A 看' : '砖内光线，从入射点朝出射点看') + '，点它穿过外圈的位置。');
        return;
      }
      const magnitude = Math.acos(Math.min(1, Math.abs(Math.cos(theta + prot.rotation.z)))) / deg;
      angles.push(Math.round(magnitude));
      if (angles.length === 2) {
        form.hidden = false;
        leave();
        say('实读入射角 ' + angles[0] + '°、折射角 ' + angles[1] + '°。展开笔记本计算折射率。');
      } else guide();
    }
    const manip = draggable(
      work,
      [
        ...pinDrags,
        {
          obj: brick,
          plane: 'xz',
          offset: 0,
          hint: () => (both() ? '移开或放回玻璃砖' : '按住长边从一端描到另一端'),
          enabled: () => !bar.finished && (!both() || removed.every(Boolean)),
          onStart(p) {
            enter();
            start = p?.clone();
            oldX = brick.position.x;
            if (!both() && p) {
              edge = p.z < 0 ? 0 : 1;
              const z = edge ? back : front;
              if (Math.abs(p.z - z) > 0.012 || drawn(edges[edge])) edge = null;
            }
          },
          onDrag(p) {
            if (!both() && edge !== null) {
              const x0 = clamp(start.x, -half, half),
                x = clamp(p.x, -half, half);
              edges[edge] = [Math.min(x0, x), Math.max(x0, x)];
              refresh();
              return;
            }
            if (removed.every(Boolean) && start) brick.position.x = clamp(oldX + p.x - start.x, 0, 0.23);
          },
          onEnd(moved) {
            if (!moved) return;
            if (removed.every(Boolean)) {
              if (!doneReading) {
                brick.position.x = brick.position.x > 0.16 ? 0.23 : 0;
              } else if (brick.position.x < 0.07) {
                nextTrial();
                return;
              } else brick.position.x = 0.23;
            }
            guide();
          },
        },
        {
          obj: rig.sheet,
          plane: 'xz',
          offset: 0,
          enabled: () => readyForLines() && lineStep < 3,
          hint: '沿针孔或交点划线',
          onStart(p) {
            start = p ? xy(p) : null;
          },
          onDrag(p) {
            if (start) {
              sketch = [start, xy(p)];
              refresh();
            }
          },
          onEnd(moved) {
            const s = segment(),
              end = sketch?.[1];
            sketch = null;
            if (
              moved &&
              end &&
              ((nearPoint(start, s[0]) && nearPoint(end, s[1])) || (nearPoint(start, s[1]) && nearPoint(end, s[0])))
            ) {
              lines.push([s[0], s[2]]);
              lineStep++;
              if (lineStep === 3) {
                normal = measured().entry;
                bar.done('path');
              }
            }
            refresh();
            guide();
          },
        },
        {
          obj: prot,
          plane: 'xz',
          offset: 0.002,
          enabled: () => lineStep === 3 && !doneReading && angles.length < 2,
          hint: '拖圆心平移，拖外圈转动',
          onStart(p) {
            start = p?.clone();
            oldX = prot.position.clone();
            rotation0 = prot.rotation.z;
            turning = p && dist(p, oldX) > R * 0.55;
            angle0 = p ? Math.atan2(p.x - oldX.x, oldX.z - p.z) : 0;
          },
          onDrag(p) {
            if (!start) return;
            if (turning) {
              prot.rotation.z = rotation0 - (Math.atan2(p.x - oldX.x, oldX.z - p.z) - angle0);
            } else
              prot.position.set(
                clamp(oldX.x + p.x - start.x, -0.17, 0.25),
                0.002,
                clamp(oldX.z + p.z - start.z, -0.16, 0.16),
              );
          },
          onEnd(moved) {
            if (moved && alignScale()) say('圆心和零线已就位。点圆心近看读数。', prot);
          },
          onTap: inspectScale,
        },
      ],
      { highlight: true, taps: [{ obj: eye, hint: '从这一侧透过玻璃观察', onTap: inspectEye }] },
    );
    function screenX(ray) {
      const dir = ray.ray.direction.clone().applyQuaternion(ctx.camera.quaternion.clone().invert());
      return dir.x / -dir.z;
    }
    function eyeDown(ray) {
      if (bar.has('sight')) return true;
      const active = alignedC ? 3 : 2;
      let i = -1;
      if (sighted && placed[active] && ray.intersectObject(pins[active], true).length) i = active;
      const add = sighted && !placed[2] ? 2 : alignedC && !placed[3] ? 3 : null;
      const site = add !== null ? rayToLocal(ray, work, 'xy', add === 2 ? 0.074 : 0.128) : null;
      eyeControl = {
        i,
        add,
        site,
        start: screenX(ray),
        x: i < 0 ? eye.position.x : holes[i].x,
        moved: false,
        glass: ray.intersectObject(brick, false).length > 0,
      };
      return true;
    }
    function eyeMove(ray) {
      if (!eyeControl) return true;
      const dx = screenX(ray) - eyeControl.start;
      if (Math.abs(dx) < 0.001 && !eyeControl.moved) return true;
      eyeControl.moved = true;
      const { i, x } = eyeControl;
      if (i < 0) {
        eye.position.x = clamp(x + dx * 0.22, -0.175, 0.175);
        eyeShot();
      } else {
        holes[i].x = clamp(x + dx * (EYE_Z - holes[i].z), -0.162, 0.162);
        pins[i].position.x = holes[i].x;
        refresh();
      }
      return true;
    }
    function accept() {
      if (angles.length !== 2 || doneReading) return;
      const n = Math.sin(angles[0] * deg) / Math.sin(angles[1] * deg);
      if (!Number.isFinite(input.valueAsNumber) || Math.abs(n - input.valueAsNumber) > 0.025)
        return say('角度用度数。用入射角的正弦除以折射角的正弦。');
      if (rows.rows.some(([angle]) => Math.abs(Number(angle) - angles[0]) < 8)) {
        say('这一组入射角与前一组太接近。移回玻璃砖，让入射角至少改变 8°。', brick);
        doneReading = true;
        form.hidden = true;
        input.value = '';
        return;
      }
      rows.add([String(angles[0]), String(angles[1]), input.valueAsNumber.toFixed(2)]);
      doneReading = true;
      form.hidden = true;
      input.value = '';
      if (rows.rows.length >= 2) bar.done('index');
      guide();
    }
    function reset() {
      if (view) leave();
      previous.length = 0;
      edges = [null, null];
      holes = Array(4).fill(null);
      placed = Array(4).fill(false);
      removed = Array(4).fill(false);
      sighted = alignedC = doneReading = false;
      lines = [];
      angles = [];
      sketch = normal = null;
      lineStep = 0;
      eyeControl = null;
      rig.reset();
      prot.rotation.z = 0.38;
      bar.undo('edges', 'sight', 'path', 'index');
      if (rows) {
        rows.clear();
        input.value = '';
        form.hidden = true;
      }
      refresh();
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.67, d: 0.47, h: 0.065 },
      view: { azim: 0, elev: 48, lookY: 0.28, margin: 1.04 },
      toggles: ['steps'],
      pointer: {
        items: manip.items,
        down(ray, e) {
          if (view === 'eye') return eyeDown(ray);
          if (view === 'scale') {
            readAngle(ray);
            return true;
          }
          return manip.down(ray, e);
        },
        move(ray) {
          if (view === 'eye') return eyeMove(ray);
          return view === 'scale' || manip.move(ray);
        },
        up() {
          if (view === 'eye') {
            if (eyeControl && !eyeControl.moved) {
              if (eyeControl.add !== null && eyeControl.site) layoutPin(eyeControl.add, eyeControl.site);
              else if (eyeControl.glass) checkSight();
            }
            if (eyeControl?.moved) sightFeedbackIn = 0.45;
            eyeControl = null;
            return true;
          }
          return manip.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['入射角 / °', '折射角 / °', '折射率']);
        input = h('input', { type: 'number', step: 'any', 'aria-label': '折射率', style: 'width:6em' });
        form = h('div', {}, h('label', {}, '折射率 ', input), buttons([{ text: '记录折射率', onClick: accept }]).el);
        form.hidden = true;
        ui.data.append(rows.el, form);
        ui.notes.append(
          note('透过玻璃砖的两个抛光长侧面观察。上表面和短端磨砂，底面贴纸。按针孔作图、量角，空气折射率取 1。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (view !== 'eye' || eyeControl || sightFeedbackIn < 0 || bar.has('sight')) return;
        sightFeedbackIn -= dt;
        if (sightFeedbackIn > 0) return;
        sightFeedbackIn = -1;
        const s = coincidence();
        if (!s?.aligned) return say('A 和 B 未重合。左右移动眼位，让 B 遮住 A。');
        if (!sighted) return say('B 已遮住 A。点玻璃确认眼位。');
        const i = alignedC ? 3 : 2;
        if (!placed[i]) return guide();
        const far = i === 2 ? s.b : headSpan(holes[2], s.e, HEAD_RADIUS, false);
        if (hides(headSpan(holes[i], s.e, HEAD_RADIUS, false), far))
          say(names[i] + ' 已遮住后方的针。点玻璃确认。');
        else guide();
      },
      dispose() {
        manip.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
