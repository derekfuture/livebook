import { ShieldingExperiment, SHIELDING_HINGE } from './kit/staticShielding.js';
import { shieldingRig } from './kit/shieldingRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, h } from './kit/ui.js';

export default {
  id: 'staticshielding',
  fig: '图9.4-5',
  title: '观察静电屏蔽',
  stampText: '观察',
  predict: {
    q: '保持同一带电球的靠近位置，罩上金属网后，原验电器的箔片会怎样？',
    options: ['张开明显减小', '张开更大', '一定完全不变'],
    answer: 0,
  },
  conclusion: {
    quote: '金属网罩可以减弱外部带电体对内部验电器的影响。',
    why: '外球使金属网中的自由电荷重新分布，内部电场减弱，所以同样靠近时箔片张开较小。本装置的网罩和验电器各自绝缘，网罩没有接地，也没有把验电器放电。有限网孔和底部开口仍有残余影响，不能把“没有明显张开”说成内部电场处处严格为零；箔片张开本身也不能判断电荷正负。',
    src: '人教版高中物理必修第三册第20页 · 图9.4-5',
  },
  create(ctx) {
    const model = new ShieldingExperiment();
    function initialPose() {
      model.reset();
      model.setCageAngle(Math.PI / 2);
      model.setCage([0, 0, 0]);
    }
    initialPose();
    const rig = shieldingRig(model),
      { group } = rig,
      records = new Map();
    let ui, aim, photos, report, effect, reason;
    let near = false,
      nearSince = 0,
      lastChange = 0,
      wasReady = false,
      startBearing = null,
      startAngle = 0,
      activeKind = 'open';
    const approached = { open: true, covered: false };
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'open', title: '未罩观察', todo: '移近带电球，近看原验电器的两片箔。', target: () => aim },
        { id: 'covered', title: '有罩观察', todo: '移远球、盖回金属网，再把同一球移到原来的近处。', target: () => aim },
        { id: 'compare', title: '比较解释', todo: '展开笔记本，比较两次记录并解释。', target: () => aim },
      ],
    });
    const kind = () =>
      model.cageAngle > (89 * Math.PI) / 180 ? 'open' : model.cageAngle < Math.PI / 180 ? 'covered' : null;
    const far = () => model.source[2] > 0.4595,
      close = () => model.source[2] < 0.1505;
    const ready = () =>
      near &&
      model.time - nearSince > 1 &&
      model.time - lastChange > 1.2 &&
      Math.max(...model.velocities.map(Math.abs)) < 0.003;
    const say = (text, obj = null) => {
      aim = obj;
      bar.say(text);
    };
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (bar.finished) return say('两次观察已保留。仍可开合网罩、移近移远球，观察同一对箔片的连续变化。');
      if (records.size === 2) return say('两次观察已记在笔记本。展开它，比较箔片张开程度，并解释网罩的作用。');
      const current = kind(),
        wanted = records.has('open') ? 'covered' : 'open';
      if (!current || records.has(current)) {
        if (near)
          return say(
            !current
              ? '网罩还停在中间位置。点“回到全景”，先移远球，再把网罩完全翻开或盖回。'
              : '这次已看过。点“回到全景”，移远球，再换网罩状态作对照。',
          );
        if (!far()) return say('先握绝缘柱，把同一个球沿槽移回“远处”挡块。', rig.sourceGrip);
        return say(
          wanted === 'covered'
            ? '握网罩绿色横柄，沿圆弧向前下方拖，把原网罩盖到底。'
            : '握网罩绿色横柄，沿圆弧向后上方拖，翻开到后方。',
          rig.coverGrip,
        );
      }
      if (!approached[current]) {
        if (near) return say('点“回到全景”，先把球移回远处，再沿原槽靠近；这次要保持网罩状态不变。');
        return say('先把同一球拖回“远处”挡块，再沿原槽靠近，观察这次的变化。', rig.sourceGrip);
      }
      if (!close()) {
        if (near) return say('点“回到全景”，沿原木槽把球拖到“近处”挡块，再近看箔片。');
        return say('握浅绿色绝缘柱，沿木槽把球拖到“近处”挡块；球始终不碰验电器。', rig.sourceGrip);
      }
      if (!near) return say('球已在近处。点验电器的玻璃窗，近看原来的两片金属箔。', rig.scopePick);
      if (!ready()) return say('留意两片原箔的变化。等它们稳定后，再点玻璃窗留下这次观察。');
      return say(
        current === 'open'
          ? '看清未罩时两片箔的张开；再点玻璃窗，留下这次观察。'
          : records.has('open')
            ? '与刚才比较：有罩时两片箔张开多少？再点玻璃窗，留下观察。'
            : '看清有罩时两片箔的张开；再点玻璃窗，留下这次观察。',
      );
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      near = true;
      nearSince = model.time;
      bar.near(true);
      ctx.look([0, 0.097, 0], [0.55, 0.12, 1], Math.max(0.34, ctx.camera.aspect * 0.18), leave);
      guide();
    }
    function snapshot(record) {
      const canvas = h('canvas', {
        width: 300,
        height: 210,
        'aria-label': record.kind === 'open' ? '未罩时箔片侧向记录' : '有罩时箔片侧向记录',
      });
      canvas.style.cssText = 'width:100%;height:auto;display:block';
      const g = canvas.getContext('2d');
      g.fillStyle = '#f5efdf';
      g.fillRect(0, 0, 300, 210);
      g.strokeStyle = '#ad9978';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(150, 108, 73, 0, 2 * Math.PI);
      g.stroke();
      g.strokeStyle = '#879496';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(150, 23);
      g.lineTo(150, 92);
      g.stroke();
      g.fillStyle = '#a6adb0';
      g.beginPath();
      g.arc(150, 21, 8, 0, 2 * Math.PI);
      g.fill();
      g.strokeStyle = '#aa7d27';
      g.lineWidth = 3.5;
      record.angles.forEach((angle, i) => {
        const side = i ? 1 : -1;
        g.beginPath();
        g.moveTo(150 + side * 1.2, 92);
        g.lineTo(150 + side * (1.2 + 70 * Math.sin(angle)), 92 + 70 * Math.cos(angle));
        g.stroke();
      });
      g.fillStyle = '#66645a';
      g.font = '13px sans-serif';
      g.textAlign = 'center';
      g.fillText('当时箔片的侧向投影 · 非测量标尺', 150, 200);
      return h(
        'figure',
        {},
        canvas,
        h('figcaption', {}, record.kind === 'open' ? '未罩 · 球在近处挡块' : '有罩 · 同一球、同一近处挡块'),
      );
    }
    function observe() {
      enter();
      if (!near) return inspect();
      const current = kind();
      if (!current || records.has(current) || !approached[current] || !close() || !ready()) return guide();
      const record = { kind: current, angles: [...model.angles], source: [...model.source], time: model.time };
      records.set(current, record);
      photos.append(snapshot(record));
      bar.done(current);
      report.hidden = records.size !== 2;
      guide();
    }
    function changed() {
      lastChange = model.time;
      const current = kind();
      if (current !== activeKind) {
        approached.open = approached.covered = false;
        activeKind = current;
      }
      if (current && far()) approached[current] = true;
      rig.pose();
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.sourcePick,
          anchor: rig.source,
          plane: 'xz',
          offset: 0.085,
          keepOffset: true,
          onStart: enter,
          onDrag(p) {
            const z = clamp(p.z, 0.15, 0.46);
            if (Math.abs(z - model.source[2]) < 1e-7) return;
            model.setSource([0, 0.17, z]);
            changed();
          },
          onEnd: guide,
        },
        {
          obj: rig.coverPick,
          plane: 'yz',
          offset: 0,
          onStart(p) {
            enter();
            startAngle = model.cageAngle;
            startBearing = p ? Math.atan2(p.y - SHIELDING_HINGE[1], p.z - SHIELDING_HINGE[2]) : null;
          },
          onDrag(p) {
            if (startBearing === null) return;
            const bearing = Math.atan2(p.y - SHIELDING_HINGE[1], p.z - SHIELDING_HINGE[2]),
              delta = Math.atan2(Math.sin(bearing - startBearing), Math.cos(bearing - startBearing));
            const angle = clamp(startAngle + delta, 0, Math.PI / 2);
            if (Math.abs(angle - model.cageAngle) < 1e-6) return;
            model.setCageAngle(angle);
            changed();
          },
          onEnd: guide,
        },
      ],
      { highlight: true, taps: [{ obj: rig.scopePick, onTap: observe }] },
    );
    function reset() {
      initialPose();
      records.clear();
      photos.replaceChildren();
      report.hidden = true;
      effect.value = reason.value = '';
      approached.open = true;
      approached.covered = false;
      activeKind = 'open';
      lastChange = 0;
      wasReady = false;
      rig.pose();
      bar.undo('open', 'covered', 'compare');
      if (near) leave();
      else guide();
    }
    return {
      group,
      pointer,
      card: false,
      toggles: ['steps'],
      size: { w: 0.34, d: 1.09, h: 0.43 },
      view: { elev: 25, azim: 32, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        photos = h('div');
        const select = (label, options) =>
          h(
            'select',
            { 'aria-label': label },
            h('option', { value: '' }, label),
            ...options.map(([value, text]) => h('option', { value }, text)),
          );
        effect = select('有罩后箔片的张开', [
          ['less', '明显减小'],
          ['more', '明显增大'],
          ['same', '基本不变'],
        ]);
        reason = select('网罩为什么起作用', [
          ['field', '电荷重新分布，内部电场减弱'],
          ['ground', '把验电器接地放电了'],
          ['source', '让外面的球失去电荷了'],
        ]);
        for (const el of [effect, reason])
          el.addEventListener('change', () => {
            bar.undo('compare');
            guide();
          });
        report = h(
          'div',
          {},
          note('同一验电器、同一个球，球都在同一近处挡块。网罩没有接地；两张记录画的是当时原箔片的角度。'),
          ...[effect, reason].map((el) => h('div', { class: 'read-row' }, el)),
          buttons([
            {
              text: '核对观察',
              onClick() {
                if (records.size !== 2) return guide();
                if (effect.value !== 'less') return say('对照两张箔片记录：有罩时张开明显较小，并非增加或保持相同。');
                if (reason.value !== 'field')
                  return say('原球仍带电，验电器没有接地。金属网内自由电荷重新分布，使内部电场减弱。');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(photos, report);
        ui.notes.append(
          note(
            '拖浅绿色绝缘柱，沿木槽移近或移远球。拖网罩顶部绿色横柄，沿圆弧翻开或盖回。点玻璃窗近看，稳定后再点一次留下观察；按“回到全景”继续操作。两种网罩状态可以交换观察顺序。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '球和验电器始终不接触。验电器起初已放掉残余净电荷，观察时保持绝缘；不把它持续接地。张角只作定性比较，不能判断电荷正负。',
          ),
          note(
            '为便于反复对照，这里采用绝缘支承的翻盖网罩，属于教材装置的操作扩展。五面金属网底部开口，未添加金属底板；摩擦铰链可保持中间位置。',
          ),
          note(
            '采用有限线径等势近似和箔片受力计算，忽略玻璃介质及外球自身极化；不是实物标定。有限网孔和底部开口使内部残余场不严格为零。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        model.advance(dt);
        rig.pose();
        const current = kind();
        if (current && far()) approached[current] = true;
        const isReady = ready();
        if (isReady !== wasReady) {
          wasReady = isReady;
          guide();
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
