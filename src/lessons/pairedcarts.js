import * as THREE from 'three';
import { pairedCartRig, START_X, TOP, LANES } from './kit/pairedCartRig.js';
import { CARTS, tractionRun } from './kit/ticker/traction.js';
import { advance } from './kit/ticker/motion.js';
import { liftBrake, movePair, pairedRun, pressBrake } from './kit/ticker/pairedCarts.js';
import { draggable, clamp, rayToLocal } from './kit/interact.js';
import { block } from './kit/electronicsBench.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, h, note, table } from './kit/ui.js';

export default {
  id: 'pairedcarts',
  fig: '图4.2-3',
  title: '通过位移之比测量加速度之比',
  stampText: '比较',
  predict: {
    q: '两车同时由静止出发，又同时停下。若甲车位移较大，你怎样比较两车的加速度？',
    options: ['甲的加速度较大', '甲的加速度较小', '只知道谁先出发'],
    answer: 0,
    hint: '同一段运动时间里，两车的位移都是 a t²/2。',
  },
  conclusion: {
    page: 93, rect: [63.8, 430.33, 378.79, 528.61],
    quote: '如果能做到让两个做初速度为0的匀加速直线运动的物体的运动时间t相等，那么由（1）式可知，它们的位移之比就等于加速度之比……',
    why: '轻绳、理想滑轮、阻力已补偿时，a = mg/(M + m)。盘和盘中重物相同，悬挂总质量 m 远小于车质量 M，才可近似认为两车所受的拉力相等。',
    src: '课本第 89 页 · 第四章 第2节 实验：探究加速度与力、质量的关系',
  },
  create(ctx) {
    const rig = pairedCartRig(),
      { group, board, brake, cars, weights } = rig;
    let ui,
      rows,
      form,
      aim,
      view,
      lift,
      verified,
      trial,
      tested,
      hooked,
      owners,
      pair,
      positions,
      returned,
      measured,
      history;
    const marks = LANES.map((z) =>
      Array.from({ length: 4 }, () => {
        const m = block(board, 0.0014, 0.0007, 0.011, 0, 0.001, z + 0.043, 0x896b55);
        m.visible = false;
        return m;
      }),
    );
    const homes = weights.map((m) => m.position.clone());
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'balance', title: '补偿阻力', todo: '空盘脱钩，试推两车，对比等时间隔的位移。', target: () => aim },
        { id: 'same', title: '同质量对比', todo: '两车质量相同，同时放开和压停，读两段位移。', target: () => aim },
        { id: 'mass', title: '改变车质量', todo: '保持悬挂质量，往一辆车上加砝码再比一次。', target: () => aim },
        { id: 'ratio', title: '解释位移比', todo: '从两轮实测位移比较两车的加速度。', target: () => aim },
      ],
    });
    function say(s, obj) {
      aim = obj;
      bar.say(s);
    }
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function guide() {
      if (bar.finished) {
        const r = history.find((r) => r.masses[0] !== r.masses[1]);
        return say(
          '前、后车质量为 ' +
            r.masses.join(' / ') +
            ' kg 时，你测得位移比 ' +
            r.ratio.toFixed(2) +
            '，这是两车的加速度比。',
        );
      }
      if (bar.has('same') && bar.has('mass')) return say('展开笔记本，比较两轮实测位移比。');
      if (trial) return say('留意车旁每隔 0.20 s 留下的刻线，比较三段长度，等车停下。');
      const offZero = positions.findIndex((v, i) => !hooked[i] && v > 0.002);
      if (offZero >= 0)
        return say(
          '试滑结束。把' + (offZero ? '后' : '前') + '车向右拖回尺的零线，沿尺保留试滑刻线。',
          cars[offZero].car,
        );
      if (!verified.every(Boolean)) {
        const i = verified[0] ? 1 : 0;
        if (tested !== null && !verified[tested])
          return say(
            marks[tested].every((m) => m.visible) &&
              marks[tested][1].position.x - marks[tested][2].position.x <
                marks[tested][2].position.x - marks[tested][3].position.x
              ? '三段距离越来越长，降低右端的垫块再试。'
              : '三段距离越来越短，垫高木板右端再试。',
            rig.wedge,
          );
        return say('把' + (i ? '后' : '前') + '车向左轻推并松手，观察尺上三段等时位移。', cars[i].car);
      }
      const loose = hooked.indexOf(false);
      if (loose >= 0)
        return say(
          '两车的试滑点距均匀。把' + (loose ? '后' : '前') + '车左下方的 20 g 小盘拖到滑轮下挂好。',
          cars[loose].pan,
        );
      if (pair?.state === 'moving') return say('两车已出发。提住片刻，再压下或松开黑板擦，让两车同时停下。', brake);
      if (pair?.state === 'atEnd') return say('有车碰到挡块，这一轮不能比较。松开黑板擦，压停另一车。', brake);
      if (pair?.state === 'missed')
        return say('有车已到端部。分别向右拖两车回零线，再试；这次提前压下黑板擦。', cars[returned[0] ? 1 : 0].car);
      if (pair?.state === 'stopped' && measured.some((x) => x === null) && !returned.some(Boolean)) {
        if (Math.min(...positions) < 0.02)
          return say('行程过短。向右拖两车回零线，再给它们多一点运动时间。', cars[0].car);
        const i = measured[0] === null ? 0 : 1;
        return say(
          view
            ? '沿' + (i ? '后' : '前') + '车的红指针点尺面，读它的位移（cm）。'
            : '点' + (i ? '后' : '前') + '车旁的尺近看，读红指针对应的位移。',
          view ? null : cars[i].scale,
        );
      }
      if (pair && pair.state !== 'held')
        return say('向右拖' + (returned[0] ? '后' : '前') + '车回零线，准备下一轮。', cars[returned[0] ? 1 : 0].car);
      if (bar.has('same') && owners.every((i) => i === null))
        return say('把台前的 250 g 砝码拖上一辆车。保持两个 20 g 小盘，再同时放车。', weights[0]);
      if (!bar.has('same') && bar.has('mass'))
        return say(
          '从车上拖下砝码，使两车质量相同，再试一次。',
          weights.find((_, j) => owners[j] !== null),
        );
      return say('向上提住黑板擦放开两车，行进一段后松手压停。', brake);
    }
    const settings = () =>
      LANES.map((_, i) => ({ lift, cartIndex: owners.filter((n) => n === i).length, hangerIndex: 1 }));
    function sync(i) {
      rig.setCart(i, positions[i], hooked[i]);
    }
    function putWeight(j) {
      const i = owners[j],
        w = weights[j];
      if (i === null) {
        group.add(w);
        w.position.copy(homes[j]);
      } else {
        cars[i].car.add(w);
        w.position.set(owners.every((n) => n === i) ? (j ? 0.019 : -0.019) : 0, 0.053, 0);
      }
    }
    function reset() {
      if (view !== null && view !== undefined) leave();
      lift = 0;
      verified = [false, false];
      hooked = [false, false];
      owners = [null, null];
      positions = [0, 0];
      trial = pair = tested = null;
      returned = [false, false];
      measured = [null, null];
      history = [];
      rig.setLift(0);
      brake.position.y = 0;
      LANES.forEach((_, i) => {
        sync(i);
        putWeight(i);
        marks[i].forEach((m) => (m.visible = false));
      });
      rows?.clear();
      if (form) form.hidden = true;
      bar.undo('balance', 'same', 'mass', 'ratio');
      showLift();
      guide();
    }
    const liftLabel = ctx.tag('', 'pill');
    const showLift = () =>
      liftLabel
        .loc(board, 0.38, 0.021, 0.1)
        .text('垫高 ' + lift + ' mm')
        .show(!hooked.some(Boolean));
    const worldPos = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    let grab,
      entry,
      pressed,
      holding = false,
      fallSpeed = 0;
    const drags = [
      {
        obj: rig.wedge,
        plane: 'xy',
        offset: 0.105,
        enabled: () => !trial && !hooked.some(Boolean) && positions.every((x) => x === 0),
        hint: '上下拖垫块，调整木板倾角',
        onStart() {
          grab = lift;
        },
        onDrag(p, start) {
          if (!start) return;
          const val = clamp(Math.round((grab + (p.y - start.y) * 1000) / 5) * 5, 0, 30);
          if (lift === val) return;
          lift = val;
          rig.setLift(lift);
          showLift();
          verified = [false, false];
          tested = null;
          bar.undo('balance');
          marks.flat().forEach((m) => (m.visible = false));
          positions = [0, 0];
          LANES.forEach((_, i) => sync(i));
        },
        onEnd: guide,
      },
    ];
    let scalePoint;
    function readScale(i) {
      if (pair?.state !== 'stopped' || returned.some(Boolean) || Math.min(...positions) < 0.02) return;
      if (!view) {
        view = 'scales';
        bar.near(true);
        const center = worldPos(cars[0].scale).lerp(worldPos(cars[1].scale), 0.5);
        ctx.look(center.toArray(), [0, 1, 0.06], ctx.camera.aspect < 1 ? 0.57 : 0.65, leave);
        guide();
        return;
      }
      if (!scalePoint || measured[i] !== null) return;
      // 去掉板面倾角，沿刻度尺自身的方向量位移。
      const local = scalePoint;
      const x = Math.round((START_X - local.x) * 1000) / 1000;
      if (Math.abs(x - positions[i]) > 0.003) return say('看红指针与尺边对齐的位置，读最接近的毫米刻度。');
      measured[i] = x;
      if (measured.every((n) => n !== null)) {
        const masses = settings().map((s) => CARTS[s.cartIndex]),
          ratio = measured[0] / measured[1];
        rows.add([masses.join(' / '), ...measured.map((v) => (100 * v).toFixed(1)), ratio.toFixed(2)]);
        history.push({ masses, ratio });
        bar.done(masses[0] === masses[1] ? 'same' : 'mass');
        form.hidden = !(bar.has('same') && bar.has('mass'));
        leave();
      } else guide();
    }
    cars.forEach((c, i) => {
      let shift;
      drags.push(
        {
          obj: c.car,
          plane: 'xz',
          offset: TOP + 0.025,
          enabled: () => !trial && (!hooked.some(Boolean) || (!!pair && ['stopped', 'missed'].includes(pair.state))),
          hint: () => (hooked[i] ? '点指针读尺，或向右拖车回零线' : '向左轻推小车再松手'),
          onTap() {
            readScale(i);
          },
          onStart() {
            grab = positions[i];
            shift = 0;
          },
          onDrag(p, start) {
            if (!start) return;
            shift = start.x - p.x;
            positions[i] = hooked[i] || grab > 0.002 ? clamp(grab + shift, 0, grab) : clamp(shift, 0, 0.06);
            sync(i);
          },
          onEnd(moved) {
            if (!moved) return;
            if (hooked[i]) {
              if (positions[i] > 0.014) {
                positions[i] = grab;
                sync(i);
                return guide();
              }
              positions[i] = 0;
              sync(i);
              returned[i] = true;
              if (returned.every(Boolean)) {
                pair = null;
                returned = [false, false];
                measured = [null, null];
                brake.position.y = 0;
              }
              return guide();
            }
            if (grab > 0.002) {
              positions[i] = positions[i] < 0.014 ? 0 : grab;
              sync(i);
              return guide();
            }
            if (shift < 0.006) {
              positions[i] = 0;
              sync(i);
              return guide();
            }
            tested = null;
            const run = tractionRun({
              mode: 'balance',
              lift,
              cartIndex: 0,
              hangerIndex: 0,
              startOffset: positions[i],
              pushSpeed: clamp(shift * 5, 0.12, 0.28),
            });
            trial = { i, run, start: positions[i] };
            marks[i].forEach((m) => (m.visible = false));
            guide();
          },
        },
        {
          obj: c.pan,
          plane: 'xy',
          offset: LANES[i],
          enabled: () => verified.every(Boolean) && positions.every((x) => x === 0) && !hooked[i],
          hint: '托起小盘，挂到滑轮下的绳端',
          onStart() {
            entry = c.pan.position.clone();
          },
          onDrag(p, start) {
            if (start) c.pan.position.copy(entry).add(p.clone().sub(start));
          },
          onEnd(moved) {
            if (moved && c.pan.position.y > TOP - 0.1 && Math.abs(c.pan.position.x - entry.x) < 0.05) {
              hooked[i] = true;
              positions[i] = 0;
              marks[i].forEach((m) => (m.visible = false));
              if (hooked.every(Boolean)) brake.position.y = 0;
              showLift();
            }
            sync(i);
            guide();
          },
        },
        {
          obj: c.scale,
          plane: 'xz',
          offset: TOP,
          enabled: () => pair?.state === 'stopped' && !returned.some(Boolean) && Math.min(...positions) >= 0.02,
          hint: '沿车侧红指针读下面的尺',
          onTap() {
            readScale(i);
          },
        },
      );
    });
    weights.forEach((w, j) =>
      drags.push({
        obj: w,
        plane: 'xy',
        get offset() {
          return owners[j] === null ? homes[j].z : LANES[owners[j]];
        },
        enabled: () => hooked.every(Boolean) && !pair,
        hint: '把砝码拖上车，或从车上移回台面',
        onStart() {
          entry = worldPos(w);
          group.add(w);
          w.position.copy(entry);
        },
        onDrag(p, start) {
          if (!start) return;
          w.position.copy(entry).add(p.clone().sub(start));
        },
        onEnd(moved) {
          if (moved) {
            const at = w.position;
            if (at.y < 0.13) owners[j] = null;
            else if (Math.abs(at.x - START_X) < 0.07 && at.y > TOP - 0.035) {
              // 从正视图也能区分两车：按指针落下的屏幕位置选实体车。
              if (pressed) {
                const hit = pressed();
                if (hit !== null) owners[j] = hit;
              }
            }
          }
          weights.forEach((_, k) => putWeight(k));
          guide();
        },
      }),
    );
    drags.push({
      obj: brake,
      plane: 'xy',
      offset: 0,
      enabled: () => hooked.every(Boolean) && (!pair || ['held', 'moving'].includes(pair.state)),
      hint: '向上提黑板擦放车，往下压同时制动',
      onStart() {
        grab = brake.position.y;
        holding = true;
        fallSpeed = 0;
      },
      onDrag(p, start) {
        if (!start) return;
        const previous = brake.position.y;
        brake.position.y = clamp(grab + p.y - start.y, 0, 0.07);
        if (previous <= 0.006 && brake.position.y > 0.006) {
          pair ??= pairedRun(settings());
          liftBrake(pair);
          guide();
        } else if (pair && ['moving', 'atEnd'].includes(pair.state) && brake.position.y <= 0.003) {
          pressBrake(pair);
          brake.position.y = 0;
          guide();
        }
      },
      onEnd() {
        holding = false;
        guide();
      },
    });
    const manip = draggable(group, drags, { highlight: true });
    reset();
    return {
      group,
      size: { w: 0.81, h: 0.55, d: 0.46 },
      view: { azim: -7, elev: 32, lookY: 0.52, margin: 1.03 },
      toggles: ['steps'],
      pointer: {
        ...manip,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          scalePoint = rayToLocal(ray, board, 'xz', 0.0004)?.clone();
          return manip.down(ray, e);
        },
        move(ray) {
          pressed = () => {
            const hits = ray.intersectObjects(
              cars.map((c) => c.car),
              true,
            );
            if (!hits.length) return null;
            for (let o = hits[0].object; o; o = o.parent) {
              const i = cars.findIndex((c) => c.car === o);
              if (i >= 0) return i;
            }
            return null;
          };
          return manip.move(ray);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['前/后车 kg', '前车 x / cm', '后车 x / cm', '位移比 前/后']);
        form = h(
          'div',
          {},
          note('比较同一次制动的两段位移。前车与后车的加速度比等于什么？'),
          buttons([
            {
              text: '前车位移 ÷ 后车位移',
              onClick() {
                if (history.length >= 2) {
                  bar.done('ratio');
                  guide();
                }
              },
            },
            {
              text: '后车位移 ÷ 前车位移',
              onClick() {
                say('两车都从静止出发，分别写出 x = at²/2，再把两式相除。');
              },
            },
          ]).el,
        );
        form.hidden = true;
        panel.data.append(rows.el, form);
        panel.notes.append(
          note(
            '前车与后车空载质量各为 0.50 kg。每盘连同盘中重物共 20 g。试滑时红线按 0.20 s 等时留下；正式比较时从零线读红指针。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (trial) {
          const { run, i, start } = trial,
            before = run.t;
          advance(run, dt);
          positions[i] = start + run.x;
          sync(i);
          for (let k = 0; k < 4; k++) {
            const t = k * 0.2;
            if (before <= t && t <= run.t) {
              const m = marks[i][k];
              m.position.x = START_X - start - run.v0 * t - 0.5 * run.a * t * t;
              m.visible = true;
            }
          }
          if (run.t >= run.end) {
            const gaps = marks[i].slice(1).map((m, k) => marks[i][k].position.x - m.position.x);
            verified[i] = marks[i][3].visible && Math.max(...gaps) - Math.min(...gaps) < 0.001;
            tested = i;
            trial = null;
            if (verified.every(Boolean)) bar.done('balance');
            guide();
          }
        }
        if (pair && ['moving', 'atEnd'].includes(pair.state)) {
          const oldState = pair.state;
          let travelTime = dt;
          if (!holding && brake.position.y > 0) {
            const fallTime = (Math.sqrt(fallSpeed ** 2 + 19.6 * brake.position.y) - fallSpeed) / 9.8;
            travelTime = Math.min(dt, fallTime);
            brake.position.y = Math.max(0, brake.position.y - fallSpeed * travelTime - 4.9 * travelTime ** 2);
            fallSpeed += 9.8 * travelTime;
            if (fallTime <= dt) brake.position.y = 0;
          }
          movePair(pair, travelTime);
          if (!holding && brake.position.y === 0) pressBrake(pair);
          pair.carts.forEach((c, i) => {
            positions[i] = c.x;
            sync(i);
          });
          if (oldState !== pair.state) guide();
        }
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
