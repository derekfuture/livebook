import { FaradayDrop, DROP_TOP } from './kit/faradayDrop.js';
import { faradayDropRig, MAGNET_DOCKS } from './kit/faradayDropRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';
export default {
  id: 'faradaydrop',
  fig: '图2.2-1',
  title: '探究感应电动势大小的影响因素',
  stampText: '实验',
  predict: {
    q: '同一磁体从管口释放，线圈放得更低，电压峰值会怎样？',
    options: ['更大', '相同', '更小'],
    answer: 0,
    hint: '保持磁体和匝数不变，只移动线圈。',
  },
  conclusion: {
    page: 35, rect: [64.52, 119.12, 379.55, 245.5],
    quote: '闭合电路中感应电动势的大小，跟穿过这一电路的磁通量的变化率成正比。',
    why: '磁体每次从同一管口静止释放。线圈越低，磁体经过时越快，电压峰值越大。保持其他条件不变，增加有效匝数或换用较强磁体，峰值也增大。这里比较的是高阻传感器测得的电压，不是感应电流。',
    src: '课本第 31 页 · 第二章 第2节 法拉第电磁感应定律',
  },
  create(ctx) {
    const rig = faradayDropRig(),
      records = [];
    let model = new FaradayDrop(),
      distance = 0.2,
      turns = 300,
      loaded = 0,
      falling = null,
      ui,
      rows,
      near = false,
      held = false,
      redraw = 0;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        {
          id: 'first',
          title: '释放磁体',
          todo: '向右拖管口的棕色柄，拉柄松夹，让磁体 A 自由落下。',
          target: () => rig.gateHandle,
        },
        {
          id: 'height',
          title: '移动线圈',
          todo: '取回 A，沿管外送回管口；把线圈依次移到 30、40、50 cm 处重复。',
          target: () => rig.handle,
        },
        {
          id: 'turns',
          title: '改变匝数',
          todo: '拖红插头接 600 匝，用 A 在四个相同位置重复。',
          target: () => rig.plug,
        },
        {
          id: 'magnet',
          title: '更换磁体',
          todo: '保持 600 匝，将 A 放回左侧座，改用 B 在四个位置重复。',
          target: () => rig.magnets[1],
        },
      ],
    });
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (model.running) return bar.say('磁体正在自由下落，右侧传感器记录电压波形；等待落入接盘。');
      if (held) return;
      if (bar.finished) return bar.say('三种因素已分别比较。点右侧原屏幕近看波形与最近记录；笔记本保留全部记录。');
      if (loaded === null)
        return bar.say(
          bar.current === 'magnet' && records.at(-1)?.magnet !== 1
            ? '把接盘里的 A 拖回左侧 A 座。再把 B 沿管外向上拖，超过管口后移入，放到管口夹具中。'
            : '从接盘横向取出同一磁体，沿管外向上拖；超过管口后移入，放入夹具。',
        );
      if (bar.current === 'first') return bar.say('先用 A、300 匝，将线圈对准 20 cm。向右拖顶部棕色柄，松夹释放。');
      if (bar.current === 'height') {
        const next = [20, 30, 40, 50].find(
          (cm) => !records.some((r) => r.magnet === 0 && r.turns === 300 && Math.abs(r.distance * 100 - cm) < 0.5),
        );
        return bar.say(`保持 A 和 300 匝。握线圈右后方夹柄上下拖，将线圈中心对准尺上 ${next} cm，再拉柄松夹。`);
      }
      const next = [20, 30, 40, 50].find((cm) => !has(cm, 600, bar.current === 'turns' ? 0 : 1));
      if (bar.current === 'turns')
        return bar.say(`保持 A，红插头改接 600 匝。把线圈对准 ${next} cm 后释放；与原来同一位置的 300 匝记录比较。`);
      return bar.say(
        loaded === 1
          ? `保持 B、600 匝，把线圈对准 ${next} cm 后释放；与同一位置的 A 记录比较。`
          : '保持 600 匝。把 A 向上取出放回 A 座，换 B 从同一管口释放，再重复四个位置。',
      );
    }
    const has = (cm, n, m) =>
      records.some((r) => Math.abs(r.distance * 100 - cm) < 0.5 && r.turns === n && r.magnet === m);
    function check() {
      if (has(20, 300, 0)) bar.done('first');
      if ([20, 30, 40, 50].every((cm) => has(cm, 300, 0))) bar.done('height');
      if ([20, 30, 40, 50].every((cm) => has(cm, 300, 0) && has(cm, 600, 0))) bar.done('turns');
      if ([20, 30, 40, 50].every((cm) => has(cm, 600, 0) && has(cm, 600, 1))) bar.done('magnet');
    }
    function release() {
      if (loaded === null || model.running) return;
      model = new FaradayDrop({ distance, turns, strength: loaded === 0 ? 1 : 2 });
      falling = loaded;
      loaded = null;
      model.release();
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
      ctx.look([0.215, 0.105, 0.08], [0, 0.05, 1], ctx.camera.aspect < 1 ? 0.38 : 0.36, leave);
      bar.say('同一传感器：横轴为下落后的时间，纵轴为电压；取正负波形中绝对值最大的电压作比较。');
    }
    const drags = [
      {
        obj: rig.handle,
        anchor: rig.coil,
        plane: 'xy',
        offset: -0.055,
        keepOffset: true,
        enabled: () => !model.running,
        hint: '上下拖线圈夹柄，对准原尺刻度',
        onStart() {
          enter();
          held = true;
        },
        onDrag(p) {
          distance = clamp(DROP_TOP - p.y, 0.2, 0.5);
          rig.moveCoil(distance, turns);
          bar.say(`线圈中心距管口 ${(distance * 100).toFixed(1)} cm；匝数和磁体保持不变。`);
        },
        onEnd() {
          held = false;
          guide();
        },
      },
      {
        obj: rig.plug,
        plane: 'xy',
        offset: 0.055,
        keepOffset: true,
        enabled: () => !model.running,
        hint: '将红测压插头拖到 300 或 600 匝接线柱',
        onStart() {
          enter();
          held = true;
        },
        onDrag(p) {
          rig.plug.position.set(
            clamp(p.x, 0.06, 0.15),
            clamp(p.y, rig.coil.position.y - 0.09, rig.coil.position.y + 0.02),
            0.055,
          );
          rig.updateWires();
        },
        onEnd() {
          const p = rig.plug.position;
          if (Math.abs(p.y - (rig.coil.position.y - 0.027)) < 0.025) {
            if (Math.abs(p.x - 0.085) < 0.018) turns = 300;
            else if (Math.abs(p.x - 0.125) < 0.018) turns = 600;
          }
          held = false;
          rig.moveCoil(distance, turns);
          guide();
        },
      },
      {
        obj: rig.gateHandle,
        anchor: rig.gate,
        plane: 'xy',
        keepOffset: true,
        enabled: () => !model.running,
        hint: '向右拉柄松夹，释放管口磁体',
        onStart() {
          enter();
        },
        onDrag(p) {
          rig.gate.position.x = clamp(p.x, 0, 0.055);
          if (rig.gate.position.x > 0.025) release();
        },
        onEnd() {
          if (!model.running) guide();
        },
      },
    ];
    rig.magnets.forEach((magnet, i) => {
      let start, previousLoaded;
      drags.push({
        obj: magnet,
        plane: 'xy',
        keepOffset: true,
        enabled: () => !model.running,
        hint: '从接盘取出，沿管外上移，再放到管口',
        onStart() {
          enter();
          held = true;
          start = magnet.position.clone();
          previousLoaded = loaded;
          if (loaded === i) loaded = null;
        },
        onDrag(p) {
          let x = clamp(p.x, -0.26, 0.04),
            y = clamp(p.y, 0.035, 0.67);
          const old = magnet.position;
          // Below the mouth, a lifted magnet must stay outside the glass wall.
          // Inside the top opening, lift above its rim before moving sideways.
          if (y > 0.055 && y < 0.623) {
            if (old.y >= 0.623 || (Math.abs(old.x) < 0.022 && old.y >= 0.59)) {
              x = 0;
              y = Math.max(0.6, y);
            } else if (Math.abs(x) < 0.036) x = -0.036;
          }
          if (loaded !== null && Math.abs(x) < 0.025 && y > 0.57) x = -0.04;
          magnet.position.set(x, y, 0);
          bar.say('沿玻璃管外取回磁体；高过管口后移入。松手放入夹具，或放回对应底座。');
        },
        onEnd() {
          const p = magnet.position;
          if (loaded === null && Math.abs(p.x) < 0.025 && p.y >= 0.59) {
            magnet.position.set(0, DROP_TOP, 0);
            loaded = i;
            rig.gate.position.x = 0;
          } else if (Math.abs(p.x - MAGNET_DOCKS[i]) < 0.035 && p.y < 0.085) {
            magnet.position.set(MAGNET_DOCKS[i], 0.035, 0);
          } else {
            magnet.position.copy(start);
            loaded = previousLoaded;
          }
          held = false;
          guide();
        },
      });
    });
    const desk = draggable(rig.group, drags, {
      highlight: true,
      taps: [{ obj: rig.screen, hint: '近看原传感器波形和记录', onTap: inspect }],
    });
    const pointer = {
      items: desk.items,
      down(ray, e) {
        return near || desk.down(ray, e);
      },
      move(ray) {
        return near || desk.move(ray);
      },
      up() {
        return desk.up();
      },
      dispose() {
        desk.dispose();
      },
    };
    function reset() {
      model = new FaradayDrop();
      distance = 0.2;
      turns = 300;
      loaded = 0;
      falling = null;
      held = false;
      rig.moveCoil(distance, turns);
      rig.gate.position.x = 0;
      rig.magnets[0].position.set(0, DROP_TOP, 0);
      rig.magnets[1].position.set(MAGNET_DOCKS[1], 0.035, 0);
      records.length = 0;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('first', 'height', 'turns', 'magnet');
      leave();
    }
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.62, d: 0.3, h: 0.7 },
      view: { elev: 12, azim: -5, margin: 1.13 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['轮次', '距管口 / cm', '匝数', '磁体', '|U|峰值 / V']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            '从管口静止释放磁体；线圈中心依次距管口 20、30、40、50 cm。磁体落入接盘后，从管外取回。原线圈有 300、600 匝抽头，拖动红测压插头换匝数；黑线接公共端。更换较强的 B 时保持其余条件相同。屏幕自动保存每次完整下落，不把不同条件混成一组。',
          ),
          buttons([
            { text: '近看传感器', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '本页为定性教学模型：绕组外观不逐匝计数；两磁体同尺寸，B 的模型磁通强度为 A 的 2 倍。高阻电压传感器、有限长磁体轴向磁场近似，忽略空气阻力与传感器滤波。夹具和接盘辅助重复释放，不参与电路。电压为模拟值，不冒充教材实测数据。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (model.running) {
          model.advance(dt);
          rig.magnets[falling].position.set(0, model.y, 0);
          if (model.finished) {
            const r = { distance: model.distance, turns: model.turns, magnet: falling, peak: model.peak };
            records.push(r);
            rows?.add([
              String(records.length),
              (r.distance * 100).toFixed(1),
              String(r.turns),
              falling === 0 ? 'A' : 'B',
              r.peak.toFixed(3),
            ]);
            if (rows) rows.el.hidden = false;
            falling = null;
            check();
            guide();
          }
        }
        redraw += dt;
        if (redraw > 0.06) {
          redraw = 0;
          rig.display(
            model,
            records,
            model.running
              ? '采集中'
              : loaded === null
                ? '本轮记录保留 · 从接盘取回磁体'
                : `待释放 ${loaded === 0 ? 'A' : 'B'} · ${(distance * 100).toFixed(1)} cm · ${turns} 匝`,
          );
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
