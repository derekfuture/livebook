// 图9.2-2 / 9.2-3 探究液体压强与哪些因素有关。U 形管压强计：探头（蒙橡皮膜的金属盒）用软管连到 U 形管左管；
// 探头受到的压强越大，U 形管两边液面的高度差越大。
//   1 同一深度，改变探头方向（膜朝上 / 朝侧面 / 朝下）  2 增大深度  3 换用酒精、盐水
// 物理：p = ρgh；U 形管里是红色的水，高度差 Δh = ρ液 h / ρ水（忽略管内空气的压缩）。用手指按橡皮膜可以检查装置是否漏气。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, guard } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { beaker, canvasTex, stand } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const LIQ = [{ label: '水', rho: 1.0, color: 0x9fd3ec }, { label: '酒精', rho: 0.8, color: 0xd8ecf2 }, { label: '盐水', rho: 1.2, color: 0x8cc6e0 }];
const BX = -0.08, BR = 0.05, BH = 0.16, LV = 0.13;      // 烧杯、液面高度
const UX = 0.085, UG = 0.034, U0 = 0.16, UH = 0.24;       // U 形管：中心、两管间距、静止液面、管顶高度
const CM = 0.01;                                          // 1 cm（场景里按真实尺寸）

export default {
  id: 'liquidpressure',
  fig: '图9.2-2',
  title: '探究液体压强与哪些因素有关',
  stampText: '探究',
  predict: {
    q: '探头在水中的深度不变，把橡皮膜从朝上转到朝侧面、朝下。<br>U 形管两边液面的高度差会——',
    hint: '课本第 46 页「实验」图9.2-3',
    options: ['朝下时最大', '朝上时最大', '不变'],
    answer: 2,
  },
  conclusion: {
    page: 51, rect: [62, 50, 360, 158],       // 课本第 47 页
    quote: '在液体内部的同一深度，向各个方向的压强都相等；深度越大，压强越大；液体内部压强的大小还与液体的密度有关，在深度相同时，液体的密度越大，压强越大。',
    formula: '<i>p</i> = <i>ρgh</i>',
    why: '探头上的橡皮膜受到液体的压强，膜向里凹，把软管里的空气压向 U 形管，左管液面下降、右管上升；两边液面的高度差越大，表示探头处的压强越大。同一深度转动探头，高度差不变；探头越深，高度差越大；深度相同时，盐水中的高度差比水大，酒精中的比水小。“深度”是从液面往下量的竖直距离。',
    src: '课本第 45–47 页 · 第九章 第2节 液体的压强',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const bk = beaker({ r: BR, h: BH, level: LV, spout: false });
    bk.position.set(BX, 0, 0);
    group.add(bk);
    // U 形管（玻璃）+ 刻度板 + 支架
    const st = stand({ height: 0.3, baseW: 0.1, baseD: 0.07 });
    st.position.set(UX + 0.075 - st.rodX, 0, -0.04);
    group.add(st);
    const glass = paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.35, depthWrite: false });
    const tubeR = 0.0045, bottom = 0.06;
    const ucurve = new THREE.CurvePath();
    ucurve.add(new THREE.LineCurve3(new THREE.Vector3(-UG / 2, UH, 0), new THREE.Vector3(-UG / 2, bottom, 0)));
    ucurve.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-UG / 2, bottom, 0), new THREE.Vector3(0, bottom - UG * 0.9, 0), new THREE.Vector3(UG / 2, bottom, 0)));
    ucurve.add(new THREE.LineCurve3(new THREE.Vector3(UG / 2, bottom, 0), new THREE.Vector3(UG / 2, UH, 0)));
    const utube = new THREE.Mesh(new THREE.TubeGeometry(ucurve, 80, tubeR, 10, false), glass);
    const U = new THREE.Group();
    U.position.set(UX, 0, 0);
    U.add(utube);
    // 刻度板：0 在静止液面，上下各 10 cm
    const scaleTex = canvasTex(160, 1200, (c, w, h) => {
      c.fillStyle = '#f7f3e6'; c.fillRect(0, 0, w, h);
      const px = h / (UH - bottom + 0.02), y0 = (UH + 0.01 - U0) * px;
      c.strokeStyle = '#23293a'; c.fillStyle = '#23293a'; c.textAlign = 'center'; c.font = 'bold 34px sans-serif';
      for (let mm = -100; mm <= 80; mm += 5) {
        const y = y0 - mm * 0.001 * px, major = mm % 10 === 0;
        c.lineWidth = major ? 3 : 1.5;
        c.beginPath(); c.moveTo(w / 2 - (major ? 30 : 16), y); c.lineTo(w / 2 + (major ? 30 : 16), y); c.stroke();
        if (major && mm % 20 === 0) c.fillText(String(Math.abs(mm / 10)), w / 2, y - 6);
      }
    });
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(UG - 2 * tubeR - 0.002, UH - bottom + 0.02, 0.004), [paint(0xe8e2cf), paint(0xe8e2cf), paint(0xe8e2cf), paint(0xe8e2cf), new THREE.MeshBasicMaterial({ map: scaleTex }), paint(0xe8e2cf)]), { width: 1 });
    plate.position.set(0, (UH + bottom - 0.02) / 2 + 0.01, -0.002);
    U.add(plate);
    const back = inked(new THREE.Mesh(new THREE.BoxGeometry(UG + 0.03, UH - 0.02, 0.006), paint(0xc8b896)), { width: 1.1 });
    back.position.set(0, UH / 2 + 0.02, -0.012);
    U.add(back);
    // 红色的水柱：两根竖直圆柱 + 底部弯管（弯管一直是满的）
    const red = paint(0xd9483b);
    const bend = new THREE.Mesh(new THREE.TubeGeometry(ucurve.curves[1], 30, tubeR * 0.8, 8, false), red);
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(tubeR * 0.8, tubeR * 0.8, 1, 12), red);
    const colR = colL.clone();
    colL.geometry.translate(0, 0.5, 0);
    colL.position.set(-UG / 2, bottom, 0); colR.position.set(UG / 2, bottom, 0);
    U.add(bend, colL, colR);
    group.add(U);
    // 探头：金属盒 + 橡皮膜，挂在一根细杆上；软管从探头连到 U 形管左管顶
    const probe = new THREE.Group();
    const cupG = new THREE.Group();
    const cup = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 24), paint(0xc8cdd4)), 0.001);
    const film = new THREE.Mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.0012, 24), paint(0xe0503e));
    film.position.y = -0.0046;
    cupG.add(cup, film);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.016, 8), paint(0x8f99a8));
    arm.rotation.z = Math.PI / 2; arm.position.x = 0.016;
    probe.add(cupG, arm);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 8), paint(0x8f99a8));
    rod.geometry.translate(0, 0.5, 0);
    group.add(probe, rod);
    const hoseMat = paint(0xd99a3c);
    const hose = new THREE.Mesh(new THREE.BufferGeometry(), hoseMat);
    group.add(hose);
    const dTag = tag('', 'pill'), hTag = tag('', 'pill');

    const S = { liq: 0, dir: 'up', depth: 0.05, press: 0, dh: 0, rows: [], checked: false };
    let W = null, ask = () => {};
    const dhTarget = () => (S.depth > 0 ? LIQ[S.liq].rho * S.depth : 0) + S.press;    // 米（红水柱高度差）
    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.pick = true;
    group.add(pick);
    const pointer = draggable(group, [{ obj: pick, plane: 'xy', offset: 0, onDrag: (p) => { S.depth = clamp(LV - p.y, -0.03, 0.1); } }]);

    let lastKey = '';
    const layout = () => {
      const py = LV - S.depth, px = BX;
      probe.position.set(px, py, 0);
      cupG.rotation.set(0, 0, S.dir === 'up' ? Math.PI : S.dir === 'down' ? 0 : -Math.PI / 2);
      rod.position.set(px + 0.024, py, 0); rod.scale.y = 0.24 - py;
      film.material.color.setHex(S.depth > 0.002 || S.press ? 0xd9483b : 0xe0503e);
      film.scale.set(1, 1 + S.dh * 10, 1);
      // U 形管液面：左降右升各一半
      const hl = U0 - S.dh / 2, hr = U0 + S.dh / 2;
      colL.scale.y = hl - bottom; colR.scale.y = hr - bottom;
      // 软管：探头 → 杆旁边上去 → 弯到 U 形管左管顶
      const key = `${px.toFixed(3)}|${py.toFixed(4)}`;
      if (key !== lastKey) {
        lastKey = key;
        const a = new THREE.Vector3(px + 0.03, py, 0), top = new THREE.Vector3(UX - UG / 2, UH, 0);
        const c = new THREE.CatmullRomCurve3([a, new THREE.Vector3(px + 0.03, py + 0.04, 0.004), new THREE.Vector3(px + 0.03, 0.22, 0.006), new THREE.Vector3((px + UX) / 2 + 0.02, 0.29, 0.006), new THREE.Vector3(top.x, UH + 0.03, 0), top]);
        hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(c, 60, 0.0028, 8, false);
      }
      pick.position.set(px, py, 0);
      dTag.loc(group, BX - BR - 0.03, py, 0).text(S.depth > 0 ? `深度 ${(S.depth * 100).toFixed(1)} cm` : '探头在液面上方');
      hTag.loc(group, UX + UG / 2 + 0.03, U0 + 0.105, 0).text('U 形管压强计');
    };
    layout();

    return {
      group,
      size: { w: 0.3, d: 0.12, h: 0.3 },
      view: { elev: 8, azim: 0, lookY: 0.5, margin: 1.12 },
      pointer,
      mount(ui) {
        const liq = seg('容器里的液体', LIQ.map((l) => l.label), (_, k) => { S.liq = k; bk.setColor(LIQ[k].color, k === 1 ? 0.4 : 0.55); });
        const dir = seg('橡皮膜朝', ['上', '侧面', '下'], (_, k) => { S.dir = ['up', 'side', 'down'][k]; });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${S.liq}|${S.dir}|${Math.round(S.depth * 200)}`, () => { cur = null; ui.status("探头的位置、方向或液体变了，刚才那道读数题作废。"); });     // 条件变了，待答的题作废
        const tb = table(['液体', '深度 h/cm', '橡皮膜朝', '高度差 Δh/cm']);
        let cur = null;
        ask = () => {
          if (!S.checked) return ui.status('实验前先检查装置：用手指按一按橡皮膜，看 U 形管两边的液面会不会变化（会变化说明不漏气）。');
          if (S.depth <= 0.002) return ui.status('先把探头放进液体里——拖动探头上下移动。');
          const dcm = Math.round(S.depth * 200) / 2;        // 深度取到 0.5 cm
          S.depth = dcm / 100;
          const v = Math.round(LIQ[S.liq].rho * dcm * 2) / 2;
          const opts = [v, +(v / 2).toFixed(1), +(v + 1).toFixed(1)].sort(() => Math.random() - 0.5);
          cur = { v, opts, dcm };
          choices.btns.forEach((b, j) => (b.textContent = `${opts[j].toFixed(1)} cm`));
          choices.el.hidden = false; S.guard?.arm();
          ui.status('读 U 形管两边液面的<b>高度差</b>（左边低于 0 的格数 + 右边高于 0 的格数，每小格 0.5 cm）：');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.v) return ui.status('高度差是两边液面之差：左边降了多少，加上右边升了多少。');
          choices.el.hidden = true;
          const row = { liq: S.liq, d: cur.dcm, dir: S.dir, dh: cur.v };
          S.rows.push(row);
          tb.add([LIQ[S.liq].label, cur.dcm.toFixed(1), { up: '上', side: '侧面', down: '下' }[S.dir], cur.v.toFixed(1)]);
          const R = S.rows;
          if (new Set(R.filter((r) => r.liq === 0 && r.d === cur.dcm).map((r) => r.dir)).size >= 3) W.goal.done('dir');
          if (new Set(R.filter((r) => r.liq === 0 && r.dir === S.dir).map((r) => r.d)).size >= 2) W.goal.done('depth');
          if (new Set(R.filter((r) => r.d === cur.dcm && r.dir === S.dir).map((r) => r.liq)).size >= 2) W.goal.done('rho');
          ui.status(`记下了：${LIQ[S.liq].label}中，深度 ${cur.dcm.toFixed(1)} cm，膜朝${{ up: '上', side: '侧面', down: '下' }[S.dir]}，高度差 ${cur.v.toFixed(1)} cm。`);
          cur = null;
        };
        const btns = buttons([
          { text: '用手指按一按橡皮膜', ghost: true, onClick: () => { if (S.depth > 0.002) return ui.status('把探头提出液面再检查。'); S.press = 0.04; S.checked = true; setTimeout(() => (S.press = 0), 900); W.goal.done('check'); ui.status('一按，左管液面下降、右管上升；松开又回到原位——装置不漏气，可以开始实验了。'); } },
          { text: '读数并记录…', onClick: () => ask() },
        ]);
        ui.controls.append(btns.el, liq.el, dir.el, choices.el, note('<b>上下拖动探头</b>改变它在液体中的深度。深度从液面往下量。'));
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['check', '实验前检查装置是否漏气'], ['dir', '在水中同一深度，橡皮膜朝上、朝侧面、朝下各测一次'], ['depth', '在水中改变探头的深度'], ['rho', '同一深度，换用密度不同的液体']]) };
        S.depth = -0.02;
        ui.status('探头还在液面上方。先用手指按一按橡皮膜，检查装置是否漏气。');
      },
      update(dt) { S.guard?.check();
        S.dh += (dhTarget() - S.dh) * Math.min(1, dt * 6);
        layout();
      },
      debug: { S },
    };
  },
};
