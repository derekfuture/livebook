// 图1.3-3 汽车行驶示意图：甲车每 10 s 通过 150 m（匀速直线运动），乙车在相同时间内通过的路程越来越大（变速直线运动）。
import * as THREE from 'three';
import { buttons, readout, table, chart, goals, note, seg } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

// 课本图中的数据：0、10、20、30、40 s 时的位置（m）
const DATA = { a: [0, 150, 300, 450, 600], b: [0, 100, 235, 400, 600] };
const M = 0.5 / 600;   // 每米对应的模型长度

const posAt = (arr, t) => {
  if (t >= 40) return arr[4];
  const i = Math.floor(t / 10), k = (t - i * 10) / 10;
  // 乙车用平滑插值（速度连续变化），甲车线性
  if (arr === DATA.a) return arr[i] + (arr[i + 1] - arr[i]) * k;
  const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(4, i + 2)];
  const k2 = k * k, k3 = k2 * k;
  return 0.5 * ((2 * p1) + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k2 + (-p0 + 3 * p1 - 3 * p2 + p3) * k3);
};

export default {
  id: 'speed',
  fig: '图1.3-3',
  title: '匀速直线运动和变速直线运动',
  predict: {
    q: '甲、乙两辆汽车同时出发，40 s 内都行驶了 600 m。<br>它们在这 40 s 内的运动快慢一样吗？',
    hint: '课本第 22 页「想想议议」',
    options: ['完全一样，速度一直相等', '平均速度相等，但乙车的速度在变', '乙车一直比甲车快'],
    answer: 1,
  },
  conclusion: {
    quote: '我们把物体沿着直线且速度不变的运动，叫作匀速直线运动。',
    why: '甲车在相等的时间内通过的路程相等，做匀速直线运动，速度 <i>v</i> = <i>s</i>/<i>t</i> = 15 m/s。乙车在相等的时间内通过的路程不相等，速度越来越大，做<b>变速直线运动</b>。对变速运动，用 <i>v</i> = <i>s</i>/<i>t</i> 算出来的是<b>平均速度</b>，乙车 40 s 内的平均速度也是 15 m/s，但它在每一段的平均速度并不一样。',
    src: '课本第 21–23 页 · 第一章 第3节 运动的快慢',
  },

  create({ tag }) {
    const group = new THREE.Group();
    group.position.x = -0.25;
    const root = new THREE.Group();
    root.add(group);
    const roadTex = canvasTex(1024, 64, (g, W, H) => {
      g.fillStyle = '#7a7f8a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2f2f2';
      for (let x = 0; x < W; x += 48) g.fillRect(x, H / 2 - 2, 26, 4);
    });
    const road = (z) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.003, 0.05), new THREE.MeshLambertMaterial({ map: roadTex }));
      r.position.set(0.25, 0.0015, z);
      group.add(r);
    };
    road(-0.04); road(0.05);
    // 每 150 m 一个里程标
    for (let m = 0; m <= 600; m += 150) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.02, 0.002), paint(0x2c313c));
      p.position.set(m * M, 0.01, 0.085);
      group.add(p);
      const t = tag(`${m} m`, 'pill'); t.loc(group, m * M, 0.03, 0.09);
    }
    const car = (color) => {
      const g = new THREE.Group();
      const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.02), paint(color)));
      b.position.y = 0.011;
      const cab = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.009, 0.018), paint(0xeaf2f8)));
      cab.position.set(-0.002, 0.021, 0);
      g.add(b, cab);
      for (const [x, z] of [[-0.013, 0.011], [0.013, 0.011], [-0.013, -0.011], [0.013, -0.011]]) {
        const w = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 14), paint(0x23262e)), 0.001);
        w.rotation.x = Math.PI / 2; w.position.set(x, 0.005, z);
        g.add(w);
      }
      return g;
    };
    const A = car(0xd9483b), B = car(0x2f7fd8);
    A.position.z = -0.04; B.position.z = 0.05;
    group.add(A, B);
    const ghosts = [], ghostTags = [];
    const tA = tag('甲', 'pill'), tB = tag('乙', 'pill'), tT = tag('', 'pill big');
    tT.loc(group, 0.25, 0.09, 0);

    const S = { t: 0, play: false, shot: -1, rows: 0 };
    let G = null;
    const snap = (k) => {
      for (const [c, z] of [[A, -0.04], [B, 0.05]]) {
        const gh = c.clone();
        gh.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; } });
        gh.position.copy(c.position);
        group.add(gh);
        ghosts.push(gh);
        void z;
      }
      const t = k * 10;
      ghostTags.push(tag(`${t} s`, 'pill').loc(group, posAt(DATA.a, t) * M, 0.05, -0.065));
    };

    const layout = () => {
      A.position.x = posAt(DATA.a, S.t) * M;
      B.position.x = posAt(DATA.b, S.t) * M;
      tA.loc(group, A.position.x, 0.04, -0.04);
      tB.loc(group, B.position.x, 0.04, 0.05);
      tT.text(`时间 ${S.t.toFixed(1)} s`);
      if (G) {
        const va = 15;
        const dt = 0.2, vb = (posAt(DATA.b, Math.min(40, S.t + dt)) - posAt(DATA.b, Math.max(0, S.t - dt))) / (Math.min(40, S.t + dt) - Math.max(0, S.t - dt));
        G.out.set('va', S.t < 40 ? va : 0, 1); G.out.set('vb', S.t < 40 ? vb : 0, 1);
        G.out.set('sa', posAt(DATA.a, S.t), 0); G.out.set('sb', posAt(DATA.b, S.t), 0);
      }
    };
    layout();

    return {
      group: root,
      size: { w: 0.6, d: 0.2, h: 0.1 },
      view: { elev: 36, azim: 0, lookY: 0.2, margin: 1.04 },
      mount(ui) {
        const out = readout([{ key: 'sa', label: '甲车行驶的路程', unit: 'm' }, { key: 'sb', label: '乙车行驶的路程', unit: 'm' }, { key: 'va', label: '甲车此刻的速度', unit: 'm/s' }, { key: 'vb', label: '乙车此刻的速度', unit: 'm/s' }]);
        const btn = buttons([{ text: '▶ 出发', onClick: () => { if (S.t >= 40) { reset(); } S.play = true; } }, { text: '↺ 重来', ghost: true, onClick: () => reset() }]);
        const reset = () => { S.t = 0; S.shot = -1; S.play = false; for (const g of ghosts) group.remove(g); ghosts.length = 0; for (const t of ghostTags) t.remove(); ghostTags.length = 0; tb.clear(); ch.series[0].points = [[0, 0]]; ch.series[1].points = [[0, 0]]; ch.draw(); layout(); };
        const tb = table(['时间段', '甲车路程/m', '乙车路程/m', '甲车平均速度', '乙车平均速度']);
        const ch = chart({ x: { label: 't/s', min: 0, max: 40 }, y: { label: 's/m', min: 0, max: 600 }, series: [{ color: '#d9483b', points: [[0, 0]], dots: true }, { color: '#2f7fd8', points: [[0, 0]], dots: true }], legend: '红：甲车　蓝：乙车' });
        const whole = buttons([{ text: '算一算：40 s 内的平均速度', ghost: true, onClick: () => {
          if (S.t < 40) return ui.status('等两辆车都跑完 40 s。');
          ui.status('甲车：<i>v</i> = 600 m ÷ 40 s = <b>15 m/s</b>；乙车：<i>v</i> = 600 m ÷ 40 s = <b>15 m/s</b>。平均速度相等，但乙车每一段的速度不同。');
          G.goal.done('avg');
        } }]);
        ui.controls.append(btn.el, out.el, whole.el, note('每过 10 s，路上会留下两辆车的位置（像课本里的图）。'));
        ui.data.append(ch.el, tb.el);
        G = {
          out, tb, ch,
          goal: goals(ui, [['run', '让两辆车跑完 40 s'], ['avg', '算出它们 40 s 内的平均速度']]),
        };
        ui.status('点“出发”，比较两辆车在每个 10 s 内通过的路程。');
        this._G = G;
      },
      update(dt) {
        if (!S.play) return;
        S.t = Math.min(40, S.t + dt * 4);       // 4 倍速
        const k = Math.floor(S.t / 10 + 1e-6);
        if (k > S.shot) {
          for (let i = S.shot + 1; i <= k; i++) {
            snap(i);
            if (i > 0 && this._G) {
              const da = DATA.a[i] - DATA.a[i - 1], db = DATA.b[i] - DATA.b[i - 1];
              this._G.tb.add([`${(i - 1) * 10}~${i * 10} s`, da, db, `${(da / 10).toFixed(1)} m/s`, `${(db / 10).toFixed(1)} m/s`]);
              this._G.ch.series[0].points.push([i * 10, DATA.a[i]]);
              this._G.ch.series[1].points.push([i * 10, DATA.b[i]]);
              this._G.ch.draw();
            }
          }
          S.shot = k;
        }
        if (S.t >= 40) { S.play = false; this._G?.goal.done('run'); }
        layout();
      },
    };
  },
};
