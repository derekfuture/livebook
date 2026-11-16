import { electronBeamRig, CENTER } from './kit/electronBeamRig.js';
import { traceBeam, coilField } from './kit/electronBeam.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, note, table, chart, h } from './kit/ui.js';

export default {
  id: 'lorentzbeam',
  fig: '图1.3-2',
  title: '观察电子束在磁场中的径迹',
  stampText: '观察',
  predict: {
    q: '电子束向左射出，磁场由你指向玻璃泡后方，电子束会向哪边弯？',
    options: ['向上', '向下', '仍沿直线'],
    answer: 0,
    hint: '电子带负电，先确定速度和磁场方向。',
  },
  conclusion: {
    page: 19, rect: [63.59, 56.36, 378.51, 161.47],
    quote: '在前面的实验中，不加磁场时，电子束的径迹是一条直线（图1.3-3）。加磁场后电子束的径迹是一个圆（图1.3-4）。当电子束出射速度不变，磁感应强度变大时，这个圆的半径变小；当磁感应强度不变，电子束出射速度变大时，这个圆的半径变大。',
    why: '垂直入射时，电子在匀强磁场中做圆周运动。保持速度，磁场越强半径越小；保持磁场，电子越快半径越大。斜着射入时，沿磁场的运动与垂直磁场的圆周运动合成螺旋；平行入射不受磁力。玻璃泡中发光的是稀薄气体显示的径迹，不能把可见光带当成一颗缓慢移动的电子。',
    src: '课本第 15 页 · 第一章 第3节 带电粒子在匀强磁场中的运动',
  },
  create(ctx) {
    const rig = electronBeamRig(),
      { group } = rig;
    let on = false,
      volts = 0,
      amps = 0,
      angle = 0,
      polarity = -1,
      near = false,
      orbit,
      base = null,
      strong = null,
      fast = null,
      helix = false,
      parallel = false,
      ui,
      rows,
      aim;
    const seen = new Set(),
      snapshots = [];
    let comparisons, selectors, plots;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'line',
          title: '无磁场径迹',
          todo: '接通已预热的电源，调加速电压，保持线圈电流为零。',
          target: () => aim,
        },
        { id: 'bend', title: '加磁场', todo: '保持加速电压，调线圈电流，观察偏转。', target: () => aim },
        { id: 'field', title: '只改磁场', todo: '保持加速电压，改变线圈电流，对比径迹大小。', target: () => aim },
        { id: 'speed', title: '只改出射速度', todo: '保持线圈电流，改变加速电压，对比径迹大小。', target: () => aim },
        { id: 'angle', title: '改变出射方向', todo: '转动玻璃泡，观察斜射与平行磁场的径迹。', target: () => aim },
      ],
    });
    const enabled = () => on && volts > 0;
    const field = () => (on ? polarity * coilField(amps) : 0);
    function say(text, target) {
      bar.say(near && target && target !== rig.glass ? '已记录当前径迹。回全景，' + text : text);
      aim = near ? null : target;
    }
    function guide() {
      if (!on) return say('灯丝已预热。点电源开关，再调加速电压。', rig.power);
      if (!volts) return say('上下拖左侧加速电压旋钮，调到 200 V。线圈电流先保持 0 A。', rig.voltage);
      if (bar.finished) return say('记录已齐：回到全景可继续改条件，展开笔记本对照各次径迹。', rig.glass);
      const view = near ? '当前条件已记录在笔记本。' : '点玻璃泡近看并记录这次观察。';
      if (bar.current === 'line' && angle !== 0)
        return say('先把玻璃泡转回 0°，枪口朝左，再观察无磁场径迹。', rig.turn);
      if (bar.current === 'line')
        return amps === 0
          ? say('线圈未通电，观察电子从枪口沿什么方向运动。' + view, rig.glass)
          : say('先把右侧线圈电流调回 0 A，观察无磁场的径迹。', rig.current);
      if (bar.current === 'bend') {
        if (volts !== base.volts) return say('保持第一轮的 ' + base.volts + ' V，再只改线圈电流。', rig.voltage);
        if (angle !== 0) return say('转回玻璃泡，使枪口朝左、与磁场垂直。', rig.turn);
        return amps > 0
          ? say('磁场由箭头 B 指示。' + view, rig.glass)
          : say('保持 ' + base.volts + ' V，上下拖右侧旋钮，把线圈电流调到 2 A。', rig.current);
      }
      if (bar.current === 'field') {
        if (polarity !== base.polarity)
          return say('这轮只改磁场强弱，先用换向开关恢复上一轮的磁场方向。', rig.polarity);
        if (volts !== base.volts) return say('这轮只改磁场，先把加速电压恢复 ' + base.volts + ' V。', rig.voltage);
        if (angle !== 0) return say('这轮保持出射方向，转回玻璃泡使枪口朝左。', rig.turn);
        return amps > 0 && Math.abs(amps - base.amps) >= 0.5
          ? say('电压保持 ' + base.volts + ' V，比较圆弧比上一轮更紧还是更宽。' + view, rig.glass)
          : say(
              '保持 ' + base.volts + ' V，把线圈电流从 ' + base.amps.toFixed(2) + ' A 调到另一值，再观察。',
              rig.current,
            );
      }
      if (bar.current === 'speed') {
        if (amps !== strong.amps || polarity !== strong.polarity)
          return say(
            '这轮只改速度，把线圈电流恢复 ' + strong.amps.toFixed(2) + ' A，换向开关也保持上轮方向。',
            rig.current,
          );
        if (angle !== 0) return say('保持垂直入射，先转回玻璃泡，使枪口朝左。', rig.turn);
        return Math.abs(volts - strong.volts) >= 50
          ? say('磁场不变，加速电压改变了出射速度。' + view, rig.glass)
          : say('保持线圈电流，调左侧加速电压，至少改变 50 V，再比较径迹。', rig.voltage);
      }
      if (amps !== fast.amps || volts !== fast.volts || polarity !== fast.polarity)
        return say(
          '先恢复 ' + fast.volts + ' V、' + fast.amps.toFixed(2) + ' A 及原磁场方向，再只改变枪口方向。',
          rig.current,
        );
      if (!helix)
        return angle > 0 && angle < 90
          ? say('斜着射入。可拖空白处从侧面看径迹有没有向前伸出。' + view, rig.glass)
          : say('沿底部手柄转动玻璃泡，让枪口斜对磁场，例如转到 30°。', rig.turn);
      if (!parallel)
        return angle === 90
          ? say('枪口现与磁场平行。' + view, rig.glass)
          : say('已经记录斜射。再转到 90°，看平行磁场时还会不会弯。', rig.turn);
    }
    function refresh() {
      orbit = traceBeam({ voltage: volts, field: field(), angle });
      rig.show({ volts, amps, angle, on, field: field(), polarity });
      rig.beam(orbit, enabled());
      guide();
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function observe() {
      enter();
      if (!enabled()) {
        guide();
        return;
      }
      if (!near) {
        near = true;
        bar.near(true);
        ctx.look([0, CENTER, 0], [0, 0.13, 1], 0.34, leave);
      }
      const key = [volts, amps, angle, polarity].join('/');
      if (!seen.has(key)) {
        seen.add(key);
        rows.el.hidden = false;
        rows.add([
          String(snapshots.length + 1),
          String(volts),
          amps.toFixed(2),
          (field() * 1000).toFixed(2),
          String(angle),
          orbit.kind === 'circle'
            ? orbit.hitWall
              ? '圆弧，碰到泡壁'
              : '闭合圆'
            : orbit.kind === 'helix'
              ? '螺旋的一段，到泡壁截止'
              : '直线，碰到泡壁',
        ]);
        snapshots.push({ volts, amps, angle, polarity, points: orbit.points });
        for (const select of selectors)
          select.add(
            new Option(
              '记录 ' + snapshots.length + ' · ' + volts + ' V / ' + amps.toFixed(2) + ' A / ' + angle + '°',
              String(snapshots.length - 1),
            ),
          );
        selectors[0].value = String(Math.max(0, snapshots.length - 2));
        selectors[1].value = String(snapshots.length - 1);
        drawComparisons();
      }
      const s = { volts, amps, angle, polarity };
      if (bar.current === 'line' && amps === 0 && angle === 0) {
        base = s;
        bar.done('line');
      } else if (bar.current === 'bend' && volts === base.volts && amps > 0 && angle === 0) {
        base = s;
        bar.done('bend');
      } else if (
        bar.current === 'field' &&
        polarity === base.polarity &&
        volts === base.volts &&
        angle === 0 &&
        amps > 0 &&
        Math.abs(amps - base.amps) >= 0.5
      ) {
        strong = s;
        bar.done('field');
      } else if (
        bar.current === 'speed' &&
        amps === strong.amps &&
        polarity === strong.polarity &&
        angle === 0 &&
        Math.abs(volts - strong.volts) >= 50
      ) {
        fast = s;
        bar.done('speed');
      } else if (bar.current === 'angle' && volts === fast.volts && amps === fast.amps && polarity === fast.polarity) {
        if (angle > 0 && angle < 90) helix = true;
        if (angle === 90) parallel = true;
        if (helix && parallel) bar.done('angle');
      }
      guide();
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function setVoltage(v) {
      enter();
      volts = clamp(Math.round(v / 25) * 25, 0, 300);
      refresh();
    }
    function setCurrent(a) {
      enter();
      amps = clamp(Math.round(a * 4) / 4, 0, 4);
      refresh();
    }
    function setAngle(a) {
      enter();
      angle = clamp(Math.round(a / 15) * 15, 0, 90);
      refresh();
    }
    let dragStart, valueStart;
    function knob(obj, get, set, scale, hint) {
      return {
        obj,
        plane: 'xy',
        offset: 0.174,
        enabled: () => !near,
        hint,
        onStart(p) {
          if (p) {
            dragStart = p.y;
            valueStart = get();
          }
        },
        onDrag(p) {
          set(valueStart + (p.y - dragStart) * scale);
        },
        onTap() {
          set(get() + (scale === 3750 ? 25 : 0.25));
        },
      };
    }
    const pointer = draggable(
      group,
      [
        knob(rig.voltage, () => volts, setVoltage, 3750, '上下拖动，调加速电压'),
        knob(rig.current, () => amps, setCurrent, 50, '上下拖动，调线圈电流'),
        {
          obj: rig.turn,
          plane: 'xz',
          offset: 0.108,
          enabled: () => !near,
          hint: '沿圆弧拖手柄，转动玻璃泡',
          onDrag(p) {
            setAngle((Math.atan2(-p.z, p.x) * 180) / Math.PI);
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.power,
            enabled: () => !near,
            hint: '电子枪电源',
            onTap() {
              enter();
              on = !on;
              refresh();
            },
          },
          {
            obj: rig.polarity,
            enabled: () => !near,
            hint: '切换线圈电流方向',
            onTap() {
              enter();
              polarity *= -1;
              refresh();
            },
          },
          { obj: rig.glass, hint: '近看并记录电子束径迹', onTap: observe },
        ],
      },
    );
    function drawComparisons() {
      if (!snapshots.length) return;
      comparisons.hidden = false;
      for (const [j, axis] of ['x', 'z'].entries()) {
        plots[j].series = selectors.map((select, i) => ({
          color: i ? '#27636c' : '#9c9483',
          points: snapshots[Number(select.value)].points.map((p) => [p[axis] * 1000, p.y * 1000]),
          width: 3,
        }));
        plots[j].draw();
      }
    }
    function reset() {
      on = false;
      volts = amps = angle = 0;
      polarity = -1;
      base = strong = fast = null;
      helix = parallel = false;
      seen.clear();
      snapshots.length = 0;
      selectors.forEach((s) => s.replaceChildren());
      comparisons.hidden = true;
      rows.clear();
      rows.el.hidden = true;
      near = false;
      ctx.back();
      bar.near(false);
      bar.undo('line', 'bend', 'field', 'speed', 'angle');
      refresh();
    }
    refresh();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.55, d: 0.43, h: 0.39 },
      view: { elev: 14, azim: -8, lookY: 0.19, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['记录', '加速电压 / V', '线圈电流 / A', 'Bz / mT', '转角 / °', '观察到的径迹']);
        rows.el.hidden = true;
        ui.data.append(
          rows.el,
          note(
            'Bz 为负表示由正面观察者指向后方。转角 0° 时枪口向左，与磁场垂直；90° 时枪口朝正面，与磁场平行。转角表示器材转动，不是速度与磁场的夹角。',
          ),
        );
        selectors = ['灰色记录', '蓝绿记录'].map((label) =>
          h('select', { 'aria-label': label, onchange: drawComparisons }),
        );
        plots = ['x', 'z'].map((axis) =>
          chart({
            x: { label: axis + ' / mm', min: -90, max: 90 },
            y: { label: 'y / mm', min: -90, max: 90 },
            height: 333,
            preserveAspect: true,
          }),
        );
        for (const plot of plots) {
          plot.canvas.style.width = '100%';
          plot.canvas.style.height = 'auto';
        }
        comparisons = h(
          'div',
          { hidden: true },
          note('保留观察时的径迹，可选两次对照。灰色与蓝绿对应下面两条记录；正面、侧面投影均保持横纵比例相同。'),
          ...selectors,
          note('正面投影'),
          plots[0].el,
          note('侧面投影'),
          plots[1].el,
        );
        ui.data.append(comparisons);
        ui.notes.append(
          note(
            '从灯丝已预热的状态开始。可见的是稀薄气体显示的径迹，画面未慢放单个电子。模型取玻璃泡半径 85 mm、线圈半径 150 mm、各 124 匝，球内磁场近似均匀。电子到泡壁截止，未模拟发射聚焦及气体碰撞散射。',
          ),
          buttons([
            { text: '电压 −25 V', onClick: () => setVoltage(volts - 25) },
            { text: '电压 +25 V', onClick: () => setVoltage(volts + 25) },
            { text: '电流 −0.25 A', onClick: () => setCurrent(amps - 0.25) },
            { text: '电流 +0.25 A', onClick: () => setCurrent(amps + 0.25) },
            { text: '转回 0°', onClick: () => setAngle(0) },
            { text: '转到 30°', onClick: () => setAngle(30) },
            { text: '转到 90°', onClick: () => setAngle(90) },
            { text: '全部重做', onClick: reset },
          ]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
