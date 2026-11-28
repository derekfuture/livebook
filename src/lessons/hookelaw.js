// 人教版必修一图 3.1-8。坐标与长度用 m，钩码的重力只在平衡时等于弹簧拉力。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { stand, woodBlock, canvasTex, textPlate } from './kit/props.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { chart, table, buttons, h } from './kit/ui.js';

const MASS = 0.05,
  G = 9.8,
  K = 24.5,
  TOP = 0.4,
  FREE = 0.128,
  SCALE_TOP = TOP,
  SCALE_X = 0.042,
  PITCH = 0.033;
export default {
  id: 'hookelaw',
  fig: '图3.1-8',
  title: '探究弹簧弹力与形变量的关系',
  stampText: '探究',
  predict: {
    q: '探究弹簧弹力与形变量的关系，需要测量多组弹簧弹力和形变量的数据，如何测量？',
    options: ['只读挂码后的弹簧长度', '先读原长，再逐次挂码读长度', '只记录每次挂了多少钩码'],
    answer: 1,
  },
  conclusion: {
    page: 65, rect: [63.76, 178.96, 378.77, 273.39],
    quote: '英国科学家胡克经过研究发现，在弹性限度内，弹簧发生弹性形变时，弹力F 的大小跟弹簧伸长（或缩短）的长度 x成正比， 即F ＝kx',
    why: '先记自由下垂时下端的位置。挂上钩码，静止后再读同一点，两次位置之差就是伸长量 x。钩码平衡时 F = mg；在 F–x 图上，直线斜率表示劲度系数 k，单位 N/m。',
    src: '课本第 61 页 · 第三章 第1节 重力与弹力',
  },
  create(ctx) {
    const group = new THREE.Group(),
      st = stand({ height: 0.44, baseW: 0.14, baseD: 0.13 });
    st.position.set(-0.105 - st.rodX, 0, -0.055);
    group.add(st);

    group.position.x = -0.11;

    const steel = paint(0x61717c),
      red = paint(0xae513c);
    function loop(parent, r, tube, at, arc = 2 * Math.PI) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28, arc), steel);
      m.position.set(...at);
      parent.add(m);
      return m;
    }
    loop(group, 0.006, 0.0016, [0, TOP - 0.004, 0]);
    const N = 480,
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
    hook.rotation.y = Math.PI / 3;
    hook.rotation.z = Math.PI * 0.65;
    const pointerLine = new THREE.Mesh(new THREE.BoxGeometry(0.053, 0.00075, 0.001), red);
    pointerLine.position.set(0.026, 0, 0.006);
    lower.add(pointerLine);
    const scaleTex = canvasTex(256, 2048, (c, w, h) => {
      c.fillStyle = '#efe4c7';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#524b40';
      c.textAlign = 'left';
      c.font = 'bold 49px sans-serif';
      c.fillText('cm', 146, 54);
      c.fillText('0', 90, 46);
      for (let mm = 0; mm <= 300; mm++) {
        const y = 8 + (mm * (h - 16)) / 300;
        c.fillRect(0, y, mm % 10 === 0 ? 62 : mm % 5 === 0 ? 38 : 18, 2);
        if (mm % 10 === 0 && mm > 0 && mm < 300) c.fillText(String(mm / 10), 90, y + 16);
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
    const referenceMark = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.00065, 0.0005), paint(0x38747a));
    referenceMark.position.set(SCALE_X + 0.005, 0, 0.0056);
    referenceMark.visible = false;
    group.add(referenceMark);
    const scaleArm = st.clamp(TOP - 0.002, SCALE_X + 0.016 - (st.position.x + st.rodX));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.065), steel);
    arm.position.set(SCALE_X + 0.016 - (st.position.x + st.rodX), 0, 0.020);
    scaleArm.add(arm);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.064, 16), steel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-(st.position.x + st.rodX), 0, 0.031);
    scaleArm.add(pin);
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.025, 0.009), steel);
    bracket.position.set(SCALE_X + 0.016, TOP - 0.0135, -0.004);
    group.add(bracket);
    const rack = woodBlock(0.212, 0.012, 0.068);
    rack.position.set(0.206, 0.006, -0.015);
    group.add(rack);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.204, 0.014, 0.012), steel);
    rail.position.set(0.206, 0.082, -0.035);
    group.add(rail);
    for (const x of [0.110, 0.302]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.01), steel);
      foot.position.set(x, 0.046, -0.035);
      group.add(foot);
    }
    // 钩码侧面与黄铜顶盖沿同一剖面相接，平视凑近时也只有一层表面。
    const profile = [[0, -0.027], [0.0145, -0.027], [0.016, -0.0255], [0.016, -0.009]];
    const bodyGeo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const capGeo = new THREE.CylinderGeometry(0.0155, 0.016, 0.003, 40);
    const weights = Array.from({ length: 4 }, (_, i) => {
      const mesh = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, paint(0x6a7385));
      const cap = new THREE.Mesh(capGeo, paint(0xc9a347));
      cap.position.y = -0.0075;
      body.castShadow = cap.castShadow = true;
      mesh.add(body, cap);
      const ring = loop(mesh, 0.004, 0.0012, [0, -0.002, 0]);
      const bottom = loop(mesh, 0.004, 0.0012, [0, -0.031, 0], Math.PI * 1.7);
      bottom.rotation.y = Math.PI / 3;
      bottom.rotation.z = Math.PI * 0.6;
      const label = textPlate('50 g', { w: 0.029, h: 0.013, font: 'bold 190px sans-serif', color: '#fff6db' });
      label.position.set(0, -0.017, 0.0162);
      mesh.add(label);
      group.add(mesh);
      const home = new THREE.Vector3(0.127 + i * 0.052, 0.084, 0);
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.041, 12), steel);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(home.x, home.y - 0.002, -0.017);
      group.add(peg);
      // 拾取盒包住圆环、圆柱和下钩，相邻钩码之间留出空隙。
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.041, 0.035), new THREE.MeshBasicMaterial({ visible: false }));
      pick.userData.pick = true;
      pick.position.y = -0.016;
      mesh.add(pick);
      mesh.position.copy(home);
      return { mesh, pick, home, ring, bottom };
    });
    const hung = [], points = [], line = [];
    let extension = 0, velocity = 0, settled = true, baseline = null;
    let near = false, drag = null, detached = false, returning = null;
    let ui, records, graph, choices, result;
    const bottomY = () => TOP - FREE - extension;
    const hookAt = (i) => new THREE.Vector3(0, bottomY() - 0.010 - i * PITCH, 0);
    const lastWeight = () => hung[hung.length - 1];
    const swinging = '红线还在动，停稳后再读。';
    const balanced = '钩码静止，弹簧弹力与钩码重力大小相等。';
    const modelNote = '模拟数据：按弹性限度内的理想弹簧计算';
    const canHang = () => settled && (!hung.length || (baseline !== null && hung.length < points.length));
    function aligned(w) {
      const support = lastWeight()?.bottom ?? hook;
      const seat = support.parent.position.clone().add(support.position);
      seat.y -= support.geometry.parameters.radius;
      const ringCenter = w.mesh.position.clone().add(w.ring.position);
      return ringCenter.distanceTo(seat) <= w.ring.geometry.parameters.radius;
    }
    const mmAtLine = () => Math.round((SCALE_TOP - bottomY()) * 1000);
    const cm = (mm) => (mm / 10).toFixed(1);
    const message = (s) => ui.status(s);
    function draw() {
      const length = TOP - 0.01 - bottomY();
      for (let i = 0; i < vertices.count; i++) vertices.setY(i, restY[i] - (Math.floor(i / 7) / N) * (length - 0.1));
      vertices.needsUpdate = true;
      coil.geometry.computeBoundingSphere();
      lower.position.y = bottomY();
      hung.forEach((w, i) => {
        if (w !== drag && w !== returning?.w) w.mesh.position.copy(hookAt(i));
      });
    }
    function target() {
      if (near || drag || returning || !settled) return null;
      if (baseline === null) return lastWeight()?.mesh || scale;
      if (hung.length >= points.length) return scale;
      return weights.find((w) => !hung.includes(w))?.mesh;
    }
    const bar = lessonBar({
      ...ctx, back: leave, group,
      steps: [
        { id: 'reference', title: '读原长', todo: '点尺子读空载红线，记下原长 l₀，后面用它算伸长量。', target },
        { id: 'load', title: '挂钩码', todo: '每次加挂一个钩码，静止后读同一条红线，测出四组伸长量和弹力。', target },
        { id: 'slope', title: '看图得结论', todo: '点开 F–x 图，看各点怎样排列，再用弹力差除以伸长量之差求斜率。' },
      ],
    });
    function refreshGuide() {
      let text = '';
      if (!settled) text = swinging;
      else if (drag && !detached && canHang() && aligned(drag)) text = '圆环已对准挂钩，可以松手。';
      else if (baseline === null && hung.length) text = '把钩码拖回架上，让弹簧自由下垂，再读原长。';
      else if (near) text = '读红线中心对着的刻度，在面板选出读数。每小格是 0.1 cm。';
      else if (hung.length && hung.length >= points.length) text = '点尺子读同一条红线，用这次的长度减去原长，得到伸长量。';
      bar.say(text);
    }
    function leave() {
      near = false;
      choices.el.hidden = true;
      ctx.back();
      bar.near(false);
      refreshGuide();
    }
    function begin() {
      if (ui.step !== 1) ui.go(1);
    }
    function inspect() {
      begin();
      if (!settled || (baseline === null && hung.length)) { refreshGuide(); return; }
      near = true;
      bar.near(true);
      ctx.look([group.position.x + 0.039, bottomY(), 0.005], [0, 0, 1], 0.20, leave);
      message(hung.length ? `钩码已静止，总质量 ${hung.length * 50} g。` : '弹簧自由下垂，红线标出下端的位置。');
      const expected = mmAtLine();
      const start = expected - ((hung.length + 1) % 3);
      choices.btns.forEach((b, i) => {
        b.value = String(start + i);
        b.textContent = cm(start + i) + ' cm';
      });
      choices.el.hidden = false;
      refreshGuide();
    }
    function read(value) {
      if (!near || !settled) return;
      const diff = value - mmAtLine();
      if (diff) {
        message(`读数偏${diff > 0 ? '大' : '小'} ${cm(Math.abs(diff))} cm，再看红线中心。`);
        return;
      }
      leave();
      if (baseline === null) {
        baseline = value;
        referenceMark.position.y = SCALE_TOP - value / 1000;
        referenceMark.visible = true;
        points.push([0, 0]);
        records.add(['0', cm(value), '0.0', '0.00']);
        graph.draw();
        bar.done('reference');
        message(`读对了，原长 l₀ = ${cm(value)} cm，以后每次都从这个长度算起。`);
        return;
      }
      const n = hung.length;
      if (n < points.length) {
        message(`读对了，${n * 50} g 时的读数 ${cm(value)} cm 已经记在表里。`);
        return;
      }
      const x = value - baseline, f = n * MASS * G;
      const previous = points[n - 1][0] * 1000;
      points.push([x / 1000, f]);
      records.add([String(n * 50), cm(value), cm(x), f.toFixed(2)]);
      graph.draw();
      if (n === weights.length) bar.done('load');
      refreshGuide();
      message(`读对了，这次伸长 ${cm(x)} cm，比上一组多挂 50 g，多伸长 ${cm(x - previous)} cm。`);
    }
    function showSlope() {
      const paper = graph.canvas.closest('.chart-zoom-paper');
      if (!paper) return;
      paper.insertBefore(h('p', { class: 'note' }, modelNote), paper.lastElementChild);
      if (points.length !== weights.length + 1) return;
      const [x, f] = points[points.length - 1];
      line.splice(0, line.length, points[0], points[points.length - 1]);
      graph.draw();
      const formula = `k = ΔF/Δx = ${f.toFixed(2)} N ÷ ${x.toFixed(3)} m ≈ ${(f / x).toFixed(1)} N/m`;
      const relation = '本次的模拟数据在 F–x 图上排成一条过原点的直线，弹力 F 与伸长量 x 成正比。';
      result.textContent = formula;
      result.hidden = false;
      paper.insertBefore(h('p', { style: 'font-size:clamp(14px,1.4vw,20px);line-height:1.5;margin:6px 0' },
        relation, h('br'), h('b', {}, formula)), paper.lastElementChild);
      message(relation);
      bar.done('slope');
    }
    function returnTo(w, destination, rehang = false) {
      returning = { w, start: w.mesh.position.clone(), destination, rehang, time: 0 };
    }
    const drags = weights.map((w) => {
      const enabled = () => !near && !returning && (hung.indexOf(w) < 0 || w === lastWeight());
      return {
        obj: w.pick, anchor: w.mesh, plane: 'xy', offset: 0, keepOffset: true,
        enabled, hint: () => ui?.step !== 1 || !enabled() ? '' : hung.includes(w) ? '拖：放回钩码架' : '拖：挂到弹簧下端',
        onStart() { begin(); drag = w; detached = false; message(''); },
        onDrag(p) {
          if (w === lastWeight()) {
            if (p.distanceTo(w.mesh.position) < 0.003) return;
            hung.pop();
            detached = true;
            settled = false;
            message('');
            refreshGuide();
          }
          const wasAligned = !detached && aligned(w);
          w.mesh.position.set(p.x, Math.max(0.036, p.y), 0);
          if (!detached && wasAligned !== aligned(w)) refreshGuide();
        },
        onEnd(moved) {
          drag = null;
          if (!moved || w === lastWeight()) return;
          const pos = w.mesh.position;
          if (detached) {
            detached = false;
            if (pos.distanceTo(w.home) <= 0.03) {
              w.mesh.position.copy(w.home);
              message(`取下一个钩码，弹簧上的质量减到 ${hung.length * 50} g。`);
            } else {
              returnTo(w, () => hookAt(hung.length), true);
              message('圆环没放到原来的架钉上，钩码回到了挂钩。');
            }
          } else if (!aligned(w)) {
            returnTo(w, () => w.home);
            message('圆环没挂住，钩码回到了架上。');
          } else if (!canHang()) {
            returnTo(w, () => w.home);
            message('这一组还没读数，刚拿起的钩码放回架上。');
          } else {
            hung.push(w);
            settled = false;
            message('');
          }
          draw();
          refreshGuide();
        },
      };
    });
    const pointer = draggable(group, drags, {
      tip: ctx.tag('', 'pill'),
      taps: [{ obj: scale, enabled: () => !near && !returning, hint: () => ui?.step !== 1 || near || returning ? '' : '点一下：凑近读尺', onTap: inspect }],
    });
    const initial = '尺的零刻度对齐弹簧上端，每个钩码的质量是 50 g。';
    function reset() {
      hung.length = points.length = line.length = 0;
      baseline = drag = returning = null;
      detached = false;
      extension = velocity = 0;
      settled = true;
      referenceMark.visible = false;
      weights.forEach((w) => w.mesh.position.copy(w.home));
      leave();
      draw();
      records.clear();
      graph.draw();
      result.hidden = true;
      result.textContent = '';
      bar.undo('reference', 'load', 'slope');
      refreshGuide();
      ui.relock();
      message(initial);
    }
    const qaRead = (expected, wrong = false) => () => {
      const b = choices.btns.find((b) => (Number(b.value) === expected) !== wrong);
      if (!near || !b) throw new Error('没有对应的读尺选项');
      b.click();
      if (near !== wrong) throw new Error('读数反馈状态错误');
    };
    draw();
    return {
      group: new THREE.Group().add(group), pointer, reset,
      toggles: ['steps'],
      size: { w: 0.58, d: 0.24, h: 0.47 },
      view: { elev: 12, azim: -5, lookY: 0.46, margin: 1.32 },
      mount(panel) {
        ui = panel;
        // 给本课结论的印章留出位置。
        const source = panel.el.querySelector('.answer .src');
        source.style.minHeight = '60px';
        source.style.paddingRight = '80px';
        bar.attach({ ...panel, need: () => {} });
        message(initial);
        choices = buttons([0, 1, 2].map((i) => ({
          text: '', onClick: () => read(Number(choices.btns[i].value)),
        })));
        choices.el.hidden = true;
        choices.el.dataset.keep = '1';
        ui.controls.append(choices.el);
        records = table(['质量 m/g', '长度 l/cm', '伸长 x/cm', '弹力 F/N']);
        graph = chart({
          x: { label: 'x / m', min: 0, max: 0.09, ticks: [0, 0.02, 0.04, 0.06, 0.08] },
          y: { label: 'F / N', min: 0, max: 2.1, ticks: [0, 0.5, 1, 1.5, 2] },
          series: [
            { points: line, color: '#9b583c' },
            { points, dots: true, line: false, color: '#28656f' },
          ],
        });
        graph.canvas.addEventListener('click', showSlope);
        result = h('p', { class: 'note', hidden: true });
        ui.data.append(h('p', { class: 'note' }, modelNote), records.el,
          h('p', { class: 'note' }, 'x = l − l₀　钩码平衡时 F = mg（g 取 9.8 N/kg）'), graph.el, result);
        ui.notes.append(buttons([{ text: '全部重做', onClick: reset }]).el);
      },
      update(dt) {
        dt *= bar.update(dt);
        if (returning) {
          const r = returning;
          r.time += dt;
          const t = Math.min(1, r.time / 0.4);
          const destination = r.destination();
          if (t < 1) r.w.mesh.position.lerpVectors(r.start, destination, t * (2 - t));
          else {
            r.w.mesh.position.copy(destination);
            if (r.rehang) {
              hung.push(r.w);
              settled = false;
              message('');
              refreshGuide();
            }
            returning = null;
          }
        }
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
          if (!drag && !returning) message(hung.length ? balanced : '弹簧恢复了原长。');
          refreshGuide();
        }
        draw();
      },
      debug: {
        bar,
        qa: qaFlow(pointer, [
          { name: '拿起钩码，未挂准', drag: weights[3].pick, to: () => hookAt(0).setX(0.016) },
          { name: '检查归位', run: () => { if (!weights[3].mesh.position.equals(weights[3].home)) throw new Error('钩码未归位'); } },
          { name: '近看原长', tap: scale },
          { name: '错读原长', run: qaRead(128, true) },
          { name: '记下原长', run: qaRead(128) },
          ...weights.flatMap((w, i) => [
            { name: '挂第' + (i + 1) + '个钩码', drag: w.pick, to: () => hookAt(i), wait: 2 },
            { name: '近看挂码后的红线', tap: scale },
            { name: '记录第' + (i + 1) + '组', run: qaRead(148 + 20 * i) },
          ]),
          { name: '看图求斜率', run: () => {
            graph.canvas.click();
            if (!bar.finished || points.length !== 5 || !result.textContent.includes('24.5 N/m')) throw new Error('图表或斜率有误');
          } },
          { name: '回到记录', run: () => document.querySelector('.chart-zoom').click() },
          { name: '将最下端钩码放回架上', drag: weights[3].pick, to: weights[3].home, wait: 2 },
          { name: '复读卸载后的刻度', tap: scale },
          { name: '原有记录不重复', run: () => {
            qaRead(188)();
            if (hung.length !== 3 || points.length !== 5 || records.rows.length !== 5) throw new Error('卸载或重复读数有误');
          } },
        ]),
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        scaleTex.dispose();
      },
    };
  },
};
