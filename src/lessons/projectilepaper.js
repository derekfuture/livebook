// 必修第二册第 12 页，图 5.3-3。长度用 m，纸上原点是水平槽口处的球心。
import * as THREE from 'three';
import { projectilePaperRig, EXIT_X, EXIT_Y, RAMP_LENGTH, BALL_R, PAPER_Z, PAPER_H, PAPER_W, PAPER_LEFT, PAPER_TOP, rampY } from './kit/projectilePaperRig.js';
import { printAtDrop, rollingExitSpeed, tracedX, TIME_STEP, fallDistance } from './kit/projectileTrack.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, table, note, h } from './kit/ui.js';

const levels = [1, 2, 3].map(n => fallDistance(n * TIME_STEP));
const bottom = 0.203;
const ballZ = PAPER_Z + BALL_R + 0.00035;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const cm = (m, places = 1) => (m * 100).toFixed(places);
const last = a => a[a.length - 1];
const steps = [
  ['origin', '定原点、铺纸', '点槽口处的球心，标出量水平位移和落差的共同起点。'],
  ['print', '改变高度取点', '把钢球拖到斜槽高处，松手让它从静止滚下。'],
  ['curve', '沿印迹描轨迹', '向上拉木柄，揭开复写纸，看看白纸上留下了哪些点。'],
  ['equal', '比较等时位移', '对准三个等间隔时刻的落差，分别读出水平位置。'],
];

export default {
  id: 'projectilepaper', fig: '图5.3-3', title: '用落点探究平抛的水平分运动', stampText: '探究',
  predict: {
    q: '钢球离开水平槽口后，每过相同的一段时间，向前移动的距离会怎样变化？',
    options: ['每段相等', '每段增加', '每段减少'], answer: 0,
  },
  conclusion: {
    page: 20, rect: [217.0, 306.81, 531.02, 351.91],
    quote: '通过前面的讨论我们已经知道，做平抛运动的物体在 x 方向的分运动是匀速直线运动……',
    why: '同处静止释放，钢球每次离槽的速度相同。在同一条轨迹上，相等时间内的水平位移近似相等。',
    src: '人教版物理必修第二册 · 第 16 页',
  },
  create(ctx) {
    const rig = projectilePaperRig();
    const { group, ball, paper, tab, knob, pencil, grip, ruleBar } = rig;
    const root = new THREE.Group().add(group);
    let ui, aim, origin, release, drop, carbon, reader, shot, view, traced, returning;
    let ballHome, carbonHome, penDown, writing;
    const marks = [], trace = [], readings = [];
    const valid = () => marks.filter(m => m.valid);
    function sortedDrops() {
      const ds = [];
      for (const d of valid().map(m => m.drop).sort((a, b) => a - b))
        if (!ds.length || d - last(ds) > 0.003) ds.push(d);
      return ds;
    }
    function nextDrop() {
      const ds = sortedDrops();
      if (!ds.length) return drop;
      if (ds[0] > 0.018) return levels[0];
      if (last(ds) < levels[2] + 0.001) return 0.116;
      const bounds = [0, ...ds];
      let index = 1;
      for (let i = 2; i < bounds.length; i++)
        if (bounds[i] - bounds[i - 1] > bounds[index] - bounds[index - 1]) index = i;
      if (ds.length >= 5 && bounds[index] - bounds[index - 1] <= 0.045) return null;
      return (bounds[index] + bounds[index - 1]) / 2;
    }
    const parked = () => drop >= bottom - 0.002;
    const canDraw = () => bar.has('print') && carbon === 0 && parked() && view && !traced;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: steps.map(([id, title, todo]) => ({ id, title, todo, target: () => aim })) });
    const rows = table(['t / s', '理论 y / cm', 'x / cm', '本段 Δx / cm']);
    const status = s => ui?.status(s);
    const field = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': '水平位置（cm）', style: 'width:5em;font:inherit' });
    const form = h('form', { hidden: true, onsubmit(e) { e.preventDefault(); read(); } },
      h('label', {}, '水平位置 x ', field, ' cm '), h('button', { class: 'go', type: 'submit' }, '记录'));
    const work = note('');
    function guide(text, target) {
      aim = target || null;
      bar.say(text);
    }
    function refresh() {
      rig.ink(origin, marks, trace, readings);
      rig.setReader(reader, traced && !bar.finished);
      pencil.visible = !!canDraw();
      form.hidden = !(view && traced && !bar.finished);
      if (bar.finished) return guide('三段水平位移近似相等，钢球在水平方向做匀速直线运动。掀开结论对照课本。');
      if (!origin) return guide(steps[0][2], ball);
      if (shot) return guide('看钢球从水平槽口飞出，落到倾斜挡板上。');
      if (!bar.has('print')) {
        if (carbon !== 1) return guide('向下拉右边的木柄，把复写纸盖到白纸底边，碰撞才能留下印迹。', tab);
        if (release === null) return guide(steps[1][2], ball);
        if (valid().some(m => Math.abs(m.drop - drop) < 0.003))
          return guide('上下拖右侧圆钮，把挡板移到 O 下约 ' + cm(nextDrop()) + ' cm，再从原标记放球。', knob);
        return guide('把钢球拖回斜槽上的铜色标记，松手时每次的起点要相同。', ball);
      }
      if (carbon !== 0) return guide(steps[2][2], tab);
      if (!parked()) return guide('把右侧圆钮降到底，让挡板和钢球离开要描的那段纸面。', knob);
      if (!view) return guide('点白纸，正对纸面看清印迹和刻度。', paper);
      if (!traced) return guide('从 O 沿黑点向右下描平滑曲线。' + (marks.some(m => !m.valid) ? '跳过带 × 的点。' : ''), grip);
      const i = readings.length;
      const aligned = Math.abs(reader - levels[i]) <= 0.0009;
      return aligned ? guide('横尺上边已对准落差，读曲线与尺边交点的水平刻度，记到 0.1 cm。')
        : guide('从 O 下落 ' + ((i + 1) * TIME_STEP).toFixed(2) + ' s，理论落差约 ' + cm(levels[i], 2) + ' cm。将横尺上边移到这个高度。', ruleBar);
    }
    function leave() {
      view = false; ctx.back(); bar.near(false); refresh();
    }
    function near() {
      view = true; bar.near(true);
      if (ctx.camera.aspect < 1) {
        // 竖屏保留原点、落点和读数所需的整段刻度，留出底部步骤栏的位置。
        const width = Math.max(0.10, ...marks.map(m => m.x));
        const depth = Math.max(...marks.map(m => m.drop));
        const distance = Math.max(0.28, (width + 0.035) * 1.72, (depth + 0.028) * 2.12);
        ctx.look([EXIT_X + width / 2, EXIT_Y - depth / 2 - 0.018, PAPER_Z], [0, 0, 1], distance, leave);
      } else ctx.look([PAPER_LEFT + PAPER_W / 2, PAPER_TOP - PAPER_H / 2, PAPER_Z], [0, 0, 1], 0.55, leave);
      refresh();
    }
    function markOrigin() {
      origin = true; status('O 在钢球刚离槽时的球心，向右量 x，向下量 y。'); refresh();
    }
    function launch(x) {
      const height = rampY(x) - EXIT_Y;
      if (release === null && carbon === 1) {
        release = x;
        rig.releaseMark.position.set(x, rampY(x) - BALL_R - 0.0015, ballZ);
        rig.releaseMark.visible = true;
      }
      const points = [{ x, y: rampY(x), t: 0 }];
      for (let i = 1; i <= 64; i++) {
        const u = x + (EXIT_X - x) * i / 64, y = rampY(u), prev = last(points);
        const speeds = rollingExitSpeed(rampY(x) - prev.y) + rollingExitSpeed(rampY(x) - y);
        points.push({ x: u, y, t: prev.t + 2 * Math.hypot(u - prev.x, y - prev.y) / speeds });
      }
      shot = { points, t: 0, speed: rollingExitSpeed(height), hit: printAtDrop(height, drop),
        valid: release !== null && Math.abs(release - x) < 0.0025, printed: false };
      refresh();
    }
    function print(s) {
      s.printed = true;
      if (carbon !== 1) return status('钢球碰到了挡板，这次没有留下新的印迹。');
      marks.push({ ...s.hit, valid: s.valid });
      rig.press(marks);
      if (!s.valid) status('这一次的释放高度变了，离槽速度也变了。纸上用 × 标出这次的印迹。');
      else {
        const count = sortedDrops().length;
        status('钢球挤压复写纸，已在 ' + count + ' 个不同高度留下同一释放位置的印迹。');
        if (nextDrop() === null) bar.done('print');
      }
      rig.ink(origin, marks, trace, readings);
    }
    function updateShot(dt) {
      const s = shot;
      s.t += dt;
      const fly = s.t - last(s.points).t;
      if (fly < 0) {
        const i = s.points.findIndex(p => p.t >= s.t), a = s.points[Math.max(0, i - 1)], b = s.points[i];
        const f = (s.t - a.t) / (b.t - a.t || 1);
        rig.placeBall(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      } else if (fly < s.hit.t) rig.placeBall(EXIT_X + s.speed * fly, EXIT_Y - fallDistance(fly));
      else {
        if (!s.printed) print(s);
        const t = Math.min(fly - s.hit.t, 0.08);
        rig.placeBall(Math.min(PAPER_LEFT + PAPER_W - 0.02, EXIT_X + s.hit.x + s.speed * t * (1 - t / 0.16)), EXIT_Y - drop);
        if (fly - s.hit.t >= 0.32) { shot = null; refresh(); }
      }
    }
    const penAt = p => pencil.position.set(EXIT_X + p.x, EXIT_Y - p.drop, PAPER_Z + 0.0005);
    function draw(p) {
      const q = { x: p.x - EXIT_X, drop: EXIT_Y - p.y };
      if (q.x < -0.003 || q.drop < -0.003 || p.x > PAPER_LEFT + PAPER_W || p.y < PAPER_TOP - PAPER_H) return;
      const prev = last(trace);
      if (!prev || Math.hypot(q.x - prev.x, q.drop - prev.drop) > 0.0005) {
        trace.push(q); penAt(q); rig.ink(origin, marks, trace, readings);
      }
    }
    function checkLine() {
      const dots = valid().sort((a, b) => a.drop - b.drop);
      if (!dots.every(m => trace.some(p => Math.hypot(p.x - m.x, p.drop - m.drop) < 0.005)) ||
          levels.some(d => tracedX(trace, d) === null)) {
        status('线还没有连全，从线尾接着描。从 O 起笔可以重画。'); return;
      }
      // 以实际落点检查笔迹，也检查相邻点之间的偏离。
      const path = [{ x: 0, drop: 0 }, ...dots];
      if (trace.some((q, i) => {
        const x = tracedX(path, q.drop);
        return (i && (q.x < trace[i - 1].x - 0.002 || q.drop < trace[i - 1].drop - 0.002)) ||
          (x !== null && Math.abs(q.x - x) > 0.016) || q.drop > last(dots).drop + 0.007;
      })) {
        status('这条线折返或偏离了印迹，从 O 重新描。'); return;
      }
      // 按学生实际笔迹的弧长取样，再用样条柔化折角。读数和画线使用同一条曲线。
      const knots = [vec(trace[0].x, trace[0].drop, 0)];
      let travel = 0;
      for (let i = 1; i < trace.length; i++) {
        travel += Math.hypot(trace[i].x - trace[i - 1].x, trace[i].drop - trace[i - 1].drop);
        if (travel >= 0.006 || i === trace.length - 1) {
          knots.push(vec(trace[i].x, trace[i].drop, 0));
          travel = 0;
        }
      }
      const curve = new THREE.CatmullRomCurve3(knots);
      const smooth = curve.getPoints(knots.length * 5).map(v => ({ x: v.x, drop: v.y }));
      trace.splice(0, trace.length, ...smooth);
      traced = true; bar.done('curve');
      status('黑点连成了钢球的轨迹。竖直方向是自由落体，用 y = gt²/2 找出等间隔时刻的位置。');
      refresh();
    }
    function read() {
      if (form.hidden) return;
      const i = readings.length, d = levels[i];
      if (Math.abs(reader - d) > 0.0009) return status('横尺的高度还不对，先看左边的落差刻度。');
      const raw = field.value.trim(), val = Number(raw), x = tracedX(trace, reader);
      if (!/^\d+(\.\d)?$/.test(raw)) return status('用厘米填写水平位置，读到一位小数。');
      if (x === null) return status('尺边还没有与描线相交。');
      if (Math.abs(val - x * 100) > 0.11) return status('水平读数偏' + (val > x * 100 ? '大' : '小') + '，从横尺的 0 看向曲线交点，每小格是 0.1 cm。');
      const prev = i ? last(readings).x : 0, r = { x: val / 100, drop: reader };
      readings.push(r); field.value = '';
      const delta = cm(r.x - prev);
      rows.add([((i + 1) * TIME_STEP).toFixed(2), cm(d, 2), val.toFixed(1), delta]);
      work.textContent = 'Δx = ' + val.toFixed(1) + ' − ' + cm(prev) + ' = ' + delta + ' cm';
      status('这段用时 0.05 s，钢球向前移动了约 ' + delta + ' cm。');
      if (readings.length === 3) {
        const segments = readings.map((p, j) => p.x - (j ? readings[j - 1].x : 0));
        if (Math.max(...segments) - Math.min(...segments) > 0.005) {
          status('三段位移的差别较大。保留落点，从 O 重描后再量一次。');
          readings.length = trace.length = 0; traced = false; reader = 0; rows.clear(); work.textContent = '';
          trace.push({ x: 0, drop: 0 }); penAt(trace[0]); bar.undo('curve');
        } else {
          bar.done('equal');
          status('每隔 0.05 s，水平位移分别约为 ' + segments.map(x => cm(x)).join('、') + ' cm，在描线和读尺误差内相等。');
        }
      }
      refresh();
    }
    const handleDrag = {
      obj: tab, anchor: rig.handle, keepOffset: true, plane: 'xy', offset: 0.0065,
      enabled: () => origin && !shot && !traced && !returning && !(bar.has('print') && carbon === 0),
      hint: () => carbon >= 0.5 ? '向上拖：揭开复写纸' : '向下拖：铺好复写纸',
      onStart() { carbonHome = carbon; },
      onDrag(p) { carbon = clamp((PAPER_TOP - p.y) / PAPER_H, 0, 1); rig.setCarbon(carbon); },
      onEnd(moved) {
        if (!moved) return;
        if (carbon > 0.965 || carbon < 0.035) {
          carbon = carbon > 0.5 ? 1 : 0; rig.setCarbon(carbon);
          if (carbon === 1) bar.done('origin');
          status(carbon ? '白纸已被复写纸盖住，钢球碰到挡板时就能留下印迹。' : '复写纸已揭开，白纸上留下了 ' + marks.length + ' 个印迹。');
        } else { returning = { sheet: true, from: carbon, to: carbonHome, t: 0 }; status('夹条没有到纸边，复写纸回到原位。'); }
        refresh();
      },
    };
    const ballDrag = {
      obj: ball, keepOffset: true, plane: 'xy', offset: ballZ,
      enabled: () => !shot && !returning && !bar.has('print'),
      hint: () => origin ? '拖到槽上：松手放球' : '点球心：标出原点',
      onStart() { ballHome = ball.position.clone(); },
      onTap() { if (!origin) markOrigin(); },
      onDrag(p) {
        if (!origin) return;
        const x = clamp(p.x, EXIT_X - RAMP_LENGTH, PAPER_LEFT + PAPER_W - BALL_R);
        // 只在球靠近槽面时贴合，悬在斜槽上方松手会归位。
        const y = x <= EXIT_X && Math.abs(p.y - rampY(x)) < 0.012 ? rampY(x) : clamp(p.y, 0.015, EXIT_Y + 0.085);
        rig.placeBall(x, y);
      },
      onEnd(moved) {
        if (!moved || !origin) return;
        const { x, y } = ball.position;
        if (x >= EXIT_X || Math.abs(y - rampY(x)) > 0.001 || rampY(x) - EXIT_Y < 0.009) {
          returning = { from: ball.position.clone(), to: ballHome, t: 0 };
          status('钢球没有放在斜槽高处，会回到原位。'); return;
        }
        const start = release !== null && Math.abs(x - release) < 0.0025 ? release : x;
        launch(start);
      },
    };
    const knobDrag = {
      obj: knob, keepOffset: true, plane: 'xy', offset: 0.045,
      enabled: () => origin && !shot && !returning && !traced && !(bar.has('print') && parked()),
      hint: '上下拖：调挡板高度',
      onDrag(p) {
        // 挡板最下方留作收纳位，描线时能让出最深的实测点。
        drop = clamp(EXIT_Y - p.y, 0.008, bar.has('print') ? bottom : bottom - 0.02);
        rig.setDrop(drop);
        if (ball.position.x > EXIT_X) rig.placeBall(ball.position.x, EXIT_Y - drop);
      }, onEnd(moved) { if (moved) refresh(); },
    };
    const ruleDrag = {
      obj: ruleBar, keepOffset: true, plane: 'xy', offset: PAPER_Z + 0.0018,
      enabled: () => view && traced && !bar.finished, hint: '上下拖：对准落差',
      onDrag(p) { reader = clamp(EXIT_Y - p.y - ruleBar.geometry.parameters.height / 2, 0, bottom - 0.014); rig.setReader(reader, true); },
      onEnd(moved) {
        if (!moved) return;
        const target = levels[readings.length];
        if (Math.abs(reader - target) <= 0.0009) reader = target;
        refresh();
      },
    };
    const penDrag = {
      obj: grip, anchor: pencil, keepOffset: true, plane: 'xy', offset: PAPER_Z + 0.0005,
      enabled: canDraw, hint: '拖笔：沿印迹描线',
      onDrag: draw, onEnd(moved) { if (moved) checkLine(); },
    };
    const paperDrag = {
      obj: paper, plane: 'xy', offset: PAPER_Z,
      enabled: () => !shot && !returning && carbon === 0 && (!origin || (bar.has('print') && parked() && (!view || !traced))),
      hint: () => !origin ? '点球心：标出原点' : view ? '按住拖：沿印迹描线' : '点一下：正对纸面',
      onStart(p) {
        penDown = p; writing = false;
        if (!p || !canDraw()) return;
        const nearOrigin = Math.hypot(p.x - EXIT_X, p.y - EXIT_Y) <= 0.006;
        if (nearOrigin) { trace.length = 0; trace.push({ x: 0, drop: 0 }); penAt(trace[0]); }
        const end = last(trace);
        writing = !!end && Math.hypot(p.x - EXIT_X - end.x, EXIT_Y - p.y - end.drop) < 0.008;
      },
      onDrag(p) { if (writing) draw(p); },
      onEnd(moved) { if (writing && moved) checkLine(); else if (canDraw() && moved) status('从 O 或线尾落笔，才能把这些点连成同一条轨迹。'); writing = false; },
      onTap() {
        if (!origin) {
          if (penDown && Math.hypot(penDown.x - EXIT_X, penDown.y - EXIT_Y) < BALL_R) markOrigin();
          else status('这里没有钢球离槽时的球心，原点还没标上。');
        } else if (!view) near();
      },
    };
    const tip = ctx.tag('', 'pill');
    const manip = draggable(group, [handleDrag, knobDrag, ballDrag, ruleDrag, penDrag, paperDrag], { tip });
    const hideTip = () => tip.loc(group, 0, -9, 0);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    function reset() {
      if (view) ctx.back();
      view = origin = traced = writing = false; shot = release = returning = null;
      drop = 0.014; carbon = reader = 0; marks.length = readings.length = trace.length = 0;
      trace.push({ x: 0, drop: 0 });
      rig.releaseMark.visible = false; rig.press([]); rig.placeBall(EXIT_X, EXIT_Y);
      rig.setDrop(drop); rig.setCarbon(0); penAt(trace[0]);
      rows.clear(); work.textContent = field.value = ''; bar.near(false);
      bar.undo(...steps.map(s => s[0])); ui?.relock(); hideTip(); refresh();
      status('斜槽末端水平，挡板向背板一侧倾斜。');
    }
    reset();
    const location = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    const startX = EXIT_X - 0.12;
    const put = x => vec(x, rampY(x), ballZ);
    const tray = d => ({ name: '调挡板到 ' + cm(d), drag: knob, to: () => location(knob).setY(EXIT_Y - d) });
    const roll = (x = startX) => ({ name: x === startX ? '同处放球' : '换位置试放', drag: ball, to: put(x), wait: 4 });
    const sheet = cover => ({ name: cover ? '铺好复写纸' : '揭纸看印迹', drag: tab, to: () => rig.handle.position.clone().setY(PAPER_TOP - (cover ? PAPER_H : 0)) });
    const drawTo = (name, point) => ({ name, drag: grip, to: () => { const p = point(); return vec(EXIT_X + p.x, EXIT_Y - p.drop, pencil.position.z); } });
    const submit = wrong => ({ name: wrong ? '误读水平位置' : '记录水平位置', run() {
      field.value = wrong ? '20.0' : cm(tracedX(trace, reader)); form.querySelector('button').click();
    } });
    const qa = [
      { name: '点在球心以外', tap: paper }, { name: '标定球心原点', tap: ball }, sheet(true), roll(),
      tray(0.033), roll(startX + 0.025), roll(), tray(0.052), roll(), tray(0.082), roll(), tray(0.116), roll(),
      sheet(false), tray(bottom), { name: '正对印迹', tap: paper },
      drawTo('从原点水平起笔', () => ({ x: valid()[0].x / 2, drop: valid()[0].drop / 4 })),
      ...[0, 1, 2, 3, 4].map(i => drawTo('沿第 ' + (i + 1) + ' 个黑点描线', () => valid()[i])),
      ...levels.flatMap((d, i) => [{ name: '对准第 ' + (i + 1) + ' 个落差', drag: ruleBar, to: () => ruleBar.position.clone().setY(EXIT_Y - d - ruleBar.geometry.parameters.height / 2) },
        ...(i === 0 ? [submit(true)] : []), submit(false)]),
      { name: '掀开原文', run() {
        if (!bar.finished || readings.length !== 3) throw Error('三段水平位移没有记录齐');
        ui.go(2); ui.el.querySelector('.flap-front').click();
      } },
    ];
    return {
      group: root, size: { w: 0.43, h: 0.31, d: 0.115 }, view: { azim: 4, elev: 17, frameMargin: 1.03 },
      toggles: ['steps'], reset, debug: { bar, qa: qaFlow(manip, qa) },
      pointer: {
        items: () => manip.items().filter(d => d.enabled()),
        down(ray, event) { if (ui?.step === 2) return false; const held = manip.down(ray, event); if (held && ui?.step === 0) ui.go(1); return held; },
        move(ray, event) { return ui?.step === 1 && manip.move(ray, event); },
        up: manip.up,
      },
      predicting: hideTip,
      mount(panel) {
        ui = panel; bar.attach({ need() {}, unlock() { ui.unlock(); ui.need(''); } });
        work.style.cssText = 'font-size:15px;color:#385e61';
        ui.controls.append(form); ui.data.append(rows.el, work, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        ui.notes.append(note('落差从 O 向下量。按自由落体模型取 g = 9.8 m/s²，t = 0.05、0.10、0.15 s 时，落差之比为 1∶4∶9。'));
        const src = ui.el.querySelector('.answer .src');
        src.style.cssText = 'padding-right:80px;min-height:48px';
        status('斜槽末端水平，挡板向背板一侧倾斜。'); refresh();
      },
      update(dt) {
        const scale = bar.update(dt);
        if (shot) updateShot(dt * scale);
        if (returning) {
          const r = returning; r.t = Math.min(1, r.t + dt / 0.38);
          const f = 1 - (1 - r.t) ** 2;
          if (r.sheet) { carbon = r.from + (r.to - r.from) * f; rig.setCarbon(carbon); }
          else ball.position.lerpVectors(r.from, r.to, f);
          if (r.t === 1) { returning = null; refresh(); }
        }
      },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); manip.dispose(); bar.dispose(); },
    };
  },
};
