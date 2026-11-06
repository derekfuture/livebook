import { RippleTank, WAVELENGTH, DX, NX, NZ } from './kit/rippleTank.js';
import { rippleRig, TANK_W, TANK_D, WATER, WALL_Z } from './kit/rippleRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';

export default {
  id: 'ripplediffraction',
  fig: '图3.3-3',
  title: '观察水波通过狭缝',
  stampText: '观察',
  predict: {
    q: '保持波长，把宽缝收窄到接近一个波长。缝后的波峰会怎样？',
    options: ['更明显地向两侧展开', '只能沿原方向前进', '入射波长也变短'],
    answer: 0,
  },
  conclusion: {
    quote: '狭缝宽度接近或小于波长时，缝后波面向两侧展开得更明显。',
    why: '宽缝中央的波面大致沿原方向传播，缝边也有衍射。缩窄狭缝后，透射波能绕向挡板后面。比较的是传播方向的分布；通过窄缝的总能量也会改变。',
    src: '人教版选择性必修第一册第 72 页，图 3.3-3 甲、乙',
  },
  create(ctx) {
    const tank = new RippleTank(),
      rig = rippleRig(tank),
      { group } = rig;
    let on = false,
      near = false,
      age = 0,
      settling = false,
      origin,
      point,
      ui,
      photos;
    const saved = new Set();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'source', title: '产生平面波', todo: '接通振源，看长直振片拍水。', target: () => rig.knob },
        { id: 'wide', title: '宽缝波形', todo: '从上方看宽缝后的波峰。' },
        { id: 'narrow', title: '窄缝波形', todo: '把两块挡板向内推，比较同波长下的波面。' },
      ],
    });
    const gap = () => tank.right - tank.left;
    const regime = () => (gap() >= 3 * WAVELENGTH ? 'wide' : gap() > DX && gap() <= WAVELENGTH ? 'narrow' : null);
    function guide() {
      if (bar.finished) return bar.say('已留下两次波形。窄缝后波峰向两侧弯开，振源一侧的波长仍为 3.2 cm。');
      if (!on) return bar.say('按槽后振源上的红开关，观察直波峰向两块挡板传播。');
      if (age < 1.7) return bar.say('看波峰从振片传到缝口，再传向挡板后面。');
      if (gap() <= DX) return bar.say('两块挡板已经合拢。向外拖开一块，让水波能通过。');
      const kind = regime();
      if (!kind || saved.has(kind))
        return bar.say(
          saved.has('wide')
            ? '向内拖两块挡板的圆柄，把缝收窄到一个波长以内（3.2 cm）。'
            : '向外拖挡板，让缝宽超过三个波长，再看通过缝的波形。',
        );
      if (!near) return bar.say('点缝后的水面，从上方近看这一组波纹。');
      return bar.say(
        kind === 'wide'
          ? '在宽缝正前方，点已传播开的波纹，留作对照。'
          : '看波峰怎样绕到挡板后面，在缝口斜前方点弯开的波纹。',
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
      bar.near(true);
      ctx.look([0, WATER, 0.016], [0, 1, 0.025], ctx.camera.aspect < 1 ? 0.61 : 0.39, leave);
      guide();
    }
    function observe(p) {
      if (!near) {
        inspect();
        return;
      }
      const kind = regime();
      if (!on || age < 1.7 || !kind || saved.has(kind)) return guide();
      const beyond = p.z - WALL_Z,
        offset = Math.max(tank.left - p.x, p.x - tank.right);
      if (beyond < 0.036 || (kind === 'wide' ? offset > -0.005 : offset < 0.012))
        return bar.say(kind === 'wide' ? '顺着宽缝往前看，点缝正前方的波峰。' : '点缝口两侧、挡板后面的弯曲波纹。');
      const col = clamp(Math.round((p.x + TANK_W / 2) / DX), 0, NX - 1),
        row = clamp(Math.round((p.z + TANK_D / 2) / DX), 0, NZ - 1);
      let amplitude = 0;
      for (let z = Math.max(0, row - 4); z <= Math.min(NZ - 1, row + 4); z++)
        for (let x = Math.max(0, col - 4); x <= Math.min(NX - 1, col + 4); x++)
          amplitude = Math.max(amplitude, Math.abs(tank.surface[z * NX + x]));
      if (amplitude < 0.06) return bar.say('这里的波纹还很弱，沿着看得见的波纹往缝口方向找。');
      const caption = document.createElement('figcaption');
      caption.textContent = (kind === 'wide' ? '宽缝' : '窄缝') + ' ' + (gap() * 100).toFixed(1) + ' cm · 波长 3.2 cm';
      const figure = document.createElement('figure');
      figure.append(rig.snapshot(p.x, p.z), caption);
      photos.append(figure);
      saved.add(kind);
      bar.done(kind);
      guide();
    }
    function toggle() {
      on = !on;
      settling = !on;
      age = 0;
      if (on) bar.done('source');
      guide();
    }
    const pointer = draggable(
      group,
      [
        ...rig.boards.map(({ b, s }) => ({
          obj: b,
          plane: 'xz',
          offset: 0.033,
          hint: '沿槽宽左右移动挡板',
          onStart() {
            origin = s < 0 ? tank.left : tank.right;
          },
          onDrag(p, start) {
            if (!start) return;
            const end = origin + p.x - start.x;
            const left = s < 0 ? clamp(end, -TANK_W / 4, 0) : tank.left;
            const right = s > 0 ? clamp(end, 0, TANK_W / 4) : tank.right;
            if (left === tank.left && right === tank.right) return;
            tank.setGap(left, right);
            rig.layout();
            age = 0;
          },
          onEnd() {
            guide();
          },
        })),
        {
          obj: rig.water,
          plane: 'xz',
          offset: WATER,
          hint: '近看缝后波纹',
          onStart(p) {
            point = p?.clone();
          },
          onTap() {
            if (point) observe(point);
          },
        },
      ],
      { highlight: true, taps: [rig.knob, rig.drive].map((obj) => ({ obj, hint: '开关振源', onTap: toggle })) },
    );
    function reset() {
      if (near) leave();
      on = settling = false;
      age = 0;
      tank.clear();
      tank.setGap(-0.064, 0.064);
      rig.layout();
      rig.paintWave();
      saved.clear();
      photos?.replaceChildren();
      bar.undo('source', 'wide', 'narrow');
      guide();
    }
    return {
      group,
      size: { w: 0.56, d: 0.35, h: 0.048 },
      view: { elev: 53, azim: -6, margin: 1.06, lookY: 0.42 },
      toggles: ['steps'],
      pointer: {
        ...pointer,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return pointer.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        photos = document.createElement('div');
        panel.data.append(photos);
        panel.notes.append(
          note(
            '振片频率保持 5 Hz，模型中的水波速度为 0.16 m/s。波峰间距约 3.2 cm，槽旁刻度的数字以厘米为单位。暗明纹表示水面起伏。点水面留下的两次波形可在笔记本对照。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!on && !settling) return;
        tank.advance(dt, on);
        rig.paintWave();
        if (on) {
          const latest = age;
          age += dt;
          if (latest < 1.7 && age >= 1.7) guide();
        } else if (!tank.surface.some((h) => Math.abs(h) > 0.002) && !tank.previous.some((h) => Math.abs(h) > 0.002)) {
          settling = false;
          tank.clear();
          rig.paintWave();
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
