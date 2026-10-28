// 图2.4-1 噪声的波形 + 控制噪声的三个途径：防止噪声产生、阻断噪声传播、防止噪声进入耳朵。分贝计实时显示。
import * as THREE from 'three';
import { seg, readout, buttons, goals, note, h } from './kit/ui.js';
import { Tone, Noise, drawScope } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { person } from './kit/props.js';

const SRC_DB = { music: 70, drill: 100 };

export default {
  id: 'noise',
  fig: '图2.4-1',
  title: '噪声的波形与控制',
  predict: {
    q: '楼上在装修，电钻声很吵。<br>下面哪种做法能减弱你听到的噪声？',
    hint: '课本第 50–51 页',
    options: ['关上窗户', '戴上耳罩', '请他们晚上不施工', '以上都可以'],
    answer: 3,
  },
  conclusion: {
    quote: '人们以分贝（decibel，符号是dB）为单位来表示人耳感知声音强弱的等级。',
    why: '从物理学的角度看，噪声是发声体做无规则振动时发出的声音，它的波形杂乱无章；乐音的波形是有规律的。控制噪声可以从三个方面着手：<b>防止噪声产生</b>（在声源处）、<b>阻断噪声的传播</b>（在传播途中，如隔音墙、关窗）、<b>防止噪声进入耳朵</b>（在人耳处，如戴耳罩）。为了保证休息和睡眠，声音不能超过 50 dB；为了保证工作和学习，不能超过 70 dB；为了保护听力，不能超过 90 dB。',
    src: '课本第 49–51 页 · 第二章 第4节 噪声的危害和控制',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 声源：电钻 / 音乐（小音箱）
    // 电钻：机身（圆筒）+ 钻夹头 + 钻头 + 斜握把 + 扳机 + 电池包
    const drill = new THREE.Group();
    const yel = paint(0xe8b23a), blk = paint(0x2c313c), steel = paint(0xaab3bf);
    const db = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 6, 16), yel), 0.0015);
    db.rotation.z = Math.PI / 2;
    db.position.set(0, 0.078, 0);
    for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.012, 0.03), blk); v.position.set(-0.024 + i * 0.005, 0.078, 0); drill.add(v); }   // 散热槽
    const chuck = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.018, 16), blk), 0.0012);
    chuck.rotation.z = -Math.PI / 2;
    chuck.position.set(0.048, 0.078, 0);
    const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0012, 0.045, 8), steel);
    bit.rotation.z = Math.PI / 2;
    bit.position.set(0.078, 0.078, 0);
    const grip = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.034, 4, 12), blk), 0.0012);
    grip.position.set(-0.004, 0.045, 0);
    grip.rotation.z = -0.25;
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.008), paint(0xd9483b));
    trigger.position.set(0.008, 0.06, 0);
    const pack = inked(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.018, 0.03), yel), { width: 1.2 });
    pack.position.set(-0.008, 0.012, 0);
    const packTop = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.026), blk);
    packTop.position.set(-0.008, 0.023, 0);
    drill.add(db, chuck, bit, grip, trigger, pack, packTop);
    drill.scale.setScalar(1.25);
    const speaker = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.04), paint(0x3b4150)));
    speaker.position.y = 0.03;
    const cone = hull(new THREE.Mesh(new THREE.CircleGeometry(0.014, 24), paint(0x1d2028)), 0.001);
    cone.position.set(0, 0.035, 0.0205);
    speaker.add(cone);
    const src = new THREE.Group();
    src.add(drill, speaker);
    src.position.x = -0.18;
    group.add(src);
    // 隔音墙 / 窗户
    const wall = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.14), paint(0x9fc4d6, { unique: true, transparent: true, opacity: 0.85 })));
    wall.position.set(-0.02, 0.055, 0);
    group.add(wall);
    // 人 + 耳罩
    const kid = person({ shirt: 0x5b8fd6 });
    kid.rotation.y = Math.PI;            // 面朝声源（−x）
    kid.position.set(0.15, 0, 0);
    kid.scale.setScalar(0.75);
    kid.rotation.y = Math.PI * 0.85;     // 侧过一点，看得到脸
    // 耳罩：戴在两只耳朵上
    const muff = new THREE.Group();
    for (const s of [-1, 1]) { const m = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 16), paint(0xd9483b)), 0.001); m.rotation.x = Math.PI / 2; m.position.set(0, 0, s * (kid.earZ + 0.003)); muff.add(m); }
    const band = new THREE.Mesh(new THREE.TorusGeometry(kid.earZ + 0.004, 0.0022, 6, 24, Math.PI), paint(0xd9483b));
    band.rotation.y = Math.PI / 2;
    muff.add(band);
    muff.position.y = kid.earY - 0.122;
    kid.head.add(muff);
    group.add(kid);
    // 声波（粒子环）
    const rings = [];
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 48, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0 }));
      r.rotation.z = -Math.PI * 0.3;
      group.add(r);
      rings.push({ r, k: i / 5 });
    }
    const tDb = tag('', 'pill big');

    const S = { src: 'drill', on: false, quiet: false, wall: false, muff: false, tried: new Set() };
    let G = null, music = null, noise = null;

    const level = () => {
      if (!S.on) return 20;
      let db = SRC_DB[S.src];
      if (S.quiet) db -= 35;        // 在声源处减弱（换低噪声工具/不施工）
      if (S.wall) db -= 25;
      if (S.muff) db -= 25;
      return Math.max(20, db);
    };
    const apply = () => {
      const lv = level();
      const amp = Math.pow(10, (lv - 100) / 40);
      wall.visible = S.wall; muff.visible = S.muff;
      drill.visible = S.src === 'drill'; speaker.visible = S.src === 'music';
      if (S.src === 'drill') { music?.on(false); noise ||= new Noise({ gain: 0.4 }); noise.on(S.on && !(S.quiet && lv <= 20)); noise.volume(amp); }
      else { noise?.on(false); music ||= new Tone({ type: 'sine', freq: 440, gain: 0.25 }); music.on(S.on); music.volume(amp * 1.6); }
      if (G) {
        G.out.set('db', `${Math.round(lv)} dB`);
        G.out.set('k', lv <= 50 ? '安静，适合休息' : lv <= 70 ? '可以学习、工作' : lv <= 90 ? '干扰谈话，影响工作' : '会损伤听力！');
        if (S.on && S.src === 'drill') {
          if (S.quiet) G.goal.done('a');
          if (S.wall) G.goal.done('b');
          if (S.muff) G.goal.done('c');
        }
        if (S.on) S.tried.add(S.src);
        if (S.tried.size >= 2) G.goal.done('wave');
      }
    };

    return {
      group,
      size: { w: 0.42, d: 0.16, h: 0.12 },
      view: { elev: 20, azim: -12, lookY: 0.45, margin: 1.25 },
      mount(ui) {
        const out = readout([{ key: 'db', label: '人耳处的声音（分贝计）' }, { key: 'k', label: '' }]);
        const srcSel = seg('声源', ['电钻（噪声）', '音乐（乐音）'], (_, k) => { S.src = k ? 'music' : 'drill'; apply(); });
        const on = buttons([{ text: '▶ 开 / 关', onClick: () => { S.on = !S.on; apply(); } }]);
        const a = seg('在声源处', ['照常施工', '换静音工具 / 休息时间不施工'], (_, k) => { S.quiet = k === 1; apply(); });
        const b = seg('在传播途中', ['开着窗', '关窗 / 隔音墙'], (_, k) => { S.wall = k === 1; apply(); });
        const c = seg('在人耳处', ['不戴', '戴上耳罩'], (_, k) => { S.muff = k === 1; apply(); });
        const scope = h('canvas', { width: 680, height: 200, style: 'width:100%;height:100px;border-radius:9px;display:block;margin-bottom:10px' });
        ui.controls.append(srcSel.el, on.el, h('div', { class: 'ctl-label' }, '波形'), scope, out.el, a.el, b.el, c.el, note('电脑要打开声音。'));
        G = { out, scope, goal: goals(ui, [['wave', '比较噪声和乐音的波形'], ['a', '在声源处减弱噪声'], ['b', '在传播途中减弱噪声'], ['c', '在人耳处减弱噪声']]) };
        this._G = G;
        ui.status('打开电钻，看看分贝计的读数和波形。');
        apply();
      },
      update(dt, t) {
        const lv = level();
        drill.rotation.z = S.on && S.src === 'drill' && !S.quiet ? Math.sin(t * 90) * 0.02 : 0;
        cone.scale.setScalar(S.on && S.src === 'music' ? 1 + Math.sin(t * 40) * 0.06 : 1);
        for (const rr of rings) {
          rr.k = (rr.k + dt * 0.7) % 1;
          const x = -0.18 + rr.k * 0.33;
          rr.r.position.set(x, 0.05, 0);
          rr.r.scale.setScalar(0.02 + rr.k * 0.08);
          let a = S.on ? (1 - rr.k) * Math.min(1, (SRC_DB[S.src] - (S.quiet ? 35 : 0) - 20) / 60) : 0;
          if (S.wall && x > -0.02) a *= 0.2;
          rr.r.material.opacity = Math.max(0, a);
          rr.r.material.color.setHex(S.src === 'drill' ? 0xff6a3d : 0x2f7fd8);
        }
        tDb.loc(group, 0.15, 0.14, 0).text(`${Math.round(lv)} dB`);
        const G = this._G;
        if (!G) return;
        const src = S.src === 'drill' ? noise : music;
        const wave = S.on && src ? src.wave() : new Float32Array(1024);
        drawScope(G.scope, wave, { gain: S.src === 'drill' ? 3 : 8, color: S.src === 'drill' ? '#ff9b6a' : '#49f2c3', label: S.on ? (S.src === 'drill' ? '噪声：杂乱无章' : '乐音：有规律') : '' });
      },
      dispose() { music?.stop(); noise?.stop(); },
    };
  },
};
