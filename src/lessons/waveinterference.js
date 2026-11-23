import * as THREE from 'three';
import { InterferenceTank } from './kit/interferenceTank.js';
import { interferenceRig } from './kit/interferenceRig.js';
import { WATER } from './kit/rippleRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, note, table, chart } from './kit/ui.js';

export default {
  id: 'waveinterference',
  fig: '图3.4-2',
  title: '观察水波的干涉',
  stampText: '观察',
  predict: {
    q: '两根同步振动的杆激起水波。在一处持续较平静的区域抬起一根杆，那里的振动可能怎样变化？',
    options: ['反而增强', '一定减弱', '始终不变'],
    answer: 0,
    hint: '比较同一位置在多个周期内的起伏。',
  },
  conclusion: {
    page: 79, rect: [63.76, 361.5, 378.76, 426.4],
    quote: '这两列波相遇后，在它们重叠的区域形成如图3.4-2所示的图样：水面上出现了一条条相对平静的区域和激烈振动的区域，这两类区域在水面上的位置是稳定的。',
    why: '波峰与波峰、波谷与波谷相遇时振动增强；相遇的两列波位移方向相反时，合位移可减小。减弱区不等于没有波传来。抬起一根杆，原来两列波相消的位置反而可能振动更明显。单张平坦的水面截图不能证明该处持续振动弱。',
    src: '课本第 75 页 · 第三章 第4节 波的干涉',
  },
  create(ctx) {
    const tank = new InterferenceTank(),
      rig = interferenceRig(tank),
      { group } = rig;
    const reference = new THREE.Mesh(
      new THREE.TorusGeometry(0.005, 0.0005, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0x656c5b }),
    );
    reference.rotation.x = -Math.PI / 2;
    reference.position.y = WATER + 0.001;
    reference.visible = false;
    group.add(reference);
    let on = false,
      near = false,
      settling = false,
      changedAt = 0,
      capture = null,
      live = [],
      weak = null,
      strong = null,
      single = null,
      point,
      origin,
      originalLift,
      ui,
      rows,
      plot;
    const records = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'source',
          title: '同步双源',
          todo: '开振源，观察同一振动片上的两根杆。',
          target: () => (near ? null : on ? rig.rods.find((_, i) => !tank.active[i]) : rig.knob),
        },
        { id: 'contrast', title: '比较两处起伏', todo: '选择两处水面，分别连续记录五个周期。' },
        {
          id: 'single',
          title: '同位置抬杆对照',
          todo: '保持较弱位置，提起一根杆后再记录。',
          target: () => (near ? null : rig.rods[1]),
        },
        {
          id: 'restore',
          title: '放回杆复测',
          todo: '把杆放回水中，在原位置重新记录。',
          target: () => (near ? null : rig.rods.find((_, i) => !tank.active[i])),
        },
      ],
    });
    const mode = () => tank.active.filter(Boolean).length;
    const stable = () => on && tank.time - changedAt >= 3;
    const samePoint = () => weak && Math.hypot(rig.marker.position.x - weak.x, rig.marker.position.z - weak.z) < 0.004;
    const condition = () =>
      mode() === 2 ? '两杆入水' : mode() === 1 ? (tank.active[0] ? '仅左杆入水' : '仅右杆入水') : '两杆抬起';
    const rms = (s) => Math.sqrt(s.reduce((sum, p) => sum + p[1] ** 2, 0) / s.length);
    function guide() {
      if (capture) return bar.say('正在记录 P 的连续起伏，约五个周期。保持标记和入水杆不动。');
      if (near === 'trace') return bar.say('这里显示 P 原位置的连续起伏，横向约 1 s。回全景后可移动 P 或提放细杆。');
      if (!on) return bar.say('点槽后红开关。停止驱动后，已经发出的水波仍会传播、衰减。');
      if (!mode()) return bar.say('两根杆都离开了水面。把至少一根杆向下放回水中。');
      if (!stable()) return bar.say('条件刚改变，等已有波纹传播过去，再比较持续的起伏。');
      if (!bar.has('source')) return bar.say('让两根杆都入水，共用振动片同步拍水，再观察重叠的波纹。');
      if (bar.finished) return bar.say('同一位置已经做了双源、单源、恢复双源三次对照。笔记本保留了实际起伏曲线。');
      if (bar.current === 'contrast') {
        if (mode() !== 2) return bar.say('先把两根杆都放回水面，比较双源时不同位置的起伏。');
        return bar.say(
          near
            ? '点水面或拖红环移动 P；再点红环，记录约五个周期。沿波纹找起伏明显不同的另一处。'
            : '点水面近看。用红环 P 选择位置，再点红环连续记录起伏。',
        );
      }
      if (!samePoint()) return bar.say('把红环 P 拖回留下的灰色圆环，保持同一水面位置再对照。');
      if (bar.current === 'single')
        return bar.say(
          mode() === 2
            ? (near ? '回到全景，' : '') + '把一根细杆的棕色圆柄向上提，保留另一根杆入水。'
            : 'P 仍在原来较弱的位置。点红环记录，看抬杆后起伏是否反而增强。',
        );
      return bar.say(
        mode() === 1
          ? (near ? '回到全景，' : '') + '把提起的杆向下放回，再在原来 P 处记录。'
          : '两根杆已恢复入水。点红环记录，检验原位置是否又变得较平静。',
      );
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function cancel() {
      capture = null;
      live = [];
    }
    function toggle() {
      enter();
      on = !on;
      settling = true;
      changedAt = tank.time;
      cancel();
      guide();
    }
    function setRod(i, active) {
      if (tank.active[i] === active) return;
      tank.active[i] = active;
      changedAt = tank.time;
      settling = true;
      cancel();
      rig.animate();
      guide();
    }
    function inspect() {
      near = 'water';
      bar.near(true);
      ctx.look([0, WATER, 0.025], [0, 1, 0.025], ctx.camera.aspect < 1 ? 0.72 : 0.5, leave);
      guide();
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function locate(p) {
      enter();
      rig.marker.position.x = clamp(p.x, -0.12, 0.12);
      rig.marker.position.z = clamp(p.z, 0.02, 0.1);
      cancel();
      guide();
    }
    function record() {
      enter();
      if (capture || !on || !stable() || !mode()) return guide();
      capture = {
        x: rig.marker.position.x,
        z: rig.marker.position.z,
        active: [...tank.active],
        label: condition(),
        start: tank.time,
        samples: [],
      };
      guide();
    }
    function finish() {
      const r = capture,
        previousStep = bar.current;
      capture = null;
      r.rms = rms(r.samples);
      records.push(r);
      rows.el.hidden = false;
      rows.add([
        String(records.length),
        r.label,
        String(Math.round(r.x * 1000)) + ', ' + Math.round(r.z * 1000),
        r.rms.toFixed(4),
      ]);
      if (!bar.has('contrast') && r.active.every(Boolean)) {
        for (const old of records) {
          if (old === r || !old.active.every(Boolean) || Math.hypot(old.x - r.x, old.z - r.z) < 0.012) continue;
          const lo = old.rms < r.rms ? old : r,
            hi = old.rms < r.rms ? r : old;
          if (hi.rms > 0.004 && lo.rms / hi.rms < 0.45) {
            weak = lo;
            strong = hi;
            bar.done('contrast');
            reference.position.x = lo.x;
            reference.position.z = lo.z;
            reference.visible = true;
            break;
          }
        }
      } else if (weak && samePoint() && mode() === 1 && r.rms > weak.rms * 1.4) {
        single = r;
        bar.done('single');
      } else if (bar.has('single') && samePoint() && mode() === 2 && r.rms < single.rms * 0.6) bar.done('restore');
      plot.el.hidden = false;
      const selected = bar.has('contrast')
        ? [strong, weak, single, r].filter((s, i, a) => s && a.indexOf(s) === i)
        : records.slice(-3);
      plot.series = selected.map((r, i) => ({
        color: ['#9e704e', '#27636c', '#735887', '#474f59'][i % 4],
        points: r.samples,
      }));
      plot.el.querySelector('.note').textContent =
        selected
          .map((r, i) => ['赭色', '蓝绿', '紫色', '深灰'][i] + '：记录 ' + (records.indexOf(r) + 1) + ' ' + r.label)
          .join('；') + '。横向为时间，纵向为归一波高，保持同一尺度。';
      plot.draw();
      guide();
      if (previousStep === 'contrast' && bar.has('contrast'))
        bar.say(
          '两处起伏为 ' +
            strong.rms.toFixed(4) +
            '、' +
            weak.rms.toFixed(4) +
            '（归一）。灰环留下较弱位置。' +
            (samePoint() ? '保持 P，回全景提起一根杆。' : '把 P 移回灰环，再回全景提起一根杆。'),
        );
      else if (previousStep === 'single' && bar.has('single'))
        bar.say(
          '同一 P 处由 ' +
            weak.rms.toFixed(4) +
            ' 增到 ' +
            single.rms.toFixed(4) +
            '，抬杆后反而增强。回全景放回杆，再在原处记录。',
        );
      else if (previousStep === 'restore' && bar.has('restore'))
        bar.say('恢复双杆后，原处起伏降到 ' + r.rms.toFixed(4) + '（归一）。三次曲线已保留，可在笔记本对照。');
      else if (bar.current === 'contrast')
        bar.say(
          '已记录起伏 ' + r.rms.toFixed(4) + '（归一均方根）。再沿水面找起伏明显不同的一处，不能只看此刻是否平坦。',
        );
      else if (bar.current === 'single' && mode() === 1 && samePoint())
        bar.say('此处抬杆后的起伏没有明显增强。可放回双杆，在更明显的减弱带重新选择比较位置。');
    }
    tank.onStep = () => {
      const h = tank.sample(rig.marker.position.x, rig.marker.position.z);
      live.push([tank.time, h]);
      while (live.length && tank.time - live[0][0] > 1.01) live.shift();
      if (capture) {
        capture.samples.push([tank.time - capture.start, h]);
        if (tank.time - capture.start >= 1) finish();
      }
    };
    const pointer = draggable(
      group,
      [
        ...rig.rods.map((rod, i) => ({
          obj: rod,
          plane: 'xy',
          offset: -0.06,
          enabled: () => !near,
          hint: '上下拖圆柄，提起或放回细杆',
          onStart(p) {
            origin = p?.y;
            originalLift = rod.userData.lift;
          },
          onDrag(p) {
            if (origin === undefined) return;
            rod.userData.lift = clamp(originalLift + p.y - origin, 0, 0.029);
            setRod(i, rod.userData.lift <= 0.0035);
            rig.animate();
          },
          onEnd() {
            rod.userData.lift = rod.userData.lift < 0.0145 ? 0 : 0.029;
            setRod(i, rod.userData.lift === 0);
            rig.animate();
          },
        })),
        {
          obj: rig.marker,
          plane: 'xz',
          offset: WATER + 0.002,
          hint: '拖动 P 选位置；点红环记录五个周期',
          onDrag: locate,
          onTap: record,
        },
        {
          obj: rig.water,
          plane: 'xz',
          offset: WATER,
          hint: '近看或选择水面位置',
          onStart(p) {
            point = p?.clone();
          },
          onTap() {
            if (near !== 'water') inspect();
            else if (point) locate(point);
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.knob, hint: '开关同步振源', onTap: toggle },
          {
            obj: rig.screen,
            hint: '近看 P 的起伏记录',
            onTap() {
              near = 'trace';
              bar.near(true);
              ctx.look([0, 0.0265, 0.19], [0, 1, 0.025], ctx.camera.aspect < 1 ? 0.52 : 0.26, leave);
              guide();
            },
          },
        ],
      },
    );
    function reset() {
      on = settling = false;
      tank.clear();
      tank.active = [true, true];
      rig.rods.forEach((r) => (r.userData.lift = 0));
      changedAt = 0;
      cancel();
      weak = strong = single = null;
      reference.visible = false;
      records.length = 0;
      rows.clear();
      rows.el.hidden = plot.el.hidden = true;
      plot.series = [];
      rig.marker.position.set(0, WATER + 0.002, 0.065);
      bar.undo('source', 'contrast', 'single', 'restore');
      rig.animate();
      leave();
    }
    rig.animate();
    rig.drawTrace([], '水面 P · 归一波高');
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.56, d: 0.49, h: 0.125 },
      view: { elev: 49, azim: -6, margin: 1.06, lookY: 0.4 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['记录', '入水杆', 'P 位置 x,z / mm', '波高均方根']);
        plot = chart({
          x: { label: 't / s', min: 0, max: 1.05 },
          y: { label: '归一波高', min: -0.06, max: 0.06 },
          legend: '曲线记录约五个周期，不是单张波纹照片。记录值仅用于相同模型下比较起伏，不代表实际水面毫米高度。',
        });
        rows.el.hidden = plot.el.hidden = true;
        ui.data.append(rows.el, plot.el);
        ui.notes.append(
          note(
            '两根杆由同一振动片驱动，频率均为 5 Hz、相位差为零。模型波速 0.16 m/s、源间距 90 mm；水面起伏与明暗放大显示。红环与记录屏是观察辅助。点水面可选择 P，记录一次持续约 1 s。',
          ),
          buttons([
            {
              text: '重新寻找两处对照点',
              onClick() {
                weak = strong = single = null;
                reference.visible = false;
                records.length = 0;
                rows.clear();
                rows.el.hidden = plot.el.hidden = true;
                bar.undo('contrast', 'single', 'restore');
                cancel();
                guide();
              },
            },
            { text: '全部重做', onClick: reset },
          ]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const before = stable();
        if (on || settling) {
          tank.advance(dt, on);
          rig.animate();
          if (on && stable() && mode() === 2 && !bar.has('source')) bar.done('source');
          if (!before && stable()) guide();
          if (
            !on &&
            !tank.surface.some((h) => Math.abs(h) > 0.0001) &&
            !tank.previous.some((h) => Math.abs(h) > 0.0001)
          ) {
            settling = false;
          }
        }
        const values = capture ? capture.samples : live.map(([t, h]) => [t - (live[0]?.[0] || 0), h]);
        rig.drawTrace(values, (on ? condition() : tank.time > 0 ? '停振后' : '振源未开') + ' · P 归一波高', !!capture);
      },
      dispose() {
        tank.onStep = null;
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
