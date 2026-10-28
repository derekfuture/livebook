// 图6.3-3 用量筒测量形状不规则固体的体积 · 测量小石块的密度。
//   1 称出小石块的质量 m（这里用电子天平，天平的用法见第 1 节）  2 量筒里倒入适量的水，读出 V₁
//   3 用细线拴住小石块慢慢放入水中，读出 V₂；V = V₂ − V₁  4 ρ = m / V
// “适量”：水要能浸没石块，放入石块后又不能超过量程。读数时视线与凹液面的底部相平。
import * as THREE from 'three';
import { seg, slider, buttons, goals, note, table } from './kit/ui.js';
import { canvasTex, beaker } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull } from '../live/ink.js';

const R = 0.016, RI = 0.0152, A = Math.PI * (RI * 100) ** 2;     // 量筒内截面积（cm²）
const Y0 = 0.008, CAP = 100, H = Y0 + CAP / A / 100 + 0.02;       // 0 mL 的高度、量程、量筒高
const mlY = (v) => Y0 + v / A / 100;
const STONES = [{ label: '小石块', V: 10, rho: 2.6 }, { label: '另一块石头', V: 14, rho: 2.5 }];

export default {
  id: 'cylinder',
  fig: '图6.3-3',
  title: '测量小石块的密度',
  stampText: '测量',
  predict: {
    q: '量筒里的水是 50 mL，放入小石块后液面到了 60 mL。<br>小石块的体积是——',
    hint: '课本第 150 页「实验」',
    options: ['60 cm³', '10 cm³', '110 cm³'],
    answer: 1,
  },
  conclusion: {
    page: 156, rect: [40, 245, 345, 292],          // 课本第 150 页
    quote: '测出不吸水的小石块的体积和质量，就可以利用公式 ρ = m/V 得到小石块的密度了。',
    formula: '<i>V</i> = <i>V</i><sub>2</sub> − <i>V</i><sub>1</sub>　　<i>ρ</i> = <i>m</i> / (<i>V</i><sub>2</sub> − <i>V</i><sub>1</sub>)',
    why: '形状不规则的固体没法用刻度尺量体积，可以用“排水法”：石块浸没在水中，排开的水的体积就是它的体积，液面升高的读数之差 V₂ − V₁ 就是石块的体积（1 mL = 1 cm³）。水要“适量”：太少浸没不了石块，太多放入石块后会超过量程。读数时视线要与凹液面的底部相平。应该先测质量再测体积——石块从水里拿出来会沾水，再称质量就偏大了。',
    src: '课本第 150 页 · 第六章 第3节 测量液体和固体的密度',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    // ---- 量筒 ----
    const cyl = new THREE.Group();
    cyl.position.set(0, 0, 0);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, true), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    glass.position.y = H / 2; glass.renderOrder = 6;
    const foot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.006, 6), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.6 })), { width: 1 });
    foot.position.y = 0.003;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(RI, RI, 0.002, 32), paint(0xd6ecf5));
    floor.position.y = Y0 - 0.001;
    // 刻度：每 1 mL 一小格，10 mL 一个数字，0 刻度在 Y0
    const PH = H - 0.004;
    const tex = canvasTex(128, 2048, (c, w, h) => {
      const px = h / PH;
      c.strokeStyle = '#23293a'; c.fillStyle = '#23293a'; c.font = 'bold 34px sans-serif'; c.textAlign = 'left';
      for (let v = 0; v <= CAP; v++) {
        const y = h - (mlY(v) - 0.004) * px, major = v % 10 === 0, mid = v % 5 === 0;
        c.lineWidth = major ? 4 : 2;
        c.beginPath(); c.moveTo(0, y); c.lineTo(major ? 56 : mid ? 40 : 26, y); c.stroke();
        if (major && v) c.fillText(String(v), 62, y + 12);
      }
      c.font = 'bold 28px sans-serif'; c.fillText('mL', 62, h - (mlY(CAP) - 0.004) * px - 40);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.012, PH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    plate.position.set(-0.002, 0.004 + PH / 2, R + 0.0006); plate.renderOrder = 8;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(RI * 0.99, RI * 0.99, 1, 32, 1, true), paint(0x8fcdea, { unique: true, transparent: true, opacity: 0.55, depthWrite: false }));
    water.geometry.translate(0, 0.5, 0); water.position.y = Y0; water.renderOrder = 5;
    // 凹液面：中间低一点的浅碗形
    const men = new THREE.Mesh(new THREE.SphereGeometry(RI * 0.99, 24, 8, 0, Math.PI * 2, Math.PI * 0.82, Math.PI * 0.18), paint(0x5fb4dd, { unique: true, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    men.scale.y = 0.35; men.renderOrder = 7;
    cyl.add(glass, foot, floor, plate, water, men);
    group.add(cyl);
    tag('量筒 100 mL', 'pill').loc(group, 0, H + 0.015, 0);
    // ---- 电子天平 ----
    const SX = 0.13;
    const sb = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.08), paint(0xe9edf2)), { width: 1.2 });
    sb.position.set(SX, 0.009, 0);
    const lcdTex = canvasTex(256, 80, () => {});
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.0155), new THREE.MeshBasicMaterial({ map: lcdTex }));
    lcd.rotation.x = -Math.PI / 2; lcd.position.set(SX, 0.0185, 0.03);
    group.add(sb, lcd);
    let shown = null;
    const drawLcd = (m) => { if (shown === m) return; shown = m; const g = lcdTex.image.getContext('2d'); g.fillStyle = '#b9d8b0'; g.fillRect(0, 0, 256, 80); g.fillStyle = '#1d2a1d'; g.font = 'bold 58px Menlo, monospace'; g.textAlign = 'right'; g.fillText(m.toFixed(1), 210, 62); g.font = 'bold 30px sans-serif'; g.fillText('g', 246, 62); lcdTex.needsUpdate = true; };
    drawLcd(0);
    tag('电子天平', 'pill').loc(group, SX, 0.005, 0.055);
    // ---- 小石块（不规则多面体）+ 细线 ----
    const stoneMat = paint(0x7d756b, { unique: true });
    const stone = hull(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), stoneMat), 0.08);
    group.add(stone);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0003, 0.0003, 1, 4), new THREE.MeshBasicMaterial({ color: 0x444444 }));
    thread.geometry.translate(0, 0.5, 0);
    group.add(thread);

    const S = { st: 0, water: 0, where: 'table', dragPos: new THREE.Vector3(), y: 0, m: null, v1: null, v2: null, rows: [], spill: false };
    const sizeOf = () => Math.cbrt((STONES[S.st].V * 1e-6) / 2.17);      // 外接半径为 r 的十二面体 V ≈ 2.785 r³，再压扁成 0.72 × 1.5 × 0.72
    let W = null;
    const level = () => {
      const st = STONES[S.st];
      const r = sizeOf();
      const sub = S.where === 'in' ? Math.min(1, Math.max(0, (mlY(S.water) - (S.y - 1.5 * r)) / (3 * r))) : 0;
      return Math.min(CAP + 4, S.water + st.V * (S.where === 'in' ? smooth(sub) : 0));
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const layout = () => {
      const r = sizeOf();
      stone.scale.set(r * 0.72, r * 1.5, r * 0.72);
      const lv = level();
      const ly = mlY(Math.min(CAP, lv));
      water.visible = S.water > 0.2; men.visible = water.visible;
      water.scale.y = Math.max(0.0005, ly - Y0 + RI * 0.99 * 0.35 * (0.98 + Math.cos(Math.PI * 0.82)));     // 水柱一直到凹液面的边沿（贴着筒壁的那一圈），中间最低处正好在读数位置
      men.position.y = ly + RI * 0.99 * 0.35 * 0.98;
      if (S.where === 'drag') stone.position.copy(S.dragPos);
      else if (S.where === 'table') stone.position.set(-0.03, r * 0.72, 0.035);
      else if (S.where === 'scale') stone.position.set(SX, 0.018 + r * 0.72, -0.005);
      else stone.position.set(0, S.y, 0);
      thread.visible = S.where === 'in' || S.where === 'drag';
      thread.position.set(0, S.y + r * 1.5, 0); thread.scale.y = Math.max(0.001, H + 0.04 - (S.y + r * 1.5));
      drawLcd(S.where === 'scale' ? +(STONES[S.st].V * STONES[S.st].rho).toFixed(1) : 0);
      S.level = lv;
    };
    layout();

    // 旁边一杯水：按住它就往量筒里倒（松手停）。按住量筒（里面没放石块时）就把水倒回杯里一些。
    const jug = beaker({ r: 0.026, h: 0.07, level: 0.055 });
    const JUG = new THREE.Vector3(-0.075, 0, -0.02);
    jug.position.copy(JUG);
    group.add(jug);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 6), paint(0x8fcdea, { unique: true, transparent: true, opacity: 0.8 }));
    stream.geometry.translate(0, -0.5, 0); stream.visible = false;
    group.add(stream);
    tag('一杯水', 'pill').loc(group, JUG.x, 0.005, JUG.z + 0.04);
    S.pour = 0; S.pourOut = 0; S.tilt = 0;
    let act = {};
    const SXc = SX;
    const pointer = draggable(group, [
      { obj: stone, plane: 'xy', offset: 0.0, keepOffset: true, hint: () => (S.where === 'in' ? '往上拖：把石块提出来' : S.m == null ? '拖到电子天平上' : '拖到量筒口，放进水里'),
        onStart: () => { if (S.where === 'in') S.wasIn = true; S.where = 'drag'; S.dragPos.copy(stone.position); },
        onDrag: (p) => { S.dragPos.set(clamp(p.x, -0.12, 0.2), clamp(p.y, 0.01, H + 0.08), 0.0); },
        onEnd: () => {
          const p = S.dragPos;
          if (S.wasIn) { S.wasIn = false; S.where = 'table'; S.v2 = S.v2; return W?.status('石块提出来了，表面沾着水。'); }
          if (Math.abs(p.x - SXc) < 0.05 && p.y < 0.08) { S.where = 'scale'; act.weigh?.(); }
          else if (Math.abs(p.x) < 0.03 && p.y > H - 0.02) act.lower?.();
          else S.where = 'table';
        } },
    ], {
      tip: tag('', 'pill'),
      taps: [
        { obj: plate, hint: () => (S.where === 'in' ? '点一下：凑近读 V₂' : '点一下：凑近读水的体积'), onTap: () => (S.where === 'in' ? act.readV2?.() : act.readV1?.()) },
      ],
    });
    // 按住杯子倒水 / 按住量筒倒出一些：用 onClick 接住按下，抬起时停
    const holdPick = { down: (ray) => {
      if (ray.intersectObject(jug, true).length) { if (S.where === 'in') { W?.status('石块已经放进去了。要重新倒水，先把石块提出来。'); return true; } S.pour = 1; S.v1 = null; return true; }
      if (ray.intersectObject(plate, false).length || ray.intersectObject(stone, false).length) return false;
      if (ray.intersectObject(glass, false).length && S.where !== 'in') { S.pourOut = 1; S.v1 = null; return true; }
      return false;
    } };
    const ptr = { down: (r, e) => holdPick.down(r) || pointer.down(r, e), move: (r, e) => { const m = pointer.move(r, e); if (!m && r.intersectObject(jug, true).length) document.getElementById('c').style.cursor = 'pointer'; return m; }, up: (r, e) => { const was = S.pour || S.pourOut; S.pour = 0; S.pourOut = 0; return pointer.up(r, e) || !!was; } };

    return {
      group,
      pointer: ptr,
      size: { w: 0.32, d: 0.1, h: 0.2 },
      view: { elev: 10, azim: 0, lookY: 0.45, margin: 1.1 },
      mount(ui) {
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        const tb = table(['', 'm/g', 'V₁/mL', 'V₂/mL', 'V/cm³', 'ρ/(g/cm³)']);
        let cur = null;
        const ask = (id, q, right, wrongs, unit, hint, ok) => {
          const opts = [...new Set([right, ...wrongs])].slice(0, 3).sort(() => Math.random() - 0.5);
          cur = { id, right, opts, hint, ok };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]} ${unit}`; });
          choices.el.hidden = false;
          ui.status(q);
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.right) return ui.status(cur.hint);
          choices.el.hidden = true;
          const c = cur; cur = null;
          c.ok();
        };
        const bStone = seg('石块', STONES.map((s) => s.label), (_, k) => { S.st = k; S.where = 'table'; S.m = S.v1 = S.v2 = null; S.wet = false; S.wasIn = false; choices.el.hidden = true; W.goal.undo('m', 'v1', 'rho'); ui.status(`换了一块干的${STONES[k].label}。重新测：先称质量，再用排水法测体积。`); });
        act.weigh = () => {
            if (S.v2 != null || S.wet) { S.where = 'scale'; return ui.status('石块刚从水里拿出来，表面沾着水，这时称出的质量会<b>偏大</b>。应该先测质量、再测体积。'); }
            S.where = 'scale';
            const m = +(STONES[S.st].V * STONES[S.st].rho).toFixed(1);
            if (S.m != null) return ui.status(`石块的质量 m = ${S.m} g，已经记下了。`);
            ask('m', '读电子天平的示数：石块的质量 m = ?', m, [+(m / 10).toFixed(2), +(m + 1).toFixed(1)], 'g', '看电子天平显示的数字。', () => { S.m = m; W.goal.done('m'); ui.status(`m = ${m} g。把石块拿下来，<b>按住旁边那杯水</b>往量筒里倒入<b>适量</b>的水。`); });
        };
        act.readV1 = () => {
            if (S.where === 'in') return ui.status('石块已经在水里了。');
            const st = STONES[S.st];
            if (S.water < 2) return ui.status('先往量筒里倒水。');
            if (mlY(S.water + STONES[S.st].V) < 3 * sizeOf() + Y0 + 0.003) return ui.status('水太少了：放进石块后浸没不了它。再倒一些。');
            if (S.water + st.V > CAP) return ui.status(`水太多了：放进 ${st.V} cm³ 左右的石块后会超过量筒的量程 100 mL。倒掉一些。`);
            look([0, mlY(S.water), 0], [0, 0, 1], 0.07, () => back());
            S.water = Math.round(S.water);
            ask('v1', '视线与凹液面的<b>底部</b>相平。V₁ = ?', S.water, [S.water + 1, S.water - 1], 'mL', '看凹液面的最低处对着哪条刻度线（每小格 1 mL）。', () => { S.v1 = S.water; W.goal.done('v1'); back(); ui.status(`V₁ = ${S.water} mL。现在<b>把石块拖到量筒口</b>，用细线拴着慢慢放进去。`); });
        };
        act.lower = () => { if (S.m == null) { S.where = 'table'; return ui.status('先测出石块的质量（石块放进水里以后再称就沾水了）：把它拖到电子天平上。'); } if (S.v1 == null) { S.where = 'table'; return ui.status('先读出放石块之前水的体积 V₁：<b>点一下量筒的刻度</b>。'); } S.where = 'in'; S.y = H + 0.02; S.wet = true; ui.status('石块用细线拴着，慢慢放进水里……沉到底以后，<b>点量筒的刻度</b>读 V₂。'); };
        act.readV2 = () => {
            if (S.where !== 'in' || S.y > 1.5 * sizeOf() + Y0 + 0.002) return ui.status('等石块沉到量筒底部。');
            const v2 = Math.round(S.level);
            look([0, mlY(v2), 0], [0, 0, 1], 0.07, () => back());
            ask('v2', '石块浸没后液面升高了。V₂ = ?', v2, [v2 + 1, v2 - 1], 'mL', '看凹液面的最低处（每小格 1 mL）。', () => {
              S.v2 = v2; back();
              const V = v2 - S.v1;
              ask('rho', `V = V₂ − V₁ = ${v2} − ${S.v1} = ${V} cm³。石块的密度 ρ = ?`, +(S.m / V).toFixed(1), [+(S.m / v2).toFixed(1), +(V / S.m).toFixed(2)], 'g/cm³', 'ρ = m / V，V 是 V₂ − V₁，不是 V₂。', () => {
                const rho = +(S.m / V).toFixed(1);
                S.rows.push(S.st);
                tb.add([STONES[S.st].label, S.m.toFixed(1), String(S.v1), String(v2), String(V), rho.toFixed(1)]);
                W.goal.done('rho');
                ui.status(`小石块的密度约 ${rho} g/cm³ = ${(rho * 1000).toFixed(0)} kg/m³。`);
              });
            });
        };
        const sw = slider('量筒里的水', { min: 0, max: 90, value: 0, fmt: (v) => (v ? '倒了一些' : '空的'), onInput: (v) => { if (S.where === 'in') { sw.set(Math.round(S.water)); return ui.status('石块已经放进去了。要重新倒水，先把石块提出来。'); } S.water = v; S.v1 = null; choices.el.hidden = true; } });
        S.syncW = () => sw.set(Math.round(S.water));
        const acts = buttons([
          { text: '① 放到电子天平上称', ghost: true, onClick: () => { S.where = 'scale'; act.weigh(); } },
          { text: '② 读 V₁', ghost: true, onClick: () => act.readV1() },
          { text: '③ 放入水中', ghost: true, onClick: () => act.lower() },
          { text: '④ 读 V₂', ghost: true, onClick: () => act.readV2() },
          { text: '提出石块', ghost: true, onClick: () => { if (S.where === 'in') { S.where = 'table'; ui.status('石块提出来了，表面沾着水。'); } } },
        ]);
        ui.controls.append(acts.el, sw.el);
        ui.controls.append(note('也可以直接动手：<b>拖石块</b>到电子天平上称质量；<b>按住那杯水</b>往量筒里倒水（按住量筒能倒出来一些）；<b>点量筒的刻度</b>读体积；<b>把石块拖到量筒口</b>放进水里，拖出来就提起。量筒每小格 1 mL（1 mL = 1 cm³）。'), bStone.el, choices.el);
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['m', '测出石块的质量 m'], ['v1', '倒入适量的水，读出 V₁'], ['rho', '放入石块读出 V₂，算出密度']]) };
        ui.status('先称出石块的质量：<b>把石块拖到电子天平上</b>。');
      },
      update(dt) {
        // 倒水：杯子侧过来、水柱落进量筒；量筒里的水每秒涨约 12 mL
        S.tilt += ((S.pour ? 1 : 0) - S.tilt) * Math.min(1, dt * 8);
        jug.position.set(JUG.x + S.tilt * 0.05, S.tilt * (H - 0.02), JUG.z + S.tilt * 0.02);
        jug.rotation.z = -S.tilt * 1.6;
        stream.visible = !!S.pour && S.tilt > 0.8;
        if (stream.visible) { stream.position.set(0.0, H + 0.01, 0); stream.scale.y = H + 0.01 - mlY(S.water); S.water = Math.min(CAP + 3, S.water + dt * 12); }
        cyl.rotation.z = S.pourOut ? Math.min(0.5, (cyl.rotation.z || 0) + dt * 2) : Math.max(0, (cyl.rotation.z || 0) - dt * 3);
        if (S.pourOut && cyl.rotation.z > 0.4) S.water = Math.max(0, S.water - dt * 10);
        if (S.pour || S.pourOut) S.syncW?.();
        if ((S.pour || S.pourOut) && W) W.status(`量筒里大约 ${Math.round(S.water)} mL 水（估计）。适量：要能浸没石块，放入石块后又不超过 100 mL。松手，再点刻度凑近读。`);
        if (S.where === 'in') { const r = sizeOf(); const bottom = Y0 + r * 1.5 + 0.001; S.y = Math.max(bottom, S.y - dt * 0.05); }
        layout();
      },
      debug: { S, stone, jug, plate, glass },
    };
  },
};
