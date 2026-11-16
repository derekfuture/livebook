import { ReflectionTank } from './kit/reflectionTank.js';
import { reflectionRig } from './kit/reflectionRig.js';
import { WATER } from './kit/rippleRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';

export default {
  id: 'wavereflection',
  fig: '图3.3-1',
  title: '观察水波的反射',
  stampText: '观察',
  predict: {
    q: '平面水波遇到斜挡板，接下来会怎样传播？',
    options: ['改变方向，向挡板前侧传回', '直接穿过挡板', '水波全停在挡板上'],
    answer: 0,
  },
  conclusion: {
    quote: '水波遇到挡板会发生反射，反射角等于入射角。',
    why: '传播方向与波峰线垂直。入射线、反射线和挡板的法线在同一平面内，入射线和反射线分居法线两侧。角度都从法线量起。改变挡板朝向，反射波的传播方向随之改变；板端还会发生衍射。',
    src: '人教版选择性必修第一册第 71 页，图 3.3-1',
  },
  create(ctx) {
    const tank = new ReflectionTank(),
      rig = reflectionRig(tank),
      { group } = rig;
    let on = false,
      settling = false,
      near = false,
      age = 0,
      firstAngle = null,
      point,
      startAngle,
      startBearing,
      ui,
      photos;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'source', title: '产生水波', todo: '按槽后红开关，观察直振片拍水。', target: () => rig.knob },
        { id: 'first', title: '看反射波', todo: '点水面近看，追着离开挡板的波峰看。' },
        { id: 'turn', title: '转动挡板', todo: '关闭振源，再沿水面拖挡板端部圆柄。', target: () => rig.grips[1] },
        { id: 'second', title: '再作对照', todo: '重新开振源，观察反射方向怎样改变。' },
      ],
    });
    function guide() {
      if (bar.finished) return bar.say('两次波形已留下。转动挡板，反射方向随之改变。');
      if (bar.current === 'turn')
        return bar.say(on ? '先按红开关停振，再拖挡板端部圆柄转动。' : '沿水面拖挡板端部圆柄，换个明显不同的朝向。');
      if (!on) return bar.say('按槽后红开关，让直振片拍水。');
      if (age < 2.5) return bar.say('看直波峰到达斜挡板，再向另一方向传开。');
      if (!near) return bar.say('点水面，从上方近看挡板前侧的反射波。');
      return bar.say('点挡板前侧向右传开的波纹，留下观察。');
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
      ctx.look([0, WATER, -0.005], [0, 1, 0.025], ctx.camera.aspect < 1 ? 0.61 : 0.72, leave);
      guide();
    }
    function toggle() {
      on = !on;
      settling = true;
      if (on) {
        age = 0;
        bar.done('source');
      }
      guide();
    }
    function observe(p) {
      if (!near) return inspect();
      if (!on || age < 2.5 || !['first', 'second'].includes(bar.current)) return guide();
      if (bar.current === 'second' && Math.abs(tank.angle - firstAngle) < (12 * Math.PI) / 180)
        return bar.say('挡板又转回原朝向了。先停振，再转开一些作对照。');
      const normalDistance = -p.x * Math.sin(tank.angle) + p.z * Math.cos(tank.angle);
      if (p.x < 0.035 || normalDistance > -0.018)
        return bar.say('看挡板朝振源的这一面，点向右传开的波纹；不是挡板后面。');
      let amplitude = 0;
      for (let j = -3; j <= 3; j++)
        for (let i = -3; i <= 3; i++)
          amplitude = Math.max(amplitude, Math.abs(tank.sample(p.x + i * 0.0025, p.z + j * 0.0025)));
      if (amplitude < 0.05) return bar.say('这里波纹还很弱，沿可见波峰往挡板靠近些。');
      const figure = document.createElement('figure'),
        caption = document.createElement('figcaption');
      caption.textContent = firstAngle === null ? '第一次 · 原挡板朝向' : '第二次 · 转动同一块挡板后';
      figure.append(rig.snapshot(), caption);
      photos?.append(figure);
      if (firstAngle === null) {
        firstAngle = tank.angle;
        bar.done('first');
      } else bar.done('second');
      guide();
    }
    const pointer = draggable(
      group,
      [
        ...rig.grips.map((obj) => ({
          obj,
          plane: 'xz',
          offset: 0.039,
          hint: '停振后沿水面转动挡板',
          onStart(p) {
            startAngle = tank.angle;
            startBearing = p ? Math.atan2(p.z, p.x) : null;
            if (on) guide();
          },
          onDrag(p) {
            if (on || startBearing === null) return;
            let delta = Math.atan2(p.z, p.x) - startBearing;
            delta = Math.atan2(Math.sin(delta), Math.cos(delta));
            tank.setBoard(clamp(startAngle + delta, (25 * Math.PI) / 180, (65 * Math.PI) / 180));
            rig.layout();
            age = 0;
          },
          onEnd() {
            if (firstAngle !== null && Math.abs(tank.angle - firstAngle) >= (12 * Math.PI) / 180) bar.done('turn');
            guide();
            if (!on && bar.current === 'turn') bar.say('这次转得还不明显，再沿水面转开一些。');
          },
        })),
        {
          obj: rig.water,
          plane: 'xz',
          offset: WATER,
          hint: '近看并观察反射波',
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
      firstAngle = null;
      tank.setBoard(Math.PI / 4);
      tank.clear();
      rig.layout();
      rig.paintWave();
      rig.normal.visible = false;
      photos?.replaceChildren();
      bar.undo('source', 'first', 'turn', 'second');
      guide();
    }
    return {
      group,
      size: { w: 0.44, d: 0.35, h: 0.05 },
      view: { elev: 58, azim: -6, margin: 1.06, lookY: 0.42 },
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
            '同一振源保持 5 Hz，模型波速 0.16 m/s、波长 3.2 cm。明暗表示水面起伏，竖向振幅为示意放大。虚线法线垂直挡板，入射角和反射角都从它量起。此页观察波峰方向，不作精密测角。停振后转动挡板，再开机比较；模型保留余波，但不模拟移板本身激起的水波。',
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
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!on && !settling) return;
        tank.advance(dt, on);
        rig.paintWave();
        if (!on && !tank.surface.some((h) => Math.abs(h) > 0.002) && !tank.previous.some((h) => Math.abs(h) > 0.002))
          settling = false;
        if (on) {
          const before = age;
          age += dt;
          if (before < 2.5 && age >= 2.5) guide();
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
