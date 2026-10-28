// 图1.1-4 / 1.1-5 用刻度尺测量长度：零刻度线对准物体一端、刻度线紧靠被测物体、视线正对刻度线，估读到分度值的下一位。
import * as THREE from 'three';
import { seg, readout, buttons, table, goals, note, h } from './kit/ui.js';
import { rulerMesh, woodBlock } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, polyline } from '../live/ink.js';

const THICK = 0.006;     // 刻度尺很厚（木尺），斜着看会有明显的读数偏差

export default {
  id: 'ruler',
  fig: '图1.1-5',
  title: '用刻度尺测量长度',
  predict: {
    q: '用分度值是 1 mm 的刻度尺测一块橡皮的长度，<br>下面哪个记录是正确的？',
    hint: '课本第 13 页「实验」',
    options: ['3.4 cm', '3.46 cm', '3.4600 cm'],
    answer: 1,
  },
  conclusion: {
    quote: '使用任何一种测量工具时，都要首先了解它测量的范围和分度值。',
    why: '正确使用刻度尺：零刻度线对准被测物体的一端，有刻度线的一边要紧靠被测物体且与被测边保持平行，不能歪斜；读数时视线要正对刻度线；要估读到分度值的下一位；记录结果要写出数值和单位。测量值和真实值之间总会有差别，这就是<b>误差</b>。我们不能消除误差，但多次测量求平均值、选用精密的测量工具、改进测量方法，都可以减小误差。',
    src: '课本第 12–14 页 · 第一章 第1节 长度和时间的测量',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const L = 0.0346 + Math.round(Math.random() * 8) * 0.0001;   // 橡皮的真实长度（每次略有不同）
    const eraser = woodBlock(L, 0.012, 0.022, { color: 0xffb3b3 });
    eraser.material = paint(0xf6a3a8);
    eraser.position.set(0, 0.006, 0);
    group.add(eraser);
    const ruler = rulerMesh({ length: 0.16, width: 0.028, thick: THICK, divisions: 150, every: 10, labelEvery: 10 });
    group.add(ruler);
    // 眼睛
    const eye = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.006, 16, 12), paint(0xffffff));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.003, 12, 8), paint(0x22252e));
    pupil.position.y = -0.005;
    eye.add(ball, pupil);
    group.add(eye);
    const sight = new THREE.Group();
    group.add(sight);
    const tA = tag('', 'pill');

    const S = { offset: 0.035, eyeAng: 0, tilt: false, reads: [], aligned: false };
    let G = null;
    // 尺的局部：x = −0.075 处是 0 刻度（刻度从左端 8/4096 处开始，近似）
    const zeroX = () => ruler.position.x - 0.08 + 0.16 * (8 / 4096);

    const reading = () => {
      // 物体右端对着的刻度（cm）；斜着看时，因为尺有厚度，读数偏差 = 厚度 × tan(视线偏角)
      const left = -L / 2, right = L / 2;
      const parallax = THICK * Math.tan(S.eyeAng * Math.PI / 180) * 1.0;
      const start = (left - zeroX()) * 100, end = (right - zeroX() + parallax) * 100;
      return { start, end, len: end - start };
    };

    const layout = () => {
      ruler.position.set(S.offset, THICK / 2, 0.026);
      ruler.rotation.y = S.tilt ? -0.12 : 0;
      if (Math.abs((-L / 2 - zeroX()) * 100) < 0.03) S.offset += (-L / 2 - zeroX());
      const rd = reading();
      S.aligned = Math.abs(rd.start) < 0.03 && !S.tilt;
      eye.position.set(L / 2 + Math.tan(S.eyeAng * Math.PI / 180) * 0.09, 0.1, 0.03);
      sight.clear();
      sight.add(polyline([eye.position.clone(), new THREE.Vector3(L / 2 + Math.tan(S.eyeAng * Math.PI / 180) * -0.0, THICK, 0.02)], { dashed: true, color: 0x2f7fd8, width: 1.4, dash: 0.006, gap: 0.004 }));
      tA.loc(group, L / 2, 0.035, 0.05).text(S.eyeAng ? '视线斜了' : '视线正对刻度线');
      if (G) {
        G.zoom(rd);
        G.out.set('s', S.aligned ? '0 刻度线对准一端 ✓' : S.tilt ? '刻度尺歪斜了' : `左端对着 ${rd.start.toFixed(2)} cm`);
      }
    };
    layout();

    const pointer = draggable(group, [{ obj: ruler, plane: 'xz', offset: 0, onDrag: (p, st) => { S.offset = clamp(p.x + (S._grab ?? 0), -0.02, 0.09); layout(); }, onStart: (p) => { S._grab = S.offset - p.x; } }]);

    return {
      group,
      size: { w: 0.2, d: 0.1, h: 0.1 },
      view: { elev: 52, azim: 0, lookY: 0.05, lookZ: 0.01, margin: 1.1 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 's', label: '刻度尺放置', span: true }]);
        const eyeSel = seg('眼睛从哪里看', ['斜向左看', '正对刻度线', '斜向右看'], (_, k) => { S.eyeAng = [-40, 0, 40][k]; layout(); if (k !== 1) G.goal.done('parallax'); }, { value: 1 });
        const tilt = seg('刻度尺', ['与被测边平行', '歪斜着放'], (_, k) => { S.tilt = k === 1; layout(); });
        const zc = h('canvas', { class: 'chart', width: 680, height: 260 });
        zc.style.height = '130px';
        const choices = seg('记录这次的结果', ['', '', '', ''], (_, k) => answer(k));
        const tb = table(['次数', '记录', '说明']);
        let opts = [];
        const makeOpts = () => {
          const v = Math.round(reading().len * 100) / 100;
          opts = [{ t: `${v.toFixed(1)} cm`, ok: false, why: '没有估读到分度值的下一位' }, { t: `${v.toFixed(2)} cm`, ok: true, why: '正确：准确值 + 一位估读值 + 单位' }, { t: `${v.toFixed(2)}`, ok: false, why: '没有写单位' }, { t: `${(v * 10).toFixed(1)} mm`, ok: true, why: '正确（换成毫米表示）' }];
          choices.el.querySelectorAll('button').forEach((b, i) => { b.textContent = opts[i].t; b.classList.remove('on'); });
        };
        const answer = (k) => {
          const o = opts[k];
          if (!S.aligned) return ui.status('先把刻度尺的零刻度线对准橡皮的左端，刻度线紧靠橡皮且与被测边平行（拖动刻度尺）。');
          if (S.eyeAng !== 0) return ui.status('读数时视线要正对刻度线，换成“正对刻度线”再读。');
          if (!o.ok) { ui.status(`不对：${o.why}。`); return; }
          S.reads.push(reading().len);
          tb.add([S.reads.length, o.t, o.why]);
          G.goal.done('read');
          if (S.reads.length >= 3) {
            const avg = S.reads.reduce((a, b) => a + b, 0) / S.reads.length;
            G.goal.done('avg');
            ui.status(`三次测量的平均值约为 <b>${avg.toFixed(2)} cm</b>。多次测量求平均值可以减小误差。`);
          } else ui.status(`记好了。把刻度尺挪开再放回去，重新测一次（第 ${S.reads.length + 1} 次）。`);
          S.offset = 0.03 + Math.random() * 0.02; layout(); makeOpts();
        };
        ui.controls.append(note('拖动刻度尺，让零刻度线对准橡皮的左端。下面是右端附近放大的样子。'), zc, out.el, eyeSel.el, tilt.el, choices.el);
        ui.data.append(tb.el);
        G = {
          out,
          goal: goals(ui, [['read', '正确读出并记录一次'], ['parallax', '试试斜着看，读数会怎样'], ['avg', '测 3 次，求平均值']]),
          zoom: (rd) => {
            const g = zc.getContext('2d'), W = 680, H = 260;
            g.fillStyle = '#f5f1e6'; g.fillRect(0, 0, W, H);
            // 以物体右端附近 ±6 mm 放大
            const center = rd.end, px = 48;    // 每毫米 48 像素
            const x0 = W / 2 - center * 10 * px;
            const trueEnd = (L / 2 - zeroX()) * 100;
            const edgeX = W / 2 + (trueEnd - center) * 10 * px;
            g.fillStyle = '#f6a3a8'; g.fillRect(0, 150, edgeX, 90);
            g.strokeStyle = '#b8606a'; g.lineWidth = 2; g.strokeRect(-2, 150, edgeX + 2, 90);
            g.strokeStyle = '#1d2433'; g.fillStyle = '#1d2433'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
            for (let mm = Math.floor(center * 10) - 8; mm <= Math.ceil(center * 10) + 8; mm++) {
              const x = x0 + mm * px;
              const major = mm % 10 === 0, half = mm % 5 === 0;
              g.lineWidth = major ? 4 : 2.5;
              g.beginPath(); g.moveTo(x, 0); g.lineTo(x, major ? 70 : half ? 52 : 36); g.stroke();
              if (major) g.fillText(String(mm / 10), x, 108);
            }
            g.textAlign = 'left'; g.font = '22px sans-serif'; g.fillStyle = '#6b6252';
            g.fillText('cm', W - 50, 108);
            g.fillStyle = '#2f7fd8'; g.fillRect(W / 2 - 1.5, 0, 3, H);
            g.fillStyle = '#2f7fd8'; g.font = '22px sans-serif'; g.fillText(S.eyeAng ? '斜着看到的位置' : '橡皮右端', W / 2 + 8, H - 12);
          },
        };
        makeOpts();
        ui.status('刻度尺的分度值是 1 mm。先拖动刻度尺，让零刻度线对准橡皮左端。');
        layout();
      },
    };
  },
};
