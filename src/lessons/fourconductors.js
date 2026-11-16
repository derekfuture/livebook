import { fourConductorRig } from './kit/fourConductorRig.js';
import { FOUR_SAMPLES, sampleContact } from './kit/fourConductors.js';
import { meterProbes } from './kit/meterProbes.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, buttons } from './kit/ui.js';

export default {
  id: 'fourconductors',
  fig: '图11.2-2',
  title: '用串联电压比研究导体电阻',
  stampText: '实验',
  predict: {
    q: '四根导体串联，怎样比较它们的电阻，而不必先求出电流？',
    options: ['比较各段两端的电压', '比较各段电流大小', '只比较导体的颜色'],
    answer: 0,
    hint: '串联各段电流近似相同，电压之比反映电阻之比。',
  },
  conclusion: {
    crops: [
      { page: 62, rect: [240.5, 744.41, 531.5, 767.44] },
      { page: 63, rect: [63.77, 54.2, 378.78, 132.5] },
    ],
    quote: '通过上述实验可知：同种材料的导体，其电阻R与它……的长度l成正比，与它的横截面积S成反比；导体电阻还与构成它的材料有关。……通过上述实验可知：同种材料的导体，其电阻R与它',
    why: 'a/b只改变长度，a/c只改变横截面积，a/d只改变材料。同一滑片位置分别测四段电压，以电压比近似表示电阻比；换滑片改变电流后，比值仍近似相同。材料也影响电阻。电压表有有限输入电阻，造成很小的分流。',
    src: '课本第 58–59 页 · 第十一章 第2节 导体的电阻',
  },
  create(ctx) {
    const rig = fourConductorRig(),
      { group, circuit, sw, rheostat, meter, digital } = rig;
    let ui,
      body,
      report,
      analysisTitle,
      ratioInputs,
      relation,
      aim,
      pair,
      round = null,
      rounds = [],
      stable = 0,
      sampleAge = 0,
      feedback = '',
      lastHint = '';
    const complete = () => rounds.filter((r) => r.complete && !r.aborted);
    const bar = lessonBar({
      ...ctx,
      group,
      steps: [
        { id: 'one', title: '第一组电压', todo: '合闸，把红黑表笔接到a两端，点数字表读数。', target: () => aim },
        { id: 'two', title: '改变电流复测', todo: '调原滑片，保持它不动，再读四段电压。', target: () => aim },
        { id: 'three', title: '再测一组', todo: '换第三个滑片位置，重复读数。', target: () => aim },
        { id: 'compare', title: '比较电压比', todo: '打开笔记本，用实际读数比较三个条件。', target: () => aim },
        { id: 'off', title: '断电收尾', todo: '断开原开关，保留读数。', target: () => aim },
      ],
    });
    function say(text, obj = null) {
      aim = obj;
      const msg = feedback + text;
      if (msg !== lastHint) {
        lastHint = msg;
        bar.say(msg);
      }
    }
    function enter() {
      feedback = '';
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    const contact = () => sampleContact(pair.probes.red.target, pair.probes.black.target);
    function guide() {
      if (bar.has('compare')) {
        if (sw.closed) return say('比较已完成。点原开关断电，结束本次实验。', sw.group);
        bar.done('off');
        return say('三组原读数已保存，电路已断开。');
      }
      if (complete().length >= 3) return say('三组读数已保存。打开笔记本，算电压比并比较导体条件。');
      if (!sw.closed) return say('点台后右侧开关合闸；四根导体始终串联在同一电路里。', sw.group);
      if (!round && complete().some((r) => Math.abs(r.pos - rheostat.pos) < 0.15))
        return say('这个滑片位置已测过。沿原滑杆移动约五分之一长度，换一组电流。', rheostat.slider);
      const id = FOUR_SAMPLES.find((s) => !round?.values[s.id])?.id || 'a';
      const wanted = rig.samples.find((s) => s.name === id);
      const left = circuit.terminalWorld(id + '.a').x < wanted.group.position.x;
      if (contact() === id && meter.value < -0.005)
        return say('电压显示负号，两笔接反了。交换红黑表笔后再读。', pair.probes.red.handle);
      if (contact() !== id) {
        // Other unread conductors are allowed; the guide suggests a consistent order only.
        const actual = contact();
        if (actual && !round?.values[actual] && meter.value > 0.005)
          return say(`当前跨接${actual}。保持滑片不动，点数字表保存这个读数。`, digital.screen);
        const red = pair.probes.red.target === id + '.a';
        return say(
          `按底板正面接${id}段：红笔到${left ? '左' : '右'}柱，黑笔到${left ? '右' : '左'}柱。拖表笔让金属尖端接触柱顶。`,
          red ? pair.probes.black.handle : pair.probes.red.handle,
        );
      }
      if (stable < 0.3) return say('保持滑片和表笔不动，等数字表显示稳定。', digital.screen);
      say(`正在测${id}段。点原数字表，把当前显示值记入笔记本。`, digital.screen);
    }
    function changed(reason) {
      stable = 0;
      sampleAge = 0;
      if (reason) return say(reason);
      guide();
    }
    pair = meterProbes(
      circuit,
      FOUR_SAMPLES.flatMap((s) => [s.id + '.a', s.id + '.b']),
      {
        changed,
        allow: () => '',
        mayLift: () => '',
        bounds: { x: [-0.33, 0.33], z: [-0.32, 0.32] },
        homes: { red: [0.12, 0.001, 0.16], black: [0.23, 0.001, 0.16] },
      },
    );
    for (const drag of pair.drags) {
      const start = drag.onStart;
      drag.onStart = (p) => {
        enter();
        start(p);
      };
    }
    function newRound() {
      const cells = FOUR_SAMPLES.map(() => h('td', {}, '—'));
      const num = h('td', {}, String(rounds.length + 1)),
        el = h('tr', {}, num, ...cells);
      const r = {
        number: rounds.length + 1,
        pos: rheostat.pos,
        values: {},
        cells,
        num,
        el,
        complete: false,
        aborted: false,
      };
      rounds.push(r);
      body.append(el);
      return r;
    }
    function read() {
      enter();
      if (!sw.closed) return guide();
      if (stable < 0.3) return say('等显示稳定，再点表保存读数。', digital.screen);
      if (complete().length >= 3) return guide();
      const id = contact();
      if (!id)
        return say('两笔需要跨在同一根导体的两端；跨多段、同一点或悬空都不能记作单段电压。', pair.probes.red.handle);
      if (meter.value < -0.005)
        return say('表显示负号，两笔接反了。交换红黑表笔，保留正向压降读数。', pair.probes.red.handle);
      if (!round && complete().some((r) => Math.abs(r.pos - rheostat.pos) < 0.15)) return guide();
      if (round?.values[id]) return guide();
      if (!round) round = newRound();
      const value = Number(digital.digits);
      if (!(value > 0)) return say('当前没有可用读数，检查两笔是否接触同一导体的两端。');
      round.values[id] = { value, text: digital.digits };
      round.cells[FOUR_SAMPLES.findIndex((s) => s.id === id)].textContent = digital.digits;
      feedback = `已记${id}：${digital.digits} V。`;
      if (FOUR_SAMPLES.every((s) => round.values[s.id])) {
        round.complete = true;
        round = null;
        bar.done(['one', 'two', 'three'][complete().length - 1]);
        if (complete().length === 3) {
          report.hidden = false;
          analysisTitle.textContent = `用第${complete()[0].number}组的实际电压计算三个比值，保留两位小数。三组都在同一套器材上测得。`;
        }
      }
      guide();
    }
    function slide(p) {
      const next = rheostat.posFromLocalX(p.x - rheostat.group.position.x);
      rheostat.setPos(next);
      if (round && Math.abs(round.pos - rheostat.pos) > 0.005) {
        round.aborted = true;
        round.num.textContent = round.number + '*';
        feedback = `滑片已改变，未读完的第${round.number}组保留为${round.number}*。从新一组重新测。`;
        round = null;
      }
      changed();
    }
    const pointer = draggable(
      group,
      [
        ...pair.drags,
        {
          obj: rheostat.slider,
          plane: 'xz',
          offset: 0.038,
          keepOffset: true,
          onStart: enter,
          onDrag: slide,
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: sw.group,
            onTap() {
              enter();
              sw.toggle();
              if (sw.closed) bar.undo('off');
              changed();
            },
          },
          { obj: digital.screen, onTap: read },
        ],
      },
    );
    function reset() {
      round = null;
      rounds = [];
      body.replaceChildren();
      report.hidden = true;
      ratioInputs.forEach((i) => (i.value = ''));
      relation.value = '';
      sw.closed = false;
      rheostat.setPos(1);
      pair.reset();
      circuit.solve();
      digital.draw(0);
      stable = sampleAge = 0;
      feedback = '';
      bar.undo('one', 'two', 'three', 'compare', 'off');
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.72, d: 0.72, h: 0.08 },
      view: { elev: 55, azim: 0, lookY: 0.25, margin: 1.06 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        body = h('tbody');
        const data = h(
          'table',
          { class: 'data' },
          h(
            'thead',
            {},
            h(
              'tr',
              {},
              ['组', 'a / V', 'b / V', 'c / V', 'd / V'].map((t) => h('th', {}, t)),
            ),
          ),
          body,
        );
        analysisTitle = note('');
        ratioInputs = ['Ub/Ua', 'Uc/Ua', 'Ud/Ua'].map((label) =>
          h('input', { type: 'number', step: '.01', 'aria-label': label, placeholder: label }),
        );
        relation = h(
          'select',
          { 'aria-label': '导体电阻的关系' },
          h('option', { value: '' }, '比较长度、截面积和材料'),
          h('option', { value: 'right' }, 'R与l成正比、与S成反比，材料也影响R'),
          h('option', { value: 'both' }, 'R与l、S都成正比'),
          h('option', { value: 'current' }, '改变电流才改变导体电阻'),
        );
        for (const el of [...ratioInputs, relation])
          el.addEventListener('input', () => {
            feedback = '';
            bar.undo('compare', 'off');
            guide();
          });
        report = h(
          'div',
          {},
          analysisTitle,
          ...ratioInputs.map((el, i) => h('label', { class: 'read-row' }, ['Ub/Ua：', 'Uc/Ua：', 'Ud/Ua：'][i], el)),
          h('div', { class: 'read-row' }, relation),
          buttons([
            {
              text: '核对比较',
              onClick() {
                enter();
                if (complete().length < 3) return guide();
                const values = complete()[0].values;
                for (let i = 0; i < 3; i++) {
                  const id = ['b', 'c', 'd'][i],
                    raw = ratioInputs[i].value.trim(),
                    v = Number(raw),
                    expected = values[id].value / values.a.value;
                  if (!raw || !Number.isFinite(v) || Math.abs(v - expected) > 0.025)
                    return say(`用第${complete()[0].number}组${id}的电压除以a的电压，填写实际比值；不要直接填理论值。`);
                }
                if (relation.value !== 'right')
                  return say('a/b只差长度，a/c只差横截面积，a/d只差材料。结合你测得的三个比值比较。');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(data, note('带*的组在读完前移动了滑片，保留已有读数，不用于同电流下的比值比较。'), report);
        ui.notes.append(
          note(
            '四根丝一直串联。合闸，拖红黑表笔依次跨在各段两端，点数字表留读数；也可以从其他段开始。每组测四段时保持滑片不动，测完再换滑片位置。电压表可带电移动表笔；不要把表笔跨多段当成一段。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '标签中的l=24 cm、S=0.0314 mm²；b长2l，c截面积2S（直径为√2倍），d换成锰铜。细丝直径放大4倍显示，长短与相对粗细保留；不用显示宽度测实际丝径。两种材料的20℃电阻率取教材表；长度、截面和电源为本活页名义配置。',
          ),
          note(
            '采用20℃定温、短时通电的欧姆导体近似，忽略自热。电源3 V、内阻0.30 Ω；变阻器20 Ω；电压表输入1 MΩ、显示0.01 V。有限表负载造成微小分流，比值近似反映电阻比；不将数字表取整造成的偏差改成标准答案。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        circuit.update(dt);
        stable += dt;
        sampleAge += dt;
        if (sampleAge >= 0.2) {
          digital.draw(Math.abs(meter.value) < 0.005 ? 0 : meter.value);
          sampleAge = 0;
        }
        if (stable >= 0.3 && stable - dt < 0.3) guide();
      },
      dispose() {
        pointer.dispose();
        pair.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
