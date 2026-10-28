// 图20.2-3 在通电螺线管周围放置小磁针 · 探究通电螺线管外部磁场的方向；图20.2-6 安培定则。
// 桌上：螺线管（导线绕在纸筒上）、电池盒、开关，螺线管周围一圈小磁针，玻璃板上还可以撒铁屑。
// 直接操作：点开关通电 / 断电；点电池盒把它掉个头（电流反向）；点铁棒把它插进螺线管（磁场变强）；拖小磁针；点铁屑瓶、点玻璃板。
// 面板上也有同样的操作，另外可以换一种绕法。通电螺线管外部的磁场和条形磁体一样（kit/magnet.js 的磁荷模型）；没通电时小磁针只受地磁场。
import * as THREE from 'three';
import { seg, buttons, goals, note } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { compass, filings, fieldAt, fieldLines } from './kit/magnet.js';
import { battery, switchPart } from './kit/circuit.js';
import { paint, inked, hull } from '../live/ink.js';

const PW = 0.34, PD = 0.2, PY = 0.03;            // 玻璃板（架高，螺线管在板下）
const CL = 0.11, CR = 0.013, TURNS = 14;          // 螺线管长度、半径、匝数
const EARTH = [0, -30];

export default {
  id: 'solenoid',
  fig: '图20.2-3',
  title: '通电螺线管的磁场',
  stampText: '探究',
  predict: {
    q: '通电螺线管周围放了一圈小磁针。<b>把电池正负极对调</b>（电流反向），小磁针会——',
    hint: '课本第 153–154 页「实验」',
    options: ['不变', '都转过来，指向相反', '只有两端的转'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 161, rect: [62, 50, 362, 240] }],
    quote: '实验表明，通电螺线管外部的磁场和条形磁体的磁场一样。通电螺线管的两端相当于条形磁体的两个极，它们的极性跟螺线管中电流的方向有关。这种关系可以用安培定则来表述：用右手握住螺线管，让四指指向螺线管中电流的方向，则拇指所指的那端就是螺线管的 N 极。',
    why: '没通电时，小磁针只受地磁场作用，都指南北。一通电，螺线管两端就像条形磁体的两极，周围的小磁针按条形磁体那样排列；断电后又回到原来的方向。把电源正负极对调，或者改变导线的绕法，电流环绕的方向反过来，螺线管的 N、S 极也就对调了。螺线管里插入铁棒，铁棒被磁化，磁场强得多。',
    src: '课本第 153–155 页 · 第二十章 第2节 电生磁',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const S = { on: false, flip: 1, wind: 1, iron: false, lines: false, shaken: false, tapped: 0, seen: new Set(), t: 0, quiz: null };
    let W = null;
    // ---- 螺线管 ----
    const coil = new THREE.Group();
    coil.position.set(0, CR + 0.004, 0);
    const tube = hull(new THREE.Mesh(new THREE.CylinderGeometry(CR * 0.86, CR * 0.86, CL + 0.01, 24, 1, true), paint(0xf0d9a0, { side: THREE.DoubleSide })), 0.0008);
    tube.rotation.z = Math.PI / 2;
    coil.add(tube);
    let helix = null, helixCurve = null;
    const buildHelix = () => {
      if (helix) { coil.remove(helix); helix.geometry.dispose(); }
      const pts = [];
      for (let i = 0; i <= 600; i++) { const t = i / 600, a = t * Math.PI * 2 * TURNS * S.wind; pts.push(new THREE.Vector3(-CL / 2 + t * CL, Math.cos(a) * CR, Math.sin(a) * CR)); }
      // 两头的引线往前伸出来
      pts.unshift(new THREE.Vector3(-CL / 2 - 0.004, CR, 0.012)); pts.push(new THREE.Vector3(CL / 2 + 0.004, Math.cos(Math.PI * 2 * TURNS * S.wind) * CR, 0.012));
      helixCurve = new THREE.CatmullRomCurve3(pts);
      helix = new THREE.Mesh(new THREE.TubeGeometry(helixCurve, 1200, 0.0011, 5, false), paint(0xc8743a));
      coil.add(helix);
    };
    buildHelix();
    const iron = hull(new THREE.Mesh(new THREE.CylinderGeometry(CR * 0.5, CR * 0.5, CL + 0.03, 16), paint(0x6b7280)), 0.001);
    iron.rotation.z = Math.PI / 2;
    group.add(coil, iron);
    const ironHome = new THREE.Vector3(0, 0.005, -PD / 2 - 0.03), ironIn = new THREE.Vector3(0, CR + 0.004, 0);
    iron.position.copy(ironHome);
    const ironTag = tag('铁棒', 'pill');
    // 电流点：沿螺旋线流动
    const NDOT = 80;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff2a8 }), NDOT);
    dots.frustumCulled = false;     // 实例位置会变，包围球不准
    dots.raycast = () => {}; coil.add(dots);
    // 线圈朝着你的那一面：几个小箭头标出导线里电流的方向（判断 N 极用）
    const curArrows = [2, 5, 8, 11].map(() => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.007, 10), new THREE.MeshBasicMaterial({ color: 0xd4006c })); coil.add(c); return c; });
    const placeArrows = () => {
      const up = -S.wind * S.flip;        // 前面那几段导线：电流向上（+1）还是向下（−1）
      curArrows.forEach((c, i) => {
        const t = ([2, 5, 8, 11][i] + (S.wind > 0 ? 0.25 : 0.75)) / TURNS;
        c.position.set(-CL / 2 + t * CL, 0, CR + 0.0035);
        c.rotation.set(0, 0, up > 0 ? 0 : Math.PI);
        c.visible = !!S.on;
      });
    };
    const endTags = [tag('', 'mag big'), tag('', 'mag big')];
    // ---- 玻璃板、小磁针、铁屑 ----
    const plate = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.003, PD), paint(0xe6f1f7, { unique: true, transparent: true, opacity: 0.4, depthWrite: false }));
    plate.position.y = PY; group.add(plate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.014, PY - 0.0015, 0.014), paint(0xd9b98a)), { width: 1 }); b.position.set(sx * (PW / 2 - 0.01), (PY - 0.0015) / 2, sz * (PD / 2 - 0.01)); group.add(b); }
    const ring = [];
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ring.push([Math.cos(a) * 0.1, Math.sin(a) * 0.055]); }
    const cps = ring.map(([x, z]) => { const c = compass({ r: 0.01 }); c.position.set(x, PY + 0.0015, z); c.setAngle(-Math.PI / 2); group.add(c); return c; });
    const fl = filings({ w: PW - 0.01, d: PD - 0.01, n: 2400, y: PY + 0.0018 });
    group.add(fl.mesh);
    const shaker = new THREE.Group();
    const jar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.036, 18), paint(0x9aa3b2)), 0.001); jar.position.y = 0.018;
    shaker.add(jar); shaker.position.set(PW / 2 + 0.035, 0, -0.05); group.add(shaker);
    tag('铁屑', 'pill').loc(group, shaker.position.x, 0.005, shaker.position.z + 0.022);
    let lines = null;
    // ---- 电池、开关、导线 ----
    const bat = battery('E', { cells: 2 }); bat.group.position.set(-0.04, 0, PD / 2 + 0.045); bat.group.scale.setScalar(0.8);
    const sw = switchPart('S'); sw.group.position.set(0.09, 0, PD / 2 + 0.045);
    group.add(bat.group, sw.group);
    tag('点电池盒：正负极对调', 'pill').loc(group, -0.04, 0.005, PD / 2 + 0.075);
    const wires = [];
    const wire = (pts) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 30, 0.0013, 6, false), paint(0xe08a3c)); group.add(m); wires.push(m); };
    const ey = CR + 0.004 + 0.0, ez = 0.012;
    wire([[-CL / 2 - 0.004, ey + CR, ez], [-CL / 2 - 0.03, 0.02, 0.06], [-0.04 - 0.04, 0.015, PD / 2 + 0.05]]);
    wire([[CL / 2 + 0.004, ey, ez], [CL / 2 + 0.03, 0.02, 0.06], [0.09 + 0.018, 0.016, PD / 2 + 0.045]]);
    wire([[0.09 - 0.018, 0.016, PD / 2 + 0.045], [0.03, 0.016, PD / 2 + 0.06], [-0.04 + 0.04, 0.015, PD / 2 + 0.05]]);

    // 电流环绕方向 × 绕法 → N 极在哪一端（+1：+x 端是 N）
    const north = () => S.flip * S.wind;
    const poles = () => {
      if (!S.on) return [];
      const q = (S.iron ? 4 : 1) * 1.2 * north(), out = [];
      for (const dz of [-CR * 0.5, 0, CR * 0.5]) { out.push({ x: CL / 2 - 0.006, z: dz, q: q / 3 }, { x: -CL / 2 + 0.006, z: dz, q: -q / 3 }); }
      return out;
    };
    const inside = (x, z, pad = 0.003) => Math.abs(x) < CL / 2 + pad && Math.abs(z) < CR + pad;
    const redraw = () => { if (lines) { group.remove(lines); lines = null; } if (S.lines && S.on) { lines = fieldLines(poles(), { n: 14, bounds: [-PW / 2, PW / 2, -PD / 2, PD / 2], y: PY + 0.003, inside }); group.add(lines); } if (S.shaken) { fl.sprinkle(fl.shown); S.tapped = 0; } };

    const status = (m) => W?.status(m);
    const toggle = () => {
      sw.closed = !sw.closed; S.on = sw.closed; redraw();
      if (S.on) { S.seen.add('on'); status('通电了！小磁针转了起来，按一定的规律排列。和条形磁体周围的小磁针比一比。'); }
      else { if (S.seen.has('on')) W?.goal.done('off'); status('断电了：小磁针又回到原来的方向（指南北）。'); }
      W?.sync();
    };
    const flipBat = () => {
      S.flip *= -1; bat.group.rotation.y = S.flip > 0 ? 0 : Math.PI; redraw();
      if (S.on) { W?.goal.done('reverse'); status('电源正负极对调后，电流反向——小磁针都<b>转过来</b>了，螺线管的 N、S 极对调。'); }
      else status('电池盒掉了个头（正负极对调）。闭合开关看看。');
      W?.sync();
    };
    const toggleIron = () => { S.iron = !S.iron; redraw(); if (S.iron && S.on) W?.goal.done('iron'); status(S.iron ? '铁棒插进了螺线管：铁棒被磁化，磁场强得多（铁屑排得更明显）。' : '铁棒拿出来了。'); W?.sync(); };
    const sprinkle = () => { fl.sprinkle(2400); S.shaken = true; S.tapped = 0; status('撒了铁屑。<b>点一下玻璃板</b>轻轻敲一敲。'); };
    const tap = () => { if (!S.shaken) return status('先点铁屑瓶撒铁屑。'); if (!S.on) return status('没通电，铁屑不会排列。先闭合开关。'); fl.tap(poles(), inside); S.tapped++; if (S.tapped >= 2) { W?.goal.done('filings'); status('铁屑排成的图样和条形磁体的一样：通电螺线管外部的磁场和条形磁体的相似。'); } };
    const drags = cps.map((c) => ({ obj: c, plane: 'xz', offset: PY, keepOffset: true, hint: '拖到别的位置', onDrag: (p) => c.position.set(clamp(p.x, -PW / 2 + 0.012, PW / 2 - 0.012), PY + 0.0015, clamp(p.z, -PD / 2 + 0.012, PD / 2 - 0.012)) }));
    const pointer = draggable(group, drags, { tip: tag('', 'pill'), taps: [
      { obj: sw.group, hint: () => (sw.closed ? '点一下：断开' : '点一下：通电'), onTap: toggle },
      { obj: bat.group, hint: '点一下：电池盒掉个头（电流反向）', onTap: flipBat },
      { obj: iron, hint: () => (S.iron ? '点一下：把铁棒拿出来' : '点一下：把铁棒插进螺线管'), onTap: toggleIron },
      { obj: shaker, hint: '点一下：撒铁屑', onTap: sprinkle },
      { obj: plate, hint: '点一下：轻敲玻璃板', onTap: tap },
    ] });

    return {
      group,
      size: { w: 0.42, d: 0.3, h: 0.06 },
      view: { elev: 58, azim: 0, lookY: 0.2, margin: 1.05 },
      pointer,
      mount(ui) {
        const wind = seg('导线的绕法', ['绕法一', '绕法二（反着绕）'], (_, k) => { S.wind = k ? -1 : 1; buildHelix(); redraw(); if (k && S.on) W.goal.done('wind'); });
        const ln = seg('磁感线', ['不画', '画出来'], (_, k) => { S.lines = !!k; redraw(); });
        const btns = buttons([
          { text: '开关', ghost: true, onClick: toggle },
          { text: '电池正负极对调', ghost: true, onClick: flipBat },
          { text: '插入 / 拿出铁棒', ghost: true, onClick: toggleIron },
          { text: '撒铁屑', ghost: true, onClick: sprinkle },
          { text: '轻敲玻璃板', ghost: true, onClick: tap },
          // 用安培定则要看清线圈前面那几匝导线里电流往哪边走（近看时先把玻璃板上的铁屑藏起来，免得挡住线圈）
          { text: '凑近看线圈的电流方向', ghost: true, onClick: () => { fl.mesh.visible = false; look([-0.03, CR + 0.004, 0], [0.1, 0.25, 1], 0.12, () => { fl.mesh.visible = true; back(); }); ui.status('凑近看：线圈<b>朝着你的这一面</b>，导线里的电流（红色小箭头、流动的小点）是往上走还是往下走？右手握住螺线管，四指指向电流的方向，大拇指所指的那端就是 N 极。点空白处回去（铁屑会重新出现）。'); } },
        ]);
        // 安培定则：看电流的环绕方向，判断哪端是 N 极
        const quiz = buttons([{ text: '左端是 N 极', ghost: true, onClick: () => answer(-1) }, { text: '右端是 N 极', ghost: true, onClick: () => answer(1) }]);
        const answer = (k) => {
          if (!S.on) return ui.status('先通电。');
          if (k !== north()) return ui.status('用<b>右手</b>握住螺线管，四指指向线圈中电流的方向（看黄色的电流点怎样绕），拇指所指的那端就是 N 极。再看一看。');
          S.seen.add(`q${S.flip}${S.wind}`); endTags.forEach((t) => (t._shown = true));
          ui.status('对！右手握住螺线管，四指沿电流方向，拇指指的那端是 N 极——这就是<b>安培定则</b>。小磁针的指向也是这样。');
          if ([...S.seen].filter((x) => x.startsWith('q')).length >= 2) W.goal.done('ampere');
        };
        ui.controls.append(note('<b>点开关</b>通电；<b>点电池盒</b>把正负极对调；<b>点铁棒</b>插进螺线管；<b>拖小磁针</b>换位置；<b>点铁屑瓶</b>撒铁屑、<b>点玻璃板</b>敲一敲。面板按钮也能做。'), btns.el, wind.el, ln.el, note('<b>安培定则</b>：看电流在线圈里怎么绕，判断——'), quiz.el);
        W = { status: (m) => ui.status(m), sync: () => { endTags.forEach((t) => (t._shown = false)); }, goal: goals(ui, [['off', '通电、断电，看小磁针的变化'], ['filings', '撒铁屑看通电螺线管外部磁场的样子'], ['reverse', '通电时把电池正负极对调'], ['ampere', '用安培定则判断两次 N 极在哪端'], ['iron', '插入铁棒']]) };
        ui.status('螺线管还没通电，小磁针都指南北（受地磁场作用）。<b>点开关</b>通电。');
      },
      update(dt) {
        S.t += dt;
        const P = poles();
        for (const c of cps) c.update(fieldAt(P, c.position.x, c.position.z).map((v) => v * 1), dt, EARTH);
        fl.update(dt);
        iron.position.lerp(S.iron ? ironIn : ironHome, Math.min(1, dt * 6));
        ironTag.loc(group, iron.position.x + CL / 2 + 0.03, iron.position.y, iron.position.z).text(S.iron ? '' : '铁棒');
        // 电流点（正极出发，经开关→右端引线→线圈→左端；flip 反过来）
        const m = new THREE.Matrix4();
        placeArrows();
        dots.count = S.on ? NDOT : 0;
        if (S.on) for (let i = 0; i < NDOT; i++) { let u = ((i / NDOT) + S.t * 0.05) % 1; if (S.flip < 0) u = 1 - u; const p = helixCurve.getPointAt(u); m.makeTranslation(p.x, p.y, p.z); dots.setMatrixAt(i, m); }
        dots.instanceMatrix.needsUpdate = true;
        // 两端的 N / S 标签：答对安培定则以后才显示
        const n = north();
        endTags[0].loc(group, -CL / 2 - 0.02, CR * 2 + 0.01, 0).text(S.on && endTags[0]._shown ? (n > 0 ? 'S' : 'N') : '');
        endTags[1].loc(group, CL / 2 + 0.02, CR * 2 + 0.01, 0).text(S.on && endTags[1]._shown ? (n > 0 ? 'N' : 'S') : '');
      },
      debug: { S, toggle, flipBat },
    };
  },
};
