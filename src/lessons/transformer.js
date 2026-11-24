// 可拆变压器：接线决定原、副绕组；指针是当前所接两抽头间的交流有效值。
import * as THREE from 'three';
import { transformerRig, AC_STOPS, LEGS, CORE_Z, LEG_TOP, BASE_H } from './kit/transformerRig.js';
import { transformerReadings, TAP_TURNS } from './kit/transformer.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';

import { transformerNotebook } from './kit/transformerNotebook.js';
import { qaFlow } from './kit/chemlesson.js';

const mid = (LEGS[0] + LEGS[1]) / 2;
const point = (x, y, z) => new THREE.Vector3(x, y, z);
const titles = { plan: '定方案', core: '装铁芯', secondary: '固定原匝数', primary: '固定副匝数' };
export default {
  id: 'transformer',
  fig: '图3.3-2',
  title: '探究变压器原、副线圈电压与匝数的关系',
  stampText: '探究',
  predict: {
    q: '原线圈接同一低压交流电源，原线圈匝数不变，把副线圈的有效匝数增加一倍，副线圈的电压会怎样？',
    options: ['约为原来的两倍', '约为原来的一半', '保持不变'],
    answer: 0,
    hint: '变压器原、副线圈两端的电压与线圈匝数之间有什么关系？',
  },
  conclusion: {
    page: 64,
    rect: [217.04, 329.12, 531.48, 421.9],
    quote: '实验和理论分析都表明，理想变压器原、副线圈的电压之比，等于原、副线圈的匝数之比……',
    why: '共同的交变磁通在各匝中产生感应电动势。匝数越多，感应电动势越大。实际读数受绕组电阻、漏磁和电表负载影响。',
    src: '课本第 60 页 · 第三章 第3节 变压器',
  },
  create(ctx) {
    const rig = transformerRig(),
      { group, coils, yoke, meter, leads } = rig;
    const parts = [...coils.map((c) => c.group), yoke];
    const homes = [...rig.homes, rig.homeYoke];
    const seated = [null, null, null];
    const seat = (i, leg, lifted = false) =>
      point(
        i === 2 ? mid : LEGS[leg],
        i === 2 || lifted ? LEG_TOP + (lifted && i !== 2 ? 0.003 : 0) : BASE_H,
        CORE_Z,
      );
    let ui, book, aim, ray, returning, cancel, primaryRead;
    let trials = [],
      index = 0,
      on = false,
      checked = false,
      sampled = false,
      near = false,
      stable = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: Object.keys(titles).map((id) => ({
        id,
        title: titles[id],
        todo: titles[id],
        target: () => aim,
      })),
    });
    function pick(parent, w, h, d, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
      mesh.userData.pick = true;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    const partsPick = parts.map((o, i) =>
      i === 2 ? pick(o, 0.15, 0.021, 0.03, 0, 0.01, 0) : pick(o, 0.068, 0.061, 0.095, 0, 0.03, 0.014),
    );
    const plugs = leads.map((l, i) =>
      i < 2
        ? pick(l.obj, 0.014, 0.019, 0.016, 0, 0.009, 0)
        : l.obj.children[0].children.find((o) => o.userData.pick),
    );
    const dial = AC_STOPS.map((s, i) => {
      const a = -Math.PI * 0.66 + (i * Math.PI) / 2;
      return pick(meter.group, 0.018, 0.002, 0.012, 0.0315 * Math.sin(a), 0.019, 0.0365 - 0.0315 * Math.cos(a));
    });
    function pair(i) {
      const a = leads[i],
        b = leads[i + 1];
      if (a.side === null || a.side !== b.side || a.turns === b.turns) return null;
      const lo = Math.min(a.turns, b.turns),
        hi = Math.max(a.turns, b.turns);
      return { side: a.side, lo, hi, n: hi - lo, key: [a.side, lo, hi].join('/') };
    }
    function readings() {
      const p = pair(0),
        v = pair(2),
        same = p && v && p.side === v.side;
      return transformerReadings({
        primary: p?.n || 0,
        secondary: v?.n || 0,
        energized: on,
        coreClosed: seated[2] !== null,
        meterSide: v && meter.stop ? (same ? 'primary' : 'secondary') : null,
        range: AC_STOPS[meter.stop].range || 50,
        meterTurns: v?.n || 0,
        overlapTurns: same ? Math.max(0, Math.min(p.hi, v.hi) - Math.max(p.lo, v.lo)) : 0,
      });
    }
    const needPrimary = () => !primaryRead || primaryRead.key !== pair(0)?.key;
    const best = () => AC_STOPS.findIndex((s) => s.range >= readings().meterV);
    function matchesPlan() {
      const src = pair(0),
        v = pair(2),
        trial = trials[index];
      return !!(
        trial &&
        src &&
        v &&
        src.n === trial[0] &&
        (needPrimary() ? src.key === v.key : v.side !== src.side && v.n === trial[1])
      );
    }
    function nextLead(start, side, n) {
      const a = leads[start],
        b = leads[start + 1];
      const correct = (l) => l.side === side && (l.turns === 0 || l.turns === n);
      return leads[start + (correct(a) && (!correct(b) || a.turns === b.turns) ? 1 : 0)].obj;
    }
    function guidance() {
      if (!trials.length) return ['选首组副线圈匝数，估计副电压，把测量方案记在电路图旁。'];
      if (seated.includes(null)) {
        const i = seated.indexOf(null);
        return i === 2
          ? ['把横铁轭拖到两柱顶端，让铁芯闭合。', parts[i]]
          : ['把线圈的方孔对准空铁芯柱顶，再松手套下。', parts[i]];
      }
      if (index === trials.length)
        return on
          ? ['五组已记全。断开低压交流电源，再对照课本。', rig.power]
          : ['五组读数中，电压比都接近匝数比。掀开结论，对照理想变压器的关系式。'];
      const [n1, n2] = trials[index],
        src = pair(0),
        probe = pair(2);
      if (on && !matchesPlan()) return ['先断电，再按下一次测量的接法移线。', rig.power];
      if (!src || src.n !== n1) {
        const side = leads[0].side ?? leads[1].side ?? 0;
        return ['把两根电源线接到同一线圈的 0 和 ' + n1 + ' 匝柱。', nextLead(0, side, n1)];
      }
      const primary = needPrimary(),
        side = primary ? src.side : 1 - src.side,
        n = primary ? n1 : n2;
      const wired = primary ? probe?.key === src.key : probe?.side === side && probe.n === n;
      if (!wired)
        return [
          primary ? '把两支表笔并接在电源所接的两柱，测原电压。' : '把表笔接到副线圈的 0 和 ' + n2 + ' 匝柱。',
          nextLead(2, side, n),
        ];
      if (!checked) return ['对照电路图，逐根核对电源线和表笔，再确认。'];
      if (!on && meter.stop !== 3)
        return [
          near ? '点 50 V ~ 挡，先用最大量程试测。' : '点表面近看，选最大交流电压挡试测。',
          near ? meter.selector : meter.face,
        ];
      if (!on && near) return ['已选最大量程。回到全景，接通电源。'];
      if (!on) return ['核对完毕。接通 3 V 交流电源，看指针偏转。', rig.power];
      if (!sampled) return ['先看最大量程上的偏转，等指针稳定。', near ? null : meter.face];
      if (!near) return ['点表面近看，根据试测偏转选择合适量程。', meter.face];
      if (!meter.stop) return ['电表已关闭。选择交流电压挡，观察指针。'];
      if (readings().meterV > AC_STOPS[meter.stop].range) return ['指针超过满刻度。改用更大的交流电压挡。'];
      if (meter.stop !== best()) return ['指针偏转太小。点较小且不会超量程的交流电压挡。'];
      return ['读黑色内圈，按所选量程换算成伏，再记下读数。'];
    }
    function guide(prefix = '') {
      const [msg, target] = guidance();
      aim = target || null;
      bar.say(prefix + msg);
      if (!book) return;
      const [n1, n2] = trials[index] || trials[trials.length - 1] || [200, +book.first.value];
      const primary = needPrimary();
      book.fields({
        planning: !trials.length,
        check: !!trials[index] && leads.every((l) => l.side !== null) && !on && !checked,
        reading: near && on && sampled && meter.stop === best() && matchesPlan(),
        primary,
        finished: bar.finished,
        range: near && ctx.camera.aspect < 1 ? AC_STOPS[meter.stop].range : 0,
      });
      book.sketch(n1, n2, !!trials[index] && primary);
    }
    function warn(text, target) {
      aim = target || null;
      bar.say(text);
    }
    function leave() {
      if (near) ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function inspect() {
      if (near) return;
      near = true;
      bar.near(true);
      ui.fold(false);
      const portrait = ctx.camera.aspect < 1;
      ctx.look([0.155, 0.019, portrait ? -0.008 : -0.023], [0, 1, 0.015], 0.34, leave);
      guide();
    }
    function inspectScale() {
      if (near && on && sampled && meter.stop === best() && ctx.camera.aspect < 1)
        ctx.look([0.155, 0.019, -0.067], [0, 1, 0.015], 0.17, leave);
    }
    function plan(first) {
      if (trials.length) return;
      trials = [first, ...[100, 200, 400].filter((n) => n !== first)]
        .map((n) => [200, n])
        .concat([
          [100, 200],
          [400, 200],
        ]);
      book.planned(first);
      bar.done('plan');
      guide('先保持原线圈 200 匝。');
    }
    const hint = (enabled, text) => () => (ui?.step === 1 && enabled() ? text : '');
    // 拖动平面经过起点和柱顶（或接线柱）。抓住器材的哪一点，就一直从那一点跟手。
    function carried(obj, target, clearance = 0) {
      const origin = obj.position.clone(),
        dy = target.y - origin.y,
        dz = target.z + clearance - origin.z;
      const slope = Math.abs(dz) > 0.004 ? dy / dz : 0;
      const plane = new THREE.Plane()
        .setFromNormalAndCoplanarPoint(point(0, 1, -slope).normalize(), origin)
        .applyMatrix4(group.matrixWorld);
      function hit(surface) {
        const p = ray?.ray.intersectPlane(surface, new THREE.Vector3());
        return p && group.worldToLocal(p);
      }
      const start = hit(plane);
      const offset = start && origin.clone().sub(start);
      // 靠近铁芯前先提过柱顶，之后在柱顶上方平移，方孔边缘不会扫过铁柱。
      const top = new THREE.Plane(point(0, 1, 0), -(target.y - (offset?.y || 0))).applyMatrix4(group.matrixWorld);
      return (fallback) => {
        let p = hit(plane);
        if (clearance && p && offset && p.y + offset.y > target.y) p = hit(top);
        obj.position.copy(p && offset ? p.add(offset) : fallback);
        obj.position.clamp(point(-0.32, 0, -0.155), point(0.24, 0.18, 0.22));
      };
    }
    function settle(obj, to, done, draw, lower = false) {
      returning = { obj, from: obj.position.clone(), to, time: 0, done, draw, lower };
    }
    function assemble(i) {
      const obj = parts[i],
        enabled = () => !near && !returning && seated[i] === null;
      let move;
      return {
        obj: partsPick[i],
        anchor: obj,
        keepOffset: true,
        plane: 'xz',
        enabled,
        hint: hint(enabled, i === 2 ? '拖动：合上铁轭' : '拖动：套上线圈'),
        onStart() {
          move = carried(obj, seat(i, i === 2 ? 0 : i, true), i === 2 ? 0.09 : 0.05);
        },
        onDrag(p) {
          if (!trials.length && i !== 2) plan(+book.first.value);
          if (i === 2 && seated.slice(0, 2).includes(null)) return warn('先把两只线圈套到柱上，再合上铁轭。');
          move(p);
        },
        onEnd(moved) {
          if (!moved || obj.position.equals(homes[i])) return;
          const leg = [0, 1].find(
            (k) =>
              (i === 2 || !seated.slice(0, 2).includes(k)) && obj.position.distanceTo(seat(i, k, true)) < 0.018,
          );
          const fits = !cancel && leg !== undefined;
          settle(
            obj,
            fits ? seat(i, leg) : homes[i],
            () => {
              if (fits) seated[i] = leg;
              if (seated[2] !== null) bar.done('core');
              guide(fits ? (i === 2 ? '铁芯已闭合。' : '线圈已套稳。') : '没有对准柱顶，器材已放回。');
            },
            null,
            fits && i !== 2,
          );
        },
      };
    }
    function wire(i) {
      const l = leads[i],
        enabled = () => seated[2] !== null && !near && !returning && index < trials.length;
      let move, from;
      return {
        obj: plugs[i],
        anchor: l.obj,
        keepOffset: true,
        plane: 'xz',
        enabled,
        hint: hint(enabled, i < 2 ? '拖动：改接电源线' : '拖动：改接表笔'),
        onStart() {
          from = l.obj.position.clone();
          move = carried(l.obj, rig.tap(0, 0));
        },
        onDrag(p) {
          if (on) return warn('通电时不能碰接线柱。先断电，再改接。', rig.power);
          move(p);
          rig.drawLead(i);
        },
        onEnd(moved) {
          if (!moved || on || l.obj.position.equals(from)) return;
          let hit,
            distance = 0.016;
          for (let side = 0; side < 2; side++)
            for (const turns of TAP_TURNS) {
              const pos = rig.tap(side, turns),
                d = pos.distanceTo(l.obj.position);
              if (d < distance) {
                distance = d;
                hit = { side, turns, pos };
              }
            }
          if (!hit || cancel)
            return settle(
              l.obj,
              from,
              () => guide('没有碰到接线柱，已放回原处。'),
              () => rig.drawLead(i),
            );
          const mate = leads[i ^ 1];
          if (mate.side === hit.side && mate.turns === hit.turns)
            return settle(
              l.obj,
              from,
              () =>
                guide(i < 2 ? '两根电源线不能接同一柱，会造成短路。' : '两支表笔在同一柱，测不到线圈两端的电压。'),
              () => rig.drawLead(i),
            );
          const old = pair(0)?.key;
          l.side = hit.side;
          l.turns = hit.turns;
          l.obj.position.copy(hit.pos);
          if (i >= 2) l.obj.position.z += 0.004;
          if (old !== pair(0)?.key) primaryRead = null;
          checked = sampled = false;
          stable = 0;
          rig.drawLead(i);
          guide();
        },
      };
    }
    function confirm() {
      if (!matchesPlan()) return guide('接线与本次测量不符。');
      checked = true;
      guide('接线符合方案。');
    }
    function toggle() {
      if (on) {
        on = checked = sampled = false;
        stable = 0;
        if (index === trials.length) bar.done('primary');
        guide('电源已断开。');
        return;
      }
      if (!trials.length || seated[2] === null) return guide('电源保持断开。');
      if (!checked) return guide('尚未核对接线，电源保持断开。');
      if (meter.stop !== 3) return guide('先选最大量程，保护电表。');
      on = true;
      stable = 0;
      guide('指示灯亮了。');
    }
    function range(i) {
      if (on && !sampled && i !== 3) return warn('先在最大量程看清偏转，再换挡。');
      meter.setStop(i);
      if (!on && near && checked && i === 3) leave();
      else guide();
    }
    function submit(value) {
      if (!on || !near || !sampled || meter.stop !== best() || !matchesPlan()) return guide();
      const v = readings().meterV,
        full = AC_STOPS[meter.stop].range,
        div = full / 50;
      if (!Number.isFinite(value)) return warn('先填入读到的电压，单位是伏。');
      if (Math.abs(meter.display - meter.fraction) > 0.005) return warn('指针还在动，等它停稳再读。');
      if (Math.abs(value - v) > div * 0.51) {
        if (full !== 10 && Math.abs(value - (v * 10) / full) < 0.15)
          return warn('内圈刻度读对了。用刻度数乘以 ' + full + ' / 10，换算成伏。');
        return warn('读数偏' + (value > v ? '大' : '小') + '。看针尖经过的黑色刻线，每小格是 ' + div + ' V。');
      }
      if (needPrimary()) {
        primaryRead = { key: pair(0).key, value };
        leave();
        guide('原电压约 ' + value + ' V，已记下。');
        return;
      }
      const [n1, n2] = trials[index];
      book.add(n1, primaryRead.value, n2, value);
      index++;
      if (index === 3) bar.done('secondary');
      leave();
      if (index === trials.length) return guide('副匝数相同，原匝数越多，副电压越低。');
      const next = trials[index];
      const feedback = index === 3 ? '三组表明，副匝数越多，副电压越高。' : '本组副电压约 ' + value + ' V。';
      // 接线仍是刚测完的一组，先断电才能进行下一次改接。
      warn(
        feedback +
          '断电，' +
          (next[0] === n1
            ? '只把副线圈改接 ' + next[1] + ' 匝。'
            : '副线圈取 200 匝，原线圈改接 ' + next[0] + ' 匝。'),
        rig.power,
      );
    }
    const powerEnabled = () => !near && !bar.finished;
    const faceEnabled = () => !near && checked && matchesPlan();
    const selectorEnabled = () => near;
    const tip = ctx.tag('', 'pill');
    const hideTip = () => tip.loc(group, 0, -9, 0);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    const manip = draggable(
      group,
      [
        ...parts.map((_, i) => assemble(i)),
        ...leads.map((_, i) => wire(i)),
        {
          obj: meter.selector,
          plane: 'xz',
          offset: 0.022,
          enabled: selectorEnabled,
          hint: hint(selectorEnabled, '转动：选择量程'),
          onDrag(p) {
            range(meter.pickStop(meter.group.worldToLocal(group.localToWorld(p.clone()))));
          },
          onEnd: inspectScale,
        },
      ],
      {
        tip,
        taps: [
          {
            obj: rig.power,
            enabled: powerEnabled,
            hint: () => (ui?.step === 1 && powerEnabled() ? (on ? '点一下：断开电源' : '点一下：接通电源') : ''),
            onTap: toggle,
          },
          { obj: meter.face, enabled: faceEnabled, hint: hint(faceEnabled, '点一下：凑近读表'), onTap: inspect },
          ...dial.map((obj, i) => ({
            obj,
            enabled: selectorEnabled,
            hint: hint(selectorEnabled, '点一下：选择量程'),
            onTap() {
              range(i);
              inspectScale();
            },
          })),
        ],
      },
    );
    const pointer = {
      ...manip,
      down(r, e) {
        ray = r;
        return manip.down(r, e);
      },
      move(r, e) {
        ray = r;
        return manip.move(r, e);
      },
      up(r, e) {
        ray = r;
        cancel = e?.type === 'pointercancel';
        const consumed = manip.up(r, e);
        ray = null;
        cancel = false;
        return consumed;
      },
    };
    function reset() {
      if (near) ctx.back();
      near = checked = sampled = on = false;
      index = stable = 0;
      trials = [];
      primaryRead = returning = null;
      seated.fill(null);
      parts.forEach((o, i) => o.position.copy(homes[i]));
      leads.forEach((l, i) => {
        l.side = l.turns = null;
        l.obj.position.copy(l.home);
        rig.drawLead(i);
      });
      meter.setStop(0);
      meter.fraction = meter.display = 0;
      meter.update(1);
      bar.near(false);
      bar.undo(...Object.keys(titles));
      book?.clear();
      ui?.relock();
      guide();
    }
    function update(dt) {
      bar.update(dt);
      if (returning) {
        const r = returning,
          t = Math.min(1, (r.time += dt) / 0.36);
        if (r.lower) {
          r.obj.position.lerpVectors(r.from, r.to, Math.min(1, t * 4));
          r.obj.position.y = THREE.MathUtils.lerp(r.from.y, r.to.y, Math.max(0, (t - 0.25) / 0.75));
        } else r.obj.position.lerpVectors(r.from, r.to, t * (2 - t));
        r.draw?.();
        if (t === 1) {
          returning = null;
          r.done();
        }
      }
      rig.power.rotation.x = on ? -0.32 : 0.18;
      rig.indicator.material.color.setHex(on ? 0x72fa7a : 0x384749);
      rig.powerLabels.forEach((label, i) => (label.visible = i === Number(on)));
      meter.fraction = meter.stop ? readings().meterV / AC_STOPS[meter.stop].range : 0;
      meter.update(dt);
      if (
        on &&
        !sampled &&
        meter.stop === 3 &&
        Math.abs(meter.display - meter.fraction) < 0.006 &&
        (stable += dt) > 0.35
      ) {
        sampled = true;
        guide();
      }
    }
    reset();
    const qa = [];
    function action(name, run) {
      qa.push({ name, run });
    }
    function tap(name, obj, wait) {
      qa.push({ name, tap: obj, wait });
    }
    function drag(name, obj, to) {
      qa.push({ name, drag: obj, to });
    }
    function check(condition, message) {
      if (!condition) throw new Error(message);
    }
    function readTrial(primary, value, stop, wrong) {
      action('独立复核', () => {
        check(!book.review.el.hidden, '未能复核接线');
        book.review.btns[0].click();
      });
      tap('看量程', meter.face);
      tap('选最大交流挡', dial[3]);
      tap('接通低压电源', rig.power, 2.4);
      if (primary && wrong) {
        drag('通电时试移表笔', plugs[2], () => rig.tap(1, 0));
        action('带电接线保持原位', () => check(on && pair(0).key === pair(2).key, '带电时接线被改变'));
      }
      tap('近看试测偏转', meter.face);
      if (primary && wrong) {
        tap('试选过小量程', dial[1]);
        action('核对超量程', () => check(meter.fraction > 1 && book.form.hidden, '超量程仍可记录'));
      }
      tap('选合适量程', dial[stop]);
      function enter(n) {
        check(!book.form.hidden, '未出现读数栏');
        book.value.value = n;
        book.form.querySelector('button').click();
      }
      if (wrong)
        action('试一次错读', () => {
          enter(wrong);
          check(near && !book.form.hidden, '错读被记录');
        });
      action(primary ? '记下原电压' : '记下副电压', () => {
        enter(value);
        check(!near, '有效读数未被记录');
      });
      if (primary && wrong)
        action('原读数不能重复记为副电压', () => {
          check(
            !matchesPlan() && !faceEnabled() && book.form.hidden && book.record.rows.length === 0,
            '表笔未移却可以记录副电压',
          );
        });
      tap('断开电源', rig.power);
    }
    function connect(i, side, n) {
      drag('接到 ' + n + ' 匝柱', plugs[i], () => rig.tap(side, n));
    }
    action('记下实验方案', () => book.planner.querySelector('button').click());
    drag('试放在柱外', partsPick[0], point(-0.19, 0.06, 0.01));
    action('检查归位', () => check(parts[0].position.equals(homes[0]), '线圈未归位'));
    parts.forEach((o, i) => drag('装' + (i === 2 ? '铁轭' : '线圈'), partsPick[i], seat(i, i === 2 ? 0 : i, true)));
    connect(0, 0, 0);
    connect(1, 0, 200);
    connect(2, 0, 0);
    connect(3, 0, 200);
    tap('未经核对试合闸', rig.power);
    action('核对安全联锁', () => check(!on && !checked, '未经检查就通电'));
    readTrial(true, 3, 2, 8);
    connect(2, 1, 0);
    connect(3, 1, 100);
    readTrial(false, 1.48, 1, 5.9);
    connect(3, 1, 200);
    readTrial(false, 2.95, 2);
    connect(3, 1, 400);
    readTrial(false, 5.9, 2);
    for (const [n, v, stop] of [
      [100, 5.9, 2],
      [400, 1.48, 1],
    ]) {
      connect(1, 0, n);
      connect(2, 0, 0);
      connect(3, 0, n);
      readTrial(true, 3, 2);
      connect(2, 1, 0);
      connect(3, 1, 200);
      readTrial(false, v, stop);
    }
    action('检查五组记录', () =>
      check(!on && bar.finished && book.record.rows.length === 5, '五组数据或断电收尾不完整'),
    );
    return {
      group: new THREE.Group().add(group),
      pointer,
      reset,
      update,
      size: { w: 0.62, d: 0.38, h: 0.15 },
      view: { azim: 0, elev: 48, frameMargin: 1.01 },
      toggles: ['steps'],
      mount(panel) {
        ui = panel;
        const source = panel.el.querySelector('.answer .src');
        source.style.minHeight = '60px';
        source.style.paddingRight = '80px';
        book = transformerNotebook(panel, { plan, confirm, submit, reset });
        bar.attach({ ...panel, need: () => {} });
        guide();
      },
      debug: { bar, qa: qaFlow(pointer, qa) },
      dispose() {
        canvas.removeEventListener('pointerleave', hideTip);
        manip.dispose();
        bar.dispose();
        meter.dispose();
      },
    };
  },
};
