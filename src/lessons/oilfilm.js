// 同一支注射器标定单滴体积并滴到水面；油膜面积只从学生自己留下的轮廓取得。
import * as THREE from 'three';
import {
  oilFilmRig,
  STOCK_X,
  CUP_X,
  PAN_X,
  PAN_W,
  WATER_Y,
  PLATE_Y,
  BAG_HOME,
  STROKE,
  SYRINGE_ZERO,
} from './kit/oilFilmRig.js';
import {
  OIL_FRACTION,
  GRID,
  DROP_ML,
  pureOilPerDrop,
  filmOutline,
  polygonArea,
  countFilmSquares,
  molecularSizeNm,
} from './kit/oilFilm.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, h, table, note } from './kit/ui.js';

export default {
  id: 'oilfilm',
  fig: '图1.2-2',
  title: '用油膜法估测油酸分子的大小',
  stampText: '估测',
  predict: {
    q: '要用油膜面积估测分子大小，分子式 d = V/S 中的 V 应取哪个体积？',
    options: ['一滴溶液中纯油酸的体积', '整滴油酸酒精溶液的体积', '浅盘里水的体积'],
    answer: 0,
    hint: '溶液铺开后，酒精溶入水中并挥发。',
  },
  conclusion: {
    quote: '用一滴溶液中纯油酸的体积除以单层油膜的面积，可估测油酸分子的尺度。',
    why: '油酸亲水的一端朝向水，另一端朝外。把充分铺展的油酸近似为紧密排列的一层分子，所得厚度是分子尺度的估计。滴数、读数和轮廓的半格取舍都会影响结果。',
    src: '人教版高中物理选择性必修第三册第 7–9 页',
  },
  create(ctx) {
    const rig = oilFilmRig(),
      { group, syringe, plunger, scale, bag, plate } = rig;
    let ui, rows, calForm, answerForm, dropInput, pureInput, areaInput, sizeInput, calLabel, calibrationRecord, erasing, view, aim;
    let ml,
      target,
      grabbing,
      grabMl,
      residue,
      count,
      collected,
      startMl,
      endMl,
      pure,
      film,
      spread,
      origin,
      dirty,
      covered,
      trace,
      traced,
      markers,
      shakeAt,
      plateStart,
      moveStart;
    const falling = [];
    const stock = () => Math.abs(syringe.position.x - STOCK_X) < 0.016 && Math.abs(syringe.position.z) < 0.017;
    const cup = () => Math.abs(syringe.position.x - CUP_X) < 0.014 && Math.abs(syringe.position.z) < 0.014;
    const pan = () => Math.abs(syringe.position.x - PAN_X) < PAN_W / 2 && Math.abs(syringe.position.z) < PAN_W / 2;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'drop',
          title: '标定单滴',
          todo: '从溶液杯取液，读同一支注射器的刻度，在烧杯上方数滴。',
          target: () => aim,
        },
        { id: 'spread', title: '得到单层油膜', todo: '撒粉后向水面滴一滴，让油酸充分铺展。', target: () => aim },
        { id: 'trace', title: '描膜轮廓', todo: '把方格玻璃板盖在浅盘上，沿粉粒的边界描出轮廓。', target: () => aim },
        {
          id: 'size',
          title: '按格估测',
          todo: '数自己轮廓内的方格，用纯油酸体积和面积估算分子大小。',
          target: () => aim,
        },
      ],
    });
    const say = (s, obj) => {
      aim = obj;
      bar.say(s);
    };
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function near(v) {
      view = v;
      bar.near(true);
      if (v === 'syringe')
        ctx.look(
          [syringe.position.x, syringe.position.y + 0.046, syringe.position.z],
          [0, 0.07, 1],
          ctx.camera.aspect >= 1 ? 0.43 : 0.25,
          leave,
        );
      else ctx.look([PAN_X, PLATE_Y, 0], [0, 1, 0.02], ctx.camera.aspect >= 1 ? 0.8 : 0.43, leave);
      guide();
    }
    function guide() {
      if (bar.finished) return say('已记录单滴纯油酸体积、方格面积和估测的分子尺度。');
      if (!bar.has('drop')) {
        if (startMl === null) {
          if (ml < 0.24)
            return say(
              stock()
                ? '针尖浸在配好的溶液中。按住活塞顶端向上拉，吸取至少 0.24 mL；点针管可近看。'
                : '把针管夹头移回标有浓度的溶液杯，再拉活塞取液。',
              stock() ? plunger : syringe,
            );
          if (!cup()) return say('把针管夹头移到数滴烧杯上方。仍用这支注射器，先读活塞下端的起始刻度。', syringe);
          return say(view === 'syringe' ? '点与活塞下沿齐平的刻线，读出起始体积。' : '点针管近看，读起始刻度。', scale);
        }
        if (endMl === null)
          return say(
            count < 10
              ? '在烧杯上方按住活塞慢慢向下推，一滴脱落数一次。至少数 10 滴，松手即停。'
              : '已经有足够的滴数。松开活塞，点下沿对应的终止刻度。',
            count < 10 ? plunger : scale,
          );
        return say('展开笔记本，填自己数的滴数，并用两次刻度差和瓶上浓度算每滴纯油酸的体积。');
      }
      if (dirty) return say('这盘的油膜不能用于单滴测量。展开笔记本换清水，保留单滴标定。');
      if (!rig.powdered) return say('抓住台前粉袋，在浅盘水面前后、左右扫过，让粉粒分布在四周。', bag);
      if (!film) {
        if (ml + residue < DROP_ML) return say('剩余溶液不足一滴，把针尖移回溶液杯，向上拉活塞补液。', plunger);
        if (!pan()) return say('拖同一支针管的夹头到浅盘中部，远离盘边。', syringe);
        return say('缓推活塞，看到一滴脱离立即松手。观察粉粒怎样移向油膜边缘。', plunger);
      }
      if (spread < 1) return say('等油膜边缘停止扩展，再盖玻璃板。');
      if (!covered && !cup())
        return say((view === 'syringe' ? '回全景，' : '') + '把针管夹头移回数滴烧杯上方，给方格板腾出位置。', syringe);
      if (!covered) return say('把后架上的方格玻璃板拖到浅盘上，盖住水面。', plate);
      if (!traced)
        return say(
          view === 'plate'
            ? '按住玻璃板，沿清亮油膜与粉粒交界处绕一圈，回到起点。'
            : '点浅盘上的玻璃板俯视，沿油膜边界描线。',
          view === 'plate' ? null : plate,
        );
      return say('在自己的线内数 1 cm 方格。可逐排划过已数格子作记号，再展开笔记本填格数和大小。');
    }
    function clearCal() {
      startMl = endMl = pure = null;
      count = 0;
      if (calForm) {
        calForm.hidden = true;
        dropInput.value = pureInput.value = '';
        calibrationRecord.hidden = true;
      }
    }
    function newTray() {
      if (view) leave();
      film = origin = null;
      spread = 0;
      dirty = covered = traced = false;
      trace = [];
      markers = new Set();

      rig.resetTray();
      bag.position.copy(BAG_HOME);
      bar.undo('spread', 'trace', 'size');
      if (answerForm) {
        answerForm.hidden = true;
        areaInput.value = sizeInput.value = '';
      }
      guide();
    }
    function reset() {
      falling.forEach((d) => (d.mesh.visible = false));
      falling.length = 0;
      ml = target = residue = collected = 0;
      grabbing = false;
      clearCal();
      bar.undo('drop');
      rig.position(STOCK_X, 0.035, 0);
      rig.volume(ml);
      rig.cup.setLevel(0);
      rig.hanging.visible = false;
      rows?.clear();
      newTray();
    }
    function release() {
      let mesh = rig.drops.children.find((m) => !m.visible);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.00162, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xc6d0bf }),
        );
        rig.drops.add(mesh);
      }
      mesh.visible = true;
      mesh.position.copy(syringe.position);
      mesh.position.y -= 0.0016;
      falling.push({ mesh, t: 0, from: mesh.position.y, site: cup() ? 'cup' : 'pan' });
    }
    function land(d) {
      d.mesh.visible = false;
      if (d.site === 'cup') {
        collected += DROP_ML;
        rig.cup.setLevel(0.004 + (collected * 1e-6) / (Math.PI * rig.cup.inner ** 2));
        if (startMl !== null && endMl === null && !bar.has('drop')) count++;
        guide();
        return;
      }
      const x = d.mesh.position.x - PAN_X,
        z = d.mesh.position.z;
      if (film || !rig.powdered) dirty = true;
      origin = { x: origin ? (origin.x + x) / 2 : x, z: origin ? (origin.z + z) / 2 : z };
      film = filmOutline(origin.x, origin.z, DROP_ML * OIL_FRACTION * (dirty ? 2 : 1), origin.x * 10);
      if (film.some((p) => Math.abs(p.x) >= PAN_W / 2 || Math.abs(p.z) >= PAN_W / 2)) dirty = true;
      spread = 0;
      guide();
    }
    function readScale(ray) {
      if (view !== 'syringe') {
        near('syringe');
        return;
      }
      if (!cup() || bar.has('drop')) return guide();
      const hit = ray.intersectObject(scale, false)[0];
      if (!hit) return;
      const n = Math.round(((syringe.worldToLocal(hit.point.clone()).y - SYRINGE_ZERO) / STROKE) * 100) / 100;
      if (Math.abs(n - ml) > 0.012) return say('点活塞密封圈下端正对的刻度，每小格为 0.01 mL。', scale);
      if (startMl === null) {
        if (ml < 0.24) return guide();
        startMl = n;
        count = 0;
        guide();
        return;
      }
      if (count < 10 || falling.length) return say('等液滴确实落入杯中。至少数 10 滴，再读终止刻度。', plunger);
      endMl = n;
      calLabel.textContent =
        '同一支注射器从 ' +
        startMl.toFixed(2) +
        ' mL 读到 ' +
        endMl.toFixed(2) +
        ' mL。瓶上写着取 1.00 mL 油酸加酒精至总体积 500 mL。';
      calForm.hidden = false;
      guide();
    }
    function confirmCal() {
      if (endMl === null) return;
      if (dropInput.valueAsNumber !== count)
        return say('总滴数与落入烧杯的次数不符。可重新计数，从当前液面起再做一次。');
      const val = pureOilPerDrop(startMl, endMl, count);
      if (!val || !Number.isFinite(pureInput.valueAsNumber) || Math.abs(pureInput.valueAsNumber - val * 1000) > 0.002)
        return say('刻度差先除以滴数，再乘 1/500。1 mL 是 1000 μL。');
      pure = pureInput.valueAsNumber / 1000;
      calibrationRecord.textContent =
        startMl.toFixed(2) +
        ' → ' +
        endMl.toFixed(2) +
        ' mL，共 ' +
        count +
        ' 滴。每滴含纯油酸 ' +
        pureInput.value +
        ' μL。';
      calibrationRecord.hidden = false;
      bar.done('drop');
      calForm.hidden = true;
      if (view) leave();
      guide();
    }
    function confirmSize() {
      if (!traced) return;
      const n = areaInput.valueAsNumber,
        expected = countFilmSquares(trace);
      if (!Number.isInteger(n) || n < 1 || Math.abs(n - expected) > Math.max(2, 0.025 * expected))
        return say('沿描线逐排核对。整格计入，边缘超过半格的计一格；格子边长 1 cm。');
      const nm = molecularSizeNm(pure, n);
      if (!Number.isFinite(sizeInput.valueAsNumber) || Math.abs(sizeInput.valueAsNumber - nm) > 0.035)
        return say('用纯油酸体积除以面积，统一单位。1 μL = 10⁻⁹ m³，1 cm² = 10⁻⁴ m²。');

      rows.add([String(count), pureInput.value, String(n), sizeInput.value]);
      bar.done('size');
      answerForm.hidden = true;
      guide();
    }
    function finishTrace() {
      if (trace.length < 12 || Math.hypot(trace[0].x - trace.at(-1).x, trace[0].z - trace.at(-1).z) > 0.012)
        return say('可接着上次的线继续描，最后回到起点。');
      const bins = new Set();
      let offEdge = 0;
      const miss = trace.some((p) => {
        bins.add(
          Math.floor(
            (((Math.atan2(p.z - origin.z, p.x - origin.x) + Math.PI * 2) % (Math.PI * 2)) * 24) / (Math.PI * 2),
          ),
        );
        const error = Math.min(...film.map((q) => Math.hypot(q.x - p.x, q.z - p.z)));
        if (error > 0.008) offEdge++;
        return error > 0.016;
      });
      if (
        miss ||
        offEdge > trace.length * 0.1 ||
        bins.size < 18 ||
        Math.abs(polygonArea(trace) / polygonArea(film) - 1) > 0.14
      ) {
        trace = [];
        rig.grid();
        return say('这条线没有贴着油膜绕满一圈。沿粉粒内缘重新描。');
      }
      trace.push({ ...trace[0] });
      rig.grid(trace);
      traced = true;
      bar.done('trace');
      answerForm.hidden = false;
      guide();
    }
    function markPoint(p) {
      const x = p.x - PAN_X,
        z = p.z;
      if (traced) {
        const id = Math.floor(x / GRID) + '/' + Math.floor(z / GRID);
        if (erasing) markers.delete(id);
        else markers.add(id);
        rig.grid(trace, markers);
      } else if (!trace.length || Math.hypot(trace.at(-1).x - x, trace.at(-1).z - z) > 0.001) {
        trace.push({ x, z });
        rig.grid(trace);
      }
    }
    const manip = draggable(
      group,
      [
        {
          obj: rig.thumb,
          plane: 'xy',
          offset: 0,
          enabled: () => !covered && !bar.finished,
          hint: '拉活塞取液，缓推活塞滴液',
          onStart() {
            grabMl = ml;
            target = ml;
            grabbing = true;
          },
          onDrag(p, start) {
            if (!start) return;
            const next = clamp(grabMl + (p.y - start.y) / STROKE, 0, 1);
            if (next > ml && !stock()) return say('先把针尖浸入溶液，再向上拉。');
            if (next < ml) {
              if (!cup() && !pan()) return say('先把针尖移到烧杯或浅盘上方。');
              if (cup() && !bar.has('drop') && startMl === null) return say('先读起始刻度，再缓推活塞。', scale);
              if (pan() && (!rig.powdered || !bar.has('drop'))) return guide();
              if (endMl !== null && !bar.has('drop')) return say('先在笔记本记录这次滴数，或重新计数。');
            }
            target = next;
          },
          onEnd(moved) {
            grabbing = false;
            target = ml;
            if (moved) guide();
          },
          onTap() {
            if (view !== 'syringe') near('syringe');
          },
        },
        {
          obj: rig.clamp,
          plane: 'xz',
          offset: 0.1,
          enabled: () => view !== 'plate' && !covered && !bar.finished,
          hint: '移动夹头和同一支注射器',
          onStart() {
            moveStart = syringe.position.clone();
          },
          onDrag(p, start) {
            if (!start) return;
            if (startMl !== null && !bar.has('drop') && endMl === null)
              return say('这轮计数还在进行。先在烧杯上方读终止刻度。');
            const d = Math.hypot(p.x - start.x, p.z - start.z),
              slide = clamp((d - 0.009) / 0.017, 0, 1);
            rig.position(
              THREE.MathUtils.lerp(moveStart.x, clamp(p.x, STOCK_X - 0.01, PAN_X + 0.102), slide),
              THREE.MathUtils.lerp(moveStart.y, 0.078, Math.min(1, d / 0.009)),
              THREE.MathUtils.lerp(moveStart.z, clamp(p.z, -0.077, 0.087), slide),
            );
          },
          onEnd(moved) {
            if (!moved) return;
            if (stock()) rig.position(STOCK_X, 0.035, 0);
            else if (cup()) rig.position(CUP_X, 0.052, 0);
            else rig.position(syringe.position.x, 0.054, syringe.position.z);
            if (view === 'syringe') near('syringe');
            else guide();
          },
          onTap() {
            if (view !== 'syringe') near('syringe');
          },
        },
        {
          obj: bag,
          plane: 'xz',
          offset: WATER_Y + 0.023,
          enabled: () => bar.has('drop') && !film && !covered,
          hint: '抓住粉袋在水面来回轻拍',
          onStart() {
            shakeAt = null;
          },
          onDrag(p) {
            bag.position.set(p.x, WATER_Y + 0.023, p.z);
            if (!shakeAt || p.distanceTo(shakeAt) > 0.008) {
              rig.sprinkle(p.x - PAN_X, p.z);
              shakeAt = p.clone();
            }
          },
          onEnd(moved) {
            bag.position.copy(BAG_HOME);
            if (moved && !rig.powdered)
              say('水面四周已有 ' + rig.coverage + '/4 处撒上粉，向还裸露的位置再扫一下。', bag);
            else guide();
          },
        },
        {
          obj: plate,
          plane: 'xz',
          offset: PLATE_Y,
          enabled: () => !!film && !dirty && !bar.finished,
          hint: () => (covered ? '沿边描线或给数过的格子作记号' : '将玻璃板放到浅盘上'),
          onStart(p) {
            plateStart = plate.position.clone();
            if (covered && view === 'plate' && p) {
              const pt = { x: p.x - PAN_X, z: p.z };
              erasing = traced && markers.has(Math.floor(pt.x / GRID) + '/' + Math.floor(pt.z / GRID));
              if (!traced && trace.length && Math.hypot(pt.x - trace.at(-1).x, pt.z - trace.at(-1).z) > 0.014)
                trace = [];
              markPoint(p);
            }
          },
          onDrag(p, start) {
            if (!start) return;
            if (covered) {
              if (view === 'plate') markPoint(p);
              return;
            }
            if (spread < 1 || !cup()) return guide();
            const shift = p.z - start.z,
              u = clamp(shift / 0.15, 0, 1);
            plate.position.lerpVectors(plateStart, new THREE.Vector3(PAN_X, PLATE_Y, 0), u);
            plate.rotation.x = -0.06 - (Math.PI / 2 - 0.06) * u;
          },
          onEnd(moved) {
            if (covered) {
              if (moved && view === 'plate' && !traced) finishTrace();
              return;
            }
            if (!moved) return;
            if (plate.position.z > -0.049 && spread === 1) {
              plate.position.set(PAN_X, PLATE_Y, 0);
              plate.rotation.x = -Math.PI / 2;
              covered = true;
              guide();
            } else {
              plate.position.copy(rig.plateHome);
              plate.rotation.x = -0.06;
              guide();
            }
          },
          onTap() {
            if (covered && view !== 'plate') near('plate');
          },
        },
      ],
      { highlight: true, taps: [{ obj: scale, hint: '读注射器刻度', onTap: readScale }] },
    );
    reset();
    return {
      group,
      size: { w: 0.57, h: 0.26, d: 0.37 },
      view: { elev: 30, azim: 10, margin: 1.04 },
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
        rows = table(['标定滴数', '单滴纯油酸 / μL', '面积 / cm²', '尺度 / nm']);
        const num = (name) => h('input', { type: 'number', step: 'any', 'aria-label': name, style: 'width:6em' });
        dropInput = num('落入烧杯的滴数');
        pureInput = num('单滴纯油酸（μL）');
        areaInput = num('方格数');
        sizeInput = num('分子尺度（nm）');
        calLabel = note('');
        calForm = h(
          'div',
          {},
          calLabel,
          h('label', {}, '滴数 ', dropInput),
          h('label', {}, '单滴纯油酸 / μL ', pureInput),
          buttons([{ text: '记录标定', onClick: confirmCal }]).el,
        );
        answerForm = h(
          'div',
          {},
          note('用标定所得的单滴纯油酸体积，除以自己数出的轮廓面积。'),
          h('label', {}, '方格数 ', areaInput),
          h('label', {}, '尺度 / nm ', sizeInput),
          buttons([{ text: '记录估测', onClick: confirmSize }]).el,
        );
        calForm.hidden = answerForm.hidden = true;
        calibrationRecord = note('');
        calibrationRecord.hidden = true;
        panel.data.append(rows.el, calibrationRecord, calForm, answerForm);
        panel.notes.append(
          note('每小格边长 1 cm。用同一针头缓慢滴液，标定时至少数 10 滴；可留更多滴数以减小读尺和挂滴造成的误差。'),
          buttons([
            {
              text: '重新标定滴数',
              onClick() {
                if (!bar.has('drop')) {
                  clearCal();
                  guide();
                }
              },
            },
            { text: '换清水重新撒粉', onClick: newTray },
            { text: '全部重做', onClick: reset },
          ]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (grabbing && target !== ml) {
          const change = clamp(target - ml, -0.065 * dt, 0.45 * dt);
          ml = clamp(ml + change, 0, 1);
          rig.volume(ml);
          if (change < 0) {
            residue -= change;
            while (residue >= DROP_ML) {
              residue -= DROP_ML;
              release();
            }
          } else residue = Math.max(0, residue - change);
        }
        rig.hanging.visible = residue > 0.0005;
        rig.hanging.scale.setScalar(Math.cbrt(residue / DROP_ML));
        rig.hanging.position.y = -0.0015 * rig.hanging.scale.x;
        for (let i = falling.length - 1; i >= 0; i--) {
          const d = falling[i];
          d.t += dt;
          d.mesh.position.y = d.from - 4.9 * d.t ** 2;
          if (d.mesh.position.y <= (d.site === 'cup' ? Math.max(0.004, rig.cup.level) : WATER_Y)) {
            land(d);
            falling.splice(i, 1);
          }
        }
        if (film && spread < 1) {
          spread = Math.min(1, spread + dt / 1.8);
          rig.water(film, origin, 1 - (1 - spread) ** 2);
          if (spread === 1) {
            if (!dirty) bar.done('spread');
            guide();
          }
        }
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
