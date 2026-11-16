import * as THREE from 'three';
import { tangentPath, tangentTrial, TANGENT_START } from './kit/tangentTrack.js';
import { tangentTrackRig, PAPER_Y, BALL_R, BALL_HOME, INK_HOME, SEGMENT_RACK } from './kit/tangentTrackRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';

export default {
  id: 'tangenttrack',
  fig: '图5.1-1',
  title: '观察钢球离开弯道的方向',
  stampText: '观察',
  predict: {
    q: '拆去末段，让钢球提前从 B 离轨，纸上留下的直线方向会怎样？',
    options: ['沿 B 处弯道的切向', '仍沿原出口 A 的方向', '继续沿原弯道转弯'],
    answer: 0,
  },
  conclusion: {
    page: 7, rect: [63.74, 420.28, 378.66, 462.39],
    quote: '根据上面的分析，可以得到结论：质点在某一点的速度方向，沿曲线在这一点的切线方向。',
    why: '同一钢球先从 A、再从 B 离轨。失去导轨约束后，纸上的直线痕迹接续出口处的方向。出口改变，离轨方向也改变；纸面阻力使球减速，但不使它继续沿原弯道转弯。',
    src: '课本第 3 页 · 第五章 第1节 曲线运动',
  },
  create(ctx) {
    const rig = tangentTrackRig(),
      { group, ball } = rig,
      piece = rig.segments[2];
    let ui,
      coated = false,
      armed = false,
      removed = false,
      run = null,
      age = 0,
      line = null,
      near = false;
    let pushing = false,
      held = false,
      samples = [],
      pushed = 0,
      inkTraceEnd = 0,
      lastDistance = 0,
      dragHome;
    const observed = new Set();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'ink', title: '沾印泥', todo: '把钢球拖到红印泥上，再移到入口 C。', target: () => ball },
        { id: 'full', title: '从 A 留迹', todo: '沿入口向左推球并松手，观察 A 外的印迹。', target: () => ball },
        { id: 'remove', title: '拆末段', todo: '把末段握片拖到纸后方，让 B 成为新出口。', target: () => piece.grip },
        { id: 'short', title: '从 B 留迹', todo: '把原球放回 C，再推一次，比较两条印迹。', target: () => ball },
      ],
    });
    function guide() {
      if (run) return bar.say('看原钢球沿弯道滚动，再看它离轨后的红色印迹。');
      if (bar.finished) return bar.say('A、B 外留下不同方向的直线，分别接续各自出口的切向。点纸面可近看。');
      if (!coated) return bar.say('抓住纸右前方的钢球，拖到右后的红印泥上沾色。');
      if (observed.has(3) && !removed) return bar.say('第一条印迹留在原纸上。抓住末段外侧的深色握片，拖到纸后方空位。');
      if (!armed) return bar.say('把这颗沾色钢球拖到标 C 的入口，松手放好；纸上的原痕迹会保留。');
      return bar.say('沿弯道入口向左推球一小段，边推边松手。推得太慢会停在弯道里。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      if (run || held) return;
      near = true;
      bar.near(true);
      ctx.look([-0.015, PAPER_Y, -0.015], [0, 1, 0.2], 0.65, leave);
      guide();
    }
    function position(p) {
      ball.position.set(p.x, PAPER_Y + BALL_R, p.z);
    }
    function reset() {
      if (near) leave();
      run = null;
      coated = armed = removed = held = pushing = false;
      rig.ink.visible = false;
      ball.position.set(...BALL_HOME);
      ball.quaternion.identity();
      piece.root.position.copy(piece.home);
      observed.clear();
      rig.clearTraces();
      line = null;
      bar.undo('ink', 'full', 'remove', 'short');
      guide();
    }
    function nearestEntry(p) {
      let best = 0,
        error = Infinity;
      for (let i = 0; i <= 120; i++) {
        const s = i * 0.0005,
          q = tangentPath().at(s),
          d = Math.hypot(p.x - q.x, p.z - q.z);
        if (d < error) {
          error = d;
          best = s;
        }
      }
      return best;
    }
    const pointer = draggable(
      group,
      [
        {
          obj: ball,
          plane: 'xz',
          offset: PAPER_Y + BALL_R,
          keepOffset: true,
          enabled: () => !run,
          hint: () => (armed ? '沿弯道入口推球后松手' : '拿起原钢球'),
          onStart() {
            held = true;
            pushing = armed;
            pushed = 0;
            inkTraceEnd = 0;
            samples = [{ s: 0, t: performance.now() }];
            if (pushing) {
              line = coated ? rig.makeTrace() : null;
            }
          },
          onDrag(p) {
            if (pushing) {
              // A perpendicular lift takes the ball out of the guide, permitting error recovery.
              const s = nearestEntry(p),
                q = tangentPath().at(s);
              if (Math.hypot(p.x - q.x, p.z - q.z) > 0.045) {
                pushing = false;
                armed = false;
              } else {
                pushed = s;
                inkTraceEnd = Math.max(inkTraceEnd, s);
                position(q);
                samples.push({ s, t: performance.now() });
                samples = samples.filter((v) => performance.now() - v.t < 140);
                if (line)
                  rig.drawTrace(
                    line,
                    Array.from({ length: Math.ceil(inkTraceEnd / 0.001) + 1 }, (_, i) => ({
                      ...tangentPath().at(Math.min(i * 0.001, inkTraceEnd)),
                      distance: Math.min(i * 0.001, inkTraceEnd),
                    })),
                  );
                return;
              }
            }
            ball.position.set(clamp(p.x, -0.28, 0.28), PAPER_Y + BALL_R + 0.025, clamp(p.z, -0.22, 0.22));
            if (Math.hypot(p.x - INK_HOME[0], p.z - INK_HOME[2]) < 0.024) {
              coated = true;
              rig.ink.visible = true;
              ball.position.y = INK_HOME[1] + BALL_R + 0.0015;
              bar.done('ink');
            }
          },
          onEnd(moved) {
            held = false;
            if (pushing) {
              pushing = false;
              armed = false;
              const now = performance.now(),
                first = samples[0],
                last = samples.at(-1);
              const speed =
                last && first && now - last.t < 150
                  ? clamp((last.s - first.s) / Math.max(0.015, (last.t - first.t) / 1000), 0, 0.17)
                  : 0;
              if (!moved || speed < 0.01) {
                position(tangentPath().at(pushed));
                return bar.say('球停在这里。把它拿到入口 C 放好，再向左推并松手。');
              }
              run = tangentTrial({ count: removed ? 2 : 3, speed, startDistance: pushed, resistance: 0.03 });
              age = 0;
              lastDistance = pushed;
              guide();
              return;
            }
            const atC = Math.hypot(ball.position.x - TANGENT_START.x, ball.position.z - TANGENT_START.z) < 0.025;
            armed = atC;
            if (atC) position(TANGENT_START);
            else
              ball.position.y =
                Math.hypot(ball.position.x - INK_HOME[0], ball.position.z - INK_HOME[2]) < 0.024
                  ? INK_HOME[1] + BALL_R + 0.0015
                  : PAPER_Y + BALL_R;
            guide();
          },
        },
        {
          obj: piece.grip,
          anchor: piece.root,
          keepOffset: true,
          plane: 'xz',
          offset: PAPER_Y + 0.024,
          enabled: () => !run,
          hint: () => (removed ? '将末段装回 B 后' : '抓住握片，拆下末段'),
          onStart() {
            dragHome = piece.root.position.clone();
          },
          onDrag(p) {
            piece.root.position.set(clamp(p.x, -0.2, 0.23), 0.035, clamp(p.z, -0.19, 0.16));
          },
          onEnd(moved) {
            const p = piece.root.position;
            if (!moved) {
              piece.root.position.copy(dragHome);
              return guide();
            }
            if (Math.hypot(p.x - SEGMENT_RACK[0], p.z - SEGMENT_RACK[2]) < 0.07) {
              removed = true;
              piece.root.position.set(...SEGMENT_RACK);
              if (observed.has(3)) bar.done('remove');
            } else if (Math.hypot(p.x - piece.home.x, p.z - piece.home.z) < 0.05) {
              removed = false;
              piece.root.position.copy(piece.home);
            } else {
              piece.root.position.copy(dragHome);
              return bar.say('把末段放到纸后方标出的空位，或对准 B 后的接缝装回。');
            }
            guide();
          },
        },
      ],
      { highlight: true, taps: [{ obj: rig.paper, hint: '近看纸上原印迹', onTap: inspect }] },
    );
    return {
      group,
      size: { w: 0.64, d: 0.53, h: 0.12 },
      view: { elev: 57, azim: 0, margin: 1.06 },
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
        panel.notes.append(
          note(
            '先沾色，再把原球放进 C。第二次抓球时沿入口向左推动并松手，推速决定释放速度。拆末段只移动原轨道，原球和两次红印迹都保留。',
          ),
          buttons([
            { text: '近看印迹', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '水平窄导槽为理想约束，忽略侧壁撞击与打滑。纸面采用等效滚动减速，参数不是印泥的实测摩擦系数。印迹表示球接触纸面留下的连续细痕。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!run) return;
        age += dt;
        const p = run.at(age);
        position(p);
        const ds = p.distance - lastDistance;
        ball.rotateOnWorldAxis(new THREE.Vector3(Math.sin(p.heading), 0, -Math.cos(p.heading)), ds / BALL_R);
        lastDistance = p.distance;
        if (coated && line) {
          const catchingUp = p.distance < inkTraceEnd;
          const end = catchingUp ? inkTraceEnd : pushed;
          const hand = Array.from({ length: Math.ceil(end / 0.001) + 1 }, (_, i) => ({
            ...run.path.at(Math.min(i * 0.001, end)),
            distance: Math.min(i * 0.001, end),
          }));
          rig.drawTrace(line, [...hand, ...(catchingUp ? [] : run.trace(age))]);
        }
        if (p.stopped) {
          const finished = run.reachesExit && p.distance - run.path.length > 0.035 && coated,
            count = run.path.count;
          run = null;
          if (finished) {
            observed.add(count);
            if (observed.has(3)) bar.done('full');
            if (observed.has(3) && removed) bar.done('remove');
            if (observed.has(3) && observed.has(2)) bar.done('short');
            guide();
          } else
            bar.say(
              coated
                ? '这次推得较慢，印迹不够看清离轨方向。把原球拿回 C，稍快些推入再试。'
                : '这颗球还没沾印泥，纸上没有记录。先拿到红印泥上，再放回 C。',
            );
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
