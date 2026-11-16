// 图 11.3-1、11.3-2。几何用米，仪器操作与记录用毫米。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { canvasTex, woodBlock } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, rayToLocal, clamp } from './kit/interact.js';
import { table, note, buttons } from './kit/ui.js';

const ORIGIN = -0.061,
  ZERO = ORIGIN + 0.012,
  Y = 0.01185,
  FACE = 0.015,
  OUT = 23.7,
  IN = 16.4,
  HOME = [0.018, 0.05];
const targetName = { outer: '外径', inner: '内径' };
const mm = (n) => n / 1000;
const xAt = (n) => ZERO + mm(n);
function scaleTexture(main) {
  const w = main ? 4096 : 1536,
    length = main ? 114 : 18,
    left = main ? -4 : -3;
  return canvasTex(w, Math.round((w * (main ? 8 : 7)) / length), (g, W, H) => {
    g.fillStyle = main ? '#d5dcda' : '#d9cdb3';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#263843';
    const x = (v) => ((v - left) * W) / length,
      spacing = main ? 1 : 0.9,
      end = main ? 100 : 10;
    g.font = (main ? 0.32 : 0.38) * H + 'px sans-serif';
    g.textAlign = 'center';
    for (let n = 0; n <= end; n++) {
      const xx = x(n * spacing),
        len = n % 5 === 0 ? 0.44 : 0.26,
        width = (W / length) * 0.045;
      g.fillRect(xx - width / 2, main ? H * (1 - len) : 0, width, len * H);
      if (n % 5 === 0) g.fillText(String(n), xx, H * (main ? 0.48 : 0.89));
    }
    if (main) g.fillText('mm', x(106), H * 0.63);
  });
}
export default {
  id: 'caliper',
  fig: '图11.3-1',
  title: '游标卡尺测圆管的外径与内径',
  stampText: '测量',
  predict: {
    q: '合拢时两尺零线重合。把游标向右移 0.1 mm，游标哪一条刻线会与主尺刻线对齐？',
    options: ['第 1 条', '第 5 条', '第 9 条'],
    answer: 0,
    hint: '游标的十个间隔一共长 9 mm。',
  },
  conclusion: {
    quote: '先在主尺上读游标零线所过的整毫米数，再由对齐的游标刻线读出不足一毫米的部分。',
    why: '这把卡尺的游标一格长 0.9 mm，比主尺一格短 0.1 mm。游标第 n 条线对齐，表示小数部分为 n × 0.1 mm。量外径时把外爪向内收，量内径时把内爪向外撑，同一根圆管的两个读数对应不同的接触面。',
    src: '人教版高中物理必修第三册第 62–64 页',
  },
  create(ctx) {
    const group = new THREE.Group(),
      tool = new THREE.Group();
    tool.position.x = ORIGIN;
    group.add(tool);
    const metal = 0x869ba0,
      light = 0xc2cccb;
    function block(parent, w, height, d, x, y, z, color, out = false) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), paint(color));
      if (out) inked(mesh, { width: 0.7 });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    function jaw(parent, outline, y, thickness, color, bevel = 0) {
      const shape = new THREE.Shape();
      outline.forEach(([x, z], i) => shape[i ? 'lineTo' : 'moveTo'](mm(x), mm(-z)));
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      if (bevel) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + (bevel * pos.getY(i)) / thickness);
        geo.computeVertexNormals();
      }
      const m = inked(new THREE.Mesh(geo, paint(color)), { width: 0.7 });
      m.position.y = y;
      parent.add(m);
      return m;
    }
    const slider = new THREE.Group();
    tool.add(slider);
    block(tool, 0.137, 0.004, 0.0095, 0.058, FACE - 0.002, -0.00475, metal, true);
    // 外爪相向的平面在 x=0 与 x=g。有量爪的金属实体始终留在间隙外面。
    jaw(
      tool,
      [
        [-9, -7],
        [0, -7],
        [0, 34],
        [-2, 32],
        [-7, 13],
      ],
      Y - 0.0019,
      0.0038,
      light,
    );
    jaw(
      slider,
      [
        [0, 2],
        [14, 2],
        [12, 8],
        [5, 12],
        [2, 32],
        [0, 34],
      ],
      Y - 0.0019,
      0.0038,
      light,
    );
    // 内爪刃背错开在两层厚度，闭合时可以重叠；相背的刃口在圆管中心高度。
    jaw(
      tool,
      [
        [-7, -6],
        [4, -6],
        [2, -17],
        [0, -29],
        [0, -13],
      ],
      Y - 0.0012,
      0.0012,
      light,
      -0.00025,
    ).position.x = 0.00025;
    jaw(
      slider,
      [
        [0, -29],
        [0, -13],
        [9, -7],
        [-3, -7],
        [-2, -17],
      ],
      Y,
      0.0012,
      metal,
      -0.00025,
    );
    const mainTex = scaleTexture(true),
      vernierTex = scaleTexture(false);
    function strip(parent, w, d, x, z, tex) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, FACE + 0.0001, z);
      parent.add(m);
      return m;
    }
    const main = strip(tool, 0.114, 0.008, 0.012 - 0.004 + 0.057, -0.004, mainTex);
    block(slider, 0.029, 0.005, 0.01, 0.012 + 0.006, FACE - 0.0025, 0.004, metal, true);
    // 两套刻线共用 z=0 的读数边。游标零线距移动爪接触面与主尺零线距固定爪相等。
    const vernier = strip(slider, 0.018, 0.007, 0.012 - 0.003 + 0.009, 0.0035, vernierTex);
    block(slider, 0.027, 0.003, 0.013, 0.014, Y - 0.0035, -0.003, metal);
    block(slider, 0.013, 0.006, 0.004, 0.008, FACE - 0.002, -0.01, metal);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0031, 0.0031, 0.0045, 18), paint(0xb59a65));
    screw.position.set(0.008, FACE + 0.002, -0.01);
    slider.add(screw);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.0048, 0.0004, 0.0006), paint(0x514c45));
    slot.position.y = 0.0023;
    screw.add(slot);
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.0033, 0.0033, 0.01, 24), paint(0x6e8185));
    thumb.rotation.z = Math.PI / 2;
    thumb.position.set(0.023, Y, 0.012);
    slider.add(thumb);
    for (let i = -3; i <= 3; i++) {
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.0034, 0.00032, 5, 20), paint(0xb9c2c0));
      ridge.rotation.x = Math.PI / 2;
      ridge.position.y = i * 0.0012;
      thumb.add(ridge);
    }
    for (const x of [-0.004, 0.105]) {
      const support = woodBlock(0.012, FACE - 0.004, 0.015);
      support.position.set(x, (FACE - 0.004) / 2, -0.002);
      tool.add(support);
    }
    const pipe = new THREE.Group();
    const outerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(OUT / 2000, OUT / 2000, 0.022, 64, 1, true),
      paint(0xb48b5e),
    );
    const innerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(IN / 2000, IN / 2000, 0.022, 64, 1, true),
      paint(0x68523f, { side: THREE.BackSide }),
    );
    for (const wall of [outerWall, innerWall]) {
      wall.rotation.x = Math.PI / 2;
      pipe.add(wall);
    }
    for (const sign of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.RingGeometry(IN / 2000, OUT / 2000, 64), paint(0xd3b084));
      end.position.z = sign * 0.011;
      end.rotation.y = sign < 0 ? Math.PI : 0;
      pipe.add(end);
    }
    group.add(pipe);
    for (const x of [-0.012, 0.012]) {
      const rail = woodBlock(0.004, 0.004, 0.029);
      rail.position.set(HOME[0] + x, 0.002, HOME[1]);
      group.add(rail);
    }
    let gap = 9.2,
      place = 'home',
      zeroed = false,
      locked = false,
      near = false,
      integer = null,
      dragStart = 0,
      movedPipe = false,
      ui,
      records;
    const measured = new Map();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'zero', title: '合爪查零', todo: '向左拖游标，合上量爪并检查零线。', target },
        { id: 'outer', title: '量外径', todo: '让外测量爪夹住圆管，读主尺和游标。', target },
        { id: 'inner', title: '量内径', todo: '把小爪伸入管口，撑到内壁再读数。', target },
      ],
    });
    function target() {
      if (near) return null;
      if (locked && !contact()) return screw;
      if (!zeroed) return gap > 0.001 ? thumb : vernier;
      if (place === 'home') {
        const needOpen = !measured.has('outer') ? gap < OUT + 0.3 : gap > IN - 0.3;
        return needOpen ? thumb : pipe;
      }
      if (measured.has(place)) {
        if (contact()) return locked ? screw : thumb;
        return pipe;
      }
      return contact() ? vernier : thumb;
    }
    function center(site) {
      if (site === 'outer') return new THREE.Vector3(ORIGIN + OUT / 2000, Y, 0.025);
      if (site === 'inner') return new THREE.Vector3(ORIGIN + IN / 2000, Y, -0.027);
      return new THREE.Vector3(HOME[0], Y, HOME[1]);
    }
    const contact = () => place !== 'home' && Math.abs(gap - (place === 'outer' ? OUT : IN)) < 0.001;
    function guide() {
      if (!zeroed) {
        if (locked && gap > 0.001) {
          bar.say('先松开紧固螺钉，再合拢量爪检查零线。');
          return;
        }
        bar.say(gap > 0.001 ? '向左拖游标，让两个大爪的测量面轻轻接触。' : '两爪已合。点刻度近看，检查两条零线。');
        return;
      }
      if (bar.finished) {
        bar.say('两种直径已记录，展开笔记本比较内外径。');
        return;
      }
      if (locked && !contact()) {
        bar.say('点游标后侧的紧固螺钉松开，再移动游标。');
        return;
      }
      if (place === 'outer' && measured.has('outer') && !measured.has('inner')) {
        bar.say(locked ? '松开紧固螺钉，再把大爪拉开一点。' : '向右拉开大爪，拖出圆管放回台前，再准备量内径。');
        return;
      }
      if (place === 'inner' && measured.has('inner') && !measured.has('outer')) {
        bar.say(locked ? '松开紧固螺钉，再收拢小爪取出圆管。' : '收拢小爪，取出圆管，再张开大爪测外径。');
        return;
      }
      if (contact()) {
        bar.say('量爪刚好贴住' + (place === 'outer' ? '外壁' : '内壁') + '。点两尺的刻度近看读数。');
        return;
      }
      if (place === 'outer') {
        bar.say('向左拖游标，让移动大爪贴住圆管外壁。');
        return;
      }
      if (place === 'inner') {
        bar.say('向右拖游标，让两个小爪向外撑住管内壁。');
        return;
      }
      if (!measured.has('outer'))
        bar.say(
          gap < OUT + 0.3 ? '向右拖游标，把前方大爪张开到能放进圆管。' : '把台前圆管拖到两个大爪之间，让它贴住固定爪。',
        );
      else bar.say(gap > IN - 0.3 ? '把小爪收窄，再从管口套入。' : '把圆管拖到后方小爪上，让小爪伸进管口。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      if (!zeroed && (gap > 0.001 || place !== 'home')) {
        guide();
        return;
      }
      if (zeroed && !contact()) {
        guide();
        return;
      }
      near = true;
      integer = null;
      bar.near(true);
      ctx.look([xAt(gap + 3.8), FACE, 0], [0, 1, 0.02], 0.028, leave);
      bar.say(
        zeroed ? '先在主尺点出游标零线已经越过的整毫米刻线。' : '两爪已合。点游标零线，看看它与主尺零线是否对齐。',
      );
    }
    function read(ray) {
      const p = rayToLocal(ray, group, 'xz', FACE + 0.0001);
      if (!p) return;
      if (!zeroed) {
        if (Math.abs(p.x - xAt(0)) > 0.0005 || p.z < 0 || p.z > 0.007) {
          bar.say('找下尺标 0 的刻线，点它与上尺零线相接的位置。');
          return;
        }
        zeroed = true;
        bar.done('zero');
        leave();
        return;
      }
      const whole = Math.floor(gap + 1e-7),
        digit = Math.round((gap - whole) * 10);
      if (integer === null) {
        if (p.z > 0 || p.z < -0.008 || Math.abs(p.x - xAt(whole)) > 0.00048) {
          bar.say('看游标零线所在的位置，读上尺左边紧邻的那条整毫米刻线。');
          return;
        }
        integer = whole;
        bar.say('主尺 ' + whole + ' mm。再点下尺与某条主尺刻线对齐的那条线。');
        return;
      }
      const idx = Math.round((p.x - xAt(gap)) / 0.0009);
      if (p.z < 0 || p.z > 0.007 || idx !== digit || Math.abs(p.x - xAt(gap + 0.9 * idx)) > 0.00043) {
        bar.say('再比较上下刻线，找两条真正接成一直线的位置。');
        return;
      }
      const value = integer + idx / 10;
      if (!measured.has(place)) {
        measured.set(place, value);
        records.el.hidden = false;
        records.add([targetName[place], String(integer), String(idx), value.toFixed(1)]);
        bar.done(place);
      }
      leave();
      bar.say(
        targetName[place] +
          ' = ' +
          whole +
          ' mm + ' +
          (idx / 10).toFixed(1) +
          ' mm = ' +
          value.toFixed(1) +
          ' mm。' +
          (bar.finished
            ? '两组数据已记入笔记本。'
            : place === 'outer'
              ? '张开大爪取管，再用小爪量内径。'
              : '收拢小爪取管，再用大爪量外径。'),
      );
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui.go(1);
    }
    const drags = [
      {
        obj: slider,
        plane: 'xz',
        offset: FACE,
        enabled: () => !near,
        hint: '沿主尺拖游标',
        onStart() {
          enter();
          dragStart = gap;
        },
        onDrag(p, from) {
          if (!from || locked) return;
          const requested = dragStart + 1000 * (p.x - from.x);
          gap = clamp(requested, place === 'outer' ? OUT : 0, place === 'inner' ? IN : 100);
          slider.position.x = mm(gap);
        },
        onEnd(moved) {
          if (moved) guide();
        },
        onTap: inspect,
      },
      {
        obj: pipe,
        plane: 'xz',
        offset: Y,
        keepOffset: true,
        enabled: () => !near,
        hint: '把圆管放进或取出量爪',
        onStart() {
          enter();
          movedPipe = false;
        },
        onDrag(p) {
          if (contact()) return;
          movedPipe = true;
          pipe.position.set(p.x, Y + 0.005, p.z);
        },
        onEnd(moved) {
          if (!moved) {
            guide();
            return;
          }
          if (!movedPipe) {
            bar.say(locked ? '先松开紧固螺钉，再松开量爪取管。' : '先让量爪离开管壁，再取出圆管。');
            return;
          }
          const at = (id) => Math.hypot(pipe.position.x - center(id).x, pipe.position.z - center(id).z);
          let message = '';
          if (at('home') < 0.024) place = 'home';
          else if (at('outer') < 0.021) {
            if (!zeroed) message = '先合爪检查零线。';
            else if (gap < OUT + 0.3) message = '大爪开口太窄。再张开一些，留出放管的间隙。';
            else place = 'outer';
          } else if (at('inner') < 0.019) {
            if (!zeroed) message = '先检查零线。';
            else if (gap > IN - 0.3) message = '小爪撑得太开。先收窄，再伸进管口。';
            else place = 'inner';
          } else message = '把圆管放到量爪之间，或放回台前的木座。';
          pipe.position.copy(center(place));
          if (message) bar.say(message);
          else guide();
        },
      },
    ];
    const desk = draggable(group, drags, {
      highlight: true,
      taps: [
        {
          obj: screw,
          hint: '松开或锁住游标',
          onTap() {
            enter();
            locked = !locked;
            screw.rotation.y = locked ? 0.8 : 0;
            bar.say(locked ? '游标已锁住。可读刻度；移动前先松开螺钉。' : '游标已松开，可以沿尺滑动。');
          },
        },
        {
          obj: main,
          hint: '近看同一把尺的刻线',
          onTap() {
            enter();
            inspect();
          },
        },
      ],
    });
    const pointer = {
      items: desk.items,
      down(ray, e) {
        if (near) {
          read(ray);
          return true;
        }
        return desk.down(ray, e);
      },
      move(ray) {
        return near || desk.move(ray);
      },
      up() {
        return desk.up();
      },
    };
    function reset() {
      leave();
      gap = 9.2;
      place = 'home';
      zeroed = locked = false;
      integer = null;
      measured.clear();
      records.clear();
      records.el.hidden = true;
      slider.position.x = mm(gap);
      pipe.position.copy(center(place));
      screw.rotation.y = 0;
      bar.undo('zero', 'outer', 'inner');
      guide();
    }
    slider.position.x = mm(gap);
    pipe.position.copy(center(place));
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.185, d: 0.145, h: 0.035 },
      view: { elev: 52, azim: 0, lookY: 0.4, margin: 1.04 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['测量面', '主尺 / mm', '对齐线序号', '读数 / mm']);
        records.el.hidden = true;
        ui.data.append(records.el);
        ui.notes.append(
          note(
            '本尺为 10 分度。游标从 0 到 10 的十个间隔总长 9 mm，每条对齐线代表 0.1 mm。紧固螺钉可在需要时锁住游标。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        bar.dispose();
        mainTex.dispose();
        vernierTex.dispose();
      },
    };
  },
};
