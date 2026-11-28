import * as THREE from 'three';
import { electronBeamRig } from './kit/electronBeamRig.js';
import { traceBeam, coilField } from './kit/electronBeam.js';
import { beamDiagrams } from './kit/electronBeamDiagram.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { h, table } from './kit/ui.js';

export default {
  id: 'lorentzbeam',
  fig: '图1.3-2',
  title: '洛伦兹力演示仪',
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
    const rig = electronBeamRig(), diagram = beamDiagrams();
    const initial = { on: false, volts: 150, amps: 0, angle: 0, polarity: -1 };
    const state = { ...initial };
    const feedback = h('p', { class: 'status', 'aria-live': 'polite' });
    const legend = h('p', { class: 'note' });
    let ui, orbit = null, previous = null, startValue, startY, before;
    const records = table(['电压 / V', '励磁电流 / A', '磁场', '转角', '径迹']);
    const history = h('details', { hidden: true }, h('summary', {}, '观察记录'), records.el);
    const noFieldVolts = new Set(), speedFields = new Set(), directionFields = new Set();
    let matchedInward = false, comparedCurrent = false, sawInward = false, unlocked = false;
    let lastRow = '';
    const field = () => state.on ? state.polarity * coilField(state.amps) : 0;
    const fullCircle = trace => trace?.kind === 'circle' && !trace.hitWall;
    function nextAction() {
      if (unlocked) return '对照已完成，可以去看结论。';
      if (!state.on) return '点电源开关，观察电子束。';
      if (!state.volts) return '向上拖加速电压旋钮，让电子枪射出电子束。';
      const setting = state.polarity * state.amps;
      if (speedFields.has(setting)) return '保持电流和电压不变，上下拖枪口转角旋钮，比较两个方向的径迹。';
      if (state.angle) return '把枪口转回 0°，让电子束向左射出。';
      if (!matchedInward) {
        if (!noFieldVolts.has(state.volts)) return '保持电压不变，把励磁电流调到 0 A，先看无磁场时的径迹。';
        if (state.polarity > 0) return '点换向开关回到向里档，检验向左射出的电子束往哪边弯。';
        return '保持电压和枪口方向不变，向上拖励磁电流旋钮，看直线往哪边弯。';
      }
      if (!fullCircle(orbit)) {
        if (state.polarity > 0) return '点换向开关回到向里档，让电子束朝玻璃泡内部弯曲。';
        return '把励磁电流调到 2.00 A，让玻璃泡里出现完整的圆。';
      }
      if (!comparedCurrent) return '保持电压不变，上下拖励磁电流旋钮，比较两个完整圆的半径。';
      return '保持励磁电流不变，上下拖加速电压旋钮，比较两个完整圆的半径。';
    }
    function record(key, old, reference) {
      const setting = state.polarity * state.amps;
      if (orbit) {
        if (!setting && !state.angle) noFieldVolts.add(state.volts);
        if (setting < 0 && !state.angle) {
          sawInward = true;
          if (noFieldVolts.has(state.volts)) matchedInward = true;
        }
        // 只比较一次拖动的起点和松手档位，经过的中间刻度不算另一次实验。
        if (matchedInward && old !== state[key] && reference) {
          const twoCircles = fullCircle(reference) && fullCircle(orbit);
          if (key === 'amps' && twoCircles) comparedCurrent = true;
          if (comparedCurrent && key === 'volts' && twoCircles) speedFields.add(setting);
          if (comparedCurrent && key === 'angle' && setting) directionFields.add(setting);
          if (!unlocked && speedFields.has(setting) && directionFields.has(setting)) {
            unlocked = true;
            ui.unlock();
            ui.need('');
          }
        }
        const row = [String(state.volts), state.amps.toFixed(2), !setting ? '无' : setting < 0 ? '向里' : '向外',
          state.angle + '°', orbit.kind === 'line' ? '直线' : orbit.kind === 'helix' ? '螺旋线' : orbit.hitWall ? '圆弧' : '圆'];
        if (lastRow !== row.join('/')) {
          lastRow = row.join('/');
          records.add(row);
          history.hidden = false;
        }
      }
      ui.observePrediction(sawInward ? '磁场向里时，向左射出的电子束向上弯。' :
        '在向里档把枪口调到 0°，让电子束射入磁场，再对照你的预测。');
      ui.status(nextAction());
    }
    function refresh() {
      const B = field(), emitted = state.on && state.volts > 0;
      orbit = emitted ? traceBeam({ voltage: state.volts, field: B, angle: state.angle }) : null;
      rig.show({ ...state, field: B });
      rig.beam(orbit, emitted);
      diagram.drawHand({ field: B, emitted, angle: state.angle });
      diagram.drawPlots(orbit, previous);
      legend.textContent = !orbit ? (previous ? '虚线保留了电子束消失前的径迹。' : '') : previous ? '实线是现在的径迹，虚线是上一次调节前的径迹。' : '实线是玻璃泡中电子束的径迹。';
    }
    const enter = () => { if (ui.step !== 1) ui.go(1); };
    function explain(key, old) {
      if (!state.on) return '电源已断开，玻璃泡里没有电子束。';
      if (!state.volts) return '加速电压为零，看不到电子束。调高电压就能看见径迹。';
      if (!state.amps) return key === 'polarity' ? '励磁电流为零，换向后仍是直线。调大励磁电流再试。' : '线圈没有电流，电子束从枪口沿直线射出。';
      if (state.angle === 90) return '枪口沿线圈轴线，电子束沿直线射向玻璃泡前壁。';
      if (state.angle) return '电子一边绕圈，一边向玻璃泡前方运动，留下螺旋形径迹。';
      const up = field() < 0, direction = up ? '向上' : '向下';
      if (key === 'polarity') return '磁场反向，电子束改为' + direction + '弯，圆周半径不变。';
      if (key === 'amps' && old > 0 && state.amps !== old) return state.amps > old ? '电子出射速度不变，磁场增强，圆周半径变小。' : '电子出射速度不变，磁场减弱，圆周半径变大。';
      if (key === 'volts' && old > 0 && state.volts !== old) return state.volts > old ? '磁场不变，电子射得更快，圆周半径变大。' : '磁场不变，电子射得更慢，圆周半径变小。';
      return '电子束从枪口' + direction + '弯，' + (orbit.hitWall ? '到泡壁只留下一段圆弧。' : '在泡内形成一个圆。');
    }
    function change(key, value, old, reference) {
      if (state[key] === value) return;
      state[key] = value;
      previous = reference;
      refresh();
      feedback.textContent = explain(key, old);
    }
    const hint = text => () => ui?.step === 1 ? text : '';
    function dial(obj, key, max, step, unitsPerMetre, action) {
      return { obj, plane: 'xy', offset: obj.position.z, hint: hint(action),
        onStart(p) { enter(); startValue = state[key]; startY = p.y; before = orbit; },
        onEnd() { record(key, startValue, before); },
        onDrag(p) {
          const v = startValue + (p.y - startY) * unitsPerMetre;
          change(key, clamp(Math.round(v / step) * step, 0, max), startValue, before);
        },
      };
    }
    const controls = [
      dial(rig.current, 'amps', 4, 0.25, 50, '上下拖：调励磁电流'),
      dial(rig.voltage, 'volts', 300, 25, 3750, '上下拖：调加速电压'),
      dial(rig.turn, 'angle', 90, 15, 1500, '上下拖：转动枪口'),
    ];
    const tip = ctx.tag('', 'pill');
    const canvas = document.getElementById('c');
    const clearTip = () => tip.loc(rig.group, 0, -9, 0);
    canvas.addEventListener('pointerleave', clearTip);
    // 旋钮上方紧邻读数窗，把提示条放到仪表上沿之外。
    const dialTip = { loc(obj, x, y, z) { return tip.loc(obj, x, y < 0 ? y : 0.13, z); } };
    const pointer = draggable(rig.group, controls, { tip: dialTip, taps: [
      { obj: rig.power, hint: hint('点一下：通断电源'), onTap() { enter(); change('on', !state.on, state.on, orbit); record(); } },
      { obj: rig.polarity, hint: hint('点一下：反转磁场'), onTap() { enter(); change('polarity', -state.polarity, state.polarity, orbit); record(); } },
    ] });
    function reset() {
      Object.assign(state, initial);
      noFieldVolts.clear(); speedFields.clear(); directionFields.clear();
      lastRow = ''; records.clear(); history.hidden = true;
      sawInward = matchedInward = comparedCurrent = unlocked = false;
      previous = before = null;
      feedback.textContent = '电源已断开，玻璃泡里没有电子束。';
      clearTip();
      ui?.relock(); ui?.observePrediction(''); refresh();
      if (ui) { ui.status(nextAction()); ui.fold(false); ctx.reframe(); }
    }
    reset();
    const test = (name, verify) => ({ name, run() { if (!verify()) throw Error(name); } });
    // 旋钮绕固定轴转动。鼠标目标为相对位移，不能用会追着拾取体平移的锚点。
    function turn(name, control, dy) {
      const from = control.obj.position, to = from.clone(); to.y += dy;
      const step = qaFlow(pointer, [{ name, drag: control.obj, to }])[0];
      step.run = () => { control.onStart(from); control.onDrag(to); control.onEnd(); };
      return step;
    }
    const tap = (name, obj) => qaFlow(pointer, [{ name, tap: obj }])[0];
    return {
      group: new THREE.Group().add(rig.group), pointer, reset, toggles: [],
      size: { w: 0.50, d: 0.36, h: 0.38 },
      view: { elev: 10, azim: -7, lookY: 0.185, frameMargin: 1.03 },
      mount(panel) {
        ui = panel;
        ui.status(nextAction());
        ui.controls.append(feedback, diagram.hand);
        ui.data.previousElementSibling.textContent = '径迹对照（示意）';
        ui.data.before(diagram.plots, legend); ui.data.append(history);
        ui.data.after(h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        ui.el.querySelector('.answer').style.paddingBottom = '90px';
        ui.observePrediction('');
      },
      update() { tip.show(ui?.step === 1); },
      dispose() { canvas.removeEventListener('pointerleave', clearTip); pointer.dispose(); rig.dispose(); },
      debug: {
        get state() { return { ...state, radius: orbit?.radius, kind: orbit?.kind, unlocked }; },
        qa: [
          tap('开电源观察无场直线', rig.power),
          test('无场时径迹是直线', () => orbit?.kind === 'line' && !field() && ui.step === 1),
          tap('零电流时试换向', rig.polarity),
          test('换向无效且有补救提示', () => orbit.kind === 'line' && feedback.textContent.includes('仍是直线')),
          turn('在向外档加电流', controls[0], 0.025),
          test('向外时向下撞壁，预测仍待检验', () => orbit.hitWall && orbit.points[5].y < orbit.points[0].y && !sawInward && !matchedInward && !unlocked),
          turn('转到斜射', controls[2], 0.02),
          tap('斜射时换到向里档', rig.polarity),
          test('斜射不验证水平出射的预测', () => orbit.kind === 'helix' && orbit.points[10].z > 0 && !sawInward),
          turn('保持斜射换一个电压', controls[1], 0.0133),
          turn('转回水平出射', controls[2], -0.02),
          test('向里水平偏转能检验预测，不同电压不能完成无场对照', () => sawInward && !matchedInward),
          turn('恢复无场观察时的电压', controls[1], -0.0133),
          test('150 V、1.25 A 向里场可见整圆，仍须比较半径', () => state.volts === 150 && state.amps === 1.25 && fullCircle(orbit) && orbit.points[5].y > orbit.points[0].y && matchedInward && !comparedCurrent && !unlocked),
          turn('只增强磁场', controls[0], 0.015),
          test('同电压的两个整圆半径不同', () => comparedCurrent && orbit.radius < previous.radius && !unlocked),
          turn('只提高加速电压', controls[1], 0.0267),
          test('同场更快则圆周更大，还要比较方向', () => orbit.radius > previous.radius && speedFields.has(-state.amps) && !unlocked),
          tap('反转磁场', rig.polarity),
          test('反向后半径相等，可见段在下方泡壁终止', () => orbit.points[5].y < orbit.points[0].y && orbit.hitWall && orbit.radius === previous.radius),
          turn('在向外场改变方向', controls[2], 0.02),
          test('大小与方向两次对照的磁场须一致', () => orbit.kind === 'helix' && !unlocked),
          tap('回到比较速度时的磁场', rig.polarity),
          turn('转到沿轴线出射', controls[2], 0.04),
          test('沿轴线时不偏转，四项对照完成', () => orbit.kind === 'line' && state.angle === 90 && field() < 0 && unlocked),
          turn('把加速电压降为零', controls[1], -0.08),
          test('零电压时束消失且磁场仍在', () => !orbit && field() < 0 && feedback.textContent.includes('电压为零')),
          tap('断开电源', rig.power),
          test('断电消磁且已存下观察记录', () => !orbit && !field() && records.rows.length >= 6),
          test('掀开课本裁图', () => { ui.go(2); ui.el.querySelector('.flap-front').click(); return ui.el.querySelector('.flap.open .page-crop') && ui.el.querySelector('.verdict').textContent.includes('向左射出的电子束向上弯'); }),
          test('全部重来还原预测页', () => { reset(); return ui.step === 0 && !orbit && !previous && !unlocked && !state.amps && state.angle === 0 && !records.rows.length; }),
        ],
      },
    };
  },
};
