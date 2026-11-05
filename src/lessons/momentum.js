// 选择性必修第一册图 1.4-1。计时器只测遮光时间，滑块编号与速度正负由学生判断。
import * as THREE from 'three';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, buttons, note, h } from './kit/ui.js';
import { gliderTrial, FLAG_WIDTH } from './kit/momentum.js';
import { momentumRig, TRACK_Y } from './kit/momentumRig.js';

export default {
  id: 'momentum',
  fig: '图1.4-1',
  title: '气垫导轨验证动量守恒定律',
  stampText: '验证',
  predict: {
    q: '较轻的甲向右撞上静止的乙，随后甲向左弹回。计算碰后的总动量时应怎样处理甲的速度？',
    options: ['取负值', '取正值', '当成零'],
    answer: 0,
    hint: '先约定向右为正方向。',
  },
  conclusion: {
    quote: '水平气垫导轨上，碰撞前后两滑块的总动量在测量精度内相等。',
    why: '比较的是两滑块组成的系统。气垫减小摩擦，水平导轨使沿轨道的外力近似为零。光电门给出遮光时间，遮光片宽度除以时间得到速率，再按运动方向确定速度正负。滑块粘连后共同运动，总动量仍可守恒。',
    src: '人教版高中物理选择性必修第一册第 17–19 页，参考案例 1',
  },
  create(ctx) {
    const rig = momentumRig(),
      { group, carts } = rig;
    let ui,
      records,
      reports,
      air,
      tilt,
      drift,
      levelTime,
      ballast,
      sleeves,
      run,
      time,
      nextEvent,
      near = null,
      aim,
      shove,
      stroke,
      startX;
    let holding = false,
      returning = false,
      levelZoom = false;
    let readIndex = 0,
      logs = [[], []],
      stored = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'level', title: '调平通气', todo: '打开气源，用左脚调节轮将气泡调到两线中央。', target: () => aim },
        { id: 'elastic', title: '弹性碰撞', todo: '向右推甲并松手，从光电门取三次遮光时间。', target: () => aim },
        { id: 'stick', title: '粘连碰撞', todo: '把搭扣装到两滑块相撞的一端，再推甲。', target: () => aim },
        {
          id: 'verify',
          title: '核算总动量',
          todo: '按实测时间求带符号的速度，比较两次碰撞的前后总动量。',
          target: () => aim,
        },
      ],
    });
    const say = (s, o = null) => {
      aim = near !== null || levelZoom ? null : o;
      bar.say(s);
    };
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    const masses = () => carts.map((_, i) => (ballast === i ? 0.3 : 0.2));
    const wanted = [
      { glider: 0, stage: 0, text: '碰前向右的甲' },
      { glider: 1, stage: 1, text: '碰后的乙' },
      { glider: 0, stage: 1, text: '碰后的甲' },
    ];
    function readyToRead() {
      return run && nextEvent === run.events.length && time >= run.collision;
    }
    function guide() {
      if (bar.finished) return say('两组总动量已核对。笔记本保留你的计时和计算结果。');
      if (!air) return say('点气源开关通气，看原来静止的滑块会不会自行漂移。', rig.power);
      if (Math.abs(tilt) > 1e-8)
        return say('气泡偏离中央。点左前方金色调平轮可近看，上下拖动让气泡回到两线中间。', rig.screw);
      if (levelZoom) return say('气泡已居中。回全景，将乙停在两门之间，松手观察。');
      if (!bar.has('level'))
        return say(
          Math.abs(drift) > 0.002 || Math.abs(carts[1].position.x) > 0.07
            ? '气泡已居中。把乙拖到两门中间停住，松手观察它是否自行漂移。'
            : '气泡已居中，观察静止的滑块是否还会加速。',
          carts[1],
        );
      if (run) {
        if (!readyToRead())
          return say(
            time < run.collision
              ? '看甲通过左门，再看碰撞后两块各往哪边走。'
              : '观察碰后各块经过哪道门，留意甲是否反向。',
          );
        if (readIndex < wanted.length)
          return say(
            '找' +
              wanted[readIndex].text +
              '的遮光时间。' +
              (near !== null ? '点计时器上对应的一行。' : '点记录它的那台计时器。'),
            near !== null
              ? null
              : rig.timers[
                  run.events.find((e) => e.glider === wanted[readIndex].glider && e.stage === wanted[readIndex].stage)
                    ?.gate ?? 0
                ].screen,
          );
        if (bar.has('elastic') && bar.has('stick'))
          return say('两组遮光时间已记下。展开笔记本，用 10 mm 除以遮光时间，再比较总动量。');
        return say('把甲拖回导轨左侧起点，准备换另一种碰撞端面。', carts[0]);
      }
      if (sleeves[0] !== sleeves[1])
        return say(
          '两个相撞端要配对。把另一片搭扣也装到相应滑块上，或把已装的一片取下。',
          rig.sleeves[sleeves[0] ? 1 : 0],
        );
      if (ballast === null) return say('将台前的 100 g 砝码拖上一个滑块，让两块质量不同。', rig.weight);
      if (!sleeves[0] && bar.has('elastic') && !bar.has('stick'))
        return say('把台前标甲、乙的搭扣分别拖到两块相撞的一端。', rig.sleeves[0]);
      if (sleeves[0] && bar.has('stick') && !bar.has('elastic'))
        return say('把两片搭扣拖回木座，换回弹性碰撞架。', rig.sleeves[0]);
      return say('向右推甲一小段再松手。乙起初静止，向右为正。', carts[0]);
    }
    function leave() {
      if (near !== null || levelZoom) ctx.back();
      levelZoom = false;
      near = null;
      bar.near(false);
      guide();
    }
    function setTilt(value) {
      tilt = Math.abs(value) < 0.0015 ? 0 : clamp(value, -0.012, 0.012);
      rig.level(tilt);
      levelTime = 0;
      if (!run) {
        bar.undo('level');
      }
      guide();
    }
    function prepare() {
      run = null;
      holding = returning = false;
      time = nextEvent = readIndex = 0;
      logs = [[], []];
      drift = 0;
      carts[0].position.x = -0.46;
      carts[1].position.x = 0;
      rig.timers.forEach((t) => t.draw([]));
      guide();
    }
    function reset() {
      if (near !== null || levelZoom) leave();
      air = false;
      tilt = 0.006;
      levelTime = 0;
      ballast = 1;
      sleeves = [false, false];
      rig.level(tilt);
      rig.massAt(ballast);
      rig.sleeves.forEach((_, i) => rig.sleeveAt(i, false));
      stored = [];
      records?.clear();
      if (records) records.el.hidden = true;
      reports?.replaceChildren();
      bar.undo('level', 'elastic', 'stick', 'verify');
      prepare();
    }
    function inspect(i) {
      enter();
      if (!readyToRead() || readIndex >= wanted.length) {
        guide();
        return;
      }
      near = i;
      bar.near(true);
      const p = group.worldToLocal(rig.timers[i].screen.getWorldPosition(new THREE.Vector3()));
      ctx.look(p.toArray(), [0, 1, 0.15], 0.27, leave);
      guide();
    }
    function read(ray) {
      const screen = rig.timers[near].screen,
        hit = ray.intersectObject(screen)[0];
      if (!hit) return;
      const j = Math.round(((1 - hit.uv.y) * 460 - 164) / 99);
      const event = logs[near][j],
        w = wanted[readIndex];
      if (!event || event.glider !== w.glider || event.stage !== w.stage)
        return say('这一行对应另一次过门。找' + w.text + '经过的门和先后次序。');
      run.selected.push(+((event.exit - event.enter) * 1000).toFixed(1));
      readIndex++;
      leave();
      if (readIndex === wanted.length) {
        const row = {
          sticky: sleeves[0],
          m: masses(),
          times: run.selected.slice(),
          directions: wanted.map((w) => run.events.find((e) => e.glider === w.glider && e.stage === w.stage).direction),
          accepted: false,
        };
        stored.push(row);
        records.el.hidden = false;
        records.add([
          row.sticky ? '粘连' : '弹开',
          ...row.m.map((m) => String(m * 1000)),
          ...row.times.map((v) => v.toFixed(1)),
        ]);
        report(row);
        bar.done(row.sticky ? 'stick' : 'elastic');
        guide();
      }
    }
    function report(row) {
      const labels = [
        '碰前甲速度 / (m/s)',
        '碰后乙速度 / (m/s)',
        '碰后甲速度 / (m/s)',
        '碰前总动量 / (kg·m/s)',
        '碰后总动量 / (kg·m/s)',
      ];
      const inputs = labels.map((label) =>
        h('input', { type: 'number', step: 'any', 'aria-label': label, style: 'width:6em' }),
      );
      const box = h(
        'div',
        {},
        note((row.sticky ? '粘连组' : '弹开组') + '：乙碰前静止。向右取正，速度保留三位小数，总动量保留三位小数。'),
        ...inputs.map((el, i) => h('label', {}, labels[i] + ' ', el)),
        buttons([
          {
            text: '核对这组动量',
            onClick: () => {
              const v = inputs.map((el) => el.valueAsNumber),
                expected = row.times.map((t, i) => (row.directions[i] * FLAG_WIDTH * 1000) / t);
              if (expected.some((x, i) => !Number.isFinite(v[i]) || Math.abs(v[i] - x) > 0.002))
                return say('速度大小取 10 mm 除以对应的毫秒数。向左的速度要带负号。');
              const before = row.m[0] * v[0],
                after = row.m[0] * v[2] + row.m[1] * v[1];
              if (
                !Number.isFinite(v[3]) ||
                !Number.isFinite(v[4]) ||
                Math.abs(v[3] - before) > 0.0015 ||
                Math.abs(v[4] - after) > 0.0015
              )
                return say('把质量换为 kg，各自乘带符号的速度，再把两块的动量相加。');
              row.accepted = true;
              if ([false, true].every((mode) => stored.some((r) => r.sticky === mode && r.accepted)))
                bar.done('verify');
              say(
                '这一组实测：碰前 ' +
                  v[3].toFixed(3) +
                  '，碰后 ' +
                  v[4].toFixed(3) +
                  ' kg·m/s。' +
                  (bar.finished ? '两组均已核对。' : '继续核对另一组。'),
              );
            },
          },
        ]).el,
      );
      reports.append(box);
    }
    function nearestCart(p) {
      return carts.map((c) => Math.abs(c.position.x - p.x)).reduce((best, d, i, all) => (d < all[best] ? i : best), 0);
    }
    function toolDrag(obj, isWeight, i) {
      let moving = false;
      return {
        obj,
        plane: 'xz',
        offset: TRACK_Y,
        enabled: () => !run,
        hint: isWeight ? '把已知质量砝码拖到车上或台面' : '把搭扣拖到相撞端，或拖回木座',
        onStart() {
          enter();
          moving = false;
        },
        onDrag(p) {
          if (!moving) {
            group.attach(obj);
            moving = true;
          }
          obj.position.set(p.x, TRACK_Y + 0.05, p.z);
        },
        onEnd(moved) {
          if (!moved) return guide();
          const p = obj.position,
            cart = nearestCart(p);
          const onCart = Math.abs(p.z) < 0.052 && Math.abs(p.x - carts[cart].position.x) < 0.079;
          const rack = Math.abs(p.z - 0.16) < 0.066 && Math.abs(p.x - 0.49) < 0.11;
          if (isWeight) {
            if (onCart) ballast = cart;
            else if (rack) ballast = null;
            rig.massAt(ballast);
          } else {
            if (onCart && cart === i) sleeves[i] = true;
            else if (rack) sleeves[i] = false;
            rig.sleeveAt(i, sleeves[i]);
          }
          guide();
        },
      };
    }
    const drag = draggable(
      group,
      [
        {
          obj: rig.screw,
          plane: 'xy',
          offset: 0,
          enabled: () => !run,
          hint: '上下拖动左脚，调平导轨',
          onTap() {
            levelZoom = true;
            bar.near(true);
            ctx.look([-0.452, 0.064, 0.065], [0, 0.7, 1], 0.245, leave);
            guide();
          },
          onStart() {
            enter();
            startX = tilt;
          },
          onDrag(p, from) {
            if (from) setTilt(startX - (p.y - from.y) * 0.32);
          },
        },
        {
          obj: carts[1],
          plane: 'xz',
          offset: TRACK_Y,
          enabled: () => !run,
          hint: '把乙拖到两门之间停住，松手试平',
          onStart() {
            enter();
            holding = true;
            drift = 0;
            startX = carts[1].position.x;
            levelTime = 0;
            bar.undo('level');
          },
          onDrag(p, from) {
            if (from) carts[1].position.x = clamp(startX + p.x - from.x, -0.34, 0.55);
          },
          onEnd() {
            holding = false;
            guide();
          },
        },
        toolDrag(rig.weight, true, 0),
        ...rig.sleeves.map((o, i) => toolDrag(o, false, i)),
        {
          obj: carts[0],
          plane: 'xz',
          offset: TRACK_Y,
          enabled: () => !run || readIndex === wanted.length,
          hint: () => (run ? '拖回左侧起点，重做一轮' : '轻推甲向右，松手释放'),
          onStart() {
            enter();
            returning = !!run;
            stroke = [[performance.now(), carts[0].position.x]];
            startX = carts[0].position.x;
            shove = 0;
          },
          onDrag(p, from) {
            if (!from) return;
            if (run) {
              if (readIndex >= wanted.length) carts[0].position.x = clamp(startX + p.x - from.x, -0.56, 0.56);
              return;
            }
            if (!air || !bar.has('level') || ballast === null || sleeves[0] !== sleeves[1]) return;
            shove = clamp(p.x - from.x, 0, 0.075);
            carts[0].position.x = startX + shove;
            const now = performance.now();
            stroke.push([now, carts[0].position.x]);
            while (stroke.length > 2 && now - stroke[1][0] > 240) stroke.shift();
          },
          onEnd(moved) {
            if (run) {
              returning = false;
              if (moved && readIndex >= wanted.length && Math.abs(carts[0].position.x + 0.46) < 0.08) prepare();
              else {
                carts[0].position.x = run.positions(time)[0];
                guide();
              }
              return;
            }
            if (shove < 0.008) {
              carts[0].position.x = startX;
              guide();
              return;
            }
            const [t, x] = stroke[0],
              last = stroke.at(-1),
              now = performance.now();
            const launch = (last[1] - x) / Math.max(0.001, (now - t) / 1000);
            if (now - last[0] > 250 || launch < 0.025) {
              carts[0].position.x = startX;
              say('甲在松手时几乎静止。连续向右推，一边运动一边松手，再计时。', carts[0]);
              return;
            }
            const [m1, m2] = masses();
            run = gliderTrial({
              m1,
              m2,
              launch,
              restitution: sleeves[0] ? 0 : 1,
              x1: carts[0].position.x,
              x2: carts[1].position.x,
            });
            run.selected = [];
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.power,
            hint: '打开或关闭气源',
            onTap() {
              enter();
              if (run) {
                say('本轮计时已经开始。读完后将甲拖回起点，再调整气源。');
                return;
              }
              air = !air;
              rig.power.rotation.x = air ? -0.17 : 0;
              levelTime = 0;
              bar.undo('level');
              guide();
            },
          },
          ...rig.timers.map((t, i) => ({ obj: t.screen, hint: '近看这道门的计时记录', onTap: () => inspect(i) })),
        ],
      },
    );
    reset();
    return {
      group,
      size: { w: 1.45, d: 0.58, h: 0.22 },
      view: { azim: 0, elev: 32, lookY: 0.48, margin: 1.01 },
      toggles: ['steps'],
      pointer: {
        items: drag.items,
        down(ray, e) {
          if (near !== null) {
            read(ray);
            return true;
          }
          return drag.down(ray, e);
        },
        move(ray) {
          return near !== null || drag.move(ray);
        },
        up() {
          return drag.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['碰撞', '甲 / g', '乙 / g', '甲碰前 / ms', '乙碰后 / ms', '甲碰后 / ms']);
        records.el.hidden = true;
        reports = h('div', {});
        ui.data.append(records.el, reports);
        ui.notes.append(
          note('遮光片宽 10 mm。数字计时器显示这道门每次被挡住的时间，单位 ms。向右为正，乙释放前静止。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!run) {
          if (air && !holding) {
            drift -= 9.8 * Math.sin(Math.atan(tilt)) * dt;
            const next = carts[1].position.x + drift * dt;
            carts[1].position.x = clamp(next, carts[0].position.x + 0.11, 0.56);
            if (next !== carts[1].position.x) drift = 0;
          }
          if (
            air &&
            !holding &&
            tilt === 0 &&
            Math.abs(drift) < 0.002 &&
            Math.abs(carts[1].position.x) <= 0.07 &&
            !bar.has('level')
          ) {
            levelTime += dt;
            if (levelTime >= 0.6) {
              bar.done('level');
              guide();
            }
          }
          return;
        }
        if (returning || time >= run.end) return;
        time = Math.min(run.end, time + dt);
        run.positions(time).forEach((x, i) => {
          carts[i].position.x = x;
        });
        while (nextEvent < run.events.length && run.events[nextEvent].exit <= time) {
          const e = run.events[nextEvent++];
          logs[e.gate].push(e);
          rig.timers[e.gate].draw(logs[e.gate]);
          guide();
        }
      },
      dispose() {
        drag.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
