import { MutualInduction, couplingAtHeight } from './kit/mutualInduction.js';
import { mutualInductionRig, COIL_CENTER, INSERTED_BOTTOM, RAISED_BOTTOM } from './kit/mutualInductionRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';
export default {
  id: 'mutualinduction',
  fig: '图13.3-3',
  title: '探究感应电流产生的条件',
  stampText: '实验',
  predict: {
    q: '内线圈一直通着直流电，外线圈的电流计会一直偏转吗？',
    options: ['不会，磁通量变化时才有感应电流', '会，只要内线圈有电流', '两线圈不接触就不会'],
    answer: 0,
    hint: '把开合瞬间、保持不动和移动滑片分开观察。',
  },
  conclusion: {
    quote: '穿过闭合导体回路的磁通量发生变化时，回路中产生感应电流。',
    why: '合闸和断开使内线圈电流变化，外线圈出现相反方向的短暂感应电流。保持直流电流和两线圈位置不变时，磁通量不再变化，电流计回零。移动滑片改变内线圈电流，也能使外线圈产生感应电流。',
    src: '人教版高中物理必修第三册第115–116页 · 图13.3-3',
  },
  create(ctx) {
    const rig = mutualInductionRig(),
      model = new MutualInduction(),
      records = [];
    let bottom = RAISED_BOTTOM,
      held = null,
      liftStart = RAISED_BOTTOM,
      ui,
      rows,
      near = false,
      capture = null,
      lastAction = 0,
      sliderStart = 28,
      slideUp = false,
      slideDown = false;
    model.setCoupling(couplingAtHeight(bottom));
    const inserted = () => bottom <= INSERTED_BOTTOM + 0.004;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        { id: 'insert', title: '装入 A', todo: '握 A 顶部横柄，沿竖直方向向下拖，装入 B。', target: () => rig.grip },
        { id: 'close', title: '合闸观察', todo: '合上 S，同时看 G 的指针。', target: () => rig.sw.group },
        {
          id: 'steady',
          title: '保持不动',
          todo: '保持合闸，不动滑片和线圈；表针回零后点 G 确认。',
          target: () => rig.meter,
        },
        {
          id: 'slide',
          title: '往返移滑片',
          todo: '保持合闸，把 R 的滑片移向一侧，再反向移动，观察偏转。',
          target: () => rig.rheostat.slider,
        },
        { id: 'open', title: '断开观察', todo: '停稳后断开 S，与合闸时的偏转比较。', target: () => rig.sw.group },
      ],
    });
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (capture) return bar.say('看右侧 G 的原表针。正在记录这次' + capture.label + '；等它回零后再换条件。');
      if (bar.finished)
        return bar.say('四种条件已比较。恒定电流不会让 G 一直偏转。还可保持合闸，提起再放入同一线圈 A。');
      if (!inserted()) return bar.say('握 A 顶部横柄竖直向下拖，把内线圈装入 B；导线保持连接。');
      if (bar.current === 'close') return bar.say('点 S 合闸，同时观察右侧 G。若没看清，可断开后再试一次。');
      if (bar.current === 'steady')
        return bar.say(
          model.closed
            ? '保持 S 合上，不动滑片和线圈。等 G 回零后，点原表确认这次观察。'
            : '先合上 S，再保持滑片和线圈不动，观察 G 是否一直偏转。',
        );
      if (bar.current === 'slide')
        return bar.say(
          !model.closed
            ? '先合上 S，保持 A 在 B 内，再拖 R 的滑块。'
            : slideUp
              ? '已观察增大电阻。这次把滑片向左移，减小电阻，再看 G。'
              : slideDown
                ? '已观察减小电阻。这次把滑片向右移，增大电阻，再看 G。'
                : '保持合闸。拖 R 的黑色滑块，较快移过一段；停稳后反向移动。',
        );
      return bar.say(
        model.closed
          ? '保持滑片不动，断开 S，看 G 是否向合闸时相反的一侧偏转。'
          : '已断开。若没看清，合上后等表针停稳，再断开重做。',
      );
    }
    function begin(kind, label) {
      capture = {
        kind,
        label,
        start: model.time,
        last: model.time,
        peak: 0,
        startR: model.resistance,
        inside: inserted(),
        closed: model.closed,
        clean: Math.abs(model.observe().meter) < 0.000002 && Math.abs(model.observe().meterSpeed) < 0.00003,
      };
      lastAction = model.time;
      guide();
    }
    function finish() {
      const c = capture;
      capture = null;
      const direction = Math.abs(c.peak) < 0.000004 ? '未明显偏转' : c.peak > 0 ? '向右偏转' : '向左偏转';
      records.push(c);
      rows?.add([String(records.length), c.label, direction]);
      if (rows) rows.el.hidden = false;
      if (c.clean && c.inside && Math.abs(c.peak) > 0.000004) {
        if (c.kind === 'close') bar.done('close');
        if (c.kind === 'open') bar.done('open');
        if (c.kind === 'slide' && c.closed && model.closed) {
          if (model.resistance - c.startR > 10 && c.peak > 0) slideUp = true;
          if (model.resistance - c.startR < -10 && c.peak < 0) slideDown = true;
          if (slideUp && slideDown) bar.done('slide');
        }
      }
      guide();
      if (!c.clean) return bar.say('这次开始时表针尚未停稳。等 G 回零后，重做同一动作，单独比较它的偏转。');
      if (c.kind === 'slide' && !bar.has('slide') && Math.abs(c.peak) < 0.000004)
        bar.say(
          model.closed
            ? '这次偏转很小。保持合闸，把同一滑片较快移动更长一段，再观察。'
            : '开关断开时拖滑片，没有持续的原线圈电流可改变。先合上 S 再试。',
        );
    }
    function toggle() {
      enter();
      const closing = !model.closed;
      model.switch(closing);
      begin(closing ? 'close' : 'open', closing ? '合闸瞬间' : '断开瞬间');
      rig.draw(model);
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      near = true;
      bar.near(true);
      ctx.look([0.19, 0.045, 0.015], [0, 0.4, 1], ctx.camera.aspect < 1 ? 0.22 : 0.28, leave);
    }
    function meterTap() {
      enter();
      if (bar.current === 'steady') {
        const s = model.observe();
        if (!model.closed || !inserted()) return guide();
        if (capture || model.time - lastAction < 0.7 || Math.abs(s.meter) > 0.000002 || Math.abs(s.i2) > 1e-7)
          return bar.say('先保持开关合上、滑片和线圈不动，让表针充分停稳后再点。');
        rows.add([String(records.length + 1), '合闸后保持不动', '回到零位']);
        rows.el.hidden = false;
        records.push({ kind: 'steady' });
        bar.done('steady');
        guide();
        return;
      }
      inspect();
    }
    const desk = draggable(
      rig.group,
      [
        {
          obj: rig.grip,
          anchor: rig.inner.group,
          plane: 'xy',
          offset: COIL_CENTER[1],
          keepOffset: true,
          hint: '握横柄上下拖，装入或提起同一线圈',
          onStart() {
            enter();
            liftStart = bottom;
            held = 'coil';
            begin('coil', '移动线圈 A');
          },
          onDrag(p) {
            bottom = clamp(p.y, INSERTED_BOTTOM, RAISED_BOTTOM);
            rig.lift(bottom);
            model.setCoupling(couplingAtHeight(bottom));
            lastAction = model.time;
            if (capture) capture.last = model.time;
            if (inserted()) bar.done('insert');
          },
          onEnd() {
            held = null;
            if (capture?.kind === 'coil' && (!model.closed || Math.abs(bottom - liftStart) < 0.001)) {
              capture = null;
              guide();
            }
          },
        },
        {
          obj: rig.rheostat.slider,
          anchor: rig.rheostat.slider,
          plane: 'xz',
          offset: 0.038,
          keepOffset: true,
          hint: '左右拖滑块，保持线圈不动来改变电流',
          onStart() {
            enter();
            held = 'slide';
            sliderStart = model.resistance;
            begin('slide', model.closed ? '合闸时移动滑片' : '断开时移动滑片');
          },
          onDrag(p) {
            model.setResistance(
              clamp((p.x - rig.rheostat.group.position.x + rig.rheostat.L / 2) / rig.rheostat.L, 0, 1) * 100,
            );
            rig.draw(model);
            lastAction = model.time;
            if (capture) capture.last = model.time;
          },
          onEnd() {
            held = null;
            if (capture?.kind === 'slide' && Math.abs(model.resistance - sliderStart) < 2) {
              capture = null;
              guide();
            }
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.sw.group, hint: '开合 S，观察原表的瞬时偏转', onTap: toggle },
          { obj: rig.meter, hint: '确认稳恒时回零，或近看原表', onTap: meterTap },
        ],
      },
    );
    // 近看只观察同一表，回全景后继续操作原器材。
    const pointer = {
      items: desk.items,
      down(ray, e) {
        return near ? true : desk.down(ray, e);
      },
      move(ray) {
        return near || desk.move(ray);
      },
      up() {
        return desk.up();
      },
      dispose() {
        desk.dispose();
      },
    };
    function reset() {
      model.reset();
      bottom = RAISED_BOTTOM;
      model.setCoupling(couplingAtHeight(bottom));
      rig.lift(bottom);
      capture = null;
      held = null;
      slideUp = slideDown = false;
      lastAction = 0;
      records.length = 0;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('insert', 'close', 'steady', 'slide', 'open');
      rig.draw(model);
      leave();
    }
    rig.draw(model);
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.61, d: 0.46, h: 0.22 },
      view: { elev: 34, azim: -4, margin: 1.1 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['轮次', '实际操作', 'G 的观察']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            'A 经 R 和 S 接电源，B 单独接 G，两个电路没有导线相通。接线已预装，本课练习装入线圈和比较条件，不算自主接线训练。手动导向架辅助保持同轴，不参与电路。握 A 的顶柄竖直拖动；拖 R 的黑色滑块；点 S 开合。',
          ),
          buttons([
            { text: '开合 S', onClick: toggle },
            { text: '近看 G', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '记录来自同一模型表针的响应，定性显示偏转，不把无数字标定的 G 当精密微安表。绕组外观不逐匝计数；互感用有限长内线圈轴上场的平均近似，仪表含阻尼惯性。开断暂态含等效寄生电容，不预测真实接点电弧或峰值电压。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        model.advance(dt);
        rig.draw(model);
        if (capture) {
          const q = model.observe().meter;
          if (Math.abs(q) > Math.abs(capture.peak)) capture.peak = q;
          if (!held && model.time - capture.last > 0.75) finish();
        }
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
