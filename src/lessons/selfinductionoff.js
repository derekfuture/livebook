import * as THREE from 'three';
import { SelfInductionCircuit } from './kit/selfInduction.js';
import { selfInductionOffRig, SLOT, PARKS, RETURN_PATH } from './kit/selfInductionOffRig.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table, chart, seg } from './kit/ui.js';

export default {
  id: 'selfinductionoff',
  fig: '图2.4-3',
  title: '观察断电自感',
  stampText: '观察',
  predict: {
    q: '灯泡与线圈并联。断开电源后，灯泡一定会先闪亮再熄灭吗？',
    options: ['不一定，要看断开前线圈中的电流', '一定会', '一定立即熄灭'],
    answer: 0,
    hint: '比较断开前线圈与灯支路的电流。',
  },
  conclusion: {
    page: 47, rect: [64.0, 578.0, 384.0, 745.0],
    quote: '开关断开以后，线圈中的电流并未立即消失……当线圈刚刚接通电源的时候，自感电动势阻碍线圈中电流的增加；当电源断开的时候，自感电动势又阻碍线圈中电流的减小。线圈的自感系数越大，这个现象越明显，线圈能够体现电的“惯性”。',
    why: '线圈与灯泡仍构成闭合回路，线圈储存的磁能逐渐转化为内能。若断开前线圈电流较大，灯泡可能先闪亮再熄灭；通电过短或线圈电阻较大，都可能看不到闪亮。',
    src: '课本第 43 页 · 第二章 第4节 互感和自感',
  },
  create(ctx) {
    const rig = selfInductionOffRig(),
      model = new SelfInductionCircuit({ kind: 'turnOff' }),
      records = [];
    let ui,
      rows,
      plot,
      rateControl,
      speed = 1,
      near = false,
      mounted = 0,
      held = null,
      elapsed = 0,
      coldStart = false,
      capture = null,
      lastRecord = null,
      accumulator = 0,
      stroke = [],
      traceState = null,
      lastReady = true;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        { id: 'flash', title: '断电观察', todo: '先让灯亮稳，再断开 S，看灯如何熄灭。', target: () => rig.sw.group },
        {
          id: 'path',
          title: '沿原线描回路',
          todo: '沿原导线描出断电后经过灯泡的回路。',
          target: () => (near ? null : rig.start),
        },
        {
          id: 'short',
          title: '缩短通电时间',
          todo: '同一线圈短暂通电后断开，与刚才比较。',
          target: () => rig.sw.group,
        },
        {
          id: 'resistance',
          title: '换大电阻线圈',
          todo: '等放电结束，换上 150 Ω 线圈，亮稳后再断开。',
          target: () =>
            near ? null : mounted === 0 ? rig.coils[0].group : mounted === null ? rig.coils[1].group : rig.sw.group,
        },
      ],
    });
    const ready = () => !model.closed && Math.abs(model.current) < 1e-6 && model.lampResponse[0] < 0.01;
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const say = (text) => bar.say((speed === 0.1 ? '0.1× 慢放。' : '') + text);
    function guide() {
      rig.start.visible = bar.current === 'path';
      if (capture) return say('正在记录断电后的灯光和电流。原来的线圈、灯和接线都没有换。');
      if (bar.finished) return say('已比较长通电、短通电和大电阻线圈。断电后灯电流反向，但不一定闪得更亮。');
      if (bar.current === 'path')
        return say('刚才的电流怎样回到线圈？从橙环沿原导线，经灯泡描到线圈左端；开关已断开。');
      if (mounted === null) return say('线圈插座空着。把待用线圈拖回中间插座；灯支路仍可单独通电。');
      if (!model.closed && !ready()) return say('等线圈电流和灯的余光衰减后再操作。马上重合闸会保留上一轮的磁能。');
      if (bar.current === 'flash')
        return say(
          model.closed
            ? '等灯亮稳，再断开 S，留意灯是否先闪亮。'
            : '合上 S，让灯亮稳后断开。点计时牌可切换速度并近看。',
        );
      if (bar.current === 'short')
        return say(
          model.closed
            ? '这次短暂通电后立即断开；与原线圈长时间通电的结果比较。'
            : '仍用 50 Ω 线圈。选 0.1×，短暂合上再立即断开，观察这次是否闪亮。',
        );
      if (mounted !== 1) return say((near ? '回全景，' : '') + '先把原线圈移到左边，再把右侧 150 Ω 线圈拖入中间插座。');
      return say(
        model.closed
          ? '保持通电，等灯亮稳再断开；与 50 Ω 线圈的长通电记录比较。'
          : '合上 S 等灯亮稳，再断开。换的是线圈，仍观察原来这只灯。',
      );
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function setSpeed(v) {
      speed = v;
      rateControl?.set(v === 1 ? 0 : 1);
      guide();
    }
    function inspect() {
      near = true;
      bar.near(true);
      ctx.look([0.04, 0.025, 0.05], [0, 1, 0.45], ctx.camera.aspect < 1 ? 0.68 : 0.85, leave);
      guide();
    }
    function syncEvidence() {
      if (records.some((r) => r.R === 50 && r.duration >= 0.8 && r.cold && r.flash)) bar.done('flash');
      if (
        bar.has('path') &&
        records.some((r) => r.R === 50 && r.duration < 0.04 && r.duration > 0.002 && r.cold && !r.flash)
      )
        bar.done('short');
      if (bar.has('short') && records.some((r) => r.R === 150 && r.duration >= 0.8 && r.cold && !r.flash))
        bar.done('resistance');
    }
    function toggle() {
      enter();
      if (held) return say('先把线圈放稳，再操作开关。');
      if (!model.closed) {
        capture = null;
        coldStart = ready();
        elapsed = 0;
        model.switch(true);
      } else {
        const before = model.observe();
        model.switch(false);
        capture = {
          R: mounted === null ? null : model.coilResistance,
          duration: elapsed,
          cold: coldStart,
          start: model.time,
          before: before.otherCurrent,
          coilBefore: before.coilCurrent,
          after: model.observe().otherCurrent,
          baseline: model.lampResponse[0],
          peak: model.lampResponse[0],
          points: [[0, model.lampResponse[0]]],
          currents: [[0, model.observe().otherCurrent * 1000]],
        };
      }
      guide();
    }
    function finish() {
      const r = capture;
      capture = null;
      r.flash = r.peak > r.baseline * 1.15 && r.peak - r.baseline > 0.08;
      records.push(r);
      lastRecord = r;
      rows.el.hidden = plot.el.hidden = false;
      rows.add([
        String(records.length),
        r.R === null ? '未接线圈' : r.R.toFixed(0),
        r.duration.toFixed(3),
        (r.coilBefore * 1000).toFixed(1),
        (r.before * 1000).toFixed(1),
        (r.after * 1000).toFixed(1),
        r.flash ? '先变亮' : '未明显变亮',
      ]);
      plot.series = records
        .slice(-3)
        .map((r, i) => ({ points: r.points, color: ['#27636c', '#9e704e', '#735887'][i] }));
      plot.el.querySelector('.note').textContent =
        records
          .slice(-3)
          .map(
            (r, i) =>
              ['蓝绿', '赭色', '紫色'][i] +
              '：记录 ' +
              (records.indexOf(r) + 1) +
              '，' +
              (r.R === null ? '未接线圈' : r.R + ' Ω') +
              '，通电 ' +
              r.duration.toFixed(3) +
              ' s',
          )
          .join('；') + '。横轴为断电后的物理时间，纵轴为同尺度的相对发光响应。';
      plot.draw();
      syncEvidence();
      guide();
      if (!r.cold) return say('本轮保留了上一轮的电流或余光。记录已保留，但先等完全熄灭再作条件对照。');
      if (r.R === null) return say('未接线圈时，断开后只有灯的余光衰减。把线圈装回再做对照。');
      if (bar.current === 'path')
        return say(
          '本轮灯先变亮再熄灭，灯电流由 ' +
            (r.before * 1000).toFixed(1) +
            ' 变为 ' +
            (r.after * 1000).toFixed(1) +
            ' mA。现在从橙环沿原导线，经灯描回线圈左端。',
        );
      if (bar.current === 'flash' && r.duration < 0.8)
        return say('这次通电 ' + r.duration.toFixed(3) + ' s，尚未作亮稳后的对照。保持同一线圈，延长通电后再试。');
    }
    function pickup(i) {
      enter();
      held = null;
      if (!ready() || capture) return say('先断开 S，等电流和余光消失，再移动线圈。');
      held = { i, from: rig.coils[i].group.position.clone() };
      if (mounted === i) {
        model.setCoilConnected(false);
        mounted = null;
      }
    }
    function drop(i) {
      if (!held || held.i !== i) return;
      const g = rig.coils[i].group,
        toSlot = g.position.distanceTo(new THREE.Vector3(...SLOT)) < 0.06;
      if (toSlot && mounted === null) {
        g.position.set(...SLOT);
        mounted = i;
        model.coilResistance = i ? 150 : 50;
        model.setCoilConnected(true);
      } else if (g.position.distanceTo(new THREE.Vector3(...PARKS[i])) < 0.08) g.position.set(...PARKS[i]);
      else {
        g.position.copy(held.from);
        if (g.position.distanceTo(new THREE.Vector3(...SLOT)) < 0.01) {
          mounted = i;
          model.coilResistance = i ? 150 : 50;
          model.setCoilConnected(true);
        }
      }
      held = null;
      guide();
    }
    const path = RETURN_PATH.map(([x, z]) => new THREE.Vector2(x, z)),
      lengths = [0];
    for (let i = 1; i < path.length; i++) lengths.push(lengths.at(-1) + path[i].distanceTo(path[i - 1]));
    function projected(p) {
      const v = new THREE.Vector2(p.x, p.z);
      let best = { distance: Infinity, along: 0 };
      for (let i = 1; i < path.length; i++) {
        const d = path[i].clone().sub(path[i - 1]),
          t = Math.max(
            0,
            Math.min(
              1,
              v
                .clone()
                .sub(path[i - 1])
                .dot(d) / d.lengthSq(),
            ),
          ),
          q = path[i - 1].clone().addScaledVector(d, t),
          distance = q.distanceTo(v);
        if (distance < best.distance) best = { distance, along: lengths[i - 1] + t * d.length() };
      }
      return best;
    }
    const pointer = draggable(
      rig.group,
      [
        ...rig.coils.map((p, i) => ({
          obj: p.group,
          plane: 'xz',
          offset: 0,
          keepOffset: true,
          enabled: () => !near && bar.current !== 'path',
          hint: '断电后拖动线圈，移出或装入中间插座',
          onStart: () => pickup(i),
          onDrag(p) {
            if (held?.i === i) rig.coils[i].group.position.set(p.x, 0, p.z);
          },
          onEnd: () => drop(i),
        })),
        {
          obj: rig.pad,
          plane: 'xz',
          offset: 0.02,
          enabled: () => bar.current === 'path' && !capture && !model.closed,
          hint: '从橙环沿导线，经灯泡描回线圈左端',
          onStart(p) {
            stroke = [];
            traceState = null;
            if (!p) return;
            const q = projected(p);
            if (q.distance > 0.025 || q.along > 0.03) return say('从右侧导线上的橙环开始。');
            traceState = { along: q.along, valid: true };
            stroke.push(p.clone());
            rig.trace(stroke);
          },
          onDrag(p) {
            if (!traceState?.valid) return;
            const q = projected(p);
            if (q.distance > 0.025 || q.along < traceState.along - 0.025 || q.along > traceState.along + 0.07) {
              traceState.valid = false;
              return say('沿原来的线圈—灯泡回路描线。S 已断开，不能从电源绕回去。');
            }
            traceState.along = q.along;
            stroke.push(p.clone());
            rig.trace(stroke);
          },
          onEnd() {
            if (traceState?.valid && traceState.along > lengths.at(-1) - 0.025) {
              bar.done('path');
              syncEvidence();
              guide();
            } else {
              rig.trace([]);
              if (traceState?.valid) say('还没回到线圈左端。从橙环重新沿原导线描一遍。');
            }
            traceState = null;
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.sw.group, hint: '开合 S，比较原灯的断电过程', onTap: toggle },
          {
            obj: rig.screen,
            hint: '切换实速与慢放，近看同一回路',
            onTap() {
              setSpeed(speed === 1 ? 0.1 : 1);
              inspect();
            },
          },
        ],
      },
    );
    function reset() {
      model.reset();
      model.coilResistance = 50;
      mounted = 0;
      rig.coils.forEach((p, i) => p.group.position.set(...(i ? PARKS[i] : SLOT)));
      held = capture = lastRecord = traceState = null;
      records.length = 0;
      elapsed = accumulator = 0;
      coldStart = false;
      rig.trace([]);
      rows.clear();
      rows.el.hidden = plot.el.hidden = true;
      plot.series = [];
      bar.undo('flash', 'path', 'short', 'resistance');
      setSpeed(1);
      leave();
    }
    rig.draw(model, 1, speed, 0, null, null);
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.64, d: 0.47, h: 0.12 },
      view: { elev: 52, azim: -5, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['轮次', '线圈 R / Ω', '通电 / s', '断前线圈 / mA', '断前灯 / mA', '断后灯 / mA', '灯光']);
        plot = chart({
          x: { label: '断电后 t / s', min: 0, max: 0.35 },
          y: { label: '相对发光响应', min: 0, max: 2.5 },
          legend: '记录同一只灯的实际模型响应。电流正方向是从灯左端到右端。',
        });
        rows.el.hidden = plot.el.hidden = true;
        ui.data.append(rows.el, plot.el);
        rateControl = seg('观察速度', ['实速', '0.1× 慢放'], (_, i) => setSpeed(i ? 0.1 : 1));
        ui.notes.append(
          note(
            '固定接线与图 2.4-3 一致。点计时牌可慢放并近看；在全景把原线圈拖到左侧，再把右侧线圈装入插座。两线圈电感同为 8 H，绕组电阻分别为 50 Ω、150 Ω，是用来比较条件的模型设值。',
          ),
          rateControl.el,
          buttons([
            { text: '开合 S', onClick: toggle },
            { text: '近看回路', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '灯的工作点等效电阻 100 Ω，电源 4 V、等效内阻 2 Ω；以固定电阻和发光惯性近似灯丝。计时牌的带符号电流及描线是观察辅助，不是额外接入的电流表。灯的瞬时亮度显示有上限，图中保留未裁切的模型响应。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        accumulator += dt * speed;
        while (accumulator >= 0.001) {
          accumulator -= 0.001;
          model.advance(0.001);
          if (model.closed) elapsed += 0.001;
          if (capture) {
            const t = model.time - capture.start;
            capture.peak = Math.max(capture.peak, model.lampResponse[0]);
            capture.points.push([t, model.lampResponse[0]]);
            capture.currents.push([t, model.observe().otherCurrent * 1000]);
            if (t >= 0.35) finish();
          }
        }
        const next = ready();
        if (next !== lastReady) {
          lastReady = next;
          if (!capture) guide();
        }
        rig.draw(model, dt, speed, elapsed, capture, lastRecord);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
