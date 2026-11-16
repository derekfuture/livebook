// 人教版选择性必修一图 4.4-1，测量沿原光具座进行。
import { doubleSlitRig, AXIS, DOUBLE_X, SINGLE_X, FILTER_X, SCREEN_X } from './kit/doubleSlitRig.js';
import { SLIT_SEPARATIONS, FILTER_WAVELENGTH, measuredWavelength, stripeIntensity } from './kit/doubleSlit.js';
import { SCREW_PITCH } from './kit/micrometer.js';
import { readMicrometerTick } from './kit/micrometerTool.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, h, note, table } from './kit/ui.js';

const length = SCREEN_X - DOUBLE_X;
const stations = [SINGLE_X, DOUBLE_X, DOUBLE_X, FILTER_X, FILTER_X];
const labels = ['单缝片', '0.36 mm 双缝片', '0.18 mm 双缝片', '红滤光片', '蓝滤光片'];
const trials = [
  [1, 3],
  [1, 4],
  [2, 3],
];
export default {
  id: 'doubleslit',
  fig: '图4.4-1',
  title: '用双缝干涉测量光的波长',
  stampText: '测量',
  predict: {
    q: '同一束红光，双缝到屏的距离固定，把双缝间距减半，亮纹有什么变化？',
    options: ['间距变大', '间距变小', '间距相同'],
    answer: 0,
    hint: '想一想相邻亮纹对应的光程差。',
  },
  conclusion: {
    page: 105, rect: [64.27, 637.19, 379.6, 698.35],
    quote: '根据 λ＝(d/l)Δx 可知，本实验需要测量的物理量是双缝到屏的距离 l 和相邻两条亮条纹间的距离 Δx（双缝间的距离 d 已知）。',
    why: '在小角度条件下，λ ≈ d Δx / L。从第一条亮纹量到第 N 条亮纹，要用两次分划板读数之差的绝对值除以 N−1，得到平均间距 Δx。',
    src: '课本第 101 页 · 第四章 第4节 实验：用双缝干涉测量光的波长',
  },
  create(ctx) {
    const rig = doubleSlitRig();
    const { group, cards, lamp, ruler, screw, eyepiece } = rig;
    const tool = { ...screw, group: rig.screwFrame };
    let ui, rows, form, evidence, count, result, view, aim;
    let lit, aligned, selected, endpoints, marks, coarse, mm, rollingFrom;
    const completed = new Set();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'axis', title: '调光', todo: '点灯座开关，调整灯的位置，使光沿轴线照亮屏。', target: () => aim },
        { id: 'length', title: '测屏距', todo: '沿尺分别读双缝和毛玻璃的位置。', target: () => aim },
        { id: 'stripes', title: '测亮纹', todo: '转动手轮，对齐并读出两条亮纹的位置。', target: () => aim },
        { id: 'compare', title: '换片比较', todo: '换滤光片和双缝片，比较测量结果。', target: () => aim },
      ],
    });
    const next = () => trials.find(([d, f]) => !completed.has(d + '/' + f));
    const lampOffset = () => (lamp.position.z * (SCREEN_X + 0.487)) / 0.088;
    const activeD = () => selected[1] ?? selected[2];
    const activeF = () => selected[3] ?? selected[4];
    const wavelength = () => FILTER_WAVELENGTH[activeF() === 3 ? 'red' : 'blue'];
    const dValue = () => SLIT_SEPARATIONS[activeD() - 1];
    function expose() {
      rig.bulb.material.color.setHex(lit ? 0xffe3a2 : 0xb3aca0);
      rig.scope.expose({
        lit,
        single: selected[0] !== null,
        double: activeD() !== null,
        filter: activeF() === null ? null : activeF() === 3 ? 'red' : 'blue',
        separation: dValue(),
        length,
        offset: lampOffset(),
      });
    }
    function say(text, object) {
      aim = object;
      bar.say(text);
    }
    function guide() {
      if (bar.finished) return say('三组数据已记录。展开笔记本，对照同色换缝和同缝换色的条纹间距。');
      if (!lit) return say('点灯座前的小开关，点亮光源。', rig.power);
      if (!aligned) {
        if (view === 'scope') return say('看亮区中心是否落在十字线中心。对正后点毛玻璃确认；偏了就回全景调灯。');
        return say(
          view === 'lamp'
            ? '沿底座横向微调光源，对准透镜中心线，再回全景点目镜检查。'
            : '点左端灯座近看，对照透镜中心线微调光源，再点右端目镜检查。',
          lamp,
        );
      }
      const pair = next();
      if (selected[0] === null) return say('把台前的单缝片拖到遮光筒左侧第一个缝片座。', cards[0]);
      for (const i of pair)
        if (selected[i] === null) {
          const occupied = selected.find((k) => k !== null && stations[k] === stations[i]);
          if (occupied !== undefined)
            return say('把' + labels[occupied] + '从片座拖回台前，再插入' + labels[i] + '。', cards[occupied]);
          return say('把' + labels[i] + '拖到' + (i < 3 ? '遮光筒入口' : '透镜与单缝之间') + '的片座。', cards[i]);
        }
      if (view === 'cards')
        return say(
          '缝片和滤光片已装好。回全景，' + (endpoints.length < 2 ? '把米尺移到光具座前缘。' : '点目镜观察这组条纹。'),
        );
      if (endpoints.length < 2) {
        if (view === 'ruler')
          return say('在' + (endpoints.length ? '毛玻璃屏' : '双缝片') + '所在平面的正下方点尺刻，读它的位置。');
        return say('把米尺拖到光具座前缘；点尺近看，分别读双缝片和毛玻璃的位置。', ruler);
      }
      if (view === 'drum')
        return say(
          coarse === null ? '点固定套筒上最后露出的半毫米或整毫米刻线。' : '沿固定套筒的横线，点微分筒上对齐的刻线。',
        );
      if (marks.length === 2) return say('展开笔记本，填这两条亮纹之间含两端的亮纹条数，并算出波长。');
      if (view !== 'scope') return say('点右端目镜看毛玻璃和测量手轮。', eyepiece);
      return say(
        marks.length
          ? '继续滚手轮，边移边数，至少跨两个亮纹间隔。对准后再点毛玻璃读数。'
          : '上下滚动目镜旁的棕色手轮，使竖线对准一条亮纹中心，再点毛玻璃读数。',
        screw.grip,
      );
    }
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function eye() {
      if (!lit) return guide();
      view = 'scope';
      bar.near(true);
      // 空屏调光时沿轴观察；测量时把目镜和横向手轮同时纳入视野。
      if (!aligned) ctx.lookFrom([SCREEN_X + 0.077, AXIS, 0], [SCREEN_X, AXIS, 0], leave);
      else ctx.look([SCREEN_X, AXIS, -0.022], [1, 0, 0], ctx.camera.aspect < 1 ? 0.12 : 0.115, leave);
      guide();
    }
    function showRuler() {
      if (!aligned || activeD() === null) return guide();
      if (ruler.position.z < 0.045) return say('先把尺拖到光具座前缘。', ruler);
      view = 'ruler';
      bar.near(true);
      const x = endpoints.length ? SCREEN_X : DOUBLE_X;
      ctx.look([x, 0.041, ruler.position.z - 0.018], [0, 1, 0.25], 0.17, leave);
      guide();
    }
    function readRuler(ray) {
      const hit = ray.intersectObject(ruler, false)[0];
      if (!hit) return true;
      const x = group.worldToLocal(hit.point.clone()).x;
      const target = endpoints.length ? SCREEN_X : DOUBLE_X;
      if (Math.abs(x - target) > 0.0018) {
        say('沿片面或屏面向下找到对应尺刻，再点一次。');
        return true;
      }
      endpoints.push(Math.round((x - ruler.position.x + 0.5) * 1000));
      if (endpoints.length === 2) {
        bar.done('length');
        leave();
        say(
          '两端读数 ' +
            endpoints.join('、') +
            ' mm，相减得屏距 ' +
            (endpoints[1] - endpoints[0]) +
            ' mm。点目镜看条纹。',
          eyepiece,
        );
      } else showRuler();
      return true;
    }
    function clearMarks() {
      marks = [];
      coarse = null;
      if (form) {
        form.hidden = true;
        count.value = result.value = '';
      }
    }
    function cardDrag(i) {
      const obj = cards[i];
      return {
        obj,
        plane: 'xz',
        offset: AXIS,
        enabled: () => aligned && (!view || view === 'cards') && !bar.finished,
        hint: () => '点' + labels[i] + '近看，或直接拖动它',
        onTap() {
          if (view === 'cards') return guide();
          view = 'cards';
          bar.near(true);
          ctx.look([-0.19, 0.075, 0.065], [0.2, 1, 0.44], ctx.camera.aspect >= 1 ? 1.08 : 0.72, leave);
          guide();
        },
        onDrag(p) {
          obj.position.set(p.x, AXIS, p.z);
        },
        onEnd(moved) {
          if (!moved) return;
          const on = Math.abs(obj.position.x - stations[i]) < 0.033 && Math.abs(obj.position.z) < 0.045;
          const changed = (selected[i] !== null) !== on;
          if (on) {
            const occupied = selected.find((k) => k !== null && k !== i && stations[k] === stations[i]);
            if (occupied !== undefined) {
              obj.position.copy(rig.homes[i]);
              return say('这个片座已有' + labels[occupied] + '。先把它拖回台前。', cards[occupied]);
            }
            selected[i] = i;
            obj.position.set(stations[i], AXIS, 0);
          } else {
            obj.position.copy(rig.homes[i]);
            selected[i] = null;
          }
          if (changed) clearMarks();
          expose();
          guide();
        },
      };
    }
    function inspectMark() {
      if (!lit) return guide();
      if (!aligned) {
        if (Math.abs(lampOffset()) > 0.0015) return say('亮区偏离十字线。回全景，横向微调光源再检查。');
        aligned = true;
        bar.done('axis');
        leave();
        return;
      }
      const pair = next();
      if (!pair || !pair.every((i) => selected[i] !== null) || endpoints.length !== 2 || marks.length === 2)
        return guide();
      const x = (mm - 8) / 1000 - lampOffset();
      const spacing = (wavelength() * length) / dValue();
      const order = Math.round(x / spacing);
      if (Math.abs(x / spacing - order) > 0.11 || stripeIntensity(x, length, dValue(), wavelength()) < 0.1)
        return say('竖线偏离亮纹中心或这条纹太暗。转手轮对准清晰的亮纹。');
      if (marks.length && Math.abs(order - marks[0].order) < 2)
        return say('离第一条太近。继续转手轮，至少跨两个亮纹间隔。');
      view = 'drum';
      coarse = null;
      bar.near(true);
      ctx.look([SCREEN_X + 0.004, AXIS, -(0.023 - 0.002 + mm / 1000)], [1, 0, 0], 0.046, leave);
      guide();
    }
    function readDrum(ray) {
      const read = readMicrometerTick(tool, mm, coarse, ray);
      if (read.error) say(read.error);
      else if (read.coarse !== undefined) {
        coarse = read.coarse;
        guide();
      } else if (read.value !== undefined) {
        const order = Math.round(((mm - 8) / 1000 - lampOffset()) / ((wavelength() * length) / dValue()));
        marks.push({ value: read.value, order });
        if (marks.length === 2) {
          bar.done('stripes');
          evidence.textContent =
            '双缝间距 ' +
            (dValue() * 1000).toFixed(2) +
            ' mm，屏距 ' +
            (endpoints[1] - endpoints[0]) +
            ' mm。两次测量头读数为 ' +
            marks.map((m) => m.value.toFixed(3)).join('、') +
            ' mm。';
          form.hidden = false;
          leave();
        } else {
          eye();
          say('第一条亮纹读数 ' + read.value.toFixed(3) + ' mm。继续转手轮，数到另一条亮纹。', screw.grip);
        }
      }
      return true;
    }
    function record() {
      if (marks.length !== 2 || !next()) return;
      const n = count.valueAsNumber;
      if (n !== Math.abs(marks[1].order - marks[0].order) + 1)
        return say('条数含两端。例如从第一条数到第三条，中间有两个间隔。');
      const [a, b] = marks.map((m) => m.value);
      const L = endpoints[1] - endpoints[0];
      const nm = measuredWavelength(a / 1000, b / 1000, n, L / 1000, dValue()) * 1e9;
      if (!Number.isFinite(result.valueAsNumber) || Math.abs(result.valueAsNumber - nm) > 2)
        return say('先将两次读数之差除以亮纹间隔数，再乘双缝间距、除以屏距。换算成 nm。');
      const spacing = Math.abs(b - a) / (n - 1);
      rows.add([
        activeF() === 3 ? '红' : '蓝',
        (dValue() * 1000).toFixed(2),
        L,
        a.toFixed(3),
        b.toFixed(3),
        n,
        spacing.toFixed(3),
        result.valueAsNumber,
      ]);
      completed.add(activeD() + '/' + activeF());
      clearMarks();
      if (!next()) bar.done('compare');
      guide();
    }
    const manip = draggable(
      group,
      [
        ...cards.map((_, i) => cardDrag(i)),
        {
          obj: lamp,
          plane: 'xz',
          offset: AXIS,
          keepOffset: true,
          enabled: () => (!view || view === 'lamp') && !aligned && lit,
          hint: '点灯座近看，横向微调光源',
          onTap() {
            view = 'lamp';
            bar.near(true);
            ctx.look([-0.55, AXIS, 0], [0, 1, 0.14], 0.106, leave);
            guide();
          },
          onDrag(p) {
            lamp.position.z = clamp(p.z, -0.003, 0.003);
            expose();
          },
          onEnd: guide,
        },
        {
          obj: ruler,
          plane: 'xz',
          offset: 0.003,
          keepOffset: true,
          enabled: () => !view && endpoints.length < 2 && aligned,
          hint: '把尺移到光具座前缘，点尺读位置',
          onDrag(p) {
            ruler.position.z = clamp(p.z, -0.102, 0.085);
            if (!endpoints.length) ruler.position.x = clamp(p.x, -0.035, 0.16);
          },
          onTap: showRuler,
          onEnd: guide,
        },
        {
          obj: screw.grip,
          plane: 'yz',
          offset: SCREEN_X + 0.004,
          enabled: () => view === 'scope' && aligned && marks.length < 2,
          hint: '上下滚动手轮，横移分划板',
          onStart() {
            rollingFrom = mm;
          },
          onDrag(p, start) {
            if (!start) return;
            mm = clamp(rollingFrom - ((p.y - start.y) * SCREW_PITCH) / (2 * Math.PI * 0.0067), 0.1, 15.9);
            rig.turn(mm);
          },
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.power,
            enabled: () => !view,
            hint: '点灯座开关',
            onTap() {
              lit = !lit;
              expose();
              guide();
            },
          },
          { obj: eyepiece, enabled: () => !view, hint: '透过目镜观察', onTap: eye },
          {
            obj: rig.scope.group,
            enabled: () => view === 'scope',
            hint: '检查光屏或读取对准亮纹的位置',
            onTap: inspectMark,
          },
        ],
      },
    );
    function reset() {
      if (view) leave();
      lit = aligned = false;
      selected = Array(5).fill(null);
      endpoints = [];
      clearMarks();
      completed.clear();
      rows?.clear();
      lamp.position.z = 0.002;
      mm = 8;
      rig.turn(mm);
      cards.forEach((c, i) => c.position.copy(rig.homes[i]));
      ruler.position.set(0.01, 0.003, -0.102);
      bar.undo('axis', 'length', 'stripes', 'compare');
      expose();
      guide();
    }
    reset();
    return {
      group,
      size: { w: 1.32, d: 0.42, h: 0.16 },
      view: { elev: 30, azim: 13, margin: 1.03, lookY: 0.5 },
      toggles: ['steps'],
      pointer: {
        items: manip.items,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          if (view === 'ruler') return readRuler(ray);
          if (view === 'drum') return readDrum(ray);
          return manip.down(ray, e);
        },
        move: (ray) => view === 'ruler' || view === 'drum' || manip.move(ray),
        up: () => manip.up(),
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['光', 'd / mm', 'L / mm', 'x₁ / mm', 'x₂ / mm', '条数', '间距 / mm', 'λ / nm']);
        count = h('input', { type: 'number', step: '1', 'aria-label': '亮纹条数' });
        result = h('input', { type: 'number', step: 'any', 'aria-label': '波长（nm）' });
        evidence = h('p', { class: 'note' });
        form = h(
          'div',
          {},
          evidence,
          h('label', {}, '亮纹条数（含两端） ', count),
          h('label', {}, '波长 / nm ', result),
          buttons([{ text: '记录本组', onClick: record }]).el,
        );
        form.hidden = true;
        panel.data.append(rows.el, form);
        ui.notes.append(
          note('单缝和双缝的缝线保持竖直，片座固定高度。米尺的数字单位是 cm。手轮每转一周移动 0.5 mm，共 50 格。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        screw.dispose();
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
