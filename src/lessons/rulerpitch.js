// 图2.2-2 钢尺振动：伸出桌边越短，振动越快（频率高）、音调越高；拨得越用力，振幅越大、响度越大。
// 悬臂梁基频 f ∝ 1/L²：伸出 20 cm 时约 20 Hz（很低），伸出 6 cm 时约 220 Hz。
import * as THREE from 'three';
import { slider, buttons, readout, goals, note, h, table } from './kit/ui.js';
import { Tone, drawScope, synthWave } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { woodBlock } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';

const K = 20 * 0.2 * 0.2;      // f = K / L²
const SEG = 40;

export default {
  id: 'rulerpitch',
  fig: '图2.2-2',
  title: '钢尺振动：音调和响度',
  predict: {
    q: '把钢尺紧按在桌面上，拨动伸出桌边的一端。<br>伸出桌边的部分变短后，再用同样的力拨动，声音会怎样？',
    hint: '课本第 37 页「想想做做」',
    options: ['音调变高', '音调变低', '声音变大，音调不变'],
    answer: 0,
  },
  conclusion: {
    quote: '频率决定声音的音调，频率高则音调高，频率低则音调低。',
    why: '物体在 1 s 内振动的次数叫作<b>频率</b>，单位是赫兹（Hz）。钢尺伸出桌边越短，振动越快，频率越高，音调越高。用力越大，钢尺振动的幅度（<b>振幅</b>）越大，声音的<b>响度</b>越大。伸出得太长时，钢尺振动得太慢（低于 20 Hz），人耳就听不到了——这是<b>次声波</b>。',
    src: '课本第 37–40 页 · 第二章 第2节 声音的特性',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 桌子一角
    const desk = woodBlock(0.24, 0.04, 0.14);
    desk.position.set(-0.12, 0.02, 0);
    group.add(desk);
    // 钢尺：一条细长的盒子，分段弯曲
    const W = 0.028, T = 0.0012, TOTAL = 0.3;
    const geo = new THREE.BoxGeometry(1, T, W, SEG, 1, 1);
    const base = geo.attributes.position.array.slice();
    const rulerMat = new THREE.MeshPhongMaterial({ color: 0xc8cfd8, specular: 0xffffff, shininess: 80 });
    const steel = new THREE.Mesh(geo, rulerMat);
    steel.castShadow = true;
    group.add(steel);
    const hand = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.05), paint(0xf3c9a5)));
    hand.position.set(-0.03, 0.04 + T + 0.008, 0);
    group.add(hand);
    const tL = tag('', 'pill'), tF = tag('', 'pill');

    const S = { L: 0.12, amp: 0, ampSet: 0.6, phase: 0, f: 0, rows: [], press: 0 };
    let tone = null, G = null;
    const freq = () => K / (S.L * S.L);

    const bend = () => {
      const pos = geo.attributes.position;
      // 整根尺从 x = −(TOTAL−L) 到 x = L；桌面以内的部分不动
      for (let i = 0; i < pos.count; i++) {
        const u = base[i * 3] + 0.5;                    // 0..1
        const x = -(TOTAL - S.L) + u * TOTAL;
        let y = 0;
        if (x > 0) {
          const s = x / S.L;
          // 悬臂梁第一振型（近似）
          y = S.amp * Math.sin(S.phase) * 0.03 * (1 - Math.cos((Math.PI * s) / 2)) * (S.L / 0.12);
        }
        pos.setXYZ(i, x, 0.04 + T / 2 + base[i * 3 + 1] + y, base[i * 3 + 2]);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };
    bend();

    const pluck = () => {
      tone ||= new Tone({ type: 'triangle', freq: freq(), gain: 0.3 });
      S.amp = S.ampSet;
      S.f = freq();
      const audible = S.f >= 20;
      tone.freq(Math.max(20, S.f));
      if (audible) tone.pluck(1.4, 0.05 + S.ampSet * 0.35);
      G?.after(audible);
    };

    // 尺的两个抓手：桌面上的那一段（左右拖改变伸出长度），伸出去的尖端（往下按住再松手 = 拨一下，按得越深越用力）
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.04), new THREE.MeshBasicMaterial({ visible: false }));
    const tipPick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
    group.add(grip, tipPick);
    let x0 = null;
    const pointer = draggable(group, [
      { obj: grip, plane: 'xz', offset: 0.04, hint: '左右推拉：改变伸出桌边的长度', onStart: (p) => { x0 = p ? { x: p.x, L: S.L } : null; }, onDrag: (p) => { if (!x0) return; S.L = clamp(Math.round((x0.L + (p.x - x0.x)) * 200) / 200, 0.04, 0.22); S.amp = 0; G?.syncL?.(); bend(); } },
      { obj: tipPick, plane: 'xy', offset: 0, hint: '往下按住，再松手：拨一下（按得越深越用力）', onStart: () => { S.amp = 0; S.press = 0; }, onDrag: (p) => { S.press = clamp((0.04 - p.y) / 0.03, 0, 1); S.phase = -Math.PI / 2; S.amp = S.press; bend(); }, onEnd: () => { if (S.press > 0.05) { S.ampSet = Math.max(0.1, S.press); G?.syncA?.(); pluck(); S.phase = -Math.PI / 2; } S.press = 0; } },
    ], { tip: tag('', 'pill') });

    return {
      group,
      pointer,
      size: { w: 0.42, d: 0.16, h: 0.1 },
      view: { elev: 26, azim: -30, lookY: 0.3, margin: 1.5 },
      mount(ui) {
        let last = null;
        const cmp = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        cmp.el.hidden = true;
        const out = readout([{ key: 'f', label: '振动频率', unit: 'Hz', secret: '先自己听' }, { key: 'a', label: '振幅' }]);
        const ls = slider('伸出桌边的长度', { min: 4, max: 22, step: 0.5, value: 12, fmt: (v) => `${v} cm`, onInput: (v) => { S.L = v / 100; S.amp = 0; bend(); } });
        const as = slider('拨动的力度', { min: 10, max: 100, value: 60, fmt: (v) => (v < 35 ? '轻轻拨' : v > 75 ? '用力拨' : '中等'), onInput: (v) => { S.ampSet = v / 100; } });
        const btn = buttons([{ text: '🎵 拨一下', onClick: () => pluck() }]);
        const scope = h('canvas', { width: 680, height: 200, style: 'width:100%;height:100px;border-radius:9px;display:block;margin-bottom:10px' });
        const tb = table(['伸出长度/cm', '振动快慢', '音调（你听到的）', '振幅', '响度（你听到的）']);
        ui.controls.append(cmp.el, note('也可以直接动手：<b>左右推拉桌上那段钢尺</b>改变伸出长度；<b>把伸出去的尖端往下按住再松手</b>就是拨一下。'), ls.el, as.el, btn.el, out.el, h('div', { class: 'ctl-label' }, '声音的波形（示波器）'), scope, note('电脑要打开声音。'));
        ui.data.append(tb.el);
        G = {
          out, scope, syncL: () => ls.set(S.L * 100), syncA: () => as.set(Math.round(S.ampSet * 100)),
          goal: goals(ui, [['pitch', '伸出长度不同，各拨一次，比较音调'], ['loud', '伸出长度不变，用不同的力拨，比较响度'], ['infra', '让钢尺伸出很长，看看还能不能听到']]),
          after: (audible) => {
            const f = S.f, lvl = S.ampSet, L = Math.round(S.L * 100);
            const prev = last; last = { f, lvl, L, audible };
            if (!audible) { tb.add([L.toFixed(0), '很慢（看得见在振动）', '听不到', lvl > 0.6 ? '大' : '小', '—']); G.goal.done('infra'); ui.status('钢尺在振动，可是<b>听不到</b>声音：它振动得太慢了（1 s 不到 20 次），这是次声波。'); return; }
            if (!prev || !prev.audible) { tb.add([L.toFixed(0), '', '（第一次，作为比较的标准）', lvl > 0.6 ? '大' : lvl < 0.35 ? '小' : '中', '']); ui.status('记住这个声音。现在<b>改变伸出的长度</b>（或者只改变拨的力度）再拨一下，和它比一比。'); return; }
            const sameL = prev.L === L, sameA = Math.abs(prev.lvl - lvl) < 0.12;
            if (!sameL && !sameA) return ui.status('长度和力度同时变了，没法比较是哪个引起的变化。<b>每次只改变一个</b>（控制变量）。');
            if (sameL && sameA) return ui.status('和上一次一样：再改变伸出长度或拨的力度试试。');
            const ask = sameA ? { q: '和上一次比，这次的<b>音调</b>——', opts: ['更高', '更低', '差不多'], right: f > prev.f * 1.08 ? 0 : f < prev.f / 1.08 ? 1 : 2 } : { q: '和上一次比，这次的<b>响度</b>（声音的大小）——', opts: ['更大', '更小', '差不多'], right: lvl > prev.lvl ? 0 : 1 };
            cmp.btns.forEach((bt, j) => { bt.textContent = ask.opts[j]; bt.onclick = () => {
              if (j !== ask.right) return ui.status('再听一次（点“拨一下”）。看看钢尺振动得快还是慢、幅度大还是小。');
              cmp.el.hidden = true;
              const word = ask.opts[j];
              if (sameA) { tb.add([L.toFixed(0), f > prev.f ? '更快' : '更慢', word, '同上', '同上']); G.goal.done('pitch'); ui.status(`伸出${L < prev.L ? '短' : '长'}了，振动${f > prev.f ? '更快' : '更慢'}，音调${word}。`); }
              else { tb.add([L.toFixed(0), '同上', '同上', lvl > prev.lvl ? '更大' : '更小', word]); G.goal.done('loud'); ui.status(`拨得${lvl > prev.lvl ? '更用力' : '更轻'}，振幅${lvl > prev.lvl ? '更大' : '更小'}，响度${word}；音调没变。`); }
            }; });
            cmp.el.hidden = false;
            ui.status(ask.q);
          },
        };
        this._G = G;
        ui.status('把钢尺紧按在桌边，<b>按住伸出去的尖端往下压，再松手</b>（或点“拨一下”）。听一听。');
      },
      update(dt) {
        const f = freq();
        // 屏幕上的振动放慢显示（真实频率太快看不清），但快慢的对比保留
        const shown = Math.min(14, f * 0.12 + 1);
        if (!S.press) S.phase += dt * shown * Math.PI * 2;
        if (!S.press) S.amp *= Math.exp(-dt * 2.2);
        bend();
        grip.position.set(-0.06, 0.042, 0); tipPick.position.set(S.L - 0.01, 0.04, 0);
        tL.loc(group, S.L / 2, 0.06, 0.02).text(`伸出 ${(S.L * 100).toFixed(1)} cm`);
        tF.loc(group, 0, -9, 0);
        const G = this._G;
        if (!G) return;
        G.out.set('f', f, 0);
        G.out.set('a', S.amp > 0.05 ? (S.amp > 0.5 ? '大' : S.amp > 0.2 ? '中' : '小') : '—');
        // 示波器：用合成波形显示（周期数 ∝ 频率，高度 ∝ 振幅）
        const cycles = Math.max(0.6, f / 30);
        drawScope(G.scope, synthWave(1024, (x) => S.amp * Math.sin(x * cycles * Math.PI * 2)), { gain: 1.2, label: f < 20 ? '低于 20 Hz：听不到' : '' });
      },
      dispose() { tone?.stop(); },
    };
  },
};
