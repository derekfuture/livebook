// 图2.3-4 利用超声波定位的倒车雷达：发出超声波，碰到障碍物反射回来；根据回声到来的时间算距离，越近警报越急。
// 也可以切到“超声测位仪测海深”（课本练习：海水中声速 1 500 m/s）。
import * as THREE from 'three';
import { seg, slider, readout, buttons, goals, note } from './kit/ui.js';
import { Tone } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { canvasTex } from './kit/props.js';

const V_AIR = 340;
const SCALE = 0.1;    // 模型：1 m = 0.1

export default {
  id: 'sonar',
  fig: '图2.3-4',
  title: '超声波定位：倒车雷达',
  predict: {
    q: '倒车雷达向后发出超声波，0.01 s 后收到障碍物反射回来的回声。<br>车尾离障碍物大约多远？（空气中声速约 340 m/s）',
    hint: '课本第 45 页；第 27 页「超声波测距」',
    options: ['3.4 m', '1.7 m', '0.34 m'],
    answer: 1,
  },
  conclusion: {
    quote: '超声波碰到墙壁或昆虫时会反射回来，根据回声到来的方位和时间，蝙蝠就可以确定目标的位置。',
    why: '这种方法叫作<b>回声定位</b>。超声波从发出到返回，走了一个来回：距离 <i>s</i> = <i>v</i><i>t</i> ÷ 2 = 340 m/s × 0.01 s ÷ 2 = 1.7 m。倒车雷达、超声导盲仪、声呐都是利用这个原理。超声波的频率高于 20 000 Hz，人耳听不到；倒车雷达的“嘀嘀”声是车里另外发出的提示音。',
    src: '课本第 44–46 页 · 第二章 第3节 声的利用',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 路面 + 墙
    const roadTex = canvasTex(512, 64, (g, W, H) => { g.fillStyle = '#8a8f99'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2f2f2'; for (let x = 0; x < W; x += 40) g.fillRect(x, H - 8, 22, 4); });
    const road = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.003, 0.12), new THREE.MeshLambertMaterial({ map: roadTex }));
    road.position.set(0, 0.0015, 0);
    group.add(road);
    const wall = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.12), paint(0xc58a5a)));
    wall.position.set(-0.22, 0.045, 0);
    group.add(wall);
    // 汽车（车尾朝左）
    const car = new THREE.Group();
    const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.06), paint(0xe8e8ee)));
    body.position.y = 0.025;
    const cab = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.055), paint(0xb8d6e8)));
    cab.position.set(0.005, 0.052, 0);
    car.add(body, cab);
    for (const [x, z] of [[-0.04, 0.032], [0.04, 0.032], [-0.04, -0.032], [0.04, -0.032]]) {
      const w = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 16), paint(0x23262e)), 0.001);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.011, z);
      car.add(w);
    }
    const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 12), paint(0x3b4150));
    sensor.rotation.z = Math.PI / 2;
    sensor.position.set(-0.066, 0.02, 0);
    car.add(sensor);
    group.add(car);
    // 声波：去程（蓝）和回程（橙）的弧
    const waves = [];
    const mkArc = (color) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.99, 1, 40, 1, Math.PI * 0.75, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
      m.position.y = 0.02;
      return m;
    };
    const tD = tag('', 'pill'), tW = tag('障碍物', 'pill');
    tW.loc(group, -0.22, 0.1, 0);

    const S = { d: 1.7, t: 0, pinging: false, echoT: 0, tone: null, beepT: 0, measured: [] };
    let G = null;
    const layout = () => {
      car.position.x = -0.21 + S.d * SCALE + 0.066;
      tD.loc(group, (-0.21 + car.position.x - 0.066) / 2, 0.08, 0).text(`实际距离 ${S.d.toFixed(2)} m`);
    };
    layout();
    const ping = () => {
      S.pinging = true; S.t = 0;
      S.echoT = (2 * S.d) / V_AIR;
      const out = mkArc(0x2f7fd8);
      group.add(out);
      waves.push({ m: out, dir: -1, born: 0, x0: car.position.x - 0.066 });
    };

    return {
      group,
      size: { w: 0.5, d: 0.14, h: 0.12 },
      view: { elev: 30, azim: 0, lookY: 0.3, margin: 1.06 },
      mount(ui) {
        const out = readout([{ key: 't', label: '从发出到收到回声', unit: 's' }, { key: 's', label: '算出的距离 <i>s</i> = <i>vt</i>/2', unit: 'm' }]);
        const ds = slider('车尾到障碍物（倒车）', { min: 0.3, max: 3.5, step: 0.05, value: 1.7, fmt: (v) => `${v.toFixed(2)} m`, onInput: (v) => { S.d = v; layout(); } });
        const btn = buttons([{ text: '发出超声波', onClick: () => ping() }]);
        ui.controls.append(ds.el, btn.el, out.el, note('声波画慢了很多倍：真实的声波 0.01 s 就能跑 3.4 m。'));
        G = {
          out, ui,
          goal: goals(ui, [['one', '测一次距离'], ['near', '倒到 0.5 m 以内，听警报声']]),
          echo: () => {
            const t = S.echoT, s = (V_AIR * t) / 2;
            out.set('t', t, 4); out.set('s', s, 2);
            G.goal.done('one');
            ui.status(`收到回声：<i>t</i> = ${t.toFixed(4)} s，<i>s</i> = 340 m/s × ${t.toFixed(4)} s ÷ 2 = <b>${s.toFixed(2)} m</b>。`);
          },
        };
        this._G = G;
        ui.status('点“发出超声波”，看声波碰到障碍物后反射回来。');
      },
      update(dt) {
        // 声波（动画时间放慢 300 倍）
        const SLOW = 1 / 300;
        for (let i = waves.length - 1; i >= 0; i--) {
          const w = waves[i];
          w.born += dt;
          const dist = (w.born * V_AIR * SLOW) * SCALE * 10;      // 模型距离
          const r = Math.max(0.005, dist);
          if (w.dir < 0) {
            w.m.position.x = w.x0;
            w.m.scale.setScalar(r);
            w.m.rotation.set(-Math.PI / 2, 0, 0);
            w.m.material.opacity = 0.9;
            if (w.x0 - r <= -0.21) {
              group.remove(w.m); waves.splice(i, 1);
              const back = mkArc(0xff8a2a);
              back.rotation.set(-Math.PI / 2, 0, Math.PI);
              group.add(back);
              waves.push({ m: back, dir: 1, born: 0, x0: -0.21 });
            }
          } else {
            w.m.position.x = w.x0;
            w.m.scale.setScalar(r);
            w.m.material.opacity = 0.9;
            if (w.x0 + r >= car.position.x - 0.066) {
              group.remove(w.m); waves.splice(i, 1);
              this._G?.echo();
              // 车里的提示音：越近越急
              S.tone ||= new Tone({ type: 'square', freq: 1200, gain: 0.08 });
              S.tone.pluck(0.08);
            }
          }
        }
        // 倒得很近：持续嘀嘀
        if (S.d < 0.5) {
          S.beepT += dt;
          const period = 0.08 + S.d * 0.6;
          if (S.beepT > period) { S.beepT = 0; S.tone ||= new Tone({ type: 'square', freq: 1200, gain: 0.08 }); S.tone.pluck(0.06); this._G?.goal.done('near'); }
        }
      },
      dispose() { S.tone?.stop(); },
    };
  },
};
