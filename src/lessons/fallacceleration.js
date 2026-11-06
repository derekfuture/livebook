// 必修一图 2.4-2：同一计时器、同一把尺，改变实际下落重物的质量。
import * as THREE from 'three';
import { fallingRig, X, BASE, LEAD, TRAVEL, L, WIDTH, ZERO, LANE, RULER_Z } from './kit/ticker/fallRig.js';
import { fallingTape } from './kit/ticker/fall.js';
import { fallQuartets, compareIntervals, STRIDE } from './kit/ticker/fallAcceleration.js';
import { PERIOD } from './kit/ticker/motion.js';
import { paint } from '../live/ink.js';
import { textPlate } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, note, table } from './kit/ui.js';

const DRAG = 0.015,
  T = STRIDE * PERIOD;
export default {
  id: 'fallacceleration',
  fig: '图2.4-2',
  title: '用纸带研究自由落体运动',
  stampText: '测量',
  predict: {
    q: '给下落重物再加 100 g，两次纸带测出的加速度会怎样变化？',
    options: ['约加倍', '仍接近同一个值', '约减半'],
    answer: 1,
    hint: '先量原重物的纸带，再改变质量重新打带。',
  },
  conclusion: {
    quote: '自由落体是初速度为零、只受重力作用的匀加速直线运动。',
    why: '相邻三段的时间相等。若后一段位移比前一段多出的量近似相等，就得到近似恒定的加速度 a = Δs/T²。更换重物后，测得的加速度仍接近 g。实际拖纸带存在阻力，不能把这种实验说成严格只受重力；读尺误差也会影响结果。',
    src: '人教版高中物理必修第一册第 48–49 页 · 图 2.4-2',
  },
  create(ctx) {
    const rig = fallingRig({ mass: 150 });
    const { group, head, jaw, weight, tape, tex, ink, ruler, pencil, vertical, flat } = rig;
    const ledge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 48), paint(0xaa8450));
    ledge.position.y = -0.037;
    weight.add(ledge);
    const ring = new THREE.Group();
    const ringMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0.0216, -0.007],
          [0.029, -0.007],
          [0.029, 0.007],
          [0.0216, 0.007],
          [0.0216, -0.007],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        48,
      ),
      paint(0x9c865d),
    );
    ring.add(ringMesh);
    const ringLabel = textPlate('+100 g', { w: 0.04, h: 0.014, font: 'bold 150px sans-serif', bg: '#e8c58d' });
    ringLabel.position.set(0, 0, 0.0292);
    ring.add(ringLabel);
    group.add(ring);
    const rack = new THREE.Vector3(-0.12, 0.217, -0.002);
    let added = false,
      on = false,
      phase = 'ready',
      near = false,
      run,
      powerAt = 0,
      released = 0;
    let from,
      transfer = 0,
      start = null,
      readings = [],
      restStamp = false,
      recorded = false;
    let ui,
      raw,
      results,
      liveRead = null;
    const records = new Map();
    const mass = () => (added ? 0.25 : 0.15);
    const now = () => performance.now() / 1000;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'drop', title: '打出下落纸带', todo: '先通电，再松开纸带夹。', target },
        { id: 'read', title: '量三段等时位移', todo: '同一把尺，依次读出四个计数点的位置。', target },
        { id: 'mass', title: '改变质量重测', todo: '把 100 g 配重套到重物上，再打一条纸带。', target },
        { id: 'compare', title: '比较两次加速度', todo: '比较不同质量下的纸带结果。', target },
      ],
    });
    function target() {
      if (near) return null;
      if (phase === 'ready')
        return records.size === 1 && records.has(mass()) ? (on ? head.group : ring) : on ? jaw : head.group;
      if (phase === 'landed') return on ? head.group : tape;
      if (phase === 'bench') return recorded || !fallQuartets(run.marks).length ? weight : tape;
      return null;
    }
    const px = (x) => ((LEAD + x) / L) * tex.canvas.width;
    function draw() {
      const w = tex.canvas.width,
        h = tex.canvas.height;
      ink.fillStyle = '#fff0d2';
      ink.fillRect(0, 0, w, h);
      if (restStamp) {
        ink.fillStyle = '#393b39';
        ink.beginPath();
        ink.arc(px(0), h * 0.51, 6.5, 0, Math.PI * 2);
        ink.fill();
      }
      for (const m of run.marks) {
        ink.fillStyle = '#393b39';
        ink.beginPath();
        ink.arc(px(m.x), h * 0.51, 6.5, 0, Math.PI * 2);
        ink.fill();
      }
      if (start !== null)
        for (let k = 0; k < 4; k++) {
          const x = px(run.marks[start + k * STRIDE].x);
          ink.fillStyle = k === readings.length ? '#a15338' : '#27636c';
          ink.fillRect(x - 1, 94, 3, 24);
          ink.fillRect(x - 1, 145, 3, 39);
          ink.font = 'bold 64px sans-serif';
          ink.textAlign = 'center';
          ink.fillText('P' + k, x, 74);
          if (k < readings.length) {
            ink.fillStyle = '#756b59';
            ink.fillRect(x - 1, 184, 3, 22);
          }
        }
      tex.needsUpdate = true;
    }
    function ringPosition() {
      ring.position.copy(added ? new THREE.Vector3(X, weight.position.y - 0.028, 0) : rack);
    }
    function setup() {
      run = fallingTape(mass(), DRAG, TRAVEL);
      phase = 'ready';
      on = false;
      near = false;
      start = null;
      readings = [];
      recorded = false;
      weight.position.set(X, BASE, 0);
      ringPosition();
      tape.position.set(X, BASE + L / 2, 0);
      tape.quaternion.copy(vertical);
      restStamp = false;
      jaw.rotation.y = 0;
      pencil.visible = false;
      draw();
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function guide() {
      const m = mass() * 1000;
      if (phase === 'ready')
        bar.say(
          records.size === 1 && records.has(mass())
            ? on
              ? '先关计时器，再拖放配重改变质量。'
              : added
                ? '把 100 g 配重拖回桌面，保留原来的 150 g 重物。'
                : '把桌上 100 g 配重拖到重物上，总质量变为 250 g。'
            : m + ' g 重物。' + (on ? '已通电，点上端夹子松开纸带。' : '点计时器通电，再松开上端纸带夹。'),
        );
      else if (phase === 'fall')
        bar.say(on ? '看同一重物下落时，纸带上的点距怎样变化。' : '重物在下落，但计时器未通电，纸带不会留下点。');
      else if (phase === 'landed')
        bar.say(on ? '先关计时器，再解开纸带夹取带。' : '点纸带，把刚才这条记录放到原尺旁。');
      else if (phase === 'bench') {
        if (!fallQuartets(run.marks).length) bar.say('连续点不足以量三段。向上拖回重物，换新带，先通电再松手。');
        else if (recorded) {
          const r = records.get(mass());
          if (records.size === 2) {
            const a = records.get(0.15),
              b = records.get(0.25);
            bar.say(
              '150 g：' +
                a.mean.toFixed(2) +
                '；250 g：' +
                b.mean.toFixed(2) +
                ' m/s²。' +
                (Math.abs(a.mean - b.mean) < 1
                  ? '加速度接近，质量增加没有让加速度成倍增加。'
                  : '两次读数差异较大，可沿原尺重读；注意毫米读数对位移差的影响。'),
            );
          } else
            bar.say(
              m +
                ' g：两段位移差得 a ≈ ' +
                r.estimates.map((a) => a.toFixed(2)).join('、') +
                ' m/s²。' +
                (near ? '回到全景，' : '') +
                (added ? '向上拖回重物，取下 100 g 配重重测。' : '向上拖回重物，再加 100 g 重测。'),
            );
        } else if (!near) bar.say('点原纸带近看。用同一把尺读 P0 至 P3，比较三个相等时间内的位移。');
        else
          bar.say(
            '同一纸带 · 已读 ' +
              readings.length +
              '/4 点。读 P' +
              readings.length +
              ' 正下方的毫米刻度；每段隔 3 个打点间隔，用时 0.06 s。',
          );
      }
    }
    function switchPower() {
      enter();
      if (!['ready', 'fall', 'landed'].includes(phase) || (phase === 'landed' && !on)) return;
      const t = now();
      on = !on;
      if (on) {
        powerAt = t;
        if (phase === 'ready') {
          restStamp = true;
          draw();
        }
      }
      if (phase === 'fall') run.power(on, t - released);
      guide();
    }
    function release() {
      if (phase !== 'ready') return;
      enter();
      released = now();
      if (on) run.power(true, powerAt - released);
      phase = 'fall';
      jaw.rotation.y = -0.65;
      guide();
    }
    function take() {
      if (phase === 'landed') {
        if (on) {
          bar.say('先关计时器，再解开纸带夹。');
          return;
        }
        phase = 'lay';
        from = tape.position.clone();
        transfer = 0;
        bar.say('把刚才打出的纸带取下，放到原尺旁。');
      } else if (phase === 'bench') inspect();
    }
    function inspect() {
      if (!fallQuartets(run.marks).length) {
        guide();
        return;
      }
      near = true;
      bar.near(true);
      const last = run.marks.at(-1).x;
      ctx.look(
        [ZERO + last / 2, 0.004, (LANE + RULER_Z) / 2],
        [0, 1, 0.08],
        Math.max(0.23, (last + 0.03) * 1.48),
        leave,
      );
      guide();
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function read(x) {
      if (start === null || recorded) return;
      const value = Math.round((x - ZERO) * 10000) / 10,
        expected = run.marks[start + readings.length * STRIDE].x * 1000;
      if (Math.abs(value - expected) > 0.9) {
        bar.say('对准 P' + readings.length + ' 下方的原尺刻度；可沿尺拖动微调，松手记下。');
        return;
      }
      readings.push(value);
      raw.el.hidden = false;
      raw.add([
        String(mass() * 1000),
        'P' + (readings.length - 1),
        ((readings.length - 1) * T).toFixed(2),
        value.toFixed(1),
      ]);
      if (readings.length === 4) {
        const result = compareIntervals(readings);
        result.positions = [...readings];
        result.mean = (result.estimates[0] + result.estimates[1]) / 2;
        records.set(mass(), result);
        recorded = true;
        results.clear();
        results.el.hidden = false;
        for (const [m, r] of records)
          results.add([String(m * 1000), ...r.steps.map((s) => s.toFixed(1)), ...r.estimates.map((a) => a.toFixed(2))]);
        bar.done('read');
        if (records.size === 2) {
          bar.done('mass');
          bar.done('compare');
        }
      }
      draw();
      guide();
    }
    function prepare() {
      setup();
      ctx.back();
      bar.near(false);
      guide();
    }
    function reset() {
      records.clear();
      raw.clear();
      results.clear();
      raw.el.hidden = results.el.hidden = true;
      added = false;
      bar.undo('drop', 'read', 'mass', 'compare');
      prepare();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: ruler,
          plane: 'xz',
          offset: 0.0035,
          enabled: () => near && !recorded && start !== null,
          hint: '读 P0 至 P3 的尺上位置',
          onStart(p) {
            if (p) preview(p.x);
          },
          onDrag(p) {
            preview(p.x);
          },
          onEnd() {
            if (liveRead !== null) read(liveRead);
            liveRead = null;
            pencil.visible = false;
          },
        },
        {
          obj: weight,
          plane: 'xy',
          offset: 0,
          keepOffset: true,
          enabled: () => !near && ['ready', 'landed', 'bench'].includes(phase),
          hint: () => (phase === 'bench' ? '向上拖回重物，换新纸带' : '释放重物或解开纸带'),
          onDrag(p) {
            if (phase === 'bench') {
              weight.position.y = clamp(p.y, BASE - TRAVEL, BASE);
              ringPosition();
            }
          },
          onEnd(moved) {
            if (!moved || phase !== 'bench') return;
            if (weight.position.y >= BASE - 0.03) prepare();
            else {
              weight.position.y = BASE - TRAVEL;
              ringPosition();
              guide();
            }
          },
          onTap() {
            if (phase === 'ready') release();
            else if (phase === 'landed') take();
            else guide();
          },
        },
        {
          obj: ring,
          plane: 'xy',
          offset: 0,
          keepOffset: true,
          enabled: () => !near && phase === 'ready' && !on,
          hint: () => (added ? '把 100 g 配重拖回桌面' : '把 100 g 配重套到重物上'),
          onDrag(p) {
            ring.position.set(p.x, p.y, 0);
          },
          onEnd(moved) {
            if (moved) {
              const dest = added ? rack : new THREE.Vector3(X, BASE - 0.028, 0);
              if (Math.hypot(ring.position.x - dest.x, ring.position.y - dest.y) < 0.065) {
                added = !added;
                run = fallingTape(mass(), DRAG, TRAVEL);
                restStamp = false;
                draw();
              }
            }
            ringPosition();
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: head.group,
            enabled: () => !near && (['ready', 'fall'].includes(phase) || (phase === 'landed' && on)),
            hint: '计时器电源',
            onTap: switchPower,
          },
          { obj: jaw, enabled: () => phase === 'ready', hint: '松开上端纸带夹', onTap: release },
          { obj: tape, enabled: () => ['bench', 'landed'].includes(phase), hint: '取下原纸带或近看', onTap: take },
        ],
      },
    );
    function preview(x) {
      liveRead = x;
      pencil.visible = true;
      pencil.position.x = x;
      bar.say('P' + readings.length + '：尺上 ' + ((x - ZERO) * 1000).toFixed(1) + ' mm。沿尺微调，松手记下。');
    }
    setup();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.65, d: 0.4, h: 0.71 },
      view: { elev: 14, azim: -9, lookY: 0.45, margin: 1.04 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        raw = table(['质量 / g', '点', '相对 P0 的时间 / s', '尺读数 / mm']);
        results = table(['质量 / g', 's1 / mm', 's2 / mm', 's3 / mm', 'a12 / (m/s²)', 'a23 / (m/s²)']);
        raw.el.hidden = results.el.hidden = true;
        ui.data.append(
          raw.el,
          results.el,
          note(
            '每段 T = 0.06 s。s1 = P1 − P0，以此类推。用 (s2 − s1)/T² 和 (s3 − s2)/T² 分别求加速度，毫米先换成米。P0 是纸带上的计时参考点，不必恰好是松手时刻。',
          ),
        );
        ui.notes.append(
          note(
            '模型取 g = 9.8 m/s²，小的恒定纸带阻力为 0.015 N；重物从静止释放。上端夹子代替手持纸带；附加配重用于改变质量，均为本活页的操作辅助。读数和加速度来自每次实际打出的纸带。',
          ),
          buttons([
            {
              text: '沿原尺重新读这条纸带',
              onClick() {
                if (phase !== 'bench' || start === null) return;
                readings = [];
                recorded = false;
                records.delete(mass());
                raw.clear();
                for (const [m, r] of records)
                  r.positions.forEach((v, k) => raw.add([String(m * 1000), 'P' + k, (k * T).toFixed(2), v.toFixed(1)]));
                results.clear();
                for (const [m, r] of records)
                  results.add([
                    String(m * 1000),
                    ...r.steps.map((s) => s.toFixed(1)),
                    ...r.estimates.map((a) => a.toFixed(2)),
                  ]);
                bar.undo('compare');
                draw();
                ui.fold(true);
                inspect();
              },
            },
            { text: '全部重做', onClick: reset },
          ]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        head.update(on, on ? now() - powerAt : 0);
        if (phase === 'fall') {
          const t = now() - released,
            n = run.marks.length;
          run.advance(t);
          const x = run.position(t);
          weight.position.y = BASE - x;
          ringPosition();
          tape.position.y = BASE + L / 2 - x;
          if (n !== run.marks.length) draw();
          if (t >= run.end) {
            phase = 'landed';
            guide();
          }
        } else if (phase === 'lay') {
          transfer += dt;
          const u = clamp(transfer / 0.7, 0, 1),
            s = u * u * (3 - 2 * u);
          tape.position.copy(from).lerp(new THREE.Vector3(ZERO - LEAD + L / 2, 0.004, LANE), s);
          tape.position.z += 0.055 * Math.sin(Math.PI * u);
          tape.position.y += 0.055 * Math.sin(Math.PI * u);
          tape.quaternion.copy(vertical).slerp(flat, s);
          if (u === 1) {
            phase = 'bench';
            const starts = fallQuartets(run.marks);
            start = starts.length ? starts.at(-1) : null;
            if (start !== null) bar.done('drop');
            draw();
            guide();
          }
        }
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        tex.dispose();
      },
    };
  },
};
