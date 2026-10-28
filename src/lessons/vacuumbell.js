// 图2.1-4 真空罩中的闹钟：把正在响铃的闹钟放在玻璃罩内，逐渐抽出空气，铃声越来越小；再放进空气，铃声又变大。
// 声音是真的（Web Audio），音量跟罩内气压挂钩。
import * as THREE from 'three';
import { buttons, readout, goals, note, h } from './kit/ui.js';
import { Bell, drawScope } from './kit/audio.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';
import { draggable } from './kit/interact.js';

export default {
  id: 'vacuumbell',
  fig: '图2.1-4',
  title: '真空罩中的闹钟',
  predict: {
    q: '把正在响铃的闹钟放在玻璃罩内，用抽气机逐渐抽出罩内的空气，<br>听到的铃声会怎样？',
    hint: '课本第 33 页「演示」',
    options: ['越来越大', '越来越小', '不变'],
    answer: 1,
  },
  conclusion: {
    quote: '声音的传播需要物质，物理学中把这样的物质叫作介质；真空不能传声。',
    why: '罩内的空气越来越少，传到外面的铃声越来越小；重新放进空气，声音又变大了。由此可以推理：如果罩内一点空气也没有，就听不到铃声了。气体、液体、固体都可以传播声音。',
    src: '课本第 33–34 页 · 第二章 第1节 声音的产生与传播',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 底座 + 玻璃罩
    const base = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.016, 40), paint(0x4d5668)));
    base.position.y = 0.008;
    group.add(base);
    const jarMat = paint(0xdff1f8, { unique: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.068, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), jarMat);
    jar.scale.y = 1.6;
    jar.position.y = 0.016;
    jar.renderOrder = 8;
    glassEdge(jar, 0.001);
    const knob = hull(new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 12), paint(0xdff1f8, { transparent: true, opacity: 0.5 })), 0.001);
    knob.position.y = 0.016 + 0.068 * 1.6;
    group.add(jar, knob);
    // 闹钟
    const clock = new THREE.Group();
    const face = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.014, 32), paint(0xd9483b)), 0.0015);
    face.rotation.x = Math.PI / 2;
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.022, 32), paint(0xfdfbf5));
    dial.position.z = 0.0072;
    const bells = [];
    for (const s of [-1, 1]) {
      const b = hull(new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9b04a)), 0.0012);
      b.position.set(s * 0.016, 0.026, 0);
      b.rotation.z = -s * 0.5;
      clock.add(b);
      bells.push(b);
    }
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.014, 0.002), paint(0x3b4150));
    hammer.position.set(0, 0.03, 0);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.012, 6), paint(0x3b4150));
      leg.position.set(s * 0.016, -0.026, 0);
      leg.rotation.z = s * 0.4;
      clock.add(leg);
    }
    const handH = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.012, 0.001), paint(0x23262e));
    handH.geometry.translate(0, 0.006, 0);
    handH.position.z = 0.008;
    const handM = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.018, 0.001), paint(0x23262e));
    handM.geometry.translate(0, 0.009, 0);
    handM.position.z = 0.0085;
    handM.rotation.z = -2;
    clock.add(face, dial, hammer, handH, handM);
    clock.position.y = 0.05;
    group.add(clock);
    // 抽气机（管子 + 压力表）
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 10), paint(0x3b4150));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0.12, 0.008, 0);
    const pump = inked(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), paint(0x6b7385)));
    pump.position.set(0.19, 0.025, 0);
    const gauge = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 24), paint(0xf0f2f5)), 0.0012);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0.19, 0.06, 0.02);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.012, 0.001), new THREE.MeshBasicMaterial({ color: 0xd4006c }));
    needle.geometry.translate(0, 0.006, 0);
    needle.position.set(0.19, 0.06, 0.0235);
    group.add(pipe, pump, gauge, needle);
    // 声波圈（从罩子往外扩散，强度 ∝ 气压）
    const rings = [];
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.0012, 6, 60), new THREE.MeshBasicMaterial({ color: 0x2f7fd8, transparent: true, opacity: 0 }));
      r.position.y = 0.07;
      group.add(r);
      rings.push({ r, k: i / 4 });
    }
    // 空气分子
    const N = 140;
    const mol = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 6, 4), new THREE.MeshBasicMaterial({ color: 0x7a8aa6 }), N);
    mol.frustumCulled = false;     // 实例位置会变，包围球不准
    const mp = Array.from({ length: N }, () => ({ p: new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.02 + Math.random() * 0.09, (Math.random() - 0.5) * 0.12), v: new THREE.Vector3().randomDirection().multiplyScalar(0.05) }));
    group.add(mol);
    const tP = tag('', 'pill'); tP.loc(group, 0.19, 0.095, 0.02);

    const S = { p: 1, pump: 0, ringing: false, t: 0, minP: 1, refilled: false };
    let bell = null, G = null;
    const m = new THREE.Matrix4();

    // 直接动手：点闹钟让它响 / 停；点抽气机开始 / 停止抽气；点玻璃罩顶上的阀门放进空气
    const A = {};
    jar.raycast = () => {};          // 玻璃罩是透明的：点它就是点里面的闹钟
    const pointer = draggable(group, [], { tip: tag('', 'pill'), taps: [
      { obj: clock, hint: () => (S.ringing ? '点一下：关掉闹钟' : '点一下：让闹钟响（罩上玻璃罩之前先打开）'), onTap: () => A.ring?.() },
      { obj: pump, hint: () => (S.pump < 0 ? '点一下：停止抽气' : '点一下：开动抽气机，抽出罩里的空气'), onTap: () => { S.pump = S.pump < 0 ? 0 : -1; } },
      { obj: knob, hint: () => (S.pump > 0 ? '点一下：关上阀门' : '点一下：打开阀门，放进空气'), onTap: () => { S.pump = S.pump > 0 ? 0 : 1; } },
    ] });

    return {
      group,
      pointer,
      size: { w: 0.42, d: 0.18, h: 0.18 },
      view: { elev: 14, azim: -14, lookY: 0.45, margin: 1.06 },
      mount(ui) {
        const out = readout([{ key: 'p', label: '罩内气压（与大气压相比）' }, { key: 'v', label: '传到罩外的声音' }]);
        const scope = h('canvas', { width: 680, height: 200, style: 'width:100%;height:100px;border-radius:9px;display:block;margin-bottom:10px' });
        A.ring = () => { bell ||= new Bell(); S.ringing = !S.ringing; bell.ring(S.ringing); b1.btns[0].textContent = S.ringing ? '🔕 关掉闹钟' : '🔔 让闹钟响'; if (S.ringing && S.p > 0.9) ui.status('闹钟响了。现在<b>点抽气机</b>（或“抽气”按钮），把玻璃罩里的空气慢慢抽出来，边抽边听。'); };
        const b1 = buttons([{ text: '🔔 让闹钟响', onClick: () => A.ring() }]);
        const b2 = buttons([{ text: '抽气', onClick: () => { S.pump = -1; } }, { text: '停', ghost: true, onClick: () => { S.pump = 0; } }, { text: '放进空气', ghost: true, onClick: () => { S.pump = 1; } }]);
        const q = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        q.el.hidden = true;
        A.q = q;
        A.ask = (text, opts, hint, ok) => {
          const sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          q.btns.forEach((b, j) => { b.textContent = opts[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status(hint); q.el.hidden = true; ok(); }; });
          q.el.hidden = false; ui.status(text);
        };
        ui.controls.append(b1.el, b2.el, q.el, out.el, h('div', { class: 'ctl-label' }, '罩外接收到的声音（示波器）'), scope, note('电脑要打开声音。也可以直接<b>点闹钟</b>、<b>点抽气机</b>、<b>点罩顶的阀门</b>。'));
        G = { out, scope, status: (m) => ui.status(m), goal: goals(ui, [['ring', '让闹钟响起来'], ['pump', '把罩内的空气抽到很少'], ['refill', '再放进空气']]) };
        ui.status('玻璃罩里放着一个闹钟。先让闹钟响起来（<b>点闹钟</b>），再开始抽气。');
      },
      update(dt, t) {
        S.t += dt;
        S.p = Math.min(1, Math.max(0.02, S.p + S.pump * dt * (S.pump < 0 ? 0.35 * (S.p + 0.08) : 0.3)));
        if (S.p <= 0.03 && S.pump < 0) S.pump = 0;
        if (S.p >= 1 && S.pump > 0) S.pump = 0;
        S.minP = Math.min(S.minP, S.p);
        const vol = Math.pow(S.p, 1.3);
        bell?.update(dt);
        bell?.volume(vol);
        // 闹钟摆动
        const ring = S.ringing ? Math.sin(t * 70) : 0;
        hammer.rotation.z = ring * 0.6;
        clock.rotation.z = ring * 0.03;
        // 声波圈
        for (const rr of rings) {
          rr.k = (rr.k + dt * 0.8) % 1;
          rr.r.scale.setScalar(0.6 + rr.k * 1.4);
          rr.r.rotation.x = Math.PI / 2;
          rr.r.material.opacity = S.ringing ? (1 - rr.k) * 0.7 * vol : 0;
        }
        // 分子：数量随气压
        const n = Math.round(N * S.p);
        mol.count = n;
        for (let i = 0; i < n; i++) {
          const q = mp[i];
          q.p.addScaledVector(q.v, dt);
          if (q.p.length() > 0.06 && q.p.y > 0.03) { const c = new THREE.Vector3(0, 0.07, 0); if (q.p.distanceTo(c) > 0.06) q.v.reflect(q.p.clone().sub(c).normalize()); }
          if (q.p.y < 0.02 || q.p.y > 0.12) q.v.y *= -1;
          q.p.x = Math.max(-0.06, Math.min(0.06, q.p.x)); q.p.z = Math.max(-0.06, Math.min(0.06, q.p.z));
          m.makeTranslation(q.p.x, q.p.y, q.p.z);
          mol.setMatrixAt(i, m);
        }
        mol.instanceMatrix.needsUpdate = true;
        needle.rotation.z = 1.2 - S.p * 2.4;
        tP.text(S.pump < 0 ? '抽气中…' : S.pump > 0 ? '进气中…' : '');
        tP.show(S.pump !== 0);
        if (!G) return;
        G.out.set('p', `${Math.round(S.p * 100)}%`);
        G.out.set('v', !S.ringing ? '（闹钟没响）' : vol > 0.6 ? '很响' : vol > 0.25 ? '变小了' : vol > 0.06 ? '很微弱' : '几乎听不到');
        const wave = bell && S.ringing ? bell.wave() : new Float32Array(1024);
        drawScope(G.scope, wave, { gain: 3 });
        if (S.ringing) G.goal.done('ring');
        // 学生自己说听到 / 看到了什么
        // 抽气题还没答，空气又放进去了（或闹钟关了）：题目问的是“抽得很少的时候”，现在条件已经不是了——撤题，重新抽
        if (S.askedPump && !G.goal.has('pump') && !A.q.el.hidden && (S.p > 0.2 || !S.ringing)) { S.askedPump = false; A.q.el.hidden = true; G.status('罩里的空气已经不是“很少”了，刚才那道题作废。把空气抽到很少，再听一听。'); }
        if (S.ringing && S.p < 0.1 && !S.askedPump) { S.askedPump = true; A.ask('罩里的空气已经抽得很少了。和刚开始比，听到（示波器上看到）的铃声——', ['变小了，几乎听不到', '没有变化', '变大了'], '听一听，再看看示波器上的波形和闹钟：锤子还在敲吗？传出来的声音怎样？', () => { G.goal.done('pump'); G.status('对：锤子还在敲铃，可是空气越少，传出来的声音越小。现在<b>点罩顶的阀门</b>（或“放进空气”），把空气放回去。'); }); }
        if (S.askedRefill && !G.goal.has('refill') && !A.q.el.hidden && (S.p < 0.6 || !S.ringing)) { S.askedRefill = false; A.q.el.hidden = true; G.status('罩里的空气又变少了，刚才那道题作废。'); }
        if (S.ringing && S.minP < 0.1 && S.p > 0.8 && G.goal.has('pump') && !S.askedRefill) { S.askedRefill = true; A.ask('把空气放回去以后，铃声——', ['又变大了', '还是听不到', '比一开始还大'], '再听一听、看一看示波器。', () => { G.goal.done('refill'); G.status('对：空气多了，声音又大了。推想：如果罩里一点空气也没有，就听不到铃声——<b>声音的传播需要介质，真空不能传声</b>。'); }); }
      },
      dispose() { bell?.stop(); },
    };
  },
};
