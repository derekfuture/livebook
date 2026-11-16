import * as THREE from 'three';
import { windingRig, CLIP, AXIS, START, SPAN, RULE_W, RADIUS } from './kit/windingRig.js';
import { advanceWinding, windingEdges, WIRE_MM, MAX_TURNS } from './kit/wireWinding.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, table, buttons } from './kit/ui.js';

const alignZ = RADIUS + RULE_W / 2 + 0.0005;
export default {
  id: 'wirewinding',
  fig: '图11.3-8',
  title: '用刻度尺测量细丝直径',
  stampText: '估测',
  predict: {
    q: '一根丝比毫米尺的一小格还细。怎样用同一把尺估测丝径？',
    options: ['紧密绕多圈，量总宽再除以圈数', '只读单根丝占几格', '把线圈拉松，增大总宽'],
    answer: 0,
    hint: '想想总宽度里包含哪些长度。',
  },
  conclusion: {
    quote: '单层紧密绕成 N 圈，总宽度除以圈数可估测丝的直径。',
    why: '把一根直径累积成多圈的总宽度，尺上同样大小的读数误差分摊到每圈。若圈间留缝，总宽还包含这些缝隙，所得直径偏大。',
    src: '人教版高中物理必修第三册第 66 页，参考案例 1',
  },
  create(ctx) {
    const rig = windingRig(),
      { group, scale, guide, end, rotor, knob } = rig;
    const history = [],
      parts = [],
      tip = new THREE.Vector3(),
      clip = new THREE.Vector3(...CLIP);
    let attached, near, gap, readings, recorded, ui, rows, form, nInput, dInput, aim, dragStart;
    const turns = () => parts.at(-1)?.end || 0;
    const aligned = () => Math.abs(scale.position.z - alignZ) < 0.0016;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'wrap', title: '绕出多圈', todo: '把丝头夹到圆柱上，滚动圆柱绕成单层。', target: () => aim },
        { id: 'read', title: '量总宽度', todo: '用同一把毫米尺读线圈左右两边。', target: () => aim },
        { id: 'calc', title: '估测丝径', todo: '数完整圈数，用实测总宽度估算直径。', target: () => aim },
      ],
    });
    function say(text, obj) {
      aim = obj;
      bar.say(text);
    }
    function render() {
      rig.render(parts, attached, gap, tip);
    }
    function leave() {
      ctx.back();
      near = false;
      bar.near(false);
      instruct();
    }
    function inspect() {
      const e = windingEdges(parts);
      const mid = START + (e ? (e.left + e.right) / 2000 : 0);
      near = true;
      bar.near(true);
      const dist = Math.max(ctx.camera.aspect < 1 ? 0.043 : 0.07, e ? (e.right - e.left) * 0.0021 : 0);
      ctx.look([mid, AXIS, RADIUS], [0, 1, 0.02], dist, leave);
      instruct();
    }
    function instruct() {
      if (!attached) return say('抓住散开的丝头，拖到圆柱左侧的小夹口。', end);
      if (recorded && bar.finished) {
        const last = history.at(-1),
          other = history.find((r) => r.count === last.count && r.loose !== last.loose);
        if (other) {
          const [tight, loose] = last.loose ? [other, last] : [last, other];
          return say(
            '同样是 ' +
              last.count +
              ' 圈，紧绕宽 ' +
              tight.width.toFixed(1) +
              ' mm，留缝宽 ' +
              loose.width.toFixed(1) +
              ' mm。把空隙也算进去，会把丝径估大。',
          );
        }
        return say('紧绕的记录已保留。可以移开直尺、把导丝环稍往右拖，再绕一组比较。');
      }
      if (recorded) return say('这组留缝，记录已保留。移开尺，倒转圆柱退丝，把导丝环向左靠紧，再绕一组。', knob);
      if (turns() < 7.94) return say('在圆柱木柄上向台前滚动，可松手再滚。至少绕八整圈，让毫米尺读得到总宽。', knob);
      if (!windingEdges(parts)) return say('把木柄上的浅色线转回朝上，让末圈完整。', knob);
      if (!aligned()) return say('将台前的毫米尺拖近圆柱，让刻度边贴着线圈前沿。', scale);
      if (!near && readings.length < 2) return say('点尺面近看，沿线圈前沿数圈，在同一把尺上读两边。', scale);
      if (readings.length < 2)
        return say('点' + (readings.length ? '右' : '左') + '边那根丝外缘正下方的尺刻，估读到毫米的下一位。');
      say('总宽 ' + (readings[1] - readings[0]).toFixed(1) + ' mm。沿前沿数完整圈数，展开笔记本填 N 和总宽 ÷ N。');
    }
    function invalidate() {
      readings = [];
      recorded = false;
      form.hidden = true;
      nInput.value = dInput.value = '';
      if (!history.length) bar.undo('read');
    }
    function reset() {
      if (near) leave();
      attached = near = recorded = false;
      gap = 0;
      readings = [];
      history.length = parts.length = 0;
      tip.set(START + 0.018, 0.002, -0.032);
      scale.position.set(-0.002, 0.0009, 0.04);
      rows?.clear();
      if (form) {
        form.hidden = true;
        nInput.value = dInput.value = '';
      }
      bar.undo('wrap', 'read', 'calc');
      render();
      instruct();
    }
    function read(x) {
      const e = windingEdges(parts);
      if (!e || e.count < 8) return instruct();
      if (!near) {
        inspect();
        return;
      }
      if (readings.length >= 2) return instruct();
      const edge = (x - START) * 1000,
        side = readings.length ? 'right' : 'left';
      if (Math.abs(edge - e[side]) > 0.38) return say('沿最外侧那根丝的外缘读毫米刻度，圈与圈之间的界线不算外边缘。');
      const zero = scale.position.x - SPAN / 2;
      readings.push(Math.round((x - zero) * 10000) / 10);
      if (readings.length === 2) {
        bar.done('read');
        form.hidden = false;
      }
      instruct();
    }
    function record() {
      const e = windingEdges(parts);
      if (!e || readings.length < 2 || recorded) return;
      const n = nInput.valueAsNumber,
        d = dInput.valueAsNumber;
      if (n !== e.count) return say('沿圆柱前沿从左到右数完整的圈，把每根丝只数一次。');
      const width = readings[1] - readings[0];
      if (!Number.isFinite(d) || Math.abs(d - width / n) > 0.011)
        return say('把两边读数相减，得到总宽 ' + width.toFixed(1) + ' mm，再除以 ' + n + '。');
      const loose = e.widestGap > 0.08;
      history.push({ count: n, width, loose });
      rows.add([
        String(n),
        readings.map((v) => v.toFixed(1)).join(' → '),
        width.toFixed(1),
        d.toFixed(2),
        loose ? '有缝' : '紧绕',
      ]);
      recorded = true;
      form.hidden = true;
      if (!loose) bar.done('calc');
      if (near) leave();
      else instruct();
    }
    let saved, baseGap, rollZ, readPoint;
    const manip = draggable(
      group,
      [
        {
          obj: end,
          plane: 'xz',
          offset: AXIS + RADIUS,
          enabled: () => !attached,
          hint: '将散开的丝头夹到圆柱上',
          onStart() {
            saved = tip.clone();
          },
          onDrag(p) {
            tip.set(p.x, AXIS + RADIUS, p.z);
            render();
          },
          onEnd(moved) {
            if (moved && Math.hypot(tip.x - clip.x, tip.z - clip.z) < 0.008) attached = true;
            else tip.copy(saved);
            render();
            instruct();
          },
        },
        {
          obj: rotor,
          plane: 'xz',
          offset: AXIS + RADIUS,
          enabled: () => attached && !near,
          hint: '滚动圆柱缠绕，向后滚可退丝',
          onStart(p) {
            rollZ = p?.z;
          },
          onDrag(p) {
            if (rollZ == null) return;
            const delta = (p.z - rollZ) / (2 * Math.PI * RADIUS);
            rollZ = p.z;
            if (Math.abs(delta) < 1e-6) return;
            if (readings.length || recorded) invalidate();
            advanceWinding(parts, delta, WIRE_MM + gap);
            render();
            if (!history.length && (turns() < 7.94 || !windingEdges(parts))) bar.undo('wrap');
            instruct();
          },
          onEnd(moved) {
            // 浅色线是完整圈的对齐标记，松手时吸附到最近的整圈只限于标记附近。
            if (moved && Math.abs(turns() - Math.round(turns())) <= 0.06)
              advanceWinding(parts, Math.round(turns()) - turns(), WIRE_MM + gap);
            if (turns() >= 8 && windingEdges(parts)) bar.done('wrap');
            render();
            instruct();
            if (turns() === MAX_TURNS) say('已到圆柱可用范围，把尺拖到线圈前沿读宽度。', scale);
          },
        },
        {
          obj: guide,
          plane: 'xz',
          offset: AXIS + RADIUS,
          enabled: () => attached && !near,
          hint: '横移导丝环，控制后续线圈的间距',
          onStart() {
            baseGap = gap;
          },
          onDrag(p, start) {
            if (!start) return;
            gap = clamp(baseGap + (p.x - start.x) * 1000, 0, 1.2);
            render();
            say(
              gap < 0.03
                ? '导丝环贴近上一圈。继续滚动，绕出紧密的一层。'
                : '导丝环向右让开了。继续滚动，留意新绕的两圈之间。',
              guide,
            );
          },
        },
        {
          obj: scale,
          plane: 'xz',
          offset: 0.0018,
          hint: '拖动毫米尺，点尺面近看读数',
          onStart(p) {
            dragStart = scale.position.clone();
            readPoint = p?.clone();
          },
          onDrag(p, start) {
            if (!start || near) return;
            if (readings.length && !recorded) invalidate();
            scale.position.x = clamp(dragStart.x + p.x - start.x, -0.019, 0.019);
            scale.position.z = clamp(dragStart.z + p.z - start.z, alignZ, 0.052);
            instruct();
          },
          onTap() {
            if (!readPoint || !attached || !aligned() || !bar.has('wrap')) return instruct();
            read(readPoint.x);
          },
        },
      ],
      { highlight: true },
    );
    reset();
    return {
      group,
      size: { w: 0.15, h: 0.05, d: 0.12 },
      view: { azim: 3, elev: 49, lookY: 0.32, margin: 1.04 },
      toggles: ['steps'],
      pointer: {
        ...manip,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return manip.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['圈数', '尺读数 / mm', '总宽 / mm', '丝径 / mm', '绕法']);
        nInput = h('input', { type: 'number', min: '1', step: '1', 'aria-label': '完整圈数' });
        dInput = h('input', { type: 'number', min: '0', step: '0.01', 'aria-label': '估测直径 / mm' });
        form = h(
          'div',
          { class: 'ctl' },
          h('label', {}, '完整圈数 ', nInput),
          h('label', {}, '估测直径 / mm ', dInput),
          buttons([{ text: '记录本次测量', onClick: record }]).el,
        );
        form.hidden = true;
        panel.data.append(rows.el, form);
        panel.notes.append(
          note('一小格是 1 mm。沿圆柱前沿同一排数圈、对齐刻度，测的是单层完整圈。不紧绕时，总宽还包含圈间的空隙。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        instruct();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
