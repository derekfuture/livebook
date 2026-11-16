import { newtonTubeRig, CX, CY } from './kit/newtonTubeRig.js';
import { AIR_PRESSURE, TUBE_DROP, DRAG, tubePressure, dropDistance, landingTime } from './kit/newtonTube.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';

const PORTS = ['pump', 'closed', 'vent'];
export default {
  id: 'newtontube',
  fig: '图2.4-1',
  title: '牛顿管中羽毛与铁片的下落',
  stampText: '比较',
  predict: {
    q: '抽去大部分空气，让铁片和羽毛同时从同一高度静止下落，会看到什么？',
    options: ['铁片仍明显领先', '两者几乎同时落底', '羽毛明显领先'],
    answer: 1,
  },
  conclusion: {
    quote: '只受重力时，从同一高度同时静止释放的物体同时落地。',
    why: '空气中，阻力对羽毛加速度的影响更明显。抽气后同一对物体的落地时差缩小，再放入空气，时差重新增大。有限压强下仍有残余气体，理想真空是这一对照的极限。',
    src: '人教版必修第一册第 48 页，图 2.4-1 甲、乙',
  },
  create(ctx) {
    const rig = newtonTubeRig(),
      { group } = rig;
    let pressure,
      port,
      pump,
      end,
      angle,
      lastAngle,
      near,
      running,
      elapsed,
      launchPressure,
      landing,
      ironTime,
      featherTime,
      aim,
      ui,
      rows,
      base,
      turning;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'air', title: '有空气', todo: '释放管上端的铁片和羽毛，比较落底时刻。', target: () => aim },
        { id: 'vac', title: '抽气再落', todo: '抽去空气，翻转同一根管，再释放两物体。', target: () => aim },
        { id: 'again', title: '放回空气', todo: '放空气进管内，恢复第一次的条件再测。', target: () => aim },
      ],
    });
    const upright = () => Math.abs(Math.sin(angle)) < 0.002 && end * Math.cos(angle) > 0.99;
    const gate = () => rig.gates[end > 0 ? 1 : 0];
    function say(s, target) {
      aim = near ? null : target;
      bar.say(s);
    }
    function guide() {
      if (near) return say('看绝对压强和两路计时。铁片、羽毛从同一托架释放，各自到达下端时停表。');
      if (running) return say('看铁片到达下端时，羽毛在哪儿。');
      if (bar.finished) return say('空气中铁片先到，抽气后落底时差缩小；放回空气，时差又增大。');
      if (bar.current === 'vac' && pressure >= 1.5) {
        if (port !== 'pump') return say('将黄阀柄向左拖到“抽气”，让玻璃管与泵相通。', rig.valve);
        if (!pump) return say('按泵上的红开关抽气，观察压强下降。', rig.switchKey);
        return say('等管内压强降到 1.5 kPa 以下，再把阀柄移回中位封管。', rig.screen);
      }
      if ((bar.current === 'again' || bar.current === 'air') && pressure <= 99) {
        return say(
          port === 'vent'
            ? '空气正进入玻璃管。等压强回到约 101 kPa。'
            : '把阀柄向右拖到“进气”，让同一根管重新充入空气。',
          rig.valve,
        );
      }
      if (port !== 'closed') return say('把阀柄移到中位“关”，封存管内的气体。', rig.valve);
      if (!upright()) return say('沿圆弧拖玻璃管，翻过半圈，让装着两物体的一端竖直到上方。', rig.glass);
      return say('点上端的铜色托架扳手，让铁片、羽毛从静止同时下落。', gate().gate);
    }
    function leave() {
      ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function inspect() {
      near = true;
      bar.near(true);
      ctx.look(rig.screen.position.toArray(), [0, 0.08, 1], ctx.camera.aspect < 1 ? 0.23 : 0.18, leave);
      guide();
    }
    function armGates() {
      for (const g of rig.gates) g.fork.position.x = g.s === end && !running ? 0 : 0.049;
    }
    function reset() {
      if (near) leave();
      pressure = AIR_PRESSURE;
      port = 'closed';
      pump = false;
      rig.switchKey.position.y = 0.062;
      end = 1;
      angle = elapsed = 0;
      running = turning = false;
      ironTime = featherTime = null;
      rig.tube.rotation.z = rig.valve.rotation.y = 0;
      rig.pieces(end, 0, 0);
      armGates();
      rig.display(pressure, null, null);
      rows?.clear();
      bar.undo('air', 'vac', 'again');
      guide();
    }
    function release(s) {
      if (running) return;
      if (port !== 'closed') return say('先把管阀移回中位，封存这次测量的气体。', rig.valve);
      if (s !== end || !upright()) return say('两物体必须在上端。先把管翻到竖直，再开上端托架。', rig.glass);
      running = true;
      launchPressure = pressure;
      elapsed = 0;
      ironTime = featherTime = null;
      landing = [landingTime(pressure, DRAG.iron), landingTime(pressure, DRAG.feather)];
      armGates();
      guide();
    }
    function finish() {
      running = false;
      end *= -1;
      rig.pieces(end, 0, 0);
      armGates();
      const left = TUBE_DROP - dropDistance(ironTime, launchPressure, DRAG.feather);
      rows.add([
        launchPressure.toFixed(1),
        ironTime.toFixed(3),
        featherTime.toFixed(3),
        (Math.max(0, left) * 100).toFixed(1),
      ]);
      if (bar.current === 'air' && launchPressure > 99) bar.done('air');
      else if (bar.current === 'vac' && launchPressure < 1.5) bar.done('vac');
      else if (bar.current === 'again' && launchPressure > 99) bar.done('again');
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.glass,
          plane: 'xy',
          offset: 0,
          enabled: () => !running && !near,
          hint: '沿圆弧翻转玻璃管',
          onStart(p) {
            turning = true;
            lastAngle = p ? Math.atan2(p.y - CY, p.x - CX) : null;
          },
          onDrag(p) {
            if (Math.hypot(p.x - CX, p.y - CY) < 0.04) return;
            const a = Math.atan2(p.y - CY, p.x - CX);
            if (lastAngle !== null) {
              angle += Math.atan2(Math.sin(a - lastAngle), Math.cos(a - lastAngle));
              rig.tube.rotation.z = angle;
            }
            lastAngle = a;
          },
          onEnd() {
            turning = false;
            const vertical = Math.round(angle / Math.PI) * Math.PI;
            if (Math.abs(vertical - angle) < 0.22) angle = vertical;
            rig.tube.rotation.z = angle;
            guide();
          },
        },
        {
          obj: rig.valve,
          plane: 'xz',
          offset: 0.043,
          enabled: () => !running && !near,
          hint: '左右拖阀柄，选择抽气、关闭或进气',
          onStart() {
            base = PORTS.indexOf(port);
          },
          onDrag(p, start) {
            if (!start) return;
            const index = clamp(Math.round(base + (p.x - start.x) / 0.024), 0, 2);
            port = PORTS[index];
            rig.valve.rotation.y = (index - 1) * 0.75;
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          ...rig.gates.map((g) => ({
            obj: g.gate,
            enabled: () => !running && !near,
            hint: '打开该端的释放托架',
            onTap() {
              release(g.s);
            },
          })),
          {
            obj: rig.switchKey,
            enabled: () => !near,
            hint: '开启或关闭抽气泵',
            onTap() {
              pump = !pump;
              rig.switchKey.position.y = pump ? 0.06 : 0.062;
              guide();
            },
          },
          { obj: rig.screen, hint: '近看压强和两次落底的计时', onTap: inspect },
        ],
      },
    );
    reset();
    return {
      group,
      size: { w: 0.44, h: 0.464, d: 0.204 },
      view: { azim: 9, elev: 14, margin: 1.05, lookY: 0.5 },
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
        rows = table(['绝对压强 / kPa', '铁片 / s', '羽毛 / s', '铁片到底时羽毛距底 / cm']);
        panel.data.append(rows.el);
        panel.notes.append(
          note(
            '两端的释放托架使每轮从相同的 34 cm 落差、同时由静止释放。近看仪表可读管内绝对压强及两路计时。演示模型固定羽毛姿态，阻力随气体密度和速度平方变化；低压测量近似真空。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const before = pressure;
        pressure = tubePressure(pressure, dt, port, pump);
        if (!turning && ((before >= 1.5 && pressure < 1.5) || (before <= 99 && pressure > 99))) guide();
        if (running) {
          elapsed += dt;
          const d = landing.map((t, i) =>
            elapsed >= t ? TUBE_DROP : dropDistance(elapsed, launchPressure, i ? DRAG.feather : DRAG.iron),
          );
          rig.pieces(end, ...d);
          if (elapsed >= landing[0]) ironTime = landing[0];
          if (elapsed >= landing[1]) {
            featherTime = landing[1];
            finish();
          }
        }
        rig.display(pressure, ironTime, featherTime);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
