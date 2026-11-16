import { singleSlitRig, SINGLE_SLIT_X, SINGLE_SCREEN_X, SINGLE_AXIS } from './kit/singleSlitRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, buttons } from './kit/ui.js';
const SCREW_PITCH = 0.5,
  GRIP_RADIUS = 0.0067;
export default {
  id: 'singleslit',
  fig: '图4.5-1',
  title: '观察光的单缝衍射',
  stampText: '观察',
  predict: {
    q: '把已照亮的单缝逐渐缩窄，屏上中央亮区会一直变窄吗？',
    options: ['会一直变窄', '足够窄时反而会展宽', '只改变颜色'],
    answer: 1,
  },
  conclusion: {
    quote: '狭缝足够窄时，光的衍射明显，中央亮纹变宽。',
    why: '保持光源、屏距不变，继续缩窄窄缝，中央亮纹展宽，同时总透光量下降、亮度降低。宽缝的近场亮区近似保留缝的几何宽度，不能把所有缝宽都硬套远场公式。',
    src: '人教版高中物理选择性必修第一册第104–105页，图4.5-1',
  },
  create(ctx) {
    const rig = singleSlitRig(),
      { group } = rig;
    let ui,
      aim,
      near = '',
      lit = false,
      width = 0.0016,
      from = width,
      age = 0,
      dirty = false,
      body,
      report,
      answer,
      records = [],
      last = '';
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'wide', title: '观察宽缝', todo: '点光源开关，再点光屏近看宽缝亮区。', target: () => aim },
        { id: 'narrow', title: '缩窄单缝', todo: '向上拖棕色手轮，缩窄原缝，再看原屏。', target: () => aim },
        { id: 'narrower', title: '继续缩窄', todo: '再缩窄同一条缝，比较亮纹宽度和亮度。', target: () => aim },
        { id: 'compare', title: '比较观察', todo: '打开笔记本，对照同曝光记录。', target: () => aim },
        { id: 'off', title: '关光收尾', todo: '点原光源开关关光。', target: () => aim },
      ],
    });
    function say(s, obj = null) {
      aim = obj;
      if (last !== s) {
        bar.say(s);
        last = s;
      }
    }
    function enter() {
      last = '';
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function leave() {
      near = '';
      ctx.back();
      bar.near(false);
      guide();
    }
    function guide() {
      if (bar.has('compare')) {
        if (lit) return say('比较完成。点原光源开关关光，保留观察。', rig.power);
        bar.done('off');
        return say('三次观察已保存，光源已关闭。');
      }
      if (!lit) return say('点左端光源底座的小开关，照亮同一条狭缝。', rig.power);
      if (width < 0.00002) return say('缝已闭合，光被挡住。向下拖棕色手轮重新开缝。', rig.screw.grip);
      if (near === 'screen')
        return say('这是同一块屏的迎光面。观察亮区宽度、明暗条纹和亮度，再点一次屏面保存。', rig.screen);
      if (bar.has('narrower')) return say('三次同曝光观察已保存。打开笔记本，比较中央亮区和亮度。');
      if (!bar.has('wide'))
        return say(
          width < 0.0012
            ? '先向下拖手轮把缝放宽，取得宽缝对照（约1.2–1.6 mm）。'
            : '点右端光屏近看；观察后再点一次保存宽缝亮区。',
          width < 0.0012 ? rig.screw.grip : rig.screen,
        );
      if (!bar.has('narrow'))
        return say(
          width > 0.00028
            ? near === 'slit'
              ? '向上分次拖棕色手轮，调到约0.2 mm。回到全景，再点光屏观察。'
              : '点棕色手轮近看，向上分次拖到约0.2 mm，再回全景看光屏。'
            : width < 0.00014
              ? '缝已经太窄，先向下略调宽到约0.2 mm，留一组中间对照。'
              : near === 'slit'
                ? '已调到窄缝。回到全景，再点原光屏保存图样。'
                : '点原光屏近看并保存窄缝图样。',
          width > 0.00028 || width < 0.00014 ? rig.screw.grip : rig.screen,
        );
      const first = records[1]?.width;
      if (width < 0.000045) return say('这次缝过窄。向下略调宽到上一窄缝约一半，再观察。', rig.screw.grip);
      return say(
        width > first * 0.65
          ? '继续向上拖手轮，缩到上一窄缝约一半（约0.1 mm），再看原屏。'
          : near === 'slit'
            ? '回到全景，再点原光屏保存这次更窄的图样。'
            : '点原光屏近看并保存这次更窄的图样。',
        width > first * 0.65 ? rig.screw.grip : rig.screen,
      );
    }
    function focusSlit() {
      enter();
      near = 'slit';
      bar.near(true);
      ctx.look([SINGLE_SLIT_X, SINGLE_AXIS, 0.04], [-1, 0.3, 0.55], 0.18, leave);
      guide();
    }
    function inspect() {
      enter();
      if (!lit || width < 0.00002) return guide();
      if (near !== 'screen') {
        near = 'screen';
        bar.near(true);
        ctx.look(
          [SINGLE_SCREEN_X - 0.0021, SINGLE_AXIS, 0],
          [-1, 0, 0.025],
          ctx.camera.aspect > 2 ? 0.18 : 0.16,
          leave,
        );
        return guide();
      }
      if (age < 0.2) return say('手轮刚调过，等图样更新后再记录。');
      let id;
      if (!bar.has('wide')) {
        if (width < 0.0012) {
          leave();
          return guide();
        }
        id = 'wide';
      } else if (!bar.has('narrow')) {
        if (width < 0.00014 || width > 0.00028) {
          leave();
          return guide();
        }
        id = 'narrow';
      } else if (!bar.has('narrower')) {
        if (width < 0.000045 || width > records[1].width * 0.65) {
          leave();
          return say('需要保留非零的更窄狭缝，约为上一窄缝的一半。向下拖可重新开缝。', rig.screw.grip);
        }
        id = 'narrower';
      } else return guide();
      const canvas = h('canvas', {
        width: 800,
        height: 240,
        'aria-label': `缝宽${(width * 1000).toFixed(2)}毫米的实际光屏`,
      });
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas
        .getContext('2d')
        .drawImage(rig.canvas, 0, 256 * (0.5 - 0.006 / 0.045), 1024, (256 * 0.012) / 0.045, 0, 0, 800, 240);
      records.push({ width, canvas });
      body.append(
        h(
          'div',
          {},
          note(`第${records.length}次 · 缝宽 ${(width * 1000).toFixed(2)} mm · 屏中央12 mm高区域 · 同一曝光`),
          canvas,
        ),
      );
      bar.done(id);
      if (id === 'narrower') report.hidden = false;
      leave();
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.screw.grip,
          plane: 'xy',
          offset: 0.06,
          onStart() {
            enter();
            from = width;
          },
          onDrag(p, start) {
            if (start) {
              width = clamp(from - ((p.y - start.y) * SCREW_PITCH) / (2 * Math.PI * GRIP_RADIUS) / 1000, 0, 0.0016);
              dirty = true;
              age = 0;
              guide();
            }
          },
          onEnd: guide,
          onTap: focusSlit,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.power,
            onTap() {
              enter();
              lit = !lit;
              if (lit) bar.undo('off');
              rig.update(width, lit);
              guide();
            },
          },
          { obj: rig.screen, onTap: inspect },
          {
            obj: rig.holder,
            onTap: focusSlit,
          },
        ],
      },
    );
    function reset() {
      enter();
      if (near) leave();
      lit = false;
      width = 0.0016;
      rig.update(width, lit);
      dirty = false;
      age = 0;
      records = [];
      body.replaceChildren();
      report.hidden = true;
      answer.value = '';
      bar.undo('wide', 'narrow', 'narrower', 'compare', 'off');
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 1.02, d: 0.38, h: 0.19 },
      view: { azim: -28, elev: 27, lookY: 0.5, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        body = h('div');
        answer = h(
          'select',
          { 'aria-label': '单缝衍射观察' },
          h('option', { value: '' }, '比较两次窄缝图样'),
          h('option', { value: 'right' }, '缝更窄，中央亮纹更宽、亮度更低'),
          h('option', { value: 'brighter' }, '缝更窄，中央亮纹更宽、亮度更高'),
          h('option', { value: 'thin' }, '缝越窄，屏上亮区始终越窄'),
        );
        answer.addEventListener('input', () => {
          enter();
          bar.undo('compare', 'off');
          guide();
        });
        report = h(
          'div',
          {},
          answer,
          buttons([
            {
              text: '核对观察',
              onClick() {
                enter();
                if (answer.value !== 'right')
                  return say('看后两幅同曝光记录：较窄缝的中央亮纹伸到哪里？亮度怎样变化？');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(body, report);
        ui.notes.append(
          note(
            '开光后点原光屏近看，再点一次留记录。回到全景，向上拖棕色手轮缩窄缝，向下拖放宽；可分几次拖动。棕色手轮和小套筒都可点近看，沿用半毫米螺距的原测微头。闭合缝时光屏变暗，重新开缝即可。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '红光波长650 nm，缝到屏55 cm；宽度可连续调0–1.6 mm。固定刀口不动，另一刀口随螺杆移动，所以缝中心也略移。屏幕为不透光屏，只有迎光面显示条纹。',
          ),
          note(
            '图样由矩形孔径的标量菲涅耳场积分计算，保留宽缝近场到窄缝远场的连续变化；不是预制图片，也没有每次把峰值归一化。采用固定曝光/显示曲线，截图只供定性比较，不把显示像素当照度计。忽略偏振、刀口厚度与真实光源非均匀性。',
          ),
          note(
            '数学定义与数值核对：<a href="https://dlmf.nist.gov/7.2#iii" target="_blank">NIST DLMF Fresnel积分</a>；宽缝近场不使用远场sinc替代。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        age += dt;
        if (dirty) {
          rig.update(width, lit);
          dirty = false;
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
