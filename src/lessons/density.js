// 图6.2-2 质量与体积的关系图像 · 探究同种物质的质量与体积的关系。
// 桌上有大小不同的铝块，还有铁块、木块。点一块放到电子秤上称质量；用刻度尺量出长、宽、高，自己算体积；
// 把 m、V 描到 m–V 图上：同种物质的点在一条过原点的直线上，不同物质的直线倾斜程度不同（质量与体积之比——密度——不同）。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, chart, guard } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { paint, inked } from '../live/ink.js';

const MAT = {
  al: { label: '铝块', rho: 2.7, color: 0xc9ced6, line: '#7a8494' },
  fe: { label: '铁块', rho: 7.9, color: 0x6b7280, line: '#2b2f3a' },
  wood: { label: '木块', rho: 0.5, color: 0xd9b07a, line: '#c0813a' },
};
const BLOCKS = [
  ['al', 1, 2, 2], ['al', 2, 2, 2], ['al', 2, 2, 3], ['al', 2, 3, 3], ['al', 2, 2, 5],
  ['fe', 1, 1, 2], ['fe', 1, 2, 2], ['fe', 2, 2, 2],
  ['wood', 2, 3, 3], ['wood', 3, 3, 3], ['wood', 2, 2, 5],
];
const CM = 0.01;
const SCALE = new THREE.Vector3(0.16, 0, 0.02);

export default {
  id: 'density',
  fig: '图6.2-2',
  title: '探究同种物质的质量与体积的关系',
  stampText: '探究',
  predict: {
    q: '一个铝块的体积是另一个铝块的 2 倍。<br>它的质量——',
    hint: '课本第 144–145 页「实验」',
    options: ['也是 2 倍', '比 2 倍多', '比 2 倍少'],
    answer: 0,
  },
  conclusion: {
    page: 151, rect: [62, 508, 362, 652],          // 课本第 145 页
    quote: '同种物质的质量与体积之比是一定的，物质不同，这个比值一般也不同。在物理学中，某种物质组成的物体的质量与它的体积之比叫作这种物质的密度。',
    formula: '<i>ρ</i> = <i>m</i> / <i>V</i>',
    why: '铝块的 m–V 图像是一条过原点的直线：质量与体积成正比，比值 m/V 约为 2.7 g/cm³，和铝块的大小无关。铁块的直线更陡（7.9 g/cm³），木块的更平（约 0.5 g/cm³）。所以质量与体积之比反映了物质本身的一种特性——密度。',
    src: '课本第 144–145 页 · 第六章 第2节 密度',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 电子秤
    const scale = new THREE.Group();
    scale.position.copy(SCALE);
    const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.1), paint(0xe9edf2)), { width: 1.2 });
    body.position.y = 0.01;
    const pan = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.07), paint(0xc8cdd4)), { width: 1 });
    pan.position.set(0, 0.022, -0.008);
    const lcdTex = canvasTex(256, 80, () => {});
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.0185), new THREE.MeshBasicMaterial({ map: lcdTex }));
    lcd.rotation.x = -Math.PI / 2; lcd.position.set(0, 0.0205, 0.038);     // 显示屏在秤面前沿
    scale.add(body, pan, lcd);
    group.add(scale);
    let shown = null;
    const drawLcd = (m) => {
      if (shown === m) return; shown = m;
      const g = lcdTex.image.getContext('2d');
      g.fillStyle = '#b9d8b0'; g.fillRect(0, 0, 256, 80);
      g.fillStyle = '#1d2a1d'; g.font = 'bold 58px Menlo, monospace'; g.textAlign = 'right';
      g.fillText(m.toFixed(1), 210, 62); g.font = 'bold 30px sans-serif'; g.fillText('g', 246, 62);
      lcdTex.needsUpdate = true;
    };
    drawLcd(0);
    tag('电子秤', 'pill').loc(group, SCALE.x, 0.005, SCALE.z + 0.07);
    // 木块
    const blocks = BLOCKS.map(([k, a, b, c], i) => {
      const M = MAT[k];
      const m = inked(new THREE.Mesh(new THREE.BoxGeometry(a * CM, c * CM, b * CM), paint(M.color, { unique: true })), { width: 1.2 });
      const home = new THREE.Vector3(-0.2 + (i % 6) * 0.05, (c * CM) / 2, i < 6 ? -0.03 : 0.04);
      m.position.copy(home);
      m.userData = { i, k, a, b, c, V: a * b * c, mass: +(a * b * c * M.rho).toFixed(1), home };
      group.add(m);
      return m;
    });
    tag('铝块', 'pill').loc(group, -0.075, 0.005, -0.07);
    tag('铁块、木块', 'pill').loc(group, -0.1, 0.005, 0.08);
    const dims = [tag('', 'pill'), tag('', 'pill'), tag('', 'pill')];
    const S = { on: null, rows: [] };
    let W = null, onPick = () => {};

    const pointer = {
      down(ray) {
        const hit = ray.intersectObjects(blocks, false)[0];
        if (!hit) return false;
        const b = hit.object;
        if (S.on === b) { S.on = null; } else { S.on = b; }
        onPick();
        return true;
      },
      move(ray) { document.getElementById('c').style.cursor = ray.intersectObjects(blocks, false).length ? 'pointer' : ''; return false; },
      up() { return false; },
    };
    const place = () => {
      for (const b of blocks) {
        const u = b.userData;
        const target = S.on === b ? new THREE.Vector3(SCALE.x, 0.024 + (u.c * CM) / 2, SCALE.z - 0.008) : u.home;
        b.position.lerp(target, 0.25);
      }
      const b = S.on;
      if (b) {
        const u = b.userData, p = b.position;
        dims[0].loc(group, p.x, p.y - (u.c * CM) / 2, p.z + (u.b * CM) / 2 + 0.012).text(`长 ${u.a.toFixed(1)} cm`);
        dims[1].loc(group, p.x + (u.a * CM) / 2 + 0.02, p.y - (u.c * CM) / 2, p.z).text(`宽 ${u.b.toFixed(1)} cm`);
        dims[2].loc(group, p.x - (u.a * CM) / 2 - 0.02, p.y, p.z).text(`高 ${u.c.toFixed(1)} cm`);
        drawLcd(p.distanceTo(new THREE.Vector3(SCALE.x, 0.024 + (u.c * CM) / 2, SCALE.z - 0.008)) < 0.003 ? u.mass : 0);
      } else { dims.forEach((d) => d.loc(group, 0, -9, 0)); drawLcd(0); }
    };

    return {
      group,
      size: { w: 0.48, d: 0.16, h: 0.08 },
      view: { elev: 40, azim: 0, lookY: 0.25, margin: 1.05 },
      pointer,
      mount(ui) {
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${S.on?.userData.i}`, () => { cur = null; ui.status("秤上的金属块换了，刚才那道题作废。"); });     // 条件变了，待答的题作废
        const tb = table(['被测物体', 'm/g', 'V/cm³', 'm/V（g/cm³）']);
        const ch = chart({ x: { label: 'V/cm³', min: 0, max: 30 }, y: { label: 'm/g', min: 0, max: 70 }, series: Object.values(MAT).map((M) => ({ color: M.line, points: [], dots: true })), legend: '<span style="color:#7a8494">●</span> 铝　<span style="color:#2b2f3a">●</span> 铁　<span style="color:#c0813a">●</span> 木' });
        let cur = null;
        onPick = () => {
          choices.el.hidden = true; cur = null;
          const b = S.on;
          if (!b) return ui.status('点一块放到电子秤上。');
          const u = b.userData;
          if (S.rows.some((r) => r.i === u.i)) return ui.status(`这块${MAT[u.k].label}已经测过了，换一块。`);
          const V = u.V;
          const opts = [...new Set([V, u.a + u.b + u.c, u.a * u.b * 2 + u.b * u.c * 2 + u.a * u.c * 2])].slice(0, 3).sort(() => Math.random() - 0.5);
          cur = { u, opts };
          choices.btns.forEach((x, j) => { x.hidden = j >= opts.length; x.textContent = `V = ${opts[j]} cm³`; });
          choices.el.hidden = false; S.guard?.arm();
          ui.status(`读电子秤得到质量 m。再用刻度尺量出的长、宽、高算出它的<b>体积</b> V：`);
        };
        const answer = (j) => {
          if (!cur) return;
          const u = cur.u;
          if (cur.opts[j] !== u.V) return ui.status(cur.opts[j] === u.a + u.b + u.c ? '长、宽、高加起来不是体积。长方体的体积 = 长 × 宽 × 高。' : '这是长方体六个面的面积之和（表面积），不是体积。');
          choices.el.hidden = true;
          S.rows.push({ i: u.i, k: u.k, m: u.mass, V: u.V });
          const n = S.rows.filter((r) => r.k === u.k).length;
          tb.add([`${MAT[u.k].label}${n}`, u.mass.toFixed(1), String(u.V), (u.mass / u.V).toFixed(2)]);
          Object.keys(MAT).forEach((k, s) => { ch.series[s].points = S.rows.filter((r) => r.k === k).map((r) => [r.V, r.m]).sort((a, b) => a[0] - b[0]); ch.series[s].line = ch.series[s].points.length > 1; });
          ch.draw();
          if (S.rows.filter((r) => r.k === 'al').length >= 4) W.goal.done('al');
          if (['fe', 'wood'].some((k) => S.rows.filter((r) => r.k === k).length >= 2)) W.goal.done('other');
          ui.status(`记下了：m = ${u.mass.toFixed(1)} g，V = ${u.V} cm³，m/V = ${(u.mass / u.V).toFixed(2)} g/cm³。把它拿下来（再点一下），换一块。`);
          cur = null;
        };
        ui.controls.append(note('<b>点一块</b>放到电子秤上，再点一下拿下来。'), choices.el);
        ui.data.append(tb.el, ch.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['al', '测 4 个大小不同的铝块，描 m–V 图像'], ['other', '再测 2 个铁块（或木块），和铝块比一比']]) };
        ui.status('点一个铝块放到电子秤上。');
      },
      update() { S.guard?.check(); place(); },
      debug: { S, blocks },
    };
  },
};
