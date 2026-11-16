import { selfInductionRig } from './kit/selfInductionRig.js';
import { SelfInductionCircuit } from './kit/selfInduction.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, seg, table, chart } from './kit/ui.js';

export default {
  id: 'selfinductionon',
  fig: '图2.4-1',
  title: '观察通电自感',
  stampText: '观察',
  predict: {
    q: '两灯已调到稳态同样明亮。断开后重新接通，它们会同时亮起来吗？',
    options: ['线圈支路较慢亮起', '两灯同时亮起', '线圈支路先亮'],
    answer: 0,
    hint: '稳态相同，不表示刚接通时也相同。',
  },
  conclusion: {
    quote: '线圈的自感电动势阻碍电流增加，与线圈串联的灯较慢亮起来。',
    why: '先调到两灯稳态同亮，再比较重新通电的瞬间，才能把原来亮度不一致的影响排除。断电后线圈电流并不立即消失，两灯通过原有支路形成串联回路，随后一同熄灭。',
    src: '人教版高中物理选择性必修第二册第 41 页 · 图 2.4-1',
  },
  create(ctx) {
    const rig = selfInductionRig(),
      model = new SelfInductionCircuit({ balanceResistance: 100, sourceResistance: 50 });
    let ui,
      rows,
      plot,
      speed = 1,
      near = false,
      changed = 0,
      elapsed = 0,
      adjustedR = false,
      adjustedR1 = false,
      run = null,
      candidate = null,
      accumulator = 0;
    const records = [];
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        {
          id: 'balance',
          title: '调两灯等亮',
          todo: '合上 S，拖 R 的滑片，调到两灯稳态同亮。',
          target: () => (near ? null : model.closed ? rig.balance.slider : rig.sw.group),
        },
        {
          id: 'normal',
          title: '调正常亮度',
          todo: '拖 R₁，让 A₁ 电压为额定的 4 V。',
          target: () => (near ? null : rig.common.slider),
        },
        { id: 'reclose', title: '断开再合闸', todo: '断开 S，等两灯熄灭，再合上观察。', target: () => rig.sw.group },
        { id: 'observe', title: '比较亮起先后', todo: '看清刚接通时两灯的区别，点较先亮起的灯。' },
      ],
    });
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const stable = () => model.closed && model.time - changed > 0.4;
    const equal = () => {
      const s = model.observe();
      return Math.abs(s.coilCurrent - s.otherCurrent) < 0.0015;
    };
    const normal = () => equal() && Math.abs(model.current * 100 - 4) < 0.15;
    const say = (text) => bar.say((speed === 0.1 ? '0.1× 慢放。' : '') + text);
    function guide() {
      if (bar.finished)
        return say('已在同一套条件下观察到 A₂ 较先亮起、A₁ 随后追上。可重复开关，或在笔记本对照本轮曲线。');
      if (!bar.has('balance'))
        return say(
          model.closed ? '拖 R 的黑滑片，等两灯亮度稳定后比较；先只调 R。' : '合上 S，先用 R 调到两灯稳态同样亮。',
        );
      if (!bar.has('normal'))
        return say(
          model.closed
            ? '两灯已等亮。拖 R₁ 调总亮度，点右侧电压表近看，使 A₁ 达到额定 4 V。'
            : '合上 S，再调 R₁；额定电压是 4 V。',
        );
      if (!bar.has('reclose'))
        return say(
          model.closed
            ? '两灯已正常发光。断开 S，等余光消失，再重新合上；电阻保持不动。'
            : '保持 R、R₁ 不动，等两灯熄灭，再合上 S。点计时牌可选 0.1× 慢放。',
        );
      if (run) return say('两灯正在亮起。看谁先亮；计时牌显示实际物理时间。');
      return say(
        candidate
          ? '点刚才较先亮起的灯。没看清可断开重做；计时牌可切为 0.1× 并近看两灯。'
          : '请断开，等余光消失，再合上 S 观察两灯。',
      );
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function toggle() {
      enter();
      const closing = !model.closed;
      const eligible = closing && bar.has('normal') && model.current < 0.0002 && Math.max(...model.lampResponse) < 0.01;
      model.switch(closing);
      changed = model.time;
      candidate = null;
      if (closing) {
        elapsed = 0;
        run = {
          eligible,
          points: [[], []],
          cross: [null, null],
          R: model.balanceResistance,
          R1: model.sourceResistance,
        };
        if (eligible) bar.done('reclose');
      } else run = null;
      guide();
    }
    function speedChange(value) {
      speed = value;
      speedControl?.set(value === 1 ? 0 : 1);
      guide();
    }
    function adjust(which, p) {
      enter();
      const part = which === 'R' ? rig.balance : rig.common;
      part.setPos(clamp(part.posFromLocalX(p.x - part.group.position.x), 0, 1));
      if (which === 'R') {
        model.balanceResistance = part.pos * part.Rmax;
        adjustedR = true;
        bar.undo('balance');
      } else {
        model.sourceResistance = part.pos * part.Rmax;
        adjustedR1 = true;
      }
      changed = model.time;
      run = candidate = null;
      bar.undo('normal', 'reclose', 'observe');
      guide();
    }
    function observe(index) {
      enter();
      if (!bar.has('reclose') || !candidate) return guide();
      const earlier = candidate.cross[0] < candidate.cross[1] ? 0 : 1;
      if (index !== earlier) return say('这一轮请再看两灯刚起亮的过程。断开 S 重试，或选 0.1×；稳态时两灯又会一样亮。');
      records.push(candidate);
      rows.el.hidden = plot.el.hidden = false;
      rows.add([
        String(records.length),
        candidate.R.toFixed(1),
        candidate.R1.toFixed(1),
        'A' + (index + 1),
        ...candidate.cross.map((t) => (t * 1000).toFixed(0)),
      ]);
      plot.series = candidate.points.map((points, i) => ({ points, color: i ? '#9e704e' : '#27636c' }));
      plot.draw();
      candidate = null;
      bar.done('observe');
      guide();
    }
    const pointer = draggable(
      rig.group,
      [
        ...[
          [rig.balance, 'R'],
          [rig.common, 'R1'],
        ].map(([part, name]) => ({
          obj: part.slider,
          plane: 'xz',
          offset: 0.038,
          keepOffset: true,
          hint: '拖动 ' + name + ' 的滑片',
          onDrag: (p) => adjust(name, p),
        })),
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.sw.group, hint: '开合 S，观察同一对灯', onTap: toggle },
          ...rig.lamps.map((lamp, i) => ({
            obj: lamp.group,
            hint: '选刚才较先亮起的 A' + (i + 1),
            onTap: () => observe(i),
          })),
          {
            obj: rig.clock,
            hint: '切换观察速度，近看同一对灯和开关',
            onTap() {
              speedChange(speed === 1 ? 0.1 : 1);
              near = true;
              bar.near(true);
              ctx.look([0.13, 0.03, 0.035], [0, 1, 0.5], ctx.camera.aspect < 1 ? 0.56 : 0.75, leave);
            },
          },
          {
            obj: rig.meter.group,
            hint: '近看 A₁ 的电压表',
            onTap() {
              near = true;
              bar.near(true);
              ctx.look([0.25, 0.05, -0.01], [0, 0.5, 1], ctx.camera.aspect < 1 ? 0.29 : 0.17, leave);
              guide();
            },
          },
        ],
      },
    );
    let speedControl;
    function reset() {
      model.reset();
      model.balanceResistance = 100;
      model.sourceResistance = 50;
      rig.balance.setPos(100 / 150);
      rig.common.setPos(50 / 75);
      changed = elapsed = accumulator = 0;
      adjustedR = adjustedR1 = false;
      run = candidate = null;
      records.length = 0;
      rows.clear();
      rows.el.hidden = plot.el.hidden = true;
      plot.series = [];
      speedChange(1);
      bar.undo('balance', 'normal', 'reclose', 'observe');
      leave();
      rig.draw(model, 1, speed, elapsed);
    }
    rig.draw(model, 1, speed, 0);
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.68, d: 0.55, h: 0.12 },
      view: { elev: 51, azim: -6, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['轮次', 'R / Ω', 'R₁ / Ω', '先亮', 'A₁ / ms', 'A₂ / ms']);
        plot = chart({
          x: { label: 't / s', min: 0, max: 0.4 },
          y: { label: '相对发光响应', min: 0, max: 1.6 },
          legend:
            '蓝绿 A₁、赭色 A₂。时间是本轮重新接通后的物理时间；表中时刻按同一发光响应阈值 0.2 记录，仅为观察辅助。',
        });
        rows.el.hidden = plot.el.hidden = true;
        ui.data.append(rows.el, plot.el);
        speedControl = seg('观察速度', ['实速', '0.1× 慢放'], (_, i) => speedChange(i === 0 ? 1 : 0.1));
        ui.notes.append(
          note(
            '固定接线对应原图。先调 R 等亮，再调 R₁，让并在 A₁ 两端的高内阻电压表指到 4 V。计时牌可直接切换观察速度；慢放不改电感或电阻。',
          ),
          speedControl.el,
          buttons([
            { text: '开合 S', onClick: toggle },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '模型：电源 8 V，线圈 8 H / 50 Ω，绕组外形示意；两灯均以 4 V / 0.04 A 工作点等效电阻 100 Ω 计算，显示加入 0.02 s 的发光惯性。忽略电压表负载；不模拟完整钨丝非线性及铁芯饱和。',
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
          if (run) {
            run.points.forEach((a, i) => {
              a.push([elapsed, model.lampResponse[i]]);
              if (run.cross[i] === null && model.lampResponse[i] >= 0.2) run.cross[i] = elapsed;
            });
            if (elapsed >= 0.4) {
              candidate = run.eligible && run.cross.every((t) => t !== null) ? run : null;
              run = null;
              guide();
            }
          }
        }
        if (stable()) {
          if (adjustedR && equal() && !bar.has('balance')) {
            bar.done('balance');
            guide();
          }
          if (bar.has('balance') && adjustedR1 && normal() && !bar.has('normal')) {
            bar.done('normal');
            guide();
          }
        }
        rig.draw(model, dt, speed, elapsed);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
