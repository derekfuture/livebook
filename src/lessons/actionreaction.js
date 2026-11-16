import * as THREE from 'three';
import { actionReactionRig } from './kit/actionReactionRig.js';
import { FM } from './kit/forcemeter.js';
import { draggable, rayToLocal, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, table, buttons } from './kit/ui.js';
export default {
  id: 'actionreaction',
  fig: '图3.3-3',
  title: '作用力与反作用力',
  stampText: '实验',
  predict: {
    q: '固定 B、用手拉 A，哪只测力计的示数更大？',
    options: ['两只一样', '手拉的 A 更大', '固定的 B 更大'],
    answer: 0,
    hint: '改变拉力，并交换固定的一端，读两只原表。',
  },
  conclusion: {
    page: 73, rect: [63.78, 384.77, 378.81, 448.2],
    quote: '牛顿经过研究指出： 两个物体之间的作用力和反作用力总是大小相等， 方向相反， 作用在同一条直线上。这就是牛顿第三定律 （Newton’s third law）。',
    why: 'B 受到 A 的拉力，A 同时受到 B 的拉力。这两个力分属不同物体，不是同一物体上的一对平衡力。本装置慢拉时，两只表的示数相等；交换固定端也不改变相互作用的关系。',
    src: '课本第 69 页 · 第三章 第3节 牛顿第三定律',
  },
  create(ctx) {
    const rig = actionReactionRig(),
      handles = [
        { x: -0.29, z: 0 },
        { x: 0.29, z: 0 },
      ],
      records = [];
    let fixed = 0,
      connected = false,
      state = null,
      near = null,
      ui,
      rows,
      pinHeld = false,
      pinOrigin = 0,
      readings = [null, null];
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        {
          id: 'connect',
          title: '连接挂钩',
          todo: '握 A 的提环向左拖，使两只挂钩相连。',
          target: () => rig.meters[1].handle,
        },
        {
          id: 'pullA',
          title: '固定 B 拉 A',
          todo: '向外拉 A，读两只表；改变拉力再测一组。',
          target: () => rig.meters[1].handle,
        },
        {
          id: 'swap',
          title: '交换固定端',
          todo: '先回推卸载，再把固定销从 B 的提环移到 A。',
          target: () => (state?.force > 0.05 ? rig.meters[1].handle : rig.pin),
        },
        {
          id: 'pullB',
          title: '固定 A 拉 B',
          todo: '向外拉 B，读两只表，与原来的记录比较。',
          target: () => rig.meters[0].handle,
        },
      ],
    });
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const updateRig = () => {
      state = rig.draw(handles, { connected, fixed: pinHeld ? null : fixed });
      if (pinHeld) rig.pin.visible = true;
    };
    function say(t) {
      bar.say(t);
    }
    function guide() {
      if (near !== null) return say(`近看 ${near ? 'A' : 'B'}。每小格 0.2 N，点红色指针旁对应的刻线；读完回到原装置。`);
      if (!connected) return say('两表现在都在零位。握右侧 A 的提环向左拖，让两个挂钩相遇。');
      if (state.force > 5) return say('已超过 5 N 量程。把自由端移近，回到量程内再读数。');
      if (bar.finished)
        return say('换固定端后两表仍同读数。B 受 A 沿连接线指向 A 的力，A 受 B 指向 B 的力；两个力分属两个物体。');
      if (bar.current === 'swap')
        return say(
          state.force > 0.05
            ? '先把自由端移近，让两表回到零位，再移固定销。'
            : '两表已卸载。拖棕色固定销，从 B 的提环移到 A 的提环。',
        );
      const other = readings.findIndex((v) => v === null);
      if (readings.some((v) => v !== null))
        return say(`已读一只表。保持提环不动，点 ${other ? 'A' : 'B'} 表近看并读同一轮的刻度。`);
      if (fixed === 1 && !bar.has('pullA')) return say('先把固定销换回 B，在 B 固定时拉 A，取得两组不同拉力的读数。');
      if (fixed === 0 && !bar.has('pullA') && records.some((r) => r.fixed === 0))
        return say('已记一组。改变 A 的拉力至少 0.6 N，再停住分别读两只表。');
      return say(`${fixed ? 'A' : 'B'} 固定。拖 ${fixed ? 'B' : 'A'} 的提环向外拉，停住后分别点两只表，按原刻度读数。`);
    }
    function leave() {
      near = null;
      bar.near(false);
      ctx.back();
      guide();
    }
    function inspect(i) {
      enter();
      if (pinHeld) return;
      if (!connected) return say('先把两个挂钩接起来。现在两表零位可直接观察。');
      if (state.force > 5) return say('已超过 5 N 量程。把自由端移近，减小拉力后再读原表。');
      if (state.force < 0.4) return say('先用自由端缓慢拉出至少 0.4 N 的读数，再近看比较。');
      near = i;
      bar.near(true);
      const v = rig.group.worldToLocal(rig.meters[i].meter.pointer.getWorldPosition(new THREE.Vector3()));
      ctx.look(v.toArray(), [0, 1, 0.04], ctx.camera.aspect < 1 ? 0.17 : 0.22, leave);
      guide();
    }
    function recordGauge(ray) {
      const i = near,
        m = rig.meters[i].meter,
        p = rayToLocal(ray, m, 'xy', 0.0055);
      if (!p || Math.abs(p.x) > 0.026) return;
      const value = Math.round(((-p.y - 0.012 - FM.ZERO) / FM.PER_N) * 5) / 5;
      if (value < 0 || value > 5 || Math.abs(value - Math.round(state.force * 5) / 5) > 0.01)
        return say('再看红色指针所对的刻线，每小格 0.2 N；不把量程数字当读数。');
      readings[i] = value;
      if (readings.every((v) => v !== null)) {
        records.push({ fixed, values: [...readings], force: state.force });
        rows.add([String(records.length), fixed ? 'A' : 'B', readings[1].toFixed(1), readings[0].toFixed(1)]);
        rows.el.hidden = false;
        const a = records.filter((r) => r.fixed === 0).map((r) => r.force);
        if (a.length >= 2 && Math.max(...a) - Math.min(...a) >= 0.6) bar.done('pullA');
        if (bar.has('swap') && fixed === 1 && bar.has('pullA')) bar.done('pullB');
        readings = [null, null];
      }
      leave();
    }
    function moveHandle(i, p) {
      if (i === fixed || pinHeld) return;
      readings = [null, null];
      const other = handles[1 - i];
      let x = i ? clamp(p.x, other.x + 0.28, 0.33) : clamp(p.x, -0.33, other.x - 0.28),          // 不出台板（两表拉到最长约 0.55，固定端在 ±0.29）
        z = clamp(p.z, -0.15, 0.15);
      if (!connected) {
        // 未连接时两表朝内，先把 A 的挂钩拖至 B 的挂钩。
        x = Math.max(x, handles[0].x + rig.rest[0] + rig.rest[1] - 0.008);
        handles[i] = { x, z };
        if (Math.hypot(x - handles[0].x - rig.rest[0] - rig.rest[1], z) < 0.012) {
          handles[1] = { x: handles[0].x + rig.rest[0] + rig.rest[1], z: 0 };
          connected = true;
          bar.done('connect');
        }
      } else {
        let dx = x - other.x,
          dz = z - other.z,
          d = Math.hypot(dx, dz),
          max = rig.rest[0] + rig.rest[1] + 0.252;
        if (d < 0.3 || d > max) {
          const length = clamp(d, 0.3, max);
          if (d < 1e-8) {
            dx = i ? 1 : -1;
            dz = 0;
            d = 1;
          }
          x = other.x + (dx / d) * length;
          z = other.z + (dz / d) * length;
        }
        handles[i] = { x, z };
      }
      updateRig();
      guide();
    }
    const desk = draggable(
      rig.group,
      [
        ...rig.meters.map((m, i) => ({
          obj: m.handle,
          plane: 'xz',
          offset: 0.024,
          keepOffset: true,
          hint: () => (i === fixed ? '这一端被固定销固定' : '拖提环缓慢拉动或卸载'),
          onStart() {
            enter();
            if (i === fixed) say('这一端有固定销。先拖另一端；卸载后才能移动固定销。');
          },
          onDrag: (p) => moveHandle(i, p),
        })),
        {
          obj: rig.pin,
          plane: 'xz',
          offset: 0.018,
          keepOffset: true,
          hint: '卸载后拖固定销，更换固定端',
          onStart() {
            enter();
            pinOrigin = fixed;
            if (!connected || state.force > 0.05) {
              pinHeld = false;
              say('先连接两表并卸载至零，再移固定销。');
            } else pinHeld = true;
          },
          onDrag(p) {
            if (pinHeld) rig.pin.position.set(p.x, 0.04, p.z);
          },
          onEnd() {
            if (!pinHeld) return;
            const candidate = handles.findIndex(
              (h) => Math.hypot(h.x - rig.pin.position.x, h.z - rig.pin.position.z) < 0.035,
            );
            fixed = candidate < 0 ? pinOrigin : candidate;
            pinHeld = false;
            readings = [null, null];
            if (fixed === 1 && bar.has('pullA')) bar.done('swap');
            updateRig();
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: rig.meters.map((m, i) => ({
          obj: m.meter,
          hint: `点 ${i ? 'A' : 'B'} 表近看原刻度`,
          onTap: () => inspect(i),
        })),
      },
    );
    const pointer = {
      items: desk.items,
      down(ray, e) {
        if (near !== null) {
          recordGauge(ray);
          return true;
        }
        return desk.down(ray, e);
      },
      move(ray) {
        return near !== null || desk.move(ray);
      },
      up() {
        return desk.up();
      },
      dispose() {
        desk.dispose();
      },
    };
    function reset() {
      handles[0] = { x: -0.29, z: 0 };
      handles[1] = { x: 0.29, z: 0 };
      fixed = 0;
      connected = false;
      pinHeld = false;
      readings = [null, null];
      records.length = 0;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('connect', 'pullA', 'swap', 'pullB');
      updateRig();
      leave();
    }
    updateRig();
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.72, d: 0.36, h: 0.075 },          // 台板只比两只测力计能拉到的范围大一点：测力计在画面里够大
      view: { elev: 58, azim: 0, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['轮次', '固定端', 'A / N', 'B / N']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            '先连接两挂钩，固定 B 拉 A，停住后分别近看两只原表。改变拉力再测；两组拉力至少相差 0.6 N 是此活页的比较条件。卸载后可拖棕色固定销到 A，再拉 B。',
          ),
          buttons([
            { text: '近看 A', onClick: () => inspect(1) },
            { text: '近看 B', onClick: () => inspect(0) },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '采用轻质测力计的准静态模型，适用于缓慢拉动和停稳读数；不模拟快速甩动时仪器质量、内部振动和指针滞后。松弛时两表转开并回零。两只表的伸长来自同一串联张力，读表保留 0.2 N 分度的取整。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
