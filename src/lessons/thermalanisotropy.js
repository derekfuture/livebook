import { ThermalAnisotropy } from './kit/thermalAnisotropy.js';
import { thermalAnisotropyRig, THERMAL_LAYOUT as L } from './kit/thermalAnisotropyRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, buttons } from './kit/ui.js';
export default {
  id: 'thermalanisotropy',
  fig: '图2.4-4',
  title: '观察样片的导热方向差异',
  stampText: '实验',
  predict: {
    q: '从样片背面中央加热，熔蜡轮廓能告诉我们什么？',
    options: ['不同方向传热是否相同', '只说明哪块样片质量大', '只说明烙铁朝向'],
    answer: 0,
  },
  conclusion: {
    quote: '熔化区域的方向差异可以反映样片沿不同方向的导热差异。',
    why: '玻璃的名义面内导热系数相同，中心加热后近似圆形；本课按教材现象设置的各向异性示意片（教材云母情境），两个面内方向的系数不同，形成拉长的区域。不能只凭熔化面积判断各向异性，也不能把任何晶体的所有方向都说成不同。',
    src: '人教版高中物理选择性必修第三册第32页，图2.4-4、2.4-5。右侧为各向异性示意片，不代表天然云母的实测导热张量。',
  },
  create(ctx) {
    const model = new ThermalAnisotropy(),
      rig = thermalAnisotropyRig(),
      { group } = rig;
    let ui,
      aim,
      near = null,
      body,
      report,
      choice,
      x = 0,
      y = L.tipMin,
      drawAge = 0,
      records = [null, null],
      last = '',
      holdUntil = 0,
      dragLock = null,
      activeContact = null;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'power', title: '给烙铁通电', todo: '点前方电源开关，给原烙铁通电。', target: () => aim },
        { id: 'glass', title: '观察玻璃', todo: '拖烙铁手柄到玻璃背面中央，再向上推到接触。', target: () => aim },
        { id: 'mica', title: '观察示意片', todo: '降低原烙铁，再移到示意片背面中央加热。', target: () => aim },
        { id: 'compare', title: '比较方向', todo: '打开笔记本，比较保存的两个实际轮廓。', target: () => aim },
        { id: 'off', title: '断电收尾', todo: '降低烙铁并断电，观察余热。', target: () => aim },
      ],
    });
    function say(t, o = null) {
      aim = o;
      if (t !== last) {
        last = t;
        bar.say(t);
      }
    }
    function warn(t, o = null) {
      holdUntil = model.time + 2;
      say(t, o);
    }
    function enter() {
      last = '';
      holdUntil = 0;
      if (document.body.classList.contains('predicting')) ui?.go(1);
    }
    function leave() {
      near = null;
      ctx.back();
      bar.near(false);
      guide();
    }
    function contact() {
      const i = L.centers.findIndex((cx) => Math.abs(x - cx) < L.side / 2 - 0.001);
      return y > L.tipMax - 0.0003 && i >= 0 ? i : null;
    }
    function guide() {
      if (model.time < holdUntil) return;
      if (bar.has('compare')) {
        if (model.on) return say('先降低烙铁，再点电源开关断电。', y > L.tipMin + 0.01 ? rig.handle : rig.button);
        if (y > L.tipMin + 0.01) return say('烙铁还有余热。向下拖回最低位置，让热端离开样片。', rig.handle);
        bar.done('off');
        return say('已断电，热端离开样片。余热会继续传导，熔蜡随后冷却凝固。');
      }
      if (near !== null) {
        const shape = model.shape(near);
        return say(
          shape.count < 65
            ? '保持背面中央接触，等中心周围出现可分辨的熔化区域。'
            : '观察浅色石蜡退开的实际轮廓，再点样片保存这一刻的观察。',
          rig.plates[near].wax,
        );
      }
      if (!model.on) return say('点前方电源开关通电。没有接触样片时，烙铁只自身升温。', rig.button);
      if (records.every(Boolean)) return say('两块原样片的轮廓已保存。打开笔记本，比较不同方向的延伸。');
      const wanted = records[0] ? 1 : 0,
        i = contact();
      if (i === null)
        return say(
          Math.abs(x - L.centers[wanted]) > 0.007
            ? `拖绿色烙铁手柄：先向下降低，再横移到${wanted ? '右侧示意片' : '左侧玻璃'}的中央下方。`
            : '横向位置已对准，向上推手柄，让尖端接触样片背面。',
          rig.handle,
        );
      if (Math.abs(x - L.centers[i]) > 0.003)
        return say('加热点偏离中央。先降低烙铁，横移对准样片中心，再向上接触。', rig.handle);
      if (model.iron < 70) return say('保持接触，等烙铁升温；石蜡不会在刚通电时立刻熔化。', rig.handle);
      if (model.shape(i).count < 65) return say('保持烙铁不动，看石蜡从加热点向周围逐渐熔开。', rig.plates[i].wax);
      say(`点${i ? '示意' : '玻璃'}片近看熔化轮廓，再点一次保存观察。`, rig.plates[i].wax);
    }
    function move(p) {
      const nextX = clamp(p.x, -0.14, 0.14),
        requestedY = clamp(p.y + 0.0675, L.tipMin, L.tipMax),
        nextY = requestedY > L.tipMax - 0.002 ? L.tipMax : requestedY;
      if (dragLock !== null && nextY > L.tipMax - 0.003 && Math.abs(nextX - dragLock) > 0.003) {
        warn('先向下降低烙铁，再横移，避免贴着样片刮动。', rig.handle);
        y = Math.min(nextY, y);
        rig.move(x, y);
        sync();
        return;
      }
      if (nextY < L.tipMax - 0.003) dragLock = null;
      x = nextX;
      y = nextY;
      rig.move(x, y);
      sync();
      guide();
    }
    function sync() {
      const i = contact();
      if (i !== activeContact || i !== null) {
        activeContact = i;
        model.setContact(i, i === null ? 0 : x - L.centers[i], 0);
      }
    }
    function observe(i) {
      enter();
      if (near !== i) {
        near = i;
        bar.near(true);
        ctx.look([L.centers[i], L.plateY, 0], [0, 1, 0.015], 0.19, leave);
        return guide();
      }
      const shape = model.shape(i);
      if (records[i]) return say('这一块的观察已保存。回到全景，继续另一块样片。');
      if (contact() !== i || Math.abs(x - L.centers[i]) > 0.003)
        return warn('要比较中心加热的轮廓。回到全景，把烙铁对准这块样片背面中央。');
      if (shape.count < 65) return guide();
      if (Math.hypot(shape.x, shape.y) > 0.0025)
        return warn('之前移动过热端，现有熔化区偏心。先移开等石蜡凝固，再固定在中心加热。');
      const snapshot = h('canvas', {
        width: 512,
        height: 512,
        'aria-label': i ? '示意片实际熔蜡轮廓' : '玻璃实际熔蜡轮廓',
      });
      snapshot.style.width = '130px';
      snapshot.style.height = '130px';
      snapshot.getContext('2d').drawImage(rig.plates[i].texture.canvas, 128, 128, 256, 256, 0, 0, 512, 512);
      records[i] = { time: model.time, shape };
      body.append(h('tr', {}, h('td', {}, i ? '各向异性示意片' : '玻璃'), h('td', {}, snapshot)));
      bar.done(i ? 'mica' : 'glass');
      report.hidden = !records.every(Boolean);
      leave();
      guide();
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
            dragLock = y > L.tipMax - 0.003 ? x : null;
          },
          onDrag: move,
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.button,
            onTap() {
              enter();
              model.setPower(!model.on);
              if (model.on) {
                bar.done('power');
                bar.undo('off');
              }
              guide();
            },
          },
          ...rig.plates.map((p, i) => ({
            obj: p.wax,
            onTap() {
              observe(i);
            },
          })),
        ],
      },
    );
    function reset() {
      enter();
      if (near !== null) leave();
      model.reset();
      x = 0;
      y = L.tipMin;
      activeContact = null;
      rig.move(x, y);
      rig.draw(model);
      records = [null, null];
      body.replaceChildren();
      report.hidden = true;
      choice.value = '';
      bar.undo('power', 'glass', 'mica', 'compare', 'off');
      guide();
    }
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.39, d: 0.39, h: 0.22 },
      view: { azim: 18, elev: 38, lookY: 0.45, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        body = h('tbody');
        ui.data.append(
          h(
            'table',
            { class: 'data' },
            h('thead', {}, h('tr', {}, h('th', {}, '样片'), h('th', {}, '中心同尺度放大'))),
            body,
          ),
        );
        choice = h(
          'select',
          { 'aria-label': '导热方向比较' },
          h('option', { value: '' }, '比较两个轮廓'),
          h('option', { value: 'right' }, '玻璃各方向相近，示意片有方向差异'),
          h('option', { value: 'area' }, '只看面积大小就能判断各向异性'),
          h('option', { value: 'all' }, '所有晶体在所有方向的性质都不同'),
        );
        choice.addEventListener('input', () => {
          enter();
          bar.undo('compare', 'off');
          guide();
        });
        report = h(
          'div',
          {},
          note('比较同一块样片上不同方向的延伸，而不是只比较两块的熔化面积。'),
          choice,
          buttons([
            {
              text: '核对比较',
              onClick() {
                enter();
                if (choice.value !== 'right')
                  return warn('各向异性比较的是方向。查看同一块片上的轮廓，不能用面积大小代替方向差异。');
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
            '原烙铁装在可左右移动、上下升降的支架上。点电源，拖绿色手柄到样片中央下方，再上推至背面接触。先观察一块，降低烙铁再移到另一块。点样片近看并保存轮廓；两块片始终保留各自温度，离开热端后继续散热。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '右侧是各向异性示意片，用来解释教材图2.4-5的云母情境，不是天然云母样品的定量复现。本模型两个面内方向取3.2、1.6 W/(m·K)，为明确的名义参数，不是任意天然云母的实测值。不能把云母面内/面外的显著差异冒充解理面内差异；常见白云母解理面内可近似各向同性，晶向、品种和样片制备会影响观察。',
          ),
          note(
            '薄玻璃名义导热系数1.2 W/(m·K)，两方向相同。对实际温度场做二维热流计算，并保留石蜡54–58℃熔化区间的潜热、表面散热和烙铁余热。颜色只反映石蜡熔化分数，不用预制圆/椭圆图片。薄片沿厚度均温近似，忽略热接触压力变化和液态石蜡流动。',
          ),
        );
        rig.draw(model);
        guide();
      },
      update(dt) {
        bar.update(dt);
        model.advance(dt);
        drawAge += dt;
        if (drawAge > 0.15) {
          rig.draw(model);
          drawAge = 0;
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
