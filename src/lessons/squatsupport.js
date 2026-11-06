import * as THREE from 'three';
import { SquatSupport, SQUAT_HEIGHT, squatPose, squatHeightFromTorso } from './kit/squatSupport.js';
import { squatSupportRig, SQUAT_SCALE, FORCE_SCREEN, forcePlotRange } from './kit/squatSupportRig.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, buttons, chart } from './kit/ui.js';
const PHASES = ['下蹲·压力较小', '下蹲·压力较大', '站起·压力较大', '站起·压力较小'];
function phase(p, weight) {
  if (p.velocity < -0.015 && p.acceleration < -0.1 && p.force < weight - 5) return 0;
  if (p.velocity < -0.015 && p.acceleration > 0.1 && p.force > weight + 5) return 1;
  if (p.velocity > 0.015 && p.acceleration > 0.1 && p.force > weight + 5) return 2;
  if (p.velocity > 0.015 && p.acceleration < -0.1 && p.force < weight - 5) return 3;
  return -1;
}
export default {
  id: 'squatsupport',
  fig: '图4.6-5',
  title: '观察下蹲和站起时的支持力',
  stampText: '观察',
  predict: {
    q: '站在力传感器上向下蹲，压力会在整个下蹲过程中都变小吗？',
    options: ['会一直变小', '先变小，减速时会变大', '完全不变'],
    answer: 1,
  },
  conclusion: {
    quote: '超重和失重取决于加速度方向，不取决于运动方向。',
    why: '取竖直向上为正，FN−mg=ma。下蹲起动时向下加速，压力小于重力；下蹲减速时加速度向上，压力大于重力。站起时先重后轻。静止时压力回到重力值，人的质量和重力没有因此改变。',
    src: '人教版高中物理必修第一册第109–110页，图4.6-5',
  },
  create(ctx) {
    const model = new SquatSupport(),
      rig = squatSupportRig(),
      { group } = rig;
    let ui,
      aim,
      near = false,
      dragging = false,
      startHeight = 0,
      baselineAge = 0,
      drawAge = 0,
      downEnd = null,
      selection = [],
      body,
      report,
      answers,
      plot,
      last = '',
      started = false;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'base', title: '采集静止读数', todo: '点采集按钮，先保持站立不动。', target: () => aim },
        { id: 'down', title: '下蹲并停稳', todo: '向下拖蓝色上身，松手后保持蹲姿。', target: () => aim },
        { id: 'up', title: '站起并停稳', todo: '向上拖原上身，回到站姿后松手。', target: () => aim },
        { id: 'read', title: '观察实际曲线', todo: '停止采集，点屏幕看下蹲和站起的变化。', target: () => aim },
        { id: 'compare', title: '解释变化', todo: '打开笔记本，比较压力和重力。', target: () => aim },
      ],
    });
    function say(s, obj = null) {
      aim = obj;
      if (last !== s) {
        last = s;
        bar.say(s);
      }
    }
    function enter() {
      last = '';
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function window() {
      const samples = model.samples;
      if (!samples.length) return [0, 12];
      const moving = samples.filter((p) => Math.abs(p.velocity) > 0.015);
      let start = 0,
        end = Math.max(12, Math.ceil(samples.at(-1).t / 6) * 6);
      if (!model.recording && moving.length) {
        start = Math.max(0, Math.floor(moving[0].t - 0.6));
        end = Math.max(start + 8, Math.ceil(moving.at(-1).t + 1));
      }
      return [start, end];
    }
    function guide() {
      if (bar.finished) return say('原曲线和四处观察已保存。压力改变，人的重力没有改变。');
      if (near) {
        if (model.recording) return say('曲线正在随本次动作记录。回到全景继续动作，完成后点采集按钮停止。');
        if (!bar.has('up')) return say('这是目前采到的曲线。回到全景，点采集按钮继续，补完下蹲和站起。');
        const k = selection.length;
        return say(
          k < 4
            ? [
                '点下蹲曲线低于静止虚线的一段。',
                '再点下蹲曲线高于静止虚线的一段。',
                '点站起曲线高于静止虚线的一段。',
                '再点站起曲线低于静止虚线的一段。',
              ][k]
            : '四处观察已保存。回到全景，打开笔记本比较。',
          k < 4 ? rig.screen : null,
        );
      }
      if (!started) return say('点屏幕下方“采集 / 停止”按钮，先记录站着不动时的压力。', rig.button);
      if (!model.recording && !bar.has('up'))
        return say('采集已停止，原曲线保留。点同一按钮继续采集，再完成动作。', rig.button);
      if (!bar.has('base'))
        return say(
          model.height < SQUAT_HEIGHT.high - 0.015
            ? '先向上拖蓝色上身回到站姿，保持不动，取得静止读数。'
            : '先站着不动片刻，记录静止时的压力。',
          model.height < SQUAT_HEIGHT.high - 0.015 ? rig.torso : rig.screen,
        );
      if (!bar.has('down'))
        return say(
          model.height < SQUAT_HEIGHT.high - 0.2
            ? model.settled && !dragging
              ? '这次下蹲变化太小或未完整采到。保持采集，先站起再稍快地蹲下。'
              : '保持蹲姿，等身体停稳。屏幕上的压力会回到静止值。'
            : '向下拖蓝色上身，明显蹲下后松手；看屏幕压力怎样变化。',
          rig.torso,
        );
      if (!bar.has('up'))
        return say(
          model.height > SQUAT_HEIGHT.high - 0.02
            ? model.settled && !dragging
              ? '这次站起未完整采到。保持采集，先蹲下，再站起并停稳。'
              : '保持站姿，等身体停稳。'
            : '向上拖原蓝色上身，站直后松手；观察这次曲线与下蹲有何不同。',
          rig.torso,
        );
      if (model.recording) return say('下蹲和站起已记录。点采集按钮停止，再点原屏幕近看曲线。', rig.button);
      if (!bar.has('read')) return say('点原屏幕近看，分别找下蹲、站起时压力比静止值小和大的片段。', rig.screen);
      say('四处读数已记入笔记本。打开笔记本，比较变化顺序和重力。');
    }
    function acquisition() {
      enter();
      if (model.recording) {
        model.stop();
        draw();
        return guide();
      }
      if (!started) {
        if (!model.settled || model.height < SQUAT_HEIGHT.high - 0.015)
          return say('先把蓝色上身向上拖回站姿，等身体停稳，再开始采集。', rig.torso);
        model.start();
        started = true;
      } else if (!model.resume()) return say('本次60秒采集已满，曲线保留。用笔记本“全部重做”开始新一轮。');
      if (bar.has('read') || bar.has('compare')) {
        bar.undo('read', 'compare');
        selection = [];
        body.replaceChildren();
        report.hidden = true;
      }
      guide();
      draw();
    }
    function inspect(ray) {
      enter();
      if (!near) {
        near = true;
        bar.near(true);
        ctx.look([FORCE_SCREEN.x, FORCE_SCREEN.y, FORCE_SCREEN.z], [0, 0.01, 1], 0.59, leave);
        return guide();
      }
      if (model.recording || !bar.has('up') || selection.length >= 4) return guide();
      const hit = ray.intersectObject(rig.screen, false)[0];
      if (!hit) return;
      const local = rig.screen.worldToLocal(hit.point.clone()),
        s = FORCE_SCREEN,
        px = (local.x / s.width + 0.5) * s.W,
        py = (0.5 - local.y / s.height) * s.H,
        [a, b] = window();
      if (px < s.L || px > s.R || py < s.T || py > s.B) return say('点坐标网格中的红色实际曲线，不是标题或坐标数字。');
      const t = a + ((px - s.L) / (s.R - s.L)) * (b - a),
        candidate = model.samples.reduce(
          (best, p) => (Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best),
          model.samples[0],
        ),
        range = forcePlotRange(model.samples, model.weight),
        y = s.B - ((candidate.force - range[0]) / (range[1] - range[0])) * (s.B - s.T),
        k = selection.length;
      if (Math.abs(py - y) > 24) return say('沿红色曲线点取，读数来自你刚才的动作。');
      if (phase(candidate, model.weight) !== k || (k >= 2 && candidate.t < downEnd))
        return say(
          [
            '先找下蹲过程中，红线低于静止虚线的一段。',
            '现在找下蹲过程中，红线高于静止虚线的一段。',
            '现在找站起过程中，红线高于静止虚线的一段。',
            '现在找站起过程中，红线低于静止虚线的一段。',
          ][k],
        );
      selection.push(candidate);
      body.append(
        h(
          'tr',
          {},
          h('td', {}, PHASES[k]),
          h('td', {}, candidate.t.toFixed(2)),
          h('td', {}, candidate.force.toFixed(0)),
        ),
      );
      if (selection.length === 4) {
        bar.done('read');
        report.hidden = false;
        leave();
      }
      draw();
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.torso,
          plane: 'xy',
          offset: 0,
          keepOffset: true,
          onStart() {
            enter();
            if (near) leave();
            dragging = true;
            startHeight = squatPose(model.angle).torsoHeight;
          },
          onDrag(p, start) {
            if (start) model.setTarget(squatHeightFromTorso(startHeight + (p.y - start.y) / SQUAT_SCALE));
            guide();
          },
          onEnd() {
            dragging = false;
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.button, onTap: acquisition },
          { obj: rig.screen, onTap: inspect },
        ],
      },
    );
    function draw() {
      rig.draw(model, window(), selection);
      if (plot) {
        const [start, end] = window(),
          [low, high] = forcePlotRange(model.samples, model.weight);
        plot.x.min = start;
        plot.x.max = end;
        plot.y.min = low;
        plot.y.max = high;
        const series = [];
        let current = null,
          previous = null;
        for (const p of model.samples) {
          if (p.t < start || p.t > end) continue;
          if (!current || p.t - previous.t > 0.031) {
            current = { color: '#ae5940', points: [], line: true };
            series.push(current);
          }
          current.points.push([p.t, p.force]);
          previous = p;
        }
        series.push(
          {
            color: '#607e7a',
            points: [
              [start, model.weight],
              [end, model.weight],
            ],
            dash: true,
          },
          { color: '#305d79', points: selection.map((p) => [p.t, p.force]), line: false, dots: true },
        );
        plot.series = series;
        plot.draw();
      }
    }
    function reset() {
      enter();
      if (near) leave();
      model.reset();
      rig.pose(model.angle);
      baselineAge = drawAge = 0;
      downEnd = null;
      selection = [];
      started = false;
      body.replaceChildren();
      report.hidden = true;
      answers.forEach((e) => (e.value = ''));
      bar.undo('base', 'down', 'up', 'read', 'compare');
      draw();
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.64, d: 0.38, h: 0.35 },
      view: { azim: 20, elev: 22, lookY: 0.5, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        plot = chart({
          x: { label: 't / s', min: 0, max: 12 },
          y: { label: 'F / N', min: 400, max: 650 },
          height: 180,
          legend: '虚线为静止压力。纵轴自动量程，空档表示停止采集。',
        });
        plot.canvas.setAttribute('aria-label', '本次力传感器曲线');
        body = h('tbody');
        ui.data.append(
          plot.el,
          h(
            'table',
            { class: 'data' },
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                ['所选片段', 't / s', 'F / N'].map((x) => h('th', {}, x)),
              ),
            ),
            body,
          ),
        );
        answers = ['下蹲时压力变化', '站起时压力变化', '人的重力'].map((name, i) => {
          const select = h(
            'select',
            { 'aria-label': name },
            h('option', { value: '' }, name),
            ...(i < 2
              ? [
                  ['lowhigh', '先小于重力，后大于重力'],
                  ['highlow', '先大于重力，后小于重力'],
                  ['same', '全过程都一样'],
                ]
              : [
                  ['same', '人的重力不变'],
                  ['change', '人的重力随动作改变'],
                ]
            ).map(([value, text]) => h('option', { value }, text)),
          );
          select.addEventListener('input', () => {
            enter();
            bar.undo('compare');
            guide();
          });
          return select;
        });
        report = h(
          'div',
          {},
          note('结合原曲线比较起动、减速和最后静止。这里只改变动作，人的质量没有改变。'),
          ...answers.map((e) => h('div', { class: 'read-row' }, e)),
          buttons([
            {
              text: '核对解释',
              onClick() {
                enter();
                if (answers.map((e) => e.value).join() !== 'lowhigh,highlow,same')
                  return say(
                    '对照四个实际片段：压力在静止线的哪侧？蹲住、站稳后又回到哪里？不要把运动方向直接当作加速度方向。',
                  );
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(report);
        ui.notes.append(
          note(
            '点采集按钮，保持站立取得基准；拖蓝色上身下蹲并停稳，再拖它站起并停稳。点同一按钮停止，点原屏幕近看。按底部指引在实际曲线上选四处观察。中途停止会保留原曲线，继续采集时空档不连线。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '这是55 kg人体动作的教学模型，拖动表示控制主动蹲起：双脚不离台，踝、膝、髋连续弯曲，躯干同时前倾。按各部分名义质量和姿态求质心，再由FN=m(g+a)求支持力；压力与支持力等大反向。动作控制响应经过平滑，不模拟肌肉发力细节，不作为人体生物力学预测。',
          ),
          note(
            '取g=9.8 m/s²，50 Hz采样，传感器响应时间25 ms；示数有短暂响应滞后。图线来自本次手势，可能出现中途停顿或多次起伏，不应复制教材示例曲线。单次累计采集最多60秒，满后停止并保留记录。',
          ),
        );
        draw();
        guide();
      },
      update(dt) {
        bar.update(dt);
        const was = model.settled,
          recording = model.recording;
        model.advance(dt);
        rig.pose(model.angle);
        if (model.recording) {
          if (!bar.has('base')) {
            baselineAge = model.settled && model.height > SQUAT_HEIGHT.high - 0.015 ? baselineAge + dt : 0;
            if (baselineAge > 0.4) {
              bar.done('base');
              guide();
            }
          }
          if (
            bar.has('base') &&
            !bar.has('down') &&
            !dragging &&
            model.settled &&
            model.height < SQUAT_HEIGHT.high - 0.2 &&
            [0, 1].every((k) => model.samples.some((p) => phase(p, model.weight) === k))
          ) {
            bar.done('down');
            downEnd = model.time - model.recordStart;
            guide();
          }
          if (
            bar.has('down') &&
            !bar.has('up') &&
            !dragging &&
            model.settled &&
            model.height > SQUAT_HEIGHT.high - 0.015 &&
            [2, 3].every((k) => model.samples.some((p) => p.t > downEnd && phase(p, model.weight) === k))
          ) {
            bar.done('up');
            guide();
          }
        }
        if ((!was && model.settled) || recording !== model.recording) guide();
        drawAge += dt;
        if (drawAge > 0.08) {
          draw();
          drawAge = 0;
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
