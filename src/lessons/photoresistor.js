// 选必二图5.2-2：同一多用电表测光敏电阻，再测去掉一小块漆的普通电阻。
import { photoresistorRig, HAND_HOME, PAPER_HOME, PHOTO_POS } from './kit/photoresistorRig.js';
import { photoresistorState, photoIlluminance } from './kit/photoresistor.js';
import { meterProbes } from './kit/meterProbes.js';
import { METER_STOPS, ohmScaleValue } from './kit/multimeter.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, table, buttons } from './kit/ui.js';

const CONDITIONS = ['room', 'shade', 'bright'];
const LABELS = { room: '室内自然光', shade: '手掌遮光', bright: '强光照射' };
export default {
  id: 'photoresistor',
  fig: '图5.2-2',
  title: '光照怎样改变电阻',
  stampText: '测量',
  predict: {
    q: '用手遮住光敏电阻，再移开手，欧姆表的指针会怎样变化？',
    options: ['遮光时偏向高阻端，移开后回落', '遮光时偏向零欧姆端', '所有电阻都不随光照改变'],
    answer: 0,
    hint: '这里观察的是电阻值，欧姆表的零刻度在右端。',
  },
  conclusion: {
    quote: '光敏电阻的阻值随光照增强而减小。',
    why: '同一光敏元件在遮光、室内光、强光下呈现不同阻值；普通电阻露出一小块导电膜后，在温度近似不变时对照，没有同样明显的变化。高阻端的刻线很密，不能把遮光读数当成断路或精确数值。',
    src: '人教版高中物理选择性必修第二册第97–98页；用白光源替代阳光作强光对照。',
  },
  create(ctx) {
    const look = ctx.look;
    ctx = { ...ctx, look: (at, ...args) => look([at[0], at[1] + 0.006, at[2]], ...args) };
    const rig = photoresistorRig(),
      { group, circuit, meter, photo, regular, hand, sandpaper, lamp, lampBase, power } = rig;
    let model,
      ui,
      rows,
      choice,
      near = false,
      aim = null,
      zeroed = false,
      calibrated = false;
    let instruction = '';
    let adjustment = 0,
      on = false,
      wear = 0,
      stable = 0,
      lastFraction = 0,
      pair;
    const records = { P: {}, R: {} };
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'zero', title: '调零', todo: '先机械调零，再选×100挡短接调零。', target: () => aim },
        { id: 'photo', title: '测光敏电阻', todo: '同一元件分别遮光、移开手、照强光，读原表针。', target: () => aim },
        { id: 'prepare', title: '普通电阻去漆', todo: '用细砂纸轻磨普通电阻，露出一小块导电膜。', target: () => aim },
        { id: 'regular', title: '普通电阻对照', todo: '移接两支表笔，重复三种光照。', target: () => aim },
        { id: 'compare', title: '比较记录', todo: '打开原笔记本，比较两种电阻的六次读数。', target: () => aim },
        { id: 'off', title: '收表', todo: '关光源、移开表笔，转回OFF。', target: () => aim },
      ],
    });
    function say(msg, obj = null) {
      aim = near ? null : obj;
      instruction = msg;
      bar.say(msg);
    }
    function enter() {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    const stop = () => METER_STOPS[meter.stop];
    function connected() {
      const ts = [pair.probes.red.target, pair.probes.black.target];
      return ['P', 'R'].find((n) => ts.includes(n + '.a') && ts.includes(n + '.b')) || null;
    }
    function light(part, lit = on) {
      const source = { x: lamp.position.x, y: rig.emitter.position.y, z: lamp.position.z, intensity: 80 };
      return photoIlluminance({ sensor: rig.sensorPoint(part), shade: hand.position, lamp: lit ? source : null });
    }
    function condition(part) {
      const room = light(part, false),
        total = light(part);
      if (!on && room > 490) return 'room';
      if (!on && room < 12) return 'shade';
      if (on && room > 490 && total > 3500) return 'bright';
      return null;
    }
    function paperOnR() {
      return (
        Math.abs(sandpaper.position.x - regular.group.position.x) < 0.032 &&
        Math.abs(sandpaper.position.z - regular.group.position.z) < 0.02
      );
    }
    function needed(name) {
      return CONDITIONS.find((c) => !records[name][c]);
    }
    function guide() {
      if (!zeroed) return say('点表盘近看。OFF挡拖定位螺丝，让针尖对准左端0。', meter.zero);
      if (bar.has('compare')) {
        if (near) return say('读数已比较。先回到全景收表。');
        if (on) return say('关掉强光源的棕色开关。', power);
        const p = pair.probes.red.target || pair.shorted ? pair.probes.red : pair.probes.black;
        if (pair.probes.red.target || pair.probes.black.target || pair.shorted)
          return say('把两支表笔移到空桌面，彼此分开。', p.handle);
        if (meter.stop !== 0) return say('转动选择开关回到OFF。', meter.selector);
        bar.done('off');
        return say('六次读数已保留，表笔和电源已收好。');
      }
      if (meter.stop !== 3) return say('本次用×100电阻挡。转动原选择开关，或点它旁边的×100字样。', meter.selector);
      if (!calibrated) {
        if (near && !pair.shorted) return say('先回到全景，把两表笔金属尖端碰在一起。');
        if (!pair.shorted) return say('把两支表笔移离接线柱，让红黑金属尖端相碰。', pair.probes.red.handle);
        return say('短接后点表盘近看，向左慢拖Ω调零旋钮，使针尖指到右端0。', meter.trim);
      }
      if (bar.has('photo') && wear < 1) {
        if (near) return say('三种光照已测。回到全景，用细砂纸轻磨普通电阻的漆层。');
        if (on) return say('先关强光源，再准备普通电阻对照。', power);
        if ([pair.probes.red.target, pair.probes.black.target].some((t) => t?.startsWith('R.')))
          return say(
            '去漆前先将表笔移离普通电阻。',
            pair.probes.red.target?.startsWith('R.') ? pair.probes.red.handle : pair.probes.black.handle,
          );
        return say('把细砂纸拖到台前普通电阻上，贴住漆层轻轻来回磨。', sandpaper);
      }
      if (bar.has('photo') && bar.has('regular')) return say('打开左边笔记本，比较六次记录并选择结论。');
      const name = !bar.has('photo') ? 'P' : 'R',
        part = name === 'P' ? photo : regular,
        need = needed(name);
      if (near && connected() !== name)
        return say('先回到全景，再把两笔接到' + (name === 'P' ? '光敏' : '普通') + '电阻的两端。');
      if (connected() !== name) {
        const p =
          [pair.probes.red, pair.probes.black].find((p) => !p.target?.startsWith(name + '.')) || pair.probes.black;
        return say('把红黑表笔分别拖到' + (name === 'P' ? '后排光敏' : '台前普通') + '电阻的两个金属接点。', p.handle);
      }
      if (name === 'R' && paperOnR()) return say('把砂纸移回台前空处，露出刚磨出的导电膜。', sandpaper);
      const current = condition(part);
      if (current && !records[name][current])
        return say(
          near
            ? '沿针尖点外圈红色Ω刻度。读数乘100；靠近∞端只记高阻范围。'
            : LABELS[current] + '已就位。点表盘近看，读原指针。',
          meter.face,
        );
      if (near) return say('这一条件已有记录。回到全景，改变原元件的光照再测。');
      if (need !== 'bright' && on) return say('先关掉棕色开关，去掉附加强光。', power);
      if (need === 'shade') return say('把遮光手的掌心移到正在测量的元件正上方。', hand);
      if (light(part, false) <= 490) return say('把遮光手移到右侧空处，让元件露出来。', hand);
      if (need === 'bright') {
        if (Math.hypot(lamp.position.x - part.group.position.x, lamp.position.z - part.group.position.z) > 0.02)
          return say('拖动灯座，把灯头移到正在测量的元件上方。', lampBase);
        if (!on) return say('点灯座上的棕色开关，让强光照射元件。', power);
        return say('把灯头移近元件正上方，保证强光照到表面。', lampBase);
      }
      return say('移开手、关闭强光，恢复室内自然光后再读表。', hand);
    }
    pair = meterProbes(circuit, ['P.a', 'P.b', 'R.a', 'R.b'], {
      changed(reason) {
        enter();
        stable = 0;
        if (reason) say(reason);
        else guide();
      },
      allow() {
        return '';
      },
      mayLift() {
        return '';
      },
    });
    function leave() {
      if (near) ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function inspect() {
      enter();
      if (near) return;
      near = true;
      bar.near(true);
      // 同一只原表，校准时保留选择开关，读数时才更近地看刻度。
      const reading = connected() && zeroed && calibrated && meter.stop === 3;
      ctx.look(
        [meter.group.position.x, 0.019, meter.group.position.z + (reading ? -0.048 : 0)],
        [0, 1, 0.04],
        (reading ? 0.2 : 0.36) / Math.max(0.5, 1 - 140 / innerHeight),
        leave,
      );
      guide();
    }
    function choose(index) {
      enter();
      if (index === meter.stop) return guide();
      if (!zeroed && index !== 0) return say('先在OFF挡调定位螺丝，让针尖回到左端0。', meter.zero);
      calibrated = false;
      stable = 0;
      meter.trimOffset = adjustment + ({ 1: 0.13, 10: -0.11, 100: 0.08 }[METER_STOPS[index].multiplier] || 0);
      meter.setStop(index);
      guide();
    }
    function read(point) {
      if (!zeroed || !calibrated || meter.stop !== 3) return guide();
      const name = connected();
      if (!name) return say('两笔须接同一电阻的两端；短接或悬空都不能记录元件阻值。');
      if (name === 'R' && (wear < 1 || paperOnR()))
        return say('普通电阻要先露出一小块导电膜，并移开砂纸，再做光照对照。');
      const c = condition(name === 'P' ? photo : regular);
      if (!c) return say('当前光照介于两种条件之间。回全景把掌心或灯头对准，再读数。');
      if (stable < 0.45) return say('指针还在变化，稍等稳定后再读。');
      const mark = meter.pickScale(point);
      if (!mark || mark.scale !== 'ohm') return say('读外圈红色Ω刻度，不读内圈电压刻度。');
      if (Math.abs(mark.fraction - meter.display) > 0.017) return say('沿原指针的方向找到外圈刻度，再点一次。');
      // 200以外已没有细分刻度，不能按光照模型反算伪精确结果。
      const high = meter.display < 20 / 220,
        estimate = ohmScaleValue(mark.fraction),
        scale = estimate < 10 ? 10 : 1,
        raw = high ? null : Math.round(estimate * scale) / scale;
      const value = high ? '大于20 kΩ（高阻端）' : raw * 100 + ' Ω';
      records[name][c] = { raw, value };
      renderRows();
      bar.undo('compare', 'off');
      if (choice) choice.value = '';
      if (!needed(name)) bar.done(name === 'P' ? 'photo' : 'regular');
      leave();
      const next = instruction;
      say(
        (name === 'P' ? '光敏电阻' : '普通电阻') +
          '·' +
          LABELS[c] +
          '：' +
          (high ? '只能读出大于20 kΩ，不是断路。' : `${raw}×100＝${value}。`) +
          next,
        aim,
      );
    }
    function renderRows() {
      if (!rows) return;
      rows.clear();
      for (const name of ['P', 'R'])
        for (const c of CONDITIONS) {
          const r = records[name][c];
          if (r)
            rows.add([
              name === 'P' ? '光敏电阻' : '普通电阻',
              LABELS[c],
              r.raw === null ? '超过200刻线' : String(r.raw),
              r.value,
            ]);
        }
      rows.el.hidden = rows.rows.length === 0;
    }
    function adjust(obj, isZero) {
      let grab;
      return {
        obj,
        plane: 'xz',
        offset: meter.selector.position.y,
        hint: isZero ? '拖动机械调零螺丝' : '拖动欧姆调零旋钮',
        onStart() {
          enter();
          grab = isZero ? meter.mechanical : adjustment;
        },
        onDrag(p, from) {
          if (!from) return;
          if (isZero) {
            if (meter.stop !== 0 || pair.shorted || pair.probes.red.target || pair.probes.black.target)
              return say('先把表笔分开、移离元件，并转至OFF。');
            let v = clamp(grab + (p.x - from.x) * 2.5, -0.12, 0.12);
            if (Math.abs(v) < 0.005) v = 0;
            meter.mechanical = v;
            meter.zero.rotation.y = v * 8;
          } else {
            if (meter.stop !== 3 || !pair.shorted) return say('先选×100挡，并让两表笔尖端相碰。');
            adjustment = clamp(grab + (p.x - from.x) * 10, -0.3, 0.3);
            if (Math.abs(adjustment + 0.08) < 0.015) adjustment = -0.08;
            meter.trimOffset = adjustment + 0.08;
            meter.trim.rotation.y = adjustment * 8;
            circuit.solve();
          }
          stable = 0;
        },
        onEnd(moved) {
          if (!moved) return inspect();
          zeroed = meter.mechanical === 0;
          calibrated = zeroed && meter.stop === 3 && pair.shorted && Math.abs(meter.trimOffset) < 0.001;
          if (zeroed && calibrated) bar.done('zero');
          else bar.undo('zero');
          guide();
        },
      };
    }
    let previousPaper;
    const desk = draggable(
      group,
      [
        ...pair.drags,
        adjust(meter.zero, true),
        adjust(meter.trim, false),
        {
          obj: meter.selector,
          plane: 'xz',
          offset: meter.selector.position.y,
          hint: '转动选择开关',
          onDrag(p) {
            choose(meter.pickStop(meter.group.worldToLocal(group.localToWorld(p.clone()))));
          },
          onTap: inspect,
        },
        {
          obj: hand,
          plane: 'xz',
          offset: HAND_HOME[1] + 0.007,
          keepOffset: true,
          hint: '移动手掌遮住或露出元件',
          onStart: enter,
          onDrag(p) {
            hand.position.set(clamp(p.x, -0.025, 0.22), HAND_HOME[1], clamp(p.z, -0.1, 0.14));
            stable = 0;
            guide();
          },
          onEnd: guide,
        },
        {
          obj: lampBase,
          anchor: lamp,
          plane: 'xz',
          offset: 0.012,
          keepOffset: true,
          hint: '拖灯座移动照射位置',
          onStart: enter,
          onDrag(p) {
            lamp.position.set(clamp(p.x, 0.02, 0.17), 0, clamp(p.z, -0.09, 0.09));
            stable = 0;
            guide();
          },
          onEnd: guide,
        },
        {
          obj: sandpaper,
          plane: 'xz',
          offset: 0.035,
          keepOffset: true,
          hint: '把砂纸贴着普通电阻轻轻来回磨',
          onStart() {
            enter();
            previousPaper = sandpaper.position.clone();
          },
          onDrag(p) {
            if ([pair.probes.red.target, pair.probes.black.target].some((t) => t?.startsWith('R.')))
              return say('先把表笔移离普通电阻，再轻磨漆层。');
            const x = clamp(p.x, -0.04, 0.18),
              z = clamp(p.z, -0.02, 0.15),
              rx = regular.group.position.x,
              rz = regular.group.position.z;
            const length = Math.hypot(x - previousPaper.x, z - previousPaper.z),
              n = Math.max(1, Math.ceil(length / 0.002));
            let contact = 0;
            for (let i = 1; i <= n; i++) {
              const t = (i - 0.5) / n,
                px = previousPaper.x + (x - previousPaper.x) * t,
                pz = previousPaper.z + (z - previousPaper.z) * t;
              if (Math.abs(px - rx) < 0.014 && Math.abs(pz - rz) < 0.012) contact += length / n;
            }
            wear = clamp(wear + contact / 0.13, 0, 1);
            rig.expose(wear);
            sandpaper.position.set(x, Math.abs(x - rx) < 0.032 && Math.abs(z - rz) < 0.02 ? 0.0271 : 0.004, z);
            previousPaper.copy(sandpaper.position);
            if (wear >= 1) bar.done('prepare');
            if (wear >= 1) say('已露出一小块导电膜。把砂纸移回台前空处，再把两笔移接普通电阻。', sandpaper);
            else say('砂纸须贴在普通电阻漆层上，轻轻来回移动。', sandpaper);
          },
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: power,
            hint: '开关强光源',
            onTap() {
              enter();
              on = !on;
              rig.illuminate(on);
              stable = 0;
              guide();
            },
          },
          {
            obj: meter.face,
            hint: '近看原表盘并读外圈刻度',
            onTap(ray) {
              const hit = ray.intersectObject(meter.face)[0];
              if (!hit) return;
              const p = meter.group.worldToLocal(hit.point.clone()),
                r = Math.hypot(p.x - meter.selector.position.x, p.z - meter.selector.position.z);
              if (r > 0.014 && r < 0.028) choose(meter.pickStop(p));
              else if (near) read(p);
              else inspect();
            },
          },
        ],
      },
    );
    function compare() {
      if (!bar.has('photo') || !bar.has('regular')) return say('先完成两种电阻在三种光照下的六次记录。');
      if (choice.value !== 'photo') return say('比较同一行条件改变前后的记录：哪种元件的阻值明显随光照改变？');
      bar.done('compare');
      leave();
    }
    function reset() {
      ctx.back();
      near = false;
      bar.near(false);
      pair.reset();
      on = false;
      rig.illuminate(false);
      hand.position.set(...HAND_HOME);
      sandpaper.position.set(...PAPER_HOME);
      lamp.position.set(PHOTO_POS[0], 0, PHOTO_POS[1]);
      wear = 0;
      rig.expose(0);
      model = photoresistorState();
      photo.R = model.resistance;
      regular.R = model.regularResistance;
      adjustment = 0;
      meter.trimOffset = 0;
      meter.mechanical = 0.032;
      meter.zero.rotation.y = 0.032 * 8;
      meter.trim.rotation.y = 0;
      meter.setStop(0);
      zeroed = calibrated = false;
      stable = 0;
      lastFraction = 0;
      records.P = {};
      records.R = {};
      if (choice) choice.value = '';
      renderRows();
      bar.undo('zero', 'photo', 'prepare', 'regular', 'compare', 'off');
      guide();
    }
    const mounted = new group.constructor();
    mounted.add(group);
    group.position.y = 0.006;
    return {
      group: mounted,
      card: false,
      pointer: desk,
      toggles: ['steps'],
      size: { w: 0.54, d: 0.38, h: 0.19 },
      view: { azim: 0, elev: 48, lookY: 0.3, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['元件', '光照条件', '外圈Ω刻度', '×100后阻值']);
        choice = h(
          'select',
          {
            'aria-label': '光照对电阻的影响',
            onchange() {
              bar.undo('compare', 'off');
            },
          },
          h('option', { value: '' }, '按记录选择'),
          h('option', { value: 'photo' }, '光敏电阻变化明显；普通电阻基本不变'),
          h('option', { value: 'both' }, '两种电阻都明显减小'),
          h('option', { value: 'none' }, '两种电阻都不变'),
        );
        ui.data.append(
          rows.el,
          h('div', { class: 'read-row' }, h('label', {}, '比较光照影响', choice)),
          buttons([{ text: '核对比较', onClick: compare }]).el,
        );
        ui.notes.append(
          note(
            '外圈Ω刻度乘100。高于200刻线只记“大于20 kΩ”，不能当作断路。强光源代替阳光作定性对照；温度近似不变，不模拟照射升温。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        reset();
      },
      update(dt) {
        if (!model) return;
        photo.R = model.step(dt, light(photo));
        circuit.solve();
        circuit.update(dt);
        rig.updateLight();
        stable =
          Math.abs(meter.fraction - lastFraction) < 0.001 && Math.abs(meter.display - meter.fraction) < 0.003
            ? stable + dt
            : 0;
        lastFraction = meter.fraction;
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        pair.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
