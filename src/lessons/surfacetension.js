import { SoapFilm } from './kit/soapFilm.js';
import { soapFilmRig, FILM_Y, RING_X, NEEDLE_HOME } from './kit/soapFilmRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';
export default {
  id: 'surfacetension',
  fig: '图2.5-2',
  title: '观察肥皂膜和棉线',
  stampText: '观察',
  predict: {
    q: '刺破松弛棉线一侧的膜，棉线会怎样变化？',
    options: ['被剩余的膜拉向有膜的一侧', '被拉向已经破膜的一侧', '两侧相抵，仍保持原形'],
    answer: 0,
  },
  conclusion: {
    page: 41, rect: [64.22, 56.12, 384.74, 119.23],
    quote: '观察结果表明，用烧热的针刺破棉线某一侧的薄膜后，另一侧肥皂膜就会立即收缩把松弛的棉线绷紧，并且始终向着肥皂膜一侧收缩，液体的表面具有收缩趋势。',
    why: '膜完整时，棉线两侧的拉力相抵。刺破一侧后，剩余膜把棉线拉向自身；刺破线圈内部后，外膜收缩并拉开线圈，使其接近圆形。线圈变大与外膜面积减小是同一过程。',
    src: '课本第 37 页 · 第二章 第5节 液体',
  },
  create(ctx) {
    const models = [new SoapFilm(), new SoapFilm({ loop: true })],
      rig = soapFilmRig(models),
      { group } = rig;
    let ui,
      near = false,
      active = -1,
      dip = null,
      drawAge = 0;
    const moving = [false, false],
      observed = [false, false];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'span',
          title: '刺破一侧',
          todo: '拖热针握柄，把针尖移到左环棉线的一侧，松手刺膜。',
          target: () => rig.handle,
        },
        {
          id: 'pull',
          title: '观察拉向哪边',
          todo: '等棉线绷紧，点左环观察它朝哪一侧弯。',
          target: () => rig.rings[0].rim,
        },
        {
          id: 'loop',
          title: '刺破圈内',
          todo: '拖同一根针，把针尖移到右环的小棉线圈里面，松手。',
          target: () => rig.handle,
        },
        {
          id: 'round',
          title: '观察线圈张开',
          todo: '等线圈张开，点右环观察圆孔与剩余膜。',
          target: () => rig.rings[1].rim,
        },
      ],
    });
    function valid(i) {
      const m = models[i];
      return i === 0 ? m.a !== m.b : !m.a && m.b;
    }
    function guide() {
      if (bar.finished) return bar.say('棉线被拉向剩余膜；圆孔扩大时，外膜面积减小。');
      const i = bar.current === 'span' || bar.current === 'pull' ? 0 : 1,
        m = models[i];
      if ((!m.a && !m.b) || (i === 1 && !m.b))
        return bar.say('这只环的膜已不符合本次对照。展开辅助说明，点“全部重做”重新准备。');
      if (valid(i) && moving[i]) return bar.say('看原棉线被剩余膜拉动，稍等它稳定，再点这只环观察。');
      if (near && (bar.current === 'span' || bar.current === 'loop'))
        return bar.say('先看松弛的棉线。点“回到全景”，再拖热针刺膜。');
      if (bar.current === 'span') return bar.say('拖热针握柄，针尖对准左环棉线的一侧，松手刺膜。');
      if (bar.current === 'pull') return bar.say('点左环观察：棉线向仍有浅蓝色膜的一侧弯曲。');
      if (bar.current === 'loop') return bar.say('拖同一热针，把针尖对准右环小线圈内部，松手。');
      return bar.say('点右环观察：线圈围成圆孔，外面的膜仍在。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect(i) {
      near = true;
      bar.near(true);
      ctx.look([RING_X[i], FILM_Y, 0], [0.1, 1, 0.5], ctx.camera.aspect < 1 ? 0.32 : 0.42, leave);
      guide();
    }
    function observe(i) {
      if (!valid(i)) {
        if (!near) inspect(i);
        return guide();
      }
      if (moving[i]) {
        if (!near) inspect(i);
        return guide();
      }
      observed[i] = true;
      if (i === 0) {
        bar.done('span');
        bar.done('pull');
        if (valid(1)) bar.done('loop');
        if (observed[1] && valid(1)) bar.done('round');
      } else if (bar.has('pull')) {
        bar.done('loop');
        bar.done('round');
      }
      if (near) leave();
      guide();
    }
    function puncture() {
      const i = active;
      if (i < 0) return;
      const m = models[i],
        region = m.regionAt(rig.needle.position.x - RING_X[i], -rig.needle.position.z);
      if (region === 'thread') return bar.say('针尖碰到棉线了。把针移到旁边的膜上，再松手。');
      if (!region) return bar.say('针尖没落在膜内。对准环内的膜，再松手。');
      if (!m.puncture(region)) return bar.say('这里已经没有膜。移动针尖检查剩余膜，或在辅助说明里重做。');
      moving[i] = true;
      observed[i] = false;
      rig.rings[i].draw();
      if (valid(i)) {
        if (i === 0) bar.done('span');
        else if (bar.has('pull')) bar.done('loop');
      }
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.handle,
          plane: 'xz',
          offset: NEEDLE_HOME[1] + 0.077,
          keepOffset: true,
          hint: '移动针尖，松手刺膜',
          onStart() {
            dip = null;
            rig.needle.position.y = NEEDLE_HOME[1];
          },
          onDrag(p) {
            rig.needle.position.x = clamp(p.x, -0.21, 0.25);
            rig.needle.position.z = clamp(p.z, -0.095, 0.16);
          },
          onEnd() {
            const x = rig.needle.position.x,
              z = rig.needle.position.z;
            active = RING_X.findIndex((cx) => Math.hypot(x - cx, z) < 0.072);
            if (active < 0) return bar.say('针尖没有对准铁丝环。移到环内再松手。');
            dip = { age: 0, hit: false };
          },
        },
        ...rig.rings.map((r, i) => ({ obj: r.pick, onTap: () => observe(i), hint: '观察原棉线和剩余膜' })),
      ],
      { highlight: true },
    );
    function reset() {
      if (near) leave();
      models.forEach((m) => m.reset());
      moving.fill(false);
      observed.fill(false);
      active = -1;
      dip = null;
      rig.needle.position.set(...NEEDLE_HOME);
      rig.draw();
      bar.undo('span', 'pull', 'loop', 'round');
      guide();
    }
    return {
      group,
      size: { w: 0.5, d: 0.34, h: 0.2 },
      view: { elev: 55, azim: 0, margin: 1.08 },
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
        panel.notes.append(
          note(
            '两只环已浸过肥皂液并架好，棉线仍松弛；热针已准备好。拖握柄移动针尖，松手时针尖下降刺膜。左环可刺任意一侧，右环应刺小线圈内部。误刺会保留真实结果，不会自动换膜。',
          ),
          buttons([
            { text: '近看左环', onClick: () => inspect(0) },
            { text: '近看右环', onClick: () => inspect(1) },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '本页观察平面内受力和形变，采用过阻尼、近似不可伸长棉线；不模拟针的热传导、膜破裂边缘高速回缩或排液。浅蓝色帮助辨认膜，非厚度或温度读数。形变时长不是实测值。全部重做恢复准备好的原装置。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (dip) {
          dip.age += dt;
          const t = dip.age;
          rig.needle.position.y =
            NEEDLE_HOME[1] - (NEEDLE_HOME[1] - FILM_Y) * Math.max(0, 1 - Math.abs(t - 0.18) / 0.18);
          if (t >= 0.18 && !dip.hit) {
            dip.hit = true;
            puncture();
          }
          if (t >= 0.36) {
            dip = null;
            rig.needle.position.y = NEEDLE_HOME[1];
          }
        }
        let changed = false;
        models.forEach((m, i) => {
          if (!moving[i]) return;
          m.advance(dt);
          changed = true;
          if (m.time > 0.5 && Math.max(...m.rates(m.points).v.map((v) => Math.hypot(...v))) < 0.0003) {
            moving[i] = false;
            guide();
          }
        });
        drawAge += dt;
        if (changed && drawAge > 0.035) {
          rig.draw();
          drawAge = 0;
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
