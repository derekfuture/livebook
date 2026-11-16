import * as THREE from 'three';
import { AmpereFactors } from './kit/ampereFactors.js';
import { ampereFactorsRig, AMPERE_PIVOT } from './kit/ampereFactorsRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { readMeterTick } from './kit/meterReading.js';
import { h, note, buttons } from './kit/ui.js';
export default {
  id: 'amperefactors',
  fig: '图13.2-1',
  title: '探究安培力大小的影响因素',
  stampText: '实验',
  predict: {
    q: '要判断通电长度怎样影响安培力，换接线点后还需要控制什么？',
    options: ['保持电流相同', '同时增大电流', '换掉悬棒'],
    answer: 0,
  },
  conclusion: {
    quote: '导线与磁场垂直时，安培力大小 F = BIl。',
    why: '三块磁体保持不动，同一根悬棒先保持通电长度比较不同电流，再保持电流比较不同通电长度。偏转支持力的大小比较；平衡时 tanθ = F/(mg)，不能把偏角本身直接当作力值。',
    src: '人教版高中物理必修第三册第109–110页，图13.2-1',
  },
  create(ctx) {
    const model = new AmpereFactors(),
      rig = ampereFactorsRig(),
      { group, sw, rheostat, meter } = rig;
    let ui,
      body,
      report,
      choice,
      aim,
      near = '',
      pending = null,
      records = [],
      age = 0,
      dragging = false,
      last = '',
      feedback = '';
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'base', title: '短段第一组', todo: '合闸，读电流，再近看悬线记录偏转。', target: () => aim },
        { id: 'current', title: '只改电流', todo: '保持2—3接线，拖滑片改变电流后复测。', target: () => aim },
        { id: 'length', title: '只改长度', todo: '断电改接1—4，调回已测电流，再记录偏转。', target: () => aim },
        { id: 'compare', title: '比较证据', todo: '打开笔记本比较两组单变量观察。', target: () => aim },
        { id: 'off', title: '断电收尾', todo: '断开原开关。', target: () => aim },
      ],
    });
    const short = () => records.filter((r) => r.ports === '2—3' && r.I >= 0.4),
      longMatch = () =>
        records.find(
          (r) => r.ports === '1—4' && short().some((s) => s.I === r.I && Math.abs(s.actual - r.actual) < 0.06),
        );
    function say(s, obj = null) {
      aim = obj;
      const text = feedback + s;
      if (last !== text) {
        bar.say(text);
        last = text;
      }
    }
    function enter() {
      feedback = '';
      last = '';
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function leave() {
      near = '';
      ctx.back();
      bar.near(false);
      guide();
    }
    function guide() {
      if (dragging) return;
      if (near === 'meter') return say('使用3 A量程，每小格0.1 A。沿指针点它所指的刻线。');
      if (near === 'rod')
        return say(
          model.settled
            ? '观察原悬线的倾斜，再点悬线把这次侧影记入笔记本。'
            : '悬棒还在动。等它稳定，再点原悬线留下观察。',
          rig.observation,
        );
      if (bar.has('compare')) {
        if (sw.closed) return say('比较已完成。点原开关断电，保留本次观察。', sw.group);
        bar.done('off');
        return say('两组单变量对照已保存，电路已断开。');
      }
      if (model.connections.includes(null))
        return say(
          '先断开开关，把悬空线头拖到空接线点。红线在左、黑线在右。',
          sw.closed ? sw.group : rig.plugs[model.connections.indexOf(null)],
        );
      if (sw.closed && model.signedLength < 0)
        return say('接线反向，棒也向另一侧偏转。先断电，交换红黑线，保持比较时电流方向一致。', sw.group);
      if (pending) return say(`已读${pending.I.toFixed(1)} A。点右侧悬线近看，观察后再点一次留侧影。`, rig.observation);
      if (bar.has('length') && bar.has('current')) return say('已取得两组单变量证据。打开笔记本，比较实际侧影。');
      if (!sw.closed) {
        if (bar.has('current') && model.connections.join() !== '0,3')
          return say(
            '保持磁体不动：红线从2拖到1，黑线从3拖到4，再合闸。',
            rig.plugs[model.connections[0] === 0 ? 1 : 0],
          );
        return say('点前排开关合闸。电流沿两接线点之间的原悬棒通过。', sw.group);
      }
      if (model.signedLength < 0)
        return say('接线反向，棒也向另一侧偏转。先断电，交换红黑线，保持比较时电流方向一致。', sw.group);
      if (!['1,2', '0,3'].includes(model.connections.join()))
        return say('当前也是有效通电长度。本课对照用2—3和1—4；先断电再换接。', sw.group);
      if (!pending) {
        if (bar.has('current') && model.connections.join() === '1,2')
          return say('短段的两种电流已比较。先断电，再把红线接1、黑线接4。', sw.group);
        if (age < 1 || !model.settled) return say('等指针和悬棒稳定，保持滑片不动。', meter.dial);
        const target = short()
          .map((s) => s.I.toFixed(1))
          .filter((v, i, a) => a.indexOf(v) === i)
          .join('或');
        return say(
          model.connections.join() === '0,3' && target
            ? `保持长段1—4，拖滑片调到已测的${target} A。点电流表近看读数。`
            : '点电流表近看，按3 A量程读电流。',
          meter.dial,
        );
      }
      say(`已读${pending.I.toFixed(1)} A。点右侧悬线近看，观察后再点一次留侧影。`, rig.observation);
    }
    function changed() {
      pending = null;
      age = 0;
      if (near) leave();
      guide();
    }
    function observe() {
      enter();
      if (!sw.closed || !pending) return guide();
      if (!model.settled) return say('悬棒仍在摆动。等它停稳，再记录这次观察。', rig.observation);
      if (near !== 'rod') {
        near = 'rod';
        bar.near(true);
        ctx.look([0.06, 0.115, 0.016], [1, 0.02, 0.02], 0.45, leave);
        return guide();
      }
      const ports = model.connections.map((i) => i + 1).join('—'),
        r = { ...pending, ports, angle: model.angle };
      if (records.some((s) => s.ports === ports && s.I === r.I && Math.abs(s.actual - r.actual) < 0.06)) {
        leave();
        return say('这组条件已经记录。保持接线不变，拖滑片换一个明显不同的电流。', rheostat.slider);
      }
      records.push(r);
      const sketch = h('canvas', { width: 130, height: 112, 'aria-label': `第${records.length}组悬线侧影` });
      sketch.style.width = '100px';
      sketch.style.height = '86px';
      const c = sketch.getContext('2d');
      c.strokeStyle = '#a09b8d';
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(42, 10);
      c.lineTo(42, 100);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = '#474d4d';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(42, 10);
      const x = 42 + 90 * Math.sin(r.angle),
        y = 10 + 90 * Math.cos(r.angle);
      c.lineTo(x, y);
      c.stroke();
      c.fillStyle = '#ae8445';
      c.beginPath();
      c.arc(x, y, 4, 0, Math.PI * 2);
      c.fill();
      body.append(
        h(
          'tr',
          {},
          h('td', {}, String(records.length)),
          h('td', {}, ports),
          h('td', {}, r.I.toFixed(1)),
          h('td', {}, sketch),
        ),
      );
      if (short().length) bar.done('base');
      if (short().some((a) => short().some((b) => Math.abs(a.I - b.I) >= 0.35))) bar.done('current');
      if (longMatch()) bar.done('length');
      report.hidden = !(bar.has('current') && bar.has('length'));
      pending = null;
      leave();
      if (ports === '1—4' && !longMatch())
        return say(
          '这次长段观察已保存，但电流也变了。调回短段已测电流，再读表和观察，才能只比较长度。',
          rheostat.slider,
        );
      if (!bar.has('current'))
        return say(
          '这次侧影已保存。保持2—3接线，拖滑片让电流明显改变（相差至少0.4 A），再读表、看悬线。',
          rheostat.slider,
        );
      guide();
    }
    function read(ray) {
      enter();
      if (!sw.closed || age < 1 || !model.settled) return guide();
      if (near !== 'meter') {
        near = 'meter';
        bar.near(true);
        const p = group.worldToLocal(meter.group.face.getWorldPosition(new THREE.Vector3()));
        ctx.look(p.toArray(), [0, 0.01, 1], 0.13, leave);
        return guide();
      }
      const hit = ray.intersectObject(meter.dial, false)[0];
      if (!hit) return;
      const { value, error } = readMeterTick(meter, hit);
      if (error) return say(error);
      if (value < 0.4) return say('电流太小，偏转不易比较。回到全景，减小变阻器接入电阻后再读。');
      pending = { I: value, actual: model.electrical().current };
      leave();
    }
    const pointer = draggable(
      group,
      [
        ...rig.plugs.map((plug, i) => ({
          obj: plug,
          plane: 'xz',
          offset: AMPERE_PIVOT + 0.006,
          keepOffset: true,
          onStart() {
            enter();
            dragging = true;
          },
          onDrag(p) {
            if (sw.closed) return say('先断开前排开关，再移动线头。', sw.group);
            rig.lead(i, new THREE.Vector3(clamp(p.x, -0.1, 0.1), AMPERE_PIVOT + 0.006, clamp(p.z, -0.025, 0.065)));
          },
          onEnd(moved) {
            dragging = false;
            if (sw.closed) return say('先断开前排开关，再移动线头。', sw.group);
            if (!moved) return guide();
            const distances = rig.sockets.map((p) => p.distanceTo(plug.position)),
              k = distances.indexOf(Math.min(...distances));
            if (distances[k] < 0.016 && model.connections[1 - i] !== k) {
              model.connections[i] = k;
              rig.lead(i, rig.sockets[k]);
            } else {
              model.connections[i] = null;
              rig.lead(i, new THREE.Vector3(i ? -0.19 : 0.24, 0.008, 0.13));
            }
            changed();
          },
        })),
        {
          obj: rheostat.slider,
          plane: 'xz',
          offset: 0.038,
          keepOffset: true,
          onStart: enter,
          onDrag(p) {
            rheostat.setPos(rheostat.posFromLocalX(p.x - rheostat.group.position.x));
            model.setPosition(rheostat.pos);
            changed();
          },
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: sw.group,
            onTap() {
              enter();
              sw.toggle();
              model.setClosed(sw.closed);
              if (sw.closed) bar.undo('off');
              changed();
            },
          },
          { obj: meter.dial, onTap: read },
          { obj: rig.observation, onTap: observe },
        ],
      },
    );
    function reset() {
      enter();
      if (near) leave();
      model.reset();
      sw.closed = false;
      rheostat.setPos(0.5);
      rig.sockets.slice(1, 3).forEach((p, i) => rig.lead(i, p));
      rig.swing(0);
      pending = null;
      records = [];
      body.replaceChildren();
      report.hidden = true;
      choice.value = '';
      age = 0;
      bar.undo('base', 'current', 'length', 'compare', 'off');
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.58, d: 0.58, h: 0.24 },
      view: { elev: 24, azim: 25, lookY: 0.45, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        body = h('tbody');
        ui.data.append(
          h(
            'table',
            { class: 'data' },
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                ['组', '接线点', 'I / A', '同尺度侧影'].map((s) => h('th', {}, s)),
              ),
            ),
            body,
          ),
          note('虚线为断电时的竖直方向。侧影来自当时同一根悬线；不把偏角直接作为力的数值。'),
        );
        choice = h(
          'select',
          { 'aria-label': '安培力比较' },
          h('option', { value: '' }, '根据两组控制变量证据选择'),
          h('option', { value: 'right' }, '电流更大或通电长度更长，偏转更大'),
          h('option', { value: 'angle' }, '偏角与电流、长度严格成正比'),
          h('option', { value: 'both' }, '同时改变电流和长度就能分别判断影响'),
        );
        choice.addEventListener('input', () => {
          enter();
          bar.undo('compare', 'off');
          guide();
        });
        report = h(
          'div',
          {},
          note('比较2—3的不同电流，再比较同电流的2—3与1—4。悬棒质量、磁场和悬线长度始终相同。'),
          choice,
          buttons([
            {
              text: '核对比较',
              onClick() {
                enter();
                if (choice.value !== 'right')
                  return say('只比较其他条件相同的两行。侧影能判断偏转大小；平衡关系是tanθ=F/(mg)，不是θ与F成正比。');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(report);
        ui.notes.append(
          note(
            '先合闸，点电流表近看后点指针刻线；回到全景点右侧悬线，从侧面看稳定偏转，再点一次记录。先只拖滑片改变电流。换长度时断电，把红线2拖到1、黑线3拖到4；重新调回已记录的电流。磁体不移动，悬棒不更换。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '理想近似：三块磁体的间隙内取同向匀强场0.35 T，忽略窄缝与边缘场；同一悬棒及随动件总质量16 g，悬线14 cm。长度2—3为4 cm，1—4为12 cm。它们是本活页名义配置，不是教材测量结果。',
          ),
          note(
            '电源3 V、内阻0.1 Ω；串联可见1.5 Ω/10 W保护电阻和5 Ω变阻器，电流表接3 A端。保留导体运动电动势和机械阻尼，忽略电感、电阻温升与悬线刚度。稳态tanθ= BIl/(mg)，侧影只支持大小趋势，不能替代定量测力。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const was = model.settled;
        model.advance(dt);
        age += dt;
        rig.swing(model.angle);
        sw.update(dt);
        meter.read([{ I: 0 }, { I: model.electrical().current }]);
        meter.update(dt);
        if (!dragging && ((!was && model.settled) || (age >= 1 && age - dt < 1))) guide();
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
      },
    };
  },
};
