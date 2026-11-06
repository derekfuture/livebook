import { microscopeRig, SLIDE_START, STAGE, SCREEN } from './kit/microscopeRig.js';
import { advanceParticle, makeParticles, meanSquareStep } from './kit/brownianSample.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table, chart } from './kit/ui.js';

const COVER = [-0.082, 0.01, 0.092],
  STEPS = 6;
export default {
  id: 'brownianmotion',
  fig: '图1.1-3',
  title: '用显微镜观察炭粒的运动',
  stampText: '观察',
  predict: {
    q: '高倍显微镜下，稀释墨汁中不停晃动的暗点是什么？',
    options: ['悬浮的小炭粒', '一个个水分子', '水流形成的气泡'],
    answer: 0,
  },
  conclusion: {
    quote: '显微镜中看到的是悬浮炭粒的无规则运动，它间接反映了水分子的热运动。',
    why: '许多水分子不断从各方向撞击炭粒。改变温度后应比较同一颗粒、相等时间间隔的多次位移。单次位移甚至一小组记录都可能偏离整体趋势。记录点间的线段只连接采样位置。',
    src: '人教版选择性必修第三册第 3–4 页，图 1.1-3、1.1-4',
  },
  create(ctx) {
    const rig = microscopeRig(),
      { group } = rig;
    let particles,
      selected,
      covered,
      mounted,
      near,
      temp,
      setpoint,
      mag,
      focus,
      capture,
      elapsed,
      points,
      ui,
      rows,
      traces,
      aim,
      base,
      point,
      fieldClock = 0;
    let center = { x: 0, y: 0 },
      panStart;
    const results = new Map();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'slide', title: '装好样品', todo: '盖住稀释墨滴，把载玻片送到物镜正下方。', target: () => aim },
        {
          id: 'track',
          title: '跟踪一颗炭粒',
          todo: '调焦，在显示器上选一颗炭粒，每秒记录一次位置。',
          target: () => aim,
        },
        {
          id: 'temp',
          title: '改变水温',
          todo: '改变温度，追踪原来的炭粒，与室温下的等时记录比较。',
          target: () => aim,
        },
      ],
    });
    const sharp = () => Math.abs(focus) < (mag === 400 ? 0.2 : 0.115);
    const stable = () => Math.abs(temp - setpoint) < 0.15;
    function say(s, obj) {
      aim = near ? null : obj;
      bar.say(s);
    }
    function guide() {
      if (!covered) return say('载玻片上有一滴稀释墨汁。把旁边的小方盖玻片拖到墨滴上。', rig.cover);
      if (!mounted) return say('拿住盖好的长玻片，拖到载物台，让墨滴对准物镜。', rig.slide);
      if (capture)
        return say('正在跟踪圈内这颗炭粒，每秒留一个点。已记 ' + (points.length - 1) + ' / ' + STEPS + ' 段。');
      if (!sharp())
        return say(
          near
            ? '图像失焦。回全景，上下拖镜架侧面的调焦轮，看暗点边缘逐渐清楚。'
            : '上下拖镜架侧面的调焦轮，观察显示器，直到暗点清楚。',
          rig.focus,
        );
      if (!stable()) return say('观察显示器上的温度，等水温稳定，再记录同一颗炭粒。');
      if (results.has(setpoint) && !bar.finished)
        return say(
          near
            ? '第一组已留在笔记本。回全景，调载物台旁的温控旋钮。'
            : '调台前温控旋钮，改变水温，保持这颗炭粒和采样间隔。',
          rig.dial,
        );
      if (bar.finished) return say('两种温度的等时记录已留下。打开笔记本比较均方位移，也可再选中原颗粒重复取样。');
      if (!near)
        return say('点显示器近看，' + (selected ? '再点圈内同一颗炭粒。' : '选一颗暗色炭粒跟踪。'), rig.screen);
      return say(
        selected
          ? '点圈内的原颗粒，留下相同间隔的第二组位置。'
          : '点一颗清晰的暗色炭粒。短线将连接每隔 1 秒记下的位置。',
      );
    }
    function draw() {
      rig.field({
        particles,
        selected,
        points,
        focusError: focus,
        magnification: mag,
        temperature: temp,
        mounted,
        elapsed: capture ? elapsed : null,
        center,
      });
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
      ctx.look([SCREEN.x, SCREEN.y, SCREEN.z], [0, 0.01, 1], ctx.camera.aspect < 1 ? 0.34 : 0.28, leave);
      guide();
    }
    function record(p) {
      if (!mounted) return guide();
      if (!near) {
        inspect();
        return;
      }
      if (capture || !stable() || !sharp()) return guide();
      const u = (p.x - SCREEN.x) / SCREEN.w + 0.5,
        v = 0.5 - (p.y - SCREEN.y) / SCREEN.h;
      if (v < 0 || v >= 446 / 504) return guide();
      const span = mag === 400 ? 60 : 24,
        x = center.x + (u - 0.5) * span,
        y = center.y + ((223 - v * 504) * span) / 640;
      const candidates = selected ? [selected] : particles;
      const best = candidates.reduce((best, q) =>
        Math.hypot(q.x - x, q.y - y) < Math.hypot(best.x - x, best.y - y) ? q : best,
      );
      if (Math.hypot(best.x - x, best.y - y) > Math.max(best.radius * 1.6, span * 0.024))
        return say(
          selected
            ? '对准圈内原来的暗点。它移出画面时，可回全景轻拖玻片移动视野。'
            : '点在炭粒中心，空白水域没有可追踪的暗点。',
        );
      selected = best;
      elapsed = 0;
      points = [{ x: best.x, y: best.y }];
      capture = true;
      guide();
      draw();
    }
    function reset() {
      if (near) leave();
      covered = mounted = near = capture = false;
      particles = makeParticles();
      selected = null;
      temp = setpoint = 20;
      mag = 400;
      focus = -0.78;
      elapsed = 0;
      points = [];
      center = { x: 0, y: 0 };
      results.clear();
      group.add(rig.cover);
      rig.cover.position.fromArray(COVER);
      rig.slide.position.fromArray(SLIDE_START);
      rig.turret.rotation.y = 0;
      rig.dial.rotation.y = 0;
      rig.drop.scale.set(1, 0.16, 1);
      rows?.clear();
      if (traces) {
        traces.series.length = 0;
        traces.el.hidden = true;
      }
      rig.turret.position.y = 0.158 + focus * 0.003;
      bar.undo('slide', 'track', 'temp');
      guide();
      draw();
    }
    function sample(dt) {
      while (dt > 1e-8) {
        const interval = capture ? Math.min(dt, points.length - elapsed) : dt;
        for (const q of particles) advanceParticle(q, temp, interval);
        dt -= interval;
        if (!capture) continue;
        elapsed += interval;
        if (elapsed + 1e-8 >= points.length) {
          points.push({ x: selected.x, y: selected.y });
          if (points.length === STEPS + 1) {
            capture = false;
            const value = meanSquareStep(points);
            results.set(setpoint, value);
            const relative = points.map((p) => [p.x - points[0].x, p.y - points[0].y]);
            traces.series.push({ points: relative, dots: true, color: setpoint === 20 ? '#367584' : '#ae5c37' });
            const aspect = (680 - 74 - 22) / (340 - 26 - 56);
            const range = Math.ceil(
              Math.max(
                2,
                ...traces.series.flatMap((s) => s.points.map(([x, y]) => Math.max(Math.abs(x) / aspect, Math.abs(y)))),
              ),
            );
            traces.y.min = -range;
            traces.y.max = range;
            traces.x.min = -range * aspect;
            traces.x.max = range * aspect;
            traces.draw();
            traces.el.hidden = false;
            rows.add([setpoint + ' °C', '每 1 s，共 ' + STEPS + ' 段', value.toFixed(2)]);
            bar.done('track');
            if (results.size === 2) bar.done('temp');
          }
          guide();
        }
      }
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.cover,
          plane: 'xz',
          offset: 0.011,
          enabled: () => !covered,
          hint: '把方盖玻片移到墨滴上',
          onDrag(p) {
            rig.cover.position.set(p.x, 0.014, p.z);
          },
          onEnd(moved) {
            if (
              moved &&
              Math.hypot(rig.cover.position.x - SLIDE_START[0], rig.cover.position.z - SLIDE_START[2]) < 0.019
            ) {
              covered = true;
              rig.slide.add(rig.cover);
              rig.cover.position.set(0, 0.0023, 0);
              rig.drop.scale.set(1.25, 0.07, 1.25);
            } else rig.cover.position.fromArray(COVER);
            guide();
          },
        },
        {
          obj: rig.slide,
          plane: 'xy',
          offset: STAGE[2],
          enabled: () => covered && !near && !capture,
          hint: '移动载玻片，使样品对准物镜',
          onStart() {
            panStart = { ...center };
          },
          onDrag(p, start) {
            if (!start) return;
            if (mounted) {
              center.x = clamp(panStart.x - (p.x - start.x) * 450, -38, 38);
              center.y = clamp(panStart.y - (p.y - start.y) * 450, -38, 38);
              draw();
            } else {
              const t = clamp((p.y - SLIDE_START[1]) / (STAGE[1] - SLIDE_START[1]), 0, 1);
              rig.slide.position.set(p.x, Math.max(0.01, p.y), SLIDE_START[2] + (STAGE[2] - SLIDE_START[2]) * t);
            }
          },
          onEnd(moved) {
            if (!mounted) {
              if (moved && Math.hypot(rig.slide.position.x - STAGE[0], rig.slide.position.y - STAGE[1]) < 0.043) {
                rig.slide.position.fromArray(STAGE);
                mounted = true;
                bar.done('slide');
              } else rig.slide.position.fromArray(SLIDE_START);
            }
            guide();
            draw();
          },
        },
        {
          obj: rig.focus,
          plane: 'xy',
          offset: -0.05,
          enabled: () => mounted && !capture,
          hint: '上下拖调焦轮，观察暗点边缘',
          onStart() {
            base = focus;
          },
          onDrag(p, start) {
            if (start) {
              focus = clamp(base + (p.y - start.y) * 21, -1.6, 1.6);
              rig.turret.position.y = 0.158 + focus * 0.003;
              draw();
              guide();
            }
          },
        },
        {
          obj: rig.screen,
          plane: 'xy',
          offset: SCREEN.z,
          hint: '近看显示器并选择炭粒',
          onStart(p) {
            point = p?.clone();
          },
          onTap() {
            if (point) record(point);
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.turret,
            enabled: () => mounted && !capture,
            hint: '转动物镜转换器，切换倍率',
            onTap() {
              mag = mag === 400 ? 1000 : 400;
              rig.turret.rotation.y = mag === 400 ? 0 : Math.PI;
              focus += mag === 400 ? -0.14 : 0.14;
              draw();
              guide();
            },
          },
          {
            obj: rig.dial,
            enabled: () => mounted && !capture,
            hint: '切换温控台设定温度',
            onTap() {
              setpoint = setpoint === 20 ? 40 : 20;
              rig.dial.rotation.y = setpoint === 40 ? Math.PI / 3 : -Math.PI / 3;
              points = [];
              draw();
              guide();
            },
          },
        ],
      },
    );
    reset();
    return {
      group,
      size: { w: 0.39, h: 0.24, d: 0.24 },
      view: { azim: -9, elev: 23, lookY: 0.5, margin: 1.08 },
      toggles: ['steps'],
      pointer: {
        ...pointer,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return pointer.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['水温', '取样间隔', '平均平方位移 / μm²']);
        traces = chart({
          x: { label: 'Δx / μm', min: -5, max: 5 },
          y: { label: 'Δy / μm', min: -2, max: 2 },
          legend: '各组的第一个位置移到共同原点。蓝绿为 20 °C，赭色为 40 °C，两轴使用同一比例尺。相邻点间隔 1 秒。',
        });
        traces.el.hidden = true;
        panel.data.append(rows.el, traces.el);
        panel.notes.append(
          note(
            '样品为一滴稀释的墨汁。显示器放大呈现当前视野的中央区域，标尺为 5 μm。调焦后可切换 400× / 1000×；每次跟踪记录六个一秒间隔的二维位移，比较其平方的平均值。温控台近似均匀加热，忽略整体对流。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!mounted) return;
        const wasStable = stable();
        temp += (setpoint - temp) * (1 - Math.exp(-dt * 1.5));
        if (!wasStable && stable()) guide();
        sample(dt);
        fieldClock += dt;
        if (fieldClock >= 1 / 24) {
          fieldClock = 0;
          draw();
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
