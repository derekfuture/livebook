// 图 11.3-1、11.3-2。几何用米，仪器操作与记录用毫米。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { canvasTex, woodBlock } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, rayToLocal, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { table, buttons } from './kit/ui.js';

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
    g.font = (main ? 0.24 : 0.28) * H + 'px sans-serif';
    g.textAlign = 'center';
    for (let n = 0; n <= end; n++) {
      const xx = x(n * spacing),
        len = n % 5 === 0 ? 0.44 : 0.26,
        width = (W / length) * 0.085;
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
    q: '怎样用游标卡尺测出圆管的外径和内径？合拢时两尺零线重合。把游标向右移 0.1 mm，游标哪一条刻线会与主尺刻线对齐？',
    options: ['第 1 条', '第 5 条', '第 9 条'],
    answer: 0,
    hint: '游标的十个间隔一共长 9 mm。',
  },
  conclusion: {
    page: 67, rect: [63.76, 484.4, 384.71, 612.56],
    quote: '读数时，先读主尺上的刻度，如图11.3-3，根据游标尺上零刻度线与主尺刻度线的相对位置，可知主尺读数是23 mm ；再读游标尺上的刻度，图11.3-3为10分度游标卡尺，游标尺上的第七条刻度线与主尺上的刻度线对齐，其读数为0.7 mm ；结合主尺及游标尺的读数得到被测长度为23.7 mm。',
    why: '这把卡尺的游标一格长 0.9 mm，比主尺一格短 0.1 mm。游标第 n 条线对齐，表示小数部分为 n × 0.1 mm。量外径时把外爪向内收，量内径时把内爪向外撑，同一根圆管的两个读数对应不同的接触面。',
    src: '课本第 63 页 · 第十一章 第3节 实验：导体电阻率的测量',
  },
  create(ctx) {
    const group = new THREE.Group(),
      tool = new THREE.Group();
    tool.position.x = ORIGIN;
    group.add(tool);
    const metal = 0x869ba0,
      light = 0xc2cccb;
    const blades = [];
    function block(parent, w, height, d, x, y, z, color, out = false) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), paint(color));
      if (out) inked(mesh, { width: 0.7 });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    function jaw(parent, outline, y, thickness, color, bevel = 0) {
      blades.push({ outline, moving: parent === slider, inside: bevel !== 0 });
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
    const movingJaw = jaw(
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
    const root = new THREE.Group();
    root.add(group);
    let gap = 9.2,
      place = 'home',
      zeroed = false,
      locked = false,
      near = false,
      fineDrag = null,
      observed = false,
      integer = null,
      returning = null,
      trail = null,
      threaded = false,
      ui,
      records;
    const measured = new Map();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'zero', title: '合拢查零', todo: '向左拖游标，让外测量爪的两个刃接触，看看两条零线能否对齐。', target },
        { id: 'outer', title: '测外径', todo: '让外测量爪夹住圆管，读主尺和游标。', target },
        { id: 'inner', title: '测内径', todo: '把小爪伸入管口，撑到内壁再读数。', target },
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
      if (site === 'inner') return new THREE.Vector3(ORIGIN + gap / 2000, Y, -0.027);
      return new THREE.Vector3(HOME[0], Y, HOME[1]);
    }
    const contact = () => !trail && !returning && (place === 'outer' && gap === OUT || place === 'inner' && gap === IN);
    const routeHint = '把圆管绕过尺身左端，在小爪尖后方对准管口，再沿管轴套入。';
    const fineHint = '向右轻拖游标 0.1 mm，看哪条刻线对齐。';
    const fineResult = '游标右移了 0.1 mm，第 1 条刻线与主尺 1 mm 刻线对齐。';
    function guide() {
      if (!zeroed) {
        if (locked && gap > 0.001) {
          bar.say('先松开紧固螺钉，再合拢量爪检查零线。');
          return;
        }
        bar.say(null);
        return;
      }
      if (place === 'home' && gap === 0 && !measured.size && !locked) {
        bar.say(zeroMessage + ' 点刻度近看，或向右张开大爪。');
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
        bar.say(locked ? '松开紧固螺钉，再把大爪拉开一点。' : contact() ? '向右拉开大爪，松开圆管。' : '把圆管拖回木座，再收拢小爪。');
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
        bar.say('向右撑开小爪，贴住内壁。');
        return;
      }
      if (!measured.has('outer'))
        bar.say(
          gap < OUT + 0.3 ? '向右拖游标，把前方大爪张开到能放进圆管。' : '从大爪尖前方把圆管放进两爪之间，靠住固定爪。',
        );
      else bar.say(gap > IN - 0.3 ? '把小爪收窄，再从管口套入。' : routeHint);
    }
    function leave() {
      near = false;
      fineDrag = null;
      mark.visible = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    const zeroMessage = '两个零刻度线对齐，没有零误差，可以开始测量。';
    const readMain = '先点主尺上游标零线左边最近的一条毫米刻线。';
    const mark = block(slider, mm(0.10), mm(0.035), mm(3.4), 0, FACE + mm(0.14), 0, 0x993d25);
    mark.visible = false;
    function inspect() {
      const checkZero = place === 'home' && !measured.size && gap === 0;
      if (!zeroed || returning || trail || (!checkZero && !contact())) return guide();
      near = true;
      integer = null;
      bar.near(true);
      ctx.look([xAt(gap + (checkZero ? 2 : 4.5)), FACE, 0], [0, 1, 0.015], checkZero ? 0.026 : 0.05, leave);
      bar.say(checkZero ? (locked ? zeroMessage : fineHint) : readMain);
    }
    function choose(p) {
      if (!near || !contact() || !p) return;
      const whole = Math.floor(gap), digit = Math.round((gap - whole) * 10);
      if (p.z >= -0.008 && p.z < 0) {
        const n = Math.round((p.x - ZERO) * 1000);
        if (n < 0 || n > 100) return;
        integer = n;
        mark.visible = false;
        bar.say('主尺选了 ' + n + ' mm。点游标上对齐的刻线，交上读数。');
        return;
      }
      if (p.z < 0 || p.z > 0.007) return;
      if (integer === null) return bar.say(readMain);
      const idx = Math.round((p.x - xAt(gap)) / mm(0.9));
      if (idx < 0 || idx > 10) return;
      mark.position.x = mm(12 + 0.9 * digit);
      mark.visible = true;
      if (integer !== whole || idx !== digit) {
        const mainFeedback = integer === whole ? '主尺读对了。' :
          '零线在 ' + whole + ' 和 ' + (whole + 1) + ' mm 之间，整毫米要读 ' + whole + '。';
        bar.say(mainFeedback + (idx === digit ? '游标读对了。' : '游标是第 ' + digit + ' 条对齐，你选了第 ' + idx + ' 条。') +
          (integer === whole ? '再点一次游标刻线。' : '重新点主尺刻线。'));
        if (integer !== whole) integer = null;
        return;
      }
      const value = integer + idx / 10;
      measured.set(place, value);
      fill();
      bar.done(place);
      bar.say('读对了。' + targetName[place] + ' = ' + whole + ' mm + ' + (idx / 10).toFixed(1) +
        ' mm = ' + value.toFixed(1) + ' mm。' + (bar.finished ? '可以掀开结论了。' : '回到全景，准备测内径。'));
    }
    function fill() {
      records.clear();
      for (const id of ['outer', 'inner']) {
        const v = measured.get(id);
        records.add([targetName[id], ...(v == null ? ['—', '—', '—'] :
          [String(Math.floor(v)), String(Math.round((v % 1) * 10)), v.toFixed(1)])], { highlight: false });
      }
    }
    function enter() {
      if (document.body.classList.contains('predicting')) ui.go(1);
    }
    const hint = t => ui?.step === 1 && !near ? t : '';
    function pipeFits(position) {
      const axis = (position.x - ORIGIN) * 1000, depth = position.z * 1000;
      const overlaps = (left, right, back, front) => depth + 11 > back && depth - 11 < front &&
        axis + OUT / 2 > left + 1e-6 && axis - OUT / 2 < right - 1e-6;
      if (overlaps(-10.5, 126.5, -9.5, 0) || overlaps(gap + 0.5, gap + 32.5, -9.5, 9) ||
          overlaps(gap + 4.9, gap + 11.1, -13.1, -9.5) || overlaps(gap + 17.8, gap + 28.2, 8.5, 15.7) ||
          [-4, 105].some(x => overlaps(x - 6, x + 6, -9.5, 5.5))) return false;
      for (const { outline, moving, inside } of blades) {
        const xs = [];
        for (let index = 0; index < outline.length; index++) {
          const [x, z] = outline[index], [nextX, nextZ] = outline[(index + 1) % outline.length];
          if (Math.abs(z - depth) <= 11) xs.push(x);
          for (const end of [depth - 11, depth + 11]) {
            if ((z < end) !== (nextZ < end)) xs.push(x + (nextX - x) * (end - z) / (nextZ - z));
          }
        }
        if (!xs.length) continue;
        const offset = moving ? gap : 0, left = Math.min(...xs) + offset, right = Math.max(...xs) + offset;
        if (inside && left >= axis - IN / 2 - 1e-6 && right <= axis + IN / 2 + 1e-6) continue;
        if (axis + OUT / 2 > left + 1e-6 && axis - OUT / 2 < right - 1e-6) return false;
      }
      return true;
    }
    function movePipe(to) {
      const from = pipe.position.clone();
      const steps = Math.ceil(from.distanceTo(to) / mm(0.5));
      const next = from.clone();
      for (let step = 1; step <= steps; step++) {
        next.lerpVectors(from, to, step / steps);
        if (!pipeFits(next)) break;
        if (next.z <= -0.040) threaded = false;
        else if (pipe.position.z <= -0.040) {
          const axis = (next.x - ORIGIN) * 1000;
          threaded = axis <= IN / 2 && axis >= gap - IN / 2;
        }
        pipe.position.copy(next);
      }
      if (!from.equals(pipe.position)) trail.push(pipe.position.clone());
    }
    function releasePipe(moved) {
      if (!trail) {
        if (moved) bar.say(locked ? '先松开紧固螺钉，再松开量爪取管。' : '先让量爪离开管壁，再取出圆管。');
        return;
      }
      const at = site => pipe.position.distanceTo(center(site));
      let site, message;
      if (at('home') < 0.012) site = 'home';
      else if (!zeroed) message = '先合爪检查零线。';
      else if (at('outer') < 0.009 && gap >= OUT + 0.3) site = 'outer';
      else if (threaded && at('inner') < 0.005 && measured.has('outer') && gap <= IN - 0.3) site = 'inner';
      else message = measured.has('outer') ? routeHint : '从大爪尖前方把圆管放进两爪之间，靠住固定爪。';
      if (site) {
        const released = pipe.position.clone();
        movePipe(center(site));
        if (at(site) < 1e-8) {
          place = site;
          if (released.distanceTo(pipe.position) > 1e-8) {
            returning = { path: new THREE.LineCurve3(released, pipe.position.clone()), t: 0, settled: true };
            pipe.position.copy(released);
          }
        }
        else site = null;
      }
      if (!site && trail.length > 1) {
        const path = new THREE.CurvePath();
        for (let index = trail.length - 1; index > 0; index--) path.add(new THREE.LineCurve3(trail[index], trail[index - 1]));
        returning = { path, t: 0 };
      }
      trail = null;
      if (message) bar.say(message); else guide();
    }
    // 落点热区半径（米）：圆管直径约 2.2 cm，热区比它大一点就够，太大会一拿起就吸过去
    const SNAP = { outer: 0.015, inner: 0.01, home: 0.015 };
    const drags = [
      ...[thumb, vernier, movingJaw].map(obj => ({
        obj, anchor: slider, plane: 'xz', offset: FACE, keepOffset: true,
        hint: () => hint('左右拖：移动游标'),
        onStart: enter,
        onDrag(p) {
          if (locked || returning || trail) return;
          gap = clamp((p.x - ORIGIN) * 1000, place === 'outer' ? OUT : 0, place === 'inner' ? IN : 100);
          slider.position.x = mm(gap);
          if (place === 'inner') pipe.position.x = clamp(pipe.position.x,
            ORIGIN + mm(Math.max(2.25, gap) - IN / 2), ORIGIN + mm(Math.min(0, gap - 2.25) + IN / 2));
          if (gap === 0 && !zeroed) {
            zeroed = true;
            bar.done('zero');
          }
          guide();
        },
        onEnd(moved) { if (moved) guide(); },
        onTap: inspect,
      })),
      {
        obj: pipe, anchor: pipe,
        plane: 'xz',
        offset: Y,
        keepOffset: true,
        enabled: () => !near && !returning,
        hint: () => hint('拖动：放入或取出圆管'),
        onStart() {
          enter();
          threaded = place === 'inner';
          trail = contact() ? null : [pipe.position.clone()];
        },
        onDrag(p) {
          if (!trail) return;
          const to = p.clone().setY(Y);
          // 吸到外爪之间时，从爪尖前方绕进去（手只要拖到附近，不用自己找路）
          const o = center('outer');
          if (zeroed && gap >= OUT + 0.3 && place !== 'outer' && Math.hypot(to.x - o.x, to.z - o.z) < SNAP.outer) {
            const front = Math.max(...blades.filter((b) => !b.inside).flatMap((b) => b.outline.map(([, z]) => z))) / 1000 + OUT / 2000 + 0.002;
            movePipe(new THREE.Vector3(pipe.position.x, Y, Math.max(pipe.position.z, front)));
            movePipe(new THREE.Vector3(o.x, Y, Math.max(pipe.position.z, front)));
            movePipe(o);
            return;
          }
          movePipe(to);
        },
        onEnd: releasePipe,
        // 落点：照初中——热区大，靠近就自动吸过去对准，松手放稳（公共组件 kit/dropzone.js，不画圈、不加高亮）
        dropzones: [
          { name: '外测量爪之间', position: () => center('outer'), radius: SNAP.outer, enabled: () => zeroed && gap >= OUT + 0.3 && place !== 'outer' },
          { name: '小爪上', position: () => center('inner'), radius: SNAP.inner, enabled: () => measured.has('outer') && gap <= IN - 0.3 && place !== 'inner' },
          { name: '木座', position: () => center('home'), radius: SNAP.home, enabled: () => place !== 'home' },
        ],
      },
    ];
    const desk = draggable(group, drags, {
      tip: ctx.tag('', 'pill'),
      taps: [
        {
          obj: screw,
          hint: () => hint(locked ? '点一下：松开螺钉' : '点一下：拧紧螺钉'),
          onTap() {
            enter();
            locked = !locked;
            screw.rotation.y = locked ? 0.8 : 0;
            bar.say(locked ? '螺钉已拧紧，游标固定了。' : '游标已松开，可以沿尺滑动。');
          },
        },
        {
          obj: main,
          hint: () => hint('点一下：近看刻度'),
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
          const point = rayToLocal(ray, group, 'xz', FACE + 0.0001);
          if (place === 'home' && !locked && point && ray.intersectObject(vernier).length) fineDrag = { x: point.x, gap };
          else choose(point);
          return true;
        }
        return desk.down(ray, e);
      },
      move(ray, e) {
        if (!near) return desk.move(ray, e);
        if (place === 'home' && !locked) {
          document.getElementById('c').style.cursor = fineDrag ? 'grabbing' : ray.intersectObject(vernier).length ? 'grab' : '';
          const point = fineDrag && rayToLocal(ray, group, 'xz', FACE + 0.0001);
          if (point) fineSlide(fineDrag.gap + (point.x - fineDrag.x) * 1000);
        }
        return true;
      },
      up(ray, e) {
        if (near) { fineDrag = null; return true; }
        return desk.up(ray, e);
      },
    };
    function fineSlide(value) {
      gap = clamp(value, 0, 0.1);
      slider.position.x = mm(gap);
      mark.visible = gap === 0.1;
      if (mark.visible) { observed = true; mark.position.x = mm(12.9); }
      bar.say(mark.visible ? fineResult : fineHint);
    }
    function reset() {
      leave();
      gap = 9.2;
      place = 'home';
      zeroed = locked = false;
      observed = threaded = false;
      trail = null;
      integer = null;
      measured.clear();
      returning = null;
      fill();
      ui.relock();
      slider.position.x = mm(gap);
      pipe.position.copy(center(place));
      screw.rotation.y = 0;
      bar.undo('zero', 'outer', 'inner');
      guide();
    }
    slider.position.x = mm(gap);
    pipe.position.copy(center(place));
    const slideTo = n => new THREE.Vector3(ORIGIN + mm(n), 0, 0);
    function carry(site, points) {
      const cast = local => {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(group.localToWorld(local.clone()).project(ctx.camera), ctx.camera);
        return ray;
      };
      const start = pipe.position.clone(), rim = start.clone().add(new THREE.Vector3(0, -0.0098, 0.011));
      const ray = cast(rim), offset = rayToLocal(ray, group, 'xz', Y).sub(start);
      if (!pointer.down(ray) || !trail) throw Error('没有拿起管口');
      for (const [x, z] of points) pointer.move(cast(new THREE.Vector3(x, Y, z).add(offset)));
      pointer.up(ray);
      if (place !== site) throw Error('圆管未就位：' + site);
    }
    const outerAxis = center('outer').x + mm(2), side = ORIGIN - mm(24);
    const steps = qaFlow(desk, [
      { name: '合拢查零', drag: thumb, to: slideTo(-1) },
      { name: '近看两条零线', tap: main },
      { name: '右移一分度差', run: () => fineSlide(0.1) },
      { name: '回到全景', run() { if (!observed) throw Error('没有看到刻线对齐'); leave(); } },
      { name: '张开外爪', drag: thumb, to: slideTo(32) },
      { name: '放入圆管', run: () => carry('outer', [[outerAxis, HOME[1]], [outerAxis, 0.025]]) },
      { name: '夹住外壁', drag: thumb, to: slideTo(22) },
      { name: '固定游标', tap: screw },
      { name: '近看外径', tap: main },
    ]);
    steps[2].mouse = { kind: 'drag', obj: vernier, to: () => new THREE.Vector3(xAt(6.5), FACE + 0.0001, 0.0035) };
    // 把鼠标落在实际刻线上；非鼠标流程使用同一套读数处理。
    function tickStep(mainScale, n) {
      const pos = new THREE.Vector3(xAt(mainScale ? n : 0.9 * n), FACE + 0.0001, mainScale ? -0.001 : 0.001);
      const point = new THREE.Mesh(new THREE.PlaneGeometry(0, 0));
      point.visible = false;
      (mainScale ? group : slider).add(point);
      point.position.copy(pos);
      if (!mainScale) point.position.x -= ORIGIN;
      return { name: (mainScale ? '主尺 ' : '游标 ') + n, mouse: { kind: 'tap', obj: point },
        run: () => choose(group.worldToLocal(point.getWorldPosition(new THREE.Vector3()))) };
    }
    steps.push(tickStep(true, 23), tickStep(false, 6), tickStep(false, 7),
      ...qaFlow(desk, [
        { name: '返回全景', run: leave }, { name: '松开螺钉', tap: screw },
        { name: '松开圆管', drag: thumb, to: slideTo(31) },
        { name: '取出圆管', run: () => carry('home', [[center('outer').x, HOME[1]], HOME]) },
        { name: '收窄内爪', drag: thumb, to: slideTo(-1) },
        { name: '直拖被尺身挡住', run: () => carry('home', [[center('inner').x, -0.027]]) },
        { name: '套入管口', run() {
          const axis = center('inner').x;
          carry('inner', [[side, HOME[1]], [side, -0.047], [axis, -0.047], [axis, -0.027]]);
        } },
        { name: '合拢小爪不能读数', tap: main },
        { name: '核对未贴壁状态', run() { if (near || measured.has('inner')) throw Error('未贴壁却能读数'); } },
        { name: '撑住内壁', drag: thumb, to: slideTo(18) },
        { name: '近看内径', tap: main },
      ]), tickStep(true, 17), tickStep(false, 4), tickStep(true, 16), tickStep(false, 4),
      { name: '核对记录并掀开原文', run() {
        if (measured.get('outer') !== OUT || measured.get('inner') !== IN) throw Error('两次读数未完成');
        leave();
        ui.go(2);
        ui.el.querySelector('.flap-front').click();
      } });
    return {
      group: root, reset,
      debug: { bar, qa: steps, get state() { return { place, gap, zeroed, pipe: pipe.position.toArray().map((v) => +v.toFixed(4)), outer: center('outer').toArray().map((v) => +v.toFixed(4)), home: center('home').toArray().map((v) => +v.toFixed(4)) }; } },
      pointer,
      toggles: ['steps'],
      size: { w: 0.20, d: 0.136, h: 0.035 },
      view: { elev: 52, azim: 0, lookY: 0.4, frameMargin: 0.99 },
      mount(panel) {
        ui = panel;
        bar.attach({ ...panel, need: () => {} });
        panel.el.querySelector('.answer').style.paddingBottom = '82px';
        panel.el.querySelector('.flap-front').addEventListener('click', () => {
          const verdict = panel.el.querySelector('.verdict');
          const prediction = verdict.textContent.split('　　')[0];
          verdict.textContent = (prediction.includes('预测：“') ? prediction + '　　' : '') +
            (observed ? '实验里看到的：' : '课本说明（第 63 页）：') + fineResult;
        });
        panel.status('主尺 A 每格 1 mm。游标尺 B 的 10 格合计 9 mm，每格比主尺短 0.1 mm。<br>大爪 C 量外径，小爪 D 量内径，紧固螺钉 F 固定游标。');
        records = table(['圆管', '主尺 / mm', '对齐线序号', '读数 / mm']);
        ui.data.append(records.el, buttons([{ text: '全部重来', onClick: reset }]).el);
        fill();
        guide();
      },
      update(dt) {
        bar.update(dt);
        desk.update(dt);
        if (returning) {
          returning.t = Math.min(1, returning.t + dt / 0.35);
          pipe.position.copy(returning.path.getPoint(returning.t));
          if (returning.t === 1) {
            const { settled } = returning;
            returning = null;
            if (settled) guide();
          }
        }
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
