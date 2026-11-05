import { openAir, movePiston, ROOM_T, MIN_LENGTH, MAX_LENGTH, AREA } from './kit/gasColumn.js';
import { gasColumnRig, ZERO_Y, STEM, DIAL_R, DIAL_FRONT, CAP_HOME, SEAT } from './kit/gasColumnRig.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { chart, table, buttons, note, seg } from './kit/ui.js';

export default {
  id: 'gasisotherm',
  fig: '图2.2-1',
  title: '探究气体等温变化的规律',
  stampText: '探究',
  predict: {
    q: '把空气封住，迅速压下柱塞并保持位置，压力表的读数会怎样变化？',
    options: ['先升高，再回落到稳定值', '一直保持刚压下时的读数', '最终回到大气压'],
    answer: 0,
    hint: '先考虑压缩时的温升，再考虑空气与环境的热交换。',
  },
  conclusion: {
    quote: '同一份气体在相同温度下，压强与体积成反比。',
    why: '圆筒截面积固定，空气柱的长度给出体积。对同一份恢复室温的空气，p 随 V 减小而增大；以 1/V 为横轴，实测点近似落在通过原点的直线上。',
    src: '人教版高中物理选择性必修第三册第 23–25 页',
  },
  create(ctx) {
    const rig = gasColumnRig(),
      { group, holder, gauge, ruler, cap } = rig;
    let air,
      length,
      sealed,
      ui,
      rows,
      plot,
      axisChoice,
      view,
      aim,
      seriesNo,
      data,
      selectedLength,
      reciprocal,
      lineStart,
      lineSlope,
      map,
      settled,
      dragging,
      grab,
      releaseP;
    let chartMessage = '';
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'seal', title: '封闭空气', todo: '将台面上的橡胶套装到注射器下口。', target: () => aim },
        { id: 'read', title: '量长读表', todo: '从柱塞下沿读空气柱长，再读稳定的压强。', target: () => aim },
        { id: 'repeat', title: '改变体积', todo: '推拉同一柱塞，等压力稳定后再测几组。', target: () => aim },
        { id: 'graph', title: '检验关系', todo: '用实测点比较 p–V 与 p–1/V 两种图像。', target: () => aim },
      ],
    });
    const say = (s, obj) => {
      aim = obj;
      bar.say(s);
    };
    const varied = () =>
      data.length >= 4 && Math.max(...data.map((d) => d.mm)) - Math.min(...data.map((d) => d.mm)) >= 12;
    const stable = () => Math.abs(air.temperature - ROOM_T) < 0.65 && !dragging;
    function guide() {
      if (bar.finished) return say('四组实测点近似落在过原点的直线上。笔记本可回看本次实验。');
      if (!sealed) return say('把台面上的红褐色橡胶套拖到注射器下口，封住这一柱空气。', cap);
      if (varied()) return say(chartMessage || '本组数据已齐。展开笔记本，把横轴从 V 换成 1/V，检验实测点。');
      if (!stable()) return say('保持柱塞位置，看压力表继续回稳。快速压缩会升温，快速膨胀会降温。', gauge);
      if (selectedLength !== null)
        return say(
          '柱长已读 ' +
            selectedLength.toFixed(1) +
            ' mm。' +
            (view === 'dial' ? '沿针尖点外圈刻线，读绝对压强。' : '点压力表近看，沿针尖读压强。'),
          gauge,
        );
      if (data.length >= 4 && !varied()) {
        const low = Math.min(...data.map((d) => d.mm)),
          high = Math.max(...data.map((d) => d.mm));
        if (data.some((d) => Math.abs(d.mm - length * 1000) < 2))
          return say(
            '四个点集中在 ' +
              low.toFixed(1) +
              '–' +
              high.toFixed(1) +
              ' mm。再推低或拉高柱塞，让最短和最长柱长相差至少 12 mm。',
            holder,
          );
      }
      if (data.some((d) => Math.abs(d.mm - length * 1000) < 2))
        return say('已测 ' + data.length + ' 组。沿轴推或拉柱塞，换一个相隔至少 2 mm 的位置。', holder);
      if (view === 'ruler') return say('从筒底 0 线起，点柱塞下端平齐的尺刻，读空气柱长度（mm）。', ruler);
      say('点筒旁刻度尺，读柱塞下沿的位置。截面积为 1.00 cm²。', ruler);
    }
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function near(which) {
      view = which;
      bar.near(true);
      if (which === 'ruler')
        ctx.look([0.007, ZERO_Y + length * 0.55, 0], [0, 0.03, 1], ctx.camera.aspect >= 1 ? 0.17 : 0.095, leave);
      else ctx.look([0, holder.position.y + STEM, DIAL_FRONT], [0, 0, 1], ctx.camera.aspect >= 1 ? 0.17 : 0.093, leave);
      guide();
    }
    function drawGraph() {
      if (!plot) return;
      plot.x = reciprocal ? { min: 0, max: 0.7, label: '1/V (cm⁻³)' } : { min: 0, max: 4.5, label: 'V (cm³)' };
      plot.series[0].points = data.map((d) => [reciprocal ? 1 / d.volume : d.volume, d.kpa]);
      plot.draw();
    }
    function setSealed(value) {
      if (value === sealed) return guide();
      if (bar.finished) return guide();
      releaseP = null;
      sealed = value;
      cap.position.copy(sealed ? SEAT : CAP_HOME);
      selectedLength = null;
      if (!sealed) {
        air = openAir(length);
        bar.undo('seal', 'read', 'repeat', 'graph');
        guide();
        return say('下口已打开，空气与外界相通。旧读数留在表中；重新封口会另起一组。', cap);
      }
      seriesNo++;
      data = [];
      chartMessage = '';
      lineStart = false;
      lineSlope = null;
      reciprocal = false;
      axisChoice?.set(0, false);
      bar.done('seal');
      drawGraph();
      guide();
    }
    function readRuler(ray) {
      if (!sealed || !stable()) return guide();
      const hit = ray.intersectObject(ruler, false)[0];
      if (!hit) return;
      const mm = Math.round((group.worldToLocal(hit.point.clone()).y - ZERO_Y) * 10000) / 10;
      if (Math.abs(mm - length * 1000) > 0.62) return say('对照柱塞底面在尺上的位置；尺的零线与筒底齐平。', ruler);
      if (data.some((d) => Math.abs(d.mm - mm) < 2)) return say('这个长度已测过，回全景改变柱塞位置。');
      selectedLength = mm;
      leave();
    }
    function readPressure(ray) {
      if (!sealed || !stable()) return guide();
      if (selectedLength === null) return say('先从筒旁的尺读这段空气的长度。', ruler);
      if (air.pressure > 300000) return say('读数已经超出压力表量程，回全景稍微拉高柱塞。');
      const hit = ray.intersectObject(rig.face, false)[0];
      if (!hit) return;
      const p = gauge.worldToLocal(hit.point.clone()),
        r = Math.hypot(p.x, p.y);
      const angle = Math.atan2(p.x, p.y);
      const kpa = Math.round((angle / (Math.PI * 1.32) + 0.5) * 300);
      if (r < DIAL_R * 0.68 || r > DIAL_R * 0.96 || Math.abs(kpa - air.pressure / 1000) > 2.1)
        return say('沿针尖方向点同一条外圈刻线。每小格 5 kPa，可以估读。');
      const mm = selectedLength,
        volume = AREA * mm * 1000;
      data.push({ mm, volume, kpa });
      rows.add([String(seriesNo), mm.toFixed(1), volume.toFixed(2), String(kpa), String(Math.round(kpa * volume))]);
      selectedLength = null;
      bar.done('read');
      if (varied()) bar.done('repeat');
      drawGraph();
      leave();
      if (!varied())
        say(
          '第 ' + data.length + ' 次读到 ' + mm.toFixed(1) + ' mm、' + kpa + ' kPa。换一个柱长再测，兼顾压缩和拉伸。',
          holder,
        );
    }
    function graphTap(event) {
      if (!reciprocal || !varied() || bar.finished || !map) return;
      event.stopImmediatePropagation();
      const rect = plot.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * (plot.canvas.width / 2);
      const y = ((event.clientY - rect.top) / rect.height) * (plot.canvas.height / 2);
      const { X, Y } = map;
      if (!lineStart) {
        if (Math.hypot(x - X(0), y - Y(0)) > 24) {
          say('两个轴刻度都为 0 的交点才是坐标原点。');
          return;
        }
        lineStart = true;
        chartMessage = '从原点向右上方看，点最右侧的实测点，用连线检验其他点。';
        drawGraph();
        guide();
        return;
      }
      const right = data.reduce((a, b) => (a.volume < b.volume ? a : b));
      if (Math.hypot(x - X(1 / right.volume), y - Y(right.kpa)) > 24)
        return say('请点最右侧的实测点，线段应跨过其余点所在的范围。');
      lineSlope = right.volume * right.kpa;
      drawGraph();
      if (data.some((d) => Math.abs((d.kpa * d.volume) / lineSlope - 1) > 0.075)) {
        chartMessage = '有点偏离连线较远。复查读数，或重新封口开始另一组。';
        guide();
        return;
      }
      bar.done('graph');
      guide();
    }
    const manip = draggable(
      group,
      [
        {
          obj: cap,
          plane: 'xy',
          offset: 0,
          enabled: () => !view && !bar.finished,
          hint: '把橡胶套套上或取下',
          onDrag(p) {
            cap.position.set(p.x, clamp(p.y, 0.004, ZERO_Y + 0.008), 0);
          },
          onEnd(moved) {
            if (!moved) return;
            const seat = Math.hypot(cap.position.x, cap.position.y - SEAT.y) < 0.014;
            cap.position.copy(seat ? SEAT : CAP_HOME);
            setSealed(seat);
          },
        },
        {
          obj: holder,
          plane: 'xy',
          offset: 0,
          enabled: () => !view && !bar.finished,
          hint: '沿轴推拉柱塞；点表面近看',
          onStart() {
            grab = length;
            dragging = false;
          },
          onDrag(p, start) {
            if (!start) return;
            const target = clamp(grab + p.y - start.y, MIN_LENGTH, MAX_LENGTH);
            if (Math.abs(target - length) > 0.00015) selectedLength = null;
            length = target;
            dragging = true;
          },
          onEnd(moved) {
            dragging = false;
            if (moved) {
              releaseP = sealed && !stable() ? air.pressure / 1000 : null;
              guide();
            }
          },
          onTap() {
            near('dial');
          },
        },
      ],
      { highlight: true, taps: [{ obj: ruler, hint: '沿刻度尺量空气柱长度', onTap: () => near('ruler') }] },
    );
    function reset() {
      if (view) leave();
      length = 0.03;
      air = openAir(length);
      sealed = dragging = false;
      settled = true;
      selectedLength = releaseP = null;
      seriesNo = 0;
      data = [];
      lineSlope = null;
      lineStart = false;
      chartMessage = '';
      reciprocal = false;
      axisChoice?.set(0, false);
      rows?.clear();
      rig.set(length, air.pressure);
      cap.position.copy(CAP_HOME);
      bar.undo('seal', 'read', 'repeat', 'graph');
      drawGraph();
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.125, d: 0.095, h: 0.15 },
      view: { elev: 15, azim: 10, margin: 1.08, lookY: 0.48 },
      toggles: ['steps'],
      pointer: {
        items: manip.items,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          if (view === 'ruler') {
            readRuler(ray);
            return true;
          }
          if (view === 'dial') {
            readPressure(ray);
            return true;
          }
          return manip.down(ray, e);
        },
        move: (ray) => (view ? true : manip.move(ray)),
        up: () => (view ? true : manip.up()),
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['封口组', '柱长 / mm', 'V / cm³', 'p / kPa', 'pV / kPa·cm³']);
        plot = chart({
          x: { min: 0, max: 4.5, label: 'V (cm³)' },
          y: { min: 0, max: 300, label: 'p (kPa)' },
          series: [{ points: [], color: '#365d74', dots: true, line: false }],
          fit: false,
        });
        plot.extra = (g, X, Y) => {
          map = { X, Y };
          if (reciprocal && lineStart) {
            g.fillStyle = '#a4573e';
            g.beginPath();
            g.arc(X(0), Y(0), 5, 0, 2 * Math.PI);
            g.fill();
            if (lineSlope) {
              g.strokeStyle = '#a4573e';
              g.lineWidth = 2;
              g.beginPath();
              g.moveTo(X(0), Y(0));
              const end = Math.min(0.7, 300 / lineSlope);
              g.lineTo(X(end), Y(end * lineSlope));
              g.stroke();
            }
          }
        };
        plot.canvas.addEventListener('click', graphTap, true);
        axisChoice = seg('横轴', ['体积 V', '体积的倒数 1/V'], (_, i) => {
          reciprocal = i === 1;
          chartMessage = reciprocal
            ? lineStart
              ? '点右上方的实测点，检验连线。'
              : '在坐标纸上点原点，开始检验直线关系。'
            : '这组点呈弯曲趋势，试试用体积的倒数作横轴。';
          drawGraph();
          guide();
        });
        panel.data.append(rows.el, axisChoice.el, plot.el);
        panel.notes.append(
          note(
            '空气柱截面积 1.00 cm²，筒底对应尺的 0 线。压力表测绝对压强，开口时约为 101 kPa。定位套在读数时稳住柱塞。模型取室温 20 ℃，忽略接管容积。每次封口单独编号，图上只画本次封入的空气。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        drawGraph();
        guide();
      },
      update(dt) {
        bar.update(dt);
        air = movePiston(air, length, dt, sealed);
        rig.set(length, air.pressure);
        const ready = stable();
        if (ready !== settled) {
          settled = ready;
          guide();
          if (
            ready &&
            releaseP !== null &&
            Math.abs(air.pressure / 1000 - releaseP) > 2 &&
            !view &&
            sealed &&
            !varied()
          ) {
            say(
              '柱塞位置没变，表针已从约 ' +
                Math.round(releaseP) +
                ' kPa 回稳到 ' +
                Math.round(air.pressure / 1000) +
                ' kPa。现在点筒旁的尺读长度。',
              ruler,
            );
            releaseP = null;
          }
        }
      },
      dispose() {
        plot?.canvas.removeEventListener('click', graphTap, true);
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
