import { RefractionTank } from './kit/refractionTank.js';
import { refractionRig, REFRACTION_SCALE as SCALE } from './kit/refractionRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, h } from './kit/ui.js';

export default {
  id: 'waverefraction',
  fig: '图3.3-2',
  title: '观察深浅水中的折射',
  stampText: '观察',
  predict: {
    q: '同一振源产生的水波，从深处斜着进入浅处，波峰会怎样？',
    options: ['方向和间距都会改变', '只改变方向，间距不变', '直接消失'],
    answer: 0,
  },
  conclusion: {
    page: 76, rect: [216.5, 56.12, 531.42, 119.5],
    quote: '一列水波在深度不同的水域传播时，在交界面处将发生折射（refraction），如图3.3-2所示。',
    why: '本槽中，浅处传播较慢，同一振源的频率不变，波峰间距变短。斜着越过深浅分界时，传播方向向法线偏折；垂直分界传播时方向不变，间距仍缩短。看振片中段前方的波峰，传播方向与波峰线垂直；振片两端的弧形波还包含衍射。',
    src: '课本第 72 页 · 第三章 第3节 波的反射、折射和衍射',
  },
  create(ctx) {
    const tank = new RefractionTank(),
      rig = refractionRig(tank),
      { group } = rig,
      p = tank.parameters;
    let ui, aim, photos, report, oblique, normal, spacing;
    let near = false,
      nearSince = 0,
      age = 0,
      lastFrame = null,
      startBearing = null,
      startAngle = 0,
      point = null,
      ready = false;
    const records = new Map();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'source', title: '产生水波', todo: '按槽后红开关，让原振片拍水。', target: () => aim },
        {
          id: 'oblique',
          title: '斜着入射',
          todo: '点水面近看，比较波峰越过深浅分界前后的方向与间距。',
          target: () => aim,
        },
        {
          id: 'normal',
          title: '正着入射',
          todo: '停振后转动原振片，使它与深浅分界平行，再开振源作对照。',
          target: () => aim,
        },
        { id: 'compare', title: '比较两次', todo: '展开笔记本，用刚才的两次波纹记录作比较。', target: () => aim },
      ],
    });
    const say = (text, object = null) => {
      aim = object;
      bar.say(text);
    };
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const condition = () =>
      tank.angle < Math.PI / 60 ? 'oblique' : p.boundaryAngle - tank.angle < Math.PI / 60 ? 'normal' : null;
    function guide() {
      if (bar.finished) return say('两次记录已保留。可继续改变振片朝向，看同一水面上的波怎样传播。');
      if (records.size === 2) return say('两次波纹已记在笔记本。展开它，比较方向和波峰间距。');
      const wanted = records.has('oblique') ? 'normal' : 'oblique';
      const current = condition();
      if (current !== wanted && (!current || records.has(current))) {
        if (tank.powered) return say('先按红开关停振，再转动同一振片，换个入射方向。', rig.knob);
        if (!tank.canTurn()) return say('振片正在停下，已有水波会继续传播。稍等片刻再拖圆柄。', rig.grips[1]);
        return say(
          wanted === 'normal'
            ? '拖振片端部圆柄，让振片与水底的深浅分界线平行；随后再按红开关。'
            : '拖圆柄，把振片转回与槽后边平行；随后开振源，看波斜着越过深浅分界。',
          rig.grips[1],
        );
      }
      if (!tank.powered) return say('按槽后红开关，让这根振片拍水；深浅两区始终是同一槽水。', rig.knob);
      if (!near) return say('点水面从上方近看：水底斜线分开深区和浅区，留意波峰怎样越过它。', rig.water);
      if (age < 4.5) return say('等波峰越过深浅分界；比较中段波峰，振片两端还会有弧形波。');
      return say('比较分界前后的波峰方向与间距；点浅水区的波纹，留下这一次观察。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      if (!near) nearSince = tank.time;
      near = true;
      bar.near(true);
      // Keep the source switch and both depth labels in the overhead view too.
      ctx.look([0, rig.waterY, -0.006], [0, 1, 0.025], Math.max(1.05, ctx.camera.aspect * 0.45), leave);
      guide();
    }
    function toggle() {
      enter();
      tank.setPower(!tank.powered);
      if (tank.powered) {
        age = 0;
        bar.done('source');
      }
      rig.pose();
      guide();
    }
    function observe(local) {
      enter();
      if (!near) return inspect();
      if (!tank.powered || age < 4.5 || tank.time - nearSince < 1) return guide();
      const kind = condition();
      if (!kind) return say('这次是中间朝向。先停振，把振片与槽后边或深浅分界线平行，便于两次对照。', rig.knob);
      if (records.has(kind)) return guide();
      const x = local.x / SCALE,
        z = local.z / SCALE;
      if (Math.abs(x) > tank.width / 2 - p.spongeWidth || Math.abs(z) > tank.length / 2 - p.spongeWidth)
        return say('槽边灰色条吸收水波。点它内侧的浅水区波纹，记录越过分界后的波峰。');
      if (tank.signedDistance(x, z) < 0.025)
        return say('这里还在深区或分界附近。沿波峰传播方向，看较浅处，再点那里的波纹。');
      let amplitude = 0;
      for (let j = -3; j <= 3; j++)
        for (let i = -3; i <= 3; i++)
          amplitude = Math.max(amplitude, Math.abs(tank.sample(x + i * 0.005, z + j * 0.005)));
      if (amplitude < 0.000008) return say('这里波纹较弱，点振片中段前方、越过分界后的清晰波纹。');
      const figure = h(
        'figure',
        {},
        rig.snapshot(),
        h('figcaption', {}, kind === 'oblique' ? '斜入射 · 振片与槽后边平行' : '正入射 · 振片与深浅分界平行'),
      );
      records.set(kind, { angle: tank.angle, time: tank.time });
      photos.append(figure);
      bar.done(kind);
      if (report) report.hidden = records.size !== 2;
      guide();
    }
    const pointer = draggable(
      group,
      [
        ...rig.grips.map((obj) => ({
          obj,
          plane: 'xz',
          offset: rig.waterY + 0.014,
          onStart(local) {
            enter();
            startAngle = tank.angle;
            startBearing = local ? Math.atan2(local.z - p.sourceZ * SCALE, local.x - p.sourceX * SCALE) : null;
            if (!tank.canTurn()) say('先按红开关停振，等振片停下，再拖端部圆柄。', rig.knob);
          },
          onDrag(local) {
            if (startBearing === null || !tank.canTurn()) return;
            const bearing = Math.atan2(local.z - p.sourceZ * SCALE, local.x - p.sourceX * SCALE);
            const delta = Math.atan2(Math.sin(bearing - startBearing), Math.cos(bearing - startBearing));
            tank.setSourceAngle(clamp(startAngle + delta, 0, p.boundaryAngle));
            rig.pose();
            age = 0;
          },
          onEnd() {
            guide();
          },
        })),
        {
          obj: rig.water,
          plane: 'xz',
          offset: rig.waterY,
          onStart(local) {
            point = local?.clone();
          },
          onTap() {
            if (point) observe(point);
          },
        },
      ],
      { highlight: true, taps: [rig.knob, rig.drive].map((obj) => ({ obj, onTap: toggle })) },
    );
    function reset() {
      tank.reset();
      age = 0;
      lastFrame = null;
      ready = false;
      records.clear();
      photos.replaceChildren();
      for (const el of [oblique, normal, spacing]) el.value = '';
      report.hidden = true;
      rig.normal.visible = false;
      rig.paintWave();
      bar.undo('source', 'oblique', 'normal', 'compare');
      if (near) leave();
      else guide();
    }
    return {
      group,
      pointer,
      card: false,
      toggles: ['steps'],
      size: { w: tank.width * SCALE + 0.072, d: tank.length * SCALE + 0.1, h: 0.07 },
      view: { elev: 57, azim: 0, margin: 1.06 },
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
        oblique = select('斜入射时的传播方向', [
          ['bend', '向法线偏折'],
          ['same', '保持原方向'],
          ['away', '远离法线偏折'],
        ]);
        normal = select('正入射时的传播方向', [
          ['same', '保持原方向'],
          ['bend', '也明显转向'],
        ]);
        spacing = select('浅水区的波峰间距', [
          ['shorter', '两次都比深区小'],
          ['same', '两次都不变'],
          ['larger', '两次都比深区大'],
        ]);
        for (const el of [oblique, normal, spacing]) el.addEventListener('change', () => bar.undo('compare'));
        report = h(
          'div',
          {},
          note('对照自己刚留下的两张波纹。看振片中段前方，传播方向垂直于波峰线。'),
          ...[oblique, normal, spacing].map((el) => h('div', { class: 'read-row' }, el)),
          buttons([
            {
              text: '核对观察',
              onClick() {
                if (records.size !== 2) return guide();
                if (oblique.value !== 'bend')
                  return say('回看斜入射的记录：浅区波峰转了方向，传播方向更靠近分界线的法线。');
                if (normal.value !== 'same')
                  return say('回看正入射的记录：中段波峰越过分界前后仍平行，传播方向没有转弯。');
                if (spacing.value !== 'shorter')
                  return say('比较两张图中分界两侧的相邻波峰：浅区排列更密，波峰间距更短。');
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
            '红钮开关振源。停振后拖端部圆柄，转动同一振片；水底垫板固定，余波继续传播。点水面近看，再点浅区的波纹留下记录。先正入射、后斜入射也可以。',
          ),
          buttons([
            {
              text: '显示 / 隐藏法线',
              onClick() {
                rig.normal.visible = !rig.normal.visible;
              },
            },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '法线垂直深浅分界，角度从法线量起。固定垫板让水深分别为6mm与2mm，振源始终2Hz。明暗显示水面起伏，竖向位移放大4倍；槽边灰条吸波。此页定性观察，不用画面精密测角。',
          ),
          note(
            '教材图3.3-2是水波折射的照片示例，本活页的转片对照用于观察条件变化，并非教材另列的必做实验步骤。采用小振幅长重力波近似，忽略表面张力、垂向色散与转片带起的水波；波峰由同一水面的连续计算产生，不是预制图片。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const now = performance.now();
        const elapsed = lastFrame === null ? 0 : Math.min(0.25, (now - lastFrame) / 1000);
        lastFrame = now;
        const before = age;
        tank.advance(elapsed);
        if (tank.powered) age += elapsed;
        rig.paintWave();
        if ((before < 4.5 && age >= 4.5) || ready !== tank.canTurn()) guide();
        ready = tank.canTurn();
      },
      dispose() {
        pointer.dispose();
        rig.dispose();
        bar.dispose();
      },
    };
  },
};
