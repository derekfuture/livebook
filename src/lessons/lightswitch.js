// 图5.3-5甲。可调电阻、光敏面、遮光片与红灯一直留在同一块实验板上。
import { lightSwitchRig, SENSOR_X, SENSOR_Z, SHADE_HOME, R_POS } from './kit/lightSwitchRig.js';
import { sensorLux, lightSwitchReadings, DAYLIGHT_LUX, photoResistance } from './kit/lightSwitch.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, note, buttons, h } from './kit/ui.js';

const visibleCurrent = 0.0001;
export default {
  id: 'lightswitch',
  fig: '图5.3-5',
  title: '用光敏电阻制作光控开关',
  stampText: '调试',
  predict: {
    q: '电路接好后，在强光下调到红灯刚好熄灭。只把黑卡片推到光敏电阻上方，红灯会怎样？',
    options: ['点亮', '仍然熄灭'],
    answer: 0,
    hint: '受光变弱时，光敏电阻变大。',
  },
  conclusion: {
    quote: '遮暗光敏面会使基极电流增大，三极管导通，点亮模拟路灯。上臂电阻调大后，需要更暗的环境才点亮。',
    why: '可调电阻接正极，光敏电阻接负极，两者的中点接基极。上下两臂的位置、光照和可调电阻共同决定三极管是否导通。',
    src: '人教版高中物理选择性必修第二册第 105–106 页，图5.3-5甲',
  },
  create(ctx) {
    const look = ctx.look;
    ctx = { ...ctx, look: (at, ...args) => look([at[0], at[1] + 0.0066, at[2]], ...args) };
    const rig = lightSwitchRig(),
      { group, S, shade, knob, leads } = rig;
    let ui, rows, form, view, aim, resistance, firstR, firstMark, secondMark, checkedMark, knobStart, knobGrab;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'connect', title: '连接电路', todo: '接好分压器和集电极支路，再接通电源。', target: () => aim },
        { id: 'trim', title: '在亮处调节', todo: '在光敏面未被遮挡时转动 R₁，使红灯刚好熄灭。', target: () => aim },
        { id: 'cover', title: '遮光和移开', todo: '遮挡光敏面，再移开卡片，看红灯怎样响应。', target: () => aim },
        { id: 'compare', title: '改变反应亮度', todo: '调大 R₁，比较红灯再次点亮时的遮挡位置。', target: () => aim },
      ],
    });
    const rail = (i) => (leads[i].to?.[0] === 'p' ? '+' : leads[i].to?.[0] === 'n' ? '−' : null);
    const correct = () => rail(0) === '+' && rail(1) === '−' && leads[2].to === 'c';
    const read = (x = shade.position.x) =>
      lightSwitchReadings({
        power: S.closed,
        resistance,
        lux: sensorLux(x - SENSOR_X, shade.position.z - SENSOR_Z),
        r1Rail: rail(0),
        photoRail: rail(1),
        collectorWire: leads[2].to === 'c',
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
    function near(which) {
      if (view === which) return leave();
      view = which;
      bar.near(true);
      if (which === 'dial') ctx.look([0.085, 0.021, 0.04], [0, 1, 0.13], ctx.camera.aspect >= 1 ? 0.48 : 0.36, leave);
      else ctx.look([0.02, 0.045, 0.009], [0.13, 0.72, 1], ctx.camera.aspect >= 1 ? 0.79 : 0.66, leave);
      guide();
    }
    function guide() {
      if (bar.finished) return say('两次点亮位置已记录。R₁ 较大时，要再多遮住一些光，红灯才亮。');
      if (!correct()) {
        if (S.closed)
          return say('先断开开关。检查分压器：R₁ 接正极、RG 接负极，两者中点已接 b；LED 返回线接 c。', S.group);
        if (rail(0) !== '+') return say('把 R₁ 引出的黄棕色插头接到红色正极柱。', leads[0].plug);
        if (rail(1) !== '−') return say('把 RG 引出的棕色插头接到黑色负极柱。', leads[1].plug);
        return say('将 LED 引出的红线接到三极管集电极 c。', leads[2].plug);
      }
      if (secondMark !== null && !S.closed) return say('展开笔记本，对照两次点亮时的遮挡位置。');
      if (!S.closed) return say('合上右侧刀开关。台灯照着 RG，观察旁边的红色 LED。', S.group);
      if (!bar.has('trim')) {
        if (shade.position.x < SHADE_HOME - 0.004) return say('先把黑色滑片向右拉回，让光敏面充分受光。', shade);
        if (read().collector >= visibleCurrent)
          return say('强光下红灯还亮。把 R₁ 旋钮向大阻值慢慢转，到红灯刚好熄灭。', knob);
        return say('红灯已经灭了。慢慢往小阻值回拨到刚亮，再略增大到刚灭。', knob);
      }
      if (firstMark === null) return say('把黑色滑片沿导轨向左推，逐渐遮住 RG，看红灯何时刚亮。', shade);
      if (!bar.has('cover')) return say('第一次点亮的位置已在导轨上留了红线。把滑片向右退回，让红灯熄灭。', shade);
      if (secondMark !== null) return say('第二次的点亮位置已记录。移开遮光片，确认红灯熄灭，再断电比较。', shade);
      if (resistance < firstR + 10000)
        return say('让光敏面充分受光，把 R₁ 比第一次调大至少 10 kΩ，再试同一块滑片。', knob);
      if (!checkedMark) return say('把滑片向左推到第一次的红线，对照此时红灯是否点亮。', shade);
      return say('滑片经过旧红线时灯仍灭。继续遮光，找到这一次的点亮位置。', shade);
    }
    function draw() {
      const r = read();
      rig.draw(resistance, r.collector);
    }
    function shadeMoved(from) {
      draw();
      if (!S.closed || !correct() || !bar.has('trim') || from < shade.position.x) return;
      const now = shade.position.x;
      if (firstMark !== null && bar.has('cover') && resistance >= firstR + 10000 && now <= firstMark && !checkedMark) {
        checkedMark = true;
        guide();
      }
      if (read(from).collector >= visibleCurrent || read(now).collector < visibleCurrent) return;
      let lo = now,
        hi = from;
      for (let n = 0; n < 20; n++) {
        const mid = (lo + hi) / 2;
        if (read(mid).collector >= visibleCurrent) lo = mid;
        else hi = mid;
      }
      const at = (lo + hi) / 2;
      if (firstMark === null) {
        firstMark = at;
        rig.mark.position.x = at;
        rig.mark.visible = true;
      } else if (bar.has('cover') && secondMark === null && checkedMark && resistance >= firstR + 10000) {
        secondMark = at;
        form.hidden = false;
      } else return;
      rows.add([(resistance / 1000).toFixed(1), ((SHADE_HOME - at) * 1000).toFixed(1)]);
      guide();
    }
    function trimEnded() {
      if (!S.closed || !correct() || shade.position.x < SHADE_HOME - 0.004) return guide();
      const cutoff = (photoResistance(DAYLIGHT_LUX) * (6 - 0.65)) / 0.65;
      if (!bar.has('trim') && resistance >= cutoff && resistance <= cutoff * 1.18) {
        firstR = resistance;
        bar.done('trim');
        guide();
      } else guide();
    }
    function wireItem(i) {
      const l = leads[i];
      let moved;
      return {
        obj: l.plug,
        plane: 'xz',
        offset: 0.008,
        keepOffset: true,
        enabled: () => !bar.finished,
        hint: '拖接线插头',
        onStart() {
          moved = false;
        },
        onDrag(p) {
          if (S.closed) return say('先断电，再改接线。', S.group);
          moved = true;
          l.to = null;
          l.plug.position.set(clamp(p.x, -0.16, 0.21), 0.009, clamp(p.z, -0.08, 0.12));
          rig.route(i);
        },
        onEnd() {
          if (!moved) return;
          let hit = null,
            d = 0.017;
          for (const [key, point] of Object.entries(rig.ports)) {
            const dist = Math.hypot(l.plug.position.x - point.x, l.plug.position.z - point.z);
            if (dist < d) {
              hit = key;
              d = dist;
            }
          }
          if (hit && leads.some((other) => other !== l && other.to === hit)) {
            l.plug.position.copy(l.home);
            rig.route(i);
            return say('这只接线柱已有插头；同一电源端的另一柱也可使用。');
          }
          if (hit && (i === 2 ? hit === 'c' : hit !== 'c')) {
            l.to = hit;
            l.plug.position.copy(rig.ports[hit]);
            l.plug.position.y += 0.003;
          } else l.plug.position.y = 0.005;
          rig.route(i);
          draw();
          guide();
        },
      };
    }
    const manip = draggable(
      group,
      [
        ...leads.map((_, i) => wireItem(i)),
        {
          obj: shade,
          plane: 'xz',
          offset: shade.position.y,
          keepOffset: true,
          hint: '沿导轨拖动遮光片',
          enabled: () => !bar.finished,
          onDrag(p) {
            const previous = shade.position.x;
            shade.position.x = clamp(p.x, SENSOR_X, SHADE_HOME);
            shadeMoved(previous);
          },
          onEnd(moved) {
            if (
              moved &&
              firstMark !== null &&
              !bar.has('cover') &&
              shade.position.x > SHADE_HOME - 0.004 &&
              correct() &&
              S.closed &&
              read().collector < visibleCurrent
            )
              bar.done('cover');
            guide();
          },
          onTap() {
            near('shade');
          },
        },
        {
          obj: knob,
          plane: 'xz',
          offset: R_POS[1],
          enabled: () => !bar.finished,
          hint: '绕轴转动 R₁ 旋钮，点旋钮近看',
          onStart(p) {
            knobStart = resistance;
            knobGrab = p ? Math.atan2(p.x - R_POS[0], R_POS[2] - p.z) : 0;
          },
          onDrag(p) {
            if (firstMark !== null && (!bar.has('cover') || secondMark !== null))
              return say('先把滑片退回，在同一阻值完成这次对照。', shade);
            if (bar.has('cover') && shade.position.x < SHADE_HOME - 0.004)
              return say('先把滑片退回，让光敏面充分受光再调阻值。', shade);
            if (firstMark === null && bar.has('trim')) bar.undo('trim');
            const a = Math.atan2(p.x - R_POS[0], R_POS[2] - p.z),
              delta = Math.atan2(Math.sin(a - knobGrab), Math.cos(a - knobGrab));
            resistance = clamp(knobStart + (delta / (1.5 * Math.PI)) * 50000, 1000, 51000);
            checkedMark = false;
            draw();
          },
          onEnd(moved) {
            if (moved) trimEnded();
          },
          onTap() {
            near('dial');
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: S.group,
            hint: '开合刀开关',
            onTap() {
              if (secondMark !== null && S.closed && shade.position.x < SHADE_HOME - 0.004)
                return say('先退回遮光片，观察红灯是否熄灭。', shade);
              S.toggle();
              draw();
              if (S.closed && correct()) bar.done('connect');
              guide();
            },
          },
          { obj: rig.dial, hint: '近看电位器和红灯', onTap: () => near('dial') },
          { obj: rig.rg, hint: '观察光敏面与遮挡位置', onTap: () => near('shade') },
        ],
      },
    );
    function reset() {
      if (view) leave();
      S.closed = false;
      resistance = 8000;
      firstR = firstMark = secondMark = null;
      checkedMark = false;
      shade.position.x = SHADE_HOME;
      rig.mark.visible = false;
      leads.forEach((l, i) => {
        l.to = null;
        l.plug.position.copy(l.home);
        rig.route(i);
      });
      rows?.clear();
      if (form) form.hidden = true;
      bar.undo('connect', 'trim', 'cover', 'compare');
      draw();
      guide();
    }
    reset();
    const mounted = new group.constructor();
    mounted.add(group);
    group.position.y = 0.0066;
    return {
      group: mounted,
      size: { w: 0.47, h: 0.195, d: 0.3 },
      view: { elev: 35, azim: 6, margin: 1.06 },
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
        rows = table(['R₁ / kΩ', '亮灯时滑片从右端推入 / mm']);
        const conclude = (dark) => {
          if (secondMark === null) return;
          if (S.closed) return say('退回遮光片并断电，再比较记录。');
          if (!dark) return say('第二次要遮住更多发光面，RG 受到的光比第一次弱。');
          bar.done('compare');
          form.hidden = true;
          guide();
        };
        form = h(
          'div',
          {},
          note('增大 R₁ 后，路灯开始点亮需要怎样的光照？'),
          buttons([
            { text: '更暗', onClick: () => conclude(true) },
            { text: '更亮', onClick: () => conclude(false) },
          ]).el,
        );
        form.hidden = true;
        panel.data.append(rows.el, form);
        panel.notes.append(
          note(
            '台灯模拟白天，黑卡沿导轨遮挡光敏电阻。R₁ 的可用调节范围为 1–51 kΩ，LED 串联 330 Ω 电阻。电路按图5.3-5甲连接。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        S.update(dt);
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
