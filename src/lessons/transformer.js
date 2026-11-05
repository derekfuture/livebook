// 可拆变压器：接线决定原、副绕组；指针是当前所接两抽头间的交流有效值。
import * as THREE from 'three';
import { transformerRig, AC_STOPS, LEGS, CORE_Z, LEG_TOP, BASE_H } from './kit/transformerRig.js';
import { transformerReadings, TAP_TURNS } from './kit/transformer.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, buttons, note, h } from './kit/ui.js';

const trials = [
  [200, 100],
  [200, 200],
  [200, 400],
  [100, 200],
  [400, 200],
];
const mid = (LEGS[0] + LEGS[1]) / 2;
export default {
  id: 'transformer',
  fig: '图3.3-2',
  title: '探究变压器原、副线圈电压与匝数的关系',
  stampText: '探究',
  predict: {
    q: '原线圈接同一低压交流电源，原线圈匝数不变，把副线圈的有效匝数增加一倍，副线圈的电压会怎样？',
    options: ['约为原来的两倍', '约为原来的一半', '保持不变'],
    answer: 0,
    hint: '两个绕组绕在同一闭合铁芯上。',
  },
  conclusion: {
    quote: '闭合铁芯、近似空载时，原副线圈的有效电压之比接近匝数之比。',
    why: '共同的交变磁通在各匝中产生感应电动势。匝数越多，感应电动势越大。实际读数受绕组电阻、漏磁和电表负载影响。',
    src: '人教版高中物理选择性必修第二册第 58–60 页',
  },
  create(ctx) {
    const rig = transformerRig(),
      { group, coils, yoke, meter, leads } = rig;
    let ui, rows, comparison, view, aim, on, yoked, seated, tween, primaryRead, sampled, wellTime;
    const recorded = new Map();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'core', title: '装铁芯', todo: '把两个绕组套在铁芯的两柱上，合上铁轭。', target: () => aim },
        {
          id: 'voltage',
          title: '读两端电压',
          todo: '把低压交流电源接到原线圈，用电表分别读原、副线圈。',
          target: () => aim,
        },
        {
          id: 'secondary',
          title: '改副线圈匝数',
          todo: '保持原线圈 200 匝，改变副线圈接入的匝数。',
          target: () => aim,
        },
        { id: 'primary', title: '改原线圈匝数', todo: '保持副线圈 200 匝，改变原线圈接入的匝数。', target: () => aim },
      ],
    });
    const say = (msg, item) => {
      aim = item;
      bar.say(msg);
    };
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function close(viewName) {
      view = viewName;
      bar.near(true);
      if (view === 'meter') ctx.look([0.155, 0.021, -0.012], [0, 1, 0.06], ctx.camera.aspect >= 1 ? 0.41 : 0.24, leave);
      else ctx.look([mid, 0.055, 0], [0.12, 1, 0.28], ctx.camera.aspect < 1 ? 0.52 : 0.7, leave);
      guide();
    }
    function pair(i) {
      const [a, b] = leads.slice(i, i + 2);
      if (a.side === null || a.side !== b.side || a.turns === b.turns) return null;
      const lo = Math.min(a.turns, b.turns),
        hi = Math.max(a.turns, b.turns);
      return { side: a.side, n: hi - lo, lo, hi, key: a.side + '/' + lo + '/' + hi };
    }
    const goal = () => trials.find(([a, b]) => !recorded.has(a + '/' + b));
    const other = (i) => 1 - i;
    const optimal = (v) => AC_STOPS.findIndex((s) => s.range >= v);
    function readings() {
      const source = pair(0),
        probes = pair(2);
      const same = source && probes && source.side === probes.side;
      return transformerReadings({
        primary: source?.n || 0,
        secondary: probes?.n || 0,
        energized: on,
        coreClosed: yoked,
        meterSide: probes && meter.stop ? (same ? 'primary' : 'secondary') : null,
        range: AC_STOPS[meter.stop].range || 50,
        meterTurns: probes?.n || 0,
        overlapTurns: same ? Math.max(0, Math.min(source.hi, probes.hi) - Math.max(source.lo, probes.lo)) : 0,
      });
    }
    const sampleKey = () => pair(0)?.key + '|' + pair(2)?.key;
    function guide() {
      if (bar.finished)
        return say(
          '已比较两组数据。原线圈匝数相同时，副电压随副线圈匝数增加；副匝数相同时，增加原匝数会使副电压降低。',
        );
      if (!goal())
        return say(
          on ? '两组数据已齐。点开关断电，再展开笔记本比较电压比。' : '展开笔记本，从实测电压和匝数判断两者的关系。',
          on ? rig.power : null,
        );
      if (tween) return;
      const loose = seated.findIndex((i) => i === null);
      if (loose !== -1)
        return say(
          '把台前的绕组提到' + (loose ? '另一' : '一') + '根空铁芯柱上，松手让它沿柱落下。',
          coils[loose].group,
        );
      if (!yoked) return say('把后方的横铁轭拖到两柱顶端，闭合铁芯。', yoke);
      const [n1, n2] = goal(),
        source = pair(0),
        probe = pair(2);
      if (!source || source.n !== n1) {
        if (on) return say('下一组固定副线圈 ' + n2 + ' 匝。断电，把原线圈改接 ' + n1 + ' 匝。', rig.power);
        const side = source?.side ?? leads[0].side ?? 0;
        return say(
          '电源线接同一绕组的 0 和 ' + n1 + ' 匝柱。本组保持副线圈 ' + n2 + ' 匝。',
          leads[leads[1].side === side ? 0 : 1].obj,
        );
      }
      const needPrimary = primaryRead?.key !== source.key;
      if (!probe || (needPrimary ? probe.key !== source.key : probe.side === source.side || probe.n !== n2)) {
        if (on)
          return say(
            '断电后移表笔。' + (needPrimary ? '先测原线圈电压。' : '保留已读的原线圈电压，改测副线圈。'),
            rig.power,
          );
        const side = needPrimary ? source.side : other(source.side);
        return say(
          needPrimary
            ? '两支表笔分别接到电源所接的两柱，测原线圈。'
            : '原线圈已读 ' + primaryRead.v.toFixed(2) + ' V。把表笔移到另一绕组的 0 和 ' + n2 + ' 匝柱。',
          leads[leads[3].side === side ? 2 : 3].obj,
        );
      }
      if (sampled !== sampleKey()) {
        if (meter.stop !== 3) return say('先把表面选择开关转到 50 V ~ 大量程。可以点表盘近看。', meter.selector);
        if (!on) return say('接线已就绪。点 3 V 交流电源开关，观察大量程上的偏转。', rig.power);
        return say('观察大量程的表针，等指针稳定。', meter.face);
      }
      if (!on) return say('接通交流电源，观察刻度。', rig.power);
      const best = optimal(readings().meterV);
      if (meter.stop !== best) return say('按大量程的试测，转到 ' + AC_STOPS[best].label + ' 挡再读。', meter.selector);
      return say(view === 'meter' ? '沿指针点内圈的电压刻线。' : '点电表近看，沿指针点内圈的电压刻线。', meter.face);
    }
    function finishPlacement(i, leg) {
      if (i === 2) yoked = leg !== null;
      else seated[i] = leg;
      if (yoked && seated.every((n) => n !== null)) bar.done('core');
      guide();
    }
    function animate(i, destination, leg) {
      const obj = i === 2 ? yoke : coils[i].group;
      tween = { obj, start: obj.position.clone(), destination, i, leg, t: 0 };
    }
    function assembly(i) {
      const obj = i === 2 ? yoke : coils[i].group,
        home = i === 2 ? rig.homeYoke : rig.homes[i];
      let original, moving, blocked;
      return {
        obj,
        plane: 'xz',
        offset: BASE_H + 0.018,
        enabled: () => view !== 'meter' && !tween && !bar.finished,
        hint: i === 2 ? '拖动横铁轭' : '将线圈套到铁芯柱上，点一下近看',
        onStart() {
          original = obj.position.clone();
          moving = blocked = false;
        },
        onDrag(p, start) {
          if (!start) return;
          if (on || (i !== 2 && yoked) || (i === 2 && seated.includes(null))) {
            blocked = true;
            return say(on ? '先断开电源。' : i === 2 ? '先套上两个绕组。' : '先提走铁轭，才能取下线圈。');
          }
          if (i < 2 && leads.some((l) => l.side === i)) {
            blocked = true;
            return say('先拔下这个线圈上的接线，再取下绕组。');
          }
          moving = true;
          const d = Math.hypot(p.x - start.x, p.z - start.z);
          const lift = Math.min(1, d / 0.018);
          obj.position.y = THREE.MathUtils.lerp(original.y, LEG_TOP + 0.012, lift);
          const slide = clamp((d - 0.018) / 0.035, 0, 1);
          obj.position.x = THREE.MathUtils.lerp(original.x, p.x, slide);
          obj.position.z = THREE.MathUtils.lerp(original.z, p.z, slide);
        },
        onEnd(moved) {
          if (!moved || !moving || blocked) return;
          if (i === 2) {
            const fits = Math.abs(obj.position.x - mid) < 0.043 && Math.abs(obj.position.z - CORE_Z) < 0.04;
            animate(i, fits ? new THREE.Vector3(mid, LEG_TOP, CORE_Z) : home.clone(), fits ? 0 : null);
          } else {
            const leg = LEGS.findIndex(
              (x, k) => Math.hypot(obj.position.x - x, obj.position.z - CORE_Z) < 0.047 && seated[other(i)] !== k,
            );
            animate(i, leg < 0 ? home.clone() : new THREE.Vector3(LEGS[leg], BASE_H, CORE_Z), leg < 0 ? null : leg);
          }
        },
        onTap() {
          if (!view) close('core');
          else guide();
        },
      };
    }
    function nearest(p) {
      let hit = null,
        distance = 0.02;
      for (let side = 0; side < 2; side++)
        for (const turns of TAP_TURNS) {
          const point = rig.tap(side, turns),
            d = Math.hypot(point.x - p.x, point.z - p.z);
          if (d < distance) {
            distance = d;
            hit = { side, turns, point };
          }
        }
      return hit;
    }
    function wire(i) {
      const l = leads[i];
      let moved;
      return {
        obj: l.obj,
        plane: 'xz',
        offset: 0.04,
        enabled: () => yoked && view !== 'meter' && !bar.finished,
        hint: i < 2 ? '拖动交流电源插头' : '拖动绝缘表笔到抽头',
        onStart() {
          moved = false;
        },
        onDrag(p) {
          if (on) {
            return say('先断开电源，再改接线。', rig.power);
          }
          moved = true;
          l.side = l.turns = null;
          l.obj.position.set(clamp(p.x, -0.31, 0.23), 0.073, clamp(p.z, -0.14, 0.16));
          rig.drawLead(i);
        },
        onEnd() {
          if (!moved) return;
          const hit = nearest(l.obj.position);
          if (hit) {
            l.side = hit.side;
            l.turns = hit.turns;
            l.obj.position.copy(hit.point);
            // 表笔尖接触柱的前沿，让插头和绝缘柄各有空间。
            if (i >= 2) {
              l.obj.position.z += 0.0035;
              l.obj.position.y -= 0.002;
            }
          } else l.obj.position.y = 0.002;
          rig.drawLead(i);
          wellTime = 0;
          guide();
        },
      };
    }
    function toggle() {
      if (on) {
        on = false;
        guide();
        return;
      }
      if (!yoked) return say('先装好绕组并合上铁轭。', yoke);
      if (!pair(0)) return say('电源两根线应接在同一个绕组的不同抽头上。');
      if (!meter.stop) return say('先把多用电表拨到交流电压挡。', meter.selector);
      on = true;
      wellTime = 0;

      guide();
    }
    function setRange(n) {
      if (n === meter.stop) return;
      meter.setStop(n);
      if (n === 0) wellTime = 0;
      guide();
    }
    function read(ray) {
      if (bar.finished || !goal()) return guide();
      const hit = ray.intersectObject(meter.face, false)[0];
      if (!hit) return;
      const pos = meter.group.worldToLocal(hit.point.clone());
      if (Math.hypot(pos.x - meter.selector.position.x, pos.z - meter.selector.position.z) < 0.033) {
        setRange(meter.pickStop(pos));
        return;
      }
      const s = meter.pickScale(pos);
      if (!s) return;
      if (s.scale !== 'ac') return say('读内圈 V ~ 刻度；外圈用于测电阻。');
      if (!on || !pair(2) || sampled !== sampleKey()) return guide();
      const v = readings().meterV;
      if (meter.stop !== optimal(v)) return guide();
      if (Math.abs(s.fraction - meter.display) > 0.016 || Math.abs(meter.display - meter.fraction) > 0.009)
        return say('等表针稳定，从针尖沿内圈读刻度。');
      const measured = Math.round(s.fraction * AC_STOPS[meter.stop].range * 100) / 100;
      const src = pair(0),
        probe = pair(2);
      if (src.key === probe.key) {
        primaryRead = { key: src.key, v: measured };
        leave();
        return say('原线圈读到 ' + measured.toFixed(2) + ' V。断电后移表笔，到副线圈读数。', rig.power);
      }
      if (probe.side === src.side || primaryRead?.key !== src.key) return guide();
      const key = src.n + '/' + probe.n;
      if (recorded.has(key)) return say('这对匝数已记录。断电后换到下一组抽头。', rig.power);
      recorded.set(key, measured);
      rows.add([
        src.n,
        primaryRead.v.toFixed(2),
        probe.n,
        measured.toFixed(2),
        (probe.n / src.n).toFixed(2),
        (measured / primaryRead.v).toFixed(2),
      ]);
      bar.done('voltage');
      if (trials.slice(0, 3).every(([a, b]) => recorded.has(a + '/' + b))) bar.done('secondary');
      const next = goal();
      if (!next) comparison.hidden = false;
      leave();
      if (next) {
        const progress = trials.filter(([a, b]) => recorded.has(a + '/' + b)).length;
        const change =
          next[0] === src.n
            ? '保持原线圈 ' + src.n + ' 匝，断电，把副线圈表笔改接 ' + next[1] + ' 匝。'
            : '断电，原线圈改接 ' + next[0] + ' 匝，副线圈测 ' + next[1] + ' 匝。';
        say('副电压 ' + measured.toFixed(2) + ' V，已记 ' + progress + '/5 组。' + change, rig.power);
      }
    }
    const manip = draggable(
      group,
      [
        ...coils.map((_, i) => assembly(i)),
        assembly(2),
        ...leads.map((_, i) => wire(i)),
        {
          obj: meter.selector,
          plane: 'xz',
          offset: meter.selector.position.y,
          hint: '转动交流电压量程开关',
          onDrag(p) {
            setRange(meter.pickStop(meter.group.worldToLocal(group.localToWorld(p.clone()))));
          },
          onTap() {
            if (view !== 'meter') close('meter');
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.power, hint: '接通或断开低压交流电源', onTap: toggle },
          {
            obj: meter.face,
            hint: '近看表盘和量程',
            onTap(ray) {
              if (view === 'meter') read(ray);
              else close('meter');
            },
          },
        ],
      },
    );
    function reset() {
      if (view) leave();
      on = yoked = false;
      seated = [null, null];
      primaryRead = tween = sampled = null;
      wellTime = 0;
      recorded.clear();
      rows?.clear();
      if (comparison) comparison.hidden = true;
      coils.forEach((c, i) => c.group.position.copy(rig.homes[i]));
      yoke.position.copy(rig.homeYoke);
      leads.forEach((l, i) => {
        l.obj.position.copy(l.home);
        l.side = l.turns = null;
        rig.drawLead(i);
      });
      meter.setStop(0);
      meter.fraction = meter.display = 0;
      bar.undo('core', 'voltage', 'secondary', 'primary');
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.65, h: 0.145, d: 0.38 },
      view: { azim: 6, elev: 40, margin: 1.05 },
      toggles: ['steps'],
      pointer: {
        ...manip,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return manip.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['N₁', 'U₁ / V', 'N₂', 'U₂ / V', 'N₂/N₁', 'U₂/U₁']);
        const conclude = (correct) => {
          if (goal()) return;
          if (on) return say('先点电源开关断电，再比较两组数据。', rig.power);
          if (!correct) return say('对照 200 匝接 400 匝和 400 匝接 200 匝两行：哪一组副电压较大？');
          bar.done('primary');
          comparison.hidden = true;
          guide();
        };
        comparison = h(
          'div',
          {},
          note('对照记录，副电压与原电压之比接近哪个匝数比？'),
          buttons([
            { text: '副匝数 / 原匝数', onClick: () => conclude(true) },
            { text: '原匝数 / 副匝数', onClick: () => conclude(false) },
          ]).el,
        );
        comparison.hidden = true;
        panel.data.append(rows.el, comparison);
        panel.notes.append(
          note(
            '两绕组均有 0、100、200、400 匝抽头，接入两抽头之间的匝数取差。3 V、50 Hz 正弦交流电源。电压挡读内圈 0–10，满度为所选量程。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (tween) {
          const t = tween;
          t.t = Math.min(1, t.t + dt / 0.3);
          // 在柱顶上方对正方孔，再沿柱落下。
          const across = Math.min(1, t.t * 2);
          const down = Math.max(0, t.t * 2 - 1);
          t.obj.position.lerpVectors(t.start, t.destination, across);
          t.obj.position.y = THREE.MathUtils.lerp(t.start.y, t.destination.y, down);
          if (t.t === 1) {
            tween = null;
            finishPlacement(t.i, t.leg);
          }
        }
        rig.power.rotation.x = on ? -0.24 : 0;
        rig.indicator.material.color.setHex(on ? 0x70bc74 : 0x394d42);
        const value = readings().meterV;
        meter.fraction = meter.stop ? value / AC_STOPS[meter.stop].range : 0;
        meter.update(dt);
        if (on && pair(2) && meter.stop === 3 && sampled !== sampleKey()) {
          wellTime += dt;
          if (wellTime >= 0.6 && Math.abs(meter.display - meter.fraction) < 0.01) {
            sampled = sampleKey();
            guide();
          }
        }
      },
      dispose() {
        manip.dispose();
        bar.dispose();
        meter.dispose();
      },
    };
  },
};
