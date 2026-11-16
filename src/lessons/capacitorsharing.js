import { capacitorSharingRig } from './kit/capacitorSharingRig.js';
import { CapacitorSharing } from './kit/capacitorSharing.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, buttons, note, table } from './kit/ui.js';

export default {
  id: 'capacitorsharing',
  fig: '图10.4-4',
  title: '用两只电容器研究电荷量与电压',
  stampText: '实验',
  predict: {
    q: '给 A 充电，再与同样大小、原先不带电的 B 并联，A 的电压会怎样？',
    options: ['约减半', '基本不变', '约加倍'],
    answer: 0,
    hint: '两只电容器相同；并联后电压相同，原先的电荷重新分配。',
  },
  conclusion: {
    page: 44, rect: [216.5, 445.82, 537.42, 571.93],
    quote: '以上实验表明，电容器的电荷量变为原来的一半时，其两极板间的电势差也变为原来的一半。……精确的实验表明，一个电容器所带的电荷量Q与两极板之间的电势差U之比是不变的。不同的电容器，这个比一般是不同的，可见电荷量Q与电势差U之比表征了电容器储存电荷的特性。',
    why: '相同的 A、B 中，B 原先不带电。断开电源后并联，电荷近似均分，A 的 Q 和 U 都约减半。先隔离 A、放空 B，再并联，可以继续比较。B 有残余电荷时不满足这种均分条件。Q 指一块极板所带电荷量的绝对值。',
    src: '课本第 40 页 · 第十章 第4节 电容器的电容',
  },
  create(ctx) {
    const rig = capacitorSharingRig(),
      { group, selector: s1, discharge: s2, meter } = rig;
    const model = new CapacitorSharing();
    let angle = 0,
      lift = s2.openAngle,
      startLift = lift,
      startBearing = null;
    let ui,
      records,
      report,
      ratio,
      relation,
      aim,
      baseline = null,
      pending = null;
    let qualified = 0,
      run = 0,
      fault = false,
      changedAt = 0,
      displayedAt = 0,
      sampleAt = 0;
    let feedback = '';
    let lastHint = '',
      lastStep = '',
      wasReady = false,
      wasEmpty = true;
    const bar = lessonBar({
      ...ctx,
      group,
      steps: [
        { id: 'charge', title: '记录初值', todo: '把 S₁ 黑柄拖到 1，点电压表记下读数。', target: () => aim },
        { id: 'first', title: '第一次均分', todo: '把 S₁ 拨到 2，点同一块表记下电压。', target: () => aim },
        {
          id: 'again',
          title: '放空 B 再均分',
          todo: '先断开 S₁，合上 S₂ 放空 B，再打开 S₂、接通 2。',
          target: () => aim,
        },
        { id: 'compare', title: '比较记录', todo: '打开笔记本，比较两次均分前后的电压。', target: () => aim },
      ],
    });
    const ready = () => model.time - changedAt > 0.25 && displayedAt > changedAt + 0.08;
    const emptyB = () => Math.abs(model.voltages[1]) < Math.max(0.002, Math.abs(model.voltages[0]) * 0.002);
    function say(text, target = null) {
      text = feedback + text;
      aim = target;
      const step = bar.current;
      if (text === lastHint && step === lastStep) return;
      lastHint = text;
      lastStep = step;
      bar.say(text);
    }
    function guide() {
      if (fault) {
        if (model.contact === 2) return say('S₂ 正同时放掉 A、B 的电荷。先把 S₁ 拖回中间断开。', s1.handle);
        if (model.discharging) return say('抬起 S₂ 黑柄断开，再把 S₁ 拨到 1，重新给 A 充电。', s2.handle);
        return say('这一组已中止，旧记录保留。把 S₁ 拨到 1，重新给 A 充电。', s1.handle);
      }
      if (!ready()) return say('看同一块电压表，等示数稳定后点表记录。', meter.screen);
      if (pending) return say('点电压表，记下这次并联后的实际读数。', meter.screen);
      if (!baseline) {
        if (model.voltages[0] < 0.5) return say('把 S₁ 黑柄拖到左触点 1，给 A 充电；B 保持原来的状态。', s1.handle);
        return say('点电压表，记下 A 此时的电压作为本组起点。', meter.screen);
      }
      if (qualified >= 2)
        return say(
          bar.finished
            ? '已完成两轮均分与比较。还可继续拨动刀闸，观察 B 未放空时的结果。'
            : '两轮记录已保存。打开左边笔记本，比较电压比和 Q/U。',
        );
      if (model.voltages[0] < 0.5) return say('剩余电压太小。把 S₁ 拨到 1，重新充电后开始一组记录。', s1.handle);
      if (model.contact === 2) return say('把 S₁ 黑柄拖回中间，先隔离 A，再放空 B。', s1.handle);
      if (model.discharging) {
        if (!emptyB()) return say('S₂ 正在放空 B。随后抬起 S₂ 黑柄断开。', s2.handle);
        return say('B 已放空。抬起 S₂ 黑柄断开，再把 S₁ 拨到 2。', s2.handle);
      }
      if (!emptyB()) {
        if (model.contact !== 0) return say('B 还留有电荷。先把 S₁ 拖回中间，再压下 S₂ 放空 B。', s1.handle);
        return say('压下 S₂ 黑柄，让刀片落到接点上，放空 B。A 仍保持隔离。', s2.handle);
      }
      if (Math.abs(model.voltages[0] - baseline) > 0.025)
        return say('A 的电压已变化。先点表更新并联前读数，再拨到 2。', meter.screen);
      say('B 已放空，S₂ 已断开。把 S₁ 黑柄拖到右触点 2，让 A、B 并联。', s1.handle);
    }
    function enter() {
      feedback = '';
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    function restartRecords() {
      baseline = pending = null;
      qualified = 0;
      bar.undo('charge', 'first', 'again', 'compare');
      if (report) {
        report.hidden = true;
        ratio.value = relation.value = '';
      }
    }
    function bothDischarge() {
      if (model.contact !== 2 || !model.discharging || fault) return;
      records?.add([String(run), '—', '—', '中止：S₁ 接 2 时闭合 S₂，A、B 一起放电']);
      if (records) records.el.hidden = false;
      restartRecords();
      fault = true;
    }
    function setSelector(q) {
      angle = clamp(q, -s1.throwAngle, s1.throwAngle);
      s1.setAngle(angle);
      const next = Math.abs(angle) >= s1.throwAngle - 0.035 ? (angle < 0 ? 1 : 2) : 0;
      if (next === model.contact) return;
      if (next === 1) {
        restartRecords();
        run++;
        fault = false;
      }
      if (next === 2) {
        pending = {
          before: baseline,
          empty: emptyB(),
          reference: baseline !== null && Math.abs(model.voltages[0] - baseline) <= 0.025,
        };
      }
      model.setContact(next);
      changedAt = model.time;
      bothDischarge();
      guide();
    }
    function setDischarge(q) {
      lift = clamp(q, 0, s2.openAngle);
      s2.setAngle(lift);
      const closed = lift < 0.035;
      if (closed === model.discharging) return;
      model.setDischarge(closed);
      changedAt = model.time;
      bothDischarge();
      guide();
    }
    function read() {
      enter();
      if (fault || !ready()) return guide();
      const value = Number(meter.digits);
      if (pending) {
        if (!run) run = 1;
        const valid =
          pending.empty && pending.reference && pending.before >= 0.5 && Math.abs(value / pending.before - 0.5) < 0.03;
        records.el.hidden = false;
        records.add([
          String(run),
          pending.reference ? pending.before.toFixed(2) : '—',
          meter.digits,
          valid
            ? 'B 原先不带电，均分'
            : !pending.empty
              ? 'B 未放空，不能算作均分'
              : !pending.reference
                ? '缺少本次并联前读数'
                : '条件已改变，重做本轮',
        ]);
        feedback = `已记 ${pending.reference ? pending.before.toFixed(2) + ' → ' : ''}${meter.digits} V。${!pending.empty ? 'B 未放空，本轮不是均分。' : !pending.reference ? '缺少并联前读数，以当前读数重新开始。' : ''}`;
        pending = null;
        baseline = value;
        if (value >= 0.5) bar.done('charge');
        if (valid) {
          qualified++;
          bar.done(qualified === 1 ? 'first' : 'again');
        }
        report.hidden = qualified < 2;
        guide();
        return;
      }
      if (value < 0.5) return guide();
      if (baseline !== null && Math.abs(value - baseline) <= 0.025) return guide();
      if (!run) run = 1;
      baseline = value;
      feedback = `已记起点 ${meter.digits} V。`;
      records.el.hidden = false;
      records.add([String(run), meter.digits, '—', '记下 A 的起点']);
      bar.done('charge');
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: s1.blade,
          plane: 'xz',
          offset: 0.024,
          onStart: enter,
          onDrag(p) {
            const pivot = s1.group.position.clone().add(s1.blade.position);
            setSelector(Math.atan2(p.x - pivot.x, pivot.z - p.z));
          },
          onEnd(moved) {
            if (moved) setSelector(Math.abs(angle) > s1.throwAngle * 0.65 ? Math.sign(angle) * s1.throwAngle : 0);
            guide();
          },
        },
        {
          obj: s2.blade,
          plane: 'xy',
          offset: s2.group.position.z,
          onStart(p) {
            enter();
            startLift = lift;
            const pivot = s2.group.position.clone().add(s2.blade.position);
            startBearing = p ? Math.atan2(p.y - pivot.y, p.x - pivot.x) : null;
          },
          onDrag(p) {
            if (startBearing === null) return;
            const pivot = s2.group.position.clone().add(s2.blade.position),
              bearing = Math.atan2(p.y - pivot.y, p.x - pivot.x);
            setDischarge(startLift + Math.atan2(Math.sin(bearing - startBearing), Math.cos(bearing - startBearing)));
          },
          onEnd(moved) {
            // Knife seats against its contact stop when released close to it.
            // Move the actual blade first; conduction still follows its pose.
            if (moved && lift < 0.14) setDischarge(0);
            guide();
          },
        },
      ],
      { highlight: true, taps: [{ obj: meter.screen, onTap: read }] },
    );
    function reset() {
      model.reset();
      feedback = '';
      angle = 0;
      lift = s2.openAngle;
      s1.setAngle(angle);
      s2.setAngle(lift);
      meter.draw(0);
      fault = false;
      run = 0;
      changedAt = displayedAt = sampleAt = 0;
      wasReady = false;
      wasEmpty = true;
      restartRecords();
      records.clear();
      records.el.hidden = true;
      guide();
    }
    s1.setAngle(angle);
    s2.setAngle(lift);
    meter.draw(0);
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.6, d: 0.38, h: 0.08 },
      view: { elev: 50, azim: 0, lookY: 0.3, margin: 1.06 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['组', '并联前 U / V', '并联后 U / V', '条件与记录']);
        records.el.hidden = true;
        const select = (label, options) =>
          h(
            'select',
            { 'aria-label': label },
            h('option', { value: '' }, label),
            ...options.map(([value, text]) => h('option', { value }, text)),
          );
        ratio = select('均分后的电压约为原来的', [
          ['half', '1/2'],
          ['quarter', '1/4'],
          ['same', '1 倍'],
        ]);
        relation = select('同一个电容器的 Q/U', [
          ['same', '保持不变'],
          ['half', '每次减半'],
          ['double', '每次加倍'],
        ]);
        for (const el of [ratio, relation])
          el.addEventListener('change', () => {
            feedback = '';
            bar.undo('compare');
            guide();
          });
        report = h(
          'div',
          {},
          note(
            '只比较标为“均分”的记录：相同的 B 原先不带电，并联后分走约一半电荷。把 A 的电荷量变化与实际电压比对照。',
          ),
          ...[ratio, relation].map((el) => h('div', { class: 'read-row' }, el)),
          buttons([
            {
              text: '核对记录',
              onClick() {
                feedback = '';
                if (qualified < 2) return guide();
                if (ratio.value !== 'half') return say('用每行的“并联后”除以“并联前”：只比较本组 B 原先不带电的两轮。');
                if (relation.value !== 'same')
                  return say('均分时，A 的 Q 和 U 都约减半。两个量同时减半，它们的比值怎样变？');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(records.el, report);
        ui.notes.append(
          note(
            'S₁ 是中间的双掷刀闸：1 充电，2 并联，中间断开。S₂ 在 B 左边：压下放电，抬起断开。点同一块数字电压表保存当时显示的读数。记录留在笔记本。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '首次 B 不带电。以后先断开 S₁，闭合 S₂ 放空 B，再打开 S₂、接通 2。若 S₁ 仍在 2，闭合 S₂ 会把 A、B 一起放电；重新充电不自动清空 B。',
          ),
          note(
            '两只电容各 2200 μF，电源 6 V，表跨接 A，按 0.01 V 显示。电压表的有限输入电阻使 A 缓慢漏电；电荷近似均分不等于电场能守恒，连接过程有电阻耗散。Q 指一块极板的电荷量大小。',
          ),
          note(
            '集中参数近似：充电、并联、放电路径电阻分别为 1、2、2 Ω，代表电源、导线和接点损耗；表输入 10 MΩ。忽略电容自身 ESR、电感、介质吸收及额外绝缘漏电，不是实物标定。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        model.advance(dt);
        if (model.time - sampleAt >= 0.2) {
          sampleAt = displayedAt = model.time;
          meter.draw(model.voltages[0]);
        }
        const r = ready(),
          e = emptyB();
        if (r !== wasReady || e !== wasEmpty) {
          wasReady = r;
          wasEmpty = e;
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
