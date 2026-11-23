import { CapillaryTube, CAPILLARY_SPECS, CAPILLARY_WATER } from './kit/capillary.js';
import { capillaryRig, CAPILLARY_X, CAPILLARY_RULERS } from './kit/capillaryRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, buttons } from './kit/ui.js';
export default {
  id: 'capillarity',
  fig: '图2.5-6',
  title: '观察细管中的毛细现象',
  stampText: '实验',
  predict: {
    q: '把同样内径的洁净玻璃管和疏水塑料笔芯插入水中，管内液面一定都比外水面高吗？',
    options: ['都升高', '可能一个升高、一个降低', '只取决于插入多深'],
    answer: 1,
  },
  conclusion: {
    page: 42, rect: [216.5, 530.92, 531.42, 615.3],
    quote: '实验结果表明，洁净细玻璃管内的液面比水面高；塑料笔芯内的液面比水面低。管的内径越小，上述现象就越明显。像这样浸润液体在细管中上升的现象，以及不浸润液体在细管中下降的现象，称为毛细现象（capillarity）。',
    why: '本次洁净玻璃管内是凹液面，名义疏水PP笔芯内是凸液面。保持同一水和同类表面条件，内径越小，与外水面的高差绝对值越大。表面状态也影响结果，不能把所有塑料或受污染玻璃都当成这里的条件。',
    src: '课本第 38 页 · 第二章 第5节 液体',
  },
  create(ctx) {
    const rig = capillaryRig(),
      { group } = rig,
      models = CAPILLARY_SPECS.map((s) => new CapillaryTube(s));
    let ui,
      aim,
      selected = null,
      dragged = null,
      body,
      report,
      choices,
      records = {},
      last = '',
      drawAge = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'glass', title: '玻璃管对照', todo: '向下拖左架灰色夹柄，将三管插入水中。', target: () => aim },
        { id: 'plastic', title: '塑料笔芯对照', todo: '向下拖右架绿色夹柄，比较同内径笔芯。', target: () => aim },
        { id: 'compare', title: '比较原读数', todo: '打开笔记本比较两组高差。', target: () => aim },
        { id: 'out', title: '提管收尾', todo: '向上拖两个夹柄，让管底离开水面。', target: () => aim },
      ],
    });
    function say(s, obj = null) {
      aim = selected === null ? obj : null;
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
      selected = null;
      ctx.back();
      bar.near(false);
      guide();
    }
    function groupReady(k) {
      return models.slice(k * 3, k * 3 + 3).every((m) => m.settled && m.filled > 0.001);
    }
    function guide() {
      if (dragged !== null) return;
      if (selected !== null) {
        const m = models[selected];
        if (!m.connected) return say('管底已离开水面，残液不能当作平衡毛细高度。回全景重新浸入。');
        if (!m.settled) return say('保持夹柄不动，等这根管内液面稳定。');
        return say(
          `正在读${m.spec.id}：尺上0与外水面齐平。点右侧尺上与${selected < 3 ? '凹液面最低处' : '凸液面最高处'}齐平的位置，估读到0.1 mm。`,
        );
      }
      if (bar.has('compare')) {
        const k = models[0].bottom <= CAPILLARY_WATER.level ? 0 : models[3].bottom <= CAPILLARY_WATER.level ? 1 : null;
        if (k !== null)
          return say('比较完成。向上拖夹柄，把两组管底提出水面；留意玻璃管内仍可能有残液。', rig.assemblies[k].grip);
        bar.done('out');
        return say('两组原读数已保存。管底已离水，残液没有被清空；残液高度不作平衡比较。');
      }
      const k = bar.has('glass') ? 1 : 0,
        missing = CAPILLARY_SPECS.findIndex((s, i) => (i < 3 ? 0 : 1) === k && !records[s.id]);
      if (missing < 0) return say('六个读数已保存。打开笔记本，比较材料与内径。');
      if (!groupReady(k))
        return say(
          models[k * 3].bottom > 0.022
            ? `向下拖${k ? '右架绿色' : '左架灰色'}夹柄，让三根管底明显浸入水中。`
            : '保持夹柄不动，等待液面稳定。',
          rig.assemblies[k].grip,
        );
      say(`点${CAPILLARY_SPECS[missing].id}管近看，比较管内液面与旁边尺上的0线。`, rig.tubes[missing].group);
    }
    function near(i) {
      enter();
      if (!models[i].connected || models[i].filled < 0.001)
        return say(
          '先拖这组夹柄向下，让管底充分浸入水中；空气中或入口未进水不能读毛细高度。',
          rig.assemblies[i < 3 ? 0 : 1].grip,
        );
      selected = i;
      bar.near(true);
      const x = (CAPILLARY_X[i] + CAPILLARY_RULERS[i < 3 ? 0 : 1]) / 2;
      ctx.look([x, 0.055, 0], [0, 0, 1], 0.25, leave);
      guide();
    }
    function read(k, ray) {
      enter();
      if (selected === null) return say('先点一根管近看，再读与它液面齐平的尺位。', rig.tubes[k * 3].group);
      if ((selected < 3 ? 0 : 1) !== k) return say('读当前这组旁边的尺。');
      const m = models[selected];
      if (!m.settled || m.filled < 0.001) return guide();
      const hit = ray.intersectObject(rig.rulers[k], false)[0];
      if (!hit) return;
      const p = group.worldToLocal(hit.point.clone()),
        value = Math.round((p.y - CAPILLARY_WATER.level) * 10000) / 10,
        expected = (m.center - CAPILLARY_WATER.level) * 1000;
      if (Math.abs(value - expected) > 0.65)
        return say('再看液面与刻线的水平位置；玻璃读凹液面最低处，塑料读凸液面最高处。');
      records[m.spec.id] = { id: m.spec.id, d: m.spec.radius * 2000, value };
      renderRows();
      leave();
      if ([0, 1, 2].every((i) => records[CAPILLARY_SPECS[i].id])) bar.done('glass');
      if ([3, 4, 5].every((i) => records[CAPILLARY_SPECS[i].id])) bar.done('plastic');
      report.hidden = !(bar.has('glass') && bar.has('plastic'));
      last = '';
      guide();
    }
    function renderRows() {
      body.replaceChildren(
        ...CAPILLARY_SPECS.filter((s) => records[s.id]).map((s) => {
          const r = records[s.id];
          return h('tr', {}, h('td', {}, r.id), h('td', {}, r.d.toFixed(1)), h('td', {}, r.value.toFixed(1)));
        }),
      );
    }
    const pointer = draggable(
      group,
      rig.assemblies.map((a, k) => ({
        obj: a.grip,
        plane: 'xy',
        offset: -0.078,
        keepOffset: true,
        onStart() {
          enter();
          if (selected !== null) leave();
          dragged = k;
        },
        onDrag(p) {
          const y = clamp(p.y - 0.102, 0.011, 0.09);
          for (let i = k * 3; i < k * 3 + 3; i++) models[i].setBottom(y);
          rig.update(models);
          if (bar.has('out') && y < CAPILLARY_WATER.level) bar.undo('out');
          say(
            y < CAPILLARY_WATER.level
              ? '保持夹柄，观察管内液面连续变化。'
              : bar.has('compare')
                ? '管底已离开水面，观察保留的残液；把另一组也提出水面。'
                : '管底在水面上方。继续向下拖才能观察毛细平衡。',
          );
        },
        onEnd() {
          dragged = null;
          guide();
        },
      })),
      {
        highlight: true,
        taps: [
          ...rig.tubes.map((t, i) => ({ obj: t.group, onTap: () => near(i) })),
          ...rig.rulers.map((r, k) => ({ obj: r, onTap: (ray) => read(k, ray) })),
        ],
      },
    );
    function reset() {
      enter();
      if (selected !== null) leave();
      models.forEach((m) => m.reset());
      records = {};
      body.replaceChildren();
      report.hidden = true;
      choices.forEach((c) => (c.value = ''));
      bar.undo('glass', 'plastic', 'compare', 'out');
      rig.update(models);
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.47, d: 0.37, h: 0.29 },
      view: { azim: 16, elev: 20, lookY: 0.45, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        body = h('tbody');
        ui.data.append(
          h(
            'table',
            { class: 'data' },
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                ['管', '内径 / mm', '相对外水面 / mm'].map((s) => h('th', {}, s)),
              ),
            ),
            body,
          ),
          note('正号表示高于外水面，负号表示低于外水面。读数来自你点取的尺位；再次读同一管可修正该行。'),
        );
        choices = [
          h(
            'select',
            { 'aria-label': '材料与液面' },
            h('option', { value: '' }, '同内径时比较材料'),
            h('option', { value: 'right' }, '玻璃管升高，这组塑料笔芯降低'),
            h('option', { value: 'both' }, '两种管都升高'),
          ),
          h(
            'select',
            { 'aria-label': '内径与高差' },
            h('option', { value: '' }, '同材料时比较内径'),
            h('option', { value: 'right' }, '内径越小，高差绝对值越大'),
            h('option', { value: 'large' }, '内径越大，高差绝对值越大'),
          ),
        ];
        choices.forEach((c) =>
          c.addEventListener('input', () => {
            enter();
            bar.undo('compare', 'out');
            guide();
          }),
        );
        report = h(
          'div',
          {},
          ...choices.map((c) => h('div', { class: 'read-row' }, c)),
          buttons([
            {
              text: '核对比较',
              onClick() {
                enter();
                if (choices.some((c) => c.value !== 'right'))
                  return say('先看正负，再分别比较G1—G3和P1—P3的高差绝对值；两个组的内径顺序相同。');
                for (let k = 0; k < 2; k++) {
                  const rs = CAPILLARY_SPECS.slice(k * 3, k * 3 + 3).map((s) => records[s.id]);
                  if (
                    !rs.every((r) => r && (k ? r.value < 0 : r.value > 0)) ||
                    !(Math.abs(rs[0].value) > Math.abs(rs[1].value) && Math.abs(rs[1].value) > Math.abs(rs[2].value))
                  )
                    return say('有些读数未呈现清楚的次序。再点相应管和尺位重读，保留实际估读值。');
                }
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
            '两端开口的原细管始终留在各自夹架上。拖夹柄向下插入同一槽水，等待稳定；点管近看，再点右侧尺与液面齐平的位置。玻璃凹液面读最低处，塑料凸液面读最高处。尺的0与外水面齐平。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '为看清管内界面，管径仅沿水平方向放大4倍，高度与尺不放大。内径0.8、1.6、2.4 mm，管长12 cm。取20℃水；洁净玻璃采用完全浸润近似θ=0°，本组PP笔芯采用名义疏水表面θ=100°。接触角随污染和表面处理变化，不代表所有塑料笔芯。',
          ),
          note(
            '平衡由毛细压强与重力决定；流动采用长时黏性阻力近似，未模拟入口最初的惯性、蒸发及完整接触角滞后，瞬态时间不用于定量测量。离水后按下口接触线钉扎的承载上限保留残液，超限连续排出；实际残液也依赖管口状态，不把残液当毛细平衡高度。',
          ),
          note(
            '水表面张力参考<a href="https://iapws.org/technical-guidance/release/Surf-H2O" target="_blank">IAPWS</a>；聚丙烯接触角的表面依赖参考<a href="https://pubs.rsc.org/en/content/articlehtml/2015/ra/c5ra01233c" target="_blank">RSC Advances 原研究</a>。θ=100°为本课名义配置。',
          ),
        );
        rig.update(models);
        guide();
      },
      update(dt) {
        bar.update(dt);
        const before = models.map((m) => m.settled);
        models.forEach((m) => m.advance(dt));
        drawAge += dt;
        if (drawAge > 0.04) {
          rig.update(models);
          drawAge = 0;
        }
        if (models.some((m, i) => m.settled !== before[i])) guide();
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
