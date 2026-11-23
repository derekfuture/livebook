import * as THREE from 'three';
import {
  ThinFilmInterference,
  THIN_FILM,
  filmReflectance,
  filmThickness,
  flameShape,
  reflectedFlame,
} from './kit/thinFilmInterference.js';
import { thinFilmInterferenceRig } from './kit/thinFilmInterferenceRig.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, buttons } from './kit/ui.js';
export default {
  id: 'thinfilminterference',
  fig: '图4.3-5',
  title: '观察肥皂膜反射灯焰的干涉',
  stampText: '观察',
  predict: {
    q: '直接看黄光灯焰没有横条纹，用肥皂膜看它的反射像会怎样？',
    options: ['像上可能出现明暗相间条纹', '只会整体变黄', '膜后会多出一盏灯'],
    answer: 0,
  },
  conclusion: {
    crops: [
      { page: 102, rect: [215.97, 651.66, 536.98, 756.77] },
      { page: 103, rect: [63.78, 56.12, 384.79, 119.23] },
    ],
    quote: '灯焰的像和节前“问题”中提到的现象，都是液膜前后两个面反射的光共同形成的。来自两个面的反射光相互叠加，发生干涉，也称薄膜干涉。……在某些位置，这两列波叠加后相互加强，出现了亮条纹；在另一些位置，叠加后相互削弱，出现了暗条纹。',
    why: '同一灯焰的反射像中，不同位置膜厚不同，反射光的相位差不同；排液改变膜厚，同一位置的明暗随之改变。反射像随观察方向移动并受膜的边界限制，不是贴在膜上的条纹图片。',
    src: '课本第 98–99 页 · 第四章 第3节 光的干涉',
  },
  create(ctx) {
    const model = new ThinFilmInterference(),
      rig = thinFilmInterferenceRig(),
      { group } = rig;
    let ui,
      aim,
      near = false,
      rows,
      report,
      choice,
      bright = null,
      dark = false,
      time = 0,
      last = '',
      drawNumber = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'dip', title: '原环蘸膜', todo: '上下拖夹柄，让原环完整浸入肥皂水后提出。', target: () => aim },
        { id: 'light', title: '点亮黄光灯', todo: '点已撒盐的原酒精灯点亮。', target: () => aim },
        { id: 'bands', title: '观察明暗纹', todo: '点原环近看灯焰像，依次找亮纹和暗纹。', target: () => aim },
        { id: 'change', title: '观察同处变化', todo: '保留原膜，观察刚才亮纹处怎样变化。', target: () => aim },
        { id: 'explain', title: '比较灯焰与像', todo: '打开笔记本比较直接灯焰和膜中像。', target: () => aim },
        { id: 'off', title: '熄灯收尾', todo: '点原酒精灯熄灭。', target: () => aim },
      ],
    });
    function say(s, o = null) {
      aim = o;
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
    function guide() {
      if (bar.has('explain')) {
        if (model.lit) return say('比较完成。回到全景，点原酒精灯熄灭。', rig.lamp);
        bar.done('off');
        return say('这张膜的观察已保存，灯已熄灭。');
      }
      if (!model.film)
        return say(
          model.wet ? '原环已经蘸湿。向上拖夹柄，把整圈提出水面。' : '向下拖环上方的棕色夹柄，让整个铁丝圈浸入肥皂水。',
          rig.handle,
        );
      if (model.height - 0.045 <= 0.125) return say('先把整圈提出水面，再观察这张膜。', rig.handle);
      if (!model.lit) return say('点台前已撒食盐的原酒精灯，点亮黄光。', rig.lamp);
      if (!near)
        return say(
          bar.has('change') ? '打开笔记本，比较实际灯焰和膜中反射像。' : '点原铁丝圈近看，把肥皂膜当作镜子观察灯焰像。',
          bar.has('change') ? null : rig.rim,
        );
      if (!bright) return say('直接灯焰没有横条纹。点膜中灯焰像的一条亮纹。');
      if (!dark) return say('再点同一灯焰像中、亮纹之间的一条暗纹。');
      if (!bar.has('change')) return say('蓝圈标着刚才亮纹的位置。保留原膜，等明暗变化后再点蓝圈。');
      say('同一位置的明暗已改变。回到全景，打开笔记本比较。');
    }
    function relative(p) {
      const eye = group.worldToLocal(ctx.camera.getWorldPosition(new THREE.Vector3())),
        v = eye.clone().sub(p).normalize(),
        ct = Math.sqrt(1 - (1 - v.z * v.z) / THIN_FILM.index ** 2),
        h = filmThickness(p.y - model.height, model.age),
        max = filmReflectance(THIN_FILM.wavelength / (4 * THIN_FILM.index * ct), Math.max(0, v.z));
      return { eye: eye.toArray(), ratio: filmReflectance(h, Math.max(0, v.z)) / Math.max(1e-8, max) };
    }
    function record(label) {
      rows.append(h('tr', {}, h('td', {}, String(model.draws)), h('td', {}, model.age.toFixed(1)), h('td', {}, label)));
    }
    function inspect(ray) {
      enter();
      if (!model.film || !model.lit || model.height - 0.045 <= 0.125) return guide();
      if (!near) {
        near = true;
        bar.near(true);
        ctx.look([-0.08, model.height, 0], [-0.485, 0.06, 0.875], 0.33, leave);
        return guide();
      }
      const hit = ray.intersectObject(rig.pick, false)[0];
      if (!hit) return;
      const p = group.worldToLocal(hit.point.clone()),
        r = relative(p);
      if (!reflectedFlame(p.toArray(), r.eye, flameShape(time), rig.ring.position.toArray()))
        return say('这里不在灯焰的反射像里。点膜中黄色灯焰像里的亮纹或暗纹。');
      if (!bright) {
        if (r.ratio < 0.55) return say('先点一条较亮的黄色条纹，记录它的位置。');
        bright = { point: p.clone(), ratio: r.ratio, age: model.age };
        rig.marker.position.set(p.x + 0.08, p.y - model.height, 0.0005);
        rig.marker.userData.marked = true;
        record('灯焰像：亮纹');
        return guide();
      }
      if (!dark) {
        if (r.ratio > 0.18) return say('找两条亮纹之间较暗的横纹，仍要点在灯焰像的轮廓内。');
        dark = true;
        bar.done('bands');
        record('灯焰像：暗纹');
        return guide();
      }
      if (!bar.has('change')) {
        const local = rig.ring.worldToLocal(hit.point.clone()),
          distance = Math.hypot(local.x - rig.marker.position.x, local.y - rig.marker.position.y);
        if (distance > 0.006) return say('点蓝圈标出的原位置，比较同一处，而不是换另一个位置。');
        const point = new THREE.Vector3(rig.marker.position.x - 0.08, rig.marker.position.y + model.height, 0),
          now = relative(point);
        if (model.age - bright.age < 3 || Math.abs(now.ratio - bright.ratio) < 0.25)
          return say('这个位置的变化还不明显。继续看原膜，稍后再点蓝圈。');
        bar.done('change');
        record(now.ratio < bright.ratio ? '原亮纹处变暗' : '原位置进一步变亮');
        report.hidden = false;
        leave();
        guide();
      }
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.handle,
          plane: 'xy',
          offset: 0,
          keepOffset: true,
          onStart() {
            enter();
            if (near) leave();
          },
          onDrag(p) {
            model.setHeight(p.y - 0.115);
            if (model.draws !== drawNumber) {
              drawNumber = model.draws;
              bright = null;
              dark = false;
              rig.marker.userData.marked = false;
              report.hidden = true;
              bar.undo('bands', 'change', 'explain', 'off');
              bar.done('dip');
            }
            guide();
          },
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.lamp,
            onTap() {
              enter();
              model.lit = !model.lit;
              if (model.lit) {
                bar.done('light');
                bar.undo('off');
              }
              guide();
            },
          },
          { obj: rig.ring, onTap: inspect },
        ],
      },
    );
    function reset() {
      enter();
      if (near) leave();
      model.reset();
      bright = null;
      dark = false;
      drawNumber = 0;
      rig.marker.userData.marked = false;
      rows.replaceChildren();
      choice.value = '';
      report.hidden = true;
      bar.undo('dip', 'light', 'bands', 'change', 'explain', 'off');
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.52, d: 0.51, h: 0.45 },
      view: { azim: -28, elev: 20, lookY: 0.53, margin: 1.1 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = h('tbody');
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
                ['膜', '提出后 / s', '实际观察'].map((t) => h('th', {}, t)),
              ),
            ),
            rows,
          ),
        );
        choice = h(
          'select',
          { 'aria-label': '薄膜条纹来源' },
          h('option', { value: '' }, '比较灯焰和膜中的像'),
          h('option', { value: 'film' }, '膜两面反射光干涉，膜厚改变明暗'),
          h('option', { value: 'flame' }, '灯焰本身出现了横条纹'),
          h('option', { value: 'paint' }, '条纹是铁丝圈上的固定花纹'),
        );
        choice.addEventListener('input', () => {
          enter();
          bar.undo('explain', 'off');
          guide();
        });
        report = h(
          'div',
          {},
          choice,
          buttons([
            {
              text: '核对观察',
              onClick() {
                enter();
                if (choice.value !== 'film')
                  return say('直接看灯焰，它没有横条纹；原膜同一位置的明暗会随时间改变。比较这两条观察。');
                bar.done('explain');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(report);
        ui.notes.append(
          note(
            '上下拖原环上方夹柄，完整蘸入肥皂水再提出。灯芯已撒食盐，点酒精灯点亮黄光。点环近看、找一亮一暗两条纹；蓝圈只标记你选过的位置，保留原膜再比较同处明暗。重新完整蘸膜会形成新膜，旧记录保留，但要重新观察。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '光学使用空气—肥皂膜—空气的菲涅耳反射与多光束叠加，含一次反射相位反转和斜入射膜内角；以589.3 nm近似钠黄光，折射率名义取1.333。像由当前视线反射回真实灯焰的位置求得，并受铁丝圈边界限制。固定曝光用于看清较弱反射。',
          ),
          note(
            '为展示排液，初始膜厚从上方0.2 μm连续变化到底部1.8 μm，按45秒名义时间常数缓慢趋于25 nm，排出的体积计入边缘液体。此处为定性排液近似，不预测实际配方的变薄速度、流纹或破裂；条纹由每处当前光程计算，不用预制条纹图。',
          ),
          note(
            '补充光学依据：<a href="https://openstax.org/books/university-physics-volume-3/pages/3-4-interference-in-thin-films" target="_blank" rel="noopener">OpenStax：薄膜干涉与反射相位</a>。',
          ),
        );
        guide();
      },
      update(dt, t) {
        bar.update(dt);
        time = t;
        model.advance(dt);
        rig.update(model, ctx.camera, t);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
      },
    };
  },
};
