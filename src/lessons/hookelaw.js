// 人教版必修一图 3.1-8。坐标与长度用 m，钩码的重力只在平衡时等于弹簧拉力。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { stand, woodBlock, hookWeight, canvasTex, textPlate } from './kit/props.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { chart, table, buttons, note, h } from './kit/ui.js';

const MASS = 0.05,
  G = 9.8,
  K = 24.5,
  TOP = 0.4,
  FREE = 0.128,
  SCALE_TOP = 0.38,
  SCALE_X = 0.042,
  PITCH = 0.037;
export default {
  id: 'hookelaw',
  fig: '图3.1-8',
  title: '探究弹簧弹力与形变量的关系',
  stampText: '探究',
  predict: {
    q: '在弹性限度内，平衡后把一个钩码增加到两个，哪一个量会变为原来的两倍？',
    options: ['弹簧总长', '弹簧的伸长量', '两者都会'],
    answer: 1,
  },
  conclusion: {
    quote: '在弹性限度内，弹簧弹力的大小跟弹簧伸长量成正比。',
    why: '先记自由下垂时下端的位置。挂上钩码，静止后再读同一点，两次位置之差就是伸长量 x。钩码平衡时 F = mg；在 F–x 图上，直线斜率表示劲度系数 k，单位 N/m。',
    src: '人教版高中物理必修第一册第 60–61 页',
  },
  create(ctx) {
    const group = new THREE.Group(),
      st = stand({ height: 0.44, baseW: 0.14, baseD: 0.13 });
    st.position.set(-0.105 - st.rodX, 0, -0.055);
    group.add(st);

    const steel = paint(0x61717c),
      red = paint(0xae513c);
    function loop(parent, r, tube, at, arc = 2 * Math.PI) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28, arc), steel);
      m.position.set(...at);
      parent.add(m);
      return m;
    }
    loop(group, 0.006, 0.0016, [0, TOP - 0.004, 0]);
    const N = 220,
      helix = [];
    for (let j = 0; j <= N; j++) {
      const u = j / N,
        a = u * Math.PI * 2 * 16;
      helix.push(new THREE.Vector3(0.012 * Math.sin(a), -u, 0.012 * Math.cos(a)));
    }
    // 在单位长度上生成中心线，线径保持不变；更新时只改轴向坐标。
    const curve = new THREE.CatmullRomCurve3(helix.map((p) => new THREE.Vector3(p.x, p.y * 0.1, p.z)));
    const coil = new THREE.Mesh(new THREE.TubeGeometry(curve, N, 0.00145, 6, false), steel);
    coil.position.y = TOP - 0.01;
    group.add(coil);
    const vertices = coil.geometry.attributes.position;
    const restY = Array.from({ length: vertices.count }, (_, i) => vertices.getY(i));
    function joinEnd(parent, y) {
      const join = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.012, 12), steel);
      join.rotation.x = Math.PI / 2;
      join.position.set(0, y, 0.006);
      parent.add(join);
    }
    joinEnd(group, TOP - 0.01);
    const lower = new THREE.Group();
    group.add(lower);
    joinEnd(lower, 0);
    const hook = loop(lower, 0.006, 0.0015, [0, -0.006, 0], Math.PI * 1.65);
    hook.rotation.z = Math.PI * 0.65;
    const pointerLine = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.0018, 0.003), red);
    pointerLine.position.set(0.021, 0, 0.006);
    lower.add(pointerLine);
    const scaleTex = canvasTex(256, 2048, (c, w, h) => {
      c.fillStyle = '#efe4c7';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#524b40';
      c.textAlign = 'right';
      c.font = 'bold 39px sans-serif';
      for (let mm = 0; mm <= 300; mm++) {
        const y = 8 + (mm * (h - 16)) / 300;
        c.fillRect(0, y, mm % 10 === 0 ? 62 : mm % 5 === 0 ? 38 : 18, 2);
        if (mm % 10 === 0 && mm > 0 && mm < 300) c.fillText(String(mm / 10), w - 12, y + 12);
      }
    });
    const scale = new THREE.Mesh(new THREE.BoxGeometry(0.032, (0.3 * 2048) / 2032, 0.006), [
      steel,
      steel,
      steel,
      steel,
      new THREE.MeshBasicMaterial({ map: scaleTex }),
      steel,
    ]);
    scale.position.set(SCALE_X + 0.016, SCALE_TOP - 0.15, 0.002);
    group.add(scale);
    const referenceMark = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.0014, 0.0005), paint(0x38747a));
    referenceMark.position.set(SCALE_X + 0.009, 0, 0.0056);
    referenceMark.visible = false;
    group.add(referenceMark);
    const scaleArm = st.clamp(TOP - 0.002, SCALE_X + 0.016 - (st.position.x + st.rodX));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.065), steel);
    arm.position.set(SCALE_X + 0.016 - (st.position.x + st.rodX), 0, 0.028);
    scaleArm.add(arm);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.064, 16), steel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-(st.position.x + st.rodX), 0, 0.031);
    scaleArm.add(pin);
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.025, 0.009), steel);
    bracket.position.set(SCALE_X + 0.016, TOP - 0.0135, 0);
    group.add(bracket);
    const rack = woodBlock(0.139, 0.012, 0.066);
    rack.position.set(0.156, 0.006, 0.032);
    group.add(rack);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.014, 0.012), steel);
    rail.position.set(0.156, 0.082, 0.023);
    group.add(rail);
    for (const x of [0.098, 0.215]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.01), steel);
      foot.position.set(x, 0.046, 0.023);
      group.add(foot);
    }
    const weights = Array.from({ length: 3 }, (_, i) => {
      const mesh = hookWeight({ r: 0.016, h: 0.021 });
      const bottom = loop(mesh, 0.004, 0.0012, [0, -0.031, 0], Math.PI * 1.7);
      bottom.rotation.z = Math.PI * 0.6;
      const label = textPlate('50 g', { w: 0.029, h: 0.013, font: 'bold 190px sans-serif', color: '#fff6db' });
      label.position.set(0, -0.017, 0.0162);
      mesh.add(label);
      group.add(mesh);
      const home = new THREE.Vector3(0.111 + i * 0.044, 0.084, 0.055);
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.041, 12), steel);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(home.x, home.y - 0.002, 0.044);
      group.add(peg);
      mesh.position.copy(home);
      return { mesh, home };
    });
    const hung = [],
      points = [],
      line = [],
      seen = new Set();
    let lifted = false,
      extension = 0,
      velocity = 0,
      drag = null,
      baseline = null,
      near = false,
      ui,
      records,
      graph,
      report,
      input,
      settled = true,
      slope = 0;
    const bottomY = () => TOP - FREE - extension;
    const nextHook = () => bottomY() - 0.012 - PITCH * hung.length;
    function draw() {
      const length = TOP - 0.01 - bottomY();
      for (let i = 0; i < vertices.count; i++) vertices.setY(i, restY[i] - (Math.floor(i / 7) / N) * (length - 0.1));
      vertices.needsUpdate = true;
      coil.geometry.computeBoundingSphere();
      lower.position.y = bottomY();
      for (const w of weights) {
        if (w === drag) continue;
        const idx = hung.indexOf(w);
        if (idx < 0) w.mesh.position.copy(w.home);
        else w.mesh.position.set(0, bottomY() - 0.012 - idx * PITCH, 0);
      }
    }
    function target() {
      if (near) return null;
      if (baseline === null && hung.length) return hung.at(-1).mesh;
      if (baseline === null || (hung.length && !seen.has(hung.length))) return scale;
      if (hung.length === 3) return hung.at(-1).mesh;
      return weights.find((w) => !hung.includes(w))?.mesh;
    }
    const bar = lessonBar({
      ...ctx,
      back: leave,
      group,
      steps: [
        { id: 'reference', title: '读空载位置', todo: '点竖尺近看，读弹簧下端红线的位置。', target },
        { id: 'load', title: '挂码测伸长', todo: '挂上钩码，静止后在原尺上读同一条红线。', target },
        { id: 'slope', title: '从图求劲度系数', todo: '展开笔记本，根据自己的 F–x 图估计劲度系数。', target },
      ],
    });
    function guide() {
      if (!settled) {
        bar.say('等弹簧稳定后再读尺，振动中不能用钩码重力代替弹力。');
        return;
      }
      if (baseline === null) {
        bar.say(hung.length ? '先把钩码取下，读空载位置。' : '点竖尺近看，沿空载弹簧下端的红线读尺。');
        return;
      }
      if (near) {
        bar.say('沿红线点它所对的刻度，每格 1 mm。');
        return;
      }
      if (hung.length && !seen.has(hung.length)) {
        bar.say('已挂 ' + hung.length * 50 + ' g。点原来的竖尺，读同一条红线。');
        return;
      }
      if (seen.size === 3) {
        bar.say('三组数据已记录。展开笔记本，从 F–x 图的斜率求 k。');
        return;
      }
      bar.say(
        hung.length === 3
          ? '把最下端钩码拖回台面，测另一组质量。'
          : hung.length
            ? '把下一只 50 g 钩码拖到最下端的钩上。'
            : '把台面的一只 50 g 钩码拖到弹簧下钩。',
      );
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      if (!settled) {
        guide();
        return;
      }
      near = true;
      bar.near(true);
      ctx.look([0.032, bottomY(), 0.003], [0, 0, 1], 0.15, leave);
      bar.say('尺上数字为厘米。沿红线点它所对的刻度，每小格 1 mm。');
    }
    function read(y) {
      if (!settled) {
        guide();
        return;
      }
      const value = Math.round((SCALE_TOP - y) * 1000);
      if (Math.abs(value - (SCALE_TOP - bottomY()) * 1000) > 1) {
        bar.say('再看红线与竖尺相交的地方，读到毫米。');
        return;
      }
      if (baseline === null && hung.length) {
        bar.say('这是挂码后的位置。回全景取下钩码，先测空载位置。');
        return;
      }
      if (baseline === null) {
        baseline = value;
        referenceMark.position.y = SCALE_TOP - value / 1000;
        referenceMark.visible = true;
        bar.done('reference');
        records.el.hidden = graph.el.hidden = false;
        records.add(['0', String(value), '0', '0.00']);
        points.push([0, 0]);
        graph.draw();
        leave();
        bar.say('空载位置 ' + value + ' mm。把一只钩码拖到弹簧下钩。');
        return;
      }
      if (!hung.length || seen.has(hung.length)) {
        leave();
        guide();
        return;
      }
      const n = hung.length,
        x = value - baseline,
        f = n * MASS * G;
      records.add([String(n * 50), String(value), String(x), f.toFixed(2)]);
      seen.add(n);
      points.push([x / 1000, f]);
      points.sort((a, b) => a[0] - b[0]);
      if (seen.size === 3) {
        slope = points.reduce((sum, [x, f]) => sum + x * f, 0) / points.reduce((sum, [x]) => sum + x * x, 0);
        line.push([0, 0], [points.at(-1)[0], slope * points.at(-1)[0]]);
      }
      graph.draw();
      leave();
      if (seen.size === 3) {
        bar.done('load');
        report.hidden = false;
      }
      bar.say(
        '伸长 ' +
          x +
          ' mm = ' +
          value +
          ' − ' +
          baseline +
          ' mm。' +
          (seen.size === 3 ? '展开笔记本，读 F–x 图。' : '换一组钩码再测。'),
      );
    }
    function verify() {
      const estimate = input.valueAsNumber;
      if (!Number.isFinite(estimate) || Math.abs(estimate - slope) > 1.0) {
        bar.say('从图上取两点，用弹力差除以伸长量之差。横轴单位是 m。');
        return;
      }
      bar.done('slope');
      bar.say('根据你的读数，弹簧劲度系数约为 ' + estimate + ' N/m。');
    }
    const drags = weights.map((w) => ({
      obj: w.mesh,
      plane: 'xy',
      offset: 0,
      keepOffset: true,
      enabled: () => !near && (!hung.includes(w) || hung.at(-1) === w),
      hint: () => (hung.includes(w) ? '取下最下端钩码' : '拖到下钩'),
      onStart() {
        if (document.body.classList.contains('predicting')) ui?.go(1);
        drag = w;
        lifted = false;
      },
      onDrag(p) {
        if (hung.at(-1) === w && Math.hypot(p.x - w.mesh.position.x, p.y - w.mesh.position.y) > 0.003) {
          hung.pop();
          lifted = true;
          settled = false;
        }
        w.mesh.position.set(p.x, Math.max(0.036, p.y), 0.055 * Math.max(0, 1 - p.y / 0.14));
      },
      onEnd(moved) {
        const atRack = w.mesh.position.y < 0.11 && w.mesh.position.x > 0.075;
        const atHook = Math.abs(w.mesh.position.x) < 0.035 && Math.abs(w.mesh.position.y - nextHook()) < 0.04;
        const missed = moved && !lifted && !hung.includes(w) && !atHook;
        if (moved && !hung.includes(w) && (atHook || (lifted && !atRack))) {
          hung.push(w);
          settled = false;
        }
        drag = null;
        draw();
        guide();
        if (missed) bar.say('钩码回到架上了。把它上端的圆环拖到最下方的钩上再松手。');
      },
    }));
    drags.push({
      obj: scale,
      plane: 'xy',
      offset: 0.005,
      hint: '近看尺上的红线',
      onStart(p) {
        if (!p) return;
        if (document.body.classList.contains('predicting')) ui?.go(1);
        if (near) read(p.y);
        else inspect();
      },
    });
    const pointer = draggable(group, drags, { highlight: true });
    function reset() {
      hung.length = points.length = line.length = 0;
      slope = 0;
      referenceMark.visible = false;
      lifted = false;
      seen.clear();
      baseline = drag = null;
      velocity = extension = 0;
      settled = true;
      near = false;
      ctx.back();
      bar.near(false);
      draw();
      records.clear();
      records.el.hidden = graph.el.hidden = report.hidden = true;
      input.value = '';
      bar.undo('reference', 'load', 'slope');
      guide();
    }
    draw();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.48, d: 0.24, h: 0.46 },
      view: { elev: 13, azim: -6, lookY: 0.48, margin: 1.05 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['钩码 / g', '下端位置 / mm', '伸长 / mm', '平衡弹力 / N']);
        graph = chart({
          x: { label: 'x / m', min: 0, max: 0.065 },
          y: { label: 'F / N', min: 0, max: 1.6 },
          series: [
            { points, dots: true, line: false, color: '#28656f' },
            { points: line, color: '#ab593d' },
          ],
          legend: '横轴是相对空载位置的伸长量。取图上两点，用 ΔF/Δx 求斜率。',
        });
        input = h('input', { type: 'number', step: '0.1', 'aria-label': '劲度系数 / (N/m)', style: 'width:5em' });
        report = h(
          'div',
          { hidden: true },
          h('label', {}, 'k / (N/m) ', input),
          buttons([{ text: '核对劲度系数', onClick: verify }]).el,
        );
        records.el.hidden = graph.el.hidden = true;
        ui.data.append(records.el, graph.el, report);
        ui.notes.append(
          note('每只钩码质量 50 g，取 g = 9.8 m/s²。本实验的载荷都在弹性限度内，忽略弹簧自重对伸长差的影响。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (settled) return;
        // 轻弹簧的等效惯性和阻尼只影响过渡过程，平衡伸长由 mg/k 决定。
        const mass = hung.length * MASS,
          target = (mass * G) / K,
          omega = Math.sqrt(K / (mass + 0.01)),
          decay = omega * 0.38,
          frequency = Math.sqrt(omega ** 2 - decay ** 2),
          d = extension - target,
          b = (velocity + decay * d) / frequency,
          cos = Math.cos(frequency * dt),
          sin = Math.sin(frequency * dt),
          envelope = Math.exp(-decay * dt);
        extension = target + envelope * (d * cos + b * sin);
        velocity = envelope * ((b * frequency - decay * d) * cos - (d * frequency + decay * b) * sin);
        if (Math.abs(extension - target) < 0.00025 && Math.abs(velocity) < 0.002) {
          extension = target;
          velocity = 0;
          settled = true;
          guide();
        }
        draw();
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        scaleTex.dispose();
      },
    };
  },
};
