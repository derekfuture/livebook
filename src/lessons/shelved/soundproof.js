// 图2.5-2 某科创小组制作的隔音房间模型：盒子里放一个发声的手机，换不同的墙体材料和层数，用分贝计测盒外的声音。
// 每种材料的隔声量是示意值（多孔、松软的材料吸声好，密实的材料隔声好）。
import * as THREE from 'three';
import { seg, buttons, readout, table, goals, note, h } from './kit/ui.js';
import { Tone } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';

const MATS = [
  { id: 'card', name: '硬纸板', db: 6, color: 0xd8b07a, note: '薄而轻，隔音差' },
  { id: 'foam', name: '泡沫塑料', db: 12, color: 0xf2f0e6, note: '多孔，能吸收声音' },
  { id: 'cotton', name: '棉花', db: 15, color: 0xffffff, note: '松软多孔，吸声好' },
  { id: 'wood', name: '木板', db: 14, color: 0xb98a55, note: '密实，能挡住声音' },
];
const SOURCE = 75;

export default {
  id: 'soundproof',
  fig: '图2.5-2',
  title: '跨学科实践：制作隔音房间模型',
  predict: {
    q: '用同样厚度的硬纸板、泡沫塑料、棉花做隔音墙，<br>你猜哪种材料隔音效果最差？',
    hint: '课本第 53–54 页',
    options: ['硬纸板', '泡沫塑料', '棉花'],
    answer: 0,
  },
  conclusion: {
    quote: '在家中弹奏乐器时，有时会影响他人休息。能否制作一个隔音房间，在不影响他人的情况下，在其中弹奏乐器呢？',
    why: '控制噪声可以从阻断它的<b>传播</b>入手。泡沫、棉花这类松软多孔的材料能吸收声音，木板这类密实的材料能把声音挡住、反射回去；墙体层数越多，传出去的声音越小。实际设计还要兼顾通风、成本和美观。（模型中各材料的隔声数值为示意值。）',
    src: '课本第 53–55 页 · 第二章 第5节 跨学科实践：制作隔音房间模型',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const box = new THREE.Group();
    // 房间模型的木框架（一直在）：12 根细木条围成的盒子 + 一扇小门框，墙体一层层装在框架外面
    const frame = new THREE.Group();
    const F = 0.1, T = 0.004, wood = paint(0xc9a878);
    const bar = (w, h, d, x, y, z) => { const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood), { width: 1 }); m.position.set(x, y, z); frame.add(m); };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(T, F * 0.7, T, sx * F / 2, F * 0.35, sz * F / 2);
    for (const y of [T / 2, F * 0.7]) for (const sz of [-1, 1]) { bar(F, T, T, 0, y, sz * F / 2); bar(T, T, F, sz * F / 2, y, 0); }
    group.add(frame);
    // 手机下面垫一张小桌
    const desk = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.07), paint(0xe8dcc4)), { width: 1 });
    desk.position.y = 0.0015;
    group.add(desk);
    group.add(box);
    const phone = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.055), paint(0x23262e)));
    phone.position.y = 0.0055;
    group.add(phone);
    const meter = new THREE.Group();
    const mb = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.012), paint(0xe2b53a)));
    mb.position.y = 0.03;
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), paint(0x3b4150));
    mic.position.y = 0.066;
    meter.add(mb, mic);
    meter.position.set(0.17, 0, 0);
    group.add(meter);
    const tDb = tag('', 'pill big');
    tDb.loc(group, 0.17, 0.09, 0);

    const S = { layers: [], playing: false, rows: [] };
    let tone = null, G = null;
    const build = () => {
      box.clear();
      const n = S.layers.length;
      S.layers.forEach((m, i) => {
        const sz = 0.1 + i * 0.016, wt = 0.006;
        const mat = paint(m.color, { unique: true, transparent: true, opacity: i === n - 1 ? 0.92 : 0.5 });
        for (const [w, hh, d, x, y, z] of [[sz, sz * 0.7, wt, 0, sz * 0.35, sz / 2], [sz, sz * 0.7, wt, 0, sz * 0.35, -sz / 2], [wt, sz * 0.7, sz, sz / 2, sz * 0.35, 0], [wt, sz * 0.7, sz, -sz / 2, sz * 0.35, 0], [sz, wt, sz, 0, sz * 0.7, 0]]) {
          const p = inked(new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat), { width: 1 });
          p.position.set(x, y, z);
          if (z > 0 && i === n - 1) p.visible = false;     // 正面最外层“打开”，能看到里面
          box.add(p);
        }
      });
    };
    const outside = () => SOURCE - S.layers.reduce((s, m) => s + m.db, 0) + (S.layers.length > 1 ? -2 : 0);
    const apply = () => {
      build();
      const db = S.playing ? Math.max(25, outside()) : 25;
      tone?.volume(Math.pow(10, (db - 75) / 30));
      tDb.text(`${Math.round(db)} dB`);
      if (G) { G.out.set('db', `${Math.round(db)} dB`); G.out.set('w', S.layers.length ? S.layers.map((m) => m.name).join(' + ') : '没有墙'); }
    };

    return {
      group,
      size: { w: 0.42, d: 0.2, h: 0.12 },
      view: { elev: 24, azim: -12, lookY: 0.35, margin: 1.08 },
      mount(ui) {
        const out = readout([{ key: 'db', label: '盒外分贝计' }, { key: 'w', label: '墙体' }]);
        const play = buttons([{ text: '▶ 手机播放音乐', onClick: () => { tone ||= new Tone({ type: 'triangle', freq: 523, gain: 0.25 }); S.playing = !S.playing; tone.on(S.playing); apply(); } }]);
        const add = seg('加一层墙（从里到外）', MATS.map((m) => m.name), (_, k) => { if (S.layers.length >= 3) return ui.status('最多三层。先拆掉再试。'); S.layers.push(MATS[k]); apply(); });
        const ctl = buttons([{ text: '记录', onClick: () => {
          if (!S.playing) return ui.status('先让手机响起来。');
          const name = S.layers.length ? S.layers.map((m) => m.name).join(' + ') : '无';
          if (S.rows.includes(name)) return ui.status('这种墙体已经测过了。');
          S.rows.push(name);
          tb.add([name, S.layers.length, `${Math.round(Math.max(25, outside()))} dB`]);
          const single = S.rows.filter((r) => !r.includes('+') && r !== '无').length;
          if (single >= 3) G.goal.done('mats');
          if (S.layers.length >= 2) G.goal.done('layers');
        } }, { text: '拆掉全部墙', ghost: true, onClick: () => { S.layers = []; apply(); } }]);
        const tb = table(['墙体材料', '层数', '盒外声音']);
        ui.controls.append(play.el, add.el, ctl.el, out.el, note('每加一层，盒外的分贝计读数就会变化。电脑要打开声音。'));
        ui.data.append(tb.el);
        G = { out, goal: goals(ui, [['mats', '分别用三种不同的单层材料测一次'], ['layers', '试一个两层或三层的墙']]) };
        apply();
        ui.status('先放音乐，测一测没有墙时的声音。');
      },
      update(dt, t) { phone.material.emissive?.setRGB(S.playing ? 0.1 + 0.08 * Math.sin(t * 8) : 0, S.playing ? 0.2 : 0, S.playing ? 0.35 : 0); },
      dispose() { tone?.stop(); },
    };
  },
};
