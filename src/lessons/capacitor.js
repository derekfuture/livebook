// 必修三图 10.4-1。开关、两块仪表、笔记本始终观察同一只电容器。
import { capacitorRig } from './kit/capacitorRig.js';
import { observeCapacitor } from './kit/capacitor.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, note, table } from './kit/ui.js';

export default {
  id: 'capacitor',
  fig: '图10.4-1',
  title: '观察电容器的充、放电现象',
  stampText: '观察',
  predict: {
    q: '先给电容器充电，再把开关从 1 拨到 2。电流表指针会怎样偏转？',
    options: ['先向一侧偏，放电时向另一侧偏', '两次都向同一侧偏', '放电时始终指零'],
    answer: 0,
    hint: '比较电流在同一只电流表中的方向。',
  },
  conclusion: {
    quote: '充电和放电时，电流通过电流表的方向相反。',
    why: '充电时两极板分别积累等量异种电荷，电压升高，电流逐渐减小。开关断开后电荷暂时保留。接通放电回路时电容器通过电阻放电，电压降低，电流逐渐趋近零。',
    src: '人教版高中物理必修第三册第 38–39 页',
  },
  create(ctx) {
    const rig = capacitorRig(),
      { group } = rig;
    let contact = 0,
      angle = 0,
      voltage = 0,
      current = 0,
      startV = 0,
      startI = 0,
      elapsed = 0,
      held = null,
      near = false,
      aim,
      ui,
      records;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'charge', title: '观察充电', todo: '把黑柄拖向 1，看两块表。', target: () => aim },
        { id: 'hold', title: '断开观察', todo: '把刀片拖回中间，比较断开后两次电压读数。', target: () => aim },
        { id: 'discharge', title: '观察放电', todo: '把刀片拖向 2，比较电流方向和电压变化。', target: () => aim },
      ],
    });
    const say = (s, obj) => {
      aim = near ? null : obj;
      bar.say(s);
    };
    function guide() {
      if (bar.finished) return say('已记录充电、断开和放电。可再拨动开关，观察中途换接时两表示数怎样变。');
      if (near === rig.screen)
        return say(
          contact === 1
            ? '观察电压上升的快慢。回全景可再看电流表。'
            : contact === 2
              ? '观察电压下降的快慢。回全景可再看电流表。'
              : '保持开关断开，比较电压表示数。',
        );
      if (near === rig.dial) return say('点刚接通时针尖偏过的那一侧刻度，即使指针已回到零附近也可以回答。');
      if (!bar.has('charge')) {
        if (contact !== 1) return say('拖黑柄到左触点 1，观察电流表最初偏向哪一边，电压怎样变。', rig.handle);
        if (startI < 0.0002) return say('电容器已接近充满。先拨到 2 放掉一部分电，再拨回 1 观察。', rig.handle);
        return say('点电流表近看，在表盘上指出刚才偏转的一侧。', rig.dial);
      }
      if (!bar.has('hold')) {
        if (contact !== 0) return say('把黑柄拖离触点，停在中间。看电流是否回零，电压是否也回零。', rig.handle);
        if (voltage < 0.15) return say('当前电压太低。拨到 1 充一会儿，再停在中间观察。', rig.handle);
        return say(
          held === null ? '点数字电压表记下断开后的读数。' : '等一秒，再点同一块电压表比较两次读数。',
          rig.screen,
        );
      }
      if (contact !== 2) return say('把黑柄拖到右触点 2，使电容器通过电阻放电。', rig.handle);
      if (Math.abs(startI) < 0.0002) return say('电容器所剩电压太低。先拨到 1 充电，再拨到 2。', rig.handle);
      say('点电流表，指出刚拨到 2 时指针偏过的那一侧。', rig.dial);
    }
    function enter() {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    function leave() {
      if (near) ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function setAngle(q) {
      angle = clamp(q, -rig.throwAngle, rig.throwAngle);
      rig.setAngle(angle);
      const next = Math.abs(angle) >= rig.throwAngle - 0.035 ? (angle < 0 ? 1 : 2) : 0;
      if (next === contact) return;
      contact = next;
      elapsed = 0;
      held = null;
      startV = voltage;
      startI = current = observeCapacitor(voltage, contact, 0).current;
      rig.draw(voltage, current);
      guide();
    }
    function inspect() {
      enter();
      if (
        !(
          (!bar.has('charge') && contact === 1 && startI >= 0.0002) ||
          (bar.has('hold') && contact === 2 && startI <= -0.0002)
        )
      ) {
        guide();
        return;
      }
      focus(rig.dial);
      guide();
    }
    function focus(obj) {
      near = obj;
      bar.near(true);
      const p = group.worldToLocal(obj.getWorldPosition(group.position.clone()));
      ctx.look(p.toArray(), [0, 1, 0.08], obj === rig.dial ? 0.12 : 0.1, leave);
    }
    function readDirection(ray) {
      if (bar.finished) return;
      const hit = ray.intersectObject(rig.dial, false)[0];
      if (!hit) return;
      const mark = rig.readDial(rig.dial.parent.worldToLocal(hit.point.clone()));
      if (mark === null || mark === 0) return say('沿表盘刻度弧，点零线左边或右边。');
      if (Math.sign(mark) !== Math.sign(startI))
        return say('再观察一次：回全景，拨到另一端，再拨回来，看指针从零线向哪边走。');
      if (Math.abs(voltage - startV) < 0.12) return say('继续观察，电压还在变化。稍后再点刚才偏转的一侧。');
      const charging = contact === 1;
      records.el.hidden = false;
      records.add([
        charging ? '接 1 充电' : '接 2 放电',
        mark > 0 ? '向右' : '向左',
        startV.toFixed(2),
        voltage.toFixed(2),
      ]);
      bar.done(charging ? 'charge' : 'discharge');
      leave();
    }
    function readOpen() {
      enter();
      if (contact !== 0 && (contact === 1 || voltage > 0.01)) {
        if (!near) focus(rig.screen);
        guide();
        return;
      }
      if (contact !== 0 || !bar.has('charge') || bar.has('hold') || voltage < 0.15) {
        guide();
        return;
      }
      if (held === null) {
        held = { t: elapsed, v: voltage };
        say('断开时为 ' + voltage.toFixed(2) + ' V。等一秒，再点电压表。', rig.screen);
        return;
      }
      if (elapsed - held.t < 1) {
        guide();
        return;
      }
      records.add(['中位断开', '指零', held.v.toFixed(2), voltage.toFixed(2)]);
      bar.done('hold');
      say(
        '间隔 ' + (elapsed - held.t).toFixed(1) + ' s，两次都是 ' + voltage.toFixed(2) + ' V。拨向 2 看放电。',
        rig.handle,
      );
    }
    const desk = draggable(
      group,
      [
        {
          obj: rig.blade,
          plane: 'xz',
          offset: 0.024,
          hint: '握住黑柄拨向 1、2，或停在中间断开',
          onStart: enter,
          onDrag(p) {
            const pivot = group.worldToLocal(rig.blade.getWorldPosition(group.position.clone()));
            setAngle(Math.atan2(p.x - pivot.x, pivot.z - p.z));
          },
          onEnd(moved) {
            if (!moved) {
              guide();
              return;
            }
            setAngle(Math.abs(angle) > rig.throwAngle * 0.65 ? Math.sign(angle) * rig.throwAngle : 0);
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.dial, hint: '观察电流表指针', onTap: inspect },
          { obj: rig.screen, hint: '读取数字电压表', onTap: readOpen },
        ],
      },
    );
    function reset() {
      if (near) leave();
      angle = contact = voltage = current = startV = startI = elapsed = 0;
      held = null;
      bar.undo('charge', 'hold', 'discharge');
      rig.setAngle(0);
      rig.draw(0, 0);
      records.clear();
      records.el.hidden = true;
      guide();
    }
    return {
      group,
      toggles: ['steps'],
      size: { w: 0.58, d: 0.32, h: 0.07 },
      view: { elev: 50, azim: 0, lookY: 0.3, margin: 1.04 },
      pointer: {
        items: desk.items,
        down(ray, e) {
          if (near) {
            if (near === rig.dial) readDirection(ray);
            else guide();
            return true;
          }
          return desk.down(ray, e);
        },
        move(ray) {
          return near || desk.move(ray);
        },
        up() {
          return desk.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['开关状态', '指针最初偏转', '起始 U / V', '观察时 U / V']);
        records.el.hidden = true;
        ui.data.append(records.el);
        ui.notes.append(
          note('电源 6 V，串联电阻 1 kΩ，电容 2200 μF。电压表视作理想表，忽略漏电。正刻度表示流向电容器正极板。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        reset();
      },
      update(dt) {
        elapsed += dt;
        const state = observeCapacitor(voltage, contact, dt);
        voltage = state.voltage;
        current = state.current;
        rig.draw(voltage, current);
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        rig.dispose();
        bar.dispose();
      },
    };
  },
};
