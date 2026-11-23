import { ACGenerator } from './kit/acGenerator.js';
import { acGeneratorRig, AXLE_Y, CRANK_Z } from './kit/acGeneratorRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';
export default {
  id: 'acgenerator',
  fig: '图3.1-2',
  title: '观察交变电流的方向',
  stampText: '观察',
  predict: {
    q: '把两只 LED 反向并联接到手摇发电机上，持续转动手柄会怎样？',
    options: ['两灯交替发光', '始终只有同一盏亮', '两灯始终同时亮'],
    answer: 0,
  },
  conclusion: {
    page: 54, rect: [216.5, 555.08, 537.5, 702.19],
    quote: '教学用发电机产生的电流，大小和方向都在不断地变化，是一种交变电流。',
    why: '线圈转动时，穿过它的磁通量变化，产生感应电动势。两个 LED 的导通方向相反，交替发光说明电流方向交替变化；转动过慢可能达不到导通电压。线圈停止转动时，不再因转动产生感应电动势。',
    src: '课本第 50 页 · 第三章 第1节 交变电流',
  },
  create(ctx) {
    const model = new ACGenerator(),
      rig = acGeneratorRig(model),
      { group } = rig;
    const plugged = [null, null];
    let ui,
      near = false,
      bearing = 0,
      handTarget = 0,
      streak = 0,
      turnOrigin = 0,
      seen = new Set(),
      quiet = 0,
      reminder = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'connect',
          title: '接到发电机',
          todo: '把灯板的两个插头分别拖进发电机 A、B 插孔。',
          target: () => rig.plugs[plugged[0] === null ? 0 : 1],
        },
        { id: 'turn', title: '连续手摇', todo: '沿轮缘拖动棕色手柄，连转一圈，看两灯交替亮。', target: () => rig.knob },
        { id: 'stop', title: '停转对照', todo: '松开手柄，观察线圈停下来时两灯怎样变化。' },
      ],
    });
    const connected = () => plugged.every((x) => x !== null);
    function guide() {
      if (bar.finished) return bar.say('两灯交替亮，停转后熄灭。可反转或交换两根线再观察。');
      if (!connected()) return bar.say('把两个插头分别拖进发电机 A、B 插孔。');
      if (bar.current === 'stop') return bar.say('松开手柄，等线圈停下，看两灯熄灭。');
      return bar.say('沿轮缘拖棕色手柄，连续转一圈；两灯不亮时摇快一些。');
    }
    function circuit() {
      model.connect(connected(), plugged[0] === 0 ? 1 : -1);
      streak = 0;
      turnOrigin = model.theta;
      seen.clear();
      quiet = 0;
      if (connected()) bar.done('connect');
      guide();
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
      ctx.look([0, 0.115, -0.045], [0.7, 0.35, -1], ctx.camera.aspect < 1 ? 0.56 : 0.7, leave);
      bar.say('原线圈两端接两个完整滑环，固定电刷分别接触它们。返回全景继续手摇。');
    }
    const pointer = draggable(
      group,
      [
        ...rig.plugs.map((obj, i) => ({
          obj,
          anchor: obj,
          plane: 'xz',
          offset: 0.025,
          keepOffset: true,
          hint: '拖插头接线或拔开',
          onStart() {
            plugged[i] = null;
            circuit();
          },
          onDrag(p) {
            obj.position.set(clamp(p.x, -0.14, 0.31), 0.025, clamp(p.z, 0.1, 0.25));
            rig.layoutLeads();
          },
          onEnd() {
            const match = rig.sockets.findIndex(
              (socket, j) =>
                plugged[1 - i] !== j &&
                Math.hypot(obj.position.x - socket.position.x, obj.position.z - socket.position.z) < 0.022,
            );
            if (match >= 0) {
              plugged[i] = match;
              obj.position.copy(rig.sockets[match].position);
              obj.position.y = 0.034;
            }
            const occupied =
              match < 0 &&
              rig.sockets.some(
                (socket, j) =>
                  plugged[1 - i] === j &&
                  Math.hypot(obj.position.x - socket.position.x, obj.position.z - socket.position.z) < 0.025,
              );
            if (occupied) obj.position.fromArray(rig.parked[i]);
            rig.layoutLeads();
            circuit();
            if (occupied) bar.say('这个插孔已有插头。把退回的插头接到另一个孔。');
          },
        })),
        {
          obj: rig.knob,
          plane: 'xy',
          offset: CRANK_Z,
          hint: '沿轮缘连续转动手柄',
          onStart(p) {
            bearing = p ? Math.atan2(p.y - AXLE_Y, p.x) : 0;
            handTarget = model.theta;
            model.setHand(handTarget);
            reminder = 0;
          },
          onDrag(p) {
            const a = Math.atan2(p.y - AXLE_Y, p.x),
              delta = Math.atan2(Math.sin(a - bearing), Math.cos(a - bearing));
            bearing = a;
            handTarget += delta;
            model.setHand(handTarget);
          },
          onEnd() {
            model.release();
            guide();
          },
        },
      ],
      { highlight: true },
    );
    function reset() {
      if (near) leave();
      model.reset();
      plugged.fill(null);
      rig.plugs.forEach((p, i) => p.position.fromArray(rig.parked[i]));
      rig.layoutLeads();
      rig.animate();
      streak = turnOrigin = quiet = reminder = 0;
      seen.clear();
      bar.undo('connect', 'turn', 'stop');
      guide();
    }
    return {
      group,
      size: { w: 0.46, d: 0.36, h: 0.23 },
      view: { elev: 30, azim: 22, margin: 1.05 },
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
            '灯板已把红、黄 LED 反向并联，并串联保护电阻。你把它的两根线接到发电机不同插孔即可；交换 A、B 不会损坏模型，只改变同一转动位置下先亮的那盏灯。握棕色手柄沿轮缘绕转，不是点击自动播放。转得太慢时，两灯可能都不亮。',
          ),
          buttons([
            { text: '近看线圈和滑环', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '示意参数：400 匝、0.35 T、线圈面积 0.0064 m²，绕组电阻 60 Ω，保护电阻 180 Ω。绘制的少量线圈表示多匝绕组，不能按画面数匝；两端通过轴内绝缘引线分别连接滑环。LED 用导通门槛近似，亮度仅表示电流变化；忽略手摇低频下的电感暂态，不模拟快速拔线火花。转子保留惯性、摩擦和电磁负载。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        let left = dt;
        while (left > 0) {
          const h = Math.min(0.004, left);
          left -= h;
          model.advance(h);
          const e = model.observe(),
            dir = Math.abs(model.omega) > 0.3 ? Math.sign(model.omega) : 0;
          if (connected() && !bar.has('turn') && dir) {
            streak = Math.abs(model.theta - turnOrigin);
            if (e.redCurrent > 0.001) seen.add('red');
            if (e.yellowCurrent > 0.001) seen.add('yellow');
            if (streak >= 2 * Math.PI && seen.size === 2) {
              bar.done('turn');
              guide();
            }
          }
          if (bar.has('turn') && !bar.has('stop') && connected()) {
            quiet = Math.abs(model.omega) < 0.05 && Math.abs(e.current) < 1e-5 ? quiet + h : 0;
            if (quiet > 0.3) {
              bar.done('stop');
              guide();
            }
          }
        }
        rig.animate();
        if (model.held && !bar.has('turn')) {
          reminder += dt;
          if (reminder > 2) {
            reminder = 0;
            guide();
          }
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
