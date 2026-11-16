import * as THREE from 'three';
import { ampereRig } from './kit/ampereRig.js';
import { ampereForce, swingRod } from './kit/ampereRod.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { buttons, table, note } from './kit/ui.js';

export default {
  id: 'amperedirection',
  fig: '图1.1-1',
  title: '观察安培力的方向',
  stampText: '观察',
  predict: {
    q: '通电导体棒已偏向一侧，只交换上下磁极，棒将偏向哪里？',
    options: ['仍偏向原来一侧', '偏向相反一侧', '保持在中央'],
    answer: 1,
  },
  conclusion: {
    page: 7, rect: [57.78, 265.34, 378.87, 433.72],
    quote: '众多事实表明，通电导线在磁场中所受安培力的方向与电流方向、磁感应强度的方向都垂直（图1.1-2）。',
    why: '只反转磁场或只反转电流，安培力都会反向。两者都反转时，安培力恢复原方向。用左手定则检查，四指指向约定电流方向，磁场穿入掌心，拇指所指是受力方向。',
    src: '课本第 3 页 · 第一章 第1节 磁场对通电导线的作用力',
  },
  create(ctx) {
    const rig = ampereRig(),
      { group } = rig;
    let polarity = 0,
      flipPosition = 0,
      flipping = false,
      settling = false,
      closeView = false,
      ui,
      rows,
      aim,
      draggedLead;
    const connection = [0, 1],
      state = { angle: 0, speed: 0 },
      observed = new Set();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'base', title: '通电看偏转', todo: '合上电键，看棒偏向电源还是另一侧。', target: () => aim },
        { id: 'field', title: '只换磁极', todo: '断电后翻转蹄形磁体，保持接线，再通电。', target: () => aim },
        {
          id: 'current',
          title: '只换电流',
          todo: '断电，保持磁极位置，对调电源上的两根线，再通电。',
          target: () => aim,
        },
      ],
    });
    const current = () =>
      rig.sw.closed && connection.every((k) => k !== null) ? (connection[0] === 0 ? 2.5 : -2.5) : 0;
    const key = (field, sign) => field + ',' + sign;
    function leave() {
      closeView = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function say(s, obj) {
      aim = obj;
      bar.say(s);
    }
    function guide() {
      if (bar.finished) return say('已比较两组单变量实验。只换磁极、只换电流，棒的偏转方向都反过来了。');
      if (draggedLead !== undefined) return;
      if (rig.sw.closed && connection.includes(null))
        return say('电路还未接通。断开电键，再把两根线接到不同的电源端子。', rig.sw.group);
      if (connection.includes(null))
        return say(
          '把取下的线接到另一极。若接线柱被占，先把那根线拖到台面。点电源可近看。',
          rig.plugs[connection.indexOf(null)],
        );
      const sign = connection[0] === 0 ? 1 : -1;
      if (closeView) return say('两根线已接好。回到全景，合上电键观察悬棒。');
      if (!observed.has(key(polarity, sign)))
        return say(
          rig.sw.closed ? '观察悬线。棒离开正中后，看它偏向电源还是远离电源。' : '合上电键，看这次棒偏向哪一侧。',
          rig.sw.group,
        );
      if (rig.sw.closed) return say('点电键断电，等棒摆回中间，再只改变一个条件。', rig.sw.group);
      if (!bar.has('field')) return say('接线保持原样，上下拖蹄形磁体的端部，将磁极翻面。', rig.magnet);
      return say('磁极保持原样。点电源近看，把一根线头先拖到桌面，再对调两根线。', rig.plugs[0]);
    }
    function record(sign) {
      const k = key(polarity, sign);
      if (observed.has(k)) return;
      observed.add(k);
      rows.add([
        polarity ? '上 N 下 S' : '上 S 下 N',
        sign > 0 ? 'A 到 B' : 'B 到 A',
        state.angle > 0 ? '偏向电源' : '远离电源',
      ]);
      bar.done('base');
      if (observed.has(key(1 - polarity, sign))) bar.done('field');
      if (observed.has(key(polarity, -sign))) bar.done('current');
      guide();
    }
    function reset() {
      if (closeView) leave();
      flipping = settling = false;
      rig.sw.closed = false;
      polarity = flipPosition = 0;
      rig.flip(0);
      state.angle = state.speed = 0;
      rig.swing(0);
      observed.clear();
      rig.socket.forEach((p, i) => {
        connection[i] = i;
        rig.lead(i, p);
      });
      draggedLead = undefined;
      rows?.clear();
      bar.undo('base', 'field', 'current');
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.magnet,
          plane: 'xy',
          offset: 0,
          hint: '上下拖磁极，退出翻面再推入',
          onStart() {
            flipping = !rig.sw.closed && !settling;
          },
          onDrag(p, start) {
            if (rig.sw.closed) return say('先点电键断电，再翻转磁体。', rig.sw.group);
            if (start && flipping) {
              const stroke = clamp(Math.abs(p.y - start.y) / 0.066, 0, 1);
              flipPosition = polarity ? 1 - stroke : stroke;
              rig.flip(flipPosition);
            }
          },
          onEnd() {
            if (!flipping) return;
            flipping = false;
            polarity = flipPosition >= 0.5 ? 1 : 0;
            settling = polarity !== flipPosition;
            guide();
          },
        },
        ...rig.plugs.map((plug, i) => ({
          obj: plug,
          plane: 'xz',
          offset: 0.052,
          hint: '拖下线头，接到另一电源端子',
          onStart() {
            draggedLead = i;
          },
          onDrag(p) {
            if (rig.sw.closed) return say('先断开电键，再移动线头。', rig.sw.group);
            rig.lead(i, new THREE.Vector3(p.x, 0.052, p.z));
          },
          onEnd(moved) {
            draggedLead = undefined;
            if (moved && !rig.sw.closed) {
              const p = plug.position,
                nearest = rig.socket.map((v) => Math.hypot(v.x - p.x, v.z - p.z));
              const k = nearest[0] < nearest[1] ? 0 : 1;
              if (nearest[k] < 0.022 && connection[1 - i] !== k) {
                connection[i] = k;
                rig.lead(i, rig.socket[k]);
              } else {
                connection[i] = null;
                rig.lead(i, new THREE.Vector3(clamp(p.x, -0.14, 0.18), 0.008, Math.max(0.145, Math.min(p.z, 0.18))));
              }
            }
            guide();
          },
        })),
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.source.group,
            hint: '近看电源接线柱',
            onTap() {
              closeView = true;
              bar.near(true);
              ctx.look([0.1, 0.033, 0.121], [0, 0.95, 0.45], ctx.camera.aspect < 1 ? 0.18 : 0.22, leave);
              guide();
            },
          },
          {
            obj: rig.sw.group,
            hint: '合上或断开电键',
            onTap() {
              if (settling || flipping) return say('等磁体回到支架定位处，再合上电键。', rig.magnet);
              rig.sw.toggle();
              guide();
            },
          },
        ],
      },
    );
    return {
      group,
      size: { w: 0.39, h: 0.265, d: 0.44 },
      view: { azim: 28, elev: 28, margin: 1.06, lookY: 0.5 },
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
        rows = table(['磁极', '棒中电流', '偏转']);
        panel.data.append(rows.el);
        panel.notes.append(
          note(
            '先观察棒在两根悬线下的静止位置。下方 N 极、上方 S 极时，间隙磁场向上。电流方向由电源正极经电键、导线和棒流向负极，以电源所在的一侧作偏转方向参照。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        rig.sw.update(dt);
        if (settling) {
          const delta = polarity - flipPosition;
          flipPosition += Math.sign(delta) * Math.min(Math.abs(delta), dt * 2);
          rig.flip(flipPosition);
          settling = Math.abs(polarity - flipPosition) > 1e-6;
          if (!settling) guide();
        }
        const i = current(),
          f = ampereForce(i, polarity ? -1 : 1);
        swingRod(state, dt, f);
        rig.swing(state.angle);
        if (rows && i && state.angle * Math.sign(f) > 0.13 && Math.abs(state.speed) < 0.3) record(Math.sign(i));
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
      },
    };
  },
};
